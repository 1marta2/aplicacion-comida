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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session && pathname !== "/login") {
        router.replace("/login");
        return;
      }

      if (session && pathname === "/login") {
        router.replace("/");
        return;
      }

      setChecking(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== "/login") {
        router.replace("/login");
      }

      if (session && pathname === "/login") {
        router.replace("/");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-[#F7F5EF] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍴</div>
          <p className="text-[#52685A]">Cargando...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}