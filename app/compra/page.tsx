
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import ShoppingCategoryManager, {
  type ShoppingCategory,
} from "@/app/components/ShoppingCategoryManager";
import {
  DEFAULT_CATEGORY_NAMES,
  getAutomaticCategory,
  resolveAutomaticCategory,
} from "@/lib/ingredient-category";
import { supabase } from "@/lib/supabase";
import IngredientAutocomplete from "@/app/components/IngredientAutocomplete";
import PantrySection from "@/app/components/PantrySection";
import IngredientsCatalog from "@/app/components/IngredientsCatalog";

type Recipe = {
  id: string;
  name: string;
  emoji?: string;
};

type RecipeIngredientRow = {
  recipe_id: number;
  ingredient_id: number;
  quantity: number | null;
  unit: string | null;
};

type IngredientRow = {
  id: number;
  name: string;
};

type ShoppingItem = {
  id: string;
  ingredientId: number;
  name: string;
  ingredientName: string;
  recipes: string[];
  category: string;
  quantity: number | null;
  totalQuantity: number | null;
  unit: string | null;
  owned?: boolean;
  pantryQuantity?: number | null;
  pantryUnit?: string | null;
  source: "recipe" | "manual";
};

type PantryItem = {
  id: string;
  ingredientId: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  location: string | null;
};

type StoredShoppingRow = {
  id: number;
  ingredient_id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
};

type RelationRow = {
  shopping_list_id: number;
  recipe_id: number;
};

const PANTRY_LOCATIONS = [
  "Nevera",
  "Armario",
  "Congelador",
  "Especias",
] as const;

const PANTRY_LOCATION_STORAGE_KEY = "mi-cocina-ingredient-locations";

type PantryLocation = (typeof PANTRY_LOCATIONS)[number];

function isPantryLocation(value: unknown): value is PantryLocation {
  return (
    typeof value === "string" &&
    PANTRY_LOCATIONS.includes(value as PantryLocation)
  );
}

function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;

  const value = unit.toLowerCase().trim();

  if (["g", "gr", "gramo", "gramos"].includes(value)) return "g";
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value))
    return "kg";
  if (["ml", "mililitro", "mililitros"].includes(value)) return "ml";
  if (["l", "litro", "litros"].includes(value)) return "l";
  if (["cl", "centilitro", "centilitros"].includes(value)) return "cl";
  if (["unidad", "unidades", "ud", "uds"].includes(value)) return "unidad";
  if (["cucharadita", "cucharaditas"].includes(value))
    return "cucharadita";
  if (["cucharada", "cucharadas"].includes(value)) return "cucharada";
  if (["taza", "tazas"].includes(value)) return "taza";
  if (["vaso", "vasos"].includes(value)) return "vaso";

  return value;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);

  return value
    .toFixed(2)
    .replace(/\.0+$/, "")
    .replace(/(\.\d)0$/, "$1")
    .replace(".", ",");
}

function getComparableIngredientName(name: string): string {
  let result = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "");

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

function convertToBaseQuantity(
  quantity: number,
  unit: string | null
): { quantity: number; unit: string | null } {
  const normalized = normalizeUnit(unit);

  if (normalized === "kg") return { quantity: quantity * 1000, unit: "g" };
  if (normalized === "l") return { quantity: quantity * 1000, unit: "ml" };
  if (normalized === "cl") return { quantity: quantity * 10, unit: "ml" };

  return { quantity, unit: normalized };
}

function convertFromBaseQuantity(
  quantity: number,
  unit: string | null
): number {
  const normalized = normalizeUnit(unit);

  if (normalized === "kg" || normalized === "l") return quantity / 1000;
  if (normalized === "cl") return quantity / 10;

  return quantity;
}

function unitsAreCompatible(
  first: string | null,
  second: string | null
): boolean {
  const a = normalizeUnit(first);
  const b = normalizeUnit(second);

  if (a === b) return true;

  const weightUnits = ["g", "kg"];
  const volumeUnits = ["ml", "l", "cl"];

  if (a && b && weightUnits.includes(a) && weightUnits.includes(b)) {
    return true;
  }

  if (a && b && volumeUnits.includes(a) && volumeUnits.includes(b)) {
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

function formatShoppingName(
  name: string,
  quantity: number | null,
  unit: string | null
): string {
  if (quantity === null) return name;
  if (unit) return `${formatNumber(quantity)} ${unit} de ${name}`;

  return `${formatNumber(quantity)} ${name}`;
}

function getMonday(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);

  return result;
}

function formatDateForDatabase(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekRange() {
  const monday = getMonday(new Date());
  const sunday = new Date(monday);

  sunday.setDate(monday.getDate() + 6);

  return {
    monday: formatDateForDatabase(monday),
    sunday: formatDateForDatabase(sunday),
  };
}

export default function ShoppingPage() {
  const [availableRecipes, setAvailableRecipes] = useState<
    Record<string, Recipe>
  >({});
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);

  const [manualName, setManualName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [manualUnit, setManualUnit] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const [activeSection, setActiveSection] = useState<
    "lista" | "almacen" | "ingredientes"
  >("lista");
  const [activeList, setActiveList] = useState<"recipe" | "manual">("manual");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [contextMenuItem, setContextMenuItem] =
    useState<ShoppingItem | null>(null);
  const [pressedItemId, setPressedItemId] = useState<string | null>(null);

  // La ubicación se recuerda por ingrediente, no por fila de compra.
  const [pantryDestinations, setPantryDestinations] = useState<
    Record<string, PantryLocation>
  >({});

  const [addingPurchased, setAddingPurchased] = useState(false);

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PANTRY_LOCATION_STORAGE_KEY);

      if (!saved) return;

      const parsed: unknown = JSON.parse(saved);

      if (!parsed || typeof parsed !== "object") return;

      const validLocations: Record<string, PantryLocation> = {};

      Object.entries(parsed).forEach(([ingredientId, location]) => {
        if (isPantryLocation(location)) {
          validLocations[ingredientId] = location;
        }
      });

      setPantryDestinations(validLocations);
    } catch (error) {
      console.error("No se han podido recuperar las ubicaciones guardadas:", error);
    }
  }, []);

  function changePantryDestination(
    ingredientId: number,
    location: PantryLocation
  ) {
    setPantryDestinations((current) => {
      const updated = {
        ...current,
        [String(ingredientId)]: location,
      };

      try {
        localStorage.setItem(
          PANTRY_LOCATION_STORAGE_KEY,
          JSON.stringify(updated)
        );
      } catch (error) {
        console.error("No se ha podido guardar la ubicación:", error);
      }

      return updated;
    });
  }

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setLoading(false);
        return;
      }

      const defaultCategories = DEFAULT_CATEGORY_NAMES;
      let categoryRows: ShoppingCategory[] = [];

      const { data: savedCategories, error: categoriesError } = await supabase
        .from("shopping_categories")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (categoriesError) throw categoriesError;

      if (!savedCategories || savedCategories.length === 0) {
        const { data: insertedCategories, error: insertCategoriesError } =
          await supabase
            .from("shopping_categories")
            .insert(
              defaultCategories.map((name, index) => ({
                user_id: user.id,
                name,
                sort_order: index,
              }))
            )
            .select("id, name, sort_order");

        if (insertCategoriesError) throw insertCategoriesError;

        categoryRows = (insertedCategories || []) as ShoppingCategory[];
      } else {
        categoryRows = savedCategories as ShoppingCategory[];
      }

      setCategories(categoryRows);

      const { data: assignmentRows, error: assignmentsError } = await supabase
        .from("ingredient_category_assignments")
        .select("ingredient_id, category_id")
        .eq("user_id", user.id);

      if (assignmentsError) throw assignmentsError;

      const assignments: Record<number, number> = {};

      (assignmentRows || []).forEach((row) => {
        assignments[Number(row.ingredient_id)] = Number(row.category_id);
      });

      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, title")
        .eq("user_id", user.id);

      if (recipesError) throw recipesError;

      const recipeMap: Record<string, Recipe> = {};

      for (const recipe of recipesData || []) {
        recipeMap[String(recipe.id)] = {
          id: String(recipe.id),
          name: recipe.title,
          emoji: "🍽️",
        };
      }

      setAvailableRecipes(recipeMap);

      const { monday, sunday } = getWeekRange();

      const { data: planningData, error: planningError } = await supabase
        .from("planning")
        .select("recipe_id, date, meal_type")
        .eq("user_id", user.id)
        .gte("date", monday)
        .lte("date", sunday);

      if (planningError) throw planningError;

      const plannedRecipeIds = [
        ...new Set(
          (planningData || [])
            .map((row) => Number(row.recipe_id))
            .filter((id) => Number.isFinite(id))
        ),
      ];

      let recipeIngredients: RecipeIngredientRow[] = [];

      if (plannedRecipeIds.length > 0) {
        const {
          data: recipeIngredientsData,
          error: recipeIngredientsError,
        } = await supabase
          .from("recipe_ingredients")
          .select("recipe_id, ingredient_id, quantity, unit")
          .in("recipe_id", plannedRecipeIds);

        if (recipeIngredientsError) throw recipeIngredientsError;

        recipeIngredients = (recipeIngredientsData ||
          []) as RecipeIngredientRow[];
      }

      const ingredientIds = [
        ...new Set(
          recipeIngredients
            .map((row) => Number(row.ingredient_id))
            .filter((id) => Number.isFinite(id))
        ),
      ];

      let ingredients: IngredientRow[] = [];

      if (ingredientIds.length > 0) {
        const { data: ingredientsData, error: ingredientsError } =
          await supabase
            .from("ingredients")
            .select("id, name")
            .in("id", ingredientIds);

        if (ingredientsError) throw ingredientsError;

        ingredients = (ingredientsData || []) as IngredientRow[];
      }

      const ingredientNameMap = new Map<number, string>();

      for (const ingredient of ingredients) {
        ingredientNameMap.set(Number(ingredient.id), ingredient.name);
      }

      const generatedMap = new Map<string, ShoppingItem>();

      for (const plannedRecipeId of plannedRecipeIds) {
        const recipe = recipeMap[String(plannedRecipeId)];

        if (!recipe) continue;

        const recipeIngredientRows = recipeIngredients.filter(
          (row) => Number(row.recipe_id) === plannedRecipeId
        );

        for (const row of recipeIngredientRows) {
          const ingredientName =
            ingredientNameMap.get(Number(row.ingredient_id)) || "Ingrediente";

          const unit = normalizeUnit(row.unit);
          const key = String(row.ingredient_id);
          const existing = generatedMap.get(key);

          if (!existing) {
            generatedMap.set(key, {
              id: `ingredient-${row.ingredient_id}`,
              ingredientId: Number(row.ingredient_id),
              name: formatShoppingName(ingredientName, row.quantity, unit),
              ingredientName,
              recipes: [recipe.name],
              category: getAutomaticCategory(ingredientName),
              quantity: row.quantity,
              totalQuantity: row.quantity,
              unit,
              source: "recipe",
            });

            continue;
          }

          if (
            existing.quantity !== null &&
            row.quantity !== null &&
            unitsAreCompatible(existing.unit, unit)
          ) {
            const existingBase = convertToBaseQuantity(
              existing.quantity,
              existing.unit
            );
            const newBase = convertToBaseQuantity(row.quantity, unit);

            if (existingBase.unit === newBase.unit) {
              const totalBase = existingBase.quantity + newBase.quantity;
              const total = convertFromBaseQuantity(
                totalBase,
                existing.unit
              );

              existing.quantity = total;
              existing.totalQuantity = total;
              existing.name = formatShoppingName(
                existing.ingredientName,
                total,
                existing.unit
              );
            }
          }

          if (!existing.recipes.includes(recipe.name)) {
            existing.recipes.push(recipe.name);
          }
        }
      }

      const { data: pantryData, error: pantryError } = await supabase
        .from("pantry")
        .select("id, ingredient_id, quantity, unit, location")
        .eq("user_id", user.id);

      if (pantryError) throw pantryError;

      const pantryIngredientIds = [
        ...new Set(
          (pantryData || [])
            .map((item) => Number(item.ingredient_id))
            .filter((id) => Number.isFinite(id))
        ),
      ];

      let pantryIngredientNames: IngredientRow[] = [];

      if (pantryIngredientIds.length > 0) {
        const {
          data: pantryIngredientsData,
          error: pantryIngredientsError,
        } = await supabase
          .from("ingredients")
          .select("id, name")
          .in("id", pantryIngredientIds);

        if (pantryIngredientsError) throw pantryIngredientsError;

        pantryIngredientNames = (pantryIngredientsData ||
          []) as IngredientRow[];
      }

      const pantryNameMap = new Map<number, string>();

      for (const ingredient of pantryIngredientNames) {
        pantryNameMap.set(Number(ingredient.id), ingredient.name);
      }

      const loadedPantry: PantryItem[] = (pantryData || []).map((item) => ({
        id: String(item.id),
        ingredientId: Number(item.ingredient_id),
        name: pantryNameMap.get(Number(item.ingredient_id)) || "Ingrediente",
        quantity: item.quantity !== null ? Number(item.quantity) : null,
        unit: normalizeUnit(item.unit),
        location: item.location ?? null,
      }));

      setPantryItems(loadedPantry);

      const { data: existingShoppingData, error: shoppingError } =
        await supabase
          .from("shopping_list")
          .select("id, ingredient_id, name, quantity, unit, checked")
          .eq("user_id", user.id);

      if (shoppingError) throw shoppingError;

      const existingShopping = (existingShoppingData ||
        []) as StoredShoppingRow[];

      const existingShoppingIds = existingShopping
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id));

      let existingRelations: RelationRow[] = [];

      if (existingShoppingIds.length > 0) {
        const { data: relationsData, error: relationsError } = await supabase
          .from("shopping_list_recipes")
          .select("shopping_list_id, recipe_id")
          .in("shopping_list_id", existingShoppingIds);

        if (relationsError) throw relationsError;

        existingRelations = (relationsData || []) as RelationRow[];
      }

      const generatedShoppingIds = new Set(
        existingRelations.map((row) => Number(row.shopping_list_id))
      );

      const manualItems: ShoppingItem[] = existingShopping
        .filter((item) => !generatedShoppingIds.has(Number(item.id)))
        .map((item) => ({
          id: String(item.id),
          ingredientId: Number(item.ingredient_id),
          name: formatShoppingName(
            item.name,
            item.quantity !== null ? Number(item.quantity) : null,
            normalizeUnit(item.unit)
          ),
          ingredientName: item.name,
          recipes: [],
          category: getAutomaticCategory(item.name),
          quantity: item.quantity !== null ? Number(item.quantity) : null,
          totalQuantity: item.quantity !== null ? Number(item.quantity) : null,
          unit: normalizeUnit(item.unit),
          source: "manual",
        }));

      const generatedItems = [...generatedMap.values()];

      const generatedIngredientIds = new Set(
        generatedItems.map((item) => item.ingredientId)
      );

      const existingGeneratedShopping = existingShopping.filter((item) =>
        generatedShoppingIds.has(Number(item.id))
      );

      const existingGeneratedByIngredient = new Map<
        number,
        StoredShoppingRow
      >();

      for (const item of existingGeneratedShopping) {
        existingGeneratedByIngredient.set(Number(item.ingredient_id), item);
      }

      const obsoleteGeneratedIds = existingGeneratedShopping
        .filter(
          (item) => !generatedIngredientIds.has(Number(item.ingredient_id))
        )
        .map((item) => Number(item.id));

      if (obsoleteGeneratedIds.length > 0) {
        const { error: deleteRelationsError } = await supabase
          .from("shopping_list_recipes")
          .delete()
          .in("shopping_list_id", obsoleteGeneratedIds);

        if (deleteRelationsError) throw deleteRelationsError;

        const { error: deleteShoppingError } = await supabase
          .from("shopping_list")
          .delete()
          .in("id", obsoleteGeneratedIds)
          .eq("user_id", user.id);

        if (deleteShoppingError) throw deleteShoppingError;
      }

      const finalRecipeShoppingItems: ShoppingItem[] = [];

      for (const item of generatedItems) {
        const existing = existingGeneratedByIngredient.get(item.ingredientId);
        let shoppingId: number;

        if (existing) {
          shoppingId = Number(existing.id);

          const { error: updateError } = await supabase
            .from("shopping_list")
            .update({
              name: item.ingredientName,
              quantity: item.quantity,
              unit: item.unit,
            })
            .eq("id", shoppingId)
            .eq("user_id", user.id);

          if (updateError) throw updateError;
        } else {
          const { data: insertedShopping, error: insertError } = await supabase
            .from("shopping_list")
            .insert({
              user_id: user.id,
              ingredient_id: item.ingredientId,
              name: item.ingredientName,
              quantity: item.quantity,
              unit: item.unit,
              checked: false,
            })
            .select("id")
            .single();

          if (insertError) throw insertError;

          shoppingId = Number(insertedShopping.id);
        }

        finalRecipeShoppingItems.push({
          ...item,
          id: String(shoppingId),
        });
      }

      const shoppingIds = finalRecipeShoppingItems
        .map((item) => Number(item.id))
        .filter((id) => Number.isFinite(id));

      if (shoppingIds.length > 0) {
        const { error: deleteRelationsError } = await supabase
          .from("shopping_list_recipes")
          .delete()
          .in("shopping_list_id", shoppingIds);

        if (deleteRelationsError) throw deleteRelationsError;
      }

      const relationKeySet = new Set<string>();
      const relationRows: RelationRow[] = [];

      for (const item of finalRecipeShoppingItems) {
        const shoppingId = Number(item.id);

        const recipeIdsForIngredient = [
          ...new Set(
            recipeIngredients
              .filter(
                (row) => Number(row.ingredient_id) === item.ingredientId
              )
              .map((row) => Number(row.recipe_id))
          ),
        ];

        for (const recipeId of recipeIdsForIngredient) {
          const key = `${shoppingId}-${recipeId}`;

          if (relationKeySet.has(key)) continue;

          relationKeySet.add(key);

          relationRows.push({
            shopping_list_id: shoppingId,
            recipe_id: recipeId,
          });
        }
      }

      if (relationRows.length > 0) {
        const { error: relationError } = await supabase
          .from("shopping_list_recipes")
          .upsert(relationRows, {
            onConflict: "shopping_list_id,recipe_id",
            ignoreDuplicates: true,
          });

        if (relationError) throw relationError;
      }

      const recipeItemsWithPantry = finalRecipeShoppingItems.map((item) => {
        const pantryMatch = loadedPantry.find(
          (pantry) =>
            Number(pantry.ingredientId) === Number(item.ingredientId) ||
            pantryMatchesIngredient(pantry, item.ingredientName)
        );

        if (!pantryMatch) return item;

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

        if (!unitsAreCompatible(item.unit, pantryMatch.unit)) {
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

        if (shoppingBase.unit !== pantryBase.unit) return item;

        if (pantryBase.quantity >= shoppingBase.quantity) {
          return {
            ...item,
            owned: true,
            pantryQuantity: pantryMatch.quantity,
            pantryUnit: pantryMatch.unit,
          };
        }

        const remainingBase = shoppingBase.quantity - pantryBase.quantity;
        const remaining = convertFromBaseQuantity(
          remainingBase,
          item.unit
        );

        return {
          ...item,
          quantity: remaining,
          name: formatShoppingName(
            item.ingredientName,
            remaining,
            item.unit
          ),
          pantryQuantity: pantryMatch.quantity,
          pantryUnit: pantryMatch.unit,
        };
      });

      const categoryNameById = new Map(
        categoryRows.map((category) => [
          Number(category.id),
          category.name,
        ])
      );

      const allItems = [...recipeItemsWithPantry, ...manualItems].map(
        (item) => ({
          ...item,
          category:
            categoryNameById.get(assignments[Number(item.ingredientId)]) ||
            resolveAutomaticCategory(item.ingredientName, categoryRows),
        })
      );

      setShoppingItems(allItems);

      const allValidIds = new Set(allItems.map((item) => item.id));

      const checkedIds = existingShopping
        .filter((item) => item.checked)
        .map((item) => String(item.id))
        .filter((id) => allValidIds.has(id));

      setCheckedItems(checkedIds);
    } catch (error) {
      console.error("Error cargando lista de compra desde Supabase:", error);

      setErrorMessage(
        "No hemos podido cargar la lista de compra. Revisa la consola para ver el error."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();

    const handlePlannerChanged = () => {
      void loadData();
    };

    window.addEventListener("plannerChanged", handlePlannerChanged);

    return () => {
      window.removeEventListener("plannerChanged", handlePlannerChanged);
    };
  }, []);

  useEffect(() => {
    if (!contextMenuItem) return;

    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setContextMenuItem(null);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
    };
  }, [contextMenuItem]);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  async function toggleItem(id: string) {
    const numericId = Number(id);
    const currentChecked = checkedItems.includes(id);
    const newChecked = !currentChecked;

    setCheckedItems((current) =>
      newChecked
        ? [...current, id]
        : current.filter((item) => item !== id)
    );

    const { error } = await supabase
      .from("shopping_list")
      .update({ checked: newChecked })
      .eq("id", numericId);

    if (error) {
      console.error("Error guardando producto comprado:", error);

      setCheckedItems((current) =>
        newChecked
          ? current.filter((item) => item !== id)
          : [...current, id]
      );
    }
  }

  async function addPurchasedItemsToPantry() {
    if (addingPurchased) return;

    const purchasedItems = displayedItems.filter((item) =>
      checkedItems.includes(item.id)
    );

    if (purchasedItems.length === 0) return;

    setAddingPurchased(true);
    setActionMessage("");
    setErrorMessage("");

    const successfulIds: string[] = [];
    const failedNames: string[] = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setActionMessage("Inicia sesión para actualizar tu almacén.");
        return;
      }

      for (const item of purchasedItems) {
        try {
          const quantityToAdd = item.quantity ?? item.totalQuantity ?? null;
          const unitToAdd = normalizeUnit(item.unit);
          const shoppingId = Number(item.id);

          // Cada ingrediente utiliza su propia ubicación recordada.
          const destination =
            pantryDestinations[String(item.ingredientId)] || "Nevera";

          const { data: existing, error: pantryError } = await supabase
            .from("pantry")
            .select("id, quantity, unit")
            .eq("user_id", user.id)
            .eq("ingredient_id", item.ingredientId)
            .eq("location", destination)
            .maybeSingle();

          if (pantryError) throw pantryError;

          if (existing) {
            let mergedQuantity: number | null = existing.quantity;
            let mergedUnit = normalizeUnit(existing.unit);

            if (existing.quantity === null) {
              mergedQuantity = quantityToAdd;
              mergedUnit = unitToAdd ?? mergedUnit;
            } else if (quantityToAdd !== null) {
              if (!unitsAreCompatible(existing.unit, unitToAdd)) {
                throw new Error("Las unidades no son compatibles.");
              }

              const existingBase = convertToBaseQuantity(
                Number(existing.quantity),
                existing.unit
              );

              const addedBase = convertToBaseQuantity(
                quantityToAdd,
                unitToAdd
              );

              if (existingBase.unit !== addedBase.unit) {
                throw new Error("Las unidades no son compatibles.");
              }

              mergedQuantity = convertFromBaseQuantity(
                existingBase.quantity + addedBase.quantity,
                existing.unit
              );
            }

            const { error: updateError } = await supabase
              .from("pantry")
              .update({
                quantity: mergedQuantity,
                unit: mergedUnit,
              })
              .eq("id", existing.id)
              .eq("user_id", user.id);

            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from("pantry")
              .insert({
                user_id: user.id,
                ingredient_id: item.ingredientId,
                quantity: quantityToAdd,
                unit: unitToAdd,
                location: destination,
              });

            if (insertError) throw insertError;
          }

          if (item.source === "manual") {
            const { error: deleteError } = await supabase
              .from("shopping_list")
              .delete()
              .eq("id", shoppingId)
              .eq("user_id", user.id);

            if (deleteError) throw deleteError;
          } else {
            const { error: updateShoppingError } = await supabase
              .from("shopping_list")
              .update({ checked: false })
              .eq("id", shoppingId)
              .eq("user_id", user.id);

            if (updateShoppingError) throw updateShoppingError;
          }

          successfulIds.push(item.id);
        } catch (error) {
          console.error(
            `Error pasando ${item.ingredientName} al almacén:`,
            error
          );
          failedNames.push(item.ingredientName);
        }
      }

      if (successfulIds.length > 0) {
        setShoppingItems((current) =>
          current.filter((item) => !successfulIds.includes(item.id))
        );

        setCheckedItems((current) =>
          current.filter((id) => !successfulIds.includes(id))
        );

        await loadData();
      }

      if (failedNames.length === 0) {
        setActionMessage(
          `${successfulIds.length} ${
            successfulIds.length === 1
              ? "producto añadido"
              : "productos añadidos"
          } al almacén en sus ubicaciones correspondientes.`
        );
      } else {
        setActionMessage(
          `${successfulIds.length} añadidos al almacén. No se han podido añadir: ${failedNames.join(
            ", "
          )}. Siguen en tu lista.`
        );
      }
    } catch (error) {
      console.error("Error actualizando el almacén:", error);
      setActionMessage(
        "No se ha podido completar la operación. Inténtalo de nuevo."
      );
    } finally {
      setAddingPurchased(false);
    }
  }

  async function clearChecked() {
    if (checkedItems.length === 0) return;

    const ids = checkedItems
      .map(Number)
      .filter((id) => Number.isFinite(id));

    const { error } = await supabase
      .from("shopping_list")
      .update({ checked: false })
      .in("id", ids);

    if (error) {
      console.error("Error desmarcando productos:", error);
      return;
    }

    setCheckedItems([]);
  }

  async function findOrCreateIngredient(name: string): Promise<number | null> {
    const normalizedName = name.trim();

    if (!normalizedName) return null;

    const { data: existing, error: searchError } = await supabase
      .from("ingredients")
      .select("id, name")
      .ilike("name", normalizedName)
      .limit(1)
      .maybeSingle();

    if (searchError) {
      console.error("Error buscando ingrediente:", searchError);
      return null;
    }

    if (existing) return Number(existing.id);

    const { data: created, error: createError } = await supabase
      .from("ingredients")
      .insert({ name: normalizedName })
      .select("id")
      .single();

    if (createError) {
      console.error("Error creando ingrediente:", createError);
      return null;
    }

    return Number(created.id);
  }

  async function createCategory(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");

    const { data, error } = await supabase
      .from("shopping_categories")
      .insert({
        user_id: user.id,
        name: cleanName,
        sort_order: categories.length,
      })
      .select("id, name, sort_order")
      .single();

    if (error) throw error;

    setCategories((current) =>
      [...current, data as ShoppingCategory].sort(
        (a, b) => a.sort_order - b.sort_order
      )
    );
  }

  async function renameCategory(id: number, name: string) {
    const cleanName = name.trim();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");

    const { data, error } = await supabase
      .from("shopping_categories")
      .update({ name: cleanName })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, sort_order")
      .single();

    if (error) throw error;

    const oldName = categories.find((category) => category.id === id)?.name;

    setCategories((current) =>
      current.map((category) =>
        category.id === id ? (data as ShoppingCategory) : category
      )
    );

    setShoppingItems((current) =>
      current.map((item) =>
        item.category === oldName ? { ...item, category: cleanName } : item
      )
    );
  }

  async function reorderCategories(orderedIds: number[]) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");

    const previous = categories;

    const reordered = orderedIds
      .map((id) => previous.find((category) => category.id === id))
      .filter((category): category is ShoppingCategory => Boolean(category))
      .map((category, index) => ({ ...category, sort_order: index }));

    setCategories(reordered);

    const results = await Promise.all(
      reordered.map((category) =>
        supabase
          .from("shopping_categories")
          .update({ sort_order: category.sort_order })
          .eq("id", category.id)
          .eq("user_id", user.id)
      )
    );

    const failed = results.find((result) => result.error);

    if (failed?.error) {
      setCategories(previous);
      throw failed.error;
    }
  }

  async function deleteCategory(id: number) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");

    const { error } = await supabase
      .from("shopping_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    setCategories((current) =>
      current.filter((category) => category.id !== id)
    );

    await loadData();
  }

  async function changeShoppingCategory(
    item: ShoppingItem,
    categoryId: number
  ) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) return;

    const { error } = await supabase
      .from("ingredient_category_assignments")
      .upsert(
        {
          user_id: user.id,
          ingredient_id: item.ingredientId,
          category_id: categoryId,
        },
        { onConflict: "user_id,ingredient_id" }
      );

    if (error) {
      console.error("Error guardando categoría:", error);
      setErrorMessage("No se ha podido guardar la categoría del ingrediente.");
      return;
    }

    const selected = categories.find((category) => category.id === categoryId);
    if (!selected) return;

    setShoppingItems((current) =>
      current.map((entry) =>
        entry.ingredientId === item.ingredientId
          ? { ...entry, category: selected.name }
          : entry
      )
    );

    setContextMenuItem(null);
  }

  async function addManualItem() {
    const name = manualName.trim();

    if (!name || addingManual) return;

    const quantity =
      manualQuantity.trim() === ""
        ? null
        : Number(manualQuantity.replace(",", "."));

    if (
      quantity !== null &&
      (!Number.isFinite(quantity) || quantity < 0)
    ) {
      setErrorMessage("Introduce una cantidad válida.");
      return;
    }

    setAddingManual(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setErrorMessage("Inicia sesión para añadir productos a tu lista.");
        return;
      }

      const ingredientId = await findOrCreateIngredient(name);

      if (!ingredientId) {
        setErrorMessage("No se ha podido guardar el ingrediente.");
        return;
      }

      const unit = normalizeUnit(manualUnit.trim() || null);

      const { data: inserted, error } = await supabase
        .from("shopping_list")
        .insert({
          user_id: user.id,
          ingredient_id: ingredientId,
          name,
          quantity,
          unit,
          checked: false,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error añadiendo producto manual:", error);
        setErrorMessage(
          "No se ha podido añadir el producto. Inténtalo de nuevo."
        );
        return;
      }

      if (!inserted) {
        setErrorMessage(
          "No se ha recibido confirmación del producto añadido."
        );
        return;
      }

      setManualName("");
      setManualQuantity("");
      setManualUnit("");
      setActiveList("manual");
      setIsAddFormOpen(false);

      await loadData();
    } catch (error) {
      console.error("Error añadiendo producto manual:", error);
      setErrorMessage(
        "No se ha podido añadir el producto. Inténtalo de nuevo."
      );
    } finally {
      setAddingManual(false);
    }
  }

  async function removeManualItem(id: string) {
    const item = shoppingItems.find(
      (shoppingItem) => shoppingItem.id === id
    );

    if (!item || item.source !== "manual") return;

    const { error } = await supabase
      .from("shopping_list")
      .delete()
      .eq("id", Number(id));

    if (error) {
      console.error("Error eliminando producto manual:", error);
      setErrorMessage("No se ha podido eliminar el producto.");
      return;
    }

    setShoppingItems((current) =>
      current.filter((shoppingItem) => shoppingItem.id !== id)
    );

    setCheckedItems((current) =>
      current.filter((checkedId) => checkedId !== id)
    );

    setContextMenuItem(null);
  }

  const recipeItems = useMemo(
    () => shoppingItems.filter((item) => item.source === "recipe"),
    [shoppingItems]
  );

  const manualItems = useMemo(
    () => shoppingItems.filter((item) => item.source === "manual"),
    [shoppingItems]
  );

  const displayedItems =
    activeList === "recipe"
      ? recipeItems.filter(
          (item) => !item.owned || checkedItems.includes(item.id)
        )
      : manualItems;

  const checkedCount = displayedItems.filter((item) =>
    checkedItems.includes(item.id)
  ).length;

  const pendingItems = displayedItems.filter(
    (item) => !checkedItems.includes(item.id)
  );

  const purchasedItems = displayedItems.filter((item) =>
    checkedItems.includes(item.id)
  );

  function getCategoriesForItems(items: ShoppingItem[]) {
    return Array.from(
      new Set([
        ...categories.map((category) => category.name),
        ...items.map((item) => item.category),
      ])
    ).filter((category) =>
      items.some((item) => item.category === category)
    );
  }

  function renderShoppingGroups(items: ShoppingItem[]) {
    const categoryNames = getCategoriesForItems(items);

    return (
      <div className="space-y-3">
        {categoryNames.map((category) => {
          const categoryItems = items.filter(
            (item) => item.category === category
          );

          return (
            <section
              key={category}
              className="rounded-3xl bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-[#30352C]">
                  {category}
                </h3>
                <span className="rounded-full bg-[#F1F2ED] px-2.5 py-1 text-xs font-medium text-[#737D68]">
                  {categoryItems.length}
                </span>
              </div>

              <div className="divide-y divide-[#EEECE5]">
                {categoryItems.map((item) => {
                  const checked = checkedItems.includes(item.id);
                  const isPressed = pressedItemId === item.id;
                  const menuOpen = contextMenuItem?.id === item.id;

                  const selectedDestination =
                    pantryDestinations[String(item.ingredientId)] || "Nevera";

                  return (
                    <div
                      key={item.id}
                      className={`relative flex items-center gap-3 rounded-xl py-3.5 transition-colors first:pt-0 last:pb-0 ${
                        isPressed ? "bg-[#26352D]/10" : ""
                      }`}
                      style={{ touchAction: "pan-y" }}
                      onPointerDown={(
                        event: ReactPointerEvent<HTMLDivElement>
                      ) => {
                        if (
                          event.pointerType === "mouse" &&
                          event.button !== 0
                        ) {
                          return;
                        }

                        const target = event.target as HTMLElement;

                        if (
                          target.closest(
                            "button, select, input, textarea, a"
                          )
                        ) {
                          return;
                        }

                        if (pressTimerRef.current) {
                          clearTimeout(pressTimerRef.current);
                        }

                        pressStartRef.current = {
                          x: event.clientX,
                          y: event.clientY,
                        };

                        setPressedItemId(item.id);

                        pressTimerRef.current = setTimeout(() => {
                          setContextMenuItem(item);
                          setPressedItemId(null);
                          pressTimerRef.current = null;
                        }, 550);
                      }}
                      onPointerMove={(
                        event: ReactPointerEvent<HTMLDivElement>
                      ) => {
                        if (
                          !pressStartRef.current ||
                          !pressTimerRef.current
                        ) {
                          return;
                        }

                        const distance = Math.sqrt(
                          Math.pow(
                            event.clientX - pressStartRef.current.x,
                            2
                          ) +
                            Math.pow(
                              event.clientY - pressStartRef.current.y,
                              2
                            )
                        );

                        if (distance > 10) {
                          clearTimeout(pressTimerRef.current);
                          pressTimerRef.current = null;
                          pressStartRef.current = null;
                          setPressedItemId(null);
                        }
                      }}
                      onPointerUp={() => {
                        if (pressTimerRef.current) {
                          clearTimeout(pressTimerRef.current);
                          pressTimerRef.current = null;
                        }

                        pressStartRef.current = null;
                        setPressedItemId(null);
                      }}
                      onPointerCancel={() => {
                        if (pressTimerRef.current) {
                          clearTimeout(pressTimerRef.current);
                          pressTimerRef.current = null;
                        }

                        pressStartRef.current = null;
                        setPressedItemId(null);
                      }}
                      onPointerLeave={() => {
                        if (pressTimerRef.current) {
                          clearTimeout(pressTimerRef.current);
                          pressTimerRef.current = null;
                        }

                        pressStartRef.current = null;
                        setPressedItemId(null);
                      }}
                      onContextMenu={(event) => event.preventDefault()}
                    >
                      <button
                        type="button"
                        onClick={() => void toggleItem(item.id)}
                        aria-label={
                          checked
                            ? "Marcar como pendiente"
                            : "Marcar como comprado"
                        }
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                          checked
                            ? "border-[#879078] bg-[#879078] text-white"
                            : "border-[#C8C9C0] bg-white hover:border-[#879078]"
                        }`}
                      >
                        {checked && (
                          <span className="text-xs font-bold">✓</span>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-medium transition ${
                            checked
                              ? "text-[#A0A399] line-through"
                              : "text-[#30352C]"
                          }`}
                        >
                          {item.name}
                        </div>

                        {item.source === "recipe" &&
                          item.recipes.length > 0 && (
                            <p className="mt-1 text-xs text-[#9A9E94]">
                              {item.recipes.join(" · ")}
                            </p>
                          )}

                        {item.owned && (
                          <p className="mt-1 text-xs font-medium text-[#879078]">
                            ✓ Ya lo tienes en casa
                          </p>
                        )}
                      </div>

                      {checked && (
                        <div className="w-[116px] shrink-0 sm:w-36">
                          <label className="sr-only">
                            Ubicación de {item.ingredientName}
                          </label>
                          <select
                            value={selectedDestination}
                            onChange={(event) =>
                              changePantryDestination(
                                item.ingredientId,
                                event.target.value as PantryLocation
                              )
                            }
                            disabled={addingPurchased}
                            aria-label={`Guardar ${item.ingredientName} en`}
                            className="w-full rounded-xl border border-[#DDE5D8] bg-[#F7F8F4] px-2 py-2.5 text-xs font-medium text-[#52685A] outline-none focus:border-[#879078] disabled:opacity-60"
                          >
                            {PANTRY_LOCATIONS.map((location) => (
                              <option key={location} value={location}>
                                {location}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {menuOpen && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-[#E8E5DC] bg-white p-3 shadow-xl"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-[#52685A]">
                              Opciones del ingrediente
                            </p>

                            <button
                              type="button"
                              onClick={() => setContextMenuItem(null)}
                              aria-label="Cerrar opciones"
                              className="rounded-full px-2 py-1 text-lg leading-none text-[#879078] hover:bg-[#F1F2ED]"
                            >
                              ×
                            </button>
                          </div>

                          <label className="block text-xs text-[#788675]">
                            Cambiar categoría
                            <select
                              value={
                                categories.find(
                                  (categoryOption) =>
                                    categoryOption.name === item.category
                                )?.id ?? ""
                              }
                              onChange={(event) =>
                                void changeShoppingCategory(
                                  item,
                                  Number(event.target.value)
                                )
                              }
                              aria-label={`Categoría de ${item.ingredientName}`}
                              className="mt-2 w-full rounded-xl border border-[#E1DED5] bg-[#FBFAF7] px-3 py-2 text-sm text-[#52685A] outline-none focus:border-[#879078]"
                            >
                              {categories.map((categoryOption) => (
                                <option
                                  key={categoryOption.id}
                                  value={categoryOption.id}
                                >
                                  {categoryOption.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          {item.source === "manual" && (
                            <button
                              type="button"
                              onClick={() => void removeManualItem(item.id)}
                              className="mt-3 w-full rounded-xl bg-[#F5EFEC] px-3 py-2 text-left text-xs font-semibold text-[#9B6F67] transition hover:bg-[#EEE4E0]"
                            >
                              Eliminar ingrediente
                            </button>
                          )}

                          {item.source === "recipe" && (
                            <p className="mt-3 text-xs leading-5 text-[#92958B]">
                              Este ingrediente procede de una receta. Puedes
                              cambiar su categoría, pero no eliminarlo desde
                              aquí.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F6F3EC] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D8D5CB] border-t-[#879078]" />
              <p className="mt-4 text-sm text-[#879078]">
                Preparando tu lista de compra…
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F3EC] px-4 py-6 pb-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-[#879078]">Compra</p>

          <div className="mt-1 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#30352C]">
                Compra
              </h1>
              <p className="mt-1 text-sm text-[#879078]">
                Organiza lo que necesitas, lo que tienes y tus ingredientes.
              </p>
            </div>

            {activeSection === "lista" && checkedCount > 0 && (
              <button
                type="button"
                onClick={() => void clearChecked()}
                className="shrink-0 rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-[#59614F] shadow-sm transition hover:bg-[#F0EEE7] active:bg-[#E7E4DA]"
              >
                Desmarcar
              </button>
            )}
          </div>
        </div>

        <nav
          aria-label="Apartados de compra"
          className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1.5 shadow-sm"
        >
          {(
            [
              { id: "lista", label: "Lista", icon: "🛒" },
              { id: "almacen", label: "Almacén", icon: "🥬" },
              { id: "ingredientes", label: "Ingredientes", icon: "🏷️" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              aria-pressed={activeSection === tab.id}
              className={`min-w-0 rounded-xl px-2 py-3 text-xs font-semibold transition sm:px-3 sm:text-sm ${
                activeSection === tab.id
                  ? "bg-[#52685A] text-white shadow-sm"
                  : "text-[#687260] hover:bg-[#F1F2ED]"
              }`}
            >
              <span className="mr-1 sm:mr-2" aria-hidden="true">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        {activeSection === "lista" && (
          <>
            <section className="mb-6 rounded-3xl bg-white p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveList("manual");
                    setErrorMessage("");
                  }}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    activeList === "manual"
                      ? "bg-[#879078] text-white"
                      : "text-[#59614F] hover:bg-[#F6F3EC]"
                  }`}
                >
                  <span className="mr-2">✏️</span>
                  Mi lista
                  {manualItems.length > 0 && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        activeList === "manual"
                          ? "bg-white/20 text-white"
                          : "bg-[#EAE8DF] text-[#687260]"
                      }`}
                    >
                      {manualItems.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveList("recipe");
                    setIsAddFormOpen(false);
                    setErrorMessage("");
                  }}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    activeList === "recipe"
                      ? "bg-[#879078] text-white"
                      : "text-[#59614F] hover:bg-[#F6F3EC]"
                  }`}
                >
                  <span className="mr-2">🍲</span>
                  Recetas
                  {recipeItems.length > 0 && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        activeList === "recipe"
                          ? "bg-white/20 text-white"
                          : "bg-[#EAE8DF] text-[#687260]"
                      }`}
                    >
                      {recipeItems.length}
                    </span>
                  )}
                </button>
              </div>
            </section>

            {actionMessage && (
              <p
                role="status"
                className="mb-4 rounded-2xl bg-[#E7EDE3] px-4 py-3 text-sm text-[#52685A]"
              >
                {actionMessage}
              </p>
            )}

            {activeList === "manual" && (
              <section className="mt-4 mb-6 sm:mt-6">
                {!isAddFormOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setIsAddFormOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C9D3C4] bg-white px-4 py-4 text-sm font-semibold text-[#52685A] shadow-sm transition hover:bg-[#E7EDE3] active:scale-[0.99]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7EDE3] text-xl leading-none">
                      +
                    </span>
                    Añadir producto
                  </button>
                ) : (
                  <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-[#30352C]">
                          Añadir a la lista
                        </h2>
                        <p className="mt-1 text-sm leading-5 text-[#879078]">
                          Añade productos que quieras comprar, aunque no estén
                          relacionados con ninguna receta.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAddFormOpen(false);
                          setManualName("");
                          setManualQuantity("");
                          setManualUnit("");
                          setErrorMessage("");
                        }}
                        aria-label="Cerrar formulario"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F2ED] text-lg text-[#59614F] transition hover:bg-[#E7EDE3]"
                      >
                        ×
                      </button>
                    </div>

                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void addManualItem();
                      }}
                      className="space-y-3"
                    >
                      <IngredientAutocomplete
                        value={manualName}
                        onChange={setManualName}
                        placeholder="Nombre del producto (ej. Café)"
                        className="w-full rounded-2xl border border-[#E1DED5] bg-[#F9F8F4] px-4 py-3 text-base text-[#30352C] outline-none transition placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8]"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={manualQuantity}
                          onChange={(event) =>
                            setManualQuantity(event.target.value)
                          }
                          placeholder="Cantidad"
                          className="min-w-0 rounded-2xl border border-[#E1DED5] bg-[#F9F8F4] px-3 py-3 text-base text-[#30352C] outline-none transition placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8]"
                        />

                        <input
                          type="text"
                          value={manualUnit}
                          onChange={(event) =>
                            setManualUnit(event.target.value)
                          }
                          placeholder="Unidad (kg, ud...)"
                          className="min-w-0 rounded-2xl border border-[#E1DED5] bg-[#F9F8F4] px-3 py-3 text-base text-[#30352C] outline-none transition placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={addingManual || !manualName.trim()}
                        className="w-full rounded-2xl bg-[#879078] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#737D68] active:bg-[#687260] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addingManual ? "Añadiendo…" : "Añadir a mi lista"}
                      </button>
                    </form>
                  </div>
                )}
              </section>
            )}

            {displayedItems.length === 0 ? (
              <section className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
                <div className="text-5xl">
                  {activeList === "recipe" ? "🍲" : "📝"}
                </div>

                <h2 className="mt-4 text-xl font-semibold text-[#30352C]">
                  {activeList === "recipe"
                    ? "No hay nada que comprar todavía"
                    : "Tu lista manual está vacía"}
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#879078]">
                  {activeList === "recipe"
                    ? "Añade recetas al planificador y sus ingredientes aparecerán aquí automáticamente."
                    : "Añade productos que quieras comprar aunque no formen parte de ninguna receta."}
                </p>

                {activeList === "recipe" ? (
                  <Link
                    href="/planificador"
                    className="mt-6 inline-flex rounded-2xl bg-[#879078] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#737D68] active:bg-[#687260]"
                  >
                    Ir al planificador
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setIsAddFormOpen(true);
                    }}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#879078] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#737D68] active:bg-[#687260]"
                  >
                    <span className="text-lg">+</span>
                    Añadir producto
                  </button>
                )}
              </section>
            ) : (
              <div className="space-y-6">
                {pendingItems.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h2 className="text-sm font-semibold text-[#52685A]">
                        Por comprar
                      </h2>
                      <span className="text-xs text-[#879078]">
                        {pendingItems.length}
                      </span>
                    </div>

                    {renderShoppingGroups(pendingItems)}
                  </section>
                )}

                {purchasedItems.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h2 className="text-sm font-semibold text-[#879078]">
                        Comprados
                      </h2>
                      <span className="text-xs text-[#879078]">
                        {purchasedItems.length}
                      </span>
                    </div>

                    {renderShoppingGroups(purchasedItems)}

                    <div className="mt-4 rounded-3xl border border-[#DDE5D8] bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-[#52685A]">
                        Guarda tu compra en el almacén
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#879078]">
                        Elige dónde guardar cada producto. Recordaremos la
                        ubicación para la próxima vez. Los productos añadidos
                        correctamente desaparecerán de esta lista.
                      </p>

                      <button
                        type="button"
                        onClick={() => void addPurchasedItemsToPantry()}
                        disabled={addingPurchased}
                        className="mt-3 w-full rounded-2xl bg-[#52685A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#435749] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {addingPurchased
                          ? "Actualizando almacén…"
                          : `Añadir ${purchasedItems.length} ${
                              purchasedItems.length === 1
                                ? "producto"
                                : "productos"
                            } al almacén`}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            )}

            {errorMessage && (
              <section
                role="alert"
                className="mb-6 rounded-3xl border border-[#E5D8D3] bg-[#FBF5F2] px-5 py-4"
              >
                <p className="text-sm text-[#8B625A]">{errorMessage}</p>
              </section>
            )}

            <details className="mt-6 rounded-2xl px-1 py-2">
              <summary className="cursor-pointer list-none text-xs font-medium text-[#92958B] transition hover:text-[#52685A]">
                ⚙️ Organizar categorías
              </summary>

              <div className="mt-3">
                <ShoppingCategoryManager
                  categories={categories}
                  onCreate={createCategory}
                  onRename={renameCategory}
                  onDelete={deleteCategory}
                  onReorder={reorderCategories}
                />
              </div>
            </details>
          </>
        )}

        {activeSection === "almacen" && <PantrySection />}
        {activeSection === "ingredientes" && <IngredientsCatalog />}
      </div>
    </main>
  );
}
