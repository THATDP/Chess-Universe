import { n } from "./theoryTypes";
import type { TheorySource } from "./theoryTypes";

// Nos títulos usa-se notação em português (C, T, D, R); os lances ("m") ficam em SAN internacional.
export const BLACK_GAMBITS: TheorySource[] = [
  {
    id: "marshall",
    name: "Ataque Marshall",
    side: "b",
    eco: "C89",
    level: 3,
    summary: "O gambito mais famoso da Ruy López: as pretas sacrificam o peão e5 e depois o peão d5 em troca de um ataque devastador ao rei branco.",
    ideas: ["Jogar ...d5 no momento exato para abrir o centro.", "Dama em h4 e bispo em d6 apontando para o rei.", "Compensação duradoura que supera a defesa branca em muitas linhas."],
    traps: ["Se as brancas escolherem g3 com descuido, Dh3 e Bg4 criam ameaças enormes."],
    base: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O",
    tree: [
      n("9.c3 d5 — Ataque Marshall", "c3 d5", "O lance-chave: as pretas oferecem o peão e5 em troca de iniciativa.", [
        n("10.exd5 Cxd5 11.Cxe5 Cxe5 12.Txe5 c6", "exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6", "As pretas têm peças ativas e ameaças contra o rei.", [
          n("13.d3 Bd6 14.Te1 Dh4 15.g3 Dh3 16.Te4", "d3 Bd6 Re1 Qh4 g3 Qh3 Re4", "Linha teórica principal. As brancas defendem com Te4 para evitar mate em h2.", undefined, "main"),
        ], "main"),
        n("10.exd5 Cxd5 11.Cxe5 Cxe5 12.Txe5 Cf6", "exd5 Nxd5 Nxe5 Nxe5 Rxe5 Nf6", "Variante alternativa mais sólida.", undefined, "alt"),
      ], "main"),
      n("Anti-Marshall 9.a4", "a4 b4 d3 d6 a5 Be6 Nbd2 Qd7", "As brancas evitam ...d5 jogando a4.", undefined, "refuted"),
      n("Anti-Marshall 9.h3", "h3 Bb7 d3 d6 c3 Na5 Bc2 c5 d4 Qc7", "Mais flexível: a Ruy López fechada com h3.", undefined, "alt"),
    ],
  },
  {
    id: "budapeste",
    name: "Gambito Budapeste",
    side: "b",
    eco: "A51–A52",
    level: 2,
    summary: "As pretas sacrificam um peão com 2...e5 para desenvolver rápido e jogar ativamente contra o centro do rei da dama.",
    ideas: ["Recuperar o peão com ...Cg4xe5.", "Usar o bispo f8 e a dama para pressionar.", "Armadilhas no Adler e Rubinstein."],
    traps: ["Se as brancas não conhecem a teoria, Cxe5 e Bb4+ criam grandes ameaças."],
    base: "d4 Nf6 c4 e5",
    tree: [
      n("Aceito 3.dxe5", "dxe5", "As brancas tomam o peão; as pretas escolhem entre Cg4 e Ce4.", [
        n("3...Cg4 — Budapeste principal", "Ng4", "O cavalo ataca e5 e prepara ...Bb4+.", [
          n("4.Bf4 Cc6 5.Cf3 Bb4+ 6.Cbd2 De7 7.e3 Cgxe5 8.Cxe5 Cxe5 9.Be2", "Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3 Ngxe5 Nxe5 Nxe5 Be2", "Variante Rubinstein: as pretas recuperam o peão com posição equilibrada e peças ativas.", undefined, "main"),
          n("Armadilha Adler: 7.a3? Cgxe5 8.axb4?? Cd3#", "Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 axb4 Nd3#", "O mate clássico do Budapeste: o cavalo em d3 dá mate com o rei preso por Cbd2 e Bf4.", undefined, "trap"),
                    n("4.e3 Cxe5 5.Cc3 Bb4", "e3 Nxe5 Nc3 Bb4", "As brancas tentam evitar a pressão do Bf4.", undefined, "alt"),
        ], "main"),
        n("3...Ce4 — Fajarowicz", "Ne4", "Mais ousado: as pretas colocam o cavalo em e4 desafiando a ordem de peões.", [
          n("4.Cf3 d6 5.exd6 Bxd6 6.Cc3 Cxc3 7.bxc3 O-O", "Nf3 d6 exd6 Bxd6 Nc3 Nxc3 bxc3 O-O", "As pretas têm bom desenvolvimento e estrutura branca danificada.", undefined, "main"),
        ], "alt"),
      ], "main"),
      n("Recusa 3.Cf3 e4", "Nf3 e4 Nfd2 Nc6", "As brancas não aceitam o gambito e o peão e4 vira alvo.", undefined, "decline"),
    ],
  },
  {
    id: "albin",
    name: "Contra-gambito Albin",
    side: "b",
    eco: "D08–D09",
    level: 2,
    summary: "Sacrifício de peão no Gambito da Dama com ...e5 que cria um peão d4 forte e cheio de ameaças táticas.",
    ideas: ["Peão d4 espaçoso que limita as peças brancas.", "Cavalo em e5 e bispo em g4.", "Armadilha de Lasker com subpromoção."],
    traps: ["Armadilha de Lasker: 4.e3?? Bb4+ 5.Bd2 dxe3! 6.Bxb4 exf2+ 7.Re2 fxg1=N+!"],
    base: "d4 d5 c4 e5",
    tree: [
      n("3.dxe5 d4", "dxe5 d4", "O avanço d4 define o Albin.", [
        n("4.Cf3 Cc6 5.g3 Be6 6.Cbd2 Dd7", "Nf3 Nc6 g3 Be6 Nbd2 Qd7", "Variante principal: peões brancos sólidos e as pretas jogam com pressão.", undefined, "main"),
        n("4.e3? Armadilha de Lasker", "e3 Bb4+ Bd2 dxe3 Bxb4 exf2+ Ke2 fxg1=N+", "A subpromoção a cavalo dá xeque e ganha material.", undefined, "trap"),
        n("4.a3 Ne7 5.b4 Nbc6", "a3 Ne7 b4 Nbc6", "As brancas jogam no flanco, evitando a pressão central.", undefined, "alt"),
      ], "main"),
    ],
  },
  {
    id: "benko",
    name: "Gambito Benko",
    side: "b",
    eco: "A57–A59",
    level: 2,
    summary: "Sacrifício de peão no flanco da dama para ganhar colunas abertas (a e b) e pressão posicional duradoura sem compensação material imediata.",
    ideas: ["Torres nas colunas a e b.", "Bispo fianquetado em g7.", "Pressão sobre a2 e b2 durante todo o meio-jogo."],
    base: "d4 Nf6 c4 c5 d5 b5",
    tree: [
      n("4.cxb5 a6 — Aceito", "cxb5 a6", "As pretas oferecem o peão para abrir colunas.", [
        n("5.bxa6 Bxa6 6.Cc3 d6 7.e4 Bxf1 8.Rxf1 g6 9.g3 Bg7 10.Rg2 O-O 11.Cf3", "bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2 O-O Nf3", "Linha principal; as pretas têm iniciativa a longo prazo.", undefined, "main"),
        n("5.e3 axb5 6.Bxb5 Bb7 7.Cc3 g6 8.Cge2 Bg7", "e3 axb5 Bxb5 Bb7 Nc3 g6 Nge2 Bg7", "As brancas devolvem o peão e dão jogo posicional.", undefined, "alt"),
      ], "main"),
      n("4.Cf3 g6 5.Cc3 bxc4", "Nf3 g6 Nc3 bxc4", "As brancas ignoram o gambito, mas as pretas ganham peão.", undefined, "decline"),
    ],
  },
  {
    id: "letao",
    name: "Gambito Letão",
    side: "b",
    eco: "C40",
    level: 3,
    summary: "Defesa muito agressiva: 2...f5 ataca imediatamente o peão e4, em troca de enfraquecer o rei preto. Cheia de armadilhas.",
    ideas: ["Atacar rapidamente com ...f5.", "Dama preta em f6 ou g6.", "Explorar erros brancos com tática."],
    traps: ["Se as pretas jogam ...De7?, Dh5+ g6 Cxg6 vence material."],
    base: "e4 e5 Nf3 f5",
    tree: [
      n("3.Cxe5 Df6", "Nxe5 Qf6", "A dama ataca o cavalo e5 e f2.", [
        n("4.d4 d6 5.Cc4 fxe4 6.Cc3 Dg6 7.Ce3 c6", "d4 d6 Nc4 fxe4 Nc3 Qg6 Ne3 c6", "Gambito Letão principal: as pretas fecham o centro e desenvolvem. O motor prefere as brancas, mas a linha é rica em armadilhas.", undefined, "main"),
      ], "main"),
      n("3.Cxe5 De7?? — Armadilha", "Nxe5 Qe7 Qh5+ g6 Nxg6 Nf6 Nxe7", "Se as pretas jogam a dama para e7, Dh5+ ganha material.", undefined, "trap"),
    ],
  },
  {
    id: "englund",
    name: "Gambito Englund",
    side: "b",
    eco: "A40",
    level: 3,
    summary: "Resposta provocativa a 1.d4: sacrificar o peão e5 para obter jogo aberto. Arriscada, mas rica em armadilhas.",
    ideas: ["Provocar erros em linhas de armadilha.", "Dama preta em e7 e b4.", "Pressão contra b2."],
    traps: ["Dama preta em Qb4+ e Qxb2 ganha material se as brancas jogarem desatentas."],
    base: "d4 e5",
    tree: [
      n("2.dxe5 Cc6", "dxe5 Nc6", "As pretas ganham tempo atacando o peão.", [
        n("3.Cf3 De7 4.Bf4 Db4+ 5.Bd2 Dxb2 6.Bc3 Bb4 7.Dd2", "Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4 Qd2", "Armadilha: se 7.Dd2? Bxc3 e as pretas ficam em vantagem.", undefined, "trap"),
        n("3.Cf3 De7 4.Dd5 f6 5.exf6 Cxf6", "Nf3 Qe7 Qd5 f6 exf6 Nxf6", "As pretas têm desenvolvimento por um peão.", undefined, "alt"),
      ], "main"),
    ],
  },
  {
    id: "elefante",
    name: "Gambito do Elefante",
    side: "b",
    eco: "C40",
    level: 2,
    summary: "Contra-ataque central na Defesa dos Dois Cavalos: 2...d5 desafia imediatamente o peão e4. Arriscada, mas objetiva.",
    ideas: ["Contra-ataque central imediato.", "Tomar iniciativa no centro.", "Evitar a postura passiva."],
    base: "e4 e5 Nf3 d5",
    tree: [
      n("3.exd5 e4", "exd5 e4", "As pretas impedem o desenvolvimento do Cf3.", [n("4.De2 Cf6 5.Cc3 Cxd5", "Qe2 Nf6 Nc3 Nxd5", "As pretas têm jogo ativo; o motor dá leve vantagem às brancas, então exige precisão.", undefined, "main")], "main"),
      n("3.Cxe5 Bd6 4.d4 dxe4", "Nxe5 Bd6 d4 dxe4", "Variante com o peão extra para as brancas.", undefined, "alt"),
    ],
  },
  {
    id: "stafford",
    name: "Gambito Stafford",
    side: "b",
    eco: "C42",
    level: 2,
    summary: "Gambito moderno e muito popular em partidas rápidas: as pretas entregam o peão e5 e jogam com desenvolvimento rápido e armadilhas.",
    ideas: ["Peças ativas (Bc5, Cg4, Qh4).", "Armadilhas sedutoras.", "Pressão contra f2."],
    base: "e4 e5 Nf3 Nf6 Nxe5 Nc6",
    tree: [
      n("4.Cxc6 dxc6", "Nxc6 dxc6", "As brancas capturam e as pretas abrem a diagonal da dama.", [
        n("5.d3 Bc5 6.Be3 Bxe3 7.fxe3 Cg4 8.Dd2", "d3 Bc5 Be3 Bxe3 fxe3 Ng4 Qd2", "As pretas têm jogo ativo por um peão.", undefined, "main"),
      ], "main"),
      n("4.Cc3 Cxe5 5.d4 Cg6", "Nc3 Nxe5 d4 Ng6", "As brancas desenvolvem e as pretas devolvem o peão em troca de tempo.", undefined, "alt"),
    ],
  },
  {
    id: "blumenfeld",
    name: "Gambito Blumenfeld",
    side: "b",
    eco: "E10",
    level: 3,
    summary: "Combina ideias de Benko e Defesa Índia da Dama: as pretas jogam ...b5 para desbalancear a posição e abrir linhas contra o centro branco.",
    ideas: ["Sacrificar o peão b para abrir a coluna.", "Dominar o centro com ...d5.", "Pressão no flanco da dama."],
    base: "d4 Nf6 c4 e6 Nf3 c5 d5 b5",
    tree: [
      n("6.Bg5 exd5 7.cxd5 h6 8.Bxf6 Dxf6 9.Cc3 a6 10.e4 Bb7", "Bg5 exd5 cxd5 h6 Bxf6 Qxf6 Nc3 a6 e4 Bb7", "Linha principal: o centro preto é flexível. O motor dá leve vantagem às brancas.", undefined, "main"),
      n("6.dxe6 fxe6 7.Cc3 d5 8.e3 Cc6", "dxe6 fxe6 Nc3 d5 e3 Nc6", "As pretas ganham o centro com o peão d5.", undefined, "alt"),
    ],
  },
  {
    id: "falkbeer",
    name: "Contra-gambito Falkbeer",
    side: "b",
    eco: "C31–C32",
    level: 2,
    summary: "A resposta mais ativa ao Gambito do Rei: 2...d5! As pretas sacrificam o peão para tomar o centro e impedir que as brancas desenvolvam em paz.",
    ideas: ["Peão e4 avançado cria cunha no campo branco.", "Peças pretas muito ativas em e4 e c5.", "Evitar a passividade da defesa aceita."],
    base: "e4 e5 f4 d5",
    tree: [
      n("3.exd5 e4", "exd5 e4", "A cunha em e4 impede Cf3 e prepara ...Cf6 e ...Bc5.", [
        n("4.d3 Cf6 5.dxe4 Cxe4 6.Cf3 Bc5", "d3 Nf6 dxe4 Nxe4 Nf3 Bc5", "Linha principal do Falkbeer: iniciativa preta.", [n("7.De2 Bf5 8.Cc3 De7", "Qe2 Bf5 Nc3 Qe7", "As pretas têm pressão por desenvolvimento.", undefined, "main")], "main"),
        n("4.Cc3 Cf6 5.De2 De7", "Nc3 Nf6 Qe2 Qe7", "Variante Nimzowitsch, jogo equilibrado.", undefined, "alt"),
      ], "main"),
      n("3.Cc3 dxe4 4.fxe5 Dh4+", "Nc3 dxe4 fxe5 Qh4+", "As brancas respondem com o desenvolvimento do cavalo.", undefined, "alt"),
    ],
  },
  {
    id: "islandes",
    name: "Gambito Islandês",
    side: "b",
    eco: "B01",
    level: 3,
    summary: "Linha rara contra a Escandinava: as pretas sacrificam o peão para ganhar desenvolvimento rápido e iniciativa no centro.",
    ideas: ["Desenvolver rápido peças menores.", "Jogar ...e6 para abrir o bispo e pressionar.", "Atacar o centro branco."],
    base: "e4 d5 exd5 Nf6 c4 e6",
    tree: [
      n("4.dxe6 Bxe6 5.Cf3 Cc6 6.d4 Bb4+", "dxe6 Bxe6 Nf3 Nc6 d4 Bb4+", "As pretas recuperam o peão e ficam com atividade.", undefined, "main"),
      n("4.d3 exd5 5.cxd5 Bd6", "d3 exd5 cxd5 Bd6", "As brancas jogam solidamente.", undefined, "decline"),
    ],
  },
];
