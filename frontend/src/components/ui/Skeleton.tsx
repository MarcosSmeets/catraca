export function EventCardSkeleton() {
  return (
    <div className="bg-surface-lowest rounded-md overflow-hidden animate-pulse">
      <div className="h-44 bg-surface-dim" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-3 bg-surface-dim rounded-sm w-1/3" />
        <div className="h-5 bg-surface-dim rounded-sm w-3/4" />
        <div className="h-3 bg-surface-dim rounded-sm w-1/2" />
        <div className="mt-2 flex justify-between">
          <div className="h-4 bg-surface-dim rounded-sm w-1/4" />
          <div className="h-4 bg-surface-dim rounded-sm w-1/5" />
        </div>
      </div>
    </div>
  );
}

export function SeatMapSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 w-24 bg-surface-dim rounded-sm" />
        ))}
      </div>
      <div className="h-1.5 bg-surface-dim rounded-none w-full max-w-xs mx-auto" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} className="flex gap-1.5">
            <div className="w-4 h-6 bg-surface-dim rounded-sm" />
            {Array.from({ length: 12 }).map((_, col) => (
              <div key={col} className="w-6 h-6 bg-surface-dim rounded-none" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TicketSkeleton() {
  return (
    <div className="bg-surface-lowest rounded-md overflow-hidden flex flex-col sm:flex-row animate-pulse">
      <div className="w-full sm:w-48 h-36 sm:h-auto bg-surface-dim shrink-0" />
      <div className="flex-1 p-5 flex flex-col gap-3">
        <div className="h-4 bg-surface-dim rounded-sm w-16" />
        <div className="h-5 bg-surface-dim rounded-sm w-3/4" />
        <div className="h-3 bg-surface-dim rounded-sm w-1/2" />
        <div className="mt-4 flex gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-2 bg-surface-dim rounded-sm w-10" />
              <div className="h-4 bg-surface-dim rounded-sm w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="bg-surface-lowest rounded-md p-6">
        <div className="h-4 bg-surface-dim rounded-sm w-40 mb-5" />
        <div className="grid grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-3 bg-surface-dim rounded-sm w-20" />
              <div className="h-10 bg-surface-dim rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TextSkeleton({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-surface-dim rounded-sm"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}
