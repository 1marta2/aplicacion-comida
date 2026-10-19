
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setLoading(false);
        setMessage("");
      }
    });

    async function checkRecoverySession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session && !error) {
        setReady(true);
      } else {
        setMessage(
          "El enlace ha caducado o no es válido. Vuelve al inicio de sesión y solicita un correo nuevo."
        );
      }

      setLoading(false);
    }

    checkRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        "Las contraseñas no coinciden. Revísalas e inténtalo otra vez."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setMessage(
          "Tu sesión de recuperación ha caducado. Solicita un correo nuevo."
        );
        setReady(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(
          "No hemos podido cambiar la contraseña. Solicita un enlace nuevo e inténtalo otra vez."
        );
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      setMessage("¡Contraseña actualizada correctamente!");

      window.setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch {
      setMessage("Ha ocurrido un error. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F5EF] px-6 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">🍴</div>

          <h1 className="text-3xl font-semibold text-[#26352D]">
            Nueva contraseña
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6B756E]">
            Elige una contraseña nueva para acceder a Mi cocina.
          </p>
        </div>

        {loading ? (
          <p className="py-4 text-center text-sm text-[#52685A]">
            Comprobando el enlace de recuperación...
          </p>
        ) : ready && !success ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#26352D]"
              >
                Nueva contraseña
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-2xl border border-[#DDE8DF] bg-[#F7F5EF] px-4 py-3 text-[#26352D] outline-none focus:border-[#52685A]"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-[#26352D]"
              >
                Repite la nueva contraseña
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                placeholder="Escribe la contraseña otra vez"
                className="w-full rounded-2xl border border-[#DDE8DF] bg-[#F7F5EF] px-4 py-3 text-[#26352D] outline-none focus:border-[#52685A]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-[#52685A] px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        ) : null}

        {message && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
              success
                ? "bg-[#DDE8DF] text-[#26352D]"
                : "bg-[#F7F5EF] text-[#52685A]"
            }`}
          >
            {message}
          </p>
        )}

        {!ready && !loading && !success && (
          <Link
            href="/login"
            className="mt-5 block text-center text-sm font-medium text-[#52685A] hover:underline"
          >
            ← Volver al inicio de sesión
          </Link>
        )}
      </div>
    </main>
  );
}
