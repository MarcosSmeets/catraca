"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/admin-auth";
import {
  useAdminOrganizationsList,
  adminStartOrgSubscriptionCheckout,
  adminCreateOrganization,
  adminAddOrgMember,
} from "@/lib/admin-api";
import { Button } from "@/components/ui";
import { toast } from "sonner";

function OrgInviteRow({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"organizer" | "staff">("organizer");

  const mut = useMutation({
    mutationFn: () =>
      adminAddOrgMember(orgId, {
        email: email.trim().toLowerCase(),
        role,
      }),
    onSuccess: () => {
      toast.success("Membro vinculado à organização.");
      setEmail("");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível adicionar."),
  });

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 py-3 px-4">
      <p className="text-xs text-on-surface/40 font-body w-full sm:w-auto sm:mr-2">
        O usuário precisa já estar cadastrado no site. Conta existente com este e-mail.
      </p>
      <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <span className="text-xs text-on-surface/40">E-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-surface-lowest border border-outline-variant rounded-sm px-3 py-2 text-sm"
          placeholder="nome@empresa.com"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 w-full sm:w-48">
        <span className="text-xs text-on-surface/40">Papel</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "organizer" | "staff")}
          className="bg-surface-lowest border border-outline-variant rounded-sm px-3 py-2 text-sm"
        >
          <option value="organizer">Administrador da org</option>
          <option value="staff">Validação de ingresso</option>
        </select>
      </label>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!email.trim() || mut.isPending}
        onClick={() => mut.mutate()}
      >
        Adicionar membro
      </Button>
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const adminUser = useAdminAuthStore((s) => s.adminUser);
  const isPlatformAdmin = adminUser?.role === "platform_admin";
  const qc = useQueryClient();
  const { data, isLoading, isError } = useAdminOrganizationsList(isPlatformAdmin);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const createMut = useMutation({
    mutationFn: () => adminCreateOrganization({ name: name.trim(), slug: slug.trim() }),
    onSuccess: () => {
      toast.success("Organização criada.");
      setName("");
      setSlug("");
      void qc.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar."),
  });

  const checkoutMut = useMutation({
    mutationFn: (orgId: string) => adminStartOrgSubscriptionCheckout(orgId),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e: Error) => toast.error(e.message || "Checkout indisponível."),
  });

  if (!isPlatformAdmin) {
    return (
      <p className="text-sm font-body text-on-surface/50">
        Esta página é restrita a administradores da plataforma.{" "}
        <Link href="/admin" className="text-accent hover:underline">
          Voltar ao dashboard
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
          Organizações
        </h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          Empresas cadastradas e assinatura Stripe (Billing).
        </p>
      </div>

      <section className="bg-surface-low rounded-md p-6 border border-outline-variant">
        <h2 className="font-display font-bold text-sm uppercase tracking-tight text-on-surface mb-4">
          Nova organização
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-on-surface/40">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-lowest border border-outline-variant rounded-sm px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-on-surface/40">Slug (URL)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              className="bg-surface-lowest border border-outline-variant rounded-sm px-3 py-2 text-sm"
            />
          </label>
          <Button
            type="button"
            disabled={!name.trim() || !slug.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Criar
          </Button>
        </div>
      </section>

      {isLoading && <p className="text-sm text-on-surface/40">Carregando…</p>}
      {isError && <p className="text-sm text-error">Falha ao carregar lista.</p>}

      <div className="overflow-x-auto border border-outline-variant rounded-md">
        <table className="w-full text-sm font-body">
          <thead className="bg-surface-low text-left text-xs uppercase text-on-surface/40">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Assinatura</th>
              <th className="px-4 py-3">Catálogo</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((o) => (
              <Fragment key={o.id}>
                <tr className="border-t border-outline-variant">
                  <td className="px-4 py-3">{o.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{o.slug}</td>
                  <td className="px-4 py-3">{o.subscriptionStatus ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/e/${o.slug}/events`}
                      className="text-accent hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir vitrine
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={checkoutMut.isPending}
                      onClick={() => checkoutMut.mutate(o.id)}
                    >
                      Assinatura Stripe
                    </Button>
                  </td>
                </tr>
                <tr className="border-t border-outline-variant bg-surface-lowest/40">
                  <td colSpan={5} className="p-0">
                    <OrgInviteRow orgId={o.id} />
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
