
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
};

type PantryRow = {
  id: number;
  ingredient_id: number;
  quantity: number | null;
  unit: string | null;
};

const inputClass =
  "w-full rounded-2xl border border-[#E1DED5] bg-[#FBFAF7] px-4 py-3 text-sm text-[#30352C] outline-none placeholder:text-[#A6A99E] focus:border-[#879078] focus:ring-2 focus:ring-[#DDE2D8]";

function normalizeUnit(unit: string | null): string | null {
  if (!unit?.trim()) return null;

  const value = unit.toLowerCase().trim();

  if (["g", "gr", "gramo", "gramos"].includes(value)) return "g";
  if (
    ["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(value)
  )
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

export default function AlmacenPage() {
  const router = useRouter();

  const [items, setItems] = useState<PantryItem[]>([]);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
        const { data: insertedCategories, error: insertCategoriesError } =
          await supabase
            .from("shopping_categories")
            .insert(
              DEFAULT_CATEGORY_NAMES.map((categoryName, index) => ({
                user_id: user.id,
                name: categoryName,
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
        .select("id, ingredient_id, quantity, unit")
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (pantryError) throw pantryError;

      const rows = (pantryData || []) as PantryRow[];
      const ingredientIds = [
        ...new Set(rows.map((row) => row.ingredient_id)),
      ];

      let ingredientMap = new Map<number, string>();

      if (ingredientIds.length > 0) {
        const { data: ingredientsData, error: ingredientsError } =
          await supabase
            .from("ingredients")
            .select("id, name")
            .in("id", ingredientIds);

        if (ingredientsError) throw ingredientsError;

        ingredientMap = new Map(
          (ingredientsData || []).map((ingredient) => [
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
            quantity:
              row.quantity === null ? null : Number(row.quantity),
            unit: normalizeUnit(row.unit),
            category:
              assignedCategory ||
              resolveAutomaticCategory(ingredientName, categoryRows),
          };
        })
      );
    } catch (error) {
      console.error("Error cargando el almacén:", error);
      setErrorMessage(
        "No hemos podido cargar tu almacén. Inténtalo de nuevo."
      );
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
    const oldName = categories.find(
      (category) => category.id === id
    )?.name;

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

  async function changePantryCategory(
    item: PantryItem,
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
      setErrorMessage(
        "No se ha podido guardar la categoría del ingrediente."
      );
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

  function resetForm() {
    setName("");
    setQuantity("");
    setUnit("");
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
      setErrorMessage(
        "Introduce una cantidad válida, igual o mayor que cero."
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

      if (editingId !== null) {
        const { error } = await supabase
          .from("pantry")
          .update({
            ingredient_id: ingredientId,
            quantity: parsedQuantity,
            unit: normalizedUnit,
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
            const existingBase = toBase(
              existing.quantity,
              existing.unit
            );
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
    setEditingId(item.id);
    setName(item.name);
    setQuantity(item.quantity === null ? "" : String(item.quantity));
    setUnit(item.unit || "");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeItem(item: PantryItem) {
    const confirmed = window.confirm(
      `¿Quieres eliminar ${item.name} de tu almacén?`
    );

    if (!confirmed) return;

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
          const { error: resetError } = await supabase
            .from("shopping_list")
            .update({ checked: false })
            .eq("id", existing.id)
            .eq("user_id", user.id);
          if (resetError) throw resetError;
          setShoppingMessage(`${item.name} ya estaba en la lista; lo he vuelto a marcar como pendiente.`);
        } else {
          setShoppingMessage(`${item.name} ya está en la lista de compra.`);
        }
        return;
      }

      const { error: insertError } = await supabase.from("shopping_list").insert({
        user_id: user.id,
        ingredient_id: item.ingredientId,
        name: item.name,
        quantity: item.quantity,
        unit: normalizeUnit(item.unit),
        checked: false,
      });

      if (insertError) throw insertError;
      setShoppingMessage(`${item.name} se ha añadido a «Mi lista».`);
    } catch (error) {
      console.error("Error pasando ingrediente a la lista de compra:", error);
      setShoppingMessage("No se ha podido añadir el ingrediente. Inténtalo de nuevo.");
    } finally {
      setShoppingActionId(null);
    }
  }

  const filteredItems = items.filter((item) =>
    item.name
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es"))
  );

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-4 py-6 pb-28 text-[#26352D] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/compra"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#52685A] shadow-sm transition hover:bg-[#F0F1E9]"
        >
          <span aria-hidden="true">←</span> Volver a la compra
        </Link>

        <header className="mb-7 mt-6">
          <p className="text-sm font-medium tracking-wide text-[#788675]">
            TU COCINA, BAJO CONTROL
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Mi almacén
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#788675]">
            Lo que tienes en casa, organizado para comprar solo lo que necesitas.
          </p>

          <div className="mt-5 flex items-center gap-3 rounded-3xl bg-[#DDE8DF] p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-2xl">
              🥬
            </div>
            <div>
              <p className="font-semibold">
                {items.length}{" "}
                {items.length === 1
                  ? "ingrediente guardado"
                  : "ingredientes guardados"}
              </p>
              <p className="mt-0.5 text-sm text-[#52685A]">
                Las cantidades ayudan a calcular tu lista de compra.
              </p>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {editingId !== null ? "Editar ingrediente" : "Añadir ingrediente"}
            </h2>
            <p className="mt-1 text-sm text-[#788675]">
              Si ya tienes ese ingrediente, puedes actualizar su cantidad.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <label className="text-sm font-medium">
              Cantidad{" "}
              <span className="font-normal text-[#9A9E94]">(opcional)</span>
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputMode="decimal"
                placeholder="Ej. 500"
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <label className="text-sm font-medium sm:col-span-2">
              Unidad{" "}
              <span className="font-normal text-[#9A9E94]">(opcional)</span>
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveItem();
                  }
                }}
                placeholder="g, kg, ml, l, unidades…"
                className={`${inputClass} mt-1.5`}
              />
            </label>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-[#FBF0EC] px-4 py-3 text-sm text-[#955F53]"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveItem()}
              disabled={saving || !name.trim()}
              className="rounded-2xl bg-[#52685A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#405547] disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-2xl bg-[#F1EFE8] px-5 py-3 text-sm font-medium text-[#52685A] transition hover:bg-[#E8E5DC]"
              >
                Cancelar
              </button>
            )}
          </div>
        </section>

        <details className="mb-5 rounded-2xl px-1 py-2">
          <summary className="cursor-pointer list-none text-xs font-medium text-[#92958B] transition hover:text-[#52685A]">
            ⚙️ Organizar categorías
          </summary>
          <div className="mt-3">
            <ShoppingCategoryManager
              categories={categories}
              onCreate={createCategory}
              onRename={renameCategory}
              onDelete={deleteCategory}
            />
          </div>
        </details>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Lo que tengo en casa</h2>
              <p className="mt-1 text-sm text-[#788675]">
                Consulta y actualiza tus ingredientes.
              </p>
            </div>
            <span className="rounded-full bg-[#E8E9E0] px-3 py-1 text-xs font-semibold text-[#52685A]">
              {items.length}
            </span>
          </div>

          {shoppingMessage && (
            <p role="status" className="mb-3 rounded-2xl bg-[#E7EDE3] px-4 py-3 text-sm text-[#52685A]">
              {shoppingMessage}
            </p>
          )}

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ingrediente…"
            aria-label="Buscar ingrediente"
            className={`${inputClass} mb-4`}
          />

          {loading ? (
            <div className="rounded-3xl bg-white px-5 py-12 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D8D5CB] border-t-[#52685A]" />
              <p className="mt-4 text-sm text-[#788675]">
                Cargando tu almacén…
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-sm">
              <div className="text-4xl">{search ? "🔎" : "🧺"}</div>
              <h3 className="mt-3 font-semibold">
                {search
                  ? "No encontramos ese ingrediente"
                  : "Tu almacén está vacío"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#788675]">
                {search
                  ? "Prueba con otro nombre o borra la búsqueda."
                  : "Añade lo que tienes en casa y lo tendremos en cuenta al preparar tu lista de compra."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
                      className="rounded-3xl bg-white p-4 shadow-sm sm:p-5"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold">{category.name}</h3>
                        <span className="rounded-full bg-[#F0F2EB] px-2.5 py-1 text-xs font-semibold text-[#52685A]">
                          {categoryItems.length}
                        </span>
                      </div>

                      <div className="divide-y divide-[#EEECE5]">
                        {categoryItems.map((item) => (
                          <article
                            key={item.id}
                            className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F0F2EB] text-xl">
                              🥗
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-semibold">
                                {item.name}
                              </h3>
                              <p className="mt-1 text-sm text-[#788675]">
                                {formatQuantity(item)}
                              </p>

                              <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#788675]">
                                <span>Categoría</span>
                                <select
                                  value={
                                    categories.find(
                                      (option) =>
                                        option.name === item.category
                                    )?.id ?? ""
                                  }
                                  onChange={(event) =>
                                    void changePantryCategory(
                                      item,
                                      Number(event.target.value)
                                    )
                                  }
                                  aria-label={`Categoría de ${item.name}`}
                                  className="max-w-full rounded-xl border border-[#E1DED5] bg-[#FBFAF7] px-2 py-1.5 text-xs text-[#52685A] outline-none focus:border-[#879078]"
                                >
                                  {categories.map((option) => (
                                    <option
                                      key={option.id}
                                      value={option.id}
                                    >
                                      {option.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                onClick={() => void addPantryItemToShoppingList(item)}
                                disabled={shoppingActionId === item.id}
                                className="mt-2 rounded-xl bg-[#F0F2EB] px-3 py-2 text-xs font-semibold text-[#52685A] transition hover:bg-[#E2E8DC] disabled:opacity-50"
                              >
                                {shoppingActionId === item.id ? "Añadiendo…" : "Añadir a la compra"}
                              </button>
                            </div>

                            <div className="flex shrink-0 gap-1">
                              <button
                                type="button"
                                onClick={() => startEditing(item)}
                                aria-label={`Editar ${item.name}`}
                                className="rounded-xl px-3 py-2 text-sm font-medium text-[#52685A] transition hover:bg-[#F0F2EB]"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeItem(item)}
                                aria-label={`Eliminar ${item.name}`}
                                className="rounded-xl px-3 py-2 text-sm font-medium text-[#A16E63] transition hover:bg-[#FBF0EC]"
                              >
                                ×
                              </button>
                            </div>
                          </article>
                        ))}
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
