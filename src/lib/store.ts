import { useSyncExternalStore } from "react";

export interface Settings {
  boardTheme: string;
  customLight: string;
  customDark: string;
  pieceTheme: string;
  customWFill: string;
  customWStroke: string;
  customBFill: string;
  customBStroke: string;
  coords: boolean;
  legalMoves: boolean;
  animations: boolean;
  highlightLast: boolean;
  autoQueen: boolean;
  sfx: number;
  music: number;
  muted: boolean;
  defaultLevel: string;
  defaultStyle: string;
  thinkTime: number;
  depth: number;
  elo: number;
  analysisDepth: number;
}

export interface SavedGame {
  id: string;
  date: number;
  startFen: string;
  sans: string[];
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  reason: string;
  playerColor: "w" | "b";
  levelId: string;
  styleId: string;
  mode: string;
  accuracy?: { w: number; b: number };
}

export interface Mistake {
  id: string;
  fen: string;
  played: string; // SAN
  best: string; // SAN
  bestUci: string;
  source: string;
  date: number;
  fails: number;
  solved: number;
}

export interface SrsCard {
  ease: number;
  interval: number; // dias
  due: number; // timestamp
  reps: number;
  lapses: number;
}

export interface Goal {
  id: string;
  kind: "wins" | "games" | "puzzles" | "gambits" | "lines";
  target: number;
  base: number;
  created: number;
}

export interface CustomExercise {
  id: string;
  name: string;
  fen: string;
  toMove: "w" | "b";
  objective: "win" | "draw" | "mate" | "best";
  mateIn?: number;
  note?: string;
  created: number;
}

export interface LabSession {
  id: string;
  date: number;
  openingId: string;
  openingName: string;
  userColor: "w" | "b";
  defense: string;
  moves: string[];
  evalCp?: number;
  outOfBook: number; // ply em que saiu da teoria (0 = ficou na teoria)
}

export interface Persist {
  settings: Settings;
  stats: { games: number; wins: number; losses: number; draws: number; byLevel: Record<string, { w: number; l: number; d: number }> };
  games: SavedGame[];
  studied: Record<string, { count: number; last: number }>;
  srs: Record<string, SrsCard>;
  puzzles: { solved: Record<string, { ok: number; fail: number; last: number }>; rating: number; history: { t: number; r: number }[] };
  strategyDone: Record<string, number>;
  endgamesDone: Record<string, number>;
  mistakes: Mistake[];
  favorites: string[];
  goals: Goal[];
  exercises: CustomExercise[];
  lab: LabSession[];
}

export const DEFAULT_SETTINGS: Settings = {
  boardTheme: "esmeralda",
  customLight: "#f0d9b5",
  customDark: "#b58863",
  pieceTheme: "classico",
  customWFill: "#ffffff",
  customWStroke: "#222222",
  customBFill: "#333333",
  customBStroke: "#000000",
  coords: true,
  legalMoves: true,
  animations: true,
  highlightLast: true,
  autoQueen: false,
  sfx: 0.7,
  music: 0,
  muted: false,
  defaultLevel: "intermediario",
  defaultStyle: "equilibrado",
  thinkTime: 1200,
  depth: 0,
  elo: 0,
  analysisDepth: 12,
};

const KEY = "chess-universe-v1";

function fresh(): Persist {
  return {
    settings: { ...DEFAULT_SETTINGS },
    stats: { games: 0, wins: 0, losses: 0, draws: 0, byLevel: {} },
    games: [],
    studied: {},
    srs: {},
    puzzles: { solved: {}, rating: 1000, history: [] },
    strategyDone: {},
    endgamesDone: {},
    mistakes: [],
    favorites: [],
    goals: [],
    exercises: [],
    lab: [],
  };
}

function load(): Persist {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persist>;
      const f = fresh();
      return { ...f, ...p, settings: { ...f.settings, ...(p.settings ?? {}) }, stats: { ...f.stats, ...(p.stats ?? {}) }, puzzles: { ...f.puzzles, ...(p.puzzles ?? {}) } };
    }
  } catch {
    /* dados corrompidos: recomeça */
  }
  return fresh();
}

let data: Persist = load();
const subs = new Set<() => void>();

export function getData() {
  return data;
}
export function update(fn: (d: Persist) => Persist | void) {
  const copy = structuredClone(data);
  const res = fn(copy);
  data = res ?? copy;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
  subs.forEach((s) => s());
}
export function resetAll() {
  data = fresh();
  localStorage.removeItem(KEY);
  subs.forEach((s) => s());
}
export function importData(json: string): boolean {
  try {
    const p = JSON.parse(json) as Partial<Persist>;
    if (!p || typeof p !== "object" || !p.settings) return false;
    const f = fresh();
    data = { ...f, ...p, settings: { ...f.settings, ...p.settings } } as Persist;
    localStorage.setItem(KEY, JSON.stringify(data));
    subs.forEach((s) => s());
    return true;
  } catch {
    return false;
  }
}
export function useData(): Persist {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => data
  );
}
export const useSettings = () => useData().settings;
export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  update((d) => {
    d.settings[k] = v;
  });
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// -------- ações de domínio --------
export function recordGame(g: SavedGame) {
  update((d) => {
    d.games.unshift(g);
    d.games = d.games.slice(0, 200);
    d.stats.games++;
    const win = g.result === (g.playerColor === "w" ? "1-0" : "0-1");
    const draw = g.result === "1/2-1/2";
    const lvl = (d.stats.byLevel[g.levelId] ??= { w: 0, l: 0, d: 0 });
    if (g.result === "*") return;
    if (draw) {
      d.stats.draws++;
      lvl.d++;
    } else if (win) {
      d.stats.wins++;
      lvl.w++;
    } else {
      d.stats.losses++;
      lvl.l++;
    }
  });
}

export function markStudied(id: string) {
  update((d) => {
    const s = (d.studied[id] ??= { count: 0, last: 0 });
    s.count++;
    s.last = Date.now();
  });
}

export function toggleFavorite(id: string) {
  update((d) => {
    d.favorites = d.favorites.includes(id) ? d.favorites.filter((x) => x !== id) : [...d.favorites, id];
  });
}

export function addMistake(m: Omit<Mistake, "id" | "date" | "fails" | "solved">) {
  update((d) => {
    const key = m.fen.split(" ").slice(0, 4).join(" ");
    const ex = d.mistakes.find((x) => x.fen.split(" ").slice(0, 4).join(" ") === key);
    if (ex) {
      ex.fails++;
      return;
    }
    d.mistakes.unshift({ ...m, id: uid(), date: Date.now(), fails: 1, solved: 0 });
    d.mistakes = d.mistakes.slice(0, 300);
  });
}

export function srsReview(id: string, quality: 0 | 1 | 2 | 3) {
  update((d) => {
    const c = (d.srs[id] ??= { ease: 2.5, interval: 0, due: 0, reps: 0, lapses: 0 });
    if (quality === 0) {
      c.lapses++;
      c.reps = 0;
      c.interval = 0;
      c.ease = Math.max(1.3, c.ease - 0.2);
      c.due = Date.now() + 5 * 60 * 1000;
    } else {
      c.reps++;
      c.ease = Math.max(1.3, c.ease + (quality === 3 ? 0.15 : quality === 1 ? -0.15 : 0));
      c.interval = c.reps === 1 ? (quality === 3 ? 3 : 1) : c.reps === 2 ? (quality === 3 ? 8 : 4) : Math.round(c.interval * c.ease * (quality === 1 ? 0.8 : 1));
      c.due = Date.now() + c.interval * 86400000;
    }
  });
}

export function recordPuzzle(id: string, ok: boolean, puzzleRating: number) {
  update((d) => {
    const s = (d.puzzles.solved[id] ??= { ok: 0, fail: 0, last: 0 });
    const first = s.ok + s.fail === 0;
    if (ok) s.ok++;
    else s.fail++;
    s.last = Date.now();
    if (first) {
      const exp = 1 / (1 + Math.pow(10, (puzzleRating - d.puzzles.rating) / 400));
      d.puzzles.rating = Math.round(d.puzzles.rating + 24 * ((ok ? 1 : 0) - exp));
      d.puzzles.history.push({ t: Date.now(), r: d.puzzles.rating });
      d.puzzles.history = d.puzzles.history.slice(-100);
    }
  });
}

export function goalCurrent(d: Persist, kind: Goal["kind"]): number {
  switch (kind) {
    case "wins":
      return d.stats.wins;
    case "games":
      return d.stats.games;
    case "puzzles":
      return Object.values(d.puzzles.solved).reduce((a, s) => a + (s.ok > 0 ? 1 : 0), 0);
    case "gambits":
      return Object.keys(d.studied).length;
    case "lines":
      return Object.values(d.srs).filter((c) => c.reps >= 3).length;
  }
}
