"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import Logo from "@/components/brand/Logo";
import { register } from "@/lib/auth-api";
import { useAuthStore } from "@/store/auth";
import { ApiError } from "@/lib/api";

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(digits[10]);
}

export default function CadastroPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    cpf?: string;
    password?: string;
    confirmPassword?: string;
    api?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Informe seu nome completo.";
    if (!validateEmail(email)) next.email = "Informe um e-mail válido.";
    if (!cpf.trim()) {
      next.cpf = "CPF obrigatório.";
    } else if (!validateCPF(cpf)) {
      next.cpf = "CPF inválido.";
    }
    if (password.length < 8) next.password = "A senha deve ter pelo menos 8 caracteres.";
    if (confirmPassword !== password) next.confirmPassword = "As senhas não coincidem.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const res = await register({ name: name.trim(), email, password, cpf: cpf.replace(/\D/g, "") });
      setAuth(res.user, res.accessToken);
      router.push("/");
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
          <Logo variant="lockup" className="max-h-16 w-auto group-hover:opacity-90 transition-opacity duration-150" />
        </Link>

        <div>
          <h1 className="font-display font-black text-5xl text-on-primary tracking-tight leading-tight mb-6">
            Futebol,
            <br />
            basquete,
            <br />
            vôlei e mais.
          </h1>
          <p className="text-on-primary/60 font-body text-base leading-relaxed max-w-sm">
            Crie sua conta e garanta ingressos para os melhores eventos
            esportivos do Brasil.
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
            Criar conta
          </h2>
          <p className="text-on-surface/50 font-body text-sm mb-8">
            Rápido e gratuito. Comece agora.
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <Input
              label="Nome completo"
              type="text"
              placeholder="João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoComplete="name"
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))}
              error={errors.cpf}
              inputMode="numeric"
              autoComplete="off"
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="new-password"
            />

            <Input
              label="Confirmar senha"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

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
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <p className="text-center text-sm font-body text-on-surface/50 mt-6">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-on-surface font-semibold hover:underline underline-offset-2"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
