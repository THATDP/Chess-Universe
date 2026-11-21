import { useEffect, useRef, useState } from "react";
import { getEngine } from "./stockfish";
import type { Color } from "../chess/rules";

interface Opts {
  fen: string;
  engineColor: Color | null;
  turn: Color;
  over: boolean;
  atEnd: boolean;
  active: boolean;
  level: number;
  thinkMs: number;
  clockMs?: number;
  /** Se retornar um lance UCI, ele é usado em vez de consultar o Stockfish (teoria do laboratório) */
  respond?: () => string | null;
  onMove: (uci: string, fromTheory: boolean) => void;
  delayMs?: number;
}

/** Faz a IA (Stockfish em Web Worker) jogar quando for a vez dela. */
export function useEngineMove(o: Opts) {
  const [thinking, setThinking] = useState(false);
  const cb = useRef(o);
  cb.current = o;

  useEffect(() => {
    const c = cb.current;
    if (!c.active || c.over || !c.atEnd || !c.engineColor || c.turn !== c.engineColor) {
      setThinking(false);
      return;
    }
    let cancelled = false;
    const eng = getEngine("play");
    setThinking(true);
    const run = async () => {
      const theory = cb.current.respond?.() ?? null;
      if (theory) {
        await new Promise((r) => setTimeout(r, cb.current.delayMs ?? 450));
        if (cancelled) return;
        setThinking(false);
        cb.current.onMove(theory, true);
        return;
      }
      const t0 = performance.now();
      try {
        const res = await eng.playMove(c.fen, c.level, c.thinkMs, c.clockMs);
        if (cancelled || res.cancelled || !res.best) return;
        // pausa mínima para a jogada não parecer instantânea demais
        const min = 350 - (performance.now() - t0);
        if (min > 0) await new Promise((r) => setTimeout(r, min));
        if (cancelled) return;
        setThinking(false);
        cb.current.onMove(res.best, false);
      } catch {
        setThinking(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      eng.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.fen, o.engineColor, o.over, o.atEnd, o.active, o.level, o.turn]);

  return { thinking };
}
