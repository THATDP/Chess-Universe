import {
  CustomTrainingItem,
  SavedGameRecord,
  UserPreferences,
  UserStatistics,
} from '../types/chess';

const KEYS = {
  PREFS: 'chess_universe_prefs_v1',
  HISTORY: 'chess_universe_history_v1',
  STATS: 'chess_universe_stats_v1',
  CUSTOM_TRAININGS: 'chess_universe_custom_trainings_v1',
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  boardTheme: 'walnut',
  pieceStyle: 'neo-staunton',
  showCoordinates: true,
  showLegalMoves: true,
  enableAnimations: true,
  showEvalBar: true,
  showBestMoveArrow: true,
  autoQueenPromotion: false,
  defaultDifficulty: 'intermediate',
  customThinkTimeMs: 900,
  audio: {
    muted: false,
    masterVolume: 0.85,
    effectsVolume: 0.9,
    alertsVolume: 0.85,
    ambientMusicEnabled: false,
    ambientVolume: 0.25,
  },
};

export const DEFAULT_STATISTICS: UserStatistics = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  tacticsSolved: [],
  tacticsStreak: 0,
  tacticsRating: 1250,
  endgamesCompleted: [],
  favoriteGambits: ['kings-gambit', 'stafford-gambit'],
  studiedGambitLines: [],
};

export const DEFAULT_CUSTOM_TRAININGS: CustomTrainingItem[] = [
  {
    id: 'custom-rousseau',
    title: 'Gambito Rousseau (1.e4 e5 2.Nf3 Nc6 3.Bc4 f5)',
    color: 'b',
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'f5', 'd4', 'fxe4', 'Nxe5', 'd5'],
    notes: 'Contra-gambito agressivo contra a Abertura Italiana espelhando o Gambito do Rei.',
    createdAt: '2025-02-15',
  },
];

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(KEYS.PREFS);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      audio: {
        ...DEFAULT_PREFERENCES.audio,
        ...(parsed.audio || {}),
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(KEYS.PREFS, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStatistics(): UserStatistics {
  try {
    const raw = localStorage.getItem(KEYS.STATS);
    if (!raw) return DEFAULT_STATISTICS;
    return {
      ...DEFAULT_STATISTICS,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_STATISTICS;
  }
}

export function saveStatistics(stats: UserStatistics): void {
  try {
    localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  } catch {
    // Ignore
  }
}

export function loadGameHistory(): SavedGameRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveGameToHistory(record: SavedGameRecord): SavedGameRecord[] {
  const current = loadGameHistory();
  const updated = [record, ...current.filter((g) => g.id !== record.id)].slice(0, 50);
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

export function clearGameHistory(): void {
  try {
    localStorage.removeItem(KEYS.HISTORY);
  } catch {
    // Ignore
  }
}

export function loadCustomTrainings(): CustomTrainingItem[] {
  try {
    const raw = localStorage.getItem(KEYS.CUSTOM_TRAININGS);
    if (!raw) return DEFAULT_CUSTOM_TRAININGS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CUSTOM_TRAININGS;
  }
}

export function saveCustomTrainings(items: CustomTrainingItem[]): void {
  try {
    localStorage.setItem(KEYS.CUSTOM_TRAININGS, JSON.stringify(items));
  } catch {
    // Ignore
  }
}
