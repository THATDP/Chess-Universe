// Estrutura e compilador da árvore de teoria (gambitos e aberturas).
import { Chess } from "chess.js";
import { START_FEN, posKey } from "../core/chess/rules";
import { WHITE_GAMBITS } from "./gambitsWhite";
import { BLACK_GAMBITS } from "./gambitsBlack";
import { OPENINGS } from "./openings";
import type { Kind, TNode, TheorySource } from "./theoryTypes";

export * from "./theoryTypes";

export interface CNode {
  id: string;
  theoryId: string;
  title: string;
  kind: Kind;
  note?: string;
  moves: string[];
  line: string[];
  ply: number;
  fen: string;
  parent: string | null;
  children: string[];
  depth: number;
}
export interface Theory extends TheorySource {
  kind: "gambit" | "opening";
  rootId: string;
}

/** Títulos usam letras portuguesas (C,T,D,R); converte para SAN internacional para ficar consistente com o resto do app */
const PT2EN: Record<string, string> = { C: "N", T: "R", D: "Q", R: "K" };
export function fixNotation(s: string): string {
  return s.replace(/(^|[^A-Za-zÀ-ÿ])([CTDR])([a-h]?[1-8]?x?[a-h][1-8])/g, (_m, a, b, c) => a + PT2EN[b] + c);
}

let cache: { theories: Theory[]; nodes: Map<string, CNode>; names: Map<string, { name: string; nodeId: string }> } | null = null;
const errors: string[] = [];

function compile() {
  const theories: Theory[] = [];
  const nodes = new Map<string, CNode>();
  const names = new Map<string, { name: string; nodeId: string }>();

  const add = (src: TheorySource, kind: "gambit" | "opening") => {
    const rootId = src.id;
    const play = (fen: string, line: string[], sans: string[], label: string): string => {
      const c = new Chess(fen);
      for (const s of sans) {
        try {
          c.move(s);
        } catch {
          errors.push(`${label}: lance ilegal "${s}" em [${line.join(" ")}]`);
          break;
        }
      }
      return c.fen();
    };
    const baseSan = src.base.split(/\s+/).filter(Boolean);
    const root: CNode = {
      id: rootId,
      theoryId: src.id,
      title: src.name,
      kind: "main",
      note: fixNotation(src.summary),
      moves: baseSan,
      line: baseSan,
      ply: baseSan.length,
      fen: play(START_FEN, [], baseSan, src.name),
      parent: null,
      children: [],
      depth: 0,
    };
    nodes.set(rootId, root);
    names.set(posKey(root.fen), { name: src.name, nodeId: rootId });

    const walk = (list: TNode[], parent: CNode) => {
      list.forEach((t, i) => {
        const id = `${parent.id}.${i}`;
        const sans = t.m.split(/\s+/).filter(Boolean);
        const line = [...parent.line, ...sans];
        const fen = play(parent.fen, parent.line, sans, `${src.name} › ${t.t}`);
        const node: CNode = {
          id,
          theoryId: src.id,
          title: fixNotation(t.t),
          kind: t.k ?? "alt",
          note: t.n ? fixNotation(t.n) : undefined,
          moves: sans,
          line,
          ply: line.length,
          fen,
          parent: parent.id,
          children: [],
          depth: parent.depth + 1,
        };
        nodes.set(id, node);
        parent.children.push(id);
        const key = posKey(fen);
        if (!names.has(key)) names.set(key, { name: `${src.name} — ${fixNotation(t.t)}`, nodeId: id });
        if (t.c) walk(t.c, node);
      });
    };
    walk(src.tree, root);
    theories.push({ ...src, kind, rootId });
  };

  WHITE_GAMBITS.forEach((g) => add(g, "gambit"));
  BLACK_GAMBITS.forEach((g) => add(g, "gambit"));
  OPENINGS.forEach((o) => add(o, "opening"));
  return { theories, nodes, names };
}

function data() {
  cache ??= compile();
  return cache;
}

export const getTheories = (kind?: "gambit" | "opening") => data().theories.filter((t) => !kind || t.kind === kind);
export const getTheory = (id: string) => data().theories.find((t) => t.id === id);
export const getNode = (id: string) => data().nodes.get(id);
export const compileErrors = () => {
  data();
  return errors;
};

/** Caminho da raiz até o nó */
export function pathTo(id: string): CNode[] {
  const out: CNode[] = [];
  let cur = getNode(id);
  while (cur) {
    out.unshift(cur);
    cur = cur.parent ? getNode(cur.parent) : undefined;
  }
  return out;
}

/** Continua pela "linha principal" (primeiro filho) a partir de um nó */
export function mainContinuation(id: string): string[] {
  const out: string[] = [];
  let cur = getNode(id);
  while (cur && cur.children.length) {
    cur = getNode(cur.children[0])!;
    out.push(...cur.moves);
  }
  return out;
}

export function countNodes(theoryId: string): number {
  let c = 0;
  data().nodes.forEach((n) => n.theoryId === theoryId && c++);
  return c - 1;
}

/** Identifica a abertura/variante da posição mais avançada reconhecida nas FENs de uma partida */
export function identifyOpening(fens: string[]): { name: string; nodeId: string } | null {
  const names = data().names;
  for (let i = Math.min(fens.length - 1, 40); i >= 0; i--) {
    const hit = names.get(posKey(fens[i]));
    if (hit) return hit;
  }
  return null;
}

/** Quais nós seguem a posição atual (usado para "teoria disponível") */
export function nodesAtFen(fen: string): CNode[] {
  const k = posKey(fen);
  const out: CNode[] = [];
  data().nodes.forEach((nd) => {
    if (posKey(nd.fen) === k) out.push(nd);
  });
  return out;
}
