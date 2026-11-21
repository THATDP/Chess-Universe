// Posições de finais verificadas com Stockfish (avaliação conferida em profundidade 20).
export interface Endgame {
  id: string;
  name: string;
  category: "Mates básicos" | "Finais de peões" | "Finais de torres" | "Defesas / empates";
  fen: string;
  side: "w" | "b";
  goal: "win" | "draw";
  /** limite de lances do jogador para cumprir o objetivo */
  maxMoves: number;
  level: 1 | 2 | 3;
  idea: string;
}

export const ENDGAMES: Endgame[] = [
  { id: "kq", name: "Rei e Dama contra Rei", category: "Mates básicos", fen: "8/8/8/4k3/8/8/8/3QK3 w - - 0 1", side: "w", goal: "win", maxMoves: 30, level: 1, idea: "Use a dama para limitar o rei adversário em uma caixa cada vez menor e traga seu rei. Cuidado com o afogamento!" },
  { id: "kr", name: "Rei e Torre contra Rei", category: "Mates básicos", fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1", side: "w", goal: "win", maxMoves: 45, level: 1, idea: "Empurre o rei para a borda com a técnica da 'caixa' e use a oposição para dar o mate." },
  { id: "kbb", name: "Rei e dois Bispos contra Rei", category: "Mates básicos", fen: "8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1", side: "w", goal: "win", maxMoves: 60, level: 2, idea: "Os bispos formam uma barreira diagonal; leve o rei adversário para um canto com o seu rei apoiando." },
  { id: "kbn", name: "Rei, Bispo e Cavalo contra Rei", category: "Mates básicos", fen: "8/8/8/4k3/8/8/8/2B1KN2 w - - 0 1", side: "w", goal: "win", maxMoves: 80, level: 3, idea: "O mate só ocorre no canto da cor do bispo. Empurre o rei para lá usando a técnica de Delétang." },
  { id: "kp-oposicao", name: "Peão: rei à frente do peão", category: "Finais de peões", fen: "8/8/1k6/8/8/1K6/1P6/8 w - - 0 1", side: "w", goal: "win", maxMoves: 30, level: 2, idea: "Ganhe a oposição e avance o rei na frente do peão. Casas-chave são decisivas para a promoção." },
  { id: "kp-6a", name: "Peão na 5ª, rei na 6ª", category: "Finais de peões", fen: "4k3/8/4K3/4P3/8/8/8/8 w - - 0 1", side: "w", goal: "win", maxMoves: 20, level: 1, idea: "Rei na frente do peão na 6ª fila ganha sempre — mas cuidado com o afogamento ao final." },
  { id: "kp-torre", name: "Peão g com rei ativo", category: "Finais de peões", fen: "7k/8/6K1/6P1/8/8/8/8 w - - 0 1", side: "w", goal: "win", maxMoves: 20, level: 2, idea: "Com o rei à frente do peão, avance com precisão e evite o afogamento no canto." },
  { id: "lucena", name: "Posição de Lucena", category: "Finais de torres", fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1", side: "w", goal: "win", maxMoves: 30, level: 3, idea: "Construa uma 'ponte' com a torre: Tc4! e depois Tb4 para proteger o rei dos xeques." },
  { id: "dama-peao", name: "Dama contra peão na 7ª", category: "Finais de peões", fen: "8/8/8/8/8/5k2/6p1/5K1Q w - - 0 1", side: "w", goal: "win", maxMoves: 30, level: 3, idea: "Force o rei adversário a bloquear o peão e aproxime o seu rei com xeques calculados." },
  { id: "bispo-errado", name: "Bispo de cor errada (defenda!)", category: "Defesas / empates", fen: "k7/8/8/8/8/8/P7/K1B5 b - - 0 1", side: "b", goal: "draw", maxMoves: 40, level: 3, idea: "Com bispo de cor errada e peão de torre, o rei defensor no canto garante o empate." },
  { id: "oposicao-defesa", name: "Oposição defensiva (empate)", category: "Defesas / empates", fen: "8/8/8/3k4/8/3K4/3P4/8 w - - 0 1", side: "b", goal: "draw", maxMoves: 30, level: 2, idea: "Mantenha a oposição à frente do peão. Quem tem a oposição no momento certo decide o final." },
  { id: "peoes-equilibrado", name: "Final de peões equilibrado", category: "Defesas / empates", fen: "6k1/5p2/6p1/7p/7P/6P1/5P2/6K1 w - - 0 1", side: "w", goal: "draw", maxMoves: 40, level: 2, idea: "Centralize o rei e evite criar fraquezas. Posição igual: jogue com precisão para não perder." },
];
