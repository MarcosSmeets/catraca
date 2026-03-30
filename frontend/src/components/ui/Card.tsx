interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  onClick?: () => void;
}

export default function Card({
  children,
  className = "",
  as: Tag = "div",
  onClick,
}: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={[
        "bg-surface-lowest rounded-md overflow-hidden",
        onClick ? "cursor-pointer hover:shadow-[0_12px_40px_0_rgba(26,28,28,0.06)] transition-shadow duration-200" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
