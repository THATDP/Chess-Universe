// Camada de regras: tudo que o app sabe sobre xadrez passa por aqui (chess.js por baixo).
import { Chess, validateFen } from "chess.js";
import type { Move } from "chess.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface MoveRec {
  san: string;
  uci: string;
  from: string;
  to: string;
  promotion?: string;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  flags: string;
  /** FEN depois do lance */
  fen: string;
}

export type EndReason = "checkmate" | "stalemate" | "insufficient" | "threefold" | "fiftymove" | "timeout" | "resign" | "agreement";
export interface Outcome {
  over: boolean;
  result?: "1-0" | "0-1" | "1/2-1/2";
  reason?: EndReason;
  winner?: Color;
}

export const REASON_LABEL: Record<EndReason, string> = {
  checkmate: "Xeque-mate",
  stalemate: "Afogamento",
  insufficient: "Material insuficiente",
  threefold: "Repetição tripla de posição",
  fiftymove: "Regra dos 50 movimentos",
  timeout: "Tempo esgotado",
  resign: "Desistência",
  agreement: "Acordo de empate",
};

export function toRec(m: Move, fenAfter: string): MoveRec {
  return {
    san: m.san,
    uci: m.from + m.to + (m.promotion ?? ""),
    from: m.from,
    to: m.to,
    promotion: m.promotion,
    piece: m.piece as PieceType,
    color: m.color as Color,
    captured: m.captured as PieceType | undefined,
    flags: m.flags,
    fen: fenAfter,
  };
}

export function tryMove(fen: string, from: string, to: string, promotion?: string): MoveRec | null {
  try {
    const c = new Chess(fen);
    const m = c.move({ from, to, promotion });
    return toRec(m, c.fen());
  } catch {
    return null;
  }
}

export function tryUci(fen: string, uci: string): MoveRec | null {
  if (!uci || uci.length < 4) return null;
  return tryMove(fen, uci.slice(0, 2), uci.slice(2, 4), uci.length > 4 ? uci[4] : undefined);
}

export function trySan(fen: string, san: string): MoveRec | null {
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    return toRec(m, c.fen());
  } catch {
    return null;
  }
}

export function legalMoves(fen: string, square?: string): Move[] {
  const c = new Chess(fen);
  return c.moves({ verbose: true, ...(square ? { square: square as never } : {}) }) as Move[];
}

export function turnOf(fen: string): Color {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

export function isCheck(fen: string): boolean {
  try {
    return new Chess(fen).isCheck();
  } catch {
    return false;
  }
}

export function posKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function checkFen(fen: string): { ok: boolean; error?: string } {
  const r = validateFen(fen);
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export function kingSquare(fen: string, color: Color): string | null {
  const c = new Chess(fen);
  const b = c.board();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (p && p.type === "k" && p.color === color) return p.square;
    }
  return null;
}

/** Calcula o resultado a partir da lista de posições (da inicial até a atual). */
export function getOutcome(fens: string[]): Outcome {
  const fen = fens[fens.length - 1];
  const c = new Chess(fen);
  if (c.isCheckmate()) {
    const winner: Color = c.turn() === "w" ? "b" : "w";
    return { over: true, result: winner === "w" ? "1-0" : "0-1", reason: "checkmate", winner };
  }
  if (c.isStalemate()) return { over: true, result: "1/2-1/2", reason: "stalemate" };
  if (c.isInsufficientMaterial()) return { over: true, result: "1/2-1/2", reason: "insufficient" };
  const key = posKey(fen);
  let n = 0;
  for (const f of fens) if (posKey(f) === key) n++;
  if (n >= 3) return { over: true, result: "1/2-1/2", reason: "threefold" };
  const half = parseInt(fen.split(" ")[4] ?? "0", 10);
  if (half >= 100) return { over: true, result: "1/2-1/2", reason: "fiftymove" };
  return { over: false };
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export function pieceValue(t: string): number {
  return VAL[t] ?? 0;
}
/** Balanço de material (brancas − pretas) */
export function materialBalance(fen: string): number {
  const placement = fen.split(" ")[0];
  let s = 0;
  for (const ch of placement) {
    const lower = ch.toLowerCase();
    if (VAL[lower] !== undefined && /[a-z]/i.test(ch)) s += (ch === lower ? -1 : 1) * VAL[lower];
  }
  return s;
}
export function totalMaterial(fen: string): number {
  const placement = fen.split(" ")[0];
  let s = 0;
  for (const ch of placement) {
    const lower = ch.toLowerCase();
    if (/[a-z]/i.test(ch)) s += VAL[lower] ?? 0;
  }
  return s;
}

/** Converte uma linha em UCI para SAN a partir de uma FEN. Para quando encontra lance ilegal. */
export function uciLineToSan(fen: string, ucis: string[]): { san: string[]; fens: string[] } {
  const c = new Chess(fen);
  const san: string[] = [];
  const fens: string[] = [];
  for (const u of ucis) {
    try {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined });
      san.push(m.san);
      fens.push(c.fen());
    } catch {
      break;
    }
  }
  return { san, fens };
}

export function uciToSan(fen: string, uci: string): string {
  return uciLineToSan(fen, [uci]).san[0] ?? uci;
}

export function fenMoveNumber(fen: string): number {
  return parseInt(fen.split(" ")[5] ?? "1", 10) || 1;
}

/** Texto "12. Nf3 Nc6 13. Bb5" para uma linha SAN a partir de uma FEN */
export function formatLine(fen: string, san: string[]): string {
  let n = fenMoveNumber(fen);
  let t = turnOf(fen);
  const out: string[] = [];
  san.forEach((s, i) => {
    if (t === "w") out.push(`${n}.`);
    else if (i === 0) out.push(`${n}...`);
    out.push(s);
    if (t === "b") n++;
    t = t === "w" ? "b" : "w";
  });
  return out.join(" ");
}

export interface ParsedGame {
  startFen: string;
  moves: MoveRec[];
  headers: Record<string, string>;
}

export function buildPgn(startFen: string, moves: MoveRec[], headers: Record<string, string> = {}): string {
  const c = new Chess();
  if (startFen !== START_FEN) c.load(startFen);
  const lines: string[] = [];
  const h: Record<string, string> = {
    Event: "Chess Universe",
    Site: "Navegador",
    Date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
    Round: "-",
    White: "Brancas",
    Black: "Pretas",
    Result: "*",
    ...headers,
  };
  if (startFen !== START_FEN) {
    h.SetUp = "1";
    h.FEN = startFen;
  }
  for (const [k, v] of Object.entries(h)) lines.push(`[${k} "${v}"]`);
  let n = fenMoveNumber(startFen);
  let t = turnOf(startFen);
  const parts: string[] = [];
  moves.forEach((m, i) => {
    if (t === "w") parts.push(`${n}.`);
    else if (i === 0) parts.push(`${n}...`);
    parts.push(m.san);
    if (t === "b") n++;
    t = t === "w" ? "b" : "w";
  });
  parts.push(h.Result);
  return lines.join("\n") + "\n\n" + parts.join(" ");
}

export function parsePgn(text: string): ParsedGame {
  const c = new Chess();
  c.loadPgn(text.trim());
  const headers = c.getHeaders() as Record<string, string>;
  const verbose = c.history({ verbose: true }) as Move[];
  const startFen = headers.FEN && headers.SetUp === "1" ? headers.FEN : START_FEN;
  const moves: MoveRec[] = verbose.map((m) => toRec(m, m.after));
  return { startFen, moves, headers };
}

/** Converte lista de SANs separada por espaços (com ou sem numeração) em lances a partir de uma FEN. */
export function parseSanSequence(startFen: string, text: string): MoveRec[] | null {
  const tokens = text
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .split(/\s+/)
    .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  const out: MoveRec[] = [];
  let fen = startFen;
  for (const t of tokens) {
    const m = trySan(fen, t);
    if (!m) return null;
    out.push(m);
    fen = m.fen;
  }
  return out;
}

export function fenToBoard(fen: string) {
  return new Chess(fen).board();
}

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export function sqToXY(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1], 10)];
}
