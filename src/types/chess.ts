export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type AIDifficultyId =
  | 'beginner'
  | 'easy'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'master'
  | 'grandmaster'
  | 'elite'
  | 'maximum';

export interface AIDifficultyConfig {
  id: AIDifficultyId;
  name: string;
  elo: number;
  skillLevel: number; // UCI Skill Level 0..20
  depth: number; // Search depth limit
  moveTimeMs: number; // Default thinking time in ms
  blunderChance: number; // Controlled sub-optimal probability at very low levels
  description: string;
  badgeColor: string;
}

export type GameModeId =
  | 'classic'
  | 'rapid'
  | 'blitz'
  | 'bullet'
  | 'untimed'
  | 'gambit-lab'
  | 'openings'
  | 'tactics'
  | 'endgames'
  | 'analysis'
  | 'editor';

export interface TimeControlConfig {
  id: string;
  mode: GameModeId;
  label: string;
  initialSeconds: number; // 0 for untimed
  incrementSeconds: number;
  description: string;
}

export type MoveClassification =
  | 'brilliant'
  | 'best'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface EngineLine {
  multipv: number;
  depth: number;
  seldepth?: number;
  scoreCp: number; // Centipawns from White's perspective
  mate: number | null; // Mate in N from White's perspective (+ for White, - for Black)
  pvUci: string[]; // UCI moves e.g. ['e2e4', 'e7e5']
  pvSan: string[]; // SAN moves e.g. ['e4', 'e5']
  nodes?: number;
  nps?: number;
}

export interface EngineTelemetry {
  isReady: boolean;
  isThinking: boolean;
  engineType: 'Stockfish WASM' | 'Stockfish JS' | 'Stockfish UCI Worker';
  depth: number;
  scoreCp: number; // White perspective
  mate: number | null; // White perspective
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  lines: EngineLine[];
  nodes: number;
  nps: number;
}

// GAMBIT LABORATORY TYPES
export interface GambitMoveNode {
  id: string;
  san: string; // e.g., "e4", "f4", "exf4"
  uci: string; // e.g., "e2e4"
  fenAfter: string;
  ply: number; // 1-based ply number
  color: PieceColor;
  moveNumber: number;
  comment: string;
  tacticalIdea?: string;
  isTrap?: boolean;
  trapWarning?: string;
  badge?: 'book' | 'brilliant' | 'trap' | 'critical' | 'defense';
  children: GambitMoveNode[];
}

export interface GambitDefenseLine {
  id: string;
  name: string;
  category: 'Aceito' | 'Recusado' | 'Contra-Gambito' | 'Linha Alternativa' | 'Armadilha';
  description: string;
  movesSan: string[]; // Complete theoretical sequence of SAN moves from initial position
  keyIdea: string;
  evaluationVerdict: string;
}

export interface GambitStartPosition {
  id: string;
  label: string;
  description: string;
  plyIndex: number; // How many plies into the main line to start training
  fen: string;
}

export interface GambitDefinition {
  id: string;
  name: string;
  subtitle: string;
  repertoireColor: PieceColor; // Whether this is primarily a White or Black gambit
  eco: string;
  category: 'Agressivo' | 'Clássico' | 'Tático' | 'Contra-Ataque' | 'Armadilha';
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Mestre';
  overview: string;
  strategicGoals: string[];
  commonTraps: string[];
  rootMovesSan: string[]; // Moves that define the gambit tabiya
  tabiyaFen: string;
  startPositions: GambitStartPosition[];
  defenses: GambitDefenseLine[];
  tree: GambitMoveNode[];
}

export interface CustomTrainingItem {
  id: string;
  title: string;
  color: PieceColor;
  initialFen: string;
  movesSan: string[];
  notes: string;
  createdAt: string;
}

// OPENING STUDY
export interface OpeningStudyItem {
  id: string;
  name: string;
  eco: string;
  color: PieceColor;
  category: 'Aberturas Abertas' | 'Semi-Abertas' | 'Fechadas' | 'Defesas Índias' | 'Sistemas Sólidos';
  movesSan: string[];
  description: string;
  keyPlansWhite: string[];
  keyPlansBlack: string[];
  criticalFen: string;
}

// TACTICAL CHALLENGES
export interface TacticalChallenge {
  id: string;
  title: string;
  theme: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil' | 'Mestre';
  elo: number;
  fen: string;
  playerColor: PieceColor;
  solutionSan: string[]; // Exact sequence of moves (player, opponent response, player, ...)
  hint: string;
  explanation: string;
}

// ENDGAME TRAINING
export interface EndgameScenario {
  id: string;
  title: string;
  category: 'Peões' | 'Torres' | 'Dama' | 'Peças Menores' | 'Mates Elementares';
  difficulty: 'Essencial' | 'Intermediário' | 'Avançado';
  fen: string;
  playerColor: PieceColor;
  goal: 'win' | 'draw';
  targetMoves?: number;
  theoryExplanation: string;
  keyTechnique: string[];
}

// MOVE HISTORY & DEEP ANALYSIS
export interface RecordedMove {
  ply: number;
  moveNumber: number;
  color: PieceColor;
  san: string;
  uci: string;
  from: string;
  to: string;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  fenBefore: string;
  fenAfter: string;
  evalCp?: number; // From White perspective after move
  mate?: number | null;
  bestMoveSan?: string;
  bestMoveUci?: string;
  bestLineSan?: string[];
  classification?: MoveClassification;
  cpLoss?: number; // Centipawn loss from mover's perspective
  comment?: string;
}

export interface DecisiveMoment {
  ply: number;
  moveNumber: number;
  color: PieceColor;
  playedSan: string;
  bestSan: string;
  fenBefore: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  classification: MoveClassification;
  explanation: string;
}

export interface GameAnalysisReport {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteEstimatedElo: number;
  blackEstimatedElo: number;
  counts: {
    w: Record<MoveClassification, number>;
    b: Record<MoveClassification, number>;
  };
  moves: RecordedMove[];
  decisiveMoments: DecisiveMoment[];
  recommendations: string[];
  summaryVerdict: string;
}

// BOARD & VISUAL THEMES
export type BoardThemeId = 'walnut' | 'emerald' | 'arctic' | 'amber' | 'amethyst';
export type PieceStyleId = 'neo-staunton' | 'imperial' | 'cyber';

export interface BoardThemeConfig {
  id: BoardThemeId;
  name: string;
  lightSquare: string;
  darkSquare: string;
  borderHex: string;
  coordLight: string;
  coordDark: string;
}

export interface AudioPreferences {
  muted: boolean;
  masterVolume: number; // 0..1
  effectsVolume: number; // 0..1
  alertsVolume: number; // 0..1
  ambientMusicEnabled: boolean;
  ambientVolume: number; // 0..1
}

export interface UserPreferences {
  boardTheme: BoardThemeId;
  pieceStyle: PieceStyleId;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  enableAnimations: boolean;
  showEvalBar: boolean;
  showBestMoveArrow: boolean;
  autoQueenPromotion: boolean;
  defaultDifficulty: AIDifficultyId;
  customThinkTimeMs: number;
  audio: AudioPreferences;
}

export interface SavedGameRecord {
  id: string;
  date: string;
  mode: GameModeId;
  modeLabel: string;
  playerColor: PieceColor;
  aiDifficulty: AIDifficultyId;
  result: '1-0' | '0-1' | '1/2-1/2' | '*';
  terminationReason: string;
  pgn: string;
  finalFen: string;
  movesCount: number;
  whiteAccuracy?: number;
  blackAccuracy?: number;
}

export interface UserStatistics {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  tacticsSolved: string[];
  tacticsStreak: number;
  tacticsRating: number;
  endgamesCompleted: string[];
  favoriteGambits: string[];
  studiedGambitLines: string[];
}

export interface ArrowAnnotation {
  from: string;
  to: string;
  color: string;
  label?: string;
}
