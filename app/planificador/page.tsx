"use client";

import { useEffect, useState } from "react";

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
  emoji: string;
};

const recipes: Recipe[] = [
  {
    id: "pasta-cremosa",
    name: "Pasta cremosa",
    emoji: "🍝",
  },
  {
    id: "ensalada-mediterranea",
    name: "Ensalada mediterránea",
    emoji: "🥗",
  },
  {
    id: "arroz-con-verduras",
    name: "Arroz con verduras",
    emoji: "🍚",
  },
  {
    id: "lentejas-caseras",
    name: "Lentejas caseras",
    emoji: "🥣",
  },
  {
    id: "pollo-al-horno",
    name: "Pollo al horno",
    emoji: "🍗",
  },
  {
    id: "salmon-con-patata",
    name: "Salmón con patata",
    emoji: "🐟",
  },
  {
    id: "tortilla-de-patata",
    name: "Tortilla de patata",
    emoji: "🥔",
  },
  {
    id: "pollo-al-curry",
    name: "Pollo al curry",
    emoji: "🍛",
  },
  {
    id: "garbanzos-con-verduras",
    name: "Garbanzos con verduras",
    emoji: "🫘",
  },
  {
    id: "merluza-al-horno",
    name: "Merluza al horno",
    emoji: "🐟",
  },
];

type Planner = {
  [day: string]: {
    [meal: string]: string[];
  };
};

const createEmptyPlanner = (): Planner => {
  const planner: Planner = {};

  days.forEach((day) => {
    planner[day] = {
      Comida: [],
      Cena: [],
    };
  });

  return planner;
};

function normalizePlanner(savedPlanner: unknown): Planner {
  const normalized = createEmptyPlanner();

  if (
    !savedPlanner ||
    typeof savedPlanner !== "object" ||
    Array.isArray(savedPlanner)
  ) {
    return normalized;
  }

  Object.entries(savedPlanner as Record<string, unknown>).forEach(
    ([day, mealsForDay]) => {
      if (
        mealsForDay === null ||
        typeof mealsForDay !== "object" ||
        Array.isArray(mealsForDay)
      ) {
        return;
      }

      if (!normalized[day]) {
        normalized[day] = {
          Comida: [],
          Cena: [],
        };
      }

      meals.forEach((meal) => {
        const value = (
          mealsForDay as Record<string, unknown>
        )[meal];

        // Formato actual:
        // ["receta-1", "receta-2"]
        if (Array.isArray(value)) {
          normalized[day][meal] = value.filter(
            (recipeId): recipeId is string =>
              typeof recipeId === "string"
          );

          return;
        }

        // Formato antiguo:
        // "receta-1"
        if (typeof value === "string") {
          normalized[day][meal] = [value];
          return;
        }

        normalized[day][meal] = [];
      });
    }
  );

  return normalized;
}

function normalizeRecipes(
  savedRecipes: unknown
): Recipe[] {
  if (!Array.isArray(savedRecipes)) {
    return [];
  }

  return savedRecipes
    .filter(
      (recipe): recipe is Record<string, unknown> =>
        recipe !== null &&
        typeof recipe === "object" &&
        typeof recipe.id === "string" &&
        typeof recipe.name === "string"
    )
    .map((recipe) => ({
      id: recipe.id as string,
      name: recipe.name as string,
      emoji:
        typeof recipe.emoji === "string"
          ? recipe.emoji
          : "🍽️",
    }));
}

export default function PlannerPage() {
  const [planner, setPlanner] = useState<Planner>(
    createEmptyPlanner()
  );

  const [availableRecipes, setAvailableRecipes] =
    useState<Recipe[]>(recipes);

  const [selectedDay, setSelectedDay] =
    useState("Lunes");

  const [selectedDayForRecipe, setSelectedDayForRecipe] =
    useState<string | null>(null);

  const [selectedMeal, setSelectedMeal] =
    useState<string | null>(null);

  const [view, setView] = useState<"week" | "day">(
    "week"
  );

  // =====================================================
  // CARGA INICIAL
  // =====================================================

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      // -------------------------
      // PLANIFICADOR
      // -------------------------

      const savedPlanner =
        localStorage.getItem("planner");

      if (savedPlanner) {
        try {
          const parsedPlanner = JSON.parse(
            savedPlanner
          );

          setPlanner(
            normalizePlanner(parsedPlanner)
          );
        } catch {
          setPlanner(createEmptyPlanner());
        }
      } else {
        setPlanner(createEmptyPlanner());
      }

      // -------------------------
      // VISTA
      // -------------------------

      const savedView =
        localStorage.getItem("plannerView");

      if (
        savedView === "week" ||
        savedView === "day"
      ) {
        setView(savedView);
      }

      // -------------------------
      // RECETAS
      // -------------------------
      //
      // Importante:
      // Cargamos tanto "recipes" como
      // "importedRecipes".
      //
      // Así las recetas creadas/editadas desde
      // la aplicación también aparecen aquí.

      const savedRecipes =
        localStorage.getItem("recipes");

      const savedImportedRecipes =
        localStorage.getItem("importedRecipes");

      const storedRecipes = savedRecipes
        ? normalizeRecipes(
            JSON.parse(savedRecipes)
          )
        : [];

      const importedRecipes =
        savedImportedRecipes
          ? normalizeRecipes(
              JSON.parse(savedImportedRecipes)
            )
          : [];

      const allRecipes: Recipe[] = [
        ...recipes,
        ...storedRecipes,
        ...importedRecipes,
      ];

      // Eliminamos duplicados por id.
      // Las recetas guardadas en localStorage
      // tienen prioridad sobre las de ejemplo.
      const recipesById = new Map<
        string,
        Recipe
      >();

      recipes.forEach((recipe) => {
        recipesById.set(recipe.id, recipe);
      });

      storedRecipes.forEach((recipe) => {
        recipesById.set(recipe.id, recipe);
      });

      importedRecipes.forEach((recipe) => {
        recipesById.set(recipe.id, recipe);
      });

      // allRecipes se mantiene arriba para dejar claro
      // que se combinan las tres fuentes.
      void allRecipes;

      setAvailableRecipes(
        Array.from(recipesById.values())
      );
    } catch (error) {
      console.error(
        "Error cargando planificador:",
        error
      );

      setPlanner(createEmptyPlanner());
      setAvailableRecipes(recipes);
    }
  }, []);

  // =====================================================
  // SINCRONIZACIÓN
  // =====================================================
  //
  // La ficha de receta y esta página utilizan:
  //
  // localStorage -> "planner"
  // evento       -> "plannerChanged"
  //
  // "storage" sirve para cambios realizados desde
  // otra pestaña.
  //
  // "plannerChanged" sirve para cambios realizados
  // dentro de la misma pestaña.
  // =====================================================

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function syncPlanner() {
      const savedPlanner =
        localStorage.getItem("planner");

      if (!savedPlanner) {
        setPlanner(createEmptyPlanner());
        return;
      }

      try {
        const parsedPlanner = JSON.parse(
          savedPlanner
        );

        setPlanner(
          normalizePlanner(parsedPlanner)
        );
      } catch {
        setPlanner(createEmptyPlanner());
      }
    }

    function syncRecipes() {
      try {
        const savedRecipes =
          localStorage.getItem("recipes");

        const savedImportedRecipes =
          localStorage.getItem("importedRecipes");

        const storedRecipes = savedRecipes
          ? normalizeRecipes(
              JSON.parse(savedRecipes)
            )
          : [];

        const importedRecipes =
          savedImportedRecipes
            ? normalizeRecipes(
                JSON.parse(savedImportedRecipes)
              )
            : [];

        const recipesById = new Map<
          string,
          Recipe
        >();

        // Primero las recetas base.
        recipes.forEach((recipe) => {
          recipesById.set(recipe.id, recipe);
        });

        // Después las guardadas, que tienen prioridad.
        storedRecipes.forEach((recipe) => {
          recipesById.set(recipe.id, recipe);
        });

        // Finalmente las importadas.
        importedRecipes.forEach((recipe) => {
          recipesById.set(recipe.id, recipe);
        });

        setAvailableRecipes(
          Array.from(recipesById.values())
        );
      } catch {
        setAvailableRecipes(recipes);
      }
    }

    function syncEverything() {
      syncPlanner();
      syncRecipes();
    }

    window.addEventListener(
      "plannerChanged",
      syncPlanner
    );

    window.addEventListener(
      "recipesChanged",
      syncRecipes
    );

    window.addEventListener(
      "storage",
      syncEverything
    );

    return () => {
      window.removeEventListener(
        "plannerChanged",
        syncPlanner
      );

      window.removeEventListener(
        "recipesChanged",
        syncRecipes
      );

      window.removeEventListener(
        "storage",
        syncEverything
      );
    };
  }, []);

  // =====================================================
  // CAMBIAR VISTA
  // =====================================================

  const changeView = (
    newView: "week" | "day"
  ) => {
    setView(newView);

    localStorage.setItem(
      "plannerView",
      newView
    );
  };

  // =====================================================
  // SELECTOR DE RECETAS
  // =====================================================

  const openRecipeSelector = (
    day: string,
    meal: string
  ) => {
    setSelectedDayForRecipe(day);
    setSelectedMeal(meal);
  };

  const closeRecipeSelector = () => {
    setSelectedDayForRecipe(null);
    setSelectedMeal(null);
  };

  // =====================================================
  // AÑADIR RECETA
  // =====================================================

  const addRecipe = (recipeId: string) => {
    if (
      !selectedDayForRecipe ||
      !selectedMeal
    ) {
      return;
    }

    const currentRecipes =
      planner[selectedDayForRecipe]?.[
        selectedMeal
      ] || [];

    // No añadir duplicados dentro del mismo
    // día y comida/cena.
    if (currentRecipes.includes(recipeId)) {
      closeRecipeSelector();
      return;
    }

    const updatedPlanner: Planner = {
      ...planner,
      [selectedDayForRecipe]: {
        ...planner[selectedDayForRecipe],
        [selectedMeal]: [
          ...currentRecipes,
          recipeId,
        ],
      },
    };

    setPlanner(updatedPlanner);

    localStorage.setItem(
      "planner",
      JSON.stringify(updatedPlanner)
    );

    // Sincroniza la ficha de receta.
    window.dispatchEvent(
      new Event("plannerChanged")
    );

    closeRecipeSelector();
  };

  // =====================================================
  // QUITAR RECETA
  // =====================================================

  const removeRecipe = (
    day: string,
    meal: string,
    recipeId: string
  ) => {
    const currentRecipes =
      planner[day]?.[meal] || [];

    const updatedPlanner: Planner = {
      ...planner,
      [day]: {
        ...planner[day],
        [meal]: currentRecipes.filter(
          (id) => id !== recipeId
        ),
      },
    };

    setPlanner(updatedPlanner);

    localStorage.setItem(
      "planner",
      JSON.stringify(updatedPlanner)
    );

    // Sincroniza la ficha de receta.
    window.dispatchEvent(
      new Event("plannerChanged")
    );
  };

  // =====================================================
  // OBTENER RECETA
  // =====================================================

  const getRecipe = (
    recipeId: string
  ) => {
    return availableRecipes.find(
      (recipe) => recipe.id === recipeId
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="min-h-screen bg-[#F7F5EF] text-[#26352D]">
      <div className="mx-auto max-w-7xl px-5 py-8">

        {/* CABECERA */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#8A968E]">
              Organiza tu semana
            </p>

            <h1 className="mt-1 text-4xl font-bold tracking-tight">
              Planificador
            </h1>

            <p className="mt-2 text-sm text-[#89928C]">
              Planifica tus comidas y cenas de toda la
              semana.
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDE8DF] text-xl">
            📅
          </div>
        </header>

        {/* SELECTOR DE VISTA */}
        <section className="mt-8 flex justify-center">
          <div className="flex rounded-2xl bg-white p-1.5 shadow-sm">

            <button
              onClick={() => changeView("day")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                view === "day"
                  ? "bg-[#52685A] text-white"
                  : "text-[#718077] hover:bg-[#F7F5EF]"
              }`}
            >
              <span>☰</span>
              Día
            </button>

            <button
              onClick={() => changeView("week")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                view === "week"
                  ? "bg-[#52685A] text-white"
                  : "text-[#718077] hover:bg-[#F7F5EF]"
              }`}
            >
              <span>▦</span>
              Semana
            </button>

          </div>
        </section>

        {/* =====================================================
            VISTA SEMANAL
        ===================================================== */}

        {view === "week" && (
          <section className="mt-8">
            <div className="overflow-x-auto pb-3">
              <div className="grid min-w-[1050px] grid-cols-7 gap-3">

                {days.map((day) => (
                  <div
                    key={day}
                    className="rounded-3xl bg-white p-4 shadow-sm"
                  >
                    <div className="mb-4 text-center">
                      <h2 className="font-semibold">
                        {day}
                      </h2>
                    </div>

                    <div className="space-y-3">

                      {meals.map((meal) => {
                        const recipeIds =
                          planner[day]?.[meal] || [];

                        const plannedRecipes =
                          recipeIds
                            .map((recipeId) =>
                              getRecipe(recipeId)
                            )
                            .filter(
                              (
                                recipe
                              ): recipe is Recipe =>
                                recipe !== undefined
                            );

                        return (
                          <div
                            key={meal}
                            className="rounded-2xl bg-[#F7F5EF] p-3"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#89928C]">
                              {meal}
                            </p>

                            {plannedRecipes.length >
                            0 ? (
                              <div className="mt-3 space-y-3">

                                {plannedRecipes.map(
                                  (
                                    recipe,
                                    index
                                  ) => (
                                    <div
                                      key={`planned-recipe-${recipe.id}-${index}`}
                                      className="flex items-start gap-2"
                                    >
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6E0D3] text-lg">
                                        {
                                          recipe.emoji
                                        }
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold leading-4">
                                          {
                                            recipe.name
                                          }
                                        </p>

                                        <button
                                          onClick={() =>
                                            removeRecipe(
                                              day,
                                              meal,
                                              recipe.id
                                            )
                                          }
                                          className="mt-1 text-[11px] text-[#9AA39D] underline"
                                        >
                                          Quitar
                                        </button>
                                      </div>
                                    </div>
                                  )
                                )}

                                <button
                                  onClick={() =>
                                    openRecipeSelector(
                                      day,
                                      meal
                                    )
                                  }
                                  className="text-xs font-medium text-[#52685A] underline"
                                >
                                  + Añadir otra
                                </button>

                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  openRecipeSelector(
                                    day,
                                    meal
                                  )
                                }
                                className="mt-3 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD2CC] py-4 text-[#89928C] transition hover:bg-white"
                              >
                                <span className="text-xl">
                                  +
                                </span>

                                <span className="mt-1 text-[11px]">
                                  Añadir
                                </span>
                              </button>
                            )}
                          </div>
                        );
                      })}

                    </div>
                  </div>
                ))}

              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            VISTA POR DÍA
        ===================================================== */}

        {view === "day" && (
          <section className="mt-8">

            <div className="flex gap-2 overflow-x-auto pb-2">
              {days.map((day) => (
                <button
                  key={day}
                  onClick={() =>
                    setSelectedDay(day)
                  }
                  className={`shrink-0 rounded-full px-5 py-3 text-sm font-medium transition ${
                    selectedDay === day
                      ? "bg-[#52685A] text-white"
                      : "bg-white text-[#718077] hover:bg-[#EEF0EA]"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="mt-8">

              <h2 className="text-2xl font-semibold">
                {selectedDay}
              </h2>

              <p className="mt-1 text-sm text-[#89928C]">
                Organiza tus comidas para este día.
              </p>

              <div className="mt-6 space-y-4">

                {meals.map((meal) => {
                  const recipeIds =
                    planner[selectedDay]?.[meal] || [];

                  const plannedRecipes =
                    recipeIds
                      .map((recipeId) =>
                        getRecipe(recipeId)
                      )
                      .filter(
                        (
                          recipe
                        ): recipe is Recipe =>
                          recipe !== undefined
                      );

                  return (
                    <div
                      key={meal}
                      className="rounded-3xl bg-white p-5 shadow-sm"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0 flex-1">

                          <p className="text-xs font-medium uppercase tracking-wide text-[#89928C]">
                            {meal}
                          </p>

                          {plannedRecipes.length >
                          0 ? (
                            <div className="mt-4 space-y-4">

                              {plannedRecipes.map(
                                (
                                  recipe,
                                  index
                                ) => (
                                  <div
                                    key={`planned-recipe-${recipe.id}-${index}`}
                                    className="flex items-center gap-3"
                                  >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E6E0D3] text-2xl">
                                      {
                                        recipe.emoji
                                      }
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-semibold">
                                        {
                                          recipe.name
                                        }
                                      </p>

                                      <button
                                        onClick={() =>
                                          removeRecipe(
                                            selectedDay,
                                            meal,
                                            recipe.id
                                          )
                                        }
                                        className="mt-1 text-xs text-[#89928C] underline"
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}

                            </div>
                          ) : (
                            <p className="mt-2 text-base font-semibold">
                              Todavía no has añadido ninguna
                              receta
                            </p>
                          )}

                        </div>

                        <button
                          onClick={() =>
                            openRecipeSelector(
                              selectedDay,
                              meal
                            )
                          }
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DDE8DF] text-xl text-[#52685A] transition hover:bg-[#CBDACF]"
                        >
                          +
                        </button>

                      </div>

                    </div>
                  );
                })}

              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            SELECTOR DE RECETA
        ===================================================== */}

        {selectedDayForRecipe &&
          selectedMeal && (
            <section className="mt-8 rounded-3xl bg-[#E6E0D3] p-6">

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-lg font-semibold">
                    Añadir receta
                  </h2>

                  <p className="mt-1 text-sm text-[#718077]">
                    {selectedDayForRecipe} ·{" "}
                    {selectedMeal}
                  </p>
                </div>

                <button
                  onClick={closeRecipeSelector}
                  className="text-xl text-[#718077]"
                >
                  ×
                </button>

              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">

                {availableRecipes.map(
                  (recipe) => {
                    const alreadyPlanned =
                      planner[
                        selectedDayForRecipe
                      ]?.[
                        selectedMeal
                      ]?.includes(recipe.id);

                    const isBaseRecipe =
                      recipes.some(
                        (baseRecipe) =>
                          baseRecipe.id ===
                          recipe.id
                      );

                    return (
                      <button
                        key={recipe.id}
                        onClick={() =>
                          addRecipe(recipe.id)
                        }
                        disabled={alreadyPlanned}
                        className={`flex items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition ${
                          alreadyPlanned
                            ? "cursor-default opacity-50"
                            : "hover:scale-[1.01]"
                        }`}
                      >

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F7F5EF] text-2xl">
                          {recipe.emoji}
                        </div>

                        <div className="min-w-0">
                          <span className="font-semibold">
                            {recipe.name}
                          </span>

                          {!isBaseRecipe && (
                            <p className="mt-1 text-xs text-[#89928C]">
                              📥 Importada
                            </p>
                          )}

                          {alreadyPlanned && (
                            <p className="mt-1 text-xs font-medium text-[#52685A]">
                              ✓ Ya planificada
                            </p>
                          )}
                        </div>

                      </button>
                    );
                  }
                )}

              </div>
            </section>
          )}

        {/* =====================================================
            CONSEJO
        ===================================================== */}

        <section className="mt-10 rounded-3xl bg-[#E6E0D3] p-6">

          <div className="flex items-start gap-4">

            <div className="text-3xl">
              💡
            </div>

            <div>

              <h3 className="font-semibold">
                Consejo
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#66736B]">
                Planifica tus comidas con antelación para
                organizar mejor la compra y aprovechar todos
                los ingredientes.
              </p>

            </div>

          </div>

        </section>

      </div>
    </main>
  );
}