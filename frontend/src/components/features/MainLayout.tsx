import Link from "next/link";
import Navbar from "@/components/features/Navbar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-surface">{children}</main>
      <footer className="bg-surface-lowest border-t border-outline-variant mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-body text-on-surface/30">
            © {new Date().getFullYear()} Catraca. Todos os direitos reservados.
          </p>
          <nav className="flex items-center gap-5" aria-label="Links legais">
            <Link
              href="/termos"
              className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors duration-150"
            >
              Termos de Uso
            </Link>
            <Link
              href="/privacidade"
              className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors duration-150"
            >
              Privacidade
            </Link>
            <a
              href="mailto:suporte@catraca.com.br"
              className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors duration-150"
            >
              Suporte
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
