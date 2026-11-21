import { createContext, useContext } from "react";
import type { MoveRec } from "./chess/rules";

export type Page = "home" | "play" | "lab" | "openings" | "puzzles" | "endgames" | "analysis" | "editor" | "profile" | "settings";

export interface NavParams {
  /** FEN para iniciar uma partida contra a IA */
  fen?: string;
  /** Partida para análise */
  game?: { startFen: string; moves: MoveRec[]; headers?: Record<string, string>; userColor?: "w" | "b"; id?: string };
  /** Teoria a abrir no laboratório */
  theoryId?: string;
  nodeId?: string;
  /** treino personalizado */
  customFen?: string;
  customSan?: string[];
  customSide?: "w" | "b";
}

export interface NavCtx {
  page: Page;
  params: NavParams;
  go: (page: Page, params?: NavParams) => void;
}

export const NavContext = createContext<NavCtx>({ page: "home", params: {}, go: () => undefined });
export const useNav = () => useContext(NavContext);
