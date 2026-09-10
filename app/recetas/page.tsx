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

type IngredientInput = {
  name: string;
  quantity: string;
  unit: string;
};

function parseIngredientText(
  ingredient: string
): IngredientInput {
  const text = ingredient.trim();

  if (!text) {
    return {
      name: "",
      quantity: "",
      unit: "",
    };
  }

  const match = text.match(
    /^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)?\s+(.*)$/
  );

  if (!match) {
    return {
      name: text,
      quantity: "",
      unit: "",
    };
  }

  return {
    quantity: match[1].replace(",", "."),
    unit: match[2] || "",
    name: match[3],
  };
}

export default function RecetasPage() {
  const [recipes, setRecipes] =
    useState<Recipe[]>(baseRecipes);

  const [favorites, setFavorites] =
    useState<string[]>([]);

  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("Todas");

  const [showImport, setShowImport] =
    useState(false);

  const [showManualRecipe, setShowManualRecipe] =
    useState(false);

  const [instagramUrl, setInstagramUrl] =
    useState("");

  const [recipeText, setRecipeText] =
    useState("");

  const [showTextHelp, setShowTextHelp] =
    useState(false);

  const [loadingImport, setLoadingImport] =
    useState(false);

  const [importError, setImportError] =
    useState("");

  const [previewRecipe, setPreviewRecipe] =
    useState<Recipe | null>(null);

  const [ingredientInputs, setIngredientInputs] =
    useState<IngredientInput[]>([]);

  useEffect(() => {
    loadAllRecipes();

    const savedFavorites =
      localStorage.getItem("favorites");

    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  async function loadAllRecipes() {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
          id,
          title,
          description,
          preparation_time,
          servings,
          instructions,
          category_id,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Error cargando recetas desde Supabase:",
          error
        );

        setRecipes(baseRecipes);
        return;
      }

      const categoryMap: Record<number, string> = {
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

      const supabaseRecipes: Recipe[] =
        (data || []).map((recipe) => {
          const category =
            categoryMap[recipe.category_id] ||
            "Otros";

          const style =
            getCategoryStyle(category);

          return {
            id: String(recipe.id),
            name: recipe.title,
            category,
            time:
              recipe.preparation_time || "",
            difficulty: "Fácil",
            emoji: style.emoji,
            ingredients: [],
            steps: recipe.instructions
              ? recipe.instructions
                  .split("\n")
                  .filter(Boolean)
              : [],
            servings:
              recipe.servings || 2,
            description:
              recipe.description || "",
            color: style.color,
          };
        });

      setRecipes([
        ...baseRecipes,
        ...supabaseRecipes,
      ]);
    } catch (error) {
      console.error(
        "Error cargando las recetas:",
        error
      );

      setRecipes(baseRecipes);
    }
  }

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch = recipe.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "Todas"
          ? true
          : selectedCategory ===
            "❤️ Favoritas"
          ? favorites.includes(recipe.id)
          : recipe.category ===
            selectedCategory;

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    recipes,
    search,
    selectedCategory,
    favorites,
  ]);

  function toggleFavorite(recipeId: string) {
    const newFavorites =
      favorites.includes(recipeId)
        ? favorites.filter(
            (id) => id !== recipeId
          )
        : [...favorites, recipeId];

    setFavorites(newFavorites);

    localStorage.setItem(
      "favorites",
      JSON.stringify(newFavorites)
    );
  }

  function openManualRecipe() {
    setPreviewRecipe({
      id: createRecipeId("nueva-receta"),
      name: "",
      category: "Pasta",
      time: "",
      difficulty: "Fácil",
      emoji: "🍝",
      ingredients: [],
      steps: [""],
      servings: 2,
      description: "",
    });

    setIngredientInputs([
      {
        name: "",
        quantity: "",
        unit: "",
      },
    ]);

    setShowManualRecipe(true);
    setImportError("");
  }

  async function handleImport() {
    if (!instagramUrl.trim()) {
      setImportError(
        "Introduce un enlace de Instagram."
      );
      return;
    }

    setLoadingImport(true);
    setImportError("");

    try {
      const response = await fetch(
        "/api/import-recipe",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            url: instagramUrl.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se ha podido importar la receta."
        );
      }

      const recipe =
        data.recipe as Recipe;

      const normalizedRecipe: Recipe = {
        ...recipe,
        ingredients:
          Array.isArray(
            recipe.ingredients
          )
            ? recipe.ingredients
            : [],
        steps:
          Array.isArray(recipe.steps)
            ? recipe.steps
            : [""],
        servings:
          recipe.servings || 2,
        description:
          recipe.description || "",
        difficulty:
          recipe.difficulty || "Fácil",
        emoji:
          recipe.emoji || "🍝",
      };

      setPreviewRecipe(
        normalizedRecipe
      );

      const recipeIngredients =
        Array.isArray(
          normalizedRecipe.ingredients
        )
          ? normalizedRecipe.ingredients
          : [];

      setIngredientInputs(
        recipeIngredients.map(
          parseIngredientText
        )
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Ha ocurrido un error."
      );
    } finally {
      setLoadingImport(false);
    }
  }

  function handleCompleteWithHelp() {
    if (!recipeText.trim()) {
      setImportError(
        "Escribe primero el texto de la receta."
      );
      return;
    }

    const lines = recipeText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const recipe: Recipe = {
      id: createRecipeId(
        "receta-importada"
      ),
      name:
        lines[0] ||
        "Receta importada",
      category: "Pasta",
      time: "",
      difficulty: "Fácil",
      emoji: "🍝",
      ingredients: [],
      steps: lines.slice(1),
      servings: 2,
      description: "",
    };

    setPreviewRecipe(recipe);

    const recipeIngredients =
      Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    setIngredientInputs(
      recipeIngredients.map(
        parseIngredientText
      )
    );

    setShowTextHelp(false);
  }

  function updateIngredient(
    index: number,
    field: keyof IngredientInput,
    value: string
  ) {
    const updatedIngredients = [
      ...ingredientInputs,
    ];

    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value,
    };

    setIngredientInputs(
      updatedIngredients
    );
  }

  function deleteIngredient(
    index: number
  ) {
    setIngredientInputs(
      ingredientInputs.filter(
        (_, ingredientIndex) =>
          ingredientIndex !== index
      )
    );
  }

  function addIngredient() {
    setIngredientInputs([
      ...ingredientInputs,
      {
        name: "",
        quantity: "",
        unit: "",
      },
    ]);
  }

  function updateStep(
    index: number,
    value: string
  ) {
    if (!previewRecipe) return;

    const updatedSteps = [
      ...previewRecipe.steps,
    ];

    updatedSteps[index] = value;

    setPreviewRecipe({
      ...previewRecipe,
      steps: updatedSteps,
    });
  }

  function addStep() {
    if (!previewRecipe) return;

    setPreviewRecipe({
      ...previewRecipe,
      steps: [
        ...previewRecipe.steps,
        "",
      ],
    });
  }

  function deleteStep(index: number) {
    if (!previewRecipe) return;

    setPreviewRecipe({
      ...previewRecipe,
      steps:
        previewRecipe.steps.filter(
          (_, stepIndex) =>
            stepIndex !== index
        ),
    });
  }

  async function saveImportedRecipe() {
    if (!previewRecipe) return;

    const categoryStyle =
      getCategoryStyle(
        previewRecipe.category
      );

    const validIngredients =
      ingredientInputs.filter(
        (ingredient) =>
          ingredient.name.trim() !== ""
      );

    const ingredientsAsText =
      validIngredients.map(
        (ingredient) => {
          return [
            ingredient.quantity.trim(),
            ingredient.unit.trim(),
            ingredient.name.trim(),
          ]
            .filter(Boolean)
            .join(" ");
        }
      );

    const recipeToSave: Recipe = {
      ...previewRecipe,
      ingredients:
        ingredientsAsText,
      steps:
        previewRecipe.steps.filter(
          (step) =>
            step.trim() !== ""
        ),
      color: categoryStyle.color,
      emoji:
        previewRecipe.emoji ||
        categoryStyle.emoji,
    };

    try {
      // -----------------------------------
      // 1. GUARDAR LA RECETA
      // -----------------------------------

      const categoryMap: Record<
        string,
        number
      > = {
        Pasta: 7,
        Arroces: 8,
        Carne: 9,
        Pescado: 10,
        Legumbres: 11,
        Ensaladas: 6,
        Huevos: 12,
      };

      const categoryId =
        categoryMap[
          recipeToSave.category
        ] || 12;

      const {
        data: savedRecipe,
        error: recipeError,
      } = await supabase
        .from("recipes")
        .insert({
          title: recipeToSave.name,
          description:
            recipeToSave.description ||
            null,
          preparation_time:
            recipeToSave.time || null,
          servings:
            recipeToSave.servings ||
            null,
          instructions:
            recipeToSave.steps.join(
              "\n"
            ),
          category_id: categoryId,
          user_id: null,
        })
        .select()
        .single();

      if (recipeError) {
        console.error(
          "Error guardando receta:",
          recipeError
        );

        setImportError(
          `No se ha podido guardar la receta: ${recipeError.message}`
        );

        return;
      }

      console.log(
        "Receta guardada:",
        savedRecipe
      );

      // -----------------------------------
      // 2. GUARDAR LOS INGREDIENTES
      // -----------------------------------

      for (const ingredient of validIngredients) {
        const ingredientName =
          ingredient.name.trim();

        if (!ingredientName) {
          continue;
        }

        const {
          data: existingIngredient,
          error:
            searchIngredientError,
        } = await supabase
          .from("ingredients")
          .select("id")
          .ilike(
            "name",
            ingredientName
          )
          .limit(1)
          .maybeSingle();

        if (searchIngredientError) {
          console.error(
            "Error buscando ingrediente:",
            searchIngredientError
          );

          setImportError(
            `No se ha podido guardar el ingrediente "${ingredientName}": ${searchIngredientError.message}`
          );

          return;
        }

        let ingredientId: number;

        if (existingIngredient) {
          ingredientId =
            existingIngredient.id;
        } else {
          const {
            data: newIngredient,
            error:
              createIngredientError,
          } = await supabase
            .from("ingredients")
            .insert({
              name: ingredientName,
            })
            .select("id")
            .single();

          if (
            createIngredientError
          ) {
            console.error(
              "Error creando ingrediente:",
              createIngredientError
            );

            setImportError(
              `No se ha podido crear el ingrediente "${ingredientName}": ${createIngredientError.message}`
            );

            return;
          }

          ingredientId =
            newIngredient.id;
        }

        // -----------------------------------
        // 3. RELACIONAR INGREDIENTE Y RECETA
        // -----------------------------------

        const {
          error: relationError,
        } = await supabase
          .from(
            "recipe_ingredients"
          )
          .insert({
            recipe_id:
              savedRecipe.id,
            ingredient_id:
              ingredientId,
            quantity:
              ingredient.quantity.trim()
                ? Number(
                    ingredient.quantity.replace(
                      ",",
                      "."
                    )
                  )
                : null,
            unit:
              ingredient.unit.trim() ||
              null,
          });

        if (relationError) {
          console.error(
            "Error relacionando ingrediente:",
            relationError
          );

          setImportError(
            `No se ha podido relacionar el ingrediente "${ingredientName}": ${relationError.message}`
          );

          return;
        }
      }

      // -----------------------------------
      // 4. GUARDAR TAMBIÉN EN LOCALSTORAGE
      // -----------------------------------

      const savedRecipes =
        localStorage.getItem(
          "recipes"
        );

      let currentRecipes: Recipe[] =
        [];

      if (savedRecipes) {
        try {
          const parsed =
            JSON.parse(savedRecipes);

          if (Array.isArray(parsed)) {
            currentRecipes = parsed;
          }
        } catch {
          currentRecipes = [];
        }
      }

      currentRecipes.push(
        recipeToSave
      );

      localStorage.setItem(
        "recipes",
        JSON.stringify(
          currentRecipes
        )
      );

      setRecipes((prev) => [
        ...prev,
        recipeToSave,
      ]);

      // -----------------------------------
      // 5. CERRAR FORMULARIO
      // -----------------------------------

      setPreviewRecipe(null);
      setIngredientInputs([]);
      setShowImport(false);
      setShowManualRecipe(false);
      setInstagramUrl("");
      setRecipeText("");
      setImportError("");

      console.log(
        "Receta e ingredientes guardados correctamente."
      );
    } catch (error) {
      console.error(error);

      setImportError(
        "Ha ocurrido un error al guardar la receta."
      );
    }
  }

  function closeImport() {
    setShowImport(false);
    setShowManualRecipe(false);
    setPreviewRecipe(null);
    setIngredientInputs([]);
    setInstagramUrl("");
    setRecipeText("");
    setImportError("");
    setShowTextHelp(false);
  }

  return (
    <main className="min-h-screen bg-[#F7F4EE]">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* CABECERA */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="mb-3 inline-block text-sm text-gray-500 hover:text-gray-800"
            >
              ← Volver
            </Link>

            <h1 className="text-4xl font-bold text-gray-900">
              Mis recetas
            </h1>

            <p className="mt-2 text-gray-500">
              Guarda y organiza tus recetas favoritas
            </p>
          </div>

          <button
            onClick={openManualRecipe}
            className="rounded-2xl bg-gray-900 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-gray-800"
          >
            + Añadir receta
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Buscar receta..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
          />
        </div>

        {/* CATEGORÍAS */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map(
            (category) => (
              <button
                key={category}
                onClick={() =>
                  setSelectedCategory(
                    category
                  )
                }
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                  selectedCategory ===
                  category
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {category}
              </button>
            )
          )}
        </div>

        {/* RECETAS */}
        {filteredRecipes.length ===
        0 ? (
          <div className="rounded-3xl bg-white p-12 text-center">
            <div className="mb-3 text-5xl">
              🍽️
            </div>

            <h2 className="text-xl font-semibold text-gray-900">
              No hay recetas
            </h2>

            <p className="mt-2 text-gray-500">
              Prueba con otra búsqueda o categoría.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map(
              (recipe) => {
                const style =
                  getCategoryStyle(
                    recipe.category
                  );

                const isFavorite =
                  favorites.includes(
                    recipe.id
                  );

                return (
                  <div
                    key={recipe.id}
                    className="group relative overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <Link
                      href={`/recetas/${recipe.id}`}
                    >
                      <div
                        className={`flex h-44 items-center justify-center ${style.color}`}
                      >
                        <span className="text-7xl">
                          {recipe.emoji ||
                            style.emoji}
                        </span>
                      </div>

                      <div className="p-5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">
                            {recipe.category}
                          </span>

                          <span className="text-xs text-gray-400">
                            {recipe.time}
                          </span>
                        </div>

                        <h2 className="text-xl font-semibold text-gray-900">
                          {recipe.name}
                        </h2>

                        {recipe.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                            {
                              recipe.description
                            }
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>
                            {
                              recipe.difficulty
                            }
                          </span>

                          {recipe.servings && (
                            <span>
                              👥{" "}
                              {
                                recipe.servings
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <button
                      onClick={() =>
                        toggleFavorite(
                          recipe.id
                        )
                      }
                      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur"
                    >
                      {isFavorite
                        ? "❤️"
                        : "🤍"}
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* MODAL PARA AÑADIR / IMPORTAR */}
      {(showImport ||
        showManualRecipe) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">

            {!previewRecipe ? (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Añadir receta
                  </h2>

                  <button
                    onClick={closeImport}
                    className="text-2xl text-gray-400 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    onClick={() => {
                      setShowManualRecipe(
                        true
                      );
                      setShowImport(false);
                      openManualRecipe();
                    }}
                    className="rounded-2xl border border-gray-200 p-6 text-left transition hover:border-gray-400 hover:bg-gray-50"
                  >
                    <div className="mb-3 text-3xl">
                      ✍️
                    </div>

                    <h3 className="font-semibold text-gray-900">
                      Crear receta
                      manualmente
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Introduce tú todos los datos de la receta.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setShowImport(true);
                      setShowManualRecipe(
                        false
                      );
                    }}
                    className="rounded-2xl border border-gray-200 p-6 text-left transition hover:border-gray-400 hover:bg-gray-50"
                  >
                    <div className="mb-3 text-3xl">
                      📱
                    </div>

                    <h3 className="font-semibold text-gray-900">
                      Importar de Instagram
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Pega el enlace de una publicación o reel.
                    </p>
                  </button>
                </div>

                {showImport && (
                  <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                    <label className="mb-2 block text-sm font-medium text-gray-900">
                      Enlace de Instagram
                    </label>

                    <input
                      type="text"
                      value={instagramUrl}
                      onChange={(e) =>
                        setInstagramUrl(
                          e.target.value
                        )
                      }
                      placeholder="https://www.instagram.com/..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                    />

                    {importError && (
                      <p className="mt-3 text-sm text-red-500">
                        {importError}
                      </p>
                    )}

                    <button
                      onClick={
                        handleImport
                      }
                      disabled={
                        loadingImport
                      }
                      className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 font-medium text-white disabled:opacity-50"
                    >
                      {loadingImport
                        ? "Importando..."
                        : "Importar receta"}
                    </button>

                    <button
                      onClick={() =>
                        setShowTextHelp(
                          !showTextHelp
                        )
                      }
                      className="mt-3 text-sm text-gray-600 underline"
                    >
                      ¿No funciona el enlace?
                    </button>

                    {showTextHelp && (
                      <div className="mt-4 rounded-xl bg-white p-4">
                        <p className="text-sm text-gray-600">
                          Puedes copiar aquí el texto de la receta.
                        </p>

                        <textarea
                          value={recipeText}
                          onChange={(e) =>
                            setRecipeText(
                              e.target.value
                            )
                          }
                          placeholder="Pega aquí el texto..."
                          rows={6}
                          className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                        />

                        <button
                          onClick={
                            handleCompleteWithHelp
                          }
                          className="mt-3 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white"
                        >
                          Continuar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* FORMULARIO DE RECETA */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {previewRecipe.name ||
                        "Nueva receta"}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Revisa y completa los datos
                    </p>
                  </div>

                  <button
                    onClick={closeImport}
                    className="text-2xl text-gray-400 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                {/* NOMBRE */}
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Nombre
                  </label>

                  <input
                    type="text"
                    value={
                      previewRecipe.name
                    }
                    onChange={(e) =>
                      setPreviewRecipe({
                        ...previewRecipe,
                        name: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                  />
                </div>

                {/* DESCRIPCIÓN */}
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-gray-900">
                    Descripción
                  </label>

                  <textarea
                    value={
                      previewRecipe.description ||
                      ""
                    }
                    onChange={(e) =>
                      setPreviewRecipe({
                        ...previewRecipe,
                        description:
                          e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                  />
                </div>

                {/* DATOS BÁSICOS */}
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-900">
                      Categoría
                    </label>

                    <select
                      value={
                        previewRecipe.category
                      }
                      onChange={(e) =>
                        setPreviewRecipe({
                          ...previewRecipe,
                          category:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-gray-400"
                    >
                      {recipeCategories.map(
                        (category) => (
                          <option
                            key={category}
                            value={
                              category
                            }
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-900">
                      Tiempo
                    </label>

                    <input
                      type="text"
                      value={
                        previewRecipe.time
                      }
                      onChange={(e) =>
                        setPreviewRecipe({
                          ...previewRecipe,
                          time: e.target.value,
                        })
                      }
                      placeholder="30 min"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-900">
                      Raciones
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        previewRecipe.servings ||
                        ""
                      }
                      onChange={(e) =>
                        setPreviewRecipe({
                          ...previewRecipe,
                          servings: Number(
                            e.target.value
                          ),
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                {/* INGREDIENTES */}
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Ingredientes
                    </h3>

                    <button
                      onClick={
                        addIngredient
                      }
                      className="text-sm font-medium text-gray-700 underline"
                    >
                      + Añadir ingrediente
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ingredientInputs.map(
                      (
                        ingredient,
                        index
                      ) => (
                        <div
                          key={index}
                          className="grid grid-cols-[90px_110px_1fr_40px] gap-2"
                        >
                          <input
                            type="text"
                            value={
                              ingredient.quantity
                            }
                            onChange={(e) =>
                              updateIngredient(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            placeholder="Cantidad"
                            className="rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                          />

                          <select
                            value={
                              ingredient.unit
                            }
                            onChange={(e) =>
                              updateIngredient(
                                index,
                                "unit",
                                e.target.value
                              )
                            }
                            className="rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none focus:border-gray-400"
                          >
                            <option value="">
                              Unidad
                            </option>
                            <option value="g">
                              g
                            </option>
                            <option value="kg">
                              kg
                            </option>
                            <option value="ml">
                              ml
                            </option>
                            <option value="l">
                              l
                            </option>
                            <option value="ud">
                              ud
                            </option>
                            <option value="cda">
                              cda
                            </option>
                            <option value="cdta">
                              cdta
                            </option>
                          </select>

                          <input
                            type="text"
                            value={
                              ingredient.name
                            }
                            onChange={(e) =>
                              updateIngredient(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="Ingrediente"
                            className="rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                          />

                          <button
                            onClick={() =>
                              deleteIngredient(
                                index
                              )
                            }
                            className="rounded-xl border border-gray-200 text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* PASOS */}
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Preparación
                    </h3>

                    <button
                      onClick={addStep}
                      className="text-sm font-medium text-gray-700 underline"
                    >
                      + Añadir paso
                    </button>
                  </div>

                  <div className="space-y-3">
                    {previewRecipe.steps.map(
                      (
                        step,
                        index
                      ) => (
                        <div
                          key={index}
                          className="flex gap-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                            {index + 1}
                          </div>

                          <textarea
                            value={step}
                            onChange={(e) =>
                              updateStep(
                                index,
                                e.target.value
                              )
                            }
                            placeholder={`Paso ${
                              index + 1
                            }`}
                            rows={2}
                            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400"
                          />

                          <button
                            onClick={() =>
                              deleteStep(
                                index
                              )
                            }
                            className="h-10 w-10 shrink-0 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {importError && (
                  <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    {importError}
                  </p>
                )}

                {/* BOTONES */}
                <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                  <button
                    onClick={closeImport}
                    className="rounded-xl px-5 py-3 text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={
                      saveImportedRecipe
                    }
                    className="rounded-xl bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
                  >
                    Guardar receta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}