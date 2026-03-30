"use client";

import { useState } from "react";
import Link from "next/link";
import MainLayout from "@/components/features/MainLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { mockUser, mockOrders, formatCurrency, formatDate } from "@/lib/mock-data";

type Tab = "account" | "orders";

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("account");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: mockUser.name,
    email: mockUser.email,
    phone: mockUser.phone,
    cpf: mockUser.cpf,
  });

  function updateField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-body uppercase tracking-widest text-on-surface/40 mb-1">
              Sua conta
            </p>
            <h1 className="font-display font-black text-3xl md:text-4xl text-on-surface tracking-tight uppercase">
              Perfil
            </h1>
          </div>

          {/* Avatar */}
          <div className="w-14 h-14 bg-primary rounded-sm flex items-center justify-center shrink-0">
            <span className="font-display font-black text-lg text-on-primary uppercase">
              {mockUser.name
                .split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-8 border-b border-outline-variant">
          {(["account", "orders"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "px-5 py-3 text-sm font-display font-semibold uppercase tracking-tight transition-colors duration-150 -mb-px border-b-2",
                tab === t
                  ? "border-primary text-on-surface"
                  : "border-transparent text-on-surface/40 hover:text-on-surface",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {t === "account" ? "Dados pessoais" : "Pedidos"}
            </button>
          ))}
        </div>

        {/* ── Account Tab ───────────────────────────────────────────────── */}
        {tab === "account" && (
          <form onSubmit={handleSave} className="flex flex-col gap-8">
            <section className="bg-surface-lowest rounded-md p-6">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface/40 mb-5">
                Informações pessoais
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Input
                    label="Nome completo"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <Input
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                <Input
                  label="Telefone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="CPF"
                    value={form.cpf}
                    disabled
                    className="opacity-40 cursor-not-allowed"
                  />
                  <p className="mt-1.5 text-xs text-on-surface/30 font-body">
                    O CPF não pode ser alterado após o cadastro.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-surface-lowest rounded-md p-6">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-on-surface/40 mb-5">
                Segurança
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Nova senha"
                  type="password"
                  placeholder="••••••••"
                />
                <Input
                  label="Confirmar nova senha"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
            </section>

            <div className="flex items-center gap-4">
              <Button type="submit" size="md">
                Salvar alterações
              </Button>
              {saved && (
                <span className="text-sm font-body text-on-surface/50 animate-pulse">
                  ✓ Salvo com sucesso
                </span>
              )}
            </div>
          </form>
        )}

        {/* ── Orders Tab ────────────────────────────────────────────────── */}
        {tab === "orders" && (
          <div className="flex flex-col gap-4">
            {mockOrders.length === 0 ? (
              <div className="bg-surface-lowest rounded-md p-12 text-center">
                <p className="font-display font-bold text-xl text-on-surface/20 tracking-tight uppercase">
                  Nenhum pedido
                </p>
              </div>
            ) : (
              mockOrders.map((order) => (
                <div key={order.id} className="bg-surface-lowest rounded-md p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          label={
                            order.status === "PAID"
                              ? "Pago"
                              : order.status === "PENDING"
                              ? "Pendente"
                              : order.status === "FAILED"
                              ? "Falhou"
                              : "Reembolsado"
                          }
                          variant={order.status === "PAID" ? "vibe" : "status"}
                        />
                        <span className="text-xs text-on-surface/30 font-body">
                          #{order.id.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-display font-bold text-sm text-on-surface tracking-tight">
                        {order.event.homeTeam} vs {order.event.awayTeam}
                      </p>
                      <p className="text-xs text-on-surface/40 font-body mt-0.5">
                        {formatDate(order.event.startsAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-black text-lg text-on-surface tracking-tight">
                        {formatCurrency(order.totalCents)}
                      </p>
                      <p className="text-xs text-on-surface/30 font-body">
                        {order.seats.length} ingresso{order.seats.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Seats list */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-outline-variant">
                    {order.seats.map((seat) => (
                      <div
                        key={seat.id}
                        className="bg-surface-low rounded-sm px-3 py-1.5 text-xs font-body text-on-surface/60"
                      >
                        {seat.section} · {seat.row}{seat.number}
                      </div>
                    ))}
                    <Link
                      href="/tickets"
                      className="ml-auto text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors underline underline-offset-2 self-center"
                    >
                      Ver ingressos →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
