import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-display font-semibold uppercase tracking-tight text-on-surface/60"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={[
          "w-full bg-surface-lowest px-4 py-3 text-sm text-on-surface font-body",
          "rounded-sm border border-outline-variant",
          "placeholder:text-on-surface/30",
          "focus:outline-none focus:border-primary transition-colors duration-150",
          error ? "border-error" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && (
        <span className="text-xs text-error font-body">{error}</span>
      )}
    </div>
  );
});

export default Input;
