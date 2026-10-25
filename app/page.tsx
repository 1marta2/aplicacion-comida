
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { baseRecipes, getCategoryStyle, type Recipe } from "@/lib/recipes";

const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const MEALS = ["Comida", "Cena"] as const;

const CATEGORY_NAMES: Record<number, string> = {
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

type RecipeRow = {
  id: number;
  title: string;
  description: string | null;
  preparation_time: number | null;
  difficulty?: string | null;
  servings: number | null;
  instructions: string | null;
  category_id: number | null;
  created_at?: string | null;
};

type PlanRow = {
  date: string;
  meal_type: string;
  recipe_id: number | null;
  is_outside?: boolean | null;
};

type PantryRow = {
  id: number;
  ingredient_id: number;
  quantity: number | null;
  unit: string | null;
};

type IngredientRow = {
  id: number;
  name: string;
};

type RecipeIngredientRow = {
  recipe_id: number;
  ingredient_id: number;
  quantity?: number | null;
  unit?: string | null;
};

type WeekMeal = {
  date: string;
  day: string;
  meal: string;
  recipe: Recipe | null;
  outside: boolean;
};

type Suggestion = {
  recipe: Recipe;
  ingredients: string[];
  missing: string[];
  availableCount: number;
};

type IdeaMode = "almacen" | "ingredientes";

function normalize(value: string) {
  return value
    .toLocaleLowerCase("es-ES")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();

  monday.setDate(day === 0 ? -6 + monday.getDate() : monday.getDate() + 1 - day);
  monday.setHours(0, 0, 0, 0);

  return monday;
}

function toRecipe(row: RecipeRow): Recipe {
  const category = CATEGORY_NAMES[row.category_id ?? 12] ?? "Otros";
  const style = getCategoryStyle(category);

  return {
    id: String(row.id),
    name: row.title,
    category,
    time: row.preparation_time ? `${row.preparation_time} min` : "",
    difficulty: row.difficulty || "Fácil",
    emoji: style.emoji || "🍽️",
    ingredients: [],
    steps: row.instructions
      ? row.instructions.split("\n").map((step) => step.trim()).filter(Boolean)
      : [],
    servings: row.servings || 2,
    description: row.description || "",
    color: style.color,
  };
}

function recipeHref(recipe: Recipe) {
  return `/recetas/${encodeURIComponent(String(recipe.id))}`;
}

function safeRecipeArray(key: string): Recipe[] {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is Recipe =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as Recipe).id === "string" &&
              typeof (item as Recipe).name === "string",
          ),
      )
      .map((item) => ({
        ...item,
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
        steps: Array.isArray(item.steps) ? item.steps : [],
        category: item.category || "Otros",
        emoji: item.emoji || "🍽️",
      }));
  } catch {
    return [];
  }
}

function ingredientBaseName(value: string) {
  return normalize(
    value
      .replace(
        /^\s*\d+(?:[.,]\d+)?\s*(?:g|gr|kg|ml|cl|l|unidad(?:es)?|cucharadas?|cucharaditas?|tazas?)?\s*/i,
        "",
      )
      .replace(/^de\s+/i, "")
      .replace(/,.*$/, ""),
  );
}

function ingredientMatches(first: string, second: string) {
  const a = ingredientBaseName(first);
  const b = ingredientBaseName(second);

  if (!a || !b) return false;

  return a === b || a.includes(b) || b.includes(a);
}

function getRecipeIngredients(recipe: Recipe): string[] {
  if (!Array.isArray(recipe.ingredients)) return [];

  return [
    ...new Set(
      recipe.ingredients
        .map((ingredient) => String(ingredient).trim())
        .filter(Boolean),
    ),
  ];
}

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [latestRecipes, setLatestRecipes] = useState<Recipe[]>([]);
  const [weekMeals, setWeekMeals] = useState<WeekMeal[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [pantryNames, setPantryNames] = useState<string[]>([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [pantryCount, setPantryCount] = useState(0);
  const [error, setError] = useState("");

  const [ideaMode, setIdeaMode] = useState<IdeaMode>("almacen");
  const [ingredientInput, setIngredientInput] = useState("");

  const today = useMemo(() => new Date(), []);
  const monday = useMemo(() => getMonday(today), [today]);

  const sunday = useMemo(() => {
    const date = new Date(monday);
    date.setDate(date.getDate() + 6);
    return date;
  }, [monday]);

  const todayKey = dateKey(today);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = dateKey(tomorrowDate);

  const todayName =
    DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1];

  const tomorrowName = DAYS[(DAYS.indexOf(todayName) + 1) % 7];
  const displayedDays = [
    { date: todayKey, day: todayName, label: "Hoy" },
    { date: tomorrowKey, day: tomorrowName, label: "Mañana" },
  ];

  const dateLabel = today.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadHome() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          if (!cancelled) router.replace("/login");
          return;
        }

        const [
          recipeResult,
          planResult,
          pantryResult,
          shoppingResult,
        ] = await Promise.all([
          supabase
            .from("recipes")
            .select(
              "id,title,description,preparation_time,difficulty,servings,instructions,category_id,created_at",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("planning")
            .select("date,meal_type,recipe_id,is_outside")
            .eq("user_id", user.id)
            .gte("date", dateKey(monday))
            .lte("date", dateKey(tomorrowDate > sunday ? tomorrowDate : sunday)),

          supabase
            .from("pantry")
            .select("id,ingredient_id,quantity,unit")
            .eq("user_id", user.id),

          supabase
            .from("shopping_list")
            .select("id,checked")
            .eq("user_id", user.id),
        ]);

        if (recipeResult.error) throw recipeResult.error;
        if (planResult.error) throw planResult.error;
        if (pantryResult.error) throw pantryResult.error;
        if (shoppingResult.error) throw shoppingResult.error;

        const recipeRows = (recipeResult.data ?? []) as RecipeRow[];
        const customRecipes = recipeRows.map(toRecipe);

        // Conservamos también las recetas importadas o locales existentes.
        const localRecipes =
          typeof window !== "undefined"
            ? [
                ...safeRecipeArray("recipes"),
                ...safeRecipeArray("importedRecipes"),
              ]
            : [];

        const allRecipes: Recipe[] = [
          ...customRecipes,
          ...localRecipes,
          ...baseRecipes,
        ];

        // Evitamos repetir recetas con el mismo identificador.
        const byId = new Map<string, Recipe>();

        for (const recipe of allRecipes) {
          if (!byId.has(String(recipe.id))) {
            byId.set(String(recipe.id), recipe);
          }
        }

        // Resumen semanal de comidas y cenas.
        const planningRows = (planResult.data ?? []) as PlanRow[];
        const week: WeekMeal[] = [];

        const daysToBuild = today.getDay() === 0 ? 8 : 7;

        for (let index = 0; index < daysToBuild; index++) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + index);

          const key = dateKey(date);

          for (const meal of MEALS) {
            const row = planningRows.find(
              (item) =>
                item.date === key &&
                item.meal_type.toLowerCase() === meal.toLowerCase(),
            );

            const recipe =
              row?.recipe_id != null
                ? byId.get(String(row.recipe_id)) ?? null
                : null;

            week.push({
              date: key,
              day: DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1],
              meal,
              recipe,
              outside: Boolean(row?.is_outside),
            });
          }
        }

        // Ingredientes que hay actualmente en el almacén.
        const pantryRows = (pantryResult.data ?? []) as PantryRow[];

        const pantryIngredientIds = [
          ...new Set(
            pantryRows
              .map((row) => Number(row.ingredient_id))
              .filter(Number.isFinite),
          ),
        ];

        let pantryIngredients: IngredientRow[] = [];

        if (pantryIngredientIds.length) {
          const {
            data,
            error: ingredientsError,
          } = await supabase
            .from("ingredients")
            .select("id,name")
            .in("id", pantryIngredientIds);

          if (ingredientsError) throw ingredientsError;

          pantryIngredients = (data ?? []) as IngredientRow[];
        }

        const namesInPantry = pantryIngredients.map((item) => item.name);
        const normalizedPantry = new Set(namesInPantry.map(normalize));

        // Ingredientes de las recetas que están guardadas en Supabase.
        const recipeIds = recipeRows.map((row) => row.id);

        let recipeIngredientRows: RecipeIngredientRow[] = [];

        if (recipeIds.length) {
          const {
            data,
            error: recipeIngredientsError,
          } = await supabase
            .from("recipe_ingredients")
            .select("recipe_id,ingredient_id,quantity,unit")
            .in("recipe_id", recipeIds);

          if (recipeIngredientsError) throw recipeIngredientsError;

          recipeIngredientRows =
            (data ?? []) as RecipeIngredientRow[];
        }

        const allIngredientIds = [
          ...new Set(
            recipeIngredientRows
              .map((row) => Number(row.ingredient_id))
              .filter(Number.isFinite),
          ),
        ];

        let allIngredientRows: IngredientRow[] = [];

        if (allIngredientIds.length) {
          const {
            data,
            error: ingredientError,
          } = await supabase
            .from("ingredients")
            .select("id,name")
            .in("id", allIngredientIds);

          if (ingredientError) throw ingredientError;

          allIngredientRows = (data ?? []) as IngredientRow[];
        }

        const ingredientNameById = new Map(
          allIngredientRows.map((item) => [
            Number(item.id),
            item.name,
          ]),
        );

        const ingredientsByRecipe = new Map<number, string[]>();

        for (const row of recipeIngredientRows) {
          const name = ingredientNameById.get(
            Number(row.ingredient_id),
          );

          if (!name) continue;

          const current =
            ingredientsByRecipe.get(Number(row.recipe_id)) ?? [];

          current.push(name);
          ingredientsByRecipe.set(Number(row.recipe_id), current);
        }

        // Creamos una lista única de ingredientes por receta.
        const scored: Suggestion[] = allRecipes
          .map((recipe) => {
            const numericId = Number(recipe.id);

            const relationalIngredients = Number.isFinite(numericId)
              ? ingredientsByRecipe.get(numericId) ?? []
              : [];

            const sourceIngredients = relationalIngredients.length
              ? relationalIngredients
              : getRecipeIngredients(recipe);

            const uniqueIngredients = [
              ...new Set(
                sourceIngredients
                  .map((item) => String(item).trim())
                  .filter(Boolean),
              ),
            ];

            const missing = uniqueIngredients.filter((ingredient) => {
              const name = ingredientBaseName(ingredient);

              if (!name) return false;

              return ![...normalizedPantry].some(
                (pantryName) =>
                  pantryName === name ||
                  pantryName.includes(name) ||
                  name.includes(pantryName),
              );
            });

            return {
              recipe: {
                ...recipe,
                ingredients: uniqueIngredients,
              },
              ingredients: uniqueIngredients,
              missing,
              availableCount: uniqueIngredients.length - missing.length,
            };
          })
          .filter((item) => item.ingredients.length > 0)
          .filter(
            (item, index, array) =>
              array.findIndex(
                (other) =>
                  String(other.recipe.id) === String(item.recipe.id),
              ) === index,
          );

        scored.sort(
          (a, b) =>
            a.missing.length - b.missing.length ||
            b.availableCount - a.availableCount,
        );

        const uncheckedCount = (
          (shoppingResult.data ?? []) as {
            id: number;
            checked: boolean | null;
          }[]
        ).filter((item) => !item.checked).length;

        if (cancelled) return;

        setLatestRecipes(customRecipes.slice(0, 4));
        setWeekMeals(week);
        setAllSuggestions(scored);
        setPantryNames(namesInPantry);
        setShoppingCount(uncheckedCount);
        setPantryCount(pantryRows.length);
      } catch (loadError) {
        console.error("Error cargando el inicio de Mi cocina:", loadError);

        if (!cancelled) {
          setError(
            "No se ha podido cargar toda la información. Prueba a actualizar la página.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHome();

    return () => {
      cancelled = true;
    };
  }, [monday, sunday, router]);

  // La búsqueda se actualiza sin volver a consultar la base de datos.
  const visibleSuggestions = useMemo(() => {
    if (ideaMode === "almacen") {
      return [...allSuggestions]
        .sort(
          (a, b) =>
            a.missing.length - b.missing.length ||
            b.availableCount - a.availableCount,
        )
        .slice(0, 3);
    }

    const chosenIngredients = ingredientInput
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!chosenIngredients.length) return [];

    return allSuggestions
      .map((item) => {
        const matched = item.ingredients.filter((ingredient) =>
          chosenIngredients.some((chosen) =>
            ingredientMatches(ingredient, chosen),
          ),
        );

        return {
          ...item,
          matchedCount: matched.length,
        };
      })
      .filter((item) => item.matchedCount > 0)
      .sort(
        (a, b) =>
          b.matchedCount - a.matchedCount ||
          a.ingredients.length - b.ingredients.length,
      )
      .slice(0, 3);
  }, [allSuggestions, ideaMode, ingredientInput]);

  const plannedMealsCount = weekMeals.filter(
    (item) => item.date <= dateKey(sunday) && (item.recipe || item.outside),
  ).length;

  function displayMeal(item: WeekMeal) {
    if (item.outside) {
      return (
        <span className="font-medium text-[#52685A]">
          🍴 Comida fuera
        </span>
      );
    }

    if (item.recipe) {
      return (
        <Link
          href={recipeHref(item.recipe)}
          className="font-medium text-[#26352D] hover:text-[#52685A]"
        >
          {item.recipe.emoji || "🍽️"} {item.recipe.name}
        </Link>
      );
    }

    return <span className="text-[#9A9D94]">Sin planificar</span>;
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-4 pb-28 pt-6 text-[#26352D] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        {/* 1. BIENVENIDA */}
        <header className="relative overflow-hidden rounded-[1.5rem] bg-[#E8EEE8] px-4 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/35" />

          <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="mb-1 text-xs font-semibold capitalize tracking-wide text-[#647568]">
                {dateLabel}
              </p>

              <p className="text-sm font-medium text-[#52685A]">
                Tu cocina, a tu manera
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Hola, ¡vamos a cocinar! <span aria-hidden="true">🍲</span>
              </h1>

              <p className="mt-1.5 max-w-xl text-xs leading-5 text-[#657166] sm:text-sm">
                Organiza tus comidas, aprovecha lo que tienes en casa y
                encuentra inspiración para hoy.
              </p>
            </div>

            <Link
              href="/recetas"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#52685A] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#405447]"
            >
              Explorar recetas <span aria-hidden="true">→</span>
            </Link>
          </div>
        </header>

        {error && (
          <div
            role="status"
            className="rounded-2xl border border-[#E6D7C7] bg-white px-4 py-3 text-sm text-[#765D48]"
          >
            {error}
          </div>
        )}

        {/* 2. TU SEMANA */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#849083]">
                Organízate sin agobios
              </p>
              <h2 className="mt-1 text-xl font-semibold">Tu semana</h2>
            </div>

            <Link
              href="/planificador"
              className="shrink-0 text-sm font-semibold text-[#52685A] hover:underline"
            >
              Ver planificador →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            {loading
              ? [0, 1].map((index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl bg-white"
                  />
                ))
              : displayedDays.map((dayInfo) => {
                  const mealsForDay = MEALS.map((meal) =>
                    weekMeals.find(
                      (item) => item.date === dayInfo.date && item.meal === meal,
                    ) ?? {
                      date: dayInfo.date,
                      day: dayInfo.day,
                      meal,
                      recipe: null,
                      outside: false,
                    },
                  );

                  return (
                    <div
                      key={dayInfo.date}
                      className={`rounded-2xl border p-3 ${
                        dayInfo.date === todayKey
                          ? "border-[#CAD8CB] bg-white shadow-sm"
                          : "border-[#E8E5DC] bg-[#FBFAF6]"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#52685A]">
                          {dayInfo.label} · {dayInfo.day}
                        </span>
                        <span className="text-[11px] text-[#92988E]">
                          {new Date(`${dayInfo.date}T12:00:00`).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {mealsForDay.map((item) => (
                          <div
                            key={`${item.date}-${item.meal}`}
                            className="min-w-0 rounded-xl bg-[#F7F7F2] px-2.5 py-2"
                          >
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#899487]">
                              {item.meal}
                            </p>
                            <div className="break-words text-xs leading-4 sm:text-sm sm:leading-5">
                              {displayMeal(item)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
          </div>
          {!loading && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-[#F0EEE6] px-3 py-2 text-xs">
              <span className="text-[#697368]">
                Comidas y cenas organizadas esta semana
              </span>
              <span className="font-semibold text-[#52685A]">
                {plannedMealsCount} de 14
              </span>
            </div>
          )}
        </section>

        {/* 3. LISTA DE LA COMPRA Y ALMACÉN */}
        <section className="grid grid-cols-2 gap-2 sm:gap-3">
          <Link
            href="/compra"
            className="group flex min-w-0 items-start justify-between gap-2 rounded-2xl bg-[#52685A] p-3 text-white transition hover:bg-[#455A4C] sm:items-center sm:gap-3 sm:p-4"
          >
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-white/65 sm:text-[10px]">
                Para tu próxima compra
              </p>

              <h2 className="mt-1.5 text-sm font-semibold leading-5 sm:text-lg">
                Lista de la compra
              </h2>

              <p className="mt-1 hidden text-xs leading-4 text-white/75 sm:block">
                Ten a mano lo que te falta y compra solo lo necesario.
              </p>

              <span className="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold sm:text-xs">
                Abrir lista <span className="ml-2">→</span>
              </span>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg sm:h-11 sm:w-11 sm:text-xl">
              🛒
            </div>
          </Link>

          <Link
            href="/almacen"
            className="flex min-w-0 items-start justify-between gap-2 rounded-2xl border border-[#E8E5DC] bg-white p-3 transition hover:border-[#CAD8CB] sm:items-center sm:gap-3 sm:p-4"
          >
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#899487] sm:text-[10px]">
                Lo que ya tienes
              </p>

              <h3 className="mt-1.5 text-sm font-semibold sm:text-lg">Mi almacén</h3>

              <p className="mt-1 hidden text-xs text-[#7B8278] sm:block">
                Consulta y organiza tus ingredientes.
              </p>

              <p className="mt-2 text-[10px] font-semibold text-[#52685A] sm:text-xs">
                {loading
                  ? "Cargando…"
                  : `${pantryCount} ${
                      pantryCount === 1 ? "ingrediente" : "ingredientes"
                    } guardados`}{" "}
                <span className="ml-1">→</span>
              </p>
            </div>

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F0F2EC] text-lg sm:h-10 sm:w-10">
              🥬
            </div>
          </Link>

          {!loading && (
            <p className="col-span-2 px-1 text-[10px] text-[#8A9086] sm:text-xs">
              {shoppingCount === 0
                ? "Tu lista está al día: no tienes productos pendientes."
                : `Tienes ${shoppingCount} ${
                    shoppingCount === 1
                      ? "producto pendiente"
                      : "productos pendientes"
                  } en tu lista.`}
            </p>
          )}
        </section>

        {/* 4. IDEAS PARA COCINAR */}
        <section>
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#849083]">
              Inspiración a tu manera
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Ideas para cocinar
            </h2>

            <p className="mt-1 text-xs text-[#7B8278]">
              Recetas que aprovechan lo que tienes o los ingredientes que te
              apetece utilizar.
            </p>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIdeaMode("almacen")}
              aria-pressed={ideaMode === "almacen"}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                ideaMode === "almacen"
                  ? "bg-[#52685A] text-white"
                  : "border border-[#E2E3DA] bg-white text-[#52685A] hover:bg-[#F0F2EC]"
              }`}
            >
              🥬 Con mi almacén
            </button>

            <button
              type="button"
              onClick={() => setIdeaMode("ingredientes")}
              aria-pressed={ideaMode === "ingredientes"}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                ideaMode === "ingredientes"
                  ? "bg-[#52685A] text-white"
                  : "border border-[#E2E3DA] bg-white text-[#52685A] hover:bg-[#F0F2EC]"
              }`}
            >
              ✍️ Elegir ingredientes
            </button>
          </div>

          {ideaMode === "almacen" ? (
            <div className="mb-3 rounded-xl border border-[#E8E5DC] bg-white px-3 py-2.5 text-xs text-[#687367]">
              {loading
                ? "Buscando recetas…"
                : pantryNames.length
                  ? `Buscaremos recetas que aprovechen tus ${pantryNames.length} ingredientes registrados y mostraremos primero las que puedas preparar con todo lo necesario.`
                  : "Tu almacén todavía está vacío. Puedes añadir ingredientes o buscar recetas escribiendo lo que tienes en mente."}
            </div>
          ) : (
            <div className="mb-3 rounded-xl border border-[#E8E5DC] bg-white p-3">
              <label
                htmlFor="home-ingredients"
                className="mb-2 block text-sm font-semibold text-[#52685A]"
              >
                ¿Qué ingredientes quieres utilizar?
              </label>

              <textarea
                id="home-ingredients"
                value={ingredientInput}
                onChange={(event) => setIngredientInput(event.target.value)}
                placeholder="Por ejemplo: pollo, arroz, champiñones"
                rows={2}
                className="w-full resize-y rounded-xl border border-[#E2E3DA] bg-[#FBFAF6] px-3 py-2 text-sm text-[#26352D] outline-none transition placeholder:text-[#9A9D94] focus:border-[#829783] focus:ring-2 focus:ring-[#DDE8DF]"
              />

              <p className="mt-2 text-xs text-[#8A9086]">
                Separa los ingredientes con comas. Te mostraremos recetas que
                incluyan alguno de ellos.
              </p>
            </div>
          )}

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-3xl bg-white"
                />
              ))}
            </div>
          ) : visibleSuggestions.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSuggestions.map((item) => {
                const { recipe, missing, availableCount } = item;

                const matchedCount =
                  "matchedCount" in item
                    ? Number(item.matchedCount)
                    : 0;

                return (
                  <Link
                    key={recipe.id}
                    href={recipeHref(recipe)}
                    className="rounded-2xl border border-[#E8E5DC] bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#CAD8CB] hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F2EC] text-xl">
                        {recipe.emoji || "🍽️"}
                      </span>

                      {ideaMode === "almacen" ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            missing.length === 0
                              ? "bg-[#E3EEE3] text-[#49634E]"
                              : "bg-[#F4EDE2] text-[#8A6C46]"
                          }`}
                        >
                          {missing.length === 0
                            ? "¡Tienes todo!"
                            : `Faltan ${missing.length}`}
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#E3EEE3] px-3 py-1 text-xs font-semibold text-[#49634E]">
                          {matchedCount}{" "}
                          {matchedCount === 1 ? "coincidencia" : "coincidencias"}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-base font-semibold">
                      {recipe.name}
                    </h3>

                    <p className="mt-1 text-sm text-[#81877D]">
                      {recipe.category}
                      {recipe.time ? ` · ${recipe.time}` : ""}
                    </p>

                    <p className="mt-2 text-xs leading-4 text-[#687367]">
                      {ideaMode === "ingredientes"
                        ? `Esta receta incluye ${matchedCount} ${
                            matchedCount === 1
                              ? "ingrediente que has indicado"
                              : "ingredientes que has indicado"
                          }.`
                        : missing.length === 0
                          ? "Puedes prepararla con los ingredientes que tienes."
                          : `Ya tienes ${availableCount} ${
                              availableCount === 1
                                ? "ingrediente"
                                : "ingredientes"
                            }. Te falta${missing.length === 1 ? "" : "n"} ${missing
                              .slice(0, 2)
                              .join(" y ")}${missing.length > 2 ? "…" : ""}.`}
                    </p>

                    <p className="mt-3 text-xs font-semibold text-[#52685A]">
                      Ver receta →
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#D9DED4] bg-white/70 px-5 py-8 text-center">
              <span className="text-3xl">🥣</span>

              <h3 className="mt-3 font-semibold">
                {ideaMode === "ingredientes" && !ingredientInput.trim()
                  ? "¿Qué te apetece cocinar?"
                  : "Vamos a encontrar algo rico"}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-[#7B8278]">
                {ideaMode === "ingredientes" && !ingredientInput.trim()
                  ? "Escribe ingredientes separados por comas para buscar recetas que los utilicen."
                  : ideaMode === "ingredientes"
                    ? "No hemos encontrado coincidencias entre esos ingredientes y las recetas disponibles. Prueba con otros ingredientes."
                    : "Cuando haya recetas con ingredientes identificados, podremos priorizar las que puedas preparar con lo que tienes."}
              </p>

              <Link
                href="/recetas"
                className="mt-4 inline-flex rounded-full bg-[#52685A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#405447]"
              >
                Explorar recetas
              </Link>
            </div>
          )}
        </section>

        {/* 5. ÚLTIMAS RECETAS AÑADIDAS */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#849083]">
                Tu colección personal
              </p>

              <h2 className="mt-1 text-2xl font-semibold">
                Últimas recetas añadidas
              </h2>
            </div>

            <Link
              href="/recetas"
              className="shrink-0 text-sm font-semibold text-[#52685A] hover:underline"
            >
              Ver recetario →
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-3xl bg-white"
                />
              ))}
            </div>
          ) : latestRecipes.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {latestRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={recipeHref(recipe)}
                  className="group rounded-2xl border border-[#E8E5DC] bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#CAD8CB] hover:shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F2EC] text-xl">
                    {recipe.emoji || "🍽️"}
                  </div>

                  <h3 className="mt-2.5 text-sm font-semibold group-hover:text-[#52685A]">
                    {recipe.name}
                  </h3>

                  <p className="mt-1 text-sm text-[#81877D]">
                    {recipe.category}
                    {recipe.time ? ` · ${recipe.time}` : ""}
                  </p>

                  <p className="mt-2.5 text-xs font-semibold text-[#52685A]">
                    Ver receta →
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#D9DED4] bg-white/70 px-5 py-7 text-center">
              <p className="text-sm text-[#7B8278]">
                Todavía no has añadido recetas propias.
              </p>

              <Link
                href="/recetas"
                className="mt-3 inline-flex text-sm font-semibold text-[#52685A] hover:underline"
              >
                Añadir tu primera receta →
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
