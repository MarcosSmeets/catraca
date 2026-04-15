"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { logout } from "@/lib/auth-api";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Logo from "@/components/brand/Logo";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Explorar" },
  { href: "/tickets", label: "Meus Ingressos" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clear = useAuthStore((s) => s.clear);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while menu is open
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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-lowest/80 backdrop-blur-[20px] border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex min-h-16 items-center justify-between gap-4 py-2 lg:min-h-80 lg:py-4">
          <Link
            href="/"
            className="flex min-h-0 min-w-0 shrink-0 items-center group"
          >
            <Logo
              variant="wordmark"
              priority
              className="object-contain object-left group-hover:opacity-90 transition-opacity duration-150"
            />
          </Link>

          {/* Nav links — desktop only */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "text-sm font-body transition-colors duration-150",
                    isActive
                      ? "text-accent font-semibold"
                      : "text-on-surface/50 hover:text-on-surface",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/cart"
              className="relative p-2 text-on-surface/50 hover:text-on-surface transition-colors duration-150 rounded-sm hover:bg-surface-high"
              aria-label="Carrinho"
            >
              <CartIcon />
            </Link>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2 ml-2">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-on-primary text-xs font-display font-bold"
                    title={user.name}
                  >
                    {getInitials(user.name)}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors duration-150"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-body text-on-surface/50 hover:text-on-surface transition-colors duration-150"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    className="px-4 py-2 text-sm font-display font-semibold tracking-tight bg-gradient-to-br from-accent to-accent/85 text-on-accent rounded-sm hover:opacity-90 transition-opacity duration-150"
                  >
                    Criar conta
                  </Link>
                </>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 text-on-surface/60 hover:text-on-surface transition-colors duration-150 rounded-sm hover:bg-surface-high ml-1"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface pt-16 flex flex-col md:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Menu de navegação"
        >
          <nav className="flex flex-col px-6 py-6 gap-1 flex-1 overflow-y-auto">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={[
                    "flex items-center gap-4 px-4 py-4 rounded-sm text-base font-display font-semibold tracking-tight transition-colors duration-150",
                    isActive
                      ? "bg-accent text-on-accent"
                      : "text-on-surface/70 hover:bg-surface-low hover:text-on-surface",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="my-4 border-t border-outline-variant" />

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-sm text-base font-display font-semibold tracking-tight text-on-surface/70 hover:bg-surface-low hover:text-on-surface transition-colors duration-150"
                >
                  <span className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-on-primary text-xs font-display font-bold shrink-0">
                    {getInitials(user.name)}
                  </span>
                  {user.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-4 px-4 py-4 rounded-sm text-base font-display font-semibold tracking-tight text-on-surface/40 hover:bg-error/10 hover:text-error transition-colors duration-150 text-left"
                >
                  Sair
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 px-4 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-full py-3 text-center text-base font-display font-semibold tracking-tight text-on-surface border border-outline-variant rounded-sm hover:bg-surface-low transition-colors duration-150"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  onClick={() => setMenuOpen(false)}
                  className="w-full py-3 text-center text-base font-display font-semibold tracking-tight bg-gradient-to-br from-accent to-accent/85 text-on-accent rounded-sm hover:opacity-90 transition-opacity duration-150"
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
