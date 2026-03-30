"use client";

import { useState } from "react";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { toast } from "sonner";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("E-mail obrigatório");
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setSent(true);
      toast.success("E-mail enviado com sucesso!");
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
              Recuperação de senha
            </p>
            <h1 className="font-display font-black text-3xl text-on-surface tracking-tight uppercase">
              Esqueci minha senha
            </h1>
          </div>

          {sent ? (
            <div className="bg-surface-lowest rounded-md p-8 text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-sm flex items-center justify-center mx-auto mb-4">
                <MailIcon />
              </div>
              <h2 className="font-display font-bold text-lg tracking-tight text-on-surface mb-2">
                E-mail enviado!
              </h2>
              <p className="text-sm font-body text-on-surface/50 mb-6">
                Verifique sua caixa de entrada em{" "}
                <span className="font-medium text-on-surface">{email}</span>.
                O link expira em 30 minutos.
              </p>
              <Link href="/login">
                <Button variant="secondary" fullWidth>
                  Voltar ao login
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-surface-lowest rounded-md p-8">
              <p className="text-sm font-body text-on-surface/50 mb-6">
                Informe o e-mail da sua conta. Enviaremos um link para redefinir sua senha.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com.br"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  error={error}
                  aria-describedby={error ? "email-error" : undefined}
                />
                <Button type="submit" fullWidth size="lg" disabled={loading}>
                  {loading ? "Enviando…" : "Enviar link de recuperação"}
                </Button>
              </form>
              <p className="text-sm text-center text-on-surface/40 font-body mt-5">
                Lembrou a senha?{" "}
                <Link href="/login" className="text-on-surface hover:underline underline-offset-2 transition-colors">
                  Fazer login
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

function MailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
