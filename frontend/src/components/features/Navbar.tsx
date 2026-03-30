"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { logout } from "@/lib/auth-api";
import ThemeToggle from "@/components/ui/ThemeToggle";

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

  async function handleLogout() {
    try {
      await logout(accessToken);
    } catch {
      // proceed with client-side clear regardless
    }
    clear();
    router.push("/login");
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-lowest/80 backdrop-blur-[20px] border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display font-black text-xl tracking-tight text-primary uppercase">
            Catraca
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-125 transition-transform duration-150" />
        </Link>

        {/* Nav links */}
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
                    ? "text-primary font-semibold"
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

          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/profile"
                className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center text-on-primary text-xs font-display font-bold"
                title={user.name}
              >
                {getInitials(user.name)}
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors duration-150 hidden md:block"
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/login"
                className="text-sm font-body text-on-surface/50 hover:text-on-surface transition-colors duration-150"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="px-4 py-2 text-sm font-display font-semibold tracking-tight bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-sm hover:opacity-90 transition-opacity duration-150"
              >
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
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
