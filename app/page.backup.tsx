"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const recipes = {
  "pasta-cremosa": {
    name: "Pasta cremosa",
    emoji: "🍝",
  },
  "ensalada-mediterranea": {
    name: "Ensalada mediterránea",
    emoji: "🥗",
  },
  "arroz-con-verduras": {
    name: "Arroz con verduras",
    emoji: "🍚",
  },
  "lentejas-caseras": {
    name: "Lentejas caseras",
    emoji: "🥣",
  },
  "pollo-al-horno": {
    name: "Pollo al horno",
    emoji: "🍗",
  },
  "salmon-con-patata": {
    name: "Salmón con patata",
    emoji: "🐟",
  },
};

const days = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

type Planner = {
  [day: string]: {
    [meal: string]: string | string[] | null;
  };
};

type HomeRecipe = {
  id: string;
  name: string;
  emoji?: string;
  ingredients?: string[];
};

type PantryItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string;
};

type CookingSuggestion = {
  recipe: HomeRecipe;
  missing: string[];
};

function normalizeIngredientName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /^(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(?:g|gr|kg|ml|l|cl|dl|unidad|unidades|ud|uds)?\s*(?:de\s+|del\s+)?/i,
      ""
    )
    .trim()
    .replace(/\s+/g, " ");
}

function getIngredientName(ingredient: string) {
  return normalizeIngredientName(ingredient);
}

function pantryMatchesIngredient(
  ingredient: string,
  pantry: PantryItem
) {
  const ingredientName = getIngredientName(ingredient);
  const pantryName = normalizeIngredientName(pantry.name);

  if (!ingredientName || !pantryName) {
    return false;
  }

  return (
    ingredientName === pantryName ||
    ingredientName.includes(pantryName) ||
    pantryName.includes(ingredientName)
  );
}

function getRecipeIds(value: string | string[] | null | undefined) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

export default function HomePage() {
  const [planner, setPlanner] = useState<Planner>({});
  const [today, setToday] = useState("Lunes");

  const [availableRecipes, setAvailableRecipes] =
    useState<HomeRecipe[]>([]);

  const [pantryItems, setPantryItems] = useState<PantryItem[]>(
    []
  );

  const [cookingSuggestions, setCookingSuggestions] =
    useState<CookingSuggestion[]>([]);

  useEffect(() => {
    const loadHomeData = () => {
      const savedPlanner = localStorage.getItem("planner");

      if (savedPlanner) {
        try {
          setPlanner(JSON.parse(savedPlanner));
        } catch {
          setPlanner({});
        }
      }

      const savedRecipes = localStorage.getItem("recipes");
      const savedImportedRecipes =
        localStorage.getItem("importedRecipes");

      const customRecipes: HomeRecipe[] = savedRecipes
        ? JSON.parse(savedRecipes)
        : [];

      const importedRecipes: HomeRecipe[] =
        savedImportedRecipes
          ? JSON.parse(savedImportedRecipes)
          : [];

      const combinedRecipes = [
        ...Object.entries(recipes).map(
          ([id, recipe]) => ({
            id,
            ...recipe,
          })
        ),
        ...customRecipes,
        ...importedRecipes,
      ];

      const uniqueRecipes = Array.from(
        new Map(
          combinedRecipes.map((recipe) => [
            recipe.id,
            recipe,
          ])
        ).values()
      );

      setAvailableRecipes(uniqueRecipes);

      const savedPantry = localStorage.getItem("pantryItems");

      if (savedPantry) {
        try {
          setPantryItems(JSON.parse(savedPantry));
        } catch {
          setPantryItems([]);
        }
      } else {
        setPantryItems([]);
      }

      const currentDay = new Date().getDay();

      const dayNames = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ];

      setToday(dayNames[currentDay]);
    };

    loadHomeData();

    window.addEventListener(
      "storage",
      loadHomeData
    );

    window.addEventListener(
      "favoritesChanged",
      loadHomeData
    );

    window.addEventListener(
      "pantryChanged",
      loadHomeData
    );

    return () => {
      window.removeEventListener(
        "storage",
        loadHomeData
      );

      window.removeEventListener(
        "favoritesChanged",
        loadHomeData
      );

      window.removeEventListener(
        "pantryChanged",
        loadHomeData
      );
    };
  }, []);

  useEffect(() => {
    if (availableRecipes.length === 0) {
      setCookingSuggestions([]);
      return;
    }

    const suggestions: CookingSuggestion[] =
      availableRecipes.map((recipe) => {
        const ingredients = recipe.ingredients || [];

        if (ingredients.length === 0) {
          return {
            recipe,
            missing: [],
          };
        }

        const missing = ingredients
          .filter((ingredient) => {
            const matchingPantry = pantryItems.find(
              (pantry) =>
                pantryMatchesIngredient(
                  ingredient,
                  pantry
                )
            );

            return !matchingPantry;
          })
          .map((ingredient) => {
            return getIngredientName(ingredient);
          });

        return {
          recipe,
          missing,
        };
      });

    const sortedSuggestions = suggestions
      .sort((a, b) => {
        if (
          a.missing.length === 0 &&
          b.missing.length > 0
        ) {
          return -1;
        }

        if (
          a.missing.length > 0 &&
          b.missing.length === 0
        ) {
          return 1;
        }

        return (
          a.missing.length -
          b.missing.length
        );
      })
      .slice(0, 3);

    setCookingSuggestions(sortedSuggestions);
  }, [availableRecipes, pantryItems]);

  const todayMeals = planner[today] || {
    Comida: null,
    Cena: null,
  };

  const getRecipe = (recipeId: string | null) => {
    if (!recipeId) return null;

    return (
      recipes[
        recipeId as keyof typeof recipes
      ] || null
    );
  };

  const lunchRecipe = getRecipe(
    Array.isArray(todayMeals.Comida)
      ? todayMeals.Comida[0] || null
      : todayMeals.Comida
  );

  const dinnerRecipe = getRecipe(
    Array.isArray(todayMeals.Cena)
      ? todayMeals.Cena[0] || null
      : todayMeals.Cena
  );

  const lunchRecipeId = Array.isArray(
    todayMeals.Comida
  )
    ? todayMeals.Comida[0]
    : todayMeals.Comida;

  const dinnerRecipeId = Array.isArray(
    todayMeals.Cena
  )
    ? todayMeals.Cena[0]
    : todayMeals.Cena;

  const plannedDays = days.filter(
    (day) =>
      getRecipeIds(planner[day]?.Comida).length > 0 ||
      getRecipeIds(planner[day]?.Cena).length > 0
  );

  const totalPlannedMeals = days.reduce(
    (total, day) => {
      const meals = planner[day];

      if (!meals) return total;

      return (
        total +
        (getRecipeIds(meals.Comida).length > 0
          ? 1
          : 0) +
        (getRecipeIds(meals.Cena).length > 0
          ? 1
          : 0)
      );
    },
    0
  );

  return (
    <main className="min-h-screen bg-[#F7F5EF] text-[#26352D]">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* CABECERA */}
        <header className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-[#8A968E]">
              Tu espacio de cocina
            </p>

            <h1 className="mt-1 text-4xl font-bold tracking-tight">
              Hola 👋
            </h1>

            <p className="mt-2 text-sm text-[#89928C]">
              Organiza tus comidas de forma sencilla.
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDE8DF] text-xl">
            🍽️
          </div>
        </header>

        {/* HOY */}
        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-[#8A968E]">
                Hoy
              </p>

              <h2 className="mt-1 text-2xl font-semibold">
                {today}
              </h2>
            </div>

            <Link
              href="/planificador"
              className="text-sm font-medium text-[#52685A] underline"
            >
              Ver planificador
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            {/* COMIDA */}
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F5EF]">
                  ☀️
                </span>

                <div>
                  <p className="text-xs uppercase tracking-wide text-[#89928C]">
                    Comida
                  </p>
                </div>
              </div>

              {lunchRecipe ? (
                <div className="mt-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6E0D3] text-3xl">
                      {lunchRecipe.emoji}
                    </div>

                    <div>
                      <p className="font-semibold">
                        {lunchRecipe.name}
                      </p>

                      <Link
                        href={`/recetas/${lunchRecipeId}`}
                        className="mt-1 inline-block text-xs text-[#52685A] underline"
                      >
                        Ver receta
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="font-semibold">
                    Todavía no hay nada
                  </p>

                  <p className="mt-1 text-sm text-[#89928C]">
                    ¿Qué te apetece comer?
                  </p>

                  <Link
                    href="/planificador"
                    className="mt-4 inline-block rounded-xl bg-[#DDE8DF] px-4 py-2 text-xs font-semibold text-[#52685A]"
                  >
                    + Añadir comida
                  </Link>
                </div>
              )}
            </div>

            {/* CENA */}
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F5EF]">
                  🌙
                </span>

                <div>
                  <p className="text-xs uppercase tracking-wide text-[#89928C]">
                    Cena
                  </p>
                </div>
              </div>

              {dinnerRecipe ? (
                <div className="mt-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6E0D3] text-3xl">
                      {dinnerRecipe.emoji}
                    </div>

                    <div>
                      <p className="font-semibold">
                        {dinnerRecipe.name}
                      </p>

                      <Link
                        href={`/recetas/${dinnerRecipeId}`}
                        className="mt-1 inline-block text-xs text-[#52685A] underline"
                      >
                        Ver receta
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="font-semibold">
                    Todavía no hay nada
                  </p>

                  <p className="mt-1 text-sm text-[#89928C]">
                    Puedes planificarla ahora.
                  </p>

                  <Link
                    href="/planificador"
                    className="mt-4 inline-block rounded-xl bg-[#DDE8DF] px-4 py-2 text-xs font-semibold text-[#52685A]"
                  >
                    + Añadir cena
                  </Link>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* RESUMEN DE LA SEMANA */}
        <section className="mt-8 rounded-3xl bg-[#E6E0D3] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#718077]">
                Tu semana
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                {totalPlannedMeals}{" "}
                {totalPlannedMeals === 1
                  ? "comida planificada"
                  : "comidas planificadas"}
              </h2>
            </div>

            <div className="text-4xl">
              📅
            </div>
          </div>

          {plannedDays.length > 0 ? (
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => {
                const hasMeal =
                  getRecipeIds(
                    planner[day]?.Comida
                  ).length > 0 ||
                  getRecipeIds(
                    planner[day]?.Cena
                  ).length > 0;

                const lunchIds = getRecipeIds(
                  planner[day]?.Comida
                );

                const dinnerIds = getRecipeIds(
                  planner[day]?.Cena
                );

                return (
                  <div
                    key={day}
                    className={`min-w-[76px] rounded-2xl p-3 text-center ${
                      hasMeal
                        ? "bg-white"
                        : "bg-[#F1EDE4]"
                    }`}
                  >
                    <p className="text-xs text-[#89928C]">
                      {day.slice(0, 3)}
                    </p>

                    <div className="mt-2 text-lg">
                      {lunchIds.length > 0
                        ? getRecipe(
                            lunchIds[0]
                          )?.emoji
                        : "·"}
                    </div>

                    <div className="text-lg">
                      {dinnerIds.length > 0
                        ? getRecipe(
                            dinnerIds[0]
                          )?.emoji
                        : "·"}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#718077]">
              Aún no has planificado ninguna comida.
            </p>
          )}

          <Link
            href="/planificador"
            className="mt-5 inline-block rounded-2xl bg-[#52685A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#43574A]"
          >
            Organizar mi semana
          </Link>
        </section>

        {/* ¿QUÉ PUEDO COCINAR? */}
        <section className="mt-8 rounded-3xl bg-[#DDE8DF] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#718077]">
                Con lo que tienes en casa
              </p>

              <h2 className="mt-1 text-2xl font-semibold">
                ¿Qué puedo cocinar? ✨
              </h2>

              <p className="mt-2 text-sm text-[#718077]">
                Hemos buscado recetas que puedes preparar
                con lo que tienes en tu despensa.
              </p>
            </div>

            <div className="text-4xl">
              👩‍🍳
            </div>
          </div>

          {cookingSuggestions.length > 0 ? (
            <div className="mt-5 space-y-3">
              {cookingSuggestions.map(
                (suggestion) => (
                  <Link
                    key={suggestion.recipe.id}
                    href={`/recetas/${suggestion.recipe.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5EF] text-2xl">
                        {suggestion.recipe.emoji ||
                          "🍽️"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {suggestion.recipe.name}
                        </p>

                        {suggestion.missing.length ===
                        0 ? (
                          <p className="mt-0.5 text-xs font-medium text-[#6F7D5C]">
                            Tienes todo lo necesario ✓
                          </p>
                        ) : (
                          <p className="mt-0.5 truncate text-xs text-[#8B8175]">
                            Te falta{" "}
                            {suggestion.missing.length ===
                            1
                              ? suggestion.missing[0]
                              : `${suggestion.missing.length} ingredientes`}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 text-lg text-[#52685A]">
                      →
                    </span>
                  </Link>
                )
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="font-semibold">
                Aún no podemos recomendarte nada
              </p>

              <p className="mt-1 text-sm text-[#89928C]">
                Añade alimentos a tu despensa y
                buscaremos recetas para ti.
              </p>

              <Link
                href="/compra"
                className="mt-4 inline-block rounded-xl bg-[#52685A] px-4 py-2 text-xs font-semibold text-white"
              >
                Ir a mi despensa
              </Link>
            </div>
          )}

          <Link
            href="/recetas"
            className="mt-5 inline-block text-sm font-semibold text-[#52685A] underline"
          >
            Ver todas mis recetas →
          </Link>
        </section>

        {/* ACCESOS RÁPIDOS */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold">
            ¿Qué quieres hacer?
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">

            <Link
              href="/recetas"
              className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-3xl">
                🍳
              </div>

              <h3 className="mt-4 font-semibold">
                Buscar recetas
              </h3>

              <p className="mt-1 text-sm text-[#89928C]">
                Descubre ideas para tus comidas.
              </p>
            </Link>

            <Link
              href="/planificador"
              className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-3xl">
                📅
              </div>

              <h3 className="mt-4 font-semibold">
                Planificar
              </h3>

              <p className="mt-1 text-sm text-[#89928C]">
                Organiza tu semana.
              </p>
            </Link>

            <Link
              href="/compra"
              className="rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-3xl">
                🛒
              </div>

              <h3 className="mt-4 font-semibold">
                Lista de compra
              </h3>

              <p className="mt-1 text-sm text-[#89928C]">
                Consulta lo que necesitas comprar.
              </p>
            </Link>

          </div>
        </section>

      </div>
    </main>
  );
}