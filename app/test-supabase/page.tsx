"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabase() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRecipes() {
      const { data, error } = await supabase
        .from("recipes")
        .select("*");

      if (error) {
        setError(error.message);
        return;
      }

      setRecipes(data || []);
    }

    loadRecipes();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        Prueba Supabase
      </h1>

      {error && (
        <p className="mt-4 text-red-500">
          Error: {error}
        </p>
      )}

      {recipes.length === 0 && !error && (
        <p className="mt-4">
          No hay recetas todavía.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="rounded-xl bg-gray-100 p-4">
            {recipe.title}
          </div>
        ))}
      </div>
    </main>
  );
}