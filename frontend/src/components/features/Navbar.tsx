"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
  const [modulesOpen, setModulesOpen] = useState(false);
  const modulesWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setModulesOpen(false);
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

  useEffect(() => {
    if (!modulesOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = modulesWrapRef.current;
      if (el && !el.contains(e.target as Node)) setModulesOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [modulesOpen]);

  async function handleLogout() {
    try {
      await logout(accessToken);
    } catch {
      // proceed with client-side clear regardless
    }
    clear();
    setMenuOpen(false);
    setModulesOpen(false);
    router.push("/login");
  }

  const headerBar =
    "border-b border-white/10 bg-gradient-to-r from-brand-teal-deep via-brand-teal to-brand-teal-deep";

  const navLinkClass = (active: boolean) =>
    [
      "whitespace-nowrap border-b-2 border-transparent pb-0.5 text-[11px] sm:text-xs font-display font-semibold tracking-wide uppercase transition-colors duration-150 shrink-0",
      active ? "border-brand-red text-white" : "text-white/75 hover:text-white",
    ].join(" ");

  const dropItem =
    "block px-4 py-2.5 text-sm font-display font-semibold tracking-tight text-white/90 hover:bg-white/10 transition-colors duration-150";

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 ${headerBar}`}>
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <Link
            href="/"
            className="flex min-h-0 min-w-0 shrink-0 items-center py-1 opacity-95 transition-opacity duration-150 hover:opacity-100"
          >
            <CatracaHeaderBrand />
          </Link>

          <div className="relative hidden shrink-0 md:block" ref={modulesWrapRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-2 text-white/85 transition-colors duration-150 hover:bg-white/10 hover:text-white"
              onClick={() => setModulesOpen((v) => !v)}
              aria-expanded={modulesOpen}
              aria-haspopup="menu"
              aria-controls="menu-modulos"
              id="btn-modulos"
            >
              <HamburgerIcon className="text-white/90" />
              <span className="text-xs font-display font-semibold uppercase tracking-wide">
                Módulos
              </span>
            </button>
            {modulesOpen && (
              <div
                id="menu-modulos"
                role="menu"
                aria-labelledby="btn-modulos"
                className="absolute left-0 top-full z-[60] mt-1 w-56 rounded-sm border border-white/10 bg-brand-teal-deep py-1 shadow-lg"
              >
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    role="menuitem"
                    href={link.href}
                    onClick={() => setModulesOpen(false)}
                    className={dropItem}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  role="menuitem"
                  href="/cart"
                  onClick={() => setModulesOpen(false)}
                  className={dropItem}
                >
                  Carrinho
                </Link>
                {user ? (
                  <Link
                    role="menuitem"
                    href="/profile"
                    onClick={() => setModulesOpen(false)}
                    className={dropItem}
                  >
                    Perfil
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          <nav
            className="mx-2 hidden min-w-0 flex-1 items-center justify-center gap-4 overflow-x-auto md:flex lg:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 md:ml-0">
            <ThemeToggle className="text-white/70 hover:text-white hover:bg-white/10" />
            <Link
              href="/cart"
              className="relative rounded-sm p-2 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
              aria-label="Carrinho"
            >
              <CartIcon />
            </Link>

            <div className="ml-1 hidden items-center gap-2 md:flex">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-display font-bold text-white ring-1 ring-white/25 transition-colors duration-150 hover:bg-white/25"
                    title={user.name}
                  >
                    {getInitials(user.name)}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-xs font-body text-white/55 transition-colors duration-150 hover:text-white"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-body text-white/75 transition-colors duration-150 hover:text-white"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    className="rounded-sm bg-gradient-to-br from-brand-red to-brand-red/85 px-4 py-2 text-sm font-display font-semibold tracking-tight text-white transition-opacity duration-150 hover:opacity-90"
                  >
                    Criar conta
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              className="rounded-sm p-2 text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white md:hidden"
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
          className="fixed inset-0 z-40 flex flex-col bg-brand-teal-deep pt-16 md:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Menu de navegação"
        >
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 py-6">
            {navLinks.map((link) => {
              const active = linkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    "rounded-sm px-4 py-4 text-base font-display font-semibold tracking-tight transition-colors duration-150",
                    active ? "bg-brand-red/25 text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/cart"
              onClick={() => setMenuOpen(false)}
              className="rounded-sm px-4 py-4 text-base font-display font-semibold tracking-tight text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            >
              Carrinho
            </Link>

            <div className="my-4 border-t border-white/15" />

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-4 rounded-sm px-4 py-4 text-base font-display font-semibold tracking-tight text-white/85 transition-colors duration-150 hover:bg-white/10"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-display font-bold text-white ring-1 ring-white/25">
                    {getInitials(user.name)}
                  </span>
                  {user.name}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-sm px-4 py-4 text-left text-base font-display font-semibold tracking-tight text-white/50 transition-colors duration-150 hover:bg-brand-red/15 hover:text-white"
                >
                  Sair
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 px-4 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-sm border border-white/25 py-3 text-center text-base font-display font-semibold tracking-tight text-white transition-colors duration-150 hover:bg-white/10"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  onClick={() => setMenuOpen(false)}
                  className="w-full rounded-sm bg-gradient-to-br from-brand-red to-brand-red/85 py-3 text-center text-base font-display font-semibold tracking-tight text-white transition-opacity duration-150 hover:opacity-90"
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
