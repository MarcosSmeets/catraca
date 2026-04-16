"use client";

import { useState, useRef, useEffect } from "react";

export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  size?: "sm" | "md";
}

export default function FilterSelect({
  label,
  value,
  onChange,
  options,
  size = "md",
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const isActive = value !== "" && value !== options[0]?.value;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerPadding = size === "sm" ? "px-3 py-1.5" : "px-4 py-2.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label className="block text-xs font-display font-semibold uppercase tracking-tight text-on-surface/50 mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "w-full flex items-center justify-between gap-2 bg-surface-lowest",
          triggerPadding,
          textSize,
          "font-body text-on-surface rounded-sm border",
          isActive ? "border-accent" : "border-outline-variant",
          "focus:outline-none transition-colors duration-150 cursor-pointer",
        ].join(" ")}
      >
        <span className={isActive ? "font-semibold" : ""}>{selected?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={[
            "shrink-0 text-on-surface/50 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className={[
            "absolute z-50 left-0 right-0 mt-1",
            "bg-surface-lowest border border-outline-variant rounded-sm",
            "shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
            "py-1 max-h-60 overflow-y-auto",
          ].join(" ")}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={[
                    "w-full flex items-center gap-2.5",
                    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                    "font-body text-left transition-colors duration-100",
                    isSelected
                      ? "text-on-surface font-semibold bg-surface"
                      : "text-on-surface/70 hover:bg-surface hover:text-on-surface",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "shrink-0 text-[8px] leading-none",
                      isSelected ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                  >
                    ■
                  </span>
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
