"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import Logo from "@/components/brand/Logo";
import { login } from "@/lib/auth-api";
import { useAuthStore } from "@/store/auth";
import { ApiError } from "@/lib/api";
import { formatMarketingNonFootballLeaguesSpan } from "@/lib/public-discovery-filters";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Same-origin path only; blocks open redirects (e.g. //evil.com). */
function safeRedirectPath(raw: string | null): string | null {
  if (!raw || raw.length < 2) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; api?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (!validateEmail(email)) next.email = "Informe um e-mail válido.";
    if (password.length < 6) next.password = "A senha deve ter pelo menos 6 caracteres.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await login({ email, password });
      setAuth(res.user, res.accessToken);
      const redirect = safeRedirectPath(
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null
      );
      router.push(redirect ?? "/");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Ocorreu um erro. Tente novamente.";
      setErrors({ api: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
        <Link href="/" className="flex items-center group">
          <Logo variant="lockup" className="group-hover:opacity-90 transition-opacity duration-150" />
        </Link>

        <div>
          <h1 className="font-display font-black text-5xl text-on-primary tracking-tight leading-tight mb-6">
            Seu ingresso,
            <br />
            na palma
            <br />
            da mão.
          </h1>
          <p className="text-on-primary/60 font-body text-base leading-relaxed max-w-sm">
            Do Brasileirão à Série D, {formatMarketingNonFootballLeaguesSpan()} — ingressos
            para todos os torcedores, de todos os clubes.
          </p>
        </div>

        <p className="text-on-primary/30 font-body text-xs">
          © {new Date().getFullYear()} Catraca. Todos os direitos reservados.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 bg-surface-lowest flex flex-col justify-center items-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 self-start">
          <Link href="/" className="flex items-center group">
            <Logo variant="wordmark" className="group-hover:opacity-90 transition-opacity duration-150" />
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="font-display font-black text-3xl text-on-surface tracking-tight mb-1">
            Entrar
          </h2>
          <p className="text-on-surface/50 font-body text-sm mb-8">
            Bem-vindo de volta. Acesse sua conta.
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              label="E-mail"
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <Link
                  href="/esqueci-senha"
                  className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors duration-150"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            {errors.api && (
              <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
                {errors.api}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm font-body text-on-surface/50 mt-6">
            Não tem uma conta?{" "}
            <Link
              href="/cadastro"
              className="text-on-surface font-semibold hover:underline underline-offset-2"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
