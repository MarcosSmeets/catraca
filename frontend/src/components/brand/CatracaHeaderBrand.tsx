const WORD = "CATRACA";

/**
 * Wordmark em texto: letras A em accent (rosa), restante em cor de superfície.
 */
export default function CatracaHeaderBrand() {
  return (
    <span className="inline-flex min-w-0 items-baseline font-display font-bold leading-none tracking-tight text-lg sm:text-xl">
      {WORD.split("").map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className={ch === "A" ? "text-accent" : "text-on-surface"}
        >
          {ch}
        </span>
      ))}
      <span className="ml-0.5 text-on-surface/45 select-none" aria-hidden>
        •
      </span>
    </span>
  );
}
