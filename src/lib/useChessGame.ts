import { useCallback, useMemo, useRef, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { START_FEN, gameStatus } from "./chessUtils";

/** Hook que encapsula uma partida (chess.js) com histórico, navegação e desfazer. */
export function useChessGame(initialFen: string = START_FEN) {
  const chessRef = useRef(new Chess(initialFen));
  const startRef = useRef(initialFen);
  const [tick, setTick] = useState(0);
  const [view, setViewState] = useState<number | null>(null); // null = posição atual
  const [animKey, setAnimKey] = useState(0);
  const [anim, setAnim] = useState<{ from: string; to: string; key: number; capture?: boolean } | null>(null);
  const bump = () => setTick((t) => t + 1);

  const chess = chessRef.current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => chess.history({ verbose: true }) as Move[], [tick, chess]);
  const fen = chess.fen();
  const startFen = startRef.current;
  const viewPly = view === null ? history.length : Math.min(view, history.length);
  const viewFen = viewPly === history.length ? fen : viewPly === 0 ? startFen : history[viewPly - 1].after;
  const lastMove = viewPly > 0 ? { from: history[viewPly - 1].from, to: history[viewPly - 1].to } : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const status = useMemo(() => gameStatus(chess), [tick, chess]);

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string, animate = false): Move | null => {
      const c = chessRef.current;
      try {
        const m = c.move({ from: from as Square, to: to as Square, promotion });
        setViewState(null);
        if (animate) {
          setAnimKey((k) => {
            setAnim({ from: m.from, to: m.to, key: k + 1, capture: !!m.captured });
            return k + 1;
          });
        } else setAnim(null);
        bump();
        return m;
      } catch {
        return null;
      }
    },
    []
  );

  const makeSan = useCallback((san: string, animate = true): Move | null => {
    const c = chessRef.current;
    try {
      const m = c.move(san);
      setViewState(null);
      if (animate) {
        setAnimKey((k) => {
          setAnim({ from: m.from, to: m.to, key: k + 1, capture: !!m.captured });
          return k + 1;
        });
      } else setAnim(null);
      bump();
      return m;
    } catch {
      return null;
    }
  }, []);

  const undo = useCallback((n = 1) => {
    for (let i = 0; i < n; i++) chessRef.current.undo();
    setViewState(null);
    setAnim(null);
    bump();
  }, []);

  const truncate = useCallback((ply: number) => {
    const c = chessRef.current;
    while (c.history().length > ply) c.undo();
    setViewState(null);
    setAnim(null);
    bump();
  }, []);

  const reset = useCallback((f: string = START_FEN, sans: string[] = []) => {
    const c = new Chess(f);
    for (const s of sans) {
      try {
        c.move(s);
      } catch {
        break;
      }
    }
    chessRef.current = c;
    startRef.current = f;
    setViewState(null);
    setAnim(null);
    bump();
  }, []);

  const setView = useCallback((ply: number | null) => {
    setViewState(ply);
    setAnim(null);
  }, []);

  return { chess, history, fen, startFen, viewFen, viewPly, lastMove, status, makeMove, makeSan, undo, truncate, reset, setView, anim, animKey, isLive: viewPly === history.length };
}
export type GameApi = ReturnType<typeof useChessGame>;
