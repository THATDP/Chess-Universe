export type Kind = "main" | "defense" | "decline" | "trap" | "alt" | "refuted";

/** Nó "fonte": t=título, m=lances SAN a partir do nó pai, n=explicação, k=tipo, c=filhos */
export interface TNode {
  t: string;
  m: string;
  n?: string;
  k?: Kind;
  c?: TNode[];
}
export interface TheorySource {
  id: string;
  name: string;
  /** lado que "possui" a ideia: quem joga o gambito / a abertura */
  side: "w" | "b";
  eco: string;
  level: 1 | 2 | 3;
  summary: string;
  ideas: string[];
  traps?: string[];
  /** lances SAN que definem o gambito/abertura a partir da posição inicial */
  base: string;
  tree: TNode[];
}
export const n = (t: string, m: string, note?: string, c?: TNode[], k?: Kind): TNode => ({ t, m, n: note, c, k });
