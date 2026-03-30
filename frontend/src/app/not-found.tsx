import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-md">
          <p className="font-display font-black text-8xl text-on-surface/10 tracking-tight mb-4">
            404
          </p>
          <h1 className="font-display font-black text-2xl md:text-3xl text-on-surface tracking-tight uppercase mb-3">
            Página não encontrada
          </h1>
          <p className="text-sm font-body text-on-surface/50 mb-8">
            A página que você está procurando não existe ou foi movida.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button>Ir para o início</Button>
            </Link>
            <Link href="/search">
              <Button variant="secondary">Explorar eventos</Button>
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
