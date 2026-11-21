import { useEffect, useMemo, useRef, useState } from "react";
import { getEngine, formatEval, lineCp, getEngineStatus, subscribeEngineStatus } from "../core/engine/stockfish";
import type { EngineLine, EngineStatus } from "../core/engine/stockfish";
import { fenMoveNumber, turnOf, uciLineToSan } from "../core/chess/rules";
import { Segmented } from "./common";
import { cn } from "../utils/cn";
import { useEffect as useEff, useState as useSt } from "react";

export function useEngineStatus(): EngineStatus {
  const [s, setS] = useSt<EngineStatus>(getEngineStatus());
  useEff(() => subscribeEngineStatus(setS), []);
  return s;
}

export function EngineBadge() {
  const s = useEngineStatus();
  const label =
    s.state === "ready"
      ? `Stockfish 19 · WASM · pronto${s.source === "embedded" ? " (embutido)" : ""}`
      : s.state === "loading"
        ? "Stockfish carregando…"
        : s.state === "error"
          ? "Stockfish indisponível"
          : "Stockfish em espera";
  const dot = s.state === "ready" ? "bg-emerald-400" : s.state === "error" ? "bg-red-400" : s.state === "loading" ? "bg-amber-400 animate-pulse" : "bg-neutral-500";
  return (
    <div className="flex items-center gap-2 text-[11px] text-mute" title={s.message}>
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </div>
  );
}

export function EnginePanel({
  fen,
  enabled,
  onToggle,
  multipv: mpvProp = 3,
  onLines,
  onPlayLine,
  maxDepth = 22,
  title = "Análise Stockfish",
}: {
  fen: string;
  enabled: boolean;
  onToggle?: (v: boolean) => void;
  multipv?: number;
  onLines?: (lines: EngineLine[], fen: string) => void;
  onPlayLine?: (ucis: string[]) => void;
  maxDepth?: number;
  title?: string;
}) {
  const [mpv, setMpv] = useState(mpvProp);
  const [lines, setLines] = useState<EngineLine[]>([]);
  const [lineFen, setLineFen] = useState(fen);
  const cb = useRef(onLines);
  cb.current = onLines;
  const status = useEngineStatus();

  useEffect(() => {
    const eng = getEngine("analysis");
    if (!enabled) {
      eng.stop();
      return;
    }
    let alive = true;
    setLines([]);
    setLineFen(fen);
    eng
      .search(fen, {
        depth: maxDepth,
        multipv: mpv,
        onInfo: (ls) => {
          if (!alive) return;
          setLines(ls);
          cb.current?.(ls, fen);
        },
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      eng.stop();
    };
  }, [fen, enabled, mpv, maxDepth]);

  const top = lines[0];
  const rendered = useMemo(
    () =>
      lines.map((l) => {
        const { san } = uciLineToSan(lineFen, l.pv.slice(0, 12));
        return { l, san };
      }),
    [lines, lineFen]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-mute">{title}</div>
          <div className="text-[11px] text-mute">
            {!enabled ? "Desligada" : status.state === "error" ? "Engine indisponível" : top ? `profundidade ${top.depth} · ${Math.round((top.nps || 0) / 1000)} kn/s` : "calculando…"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={mpv}
            onChange={setMpv}
            options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n}` }))}
          />
          {onToggle && (
            <button
              onClick={() => onToggle(!enabled)}
              className={cn("rounded-md border px-2.5 py-1.5 text-xs font-bold", enabled ? "border-accent bg-accent text-accent-ink" : "border-line bg-panel2 text-mute")}
            >
              {enabled ? "Ligada" : "Desligada"}
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {enabled && rendered.length === 0 && status.state !== "error" && <div className="h-10 animate-pulse rounded-md bg-panel2" />}
        {status.state === "error" && <p className="text-xs text-red-300">{status.message}</p>}
        {rendered.map(({ l, san }) => (
          <div key={l.multipv} className="flex items-start gap-2 rounded-md bg-panel2 p-2">
            <span
              className={cn(
                "mt-0.5 min-w-[3.4rem] rounded px-1.5 py-0.5 text-center font-mono text-xs font-bold",
                lineCp(l) >= 0 ? "bg-neutral-100 text-neutral-900" : "bg-neutral-900 text-neutral-100 ring-1 ring-neutral-600"
              )}
            >
              {formatEval(l)}
            </span>
            <div className="min-w-0 flex-1 text-xs leading-relaxed text-ink">
              {san.map((s, k) => {
                const num = fenMoveNumber(lineFen) + Math.floor((k + (turnOf(lineFen) === "b" ? 1 : 0)) / 2);
                const isW = (turnOf(lineFen) === "w") === (k % 2 === 0);
                return (
                  <span key={k}>
                    {(isW || k === 0) && <span className="text-mute">{isW ? `${num}.` : `${num}...`}</span>}
                    <button
                      className={cn("mx-0.5 rounded px-0.5 font-mono hover:bg-accent hover:text-accent-ink", k === 0 && "font-bold")}
                      onClick={() => onPlayLine?.(l.pv.slice(0, k + 1))}
                      title="Reproduzir esta linha no tabuleiro"
                    >
                      {s}
                    </button>
                  </span>
                );
              })}
            </div>
            <span className="text-[10px] text-mute">d{l.depth}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
