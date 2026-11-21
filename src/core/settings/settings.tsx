import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { load, save } from "../storage/db";
import { audio } from "../audio/audio";

export interface Settings {
  boardTheme: string;
  pieceSet: string;
  uiTheme: string;
  accent: string;
  showLegal: boolean;
  showCoords: boolean;
  highlightLast: boolean;
  autoQueen: boolean;
  animationMs: number;
  volMaster: number;
  volSfx: number;
  volUi: number;
  volMusic: number;
  muted: boolean;
  musicOn: boolean;
  thinkMs: number;
  analysisMs: number;
  defaultLevel: number;
  playerName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  boardTheme: "esmeralda",
  pieceSet: "cburnett",
  uiTheme: "obsidiana",
  accent: "ambar",
  showLegal: true,
  showCoords: true,
  highlightLast: true,
  autoQueen: false,
  animationMs: 180,
  volMaster: 0.8,
  volSfx: 0.9,
  volUi: 0.5,
  volMusic: 0.35,
  muted: false,
  musicOn: false,
  thinkMs: 1500,
  analysisMs: 300,
  defaultLevel: 4,
  playerName: "Você",
};

export const BOARD_THEMES: Record<string, { name: string; light: string; dark: string }> = {
  esmeralda: { name: "Esmeralda", light: "#e6ecd2", dark: "#6f9a5d" },
  madeira: { name: "Madeira clássica", light: "#f0d9b5", dark: "#b58863" },
  gelo: { name: "Azul gelo", light: "#dee7f0", dark: "#7b97b8" },
  ardosia: { name: "Ardósia", light: "#c9ccd1", dark: "#5f6672" },
  ametista: { name: "Ametista", light: "#e7dcf2", dark: "#8a6bb5" },
  areia: { name: "Areia & terracota", light: "#f3e3c8", dark: "#c47f5a" },
  noturno: { name: "Noturno", light: "#8d93a6", dark: "#3f4560" },
};

export const UI_THEMES: Record<string, { name: string; bg: string; panel: string; panel2: string; line: string; ink: string; mute: string }> = {
  obsidiana: { name: "Obsidiana", bg: "#0b0d12", panel: "#12151c", panel2: "#1a1e28", line: "#262b38", ink: "#e8eaf0", mute: "#8a92a6" },
  grafite: { name: "Grafite", bg: "#141414", panel: "#1c1c1e", panel2: "#262629", line: "#34343a", ink: "#ececee", mute: "#9a9aa3" },
  meianoite: { name: "Meia-noite", bg: "#080c1a", panel: "#0e1428", panel2: "#161e38", line: "#232d52", ink: "#e6ebff", mute: "#8591bd" },
  floresta: { name: "Floresta", bg: "#0a100d", panel: "#101a15", panel2: "#17241d", line: "#233629", ink: "#e5f0e9", mute: "#86a091" },
};

export const ACCENTS: Record<string, { name: string; color: string; ink: string }> = {
  ambar: { name: "Âmbar", color: "#f5b942", ink: "#1a1200" },
  esmeralda: { name: "Esmeralda", color: "#34d399", ink: "#00180e" },
  ciano: { name: "Ciano", color: "#38bdf8", ink: "#001520" },
  violeta: { name: "Violeta", color: "#a78bfa", ink: "#10002a" },
  rosa: { name: "Rosa", color: "#fb7185", ink: "#2a0008" },
};

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}
const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => load("settings", DEFAULT_SETTINGS));

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  useEffect(() => {
    save("settings", settings);
    const r = document.documentElement.style;
    const bt = BOARD_THEMES[settings.boardTheme] ?? BOARD_THEMES.esmeralda;
    const ut = UI_THEMES[settings.uiTheme] ?? UI_THEMES.obsidiana;
    const ac = ACCENTS[settings.accent] ?? ACCENTS.ambar;
    r.setProperty("--board-light", bt.light);
    r.setProperty("--board-dark", bt.dark);
    r.setProperty("--bg", ut.bg);
    r.setProperty("--panel", ut.panel);
    r.setProperty("--panel2", ut.panel2);
    r.setProperty("--line", ut.line);
    r.setProperty("--ink", ut.ink);
    r.setProperty("--mute", ut.mute);
    r.setProperty("--accent", ac.color);
    r.setProperty("--accent-ink", ac.ink);
    r.setProperty("--anim", settings.animationMs + "ms");
    audio.configure({
      master: settings.volMaster,
      sfx: settings.volSfx,
      ui: settings.volUi,
      music: settings.volMusic,
      muted: settings.muted,
    });
    audio.setMusic(settings.musicOn && !settings.muted);
  }, [settings]);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsContext);
  if (!c) throw new Error("SettingsProvider ausente");
  return c;
}
