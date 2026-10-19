
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CuentaPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !user) {
        setMessage("No hemos podido cargar los datos de tu cuenta.");
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);
      setLoading(false);
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("No hemos podido cerrar sesión. Inténtalo de nuevo.");
      setSigningOut(false);
      return;
    }

    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-5 pb-28 pt-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-medium text-[#52685A]">
            TU ESPACIO PERSONAL
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-[#26352D]">
            Mi cuenta
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#68736B]">
            Gestiona tu cuenta y accede a tus opciones personales.
          </p>
        </header>

        <section className="rounded-3xl border border-[#E5E4DC] bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDE8DF] text-2xl">
            👤
          </div>

          <h2 className="text-lg font-semibold text-[#26352D]">
            Tus datos
          </h2>

          {loading ? (
            <p className="mt-3 text-sm text-[#68736B]">
              Cargando los datos de tu cuenta...
            </p>
          ) : (
            <div className="mt-4 rounded-2xl bg-[#F7F5EF] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#68736B]">
                Correo electrónico
              </p>

              <p className="mt-2 break-all text-sm font-medium text-[#26352D]">
                {email ?? "No disponible"}
              </p>
            </div>
          )}

          {message && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {message}
            </p>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-[#E5E4DC] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#26352D]">
            Sesión
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#68736B]">
            Puedes cerrar tu sesión cuando termines de utilizar Mi cocina.
            Tus recetas y tus datos guardados en Supabase no se borrarán.
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut || loading}
            className="mt-5 w-full rounded-2xl border border-[#D9DDD8] bg-[#F7F5EF] px-5 py-3 font-medium text-[#52685A] transition hover:bg-[#E8EBE5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </section>

        <p className="mt-6 text-center text-xs text-[#899189]">
          Mi cocina · Tu espacio para organizar tus recetas y comidas
        </p>
      </div>
    </main>
  );
}
