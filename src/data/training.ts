import gen from "./generated.json";

export interface Puzzle {
  id: string;
  tema: string;
  titulo: string;
  fen: string;
  turn: "w" | "b";
  lines: string[][]; // soluções (UCI) alternando jogador/adversário
  mateN: number;
  rating: number;
  pvfull: string[];
}
export interface Endgame {
  id: string;
  nome: string;
  cat: string;
  fen: string;
  desc: string;
  turn: "w" | "b";
  objective: "win" | "draw" | "lose";
  cpW: number;
}
export const PUZZLES = gen.puzzles as unknown as Puzzle[];
export const ENDGAMES = gen.endgames as unknown as Endgame[];
export const TACTIC_THEMES = ["Garfo", "Cravada", "Espetada", "Ataque descoberto", "Sacrifício", "Mate em 1", "Mate em 2", "Mate em 3", "Combinação tática"];
export const THEME_INFO: Record<string, string> = {
  Garfo: "Um único lance ataca duas ou mais peças ao mesmo tempo. O cavalo é o mestre dos garfos.",
  Cravada: "Uma peça não pode se mover porque deixaria uma peça mais valiosa (ou o rei) exposta.",
  Espetada: "O oposto da cravada: a peça valiosa na frente é forçada a sair e a peça atrás cai.",
  "Ataque descoberto": "Ao mover uma peça, revela-se o ataque de outra peça de longo alcance — muitas vezes com xeque duplo.",
  Sacrifício: "Entregar material para obter vantagem decisiva: mate, ganho de peças maiores ou posição vencedora.",
  "Mate em 1": "Encontre o xeque-mate em um lance.",
  "Mate em 2": "Encontre a sequência que força o mate em dois lances.",
  "Mate em 3": "Calcule a sequência forçada que leva ao mate em três lances.",
  "Combinação tática": "Sequências forçadas que combinam vários temas para ganhar material ou mate.",
};

export interface StrategyEx {
  id: string;
  tema: string;
  titulo: string;
  sans?: string; // posição por sequência de lances
  fen?: string;
  pergunta: string;
  ideia: string;
}
export const STRATEGY_THEMES: Record<string, string> = {
  "Controle do centro": "Quem controla o centro (d4, e4, d5, e5) tem mais mobilidade para as peças e pode atacar em ambos os flancos. Ocupe com peões e controle com peças.",
  Desenvolvimento: "Mobilize as peças menores rapidamente, roque cedo e conecte as torres. Evite mover a mesma peça duas vezes e a dama cedo demais.",
  "Estrutura de peões": "Os peões são a alma do xadrez. Evite peões dobrados, isolados e atrasados; procure maiorias e cadeias de peões sólidas.",
  "Casas fracas": "Casas que não podem mais ser defendidas por peões (buracos) são ótimas bases para cavalos e bispos.",
  "Colunas abertas": "Torres pertencem às colunas abertas e semiabertas. Dobre as torres e invada a sétima fileira.",
  "Atividade das peças": "Peças ativas valem mais do que material estático. Reposicione peças passivas e crie ameaças constantes.",
  "Segurança do rei": "Roque cedo, mantenha os peões à frente do rei e evite abrir linhas contra o próprio rei.",
  Finais: "No final, o rei é uma peça ativa. Use a oposição, crie peões passados e centralize o rei.",
};
export const STRATEGY: StrategyEx[] = [
  { id: "s1", tema: "Controle do centro", titulo: "Reivindique o centro", sans: "e4 e5 Nf3 Nc6", pergunta: "É a vez das brancas. Qual lance disputa o centro com mais eficiência?", ideia: "d4 (ou Bb5/Bc4) disputa o centro. Abrir o centro com d4 ativa as peças." },
  { id: "s2", tema: "Controle do centro", titulo: "Pressão sobre d5", sans: "d4 d5 c4 e6 Nc3 Nf6", pergunta: "Brancas: como aumentar a pressão no centro e desenvolver ao mesmo tempo?", ideia: "Bg5 e Nf3 aumentam a pressão sobre d5 e desenvolvem as peças." },
  { id: "s3", tema: "Desenvolvimento", titulo: "Complete o desenvolvimento", sans: "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7", pergunta: "Brancas: qual a melhor forma de continuar o desenvolvimento?", ideia: "O-O é prioridade: rei seguro e torre ativa. Nc3 também é natural." },
  { id: "s4", tema: "Desenvolvimento", titulo: "Peças primeiro", sans: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6", pergunta: "Brancas: escolha o lance de desenvolvimento mais eficiente.", ideia: "Be3, Bg5 ou Be2 desenvolvem o bispo e preparam o roque." },
  { id: "s5", tema: "Estrutura de peões", titulo: "Ataque à cadeia de peões", sans: "e4 e6 d4 d5 e5 c5", pergunta: "Brancas: como lidar com o ataque da base da cadeia em d4?", ideia: "c3 reforça d4 e mantém a cadeia sólida." },
  { id: "s6", tema: "Estrutura de peões", titulo: "Evite peões dobrados", sans: "d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3", pergunta: "Pretas: a ameaça Bxc3 dobraria seus peões? Qual a melhor decisão?", ideia: "Bxc3+ força Qxc3 e evita peões dobrados nas brancas — a dama recaptura." },
  { id: "s7", tema: "Casas fracas", titulo: "O buraco em d5", sans: "e4 c5 Nc3 Nc6 Nf3 e5 Bc4 d6 d3 Nf6 O-O Be7", pergunta: "Brancas: existe uma casa forte no centro. Qual lance explora?", ideia: "Nd5 usa a casa d5, que as pretas não podem mais atacar com peões." },
  { id: "s8", tema: "Casas fracas", titulo: "Controle as casas escuras", sans: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 d5 Na6", pergunta: "Brancas: qual a ideia estratégica principal na estrutura Índia do Rei?", ideia: "Bg5, Nd2 ou Ne1 e depois c5 ou Nd2-c4: ataque na ala da dama." },
  { id: "s9", tema: "Colunas abertas", titulo: "Torre na coluna aberta", sans: "e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5", pergunta: "Brancas: escolha o lance que usa as colunas abertas ou tensão no centro.", ideia: "Qb3, a3 ou cxd5 abrem o jogo; Re1 pressiona a coluna e aberta." },
  { id: "s10", tema: "Colunas abertas", titulo: "Pressão com torres", sans: "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Qe2 b5 Bb3 Bb7 Rd1 Nbd7 Nc3 Qb6", pergunta: "Brancas: como aproveitar a coluna d?", ideia: "Dxc5/dxc5 abrem a posição; a torre em d1 domina a coluna." },
  { id: "s11", tema: "Atividade das peças", titulo: "Reposicione o cavalo passivo", sans: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7", pergunta: "Brancas: qual a manobra mais ativa?", ideia: "Nbd2 e depois Nf1–g3 recoloca o cavalo da dama em uma casa ativa." },
  { id: "s12", tema: "Atividade das peças", titulo: "Bispo ativo", sans: "d4 Nf6 Nf3 e6 Bf4 b6 e3 Bb7 Nbd2 Be7 h3 O-O Bd3 d5", pergunta: "Brancas: qual lance mantém suas peças ativas e seguras?", ideia: "c3 e O-O seguram o centro; Ne5 aproveita a casa avançada." },
  { id: "s13", tema: "Segurança do rei", titulo: "Hora de roquear", sans: "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 Nbd2 a6", pergunta: "Brancas: qual a prioridade estratégica?", ideia: "O-O deixa o rei seguro e prepara Re1 e manobras." },
  { id: "s14", tema: "Segurança do rei", titulo: "Rei no centro", sans: "e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Bc4 O-O", pergunta: "Brancas: escolha um bom lance que mantenha o rei seguro e as peças ativas.", ideia: "O-O, Be3 ou Qe2: roque e desenvolvimento antes de atacar." },
  { id: "s15", tema: "Finais", titulo: "Rei ativo", fen: "8/pp3k2/2p2p2/8/8/2P2P2/PP3K2/8 w - - 0 1", pergunta: "Brancas: como usar o rei em um final igual de peões?", ideia: "Ke3–d4: o rei centralizado domina o final." },
  { id: "s16", tema: "Finais", titulo: "Oposição", fen: "8/8/8/3k4/8/3K4/3P4/8 w - - 0 1", pergunta: "Brancas: qual o lance correto para lutar pela oposição?", ideia: "Ke3 ou Kc3 — o rei deve avançar à frente do peão com a oposição." },
];
