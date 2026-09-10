"use client";

import { useState } from "react";
import Link from "next/link";

export default function ImportarRecetaPage() {
  const [image, setImage] = useState<string | null>(null);

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-5 py-8 text-[#2F3A32]">
      <div className="mx-auto max-w-2xl">

        {/* CABECERA */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/recetas"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-sm"
          >
            ←
          </Link>

          <div>
            <p className="text-sm text-[#7A827C]">
              Mis recetas
            </p>

            <h1 className="text-3xl font-semibold">
              Importar receta
            </h1>
          </div>
        </div>

        {/* INTRODUCCIÓN */}
        <section className="mb-6 rounded-3xl bg-[#DDE8DC] p-6">
          <div className="mb-3 text-4xl">
            📸
          </div>

          <h2 className="mb-2 text-xl font-semibold">
            ¿Has encontrado una receta que quieres probar?
          </h2>

          <p className="text-sm leading-6 text-[#536057]">
            Sube una captura de Instagram, TikTok o cualquier otra receta.
            Intentaremos convertirla en una receta para tu colección.
          </p>
        </section>

        {/* SUBIR IMAGEN */}
        {!image ? (
          <label
            htmlFor="recipe-image"
            className="block cursor-pointer rounded-3xl border-2 border-dashed border-[#B8C5B8] bg-white p-10 text-center transition hover:bg-[#FAFAF7]"
          >
            <div className="mb-4 text-5xl">
              🖼️
            </div>

            <h2 className="mb-2 text-lg font-semibold">
              Sube una captura
            </h2>

            <p className="mb-6 text-sm text-[#7A827C]">
              Pulsa aquí para elegir una imagen de tu ordenador
            </p>

            <span className="inline-block rounded-full bg-[#526B58] px-6 py-3 text-sm font-medium text-white">
              Elegir imagen
            </span>

            <input
              id="recipe-image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        ) : (
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm">

            {/* PREVISUALIZACIÓN */}
            <div className="relative">
              <img
                src={image}
                alt="Captura de la receta"
                className="max-h-[650px] w-full object-contain bg-[#EEEDE8]"
              />
            </div>

            {/* ACCIONES */}
            <div className="p-5">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  ¡Captura subida! ✨
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#7A827C]">
                  En el siguiente paso analizaremos la imagen para intentar
                  detectar automáticamente el nombre, los ingredientes y la
                  elaboración.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">

                <label
                  htmlFor="recipe-image-change"
                  className="flex-1 cursor-pointer rounded-full border border-[#D8DDD7] bg-white px-5 py-3 text-center text-sm font-medium transition hover:bg-[#F7F5EF]"
                >
                  Cambiar imagen

                  <input
                    id="recipe-image-change"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  className="flex-1 rounded-full bg-[#526B58] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#435949]"
                  onClick={() => {
                    alert(
                      "¡Perfecto! El siguiente paso será analizar automáticamente la receta."
                    );
                  }}
                >
                  Analizar receta ✨
                </button>

              </div>
            </div>
          </section>
        )}

        {/* EXPLICACIÓN */}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            ¿Qué podremos hacer después?
          </h2>

          <div className="space-y-4">

            <div className="flex gap-3">
              <span className="text-xl">🔎</span>
              <div>
                <p className="font-medium">
                  Detectar la receta
                </p>
                <p className="text-sm text-[#7A827C]">
                  Nombre, ingredientes y elaboración.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-xl">✏️</span>
              <div>
                <p className="font-medium">
                  Revisarla y editarla
                </p>
                <p className="text-sm text-[#7A827C]">
                  Podrás corregir cualquier cosa antes de guardarla.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-xl">❤️</span>
              <div>
                <p className="font-medium">
                  Guardarla en tus recetas
                </p>
                <p className="text-sm text-[#7A827C]">
                  Y usarla después en el planificador y la lista de compra.
                </p>
              </div>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}