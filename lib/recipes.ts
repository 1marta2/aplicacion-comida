export type Recipe = {
  id: string;
  name: string;
  category: string;
  time: string;
  difficulty: string;
  emoji: string;
  ingredients: string[];
  steps: string[];
  servings?: number;
  description?: string;
  color?: string;
  source?: string;
};

export const baseRecipes: Recipe[] = [
  {
    id: "pasta-cremosa",
    name: "Pasta cremosa",
    category: "Pasta",
    time: "25 min",
    difficulty: "Fácil",
    emoji: "🍝",
    servings: 2,
    description: "Una pasta cremosa, rápida y muy fácil de preparar.",
    ingredients: [
      "200 g de pasta",
      "200 ml de nata para cocinar",
      "50 g de queso parmesano",
      "1 diente de ajo",
      "Sal",
      "Pimienta",
      "Aceite de oliva",
    ],
    steps: [
      "Cuece la pasta siguiendo las instrucciones del paquete.",
      "Sofríe el ajo picado con un poco de aceite de oliva.",
      "Añade la nata y cocina a fuego suave durante unos minutos.",
      "Incorpora el parmesano y mezcla hasta que la salsa quede cremosa.",
      "Añade la pasta y mezcla bien.",
      "Salpimenta al gusto y sirve.",
    ],
    color: "bg-[#E6E0D3]",
  },

  {
    id: "ensalada-mediterranea",
    name: "Ensalada mediterránea",
    category: "Ensaladas",
    time: "15 min",
    difficulty: "Fácil",
    emoji: "🥗",
    servings: 2,
    description: "Una ensalada fresca y sencilla perfecta para cualquier día.",
    ingredients: [
      "Tomate",
      "Pepino",
      "Cebolla",
      "Aceitunas negras",
      "Queso feta",
      "Aceite de oliva",
      "Sal",
      "Orégano",
    ],
    steps: [
      "Lava y corta el tomate y el pepino.",
      "Corta la cebolla en tiras finas.",
      "Añade las aceitunas y el queso feta.",
      "Aliña con aceite de oliva, sal y orégano.",
      "Mezcla todo y sirve.",
    ],
    color: "bg-[#DDE6D9]",
  },

  {
    id: "arroz-con-verduras",
    name: "Arroz con verduras",
    category: "Arroces",
    time: "30 min",
    difficulty: "Fácil",
    emoji: "🍚",
    servings: 2,
    description: "Arroz sencillo con verduras, completo y fácil de preparar.",
    ingredients: [
      "200 g de arroz",
      "1 zanahoria",
      "1 calabacín",
      "1 pimiento",
      "1/2 cebolla",
      "Caldo de verduras",
      "Aceite de oliva",
      "Sal",
    ],
    steps: [
      "Pica todas las verduras.",
      "Sofríe la cebolla y el pimiento con aceite de oliva.",
      "Añade la zanahoria y el calabacín.",
      "Incorpora el arroz y rehoga durante un par de minutos.",
      "Añade el caldo y cocina hasta que el arroz esté hecho.",
      "Deja reposar unos minutos antes de servir.",
    ],
    color: "bg-[#E8DFC9]",
  },

  {
    id: "lentejas-caseras",
    name: "Lentejas caseras",
    category: "Legumbres",
    time: "45 min",
    difficulty: "Fácil",
    emoji: "🥣",
    servings: 4,
    description: "Un plato de cuchara clásico, sencillo y reconfortante.",
    ingredients: [
      "300 g de lentejas",
      "1 zanahoria",
      "1/2 cebolla",
      "1 tomate",
      "1 patata",
      "1 hoja de laurel",
      "Pimentón",
      "Aceite de oliva",
      "Sal",
      "Agua",
    ],
    steps: [
      "Lava las lentejas.",
      "Pica la cebolla, la zanahoria y el tomate.",
      "Sofríe las verduras con un poco de aceite.",
      "Añade las lentejas, la patata y el laurel.",
      "Cubre con agua y añade una cucharadita de pimentón.",
      "Cocina a fuego medio hasta que las lentejas estén tiernas.",
      "Ajusta de sal y sirve.",
    ],
    color: "bg-[#E2D8C8]",
  },

  {
    id: "pollo-al-horno",
    name: "Pollo al horno",
    category: "Carne",
    time: "50 min",
    difficulty: "Fácil",
    emoji: "🍗",
    servings: 2,
    description: "Pollo al horno con patatas, sencillo y sin complicaciones.",
    ingredients: [
      "2 muslos de pollo",
      "2 patatas",
      "1/2 cebolla",
      "2 dientes de ajo",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
      "Romero",
    ],
    steps: [
      "Precalienta el horno a 200 ºC.",
      "Corta las patatas y la cebolla.",
      "Coloca las verduras en una bandeja.",
      "Añade el pollo y los dientes de ajo.",
      "Aliña con aceite, sal, pimienta y romero.",
      "Hornea durante unos 45-50 minutos.",
      "Comprueba que el pollo esté bien cocinado antes de servir.",
    ],
    color: "bg-[#E6D8CC]",
  },

  {
    id: "salmon-con-patata",
    name: "Salmón con patata",
    category: "Pescado",
    time: "30 min",
    difficulty: "Fácil",
    emoji: "🐟",
    servings: 2,
    description: "Salmón al horno acompañado de patata.",
    ingredients: [
      "2 lomos de salmón",
      "2 patatas",
      "1/2 cebolla",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
      "Limón",
    ],
    steps: [
      "Precalienta el horno a 200 ºC.",
      "Corta las patatas en rodajas finas.",
      "Colócalas en una bandeja junto con la cebolla.",
      "Hornea las patatas durante unos 20 minutos.",
      "Añade el salmón encima.",
      "Salpimenta y añade unas gotas de limón.",
      "Hornea durante 10-12 minutos más.",
    ],
    color: "bg-[#DCE3E0]",
  },

  {
    id: "tortilla-de-patata",
    name: "Tortilla de patata",
    category: "Huevos",
    time: "35 min",
    difficulty: "Media",
    emoji: "🥔",
    servings: 3,
    description: "La clásica tortilla de patata, jugosa y casera.",
    ingredients: [
      "4 patatas",
      "5 huevos",
      "1 cebolla",
      "Aceite de oliva",
      "Sal",
    ],
    steps: [
      "Pela y corta las patatas en láminas finas.",
      "Corta la cebolla.",
      "Fríe las patatas y la cebolla a fuego medio hasta que estén tiernas.",
      "Bate los huevos en un bol y añade sal.",
      "Escurre las patatas y mézclalas con el huevo.",
      "Cuaja la tortilla en una sartén.",
      "Dale la vuelta con ayuda de un plato.",
      "Cocina hasta conseguir el punto deseado.",
    ],
    color: "bg-[#E7DEC8]",
  },

  {
    id: "pollo-al-curry",
    name: "Pollo al curry",
    category: "Carne",
    time: "30 min",
    difficulty: "Fácil",
    emoji: "🍛",
    servings: 2,
    description: "Pollo con una salsa cremosa de curry, rápido y sabroso.",
    ingredients: [
      "2 pechugas de pollo",
      "1/2 cebolla",
      "200 ml de leche de coco",
      "1 cucharada de curry",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
    ],
    steps: [
      "Corta el pollo en dados.",
      "Pica la cebolla.",
      "Sofríe la cebolla con un poco de aceite.",
      "Añade el pollo y cocina hasta que esté dorado.",
      "Añade el curry y mezcla bien.",
      "Incorpora la leche de coco.",
      "Cocina a fuego suave durante 10-15 minutos.",
      "Salpimenta al gusto y sirve.",
    ],
    color: "bg-[#E5D8C4]",
  },

  {
    id: "garbanzos-con-verduras",
    name: "Garbanzos con verduras",
    category: "Legumbres",
    time: "25 min",
    difficulty: "Fácil",
    emoji: "🫘",
    servings: 2,
    description: "Garbanzos salteados con verduras para una comida rápida.",
    ingredients: [
      "400 g de garbanzos cocidos",
      "1 calabacín",
      "1 zanahoria",
      "1/2 cebolla",
      "1 pimiento",
      "Aceite de oliva",
      "Pimentón",
      "Sal",
    ],
    steps: [
      "Pica todas las verduras.",
      "Sofríe la cebolla y el pimiento.",
      "Añade la zanahoria y el calabacín.",
      "Cocina hasta que las verduras estén tiernas.",
      "Añade los garbanzos escurridos.",
      "Añade pimentón y sal.",
      "Saltea durante unos minutos y sirve.",
    ],
    color: "bg-[#DDE1D3]",
  },

  {
    id: "merluza-al-horno",
    name: "Merluza al horno",
    category: "Pescado",
    time: "25 min",
    difficulty: "Fácil",
    emoji: "🐟",
    servings: 2,
    description: "Merluza al horno con patata, ligera y fácil de preparar.",
    ingredients: [
      "2 lomos de merluza",
      "2 patatas",
      "1/2 cebolla",
      "1 diente de ajo",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
      "Limón",
    ],
    steps: [
      "Precalienta el horno a 200 ºC.",
      "Corta las patatas en rodajas finas.",
      "Colócalas en una bandeja junto con la cebolla.",
      "Añade aceite, sal y pimienta.",
      "Hornea durante unos 15 minutos.",
      "Coloca la merluza sobre las patatas.",
      "Añade ajo picado y unas gotas de limón.",
      "Hornea durante 10 minutos aproximadamente.",
    ],
    color: "bg-[#DCE4E1]",
  },
];

export const categories = [
  "Pasta",
  "Arroces",
  "Carne",
  "Pescado",
  "Legumbres",
  "Ensaladas",
  "Huevos",
];

export const categoryEmojis: Record<string, string> = {
  Pasta: "🍝",
  Arroces: "🍚",
  Carne: "🍗",
  Pescado: "🐟",
  Legumbres: "🫘",
  Ensaladas: "🥗",
  Huevos: "🥚",
};

export const categoryStyles: Record<string, string> = {
  Pasta: "bg-[#E6E0D3]",
  Arroces: "bg-[#E8DFC9]",
  Carne: "bg-[#E6D8CC]",
  Pescado: "bg-[#DCE3E0]",
  Legumbres: "bg-[#E2D8C8]",
  Ensaladas: "bg-[#DDE6D9]",
  Huevos: "bg-[#E7DEC8]",
};

export function getCategoryStyle(category: string) {
  return {
    color: categoryStyles[category] || "bg-[#E8EEE8]",
    emoji: categoryEmojis[category] || "🍽️",
  };
}

export function createRecipeId(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Date.now()
  );
}

export function normalizeRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    name: recipe.name || "Receta sin nombre",
    category: recipe.category || "Pasta",
    time: recipe.time || "Sin tiempo",
    difficulty: recipe.difficulty || "Sin dificultad",
    emoji:
      recipe.emoji ||
      categoryEmojis[recipe.category] ||
      "🍽️",
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    color:
      recipe.color ||
      categoryStyles[recipe.category] ||
      "bg-[#E6E0D3]",
  };
}