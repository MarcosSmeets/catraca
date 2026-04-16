const WORD = "CATRACA";

/**
 * Marca para o header: monograma + wordmark vetorial (sem PNG), cores brand red/teal.
 */
export default function CatracaHeaderBrand() {
  return (
    <span className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
      <span
        className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-teal to-brand-red text-white text-[0.625rem] sm:text-[0.6875rem] font-display font-bold tracking-tight shadow-md ring-1 ring-white/20"
        aria-hidden
      >
        CA
      </span>
      <span className="inline-flex min-w-0 items-baseline font-display font-bold tracking-[0.06em] leading-none text-[clamp(1rem,2.8vw,1.5rem)]">
        {WORD.split("").map((ch, i) => (
          <span
            key={`${ch}-${i}`}
            className={[
              "inline-block bg-clip-text text-transparent bg-gradient-to-br pb-0.5",
              i % 2 === 0
                ? "from-brand-teal to-brand-red"
                : "from-brand-red to-brand-teal",
            ].join(" ")}
          >
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}
