
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ShoppingCategoryManager, {
  type ShoppingCategory,
} from "@/app/components/ShoppingCategoryManager";
import {
  DEFAULT_CATEGORY_NAMES,
  resolveAutomaticCategory,
} from "@/lib/ingredient-category";

type PantryItem = {
  id: number;
  ingredientId: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
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
  is_opened: boolean;
  opened_at: string | null;
  expiry_date: string | null;
  use_soon: boolean;
};

const inputClass =
  "w-full rounded-xl border border-[#E1DED5] bg-[#FBFAF7] px-3 py-2 text-sm text-[#30352C] outline-none placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8]";

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
  if (item.quantity === null) return "Cantidad sin especificar";
  return `${formatNumber(item.quantity)}${item.unit ? ` ${item.unit}` : ""}`;
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
  const days = Math.round((expiry.getTime() - todayDate.getTime()) / 86400000);

  if (days < 0)
    return { label: "Fecha pasada", className: "bg-[#FBF0EC] text-[#A16E63]" };
  if (days === 0)
    return { label: "Caduca hoy", className: "bg-[#F8EBDD] text-[#A16E43]" };
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

  return {
    label: `Caduca ${new Date(`${expiryDate}T12:00:00`).toLocaleDateString("es-ES")}`,
    className: "bg-[#F0F2EB] text-[#788675]",
  };
}

export default function AlmacenPage() {
  const router = useRouter();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [isOpened, setIsOpened] = useState(false);
  const [openedAt, setOpenedAt] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [useSoon, setUseSoon] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [shoppingActionId, setShoppingActionId] = useState<number | null>(null);
  const [shoppingMessage, setShoppingMessage] = useState("");

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

      const { data: savedCategories, error: categoriesError } = await supabase
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

      const { data: assignmentRows, error: assignmentsError } = await supabase
        .from("ingredient_category_assignments")
        .select("ingredient_id, category_id")
        .eq("user_id", user.id);

      if (assignmentsError) throw assignmentsError;

      const assignments: Record<number, number> = {};
      (assignmentRows || []).forEach((row) => {
        assignments[Number(row.ingredient_id)] = Number(row.category_id);
      });

      const categoryNameById = new Map(
        categoryRows.map((category) => [Number(category.id), category.name])
      );

      const { data: pantryData, error: pantryError } = await supabase
        .from("pantry")
        .select(
          "id, ingredient_id, quantity, unit, is_opened, opened_at, expiry_date, use_soon"
        )
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (pantryError) throw pantryError;

      const rows = (pantryData || []) as PantryRow[];
      const ingredientIds = [...new Set(rows.map((row) => row.ingredient_id))];
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
          item.category === oldName ? { ...item, category: name.trim() } : item
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
    setCategories((current) => current.filter((category) => category.id !== id));
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

    const selected = categories.find((category) => category.id === categoryId);
    if (!selected) return;

    setItems((current) =>
      current.map((entry) =>
        entry.ingredientId === item.ingredientId
          ? { ...entry, category: selected.name }
          : entry
      )
    );
  }

  // Guarda cambios rápidos desde la propia tarjeta del ingrediente.
  async function updateConservation(
    item: PantryItem,
    changes: Partial<Pick<PantryItem, "isOpened" | "openedAt" | "expiryDate" | "useSoon">>
  ) {
    if (updatingItemId === item.id) return;

    const next = { ...item, ...changes };

    if (next.openedAt && !next.isOpened) {
      setErrorMessage("Marca el producto como abierto para guardar su fecha de apertura.");
      return;
    }

    if (next.openedAt && next.expiryDate && next.openedAt > next.expiryDate) {
      setErrorMessage("La fecha de apertura no puede ser posterior a la caducidad.");
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
      setErrorMessage("No se ha podido actualizar el ingrediente. Inténtalo de nuevo.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  function resetForm() {
    setName("");
    setQuantity("");
    setUnit("");
    setIsOpened(false);
    setOpenedAt("");
    setExpiryDate("");
    setUseSoon(false);
    setEditingId(null);
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
      setErrorMessage("Marca el producto como abierto para guardar la fecha de apertura.");
      return;
    }

    if (openedAt && expiryDate && openedAt > expiryDate) {
      setErrorMessage("La fecha de apertura no puede ser posterior a la fecha de caducidad.");
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
            ...conservation,
          })
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const existing = items.find(
          (item) =>
            item.ingredientId === ingredientId ||
            item.name.trim().toLocaleLowerCase("es") ===
              cleanName.toLocaleLowerCase("es")
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
            .update({ quantity: finalQuantity, unit: finalUnit })
            .eq("id", existing.id)
            .eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("pantry").insert({
            user_id: user.id,
            ingredient_id: ingredientId,
            quantity: parsedQuantity,
            unit: normalizedUnit,
            ...conservation,
          });
          if (error) throw error;
        }
      }

      resetForm();
      await loadItems();
    } catch (error) {
      console.error("Error guardando ingrediente:", error);
      setErrorMessage("No se ha podido guardar el ingrediente. Comprueba los datos e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(item: PantryItem) {
    setEditingId(item.id);
    setName(item.name);
    setQuantity(item.quantity === null ? "" : String(item.quantity));
    setUnit(item.unit || "");
    setIsOpened(item.isOpened);
    setOpenedAt(item.openedAt);
    setExpiryDate(item.expiryDate);
    setUseSoon(item.useSoon);
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeItem(item: PantryItem) {
    if (!window.confirm(`¿Quieres eliminar ${item.name} de tu almacén?`)) return;

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

  async function addPantryItemToShoppingList(item: PantryItem) {
    if (shoppingActionId === item.id) return;

    setShoppingActionId(item.id);
    setShoppingMessage("");

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

      const { error: removeError } = await supabase
        .from("pantry")
        .delete()
        .eq("id", item.id)
        .eq("user_id", user.id);
      if (removeError) throw removeError;

      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setShoppingMessage(
        existing
          ? `${item.name} se ha añadido a la compra y quitado del almacén.`
          : `${item.name}: añadido a «Mi lista» y quitado del almacén.`
      );
    } catch (error) {
      console.error("Error pasando ingrediente a la compra:", error);
      setShoppingMessage("No se ha podido añadir el ingrediente. Inténtalo de nuevo.");
    } finally {
      setShoppingActionId(null);
    }
  }

  const filteredItems = items
    .filter((item) =>
      item.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))
    )
    .sort((a, b) => {
      const aUrgent = a.useSoon || Boolean(getExpiryInfo(a.expiryDate));
      const bUrgent = b.useSoon || Boolean(getExpiryInfo(b.expiryDate));
      if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
      if (a.expiryDate && b.expiryDate)
        return a.expiryDate.localeCompare(b.expiryDate);
      if (a.expiryDate) return -1;
      if (b.expiryDate) return 1;
      if (a.useSoon !== b.useSoon) return a.useSoon ? -1 : 1;
      return a.name.localeCompare(b.name, "es");
    });

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-3 py-4 pb-24 text-[#26352D] sm:px-6 sm:py-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/compra"
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-[#52685A] shadow-sm transition hover:bg-[#F0F1E9]"
        >
          <span aria-hidden="true">←</span> Volver a la compra
        </Link>

        <header className="mb-5 mt-4">
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
                {items.length} {items.length === 1 ? "ingrediente" : "ingredientes"}
              </p>
              <p className="text-xs text-[#52685A]">
                Marca lo abierto y prioriza lo que quieras gastar.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="font-semibold">
              {editingId !== null ? "Editar ingrediente" : "Añadir ingrediente"}
            </h2>
            <p className="mt-0.5 text-xs text-[#788675]">
              Las cantidades, fechas y prioridades son opcionales.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Ingrediente
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveItem();
                  }
                }}
                placeholder="Ej. Arroz"
                className={`${inputClass} mt-1`}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm font-medium">
                Cantidad <span className="font-normal text-[#9A9E94]">(opcional)</span>
                <input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 500"
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium">
                Unidad <span className="font-normal text-[#9A9E94]">(opcional)</span>
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
                  className={`${inputClass} mt-1`}
                />
              </label>
            </div>
          </div>

          <details className="mt-3 rounded-xl bg-[#F7F5EF] px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-[#52685A]">
              Conservación y fechas
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isOpened}
                  onChange={(event) => {
                    setIsOpened(event.target.checked);
                    if (!event.target.checked) setOpenedAt("");
                  }}
                  className="h-4 w-4 accent-[#52685A]"
                />
                Producto abierto
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useSoon}
                  onChange={(event) => setUseSoon(event.target.checked)}
                  className="h-4 w-4 accent-[#52685A]"
                />
                Hay que gastarlo pronto
              </label>

              <label className="text-sm font-medium">
                Fecha de apertura
                <input
                  type="date"
                  value={openedAt}
                  onChange={(event) => setOpenedAt(event.target.value)}
                  disabled={!isOpened}
                  className={`${inputClass} mt-1 disabled:opacity-50`}
                />
              </label>

              <label className="text-sm font-medium">
                Fecha de caducidad
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>
            </div>
          </details>

          {errorMessage && (
            <p role="alert" className="mt-3 rounded-xl bg-[#FBF0EC] px-3 py-2 text-sm text-[#955F53]">
              {errorMessage}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveItem()}
              disabled={saving || !name.trim()}
              className="rounded-xl bg-[#52685A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#405547] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Guardando…"
                : editingId !== null
                  ? "Guardar cambios"
                  : "Añadir al almacén"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-[#F1EFE8] px-4 py-2.5 text-sm text-[#52685A] hover:bg-[#E8E5DC]"
              >
                Cancelar
              </button>
            )}
          </div>
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
                Los alimentos prioritarios aparecen primero.
              </p>
            </div>
            <span className="rounded-full bg-[#E8E9E0] px-2.5 py-1 text-xs font-semibold text-[#52685A]">
              {filteredItems.length}
            </span>
          </div>

          {shoppingMessage && (
            <p role="status" className="mb-3 rounded-xl bg-[#E7EDE3] px-3 py-2 text-sm text-[#52685A]">
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
              <p className="mt-3 text-sm text-[#788675]">Cargando tu almacén…</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl bg-white px-5 py-8 text-center shadow-sm">
              <div className="text-3xl">{search ? "🔎" : "🧺"}</div>
              <h3 className="mt-2 text-sm font-semibold">
                {search ? "No encontramos ese ingrediente" : "Tu almacén está vacío"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-[#788675]">
                {search
                  ? "Prueba con otro nombre o borra la búsqueda."
                  : "Añade lo que tienes en casa para organizar tus alimentos."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories
                .filter((category) =>
                  filteredItems.some((item) => item.category === category.name)
                )
                .map((category) => {
                  const categoryItems = filteredItems.filter(
                    (item) => item.category === category.name
                  );

                  return (
                    <section
                      key={category.id}
                      className="rounded-2xl bg-white px-3 py-2.5 shadow-sm"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{category.name}</h3>
                        <span className="rounded-full bg-[#F0F2EB] px-2 py-0.5 text-[11px] font-semibold text-[#52685A]">
                          {categoryItems.length}
                        </span>
                      </div>

                      <div className="divide-y divide-[#EEECE5]">
                        {categoryItems.map((item) => {
                          const expiryInfo = getExpiryInfo(item.expiryDate);
                          const updating = updatingItemId === item.id;

                          return (
                            <article
                              key={item.id}
                              className="flex items-start gap-2 py-2 first:pt-1 last:pb-1"
                            >
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0F2EB] text-base">
                                🥗
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <h4 className="max-w-full truncate text-sm font-semibold">
                                    {item.name}
                                  </h4>
                                  <span className="text-[11px] text-[#92958B]">
                                    {formatQuantity(item)}
                                  </span>
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <select
                                    value={item.isOpened ? "opened" : "closed"}
                                    disabled={updating}
                                    onChange={(event) =>
                                      void updateConservation(item, {
                                        isOpened: event.target.value === "opened",
                                        openedAt:
                                          event.target.value === "opened"
                                            ? item.openedAt
                                            : "",
                                      })
                                    }
                                    aria-label={`Estado de ${item.name}`}
                                    className={`max-w-full rounded-lg border-0 px-2 py-1 text-[11px] font-semibold outline-none disabled:opacity-50 ${
                                      item.isOpened
                                        ? "bg-[#F8EBDD] text-[#916B43]"
                                        : "bg-[#E7EDE3] text-[#52685A]"
                                    }`}
                                  >
                                    <option value="closed">Cerrado</option>
                                    <option value="opened">Abierto</option>
                                  </select>

                                  {item.useSoon && (
                                    <span className="rounded-lg bg-[#FBF0EC] px-2 py-1 text-[11px] font-medium text-[#A16E63]">
                                      Gastar pronto
                                    </span>
                                  )}

                                  {expiryInfo && (
                                    <span className={`rounded-lg px-2 py-1 text-[11px] font-medium ${expiryInfo.className}`}>
                                      {expiryInfo.label}
                                    </span>
                                  )}

                                  {updating && (
                                    <span className="text-[11px] text-[#788675]">Guardando…</span>
                                  )}
                                </div>

                                <details className="mt-1.5">
                                  <summary className="w-fit cursor-pointer text-[11px] text-[#788675] hover:text-[#52685A]">
                                    Fechas y prioridad
                                  </summary>
                                  <div className="mt-2 grid max-w-md gap-2 rounded-xl bg-[#F7F5EF] p-2 sm:grid-cols-2">
                                    <label className="text-xs font-medium">
                                      Fecha de apertura
                                      <input
                                        type="date"
                                        value={item.openedAt}
                                        disabled={!item.isOpened || updating}
                                        onChange={(event) =>
                                          void updateConservation(item, {
                                            openedAt: event.target.value,
                                          })
                                        }
                                        className="mt-1 w-full rounded-lg border border-[#E1DED5] bg-white px-2 py-1.5 text-xs disabled:opacity-40"
                                      />
                                    </label>

                                    <label className="text-xs font-medium">
                                      Fecha de caducidad
                                      <input
                                        type="date"
                                        value={item.expiryDate}
                                        disabled={updating}
                                        onChange={(event) =>
                                          void updateConservation(item, {
                                            expiryDate: event.target.value,
                                          })
                                        }
                                        className="mt-1 w-full rounded-lg border border-[#E1DED5] bg-white px-2 py-1.5 text-xs disabled:opacity-40"
                                      />
                                    </label>

                                    <label className="flex cursor-pointer items-center gap-2 text-xs sm:col-span-2">
                                      <input
                                        type="checkbox"
                                        checked={item.useSoon}
                                        disabled={updating}
                                        onChange={(event) =>
                                          void updateConservation(item, {
                                            useSoon: event.target.checked,
                                          })
                                        }
                                        className="h-3.5 w-3.5 accent-[#52685A]"
                                      />
                                      Hay que gastarlo pronto
                                    </label>
                                  </div>
                                </details>

                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                  <label className="flex items-center gap-1 text-[11px] text-[#788675]">
                                    Categoría
                                    <select
                                      value={
                                        categories.find(
                                          (option) => option.name === item.category
                                        )?.id ?? ""
                                      }
                                      onChange={(event) =>
                                        void changePantryCategory(item, Number(event.target.value))
                                      }
                                      aria-label={`Categoría de ${item.name}`}
                                      className="max-w-[150px] rounded-lg border border-[#E1DED5] bg-[#FBFAF7] px-1.5 py-1 text-[11px] text-[#52685A] outline-none focus:border-[#879078]"
                                    >
                                      {categories.map((option) => (
                                        <option key={option.id} value={option.id}>
                                          {option.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => void addPantryItemToShoppingList(item)}
                                    disabled={shoppingActionId === item.id}
                                    className="rounded-lg bg-[#F0F2EB] px-2.5 py-1.5 text-[11px] font-semibold text-[#52685A] transition hover:bg-[#E2E8DC] disabled:opacity-50"
                                  >
                                    {shoppingActionId === item.id
                                      ? "Añadiendo…"
                                      : "Se me ha acabado"}
                                  </button>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => startEditing(item)}
                                  aria-label={`Editar ${item.name}`}
                                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-[#52685A] hover:bg-[#F0F2EB]"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void removeItem(item)}
                                  aria-label={`Eliminar ${item.name}`}
                                  className="rounded-lg px-2 py-1.5 text-sm text-[#A16E63] hover:bg-[#FBF0EC]"
                                >
                                  ×
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
