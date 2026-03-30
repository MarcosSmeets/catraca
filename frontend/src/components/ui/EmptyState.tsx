import { ReactNode } from "react";
import Link from "next/link";
import Button from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "bg-surface-lowest rounded-md p-12 sm:p-16 text-center flex flex-col items-center gap-3",
        className,
      ].join(" ")}
    >
      {icon && (
        <div className="w-12 h-12 text-on-surface/20 mb-2">{icon}</div>
      )}
      <p className="font-display font-bold text-xl text-on-surface/20 tracking-tight uppercase">
        {title}
      </p>
      {description && (
        <p className="text-sm text-on-surface/30 font-body max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link href={action.href}>
              <Button variant="secondary">{action.label}</Button>
            </Link>
          ) : (
            <Button variant="secondary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
