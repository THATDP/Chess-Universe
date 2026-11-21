import { useCallback, useRef, useState } from "react";
import { Chess, type Move } from "chess.js";
import { analyzeFen } from "./engine";
import { bookLookup } from "../data/openings";
import { classifyMove, isSacrifice, lineCp, sanFromUci, scoreWhite, winPct, type MoveClass, type Score } from "./chessUtils";

export interface PosEval {
  score: Score; // pontos de vista das brancas
  best: string; // melhor lance (UCI)
  pv: string[];
  second?: Score;
  depth: number;
}
const key = (fen: string) => fen.split(" ").slice(0, 4).join(" ");

export function terminalEval(fen: string): PosEval | null {
  try {
    const c = new Chess(fen);
    if (c.isCheckmate()) return { score: { cp: c.turn() === "w" ? -10000 : 10000 }, best: "", pv: [], depth: 99 };
    if (c.isDraw() || c.isStalemate()) return { score: { cp: 0 }, best: "", pv: [], depth: 99 };
  } catch {
    /* ignore */
  }
  return null;
}

export interface MoveVerdict {
  cls: MoveClass;
  bestSan: string;
  before: Score;
  after: Score;
  loss: number;
}

/** Mantém um mapa FEN → avaliação do Stockfish, calculado sob demanda. */
export function useEvals(depth = 12) {
  const map = useRef(new Map<string, PosEval>());
  const pending = useRef(new Set<string>());
  const [version, setVersion] = useState(0);

  const ensure = useCallback(
    async (fen: string) => {
      const k = key(fen);
      if (map.current.has(k) || pending.current.has(k)) return;
      const t = terminalEval(fen);
      if (t) {
        map.current.set(k, t);
        setVersion((v) => v + 1);
        return;
      }
      pending.current.add(k);
      const r = await analyzeFen(fen, depth, 2);
      pending.current.delete(k);
      if (r && r.lines.length) {
        map.current.set(k, {
          score: scoreWhite(fen, r.lines[0]),
          best: r.lines[0].pv[0] ?? r.best ?? "",
          pv: r.lines[0].pv,
          second: r.lines[1] ? scoreWhite(fen, r.lines[1]) : undefined,
          depth: r.depth,
        });
        setVersion((v) => v + 1);
      }
    },
    [depth]
  );
  const get = useCallback((fen: string) => map.current.get(key(fen)), []);

  const verdict = useCallback(
    (m: Move, useBook = true): MoveVerdict | null => {
      const prev = map.current.get(key(m.before));
      const next = map.current.get(key(m.after));
      if (!prev || !next) return null;
      const mover = m.color;
      const toMover = (s: Score) => (mover === "w" ? winPct(lineCp(s)) : 100 - winPct(lineCp(s)));
      const winBefore = toMover(prev.score);
      const winAfter = toMover(next.score);
      const played = m.from + m.to + (m.promotion ?? "");
      const isBest = prev.best === played;
      const only = prev.second ? winBefore - toMover(prev.second) > 12 : false;
      let cls = classifyMove({ winBefore, winAfter, isBest, isSacrifice: isSacrifice(m.before, m), onlyMove: only });
      if (useBook && bookLookup(m.after) && winBefore - winAfter < 6 && cls !== "brilliant") cls = "book";
      return { cls, bestSan: prev.best ? sanFromUci(m.before, prev.best) : "", before: prev.score, after: next.score, loss: Math.max(0, winBefore - winAfter) };
    },
    []
  );
  return { ensure, get, verdict, version };
}
