"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

type Recipe = {
  id: string;
  name: string;
  emoji?: string;
  ingredients: string[];
};

type Planner = {
  [day: string]: {
    [meal: string]: string | string[] | null;
  };
};

type ShoppingItem = {
  id: string;
  name: string;
  recipes: string[];
  category: string;
  quantity: number | null;
  totalQuantity: number | null;
  unit: string | null;
  ingredientName?: string;
  owned?: boolean;
  pantryQuantity?: number | null;
  pantryUnit?: string | null;
};

type PantryItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
};

const baseRecipes: Record<string, Recipe> = {
  "pasta-cremosa": {
    id: "pasta-cremosa",
    name: "Pasta cremosa",
    emoji: "🍝",
    ingredients: [
      "200 g de pasta",
      "200 ml de nata para cocinar",
      "100 g de queso parmesano",
      "1 cebolla",
      "2 dientes de ajo",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
    ],
  },

  "ensalada-mediterranea": {
    id: "ensalada-mediterranea",
    name: "Ensalada mediterránea",
    emoji: "🥗",
    ingredients: [
      "2 tomates",
      "1 pepino",
      "100 g de queso feta",
      "50 g de aceitunas",
      "1/2 cebolla",
      "Aceite de oliva",
      "Sal",
    ],
  },

  "arroz-con-verduras": {
    id: "arroz-con-verduras",
    name: "Arroz con verduras",
    emoji: "🍚",
    ingredients: [
      "200 g de arroz",
      "1 zanahoria",
      "1 calabacín",
      "1 pimiento",
      "1 cebolla",
      "Aceite de oliva",
      "Sal",
    ],
  },

  "lentejas-caseras": {
    id: "lentejas-caseras",
    name: "Lentejas caseras",
    emoji: "🥣",
    ingredients: [
      "250 g de lentejas",
      "1 zanahoria",
      "1 patata",
      "1 cebolla",
      "1 tomate",
      "1 diente de ajo",
      "Aceite de oliva",
      "Sal",
    ],
  },

  "pollo-al-horno": {
    id: "pollo-al-horno",
    name: "Pollo al horno",
    emoji: "🍗",
    ingredients: [
      "2 pechugas de pollo",
      "3 patatas",
      "1 cebolla",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
    ],
  },

  "salmon-con-patata": {
    id: "salmon-con-patata",
    name: "Salmón con patata",
    emoji: "🐟",
    ingredients: [
      "2 lomos de salmón",
      "3 patatas",
      "1 limón",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
    ],
  },

  "tortilla-de-patata": {
    id: "tortilla-de-patata",
    name: "Tortilla de patata",
    emoji: "🥔",
    ingredients: [
      "5 patatas",
      "1 cebolla",
      "6 huevos",
      "Aceite de oliva",
      "Sal",
    ],
  },

  "pollo-al-curry": {
    id: "pollo-al-curry",
    name: "Pollo al curry",
    emoji: "🍛",
    ingredients: [
      "2 pechugas de pollo",
      "200 ml de leche de coco",
      "1 cebolla",
      "2 dientes de ajo",
      "Curry",
      "Aceite de oliva",
      "Sal",
    ],
  },

  "garbanzos-con-verduras": {
    id: "garbanzos-con-verduras",
    name: "Garbanzos con verduras",
    emoji: "🥘",
    ingredients: [
      "400 g de garbanzos cocidos",
      "1 zanahoria",
      "1 calabacín",
      "1 cebolla",
      "1 pimiento",
      "Aceite de oliva",
      "Sal",
    ],
  },

  "merluza-al-horno": {
    id: "merluza-al-horno",
    name: "Merluza al horno",
    emoji: "🐟",
    ingredients: [
      "2 lomos de merluza",
      "3 patatas",
      "1 cebolla",
      "1 limón",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
    ],
  },

  "pollo-en-salsa": {
    id: "pollo-en-salsa",
    name: "Pollo en salsa",
    emoji: "🍗",
    ingredients: [
      "2 pechugas de pollo",
      "1 cebolla",
      "2 dientes de ajo",
      "200 ml de caldo de pollo",
      "Aceite de oliva",
      "Sal",
      "Pimienta",
    ],
  },
};

const categories = [
  "Frutas y verduras",
  "Carnicería",
  "Pescadería",
  "Lácteos",
  "Despensa",
  "Condimentos",
];

function getCategory(name: string): string {
  const lower = name.toLowerCase();

  if (
    [
      "tomate",
      "tomates",
      "cebolla",
      "cebollas",
      "zanahoria",
      "zanahorias",
      "calabacín",
      "calabacines",
      "pimiento",
      "pimientos",
      "pepino",
      "pepinos",
      "patata",
      "patatas",
      "limón",
      "limones",
    ].some((word) => lower.includes(word))
  ) {
    return "Frutas y verduras";
  }

  if (
    ["pollo", "pechuga", "pechugas", "carne", "ternera", "cerdo"].some(
      (word) => lower.includes(word)
    )
  ) {
    return "Carnicería";
  }

  if (
    ["salmón", "salmon", "merluza", "pescado", "bacalao"].some((word) =>
      lower.includes(word)
    )
  ) {
    return "Pescadería";
  }

  if (
    ["nata", "queso", "leche", "yogur", "yogurt", "parmesano", "feta"].some(
      (word) => lower.includes(word)
    )
  ) {
    return "Lácteos";
  }

  if (
    [
      "pasta",
      "arroz",
      "lentejas",
      "garbanzos",
      "harina",
      "azúcar",
      "aceitunas",
      "leche de coco",
      "coco",
      "caldo",
      "huevo",
      "huevos",
    ].some((word) => lower.includes(word))
  ) {
    return "Despensa";
  }

  return "Condimentos";
}

function parseFraction(value: string): number | null {
  const trimmed = value.trim();

  if (/^\d+\s*\/\s*\d+$/.test(trimmed)) {
    const [numerator, denominator] = trimmed.split("/").map(Number);

    if (denominator !== 0) {
      return numerator / denominator;
    }
  }

  return null;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1")
    .replace(".", ",");
}

function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "");
}

function getComparableIngredientName(name: string): string {
  let result = normalizeIngredientName(name);

  result = result
    .replace(/^(un|una|unos|unas)\s+/i, "")
    .replace(
      /^(dientes?|lomos?|filetes?|rodajas?|ramas?|cucharaditas?|cucharadas?|tazas?|vasos?)\s+de\s+/i,
      ""
    )
    .replace(/^de\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (result.endsWith("es") && result.length > 4) {
    result = result.slice(0, -2);
  } else if (result.endsWith("s") && result.length > 3) {
    result = result.slice(0, -1);
  }

  return result;
}

function parseIngredient(
  ingredient: string
): {
  name: string;
  quantity: number | null;
  unit: string | null;
} {
  let text = ingredient.trim();

  text = text.replace(/^[-•*]\s*/, "");

  const mixedFractionMatch = text.match(
    /^(\d+)\s+(\d+)\s*\/\s*(\d+)\s+(.+)$/
  );

  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);

    return {
      quantity:
        denominator !== 0 ? whole + numerator / denominator : whole,
      unit: null,
      name: mixedFractionMatch[4].trim(),
    };
  }

  const fractionOnlyMatch = text.match(
    /^(\d+)\s*\/\s*(\d+)\s+(.+)$/
  );

  if (fractionOnlyMatch) {
    const numerator = Number(fractionOnlyMatch[1]);
    const denominator = Number(fractionOnlyMatch[2]);

    return {
      quantity: denominator !== 0 ? numerator / denominator : null,
      unit: null,
      name: fractionOnlyMatch[3].trim(),
    };
  }

  const quantityMatch = text.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);

  if (!quantityMatch) {
    return {
      name: text,
      quantity: null,
      unit: null,
    };
  }

  const quantity = Number(quantityMatch[1].replace(",", "."));
  const rest = quantityMatch[2].trim();

  const unitMatch = rest.match(
    /^([a-zA-ZÀ-ÿ]+)\s+(?:de\s+|del\s+)?(.+)$/
  );

  if (!unitMatch) {
    return {
      name: rest,
      quantity,
      unit: null,
    };
  }

  const possibleUnit = unitMatch[1].toLowerCase();

  const knownUnits = [
    "g",
    "gr",
    "gramo",
    "gramos",
    "kg",
    "kilo",
    "kilos",
    "kilogramo",
    "kilogramos",
    "ml",
    "l",
    "litro",
    "litros",
    "cl",
    "unidad",
    "unidades",
    "ud",
    "uds",
    "cucharadita",
    "cucharaditas",
    "cucharada",
    "cucharadas",
    "taza",
    "tazas",
    "vaso",
    "vasos",
  ];

  if (!knownUnits.includes(possibleUnit)) {
    return {
      name: rest,
      quantity,
      unit: null,
    };
  }

  return {
    name: unitMatch[2].trim(),
    quantity,
    unit: normalizeUnit(possibleUnit),
  };
}

function formatShoppingName(
  name: string,
  quantity: number | null,
  unit: string | null
): string {
  if (quantity === null) {
    return name;
  }

  if (unit) {
    return `${formatNumber(quantity)} ${unit} de ${name}`;
  }

  return `${formatNumber(quantity)} ${name}`;
}

function normalizeUnit(unit: string | null): string | null {
  if (!unit) {
    return null;
  }

  const value = unit.toLowerCase().trim();

  if (["g", "gr", "gramo", "gramos"].includes(value)) {
    return "g";
  }

  if (
    ["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value)
  ) {
    return "kg";
  }

  if (["ml", "mililitro", "mililitros"].includes(value)) {
    return "ml";
  }

  if (["l", "litro", "litros"].includes(value)) {
    return "l";
  }

  if (["cl", "centilitro", "centilitros"].includes(value)) {
    return "cl";
  }

  if (["unidad", "unidades", "ud", "uds"].includes(value)) {
    return "unidad";
  }

  if (["cucharadita", "cucharaditas"].includes(value)) {
    return "cucharadita";
  }

  if (["cucharada", "cucharadas"].includes(value)) {
    return "cucharada";
  }

  if (["taza", "tazas"].includes(value)) {
    return "taza";
  }

  if (["vaso", "vasos"].includes(value)) {
    return "vaso";
  }

  return value;
}

function convertToBaseQuantity(
  quantity: number,
  unit: string | null
): {
  quantity: number;
  unit: string | null;
} {
  const normalized = normalizeUnit(unit);

  if (normalized === "kg") {
    return {
      quantity: quantity * 1000,
      unit: "g",
    };
  }

  if (normalized === "l") {
    return {
      quantity: quantity * 1000,
      unit: "ml",
    };
  }

  if (normalized === "cl") {
    return {
      quantity: quantity * 10,
      unit: "ml",
    };
  }

  return {
    quantity,
    unit: normalized,
  };
}

function convertFromBaseQuantity(
  quantity: number,
  unit: string | null
): number {
  const normalized = normalizeUnit(unit);

  if (normalized === "kg") {
    return quantity / 1000;
  }

  if (normalized === "l") {
    return quantity / 1000;
  }

  if (normalized === "cl") {
    return quantity / 10;
  }

  return quantity;
}

function unitsAreCompatible(
  first: string | null,
  second: string | null
): boolean {
  const a = normalizeUnit(first);
  const b = normalizeUnit(second);

  if (a === b) {
    return true;
  }

  const weightUnits = ["g", "kg"];
  const volumeUnits = ["ml", "l", "cl"];

  if (
    a &&
    b &&
    weightUnits.includes(a) &&
    weightUnits.includes(b)
  ) {
    return true;
  }

  if (
    a &&
    b &&
    volumeUnits.includes(a) &&
    volumeUnits.includes(b)
  ) {
    return true;
  }

  return false;
}

function pantryMatchesIngredient(
  pantry: PantryItem,
  ingredientName: string
): boolean {
  return (
    getComparableIngredientName(pantry.name) ===
    getComparableIngredientName(ingredientName)
  );
}

function normalizePlanner(raw: unknown): Planner {
  const result: Planner = {};

  for (const day of days) {
    result[day] = {};

    for (const meal of meals) {
      result[day][meal] = null;
    }
  }

  if (!raw || typeof raw !== "object") {
    return result;
  }

  const input = raw as Record<string, unknown>;

  for (const day of days) {
    const dayValue = input[day];

    if (!dayValue || typeof dayValue !== "object") {
      continue;
    }

    const dayObject = dayValue as Record<string, unknown>;

    for (const meal of meals) {
      const value = dayObject[meal];

      if (
        typeof value === "string" ||
        value === null ||
        Array.isArray(value)
      ) {
        result[day][meal] = value as string | string[] | null;
      }
    }
  }

  return result;
}

function loadRecipesFromStorage(): Record<string, Recipe> {
  const result = { ...baseRecipes };

  try {
    const savedRecipes = JSON.parse(
      localStorage.getItem("recipes") || "[]"
    );

    if (Array.isArray(savedRecipes)) {
      savedRecipes.forEach((recipe) => {
        if (
          recipe &&
          typeof recipe.id === "string" &&
          typeof recipe.name === "string" &&
          Array.isArray(recipe.ingredients)
        ) {
          result[recipe.id] = {
            id: recipe.id,
            name: recipe.name,
            emoji: recipe.emoji || "🍽️",
            ingredients: recipe.ingredients.filter(
              (
                ingredient: unknown
              ): ingredient is string =>
                typeof ingredient === "string"
            ),
          };
        }
      });
    }
  } catch {}

  try {
    const importedRecipes = JSON.parse(
      localStorage.getItem("importedRecipes") || "[]"
    );

    if (Array.isArray(importedRecipes)) {
      importedRecipes.forEach((recipe) => {
        if (
          recipe &&
          typeof recipe.id === "string" &&
          typeof recipe.name === "string" &&
          Array.isArray(recipe.ingredients)
        ) {
          result[recipe.id] = {
            id: recipe.id,
            name: recipe.name,
            emoji: recipe.emoji || "🍽️",
            ingredients: recipe.ingredients.filter(
              (
                ingredient: unknown
              ): ingredient is string =>
                typeof ingredient === "string"
            ),
          };
        }
      });
    }
  } catch {}

  return result;
}

function loadPantry(): PantryItem[] {
  try {
    const raw = JSON.parse(
      localStorage.getItem("pantryItems") || "[]"
    );

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .filter(
        (item) => item && typeof item.name === "string"
      )
      .map((item) => ({
        id:
          typeof item.id === "string"
            ? item.id
            : `${item.name}-${Math.random()}`,
        name: item.name,
        quantity:
          typeof item.quantity === "number"
            ? item.quantity
            : null,
        unit: normalizeUnit(
          typeof item.unit === "string"
            ? item.unit
            : null
        ),
      }));
  } catch {
    return [];
  }
}

function loadCheckedItems(): string[] {
  try {
    const raw = JSON.parse(
      localStorage.getItem("shoppingChecked") || "[]"
    );

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.filter(
      (item): item is string => typeof item === "string"
    );
  } catch {
    return [];
  }
}

export default function ShoppingPage() {
  const [planner, setPlanner] = useState<Planner>(
    () => normalizePlanner(null)
  );

  const [availableRecipes, setAvailableRecipes] =
    useState<Record<string, Recipe>>({});

  const [checkedItems, setCheckedItems] = useState<string[]>(
    []
  );

  const [pantryItems, setPantryItems] = useState<PantryItem[]>(
    []
  );

  const [showPantry, setShowPantry] = useState(false);

  const [pantryName, setPantryName] = useState("");
  const [pantryQuantity, setPantryQuantity] = useState("");
  const [pantryUnit, setPantryUnit] = useState("");

  const [editingPantryId, setEditingPantryId] =
    useState<string | null>(null);

  const [dataLoaded, setDataLoaded] = useState(false);

  function reloadPlanner() {
    try {
      const storedPlanner = localStorage.getItem("planner");

      setPlanner(
        normalizePlanner(
          storedPlanner ? JSON.parse(storedPlanner) : null
        )
      );
    } catch {
      setPlanner(normalizePlanner(null));
    }
  }

  function reloadRecipes() {
    setAvailableRecipes(loadRecipesFromStorage());
  }

  function reloadPantry() {
    setPantryItems(loadPantry());
  }

  function reloadAllData() {
    reloadPlanner();
    reloadRecipes();
    reloadPantry();
    setCheckedItems(loadCheckedItems());
  }

  useEffect(() => {
    reloadAllData();
    setDataLoaded(true);

    const handlePlannerChanged = () => reloadPlanner();
    const handleRecipesChanged = () => reloadRecipes();
    const handlePantryChanged = () => reloadPantry();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "planner") {
        reloadPlanner();
      }

      if (
        event.key === "recipes" ||
        event.key === "importedRecipes"
      ) {
        reloadRecipes();
      }

      if (event.key === "pantryItems") {
        reloadPantry();
      }

      if (event.key === "shoppingChecked") {
        setCheckedItems(loadCheckedItems());
      }
    };

    window.addEventListener(
      "plannerChanged",
      handlePlannerChanged
    );

    window.addEventListener(
      "recipesChanged",
      handleRecipesChanged
    );

    window.addEventListener(
      "pantryChanged",
      handlePantryChanged
    );

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        "plannerChanged",
        handlePlannerChanged
      );

      window.removeEventListener(
        "recipesChanged",
        handleRecipesChanged
      );

      window.removeEventListener(
        "pantryChanged",
        handlePantryChanged
      );

      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!dataLoaded) {
      return;
    }

    localStorage.setItem(
      "shoppingChecked",
      JSON.stringify(checkedItems)
    );
  }, [checkedItems, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) {
      return;
    }

    localStorage.setItem(
      "pantryItems",
      JSON.stringify(pantryItems)
    );
  }, [pantryItems, dataLoaded]);

  function notifyPantryChanged() {
    window.dispatchEvent(new Event("pantryChanged"));
  }

  function savePantryImmediately(items: PantryItem[]) {
    setPantryItems(items);

    localStorage.setItem(
      "pantryItems",
      JSON.stringify(items)
    );

    notifyPantryChanged();
  }

  function addPantryItem() {
    const name = pantryName.trim();

    if (!name) {
      return;
    }

    const quantity =
      pantryQuantity.trim() === ""
        ? null
        : Number(pantryQuantity.replace(",", "."));

    if (
      quantity !== null &&
      (!Number.isFinite(quantity) || quantity < 0)
    ) {
      return;
    }

    const unit = normalizeUnit(
      pantryUnit.trim() || null
    );

    const comparableName =
      getComparableIngredientName(name);

    const existingIndex = pantryItems.findIndex(
      (item) =>
        getComparableIngredientName(item.name) ===
        comparableName
    );

    let updatedItems: PantryItem[];

    if (existingIndex !== -1) {
      const existing = pantryItems[existingIndex];

      if (
        existing.quantity !== null &&
        quantity !== null &&
        unitsAreCompatible(existing.unit, unit)
      ) {
        const existingBase = convertToBaseQuantity(
          existing.quantity,
          existing.unit
        );

        const newBase = convertToBaseQuantity(
          quantity,
          unit
        );

        if (existingBase.unit === newBase.unit) {
          const totalBase =
            existingBase.quantity + newBase.quantity;

          updatedItems = [...pantryItems];

          updatedItems[existingIndex] = {
            ...existing,
            quantity: convertFromBaseQuantity(
              totalBase,
              existing.unit
            ),
          };
        } else {
          updatedItems = [...pantryItems];

          updatedItems[existingIndex] = {
            ...existing,
            quantity,
            unit,
          };
        }
      } else {
        updatedItems = [...pantryItems];

        updatedItems[existingIndex] = {
          ...existing,
          quantity,
          unit,
        };
      }
    } else {
      updatedItems = [
        ...pantryItems,
        {
          id: `${Date.now()}-${Math.random()}`,
          name,
          quantity,
          unit,
        },
      ];
    }

    savePantryImmediately(updatedItems);

    setPantryName("");
    setPantryQuantity("");
    setPantryUnit("");
  }

  function startEditingPantryItem(item: PantryItem) {
    setEditingPantryId(item.id);
    setPantryName(item.name);
    setPantryQuantity(
      item.quantity !== null
        ? String(item.quantity)
        : ""
    );
    setPantryUnit(item.unit || "");
  }

  function cancelEditingPantryItem() {
    setEditingPantryId(null);
    setPantryName("");
    setPantryQuantity("");
    setPantryUnit("");
  }

  function saveEditedPantryItem() {
    if (!editingPantryId) {
      return;
    }

    const name = pantryName.trim();

    if (!name) {
      return;
    }

    const quantity =
      pantryQuantity.trim() === ""
        ? null
        : Number(pantryQuantity.replace(",", "."));

    if (
      quantity !== null &&
      (!Number.isFinite(quantity) || quantity < 0)
    ) {
      return;
    }

    const unit = normalizeUnit(
      pantryUnit.trim() || null
    );

    const updatedItems = pantryItems.map((item) =>
      item.id === editingPantryId
        ? {
            ...item,
            name,
            quantity,
            unit,
          }
        : item
    );

    savePantryImmediately(updatedItems);
    cancelEditingPantryItem();
  }

  function removePantryItem(id: string) {
    savePantryImmediately(
      pantryItems.filter((item) => item.id !== id)
    );
  }

  const plannedRecipeOccurrences = useMemo(() => {
    const occurrences: string[] = [];

    for (const day of days) {
      for (const meal of meals) {
        const value = planner[day]?.[meal];

        if (Array.isArray(value)) {
          value.forEach((recipeId) => {
            if (typeof recipeId === "string") {
              occurrences.push(recipeId);
            }
          });
        } else if (typeof value === "string") {
          occurrences.push(value);
        }
      }
    }

    return occurrences;
  }, [planner]);

  const uniquePlannedRecipeIds = useMemo(
    () => [...new Set(plannedRecipeOccurrences)],
    [plannedRecipeOccurrences]
  );

  const shoppingMap = useMemo(() => {
    const map = new Map<string, ShoppingItem>();

    for (const recipeId of plannedRecipeOccurrences) {
      const recipe = availableRecipes[recipeId];

      if (!recipe) {
        continue;
      }

      for (const rawIngredient of recipe.ingredients) {
        const parsed = parseIngredient(rawIngredient);

        const ingredientName =
          parsed.name.trim() || rawIngredient.trim();

        const comparableName =
          getComparableIngredientName(ingredientName);

        const unit = normalizeUnit(parsed.unit);

        const id = `${comparableName}|${unit || "none"}`;

        const existing = map.get(id);

        if (!existing) {
          map.set(id, {
            id,
            name: formatShoppingName(
              ingredientName,
              parsed.quantity,
              unit
            ),
            ingredientName,
            quantity: parsed.quantity,
            totalQuantity: parsed.quantity,
            unit,
            recipes: [recipe.name],
            category: getCategory(ingredientName),
          });

          continue;
        }

        if (
          existing.quantity !== null &&
          parsed.quantity !== null &&
          unitsAreCompatible(existing.unit, unit)
        ) {
          const existingBase = convertToBaseQuantity(
            existing.quantity,
            existing.unit
          );

          const newBase = convertToBaseQuantity(
            parsed.quantity,
            unit
          );

          if (existingBase.unit === newBase.unit) {
            const totalBase =
              existingBase.quantity + newBase.quantity;

            const aggregatedQuantity =
              convertFromBaseQuantity(
                totalBase,
                existing.unit
              );

            existing.quantity = aggregatedQuantity;
            existing.totalQuantity =
              aggregatedQuantity;

            existing.name = formatShoppingName(
              existing.ingredientName ||
                ingredientName,
              existing.quantity,
              existing.unit
            );
          }
        }

        if (!existing.recipes.includes(recipe.name)) {
          existing.recipes.push(recipe.name);
        }
      }
    }

    return [...map.values()];
  }, [plannedRecipeOccurrences, availableRecipes]);

  const shoppingItems = useMemo(() => {
    return shoppingMap.map((item) => {
      const ingredientName =
        item.ingredientName || item.name;

      const pantryMatch = pantryItems.find((pantry) =>
        pantryMatchesIngredient(
          pantry,
          ingredientName
        )
      );

      if (!pantryMatch) {
        return item;
      }

      if (item.quantity === null) {
        return {
          ...item,
          owned: true,
          pantryQuantity: pantryMatch.quantity,
          pantryUnit: pantryMatch.unit,
        };
      }

      if (pantryMatch.quantity === null) {
        return {
          ...item,
          owned: true,
          pantryQuantity: null,
          pantryUnit: pantryMatch.unit,
        };
      }

      if (
        !unitsAreCompatible(
          item.unit,
          pantryMatch.unit
        )
      ) {
        return item;
      }

      const shoppingBase = convertToBaseQuantity(
        item.quantity,
        item.unit
      );

      const pantryBase = convertToBaseQuantity(
        pantryMatch.quantity,
        pantryMatch.unit
      );

      if (shoppingBase.unit !== pantryBase.unit) {
        return item;
      }

      if (
        pantryBase.quantity >=
        shoppingBase.quantity
      ) {
        return {
          ...item,
          owned: true,
          pantryQuantity: pantryMatch.quantity,
          pantryUnit: pantryMatch.unit,
        };
      }

      const remainingBase =
        shoppingBase.quantity -
        pantryBase.quantity;

      const remaining = convertFromBaseQuantity(
        remainingBase,
        item.unit
      );

      return {
        ...item,
        quantity: remaining,
        name: formatShoppingName(
          ingredientName,
          remaining,
          item.unit
        ),
        pantryQuantity: pantryMatch.quantity,
        pantryUnit: pantryMatch.unit,
      };
    });
  }, [shoppingMap, pantryItems]);

  function toggleItem(id: string) {
    setCheckedItems((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function clearChecked() {
    setCheckedItems([]);
  }

  const checkedCount = shoppingItems.filter((item) =>
    checkedItems.includes(item.id)
  ).length;

  function getCategoryItems(category: string) {
    return shoppingItems.filter(
      (item) => item.category === category
    );
  }

  const hasShoppingList = shoppingItems.length > 0;

  return (
    <main className="min-h-screen bg-[#F6F3EC] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/"
                className="text-sm text-[#879078] hover:underline"
              >
                ← Volver
              </Link>

              <h1 className="mt-2 text-3xl font-bold text-[#30352C]">
                Lista de compra 🛒
              </h1>

              <p className="mt-1 text-sm text-[#879078]">
                Organiza lo que necesitas comprar según tu
                planificación.
              </p>
            </div>

            {checkedCount > 0 && (
              <button
                type="button"
                onClick={clearChecked}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#59614F] shadow-sm transition hover:bg-[#EEEAE0]"
              >
                Desmarcar comprados
              </button>
            )}
          </div>
        </header>

        <section className="mb-6 overflow-hidden rounded-3xl bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowPantry((value) => !value)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div>
              <h2 className="font-semibold text-[#30352C]">
                🏠 Lo que tengo en casa
              </h2>

              <p className="mt-1 text-xs text-[#879078]">
                Añade alimentos que ya tienes para calcular
                cuánto necesitas comprar.
              </p>
            </div>

            <span className="text-[#879078]">
              {showPantry ? "⌃" : "⌄"}
            </span>
          </button>

          {showPantry && (
            <div className="border-t border-[#EEEAE0] px-5 pb-5 pt-4">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <input
                  type="text"
                  value={pantryName}
                  onChange={(event) =>
                    setPantryName(event.target.value)
                  }
                  placeholder="Ingrediente"
                  className="rounded-2xl border border-[#DDD8CC] bg-[#F6F3EC] px-4 py-3 text-sm text-[#30352C] outline-none placeholder:text-[#9A9D94] focus:border-[#AAB19D]"
                />

                <input
                  type="text"
                  inputMode="decimal"
                  value={pantryQuantity}
                  onChange={(event) =>
                    setPantryQuantity(event.target.value)
                  }
                  placeholder="Cantidad"
                  className="rounded-2xl border border-[#DDD8CC] bg-[#F6F3EC] px-4 py-3 text-sm text-[#30352C] outline-none placeholder:text-[#9A9D94] focus:border-[#AAB19D]"
                />

                <input
                  type="text"
                  value={pantryUnit}
                  onChange={(event) =>
                    setPantryUnit(event.target.value)
                  }
                  placeholder="Unidad"
                  className="rounded-2xl border border-[#DDD8CC] bg-[#F6F3EC] px-4 py-3 text-sm text-[#30352C] outline-none placeholder:text-[#9A9D94] focus:border-[#AAB19D]"
                />

                {editingPantryId ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEditedPantryItem}
                      className="rounded-2xl bg-[#879078] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#737D68]"
                    >
                      Guardar
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditingPantryItem}
                      className="rounded-2xl bg-[#EEEAE0] px-4 py-3 text-sm font-medium text-[#59614F] transition hover:bg-[#E3DFD4]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={addPantryItem}
                    className="rounded-2xl bg-[#879078] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#737D68]"
                  >
                    Añadir
                  </button>
                )}
              </div>

              {pantryItems.length > 0 && (
                <div className="mt-5 space-y-2">
                  {pantryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-[#F6F3EC] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#30352C]">
                          {item.name}
                        </p>

                        <p className="text-xs text-[#879078]">
                          {item.quantity !== null
                            ? `${formatNumber(
                                item.quantity
                              )}${
                                item.unit
                                  ? ` ${item.unit}`
                                  : ""
                              }`
                            : "Lo tengo"}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEditingPantryItem(item)
                          }
                          className="rounded-xl px-3 py-2 text-xs font-medium text-[#59614F] hover:bg-white"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removePantryItem(item.id)
                          }
                          className="rounded-xl px-3 py-2 text-xs font-medium text-[#9B6F67] hover:bg-white"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {!hasShoppingList ? (
          <section className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
            <div className="text-5xl">🛒</div>

            <h2 className="mt-4 text-xl font-semibold text-[#30352C]">
              Tu lista está vacía
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-[#879078]">
              Añade recetas al planificador para que aquí
              aparezcan automáticamente los ingredientes que
              necesitas.
            </p>

            <Link
              href="/planificador"
              className="mt-6 inline-flex rounded-2xl bg-[#879078] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#737D68]"
            >
              Ir al planificador
            </Link>
          </section>
        ) : (
          <>
            <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#30352C]">
                    {shoppingItems.length}{" "}
                    {shoppingItems.length === 1
                      ? "producto"
                      : "productos"}
                  </p>

                  <p className="mt-1 text-xs text-[#879078]">
                    {checkedCount}{" "}
                    {checkedCount === 1
                      ? "producto marcado"
                      : "productos marcados"}
                  </p>
                </div>

                <div className="rounded-full bg-[#F0EEE6] px-4 py-2 text-xs font-medium text-[#59614F]">
                  {uniquePlannedRecipeIds.length}{" "}
                  {uniquePlannedRecipeIds.length === 1
                    ? "receta"
                    : "recetas"}
                </div>
              </div>
            </section>

            <section className="mb-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {uniquePlannedRecipeIds.map((recipeId) => {
                  const recipe =
                    availableRecipes[recipeId];

                  if (!recipe) {
                    return null;
                  }

                  return (
                    <Link
                      key={recipeId}
                      href={`/recetas/${recipeId}`}
                      className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0EEE6] text-2xl">
                          {recipe.emoji || "🍽️"}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-[#879078]">
                            Receta
                          </p>

                          <h3 className="truncate font-semibold text-[#30352C]">
                            {recipe.name}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <div className="space-y-6">
              {categories.map((category) => {
                const categoryItems =
                  getCategoryItems(category);

                if (categoryItems.length === 0) {
                  return null;
                }

                return (
                  <section key={category}>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#30352C]">
                        {category}
                      </h2>

                      <span className="text-xs text-[#879078]">
                        {categoryItems.length}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                      {categoryItems.map((item, index) => {
                        const checked =
                          checkedItems.includes(item.id);

                        return (
                          <div
                            key={item.id}
                            className={`flex gap-3 px-5 py-4 ${
                              index !==
                              categoryItems.length - 1
                                ? "border-b border-[#EEEAE0]"
                                : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleItem(item.id)
                              }
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition ${
                                checked
                                  ? "border-[#879078] bg-[#879078] text-white"
                                  : "border-[#C7C9C0] bg-white text-transparent"
                              }`}
                              aria-label={
                                checked
                                  ? "Desmarcar producto"
                                  : "Marcar producto"
                              }
                            >
                              ✓
                            </button>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`font-medium ${
                                  checked
                                    ? "text-[#9A9D94] line-through"
                                    : "text-[#30352C]"
                                }`}
                              >
                                {item.name}
                              </p>

                              {item.recipes.length > 0 && (
                                <p className="mt-1 text-xs text-[#9A9D94]">
                                  {item.recipes.join(" · ")}
                                </p>
                              )}

                              {item.owned && (
                                <>
                                  <p className="mt-1 text-xs font-medium text-[#879078]">
                                    ✓ Ya lo tienes en casa
                                  </p>

                                  {item.totalQuantity !==
                                    undefined &&
                                    item.totalQuantity !==
                                      null && (
                                      <p className="mt-1 text-xs text-[#879078]">
                                        Necesitas{" "}
                                        {formatNumber(
                                          item.totalQuantity
                                        )}
                                        {item.unit
                                          ? ` ${item.unit}`
                                          : ""}{" "}
                                        · Tienes{" "}
                                        {item.pantryQuantity !==
                                          null &&
                                        item.pantryQuantity !==
                                          undefined
                                          ? `${formatNumber(
                                              item.pantryQuantity
                                            )}${
                                              item.pantryUnit
                                                ? ` ${item.pantryUnit}`
                                                : ""
                                            }`
                                          : "lo suficiente"}{" "}
                                        · No necesitas comprar
                                      </p>
                                    )}
                                </>
                              )}

                              {!item.owned &&
                                item.pantryQuantity !==
                                  undefined &&
                                item.pantryQuantity !==
                                  null &&
                                item.totalQuantity !==
                                  undefined &&
                                item.totalQuantity !==
                                  null && (
                                  <p className="mt-1 text-xs text-[#879078]">
                                    Necesitas{" "}
                                    {formatNumber(
                                      item.totalQuantity
                                    )}
                                    {item.unit
                                      ? ` ${item.unit}`
                                      : ""}{" "}
                                    · Tienes{" "}
                                    {formatNumber(
                                      item.pantryQuantity
                                    )}
                                    {item.pantryUnit
                                      ? ` ${item.pantryUnit}`
                                      : ""}{" "}
                                    · Comprar{" "}
                                    {formatNumber(
                                      item.quantity ?? 0
                                    )}
                                    {item.unit
                                      ? ` ${item.unit}`
                                      : ""}
                                  </p>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}