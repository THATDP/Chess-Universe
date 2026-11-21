import { useEffect, useState } from "react";
import Board, { type Arrow } from "./Board";
import { useChessGame } from "../lib/useChessGame";
import { playMoveSound, play } from "../lib/sound";

export interface QuizResult {
  ok: boolean;
  msg: string;
}
/** Tabuleiro de "encontre o melhor lance": o julgamento é feito por `accept`. */
export default function MoveQuiz({ fen, accept, onDone, arrows = [], orientation }: { fen: string; accept: (uci: string, san: string, fen: string) => Promise<QuizResult>; onDone?: (ok: boolean) => void; arrows?: Arrow[]; orientation?: "w" | "b" }) {
  const g = useChessGame(fen);
  const [res, setRes] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const turn = fen.split(" ")[1] as "w" | "b";
  useEffect(() => {
    g.reset(fen);
    setRes(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);
  const onMove = async (from: string, to: string, promo?: string) => {
    if (busy || res?.ok || !g.isLive) return;
    const m = g.makeMove(from, to, promo, false);
    if (!m) return;
    playMoveSound(m);
    setBusy(true);
    setRes(null);
    const r = await accept(from + to + (promo ?? ""), m.san, fen);
    setBusy(false);
    setRes(r);
    if (r.ok) {
      play("correct");
      onDone?.(true);
    } else {
      play("error");
      onDone?.(false);
      setTimeout(() => g.undo(1), 1000);
    }
  };
  return (
    <div>
      <Board fen={g.viewFen} orientation={orientation ?? turn} movable={res?.ok ? null : turn} lastMove={g.lastMove} arrows={arrows} onMove={onMove} />
      <p className={`mt-2 text-sm min-h-6 ${res ? (res.ok ? "text-emerald-300" : "text-rose-300") : "text-zinc-500"}`}>{busy ? "⏳ O Stockfish está avaliando seu lance…" : res ? (res.ok ? "✅ " : "❌ ") + res.msg : `Vez das ${turn === "w" ? "brancas" : "pretas"}. Faça seu lance.`}</p>
    </div>
  );
}
