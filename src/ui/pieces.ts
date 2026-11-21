// Conjuntos de peças (SVG embutidos como data URI). Peças do projeto Lichess (licenças livres).
const files = import.meta.glob("../assets/pieces/*/*.svg", { eager: true, query: "?inline", import: "default" }) as Record<string, string>;

export const PIECE_SETS: Record<string, string> = {
  cburnett: "Clássico",
  merida: "Merida",
  staunty: "Staunty",
  cardinal: "Cardinal",
  companion: "Companion",
};

const map: Record<string, Record<string, string>> = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/pieces\/([^/]+)\/([wb][KQRBNP])\.svg$/);
  if (!m) continue;
  (map[m[1]] ??= {})[m[2]] = url;
}

export function pieceUrl(set: string, color: "w" | "b", type: string): string {
  const s = map[set] ?? map.cburnett;
  return s[color + type.toUpperCase()];
}
