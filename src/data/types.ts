export interface Variant {
  nome: string;
  tipo: string; // Aceito | Recusado | Contra-gambito | Clássica | Moderna | Principal | Agressiva | Outra
  moves: string; // linha completa desde o 1º lance, SAN separado por espaço
  texto: string;
  aval?: string;
}
export interface Trap {
  nome: string;
  moves: string; // pode ser vazio (descrição apenas)
  texto: string;
}
export interface Opening {
  id: string;
  nome: string;
  eco: string;
  lado: "w" | "b"; // quem joga a abertura/gambito
  cat: "Gambito" | "Defesa" | "Linha principal" | "Sistema";
  moves: string;
  nivel: 1 | 2 | 3 | 4 | 5;
  aval: string;
  evalCp: number; // teórica, ponto de vista das brancas
  resumo: string;
  estrategia: string;
  objW: string;
  objB: string;
  armadilhas: Trap[];
  erros: string[];
  variantes: Variant[];
  transp: string[];
  stats: { w: number; d: number; b: number };
}
export const NIVEIS = ["", "Iniciante", "Intermediário", "Avançado", "Especialista", "Mestre"];
export const V = (nome: string, tipo: string, moves: string, texto: string, aval?: string): Variant => ({ nome, tipo, moves, texto, aval });
export const T = (nome: string, moves: string, texto: string): Trap => ({ nome, moves, texto });
