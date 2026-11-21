import { trySan } from "../../core/chess/rules";
import type { MoveRec } from "../../core/chess/rules";
import { START_FEN } from "../../core/chess/rules";

/** SAN[] → MoveRec[] a partir de uma FEN (para quando encontra lance inválido) */
export function recsFromSan(startFen: string, san: string[]): MoveRec[] {
  const out: MoveRec[] = [];
  let fen = startFen;
  for (const s of san) {
    const r = trySan(fen, s);
    if (!r) break;
    out.push(r);
    fen = r.fen;
  }
  return out;
}

export const recsFromStart = (san: string[]) => recsFromSan(START_FEN, san);

export interface TrainConfig {
  key: string;
  title: string;
  startFen: string;
  /** linha teórica completa a partir de startFen */
  line: MoveRec[];
  startPly: number;
  userColor: "w" | "b";
  strict: boolean;
  level: number;
  theoryId?: string;
  progressKey: string;
}
