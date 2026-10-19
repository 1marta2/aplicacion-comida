"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          setMessage(
            "Cuenta creada. Revisa tu correo para confirmar tu email."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage("El email o la contraseña no son correctos.");
        } else {
          window.location.href = "/";
        }
      }
    } catch {
      setMessage("Ha ocurrido un error. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F5EF] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🍴</div>

            <h1 className="text-3xl font-semibold text-[#26352D]">
              Aplicación Comida
            </h1>

            <p className="text-[#6B756E] mt-2">
              {isRegistering
                ? "Crea tu cuenta para guardar tus recetas"
                : "Organiza tus comidas a tu manera"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#26352D] mb-2"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-2xl border border-[#DDE8DF] bg-[#F7F5EF] px-4 py-3 text-[#26352D] outline-none focus:border-[#52685A]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#26352D] mb-2"
              >
                Contraseña
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-2xl border border-[#DDE8DF] bg-[#F7F5EF] px-4 py-3 text-[#26352D] outline-none focus:border-[#52685A]"
              />
            </div>

            {message && (
              <div className="rounded-2xl bg-[#DDE8DF] px-4 py-3 text-sm text-[#26352D]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#52685A] px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Cargando..."
                : isRegistering
                  ? "Crear cuenta"
                  : "Iniciar sesión"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage("");
              }}
              className="text-sm text-[#52685A] hover:underline"
            >
              {isRegistering
                ? "Ya tengo una cuenta → Iniciar sesión"
                : "¿No tienes cuenta? → Crear una"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}