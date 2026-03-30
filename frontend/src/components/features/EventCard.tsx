import Link from "next/link";
import Image from "next/image";
import { Event, formatCurrency, formatShortDate, sportLabel } from "@/lib/mock-data";
import Badge from "@/components/ui/Badge";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const isSoldOut = event.status === "SOLD_OUT";

  return (
    <Link href={`/events/${event.id}`} className="group block">
      <div className="bg-surface-lowest rounded-md overflow-hidden hover:shadow-[0_12px_40px_0_rgba(26,28,28,0.06)] transition-shadow duration-200">
        {/* Image area */}
        <div className="relative aspect-[16/9] bg-surface-dim overflow-hidden">
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />

          {/* Vibe chips */}
          {event.vibeChips && event.vibeChips.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-1">
              {event.vibeChips.map((chip) => (
                <Badge key={chip} label={chip} variant="vibe" />
              ))}
            </div>
          )}

          {/* Sport badge */}
          <div className="absolute bottom-3 left-3">
            <Badge label={sportLabel(event.sport)} variant="status" />
          </div>

          {/* Date overlay */}
          <div className="absolute bottom-3 right-3">
            <span className="text-xs text-on-primary/90 font-body font-medium">
              {formatShortDate(event.startsAt)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-on-surface/50 font-body uppercase tracking-tight truncate">
                {event.league} · {event.venue.city}, {event.venue.state}
              </p>
              <h3 className="mt-0.5 font-display font-bold text-sm text-on-surface tracking-tight leading-snug line-clamp-2">
                {event.homeTeam}
                <span className="text-on-surface/40 font-normal"> vs </span>
                {event.awayTeam}
              </h3>
            </div>

            {/* Price */}
            <div className="shrink-0 text-right">
              {isSoldOut ? (
                <span className="text-xs font-display font-semibold text-error uppercase tracking-tight">
                  Esgotado
                </span>
              ) : (
                <>
                  <p className="text-xs text-on-surface/40 font-body">A partir de</p>
                  <p className="font-display font-bold text-sm text-on-surface tracking-tight">
                    {formatCurrency(event.minPriceCents)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
