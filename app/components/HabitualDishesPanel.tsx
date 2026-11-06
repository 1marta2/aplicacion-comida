
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type HabitualDish = {
  id: number;
  name: string;
  created_at?: string;
};

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;

  if (err && typeof err === "object") {
    const error = err as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    const parts = [
      error.message,
      error.code ? `Código: ${error.code}` : "",
      error.details,
      error.hint,
    ]
      .filter(
        (part): part is string =>
          typeof part === "string" && part.trim().length > 0
      );

    if (parts.length > 0) return parts.join(" — ");

    try {
      return JSON.stringify(err);
    } catch {
      return "Error desconocido.";
    }
  }

  return "Error desconocido.";
}

export default function HabitualDishesPanel() {
  const [open, setOpen] = useState(false);
  const [dishes, setDishes] = useState<HabitualDish[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDishes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("No se ha podido identificar tu sesión.");
      }

      const { data, error: queryError } = await supabase
        .from("habitual_dishes")
        .select("id, name, created_at")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (queryError) throw queryError;

      setDishes(data ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadDishes();
    }
  }, [open, loadDishes]);

  function resetForm() {
    setName("");
    setEditingId(null);
    setError("");
    setMessage("");
  }

  async function saveDish(event: FormEvent<HTMLFormElement>) {
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
      setError("Ya tienes un plato con ese nombre.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("No se ha podido identificar tu sesión.");

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from("habitual_dishes")
          .update({
            name: cleanName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        setMessage("Plato actualizado.");
      } else {
        const { error: insertError } = await supabase
          .from("habitual_dishes")
          .insert({
            user_id: user.id,
            name: cleanName,
          });

        if (insertError) throw insertError;

        setMessage("Plato añadido.");
      }

      setName("");
      setEditingId(null);
      await loadDishes();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteDish(dish: HabitualDish) {
    const confirmed = window.confirm(
      `¿Eliminar "${dish.name}"? Si está planificado, esos huecos quedarán vacíos.`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("No se ha podido identificar tu sesión.");

      const { error: deleteError } = await supabase
        .from("habitual_dishes")
        .delete()
        .eq("id", dish.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      if (editingId === dish.id) {
        setName("");
        setEditingId(null);
      }

      setMessage("Plato eliminado.");
      await loadDishes();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <>
      <section className="mb-5 rounded-2xl border border-[#E4E3DA] bg-white p-3 shadow-sm sm:mb-6 sm:rounded-3xl sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DDE8DF] text-2xl">
            🥘
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold sm:text-base">
              Platos habituales
            </h2>
            <p className="mt-0.5 text-xs text-[#7A837D]">
              Tus platos de siempre, sin necesidad de receta.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className="shrink-0 rounded-xl bg-[#E8EEE8] px-3 py-2 text-xs font-semibold text-[#52685A] transition hover:bg-[#DDE8DF] sm:px-4 sm:text-sm"
          >
            Ver platos →
          </button>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
              resetForm();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#F7F5EF] p-5 shadow-2xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Platos habituales
                </h2>
                <p className="mt-1 text-sm text-[#7A837D]">
                  Guarda tus platos de siempre.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-[#52685A]"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveDish}
              className="mb-5 rounded-2xl border border-[#E4E3DA] bg-white p-4"
            >
              <label className="mb-2 block text-sm font-medium">
                {editingId !== null ? "Editar plato" : "Añadir un plato"}
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                placeholder="Ej. Tortilla de patatas"
                className="mb-3 w-full rounded-xl border border-[#DEDCD2] bg-[#FAFAF7] px-4 py-3 text-sm outline-none focus:border-[#52685A]"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="flex-1 rounded-xl bg-[#52685A] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : editingId !== null
                      ? "Guardar cambios"
                      : "+ Añadir plato"}
                </button>

                {editingId !== null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-[#DEDCD2] bg-white px-3 py-3 text-sm text-[#52685A]"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {error && (
                <p className="mt-3 break-words text-sm text-red-600">
                  {error}
                </p>
              )}

              {message && (
                <p className="mt-3 text-sm text-[#52685A]">{message}</p>
              )}
            </form>

            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Mis platos</h3>
              <span className="text-xs text-[#7A837D]">
                {dishes.length} {dishes.length === 1 ? "plato" : "platos"}
              </span>
            </div>

            {loading ? (
              <p className="rounded-2xl bg-white p-6 text-center text-sm text-[#7A837D]">
                Cargando platos...
              </p>
            ) : dishes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D8DCD3] bg-white p-7 text-center">
                <p className="mb-2 text-3xl">🥘</p>
                <p className="text-sm font-medium">
                  Todavía no tienes platos guardados.
                </p>
                <p className="mt-1 text-xs text-[#7A837D]">
                  Añade tu primer plato con el formulario.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="flex items-center gap-2 rounded-2xl border border-[#EAE8E0] bg-white p-3"
                  >
                    <span className="text-xl">🥘</span>

                    <p className="min-w-0 flex-1 break-words text-sm font-medium">
                      {dish.name}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setName(dish.name);
                        setEditingId(dish.id);
                        setError("");
                        setMessage("");
                      }}
                      className="rounded-lg px-2 py-2 text-xs font-medium text-[#52685A] hover:bg-[#F0F2EC]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteDish(dish)}
                      className="rounded-lg px-2 py-2 text-xs font-medium text-[#A16B63] hover:bg-[#F8EFED]"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
