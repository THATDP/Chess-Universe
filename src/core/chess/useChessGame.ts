import { useCallback, useMemo, useRef, useState } from "react";
import { START_FEN, getOutcome, tryMove, tryUci, turnOf } from "./rules";
import type { MoveRec, Outcome } from "./rules";

export interface GameState {
  startFen: string;
  moves: MoveRec[];
  cursor: number;
}

/**
 * Estado de uma partida com histórico navegável.
 * Jogar um lance a partir de uma posição antiga cria uma nova ramificação (a continuação antiga é descartada).
 */
export function useChessGame(initialFen: string = START_FEN, initialMoves: MoveRec[] = []) {
  const [state, setState] = useState<GameState>({ startFen: initialFen, moves: initialMoves, cursor: initialMoves.length });
  const ref = useRef(state);

  const commit = useCallback((next: GameState) => {
    ref.current = next;
    setState(next);
  }, []);

  const fens = useMemo(() => [state.startFen, ...state.moves.map((m) => m.fen)], [state.startFen, state.moves]);
  const fen = fens[state.cursor];
  const visibleFens = useMemo(() => fens.slice(0, state.cursor + 1), [fens, state.cursor]);
  const outcome: Outcome = useMemo(() => getOutcome(visibleFens), [visibleFens]);
  const lastMove = state.cursor > 0 ? state.moves[state.cursor - 1] : null;
  const turn = turnOf(fen);

  const push = useCallback(
    (rec: MoveRec | null): MoveRec | null => {
      if (!rec) return null;
      const s = ref.current;
      const moves = s.moves.slice(0, s.cursor);
      moves.push(rec);
      commit({ ...s, moves, cursor: moves.length });
      return rec;
    },
    [commit]
  );

  const currentFen = () => {
    const s = ref.current;
    return s.cursor === 0 ? s.startFen : s.moves[s.cursor - 1].fen;
  };

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      const fenNow = currentFen();
      if (getOutcomeSafe(ref.current).over) return null;
      return push(tryMove(fenNow, from, to, promotion));
    },
    [push]
  );
  const playUci = useCallback(
    (uci: string) => {
      if (getOutcomeSafe(ref.current).over) return null;
      return push(tryUci(currentFen(), uci));
    },
    [push]
  );

  const goTo = useCallback(
    (i: number) => {
      const s = ref.current;
      const c = Math.max(0, Math.min(s.moves.length, i));
      if (c !== s.cursor) commit({ ...s, cursor: c });
    },
    [commit]
  );
  const back = useCallback(() => goTo(ref.current.cursor - 1), [goTo]);
  const forward = useCallback(() => goTo(ref.current.cursor + 1), [goTo]);

  /** Remove definitivamente os últimos n lances (desfazer) */
  const takeback = useCallback(
    (n: number) => {
      const s = ref.current;
      const len = Math.max(0, s.cursor - n);
      commit({ ...s, moves: s.moves.slice(0, len), cursor: len });
    },
    [commit]
  );
  /** Descarta lances depois do cursor */
  const truncate = useCallback(() => {
    const s = ref.current;
    commit({ ...s, moves: s.moves.slice(0, s.cursor) });
  }, [commit]);

  const reset = useCallback(
    (startFen: string = START_FEN, moves: MoveRec[] = [], cursor?: number) => {
      commit({ startFen, moves, cursor: cursor ?? moves.length });
    },
    [commit]
  );

  return {
    state,
    startFen: state.startFen,
    moves: state.moves,
    cursor: state.cursor,
    fens,
    fen,
    turn,
    outcome,
    lastMove,
    atEnd: state.cursor === state.moves.length,
    makeMove,
    playUci,
    goTo,
    back,
    forward,
    takeback,
    truncate,
    reset,
    ref,
  };
}

function getOutcomeSafe(s: GameState): Outcome {
  const fens = [s.startFen, ...s.moves.slice(0, s.cursor).map((m) => m.fen)];
  return getOutcome(fens);
}
