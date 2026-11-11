
"use client";

import { useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { supabase } from "@/lib/supabase";

type Ingredient = {
  id: number;
  name: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export default function IngredientAutocomplete({
  value,
  onChange,
  placeholder = "Escribe un ingrediente",
  className = "",
  onKeyDown,
}: Props) {
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [suggestions, setSuggestions] = useState<Ingredient[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const listId = useId();

  useEffect(() => {
    let cancelled = false;

    async function loadIngredients() {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name")
        .order("name", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Error cargando ingredientes:", error);
        return;
      }

      setAllIngredients((data || []) as Ingredient[]);
    }

    void loadIngredients();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const search = normalizeText(value);

    if (!isFocused || search.length < 1) {
      setSuggestions([]);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timeout = window.setTimeout(() => {
      const filtered = allIngredients
        .filter((ingredient) =>
          normalizeText(ingredient.name).startsWith(search)
        )
        .slice(0, 8);

      setSuggestions(filtered);
      setActiveIndex(-1);
      setLoading(false);
    }, 100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [value, isFocused, allIngredients]);

  function selectIngredient(ingredient: Ingredient) {
    onChange(ingredient.name);
    setSuggestions([]);
    setActiveIndex(-1);
    setIsFocused(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1
      );
      return;
    }

    if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1
      );
      return;
    }

    if (
      event.key === "Enter" &&
      activeIndex >= 0 &&
      suggestions[activeIndex]
    ) {
      event.preventDefault();
      event.stopPropagation();
      selectIngredient(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    onKeyDown?.(event);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isFocused && suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={
          activeIndex >= 0
            ? `${listId}-${activeIndex}`
            : undefined
        }
        className={className}
      />

      {isFocused && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#E1DED5] bg-white py-1 shadow-lg"
        >
          {suggestions.map((ingredient, index) => (
            <li
              key={ingredient.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
            >
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectIngredient(ingredient)}
                className={`w-full px-3 py-2.5 text-left text-sm transition ${
                  activeIndex === index
                    ? "bg-[#E7EDE3] text-[#52685A]"
                    : "text-[#30352C] hover:bg-[#F7F5EF]"
                }`}
              >
                {ingredient.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isFocused && value.trim().length > 0 && loading && (
        <p className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-[#E1DED5] bg-white px-3 py-2 text-xs text-[#879078] shadow-sm">
          Buscando ingredientes…
        </p>
      )}
    </div>
  );
}
