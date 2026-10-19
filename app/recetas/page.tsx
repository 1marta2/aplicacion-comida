
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  baseRecipes,
  categories as recipeCategories,
  createRecipeId,
  getCategoryStyle,
  type Recipe,
} from "@/lib/recipes";

const categories = [
  "Todas",
  "❤️ Favoritas",
  ...recipeCategories,
];

type SupabaseRecipeRow = {
  id: number;
  title: string;
  description: string | null;
  preparation_time: number | null;
  difficulty: string | null;
  servings: number | null;
  instructions: string | null;
  category_id: number | null;
  created_at: string | null;
};

type ParsedIngredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
};

const categoryMap: Record<string, number> = {
  Desayuno: 1,
  Comida: 2,
  Cena: 3,
  Postres: 4,
  Snacks: 5,
  Ensaladas: 6,
  Pasta: 7,
  Arroces: 8,
  Arroz: 8,
  Carne: 9,
  Carnes: 9,
  Pescado: 10,
  Pescados: 10,
  Legumbres: 11,
  Huevos: 12,
  Otros: 12,
};

const categoryNameById: Record<number, string> = {
  1: "Desayuno",
  2: "Comida",
  3: "Cena",
  4: "Postres",
  5: "Snacks",
  6: "Ensaladas",
  7: "Pasta",
  8: "Arroces",
  9: "Carne",
  10: "Pescado",
  11: "Legumbres",
  12: "Otros",
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseIngredientText(text: string): ParsedIngredient {
  const cleanText = text.trim();

  const match = cleanText.match(
    /^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(g|kg|ml|l|ud|uds|unidad|unidades|cda|cdas|cdta|cdtas)?\s+(.+)$/i
  );

  if (!match) {
    return {
      quantity: null,
      unit: null,
      name: cleanText,
    };
  }

  let quantity: number | null = null;
  const rawQuantity = match[1].replace(",", ".");

  if (rawQuantity.includes("/")) {
    const [numerator, denominator] = rawQuantity
      .split("/")
      .map(Number);

    if (
      Number.isFinite(numerator) &&
      Number.isFinite(denominator) &&
      denominator !== 0
    ) {
      quantity = numerator / denominator;
    }
  } else {
    const parsed = Number(rawQuantity);

    if (Number.isFinite(parsed)) {
      quantity = parsed;
    }
  }

  let unit = match[2] || null;

  if (unit) {
    const normalizedUnit = unit.toLowerCase();

    if (normalizedUnit === "uds") {
      unit = "ud";
    }

    if (
      normalizedUnit === "unidad" ||
      normalizedUnit === "unidades"
    ) {
      unit = "ud";
    }

    if (normalizedUnit === "cdas") {
      unit = "cda";
    }

    if (normalizedUnit === "cdtas") {
      unit = "cdta";
    }
  }

  return {
    quantity,
    unit,
    name: match[3].trim(),
  };
}

/**
 * Crea una receta base en Supabase.
 * Solo se llama cuando sabemos que esa receta todavía no existe.
 */
async function createBaseRecipeInSupabase(
  recipe: Recipe,
  userId: string
): Promise<SupabaseRecipeRow | null> {
  const categoryId = categoryMap[recipe.category] ?? 12;

  const preparationTime = recipe.time
    ? parseInt(String(recipe.time), 10)
    : null;

  const servings =
    typeof recipe.servings === "number"
      ? recipe.servings
      : null;

  const instructions =
    Array.isArray(recipe.steps) && recipe.steps.length > 0
      ? recipe.steps.join("\n")
      : null;

  const {
    data: savedRecipe,
    error: recipeError,
  } = await supabase
    .from("recipes")
    .insert({
      title: recipe.name,
      description: recipe.description || null,
      preparation_time: Number.isFinite(preparationTime)
        ? preparationTime
        : null,
      difficulty: recipe.difficulty || null,
      servings,
      instructions,
      category_id: categoryId,
      user_id: userId,
    })
    .select(
      "id,title,description,preparation_time,difficulty,servings,instructions,category_id,created_at"
    )
    .single();

  if (recipeError || !savedRecipe) {
    console.error(
      `Error creando receta base "${recipe.name}" en Supabase:`,
      recipeError
    );

    return null;
  }

  if (Array.isArray(recipe.ingredients)) {
    for (const ingredientText of recipe.ingredients) {
      const parsed = parseIngredientText(ingredientText);
      const ingredientName = parsed.name.trim();

      if (!ingredientName) {
        continue;
      }

      let ingredientId: number | null = null;

      const {
        data: existingIngredient,
        error: findIngredientError,
      } = await supabase
        .from("ingredients")
        .select("id,name")
        .ilike("name", ingredientName)
        .limit(1)
        .maybeSingle();

      if (findIngredientError) {
        console.error(
          `Error buscando ingrediente "${ingredientName}":`,
          findIngredientError
        );
      }

      if (existingIngredient) {
        ingredientId = existingIngredient.id;
      } else {
        const {
          data: newIngredient,
          error: createIngredientError,
        } = await supabase
          .from("ingredients")
          .insert({
            name: ingredientName,
          })
          .select("id,name")
          .single();

        if (createIngredientError || !newIngredient) {
          console.error(
            `Error creando ingrediente "${ingredientName}":`,
            createIngredientError
          );

          continue;
        }

        ingredientId = newIngredient.id;
      }

      if (!ingredientId) {
        continue;
      }

      const { error: relationError } = await supabase
        .from("recipe_ingredients")
        .insert({
          recipe_id: savedRecipe.id,
          ingredient_id: ingredientId,
          display_name: ingredientName,
          quantity: parsed.quantity,
          unit: parsed.unit,
        });

      if (relationError) {
        console.error(
          `Error relacionando ingrediente "${ingredientName}" con "${recipe.name}":`,
          relationError
        );
      }
    }
  }

  return savedRecipe;
}

function supabaseRecipeToRecipe(
  row: SupabaseRecipeRow
): Recipe {
  const category =
    categoryNameById[row.category_id ?? 12] || "Otros";

  const matchingBaseRecipe = baseRecipes.find(
    (baseRecipe) =>
      normalizeText(baseRecipe.name) === normalizeText(row.title)
  );

  return {
    id: String(row.id),
    name: row.title,
    category,
    time:
      row.preparation_time !== null
        ? `${row.preparation_time} min`
        : matchingBaseRecipe?.time || "",
    difficulty:
      row.difficulty || matchingBaseRecipe?.difficulty || "Fácil",
    emoji:
      matchingBaseRecipe?.emoji ||
      getCategoryStyle(category).emoji,
    ingredients: matchingBaseRecipe?.ingredients || [],
    steps: row.instructions
      ? row.instructions
          .split("\n")
          .map((step) => step.trim())
          .filter(Boolean)
      : matchingBaseRecipe?.steps || [],
    servings:
      row.servings !== null
        ? row.servings
        : matchingBaseRecipe?.servings,
    description:
      row.description || matchingBaseRecipe?.description,
    color: matchingBaseRecipe?.color,
    source: matchingBaseRecipe?.source,
  };
}

export default function RecetasPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(baseRecipes);

  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newRecipeName, setNewRecipeName] = useState("");
  const [newRecipeCategory, setNewRecipeCategory] = useState("Comida");
  const [newRecipeTime, setNewRecipeTime] = useState("");
  const [newRecipeDifficulty, setNewRecipeDifficulty] = useState("Fácil");
  const [newRecipeServings, setNewRecipeServings] = useState("");
  const [newRecipeDescription, setNewRecipeDescription] = useState("");
  const [newRecipeIngredients, setNewRecipeIngredients] = useState("");
  const [newRecipeSteps, setNewRecipeSteps] = useState("");

  useEffect(() => {
    async function loadAllRecipes() {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "No se ha podido obtener el usuario:",
          userError
        );

        setRecipes(baseRecipes);
        setLoading(false);
        return;
      }

      /*
       * Primero cargamos todas las recetas del usuario.
       * Después comprobamos qué recetas base faltan.
       */

      const {
        data: existingRows,
        error: recipesError,
      } = await supabase
        .from("recipes")
        .select(
          "id,title,description,preparation_time,difficulty,servings,instructions,category_id,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (recipesError) {
        console.error(
          "Error cargando recetas desde Supabase:",
          recipesError
        );

        setRecipes(baseRecipes);
        setLoading(false);
        return;
      }

      let currentRows: SupabaseRecipeRow[] = existingRows || [];

      /*
       * Creamos un Set con los nombres que ya existen.
       * El nombre se normaliza para evitar duplicados por
       * diferencias entre mayúsculas y tildes.
       */

      const existingTitles = new Set<string>();

      for (const row of currentRows) {
        existingTitles.add(normalizeText(row.title));
      }

      /*
       * Añadimos únicamente las recetas base que realmente
       * no existen todavía en Supabase.
       */

      for (const baseRecipe of baseRecipes) {
        const normalizedBaseName = normalizeText(baseRecipe.name);

        if (existingTitles.has(normalizedBaseName)) {
          continue;
        }

        const createdRecipe = await createBaseRecipeInSupabase(
          baseRecipe,
          user.id
        );

        if (createdRecipe) {
          currentRows = [...currentRows, createdRecipe];
          existingTitles.add(normalizedBaseName);
        }
      }

      const supabaseRecipes = currentRows.map(
        supabaseRecipeToRecipe
      );

      /*
       * Evitamos mostrar dos recetas con el mismo nombre.
       */

      const mergedRecipes: Recipe[] = [];
      const addedNames = new Set<string>();

      for (const supabaseRecipe of supabaseRecipes) {
        const normalizedName = normalizeText(supabaseRecipe.name);

        if (!addedNames.has(normalizedName)) {
          mergedRecipes.push(supabaseRecipe);
          addedNames.add(normalizedName);
        }
      }

      /*
       * Si alguna receta base no está en Supabase, la mostramos
       * igualmente como alternativa.
       */

      for (const baseRecipe of baseRecipes) {
        const normalizedName = normalizeText(baseRecipe.name);

        if (!addedNames.has(normalizedName)) {
          mergedRecipes.push(baseRecipe);
          addedNames.add(normalizedName);
        }
      }

      setRecipes(mergedRecipes);
      setLoading(false);
    }

    loadAllRecipes();
  }, []);

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    function loadFavorites() {
      try {
        const stored = localStorage.getItem("favoriteRecipes");
        const parsed = stored ? JSON.parse(stored) : [];

        setFavoriteIds(
          Array.isArray(parsed) ? parsed.map(String) : []
        );
      } catch (error) {
        console.error("Error cargando favoritos:", error);
        setFavoriteIds([]);
      }
    }

    loadFavorites();

    window.addEventListener("favoritesChanged", loadFavorites);
    window.addEventListener("storage", loadFavorites);

    return () => {
      window.removeEventListener("favoritesChanged", loadFavorites);
      window.removeEventListener("storage", loadFavorites);
    };
  }, []);

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return recipes.filter((recipe) => {
      const matchesCategory =
        selectedCategory === "Todas"
          ? true
          : selectedCategory === "❤️ Favoritas"
            ? favoriteIds.includes(String(recipe.id))
            : recipe.category === selectedCategory;

      const matchesSearch =
        normalizedSearch === ""
          ? true
          : normalizeText(recipe.name).includes(normalizedSearch) ||
            normalizeText(recipe.category).includes(normalizedSearch) ||
            recipe.ingredients.some((ingredient) =>
              normalizeText(ingredient).includes(normalizedSearch)
            );

      return matchesCategory && matchesSearch;
    });
  }, [recipes, selectedCategory, search, favoriteIds]);

  function toggleFavorite(recipeId: string) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem("favoriteRecipes");

      const currentFavorites: string[] = stored
        ? JSON.parse(stored).map(String)
        : [];

      const normalizedId = String(recipeId);

      const nextFavorites = currentFavorites.includes(normalizedId)
        ? currentFavorites.filter((id) => id !== normalizedId)
        : [...currentFavorites, normalizedId];

      localStorage.setItem(
        "favoriteRecipes",
        JSON.stringify(nextFavorites)
      );

      window.dispatchEvent(new Event("favoritesChanged"));

      setRecipes((current) => [...current]);
    } catch (error) {
      console.error("Error guardando favorito:", error);
    }
  }

  function isFavorite(recipeId: string) {
    return favoriteIds.includes(String(recipeId));
  }

  async function saveImportedRecipe(recipeToSave: Recipe) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("No hay usuario autenticado:", userError);
      return;
    }

    /*
     * Evitamos crear otra receta si ya existe una con
     * el mismo nombre para este usuario.
     */

    const normalizedName = normalizeText(recipeToSave.name);

    const {
      data: existingRecipe,
      error: existingRecipeError,
    } = await supabase
      .from("recipes")
      .select(
        "id,title,description,preparation_time,difficulty,servings,instructions,category_id,created_at"
      )
      .eq("user_id", user.id)
      .ilike("title", recipeToSave.name.trim())
      .limit(1)
      .maybeSingle();

    if (existingRecipeError) {
      console.error(
        "Error comprobando si la receta ya existe:",
        existingRecipeError
      );
    }

    if (
      existingRecipe &&
      normalizeText(existingRecipe.title) === normalizedName
    ) {
      console.warn(
        `La receta "${recipeToSave.name}" ya existe en Supabase.`
      );

      const existingAsRecipe = supabaseRecipeToRecipe(existingRecipe);

      setRecipes((current) => {
        const alreadyShown = current.some(
          (recipe) =>
            String(recipe.id) === String(existingAsRecipe.id)
        );

        return alreadyShown
          ? current
          : [existingAsRecipe, ...current];
      });

      setShowCreate(false);
      return;
    }

    const categoryId = categoryMap[recipeToSave.category] ?? 12;

    const preparationTime = recipeToSave.time
      ? parseInt(String(recipeToSave.time), 10)
      : null;

    const {
      data: insertedRecipe,
      error: recipeError,
    } = await supabase
      .from("recipes")
      .insert({
        title: recipeToSave.name,
        description: recipeToSave.description || null,
        preparation_time: Number.isFinite(preparationTime)
          ? preparationTime
          : null,
        difficulty: recipeToSave.difficulty || null,
        servings: recipeToSave.servings || null,
        instructions: recipeToSave.steps.join("\n"),
        category_id: categoryId,
        user_id: user.id,
      })
      .select()
      .single();

    if (recipeError || !insertedRecipe) {
      console.error(
        "Error guardando receta en Supabase:",
        recipeError
      );
      return;
    }

    for (const ingredientText of recipeToSave.ingredients) {
      const parsed = parseIngredientText(ingredientText);
      const ingredientName = parsed.name.trim();

      if (!ingredientName) {
        continue;
      }

      let ingredientId: number | null = null;

      const {
        data: existingIngredient,
        error: findIngredientError,
      } = await supabase
        .from("ingredients")
        .select("id,name")
        .ilike("name", ingredientName)
        .limit(1)
        .maybeSingle();

      if (findIngredientError) {
        console.error(
          "Error buscando ingrediente:",
          findIngredientError
        );
      }

      if (existingIngredient) {
        ingredientId = existingIngredient.id;
      } else {
        const {
          data: newIngredient,
          error: createIngredientError,
        } = await supabase
          .from("ingredients")
          .insert({
            name: ingredientName,
          })
          .select("id,name")
          .single();

        if (createIngredientError || !newIngredient) {
          console.error(
            "Error creando ingrediente:",
            createIngredientError
          );
          continue;
        }

        ingredientId = newIngredient.id;
      }

      if (!ingredientId) {
        continue;
      }

      const { error: relationError } = await supabase
        .from("recipe_ingredients")
        .insert({
          recipe_id: insertedRecipe.id,
          ingredient_id: ingredientId,
          display_name: ingredientName,
          quantity: parsed.quantity,
          unit: parsed.unit,
        });

      if (relationError) {
        console.error(
          "Error relacionando ingrediente:",
          relationError
        );
      }
    }

    try {
      const storedRecipes = localStorage.getItem("recipes");

      const currentLocalRecipes: Recipe[] = storedRecipes
        ? JSON.parse(storedRecipes)
        : [];

      localStorage.setItem(
        "recipes",
        JSON.stringify([
          ...currentLocalRecipes,
          {
            ...recipeToSave,
            id: String(insertedRecipe.id),
          },
        ])
      );
    } catch (error) {
      console.error("Error guardando copia local:", error);
    }

    setRecipes((current) => {
      const newRecipe: Recipe = {
        ...recipeToSave,
        id: String(insertedRecipe.id),
      };

      return [newRecipe, ...current];
    });

    setShowCreate(false);
    setNewRecipeName("");
    setNewRecipeCategory("Comida");
    setNewRecipeTime("");
    setNewRecipeDifficulty("Fácil");
    setNewRecipeServings("");
    setNewRecipeDescription("");
    setNewRecipeIngredients("");
    setNewRecipeSteps("");
  }

  async function handleCreateRecipe() {
    const name = newRecipeName.trim();

    if (!name) {
      return;
    }

    const ingredients = newRecipeIngredients
      .split("\n")
      .map((ingredient) => ingredient.trim())
      .filter(Boolean);

    const steps = newRecipeSteps
      .split("\n")
      .map((step) => step.trim())
      .filter(Boolean);

    const recipe: Recipe = {
      id: createRecipeId("nueva-receta"),
      name,
      category: newRecipeCategory,
      time: newRecipeTime.trim(),
      difficulty: newRecipeDifficulty,
      emoji: getCategoryStyle(newRecipeCategory).emoji,
      ingredients,
      steps,
      servings:
        newRecipeServings.trim() !== ""
          ? Number(newRecipeServings)
          : undefined,
      description: newRecipeDescription.trim() || undefined,
    };

    await saveImportedRecipe(recipe);
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-3 pb-28 pt-5 text-[#26352D] sm:px-4 sm:pt-6">
      <div className="mx-auto w-full max-w-5xl">
        {/* CABECERA */}
        <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6 sm:gap-4">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-[#52685A] sm:text-sm">
              Mi cocina
            </p>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Recetas
            </h1>

            <p className="mt-1 text-xs text-[#6B756E] sm:text-sm">
              Tus recetas, todas en un mismo sitio
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#52685A] text-2xl text-white shadow-sm transition hover:opacity-90 sm:h-11 sm:w-11"
            aria-label="Crear receta"
          >
            +
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="mb-4 sm:mb-5">
          <div className="flex items-center rounded-2xl border border-[#E1E2DB] bg-white px-3 py-3 shadow-sm sm:px-4">
            <span className="mr-2 text-lg">⌕</span>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar receta o ingrediente..."
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#9AA29D]"
            />
          </div>
        </div>

        {/* CATEGORÍAS */}
        <div className="mb-5 overflow-x-auto pb-1 sm:mb-6">
          <div className="flex min-w-max gap-2">
            {categories.map((category) => {
              const active = selectedCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                    active
                      ? "bg-[#52685A] text-white"
                      : "border border-[#E1E2DB] bg-white text-[#52685A]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* RECETAS */}
        {loading ? (
          <div className="rounded-3xl border border-[#E4E3DA] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#DDE8DF] border-t-[#52685A]" />

            <p className="text-sm text-[#6B756E]">
              Cargando tus recetas...
            </p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="rounded-3xl border border-[#E4E3DA] bg-white p-8 text-center shadow-sm">
            <div className="mb-3 text-4xl">🍽️</div>

            <h2 className="text-lg font-semibold">No hay recetas</h2>

            <p className="mt-1 text-sm text-[#6B756E]">
              Prueba con otra búsqueda o categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => {
              const style = getCategoryStyle(recipe.category);
              const favorite = isFavorite(String(recipe.id));

              return (
                <div
                  key={String(recipe.id)}
                  className="group relative min-w-0 overflow-hidden rounded-2xl border border-[#E4E3DA] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-3xl"
                >
                  <Link
                    href={`/recetas/${recipe.id}`}
                    className="block h-full"
                  >
                    <div
                      className="flex h-28 items-center justify-center sm:h-36"
                      style={{
                        backgroundColor: recipe.color || style.color,
                      }}
                    >
                      <span className="text-4xl sm:text-6xl">
                        {recipe.emoji || style.emoji}
                      </span>
                    </div>

                    <div className="p-3 pr-10 sm:p-4 sm:pr-14">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="max-w-full truncate rounded-full bg-[#F0F3EF] px-2 py-1 text-[10px] font-medium text-[#52685A] sm:px-2.5 sm:text-xs">
                          {recipe.category}
                        </span>
                      </div>

                      <h2 className="line-clamp-2 break-words text-sm font-semibold leading-snug sm:text-lg sm:leading-tight">
                        {recipe.name}
                      </h2>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#747D77] sm:mt-3 sm:gap-3 sm:text-xs">
                        {recipe.time && (
                          <span className="whitespace-nowrap">
                            ⏱ {recipe.time}
                          </span>
                        )}

                        {recipe.difficulty && (
                          <span className="whitespace-nowrap">
                            · {recipe.difficulty}
                          </span>
                        )}

                        {recipe.servings && (
                          <span className="whitespace-nowrap">
                            · 👤 {recipe.servings}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(String(recipe.id))}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base shadow-sm backdrop-blur transition hover:scale-105 sm:right-4 sm:top-4 sm:h-9 sm:w-9 sm:text-lg"
                    aria-label={
                      favorite
                        ? "Quitar de favoritos"
                        : "Añadir a favoritos"
                    }
                  >
                    {favorite ? "❤️" : "♡"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CREAR RECETA */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-[#F7F5EF] p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Nueva receta</h2>

                <p className="mt-1 text-sm text-[#6B756E]">
                  Añádela a tu colección
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-[#52685A] shadow-sm"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Nombre
                </label>

                <input
                  value={newRecipeName}
                  onChange={(event) => setNewRecipeName(event.target.value)}
                  placeholder="Ej. Pasta con pollo"
                  className="w-full rounded-2xl border border-[#DEDCD2] bg-white px-4 py-3 text-sm outline-none focus:border-[#52685A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Categoría
                  </label>

                  <select
                    value={newRecipeCategory}
                    onChange={(event) =>
                      setNewRecipeCategory(event.target.value)
                    }
                    className="w-full rounded-2xl border border-[#DEDCD2] bg-white px-4 py-3 text-sm outline-none"
                  >
                    {recipeCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Tiempo
                  </label>

                  <input
                    value={newRecipeTime}
                    onChange={(event) => setNewRecipeTime(event.target.value)}
                    placeholder="30 min"
                    className="w-full rounded-2xl border border-[#DEDCD2] bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Dificultad
                  </label>

                  <select
                    value={newRecipeDifficulty}
                    onChange={(event) =>
                      setNewRecipeDifficulty(event.target.value)
                    }
                    className="w-full rounded-2xl border border-[#DEDCD2] bg-white px-4 py-3 text-sm outline-none"
                  >
                    <option value="Fácil">Fácil</option>
                    <option value="Media">Media</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Raciones
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={newRecipeServings}
                    onChange={(event) =>
                      setNewRecipeServings(event.target.value)
                    }
                    placeholder="2"
                    className="w-full rounded-2xl border border-[#DEDCD2] bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Descripción
                </label>

                <textarea
                  value={newRecipeDescription}
                  onChange={(event) =>
                    setNewRecipeDescription(event.target.value)
                  }
                  placeholder="Una pequeña descripción..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-[#DEDCD2] bg-white px-4 py-3 text-sm outline-none focus:border-[#52685A]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Ingredientes
                </label>

                <p className="mb-2 text-xs text-[#7A827D]">
                  Uno por línea. Ejemplo: 200 g pasta
                </p>

                <textarea
                  value={newRecipeIngredients}
                  onChange={(event) =>
                    setNewRecipeIngredients(event.target.value)
                  }
                  placeholder={"200 g pasta\n1 cebolla\n2 huevos"}
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-[#DEDCD2] bg-white px-4 py-3 text-sm outline-none focus:border-[#52685A]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Preparación
                </label>

                <p className="mb-2 text-xs text-[#7A827D]">
                  Un paso por línea.
                </p>

                <textarea
                  value={newRecipeSteps}
                  onChange={(event) => setNewRecipeSteps(event.target.value)}
                  placeholder={"Cuece la pasta.\nPrepara la salsa.\nMezcla todo."}
                  rows={7}
                  className="w-full resize-none rounded-2xl border border-[#DEDCD2] bg-white px-4 py-3 text-sm outline-none focus:border-[#52685A]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-2xl border border-[#DAD9D0] bg-white px-4 py-3 text-sm font-medium text-[#52685A]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleCreateRecipe}
                  disabled={!newRecipeName.trim()}
                  className="flex-1 rounded-2xl bg-[#52685A] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Guardar receta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
