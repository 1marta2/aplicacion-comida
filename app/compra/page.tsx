"use client";



import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import ShoppingCategoryManager, { type ShoppingCategory } from "@/app/components/ShoppingCategoryManager";
import { DEFAULT_CATEGORY_NAMES, getAutomaticCategory, resolveAutomaticCategory } from "@/lib/ingredient-category";



import { supabase } from "@/lib/supabase";







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



function formatNumber(value: number): string {

  if (Number.isInteger(value)) {

    return String(value);

  }



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



  const [activeList, setActiveList] = useState<"recipe" | "manual">(

    "manual"

  );



  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [pantryActionId, setPantryActionId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");



  async function loadData() {

    setLoading(true);

    setErrorMessage("");



    try {

      const {

        data: { user },

        error: userError,

      } = await supabase.auth.getUser();



      if (userError) {

        throw userError;

      }



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
        const { data: insertedCategories, error: insertCategoriesError } = await supabase
          .from("shopping_categories")
          .insert(defaultCategories.map((name, index) => ({
            user_id: user.id, name, sort_order: index,
          })))
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

      /*

       * -------------------------------------------------------------

       * 1. RECETAS DEL USUARIO

       * -------------------------------------------------------------

       */



      const { data: recipesData, error: recipesError } = await supabase

        .from("recipes")

        .select("id, title")

        .eq("user_id", user.id);



      if (recipesError) {

        throw recipesError;

      }



      const recipeMap: Record<string, Recipe> = {};



      for (const recipe of recipesData || []) {

        recipeMap[String(recipe.id)] = {

          id: String(recipe.id),

          name: recipe.title,

          emoji: "🍽️",

        };

      }



      setAvailableRecipes(recipeMap);



      /*

       * -------------------------------------------------------------

       * 2. PLANIFICACIÓN DE ESTA SEMANA

       * -------------------------------------------------------------

       */



      const { monday, sunday } = getWeekRange();



      const { data: planningData, error: planningError } =

        await supabase

          .from("planning")

          .select("recipe_id, date, meal_type")

          .eq("user_id", user.id)

          .gte("date", monday)

          .lte("date", sunday);



      if (planningError) {

        throw planningError;

      }



      const plannedRecipeIds = [

        ...new Set(

          (planningData || [])

            .map((row) => Number(row.recipe_id))

            .filter((id) => Number.isFinite(id))

        ),

      ];



      /*

       * -------------------------------------------------------------

       * 3. INGREDIENTES DE LAS RECETAS PLANIFICADAS

       * -------------------------------------------------------------

       */



      let recipeIngredients: RecipeIngredientRow[] = [];



      if (plannedRecipeIds.length > 0) {

        const {

          data: recipeIngredientsData,

          error: recipeIngredientsError,

        } = await supabase

          .from("recipe_ingredients")

          .select("recipe_id, ingredient_id, quantity, unit")

          .in("recipe_id", plannedRecipeIds);



        if (recipeIngredientsError) {

          throw recipeIngredientsError;

        }



        recipeIngredients =

          (recipeIngredientsData || []) as RecipeIngredientRow[];

      }



      /*

       * -------------------------------------------------------------

       * 4. NOMBRES DE LOS INGREDIENTES

       * -------------------------------------------------------------

       */



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



        if (ingredientsError) {

          throw ingredientsError;

        }



        ingredients = (ingredientsData || []) as IngredientRow[];

      }



      const ingredientNameMap = new Map<number, string>();



      for (const ingredient of ingredients) {

        ingredientNameMap.set(

          Number(ingredient.id),

          ingredient.name

        );

      }



      /*

       * -------------------------------------------------------------

       * 5. GENERAMOS LA LISTA DE RECETAS

       * -------------------------------------------------------------

       */



      const generatedMap = new Map<string, ShoppingItem>();



      for (const plannedRecipeId of plannedRecipeIds) {

        const recipe = recipeMap[String(plannedRecipeId)];



        if (!recipe) {

          continue;

        }



        const recipeIngredientRows = recipeIngredients.filter(

          (row) => Number(row.recipe_id) === plannedRecipeId

        );



        for (const row of recipeIngredientRows) {

          const ingredientName =

            ingredientNameMap.get(Number(row.ingredient_id)) ||

            "Ingrediente";



          const unit = normalizeUnit(row.unit);

          const key = String(row.ingredient_id);



          const existing = generatedMap.get(key);



          if (!existing) {

            generatedMap.set(key, {

              id: `ingredient-${row.ingredient_id}`,

              ingredientId: Number(row.ingredient_id),

              name: formatShoppingName(

                ingredientName,

                row.quantity,

                unit

              ),

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



            const newBase = convertToBaseQuantity(

              row.quantity,

              unit

            );



            if (existingBase.unit === newBase.unit) {

              const totalBase =

                existingBase.quantity + newBase.quantity;



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



      /*

       * -------------------------------------------------------------

       * 6. DESPENSA

       * -------------------------------------------------------------

       */



      const { data: pantryData, error: pantryError } = await supabase

        .from("pantry")

        .select("id, ingredient_id, quantity, unit")

        .eq("user_id", user.id);



      if (pantryError) {

        throw pantryError;

      }



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



        if (pantryIngredientsError) {

          throw pantryIngredientsError;

        }



        pantryIngredientNames =

          (pantryIngredientsData || []) as IngredientRow[];

      }



      const pantryNameMap = new Map<number, string>();



      for (const ingredient of pantryIngredientNames) {

        pantryNameMap.set(

          Number(ingredient.id),

          ingredient.name

        );

      }



      const loadedPantry: PantryItem[] = (pantryData || []).map(

        (item) => ({

          id: String(item.id),

          ingredientId: Number(item.ingredient_id),

          name:

            pantryNameMap.get(Number(item.ingredient_id)) ||

            "Ingrediente",

          quantity:

            item.quantity !== null

              ? Number(item.quantity)

              : null,

          unit: normalizeUnit(item.unit),

        })

      );



      setPantryItems(loadedPantry);



      /*

       * -------------------------------------------------------------

       * 7. LISTA DE COMPRA EXISTENTE

       * -------------------------------------------------------------

       */



      const {

        data: existingShoppingData,

        error: shoppingError,

      } = await supabase

        .from("shopping_list")

        .select(

          "id, ingredient_id, name, quantity, unit, checked"

        )

        .eq("user_id", user.id);



      if (shoppingError) {

        throw shoppingError;

      }



      const existingShopping =

        (existingShoppingData || []) as StoredShoppingRow[];



      /*

       * -------------------------------------------------------------

       * 8. SABEMOS CUÁLES SON MANUALES Y CUÁLES DE RECETAS

       * -------------------------------------------------------------

       */



      const existingShoppingIds = existingShopping

        .map((item) => Number(item.id))

        .filter((id) => Number.isFinite(id));



      let existingRelations: RelationRow[] = [];



      if (existingShoppingIds.length > 0) {

        const {

          data: relationsData,

          error: relationsError,

        } = await supabase

          .from("shopping_list_recipes")

          .select("shopping_list_id, recipe_id")

          .in("shopping_list_id", existingShoppingIds);



        if (relationsError) {

          throw relationsError;

        }



        existingRelations = (relationsData || []) as RelationRow[];

      }



      const generatedShoppingIds = new Set(

        existingRelations.map((row) =>

          Number(row.shopping_list_id)

        )

      );



      /*

       * Los productos que NO tienen relación con una receta

       * son productos añadidos manualmente.

       */



      const manualItems: ShoppingItem[] = existingShopping

        .filter(

          (item) =>

            !generatedShoppingIds.has(Number(item.id))

        )

        .map((item) => ({

          id: String(item.id),

          ingredientId: Number(item.ingredient_id),

          name: formatShoppingName(

            item.name,

            item.quantity !== null

              ? Number(item.quantity)

              : null,

            normalizeUnit(item.unit)

          ),

          ingredientName: item.name,

          recipes: [],

          category: getAutomaticCategory(item.name),

          quantity:

            item.quantity !== null

              ? Number(item.quantity)

              : null,

          totalQuantity:

            item.quantity !== null

              ? Number(item.quantity)

              : null,

          unit: normalizeUnit(item.unit),

          source: "manual",

        }));



      /*

       * -------------------------------------------------------------

       * 9. SINCRONIZAMOS SOLO LOS PRODUCTOS DE RECETAS

       * -------------------------------------------------------------

       */



      const generatedItems = [...generatedMap.values()];



      const generatedIngredientIds = new Set(

        generatedItems.map((item) => item.ingredientId)

      );



      const existingGeneratedShopping =

        existingShopping.filter((item) =>

          generatedShoppingIds.has(Number(item.id))

        );



      const existingGeneratedByIngredient = new Map<

        number,

        StoredShoppingRow

      >();



      for (const item of existingGeneratedShopping) {

        existingGeneratedByIngredient.set(

          Number(item.ingredient_id),

          item

        );

      }



      /*

       * Borramos SOLO recetas que ya no están planificadas.

       * Los manuales se quedan intactos.

       */



      const obsoleteGeneratedIds = existingGeneratedShopping

        .filter(

          (item) =>

            !generatedIngredientIds.has(

              Number(item.ingredient_id)

            )

        )

        .map((item) => Number(item.id));



      if (obsoleteGeneratedIds.length > 0) {

        await supabase

          .from("shopping_list_recipes")

          .delete()

          .in(

            "shopping_list_id",

            obsoleteGeneratedIds

          );



        const {

          error: deleteShoppingError,

        } = await supabase

          .from("shopping_list")

          .delete()

          .in("id", obsoleteGeneratedIds)

          .eq("user_id", user.id);



        if (deleteShoppingError) {

          throw deleteShoppingError;

        }

      }



      /*

       * Creamos/actualizamos los productos de recetas.

       */



      const finalRecipeShoppingItems: ShoppingItem[] = [];



      for (const item of generatedItems) {

        const existing =

          existingGeneratedByIngredient.get(

            item.ingredientId

          );



        let shoppingId: number;



        if (existing) {

          shoppingId = Number(existing.id);



          const {

            error: updateError,

          } = await supabase

            .from("shopping_list")

            .update({

              name: item.ingredientName,

              quantity: item.quantity,

              unit: item.unit,

            })

            .eq("id", shoppingId)

            .eq("user_id", user.id);



          if (updateError) {

            throw updateError;

          }

        } else {

          const {

            data: insertedShopping,

            error: insertError,

          } = await supabase

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



          if (insertError) {

            throw insertError;

          }



          shoppingId = Number(insertedShopping.id);

        }



        finalRecipeShoppingItems.push({

          ...item,

          id: String(shoppingId),

        });

      }



      /*

       * -------------------------------------------------------------

       * 10. ACTUALIZAMOS RELACIONES RECETA ↔ COMPRA

       * -------------------------------------------------------------

       */



      const shoppingIds = finalRecipeShoppingItems

        .map((item) => Number(item.id))

        .filter((id) => Number.isFinite(id));



      if (shoppingIds.length > 0) {

        const {

          error: deleteRelationsError,

        } = await supabase

          .from("shopping_list_recipes")

          .delete()

          .in("shopping_list_id", shoppingIds);



        if (deleteRelationsError) {

          throw deleteRelationsError;

        }

      }



      const relationKeySet = new Set<string>();



      const relationRows: RelationRow[] = [];



      for (const item of finalRecipeShoppingItems) {

        const shoppingId = Number(item.id);



        const recipeIdsForIngredient = [

          ...new Set(

            recipeIngredients

              .filter(

                (row) =>

                  Number(row.ingredient_id) ===

                  item.ingredientId

              )

              .map((row) => Number(row.recipe_id))

          ),

        ];



        for (const recipeId of recipeIdsForIngredient) {

          const key = `${shoppingId}-${recipeId}`;



          if (relationKeySet.has(key)) {

            continue;

          }



          relationKeySet.add(key);



          relationRows.push({

            shopping_list_id: shoppingId,

            recipe_id: recipeId,

          });

        }

      }



      if (relationRows.length > 0) {

        const {

          error: relationError,

        } = await supabase

          .from("shopping_list_recipes")

          .upsert(relationRows, {

            onConflict:

              "shopping_list_id,recipe_id",

            ignoreDuplicates: true,

          });



        if (relationError) {

          throw relationError;

        }

      }



      /*

       * -------------------------------------------------------------

       * 11. APLICAMOS LA DESPENSA SOLO A RECETAS

       * -------------------------------------------------------------

       */



      const recipeItemsWithPantry =

        finalRecipeShoppingItems.map((item) => {

          const pantryMatch = loadedPantry.find(

            (pantry) =>

              Number(pantry.ingredientId) ===

                Number(item.ingredientId) ||

              pantryMatchesIngredient(

                pantry,

                item.ingredientName

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



          const shoppingBase =

            convertToBaseQuantity(

              item.quantity,

              item.unit

            );



          const pantryBase =

            convertToBaseQuantity(

              pantryMatch.quantity,

              pantryMatch.unit

            );



          if (

            shoppingBase.unit !==

            pantryBase.unit

          ) {

            return item;

          }



          if (

            pantryBase.quantity >=

            shoppingBase.quantity

          ) {

            return {

              ...item,

              owned: true,

              pantryQuantity:

                pantryMatch.quantity,

              pantryUnit: pantryMatch.unit,

            };

          }



          const remainingBase =

            shoppingBase.quantity -

            pantryBase.quantity;



          const remaining =

            convertFromBaseQuantity(

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

            pantryQuantity:

              pantryMatch.quantity,

            pantryUnit: pantryMatch.unit,

          };

        });



      /*

       * -------------------------------------------------------------

       * 12. GUARDAMOS TODA LA LISTA EN ESTADO

       * -------------------------------------------------------------

       */



      const categoryNameById = new Map(categoryRows.map((category) => [Number(category.id), category.name]));
      const allItems = [
        ...recipeItemsWithPantry,
        ...manualItems,
      ].map((item) => ({
        ...item,
        category: categoryNameById.get(assignments[Number(item.ingredientId)]) || resolveAutomaticCategory(item.ingredientName, categoryRows),
      }));

      setShoppingItems(allItems);



      /*

       * Conservamos los checks tanto de recetas como manuales.

       */



      const allValidIds = new Set(

        allItems.map((item) => item.id)

      );



      const checkedIds = existingShopping

        .filter((item) => item.checked)

        .map((item) => String(item.id))

        .filter((id) => allValidIds.has(id));



      setCheckedItems(checkedIds);

    } catch (error) {

      console.error(

        "Error cargando lista de compra desde Supabase:",

        error

      );



      setErrorMessage(

        "No hemos podido cargar la lista de compra. Revisa la consola para ver el error."

      );

    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    loadData();



    const handlePlannerChanged = () => {

      loadData();

    };



    window.addEventListener(

      "plannerChanged",

      handlePlannerChanged

    );



    return () => {

      window.removeEventListener(

        "plannerChanged",

        handlePlannerChanged

      );

    };

  }, []);



  async function toggleItem(id: string) {

    const numericId = Number(id);



    const currentChecked =

      checkedItems.includes(id);



    const newChecked = !currentChecked;



    setCheckedItems((current) =>

      newChecked

        ? [...current, id]

        : current.filter(

            (item) => item !== id

          )

    );



    const { error } = await supabase

      .from("shopping_list")

      .update({

        checked: newChecked,

      })

      .eq("id", numericId);



    if (error) {

      console.error(

        "Error guardando producto comprado:",

        error

      );



      setCheckedItems((current) =>

        newChecked

          ? current.filter(

              (item) => item !== id

            )

          : [...current, id]

      );

    }

  }



  async function addPurchasedItemToPantry(item: ShoppingItem) {
    if (pantryActionId === item.id) return;
    setPantryActionId(item.id);
    setActionMessage("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setActionMessage("Inicia sesión para actualizar tu almacén.");
        return;
      }

      const { data: existing, error: pantryError } = await supabase
        .from("pantry")
        .select("id, quantity, unit")
        .eq("user_id", user.id)
        .eq("ingredient_id", item.ingredientId)
        .maybeSingle();
      if (pantryError) throw pantryError;

      const quantityToAdd = item.quantity ?? item.totalQuantity ?? null;
      const unitToAdd = normalizeUnit(item.unit);

      if (existing) {
        if (
          existing.quantity !== null &&
          quantityToAdd !== null &&
          !unitsAreCompatible(existing.unit, unitToAdd)
        ) {
          setActionMessage(
            `${item.name} ya está en el almacén con otra unidad. No he cambiado las existencias para evitar mezclar cantidades incompatibles.`
          );
          return;
        }

        let mergedQuantity: number | null = existing.quantity;
        let mergedUnit = normalizeUnit(existing.unit);

        if (existing.quantity === null) {
          mergedQuantity = quantityToAdd;
          mergedUnit = unitToAdd;
        } else if (quantityToAdd !== null) {
          const existingBase = convertToBaseQuantity(existing.quantity, existing.unit);
          const addedBase = convertToBaseQuantity(quantityToAdd, unitToAdd);
          if (existingBase.unit !== addedBase.unit) {
            setActionMessage(
              `${item.name} ya está en el almacén con otra unidad. No he cambiado las existencias.`
            );
            return;
          }
          const totalBase = existingBase.quantity + addedBase.quantity;
          mergedQuantity = convertFromBaseQuantity(totalBase, existing.unit);
        }

        const confirmed = window.confirm(
          `${item.name} ya está en tu almacén. ¿Quieres sumar la cantidad comprada a las existencias actuales?`
        );
        if (!confirmed) return;

        const { error: updateError } = await supabase
          .from("pantry")
          .update({ quantity: mergedQuantity, unit: mergedUnit })
          .eq("id", existing.id)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("pantry").insert({
          user_id: user.id,
          ingredient_id: item.ingredientId,
          quantity: quantityToAdd,
          unit: unitToAdd,
        });
        if (insertError) throw insertError;
      }

      // Mover el producto significa sacarlo también de la lista de compra.
      const shoppingId = Number(item.id);
      if (Number.isFinite(shoppingId)) {
        const { error: relationDeleteError } = await supabase
          .from("shopping_list_recipes")
          .delete()
          .eq("shopping_list_id", shoppingId);
        if (relationDeleteError) throw relationDeleteError;

        const { error: shoppingDeleteError } = await supabase
          .from("shopping_list")
          .delete()
          .eq("id", shoppingId)
          .eq("user_id", user.id);
        if (shoppingDeleteError) throw shoppingDeleteError;
      }

      setShoppingItems((current) => current.filter((entry) => entry.id !== item.id));
      setCheckedItems((current) => current.filter((id) => id !== item.id));

      setPantryItems((current) => {
        const found = current.find((entry) => entry.ingredientId === item.ingredientId);
        if (!found) {
          return [...current, {
            id: `new-${item.ingredientId}`,
            ingredientId: item.ingredientId,
            name: item.ingredientName,
            quantity: quantityToAdd,
            unit: unitToAdd,
          }];
        }
        if (found.quantity === null) {
          return current.map((entry) => entry.ingredientId === item.ingredientId
            ? { ...entry, quantity: quantityToAdd, unit: unitToAdd }
            : entry);
        }
        if (quantityToAdd !== null && unitsAreCompatible(found.unit, unitToAdd)) {
          const existingBase = convertToBaseQuantity(found.quantity, found.unit);
          const addedBase = convertToBaseQuantity(quantityToAdd, unitToAdd);
          if (existingBase.unit === addedBase.unit) {
            return current.map((entry) => entry.ingredientId === item.ingredientId
              ? { ...entry, quantity: convertFromBaseQuantity(existingBase.quantity + addedBase.quantity, found.unit) }
              : entry);
          }
        }
        return current;
      });
      setActionMessage(`${item.ingredientName} se ha movido al almacén y se ha quitado de la compra.`);
    } catch (error) {
      console.error("Error añadiendo producto al almacén:", error);
      setActionMessage("No se ha podido actualizar el almacén. Inténtalo de nuevo.");
    } finally {
      setPantryActionId(null);
    }
  }

  async function clearChecked() {

    if (checkedItems.length === 0) {

      return;

    }



    const ids = checkedItems

      .map(Number)

      .filter((id) => Number.isFinite(id));



    const { error } = await supabase

      .from("shopping_list")

      .update({

        checked: false,

      })

      .in("id", ids);



    if (error) {

      console.error(

        "Error desmarcando productos:",

        error

      );



      return;

    }



    setCheckedItems([]);

  }



  async function findOrCreateIngredient(

    name: string

  ): Promise<number | null> {

    const normalizedName = name.trim();



    if (!normalizedName) {

      return null;

    }



    const {

      data: existing,

      error: searchError,

    } = await supabase

      .from("ingredients")

      .select("id, name")

      .ilike("name", normalizedName)

      .limit(1)

      .maybeSingle();



    if (searchError) {

      console.error(

        "Error buscando ingrediente:",

        searchError

      );



      return null;

    }



    if (existing) {

      return Number(existing.id);

    }



    const {

      data: created,

      error: createError,

    } = await supabase

      .from("ingredients")

      .insert({

        name: normalizedName,

      })

      .select("id")

      .single();



    if (createError) {

      console.error(

        "Error creando ingrediente:",

        createError

      );



      return null;

    }



    return Number(created.id);

  }




  async function createCategory(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");
    const { data, error } = await supabase.from("shopping_categories").insert({
      user_id: user.id,
      name: cleanName,
      sort_order: categories.length,
    }).select("id, name, sort_order").single();
    if (error) throw error;
    setCategories((current) => [...current, data as ShoppingCategory].sort((a, b) => a.sort_order - b.sort_order));
  }

  async function renameCategory(id: number, name: string) {
    const cleanName = name.trim();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");
    const { data, error } = await supabase.from("shopping_categories").update({ name: cleanName })
      .eq("id", id).eq("user_id", user.id).select("id, name, sort_order").single();
    if (error) throw error;
    setCategories((current) => current.map((category) => category.id === id ? data as ShoppingCategory : category));
    setShoppingItems((current) => current.map((item) => item.category === categories.find((category) => category.id === id)?.name ? { ...item, category: cleanName } : item));
  }

  async function reorderCategories(orderedIds: number[]) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");

    const previous = categories;
    const reordered = orderedIds
      .map((id) => previous.find((category) => category.id === id))
      .filter((category): category is ShoppingCategory => Boolean(category))
      .map((category, index) => ({ ...category, sort_order: index }));

    setCategories(reordered);
    const results = await Promise.all(reordered.map((category) =>
      supabase.from("shopping_categories")
        .update({ sort_order: category.sort_order })
        .eq("id", category.id)
        .eq("user_id", user.id)
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setCategories(previous);
      throw failed.error;
    }
  }

  async function deleteCategory(id: number) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");
    const { error } = await supabase.from("shopping_categories").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    setCategories((current) => current.filter((category) => category.id !== id));
    await loadData();
  }

  async function changeShoppingCategory(item: ShoppingItem, categoryId: number) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return;
    const { error } = await supabase.from("ingredient_category_assignments").upsert({
      user_id: user.id,
      ingredient_id: item.ingredientId,
      category_id: categoryId,
    }, { onConflict: "user_id,ingredient_id" });
    if (error) {
      console.error("Error guardando categoría:", error);
      setErrorMessage("No se ha podido guardar la categoría del ingrediente.");
      return;
    }
    const selected = categories.find((category) => category.id === categoryId);
    if (!selected) return;
    setShoppingItems((current) => current.map((entry) => entry.ingredientId === item.ingredientId ? { ...entry, category: selected.name } : entry));
  }

  async function addManualItem() {

    const name = manualName.trim();



    if (!name || addingManual) {

      return;

    }



    const quantity =

      manualQuantity.trim() === ""

        ? null

        : Number(

            manualQuantity.replace(",", ".")

          );



    if (

      quantity !== null &&

      (!Number.isFinite(quantity) ||

        quantity < 0)

    ) {

      return;

    }



    setAddingManual(true);



    try {

      const {

        data: { user },

      } = await supabase.auth.getUser();



      if (!user) {

        return;

      }



      const ingredientId =

        await findOrCreateIngredient(name);



      if (!ingredientId) {

        return;

      }



      const unit = normalizeUnit(

        manualUnit.trim() || null

      );



      const {

        data: inserted,

        error,

      } = await supabase

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

        console.error(

          "Error añadiendo producto manual:",

          error

        );



        return;

      }



      if (!inserted) {

        return;

      }



      setManualName("");

      setManualQuantity("");

      setManualUnit("");



      setActiveList("manual");



      await loadData();

    } finally {

      setAddingManual(false);

    }

  }



  async function removeManualItem(id: string) {

    const item = shoppingItems.find(

      (shoppingItem) =>

        shoppingItem.id === id

    );



    if (!item || item.source !== "manual") {

      return;

    }



    const { error } = await supabase

      .from("shopping_list")

      .delete()

      .eq("id", Number(id));



    if (error) {

      console.error(

        "Error eliminando producto manual:",

        error

      );



      return;

    }



    setShoppingItems((current) =>

      current.filter(

        (shoppingItem) =>

          shoppingItem.id !== id

      )

    );



    setCheckedItems((current) =>

      current.filter(

        (checkedId) => checkedId !== id

      )

    );

  }



  const recipeItems = useMemo(

    () =>

      shoppingItems.filter(

        (item) => item.source === "recipe"

      ),

    [shoppingItems]

  );



  const manualItems = useMemo(

    () =>

      shoppingItems.filter(

        (item) => item.source === "manual"

      ),

    [shoppingItems]

  );



  const displayedItems =

    activeList === "recipe"

      ? recipeItems.filter((item) => !item.owned)

      : manualItems;



  const checkedCount = displayedItems.filter(

    (item) =>

      checkedItems.includes(item.id)

  ).length;



  const totalCount = displayedItems.length;



  function getCategoryItems(

    category: string

  ) {

    return displayedItems.filter(

      (item) =>

        item.category === category

    );

  }



  const categoriesWithItems = Array.from(new Set([
    ...categories.map((category) => category.name),
    ...displayedItems.map((item) => item.category),
  ])).filter((category) => getCategoryItems(category).length > 0);



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



        {/* CABECERA */}



        <div className="mb-6">

          <p className="text-sm font-medium text-[#879078]">

            Compra

          </p>



          <div className="mt-1 flex items-end justify-between gap-4">

            <div>

              <h1 className="text-3xl font-semibold tracking-tight text-[#30352C]">

                Lista de compra

              </h1>



              <p className="mt-1 text-sm text-[#879078]">

                Todo lo que necesitas, organizado para ti.

              </p>

            </div>



            {checkedCount > 0 && (

              <button

                type="button"

                onClick={clearChecked}

                className="shrink-0 rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-[#59614F] shadow-sm transition hover:bg-[#F0EEE7] active:bg-[#E7E4DA]"

              >

                Desmarcar

              </button>

            )}

          </div>

        </div>



        {/* TARJETA MI ALMACÉN */}

        <Link

          href="/almacen"

          className="mb-6 flex items-center gap-4 rounded-3xl border border-[#DDE5D9] bg-[#E7EDE3] p-5 transition hover:bg-[#DDE8DF] active:scale-[0.99]"

        >

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-3xl">

            🥬

          </div>



          <div className="min-w-0 flex-1">

            <p className="text-xs font-semibold uppercase tracking-wider text-[#788675]">

              Lo que tienes en casa

            </p>



            <h2 className="mt-1 text-lg font-semibold text-[#26352D]">

              Mi almacén

            </h2>



            <p className="mt-1 text-sm text-[#647361]">

              {pantryItems.length === 0

                ? "Añade lo que tienes en casa"

                : `${pantryItems.length} ${

                    pantryItems.length === 1

                      ? "ingrediente guardado"

                      : "ingredientes guardados"

                  }`}

            </p>

          </div>



          <span className="text-2xl text-[#52685A]" aria-hidden="true">

            →

          </span>

        </Link>





       {/* TABS RECETAS / MANUAL */}



        <section className="mb-6 rounded-3xl bg-white p-2 shadow-sm">

          <div className="grid grid-cols-2 gap-2">

            <button

              type="button"

              onClick={() =>

                setActiveList("manual")

              }

              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${

                activeList === "manual"

                  ? "bg-[#879078] text-white"

                  : "text-[#59614F] hover:bg-[#F6F3EC]"

              }`}

            >

              <span className="mr-2">

                ✏️

              </span>

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

              onClick={() =>

                setActiveList("recipe")

              }

              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${

                activeList === "recipe"

                  ? "bg-[#879078] text-white"

                  : "text-[#59614F] hover:bg-[#F6F3EC]"

              }`}

            >

              <span className="mr-2">

                🍲

              </span>

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
          <p role="status" className="mb-4 rounded-2xl bg-[#E7EDE3] px-4 py-3 text-sm text-[#52685A]">
            {actionMessage}
          </p>
        )}

        {/* LISTA VACÍA */}



        {displayedItems.length === 0 ? (

          <section className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">

            <div className="text-5xl">

              {activeList === "recipe"

                ? "🍲"

                : "📝"}

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

                  const input =

                    document.querySelector<HTMLInputElement>(

                      'input[placeholder="Ej. Café"]'

                    );



                  input?.focus();

                }}

                className="mt-6 inline-flex rounded-2xl bg-[#879078] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#737D68] active:bg-[#687260]"

              >

                Añadir producto

              </button>

            )}

          </section>

        ) : (

          <>

            {/* LISTA POR CATEGORÍAS */}



            <div className="space-y-3">

              {categoriesWithItems.map(

                (category) => {

                  const items =

                    getCategoryItems(

                      category

                    );



                  return (

                    <section

                      key={category}

                      className="rounded-3xl bg-white p-5 shadow-sm"

                    >

                      <div className="mb-4 flex items-center justify-between gap-3">

                        <h2 className="text-base font-semibold text-[#30352C]">

                          {category}

                        </h2>



                        <span className="rounded-full bg-[#F1F2ED] px-2.5 py-1 text-xs font-medium text-[#737D68]">

                          {items.length}

                        </span>

                      </div>



                      <div className="divide-y divide-[#EEECE5]">

                        {items.map(

                          (item) => {

                            const checked =

                              checkedItems.includes(

                                item.id

                              );



                            return (

                              <div

                                key={item.id}

                                className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"

                              >

                                <button

                                  type="button"

                                  onClick={() =>

                                    toggleItem(

                                      item.id

                                    )

                                  }

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

                                    <span className="text-xs font-bold">

                                      ✓

                                    </span>

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



                                  {item.source ===

                                    "recipe" &&

                                    item.recipes

                                      .length >

                                      0 && (

                                      <p className="mt-1 text-xs text-[#9A9E94]">

                                        {item.recipes.join(

                                          " · "

                                        )}

                                      </p>

                                    )}
<label className="mt-2 flex items-center gap-2 text-xs text-[#788675]">
                                    <span>Categoría</span>
                                    <select
                                      value={categories.find((category) => category.name === item.category)?.id ?? ""}
                                      onChange={(event) => void changeShoppingCategory(item, Number(event.target.value))}
                                      aria-label={`Categoría de ${item.ingredientName}`}
                                      className="max-w-[190px] rounded-xl border border-[#E1DED5] bg-[#FBFAF7] px-2 py-1.5 text-xs text-[#52685A] outline-none focus:border-[#879078]"
                                    >
                                      {categories.map((category) => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                      ))}
                                    </select>
                                  </label>

                                  {item.owned && (

                                    <p className="mt-1 text-xs font-medium text-[#879078]">

                                      ✓ Ya lo tienes en casa

                                    </p>

                                  )}

                                  {checked && (
                                    <button
                                      type="button"
                                      onClick={() => void addPurchasedItemToPantry(item)}
                                      disabled={pantryActionId === item.id}
                                      className="mt-2 rounded-xl bg-[#E7EDE3] px-3 py-2 text-xs font-semibold text-[#52685A] transition hover:bg-[#DDE8DF] disabled:opacity-50"
                                    >
                                      {pantryActionId === item.id ? "Guardando…" : "Añadir al almacén"}
                                    </button>
                                  )}

                                </div>



                                {item.source ===

                                  "manual" && (

                                  <button

                                    type="button"

                                    onClick={() =>

                                      removeManualItem(

                                        item.id

                                      )

                                    }

                                    className="shrink-0 rounded-xl px-3 py-2 text-xs font-medium text-[#9B6F67] transition hover:bg-[#F5EFEC] active:bg-[#EEE4E0]"

                                  >

                                    Eliminar

                                  </button>

                                )}

                              </div>

                            );

                          }

                        )}

                      </div>

                    </section>

                  );

                }

              )}

            </div>

          </>

        )}

        {activeList === "manual" && (

          <section className="mt-2 mb-6 rounded-3xl bg-white p-5 shadow-sm sm:mt-12">

            <div className="mb-4">

              <h2 className="text-lg font-semibold text-[#30352C]">

                Añadir a la lista

              </h2>



              <p className="mt-1 text-sm text-[#879078]">

                Cosas que quieres comprar aunque no estén

                relacionadas con ninguna receta.

              </p>

            </div>



            <div className="grid gap-3 sm:grid-cols-[1fr_120px_140px_auto]">

              <input

                type="text"

                value={manualName}

                onChange={(event) =>

                  setManualName(

                    event.target.value

                  )

                }

                onKeyDown={(event) => {

                  if (

                    event.key === "Enter"

                  ) {

                    addManualItem();

                  }

                }}

                placeholder="Ej. Café"

                className="rounded-2xl border border-[#E1DED5] bg-[#F9F8F4] px-4 py-3 text-sm text-[#30352C] outline-none transition placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8]"

              />



              <input

                type="text"

                inputMode="decimal"

                value={manualQuantity}

                onChange={(event) =>

                  setManualQuantity(

                    event.target.value

                  )

                }

                placeholder="Cantidad"

                className="rounded-2xl border border-[#E1DED5] bg-[#F9F8F4] px-4 py-3 text-sm text-[#30352C] outline-none transition placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8]"

              />



              <input

                type="text"

                value={manualUnit}

                onChange={(event) =>

                  setManualUnit(

                    event.target.value

                  )

                }

                placeholder="Unidad (kg, ud...)"

                className="rounded-2xl border border-[#E1DED5] bg-[#F9F8F4] px-4 py-3 text-sm text-[#30352C] outline-none transition placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8]"

              />



              <button

                type="button"

                onClick={addManualItem}

                disabled={

                  addingManual ||

                  !manualName.trim()

                }

                className="rounded-2xl bg-[#879078] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#737D68] active:bg-[#687260] disabled:cursor-not-allowed disabled:opacity-50"

              >

                {addingManual

                  ? "Añadiendo…"

                  : "Añadir"}

              </button>

            </div>

          </section>

        )}



        {/* ERROR */}



        {errorMessage && (

          <section className="mb-6 rounded-3xl border border-[#E5D8D3] bg-[#FBF5F2] px-5 py-4">

            <p className="text-sm text-[#8B625A]">

              {errorMessage}

            </p>

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

      </div>

    </main>

  );

}