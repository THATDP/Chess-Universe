import { LEVELS, levelBadge } from "../core/engine/levels";
import { audio } from "../core/audio/audio";
import { Slider } from "./common";
import { cn } from "../utils/cn";
import type { ReactNode } from "react";

export function LevelPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
      {LEVELS.map((l) => (
        <button
          key={l.id}
          onClick={() => {
            audio.play("click");
            onChange(l.id);
          }}
          title={l.desc}
          className={cn(
            "rounded-lg border px-3 py-2 text-left transition",
            value === l.id ? "border-accent bg-accent/15" : "border-line bg-panel2 hover:border-mute"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">{l.name}</span>
            <span className="text-[10px] font-mono text-mute">{l.id}/9</span>
          </div>
          <div className="text-[11px] text-mute">{levelBadge(l)}</div>
        </button>
      ))}
    </div>
  );
}

export function ThinkTime({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <Slider
      label="Tempo de reflexão da IA"
      value={value}
      min={200}
      max={10000}
      step={100}
      onChange={onChange}
      format={(v) => (v < 1000 ? `${v} ms` : `${(v / 1000).toFixed(1)} s`)}
    />
  );
}

export function ColorPicker({ value, onChange }: { value: "w" | "b" | "r"; onChange: (v: "w" | "b" | "r") => void }) {
  const opts: { v: "w" | "b" | "r"; label: ReactNode }[] = [
    { v: "w", label: "♔ Brancas" },
    { v: "r", label: "⚄ Aleatório" },
    { v: "b", label: "♚ Pretas" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => {
            audio.play("click");
            onChange(o.v);
          }}
          className={cn("rounded-lg border px-3 py-2.5 text-sm font-semibold transition", value === o.v ? "border-accent bg-accent/15 text-accent" : "border-line bg-panel2 text-ink hover:border-mute")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
