"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const recipe = {
  id: "pollo-en-salsa",
  name: "Pollo en salsa",
  category: "Carne",
  time: "25 min",
  difficulty: "Fácil",
  emoji: "🍗",
  ingredients: [
    "200 g de pechuga de pollo en trozos",
    "1 cebolla en juliana fina",
    "Setas o champiñones",
    "Vinagre de Módena",
    "Salsa de soja",
    "150 ml de nata o leche evaporada",
    "1 cucharadita de mostaza",
    "Sal",
    "Pimienta",
    "Una pizca de eneldo",
    "Arroz para acompañar",
  ],
  steps: [
    "Dora a fuego fuerte durante 2 minutos la pechuga de pollo y reserva.",
    "En la misma sartén cocina a fuego medio durante 5 minutos la cebolla. Añade vinagre de Módena y cocina 2 minutos más. Después añade las setas y la salsa de soja.",
    "Añade la nata, la mostaza y el eneldo y baja el fuego al mínimo.",
    "Añade el pollo y cocina a fuego lento durante unos 6 minutos.",
    "Sirve con arroz y disfruta. 😍",
  ],
  source:
    "https://www.instagram.com/reel/CqBi8fjo22J/?igshid=MzRlODBiNWFlZA==",
};

export default function PolloEnSalsaPage() {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const savedFavorites = localStorage.getItem("favoriteRecipes");

    if (savedFavorites) {
      const favorites = JSON.parse(savedFavorites);
      setIsFavorite(favorites.includes(recipe.id));
    }
  }, []);

  const toggleFavorite = () => {
    const savedFavorites = localStorage.getItem("favoriteRecipes");
    let favorites: string[] = savedFavorites
      ? JSON.parse(savedFavorites)
      : [];

    if (favorites.includes(recipe.id)) {
      favorites = favorites.filter((id) => id !== recipe.id);
      setIsFavorite(false);
    } else {
      favorites.push(recipe.id);
      setIsFavorite(true);
    }

    localStorage.setItem("favoriteRecipes", JSON.stringify(favorites));
  };

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-5 py-8 text-[#26352D]">
      <div className="mx-auto max-w-3xl">
        {/* Volver */}
        <Link
          href="/recetas"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#52685A]"
        >
          ← Volver a recetas
        </Link>

        {/* Cabecera */}
        <div className="rounded-[32px] bg-[#DDE8DF] p-7 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-[#52685A]">
                📥 Receta importada
              </div>

              <h1 className="text-4xl font-bold tracking-tight">
                {recipe.name}
              </h1>

              <p className="mt-2 text-[#52685A]">
                Una receta fácil y cremosa para cualquier día de la semana.
              </p>
            </div>

            <button
              onClick={toggleFavorite}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm transition hover:scale-105"
              aria-label="Añadir a favoritos"
            >
              {isFavorite ? "❤️" : "🤍"}
            </button>
          </div>

          {/* Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/70 p-4 text-center">
              <div className="text-lg">⏱️</div>
              <p className="mt-1 text-xs text-[#6B756E]">Tiempo</p>
              <p className="font-semibold">{recipe.time}</p>
            </div>

            <div className="rounded-2xl bg-white/70 p-4 text-center">
              <div className="text-lg">✨</div>
              <p className="mt-1 text-xs text-[#6B756E]">Dificultad</p>
              <p className="font-semibold">{recipe.difficulty}</p>
            </div>

            <div className="rounded-2xl bg-white/70 p-4 text-center">
              <div className="text-lg">🥘</div>
              <p className="mt-1 text-xs text-[#6B756E]">Categoría</p>
              <p className="font-semibold">{recipe.category}</p>
            </div>
          </div>
        </div>

        {/* Ingredientes */}
        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold">Ingredientes</h2>

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <ul className="space-y-3">
              {recipe.ingredients.map((ingredient, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 border-b border-[#F0EEE8] pb-3 last:border-0 last:pb-0"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DDE8DF] text-sm text-[#52685A]">
                    ✓
                  </span>

                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Elaboración */}
        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold">Elaboración</h2>

          <div className="space-y-4">
            {recipe.steps.map((step, index) => (
              <div
                key={index}
                className="flex gap-4 rounded-[24px] bg-white p-5 shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#52685A] font-bold text-white">
                  {index + 1}
                </div>

                <p className="pt-1 leading-relaxed text-[#3F4B43]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Fuente */}
        <section className="mt-8 rounded-[28px] bg-[#E8EEE8] p-6">
          <p className="text-sm text-[#52685A]">
            Esta receta fue importada desde Instagram.
          </p>

          <a
            href={recipe.source}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-full bg-[#52685A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Ver receta original en Instagram ↗
          </a>
        </section>

        {/* Acciones */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/planificador"
            className="rounded-2xl bg-[#52685A] px-5 py-4 text-center font-semibold text-white transition hover:opacity-90"
          >
            📅 Añadir al planificador
          </Link>

          <Link
            href="/compra"
            className="rounded-2xl border border-[#D5DCD6] bg-white px-5 py-4 text-center font-semibold text-[#52685A] transition hover:bg-[#F5F7F4]"
          >
            🛒 Ver lista de compra
          </Link>
        </div>
      </div>
    </main>
  );
}