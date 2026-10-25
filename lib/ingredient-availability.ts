
/**
 * Funciones compartidas para comparar ingredientes entre recetas y almacén.
 * Normaliza tildes, mayúsculas, espacios y plurales habituales en español.
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
      ""
    )
    .replace(/^de\s+/i, "")
    .replace(/\bdientes?\s+de\s+/g, "")
    .replace(/\blomos?\s+de\s+/g, "")
    .replace(/\bmuslos?\s+de\s+/g, "")
    .replace(/\bpechugas?\s+de\s+/g, "")
    .replace(/\b(cocidos?|cocidas?|frescos?|frescas?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized.split(" ").map((word) => {
    if (word.length > 6 && word.endsWith("ones")) {
      return word.slice(0, -2);
    }

    if (word.length > 4 && word.endsWith("ces")) {
      return `${word.slice(0, -3)}z`;
    }

    if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) {
      return word.slice(0, -1);
    }

    return word;
  });

  return words.join(" ").trim();
}

export function ingredientNamesMatch(
  first: string,
  second: string
): boolean {
  const a = getComparableIngredientName(first);
  const b = getComparableIngredientName(second);

  if (!a || !b) return false;
  if (a === b) return true;

  const descriptors = [
    "triturado",
    "triturada",
    "natural",
    "en conserva",
    "de lata",
    "fresco",
    "fresca",
    "frescos",
    "frescas",
    "para cocinar",
    "de cocinar",
    "virgen extra",
    "de oliva",
  ];

  const stripDescriptor = (value: string) => {
    let result = value;

    for (const descriptor of descriptors) {
      if (result.endsWith(` ${descriptor}`)) {
        result = result
          .slice(0, -(descriptor.length + 1))
          .trim();
      }
    }

    return result;
  };

  return stripDescriptor(a) === stripDescriptor(b);
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

    if (
      Number.isFinite(numerator) &&
      Number.isFinite(denominator) &&
      denominator !== 0
    ) {
      return numerator / denominator;
    }

    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIngredientText(value: string) {
  const text = String(value ?? "").trim();

  const withUnit = text.match(
    /^([0-9]+(?:[.,][0-9]+)?(?:\s*\/\s*[0-9]+)?)\s*(g|gr|gramos?|kg|kilos?|ml|cl|l|litros?|unidades?|uds?|ud|dientes?|cucharadas?|cucharaditas?|tazas?)\s+(?:de\s+|del\s+)?(.+)$/i
  );

  if (withUnit) {
    return {
      quantity: parseQuantity(withUnit[1]),
      unit: normalizeIngredientName(withUnit[2]),
      name: withUnit[3].trim(),
    };
  }

  const withoutUnit = text.match(
    /^([0-9]+(?:[.,][0-9]+)?(?:\s*\/\s*[0-9]+)?)\s+(?:de\s+|del\s+)?(.+)$/i
  );

  if (withoutUnit) {
    return {
      quantity: parseQuantity(withoutUnit[1]),
      unit: null,
      name: withoutUnit[2].trim(),
    };
  }

  return {
    quantity: null,
    unit: null,
    name: text,
  };
}

function canonicalUnit(unit: string | null): string | null {
  if (!unit) return null;

  const value = normalizeIngredientName(unit).replace(/\./g, "");

  if (["g", "gr", "gramo", "gramos"].includes(value)) return "g";

  if (
    [
      "kg",
      "kilo",
      "kilos",
      "kilogramo",
      "kilogramos",
    ].includes(value)
  ) {
    return "kg";
  }

  if (["ml", "mililitro", "mililitros"].includes(value)) {
    return "ml";
  }

  if (["l", "litro", "litros"].includes(value)) return "l";

  if (["unidad", "unidades", "ud", "uds"].includes(value)) {
    return "unidades";
  }

  if (value.startsWith("cucharada")) return "cucharadas";

  if (value.startsWith("cucharadita")) return "cucharaditas";

  if (value.startsWith("taza")) return "tazas";

  if (value.startsWith("diente")) return "unidades";

  return value;
}

function toComparableQuantity(
  quantity: number,
  unit: string | null
) {
  const canonical = canonicalUnit(unit);

  if (canonical === "kg") {
    return { quantity: quantity * 1000, unit: "g" };
  }

  if (canonical === "l") {
    return { quantity: quantity * 1000, unit: "ml" };
  }

  return {
    quantity,
    unit: canonical ?? "unidades",
  };
}

/**
 * Comprueba si un ingrediente de una receta está disponible.
 *
 * Si el almacén no tiene cantidad registrada, su presencia
 * cuenta como disponible.
 */
export function isIngredientAvailable(
  ingredientText: string,
  pantryItems: PantryAvailabilityItem[]
): boolean {
  const recipeIngredient = parseIngredientText(ingredientText);

  const pantry = pantryItems.find((item) =>
    ingredientNamesMatch(recipeIngredient.name, item.name)
  );

  if (!pantry) return false;

  if (
    pantry.quantity === null ||
    recipeIngredient.quantity === null
  ) {
    return true;
  }

  const recipeUnit = canonicalUnit(recipeIngredient.unit);
  const pantryUnit = canonicalUnit(pantry.unit);

  if (recipeUnit !== pantryUnit) {
    const recipeIsWeight =
      recipeUnit === "g" || recipeUnit === "kg";

    const pantryIsWeight =
      pantryUnit === "g" || pantryUnit === "kg";

    const recipeIsVolume =
      recipeUnit === "ml" || recipeUnit === "l";

    const pantryIsVolume =
      pantryUnit === "ml" || pantryUnit === "l";

    if (
      !(recipeIsWeight && pantryIsWeight) &&
      !(recipeIsVolume && pantryIsVolume)
    ) {
      if (
        !(
          recipeUnit === null &&
          pantryUnit === "unidades"
        )
      ) {
        return false;
      }
    }
  }

  const required = toComparableQuantity(
    recipeIngredient.quantity,
    recipeIngredient.unit
  );

  const available = toComparableQuantity(
    pantry.quantity,
    pantry.unit
  );

  return (
    required.unit === available.unit &&
    available.quantity >= required.quantity
  );
}
