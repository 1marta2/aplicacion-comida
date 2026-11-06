
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HabitualDish = {
  id: number;
  name: string;
  created_at?: string;
};

export default function HabitualesPage() {
  const [dishes, setDishes] = useState<HabitualDish[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDishes() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("No se ha podido identificar tu sesión.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("habitual_dishes")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (queryError) {
      console.error("Error cargando platos habituales:", queryError);
      setError("No se han podido cargar tus platos habituales.");
    } else {
      setDishes(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDishes();
  }, []);

  function resetForm() {
    setName("");
    setEditingId(null);
    setMessage("");
    setError("");
  }

  function startEditing(dish: HabitualDish) {
    setName(dish.name);
    setEditingId(dish.id);
    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveDish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Escribe el nombre del plato.");
      return;
    }

    const duplicate = dishes.find(
      (dish) =>
        dish.name.trim().toLocaleLowerCase("es") ===
          cleanName.toLocaleLowerCase("es") &&
        dish.id !== editingId
    );

    if (duplicate) {
      setError("Ya tienes un plato habitual con ese nombre.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("No se ha podido identificar tu sesión.");
      setSaving(false);
      return;
    }

    if (editingId !== null) {
      const { error: updateError } = await supabase
        .from("habitual_dishes")
        .update({
          name: cleanName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error actualizando plato:", updateError);
        setError("No se ha podido actualizar el plato.");
        setSaving(false);
        return;
      }

      setMessage("Plato actualizado correctamente.");
    } else {
      const { error: insertError } = await supabase
        .from("habitual_dishes")
        .insert({
          user_id: user.id,
          name: cleanName,
        });

      if (insertError) {
        console.error("Error creando plato:", insertError);
        setError("No se ha podido guardar el plato.");
        setSaving(false);
        return;
      }

      setMessage("Plato añadido correctamente.");
    }

    setName("");
    setEditingId(null);
    await loadDishes();
    setSaving(false);
  }

  async function deleteDish(dish: HabitualDish) {
    const confirmed = window.confirm(
      `¿Quieres eliminar "${dish.name}"?\n\nSi está en tu planificador, también desaparecerá de esos huecos.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("No se ha podido identificar tu sesión.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("habitual_dishes")
      .delete()
      .eq("id", dish.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error eliminando plato:", deleteError);
      setError("No se ha podido eliminar el plato.");
      return;
    }

    if (editingId === dish.id) {
      resetForm();
    }

    setMessage("Plato eliminado correctamente.");
    await loadDishes();
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-4 pb-28 pt-8 text-[#26352D]">
      <div className="mx-auto max-w-2xl space-y-7">
        <header className="space-y-2">
          <p className="text-sm font-medium text-[#718075]">
            TU COLECCIÓN PERSONAL
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Platos habituales
          </h1>

          <p className="max-w-lg text-sm leading-6 text-[#68736B]">
            Guarda aquí esos platos que preparas habitualmente y que no
            necesitan una receta completa. Después podrás añadirlos a tu
            planificación semanal.
          </p>
        </header>

        <section className="rounded-3xl border border-[#E8E5DC] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {editingId !== null ? "Editar plato" : "Añadir un plato"}
            </h2>
            <p className="mt-1 text-sm text-[#7A837C]">
              Solo necesitas escribir su nombre.
            </p>
          </div>

          <form onSubmit={saveDish} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Tortilla de patatas"
              maxLength={100}
              className="w-full rounded-2xl border border-[#E5E5DD] bg-[#FAFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#52685A]"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 rounded-2xl bg-[#52685A] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#405446] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Guardando..."
                  : editingId !== null
                    ? "Guardar cambios"
                    : "Añadir plato"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-[#E5E5DD] px-4 py-3 text-sm font-medium text-[#68736B] hover:bg-[#F7F5EF]"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {message && (
            <p className="mt-3 text-sm text-[#52685A]">{message}</p>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mis platos</h2>
            <span className="rounded-full bg-[#DDE8DF] px-3 py-1 text-xs font-medium text-[#52685A]">
              {dishes.length} {dishes.length === 1 ? "plato" : "platos"}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-8 text-center text-sm text-[#7A837C]">
              Cargando tus platos...
            </div>
          ) : error && dishes.length === 0 ? (
            <div className="rounded-3xl bg-white p-6 text-center text-sm text-red-600">
              {error}
            </div>
          ) : dishes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#D8DCD3] bg-white/60 px-6 py-10 text-center">
              <div className="mb-3 text-4xl">🥘</div>
              <h3 className="font-medium">Todavía no tienes platos guardados</h3>
              <p className="mt-2 text-sm leading-6 text-[#7A837C]">
                Añade tus platos de siempre y los tendrás disponibles
                cuando organices tus comidas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {dishes.map((dish) => (
                <article
                  key={dish.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#EAE8E0] bg-white px-4 py-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F2EC] text-xl">
                    🥘
                  </span>

                  <p className="min-w-0 flex-1 text-sm font-medium">
                    {dish.name}
                  </p>

                  <button
                    type="button"
                    onClick={() => startEditing(dish)}
                    aria-label={`Editar ${dish.name}`}
                    className="rounded-xl px-2 py-2 text-sm text-[#52685A] hover:bg-[#F0F2EC]"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteDish(dish)}
                    aria-label={`Eliminar ${dish.name}`}
                    className="rounded-xl px-2 py-2 text-sm text-[#A16B63] hover:bg-[#F8EFED]"
                  >
                    Eliminar
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
