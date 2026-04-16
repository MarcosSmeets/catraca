"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "@/components/ui";
import { adminCreateEvent, adminListVenues } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";

const SPORTS = [
  { value: "FOOTBALL", label: "Futebol" },
  { value: "BASKETBALL", label: "Basquete" },
  { value: "VOLLEYBALL", label: "Vôlei" },
  { value: "FUTSAL", label: "Futsal" },
  { value: "ATHLETICS", label: "Atletismo" },
];

export default function NewEventPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: venuesData } = useQuery({
    queryKey: ["admin-venues", { limit: 100 }],
    queryFn: () => adminListVenues({ limit: 100 }),
  });
  const venues = venuesData?.venues;

  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");
  const [league, setLeague] = useState("");
  const [venueId, setVenueId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [serviceFeePercent, setServiceFeePercent] = useState("8");
  const [vibeChipsRaw, setVibeChipsRaw] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate, isPending } = useMutation({
    mutationFn: adminCreateEvent,
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      router.push(`/admin/events/${event.id}`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Erro ao criar evento.";
      setErrors({ api: msg });
    },
  });

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Título é obrigatório.";
    if (!sport) next.sport = "Esporte é obrigatório.";
    if (!league.trim()) next.league = "Liga é obrigatória.";
    if (!venueId) next.venueId = "Estádio é obrigatório.";
    if (!startsAt) next.startsAt = "Data/hora são obrigatórias.";
    if (!homeTeam.trim()) next.homeTeam = "Time da casa é obrigatório.";
    if (!awayTeam.trim()) next.awayTeam = "Time visitante é obrigatório.";
    const fee = parseFloat(serviceFeePercent);
    if (isNaN(fee) || fee < 0 || fee > 100) next.serviceFeePercent = "Taxa entre 0 e 100.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const vibeChips = vibeChipsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const startsAtISO = new Date(startsAt).toISOString();
    mutate({
      title,
      sport,
      league,
      venueId,
      startsAt: startsAtISO,
      homeTeam,
      awayTeam,
      imageUrl,
      serviceFeePercent: parseFloat(serviceFeePercent),
      vibeChips,
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h1 className="font-display font-black text-3xl text-on-surface tracking-tight">
          Novo Evento
        </h1>
        <p className="text-on-surface/50 font-body text-sm mt-1">
          O evento é criado em modo rascunho. Você poderá adicionar seções e assentos antes de publicar.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Input
          label="Título"
          placeholder="Final do Campeonato Brasileiro"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60">
            Esporte
          </label>
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className={[
              "w-full bg-surface-lowest px-4 py-3 text-sm text-on-surface font-body",
              "rounded-sm border border-outline-variant",
              "focus:outline-none focus:border-accent transition-colors duration-150",
              errors.sport ? "border-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <option value="">Selecione</option>
            {SPORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {errors.sport && <span className="text-xs text-error font-body">{errors.sport}</span>}
        </div>

        <Input
          label="Liga / Competição"
          placeholder="Brasileirão Série A"
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          error={errors.league}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60">
            Estádio
          </label>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className={[
              "w-full bg-surface-lowest px-4 py-3 text-sm text-on-surface font-body",
              "rounded-sm border border-outline-variant",
              "focus:outline-none focus:border-accent transition-colors duration-150",
              errors.venueId ? "border-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <option value="">Selecione</option>
            {venues?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.city}/{v.state}
              </option>
            ))}
          </select>
          {errors.venueId && <span className="text-xs text-error font-body">{errors.venueId}</span>}
        </div>

        <Input
          label="Data e Hora"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          error={errors.startsAt}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Time da Casa"
            placeholder="Flamengo"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            error={errors.homeTeam}
          />
          <Input
            label="Time Visitante"
            placeholder="Palmeiras"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            error={errors.awayTeam}
          />
        </div>

        <Input
          label="URL da Imagem (opcional)"
          placeholder="https://..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <Input
          label="Taxa de Serviço (%)"
          type="number"
          placeholder="8"
          value={serviceFeePercent}
          onChange={(e) => setServiceFeePercent(e.target.value)}
          error={errors.serviceFeePercent}
          min={0}
          max={100}
          step={0.5}
        />

        <div className="flex flex-col gap-1.5">
          <Input
            label="Vibe Chips (separados por vírgula)"
            placeholder="Clássico, Derby, Decisivo"
            value={vibeChipsRaw}
            onChange={(e) => setVibeChipsRaw(e.target.value)}
          />
          <p className="text-xs text-on-surface/40 font-body">
            Ex: Clássico, Decisivo, Estádio lotado
          </p>
        </div>

        {errors.api && (
          <p className="text-sm font-body text-error bg-error/5 px-4 py-3 rounded-sm">
            {errors.api}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Criando..." : "Criar Evento"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
