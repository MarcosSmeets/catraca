"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/admin-auth";
import { adminAuthLogout } from "@/lib/admin-auth-api";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "⬛" },
  { href: "/admin/venues", label: "Estádios", icon: "🏟" },
  { href: "/admin/events", label: "Eventos", icon: "📅" },
  { href: "/admin/tickets/scan", label: "Validar Ingresso", icon: "✓" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminUser, clear } = useAdminAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await adminAuthLogout();
    } finally {
      clear();
      router.replace("/admin/login");
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface-lowest">
      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-surface-low border-b border-outline-variant shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display font-black text-lg tracking-tight text-primary uppercase">
            Catraca
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        </Link>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-2 text-on-surface/60 hover:text-on-surface transition-colors duration-150 rounded-sm"
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>
      </header>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed lg:static inset-y-0 left-0 z-40 w-60 shrink-0",
          "bg-surface-low border-r border-outline-variant flex flex-col",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Sidebar header — desktop */}
        <div className="hidden lg:flex px-6 py-5 border-b border-outline-variant flex-col">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-display font-black text-xl tracking-tight text-primary uppercase">
              Catraca
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform duration-150" />
          </Link>
          <p className="text-xs font-body text-on-surface/40 mt-1">Painel Administrativo</p>
        </div>

        {/* Mobile sidebar header */}
        <div className="lg:hidden px-6 py-4 border-b border-outline-variant">
          <p className="text-xs font-body text-on-surface/40 uppercase tracking-wider">Painel Administrativo</p>
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
      <main className="flex-1 overflow-auto min-w-0">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
