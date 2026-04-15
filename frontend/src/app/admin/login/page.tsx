"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import Logo from "@/components/brand/Logo";
import { adminAuthLogin } from "@/lib/admin-auth-api";
import { useAdminAuthStore } from "@/store/admin-auth";
import { ApiError } from "@/lib/api";
import type { AdminUser } from "@/store/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const setAdminAuth = useAdminAuthStore((s) => s.setAdminAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; api?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Informe um e-mail válido.";
    if (password.length < 6) next.password = "Senha deve ter pelo menos 6 caracteres.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await adminAuthLogin(email, password);
      setAdminAuth(res.user as AdminUser, res.accessToken);
      router.replace("/admin");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 403
            ? "Esta conta não tem permissão de acesso ao painel admin."
            : err.message
          : "Ocorreu um erro. Tente novamente.";
      setErrors({ api: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
        <Link href="/" className="flex items-center group">
          <Logo variant="lockup" className="max-h-16 w-auto group-hover:opacity-90 transition-opacity duration-150" />
        </Link>
        <div>
          <h1 className="font-display font-black text-5xl text-on-primary tracking-tight leading-tight mb-6">
            Painel
            <br />
            Administrativo
          </h1>
          <p className="text-on-primary/60 font-body text-base leading-relaxed max-w-sm">
            Acesso restrito a administradores e organizadores de eventos.
          </p>
        </div>
        <p className="text-on-primary/30 font-body text-xs">
          © {new Date().getFullYear()} Catraca. Todos os direitos reservados.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-surface-lowest flex flex-col justify-center items-center px-6 py-12">
        <div className="lg:hidden mb-10 self-start">
          <Link href="/" className="flex items-center group">
            <Logo variant="wordmark" className="group-hover:opacity-90 transition-opacity duration-150" />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-xs font-display font-semibold uppercase tracking-tight text-accent mb-1">
              Acesso restrito
            </p>
            <h2 className="font-display font-black text-3xl text-on-surface tracking-tight mb-1">
              Entrar no Admin
            </h2>
            <p className="text-on-surface/50 font-body text-sm">
              Use suas credenciais de administrador ou organizador.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              label="E-mail"
              type="email"
              placeholder="admin@catraca.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />

            {errors.api && (
              <div className="flex items-start gap-3 text-sm font-body text-error bg-error/5 border border-error/20 px-4 py-3 rounded-sm">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{errors.api}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? "Verificando..." : "Entrar no Painel"}
            </Button>
          </form>

          <p className="text-center text-sm font-body text-on-surface/40 mt-8">
            <Link href="/" className="hover:text-on-surface transition-colors">
              ← Voltar ao site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
