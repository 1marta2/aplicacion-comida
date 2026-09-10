"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  {
    href: "/",
    label: "Inicio",
    icon: "⌂",
  },
  {
    href: "/recetas",
    label: "Recetas",
    icon: "🍽️",
  },
  {
    href: "/planificador",
    label: "Planificador",
    icon: "📅",
  },
  {
    href: "/compra",
    label: "Compra",
    icon: "🛒",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D9DDD8] bg-[#F7F5EF]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-around px-3 py-2">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[75px] flex-col items-center gap-1 rounded-2xl px-3 py-2 transition ${
                isActive
                  ? "bg-[#52685A] text-white"
                  : "text-[#68736B] hover:bg-[#E8EBE5]"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>

              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}