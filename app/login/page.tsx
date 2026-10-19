
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FormMode = "login" | "register" | "forgot" | "reset";

const recoveryMessage =
  "Escribe tu nueva contraseña para volver a entrar en Mi cocina.";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<FormMode>("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const activateResetMode = () => {
      if (!mounted) return;

      setMode("reset");
      setMessage(recoveryMessage);
      setPassword("");
    };

    // Detectamos el enlace de recuperación tanto en la URL
    // normal como en el fragmento que utiliza Supabase.
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    if (
      params.get("mode") === "reset" ||
      hashParams.get("type") === "recovery"
    ) {
      activateResetMode();
    }

    // Supabase también notifica cuándo comienza una recuperación.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        activateResetMode();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=reset`,
        });

        if (error) {
          setMessage(
            "No hemos podido enviar el correo. Comprueba la configuración e inténtalo de nuevo."
          );
        } else {
          setMessage(
            "Si el correo corresponde a una cuenta registrada, recibirás un enlace para cambiar tu contraseña. Revisa también la carpeta de spam."
          );
        }
      } else if (mode === "reset") {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !data.session) {
          setMessage(
            "El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo e inténtalo otra vez."
          );
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) {
          setMessage(
            "No hemos podido cambiar la contraseña. Comprueba que tenga al menos 6 caracteres o solicita un enlace nuevo."
          );
        } else {
          setPassword("");
          setMessage("¡Contraseña actualizada! Entrando en Mi cocina…");

          window.location.href = "/";
        }
      } else if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) {
          setMessage("No hemos podido crear la cuenta. " + error.message);
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

  const changeMode = (nextMode: FormMode) => {
    setMode(nextMode);
    setMessage("");
    setPassword("");
  };

  const isResetMode = mode === "reset";
  const needsPassword =
    mode === "login" || mode === "register" || isResetMode;

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
              {mode === "register"
                ? "Crea tu cuenta para guardar tus recetas"
                : mode === "forgot"
                  ? "Te ayudamos a recuperar tu cuenta"
                  : isResetMode
                    ? "Elige una nueva contraseña"
                    : "Organiza tus comidas a tu manera"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode !== "reset" && (
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
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-[#DDE8DF] bg-[#F7F5EF] px-4 py-3 text-[#26352D] outline-none focus:border-[#52685A]"
                />
              </div>
            )}

            {needsPassword && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#26352D] mb-2"
                >
                  {isResetMode ? "Nueva contraseña" : "Contraseña"}
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    isResetMode || mode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-[#DDE8DF] bg-[#F7F5EF] px-4 py-3 text-[#26352D] outline-none focus:border-[#52685A]"
                />

                {(mode === "register" || isResetMode) && (
                  <p className="text-xs text-[#6B756E] mt-2">
                    La contraseña debe tener al menos 6 caracteres.
                  </p>
                )}
              </div>
            )}

            {mode === "login" && (
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="text-sm text-[#52685A] hover:underline"
                >
                  ¿Has olvidado tu contraseña?
                </button>
              </div>
            )}

            {message && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-2xl bg-[#DDE8DF] px-4 py-3 text-sm text-[#26352D]"
              >
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
                : mode === "register"
                  ? "Crear cuenta"
                  : mode === "forgot"
                    ? "Enviar enlace de recuperación"
                    : isResetMode
                      ? "Guardar nueva contraseña"
                      : "Iniciar sesión"}
            </button>
          </form>

          <div className="text-center mt-6">
            {mode === "forgot" || isResetMode ? (
              <button
                type="button"
                onClick={() => changeMode("login")}
                className="text-sm text-[#52685A] hover:underline"
              >
                ← Volver a iniciar sesión
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  changeMode(mode === "register" ? "login" : "register")
                }
                className="text-sm text-[#52685A] hover:underline"
              >
                {mode === "register"
                  ? "Ya tengo una cuenta → Iniciar sesión"
                  : "¿No tienes cuenta? → Crear una"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
