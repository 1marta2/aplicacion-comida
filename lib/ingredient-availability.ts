/**
 * Funciones compartidas para comparar ingredientes entre recetas y almacén.
 * Distingue coincidencias exactas, equivalentes y alternativas culinarias.
 * Las cantidades nunca se suman entre ingredientes diferentes.
 */

export function normalizeIngredientName(value: string): string {
  return String(value ?? "")
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getComparableIngredientName(value: string): string {
  const normalized = normalizeIngredientName(value)
    .replace(
      /^\s*\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?\s*(?:g|gr|gramos?|kg|kilos?|ml|cl|l|litros?|unidades?|uds?|ud|dientes?|cucharadas?|cucharaditas?|tazas?)?\s*/i,
      "",
    )
    .replace(/^de\s+/i, "")
    .replace(/\bdientes?\s+de\s+/g, "")
    .replace(/\b(cocidos?|cocidas?|frescos?|frescas?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized.split(" ").map((word) => {
    if (word.length > 6 && word.endsWith("ones")) return word.slice(0, -2);
    if (word.length > 4 && word.endsWith("ces")) return `${word.slice(0, -3)}z`;
    if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
    return word;
  });

  return words.join(" ").trim();
}

function stripDescriptors(value: string): string {
  const descriptors = [
    "triturado", "triturada", "natural", "en conserva", "de lata",
    "fresco", "fresca", "para cocinar", "de cocinar", "virgen extra", "de oliva",
  ];
  let result = value;
  for (const descriptor of descriptors) {
    if (result.endsWith(` ${descriptor}`)) result = result.slice(0, -(descriptor.length + 1)).trim();
  }
  return result;
}

export function ingredientNamesMatch(first: string, second: string): boolean {
  const a = getComparableIngredientName(first);
  const b = getComparableIngredientName(second);
  if (!a || !b) return false;
  return a === b || stripDescriptors(a) === stripDescriptors(b);
}

export type IngredientMatchKind = "exact" | "equivalent" | "alternative" | "none";

// Productos que pueden intercambiarse sin cambiar sustancialmente el ingrediente.
const equivalentGroups: string[][] = [
  ["pollo", "pechuga de pollo", "filete de pollo", "muslo de pollo", "contramuslo de pollo"],
];

// Opciones de una misma familia que pueden sustituirse en muchas recetas,
// pero que deben mostrarse como alternativa y no como el ingrediente exacto.
const alternativeGroups: string[][] = [
  ["salmon", "merluza", "bacalao", "lubina", "dorada", "pescadilla", "rape", "atun"],
];

function groupContainsMatch(group: string[], value: string): boolean {
  return group.some((member) => ingredientNamesMatch(member, value));
}

export function getIngredientMatchKind(first: string, second: string): IngredientMatchKind {
  const a = getComparableIngredientName(first);
  const b = getComparableIngredientName(second);
  if (!a || !b) return "none";
  if (ingredientNamesMatch(a, b)) return "exact";

  if (equivalentGroups.some((group) => groupContainsMatch(group, a) && groupContainsMatch(group, b))) {
    return "equivalent";
  }

  if (alternativeGroups.some((group) => groupContainsMatch(group, a) && groupContainsMatch(group, b))) {
    return "alternative";
  }

  return "none";
}

type PantryAvailabilityItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
};

function parseQuantity(value: string): number | null {
  const cleaned = value.trim().replace(",", ".");
  if (cleaned.includes("/")) {
    const [numerator, denominator] = cleaned.split("/").map(Number);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) return numerator / denominator;
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIngredientText(value: string) {
  const text = String(value ?? "").trim();
  const withUnit = text.match(
    /^([0-9]+(?:[.,][0-9]+)?(?:\s*\/\s*[0-9]+)?)\s*(g|gr|gramos?|kg|kilos?|ml|cl|l|litros?|unidades?|uds?|ud|dientes?|cucharadas?|cucharaditas?|tazas?)\s+(?:de\s+|del\s+)?(.+)$/i,
  );
  if (withUnit) {
    return { quantity: parseQuantity(withUnit[1]), unit: normalizeIngredientName(withUnit[2]), name: withUnit[3].trim() };
  }
  const withoutUnit = text.match(/^([0-9]+(?:[.,][0-9]+)?(?:\s*\/\s*[0-9]+)?)\s+(?:de\s+|del\s+)?(.+)$/i);
  if (withoutUnit) return { quantity: parseQuantity(withoutUnit[1]), unit: null, name: withoutUnit[2].trim() };
  return { quantity: null, unit: null, name: text };
}

function canonicalUnit(unit: string | null): string | null {
  if (!unit) return null;
  const value = normalizeIngredientName(unit).replace(/\./g, "");
  if (["g", "gr", "gramo", "gramos"].includes(value)) return "g";
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value)) return "kg";
  if (["ml", "mililitro", "mililitros"].includes(value)) return "ml";
  if (["l", "litro", "litros"].includes(value)) return "l";
  if (["unidad", "unidades", "ud", "uds"].includes(value)) return "unidades";
  if (value.startsWith("cucharada")) return "cucharadas";
  if (value.startsWith("cucharadita")) return "cucharaditas";
  if (value.startsWith("taza")) return "tazas";
  if (value.startsWith("diente")) return "unidades";
  return value;
}

function toComparableQuantity(quantity: number, unit: string | null) {
  const canonical = canonicalUnit(unit);
  if (canonical === "kg") return { quantity: quantity * 1000, unit: "g" };
  if (canonical === "l") return { quantity: quantity * 1000, unit: "ml" };
  return { quantity, unit: canonical ?? "unidades" };
}

/** Comprueba disponibilidad usando un único producto coincidente del almacén. */
export function isIngredientAvailable(ingredientText: string, pantryItems: PantryAvailabilityItem[]): boolean {
  const recipeIngredient = parseIngredientText(ingredientText);
  const pantry = pantryItems.find((item) =>
    getIngredientMatchKind(recipeIngredient.name, item.name) !== "none",
  );
  if (!pantry) return false;
  if (pantry.quantity === null || recipeIngredient.quantity === null) return true;

  const required = toComparableQuantity(recipeIngredient.quantity, recipeIngredient.unit);
  const available = toComparableQuantity(pantry.quantity, pantry.unit);
  if (required.unit !== available.unit) return false;
  return available.quantity >= required.quantity;
}
