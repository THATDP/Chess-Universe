import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { useSettings } from "../lib/store";
import { BOARD_THEMES, PIECE_THEMES, pieceUrl, type PieceTheme } from "../lib/themes";
import { CLASS_INFO, FILES, type MoveClass } from "../lib/chessUtils";

export interface Arrow {
  from: string;
  to: string;
  color?: string;
}
export interface BoardProps {
  fen: string;
  orientation?: "w" | "b";
  movable?: "w" | "b" | "both" | null;
  lastMove?: { from: string; to: string } | null;
  anim?: { from: string; to: string; key: number; capture?: boolean } | null;
  arrows?: Arrow[];
  badge?: { square: string; cls: MoveClass } | null;
  highlights?: string[];
  onMove?: (from: string, to: string, promotion?: string) => void;
  coords?: boolean;
  className?: string;
}

function xy(sq: string, o: "w" | "b") {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]);
  return o === "w" ? { x: f, y: 8 - r } : { x: 7 - f, y: r - 1 };
}

export function useBoardColors() {
  const s = useSettings();
  const bt = BOARD_THEMES.find((t) => t.id === s.boardTheme) ?? BOARD_THEMES[0];
  const light = s.boardTheme === "custom" ? s.customLight : bt.light;
  const dark = s.boardTheme === "custom" ? s.customDark : bt.dark;
  return { light, dark };
}
export function usePieceTheme(): PieceTheme {
  const s = useSettings();
  const base = PIECE_THEMES.find((t) => t.id === s.pieceTheme) ?? PIECE_THEMES[0];
  if (base.id === "custom") return { ...base, wFill: s.customWFill, wStroke: s.customWStroke, bFill: s.customBFill, bStroke: s.customBStroke };
  return base;
}

export function PieceImg({ color, type, className, style }: { color: "w" | "b"; type: string; className?: string; style?: React.CSSProperties }) {
  const theme = usePieceTheme();
  return <img src={pieceUrl(theme, color, type)} alt="" draggable={false} className={className} style={style} />;
}

export default function Board({ fen, orientation = "w", movable = null, lastMove, anim, arrows = [], badge, highlights = [], onMove, coords, className = "" }: BoardProps) {
  const settings = useSettings();
  const { light, dark } = useBoardColors();
  const theme = usePieceTheme();
  const showCoords = coords ?? settings.coords;
  const ref = useRef<HTMLDivElement>(null);
  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: string; x: number; y: number } | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [fx, setFx] = useState<{ sq: string; key: number } | null>(null);
  const [user, setUser] = useState<{ arrows: Arrow[]; marks: string[] }>({ arrows: [], marks: [] });
  const rc = useRef<string | null>(null);

  useEffect(() => {
    setSelected(null);
    setPromo(null);
  }, [fen]);

  const board = chess.board();
  const turn = chess.turn();
  const canMove = (color: "w" | "b") => movable === "both" || movable === color;

  const targets = useMemo(() => {
    const m = new Map<string, boolean>();
    const from = drag?.from ?? selected;
    if (!from) return m;
    for (const mv of chess.moves({ square: from as Square, verbose: true })) m.set(mv.to, !!mv.promotion);
    return m;
  }, [chess, selected, drag]);

  // animação de deslocamento (inclui torre no roque)
  useLayoutEffect(() => {
    if (!anim || !settings.animations || !ref.current) return;
    const run = (from: string, to: string) => {
      const el = ref.current!.querySelector<HTMLElement>(`[data-sq="${to}"]`);
      if (!el) return;
      const a = xy(from, orientation),
        b = xy(to, orientation);
      el.animate([{ transform: `translate(${(a.x - b.x) * 100}%, ${(a.y - b.y) * 100}%)`, zIndex: 30 }, { transform: "translate(0,0)", zIndex: 30 }], { duration: 190, easing: "cubic-bezier(.25,.9,.3,1)" });
    };
    run(anim.from, anim.to);
    const p = chess.get(anim.to as Square);
    if (p && p.type === "k" && Math.abs(FILES.indexOf(anim.from[0]) - FILES.indexOf(anim.to[0])) === 2) {
      const rank = anim.to[1];
      const kingside = anim.to[0] === "g";
      run((kingside ? "h" : "a") + rank, (kingside ? "f" : "d") + rank);
    }
    if (anim.capture) {
      setFx({ sq: anim.to, key: anim.key });
      const t = setTimeout(() => setFx(null), 650);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim?.key]);

  function sqFromEvent(e: { clientX: number; clientY: number }): string | null {
    const r = ref.current!.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) / r.width) * 8);
    const row = Math.floor(((e.clientY - r.top) / r.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    const file = orientation === "w" ? col : 7 - col;
    const rank = orientation === "w" ? 8 - row : row + 1;
    return FILES[file] + rank;
  }

  function attempt(from: string, to: string) {
    if (!targets.has(to) && !chess.moves({ square: from as Square, verbose: true }).some((m) => m.to === to)) return;
    const isPromo = chess.moves({ square: from as Square, verbose: true }).some((m) => m.to === to && m.promotion);
    setSelected(null);
    setDrag(null);
    if (isPromo) {
      if (settings.autoQueen) onMove?.(from, to, "q");
      else setPromo({ from, to });
    } else onMove?.(from, to);
  }

  function onPointerDown(e: React.PointerEvent) {
    const sq = sqFromEvent(e);
    if (!sq) return;
    if (e.button === 2) {
      rc.current = sq;
      return;
    }
    if (user.arrows.length || user.marks.length) setUser({ arrows: [], marks: [] });
    if (promo) return;
    if (selected && targets.has(sq) && sq !== selected) {
      attempt(selected, sq);
      return;
    }
    const p = chess.get(sq as Square);
    if (p && canMove(p.color) && p.color === turn) {
      setSelected(sq);
      setDrag({ from: sq, x: e.clientX, y: e.clientY });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } else setSelected(null);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY });
  }
  function onPointerUp(e: React.PointerEvent) {
    const sq = sqFromEvent(e);
    if (e.button === 2) {
      const s = rc.current;
      rc.current = null;
      if (!s || !sq) return;
      setUser((u) => {
        if (s === sq) return { ...u, marks: u.marks.includes(sq) ? u.marks.filter((x) => x !== sq) : [...u.marks, sq] };
        const ex = u.arrows.find((a) => a.from === s && a.to === sq);
        return { ...u, arrows: ex ? u.arrows.filter((a) => a !== ex) : [...u.arrows, { from: s, to: sq, color: "#ef4444" }] };
      });
      return;
    }
    if (drag) {
      const from = drag.from;
      setDrag(null);
      if (sq && sq !== from) attempt(from, sq);
    }
  }

  const king = chess.inCheck() ? board.flat().find((p) => p && p.type === "k" && p.color === turn) : null;
  const kingSq = king ? king.square : null;
  const mate = chess.isCheckmate();
  const sqSize = 12.5;

  const squares = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const file = orientation === "w" ? c : 7 - c;
      const rank = orientation === "w" ? 8 - r : r + 1;
      const sq = FILES[file] + rank;
      const isLight = (file + rank) % 2 === 1;
      const isLast = settings.highlightLast && lastMove && (lastMove.from === sq || lastMove.to === sq);
      const isSel = selected === sq || drag?.from === sq;
      squares.push(
        <div key={sq} className="absolute" style={{ left: `${c * sqSize}%`, top: `${r * sqSize}%`, width: `${sqSize}%`, height: `${sqSize}%`, background: isLight ? light : dark }}>
          {isLast && <div className="absolute inset-0" style={{ background: "rgba(255,214,10,.38)" }} />}
          {isSel && <div className="absolute inset-0" style={{ background: "rgba(255,230,60,.5)" }} />}
          {highlights.includes(sq) && <div className="absolute inset-0" style={{ background: "rgba(80,200,120,.45)" }} />}
          {user.marks.includes(sq) && <div className="absolute inset-0" style={{ background: "rgba(239,68,68,.5)" }} />}
          {kingSq === sq && <div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${mate ? "rgba(255,0,0,.95)" : "rgba(255,40,40,.85)"} 0%, rgba(230,30,30,.5) 45%, rgba(200,0,0,0) 78%)` }} />}
          {showCoords && c === 0 && (
            <span className="absolute left-[3%] top-[2%] text-[clamp(8px,1.3vw,12px)] font-bold leading-none" style={{ color: isLight ? dark : light }}>
              {rank}
            </span>
          )}
          {showCoords && r === 7 && (
            <span className="absolute right-[4%] bottom-[2%] text-[clamp(8px,1.3vw,12px)] font-bold leading-none" style={{ color: isLight ? dark : light }}>
              {FILES[file]}
            </span>
          )}
          {settings.legalMoves && targets.has(sq) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {chess.get(sq as Square) || (chess.get((drag?.from ?? selected) as Square)?.type === "p" && sq[0] !== (drag?.from ?? selected)![0]) ? (
                <div className="w-[88%] h-[88%] rounded-full" style={{ boxShadow: "inset 0 0 0 .38rem rgba(20,20,20,.28)" }} />
              ) : (
                <div className="w-[30%] h-[30%] rounded-full" style={{ background: "rgba(20,20,20,.28)" }} />
              )}
            </div>
          )}
        </div>
      );
    }

  const pieces = [];
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      const sq = FILES[f] + (8 - r);
      const { x, y } = xy(sq, orientation);
      pieces.push(
        <div key={sq + p.color + p.type} data-sq={sq} className="absolute pointer-events-none" style={{ left: `${x * sqSize}%`, top: `${y * sqSize}%`, width: `${sqSize}%`, height: `${sqSize}%`, opacity: drag?.from === sq ? 0.3 : 1, zIndex: 10 }}>
          <img src={pieceUrl(theme, p.color, p.type)} alt="" draggable={false} className="w-full h-full drop-shadow-[0_2px_2px_rgba(0,0,0,.35)]" />
        </div>
      );
    }

  const bd = badge ? xy(badge.square, orientation) : null;
  const dragPiece = drag ? chess.get(drag.from as Square) : null;
  const sizePx = ref.current ? ref.current.getBoundingClientRect().width / 8 : 60;

  return (
    <div className={`relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 select-none ${className}`} ref={ref} style={{ touchAction: "none", cursor: drag ? "grabbing" : "default" }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onContextMenu={(e) => e.preventDefault()}>
      {squares}
      {pieces}
      {/* setas */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 20 }} viewBox="0 0 8 8">
        {[...arrows, ...user.arrows].map((a, i) => {
          const A = xy(a.from, orientation),
            B = xy(a.to, orientation);
          const x1 = A.x + 0.5,
            y1 = A.y + 0.5,
            x2 = B.x + 0.5,
            y2 = B.y + 0.5;
          const dx = x2 - x1,
            dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len,
            uy = dy / len;
          const hx = x2 - ux * 0.32,
            hy = y2 - uy * 0.32;
          const col = a.color ?? "#22c55e";
          return (
            <g key={i} opacity={0.82}>
              <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={col} strokeWidth={0.16} strokeLinecap="round" />
              <polygon points={`${x2 - ux * 0.05},${y2 - uy * 0.05} ${hx - uy * 0.19},${hy + ux * 0.19} ${hx + uy * 0.19},${hy - ux * 0.19}`} fill={col} />
            </g>
          );
        })}
      </svg>
      {bd && badge && (
        <div className="absolute z-30 pointer-events-none flex items-center justify-center" style={{ left: `${bd.x * sqSize + sqSize * 0.62}%`, top: `${bd.y * sqSize - sqSize * 0.12}%`, width: `${sqSize * 0.5}%`, height: `${sqSize * 0.5}%` }}>
          <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black shadow-md" style={{ background: CLASS_INFO[badge.cls].color, fontSize: "clamp(7px,1.2vw,13px)" }}>
            {CLASS_INFO[badge.cls].sym}
          </div>
        </div>
      )}
      {fx && (
        <div key={fx.key} className="absolute pointer-events-none z-30" style={{ left: `${xy(fx.sq, orientation).x * sqSize}%`, top: `${xy(fx.sq, orientation).y * sqSize}%`, width: `${sqSize}%`, height: `${sqSize}%` }}>
          <div className="cap-ring" />
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="cap-particle" style={{ ["--a" as string]: `${i * 36}deg`, ["--d" as string]: `${55 + (i % 3) * 25}%` }} />
          ))}
        </div>
      )}
      {drag && dragPiece && (
        <img src={pieceUrl(theme, dragPiece.color, dragPiece.type)} alt="" draggable={false} className="fixed pointer-events-none z-50" style={{ left: drag.x - sizePx * 0.6, top: drag.y - sizePx * 0.6, width: sizePx * 1.2, height: sizePx * 1.2, filter: "drop-shadow(0 8px 8px rgba(0,0,0,.45))" }} />
      )}
      {mate && <div className="absolute inset-0 pointer-events-none z-20 ring-4 ring-inset ring-red-500/60 rounded-lg" />}
      {promo && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center" onPointerDown={(e) => e.stopPropagation()}>
          <div className="bg-zinc-900 border border-white/15 rounded-xl p-3 flex gap-2 shadow-2xl">
            {(["q", "r", "b", "n"] as const).map((t) => (
              <button
                key={t}
                className="w-[clamp(44px,9vw,76px)] aspect-square rounded-lg bg-white/10 hover:bg-amber-400/30 transition flex items-center justify-center"
                onClick={() => {
                  const p = promo;
                  setPromo(null);
                  onMove?.(p.from, p.to, t);
                }}
              >
                <img src={pieceUrl(theme, turn, t)} alt={t} className="w-full h-full" draggable={false} />
              </button>
            ))}
            <button className="px-2 text-xs text-zinc-400 hover:text-white" onClick={() => setPromo(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
