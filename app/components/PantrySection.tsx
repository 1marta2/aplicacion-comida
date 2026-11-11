
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ShoppingCategoryManager, {
  type ShoppingCategory,
} from "@/app/components/ShoppingCategoryManager";
import {
  DEFAULT_CATEGORY_NAMES,
  resolveAutomaticCategory,
} from "@/lib/ingredient-category";
import IngredientAutocomplete from "@/app/components/IngredientAutocomplete";

const DEFAULT_LOCATIONS = ["Nevera", "Armario", "Congelador", "Especias"];

type PantryItem = {
  id: number;
  ingredientId: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  location: string;
  isOpened: boolean;
  openedAt: string;
  expiryDate: string;
  useSoon: boolean;
};

type PantryRow = {
  id: number;
  ingredient_id: number;
  quantity: number | null;
  unit: string | null;
  location: string | null;
  is_opened: boolean;
  opened_at: string | null;
  expiry_date: string | null;
  use_soon: boolean;
};

const inputClass =
  "w-full rounded-xl border border-[#E1DED5] bg-[#FBFAF7] px-3 py-2 text-base text-[#30352C] outline-none placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8] sm:text-sm";

function normalizeUnit(unit: string | null): string | null {
  if (!unit?.trim()) return null;
  const value = unit.toLowerCase().trim();

  if (["g", "gr", "gramo", "gramos"].includes(value)) return "g";
  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value))
    return "kg";
  if (["ml", "mililitro", "mililitros"].includes(value)) return "ml";
  if (["l", "litro", "litros"].includes(value)) return "l";
  if (["cl", "centilitro", "centilitros"].includes(value)) return "cl";
  if (["ud", "uds", "unidad", "unidades"].includes(value)) return "unidad";

  return value;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(item: PantryItem): string {
  if (item.quantity === null) return "";
  return `${formatNumber(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`;
}

function getCategoryIcon(category: string): string {
  const normalized = category
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("fruta") || normalized.includes("verdura"))
    return "🥕";
  if (normalized.includes("carnicer") || normalized.includes("carne"))
    return "🥩";
  if (normalized.includes("pescader") || normalized.includes("pescado"))
    return "🐟";
  if (normalized.includes("lacteo")) return "🥛";
  if (normalized.includes("despensa")) return "🫙";
  if (normalized.includes("condimento") || normalized.includes("especia"))
    return "🧂";
  if (normalized.includes("pasta")) return "🍝";
  if (normalized.includes("arroz")) return "🍚";
  if (normalized.includes("legumbre")) return "🫘";

  return "🛒";
}

function toBase(quantity: number, unit: string | null) {
  const normalized = normalizeUnit(unit);
  if (normalized === "kg") return { quantity: quantity * 1000, unit: "g" };
  if (normalized === "l") return { quantity: quantity * 1000, unit: "ml" };
  if (normalized === "cl") return { quantity: quantity * 10, unit: "ml" };
  return { quantity, unit: normalized };
}

function fromBase(quantity: number, unit: string | null): number {
  if (unit === "kg" || unit === "l") return quantity / 1000;
  if (unit === "cl") return quantity / 10;
  return quantity;
}

function getExpiryInfo(expiryDate: string) {
  if (!expiryDate) return null;

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const todayDate = new Date(`${todayString}T00:00:00`);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const days = Math.round(
    (expiry.getTime() - todayDate.getTime()) / 86400000
  );

  if (days < 0)
    return {
      label: "Fecha pasada",
      className: "bg-[#FBF0EC] text-[#A16E63]",
    };
  if (days === 0)
    return {
      label: "Caduca hoy",
      className: "bg-[#F8EBDD] text-[#A16E43]",
    };
  if (days === 1)
    return {
      label: "Caduca mañana",
      className: "bg-[#F8EBDD] text-[#A16E43]",
    };
  if (days <= 5)
    return {
      label: `Caduca en ${days} días`,
      className: "bg-[#F8EBDD] text-[#A16E43]",
    };

  return null;
}

export default function PantrySection() {
  const router = useRouter();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [location, setLocation] = useState("Nevera");
  const [isOpened, setIsOpened] = useState(false);
  const [openedAt, setOpenedAt] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [useSoon, setUseSoon] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingInlineId, setEditingInlineId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [movingItemId, setMovingItemId] = useState<number | null>(null);
  const [shoppingActionId, setShoppingActionId] = useState<number | null>(null);
  const [shoppingMessage, setShoppingMessage] = useState("");
  const [itemToFinish, setItemToFinish] = useState<PantryItem | null>(null);

  const [pressedItemId, setPressedItemId] = useState<number | null>(null);
  const [contextMenuItem, setContextMenuItem] = useState<PantryItem | null>(
    null
  );

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const closeItemMenu = useCallback(() => {
    clearPressTimer();
    setContextMenuItem(null);
    setPressedItemId(null);
    pressStartRef.current = null;
  }, [clearPressTimer]);

  function startLongPress(
    item: PantryItem,
    event: React.PointerEvent<HTMLElement>
  ) {
    const target = event.target as HTMLElement;
    if (target.closest("button, summary, input, select, textarea")) return;

    if (event.pointerType === "mouse" && event.button !== 0) return;

    clearPressTimer();
    pressStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    setPressedItemId(item.id);

    pressTimerRef.current = setTimeout(() => {
      setContextMenuItem(item);
      setPressedItemId(null);
      pressTimerRef.current = null;

      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator
      ) {
        navigator.vibrate(20);
      }
    }, 500);
  }

  function moveLongPress(event: React.PointerEvent<HTMLElement>) {
    if (!pressStartRef.current) return;

    const distance = Math.hypot(
      event.clientX - pressStartRef.current.x,
      event.clientY - pressStartRef.current.y
    );

    if (distance > 10) {
      clearPressTimer();
      setPressedItemId(null);
      pressStartRef.current = null;
    }
  }

  function endLongPress() {
    clearPressTimer();
    setPressedItemId(null);
    pressStartRef.current = null;
  }

  useEffect(() => {
    return () => clearPressTimer();
  }, [clearPressTimer]);

  useEffect(() => {
    if (!contextMenuItem) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        closeItemMenu();
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, [contextMenuItem, closeItemMenu]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: savedCategories, error: categoriesError } =
        await supabase
          .from("shopping_categories")
          .select("id, name, sort_order")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

      if (categoriesError) throw categoriesError;

      let categoryRows: ShoppingCategory[] = [];

      if (!savedCategories || savedCategories.length === 0) {
        const { data, error } = await supabase
          .from("shopping_categories")
          .insert(
            DEFAULT_CATEGORY_NAMES.map((categoryName, index) => ({
              user_id: user.id,
              name: categoryName,
              sort_order: index,
            }))
          )
          .select("id, name, sort_order");

        if (error) throw error;
        categoryRows = (data || []) as ShoppingCategory[];
      } else {
        categoryRows = savedCategories as ShoppingCategory[];
      }

      setCategories(categoryRows);

      const { data: assignmentRows, error: assignmentsError } =
        await supabase
          .from("ingredient_category_assignments")
          .select("ingredient_id, category_id")
          .eq("user_id", user.id);

      if (assignmentsError) throw assignmentsError;

      const assignments: Record<number, number> = {};
      (assignmentRows || []).forEach((row) => {
        assignments[Number(row.ingredient_id)] = Number(row.category_id);
      });

      const categoryNameById = new Map(
        categoryRows.map((category) => [
          Number(category.id),
          category.name,
        ])
      );

      const { data: pantryData, error: pantryError } = await supabase
        .from("pantry")
        .select(
          "id, ingredient_id, quantity, unit, location, is_opened, opened_at, expiry_date, use_soon"
        )
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (pantryError) throw pantryError;

      const rows = (pantryData || []) as PantryRow[];
      const ingredientIds = [
        ...new Set(rows.map((row) => row.ingredient_id)),
      ];

      let ingredientMap = new Map<number, string>();

      if (ingredientIds.length > 0) {
        const { data, error } = await supabase
          .from("ingredients")
          .select("id, name")
          .in("id", ingredientIds);

        if (error) throw error;

        ingredientMap = new Map(
          (data || []).map((ingredient) => [
            Number(ingredient.id),
            ingredient.name as string,
          ])
        );
      }

      setItems(
        rows.map((row) => {
          const ingredientName =
            ingredientMap.get(Number(row.ingredient_id)) || "Ingrediente";

          const assignedCategory = categoryNameById.get(
            assignments[Number(row.ingredient_id)]
          );

          return {
            id: Number(row.id),
            ingredientId: Number(row.ingredient_id),
            name: ingredientName,
            quantity: row.quantity === null ? null : Number(row.quantity),
            unit: normalizeUnit(row.unit),
            location: row.location || "Nevera",
            category:
              assignedCategory ||
              resolveAutomaticCategory(ingredientName, categoryRows),
            isOpened: row.is_opened ?? false,
            openedAt: row.opened_at || "",
            expiryDate: row.expiry_date || "",
            useSoon: row.use_soon ?? false,
          };
        })
      );
    } catch (error) {
      console.error("Error cargando el almacén:", error);
      setErrorMessage("No hemos podido cargar tu almacén. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function createCategory(name: string) {
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
        name: name.trim(),
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
    const oldName = categories.find((category) => category.id === id)?.name;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No hay una sesión activa.");

    const { data, error } = await supabase
      .from("shopping_categories")
      .update({ name: name.trim() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, sort_order")
      .single();

    if (error) throw error;

    setCategories((current) =>
      current.map((category) =>
        category.id === id ? (data as ShoppingCategory) : category
      )
    );

    if (oldName) {
      setItems((current) =>
        current.map((item) =>
          item.category === oldName
            ? { ...item, category: name.trim() }
            : item
        )
      );
    }
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

    await loadItems();
  }

  async function changePantryCategory(item: PantryItem, categoryId: number) {
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

    const selected = categories.find(
      (category) => category.id === categoryId
    );

    if (!selected) return;

    setItems((current) =>
      current.map((entry) =>
        entry.ingredientId === item.ingredientId
          ? { ...entry, category: selected.name }
          : entry
      )
    );
  }

  async function updateConservation(
    item: PantryItem,
    changes: Partial<
      Pick<PantryItem, "isOpened" | "openedAt" | "expiryDate" | "useSoon">
    >
  ) {
    if (updatingItemId === item.id) return;

    const next = { ...item, ...changes };

    if (next.openedAt && !next.isOpened) {
      setErrorMessage(
        "Marca el producto como abierto para guardar su fecha de apertura."
      );
      return;
    }

    if (next.openedAt && next.expiryDate && next.openedAt > next.expiryDate) {
      setErrorMessage(
        "La fecha de apertura no puede ser posterior a la caducidad."
      );
      return;
    }

    setUpdatingItemId(item.id);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("pantry")
        .update({
          is_opened: next.isOpened,
          opened_at: next.isOpened ? next.openedAt || null : null,
          expiry_date: next.expiryDate || null,
          use_soon: next.useSoon,
        })
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? next : entry))
      );
    } catch (error) {
      console.error("Error actualizando conservación:", error);
      setErrorMessage(
        "No se ha podido actualizar el ingrediente. Inténtalo de nuevo."
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  function resetForm() {
    setName("");
    setQuantity("");
    setUnit("");
    setLocation("Nevera");
    setIsOpened(false);
    setOpenedAt("");
    setExpiryDate("");
    setUseSoon(false);
    setEditingId(null);
    setEditingInlineId(null);
    setShowForm(false);
  }

  async function findOrCreateIngredient(ingredientName: string) {
    const cleanName = ingredientName.trim();

    const { data: existing, error: searchError } = await supabase
      .from("ingredients")
      .select("id")
      .ilike("name", cleanName)
      .limit(1)
      .maybeSingle();

    if (searchError) throw searchError;
    if (existing) return Number(existing.id);

    const { data: created, error: createError } = await supabase
      .from("ingredients")
      .insert({ name: cleanName })
      .select("id")
      .single();

    if (createError) throw createError;

    return Number(created.id);
  }

  async function saveItem() {
    const cleanName = name.trim();
    if (!cleanName || saving) return;

    const parsedQuantity =
      quantity.trim() === "" ? null : Number(quantity.replace(",", "."));

    if (
      parsedQuantity !== null &&
      (!Number.isFinite(parsedQuantity) || parsedQuantity < 0)
    ) {
      setErrorMessage("Introduce una cantidad válida, igual o mayor que cero.");
      return;
    }

    if (openedAt && !isOpened) {
      setErrorMessage(
        "Marca el producto como abierto para guardar la fecha de apertura."
      );
      return;
    }

    if (openedAt && expiryDate && openedAt > expiryDate) {
      setErrorMessage(
        "La fecha de apertura no puede ser posterior a la fecha de caducidad."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login");
        return;
      }

      const ingredientId = await findOrCreateIngredient(cleanName);
      const normalizedUnit = normalizeUnit(unit);

      const conservation = {
        is_opened: isOpened,
        opened_at: isOpened ? openedAt || null : null,
        expiry_date: expiryDate || null,
        use_soon: useSoon,
      };

      if (editingId !== null) {
        const { error } = await supabase
          .from("pantry")
          .update({
            ingredient_id: ingredientId,
            quantity: parsedQuantity,
            unit: normalizedUnit,
            location,
            ...conservation,
          })
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const existing = items.find(
          (item) =>
            item.ingredientId === ingredientId &&
            item.location === location
        );

        if (existing) {
          let finalQuantity = parsedQuantity;
          let finalUnit = normalizedUnit;

          if (
            existing.quantity !== null &&
            parsedQuantity !== null &&
            existing.unit &&
            normalizedUnit
          ) {
            const existingBase = toBase(existing.quantity, existing.unit);
            const newBase = toBase(parsedQuantity, normalizedUnit);

            if (existingBase.unit === newBase.unit) {
              finalQuantity = fromBase(
                existingBase.quantity + newBase.quantity,
                existing.unit
              );
              finalUnit = existing.unit;
            }
          }

          const { error } = await supabase
            .from("pantry")
            .update({
              quantity: finalQuantity,
              unit: finalUnit,
            })
            .eq("id", existing.id)
            .eq("user_id", user.id);

          if (error) throw error;
        } else {
          const { error } = await supabase.from("pantry").insert({
            user_id: user.id,
            ingredient_id: ingredientId,
            quantity: parsedQuantity,
            unit: normalizedUnit,
            location,
            ...conservation,
          });

          if (error) throw error;
        }
      }

      resetForm();
      await loadItems();
    } catch (error) {
      console.error("Error guardando ingrediente:", error);
      setErrorMessage(
        "No se ha podido guardar el ingrediente. Comprueba los datos e inténtalo de nuevo."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditing(item: PantryItem) {
    closeItemMenu();

    setEditingId(item.id);
    setEditingInlineId(item.id);
    setName(item.name);
    setQuantity(item.quantity === null ? "" : String(item.quantity));
    setUnit(item.unit || "");
    setLocation(item.location);
    setIsOpened(item.isOpened);
    setOpenedAt(item.openedAt);
    setExpiryDate(item.expiryDate);
    setUseSoon(item.useSoon);
    setErrorMessage("");
    setShowForm(false);
  }

  async function changeItemLocation(item: PantryItem, nextLocation: string) {
    if (item.location === nextLocation || movingItemId !== null) {
      closeItemMenu();
      return;
    }

    setMovingItemId(item.id);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("pantry")
        .update({ location: nextLocation })
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, location: nextLocation }
            : entry
        )
      );

      setShoppingMessage(`${item.name} se ha movido a ${nextLocation}.`);
      closeItemMenu();
    } catch (error) {
      console.error("Error cambiando ubicación:", error);
      setErrorMessage(
        "No se ha podido cambiar la ubicación del ingrediente."
      );
    } finally {
      setMovingItemId(null);
    }
  }

  async function removeItem(item: PantryItem) {
    closeItemMenu();

    if (!window.confirm(`¿Quieres eliminar ${item.name} de tu almacén?`))
      return;

    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setErrorMessage("No hemos podido comprobar tu sesión.");
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("pantry")
      .delete()
      .eq("id", item.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error eliminando ingrediente:", error);
      setErrorMessage("No se ha podido eliminar el ingrediente.");
      return;
    }

    if (editingId === item.id) resetForm();

    await loadItems();
  }

  async function finishPantryItem(addToShoppingList: boolean) {
    const item = itemToFinish;

    if (!item || shoppingActionId === item.id) return;

    setShoppingActionId(item.id);
    setShoppingMessage("");
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (addToShoppingList) {
        const { data: existing, error: existingError } = await supabase
          .from("shopping_list")
          .select("id, checked")
          .eq("user_id", user.id)
          .eq("ingredient_id", item.ingredientId)
          .limit(1)
          .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
          if (existing.checked) {
            const { error } = await supabase
              .from("shopping_list")
              .update({ checked: false })
              .eq("id", existing.id)
              .eq("user_id", user.id);

            if (error) throw error;
          }
        } else {
          const { error } = await supabase.from("shopping_list").insert({
            user_id: user.id,
            ingredient_id: item.ingredientId,
            name: item.name,
            quantity: item.quantity,
            unit: normalizeUnit(item.unit),
            checked: false,
          });

          if (error) throw error;
        }
      }

      const { error: deleteError } = await supabase
        .from("pantry")
        .delete()
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setItems((current) =>
        current.filter((entry) => entry.id !== item.id)
      );

      if (editingId === item.id) resetForm();

      closeItemMenu();
      setItemToFinish(null);

      setShoppingMessage(
        addToShoppingList
          ? `${item.name} se ha añadido a la compra y se ha quitado del almacén.`
          : `${item.name} se ha quitado del almacén. No se ha añadido a la compra.`
      );
    } catch (error) {
      console.error("Error marcando ingrediente como agotado:", error);
      setErrorMessage(
        addToShoppingList
          ? "No se ha podido completar la operación. El ingrediente sigue en tu almacén."
          : "No se ha podido quitar el ingrediente del almacén."
      );
    } finally {
      setShoppingActionId(null);
    }
  }

  // Formulario compartido para añadir y editar ingredientes.
  function renderPantryForm(inline = false) {
    return (
      <div
        id={inline ? `pantry-edit-${editingId}` : "pantry-item-form"}
        className={`rounded-2xl bg-white p-3 shadow-sm ${
          inline ? "mt-2 border border-[#E5E8DF]" : "mt-2"
        }`}
      >
        <div className="mb-3">
          <h2 className="text-sm font-semibold">
            {editingId !== null ? "Editar ingrediente" : "Nuevo ingrediente"}
          </h2>
          <p className="mt-0.5 text-[11px] text-[#92958B]">
            Añade los datos que necesites para controlar lo que tienes en casa.
          </p>
        </div>

        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2">
          <label className="min-w-0 block text-xs font-medium text-[#788675]">
            Ingrediente
            <IngredientAutocomplete
              value={name}
              onChange={setName}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveItem();
                }
              }}
              placeholder="Ej. Arroz"
              className={`${inputClass} mt-1 px-2.5 py-2 text-sm`}
            />
          </label>

          <label className="min-w-0 block text-xs font-medium text-[#788675]">
            Ubicación
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={`${inputClass} mt-1 px-2 py-2 text-sm`}
            >
              {locations.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 rounded-xl border border-[#E5E8DF] bg-[#FBFAF7] p-2.5">
          <div className="mb-2">
            <h3 className="text-xs font-semibold text-[#52685A]">
              Conservación y fechas
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg bg-white px-2.5 py-2">
              <input
                type="checkbox"
                checked={isOpened}
                onChange={(event) => {
                  setIsOpened(event.target.checked);
                  if (!event.target.checked) setOpenedAt("");
                }}
                className="h-4 w-4 shrink-0 accent-[#52685A]"
              />
              <span className="text-xs font-medium leading-tight text-[#30352C]">
                Producto abierto
              </span>
            </label>

            <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg bg-white px-2.5 py-2">
              <input
                type="checkbox"
                checked={useSoon}
                onChange={(event) => setUseSoon(event.target.checked)}
                className="h-4 w-4 shrink-0 accent-[#52685A]"
              />
              <span className="text-xs font-medium leading-tight text-[#30352C]">
                Gastar pronto
              </span>
            </label>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="min-w-0 block text-[11px] font-medium text-[#788675]">
              Fecha de apertura
              <input
                type="date"
                value={openedAt}
                disabled={!isOpened}
                onChange={(event) => setOpenedAt(event.target.value)}
                className={`${inputClass} mt-1 px-2 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
              />
            </label>

            <label className="min-w-0 block text-[11px] font-medium text-[#788675]">
              Fecha de caducidad
              <input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                className={`${inputClass} mt-1 px-2 py-2 text-xs`}
              />
            </label>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-[#F8F7F3] px-2.5 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-[#92958B]">
              Cantidad y unidad
            </p>
            <span className="text-[10px] text-[#B2B4AC]">Opcional</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0 text-[11px] text-[#92958B]">
              Cantidad
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputMode="decimal"
                placeholder="Ej. 500"
                className="mt-1 w-full rounded-lg border border-[#E8E6DE] bg-white px-2.5 py-1.5 text-sm text-[#52685A] outline-none placeholder:text-[#B2B4AC] focus:border-[#A9B9A6]"
              />
            </label>

            <label className="min-w-0 text-[11px] text-[#92958B]">
              Unidad
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveItem();
                  }
                }}
                placeholder="g, kg, ml…"
                className="mt-1 w-full rounded-lg border border-[#E8E6DE] bg-white px-2.5 py-1.5 text-sm text-[#52685A] outline-none placeholder:text-[#B2B4AC] focus:border-[#A9B9A6]"
              />
            </label>
          </div>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mt-2 rounded-xl bg-[#FBF0EC] px-3 py-2 text-xs text-[#955F53]"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveItem()}
            disabled={saving || !name.trim()}
            className="rounded-xl bg-[#52685A] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#405547] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Guardando…"
              : editingId !== null
                ? "Guardar cambios"
                : "Añadir al almacén"}
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setErrorMessage("");
            }}
            className="rounded-xl bg-[#F1EFE8] px-3.5 py-2 text-xs text-[#52685A] hover:bg-[#E8E5DC]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const filteredItems = items
    .filter((item) =>
      item.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))
    )
    .sort((a, b) => {
      const aExpiry = getExpiryInfo(a.expiryDate);
      const bExpiry = getExpiryInfo(b.expiryDate);
      const aUrgent = a.useSoon || Boolean(aExpiry);
      const bUrgent = b.useSoon || Boolean(bExpiry);

      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      if (a.expiryDate && b.expiryDate)
        return a.expiryDate.localeCompare(b.expiryDate);
      if (a.expiryDate) return -1;
      if (b.expiryDate) return 1;
      if (a.useSoon !== b.useSoon) return a.useSoon ? -1 : 1;

      return a.name.localeCompare(b.name, "es");
    });

  const locations = [
    ...DEFAULT_LOCATIONS,
    ...Array.from(new Set(items.map((item) => item.location))).filter(
      (savedLocation) => !DEFAULT_LOCATIONS.includes(savedLocation)
    ).sort((a, b) => a.localeCompare(b, "es")),
  ];

  return (
    <section className="text-[#26352D]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-4">
          <p className="text-xs font-medium tracking-wide text-[#788675]">
            TU COCINA, BAJO CONTROL
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Mi almacén
          </h1>

          <p className="mt-1 max-w-xl text-sm text-[#788675]">
            Lo que tienes en casa, organizado para comprar solo lo necesario.
          </p>

          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#DDE8DF] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-xl">
              🥬
            </div>
            <div>
              <p className="text-sm font-semibold">
                {items.length}{" "}
                {items.length === 1 ? "existencia" : "existencias"}
              </p>
              <p className="text-xs text-[#52685A]">
                Organiza tus alimentos por el lugar donde los guardas.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-4">
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                resetForm();
                setErrorMessage("");
              } else {
                resetForm();
                setLocation("Nevera");
                setErrorMessage("");
                setShowForm(true);
              }
            }}
            aria-expanded={showForm}
            aria-controls="pantry-item-form"
            className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition hover:bg-[#FBFAF7]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDE8DF] text-xl text-[#52685A]">
                {showForm ? "−" : "+"}
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  Añadir ingrediente
                </span>
                <span className="mt-0.5 block text-xs text-[#788675]">
                  {showForm
                    ? "Pulsa para cerrar el formulario"
                    : "Añade lo que tienes en casa"}
                </span>
              </span>
            </span>
            <span className="text-sm text-[#788675]" aria-hidden="true">
              {showForm ? "⌃" : "⌄"}
            </span>
          </button>

          {showForm && renderPantryForm()}
        </section>

        <details className="mb-4 rounded-xl px-1 py-1">
          <summary className="cursor-pointer text-xs font-medium text-[#92958B] hover:text-[#52685A]">
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

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Lo que tengo en casa</h2>
              <p className="mt-0.5 text-xs text-[#788675]">
                Tus alimentos, agrupados por ubicación.
              </p>
            </div>

            <span className="rounded-full bg-[#E8E9E0] px-2.5 py-1 text-xs font-semibold text-[#52685A]">
              {filteredItems.length}
            </span>
          </div>

          {errorMessage && !showForm && (
            <p
              role="alert"
              className="mb-3 rounded-xl bg-[#FBF0EC] px-3 py-2 text-sm text-[#955F53]"
            >
              {errorMessage}
            </p>
          )}

          {shoppingMessage && (
            <p
              role="status"
              className="mb-3 rounded-xl bg-[#E7EDE3] px-3 py-2 text-sm text-[#52685A]"
            >
              {shoppingMessage}
            </p>
          )}

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ingrediente…"
            aria-label="Buscar ingrediente"
            className={`${inputClass} mb-3`}
          />

          {loading ? (
            <div className="rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#D8D5CB] border-t-[#52685A]" />
              <p className="mt-3 text-sm text-[#788675]">
                Cargando tu almacén…
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl bg-white px-5 py-8 text-center shadow-sm">
              <div className="text-3xl">{search ? "🔎" : "🧺"}</div>
              <h3 className="mt-2 text-sm font-semibold">
                {search
                  ? "No encontramos ese ingrediente"
                  : "Tu almacén está vacío"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-[#788675]">
                {search
                  ? "Prueba con otro nombre o borra la búsqueda."
                  : "Pulsa «Añadir ingrediente» para empezar a organizar lo que tienes en casa."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map((savedLocation) => {
                const locationItems = filteredItems.filter(
                  (item) => item.location === savedLocation
                );

                if (locationItems.length === 0) return null;

                return (
                  <details
                    key={savedLocation}
                    open
                    className="overflow-visible rounded-2xl bg-white px-3 py-2.5 shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-base text-[#788675]">⌄</span>
                        <span className="text-sm font-semibold">
                          {savedLocation}
                        </span>
                      </span>

                      <span className="rounded-full bg-[#F0F2EB] px-2 py-0.5 text-[11px] font-semibold text-[#52685A]">
                        {locationItems.length}
                      </span>
                    </summary>

                    <div className="mt-1 divide-y divide-[#EEECE5]">
                      {locationItems.map((item) => {
                        const expiryInfo = getExpiryInfo(item.expiryDate);
                        const updating = updatingItemId === item.id;
                        const pressed = pressedItemId === item.id;
                        const menuOpen = contextMenuItem?.id === item.id;
                        const inlineEditing = editingInlineId === item.id;

                        return (
                          <article
                            key={item.id}
                            onPointerDown={(event) =>
                              startLongPress(item, event)
                            }
                            onPointerMove={moveLongPress}
                            onPointerUp={endLongPress}
                            onPointerCancel={endLongPress}
                            onPointerLeave={endLongPress}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              closeItemMenu();
                              setContextMenuItem(item);
                            }}
                            style={{ touchAction: "pan-y" }}
                            className={`relative -mx-2 rounded-xl px-2 py-2.5 transition-colors duration-200 ${
                              pressed
                                ? "bg-[#26352D]/15"
                                : "bg-transparent"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span
                                    className="text-base leading-none"
                                    aria-hidden="true"
                                  >
                                    {getCategoryIcon(item.category)}
                                  </span>

                                  <h3 className="text-sm font-semibold">
                                    {item.name}
                                  </h3>

                                  {formatQuantity(item) && (
                                    <span className="text-xs text-[#92958B]">
                                      {formatQuantity(item)}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {item.isOpened && (
                                    <span className="rounded-md bg-[#F8EBDD] px-2 py-0.5 text-[10px] font-medium text-[#916B43]">
                                      Abierto
                                    </span>
                                  )}

                                  {item.useSoon && (
                                    <span className="rounded-md bg-[#FBF0EC] px-2 py-0.5 text-[10px] font-medium text-[#A16E63]">
                                      Gastar pronto
                                    </span>
                                  )}

                                  {expiryInfo && (
                                    <span
                                      className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${expiryInfo.className}`}
                                    >
                                      {expiryInfo.label}
                                    </span>
                                  )}

                                  {updating && (
                                    <span className="text-[10px] text-[#788675]">
                                      Guardando…
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                aria-label={`Opciones de ${item.name}`}
                                aria-expanded={menuOpen}
                                onClick={() => {
                                  if (menuOpen) {
                                    closeItemMenu();
                                  } else {
                                    closeItemMenu();
                                    setContextMenuItem(item);
                                  }
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-[#788675] hover:bg-[#F0F2EB]"
                              >
                                ···
                              </button>
                            </div>

                            {menuOpen && (
                              <div
                                ref={menuRef}
                                className="relative z-30 mt-2 rounded-xl border border-[#E9E6DE] bg-[#FBFAF7] p-3 shadow-md"
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="text-xs font-semibold text-[#52685A]">
                                    Mover a…
                                  </p>
                                  <button
                                    type="button"
                                    onClick={closeItemMenu}
                                    aria-label="Cerrar menú"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[#92958B] hover:bg-[#EEECE5]"
                                  >
                                    ×
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {locations.map((option) => (
                                    <button
                                      key={option}
                                      type="button"
                                      disabled={
                                        movingItemId === item.id ||
                                        item.location === option
                                      }
                                      onClick={() =>
                                        void changeItemLocation(item, option)
                                      }
                                      className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                                        item.location === option
                                          ? "border-[#A9B9A6] bg-[#DDE8DF] text-[#405547]"
                                          : "border-[#E9E6DE] bg-white text-[#52685A] hover:bg-[#F0F2EB]"
                                      } disabled:cursor-default disabled:opacity-70`}
                                    >
                                      {item.location === option ? "✓ " : ""}
                                      {option}
                                    </button>
                                  ))}
                                </div>

                                {movingItemId === item.id && (
                                  <p className="mt-2 text-xs text-[#788675]">
                                    Cambiando ubicación…
                                  </p>
                                )}

                                <div className="mt-3 border-t border-[#E9E6DE] pt-2">
                                  <button
                                    type="button"
                                    onClick={() => startEditing(item)}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-medium text-[#52685A] hover:bg-white"
                                  >
                                    ✏️ Editar ingrediente
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeItemMenu();
                                      setItemToFinish(item);
                                      setShoppingMessage("");
                                      setErrorMessage("");
                                    }}
                                    disabled={shoppingActionId === item.id}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-medium text-[#52685A] hover:bg-white disabled:opacity-50"
                                  >
                                    🛒 Se me ha acabado
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => void removeItem(item)}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-medium text-[#A16E63] hover:bg-[#FBF0EC]"
                                  >
                                    🗑️ Eliminar
                                  </button>
                                </div>
                              </div>
                            )}

                            {inlineEditing && renderPantryForm(true)}
                          </article>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {itemToFinish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#26352D]/35 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !shoppingActionId
            ) {
              setItemToFinish(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-pantry-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDE8DF] text-xl">
              🛒
            </div>

            <h2
              id="finish-pantry-title"
              className="text-lg font-semibold text-[#26352D]"
            >
              ¿Se te ha acabado {itemToFinish.name}?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-[#788675]">
              ¿Quieres añadirlo también a la lista de la compra? En cualquier
              caso, desaparecerá de tu almacén.
            </p>

            {errorMessage && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-[#FBF0EC] px-3 py-2 text-sm text-[#955F53]"
              >
                {errorMessage}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void finishPantryItem(true)}
                disabled={shoppingActionId === itemToFinish.id}
                className="w-full rounded-xl bg-[#52685A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#405547] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shoppingActionId === itemToFinish.id
                  ? "Guardando…"
                  : "Sí, añadir a la compra"}
              </button>

              <button
                type="button"
                onClick={() => void finishPantryItem(false)}
                disabled={shoppingActionId === itemToFinish.id}
                className="w-full rounded-xl bg-[#F1EFE8] px-4 py-3 text-sm font-medium text-[#52685A] transition hover:bg-[#E8E5DC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                No, solo quitar del almacén
              </button>

              <button
                type="button"
                onClick={() => setItemToFinish(null)}
                disabled={shoppingActionId === itemToFinish.id}
                className="w-full px-4 py-2 text-sm text-[#92958B] hover:text-[#52685A] disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
