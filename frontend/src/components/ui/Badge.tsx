type BadgeVariant = "vibe" | "status" | "outline";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  vibe: "bg-primary text-on-primary",
  status: "bg-surface-dim text-on-surface",
  outline: "border border-outline-variant text-on-surface bg-transparent",
};

export default function Badge({
  label,
  variant = "vibe",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-1 text-xs font-display font-semibold tracking-tight uppercase rounded-sm",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
  );
}
