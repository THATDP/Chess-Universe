// Níveis de dificuldade — cada nível usa parâmetros reais do Stockfish
// (Skill Level, UCI_LimitStrength/UCI_Elo e limites de profundidade/tempo).
export interface Level {
  id: number;
  name: string;
  desc: string;
  /** Skill Level do Stockfish (0–20) */
  skill: number;
  /** Se definido, ativa UCI_LimitStrength com este Elo (1320–3190) */
  elo: number | null;
  /** Profundidade máxima de cálculo (null = sem limite) */
  depth: number | null;
  /** Tempo máximo por lance em ms (null = usa o tempo de reflexão configurado) */
  moveTime: number | null;
}

export const LEVELS: Level[] = [
  { id: 1, name: "Iniciante", desc: "Erra com frequência. Ideal para aprender.", skill: 0, elo: 1320, depth: 1, moveTime: 150 },
  { id: 2, name: "Fácil", desc: "Joga o básico, mas deixa peças soltas.", skill: 3, elo: 1450, depth: 3, moveTime: 250 },
  { id: 3, name: "Intermediário", desc: "Vê táticas simples de 2–3 lances.", skill: 7, elo: 1650, depth: 5, moveTime: 400 },
  { id: 4, name: "Avançado", desc: "Jogador de clube, cobra erros táticos.", skill: 11, elo: 1900, depth: 8, moveTime: 700 },
  { id: 5, name: "Especialista", desc: "Cálculo sólido e boa técnica posicional.", skill: 14, elo: 2200, depth: 11, moveTime: 1000 },
  { id: 6, name: "Mestre", desc: "Nível de mestre, poucas imprecisões.", skill: 17, elo: 2500, depth: 14, moveTime: 1500 },
  { id: 7, name: "Grande Mestre", desc: "Skill 19 sem limite de Elo, cálculo profundo.", skill: 19, elo: null, depth: 18, moveTime: 2500 },
  { id: 8, name: "Elite", desc: "Skill 20, profundidade até 24.", skill: 20, elo: null, depth: 24, moveTime: 4000 },
  { id: 9, name: "Força máxima", desc: "Stockfish sem restrições, usa todo o tempo de reflexão.", skill: 20, elo: null, depth: null, moveTime: null },
];

export function getLevel(id: number): Level {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[3];
}

export function levelBadge(l: Level): string {
  return l.elo ? `≈ ${l.elo} Elo` : l.id === 9 ? "Sem limites" : `Skill ${l.skill}`;
}

/** Converte avaliação em centipeões (perspectiva das brancas) para chance de vitória 0–100 das brancas */
export function winPct(cp: number): number {
  const c = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}
