
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      // La página de recuperación debe poder abrirse para validar
      // el enlace y mostrar su propio mensaje si ha caducado.
      if (pathname === "/reset-password") {
        if (mounted) setChecking(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session && pathname !== "/login") {
        router.replace("/login");
        return;
      }

      if (session && pathname === "/login") {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);

        const isRecovery =
          params.get("mode") === "reset" ||
          hashParams.get("type") === "recovery";

        if (!isRecovery) {
          router.replace("/");
          return;
        }
      }

      setChecking(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        if (pathname !== "/reset-password") {
          router.replace("/reset-password");
        } else {
          setChecking(false);
        }

        return;
      }

      if (!session && pathname !== "/login" && pathname !== "/reset-password") {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F5EF]">
        <div className="text-center">
          <div className="mb-4 text-4xl">🍴</div>
          <p className="text-[#52685A]">Cargando...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
