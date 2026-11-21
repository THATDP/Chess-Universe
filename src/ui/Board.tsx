import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Move } from "chess.js";
import { useSettings } from "../core/settings/settings";
import { pieceUrl } from "./pieces";
import { isCheck, kingSquare, turnOf } from "../core/chess/rules";
import type { Color, PieceType } from "../core/chess/rules";

export interface Arrow {
  from: string;
  to: string;
  color?: string;
  width?: number;
}

export interface BoardProps {
  fen: string;
  orientation?: Color;
  /** Quem pode mover: cor, "both" (hot-seat) ou null (somente leitura) */
  movable?: Color | "both" | null;
  lastMove?: { from: string; to: string } | null;
  arrows?: Arrow[];
  /** casas extras destacadas: casa → cor CSS */
  marks?: Record<string, string>;
  onMove?: (from: string, to: string, promotion?: string) => void;
  onSquareClick?: (sq: string) => void;
  onExternalDrop?: (sq: string, data: string) => void;
  /** permite mover qualquer peça (editor) sem validar legalidade */
  className?: string;
  showCoords?: boolean;
  /** casa onde mostrar um selo (ex.: ✓ ou ✗) */
  badge?: { square: string; text: string; color: string } | null;
  small?: boolean;
}

interface PV {
  id: number;
  type: PieceType;
  color: Color;
  sq: string;
}

const sqName = (f: number, r: number) => String.fromCharCode(97 + f) + (8 - r);

function useTrackedPieces(fen: string, lastMove?: { from: string; to: string } | null): PV[] {
  const prev = useRef<PV[]>([]);
  const nextId = useRef(1);
  return useMemo(() => {
    const cur: { type: PieceType; color: Color; sq: string }[] = [];
    // lê só a parte de colocação da FEN (tolerante a posições incompletas do editor)
    fen.split(" ")[0].split("/").forEach((row, r) => {
      let f = 0;
      for (const ch of row) {
        if (/[1-8]/.test(ch)) f += parseInt(ch, 10);
        else {
          const l = ch.toLowerCase();
          if ("pnbrqk".includes(l) && f < 8 && r < 8) cur.push({ type: l as PieceType, color: ch === l ? "b" : "w", sq: sqName(f, r) });
          f++;
        }
      }
    });
    const old = prev.current;
    const used = new Set<number>();
    const result: (PV | null)[] = cur.map(() => null);
    // 1. peças que não se moveram
    cur.forEach((c, i) => {
      const o = old.find((x) => !used.has(x.id) && x.sq === c.sq && x.type === c.type && x.color === c.color);
      if (o) {
        used.add(o.id);
        result[i] = { ...o };
      }
    });
    // 2. peças movidas: prioriza a casa de origem do último lance, depois a mais próxima
    cur.forEach((c, i) => {
      if (result[i]) return;
      const cands = old.filter((x) => !used.has(x.id) && x.type === c.type && x.color === c.color);
      let best: PV | undefined;
      if (lastMove) best = cands.find((x) => x.sq === lastMove.from && c.sq === lastMove.to);
      if (!best && cands.length) {
        const d = (a: string, b: string) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(+a[1] - +b[1]));
        best = cands.reduce((m, x) => (d(x.sq, c.sq) < d(m.sq, c.sq) ? x : m));
        if (d(best.sq, c.sq) > 7) best = undefined;
      }
      if (best) {
        used.add(best.id);
        result[i] = { ...best, sq: c.sq };
      } else {
        result[i] = { id: nextId.current++, type: c.type, color: c.color, sq: c.sq };
      }
    });
    const out = result as PV[];
    prev.current = out;
    return out;
  }, [fen, lastMove]);
}

function BoardImpl({
  fen,
  orientation = "w",
  movable = null,
  lastMove,
  arrows = [],
  marks,
  onMove,
  onSquareClick,
  onExternalDrop,
  className = "",
  showCoords,
  badge,
  small,
}: BoardProps) {
  const { settings } = useSettings();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number; from: string; moved: boolean } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const pieces = useTrackedPieces(fen, lastMove);
  const turn = turnOf(fen);
  const coords = showCoords ?? (settings.showCoords && !small);

  const legal: Move[] = useMemo(() => {
    if (!selected) return [];
    try {
      return new Chess(fen).moves({ square: selected as never, verbose: true }) as Move[];
    } catch {
      return [];
    }
  }, [selected, fen]);

  // limpar seleção quando a posição muda
  useEffect(() => {
    setSelected(null);
    setPromo(null);
  }, [fen]);

  const canMoveColor = (c: Color) => movable === "both" ? c === turn : movable === c && c === turn;

  const flip = orientation === "b";
  const toXY = (sq: string): [number, number] => {
    const f = sq.charCodeAt(0) - 97;
    const r = 8 - parseInt(sq[1], 10);
    return flip ? [7 - f, 7 - r] : [f, r];
  };

  const squareFromPoint = (clientX: number, clientY: number): string | null => {
    const el = wrapRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const y = Math.floor(((clientY - rect.top) / rect.height) * 8);
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    return flip ? sqName(7 - x, 7 - y) : sqName(x, y);
  };

  const attemptMove = useCallback(
    (from: string, to: string) => {
      if (!onMove) return;
      let ms: Move[] = [];
      try {
        ms = new Chess(fen).moves({ square: from as never, verbose: true }) as Move[];
      } catch {
        /* */
      }
      const candidates = ms.filter((m) => m.to === to);
      if (!candidates.length) {
        setSelected(null);
        return;
      }
      if (candidates.some((m) => m.promotion)) {
        if (settings.autoQueen) {
          onMove(from, to, "q");
          setSelected(null);
        } else setPromo({ from, to });
        return;
      }
      setSelected(null);
      onMove(from, to);
    },
    [fen, onMove, settings.autoQueen]
  );

  const handleSquareDown = (sq: string, e: React.PointerEvent) => {
    onSquareClick?.(sq);
    if (!movable || promo) return;
    const p = pieces.find((x) => x.sq === sq);
    if (p && canMoveColor(p.color)) {
      // inicia arrasto/seleção
      const rect = wrapRef.current!.getBoundingClientRect();
      setSelected(sq);
      setDrag({ id: p.id, x: e.clientX - rect.left, y: e.clientY - rect.top, from: sq, moved: false });
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    if (selected && legal.some((m) => m.to === sq)) {
      attemptMove(selected, sq);
      return;
    }
    setSelected(null);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDrag((d) => {
        if (!d) return d;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const moved = d.moved || Math.hypot(x - d.x, y - d.y) > 6;
        return { ...d, x, y, moved };
      });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      const to = squareFromPoint(e.clientX, e.clientY);
      if (d.moved && to && to !== d.from) attemptMove(d.from, to);
      else if (d.moved) setSelected(null);
      // toque simples mantém a seleção
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id, attemptMove, flip]);

  const checkSq = useMemo(() => (isCheck(fen) ? kingSquare(fen, turn) : null), [fen, turn]);
  const sqs: string[] = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) sqs.push(flip ? sqName(7 - f, 7 - r) : sqName(f, r));

  const legalTargets = new Map<string, Move>();
  legal.forEach((m) => legalTargets.set(m.to, m));

  const promoColor = promo ? turn : "w";
  const promoXY = promo ? toXY(promo.to) : [0, 0];

  return (
    <div
      ref={wrapRef}
      className={`relative aspect-square w-full select-none overflow-hidden rounded-lg shadow-2xl shadow-black/50 ring-1 ring-black/40 touch-none ${className}`}
      onDragOver={(e) => onExternalDrop && e.preventDefault()}
      onDrop={(e) => {
        if (!onExternalDrop) return;
        e.preventDefault();
        const sq = squareFromPoint(e.clientX, e.clientY);
        if (sq) onExternalDrop(sq, e.dataTransfer.getData("text/plain"));
      }}
    >
      {/* casas */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
        {sqs.map((sq, i) => {
          const f = sq.charCodeAt(0) - 97;
          const r = 8 - parseInt(sq[1], 10);
          const dark = (f + r) % 2 === 1;
          const isLast = settings.highlightLast && lastMove && (lastMove.from === sq || lastMove.to === sq);
          const isSel = selected === sq;
          const target = settings.showLegal ? legalTargets.get(sq) : undefined;
          const col = i % 8;
          const row = Math.floor(i / 8);
          const mark = marks?.[sq];
          return (
            <div
              key={sq}
              onPointerDown={(e) => handleSquareDown(sq, e)}
              className="relative"
              style={{ background: dark ? "var(--board-dark)" : "var(--board-light)" }}
            >
              {isLast && <div className="absolute inset-0" style={{ background: "rgba(255, 214, 10, 0.38)" }} />}
              {mark && <div className="absolute inset-0" style={{ background: mark }} />}
              {isSel && <div className="absolute inset-0" style={{ background: "rgba(80, 180, 255, 0.45)" }} />}
              {checkSq === sq && (
                <div className="absolute inset-0" style={{ background: "radial-gradient(circle, rgba(255,0,0,0.95) 0%, rgba(231,0,0,0.75) 25%, rgba(169,0,0,0) 78%)" }} />
              )}
              {target && !target.captured && !target.flags.includes("e") && (
                <div className="absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/25" />
              )}
              {target && (target.captured || target.flags.includes("e")) && (
                <div className="absolute inset-[3%] rounded-full border-[5px] border-black/25" />
              )}
              {coords && col === 0 && (
                <span className="pointer-events-none absolute left-[3%] top-[2%] text-[clamp(8px,1.5vw,12px)] font-bold leading-none" style={{ color: dark ? "var(--board-light)" : "var(--board-dark)" }}>
                  {sq[1]}
                </span>
              )}
              {coords && row === 7 && (
                <span className="pointer-events-none absolute bottom-[2%] right-[4%] text-[clamp(8px,1.5vw,12px)] font-bold leading-none" style={{ color: dark ? "var(--board-light)" : "var(--board-dark)" }}>
                  {sq[0]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* peças */}
      {pieces.map((p) => {
        const [x, y] = toXY(p.sq);
        const dragging = drag && drag.id === p.id && drag.moved;
        const rect = wrapRef.current?.getBoundingClientRect();
        const size = rect ? rect.width / 8 : 0;
        const style: React.CSSProperties = dragging
          ? { transform: `translate(${drag!.x - size / 2}px, ${drag!.y - size / 2}px)`, transition: "none", zIndex: 40 }
          : { transform: `translate(${x * 100}%, ${y * 100}%)`, transition: `transform var(--anim) cubic-bezier(.3,.7,.3,1)`, zIndex: 10 };
        return (
          <div
            key={p.id}
            className="pointer-events-none absolute left-0 top-0 h-[12.5%] w-[12.5%] will-change-transform"
            style={style}
          >
            <img
              src={pieceUrl(settings.pieceSet, p.color, p.type)}
              alt=""
              draggable={false}
              className="h-full w-full object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]"
              style={dragging ? { transform: "scale(1.12)" } : undefined}
            />
          </div>
        );
      })}

      {/* setas */}
      {arrows.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-20" viewBox="0 0 8 8">
          {arrows.map((a, i) => {
            const [x1, y1] = toXY(a.from);
            const [x2, y2] = toXY(a.to);
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const w = a.width ?? 0.17;
            const head = 0.42;
            const sx = x1 + 0.5 + ux * 0.25;
            const sy = y1 + 0.5 + uy * 0.25;
            const ex = x2 + 0.5 - ux * head * 0.75;
            const ey = y2 + 0.5 - uy * head * 0.75;
            const tipx = x2 + 0.5;
            const tipy = y2 + 0.5;
            const px = -uy;
            const py = ux;
            const color = a.color ?? "rgba(80,200,120,0.85)";
            return (
              <g key={i} opacity={0.9}>
                <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={w} strokeLinecap="round" />
                <polygon
                  points={`${tipx},${tipy} ${ex + px * head * 0.5},${ey + py * head * 0.5} ${ex - px * head * 0.5},${ey - py * head * 0.5}`}
                  fill={color}
                />
              </g>
            );
          })}
        </svg>
      )}

      {badge && (() => {
        const [bx, by] = toXY(badge.square);
        return (
          <div
            className="pointer-events-none absolute z-30 flex h-[4.5%] w-[4.5%] items-center justify-center rounded-full text-[clamp(8px,1.6vw,14px)] font-black text-white shadow-lg"
            style={{ left: `${(bx + 1) * 12.5 - 3.5}%`, top: `${by * 12.5 - 1}%`, background: badge.color, minWidth: 18, minHeight: 18 }}
          >
            {badge.text}
          </div>
        );
      })()}

      {/* promoção */}
      {promo && (
        <div className="absolute inset-0 z-50 bg-black/40" onPointerDown={() => setPromo(null)}>
          <div
            className="absolute flex w-[12.5%] flex-col overflow-hidden rounded-md bg-white shadow-2xl"
            style={{
              left: `${promoXY[0] * 12.5}%`,
              top: promoXY[1] < 4 ? `${promoXY[1] * 12.5}%` : undefined,
              bottom: promoXY[1] >= 4 ? `${(7 - promoXY[1]) * 12.5}%` : undefined,
              flexDirection: promoXY[1] < 4 ? "column" : "column-reverse",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {(["q", "n", "r", "b"] as const).map((t) => (
              <button
                key={t}
                className="aspect-square w-full bg-neutral-100 transition hover:bg-amber-200"
                onClick={() => {
                  onMove?.(promo.from, promo.to, t);
                  setPromo(null);
                  setSelected(null);
                }}
              >
                <img src={pieceUrl(settings.pieceSet, promoColor, t)} alt={t} className="h-full w-full" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const Board = memo(BoardImpl);
