"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@/components/ui";
import { adminCreateSection } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

export default function NewSectionPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate, isPending } = useMutation({
    mutationFn: () => adminCreateSection(eventId, { name, imageUrl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sections", eventId] });
      router.push(`/admin/events/${eventId}`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Erro ao criar seção.";
      setErrors({ api: msg });
    },
  });

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Nome da seção é obrigatório.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutate();
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <div className="mb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors"
          >
            ← Voltar ao evento
          </button>
        </div>
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
          Nova Seção
        </h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          Adicione uma seção ao evento com nome e foto opcional do mapa de assentos.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Input
          label="Nome da Seção"
          placeholder="Setor Norte, Cadeira Especial, Arquibancada..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label="URL da Foto do Setor (opcional)"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <p className="text-xs text-on-surface/40 font-body">
            Imagem mostrando a localização e vista da seção no estádio.
          </p>
        </div>

        {imageUrl && (
          <div className="border border-outline-variant rounded-sm overflow-hidden">
            <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40 px-3 py-2 border-b border-outline-variant">
              Pré-visualização
            </p>
            <div className="relative h-40 bg-surface-high">
              <img
                src={imageUrl}
                alt="Pré-visualização da seção"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}

        {errors.api && (
          <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
            {errors.api}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Salvando..." : "Criar Seção"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
