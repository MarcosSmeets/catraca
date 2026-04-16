"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { logout } from "@/lib/auth-api";
import ThemeToggle from "@/components/ui/ThemeToggle";
import CatracaHeaderBrand from "@/components/brand/CatracaHeaderBrand";

const navLinks = [
  { href: "/", label: "INÍCIO" },
  { href: "/search", label: "EXPLORAR" },
  { href: "/tickets", label: "MEUS INGRESSOS" },
] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function linkActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clear = useAuthStore((s) => s.clear);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [menuOpen]);

  async function handleLogout() {
    try {
      await logout(accessToken);
    } catch {
      // proceed with client-side clear regardless
    }
    clear();
    setMenuOpen(false);
    router.push("/login");
  }

  const headerBar =
    "border-b border-outline-variant bg-surface-lowest/80 backdrop-blur-[20px]";

  const navLinkClass = (active: boolean) =>
    [
      "whitespace-nowrap text-sm font-body transition-colors duration-150 shrink-0",
      active
        ? "font-semibold text-accent"
        : "text-on-surface/50 hover:text-on-surface",
    ].join(" ");

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 ${headerBar}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <Link
            href="/"
            className="flex min-h-0 min-w-0 shrink-0 items-center py-1 opacity-95 transition-opacity duration-150 hover:opacity-100"
          >
            <CatracaHeaderBrand />
          </Link>

          <nav
            className="mx-2 hidden min-w-0 flex-1 items-center justify-center gap-6 overflow-x-auto md:flex lg:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Principal"
          >
            {navLinks.map((link) => {
              const active = linkActive(pathname, link.href);
              return (
                <Link key={link.href} href={link.href} className={navLinkClass(active)}>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
            <ThemeToggle />
            <Link
              href="/cart"
              className="relative rounded-sm p-2 text-on-surface/50 transition-colors duration-150 hover:bg-surface-high hover:text-on-surface"
              aria-label="Carrinho"
            >
              <CartIcon />
            </Link>

            <div className="ml-2 hidden items-center gap-2 md:flex">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-xs font-display font-bold text-on-primary"
                    title={user.name}
                  >
                    {getInitials(user.name)}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-body text-on-surface/40 transition-colors duration-150 hover:text-on-surface"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-body text-on-surface/50 transition-colors duration-150 hover:text-on-surface"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    className="rounded-sm bg-gradient-to-br from-accent to-accent/85 px-4 py-2 text-sm font-display font-semibold tracking-tight text-on-accent transition-opacity duration-150 hover:opacity-90"
                  >
                    Criar conta
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              className="ml-1 rounded-sm p-2 text-on-surface/60 transition-colors duration-150 hover:bg-surface-high hover:text-on-surface md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-surface pt-16 md:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Menu de navegação"
        >
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-6">
            {navLinks.map((link) => {
              const active = linkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    "rounded-sm px-4 py-4 text-base font-display font-semibold tracking-tight transition-colors duration-150",
                    active
                      ? "bg-accent text-on-accent"
                      : "text-on-surface/70 hover:bg-surface-low hover:text-on-surface",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/cart"
              onClick={() => setMenuOpen(false)}
              className="rounded-sm px-4 py-4 text-base font-display font-semibold tracking-tight text-on-surface/70 transition-colors duration-150 hover:bg-surface-low hover:text-on-surface"
            >
              Carrinho
            </Link>

            <div className="my-4 border-t border-outline-variant" />

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-4 rounded-sm px-4 py-4 text-base font-display font-semibold tracking-tight text-on-surface/70 transition-colors duration-150 hover:bg-surface-low hover:text-on-surface"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-display font-bold text-on-primary">
                    {getInitials(user.name)}
                  </span>
                  {user.name}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-sm px-4 py-4 text-left text-base font-display font-semibold tracking-tight text-on-surface/40 transition-colors duration-150 hover:bg-error/10 hover:text-error"
                >
                  Sair
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 px-4 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-sm border border-outline-variant py-3 text-center text-base font-display font-semibold tracking-tight text-on-surface transition-colors duration-150 hover:bg-surface-low"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-sm bg-gradient-to-br from-accent to-accent/85 py-3 text-center text-base font-display font-semibold tracking-tight text-on-accent transition-opacity duration-150 hover:opacity-90"
                >
                  Criar conta
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function HamburgerIcon({ className = "" }: { className?: string }) {
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
      className={className}
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
