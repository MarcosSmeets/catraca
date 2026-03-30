"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/admin-auth";
import { adminAuthLogout } from "@/lib/admin-auth-api";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⬛" },
  { href: "/admin/venues", label: "Estádios", icon: "🏟" },
  { href: "/admin/events", label: "Eventos", icon: "📅" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminUser, clear } = useAdminAuthStore();

  async function handleLogout() {
    try {
      await adminAuthLogout();
    } finally {
      clear();
      router.replace("/admin/login");
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-lowest">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-surface-low border-r border-outline-variant flex flex-col">
        <div className="px-6 py-5 border-b border-outline-variant">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-display font-black text-xl tracking-tight text-primary uppercase">
              Catraca
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform duration-150" />
          </Link>
          <p className="text-xs font-body text-on-surface/40 mt-1">Painel Administrativo</p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-display font-semibold transition-colors duration-150",
                  isActive
                    ? "bg-primary text-on-primary"
                    : "text-on-surface/60 hover:bg-surface-high hover:text-on-surface",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-outline-variant flex flex-col gap-2">
          <div className="px-2">
            <p className="text-xs font-body text-on-surface/40 truncate">{adminUser?.email}</p>
            <p className="text-xs font-display font-semibold text-on-surface/60 uppercase tracking-tight mt-0.5">
              {adminUser?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-display font-semibold text-on-surface/50 hover:bg-error/10 hover:text-error transition-colors duration-150 w-full text-left"
          >
            <span>↩</span>
            Sair do painel
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
