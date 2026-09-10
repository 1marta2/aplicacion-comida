"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Recipe = {
  id: string;
  name: string;
  category: string;
  time: string;
  difficulty: string;
  emoji: string;
  description: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  source?: string;
};

type Planner = Record<string, Record<string, string[] | null>>;

type PantryItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
};

const baseRecipes: Recipe[] = [
  {
    id: "pasta-cremosa",
    name: "Pasta cremosa",
    category: "Pasta",
    time: "25 min",
    difficulty: "Fácil",
    emoji: "🍝",
    description: "Una pasta rápida, cremosa y muy fácil de preparar.",
    servings: 2,
    ingredients: [
      "200 g de pasta",
      "150 ml de nata para cocinar",
      "50 g de queso parmesano",
      "1 diente de ajo",
      "1 cucharada de aceite de oliva",
      "Sal",
      "Pimienta",
    ],
    steps: [
      "Cuece la pasta siguiendo las instrucciones del paquete.",
      "Dora el ajo picado con un poco de aceite de oliva.",
      "Añade la nata y cocina durante unos minutos.",
      "Incorpora el parmesano y mezcla hasta conseguir una salsa cremosa.",
      "Añade la pasta y mezcla bien.",
      "Salpimenta al gusto y sirve.",
    ],
  },
  {
    id: "ensalada-mediterranea",
    name: "Ensalada mediterránea",
    category: "Ensaladas",
    time: "10 min",
    difficulty: "Fácil",
    emoji: "🥗",
    description: "Fresca, ligera y perfecta para cualquier día.",
    servings: 2,
    ingredients: [
      "1 tomate",
      "1/2 pepino",
      "100 g de queso feta",
      "50 g de aceitunas",
      "1/2 cebolla",
      "Aceite de oliva",
      "Sal",
      "Orégano",
    ],
    steps: [
      "Lava y corta el tomate y el pepino.",
      "Corta la cebolla en tiras finas.",
      "Añade el queso feta y las aceitunas.",
      "Aliña con aceite de oliva, sal y orégano.",
      "Mezcla todo y sirve.",
    ],
  },
  {
    id: "arroz-con-verduras",
    name: "Arroz con verduras",
    category: "Arroces",
    time: "30 min",
    difficulty: "Fácil",
    emoji: "🍚",
    description: "Un arroz sencillo y lleno de verduras.",
    servings: 2,
    ingredients: [
      "200 g de arroz",
      "1/2 pimiento rojo",
      "1/2 calabacín",
      "1 zanahoria",
      "1/2 cebolla",
      "400 ml de caldo de verduras",
      "Aceite de oliva",
      "Sal",
    ],
    steps: [
      "Pica todas las verduras.",
      "Sofríe la cebolla y la zanahoria.",
      "Añade el pimiento y el calabacín.",
      "Incorpora el arroz y remueve durante un par de minutos.",
      "Añade el caldo y cocina hasta que el arroz esté hecho.",
      "Deja reposar unos minutos antes de servir.",
    ],
  },
  {
    id: "lentejas-caseras",
    name: "Lentejas caseras",
    category: "Legumbres",
    time: "45 min",
    difficulty: "Fácil",
    emoji: "🥣",
    description: "Un plato casero, completo y reconfortante.",
    servings: 4,
    ingredients: [
      "300 g de lentejas",
      "1 zanahoria",
      "1/2 cebolla",
      "1 patata",
      "1 tomate",
      "1 hoja de laurel",
      "Aceite de oliva",
      "Sal",
    ],
    steps: [
      "Lava las lentejas.",
      "Pica las verduras.",
      "Pon todos los ingredientes en una olla.",
      "Cubre con agua y cocina a fuego medio.",
      "Cocina hasta que las lentejas estén tiernas.",
      "Rectifica de sal y sirve.",
    ],
  },
  {
    id: "pollo-al-horno",
    name: "Pollo al horno",
    category: "Carnes",
    time: "50 min",
    difficulty: "Fácil",
    emoji: "🍗",
    description: "Pollo jugoso al horno con un toque de hierbas.",
    servings: 2,
    ingredients: [
      "2 muslos de pollo",
      "2 patatas",
      "1/2 cebolla",
      "Aceite de oliva",
      "Romero",
      "Tomillo",
      "Sal",
      "Pimienta",
    ],
    steps: [
      "Precalienta el horno a 200 ºC.",
      "Corta las patatas y la cebolla.",
      "Colócalas en una fuente de horno.",
      "Añade el pollo y aliña con aceite, sal, pimienta y hierbas.",
      "Hornea durante unos 45-50 minutos.",
      "Sirve caliente.",
    ],
  },
  {
    id: "salmon-con-patata",
    name: "Salmón con patata",
    category: "Pescados",
    time: "30 min",
    difficulty: "Fácil",
    emoji: "🐟",
    description: "Salmón al horno acompañado de patatas.",
    servings: 2,
    ingredients: [
      "2 lomos de salmón",
      "2 patatas",
      "1/2 cebolla",
      "Aceite de oliva",
      "Limón",
      "Sal",
      "Pimienta",
    ],
    steps: [
      "Precalienta el horno a 200 ºC.",
      "Corta las patatas en rodajas.",
      "Colócalas junto con la cebolla en una fuente.",
      "Hornea las patatas durante unos 20 minutos.",
      "Añade el salmón y el limón.",
      "Hornea durante otros 10-12 minutos.",
    ],
  },
  {
    id: "tortilla-de-patata",
    name: "Tortilla de patata",
    category: "Huevos",
    time: "35 min",
    difficulty: "Media",
    emoji: "🥔",
    description: "La clásica tortilla de patata, jugosa y casera.",
    servings: 3,
    ingredients: [
      "4 patatas",
      "5 huevos",
      "1/2 cebolla",
      "Aceite de oliva",
      "Sal",
    ],
    steps: [
      "Pela y corta las patatas.",
      "Corta la cebolla.",
      "Fríe las patatas y la cebolla a fuego medio.",
      "Bate los huevos y mezcla con las patatas.",
      "Cuaja la tortilla por ambos lados.",
      "Sirve al gusto.",
    ],
  },
];

const categoryStyles: Record<string, string> = {
  Pasta: "bg-[#E9E1D5]",
  Ensaladas: "bg-[#E1E9DD]",
  Arroces: "bg-[#E8E2D6]",
  Legumbres: "bg-[#E7DDD1]",
  Carnes: "bg-[#E8DCD7]",
  Pescados: "bg-[#DDE7E9]",
  Huevos: "bg-[#ECE6D2]",
};

const categoryEmojis: Record<string, string> = {
  Pasta: "🍝",
  Ensaladas: "🥗",
  Arroces: "🍚",
  Legumbres: "🥣",
  Carnes: "🍗",
  Pescados: "🐟",
  Huevos: "🥚",
  Otros: "🍽️",
};

const categories = [
  "Pasta",
  "Ensaladas",
  "Arroces",
  "Legumbres",
  "Carnes",
  "Pescados",
  "Huevos",
  "Otros",
];

const days = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const meals = ["Comida", "Cena"];

function normalizeRecipe(
  recipe: Partial<Recipe>,
  fallback: Recipe
): Recipe {
  return {
    id: recipe.id || fallback.id,
    name: recipe.name || fallback.name,
    category: recipe.category || fallback.category,
    time: recipe.time || fallback.time,
    difficulty: recipe.difficulty || fallback.difficulty,
    emoji:
      recipe.emoji ||
      categoryEmojis[recipe.category || fallback.category] ||
      fallback.emoji,
    description:
      recipe.description !== undefined
        ? recipe.description
        : fallback.description,
    servings:
      typeof recipe.servings === "number"
        ? recipe.servings
        : fallback.servings,
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients
      : fallback.ingredients,
    steps: Array.isArray(recipe.steps)
      ? recipe.steps
      : fallback.steps,
    source: recipe.source || fallback.source,
  };
}

function safeParseArray(value: string | null): unknown[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseObject(
  value: string | null
): Record<string, unknown> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);

    return parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function parseFraction(value: string): number | null {
  const fractionMatch = value.match(
    /^(\d+)\s*\/\s*(\d+)$/
  );

  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    if (denominator !== 0) {
      return numerator / denominator;
    }
  }

  return null;
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1")
    .replace(".", ",");
}

function normalizeIngredientName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function getComparableIngredientName(value: string) {
  let normalized = normalizeIngredientName(value);

  normalized = normalized
    .replace(/\b\d+\b/g, "")
    .replace(/\bdientes?\s+de\s+/g, "")
    .replace(/\blomos?\s+de\s+/g, "")
    .replace(/\bmuslos?\s+de\s+/g, "")
    .replace(/\bpechugas?\s+de\s+/g, "")
    .replace(/\bcocidos?\b/g, "")
    .replace(/\bcocidas?\b/g, "")
    .replace(/\bfrescos?\b/g, "")
    .replace(/\bfrescas?\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.endsWith("es")) {
    normalized = normalized.slice(0, -2);
  } else if (
    normalized.endsWith("s") &&
    !normalized.endsWith("ss")
  ) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

function parseIngredient(ingredient: string) {
  const clean = ingredient.trim();

  const quantityWithUnit = clean.match(
    /^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*([a-zA-ZÀ-ÿ]+)\s+(?:de\s+|del\s+)?(.+)$/
  );

  if (quantityWithUnit) {
    const quantityText = quantityWithUnit[1]
      .trim()
      .replace(",", ".");

    const unit = quantityWithUnit[2]
      .trim()
      .toLowerCase();

    const name = quantityWithUnit[3]
      .trim()
      .replace(/^de\s+/i, "")
      .replace(/^del\s+/i, "");

    const fraction = parseFraction(quantityText);

    const quantity =
      fraction !== null
        ? fraction
        : Number(quantityText);

    if (!Number.isNaN(quantity)) {
      return {
        quantity,
        unit,
        name,
      };
    }
  }

  const quantityWithoutUnit = clean.match(
    /^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s+(.+)$/
  );

  if (quantityWithoutUnit) {
    const quantityText = quantityWithoutUnit[1]
      .trim()
      .replace(",", ".");

    const name = quantityWithoutUnit[2].trim();

    const fraction = parseFraction(quantityText);

    const quantity =
      fraction !== null
        ? fraction
        : Number(quantityText);

    if (!Number.isNaN(quantity)) {
      return {
        quantity,
        unit: null,
        name,
      };
    }
  }

  return {
    quantity: null,
    unit: null,
    name: clean,
  };
}

function normalizeUnit(
  unit: string | null | undefined
) {
  if (!unit) {
    return null;
  }

  const normalized = unit
    .toLowerCase()
    .trim()
    .replace(/\./g, "");

  if (
    normalized === "g" ||
    normalized === "gr" ||
    normalized === "gramo" ||
    normalized === "gramos"
  ) {
    return "g";
  }

  if (
    normalized === "kg" ||
    normalized === "kilo" ||
    normalized === "kilos" ||
    normalized === "kilogramo" ||
    normalized === "kilogramos"
  ) {
    return "kg";
  }

  if (
    normalized === "ml" ||
    normalized === "mililitro" ||
    normalized === "mililitros"
  ) {
    return "ml";
  }

  if (
    normalized === "l" ||
    normalized === "litro" ||
    normalized === "litros"
  ) {
    return "l";
  }

  if (
    normalized === "unidad" ||
    normalized === "unidades" ||
    normalized === "ud" ||
    normalized === "uds"
  ) {
    return "unidades";
  }

  return normalized;
}

function convertToBaseQuantity(
  quantity: number,
  unit: string | null
) {
  const normalizedUnit = normalizeUnit(unit);

  if (!normalizedUnit) {
    return {
      quantity,
      unit: "unidades",
    };
  }

  if (normalizedUnit === "kg") {
    return {
      quantity: quantity * 1000,
      unit: "g",
    };
  }

  if (normalizedUnit === "l") {
    return {
      quantity: quantity * 1000,
      unit: "ml",
    };
  }

  if (normalizedUnit === "g") {
    return {
      quantity,
      unit: "g",
    };
  }

  if (normalizedUnit === "ml") {
    return {
      quantity,
      unit: "ml",
    };
  }

  return {
    quantity,
    unit: normalizedUnit,
  };
}

function convertFromBaseQuantity(
  quantity: number,
  unit: string
) {
  if (unit === "g" && quantity >= 1000) {
    return {
      quantity: quantity / 1000,
      unit: "kg",
    };
  }

  if (unit === "ml" && quantity >= 1000) {
    return {
      quantity: quantity / 1000,
      unit: "l",
    };
  }

  return {
    quantity,
    unit,
  };
}

function unitsAreCompatible(
  recipeUnit: string | null,
  pantryUnit: string | null
) {
  const recipe = normalizeUnit(recipeUnit);
  const pantry = normalizeUnit(pantryUnit);

  if (!recipe && pantry === "unidades") {
    return true;
  }

  if (recipe === pantry) {
    return true;
  }

  if (
    (recipe === "g" || recipe === "kg") &&
    (pantry === "g" || pantry === "kg")
  ) {
    return true;
  }

  if (
    (recipe === "ml" || recipe === "l") &&
    (pantry === "ml" || pantry === "l")
  ) {
    return true;
  }

  if (recipe === "unidades" && !pantry) {
    return true;
  }

  return false;
}

function pantryMatchesIngredient(
  ingredient: string,
  pantry: PantryItem
) {
  const ingredientName =
    getComparableIngredientName(ingredient);

  const pantryName =
    getComparableIngredientName(pantry.name);

  if (!ingredientName || !pantryName) {
    return false;
  }

  return (
    ingredientName === pantryName ||
    ingredientName.includes(pantryName) ||
    pantryName.includes(ingredientName)
  );
}

function getIngredientStatus(
  ingredient: string,
  pantryItems: PantryItem[]
) {
  const parsed = parseIngredient(ingredient);

  const matchingPantry =
    pantryItems.find((pantry) =>
      pantryMatchesIngredient(
        ingredient,
        pantry
      )
    );

  if (!matchingPantry) {
    return {
      status: "missing" as const,
      text: "Te falta",
      detail: null,
    };
  }

  if (matchingPantry.quantity === null) {
    return {
      status: "owned" as const,
      text: "Lo tienes",
      detail: "Lo tienes en casa",
    };
  }

  if (parsed.quantity === null) {
    return {
      status: "owned" as const,
      text: "Lo tienes",
      detail: `Tienes ${formatNumber(
        matchingPantry.quantity
      )} ${matchingPantry.unit || ""}`.trim(),
    };
  }

  if (
    !unitsAreCompatible(
      parsed.unit,
      matchingPantry.unit
    )
  ) {
    return {
      status: "missing" as const,
      text: "Te falta",
      detail: null,
    };
  }

  const recipeBase =
    convertToBaseQuantity(
      parsed.quantity,
      parsed.unit
    );

  const pantryBase =
    convertToBaseQuantity(
      matchingPantry.quantity,
      matchingPantry.unit
    );

  if (recipeBase.unit !== pantryBase.unit) {
    return {
      status: "missing" as const,
      text: "Te falta",
      detail: null,
    };
  }

  if (
    pantryBase.quantity >=
    recipeBase.quantity
  ) {
    return {
      status: "owned" as const,
      text: "Lo tienes",
      detail: `Tienes suficiente · ${formatNumber(
        matchingPantry.quantity
      )} ${matchingPantry.unit || ""}`.trim(),
    };
  }

  const missingBase =
    recipeBase.quantity -
    pantryBase.quantity;

  const missing =
    convertFromBaseQuantity(
      missingBase,
      recipeBase.unit
    );

  return {
    status: "partial" as const,
    text: "Te falta",
    detail: `${formatNumber(
      missing.quantity
    )} ${missing.unit}`,
  };
}

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [recipe, setRecipe] =
    useState<Recipe | null>(null);

  const [loaded, setLoaded] =
    useState(false);

  const [allRecipes, setAllRecipes] =
    useState<Recipe[]>([]);

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const [planner, setPlanner] =
    useState<Planner>({});

  const [pantryItems, setPantryItems] =
    useState<PantryItem[]>([]);

  const [
    selectedSlots,
    setSelectedSlots,
  ] = useState<Record<string, string[]>>(
    {}
  );

  const [editing, setEditing] =
    useState(false);

  const [editRecipe, setEditRecipe] =
    useState<Recipe | null>(null);

  const [
    editingSection,
    setEditingSection,
  ] = useState<
    "all" | "ingredients" | "steps"
  >("all");

  const [showPlanner, setShowPlanner] =
    useState(false);

  const [showDelete, setShowDelete] =
    useState(false);

  const [savedMessage, setSavedMessage] =
    useState("");

  useEffect(() => {
    async function loadRecipe() {
      try {
        let mergedRecipes: Recipe[] = [
          ...baseRecipes,
        ];

        /*
         * CARGA LOCAL
         */
        if (typeof window !== "undefined") {
          const storedRecipes =
            safeParseArray(
              localStorage.getItem("recipes")
            );

          const importedRecipes =
            safeParseArray(
              localStorage.getItem(
                "importedRecipes"
              )
            );

          const storedRecipesNormalized =
            storedRecipes.map((item) =>
              normalizeRecipe(
                item as Partial<Recipe>,
                baseRecipes.find(
                  (base) =>
                    base.id ===
                    (item as Partial<Recipe>).id
                ) || {
                  id: String(
                    (item as Partial<Recipe>).id || ""
                  ),
                  name: "Receta",
                  category: "Otros",
                  time: "—",
                  difficulty: "—",
                  emoji: "🍽️",
                  description: "",
                  servings: 2,
                  ingredients: [],
                  steps: [],
                }
              )
            );

          const importedRecipesNormalized =
            importedRecipes.map((item) =>
              normalizeRecipe(
                item as Partial<Recipe>,
                {
                  id: String(
                    (item as Partial<Recipe>).id || ""
                  ),
                  name: "Receta",
                  category: "Otros",
                  time: "—",
                  difficulty: "—",
                  emoji: "🍽️",
                  description: "",
                  servings: 2,
                  ingredients: [],
                  steps: [],
                }
              )
            );

          [
            ...storedRecipesNormalized,
            ...importedRecipesNormalized,
          ].forEach((item) => {
            const existingIndex =
              mergedRecipes.findIndex(
                (existing) =>
                  existing.id === item.id
              );

            if (existingIndex >= 0) {
              mergedRecipes[existingIndex] =
                item;
            } else {
              mergedRecipes.push(item);
            }
          });
        }

        /*
         * CARGA DESDE SUPABASE
         *
         * Hacemos las consultas por separado
         * para evitar problemas con las relaciones
         * automáticas de Supabase.
         */
        const numericId = Number(id);

        if (
          Number.isInteger(numericId) &&
          numericId > 0
        ) {
          /*
           * 1. RECETA
           */
          const {
            data: recipeData,
            error: recipeError,
          } = await supabase
            .from("recipes")
            .select(
              "id, title, description, preparation_time, servings, instructions, category_id"
            )
            .eq("id", numericId)
            .single();

          if (recipeError) {
            console.error(
              "Error cargando receta desde Supabase"
            );
            console.error(
              "message:",
              recipeError.message
            );
            console.error(
              "details:",
              recipeError.details
            );
            console.error(
              "hint:",
              recipeError.hint
            );
            console.error(
              "code:",
              recipeError.code
            );

            setAllRecipes(
              mergedRecipes
            );

            return;
          }

          if (!recipeData) {
            console.error(
              "Supabase no devolvió datos para la receta:",
              numericId
            );

            setAllRecipes(
              mergedRecipes
            );

            return;
          }

          /*
           * 2. CATEGORÍA
           */
          let categoryName = "Otros";

          if (recipeData.category_id) {
            const {
              data: categoryData,
              error: categoryError,
            } = await supabase
              .from("categories")
              .select("name")
              .eq(
                "id",
                recipeData.category_id
              )
              .maybeSingle();

            if (categoryError) {
              console.error(
                "Error cargando categoría:",
                categoryError.message
              );
            }

            if (
              categoryData &&
              typeof categoryData.name ===
                "string"
            ) {
              categoryName =
                categoryData.name;

              /*
               * En la base de datos usamos
               * "Arroz", "Carne" y "Pescado",
               * mientras que la app utiliza
               * "Arroces", "Carnes" y "Pescados".
               */
              if (categoryName === "Arroz") {
                categoryName = "Arroces";
              }

              if (categoryName === "Carne") {
                categoryName = "Carnes";
              }

              if (categoryName === "Pescado") {
                categoryName = "Pescados";
              }
            }
          }

          /*
           * 3. INGREDIENTES DE LA RECETA
           */
          const {
            data: relationData,
            error: relationError,
          } = await supabase
            .from("recipe_ingredients")
            .select(
              "quantity, unit, ingredient_id"
            )
            .eq(
              "recipe_id",
              numericId
            );

          if (relationError) {
            console.error(
              "Error cargando ingredientes de la receta:"
            );
            console.error(
              "message:",
              relationError.message
            );
            console.error(
              "details:",
              relationError.details
            );
            console.error(
              "hint:",
              relationError.hint
            );
            console.error(
              "code:",
              relationError.code
            );
          }

          /*
           * 4. BUSCAMOS LOS NOMBRES DE LOS INGREDIENTES
           */
          const supabaseIngredients: string[] =
            [];

          if (
            relationData &&
            relationData.length > 0
          ) {
            for (const relation of relationData) {
              if (!relation.ingredient_id) {
                continue;
              }

              const {
                data: ingredientData,
                error: ingredientError,
              } = await supabase
                .from("ingredients")
                .select("name")
                .eq(
                  "id",
                  relation.ingredient_id
                )
                .maybeSingle();

              if (ingredientError) {
                console.error(
                  "Error cargando ingrediente:",
                  ingredientError.message
                );
                continue;
              }

              if (
                !ingredientData ||
                typeof ingredientData.name !==
                  "string"
              ) {
                continue;
              }

              const quantity =
                relation.quantity !==
                  null &&
                relation.quantity !==
                  undefined
                  ? String(
                      relation.quantity
                    ).replace(
                      ".",
                      ","
                    )
                  : "";

              const unit =
                typeof relation.unit ===
                "string"
                  ? relation.unit
                  : "";

              const ingredientName =
                ingredientData.name;

              const formattedIngredient = [
                quantity,
                unit,
                ingredientName,
              ]
                .filter(Boolean)
                .join(" ");

              if (
                formattedIngredient
              ) {
                supabaseIngredients.push(
                  formattedIngredient
                );
              }
            }
          }

          /*
           * 5. PASOS
           */
          const supabaseSteps =
            typeof recipeData.instructions ===
            "string"
              ? recipeData.instructions
                  .split("\n")
                  .map((step) =>
                    step.trim()
                  )
                  .filter(Boolean)
              : [];

          /*
           * 6. CONSTRUIMOS LA RECETA
           */
          const supabaseRecipe: Recipe =
            {
              id: String(
                recipeData.id
              ),
              name:
                recipeData.title ||
                "Receta",
              category:
                categoryName,
              time:
                recipeData.preparation_time !==
                  null &&
                recipeData.preparation_time !==
                  undefined
                  ? String(
                      recipeData.preparation_time
                    )
                  : "—",
              difficulty: "—",
              emoji:
                categoryEmojis[
                  categoryName
                ] || "🍽️",
              description:
                recipeData.description ||
                "",
              servings:
                typeof recipeData.servings ===
                "number"
                  ? recipeData.servings
                  : 2,
              ingredients:
                supabaseIngredients,
              steps: supabaseSteps,
            };

          const existingIndex =
            mergedRecipes.findIndex(
              (item) =>
                item.id ===
                supabaseRecipe.id
            );

          if (existingIndex >= 0) {
            mergedRecipes[
              existingIndex
            ] = supabaseRecipe;
          } else {
            mergedRecipes.push(
              supabaseRecipe
            );
          }

          setRecipe(
            supabaseRecipe
          );
        } else {
          const localRecipe =
            mergedRecipes.find(
              (item) =>
                item.id === id
            ) || null;

          if (localRecipe) {
            setRecipe(
              localRecipe
            );
          }
        }

        setAllRecipes(
          mergedRecipes
        );

        /*
         * FAVORITOS, PLANIFICADOR Y DESPENSA
         */
        if (typeof window !== "undefined") {
          const storedFavorites =
            safeParseArray(
              localStorage.getItem(
                "favoriteRecipes"
              )
            );

          setFavorites(
            storedFavorites.filter(
              (
                favorite
              ): favorite is string =>
                typeof favorite ===
                "string"
            )
          );

          const storedPlanner =
            safeParseObject(
              localStorage.getItem(
                "planner"
              )
            );

          const normalizedPlanner: Planner =
            {};

          Object.entries(
            storedPlanner
          ).forEach(
            ([
              day,
              mealsForDay,
            ]) => {
              if (
                !mealsForDay ||
                typeof mealsForDay !==
                  "object" ||
                Array.isArray(
                  mealsForDay
                )
              ) {
                return;
              }

              normalizedPlanner[
                day
              ] = {};

              Object.entries(
                mealsForDay as Record<
                  string,
                  unknown
                >
              ).forEach(
                ([
                  meal,
                  recipesForMeal,
                ]) => {
                  normalizedPlanner[
                    day
                  ][meal] =
                    Array.isArray(
                      recipesForMeal
                    )
                      ? recipesForMeal.filter(
                          (
                            recipeId
                          ): recipeId is string =>
                            typeof recipeId ===
                            "string"
                        )
                      : [];
                }
              );
            }
          );

          setPlanner(
            normalizedPlanner
          );

          const storedPantry =
            safeParseArray(
              localStorage.getItem(
                "pantryItems"
              )
            );

          const normalizedPantry =
            storedPantry
              .filter(
                (
                  item
                ): item is Record<
                  string,
                  unknown
                > =>
                  Boolean(
                    item &&
                    typeof item ===
                      "object"
                  )
              )
              .map((item) => ({
                id:
                  typeof item.id ===
                  "string"
                    ? item.id
                    : crypto.randomUUID(),
                name:
                  typeof item.name ===
                  "string"
                    ? item.name
                    : "",
                quantity:
                  typeof item.quantity ===
                    "number" &&
                  Number.isFinite(
                    item.quantity
                  )
                    ? item.quantity
                    : null,
                unit:
                  typeof item.unit ===
                  "string"
                    ? item.unit
                    : "unidades",
              }))
              .filter(
                (item) =>
                  item.name.trim() !==
                  ""
              );

          setPantryItems(
            normalizedPantry
          );
        }
      } catch (error) {
        console.error(
          "Error cargando receta:",
          error
        );
      } finally {
        setLoaded(true);
      }
    }

    loadRecipe();
  }, [id]);

  /*
   * Sincronización con el resto de la aplicación.
   */
  useEffect(() => {
    if (typeof window === "undefined")
      return;

    function syncFavorites() {
      const storedFavorites =
        safeParseArray(
          localStorage.getItem(
            "favoriteRecipes"
          )
        );

      setFavorites(
        storedFavorites.filter(
          (
            favorite
          ): favorite is string =>
            typeof favorite ===
            "string"
        )
      );
    }

    function syncPlanner() {
      const storedPlanner =
        safeParseObject(
          localStorage.getItem(
            "planner"
          )
        );

      const normalizedPlanner: Planner =
        {};

      Object.entries(
        storedPlanner
      ).forEach(
        ([day, mealsForDay]) => {
          if (
            !mealsForDay ||
            typeof mealsForDay !==
              "object" ||
            Array.isArray(
              mealsForDay
            )
          ) {
            return;
          }

          normalizedPlanner[day] =
            {};

          Object.entries(
            mealsForDay as Record<
              string,
              unknown
            >
          ).forEach(
            ([
              meal,
              recipesForMeal,
            ]) => {
              normalizedPlanner[
                day
              ][meal] =
                Array.isArray(
                  recipesForMeal
                )
                  ? recipesForMeal.filter(
                      (
                        recipeId
                      ): recipeId is string =>
                        typeof recipeId ===
                        "string"
                    )
                  : [];
            }
          );
        }
      );

      setPlanner(
        normalizedPlanner
      );
    }

    function syncPantry() {
      const storedPantry =
        safeParseArray(
          localStorage.getItem(
            "pantryItems"
          )
        );

      const normalizedPantry =
        storedPantry
          .filter(
            (
              item
            ): item is Record<
              string,
              unknown
            > =>
              Boolean(
                item &&
                typeof item ===
                  "object"
              )
          )
          .map((item) => ({
            id:
              typeof item.id ===
              "string"
                ? item.id
                : crypto.randomUUID(),
            name:
              typeof item.name ===
              "string"
                ? item.name
                : "",
            quantity:
              typeof item.quantity ===
                "number" &&
              Number.isFinite(
                item.quantity
              )
                ? item.quantity
                : null,
            unit:
              typeof item.unit ===
              "string"
                ? item.unit
                : "unidades",
          }))
          .filter(
            (item) =>
              item.name.trim() !==
              ""
          );

      setPantryItems(
        normalizedPantry
      );
    }

    function syncFromStorage() {
      syncFavorites();
      syncPlanner();
      syncPantry();
    }

    window.addEventListener(
      "favoritesChanged",
      syncFavorites
    );

    window.addEventListener(
      "plannerChanged",
      syncPlanner
    );

    window.addEventListener(
      "pantryChanged",
      syncPantry
    );

    window.addEventListener(
      "storage",
      syncFromStorage
    );

    return () => {
      window.removeEventListener(
        "favoritesChanged",
        syncFavorites
      );

      window.removeEventListener(
        "plannerChanged",
        syncPlanner
      );

      window.removeEventListener(
        "pantryChanged",
        syncPantry
      );

      window.removeEventListener(
        "storage",
        syncFromStorage
      );
    };
  }, []);

  const plannedSlots =
    useMemo(() => {
      if (!recipe) return [];

      const slots: string[] = [];

      days.forEach((day) => {
        meals.forEach((meal) => {
          const recipesForMeal =
            planner?.[day]?.[meal];

          if (
            Array.isArray(
              recipesForMeal
            ) &&
            recipesForMeal.includes(
              recipe.id
            )
          ) {
            slots.push(
              `${day} · ${meal}`
            );
          }
        });
      });

      return slots;
    }, [planner, recipe]);

  function getRecipeById(
    recipeId: string
  ): Recipe | null {
    return (
      allRecipes.find(
        (item) =>
          item.id === recipeId
      ) || null
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="h-10 w-32 animate-pulse rounded-2xl bg-[#E8EBE5]" />
          <div className="mt-8 h-72 rounded-[32px] bg-white" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] px-5 py-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/recetas"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#52685A] shadow-sm"
          >
            ← Volver a recetas
          </Link>

          <div className="mt-8 rounded-[32px] bg-white p-8 text-center shadow-sm">
            <div className="text-5xl">
              🍽️
            </div>

            <h1 className="mt-4 text-2xl font-bold text-[#303A33]">
              Receta no encontrada
            </h1>

            <p className="mt-2 text-[#748078]">
              Esta receta ya no está
              disponible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentRecipe =
    recipe;

  const categoryColor =
    categoryStyles[
      currentRecipe.category
    ] || "bg-[#E8EEE8]";

  const isFavorite =
    favorites.includes(
      currentRecipe.id
    );

  function toggleFavorite() {
    const storedFavorites =
      safeParseArray(
        localStorage.getItem(
          "favoriteRecipes"
        )
      ).filter(
        (
          favorite
        ): favorite is string =>
          typeof favorite ===
          "string"
      );

    const newFavorites =
      storedFavorites.includes(
        currentRecipe.id
      )
        ? storedFavorites.filter(
            (favoriteId) =>
              favoriteId !==
              currentRecipe.id
          )
        : [
            ...storedFavorites,
            currentRecipe.id,
          ];

    setFavorites(
      newFavorites
    );

    localStorage.setItem(
      "favoriteRecipes",
      JSON.stringify(
        newFavorites
      )
    );

    window.dispatchEvent(
      new Event(
        "favoritesChanged"
      )
    );
  }

  function openPlanner() {
    const currentSelection: Record<
      string,
      string[]
    > = {};

    days.forEach((day) => {
      currentSelection[day] =
        [];

      meals.forEach((meal) => {
        const recipesForMeal =
          planner?.[day]?.[meal];

        if (
          Array.isArray(
            recipesForMeal
          ) &&
          recipesForMeal.includes(
            currentRecipe.id
          )
        ) {
          currentSelection[
            day
          ].push(meal);
        }
      });
    });

    setSelectedSlots(
      currentSelection
    );

    setShowPlanner(true);
  }

  function toggleSlot(
    day: string,
    meal: string
  ) {
    setSelectedSlots(
      (current) => {
        const currentMeals =
          current[day] || [];

        if (
          currentMeals.includes(
            meal
          )
        ) {
          return {
            ...current,
            [day]:
              currentMeals.filter(
                (item) =>
                  item !== meal
              ),
          };
        }

        return {
          ...current,
          [day]: [
            ...currentMeals,
            meal,
          ],
        };
      }
    );
  }

  function savePlanner() {
    const newPlanner: Planner =
      JSON.parse(
        JSON.stringify(planner)
      );

    days.forEach((day) => {
      if (!newPlanner[day]) {
        newPlanner[day] = {};
      }

      meals.forEach((meal) => {
        const selected =
          selectedSlots[
            day
          ]?.includes(meal) ||
          false;

        const existing =
          Array.isArray(
            newPlanner[day][meal]
          )
            ? newPlanner[day][meal] ||
              []
            : [];

        if (selected) {
          if (
            !existing.includes(
              currentRecipe.id
            )
          ) {
            newPlanner[day][
              meal
            ] = [
              ...existing,
              currentRecipe.id,
            ];
          }
        } else {
          newPlanner[day][meal] =
            existing.filter(
              (recipeId) =>
                recipeId !==
                currentRecipe.id
            );
        }
      });
    });

    localStorage.setItem(
      "planner",
      JSON.stringify(
        newPlanner
      )
    );

    setPlanner(
      newPlanner
    );

    window.dispatchEvent(
      new Event(
        "plannerChanged"
      )
    );

    setShowPlanner(false);

    setSavedMessage(
      "Planificación guardada"
    );

    setTimeout(() => {
      setSavedMessage("");
    }, 2200);
  }

  function startEditing(
    section:
      | "all"
      | "ingredients"
      | "steps" = "all"
  ) {
    setEditRecipe({
      ...currentRecipe,
      ingredients: [
        ...currentRecipe.ingredients,
      ],
      steps: [
        ...currentRecipe.steps,
      ],
    });

    setEditingSection(
      section
    );

    setEditing(true);
  }

  function updateEditField(
    field: keyof Recipe,
    value: string | number
  ) {
    if (!editRecipe) return;

    setEditRecipe({
      ...editRecipe,
      [field]: value,
    });
  }

  function updateIngredient(
    index: number,
    value: string
  ) {
    if (!editRecipe) return;

    const ingredients = [
      ...editRecipe.ingredients,
    ];

    ingredients[index] =
      value;

    setEditRecipe({
      ...editRecipe,
      ingredients,
    });
  }

  function addIngredient() {
    if (!editRecipe) return;

    setEditRecipe({
      ...editRecipe,
      ingredients: [
        ...editRecipe.ingredients,
        "",
      ],
    });
  }

  function removeIngredient(
    index: number
  ) {
    if (!editRecipe) return;

    setEditRecipe({
      ...editRecipe,
      ingredients:
        editRecipe.ingredients.filter(
          (
            _,
            ingredientIndex
          ) =>
            ingredientIndex !==
            index
        ),
    });
  }

  function updateStep(
    index: number,
    value: string
  ) {
    if (!editRecipe) return;

    const steps = [
      ...editRecipe.steps,
    ];

    steps[index] = value;

    setEditRecipe({
      ...editRecipe,
      steps,
    });
  }

  function addStep() {
    if (!editRecipe) return;

    setEditRecipe({
      ...editRecipe,
      steps: [
        ...editRecipe.steps,
        "",
      ],
    });
  }

  function removeStep(
    index: number
  ) {
    if (!editRecipe) return;

    setEditRecipe({
      ...editRecipe,
      steps:
        editRecipe.steps.filter(
          (_, stepIndex) =>
            stepIndex !== index
        ),
    });
  }

  async function saveRecipe() {
    if (!editRecipe) return;

    const cleanedRecipe: Recipe = {
      ...editRecipe,
      name:
        editRecipe.name.trim() ||
        "Receta sin nombre",
      ingredients:
        editRecipe.ingredients.filter(
          (ingredient) =>
            ingredient.trim() !==
            ""
        ),
      steps:
        editRecipe.steps.filter(
          (step) =>
            step.trim() !== ""
        ),
      servings:
        Number.isFinite(
          editRecipe.servings
        ) &&
        editRecipe.servings > 0
          ? editRecipe.servings
          : 1,
    };

    const numericId = Number(
      cleanedRecipe.id
    );

    if (
      Number.isInteger(numericId) &&
      numericId > 0
    ) {
      const categoryMap: Record<
        string,
        number
      > = {
        Ensaladas: 6,
        Pasta: 7,
        Arroces: 8,
        Carnes: 9,
        Pescados: 10,
        Legumbres: 11,
        Huevos: 12,
        Otros: 12,
      };

      const categoryId =
        categoryMap[
          cleanedRecipe.category
        ] || 12;

      const {
        error: recipeError,
      } = await supabase
        .from("recipes")
        .update({
          title: cleanedRecipe.name,
          description:
            cleanedRecipe.description ||
            null,
          preparation_time:
            cleanedRecipe.time ||
            null,
          servings:
            cleanedRecipe.servings ||
            null,
          instructions:
            cleanedRecipe.steps.join(
              "\n"
            ),
          category_id:
            categoryId,
        })
        .eq("id", numericId);

      if (recipeError) {
        console.error(
          "Error actualizando receta:",
          recipeError
        );

        setSavedMessage(
          "No se pudo guardar la receta"
        );

        setTimeout(() => {
          setSavedMessage("");
        }, 2200);

        return;
      }

      const {
        error: deleteIngredientsError,
      } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq(
          "recipe_id",
          numericId
        );

      if (deleteIngredientsError) {
        console.error(
          "Error actualizando ingredientes:",
          deleteIngredientsError
        );
      } else {
        for (const ingredient of cleanedRecipe.ingredients) {
          const parsed =
            parseIngredient(
              ingredient
            );

          const ingredientName =
            parsed.name.trim();

          if (!ingredientName) {
            continue;
          }

          let ingredientId:
            | number
            | null = null;

          const {
            data: existingIngredient,
            error:
              existingIngredientError,
          } = await supabase
            .from("ingredients")
            .select("id")
            .ilike(
              "name",
              ingredientName
            )
            .limit(1)
            .maybeSingle();

          if (
            existingIngredientError
          ) {
            console.error(
              "Error buscando ingrediente:",
              existingIngredientError
            );
          }

          if (
            existingIngredient
              ?.id
          ) {
            ingredientId =
              existingIngredient.id;
          } else {
            const {
              data: newIngredient,
              error:
                newIngredientError,
            } = await supabase
              .from("ingredients")
              .insert({
                name: ingredientName,
              })
              .select("id")
              .single();

            if (newIngredientError) {
              console.error(
                "Error creando ingrediente:",
                newIngredientError
              );
              continue;
            }

            ingredientId =
              newIngredient?.id ||
              null;
          }

          if (
            ingredientId !== null
          ) {
            const {
              error:
                relationError,
            } = await supabase
              .from(
                "recipe_ingredients"
              )
              .insert({
                recipe_id:
                  numericId,
                ingredient_id:
                  ingredientId,
                quantity:
                  parsed.quantity !==
                  null
                    ? parsed.quantity
                    : null,
                unit:
                  parsed.unit ||
                  null,
              });

            if (
              relationError
            ) {
              console.error(
                "Error guardando relación de ingrediente:",
                relationError
              );
            }
          }
        }
      }
    }

    const storedRecipes =
      safeParseArray(
        localStorage.getItem(
          "recipes"
        )
      ) as Partial<Recipe>[];

    const existingIndex =
      storedRecipes.findIndex(
        (item) =>
          item.id ===
          cleanedRecipe.id
      );

    if (existingIndex >= 0) {
      storedRecipes[
        existingIndex
      ] = cleanedRecipe;
    } else {
      storedRecipes.push(
        cleanedRecipe
      );
    }

    localStorage.setItem(
      "recipes",
      JSON.stringify(
        storedRecipes
      )
    );

    const storedImported =
      safeParseArray(
        localStorage.getItem(
          "importedRecipes"
        )
      ) as Partial<Recipe>[];

    const importedIndex =
      storedImported.findIndex(
        (item) =>
          item.id ===
          cleanedRecipe.id
      );

    if (importedIndex >= 0) {
      storedImported[
        importedIndex
      ] = cleanedRecipe;

      localStorage.setItem(
        "importedRecipes",
        JSON.stringify(
          storedImported
        )
      );
    }

    setRecipe(
      cleanedRecipe
    );

    setAllRecipes(
      (current) => {
        const updated = [
          ...current,
        ];

        const index =
          updated.findIndex(
            (item) =>
              item.id ===
              cleanedRecipe.id
          );

        if (index >= 0) {
          updated[index] =
            cleanedRecipe;
        } else {
          updated.push(
            cleanedRecipe
          );
        }

        return updated;
      }
    );

    setEditing(false);
    setEditRecipe(null);

    setSavedMessage(
      "Receta guardada"
    );

    setTimeout(() => {
      setSavedMessage("");
    }, 2200);
  }

  async function deleteRecipe() {
    const numericId = Number(
      currentRecipe.id
    );

    if (
      Number.isInteger(numericId) &&
      numericId > 0
    ) {
      const {
        error,
      } = await supabase
        .from("recipes")
        .delete()
        .eq("id", numericId);

      if (error) {
        console.error(
          "Error eliminando receta de Supabase:",
          error
        );

        setSavedMessage(
          "No se pudo eliminar la receta"
        );

        setTimeout(() => {
          setSavedMessage("");
        }, 2200);

        return;
      }
    }

    const storedRecipes =
      safeParseArray(
        localStorage.getItem(
          "recipes"
        )
      ) as Partial<Recipe>[];

    const storedImported =
      safeParseArray(
        localStorage.getItem(
          "importedRecipes"
        )
      ) as Partial<Recipe>[];

    const newRecipes =
      storedRecipes.filter(
        (item) =>
          item.id !==
          currentRecipe.id
      );

    const newImported =
      storedImported.filter(
        (item) =>
          item.id !==
          currentRecipe.id
      );

    localStorage.setItem(
      "recipes",
      JSON.stringify(
        newRecipes
      )
    );

    localStorage.setItem(
      "importedRecipes",
      JSON.stringify(
        newImported
      )
    );

    const newFavorites =
      favorites.filter(
        (favoriteId) =>
          favoriteId !==
          currentRecipe.id
      );

    localStorage.setItem(
      "favoriteRecipes",
      JSON.stringify(
        newFavorites
      )
    );

    window.dispatchEvent(
      new Event(
        "favoritesChanged"
      )
    );

    const newPlanner: Planner =
      JSON.parse(
        JSON.stringify(planner)
      );

    Object.entries(
      newPlanner
    ).forEach(
      ([day, mealsForDay]) => {
        if (
          !mealsForDay ||
          typeof mealsForDay !==
            "object"
        ) {
          return;
        }

        Object.entries(
          mealsForDay
        ).forEach(
          ([
            meal,
            recipesForMeal,
          ]) => {
            if (
              Array.isArray(
                recipesForMeal
              )
            ) {
              newPlanner[day][
                meal
              ] =
                recipesForMeal.filter(
                  (recipeId) =>
                    recipeId !==
                    currentRecipe.id
                );
            }
          }
        );
      }
    );

    localStorage.setItem(
      "planner",
      JSON.stringify(
        newPlanner
      )
    );

    window.dispatchEvent(
      new Event(
        "plannerChanged"
      )
    );

    setShowDelete(false);

    window.location.href =
      "/recetas";
  }

  return (
    <div className="min-h-screen bg-[#F7F5EF] px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* CABECERA */}
        <div className="flex items-center justify-between">
          <Link
            href="/recetas"
            className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-medium text-[#52685A] shadow-sm transition hover:bg-[#F1F3EF]"
          >
            ←
            <span>Recetas</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={
                toggleFavorite
              }
              className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm transition ${
                isFavorite
                  ? "text-[#C58B45]"
                  : "text-[#8B958E]"
              }`}
              aria-label={
                isFavorite
                  ? "Quitar de favoritos"
                  : "Añadir a favoritos"
              }
            >
              {isFavorite
                ? "❤️"
                : "♡"}
            </button>

            <button
              onClick={() =>
                startEditing("all")
              }
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg text-[#68736B] shadow-sm transition hover:bg-[#F1F3EF]"
              aria-label="Editar receta"
            >
              ✎
            </button>

            <button
              onClick={() =>
                setShowDelete(
                  true
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg text-[#A36D68] shadow-sm transition hover:bg-[#F4EAE8]"
              aria-label="Eliminar receta"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* HERO */}
        <section className="mt-5 rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div
              className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] text-5xl ${categoryColor}`}
            >
              {currentRecipe.emoji}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 inline-flex rounded-full bg-[#E8EEE8] px-3 py-1 text-xs font-semibold text-[#52685A]">
                    {
                      currentRecipe.category
                    }
                  </div>

                  <h1 className="text-3xl font-bold tracking-tight text-[#303A33] sm:text-4xl">
                    {
                      currentRecipe.name
                    }
                  </h1>

                  {currentRecipe.description && (
                    <p className="mt-3 max-w-2xl text-base leading-7 text-[#748078]">
                      {
                        currentRecipe.description
                      }
                    </p>
                  )}
                </div>

                <div className="w-full shrink-0 lg:w-[235px]">
                  <button
                    onClick={
                      openPlanner
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#52685A] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#45594C]"
                  >
                    <span>📅</span>

                    <span>
                      {plannedSlots.length >
                      0
                        ? "Editar planificación"
                        : "Planificar receta"}
                    </span>
                  </button>

                  {plannedSlots.length >
                    0 && (
                    <div className="mt-3 rounded-2xl bg-[#E8EEE8] p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#52685A]">
                        <span>✓</span>

                        <span>
                          Ya está
                          planificada
                        </span>
                      </div>

                      <div className="mt-2 flex flex-col gap-1.5">
                        {plannedSlots.map(
                          (
                            slot
                          ) => (
                            <div
                              key={
                                slot
                              }
                              className="text-xs font-medium text-[#68736B]"
                            >
                              {
                                slot
                              }
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-2xl bg-[#F7F5EF] px-4 py-3 text-sm text-[#68736B]">
                  <span>⏱️</span>

                  <span>
                    {
                      currentRecipe.time
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-[#F7F5EF] px-4 py-3 text-sm text-[#68736B]">
                  <span>✨</span>

                  <span>
                    {
                      currentRecipe.difficulty
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-[#F7F5EF] px-4 py-3 text-sm text-[#68736B]">
                  <span>👥</span>

                  <span>
                    {
                      currentRecipe.servings
                    }{" "}
                    {currentRecipe.servings ===
                    1
                      ? "persona"
                      : "personas"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {currentRecipe.source && (
            <a
              href={
                currentRecipe.source
              }
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center justify-between rounded-2xl bg-[#E8EEE8] px-5 py-4 text-sm font-semibold text-[#52685A] transition hover:bg-[#DFE7DF]"
            >
              <span className="flex items-center gap-3">
                <span>↗</span>

                <span>
                  Ver receta original
                </span>
              </span>

              <span>→</span>
            </a>
          )}
        </section>

        {/* INGREDIENTES + PREPARACIÓN */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">

          {/* INGREDIENTES */}
          <section className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B958E]">
                  Para cocinar
                </p>

                <h2 className="mt-1 text-2xl font-bold text-[#303A33]">
                  Ingredientes
                </h2>
              </div>

              {currentRecipe.ingredients
                .length > 0 && (
                <button
                  onClick={() =>
                    startEditing(
                      "ingredients"
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1F3EF] text-[#52685A]"
                  aria-label="Editar ingredientes"
                >
                  ✎
                </button>
              )}
            </div>

            {currentRecipe.ingredients
              .length > 0 ? (
              <ul className="mt-6 space-y-3">
                {currentRecipe.ingredients.map(
                  (
                    ingredient,
                    index
                  ) => {
                    const ingredientStatus =
                      getIngredientStatus(
                        ingredient,
                        pantryItems
                      );

                    return (
                      <li
                        key={`${ingredient}-${index}`}
                        className="flex items-start gap-3"
                      >
                        <span
                          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            ingredientStatus.status ===
                            "owned"
                              ? "bg-[#E1EBDD] text-[#607451]"
                              : ingredientStatus.status ===
                                "partial"
                              ? "bg-[#F1E7D5] text-[#A27642]"
                              : "bg-[#F2E1DE] text-[#A36D68]"
                          }`}
                        >
                          {ingredientStatus.status ===
                          "owned"
                            ? "✓"
                            : ingredientStatus.status ===
                              "partial"
                            ? "!"
                            : "×"}
                        </span>

                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm leading-6 text-[#56615A]">
                            {ingredient}
                          </p>

                          <p
                            className={`mt-0.5 text-xs font-medium ${
                              ingredientStatus.status ===
                              "owned"
                                ? "text-[#6F7D5C]"
                                : ingredientStatus.status ===
                                  "partial"
                                ? "text-[#A27642]"
                                : "text-[#A36D68]"
                            }`}
                          >
                            {
                              ingredientStatus.text
                            }

                            {ingredientStatus.detail && (
                              <>
                                {" "}
                                ·{" "}
                                {
                                  ingredientStatus.detail
                                }
                              </>
                            )}
                          </p>
                        </div>
                      </li>
                    );
                  }
                )}
              </ul>
            ) : (
              <button
                onClick={() =>
                  startEditing(
                    "ingredients"
                  )
                }
                className="mt-6 w-full rounded-2xl border border-dashed border-[#CBD3CC] bg-[#F7F8F5] px-5 py-6 text-center transition hover:bg-[#F1F3EF]"
              >
                <div className="text-2xl">
                  ＋
                </div>

                <div className="mt-2 text-sm font-semibold text-[#52685A]">
                  Añadir ingredientes
                </div>

                <div className="mt-1 text-xs text-[#89928B]">
                  Añade los ingredientes de esta receta
                </div>
              </button>
            )}
          </section>

          {/* PREPARACIÓN */}
          <section className="rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B958E]">
                  Paso a paso
                </p>

                <h2 className="mt-1 text-2xl font-bold text-[#303A33]">
                  Preparación
                </h2>
              </div>

              {currentRecipe.steps
                .length > 0 && (
                <button
                  onClick={() =>
                    startEditing(
                      "steps"
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1F3EF] text-[#52685A]"
                  aria-label="Editar preparación"
                >
                  ✎
                </button>
              )}
            </div>

            {currentRecipe.steps
              .length > 0 ? (
              <ol className="mt-6 space-y-5">
                {currentRecipe.steps.map(
                  (
                    step,
                    index
                  ) => (
                    <li
                      key={`${step}-${index}`}
                      className="flex items-start gap-4"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8EEE8] text-xs font-bold text-[#52685A]">
                        {index + 1}
                      </div>

                      <p className="pt-1 text-sm leading-6 text-[#56615A]">
                        {step}
                      </p>
                    </li>
                  )
                )}
              </ol>
            ) : (
              <button
                onClick={() =>
                  startEditing(
                    "steps"
                  )
                }
                className="mt-6 w-full rounded-2xl border border-dashed border-[#CBD3CC] bg-[#F7F8F5] px-5 py-6 text-center transition hover:bg-[#F1F3EF]"
              >
                <div className="text-2xl">
                  ＋
                </div>

                <div className="mt-2 text-sm font-semibold text-[#52685A]">
                  Añadir preparación
                </div>

                <div className="mt-1 text-xs text-[#89928B]">
                  Añade los pasos para preparar esta receta
                </div>
              </button>
            )}
          </section>
        </div>
      </div>

      {/* MENSAJE GUARDADO */}
      {savedMessage && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-2xl bg-[#52685A] px-5 py-3 text-sm font-semibold text-white shadow-lg">
          ✓ {savedMessage}
        </div>
      )}

      {/* MODAL PLANIFICADOR */}
      {showPlanner && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] bg-[#F7F5EF] p-5 sm:max-w-2xl sm:rounded-[32px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B958E]">
                  Organiza tu semana
                </p>

                <h2 className="mt-1 text-2xl font-bold text-[#303A33]">
                  Planificar receta
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#748078]">
                  Elige todos los días y comidas en los que quieres preparar esta receta.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowPlanner(
                    false
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#68736B] shadow-sm"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {days.map((day) => (
                <div
                  key={day}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 font-semibold text-[#303A33]">
                    {day}
                  </div>

                  <div className="space-y-3">
                    {meals.map(
                      (meal) => {
                        const selected =
                          selectedSlots[
                            day
                          ]?.includes(
                            meal
                          ) ||
                          false;

                        const plannedRecipeIds =
                          Array.isArray(
                            planner?.[
                              day
                            ]?.[
                              meal
                            ]
                          )
                            ? planner[
                                day
                              ][
                                meal
                              ] || []
                            : [];

                        const otherRecipes =
                          plannedRecipeIds
                            .filter(
                              (
                                recipeId
                              ) =>
                                recipeId !==
                                currentRecipe.id
                            )
                            .map(
                              (
                                recipeId
                              ) =>
                                getRecipeById(
                                  recipeId
                                )
                            )
                            .filter(
                              (
                                item
                              ): item is Recipe =>
                                item !==
                                null
                            );

                        return (
                          <div
                            key={
                              meal
                            }
                            className={`rounded-2xl border p-3 transition ${
                              selected
                                ? "border-[#52685A] bg-[#F3F6F2]"
                                : "border-[#E4E7E2] bg-[#FAFAF7]"
                            }`}
                          >
                            <button
                              onClick={() =>
                                toggleSlot(
                                  day,
                                  meal
                                )
                              }
                              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                selected
                                  ? "bg-[#52685A] text-white"
                                  : "bg-white text-[#68736B] hover:bg-[#F1F3EF]"
                              }`}
                            >
                              <span className="flex items-center justify-between">
                                <span>
                                  {selected
                                    ? "✓ "
                                    : ""}
                                  {
                                    meal
                                  }
                                </span>

                                {otherRecipes.length >
                                  0 && (
                                  <span
                                    className={`text-xs ${
                                      selected
                                        ? "text-white/80"
                                        : "text-[#89928B]"
                                    }`}
                                  >
                                    {
                                      otherRecipes.length
                                    }{" "}
                                    {otherRecipes.length ===
                                    1
                                      ? "receta"
                                      : "recetas"}
                                  </span>
                                )}
                              </span>
                            </button>

                            {otherRecipes.length >
                              0 && (
                              <div className="mt-2 space-y-1.5">
                                {otherRecipes.map(
                                  (
                                    plannedRecipe
                                  ) => (
                                    <div
                                      key={
                                        plannedRecipe.id
                                      }
                                      className="flex items-center gap-2 rounded-xl bg-white px-3 py-2"
                                    >
                                      <span className="text-sm">
                                        {
                                          plannedRecipe.emoji
                                        }
                                      </span>

                                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#68736B]">
                                        {
                                          plannedRecipe.name
                                        }
                                      </span>

                                      <span className="text-[10px] text-[#A0A7A1]">
                                        ya planificada
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            {selected && (
                              <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#E8EEE8] px-3 py-2">
                                <span className="text-sm">
                                  {
                                    currentRecipe.emoji
                                  }
                                </span>

                                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#52685A]">
                                  {
                                    currentRecipe.name
                                  }
                                </span>

                                <span className="text-[10px] font-semibold text-[#52685A]">
                                  esta receta
                                </span>
                              </div>
                            )}

                            {otherRecipes.length ===
                              0 &&
                              !selected && (
                                <div className="mt-2 px-2 text-[11px] text-[#A0A7A1]">
                                  Libre
                                </div>
                              )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() =>
                  setShowPlanner(
                    false
                  )
                }
                className="flex-1 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-[#68736B]"
              >
                Cancelar
              </button>

              <button
                onClick={
                  savePlanner
                }
                className="flex-1 rounded-2xl bg-[#52685A] px-5 py-4 text-sm font-semibold text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editing &&
        editRecipe && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-5">
            <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] bg-[#F7F5EF] p-5 sm:max-w-3xl sm:rounded-[32px] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B958E]">
                    Editar
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-[#303A33]">
                    {editingSection ===
                    "ingredients"
                      ? "Editar ingredientes"
                      : editingSection ===
                        "steps"
                      ? "Editar preparación"
                      : "Editar receta"}
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setEditing(
                      false
                    )
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#68736B] shadow-sm"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              {editingSection ===
                "all" && (
                <div className="mt-6 space-y-5">
                  <div>
                    <label className="text-sm font-semibold text-[#52605A]">
                      Nombre
                    </label>

                    <input
                      value={
                        editRecipe.name
                      }
                      onChange={(
                        event
                      ) =>
                        updateEditField(
                          "name",
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#303A33] outline-none focus:border-[#52685A]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-[#52605A]">
                        Categoría
                      </label>

                      <select
                        value={
                          editRecipe.category
                        }
                        onChange={(
                          event
                        ) =>
                          updateEditField(
                            "category",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#303A33] outline-none focus:border-[#52685A]"
                      >
                        {categories.map(
                          (
                            category
                          ) => (
                            <option
                              key={
                                category
                              }
                              value={
                                category
                              }
                            >
                              {
                                category
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-[#52605A]">
                        Tiempo
                      </label>

                      <input
                        value={
                          editRecipe.time
                        }
                        onChange={(
                          event
                        ) =>
                          updateEditField(
                            "time",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#303A33] outline-none focus:border-[#52685A]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-[#52605A]">
                        Dificultad
                      </label>

                      <input
                        value={
                          editRecipe.difficulty
                        }
                        onChange={(
                          event
                        ) =>
                          updateEditField(
                            "difficulty",
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#303A33] outline-none focus:border-[#52685A]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-[#52605A]">
                        Personas
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={
                          editRecipe.servings
                        }
                        onChange={(
                          event
                        ) =>
                          updateEditField(
                            "servings",
                            Number(
                              event.target
                                .value
                            )
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#303A33] outline-none focus:border-[#52685A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-[#52605A]">
                      Descripción
                    </label>

                    <textarea
                      value={
                        editRecipe.description
                      }
                      onChange={(
                        event
                      ) =>
                        updateEditField(
                          "description",
                          event.target.value
                        )
                      }
                      rows={3}
                      className="mt-2 w-full resize-none rounded-2xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#303A33] outline-none focus:border-[#52685A]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-[#52605A]">
                      Enlace de la receta original
                    </label>

                    <input
                      value={
                        editRecipe.source ||
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        updateEditField(
                          "source",
                          event.target.value
                        )
                      }
                      placeholder="https://..."
                      className="mt-2 w-full rounded-2xl border border-[#D9DDD8] bg-white px-4 py-3 text-sm text-[#303A33] placeholder:text-[#89928B] outline-none focus:border-[#52685A]"
                    />
                  </div>
                </div>
              )}

              {(editingSection ===
                "all" ||
                editingSection ===
                  "ingredients") && (
                <div className="mt-7">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#303A33]">
                      Ingredientes
                    </h3>

                    <button
                      onClick={
                        addIngredient
                      }
                      className="rounded-xl bg-[#E8EEE8] px-3 py-2 text-xs font-semibold text-[#52685A]"
                    >
                      + Añadir
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {editRecipe.ingredients.map(
                      (
                        ingredient,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                          className="flex gap-2"
                        >
                          <input
                            value={
                              ingredient
                            }
                            onChange={(
                              event
                            ) =>
                              updateIngredient(
                                index,
                                event
                                  .target
                                  .value
                              )
                            }
                            className="min-w-0 flex-1 rounded-xl border border-[#C9D0CA] bg-white px-4 py-3 text-sm font-medium text-[#303A33] outline-none placeholder:text-[#89928B] focus:border-[#52685A] focus:ring-1 focus:ring-[#52685A]"
                          />

                          <button
                            onClick={() =>
                              removeIngredient(
                                index
                              )
                            }
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4EAE8] text-[#A36D68]"
                            aria-label="Eliminar ingrediente"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}

                    {editRecipe
                      .ingredients
                      .length ===
                      0 && (
                      <p className="rounded-xl bg-white p-4 text-sm font-medium text-[#56615A]">
                        Todavía no hay ingredientes.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(editingSection ===
                "all" ||
                editingSection ===
                  "steps") && (
                <div className="mt-7">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#303A33]">
                      Preparación
                    </h3>

                    <button
                      onClick={
                        addStep
                      }
                      className="rounded-xl bg-[#E8EEE8] px-3 py-2 text-xs font-semibold text-[#52685A]"
                    >
                      + Añadir
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {editRecipe.steps.map(
                      (
                        step,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                          className="flex items-start gap-2"
                        >
                          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8EEE8] text-xs font-bold text-[#52685A]">
                            {index + 1}
                          </div>

                          <textarea
                            value={
                              step
                            }
                            onChange={(
                              event
                            ) =>
                              updateStep(
                                index,
                                event
                                  .target
                                  .value
                              )
                            }
                            rows={2}
                            className="min-w-0 flex-1 resize-none rounded-xl border border-[#C9D0CA] bg-white px-4 py-3 text-sm font-medium text-[#303A33] placeholder:text-[#89928B] outline-none focus:border-[#52685A] focus:ring-1 focus:ring-[#52685A]"
                          />

                          <button
                            onClick={() =>
                              removeStep(
                                index
                              )
                            }
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4EAE8] text-[#A36D68]"
                            aria-label="Eliminar paso"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}

                    {editRecipe
                      .steps
                      .length ===
                      0 && (
                      <p className="rounded-xl bg-white p-4 text-sm font-medium text-[#56615A]">
                        Todavía no hay pasos de preparación.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-7 flex gap-3">
                <button
                  onClick={() =>
                    setEditing(
                      false
                    )
                  }
                  className="flex-1 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-[#68736B]"
                >
                  Cancelar
                </button>

                <button
                  onClick={
                    saveRecipe
                  }
                  className="flex-1 rounded-2xl bg-[#52685A] px-5 py-4 text-sm font-semibold text-white"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

      {/* MODAL ELIMINAR */}
      {showDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-5">
          <div className="w-full max-w-md rounded-[32px] bg-[#F7F5EF] p-6 shadow-xl">
            <div className="text-4xl">
              🗑️
            </div>

            <h2 className="mt-4 text-2xl font-bold text-[#303A33]">
              ¿Eliminar receta?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#748078]">
              Se eliminará esta receta y dejará de aparecer en tus recetas guardadas.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() =>
                  setShowDelete(
                    false
                  )
                }
                className="flex-1 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-[#68736B]"
              >
                Cancelar
              </button>

              <button
                onClick={
                  deleteRecipe
                }
                className="flex-1 rounded-2xl bg-[#A36D68] px-5 py-4 text-sm font-semibold text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}