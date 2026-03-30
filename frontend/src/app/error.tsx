"use client";

import { useEffect } from "react";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-md">
          <p className="font-display font-black text-8xl text-error/10 tracking-tight mb-4">
            500
          </p>
          <h1 className="font-display font-black text-2xl md:text-3xl text-on-surface tracking-tight uppercase mb-3">
            Algo deu errado
          </h1>
          <p className="text-sm font-body text-on-surface/50 mb-8">
            Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-on-surface/20 mb-6">
              ID: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset}>Tentar novamente</Button>
            <Button variant="secondary" onClick={() => (window.location.href = "/")}>
              Ir para o início
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
