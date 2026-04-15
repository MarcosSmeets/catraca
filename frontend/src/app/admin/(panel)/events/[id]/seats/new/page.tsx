"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@/components/ui";
import { adminBatchCreateSeats, adminListSections } from "@/lib/admin-api";
import type { SeatInput } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

function generateRows(fromRow: string, count: number): string[] {
  const start = fromRow.toUpperCase().charCodeAt(0);
  return Array.from({ length: count }, (_, i) => String.fromCharCode(start + i));
}

function buildPreview(
  section: string,
  rows: string[],
  seatsPerRow: number,
  priceCents: number
): SeatInput[] {
  const inputs: SeatInput[] = [];
  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < seatsPerRow; col++) {
      inputs.push({
        section,
        row,
        number: String(col + 1),
        priceCents,
        col,
        rowIndex,
      });
    }
  });
  return inputs;
}

export default function NewSeatsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: sections } = useQuery({
    queryKey: ["admin-sections", eventId],
    queryFn: () => adminListSections(eventId),
    enabled: !!eventId,
  });

  const [section, setSection] = useState("");
  const [fromRow, setFromRow] = useState("A");
  const [rowCount, setRowCount] = useState("5");
  const [seatsPerRow, setSeatsPerRow] = useState("10");
  const [priceReais, setPriceReais] = useState("100");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewSeats, setPreviewSeats] = useState<SeatInput[] | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (seats: SeatInput[]) => adminBatchCreateSeats(eventId, seats),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-seats", eventId] });
      router.push(`/admin/events/${eventId}`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Erro ao criar assentos.";
      setErrors({ api: msg });
    },
  });

  function validate() {
    const next: Record<string, string> = {};
    if (!section) next.section = "Selecione uma seção.";
    if (!fromRow || fromRow.length !== 1 || !/[A-Za-z]/.test(fromRow))
      next.fromRow = "Informe uma letra (A-Z).";
    const rc = parseInt(rowCount, 10);
    if (!rowCount || isNaN(rc) || rc <= 0 || rc > 26)
      next.rowCount = "Entre 1 e 26 fileiras.";
    const spr = parseInt(seatsPerRow, 10);
    if (!seatsPerRow || isNaN(spr) || spr <= 0 || spr > 200)
      next.seatsPerRow = "Entre 1 e 200 assentos por fileira.";
    const price = parseFloat(priceReais);
    if (!priceReais || isNaN(price) || price <= 0)
      next.priceReais = "Preço deve ser positivo.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handlePreview() {
    if (!validate()) return;
    const rows = generateRows(fromRow, parseInt(rowCount, 10));
    const priceCents = Math.round(parseFloat(priceReais) * 100);
    const seats = buildPreview(section, rows, parseInt(seatsPerRow, 10), priceCents);
    setPreviewSeats(seats);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!previewSeats) {
      handlePreview();
      return;
    }
    mutate(previewSeats);
  }

  const totalSeats =
    parseInt(rowCount, 10) > 0 && parseInt(seatsPerRow, 10) > 0
      ? parseInt(rowCount, 10) * parseInt(seatsPerRow, 10)
      : 0;

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
          Adicionar Assentos
        </h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          Configure o bloco de assentos. Fileiras são geradas automaticamente a partir da letra inicial.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60">
            Seção
          </label>
          {sections && sections.length > 0 ? (
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setPreviewSeats(null);
              }}
              className={[
                "w-full bg-surface-lowest px-4 py-3 text-sm text-on-surface font-body",
                "rounded-sm border border-outline-variant",
                "focus:outline-none focus:border-accent transition-colors duration-150",
                errors.section ? "border-error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <option value="">Selecione uma seção</option>
              {sections.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-4 py-3 bg-surface-low border border-outline-variant rounded-sm">
              <p className="text-sm font-body text-on-surface/50">
                Nenhuma seção cadastrada.{" "}
                <button
                  type="button"
                  onClick={() => router.push(`/admin/events/${eventId}/sections/new`)}
                  className="text-accent hover:underline"
                >
                  Criar seção primeiro
                </button>
              </p>
            </div>
          )}
          {errors.section && (
            <span className="text-xs text-error font-body">{errors.section}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fileira inicial"
            placeholder="A"
            value={fromRow}
            onChange={(e) => {
              setFromRow(e.target.value);
              setPreviewSeats(null);
            }}
            error={errors.fromRow}
            maxLength={1}
          />
          <Input
            label="Nº de fileiras"
            type="number"
            placeholder="5"
            value={rowCount}
            onChange={(e) => {
              setRowCount(e.target.value);
              setPreviewSeats(null);
            }}
            error={errors.rowCount}
            min={1}
            max={26}
          />
        </div>

        <Input
          label="Assentos por fileira"
          type="number"
          placeholder="10"
          value={seatsPerRow}
          onChange={(e) => {
            setSeatsPerRow(e.target.value);
            setPreviewSeats(null);
          }}
          error={errors.seatsPerRow}
          min={1}
          max={200}
        />

        <Input
          label="Preço (R$)"
          type="number"
          placeholder="100.00"
          value={priceReais}
          onChange={(e) => {
            setPriceReais(e.target.value);
            setPreviewSeats(null);
          }}
          error={errors.priceReais}
          min={0.01}
          step={0.01}
        />

        {/* Preview summary */}
        {totalSeats > 0 && section && (
          <div className="bg-surface-low border border-outline-variant rounded-sm px-4 py-3 flex flex-col gap-1">
            <p className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/40">
              Resumo do lote
            </p>
            <p className="text-sm font-body text-on-surface">
              <strong>{totalSeats}</strong> assentos · Seção <strong>{section}</strong> ·
              Fileiras{" "}
              <strong>
                {fromRow.toUpperCase()}–
                {String.fromCharCode(
                  fromRow.toUpperCase().charCodeAt(0) + (parseInt(rowCount, 10) || 1) - 1
                )}
              </strong>{" "}
              · R$ <strong>{parseFloat(priceReais || "0").toFixed(2)}</strong> cada
            </p>
          </div>
        )}

        {previewSeats && (
          <div className="bg-accent/5 border border-accent/20 rounded-sm px-4 py-3">
            <p className="text-xs font-display font-semibold uppercase tracking-tight text-accent">
              Pré-visualização gerada
            </p>
            <p className="text-sm font-body text-on-surface mt-1">
              {previewSeats.length} assentos prontos para cadastro. Clique em "Confirmar e Salvar".
            </p>
          </div>
        )}

        {errors.api && (
          <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
            {errors.api}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          {!previewSeats ? (
            <Button type="button" variant="secondary" onClick={handlePreview}>
              Pré-visualizar
            </Button>
          ) : (
            <>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? "Salvando..." : `Confirmar e Salvar ${previewSeats.length} assentos`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPreviewSeats(null)}
                disabled={isPending}
              >
                Reeditar
              </Button>
            </>
          )}
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
