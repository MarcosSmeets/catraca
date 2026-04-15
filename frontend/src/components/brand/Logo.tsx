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
  /* Responsive: large wordmark on lg (~5× prior h-12); compact on small screens */
  wordmark:
    "h-14 w-auto max-w-[min(100%,360px)] sm:h-20 sm:max-w-[min(100%,520px)] md:h-32 md:max-w-[min(100%,800px)] lg:h-72 lg:max-w-[min(100%,min(95vw,1400px))]",
  /* Lockup: tall branding column — cap by viewport so it stays on screen */
  lockup:
    "h-auto w-auto max-h-[min(92vh,48rem)] max-w-[min(100%,min(96vw,56rem))]",
  mark: "h-12 w-12 shrink-0 sm:h-16 sm:w-16",
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
