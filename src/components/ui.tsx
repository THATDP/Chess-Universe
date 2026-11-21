import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Move } from "chess.js";
import { CLASS_INFO, formatScore, lineCp, pvToSan, scoreWhite, winPct, type MoveClass, type Score } from "../lib/chessUtils";
import { getEngine, type PVLine } from "../lib/engine";
import { play } from "../lib/sound";

export type Screen = "menu" | "play" | "lab" | "openings" | "training" | "analysis" | "stats" | "settings";
export interface NavParams {
  openingId?: string;
  pgn?: string;
  tab?: string;
  free?: boolean;
  fen?: string;
}
export const NavCtx = createContext<{ go: (s: Screen, p?: NavParams) => void; params: NavParams }>({ go: () => undefined, params: {} });
export const useNav = () => useContext(NavCtx);

export function Card({ children, className = "", title, right }: { children: ReactNode; className?: string; title?: ReactNode; right?: ReactNode }) {
  return (
    <div className={`rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-xl shadow-black/20 ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-zinc-400">{title}</h3>
          {right}
        </div>
      )}
      <div className="p-4 pt-2">{children}</div>
    </div>
  );
}

export function Btn({ children, onClick, variant = "ghost", className = "", disabled, title, type }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger" | "gold"; className?: string; disabled?: boolean; title?: string; type?: "button" | "submit" }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none select-none";
  const v = {
    primary: "bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/20",
    gold: "bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-amber-950 shadow-lg shadow-amber-500/20",
    ghost: "bg-white/[0.07] hover:bg-white/[0.13] text-zinc-100 border border-white/10",
    danger: "bg-rose-500/80 hover:bg-rose-500 text-white",
  }[variant];
  return (
    <button type={type ?? "button"} title={title} disabled={disabled} onClick={() => { play("click"); onClick?.(); }} className={`${base} ${v} ${className}`}>
      {children}
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-black/30 border border-white/5">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => { play("click"); onChange(t.id); }} className={`px-3 py-1.5 rounded-lg text-sm transition ${value === t.id ? "bg-white/15 text-white shadow" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ children, color = "#71717a", className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`} style={{ background: color + "30", color, border: `1px solid ${color}55` }}>
      {children}
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs text-zinc-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-zinc-500 mt-1">{hint}</span>}
    </label>
  );
}
export const selectCls = "w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/60";
export const inputCls = selectCls;

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-black/30 p-1 border border-white/5">
      {options.map((o) => (
        <button key={o.id} onClick={() => { play("click"); onChange(o.id); }} className={`flex-1 rounded-lg px-2.5 py-1.5 text-sm transition ${value === o.id ? "bg-emerald-500 text-emerald-950 font-semibold" : "text-zinc-300 hover:bg-white/10"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EvalBar({ score, orientation = "w", className = "" }: { score: Score | null; orientation?: "w" | "b"; className?: string }) {
  const cp = score ? lineCp(score) : 0;
  const pct = winPct(cp);
  const label = score ? formatScore(score) : "—";
  const whiteBottom = orientation === "w";
  return (
    <div className={`relative w-7 rounded-md overflow-hidden bg-zinc-800 border border-white/10 ${className}`} title={`Avaliação: ${label}`}>
      <div className="absolute inset-x-0 transition-all duration-500" style={{ [whiteBottom ? "bottom" : "top"]: 0, height: `${pct}%`, background: "linear-gradient(#f4f4f5,#d4d4d8)" }} />
      <div className="absolute inset-x-0 text-center text-[10px] font-bold" style={{ [cp >= 0 === whiteBottom ? "bottom" : "top"]: 2, color: cp >= 0 ? "#18181b" : "#e4e4e7" }}>
        {label.replace("+", "")}
      </div>
    </div>
  );
}

export function MoveList({ history, viewPly, onSelect, classes, startNumber = 1, blackFirst = false }: { history: Move[]; viewPly: number; onSelect: (ply: number) => void; classes?: Record<number, MoveClass>; startNumber?: number; blackFirst?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("[data-active=true]")?.scrollIntoView({ block: "nearest" });
  }, [viewPly, history.length]);
  const rows: { n: number; w?: { m: Move; ply: number }; b?: { m: Move; ply: number } }[] = [];
  history.forEach((m, i) => {
    const idx = i + (blackFirst ? 1 : 0);
    const n = startNumber + Math.floor(idx / 2);
    if (idx % 2 === 0) rows.push({ n, w: { m, ply: i + 1 } });
    else if (rows.length && !(blackFirst && i === 0)) rows[rows.length - 1].b = { m, ply: i + 1 };
    else rows.push({ n, b: { m, ply: i + 1 } });
  });
  const cell = (c?: { m: Move; ply: number }) =>
    c ? (
      <button data-active={viewPly === c.ply} onClick={() => onSelect(c.ply)} className={`flex-1 text-left px-2 py-1 rounded-md text-sm font-mono transition ${viewPly === c.ply ? "bg-emerald-500/25 text-emerald-200" : "hover:bg-white/10 text-zinc-200"}`}>
        {c.m.san}
        {classes?.[c.ply] && <span className="ml-1 text-[10px] font-bold" style={{ color: CLASS_INFO[classes[c.ply]].color }}>{CLASS_INFO[classes[c.ply]].sym}</span>}
      </button>
    ) : (
      <div className="flex-1" />
    );
  return (
    <div ref={ref} className="overflow-y-auto max-h-full pr-1 text-zinc-300">
      {rows.length === 0 && <p className="text-sm text-zinc-500 py-3 text-center">Nenhum lance ainda.</p>}
      {rows.map((r) => (
        <div key={r.n} className="flex items-center gap-1">
          <span className="w-7 text-xs text-zinc-500 text-right">{r.n}.</span>
          {cell(r.w)}
          {cell(r.b)}
        </div>
      ))}
    </div>
  );
}

export function NavButtons({ ply, max, onSet }: { ply: number; max: number; onSet: (p: number) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === "ArrowLeft") onSet(Math.max(0, ply - 1));
      else if (e.key === "ArrowRight") onSet(Math.min(max, ply + 1));
      else if (e.key === "ArrowUp") onSet(0);
      else if (e.key === "ArrowDown") onSet(max);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ply, max, onSet]);
  const b = "px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/15 text-zinc-200 disabled:opacity-30 text-sm";
  return (
    <div className="flex gap-1 justify-center">
      <button className={b} disabled={ply <= 0} onClick={() => onSet(0)}>⏮</button>
      <button className={b} disabled={ply <= 0} onClick={() => onSet(ply - 1)}>◀</button>
      <button className={b} disabled={ply >= max} onClick={() => onSet(ply + 1)}>▶</button>
      <button className={b} disabled={ply >= max} onClick={() => onSet(max)}>⏭</button>
    </div>
  );
}

/** Análise ao vivo com Stockfish para a posição atual. */
export function useLiveAnalysis(fen: string, enabled: boolean, multipv = 3, maxMs = 6000) {
  const [lines, setLines] = useState<PVLine[]>([]);
  const [depth, setDepth] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const eng = getEngine("live");
    let alive = true;
    eng.cancel();
    setBusy(true);
    setLines([]);
    eng
      .search(fen, {
        multipv,
        depth: 24,
        movetime: maxMs,
        onInfo: (l) => {
          if (alive) {
            setLines(l);
            setDepth(Math.max(...l.map((x) => x.depth)));
          }
        },
      })
      .then(() => alive && setBusy(false));
    return () => {
      alive = false;
      eng.cancel();
    };
  }, [fen, enabled, multipv, maxMs]);
  return { lines, depth, busy };
}

export function EngineLines({ fen, enabled = true, multipv = 3, onPlay }: { fen: string; enabled?: boolean; multipv?: number; onPlay?: (uci: string) => void }) {
  const { lines, depth, busy } = useLiveAnalysis(fen, enabled, multipv);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>Stockfish 19 · profundidade {depth || "—"}</span>
        {busy && <span className="animate-pulse text-emerald-400">calculando…</span>}
      </div>
      {lines.length === 0 && <p className="text-sm text-zinc-500">Aguardando o motor…</p>}
      {lines.map((l) => {
        const sc = scoreWhite(fen, l);
        const san = pvToSan(fen, l.pv, 8);
        return (
          <button key={l.multipv} onClick={() => onPlay?.(l.pv[0])} className="w-full text-left flex gap-2 items-baseline rounded-lg bg-black/25 hover:bg-black/40 px-2 py-1.5">
            <span className={`shrink-0 w-14 text-center rounded font-mono text-xs font-bold px-1 py-0.5 ${lineCp(sc) >= 0 ? "bg-zinc-100 text-zinc-900" : "bg-zinc-700 text-zinc-100"}`}>{formatScore(sc)}</span>
            <span className="text-xs font-mono text-zinc-300 leading-relaxed">{san.join(" ")}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EvalGraph({ values, current, onSelect, height = 110 }: { values: number[]; current?: number; onSelect?: (i: number) => void; height?: number }) {
  if (values.length < 2) return <div className="text-sm text-zinc-500">Sem dados.</div>;
  const W = 400;
  const H = height;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - (winPct(v) / 100) * H] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-zinc-900 cursor-pointer" style={{ height }} preserveAspectRatio="none" onClick={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      onSelect?.(Math.round(((e.clientX - r.left) / r.width) * (values.length - 1)));
    }}>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill="#e4e4e7" opacity=".9" />
      <path d={`${line} L${W},0 L0,0 Z`} fill="#27272a" opacity=".9" />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#71717a" strokeDasharray="4 4" strokeWidth="1" />
      <path d={line} fill="none" stroke="#10b981" strokeWidth="2" />
      {current !== undefined && <line x1={(current / (values.length - 1)) * W} x2={(current / (values.length - 1)) * W} y1={0} y2={H} stroke="#f59e0b" strokeWidth="2" />}
    </svg>
  );
}

export function ProgressBar({ value, color = "#10b981" }: { value: number; color?: string }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-400 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function formatClock(ms: number) {
  const t = Math.max(0, ms);
  const s = Math.floor(t / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  if (t < 10000) return `${m}:${String(ss).padStart(2, "0")}.${Math.floor((t % 1000) / 100)}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}
