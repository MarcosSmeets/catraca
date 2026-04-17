"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/admin-auth";
import { adminAddOrgMember } from "@/lib/admin-api";
import { Button, Input } from "@/components/ui";
import { toast } from "sonner";

export default function AdminEquipePage() {
  const adminUser = useAdminAuthStore((s) => s.adminUser);
  const role = adminUser?.role;
  const organizationId = adminUser?.organizationId ?? null;

  const [email, setEmail] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      adminAddOrgMember(organizationId!, {
        email: email.trim().toLowerCase(),
        role: "staff",
      }),
    onSuccess: () => {
      toast.success("Membro adicionado com papel de validação de ingresso.");
      setEmail("");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível adicionar."),
  });

  if (role === "platform_admin") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">Equipe</h1>
        <p className="text-sm font-body text-on-surface/50">
          Administradores da plataforma gerenciam membros pela página{" "}
          <Link href="/admin/organizacoes" className="text-accent hover:underline">
            Organizações
          </Link>
          .
        </p>
      </div>
    );
  }

  if (role === "staff") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">Equipe</h1>
        <p className="text-sm font-body text-on-surface/50">
          Sua conta não tem permissão para convidar membros. Use{" "}
          <Link href="/admin/tickets/scan" className="text-accent hover:underline">
            Validar ingresso
          </Link>
          .
        </p>
      </div>
    );
  }

  if (role !== "admin" && role !== "organizer") {
    return (
      <p className="text-sm font-body text-on-surface/50">
        <Link href="/admin" className="text-accent hover:underline">
          Voltar ao dashboard
        </Link>
      </p>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">Equipe</h1>
        <p className="text-sm font-body text-error">
          Sua conta não está vinculada a uma organização. Entre em contato com o suporte.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-lg">
      <div>
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">Equipe</h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          Adicione pessoas que só validam ingressos no painel. O e-mail precisa ser de uma conta já
          cadastrada no site.
        </p>
      </div>

      <section className="bg-surface-low rounded-md p-6 border border-outline-variant flex flex-col gap-4">
        <Input
          label="E-mail do membro"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="operador@empresa.com"
          autoComplete="email"
        />
        <Button
          type="button"
          disabled={!email.trim() || mut.isPending}
          onClick={() => mut.mutate()}
        >
          Adicionar como validador (staff)
        </Button>
      </section>
    </div>
  );
}
