import { useEffect } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { audio } from "../core/audio/audio";
import { cn } from "../utils/cn";

export function Btn({
  variant = "ghost",
  size = "md",
  className,
  onClick,
  silent,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft"; size?: "sm" | "md" | "lg"; silent?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-3 text-base" };
  const variants = {
    primary: "bg-accent text-accent-ink hover:brightness-110 shadow-lg shadow-black/30",
    ghost: "bg-panel2 text-ink hover:bg-line border border-line",
    soft: "bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30",
    danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30",
  };
  return (
    <button
      {...p}
      onClick={(e) => {
        if (!silent) audio.play("click");
        onClick?.(e);
      }}
      className={cn(base, sizes[size], variants[variant], className)}
    />
  );
}

export function Card({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-panel p-4 shadow-lg shadow-black/20", className)}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-mute">{title}</h3>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn("max-h-[90vh] w-full overflow-auto rounded-2xl border border-line bg-panel p-5 shadow-2xl", wide ? "max-w-4xl" : "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button className="rounded-md px-2 py-1 text-mute hover:bg-panel2 hover:text-ink" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="block text-xs text-mute">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          audio.play("click");
          onChange(!checked);
        }}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-accent" : "bg-line")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  onCommit?: () => void;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1 flex justify-between text-sm text-ink">
        <span>{label}</span>
        <span className="font-mono text-xs text-mute">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-lg border border-line bg-panel2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => {
            audio.play("click");
            onChange(o.value);
          }}
          className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", o.value === value ? "bg-accent text-accent-ink" : "text-mute hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({ children, color = "default" }: { children: ReactNode; color?: "default" | "green" | "red" | "amber" | "blue" | "violet" }) {
  const c = {
    default: "bg-panel2 text-mute border-line",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    blue: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  }[color];
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", c)}>{children}</span>;
}

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-mute">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
