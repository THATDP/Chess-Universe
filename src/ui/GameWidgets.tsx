import { useEffect, useMemo, useRef } from "react";
import type { MoveRec } from "../core/chess/rules";
import { fenMoveNumber, turnOf } from "../core/chess/rules";
import { winPct } from "../core/engine/levels";
import { formatEval, lineCp } from "../core/engine/stockfish";
import { pieceUrl } from "./pieces";
import { useSettings } from "../core/settings/settings";
import { cn } from "../utils/cn";

/* ---------------- Barra de avaliação ---------------- */
export function EvalBar({ cp, mate, orientation = "w", className }: { cp?: number; mate?: number; orientation?: "w" | "b"; className?: string }) {
  const val = mate !== undefined ? (mate > 0 ? 10000 : -10000) : cp ?? 0;
  const pct = winPct(val);
  const label = mate !== undefined ? `#${Math.abs(mate)}` : Math.abs((cp ?? 0) / 100).toFixed(1);
  const whiteAhead = val >= 0;
  const flip = orientation === "b";
  return (
    <div className={cn("relative w-7 shrink-0 overflow-hidden rounded-md border border-line bg-neutral-800", className)} title={formatEval({ cp, mate })}>
      <div
        className="absolute inset-x-0 bg-neutral-100 transition-all duration-500"
        style={flip ? { top: 0, height: `${pct}%` } : { bottom: 0, height: `${pct}%` }}
      />
      <span
        className={cn("absolute inset-x-0 text-center text-[10px] font-bold", whiteAhead ? "text-neutral-800" : "text-neutral-100")}
        style={whiteAhead !== flip ? { bottom: 3 } : { top: 3 }}
      >
        {label}
      </span>
    </div>
  );
}

/* ---------------- Lista de lances ---------------- */
export function MoveList({
  moves,
  cursor,
  onSelect,
  startFen,
  marks,
  className,
}: {
  moves: MoveRec[];
  cursor: number;
  onSelect: (i: number) => void;
  startFen: string;
  marks?: (i: number) => { text: string; color: string } | null;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector("[data-active='true']") as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor, moves.length]);

  const first = turnOf(startFen);
  const startNum = fenMoveNumber(startFen);
  const rows: { n: number; w?: number; b?: number }[] = [];
  moves.forEach((_, i) => {
    const isWhite = (first === "w") === (i % 2 === 0);
    if (isWhite) rows.push({ n: startNum + Math.floor((i + (first === "b" ? 1 : 0)) / 2), w: i });
    else if (rows.length && rows[rows.length - 1].b === undefined && rows[rows.length - 1].w !== undefined) rows[rows.length - 1].b = i;
    else rows.push({ n: startNum + Math.floor((i + (first === "b" ? 1 : 0)) / 2), b: i });
  });

  const cell = (i?: number) => {
    if (i === undefined) return <span />;
    const m = marks?.(i);
    return (
      <button
        data-active={cursor === i + 1}
        onClick={() => onSelect(i + 1)}
        className={cn(
          "flex items-center justify-between rounded px-2 py-1 text-left font-mono text-sm transition",
          cursor === i + 1 ? "bg-accent text-accent-ink font-bold" : "hover:bg-panel2 text-ink"
        )}
      >
        <span>{moves[i].san}</span>
        {m && (
          <span className="ml-1 text-xs font-black" style={{ color: cursor === i + 1 ? "inherit" : m.color }}>
            {m.text}
          </span>
        )}
      </button>
    );
  };

  return (
    <div ref={ref} className={cn("overflow-y-auto pr-1", className)}>
      {rows.length === 0 && <p className="py-6 text-center text-sm text-mute">Nenhum lance ainda.</p>}
      <div className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-y-0.5">
        {rows.map((r) => (
          <div key={(r.w ?? r.b)! + "r"} className="contents">
            <span className="px-1 text-right font-mono text-xs text-mute">{r.n}.</span>
            {cell(r.w)}
            {cell(r.b)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Nav controls ---------------- */
export function NavControls({ cursor, total, onGo, className }: { cursor: number; total: number; onGo: (i: number) => void; className?: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.key === "ArrowLeft") onGo(cursor - 1);
      else if (e.key === "ArrowRight") onGo(cursor + 1);
      else if (e.key === "Home") onGo(0);
      else if (e.key === "End") onGo(total);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cursor, total, onGo]);
  const b = "flex-1 rounded-md bg-panel2 py-1.5 text-sm text-ink transition hover:bg-line disabled:opacity-30 border border-line";
  return (
    <div className={cn("flex gap-1", className)}>
      <button className={b} disabled={cursor <= 0} onClick={() => onGo(0)} aria-label="Início">«</button>
      <button className={b} disabled={cursor <= 0} onClick={() => onGo(cursor - 1)} aria-label="Anterior">◀</button>
      <button className={b} disabled={cursor >= total} onClick={() => onGo(cursor + 1)} aria-label="Próximo">▶</button>
      <button className={b} disabled={cursor >= total} onClick={() => onGo(total)} aria-label="Fim">»</button>
    </div>
  );
}

/* ---------------- Relógio ---------------- */
export function fmtClock(ms: number): string {
  const t = Math.max(0, ms);
  const s = Math.floor(t / 1000);
  const m = Math.floor(s / 60);
  if (t < 10000) return `${m}:${String(s % 60).padStart(2, "0")}.${Math.floor((t % 1000) / 100)}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function PlayerBar({
  name,
  sub,
  color,
  clock,
  active,
  captured,
  advantage,
}: {
  name: string;
  sub?: string;
  color: "w" | "b";
  clock?: number | null;
  active?: boolean;
  captured?: string[];
  advantage?: number;
}) {
  const { settings } = useSettings();
  return (
    <div className={cn("flex items-center justify-between rounded-lg border px-3 py-2 transition", active ? "border-accent/60 bg-panel2" : "border-line bg-panel")}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", color === "w" ? "bg-neutral-100" : "bg-neutral-800 ring-1 ring-neutral-600")}>
          <img src={pieceUrl(settings.pieceSet, color, "k")} alt="" className="h-7 w-7" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-ink">{name}</div>
          <div className="flex min-h-4 items-center text-[11px] text-mute">
            {sub}
            {captured && captured.length > 0 && (
              <span className="ml-2 flex items-center">
                {captured.map((t, i) => (
                  <img key={i} src={pieceUrl(settings.pieceSet, color === "w" ? "b" : "w", t)} alt="" className="-mr-1.5 h-4 w-4" />
                ))}
                {advantage ? <span className="ml-3 font-bold text-ink/80">+{advantage}</span> : null}
              </span>
            )}
          </div>
        </div>
      </div>
      {clock !== undefined && clock !== null && (
        <div
          className={cn(
            "min-w-[5.5rem] rounded-md px-3 py-1.5 text-right font-mono text-xl font-bold tabular-nums",
            active ? (clock < 10000 ? "bg-red-500/90 text-white" : "bg-accent text-accent-ink") : "bg-panel2 text-mute"
          )}
        >
          {fmtClock(clock)}
        </div>
      )}
    </div>
  );
}

/** Peças capturadas por cor, a partir da FEN */
export function capturedFromFen(fen: string) {
  const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const have = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } } as Record<"w" | "b", Record<string, number>>;
  for (const ch of fen.split(" ")[0]) {
    const l = ch.toLowerCase();
    if (l in start && /[a-z]/i.test(ch)) have[ch === l ? "b" : "w"][l]++;
  }
  const order = ["q", "r", "b", "n", "p"];
  const val: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  // peças que cada lado capturou = peças que faltam ao oponente
  const byWhite: string[] = [];
  const byBlack: string[] = [];
  let sw = 0;
  let sb = 0;
  for (const t of order) {
    for (let i = 0; i < Math.max(0, start[t] - have.b[t]); i++) {
      byWhite.push(t);
      sw += val[t];
    }
    for (let i = 0; i < Math.max(0, start[t] - have.w[t]); i++) {
      byBlack.push(t);
      sb += val[t];
    }
  }
  return { byWhite, byBlack, diff: sw - sb };
}

/* ---------------- Gráfico de avaliação ---------------- */
export function EvalGraph({
  values,
  cursor,
  onSelect,
  marks,
  height = 110,
}: {
  values: number[]; // cp perspectiva brancas, um por posição
  cursor: number;
  onSelect: (i: number) => void;
  marks?: { i: number; color: string }[];
  height?: number;
}) {
  const w = 600;
  const h = height;
  const pts = useMemo(() => {
    const n = Math.max(1, values.length - 1);
    return values.map((v, i) => [(i / n) * w, h - (winPct(v) / 100) * h] as const);
  }, [values, h]);
  if (values.length < 2) return null;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const n = Math.max(1, values.length - 1);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full cursor-pointer rounded-md bg-neutral-800"
      style={{ height }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSelect(Math.round(((e.clientX - r.left) / r.width) * n));
      }}
    >
      <path d={area} fill="#f5f5f5" opacity={0.92} />
      <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke="#888" strokeDasharray="4 4" strokeWidth={1} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {marks?.map((m) => (
        <circle key={m.i} cx={pts[m.i]?.[0]} cy={pts[m.i]?.[1]} r={4} fill={m.color} stroke="#000" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <line x1={pts[cursor]?.[0]} x2={pts[cursor]?.[0]} y1={0} y2={h} stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export { lineCp };
