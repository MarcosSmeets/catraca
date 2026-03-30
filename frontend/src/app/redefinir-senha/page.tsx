"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { toast } from "sonner";

function RedefinirSenhaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const next: Partial<typeof form> = {};
    if (!form.password) next.password = "Senha obrigatória";
    else if (form.password.length < 8) next.password = "Mínimo 8 caracteres";
    if (!form.confirm) next.confirm = "Confirmação obrigatória";
    else if (form.confirm !== form.password) next.confirm = "Senhas não coincidem";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      toast.success("Senha redefinida com sucesso!");
      router.push("/login");
    } catch {
      toast.error("Link inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="bg-surface-lowest rounded-md p-8 text-center">
        <p className="font-display font-bold text-on-surface/40 uppercase tracking-tight mb-3">
          Link inválido
        </p>
        <p className="text-sm font-body text-on-surface/40 mb-5">
          O link de recuperação é inválido ou expirou.
        </p>
        <Link href="/esqueci-senha">
          <Button variant="secondary">Solicitar novo link</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface-lowest rounded-md p-8">
      <p className="text-sm font-body text-on-surface/50 mb-6">
        Crie uma nova senha segura para sua conta.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Input
          label="Nova senha"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => {
            setForm((f) => ({ ...f, password: e.target.value }));
            setErrors((err) => ({ ...err, password: "" }));
          }}
          error={errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          placeholder="••••••••"
          value={form.confirm}
          onChange={(e) => {
            setForm((f) => ({ ...f, confirm: e.target.value }));
            setErrors((err) => ({ ...err, confirm: "" }));
          }}
          error={errors.confirm}
          aria-describedby={errors.confirm ? "confirm-error" : undefined}
        />
        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? "Redefinindo…" : "Redefinir senha"}
        </Button>
      </form>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
              Recuperação de senha
            </p>
            <h1 className="font-display font-black text-3xl text-on-surface tracking-tight uppercase">
              Nova senha
            </h1>
          </div>
          <Suspense fallback={<div className="h-40 bg-surface-lowest rounded-md animate-pulse" />}>
            <RedefinirSenhaForm />
          </Suspense>
        </div>
      </div>
    </MainLayout>
  );
}
