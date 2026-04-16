"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@/components/ui";
import { adminBatchCreateSeats, adminListSections } from "@/lib/admin-api";
import type { SeatInput } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

interface SectionFormState {
  enabled: boolean;
  fromRow: string;
  rowCount: string;
  seatsPerRow: string;
  priceReais: string;
}

const DEFAULT_SECTION_FORM: SectionFormState = {
  enabled: true,
  fromRow: "A",
  rowCount: "5",
  seatsPerRow: "10",
  priceReais: "100",
};

// Spreadsheet-style label: 1→A, 26→Z, 27→AA, 28→AB, … Starts from `fromRow`.
function rowLabelAt(startIndex: number): string {
  let n = startIndex;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

function parseRowLabel(label: string): number {
  let n = 0;
  for (const ch of label.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 65 + 1);
  }
  return n - 1; // 0-indexed
}

function generateRows(fromRow: string, count: number): string[] {
  const startIdx = parseRowLabel(fromRow);
  return Array.from({ length: count }, (_, i) => rowLabelAt(startIdx + i));
}

function buildSectionSeats(
  section: string,
  state: SectionFormState
): { seats: SeatInput[]; error: string | null } {
  if (!state.fromRow || !/^[A-Za-z]+$/.test(state.fromRow)) {
    return { seats: [], error: "Informe uma fileira inicial válida (ex: A, B, AA)." };
  }
  const rc = parseInt(state.rowCount, 10);
  if (!state.rowCount || isNaN(rc) || rc <= 0) {
    return { seats: [], error: "Nº de fileiras deve ser positivo." };
  }
  const spr = parseInt(state.seatsPerRow, 10);
  if (!state.seatsPerRow || isNaN(spr) || spr <= 0) {
    return { seats: [], error: "Assentos por fileira deve ser positivo." };
  }
  const price = parseFloat(state.priceReais);
  if (!state.priceReais || isNaN(price) || price <= 0) {
    return { seats: [], error: "Preço deve ser positivo." };
  }
  const priceCents = Math.round(price * 100);
  const rows = generateRows(state.fromRow, rc);
  const seats: SeatInput[] = [];
  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < spr; col++) {
      seats.push({
        section,
        row,
        number: String(col + 1),
        priceCents,
        col,
        rowIndex,
      });
    }
  });
  return { seats, error: null };
}

export default function NewSeatsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["admin-sections", eventId],
    queryFn: () => adminListSections(eventId),
    enabled: !!eventId,
  });

  const [forms, setForms] = useState<Record<string, SectionFormState>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (seats: SeatInput[]) => adminBatchCreateSeats(eventId, seats),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-seats", eventId] });
      router.push(`/admin/events/${eventId}`);
    },
    onError: (err) => {
      setApiError(err instanceof ApiError ? err.message : "Erro ao criar assentos.");
    },
  });

  // Initialize one form state per section once sections load
  const formsForSections = useMemo(() => {
    if (!sections) return forms;
    const next = { ...forms };
    sections.forEach((s) => {
      if (!next[s.id]) next[s.id] = { ...DEFAULT_SECTION_FORM };
    });
    return next;
  }, [sections, forms]);

  function updateForm(id: string, patch: Partial<SectionFormState>) {
    setForms((prev) => ({
      ...prev,
      [id]: { ...DEFAULT_SECTION_FORM, ...prev[id], ...patch },
    }));
  }

  const preview = useMemo(() => {
    if (!sections) return { seats: [] as SeatInput[], errors: {} as Record<string, string>, enabledCount: 0 };
    const all: SeatInput[] = [];
    const errors: Record<string, string> = {};
    let enabledCount = 0;
    sections.forEach((s) => {
      const state = formsForSections[s.id] ?? DEFAULT_SECTION_FORM;
      if (!state.enabled) return;
      enabledCount++;
      const { seats, error } = buildSectionSeats(s.name, state);
      if (error) errors[s.id] = error;
      else all.push(...seats);
    });
    return { seats: all, errors, enabledCount };
  }, [sections, formsForSections]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);
    if (preview.enabledCount === 0) {
      setApiError("Habilite ao menos uma seção.");
      return;
    }
    if (Object.keys(preview.errors).length > 0) return;
    if (preview.seats.length === 0) return;
    mutate(preview.seats);
  }

  if (sectionsLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface-low rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-lg">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors mb-2"
          >
            ← Voltar ao evento
          </button>
          <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
            Adicionar Assentos
          </h1>
        </div>
        <div className="px-4 py-6 bg-surface-low border border-outline-variant rounded-sm">
          <p className="text-sm font-body text-on-surface/60 mb-3">
            Nenhuma seção cadastrada para este evento. Crie ao menos uma seção antes de adicionar assentos.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/admin/events/${eventId}/sections/new`)}
          >
            + Criar Seção
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs font-body text-on-surface/40 hover:text-on-surface transition-colors mb-2"
        >
          ← Voltar ao evento
        </button>
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
          Adicionar Assentos
        </h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          Configure todas as seções de uma vez. Desabilite as que não deseja cadastrar agora.
        </p>
      </div>

      {/* Quick-apply bar */}
      <div className="bg-surface-low border border-outline-variant rounded-sm px-4 py-3 flex flex-wrap items-center gap-3 text-xs font-body text-on-surface/60">
        <span className="font-semibold text-on-surface/70">Aplicar a todas:</span>
        <button
          type="button"
          onClick={() => {
            const next = { ...formsForSections };
            sections.forEach((s) => {
              next[s.id] = { ...(next[s.id] ?? DEFAULT_SECTION_FORM), enabled: true };
            });
            setForms(next);
          }}
          className="px-2 py-1 rounded-sm hover:bg-surface text-on-surface/70 hover:text-on-surface transition-colors"
        >
          Habilitar todas
        </button>
        <button
          type="button"
          onClick={() => {
            const next = { ...formsForSections };
            sections.forEach((s) => {
              next[s.id] = { ...(next[s.id] ?? DEFAULT_SECTION_FORM), enabled: false };
            });
            setForms(next);
          }}
          className="px-2 py-1 rounded-sm hover:bg-surface text-on-surface/70 hover:text-on-surface transition-colors"
        >
          Desabilitar todas
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span>Copiar da primeira seção habilitada:</span>
          <button
            type="button"
            onClick={() => {
              const first = sections.find((s) => (formsForSections[s.id] ?? DEFAULT_SECTION_FORM).enabled);
              if (!first) return;
              const source = formsForSections[first.id];
              const next = { ...formsForSections };
              sections.forEach((s) => {
                if (s.id === first.id) return;
                next[s.id] = {
                  ...next[s.id],
                  fromRow: source.fromRow,
                  rowCount: source.rowCount,
                  seatsPerRow: source.seatsPerRow,
                  priceReais: source.priceReais,
                };
              });
              setForms(next);
            }}
            className="px-2 py-1 rounded-sm bg-surface hover:bg-surface-lowest text-on-surface/70 hover:text-on-surface transition-colors"
          >
            Copiar ↓
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {sections.map((section) => {
          const state = formsForSections[section.id] ?? DEFAULT_SECTION_FORM;
          const err = preview.errors[section.id];
          const rc = parseInt(state.rowCount, 10) || 0;
          const spr = parseInt(state.seatsPerRow, 10) || 0;
          const total = state.enabled ? rc * spr : 0;
          return (
            <div
              key={section.id}
              className={[
                "border rounded-sm bg-surface-low transition-opacity",
                state.enabled ? "border-outline-variant opacity-100" : "border-outline-variant/50 opacity-60",
              ].join(" ")}
            >
              {/* Header: toggle + name */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.enabled}
                    onChange={(e) => updateForm(section.id, { enabled: e.target.checked })}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="font-display font-semibold text-sm text-on-surface">
                    {section.name}
                  </span>
                </label>
                {state.enabled && total > 0 && (
                  <span className="text-xs font-body text-on-surface/50">
                    {total} assento{total === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {/* Fields */}
              {state.enabled && (
                <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Input
                    label="Fileira inicial"
                    placeholder="A"
                    value={state.fromRow}
                    onChange={(e) => updateForm(section.id, { fromRow: e.target.value })}
                  />
                  <Input
                    label="Nº de fileiras"
                    type="number"
                    placeholder="5"
                    value={state.rowCount}
                    min={1}
                    onChange={(e) => updateForm(section.id, { rowCount: e.target.value })}
                  />
                  <Input
                    label="Assentos/fileira"
                    type="number"
                    placeholder="10"
                    value={state.seatsPerRow}
                    min={1}
                    onChange={(e) => updateForm(section.id, { seatsPerRow: e.target.value })}
                  />
                  <Input
                    label="Preço (R$)"
                    type="number"
                    placeholder="100.00"
                    value={state.priceReais}
                    min={0.01}
                    step={0.01}
                    onChange={(e) => updateForm(section.id, { priceReais: e.target.value })}
                  />
                </div>
              )}

              {state.enabled && err && (
                <p className="text-xs text-error font-body px-4 pb-3">{err}</p>
              )}
            </div>
          );
        })}

        {/* Summary */}
        <div className="bg-accent/5 border border-accent/20 rounded-sm px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-display font-semibold uppercase tracking-tight text-accent">
              Resumo total
            </p>
            <p className="text-sm font-body text-on-surface mt-0.5">
              <strong>{preview.seats.length}</strong> assentos em{" "}
              <strong>{preview.enabledCount}</strong> {preview.enabledCount === 1 ? "seção" : "seções"}
              {Object.keys(preview.errors).length > 0 && (
                <span className="text-error ml-2">
                  · corrija {Object.keys(preview.errors).length}{" "}
                  {Object.keys(preview.errors).length === 1 ? "erro" : "erros"}
                </span>
              )}
            </p>
          </div>
        </div>

        {apiError && (
          <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
            {apiError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={
              isPending ||
              preview.seats.length === 0 ||
              Object.keys(preview.errors).length > 0
            }
          >
            {isPending
              ? "Salvando..."
              : preview.seats.length > 0
              ? `Salvar ${preview.seats.length} assentos`
              : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
