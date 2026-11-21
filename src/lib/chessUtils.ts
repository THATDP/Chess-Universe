import { Chess, type Move, type Square } from "chess.js";
import type { PVLine } from "./engine";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const VALUES: Record<string, number> = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };
export const PIECE_PT: Record<string, string> = {
  p: "peão",
  n: "cavalo",
  b: "bispo",
  r: "torre",
  q: "dama",
  k: "rei",
};
export const FILES = "abcdefgh";

export type Score = { cp?: number; mate?: number };

export function uciParts(uci: string) {
  return { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci.length > 4 ? uci[4] : undefined };
}

export function tryMove(chess: Chess, uci: string): Move | null {
  try {
    return chess.move(uciParts(uci));
  } catch {
    return null;
  }
}

export function sanFromUci(fen: string, uci: string): string {
  try {
    const c = new Chess(fen);
    const m = tryMove(c, uci);
    return m ? m.san : uci;
  } catch {
    return uci;
  }
}

export function pvToSan(fen: string, pv: string[], max = 8): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of pv.slice(0, max)) {
      const m = tryMove(c, u);
      if (!m) break;
      out.push(m.san);
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** Formata uma sequência de SAN com numeração: "1. e4 e5 2. Nf3" */
export function formatSanLine(startFen: string, sans: string[]): string {
  const parts = startFen.split(" ");
  let turn = parts[1] ?? "w";
  let num = Number(parts[5] ?? 1);
  let s = "";
  sans.forEach((san, i) => {
    if (turn === "w") s += `${num}. ${san} `;
    else s += i === 0 ? `${num}... ${san} ` : `${san} `;
    if (turn === "b") num++;
    turn = turn === "w" ? "b" : "w";
  });
  return s.trim();
}

export function fenAfter(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    return tryMove(c, uci) ? c.fen() : null;
  } catch {
    return null;
  }
}

export function fenFromSans(sans: string[], startFen = START_FEN): string | null {
  try {
    const c = new Chess(startFen);
    for (const s of sans) c.move(s);
    return c.fen();
  } catch {
    return null;
  }
}

export function splitMoves(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function lineCp(l: Score): number {
  if (l.mate !== undefined) return l.mate > 0 ? 10000 - l.mate : -10000 - l.mate;
  return l.cp ?? 0;
}

/** Pontuação do ponto de vista das brancas. */
export function scoreWhite(fen: string, l: PVLine | Score): Score {
  const flip = fen.split(" ")[1] === "b" ? -1 : 1;
  return l.mate !== undefined ? { mate: l.mate * flip } : { cp: (l.cp ?? 0) * flip };
}

export function formatScore(s: Score): string {
  if (s.mate !== undefined) return s.mate === 0 ? "#" : s.mate > 0 ? `+M${s.mate}` : `-M${Math.abs(s.mate)}`;
  const v = (s.cp ?? 0) / 100;
  return (v > 0 ? "+" : "") + v.toFixed(2);
}

export function winPct(cp: number): number {
  const c = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}
export const winPctScore = (s: Score) => winPct(lineCp(s));

export function accuracyFromLoss(loss: number): number {
  const a = 103.1668 * Math.exp(-0.04354 * Math.max(0, loss)) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

export type MoveClass =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export const CLASS_INFO: Record<MoveClass, { label: string; color: string; sym: string }> = {
  brilliant: { label: "Brilhante", color: "#26c2a3", sym: "!!" },
  great: { label: "Ótimo", color: "#5b8bb9", sym: "!" },
  best: { label: "Melhor", color: "#96bc4b", sym: "★" },
  excellent: { label: "Excelente", color: "#96bc4b", sym: "✓" },
  good: { label: "Bom", color: "#a3b18a", sym: "•" },
  book: { label: "Teoria", color: "#a88865", sym: "📖" },
  inaccuracy: { label: "Imprecisão", color: "#f7c631", sym: "?!" },
  mistake: { label: "Erro", color: "#e58f2a", sym: "?" },
  blunder: { label: "Grande erro", color: "#ca3431", sym: "??" },
};

export function classifyMove(p: {
  winBefore: number; // vitória% do jogador que moveu, melhor linha antes
  winAfter: number;
  isBest: boolean;
  isSacrifice: boolean;
  onlyMove: boolean;
}): MoveClass {
  const loss = p.winBefore - p.winAfter;
  if (p.isSacrifice && loss <= 2 && p.winAfter >= 45 && p.winBefore < 88) return "brilliant";
  if (p.isBest || loss <= 0.5) {
    if (p.onlyMove && p.winBefore < 92) return "great";
    return "best";
  }
  if (loss <= 2.5) return "excellent";
  if (loss <= 6) return "good";
  if (loss <= 11) return "inaccuracy";
  if (loss <= 22) return "mistake";
  return "blunder";
}

/** O lance é um sacrifício material? (peça vai para casa atacada perdendo valor) */
export function isSacrifice(fenBefore: string, mv: { from: string; to: string; promotion?: string }): boolean {
  try {
    const c = new Chess(fenBefore);
    const us = c.turn();
    const m = c.move({ from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion });
    if (m.piece === "k") return false;
    const gain = m.captured ? VALUES[m.captured] : 0;
    const them = us === "w" ? "b" : "w";
    const attacked = c.isAttacked(m.to, them);
    if (!attacked) return false;
    const defended = c.isAttacked(m.to, us);
    const lose = VALUES[m.piece] - gain;
    if (m.piece === "p") return false;
    return defended ? lose >= 5 : lose >= 2.5;
  } catch {
    return false;
  }
}

export function gameStatus(chess: Chess): {
  over: boolean;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  reason: string;
  winner?: "w" | "b";
} {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "b" : "w";
    return { over: true, result: winner === "w" ? "1-0" : "0-1", reason: "Xeque-mate", winner };
  }
  if (chess.isStalemate()) return { over: true, result: "1/2-1/2", reason: "Empate por afogamento" };
  if (chess.isInsufficientMaterial()) return { over: true, result: "1/2-1/2", reason: "Empate por material insuficiente" };
  if (chess.isThreefoldRepetition()) return { over: true, result: "1/2-1/2", reason: "Empate por tripla repetição" };
  if (chess.isDrawByFiftyMoves()) return { over: true, result: "1/2-1/2", reason: "Empate pela regra dos 50 movimentos" };
  return { over: false, result: "*", reason: "" };
}

export interface ParsedGame {
  startFen: string;
  sans: string[];
  headers: Record<string, string>;
}

/** Aceita PGN, lista de lances em SAN, lances em UCI ou FEN. */
export function parseGameInput(text: string): ParsedGame | { error: string } {
  const t = text.trim();
  if (!t) return { error: "Nada para importar." };
  if (/^[rnbqkpRNBQKP1-8/]+\s+[wb]\s+[-KQkq]+/.test(t) && !t.includes("[")) {
    try {
      const c = new Chess(t);
      return { startFen: c.fen(), sans: [], headers: {} };
    } catch {
      return { error: "FEN inválido." };
    }
  }
  try {
    const c = new Chess();
    c.loadPgn(t);
    const headers = c.getHeaders() as Record<string, string>;
    const sans = c.history();
    if (sans.length) return { startFen: headers.FEN ?? START_FEN, sans, headers };
  } catch {
    /* tenta modo tolerante */
  }
  const cleaned = t
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, " ");
  const toks = splitMoves(cleaned);
  const c = new Chess();
  const sans: string[] = [];
  for (const tok of toks) {
    try {
      let m: Move;
      if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(tok)) m = c.move(uciParts(tok));
      else m = c.move(tok.replace(/0/g, "O"));
      sans.push(m.san);
    } catch {
      return { error: `Lance inválido ou ilegal: "${tok}" (após ${sans.length} lances).` };
    }
  }
  if (!sans.length) return { error: "Nenhum lance reconhecido." };
  return { startFen: START_FEN, sans, headers: {} };
}

export function toPgn(startFen: string, sans: string[], headers: Record<string, string> = {}, result = "*"): string {
  const c = new Chess(startFen);
  for (const s of sans) {
    try {
      c.move(s);
    } catch {
      break;
    }
  }
  const h: Record<string, string> = { Event: "Chess Universe", Site: "Navegador", Date: new Date().toISOString().slice(0, 10).replace(/-/g, "."), Result: result, ...headers };
  if (startFen !== START_FEN) {
    h.SetUp = "1";
    h.FEN = startFen;
  }
  Object.entries(h).forEach(([k, v]) => c.setHeader(k, v));
  return c.pgn();
}

// ---------- Explicações estratégicas ----------

const CENTER = ["d4", "e4", "d5", "e5"];

export function materialBalance(fen: string): { w: number; b: number; diff: number } {
  const c = new Chess(fen);
  let w = 0,
    b = 0;
  for (const row of c.board())
    for (const p of row) {
      if (!p || p.type === "k") continue;
      const v = Math.round(VALUES[p.type]);
      if (p.color === "w") w += v;
      else b += v;
    }
  return { w, b, diff: w - b };
}

function kingCastled(c: Chess, color: "w" | "b") {
  for (const row of c.board())
    for (const p of row) if (p && p.type === "k" && p.color === color) return false;
  return false;
}
void kingCastled;

function findKing(c: Chess, color: "w" | "b"): Square | null {
  const b = c.board();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (p && p.type === "k" && p.color === color) return (FILES[f] + (8 - r)) as Square;
    }
  return null;
}
export { findKing };

export function developedCount(fen: string, color: "w" | "b"): number {
  const c = new Chess(fen);
  const back = color === "w" ? 1 : 8;
  let n = 0;
  for (const row of c.board())
    for (const p of row) void p;
  const b = c.board();
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (p && p.color === color && (p.type === "n" || p.type === "b") && 8 - r !== back) n++;
    }
  return n;
}

export function scoreLabel(cpWhite: number): string {
  const a = Math.abs(cpWhite);
  const side = cpWhite > 0 ? "Brancas" : "Pretas";
  if (a < 25) return "Posição equilibrada";
  if (a < 70) return `${side} com ligeira vantagem`;
  if (a < 150) return `${side} com vantagem`;
  if (a < 300) return `${side} com grande vantagem`;
  return `${side} com vantagem decisiva`;
}

export function explainMove(
  fenBefore: string,
  mv: { from: string; to: string; promotion?: string },
  opts: { cls?: MoveClass; bestSan?: string; before?: Score; after?: Score } = {}
): string {
  const parts: string[] = [];
  try {
    const c = new Chess(fenBefore);
    const us = c.turn();
    const m = c.move({ from: mv.from as Square, to: mv.to as Square, promotion: mv.promotion });
    const name = PIECE_PT[m.piece];
    if (m.flags.includes("k") || m.flags.includes("q")) {
      parts.push(`Roque ${m.flags.includes("k") ? "curto" : "longo"}: leva o rei para a segurança e conecta a torre ao jogo.`);
    } else if (m.promotion) {
      parts.push(`Promoção do peão a ${PIECE_PT[m.promotion]}, transformando a vantagem de espaço em material.`);
    } else if (m.captured) {
      const cap = PIECE_PT[m.captured];
      if (m.flags.includes("e")) parts.push("Captura en passant, removendo o peão adversário.");
      else if (VALUES[m.captured] >= VALUES[m.piece] + 1) parts.push(`${cap[0].toUpperCase() + cap.slice(1)} capturado(a) com ${name}: ganho material.`);
      else if (Math.abs(VALUES[m.captured] - VALUES[m.piece]) < 0.5) parts.push(`Troca de ${cap}: simplifica e altera a estrutura da posição.`);
      else parts.push(`Captura ${cap} com ${name}.`);
    } else if (m.piece === "p") {
      if (CENTER.includes(m.to)) parts.push("Peão ocupa o centro, ganhando espaço e abrindo linhas para bispos e dama.");
      else if (["c", "f"].includes(m.to[0]) && Math.abs(Number(m.to[1]) - Number(m.from[1])) === 2) parts.push("Avanço de peão que disputa o centro e prepara o desenvolvimento.");
      else parts.push("Avanço de peão para ganhar espaço ou criar uma estrutura de apoio.");
    } else if ((m.piece === "n" || m.piece === "b") && Number(m.from[1]) === (us === "w" ? 1 : 8)) {
      parts.push(`Desenvolvimento do ${name}: coloca a peça em uma casa mais ativa e mobiliza o jogo.`);
    } else if (m.piece === "r") {
      parts.push("Torre ativada, buscando colunas abertas ou semiabertas.");
    } else if (m.piece === "q") {
      parts.push("Movimento de dama: pressiona a posição adversária — cuidado com tempos perdidos se for cedo demais.");
    } else if (m.piece === "k") {
      parts.push("Movimento de rei, ajustando sua segurança ou atividade no final.");
    } else {
      parts.push(`${name[0].toUpperCase() + name.slice(1)} reposicionado em ${m.to}.`);
    }
    if (c.isCheckmate()) parts.push("Xeque-mate!");
    else if (c.inCheck()) parts.push("Dá xeque, forçando a resposta do adversário.");
    const them = us === "w" ? "b" : "w";
    if (m.piece !== "k" && c.isAttacked(m.to, them) && !c.isAttacked(m.to, us) && VALUES[m.piece] >= 3) {
      parts.push(`Atenção: o ${name} fica sem proteção em ${m.to}.`);
    }
  } catch {
    /* ignore */
  }
  if (opts.cls) {
    const info = CLASS_INFO[opts.cls];
    const ev = opts.after ? ` (avaliação ${formatScore(opts.after)})` : "";
    if (opts.cls === "brilliant") parts.push(`Lance brilhante${ev}: sacrifício correto que o motor confirma como forte.`);
    else if (opts.cls === "great") parts.push(`Lance ótimo${ev}: era praticamente o único bom lance da posição.`);
    else if (opts.cls === "best") parts.push(`É o melhor lance segundo o Stockfish${ev}.`);
    else if (opts.cls === "excellent" || opts.cls === "good") parts.push(`${info.label} lance${ev}, quase tão bom quanto o melhor${opts.bestSan ? ` (${opts.bestSan})` : ""}.`);
    else if (opts.cls === "book") parts.push("Lance de teoria: faz parte da linha de abertura conhecida.");
    else parts.push(`${info.label}${ev}. ${opts.bestSan ? `O melhor era ${opts.bestSan}.` : ""}`);
  }
  return parts.join(" ");
}

/** Resumo de por que uma linha funciona ou falha, a partir da avaliação e da estrutura. */
export function describeLineOutcome(fen: string, score: Score, gambitSide?: "w" | "b"): string[] {
  const out: string[] = [];
  const cpW = lineCp(score);
  const mat = materialBalance(fen);
  out.push(`${scoreLabel(cpW)} (${formatScore(score)}).`);
  if (gambitSide) {
    const myMat = gambitSide === "w" ? mat.diff : -mat.diff;
    const myEval = gambitSide === "w" ? cpW : -cpW;
    if (myMat <= -1 && myEval > -60) out.push("O gambito funciona: o material sacrificado é compensado por iniciativa, desenvolvimento ou ataque.");
    else if (myMat <= -1 && myEval <= -60) out.push("A compensação não é suficiente nesta linha: o lado do gambito está pior e o adversário defendeu com precisão.");
    else if (myMat >= 1) out.push("O gambito foi aceito e o material foi recuperado ou ganho — o adversário pagou o preço com tempo/posição?");
    else out.push("Material igualado: a luta agora é posicional.");
  }
  if (Math.abs(mat.diff) >= 1) out.push(`Material: ${mat.diff > 0 ? "Brancas" : "Pretas"} com ${Math.abs(mat.diff)} ponto(s) de vantagem material.`);
  const dw = developedCount(fen, "w"),
    db = developedCount(fen, "b");
  if (Math.abs(dw - db) >= 2) out.push(`${dw > db ? "Brancas" : "Pretas"} estão mais desenvolvidas (${Math.max(dw, db)} x ${Math.min(dw, db)} peças menores ativas).`);
  return out;
}
