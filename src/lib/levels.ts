import { Chess, type Move, type Square } from "chess.js";
import type { Engine, PVLine } from "./engine";
import { VALUES, lineCp, uciParts, findKing } from "./chessUtils";

export interface Level {
  id: string;
  nome: string;
  elo: number; // Elo aproximado
  skill: number | null; // Skill Level (0-20) usado nos níveis mais fracos
  useElo: boolean; // usa UCI_LimitStrength + UCI_Elo
  depth: number | null;
  tolerance: number; // cp: janela de candidatos aceitáveis
  noise: number; // cp: ruído gaussiano na seleção
  multipv: number;
  timeFactor: number; // fator sobre o tempo de reflexão
  desc: string;
}

export const LEVELS: Level[] = [
  { id: "iniciante", nome: "Iniciante", elo: 500, skill: 0, useElo: false, depth: 1, tolerance: 450, noise: 240, multipv: 6, timeFactor: 0.15, desc: "Comete erros frequentes e deixa peças penduradas. Ideal para aprender as regras." },
  { id: "facil", nome: "Fácil", elo: 800, skill: 2, useElo: false, depth: 2, tolerance: 320, noise: 150, multipv: 5, timeFactor: 0.2, desc: "Enxerga táticas de um lance, mas ignora ameaças mais profundas." },
  { id: "intermediario", nome: "Intermediário", elo: 1100, skill: 5, useElo: false, depth: 4, tolerance: 200, noise: 95, multipv: 5, timeFactor: 0.3, desc: "Joga com lógica e calcula 2-3 lances, mas ainda erra posições complexas." },
  { id: "avancado", nome: "Avançado", elo: 1450, skill: null, useElo: true, depth: 8, tolerance: 100, noise: 45, multipv: 4, timeFactor: 0.4, desc: "Jogador de clube. Pune erros táticos e conhece os princípios de abertura." },
  { id: "especialista", nome: "Especialista", elo: 1800, skill: null, useElo: true, depth: 10, tolerance: 65, noise: 28, multipv: 3, timeFactor: 0.55, desc: "Forte tática e posicionalmente. Difícil de surpreender com armadilhas simples." },
  { id: "mestre", nome: "Mestre", elo: 2200, skill: null, useElo: true, depth: 12, tolerance: 45, noise: 16, multipv: 3, timeFactor: 0.7, desc: "Nível de mestre: cálculo preciso e excelente técnica de finais." },
  { id: "gm", nome: "Grande Mestre", elo: 2550, skill: null, useElo: true, depth: 16, tolerance: 30, noise: 8, multipv: 3, timeFactor: 0.85, desc: "Nível de Grande Mestre: pouquíssimos erros e conversão implacável." },
  { id: "elite", nome: "Elite", elo: 2900, skill: null, useElo: true, depth: null, tolerance: 22, noise: 0, multipv: 3, timeFactor: 1, desc: "Nível super-humano, limitado apenas levemente. Quase impossível de vencer." },
  { id: "max", nome: "Stockfish Máximo", elo: 3400, skill: null, useElo: false, depth: null, tolerance: 12, noise: 0, multipv: 2, timeFactor: 1, desc: "Stockfish 19 praticamente sem limitações: força total do motor." },
];
export const getLevel = (id: string) => LEVELS.find((l) => l.id === id) ?? LEVELS[3];

export interface Style {
  id: string;
  nome: string;
  desc: string;
}
export const STYLES: Style[] = [
  { id: "equilibrado", nome: "Equilibrado", desc: "Joga o melhor lance segundo o motor, sem preferências." },
  { id: "agressivo", nome: "Agressivo", desc: "Prefere ataques ao rei, capturas, xeques e avanço de peões." },
  { id: "posicional", nome: "Posicional", desc: "Valoriza desenvolvimento, centro, estrutura e lances tranquilos." },
  { id: "defensivo", nome: "Defensivo", desc: "Busca trocas, roque cedo, recuos e posições sólidas." },
  { id: "tatico", nome: "Tático", desc: "Procura xeques, ameaças múltiplas e complicações calculáveis." },
  { id: "sacrificios", nome: "Sacrifícios", desc: "Adora oferecer material por iniciativa e ataque." },
  { id: "contra", nome: "Contra-ataque", desc: "Fica sólido e reage com ataques quando está pior." },
];
export const getStyle = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[0];

export interface AIConfig {
  levelId: string;
  styleId: string;
  movetime: number; // ms
  depth?: number; // 0 = automático
  elo?: number; // 0 = automático
}

function gauss() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface Feat {
  capture: number;
  check: boolean;
  castle: boolean;
  sac: number;
  advance: number;
  kingProx: number;
  develop: boolean;
  centerPawn: boolean;
  retreat: boolean;
  trade: boolean;
  threats: number;
  pawn: boolean;
  quiet: boolean;
}

function features(fen: string, mv: Move): Feat {
  const c = new Chess(fen);
  const us = c.turn();
  const them = us === "w" ? "b" : "w";
  const enemyK = findKing(c, them);
  const dirn = us === "w" ? 1 : -1;
  const m = c.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
  const capVal = m.captured ? VALUES[m.captured] : 0;
  const attacked = c.isAttacked(m.to, them);
  const defended = c.isAttacked(m.to, us);
  let sac = 0;
  if (attacked && m.piece !== "p") {
    const lose = VALUES[m.piece] - capVal;
    if (lose >= 2.5 && !defended) sac = lose;
    else if (lose >= 5 && defended) sac = lose - 3;
  }
  const adv = (Number(m.to[1]) - Number(m.from[1])) * dirn;
  let kingProx = 0;
  if (enemyK) {
    const d = (sq: string) => Math.max(Math.abs(sq.charCodeAt(0) - enemyK.charCodeAt(0)), Math.abs(Number(sq[1]) - Number(enemyK[1])));
    kingProx = d(m.from) - d(m.to);
  }
  // ameaças: capturas disponíveis para nós se pudéssemos jogar de novo
  let threats = 0;
  if (!c.inCheck()) {
    try {
      const parts = c.fen().split(" ");
      parts[1] = us;
      parts[3] = "-";
      const c2 = new Chess(parts.join(" "));
      for (const mm of c2.moves({ verbose: true })) if (mm.captured && VALUES[mm.captured] >= 3 && VALUES[mm.captured] > VALUES[mm.piece] - 0.5) threats++;
    } catch {
      /* posição inválida */
    }
  }
  return {
    capture: capVal,
    check: c.inCheck(),
    castle: m.flags.includes("k") || m.flags.includes("q"),
    sac,
    advance: adv,
    kingProx,
    develop: (m.piece === "n" || m.piece === "b") && Number(m.from[1]) === (us === "w" ? 1 : 8),
    centerPawn: m.piece === "p" && ["d4", "e4", "d5", "e5"].includes(m.to),
    retreat: m.piece !== "p" && adv < 0,
    trade: capVal > 0 && Math.abs(capVal - VALUES[m.piece]) < 0.6,
    threats: Math.min(threats, 3),
    pawn: m.piece === "p",
    quiet: !m.captured && !c.inCheck(),
  };
}

function styleBonus(style: string, f: Feat, bestCp: number): number {
  const b = (x: boolean, v: number) => (x ? v : 0);
  switch (style) {
    case "agressivo":
      return b(f.capture > 0, 18) + b(f.check, 28) + f.kingProx * 9 + b(f.pawn, f.advance * 6) + f.threats * 6 + b(f.sac > 0, 10) - b(f.retreat, 15);
    case "posicional":
      return b(f.develop, 24) + b(f.castle, 32) + b(f.centerPawn, 20) + b(f.quiet, 8) - f.sac * 22 - b(f.check, 5) - b(f.capture > 0 && !f.trade, 2);
    case "defensivo":
      return b(f.trade, 24) + b(f.castle, 36) + b(f.retreat, 18) - f.sac * 30 - b(f.pawn, f.advance * 5) - f.kingProx * 4 + b(f.develop, 8);
    case "tatico":
      return b(f.check, 34) + b(f.capture > 0, 22) + f.threats * 14 + b(f.sac > 0, 12) - b(f.quiet && f.threats === 0, 6);
    case "sacrificios":
      return f.sac * 38 + b(f.check, 20) + f.kingProx * 8 + f.threats * 8 - b(f.trade, 10);
    case "contra":
      if (bestCp < -40) return b(f.check, 38) + b(f.capture > 0, 26) + f.threats * 16 + f.kingProx * 6 + f.sac * 14;
      return b(f.castle, 25) + b(f.develop, 14) + b(f.trade, 8) - f.sac * 20;
    default:
      return 0;
  }
}

export interface PickInfo {
  uci: string;
  cp: number;
  candidates: { uci: string; cp: number }[];
}

export function selectMove(fen: string, lines: PVLine[], level: Level, styleId: string): PickInfo | null {
  if (!lines.length) return null;
  const chess = new Chess(fen);
  const cands = lines.filter((l) => l.pv.length).map((l) => ({ uci: l.pv[0], cp: lineCp(l) }));
  if (!cands.length) return null;
  const bestCp = Math.max(...cands.map((x) => x.cp));
  // com mate disponível (nível não-iniciante) joga o mate
  let tol = level.tolerance;
  if (styleId !== "equilibrado") tol = Math.min(tol + 55, level.id === "max" ? 30 : 140);
  if (styleId === "sacrificios") tol += 35;
  let pool = cands.filter((x) => x.cp >= bestCp - tol);
  if (bestCp >= 9000 && level.noise < 100) pool = cands.filter((x) => x.cp >= 9000);
  // não aceita lances que levem a derrota se há alternativas
  if (bestCp > -300) pool = pool.filter((x) => x.cp > -300 || level.noise > 100);
  if (!pool.length) pool = [cands[0]];
  let best: { uci: string; score: number; cp: number } | null = null;
  for (const cnd of pool) {
    let score = Math.max(-1500, Math.min(1500, cnd.cp));
    if (styleId !== "equilibrado" && Math.abs(bestCp) < 9000) {
      try {
        const mv = chess.move(uciParts(cnd.uci));
        chess.undo();
        score += styleBonus(styleId, features(fen, mv), bestCp);
      } catch {
        /* ignore */
      }
    }
    score += gauss() * level.noise;
    if (!best || score > best.score) best = { uci: cnd.uci, score, cp: cnd.cp };
  }
  return best ? { uci: best.uci, cp: best.cp, candidates: cands } : null;
}

/** Calcula o lance da IA combinando força do motor, janela de candidatos, estilo e ruído. */
export async function computeAIMove(
  engine: Engine,
  fen: string,
  cfg: AIConfig,
  clockMs?: number
): Promise<{ uci: string; cp: number; lines: PVLine[]; depth: number } | null> {
  const level = getLevel(cfg.levelId);
  let movetime = Math.max(80, cfg.movetime * level.timeFactor);
  if (cfg.levelId === "max" || cfg.levelId === "elite") movetime = cfg.movetime;
  if (clockMs !== undefined) movetime = Math.min(movetime, Math.max(60, clockMs / 25));
  const elo = cfg.elo && cfg.elo > 0 ? cfg.elo : level.elo;
  const useElo = cfg.elo && cfg.elo > 0 ? elo >= 1320 && elo < 3190 : level.useElo;
  const depth = cfg.depth && cfg.depth > 0 ? cfg.depth : level.depth ?? undefined;
  let skill = level.skill;
  if (!useElo && skill === null) skill = null;
  if (cfg.elo && cfg.elo > 0 && elo < 1320) skill = Math.max(0, Math.min(10, Math.round((elo - 400) / 90)));
  const wantPick = cfg.styleId !== "equilibrado" || level.noise > 0;
  const multipv = wantPick ? Math.max(level.multipv, cfg.styleId !== "equilibrado" ? 4 : 1) : 1;
  const res = await engine.search(fen, {
    depth,
    movetime,
    multipv: Math.min(multipv, 8),
    elo: useElo ? elo : null,
    skill: useElo ? null : skill,
  });
  if (!res || !res.best) return null;
  // Em níveis que usam UCI_Elo o motor já aplica sua própria fraqueza; mantemos o ruído mínimo
  const effLevel = useElo ? { ...level, noise: level.noise * 0.5, tolerance: level.tolerance * 0.6 } : level;
  let pick = res.lines.length ? selectMove(fen, res.lines, effLevel, cfg.styleId) : null;
  // com UCI_Elo o motor pode escolher um lance ligeiramente fraco por conta própria: respeitar
  if (useElo && cfg.styleId === "equilibrado" && res.best) pick = { uci: res.best, cp: pick?.cp ?? 0, candidates: [] };
  const uci = pick?.uci ?? res.best;
  return { uci, cp: pick?.cp ?? lineCp(res.lines[0] ?? { cp: 0 }), lines: res.lines, depth: res.depth };
}

export type { Square };
