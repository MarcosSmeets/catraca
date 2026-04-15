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
  wordmark: "h-8 w-auto max-w-[200px]",
  lockup: "h-auto max-h-16 w-auto max-w-[min(100%,280px)]",
  mark: "h-9 w-9 shrink-0",
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
