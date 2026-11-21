import { PIECE_SVG } from "./pieceSvgs";

export interface BoardTheme {
  id: string;
  nome: string;
  light: string;
  dark: string;
}
export const BOARD_THEMES: BoardTheme[] = [
  { id: "esmeralda", nome: "Esmeralda", light: "#eeeed2", dark: "#6f9a52" },
  { id: "classico", nome: "Clássico", light: "#f0d9b5", dark: "#b58863" },
  { id: "oceano", nome: "Oceano", light: "#dce3ea", dark: "#6f8ea8" },
  { id: "ardosia", nome: "Ardósia", light: "#a9afb8", dark: "#4b5261" },
  { id: "mogno", nome: "Mogno", light: "#e6c79c", dark: "#8a5a35" },
  { id: "rubi", nome: "Rubi", light: "#f1dcd5", dark: "#a45353" },
  { id: "noturno", nome: "Noturno", light: "#6c7aa6", dark: "#2b3558" },
  { id: "neon", nome: "Neon", light: "#2d3561", dark: "#141a3a" },
  { id: "custom", nome: "Personalizado", light: "#f0d9b5", dark: "#b58863" },
];

export interface PieceTheme {
  id: string;
  nome: string;
  wFill: string;
  wStroke: string;
  bFill: string;
  bStroke: string;
}
export const PIECE_THEMES: PieceTheme[] = [
  { id: "classico", nome: "Clássico", wFill: "#ffffff", wStroke: "#000000", bFill: "#000000", bStroke: "#000000" },
  { id: "marfim", nome: "Marfim e Ébano", wFill: "#f7efd9", wStroke: "#3a2d1c", bFill: "#2b2622", bStroke: "#0d0b09" },
  { id: "ouro", nome: "Ouro e Bronze", wFill: "#f6d77e", wStroke: "#5e4300", bFill: "#4a3418", bStroke: "#1d1305" },
  { id: "gelo", nome: "Gelo e Aço", wFill: "#e8f5ff", wStroke: "#1c3b5c", bFill: "#27476b", bStroke: "#0a1a2e" },
  { id: "neon", nome: "Neon", wFill: "#9cf6ff", wStroke: "#02464f", bFill: "#ff62d0", bStroke: "#4a0033" },
  { id: "esmeralda", nome: "Esmeralda", wFill: "#e6fbe9", wStroke: "#0c4a22", bFill: "#146c3b", bStroke: "#05200f" },
  { id: "custom", nome: "Personalizado", wFill: "#ffffff", wStroke: "#000000", bFill: "#000000", bStroke: "#000000" },
];

const cache = new Map<string, string>();

export function pieceUrl(theme: PieceTheme, color: "w" | "b", type: string): string {
  const key = `${theme.id}|${theme.wFill}|${theme.wStroke}|${theme.bFill}|${theme.bStroke}|${color}${type.toUpperCase()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let svg = PIECE_SVG[color + type.toUpperCase()] ?? "";
  svg = svg.replace('width="45" height="45"', 'viewBox="0 0 45 45"');
  if (color === "w") svg = svg.replace(/fill="#fff"/g, `fill="${theme.wFill}"`).replace(/stroke="#000"/g, `stroke="${theme.wStroke}"`);
  else svg = svg.replace(/stroke="#000"/g, `stroke="${theme.bStroke}"`).replace(/fill="#000"/g, `fill="${theme.bFill}"`);
  const url = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  cache.set(key, url);
  return url;
}
