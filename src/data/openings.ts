import { Chess } from "chess.js";
import { GAMBITOS_BRANCAS } from "./gambitsBrancas";
import { GAMBITOS_PRETAS } from "./gambitsPretas";
import { OUTRAS } from "./outras";
import type { Opening } from "./types";
export * from "./types";

export const OPENINGS: Opening[] = [...GAMBITOS_BRANCAS, ...GAMBITOS_PRETAS, ...OUTRAS];
export const getOpening = (id: string) => OPENINGS.find((o) => o.id === id);
export const splitLine = (m: string) => m.trim().split(/\s+/).filter(Boolean);

/** Nome da abertura reconhecida para uma sequência de SAN (maior prefixo). */
const index = new Map<string, { name: string; len: number; id: string }>();
function norm(fen: string) {
  return fen.split(" ").slice(0, 4).join(" ");
}
function build() {
  for (const o of OPENINGS) {
    const lines: [string, string][] = [[o.nome, o.moves], ...o.variantes.map((v) => [`${o.nome}: ${v.nome}`, v.moves] as [string, string])];
    for (const [name, line] of lines) {
      const c = new Chess();
      const sans = splitLine(line);
      for (let i = 0; i < sans.length; i++) {
        try {
          c.move(sans[i]);
        } catch {
          break;
        }
        const key = norm(c.fen());
        const ex = index.get(key);
        if (!ex || (name === o.nome && ex.len < i + 1)) index.set(key, { name, len: i + 1, id: o.id });
      }
    }
  }
}
build();

/** Está a posição na base de teoria? */
export function bookLookup(fen: string): { name: string; id: string } | null {
  const h = index.get(norm(fen));
  return h ? { name: h.name, id: h.id } : null;
}

/** Variantes compatíveis com o prefixo de lances jogados (para trocar de defesa). */
export function matchingVariants(o: Opening, played: string[]) {
  return o.variantes.filter((v) => {
    const l = splitLine(v.moves);
    if (l.length < played.length) return false;
    return played.every((m, i) => l[i] === m);
  });
}

export interface TreeNode {
  san: string;
  ply: number;
  children: TreeNode[];
  names: string[];
}
/** Árvore de variantes (trie) a partir de todas as linhas da abertura. */
export function buildTree(o: Opening): TreeNode {
  const root: TreeNode = { san: "", ply: 0, children: [], names: [] };
  const lines: [string, string][] = [[o.nome + " (principal)", o.moves], ...o.variantes.map((v) => [v.nome, v.moves] as [string, string])];
  for (const [name, line] of lines) {
    let node = root;
    splitLine(line).forEach((san, i) => {
      let ch = node.children.find((c) => c.san === san);
      if (!ch) {
        ch = { san, ply: i + 1, children: [], names: [] };
        node.children.push(ch);
      }
      if (!ch.names.includes(name)) ch.names.push(name);
      node = ch;
    });
  }
  return root;
}
