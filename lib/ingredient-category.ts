export const DEFAULT_CATEGORY_NAMES = [
  "Frutas y verduras",
  "Carnicería",
  "Pescadería",
  "Lácteos",
  "Despensa",
  "Condimentos",
];

export function getAutomaticCategory(name: string): string {
  const lower = name.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = (words: string[]) => words.some((word) => lower.includes(word));

  if (matches([
    "tomate", "cebolla", "zanahoria", "calabacin", "pimiento", "pepino",
    "patata", "limon", "champiñon", "champinon", "seta", "lechuga",
    "espinaca", "ajo", "brocoli", "calabaza", "berenjena", "manzana",
    "platano", "naranja", "pera", "fresa", "fruta", "verdura", "aguacate",
    "puerro", "apio", "coliflor", "esparrago", "judia verde", "perejil",
    "cilantro fresco", "champi"
  ])) return "Frutas y verduras";

  if (matches([
    "pollo", "pechuga", "carne", "ternera", "cerdo", "jamon", "pavo",
    "salchicha", "chorizo", "bacon", "beicon", "cordero", "hamburguesa"
  ])) return "Carnicería";

  if (matches([
    "salmon", "merluza", "pescado", "bacalao", "atun", "gamba",
    "langostino", "mejillon", "calamar", "sardina", "lubina", "dorada"
  ])) return "Pescadería";

  if (matches([
    "nata", "queso", "leche", "yogur", "yogurt", "parmesano", "feta",
    "mozzarella", "mantequilla", "requeson", "kefir"
  ])) return "Lácteos";

  if (matches([
    "pasta", "arroz", "lenteja", "garbanzo", "harina", "azucar", "aceituna",
    "leche de coco", "coco", "caldo", "huevo", "pan", "avena", "fideo",
    "quinoa", "cuscus", "conserva", "tomate triturado", "legumbre", "cereal",
    "galleta", "cafe", "te ", "infusion", "chocolate", "fruto seco"
  ])) return "Despensa";

  if (matches([
    "sal", "pimienta", "oregano", "comino", "curcuma", "canela", "pimenton",
    "especia", "vinagre", "aceite", "salsa de soja", "mostaza", "mayonesa",
    "ketchup", "ajo en polvo", "hierba seca"
  ])) return "Condimentos";

  return "Despensa";
}


export function resolveAutomaticCategory(
  ingredientName: string,
  categories: { name: string; sort_order: number }[],
): string {
  const automaticName = getAutomaticCategory(ingredientName);
  const exact = categories.find((category) => category.name === automaticName);
  if (exact) return exact.name;

  const defaultIndex = DEFAULT_CATEGORY_NAMES.indexOf(automaticName);
  const matchingPosition = categories.find((category) => category.sort_order === defaultIndex);
  return matchingPosition?.name || categories[0]?.name || automaticName;
}
