"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@/components/ui";
import { adminCreateVenue } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

export default function NewVenuePage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [capacity, setCapacity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate, isPending } = useMutation({
    mutationFn: adminCreateVenue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-venues"] });
      router.push("/admin/venues");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Erro ao cadastrar estádio.";
      setErrors({ api: msg });
    },
  });

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Nome é obrigatório.";
    if (!city.trim()) next.city = "Cidade é obrigatória.";
    if (!state) next.state = "UF é obrigatório.";
    const cap = parseInt(capacity, 10);
    if (!capacity || isNaN(cap) || cap <= 0) next.capacity = "Capacidade deve ser um número positivo.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutate({ name, city, state, capacity: parseInt(capacity, 10) });
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
          Novo Estádio
        </h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          Preencha os dados do estádio.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Input
          label="Nome"
          placeholder="Arena XYZ"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Input
          label="Cidade"
          placeholder="São Paulo"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          error={errors.city}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60">
            Estado (UF)
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={[
              "w-full bg-surface-lowest px-4 py-3 text-sm text-on-surface font-body",
              "rounded-sm border border-outline-variant",
              "focus:outline-none focus:border-primary transition-colors duration-150",
              errors.state ? "border-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <option value="">Selecione</option>
            {STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          {errors.state && (
            <span className="text-xs text-error font-body">{errors.state}</span>
          )}
        </div>
        <Input
          label="Capacidade"
          type="number"
          placeholder="45000"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          error={errors.capacity}
          min={1}
        />

        {errors.api && (
          <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
            {errors.api}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Salvando..." : "Cadastrar Estádio"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
