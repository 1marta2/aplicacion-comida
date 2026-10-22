"use client";

import { useState } from "react";

export type ShoppingCategory = {
  id: number;
  name: string;
  sort_order: number;
};

type Props = {
  categories: ShoppingCategory[];
  onCreate: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorder: (orderedIds: number[]) => Promise<void>;
};

export default function ShoppingCategoryManager({
  categories,
  onCreate,
  onRename,
  onDelete,
  onReorder,
}: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function create() {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await onCreate(name);
      setNewName("");
    } catch (error) {
      console.error(error);
      setMessage("No se ha podido crear la categoría. Comprueba que no exista ya.");
    } finally {
      setBusy(false);
    }
  }

  async function rename() {
    const name = editingName.trim();
    if (!name || editingId === null || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await onRename(editingId, name);
      setEditingId(null);
      setEditingName("");
    } catch (error) {
      console.error(error);
      setMessage("No se ha podido renombrar. Comprueba que el nombre no esté repetido.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number, name: string) {
    if (busy || !window.confirm(`¿Eliminar la categoría «${name}»? Los productos volverán a su categoría automática.`)) return;
    setBusy(true);
    setMessage("");
    try {
      await onDelete(id);
    } catch (error) {
      console.error(error);
      setMessage("No se ha podido eliminar la categoría.");
    } finally {
      setBusy(false);
    }
  }

  async function moveCategory(id: number, direction: -1 | 1) {
    if (busy) return;
    const index = categories.findIndex((category) => category.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setBusy(true);
    setMessage("");
    try {
      await onReorder(reordered.map((category) => category.id));
    } catch (error) {
      console.error(error);
      setMessage("No se ha podido guardar el nuevo orden de las categorías.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-3xl border border-[#E4E5DA] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#30352C]">Organizar categorías</h2>
        <p className="mt-1 text-sm text-[#788675]">
          Crea tus propias secciones y cambia los nombres cuando quieras. Se comparten entre la compra y el almacén.
        </p>
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Ej. Congelados"
          aria-label="Nombre de la nueva categoría"
          className="min-w-0 flex-1 rounded-2xl border border-[#E1DED5] bg-[#FBFAF7] px-3 py-2.5 text-sm text-[#30352C] placeholder:text-[#8B8D83] outline-none focus:border-[#879078]"
        />
        <button
          type="submit"
          disabled={!newName.trim() || busy}
          className="rounded-2xl bg-[#52685A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Añadir
        </button>
      </form>

      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center gap-2 rounded-2xl bg-[#F7F6F1] px-3 py-2">
            {editingId === category.id ? (
              <>
                <input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  aria-label="Nuevo nombre de categoría"
                  className="min-w-0 flex-1 rounded-xl border border-[#E1DED5] bg-white px-3 py-2 text-sm text-[#30352C] placeholder:text-[#8B8D83] outline-none focus:border-[#879078]"
                />
                <button type="button" onClick={() => void rename()} disabled={!editingName.trim() || busy} className="text-sm font-semibold text-[#52685A] disabled:opacity-50">Guardar</button>
                <button type="button" onClick={() => setEditingId(null)} className="text-sm text-[#788675]">Cancelar</button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 text-sm font-medium text-[#30352C]">{category.name}</span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => void moveCategory(category.id, -1)}
                    disabled={busy || categories[0]?.id === category.id}
                    aria-label={`Subir ${category.name}`}
                    title="Subir categoría"
                    className="rounded-lg px-2 py-1.5 text-sm font-semibold text-[#52685A] hover:bg-white disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveCategory(category.id, 1)}
                    disabled={busy || categories[categories.length - 1]?.id === category.id}
                    aria-label={`Bajar ${category.name}`}
                    title="Bajar categoría"
                    className="rounded-lg px-2 py-1.5 text-sm font-semibold text-[#52685A] hover:bg-white disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(category.id); setEditingName(category.name); }}
                    disabled={busy}
                    className="rounded-xl px-2 py-1.5 text-xs font-semibold text-[#52685A] hover:bg-white disabled:opacity-50"
                  >
                    Renombrar
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(category.id, category.name)}
                    disabled={busy}
                    className="rounded-xl px-2 py-1.5 text-xs font-semibold text-[#A16E63] hover:bg-white disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-[#955F53]">{message}</p>}
    </section>
  );
}
