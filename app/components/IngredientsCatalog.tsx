
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import IngredientAutocomplete from "@/app/components/IngredientAutocomplete";

type Ingredient = { id: number; name: string };

type IngredientTag = {
  id: string;
  name: string;
  color: string;
};

type TagAssignment = {
  ingredient_id: number;
  tag_id: string;
};

type PantryPresence = {
  ingredient_id: number;
  location: string;
};

type ShoppingPresence = {
  ingredient_id: number;
  checked: boolean;
};

type ContextMenu = {
  ingredient: Ingredient;
  x: number;
  y: number;
};

const TAG_COLORS = [
  "#DDE8DF",
  "#F4E4D8",
  "#E6E1F0",
  "#F3EBCB",
  "#DCE8EF",
  "#F0DFE2",
];

const PANTRY_LOCATIONS = [
  "Nevera",
  "Armario",
  "Congelador",
  "Especias",
];

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export default function IngredientsCatalog() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [tags, setTags] = useState<IngredientTag[]>([]);
  const [assignments, setAssignments] = useState<TagAssignment[]>([]);
  const [pantryPresence, setPantryPresence] = useState<PantryPresence[]>([]);
  const [shoppingPresence, setShoppingPresence] = useState<ShoppingPresence[]>([]);

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [newIngredient, setNewIngredient] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [choosingLocation, setChoosingLocation] = useState(false);
  const [actionIngredientId, setActionIngredientId] = useState<number | null>(null);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  function clearPressTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressStart.current = null;
  }

  function closeContextMenu() {
    setContextMenu(null);
    setChoosingLocation(false);
  }

  function openContextMenu(
    ingredient: Ingredient,
    clientX: number,
    clientY: number
  ) {
    const menuWidth = 240;
    const menuHeight = 190;

    const x = Math.max(
      12,
      Math.min(clientX, window.innerWidth - menuWidth - 12)
    );

    const y = Math.max(
      12,
      Math.min(clientY, window.innerHeight - menuHeight - 12)
    );

    setContextMenu({ ingredient, x, y });
    setChoosingLocation(false);
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLElement>,
    ingredient: Ingredient
  ) {
    if (event.pointerType !== "touch") return;

    clearPressTimer();
    longPressTriggered.current = false;

    pressStart.current = {
      x: event.clientX,
      y: event.clientY,
    };

    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      openContextMenu(
        ingredient,
        event.clientX,
        event.clientY
      );
    }, 550);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!pressStart.current || !pressTimer.current) return;

    const distanceX = Math.abs(event.clientX - pressStart.current.x);
    const distanceY = Math.abs(event.clientY - pressStart.current.y);

    if (distanceX > 10 || distanceY > 10) {
      clearPressTimer();
    }
  }

  async function refreshPresence(userId: string) {
    const [pantryResult, shoppingResult] = await Promise.all([
      supabase
        .from("pantry")
        .select("ingredient_id, location")
        .eq("user_id", userId),

      supabase
        .from("shopping_list")
        .select("ingredient_id, checked")
        .eq("user_id", userId),
    ]);

    if (pantryResult.error) throw pantryResult.error;
    if (shoppingResult.error) throw shoppingResult.error;

    setPantryPresence(
      (pantryResult.data || []).map((item) => ({
        ingredient_id: Number(item.ingredient_id),
        location: item.location || "Sin ubicación",
      }))
    );

    setShoppingPresence(
      (shoppingResult.data || []).map((item) => ({
        ingredient_id: Number(item.ingredient_id),
        checked: Boolean(item.checked),
      }))
    );
  }

  async function loadCatalog() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        throw new Error("Inicia sesión para consultar tus ingredientes.");
      }

      const [
        ingredientResult,
        tagResult,
        assignmentResult,
        pantryResult,
        shoppingResult,
      ] = await Promise.all([
        supabase
          .from("ingredients")
          .select("id, name")
          .order("name", { ascending: true }),

        supabase
          .from("ingredient_tags")
          .select("id, name, color")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),

        supabase
          .from("ingredient_tag_assignments")
          .select("ingredient_id, tag_id")
          .eq("user_id", user.id),

        supabase
          .from("pantry")
          .select("ingredient_id, location")
          .eq("user_id", user.id),

        supabase
          .from("shopping_list")
          .select("ingredient_id, checked")
          .eq("user_id", user.id),
      ]);

      if (ingredientResult.error) throw ingredientResult.error;
      if (tagResult.error) throw tagResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      if (pantryResult.error) throw pantryResult.error;
      if (shoppingResult.error) throw shoppingResult.error;

      setIngredients((ingredientResult.data || []) as Ingredient[]);
      setTags((tagResult.data || []) as IngredientTag[]);
      setAssignments((assignmentResult.data || []) as TagAssignment[]);

      setPantryPresence(
        (pantryResult.data || []).map((item) => ({
          ingredient_id: Number(item.ingredient_id),
          location: item.location || "Sin ubicación",
        }))
      );

      setShoppingPresence(
        (shoppingResult.data || []).map((item) => ({
          ingredient_id: Number(item.ingredient_id),
          checked: Boolean(item.checked),
        }))
      );
    } catch (err) {
      console.error("Error cargando el catálogo de ingredientes:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido cargar el catálogo."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalog();

    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-ingredient-context-menu]")) {
        closeContextMenu();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeContextMenu();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  const visibleIngredients = useMemo(() => {
    const term = normalizeText(search);

    return ingredients.filter((ingredient) => {
      const matchesSearch =
        !term || normalizeText(ingredient.name).includes(term);

      const ingredientAssignments = assignments.filter(
        (assignment) => assignment.ingredient_id === ingredient.id
      );

      const matchesTag =
        selectedTag === "all" ||
        (selectedTag === "untagged"
          ? ingredientAssignments.length === 0
          : ingredientAssignments.some(
              (assignment) => assignment.tag_id === selectedTag
            ));

      return matchesSearch && matchesTag;
    });
  }, [ingredients, search, selectedTag, assignments]);

  function getIngredientStatus(ingredientId: number) {
    const inPantry = pantryPresence.some(
      (item) => item.ingredient_id === ingredientId
    );

    const inShoppingList = shoppingPresence.some(
      (item) =>
        item.ingredient_id === ingredientId && !item.checked
    );

    if (inPantry && inShoppingList) return "En ambos";
    if (inPantry) return "En almacén";
    if (inShoppingList) return "En la compra";

    return "Sin asignar";
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "En almacén":
        return "bg-[#E7EDE3] text-[#52685A]";
      case "En la compra":
        return "bg-[#F4E9D9] text-[#886B42]";
      case "En ambos":
        return "bg-[#E8E3F0] text-[#6D6088]";
      default:
        return "bg-[#F1F0EB] text-[#898C83]";
    }
  }

  async function addToShoppingList(ingredient: Ingredient) {
    setActionIngredientId(ingredient.id);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Inicia sesión para actualizar tu lista.");

      const { data: existingRows, error: searchError } = await supabase
        .from("shopping_list")
        .select("id, checked")
        .eq("user_id", user.id)
        .eq("ingredient_id", ingredient.id)
        .order("id", { ascending: false });

      if (searchError) throw searchError;

      const rows = existingRows || [];
      const pendingItem = rows.find((item) => !item.checked);
      const purchasedItem = rows.find((item) => item.checked);

      if (pendingItem) {
        setMessage(`${ingredient.name} ya está pendiente en tu lista.`);
      } else if (purchasedItem) {
        const { error: updateError } = await supabase
          .from("shopping_list")
          .update({ checked: false })
          .eq("id", purchasedItem.id)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        setMessage(`${ingredient.name} ha vuelto a tu lista de la compra.`);
      } else {
        const { error: insertError } = await supabase
          .from("shopping_list")
          .insert({
            user_id: user.id,
            ingredient_id: ingredient.id,
            name: ingredient.name,
            quantity: null,
            unit: null,
            checked: false,
          });

        if (insertError) throw insertError;

        setMessage(`${ingredient.name} se ha añadido a la lista de la compra.`);
      }

      await refreshPresence(user.id);
      closeContextMenu();
    } catch (err) {
      console.error("Error añadiendo ingrediente a la compra:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido añadir a la lista de la compra."
      );
    } finally {
      setActionIngredientId(null);
    }
  }

  async function addToPantry(ingredient: Ingredient, location: string) {
    setActionIngredientId(ingredient.id);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Inicia sesión para actualizar tu almacén.");

      const { data: existing, error: searchError } = await supabase
        .from("pantry")
        .select("id")
        .eq("user_id", user.id)
        .eq("ingredient_id", ingredient.id)
        .eq("location", location)
        .limit(1)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existing) {
        setMessage(
          `${ingredient.name} ya está en ${location.toLowerCase()}. No he modificado sus existencias.`
        );
      } else {
        const { error: insertError } = await supabase
          .from("pantry")
          .insert({
            user_id: user.id,
            ingredient_id: ingredient.id,
            quantity: null,
            unit: null,
            location,
            is_opened: false,
            opened_at: null,
            expiry_date: null,
            use_soon: false,
          });

        if (insertError) throw insertError;

        setMessage(
          `${ingredient.name} se ha añadido al almacén: ${location}.`
        );
      }

      await refreshPresence(user.id);
      closeContextMenu();
    } catch (err) {
      console.error("Error añadiendo ingrediente al almacén:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido añadir al almacén."
      );
    } finally {
      setActionIngredientId(null);
    }
  }

  async function createTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = newTag.trim();
    if (!cleanName || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Inicia sesión para crear etiquetas.");

      const { data, error: insertError } = await supabase
        .from("ingredient_tags")
        .insert({
          user_id: user.id,
          name: cleanName,
          color: newTagColor,
        })
        .select("id, name, color")
        .single();

      if (insertError) throw insertError;

      setTags((current) =>
        [...current, data as IngredientTag].sort((a, b) =>
          a.name.localeCompare(b.name, "es")
        )
      );

      setNewTag("");
      setMessage("Etiqueta creada.");
    } catch (err) {
      console.error("Error creando etiqueta:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido crear la etiqueta."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveTag(tag: IngredientTag) {
    const cleanName = editingTagName.trim();
    if (!cleanName) return;

    setSaving(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No hay una sesión activa.");

      const { error: updateError } = await supabase
        .from("ingredient_tags")
        .update({ name: cleanName })
        .eq("id", tag.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setTags((current) =>
        current.map((entry) =>
          entry.id === tag.id ? { ...entry, name: cleanName } : entry
        )
      );

      setEditingTagId(null);
      setEditingTagName("");
    } catch (err) {
      console.error("Error actualizando etiqueta:", err);
      setError("No se ha podido modificar la etiqueta.");
    } finally {
      setSaving(false);
    }
  }

  async function changeTagColor(tag: IngredientTag, color: string) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No hay una sesión activa.");

      const { error: updateError } = await supabase
        .from("ingredient_tags")
        .update({ color })
        .eq("id", tag.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setTags((current) =>
        current.map((entry) =>
          entry.id === tag.id ? { ...entry, color } : entry
        )
      );
    } catch (err) {
      console.error("Error cambiando color de etiqueta:", err);
      setError("No se ha podido cambiar el color.");
    }
  }

  async function deleteTag(tag: IngredientTag) {
    if (
      !window.confirm(
        `¿Eliminar la etiqueta «${tag.name}»? Los ingredientes no se eliminarán.`
      )
    ) {
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No hay una sesión activa.");

      const { error: deleteError } = await supabase
        .from("ingredient_tags")
        .delete()
        .eq("id", tag.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setTags((current) =>
        current.filter((entry) => entry.id !== tag.id)
      );

      setAssignments((current) =>
        current.filter((entry) => entry.tag_id !== tag.id)
      );

      if (selectedTag === tag.id) setSelectedTag("all");
    } catch (err) {
      console.error("Error eliminando etiqueta:", err);
      setError("No se ha podido eliminar la etiqueta.");
    }
  }

  async function toggleAssignment(ingredientId: number, tagId: string) {
    const exists = assignments.some(
      (entry) =>
        entry.ingredient_id === ingredientId && entry.tag_id === tagId
    );

    const previous = assignments;

    setAssignments((current) =>
      exists
        ? current.filter(
            (entry) =>
              !(
                entry.ingredient_id === ingredientId &&
                entry.tag_id === tagId
              )
          )
        : [...current, { ingredient_id: ingredientId, tag_id: tagId }]
    );

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No hay una sesión activa.");

      const result = exists
        ? await supabase
            .from("ingredient_tag_assignments")
            .delete()
            .eq("user_id", user.id)
            .eq("ingredient_id", ingredientId)
            .eq("tag_id", tagId)
        : await supabase
            .from("ingredient_tag_assignments")
            .insert({
              user_id: user.id,
              ingredient_id: ingredientId,
              tag_id: tagId,
            });

      if (result.error) throw result.error;
    } catch (err) {
      console.error("Error asignando etiqueta:", err);
      setAssignments(previous);
      setError("No se ha podido guardar la etiqueta del ingrediente.");
    }
  }

  async function addIngredient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = newIngredient.trim();
    if (!cleanName || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { data: existing, error: searchError } = await supabase
        .from("ingredients")
        .select("id, name")
        .ilike("name", cleanName)
        .limit(1)
        .maybeSingle();

      if (searchError) throw searchError;

      let ingredient = existing as Ingredient | null;

      if (!ingredient) {
        const { data, error: insertError } = await supabase
          .from("ingredients")
          .insert({ name: cleanName })
          .select("id, name")
          .single();

        if (insertError) throw insertError;

        ingredient = data as Ingredient;
      }

      setIngredients((current) =>
        current.some((entry) => entry.id === ingredient!.id)
          ? current
          : [...current, ingredient!].sort((a, b) =>
              a.name.localeCompare(b.name, "es")
            )
      );

      setNewIngredient("");
      setMessage("Ingrediente añadido al catálogo.");
    } catch (err) {
      console.error("Error añadiendo ingrediente:", err);
      setError(
        "No se ha podido añadir el ingrediente. Puede que ya exista con un nombre parecido."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5 text-[#30352C]">
      <header>
        <p className="text-xs font-medium tracking-wide text-[#879078]">
          TU DESPENSA DE INGREDIENTES
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Ingredientes
        </h2>
        <p className="mt-1 text-sm text-[#879078]">
          Un catálogo común para tus recetas, tu lista y tu almacén. Organízalo
          con tus propias etiquetas.
        </p>
      </header>

      <form
        onSubmit={addIngredient}
        className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm sm:flex-row"
      >
        <div className="min-w-0 flex-1">
          <IngredientAutocomplete
            value={newIngredient}
            onChange={setNewIngredient}
            placeholder="Añadir ingrediente al catálogo…"
            className="w-full rounded-xl border border-[#E1DED5] bg-[#FBFAF7] px-3 py-3 text-base outline-none focus:border-[#879078]"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !newIngredient.trim()}
          className="rounded-xl bg-[#52685A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Añadir
        </button>
      </form>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Mis etiquetas</h3>
        <p className="mt-1 text-xs text-[#879078]">
          Crea etiquetas como «Desayunos», «Para congelar» o «Favoritos». Un
          ingrediente puede tener varias.
        </p>

        <form
          onSubmit={createTag}
          className="mt-3 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            placeholder="Nombre de la etiqueta"
            className="min-w-0 flex-1 rounded-xl border border-[#E1DED5] bg-[#FBFAF7] px-3 py-2.5 text-sm outline-none focus:border-[#879078]"
          />

          <select
            value={newTagColor}
            onChange={(event) => setNewTagColor(event.target.value)}
            aria-label="Color de la etiqueta"
            className="rounded-xl border border-[#E1DED5] bg-[#FBFAF7] px-3 py-2.5 text-sm"
          >
            {TAG_COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={saving || !newTag.trim()}
            className="rounded-xl bg-[#52685A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Crear etiqueta
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1 rounded-full border border-[#E8E5DC] px-2 py-1"
              style={{ backgroundColor: tag.color }}
            >
              {editingTagId === tag.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveTag(tag);
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    autoFocus
                    value={editingTagName}
                    onChange={(event) => setEditingTagName(event.target.value)}
                    className="w-28 rounded-lg bg-white/80 px-2 py-1 text-xs outline-none"
                  />
                  <button
                    type="submit"
                    className="text-xs font-bold"
                    aria-label="Guardar etiqueta"
                  >
                    ✓
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTagId(tag.id);
                    setEditingTagName(tag.name);
                  }}
                  className="px-1 text-xs font-medium text-[#354238]"
                >
                  {tag.name}
                </button>
              )}

              <select
                value={tag.color}
                onChange={(event) =>
                  void changeTagColor(tag, event.target.value)
                }
                aria-label={`Color de ${tag.name}`}
                className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0 text-[0px]"
              >
                {TAG_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void deleteTag(tag)}
                aria-label={`Eliminar etiqueta ${tag.name}`}
                className="px-1 text-xs text-[#806B63]"
              >
                ×
              </button>
            </div>
          ))}

          {tags.length === 0 && (
            <p className="text-xs text-[#92958B]">
              Todavía no has creado etiquetas.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ingrediente…"
            className="min-w-0 flex-1 rounded-xl border border-[#E1DED5] bg-white px-3 py-3 text-base outline-none focus:border-[#879078]"
          />

          <select
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value)}
            className="rounded-xl border border-[#E1DED5] bg-white px-3 py-3 text-sm"
          >
            <option value="all">Todas las etiquetas</option>
            <option value="untagged">Sin etiqueta</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#E7EDE3] px-2.5 py-1 text-xs text-[#52685A]">
            En almacén
          </span>
          <span className="rounded-full bg-[#F4E9D9] px-2.5 py-1 text-xs text-[#886B42]">
            En la compra
          </span>
          <span className="rounded-full bg-[#E8E3F0] px-2.5 py-1 text-xs text-[#6D6088]">
            En ambos
          </span>
          <span className="rounded-full bg-[#F1F0EB] px-2.5 py-1 text-xs text-[#898C83]">
            Sin asignar
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-3 rounded-xl bg-[#FBF0EC] px-3 py-2 text-sm text-[#955F53]"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mb-3 rounded-xl bg-[#E7EDE3] px-3 py-2 text-sm text-[#52685A]"
          >
            {message}
          </p>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#879078]">
            Cargando ingredientes…
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#EEECE5] px-4 py-3">
              <h3 className="text-sm font-semibold">Catálogo completo</h3>
              <span className="text-xs text-[#879078]">
                {visibleIngredients.length} ingredientes
              </span>
            </div>

            {visibleIngredients.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#879078]">
                No hay ingredientes que coincidan con la búsqueda.
              </p>
            ) : (
              <div className="divide-y divide-[#EEECE5]">
                {visibleIngredients.map((ingredient) => {
                  const assigned = assignments
                    .filter(
                      (entry) => entry.ingredient_id === ingredient.id
                    )
                    .map((entry) => entry.tag_id);

                  const status = getIngredientStatus(ingredient.id);
                  const isBusy = actionIngredientId === ingredient.id;

                  return (
                    <article
                      key={ingredient.id}
                      onPointerDown={(event) =>
                        handlePointerDown(event, ingredient)
                      }
                      onPointerMove={handlePointerMove}
                      onPointerUp={clearPressTimer}
                      onPointerCancel={clearPressTimer}
                      onPointerLeave={clearPressTimer}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        clearPressTimer();
                        openContextMenu(
                          ingredient,
                          event.clientX,
                          event.clientY
                        );
                      }}
                      className="select-none px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-medium">
                          {ingredient.name}
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${getStatusStyle(status)}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((tag) => {
                          const active = assigned.includes(tag.id);

                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() =>
                                void toggleAssignment(ingredient.id, tag.id)
                              }
                              aria-pressed={active}
                              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                active
                                  ? "border-transparent font-semibold text-[#354238]"
                                  : "border-[#E8E5DC] text-[#8A918B] hover:border-[#B8C5B8]"
                              }`}
                              style={
                                active
                                  ? { backgroundColor: tag.color }
                                  : undefined
                              }
                            >
                              {active ? "✓ " : "+ "}
                              {tag.name}
                            </button>
                          );
                        })}

                        {tags.length === 0 && (
                          <span className="text-xs text-[#A0A399]">
                            Crea una etiqueta para empezar a organizarlo.
                          </span>
                        )}
                      </div>

                      {isBusy && (
                        <p className="mt-2 text-xs text-[#879078]">
                          Actualizando…
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {contextMenu && (
        <div
          data-ingredient-context-menu
          className="fixed z-[100] w-60 overflow-hidden rounded-2xl border border-[#E8E5DC] bg-white p-2 shadow-xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <div className="border-b border-[#EEECE5] px-3 py-2">
            <p className="truncate text-sm font-semibold text-[#30352C]">
              {contextMenu.ingredient.name}
            </p>
            <p className="mt-0.5 text-[11px] text-[#92958B]">
              {choosingLocation
                ? "¿Dónde quieres guardarlo?"
                : "¿Qué quieres hacer?"}
            </p>
          </div>

          {choosingLocation ? (
            <>
              {PANTRY_LOCATIONS.map((location) => (
                <button
                  key={location}
                  type="button"
                  disabled={actionIngredientId !== null}
                  onClick={() =>
                    void addToPantry(contextMenu.ingredient, location)
                  }
                  className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-[#52685A] transition hover:bg-[#E7EDE3] disabled:opacity-50"
                >
                  {location === "Nevera" && "🧊"}
                  {location === "Armario" && "🫙"}
                  {location === "Congelador" && "❄️"}
                  {location === "Especias" && "🧂"}
                  <span className="ml-2">{location}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setChoosingLocation(false)}
                className="mt-1 w-full rounded-xl px-3 py-2 text-xs text-[#92958B] hover:bg-[#F6F3EC]"
              >
                ← Volver
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={actionIngredientId !== null}
                onClick={() =>
                  void addToShoppingList(contextMenu.ingredient)
                }
                className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-[#52685A] transition hover:bg-[#F1F2ED] disabled:opacity-50"
              >
                🛒
                <span className="ml-2">Añadir a la compra</span>
              </button>

              <button
                type="button"
                disabled={actionIngredientId !== null}
                onClick={() => setChoosingLocation(true)}
                className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-[#52685A] transition hover:bg-[#F1F2ED] disabled:opacity-50"
              >
                🥬
                <span className="ml-2">Añadir al almacén</span>
              </button>

              <button
                type="button"
                onClick={closeContextMenu}
                className="mt-1 w-full rounded-xl px-3 py-2 text-xs text-[#92958B] hover:bg-[#F6F3EC]"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
