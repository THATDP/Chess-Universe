// Análise completa de partidas com Stockfish: avaliação por lance, classificação, precisão e momentos decisivos.
import { getEngine, lineCp } from "../engine/stockfish";
import type { EngineLine } from "../engine/stockfish";
import { getOutcome, materialBalance, totalMaterial, turnOf, uciToSan } from "../chess/rules";
import type { Color, MoveRec } from "../chess/rules";
import { winPct } from "../engine/levels";

export type MoveClass = "brilliant" | "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder";

export const CLASS_INFO: Record<MoveClass, { label: string; symbol: string; color: string }> = {
  brilliant: { label: "Brilhante", symbol: "!!", color: "#22d3ee" },
  best: { label: "Melhor lance", symbol: "★", color: "#4ade80" },
  excellent: { label: "Excelente", symbol: "!", color: "#86efac" },
  good: { label: "Bom", symbol: "", color: "#a3a3a3" },
  inaccuracy: { label: "Imprecisão", symbol: "?!", color: "#facc15" },
  mistake: { label: "Erro", symbol: "?", color: "#fb923c" },
  blunder: { label: "Grande erro", symbol: "??", color: "#f87171" },
};

export interface PlyEval {
  cp?: number;
  mate?: number;
  /** cp equivalente (perspectiva das brancas) */
  value: number;
  best: string | null;
  pv: string[];
  depth: number;
}

export interface MoveInfo {
  cls: MoveClass;
  /** perda de chance de vitória (0–100) */
  loss: number;
  /** perda em centipeões */
  cpl: number;
  accuracy: number;
  bestUci: string | null;
  bestSan: string | null;
  evalBefore: number;
  evalAfter: number;
}

export interface Moment {
  ply: number; // índice do lance (0-based)
  loss: number;
  swing: number;
  cls: MoveClass;
  color: Color;
}

export interface Recommendation {
  title: string;
  text: string;
  action: "puzzles" | "endgames" | "openings" | "lab" | "play";
}

export interface GameAnalysis {
  evals: PlyEval[];
  moves: MoveInfo[];
  accuracy: { w: number; b: number };
  acpl: { w: number; b: number };
  counts: Record<Color, Record<MoveClass, number>>;
  moments: Moment[];
  recommendations: Record<Color, Recommendation[]>;
  movetime: number;
}

const emptyCounts = (): Record<MoveClass, number> => ({ brilliant: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 });
const moverAcc = (loss: number) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));

export async function analyzeGame(
  startFen: string,
  moves: MoveRec[],
  opts: { movetime: number; onProgress?: (done: number, total: number, evals: PlyEval[]) => void; signal?: { cancelled: boolean } }
): Promise<GameAnalysis | null> {
  const eng = getEngine("aux");
  const fens = [startFen, ...moves.map((m) => m.fen)];
  const evals: PlyEval[] = [];

  for (let i = 0; i < fens.length; i++) {
    if (opts.signal?.cancelled) return null;
    const out = getOutcome(fens.slice(0, i + 1));
    let ev: PlyEval;
    if (out.over && (out.reason === "checkmate" || out.reason === "stalemate" || out.reason === "insufficient" || out.reason === "fiftymove" || out.reason === "threefold")) {
      const v = out.reason === "checkmate" ? (turnOf(fens[i]) === "w" ? -10000 : 10000) : 0;
      ev = { value: v, best: null, pv: [], depth: 0, mate: out.reason === "checkmate" ? 0 : undefined, cp: out.reason === "checkmate" ? undefined : 0 };
    } else {
      const r = await eng.search(fens[i], { movetime: opts.movetime, multipv: 1 });
      if (r.cancelled && opts.signal?.cancelled) return null;
      const l: EngineLine | undefined = r.lines[0];
      ev = l
        ? { cp: l.cp, mate: l.mate, value: lineCp(l), best: r.best ?? l.pv[0] ?? null, pv: l.pv, depth: l.depth }
        : { value: 0, cp: 0, best: r.best, pv: [], depth: 0 };
    }
    evals.push(ev);
    opts.onProgress?.(i + 1, fens.length, evals);
  }

  const infos: MoveInfo[] = [];
  const counts = { w: emptyCounts(), b: emptyCounts() };
  const accs = { w: [] as number[], b: [] as number[] };
  const cpls = { w: [] as number[], b: [] as number[] };

  moves.forEach((m, i) => {
    const color = m.color;
    const sign = color === "w" ? 1 : -1;
    const before = evals[i];
    const after = evals[i + 1];
    const wb = winPct(before.value * sign);
    const wa = winPct(after.value * sign);
    const loss = Math.max(0, wb - wa);
    const cpl = Math.min(1000, Math.max(0, (before.value - after.value) * sign));
    let cls: MoveClass;
    const isBest = before.best === m.uci;
    if (isBest) cls = "best";
    else if (loss < 2) cls = "excellent";
    else if (loss < 5) cls = "good";
    else if (loss < 10) cls = "inaccuracy";
    else if (loss < 20) cls = "mistake";
    else cls = "blunder";

    // Brilhante: lance (quase) ótimo que sacrifica material líquido e não piora a posição
    if ((isBest || loss < 1.5) && cls !== "blunder" && cls !== "mistake" && !m.promotion) {
      const idx2 = Math.min(i + 2, fens.length - 1);
      const balBefore = materialBalance(fens[i]) * sign;
      const balAfter = materialBalance(fens[idx2]) * sign;
      const sacrifice = balBefore - balAfter >= 2;
      const stillGood = wa >= 45 && wb < 88;
      const notTrivialRecapture = !(m.captured && balBefore - materialBalance(fens[i + 1]) * sign < 1 && false);
      if (sacrifice && stillGood && notTrivialRecapture && m.piece !== "p") cls = "brilliant";
    }

    counts[color][cls]++;
    const a = isBest || cls === "brilliant" ? Math.max(moverAcc(loss), 98) : moverAcc(loss);
    accs[color].push(a);
    cpls[color].push(cpl);
    infos.push({
      cls,
      loss,
      cpl,
      accuracy: a,
      bestUci: before.best,
      bestSan: before.best ? uciToSan(fens[i], before.best) : null,
      evalBefore: before.value,
      evalAfter: after.value,
    });
  });

  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const harm = (a: number[]) => (a.length ? a.length / a.reduce((x, y) => x + 1 / Math.max(a_(y), 1), 0) : 0);
  const a_ = (x: number) => x;
  const acc = {
    w: Math.round(((avg(accs.w) + harm(accs.w)) / 2) * 10) / 10,
    b: Math.round(((avg(accs.b) + harm(accs.b)) / 2) * 10) / 10,
  };

  const moments: Moment[] = infos
    .map((inf, i) => ({
      ply: i,
      loss: inf.loss,
      swing: Math.abs(winPct(inf.evalAfter) - winPct(inf.evalBefore)),
      cls: inf.cls,
      color: moves[i].color,
    }))
    .filter((m) => m.swing >= 12 || m.cls === "brilliant")
    .sort((a, b) => b.swing - a.swing)
    .slice(0, 6)
    .sort((a, b) => a.ply - b.ply);

  const recommendations = { w: recommend("w", moves, fens, infos), b: recommend("b", moves, fens, infos) };

  return {
    evals,
    moves: infos,
    accuracy: acc,
    acpl: { w: Math.round(avg(cpls.w)), b: Math.round(avg(cpls.b)) },
    counts,
    moments,
    recommendations,
    movetime: opts.movetime,
  };
}

function recommend(color: Color, moves: MoveRec[], fens: string[], infos: MoveInfo[]): Recommendation[] {
  const out: Recommendation[] = [];
  const sign = color === "w" ? 1 : -1;
  let opening = 0;
  let middle = 0;
  let end = 0;
  let missedWins = 0;
  let throwAway = 0;
  let total = 0;
  infos.forEach((inf, i) => {
    if (moves[i].color !== color) return;
    total++;
    const bad = inf.cls === "mistake" || inf.cls === "blunder";
    if (!bad) return;
    const mat = totalMaterial(fens[i]);
    if (i < 20) opening++;
    else if (mat <= 22) end++;
    else middle++;
    if (winPct(inf.evalBefore * sign) > 70) missedWins++;
    if (winPct(inf.evalBefore * sign) > 60 && winPct(inf.evalAfter * sign) < 45) throwAway++;
  });
  if (total === 0) return out;
  if (opening >= 1)
    out.push({ title: "Abertura", text: `Você cometeu ${opening} erro(s) nos primeiros 10 lances. Estude a teoria das suas aberturas e pratique no Laboratório de Gambitos ou no Estudo de aberturas.`, action: "openings" });
  if (middle + missedWins >= 2)
    out.push({ title: "Tática no meio-jogo", text: `Foram ${middle} erro(s) no meio-jogo e ${missedWins} lance(s) ruins em posições vantajosas. Treine desafios táticos (garfos, cravadas, ataques descobertos).`, action: "puzzles" });
  if (end >= 1) out.push({ title: "Finais", text: `${end} erro(s) em posições de poucas peças. Os treinos de finais ajudam a converter vantagens e salvar empates.`, action: "endgames" });
  if (throwAway >= 1) out.push({ title: "Conversão de vantagem", text: `Você desperdiçou uma vantagem ${throwAway} vez(es). Jogue contra níveis mais fortes e foque em consolidar antes de atacar.`, action: "play" });
  if (out.length === 0) out.push({ title: "Excelente partida", text: "Poucos erros detectados. Suba um nível de dificuldade para continuar evoluindo.", action: "play" });
  return out;
}
