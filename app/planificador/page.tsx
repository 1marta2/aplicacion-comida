"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCategoryStyle, type Recipe } from "@/lib/recipes";

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

type PlannerEntry = {
  recipeId: number | null;
  isOutside: boolean;
};

type Planner = {
  [day: string]: {
    [meal: string]: PlannerEntry | null;
  };
};

type SupabaseRecipe = {
  id: number;
  title: string;
  description: string | null;
  preparation_time: number | null;
  servings: number | null;
  instructions: string | null;
  category_id: number | null;
  difficulty: string | null;
};

type PlanningRow = {
  id: number;
  date: string;
  meal_type: string;
  recipe_id: number | null;
  is_outside: boolean;
};

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

function createEmptyPlanner(): Planner {
  const result: Planner = {};

  days.forEach((day) => {
    result[day] = {};

    meals.forEach((meal) => {
      result[day][meal] = null;
    });
  });

  return result;
}

function formatDateForSupabase(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getMonday(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getWeekDates(monday: Date) {
  return days.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return date;
  });
}

function getTodayDayName() {
  const day = new Date().getDay();

  return day === 0 ? "Domingo" : days[day - 1];
}

function plannerRowsToPlanner(rows: PlanningRow[]): Planner {
  const result = createEmptyPlanner();

  rows.forEach((row) => {
    const date = parseDate(row.date);
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const dayName = days[dayIndex];

    result[dayName][row.meal_type] = {
      recipeId: row.recipe_id,
      isOutside: row.is_outside,
    };
  });

  return result;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function getMonthDates(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const monday = getMonday(firstDay);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);

    return current;
  });
}

function isSameDate(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isSameMonth(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

function getMonthRange(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: formatDateForSupabase(firstDay),
    end: formatDateForSupabase(lastDay),
  };
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function isPlannedEntry(entry: PlannerEntry | null | undefined) {
  return (
    entry !== null &&
    entry !== undefined &&
    (entry.isOutside || entry.recipeId !== null)
  );
}

export default function PlanificadorPage() {
  const [planner, setPlanner] = useState<Planner>(createEmptyPlanner());
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [selectedDay, setSelectedDay] = useState(getTodayDayName());
  const [selectedDateForRecipe, setSelectedDateForRecipe] = useState("");
  const [selectedMonthDate, setSelectedMonthDate] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [view, setView] = useState<"week" | "day" | "month">("week");
  const [loading, setLoading] = useState(true);
  const [changingPeriod, setChangingPeriod] = useState(false);
  const [error, setError] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [monthPlanning, setMonthPlanning] = useState<PlanningRow[]>([]);

  const today = useMemo(() => new Date(), []);

  const weekDates = useMemo(() => {
    const currentMonday = getMonday(today);
    currentMonday.setDate(currentMonday.getDate() + weekOffset * 7);

    return getWeekDates(currentMonday);
  }, [today, weekOffset]);

  const monday = weekDates[0];
  const sunday = weekDates[6];

  const currentMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
    [today, monthOffset]
  );

  const monthDates = useMemo(
    () => getMonthDates(currentMonth),
    [currentMonth]
  );

  const isCurrentWeek = weekOffset === 0;
  const isCurrentMonth = monthOffset === 0;
  const todayDayName = getTodayDayName();

  const weekTitle =
    weekOffset === 0
      ? "Esta semana"
      : weekOffset === -1
        ? "Semana anterior"
        : weekOffset === 1
          ? "Próxima semana"
          : `Semana del ${formatDisplayDate(monday)}`;

  const weekDateRange = `${formatDisplayDate(monday)} – ${formatDisplayDate(sunday)}`;
  const monthTitle = formatMonthTitle(currentMonth);

  const filteredRecipes = useMemo(() => {
    const search = normalizeText(recipeSearch.trim());

    if (!search) return availableRecipes;

    return availableRecipes.filter(
      (recipe) =>
        normalizeText(recipe.name).includes(search) ||
        normalizeText(recipe.category).includes(search)
    );
  }, [availableRecipes, recipeSearch]);

  const planningSummary = useMemo(() => {
    if (view === "month") {
      const plannedCount = monthPlanning.filter(
        (row) => row.is_outside || row.recipe_id !== null
      ).length;

      const totalSlots =
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0
        ).getDate() * meals.length;

      return {
        plannedCount,
        totalSlots,
        remaining: Math.max(totalSlots - plannedCount, 0),
      };
    }

    const plannedCount = days.reduce(
      (total, day) =>
        total +
        meals.reduce(
          (mealTotal, meal) =>
            mealTotal + (isPlannedEntry(planner[day]?.[meal]) ? 1 : 0),
          0
        ),
      0
    );

    const totalSlots = days.length * meals.length;

    return {
      plannedCount,
      totalSlots,
      remaining: Math.max(totalSlots - plannedCount, 0),
    };
  }, [view, monthPlanning, planner, currentMonth]);

  useEffect(() => {
    const savedView = localStorage.getItem("plannerView");

    if (
      savedView === "week" ||
      savedView === "day" ||
      savedView === "month"
    ) {
      setView(savedView);
    }
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setError("");

      try {
        await loadRecipes();
        await loadPlannerForWeek(monday, sunday);
        await loadPlannerForMonth(currentMonth);
      } catch (error) {
        console.error(error);
        setError("No se ha podido cargar el planificador.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;

    async function changeWeek() {
      setChangingPeriod(true);
      setError("");

      try {
        await loadPlannerForWeek(monday, sunday);
        setSelectedDay(isCurrentWeek ? todayDayName : "Lunes");
      } catch (error) {
        console.error(error);
        setError("No se ha podido cargar esta semana.");
      } finally {
        setChangingPeriod(false);
      }
    }

    changeWeek();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    if (loading) return;

    async function changeMonth() {
      setChangingPeriod(true);
      setError("");

      try {
        await loadPlannerForMonth(currentMonth);
      } catch (error) {
        console.error(error);
        setError("No se ha podido cargar este mes.");
      } finally {
        setChangingPeriod(false);
      }
    }

    changeMonth();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthOffset]);

  useEffect(() => {
    if (!selectedDateForRecipe && !selectedMonthDate) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (selectedDateForRecipe && selectedMeal) {
        closeRecipeSelector();
        return;
      }

      if (selectedMonthDate) closeMonthMealSelector();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDateForRecipe, selectedMeal, selectedMonthDate]);

  async function loadRecipes() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      setAvailableRecipes([]);
      return;
    }

    const { data, error } = await supabase
      .from("recipes")
      .select(
        "id, title, description, preparation_time, servings, instructions, category_id, difficulty"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const recipes: Recipe[] = ((data ?? []) as SupabaseRecipe[]).map(
      (recipe) => ({
        id: String(recipe.id),
        name: recipe.title,
        description: recipe.description ?? "",
        time: recipe.preparation_time
          ? `${recipe.preparation_time} min`
          : "Sin tiempo",
        difficulty: recipe.difficulty ?? "Fácil",
        emoji: "🍽️",
        category: categoryMap[recipe.category_id ?? 12] ?? "Otros",
        ingredients: [],
        steps: recipe.instructions
          ? recipe.instructions
              .split("\n")
              .map((step) => step.trim())
              .filter(Boolean)
          : [],
        servings: recipe.servings ?? undefined,
      })
    );

    setAvailableRecipes(recipes);
  }

  async function loadPlannerForWeek(weekMonday: Date, weekSunday: Date) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      setPlanner(createEmptyPlanner());
      return;
    }

    const weekStart = formatDateForSupabase(weekMonday);
    const weekEnd = formatDateForSupabase(weekSunday);

    const { data, error } = await supabase
      .from("planning")
      .select("id, date, meal_type, recipe_id, is_outside")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .order("date", { ascending: true });

    if (error) throw error;

    setPlanner(plannerRowsToPlanner((data ?? []) as PlanningRow[]));
  }

  async function loadPlannerForMonth(month: Date) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      setMonthPlanning([]);
      return;
    }

    const { start, end } = getMonthRange(month);

    const { data, error } = await supabase
      .from("planning")
      .select("id, date, meal_type, recipe_id, is_outside")
      .eq("user_id", user.id)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (error) throw error;

    setMonthPlanning((data ?? []) as PlanningRow[]);
  }

  function changeView(newView: "week" | "day" | "month") {
    setView(newView);
    localStorage.setItem("plannerView", newView);
  }

  function goToPreviousWeek() {
    if (weekOffset <= -1) return;
    setWeekOffset((current) => current - 1);
  }

  function goToNextWeek() {
    if (weekOffset >= 1) return;
    setWeekOffset((current) => current + 1);
  }

  function goToCurrentWeek() {
    setWeekOffset(0);
  }

  function goToPreviousMonth() {
    setMonthOffset((current) => current - 1);
  }

  function goToNextMonth() {
    setMonthOffset((current) => current + 1);
  }

  function goToCurrentMonth() {
    setMonthOffset(0);
  }

  function openRecipeSelector(date: Date, meal: string) {
    setSelectedDateForRecipe(formatDateForSupabase(date));
    setSelectedMeal(meal);
    setRecipeSearch("");
  }

  function closeRecipeSelector() {
    setSelectedDateForRecipe("");
    setSelectedMeal("");
    setRecipeSearch("");
  }

  function openMonthMealSelector(date: Date) {
    setSelectedMonthDate(formatDateForSupabase(date));
  }

  function closeMonthMealSelector() {
    setSelectedMonthDate("");
  }

  function selectMonthMeal(meal: string) {
    if (!selectedMonthDate) return;

    const date = parseDate(selectedMonthDate);
    setSelectedMonthDate("");
    openRecipeSelector(date, meal);
  }

  async function savePlanningEntry(
    dateString: string,
    meal: string,
    recipeId: number | null,
    isOutside: boolean
  ) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay ningún usuario conectado.");

    const { data, error } = await supabase
      .from("planning")
      .upsert(
        {
          user_id: user.id,
          date: dateString,
          meal_type: meal,
          recipe_id: recipeId,
          is_outside: isOutside,
        },
        { onConflict: "user_id,date,meal_type" }
      )
      .select("id, date, meal_type, recipe_id, is_outside")
      .single();

    if (error) throw error;

    return data as PlanningRow;
  }

  async function removePlanningEntry(dateString: string, meal: string) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay ningún usuario conectado.");

    const { error } = await supabase
      .from("planning")
      .delete()
      .eq("user_id", user.id)
      .eq("date", dateString)
      .eq("meal_type", meal);

    if (error) throw error;
  }

  async function saveEntryAndUpdateState(
    dateString: string,
    meal: string,
    recipeId: number | null,
    isOutside: boolean
  ) {
    const savedRow = await savePlanningEntry(
      dateString,
      meal,
      recipeId,
      isOutside
    );

    const currentWeekStart = formatDateForSupabase(monday);
    const currentWeekEnd = formatDateForSupabase(sunday);

    const isDateInCurrentWeek =
      dateString >= currentWeekStart && dateString <= currentWeekEnd;

    if (isDateInCurrentWeek) {
      const date = parseDate(dateString);
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const dayName = days[dayIndex];

      setPlanner((current) => ({
        ...current,
        [dayName]: {
          ...current[dayName],
          [meal]: { recipeId, isOutside },
        },
      }));
    }

    setMonthPlanning((currentRows) => {
      const filtered = currentRows.filter(
        (row) => !(row.date === dateString && row.meal_type === meal)
      );

      return [...filtered, savedRow].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    });

    closeRecipeSelector();
  }

  async function addRecipe(recipe: Recipe) {
    const recipeId = Number(recipe.id);

    if (Number.isNaN(recipeId)) {
      setError("No se ha podido identificar la receta.");
      return;
    }

    if (!selectedDateForRecipe || !selectedMeal) return;

    const dateString = selectedDateForRecipe;
    const meal = selectedMeal;

    setError("");

    try {
      await saveEntryAndUpdateState(dateString, meal, recipeId, false);
    } catch (error) {
      console.error("Error guardando planificación:", error);
      setError("No se ha podido guardar la receta en el planificador.");

      try {
        await loadPlannerForWeek(monday, sunday);
        await loadPlannerForMonth(currentMonth);
      } catch (reloadError) {
        console.error(reloadError);
      }
    }
  }

  async function addOutside() {
    if (!selectedDateForRecipe || !selectedMeal) return;

    const dateString = selectedDateForRecipe;
    const meal = selectedMeal;

    setError("");

    try {
      await saveEntryAndUpdateState(dateString, meal, null, true);
    } catch (error) {
      console.error("Error guardando comida fuera:", error);
      setError("No se ha podido guardar la comida fuera de casa.");

      try {
        await loadPlannerForWeek(monday, sunday);
        await loadPlannerForMonth(currentMonth);
      } catch (reloadError) {
        console.error(reloadError);
      }
    }
  }

  async function removeRecipe(day: string, meal: string) {
    const dayIndex = days.indexOf(day);
    if (dayIndex === -1) return;

    const date = new Date(monday);
    date.setDate(monday.getDate() + dayIndex);

    const dateString = formatDateForSupabase(date);
    setError("");

    try {
      await removePlanningEntry(dateString, meal);

      setPlanner((current) => ({
        ...current,
        [day]: {
          ...current[day],
          [meal]: null,
        },
      }));

      setMonthPlanning((currentRows) =>
        currentRows.filter(
          (row) => !(row.date === dateString && row.meal_type === meal)
        )
      );
    } catch (error) {
      console.error("Error eliminando planificación:", error);
      setError("No se ha podido eliminar la planificación.");

      try {
        await loadPlannerForWeek(monday, sunday);
      } catch (reloadError) {
        console.error(reloadError);
      }
    }
  }

  async function removePlanningFromMonth(dateString: string, meal: string) {
    setError("");

    try {
      await removePlanningEntry(dateString, meal);

      setMonthPlanning((currentRows) =>
        currentRows.filter(
          (row) => !(row.date === dateString && row.meal_type === meal)
        )
      );

      const currentWeekStart = formatDateForSupabase(monday);
      const currentWeekEnd = formatDateForSupabase(sunday);

      if (
        dateString >= currentWeekStart &&
        dateString <= currentWeekEnd
      ) {
        const date = parseDate(dateString);
        const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const dayName = days[dayIndex];

        setPlanner((current) => ({
          ...current,
          [dayName]: {
            ...current[dayName],
            [meal]: null,
          },
        }));
      }
    } catch (error) {
      console.error("Error eliminando planificación:", error);
      setError("No se ha podido eliminar la planificación.");

      try {
        await loadPlannerForMonth(currentMonth);
      } catch (reloadError) {
        console.error(reloadError);
      }
    }
  }

  function getRecipe(recipeId: number) {
    return availableRecipes.find(
      (recipe) => Number(recipe.id) === Number(recipeId)
    );
  }

  function getMonthRowsForDate(dateString: string) {
    return monthPlanning
      .filter((row) => row.date === dateString)
      .sort((a, b) => {
        const mealOrder: Record<string, number> = {
          Comida: 0,
          Cena: 1,
        };

        return (
          (mealOrder[a.meal_type] ?? 99) -
          (mealOrder[b.meal_type] ?? 99)
        );
      });
  }

  function getMonthEntry(dateString: string, meal: string) {
    return getMonthRowsForDate(dateString).find(
      (row) => row.meal_type === meal
    );
  }

  function renderRecipe(recipeId: number, day: string, meal: string) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return null;

    const categoryStyle = getCategoryStyle(recipe.category);

    return (
      <div
        key={`${day}-${meal}-${recipeId}`}
        className="group relative rounded-2xl border border-[#E6E0D3] bg-white p-3 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${categoryStyle.color}`}
          >
            {recipe.emoji}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#26352D]">{recipe.name}</p>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7B847D]">
              <span>{recipe.time}</span>
              <span>·</span>
              <span>{recipe.category}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeRecipe(day, meal)}
            className="rounded-full px-2 py-1 text-sm text-[#9B7567] transition hover:bg-[#F7EDEA]"
            aria-label={`Eliminar ${recipe.name}`}
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  function renderOutside(day: string, meal: string) {
    return (
      <div
        key={`${day}-${meal}-outside`}
        className="group relative rounded-2xl border border-[#E3DDD0] bg-[#FFFDF8] p-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1E7D7] text-xl">
            🍴
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#26352D]">Fuera de casa</p>
            <p className="mt-1 text-xs text-[#8A918B]">
              {meal === "Comida" ? "He comido fuera" : "He cenado fuera"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => removeRecipe(day, meal)}
            className="rounded-full px-2 py-1 text-sm text-[#9B7567] transition hover:bg-[#F7EDEA]"
            aria-label={`Eliminar ${meal} fuera de casa`}
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  function renderMealCard(day: string, meal: string) {
    const entry = planner[day]?.[meal] ?? null;

    const dateIndex = days.indexOf(day);
    const date = new Date(monday);
    date.setDate(monday.getDate() + dateIndex);

    const hasEntry = isPlannedEntry(entry);
    const isLunch = meal === "Comida";

    return (
      <div
        key={`${day}-${meal}`}
        className="rounded-3xl border border-[#E6E0D3] bg-[#FBFAF6] p-4 transition-colors duration-200 hover:border-[#D1DDD3]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isLunch ? "bg-[#DDE8DF]" : "bg-[#E8E4DA]"
              }`}
            >
              <span className="text-lg" aria-hidden="true">
                {isLunch ? "☀️" : "🌙"}
              </span>
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-[#52685A]">{meal}</p>

              {!hasEntry && (
                <p className="mt-0.5 text-xs text-[#8A918B]">
                  Aún sin planificar
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => openRecipeSelector(date, meal)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DDE8DF] text-xl font-medium text-[#52685A] transition hover:bg-[#C9DACD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52685A] focus-visible:ring-offset-2"
            aria-label={
              hasEntry
                ? `Cambiar ${meal.toLowerCase()} del ${day}`
                : `Añadir ${meal.toLowerCase()} del ${day}`
            }
            title={hasEntry ? "Cambiar comida" : "Añadir comida"}
          >
            {hasEntry ? "↻" : "+"}
          </button>
        </div>

        {hasEntry ? (
          <div className="space-y-2">
            {entry?.isOutside
              ? renderOutside(day, meal)
              : entry?.recipeId !== null && entry?.recipeId !== undefined
                ? renderRecipe(entry.recipeId, day, meal)
                : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openRecipeSelector(date, meal)}
            className="flex min-h-[58px] w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-[#D8D8CB] bg-white px-3 py-3 text-left transition hover:border-[#B9CCBE] hover:bg-[#F2F7F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52685A]"
          >
            <span className="text-sm text-[#8A918B]">
              Añade una receta o marca que comes fuera.
            </span>

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDE8DF] text-lg text-[#52685A]">
              +
            </span>
          </button>
        )}
      </div>
    );
  }

  function renderMonthRecipe(row: PlanningRow) {
    if (row.is_outside) {
      return (
        <div
          key={`${row.date}-${row.meal_type}`}
          className="mt-1 flex items-center gap-1 rounded-lg bg-[#F7F1E7] px-1.5 py-1"
        >
          <span className="text-[10px]">
            {row.meal_type === "Comida" ? "☀️" : "🌙"}
          </span>

          <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-[#8A715B]">
            Fuera de casa
          </p>

          <button
            type="button"
            onClick={() => removePlanningFromMonth(row.date, row.meal_type)}
            className="shrink-0 text-[10px] text-[#9B7567]"
            aria-label={`Eliminar ${row.meal_type} fuera de casa`}
            title="Eliminar"
          >
            ✕
          </button>
        </div>
      );
    }

    if (row.recipe_id === null) return null;

    const recipe = getRecipe(row.recipe_id);
    if (!recipe) return null;

    return (
      <div
        key={`${row.date}-${row.meal_type}`}
        className={`mt-1 flex items-center gap-1 rounded-lg px-1.5 py-1 ${
          row.meal_type === "Comida" ? "bg-[#EDF3ED]" : "bg-[#F2EEE7]"
        }`}
      >
        <span className="text-[10px]">
          {row.meal_type === "Comida" ? "☀️" : "🌙"}
        </span>

        <p className="min-w-0 flex-1 truncate text-[10px] font-medium text-[#52685A]">
          {recipe.name}
        </p>

        <button
          type="button"
          onClick={() => removePlanningFromMonth(row.date, row.meal_type)}
          className="shrink-0 text-[10px] text-[#9B7567]"
          aria-label={`Eliminar ${recipe.name}`}
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    );
  }

  function renderMonthDetailMeal(dateString: string, meal: string) {
    const row = getMonthEntry(dateString, meal);
    const recipe = row?.recipe_id ? getRecipe(row.recipe_id) : undefined;
    const isLunch = meal === "Comida";

    return (
      <div
        key={meal}
        className="rounded-2xl border border-[#E6E0D3] bg-[#FBFAF6] p-4"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              isLunch ? "bg-[#DDE8DF]" : "bg-[#E8E4DA]"
            }`}
          >
            <span className="text-xl">{isLunch ? "☀️" : "🌙"}</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#26352D]">{meal}</p>

            <p className="mt-1 text-sm text-[#7A857D]">
              {row?.is_outside
                ? "Fuera de casa"
                : recipe?.name ?? "Todavía sin planificar"}
            </p>

            {recipe && (
              <p className="mt-1 text-xs text-[#8A918B]">
                {recipe.time} · {recipe.category}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => selectMonthMeal(meal)}
            className="flex-1 rounded-xl bg-[#DDE8DF] px-3 py-2.5 text-sm font-semibold text-[#52685A] transition hover:bg-[#C9DACD]"
          >
            {row ? "Cambiar" : "Añadir"}
          </button>

          {row && (
            <button
              type="button"
              onClick={() => removePlanningFromMonth(dateString, meal)}
              className="rounded-xl border border-[#E5C8BF] px-3 py-2.5 text-sm font-medium text-[#9B7567] transition hover:bg-[#F9EEEA]"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-4 pb-28 pt-8 text-[#26352D]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7A857D]">
            MI COCINA
          </p>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-[#26352D]">
                Tu planificador
              </h1>

              <p className="mt-1 text-sm text-[#7A857D]">
                Organiza tus comidas, a tu ritmo.
              </p>
            </div>

            <div className="hidden shrink-0 items-center justify-center rounded-2xl bg-[#DDE8DF] p-3 sm:flex">
              <span className="text-2xl" aria-hidden="true">
                🍃
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#E6E0D3] bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs font-medium text-[#7A857D] sm:text-sm">
                Planificadas
              </p>

              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-[#52685A]">
                  {planningSummary.plannedCount}
                </span>

                <span className="text-sm text-[#8A918B]">
                  / {planningSummary.totalSlots}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-[#8A918B] sm:text-xs">
                Comidas y cenas
              </p>
            </div>

            <div className="rounded-2xl border border-[#E6E0D3] bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs font-medium text-[#7A857D] sm:text-sm">
                Por organizar
              </p>

              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-[#52685A]">
                  {planningSummary.remaining}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-[#8A918B] sm:text-xs">
                Huecos libres
              </p>
            </div>
          </div>
        </header>

        {view === "week" || view === "day" ? (
          <section className="mb-5 rounded-3xl border border-[#E6E0D3] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goToPreviousWeek}
                disabled={weekOffset <= -1 || changingPeriod}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E0D3] bg-[#FBFAF6] text-xl text-[#52685A] transition hover:bg-[#DDE8DF] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Semana anterior"
              >
                ←
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="text-sm font-medium text-[#7A857D]">
                  {weekTitle}
                </p>

                <p className="mt-1 text-lg font-semibold text-[#26352D]">
                  {weekDateRange}
                </p>

                {changingPeriod && (
                  <p className="mt-1 text-xs text-[#7A857D]">Cargando...</p>
                )}
              </div>

              <button
                type="button"
                onClick={goToNextWeek}
                disabled={weekOffset >= 1 || changingPeriod}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E0D3] bg-[#FBFAF6] text-xl text-[#52685A] transition hover:bg-[#DDE8DF] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Semana siguiente"
              >
                →
              </button>
            </div>

            {!isCurrentWeek && (
              <button
                type="button"
                onClick={goToCurrentWeek}
                className="mt-4 w-full rounded-2xl bg-[#DDE8DF] px-4 py-2.5 text-sm font-semibold text-[#52685A] transition hover:bg-[#C9DACD]"
              >
                Volver a esta semana
              </button>
            )}
          </section>
        ) : (
          <section className="mb-5 rounded-3xl border border-[#E6E0D3] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goToPreviousMonth}
                disabled={changingPeriod}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E0D3] bg-[#FBFAF6] text-xl text-[#52685A] transition hover:bg-[#DDE8DF] disabled:opacity-30"
                aria-label="Mes anterior"
              >
                ←
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="text-lg font-semibold capitalize text-[#26352D]">
                  {monthTitle}
                </p>

                {changingPeriod && (
                  <p className="mt-1 text-xs text-[#7A857D]">Cargando...</p>
                )}
              </div>

              <button
                type="button"
                onClick={goToNextMonth}
                disabled={changingPeriod}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E0D3] bg-[#FBFAF6] text-xl text-[#52685A] transition hover:bg-[#DDE8DF] disabled:opacity-30"
                aria-label="Mes siguiente"
              >
                →
              </button>
            </div>

            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToCurrentMonth}
                className="mt-4 w-full rounded-2xl bg-[#DDE8DF] px-4 py-2.5 text-sm font-semibold text-[#52685A] transition hover:bg-[#C9DACD]"
              >
                Volver a este mes
              </button>
            )}
          </section>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-[#E5C8BF] bg-[#F9EEEA] px-4 py-3 text-sm text-[#8A5C4E]">
            {error}
          </div>
        )}

        <div className="mb-5 flex rounded-2xl bg-[#E8E4DA] p-1">
          {(
            [
              ["day", "Día"],
              ["week", "Semana"],
              ["month", "Mes"],
            ] as const
          ).map(([viewName, label]) => (
            <button
              key={viewName}
              type="button"
              onClick={() => changeView(viewName)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                view === viewName
                  ? "bg-white text-[#52685A] shadow-sm"
                  : "text-[#7A857D] hover:text-[#52685A]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-[#E6E0D3] bg-white p-10 text-center">
            <p className="text-sm text-[#7A857D]">
              Cargando tu planificador...
            </p>
          </div>
        ) : view === "week" ? (
          <section className="space-y-5">
            {weekDates.map((date, index) => {
              const day = days[index];
              const isToday = isCurrentWeek && day === todayDayName;

              const plannedForDay = meals.filter((meal) =>
                isPlannedEntry(planner[day]?.[meal])
              ).length;

              return (
                <div
                  key={day}
                  className={`rounded-3xl border p-4 transition-colors ${
                    isToday
                      ? "border-[#B9CCBE] bg-[#F2F7F3] shadow-sm"
                      : "border-[#E6E0D3] bg-white"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">{day}</h2>

                        {isToday && (
                          <span className="rounded-full bg-[#52685A] px-2.5 py-1 text-[11px] font-semibold text-white">
                            Hoy
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-[#8A918B]">
                        {formatDisplayDate(date)}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-[#7A857D]">
                      {plannedForDay}/2 comidas
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {meals.map((meal) => renderMealCard(day, meal))}
                  </div>
                </div>
              );
            })}
          </section>
        ) : view === "day" ? (
          <section>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {days.map((day, index) => {
                const date = weekDates[index];
                const isToday = isCurrentWeek && day === todayDayName;
                const isSelected = selectedDay === day;

                const count = meals.filter((meal) =>
                  isPlannedEntry(planner[day]?.[meal])
                ).length;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`min-w-[82px] rounded-2xl border px-3 py-3 text-center transition ${
                      isSelected
                        ? "border-[#52685A] bg-[#52685A] text-white"
                        : "border-[#E6E0D3] bg-white text-[#52685A] hover:border-[#B9CCBE]"
                    }`}
                  >
                    <p className="text-xs font-medium">{day.slice(0, 3)}</p>
                    <p className="mt-1 text-lg font-bold">{date.getDate()}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isSelected ? "text-[#E4EEE6]" : "text-[#8A918B]"
                      }`}
                    >
                      {isToday ? "Hoy" : `${count}/2`}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border border-[#E6E0D3] bg-white p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">{selectedDay}</h2>
                  <p className="mt-1 text-sm text-[#8A918B]">
                    {formatDisplayDate(weekDates[days.indexOf(selectedDay)])}
                  </p>
                </div>

                <span className="rounded-2xl bg-[#DDE8DF] px-3 py-2 text-sm font-semibold text-[#52685A]">
                  {
                    meals.filter((meal) =>
                      isPlannedEntry(planner[selectedDay]?.[meal])
                    ).length
                  }
                  /2
                </span>
              </div>

              <div className="space-y-4">
                {meals.map((meal) => renderMealCard(selectedDay, meal))}
              </div>
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-[#E6E0D3] bg-white shadow-sm">
            <div className="border-b border-[#E6E0D3] bg-[#FBFAF6] px-3 py-3">
              <p className="text-xs text-[#7A857D]">
                Toca cualquier día para ver o editar su comida y cena.
              </p>
            </div>

            <div className="grid grid-cols-7 border-b border-[#E6E0D3] bg-[#FBFAF6]">
              {days.map((day) => (
                <div
                  key={day}
                  className="px-1 py-3 text-center text-[11px] font-semibold text-[#7A857D] sm:text-xs"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 2)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDates.map((date, index) => {
                const dateString = formatDateForSupabase(date);
                const rows = getMonthRowsForDate(dateString);
                const isCurrentMonthDate = isSameMonth(date, currentMonth);
                const isToday = isSameDate(date, today);

                const plannedCount = rows.filter(
                  (row) => row.is_outside || row.recipe_id !== null
                ).length;

                return (
                  <div
                    key={`${dateString}-${index}`}
                    className={`min-h-[108px] border-b border-r border-[#E6E0D3] p-1.5 sm:min-h-[140px] sm:p-2 ${
                      !isCurrentMonthDate
                        ? "bg-[#FAF9F5]"
                        : plannedCount === 2
                          ? "bg-[#F2F7F3]"
                          : "bg-white"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => openMonthMealSelector(date)}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition hover:ring-2 hover:ring-[#B9CCBE] ${
                          isToday
                            ? "bg-[#52685A] text-white"
                            : isCurrentMonthDate
                              ? "text-[#52685A] hover:bg-[#DDE8DF]"
                              : "text-[#B7B5AC] hover:bg-[#E8E4DA]"
                        }`}
                        aria-label={`Ver planificación del ${date.getDate()} de ${date.toLocaleDateString(
                          "es-ES",
                          { month: "long" }
                        )}`}
                      >
                        {date.getDate()}
                      </button>

                      {isCurrentMonthDate && (
                        <button
                          type="button"
                          onClick={() => openMonthMealSelector(date)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DDE8DF] text-sm text-[#52685A] transition hover:bg-[#C9DACD]"
                          aria-label={`Editar comidas del día ${date.getDate()}`}
                        >
                          +
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openMonthMealSelector(date)}
                      className="mb-1 block w-full text-left text-[9px] font-medium text-[#8A918B] hover:text-[#52685A] sm:text-[10px]"
                    >
                      {plannedCount === 0
                        ? "Sin planificar"
                        : `${plannedCount}/2 planificadas`}
                    </button>

                    <div className="space-y-1">
                      {rows.map((row) => renderMonthRecipe(row))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#E6E0D3] bg-[#FBFAF6] px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-[#7A857D]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#52685A]" />
                Hoy
              </span>

              <span className="flex items-center gap-2 text-xs text-[#7A857D]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#DDE8DF]" />
                Día con comidas planificadas
              </span>
            </div>
          </section>
        )}

        <div className="mt-6 rounded-2xl bg-[#EDE9DF] px-4 py-3">
          <p className="text-xs leading-5 text-[#777B75]">
            💡 Tu planificación se guarda automáticamente en tu cuenta y
            aparecerá cuando vuelvas a abrir el planificador.
          </p>
        </div>
      </div>

      {selectedMonthDate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#26352D]/40 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMonthMealSelector();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="month-detail-title"
            className="w-full max-w-lg overflow-hidden rounded-t-[2rem] border border-[#D8E3DA] bg-[#F7F5EF] shadow-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E0D3] bg-white px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7A857D]">
                  Tu planificación
                </p>

                <h2
                  id="month-detail-title"
                  className="mt-1 text-xl font-bold capitalize text-[#26352D]"
                >
                  {parseDate(selectedMonthDate).toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>

                <p className="mt-1 text-sm text-[#8A918B]">
                  Añade, cambia o elimina cada comida.
                </p>
              </div>

              <button
                type="button"
                onClick={closeMonthMealSelector}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F5EF] text-[#7A857D] transition hover:bg-[#E8E4DA] hover:text-[#52685A]"
                aria-label="Cerrar detalle del día"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 p-5 sm:p-6">
              {meals.map((meal) =>
                renderMonthDetailMeal(selectedMonthDate, meal)
              )}
            </div>

            <div className="border-t border-[#E6E0D3] bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeMonthMealSelector}
                className="w-full rounded-2xl border border-[#E6E0D3] bg-[#FBFAF6] px-4 py-3 text-sm font-semibold text-[#52685A] transition hover:bg-[#F2F7F3]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDateForRecipe && selectedMeal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#26352D]/40 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRecipeSelector();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recipe-selector-title"
            className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] border border-[#D8E3DA] bg-[#F7F5EF] shadow-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E0D3] bg-white px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7A857D]">
                  Añadir a tu planificación
                </p>

                <h2
                  id="recipe-selector-title"
                  className="mt-1 text-xl font-bold capitalize text-[#26352D]"
                >
                  {parseDate(selectedDateForRecipe).toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>

                <div className="mt-2 inline-flex items-center rounded-full bg-[#DDE8DF] px-3 py-1 text-xs font-semibold text-[#52685A]">
                  {selectedMeal}
                </div>
              </div>

              <button
                type="button"
                onClick={closeRecipeSelector}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F5EF] text-[#7A857D] transition hover:bg-[#E8E4DA] hover:text-[#52685A]"
                aria-label="Cerrar selector"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-[#E6E0D3] bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={addOutside}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#E6E0D3] bg-[#FFFDF8] p-3.5 text-left transition hover:border-[#D9C8AD] hover:bg-[#FCF8F0]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1E7D7] text-xl">
                  🍴
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#26352D]">Fuera de casa</p>
                  <p className="mt-1 text-xs text-[#8A918B]">
                    He {selectedMeal === "Comida" ? "comido" : "cenado"} fuera
                    de casa
                  </p>
                </div>

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1E7D7] text-sm text-[#8A715B]">
                  ✓
                </span>
              </button>
            </div>

            {availableRecipes.length > 0 && (
              <div className="border-b border-[#E6E0D3] bg-white px-5 pb-4 pt-1 sm:px-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8A918B]">
                  Mis recetas
                </p>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#8A918B]">
                    🔎
                  </span>

                  <input
                    type="text"
                    value={recipeSearch}
                    onChange={(event) => setRecipeSearch(event.target.value)}
                    placeholder="Buscar receta..."
                    autoFocus
                    className="w-full rounded-2xl border border-[#E6E0D3] bg-[#FBFAF6] py-3 pl-11 pr-4 text-sm text-[#26352D] outline-none transition placeholder:text-[#A3A59F] focus:border-[#B9CCBE] focus:ring-2 focus:ring-[#DDE8DF]"
                  />
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {availableRecipes.length === 0 ? (
                <div className="rounded-2xl border border-[#E6E0D3] bg-white p-6 text-center">
                  <div className="mb-3 text-3xl">🍽️</div>
                  <p className="font-semibold text-[#26352D]">
                    Todavía no tienes recetas guardadas
                  </p>
                  <p className="mt-1 text-sm text-[#7A857D]">
                    Puedes marcar esta comida como{" "}
                    <strong>fuera de casa</strong> o crear una receta primero.
                  </p>
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="rounded-2xl border border-[#E6E0D3] bg-white p-6 text-center">
                  <div className="mb-3 text-2xl">🔎</div>
                  <p className="font-semibold text-[#26352D]">
                    No encontramos ninguna receta
                  </p>
                  <p className="mt-1 text-sm text-[#7A857D]">
                    Prueba con otro nombre o categoría.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredRecipes.map((recipe) => {
                    const categoryStyle = getCategoryStyle(recipe.category);

                    return (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => addRecipe(recipe)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-[#E6E0D3] bg-white p-3.5 text-left transition hover:border-[#B9CCBE] hover:shadow-sm"
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${categoryStyle.color}`}
                        >
                          {recipe.emoji}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[#26352D]">
                            {recipe.name}
                          </p>
                          <p className="mt-1 text-xs text-[#8A918B]">
                            {recipe.time} · {recipe.category}
                          </p>
                        </div>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDE8DF] text-lg font-medium text-[#52685A]">
                          +
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}