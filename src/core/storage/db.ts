// Salvamento local (localStorage). Nada sai do navegador.
import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "chessuniverse:v1:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    if (fallback && typeof fallback === "object" && !Array.isArray(fallback) && v && typeof v === "object") {
      return { ...(fallback as object), ...(v as object) } as T;
    }
    return v as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** useState persistente */
export function usePersisted<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => load(key, fallback));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    save(key, val);
  }, [key, val]);
  const set = useCallback((v: T | ((p: T) => T)) => setVal(v), []);
  return [val, set];
}

/* ---------- Tipos de dados salvos ---------- */

export interface SavedGame {
  id: string;
  date: number;
  mode: string;
  white: string;
  black: string;
  result: string;
  reason?: string;
  pgn: string;
  moves: number;
  level?: number;
  userColor?: "w" | "b";
  accuracy?: { w: number; b: number };
}

export interface Stats {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  byMode: Record<string, { games: number; wins: number; draws: number; losses: number }>;
  puzzleRating: number;
  puzzlesSolved: number;
  puzzlesFailed: number;
  puzzleStreak: number;
  bestStreak: number;
  labSessions: number;
  labMovesInTheory: number;
  analyses: number;
  playSeconds: number;
}

export const DEFAULT_STATS: Stats = {
  games: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  byMode: {},
  puzzleRating: 1000,
  puzzlesSolved: 0,
  puzzlesFailed: 0,
  puzzleStreak: 0,
  bestStreak: 0,
  labSessions: 0,
  labMovesInTheory: 0,
  analyses: 0,
  playSeconds: 0,
};

export interface LabProgress {
  [lineId: string]: { attempts: number; completed: number; deviations: number; last: number };
}
export interface CustomTraining {
  id: string;
  name: string;
  side: "w" | "b";
  startFen: string;
  /** lances SAN da linha-alvo a partir de startFen */
  san: string[];
  note?: string;
  created: number;
}
export interface PuzzleProgress {
  solved: string[];
  failed: string[];
}
export interface EndgameProgress {
  [id: string]: { attempts: number; success: number };
}
export interface CustomPosition {
  id: string;
  name: string;
  fen: string;
  created: number;
}

export function getStats(): Stats {
  return load("stats", DEFAULT_STATS);
}
export function updateStats(fn: (s: Stats) => Stats) {
  save("stats", fn(getStats()));
}

export function getGames(): SavedGame[] {
  return load<SavedGame[]>("games", []);
}
export function addGame(g: SavedGame) {
  const list = [g, ...getGames().filter((x) => x.id !== g.id)].slice(0, 300);
  save("games", list);
}
export function updateGame(id: string, patch: Partial<SavedGame>) {
  save(
    "games",
    getGames().map((g) => (g.id === id ? { ...g, ...patch } : g))
  );
}
export function deleteGame(id: string) {
  save(
    "games",
    getGames().filter((g) => g.id !== id)
  );
}

export function recordResult(mode: string, outcome: "win" | "draw" | "loss", seconds = 0) {
  updateStats((s) => {
    const m = s.byMode[mode] ?? { games: 0, wins: 0, draws: 0, losses: 0 };
    const nm = { ...m, games: m.games + 1 };
    const ns = { ...s, games: s.games + 1, playSeconds: s.playSeconds + seconds };
    if (outcome === "win") {
      ns.wins++;
      nm.wins++;
    } else if (outcome === "draw") {
      ns.draws++;
      nm.draws++;
    } else {
      ns.losses++;
      nm.losses++;
    }
    ns.byMode = { ...s.byMode, [mode]: nm };
    return ns;
  });
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- Backup ---------- */
export function exportAll(): string {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k) ?? "null");
  }
  return JSON.stringify({ app: "chess-universe", version: 1, data: out }, null, 2);
}
export function importAll(text: string): boolean {
  try {
    const j = JSON.parse(text);
    if (j.app !== "chess-universe" || !j.data) return false;
    for (const [k, v] of Object.entries(j.data)) save(k, v);
    return true;
  } catch {
    return false;
  }
}
export function clearAll() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}
