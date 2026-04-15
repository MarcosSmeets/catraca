import Image from "next/image";

export type LogoVariant = "wordmark" | "lockup" | "mark";

const SOURCES: Record<
  LogoVariant,
  { src: string; width: number; height: number }
> = {
  wordmark: { src: "/logo.png", width: 1536, height: 1024 },
  lockup: { src: "/full_logo.png", width: 1024, height: 1024 },
  mark: { src: "/logo_image.png", width: 1024, height: 1024 },
};

const SIZE_CLASSES: Record<LogoVariant, string> = {
  /* Wordmark default: pages other than Navbar (Navbar overrides height to fit h-16 bar) */
  wordmark:
    "h-12 w-auto max-w-[min(100%,420px)] sm:h-14 sm:max-w-[min(100%,560px)]",
  /* Lockup: branding column on auth — large but viewport-capped */
  lockup:
    "h-auto w-auto max-h-[min(92vh,48rem)] max-w-[min(100%,min(96vw,56rem))]",
  mark: "h-10 w-10 shrink-0 sm:h-12 sm:w-12",
};

export default function Logo({
  variant = "wordmark",
  className = "",
  priority = false,
}: {
  variant?: LogoVariant;
  className?: string;
  priority?: boolean;
}) {
  const meta = SOURCES[variant];
  return (
    <Image
      src={meta.src}
      alt="Catraca"
      width={meta.width}
      height={meta.height}
      priority={priority}
      className={[
        SIZE_CLASSES[variant],
        "object-contain object-left",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
