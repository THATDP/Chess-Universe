import { n } from "./theoryTypes";
import type { TheorySource } from "./theoryTypes";

export const WHITE_GAMBITS: TheorySource[] = [
  {
    id: "rei",
    name: "Gambito do Rei",
    side: "w",
    eco: "C30–C39",
    level: 2,
    summary: "O gambito mais romântico do xadrez: as brancas sacrificam o peão f para abrir a coluna f e dominar o centro com ataque rápido ao rei.",
    ideas: ["Abrir a coluna f e atacar f7.", "Construir um centro com d4 e e5 após capturar em f4.", "Desenvolver rápido peças menores e rocar curto.", "Pretas devem devolver o peão no momento certo ou contra-atacar no centro."],
    traps: ["Muzio: o sacrifício de cavalo em g4 gera ataque devastador se as pretas errarem.", "Allgaier: sacrifício de cavalo em f7 com fortes ameaças."],
    base: "e4 e5 f4",
    tree: [
      n("Aceito (2...exf4)", "exf4", "As pretas aceitam o peão. As brancas seguem com 3.Cf3 para impedir ...Dh4+ e preparar d4.", [
        n("3.Cf3 — Defesa Clássica 3...g5", "Nf3 g5", "As pretas tentam defender o peão extra com ...g5. As brancas escolhem entre 4.h4, 4.Bc4 (Muzio) e outros.", [
          n("Kieseritzky 4.h4 g4 5.Ce5", "h4 g4 Ne5", "O cavalo ocupa e5 atacando g4 e f7. Linha teórica aguda.", [
            n("Defesa Berlim 5...Cf6", "Nf6", "As pretas desenvolvem atacando e4.", [
              n("6.Bc4 d5 7.exd5 Bd6", "Bc4 d5 exd5 Bd6", "Posição muito aguda com compensação para ambos.", undefined, "main"),
            ], "defense"),
            n("Defesa Clássica 5...d6", "d6", "Expulsa o cavalo e5 e ganha tempo.", [
              n("6.Cxg4 Cf6 7.Cxf6+ Dxf6", "Nxg4 Nf6 Nxf6+ Qxf6", "As brancas ficam com o peão de gambito recuperado, mas as pretas têm o par de bispos e boa atividade.", [n("8.Cc3 Cc6", "Nc3 Nc6", "Desenvolvimento natural.", undefined, "main")]),
            ], "defense"),
          ], "main"),
          n("Allgaier 4.h4 g4 5.Cg5", "h4 g4 Ng5", "Sacrifício de peça por ataque ao rei. Muito arriscado, mas perigoso contra defesa imprecisa.", [
            n("5...h6 6.Cxf7 Rxf7 7.Bc4+ d5 8.Bxd5+ Rg7", "h6 Nxf7 Kxf7 Bc4+ d5 Bxd5+ Kg7", "As brancas sacrificaram uma peça por dois peões e o rei exposto.", [n("9.d4 Cf6", "d4 Nf6", "As pretas desenvolvem para neutralizar o ataque.", undefined, "main")]),
          ], "trap"),
          n("Muzio 4.Bc4 g4 5.O-O", "Bc4 g4 O-O", "O famoso sacrifício Muzio: as brancas entregam o cavalo para atacar com todo o poder.", [
            n("5...gxf3 6.Dxf3 Df6", "gxf3 Qxf3 Qf6", "A dama preta defende f7 e pressiona e5.", [n("7.e5 Dxe5 8.d3 Bh6 9.Cc3 Ce7", "e5 Qxe5 d3 Bh6 Nc3 Ne7", "As brancas têm iniciativa por desenvolvimento, mas os motores consideram a linha arriscada: com a melhor defesa as pretas ficam melhor.", undefined, "main")]),
          ], "trap"),
        ], "defense"),
        n("3.Cf3 — Defesa Fischer 3...d6", "Nf3 d6", "A defesa de Bobby Fischer: contra-ataque em e4 e preparação de ...g5 sem perder tempo.", [
          n("4.d4 g5 5.h4 g4 6.Cg1", "d4 g5 h4 g4 Ng1", "Linha típica em que o cavalo recua e as pretas ficam com um peão extra.", undefined, "main"),
        ], "defense"),
        n("3.Cf3 — Defesa Cunningham 3...Be7", "Nf3 Be7", "As pretas ameaçam ...Bh4+ e desenvolver rápido.", [
          n("4.Bc4 Cf6 5.e5 Cg4 6.O-O", "Bc4 Nf6 e5 Ng4 O-O", "Posição dinâmica; o cavalo g4 deve ser tratado com cuidado.", undefined, "main"),
        ], "defense"),
        n("3.Bc4 — Gambito do Bispo", "Bc4", "Evita a Cf3 imediata e mira f7. Se 3...Dh4+ 4.Rf1 as brancas perdem o roque mas ganham tempo.", [
          n("3...Dh4+ 4.Rf1 Cf6", "Qh4+ Kf1 Nf6", "O rei branco fica em f1, mas as pretas gastam tempo com a dama.", undefined, "main"),
        ], "alt"),
      ], "main"),
      n("Recusado (2...d5) — Contra-gambito Falkbeer", "d5", "As pretas respondem com um contra-gambito no centro.", [
        n("3.exd5 e4", "exd5 e4", "O peão e4 cunha-se no campo branco e cria ameaças de ...Bc5 e ...Cf6.", [
          n("4.d3 Cf6 5.dxe4 Cxe4 6.Cf3 Bc5", "d3 Nf6 dxe4 Nxe4 Nf3 Bc5", "Linha principal: peças pretas muito ativas.", [n("7.De2 Bf5 8.Cc3 De7", "Qe2 Bf5 Nc3 Qe7", "As pretas pressionam e acumulam atividade.", undefined, "main")], "main"),
          n("4.Cc3 Cf6 5.De2 De7", "Nc3 Nf6 Qe2 Qe7", "Variante Nimzowitsch: as brancas pressionam o peão e4 com a dama; as pretas defendem com ...De7.", undefined, "alt"),
        ], "decline"),
      ], "decline"),
      n("Recusado (2...Bc5) — Defesa Clássica", "Bc5", "As pretas ignoram o peão e desenvolvem.", [
        n("3.Cf3 d6 4.c3 Cf6 5.d4 Bb6", "Nf3 d6 c3 Nf6 d4 Bb6", "Posição equilibrada; as brancas têm centro, as pretas boa estrutura.", undefined, "main"),
      ], "decline"),
    ],
  },
  {
    id: "dama",
    name: "Gambito da Dama",
    side: "w",
    eco: "D06–D69",
    level: 1,
    summary: "A abertura clássica por excelência. Não é um gambito 'de verdade' — se as pretas aceitam, as brancas recuperam o peão — mas é o pilar do jogo de d4.",
    ideas: ["Disputar o centro com c4 contra o peão d5.", "Se ...dxc4, recuperar o peão com e3 e Bxc4 ou e4.", "Pressionar a coluna c e o centro d4-e4.", "Usar os bispos e a pressão sobre d5 para criar vantagem espacial."],
    traps: ["Armadilha Cambridge Springs: após ...Da5, a Cd2 pode falhar para ...Bb4."],
    base: "d4 d5 c4",
    tree: [
      n("Aceito (2...dxc4)", "dxc4", "As pretas aceitam. Não devem tentar segurar o peão a todo custo; as brancas recuperam com facilidade.", [
        n("3.Cf3 Cf6 4.e3 e6 5.Bxc4 c5 6.O-O a6", "Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6", "Linha principal do Gambito da Dama Aceito. Posição equilibrada com jogo de peças.", undefined, "main"),
        n("3.e3 Cf6 4.Bxc4 e6 5.Cf3 c5", "e3 Nf6 Bxc4 e6 Nf3 c5", "Transposição comum com o mesmo esquema.", undefined, "alt"),
        n("3.e4 — Gambito Central", "e4 e5 Nf3 exd4 Bxc4 Nc6", "As brancas ocupam o centro; as pretas respondem com ...e5 para desafiá-lo.", undefined, "alt"),
      ], "main"),
      n("Recusado (2...e6) — Ortodoxa", "e6", "A resposta mais sólida; as pretas mantêm o centro.", [
        n("3.Cc3 Cf6 4.Bg5 Be7 5.e3 O-O 6.Cf3 Cbd7", "Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7", "Posição ortodoxa clássica, rica em manobras.", undefined, "main"),
        n("Cambridge Springs 4.Bg5 Cbd7 5.e3 c6 6.Cf3 Da5", "Nc3 Nf6 Bg5 Nbd7 e3 c6 Nf3 Qa5", "A dama preta pressiona o cavalo c3. Se 7.Cd2? Bb4! as brancas sofrem.", undefined, "trap"),
        n("Variante da Troca 4.cxd5 exd5 5.Bg5 c6", "Nc3 Nf6 cxd5 exd5 Bg5 c6", "Estrutura de ataque da minoria: as brancas jogam b4-b5 contra o flanco da dama.", undefined, "alt"),
      ], "decline"),
      n("Defesa Eslava (2...c6)", "c6", "Reforça d5 sem bloquear o bispo de casas brancas.", [
        n("3.Cf3 Cf6 4.Cc3 dxc4 5.a4 Bf5 6.e3 e6 7.Bxc4 Bb4", "Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4", "Eslava Principal: as pretas desenvolvem o bispo antes de ...e6.", undefined, "main"),
        n("Semi-Eslava 4...e6 5.e3 Cbd7 6.Bd3 dxc4 7.Bxc4 b5", "Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5", "Variante Meran: luta aguda e complexa no centro.", undefined, "alt"),
      ], "decline"),
      n("Defesa Chigorin (2...Cc6)", "Nc6", "Defesa hipermoderna: as pretas buscam peças ativas em vez de manter o peão.", [
        n("3.Cf3 Bg4 4.cxd5 Bxf3 5.gxf3 Dxd5 6.e3 e5", "Nf3 Bg4 cxd5 Bxf3 gxf3 Qxd5 e3 e5", "As brancas ficam com estrutura danificada mas o par de bispos.", undefined, "main"),
      ], "decline"),
      n("Contra-gambito Albin (2...e5)", "e5", "As pretas sacrificam o peão para criar um peão d4 incômodo.", [
        n("3.dxe5 d4 4.e3 Bb4+ 5.Bd2 dxe3 6.Bxb4 exf2+ 7.Re2 fxg1=N+", "dxe5 d4 e3 Bb4+ Bd2 dxe3 Bxb4 exf2+ Ke2 fxg1=N+", "Armadilha de Lasker: subpromoção a cavalo com xeque e ganho de material!", undefined, "trap"),
        n("4.Cf3 Cc6 5.g3 Be6 6.Cbd2 Dd7", "Nf3 Nc6 g3 Be6 Nbd2 Qd7", "Linha principal: as brancas jogam com g3 e as pretas pressionam o peão d4.", undefined, "main"),
      ], "alt"),
    ],
  },
  {
    id: "evans",
    name: "Gambito Evans",
    side: "w",
    eco: "C51–C52",
    level: 2,
    summary: "Sacrifício de peão b4 para ganhar tempo e construir um centro de peões enorme com ataque contra o rei preto. Arma favorita de Morphy e Kasparov.",
    ideas: ["Desviar o bispo c5 com b4.", "Jogar c3 e d4 para dominar o centro.", "Roque rápido e iniciativa.", "Atacar f7 com o bispo c4 e a dama."],
    base: "e4 e5 Nf3 Nc6 Bc4 Bc5 b4",
    tree: [
      n("Aceito 4...Bxb4", "Bxb4 c3", "As brancas atacam o bispo, ganhando tempo para o centro.", [
        n("5...Ba5 6.d4 exd4 7.O-O", "Ba5 d4 exd4 O-O", "Posição teórica principal do Evans, com enorme compensação.", [
          n("7...d6 8.cxd4 Bb6 9.Cc3 Cf6", "d6 cxd4 Bb6 Nc3 Nf6", "Posição Normal: as brancas têm centro e iniciativa.", undefined, "main"),
        ], "main"),
        n("5...Be7 — Defesa Alemã", "Be7 d4 Na5 Nxe5 Nxc4 Nxc4 d5", "As pretas devolvem material e ficam com posição sólida.", undefined, "defense"),
        n("5...Bc5 6.d4 exd4 7.O-O", "Bc5 d4 exd4 O-O", "Evita o recuo do bispo, mas expõe-no a ataques.", undefined, "alt"),
      ], "main"),
      n("Recusado 4...Bb6", "Bb6 a4 a6 Nc3 Nf6 d3 d6", "As pretas recusam o peão e mantêm o bispo bem posicionado.", undefined, "decline"),
    ],
  },
  {
    id: "danes",
    name: "Gambito Dinamarquês",
    side: "w",
    eco: "C21",
    level: 1,
    summary: "As brancas oferecem até dois peões pelo desenvolvimento acelerado e abrem as diagonais dos bispos contra o rei preto.",
    ideas: ["Desenvolver rápido com Bc4 e Bb2.", "Mirar f7 e a diagonal a1-h8.", "Contar com iniciativa antes de recuperar o material."],
    traps: ["Se as pretas capturarem tudo sem cuidado, os bispos apontam para g7 e f7."],
    base: "e4 e5 d4 exd4 c3",
    tree: [
      n("Aceito 3...dxc3", "dxc3", "As pretas aceitam o primeiro peão.", [
        n("4.Bc4 cxb2 5.Bxb2 d5", "Bc4 cxb2 Bxb2 d5", "As pretas devolvem material para neutralizar o ataque. A defesa mais sólida.", [
          n("6.Bxd5 Cf6 7.Bxf7+ Rxf7 8.Dxd8 Bb4+ 9.Dd2 Bxd2+ 10.Cxd2", "Bxd5 Nf6 Bxf7+ Kxf7 Qxd8 Bb4+ Qd2 Bxd2+ Nxd2", "Linha forçada que leva a um final equilibrado.", undefined, "main"),
        ], "main"),
        n("4.Cxc3 Cc6 5.Cf3 Cf6", "Nxc3 Nc6 Nf3 Nf6", "Evita o segundo peão e desenvolve com solidez.", undefined, "alt"),
      ], "main"),
      n("Recusado 3...d5", "d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4", "As pretas devolvem o peão e liberam o jogo.", undefined, "decline"),
    ],
  },
  {
    id: "bdg",
    name: "Gambito Blackmar-Diemer",
    side: "w",
    eco: "D00–D01",
    level: 3,
    summary: "Gambito agudo contra a Defesa Francesa do d-peão: as brancas sacrificam o peão e para abrir a coluna f e lançar um ataque ao rei.",
    ideas: ["Jogar e4 após d4 d5, oferecendo o peão.", "Recapturar em f3 e desenvolver Bd3, Bg5 e Dd2.", "Rocar longo e atacar com g4 e h4."],
    traps: ["Se as pretas tentam manter o peão com ...e5 cedo demais, perdem a iniciativa."],
    base: "d4 d5 e4",
    tree: [
      n("Aceito 2...dxe4", "dxe4 Nc3 Nf6 f3", "As brancas oferecem o segundo peão no mesmo lance.", [
        n("4...exf3 5.Cxf3 e6 6.Bg5 Be7 7.Bd3 Cbd7 8.De2", "exf3 Nxf3 e6 Bg5 Be7 Bd3 Nbd7 Qe2", "Linha principal: as peças brancas apontam para o rei preto.", undefined, "main"),
        n("4...e6 (Recusa) 5.Bg5 Be7", "e6 Bg5 Be7", "As pretas recusam e evitam abrir a coluna f.", undefined, "decline"),
      ], "main"),
      n("Contra-gambito Lemberger 3...e5", "dxe4 Nc3 e5 Nf3 exd4 Qxd4 Qxd4 Nxd4", "Neutraliza o ataque devolvendo o peão e trocando damas.", undefined, "defense"),
    ],
  },
  {
    id: "viena",
    name: "Gambito Vienense",
    side: "w",
    eco: "C29",
    level: 2,
    summary: "Combina o desenvolvimento do cavalo c3 com o avanço f4: ideias do Gambito do Rei com mais controle do centro.",
    ideas: ["Preparar f4 com Cc3.", "Pressionar e5 e a coluna f.", "Usar e5 para expulsar o cavalo f6."],
    base: "e4 e5 Nc3 Nf6 f4",
    tree: [
      n("Aceito 4...exf4", "exf4 e5 Qe7 Qe2 Ng8 Nf3", "Linha de Steinitz: o motor favorece claramente as brancas aqui; as pretas precisam de precisão para equilibrar.", undefined, "main"),
      n("Recusado 4...d5", "d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3 f5", "Linha principal do Gambito Vienense: aguda e teórica.", [
        n("9.exf6 Cxf6 10.O-O", "exf6 Nxf6 O-O", "Posição equilibrada com jogo de peças.", undefined, "main"),
      ], "decline"),
    ],
  },
  {
    id: "smith-morra",
    name: "Gambito Smith-Morra",
    side: "w",
    eco: "B21",
    level: 2,
    summary: "A forma mais agressiva de enfrentar a Siciliana: sacrificar o peão d para desenvolver rápido e dominar a coluna d e c.",
    ideas: ["Ganhar tempo de desenvolvimento com Cxc3.", "Posicionar torres em d1 e c1.", "Bispo em c4 e dama em e2 contra o centro preto."],
    base: "e4 c5 d4 cxd4 c3",
    tree: [
      n("Aceito 3...dxc3", "dxc3 Nxc3", "As brancas ganham desenvolvimento e iniciativa pelo peão.", [
        n("4...Cc6 5.Cf3 d6 6.Bc4 e6 7.O-O Cf6 8.De2 Be7 9.Td1 e5", "Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7 Rd1 e5", "Posição teórica principal: as pretas devolvem a posição central.", undefined, "main"),
        n("4...d6 5.Bc4 Cf6 6.Cf3 e6 7.O-O Be7", "d6 Bc4 Nf6 Nf3 e6 O-O Be7", "Setup sólido das pretas.", undefined, "defense"),
      ], "main"),
      n("Recusado 3...Cf6 4.e5 Cd5", "Nf6 e5 Nd5 Nf3 e6 cxd4 Nc6 Bc4 Nb6 Bb3 d5", "As pretas devolvem o centro com contra-ataque.", undefined, "decline"),
      n("Recusado 3...d5", "d5 exd5 Qxd5 cxd4 Nf6 Nf3", "As pretas buscam jogo aberto e rápido.", undefined, "decline"),
    ],
  },
  {
    id: "goring",
    name: "Gambito Göring",
    side: "w",
    eco: "C44",
    level: 2,
    summary: "Variante do Escocês com c3: as brancas oferecem o peão d para desenvolver rápido e ganhar atividade.",
    ideas: ["Estabelecer centro com c3 e d4.", "Bc4 e O-O com ataque.", "Aproveitar atraso no desenvolvimento preto."],
    base: "e4 e5 Nf3 Nc6 d4 exd4 c3",
    tree: [
      n("Aceito 4...dxc3", "dxc3", "As pretas aceitam o gambito.", [
        n("5.Bc4 cxb2 6.Bxb2 d6 7.Cc3 Cf6 8.De2 Be7", "Bc4 cxb2 Bxb2 d6 Nc3 Nf6 Qe2 Be7", "Compensação por ritmo e diagonal b2-g7.", undefined, "main"),
        n("5.Cxc3 Bb4 6.Bc4 d6 7.O-O Bxc3 8.bxc3 Cf6", "Nxc3 Bb4 Bc4 d6 O-O Bxc3 bxc3 Nf6", "Linha mais sólida: as brancas ficam com centro e par de bispos.", undefined, "alt"),
      ], "main"),
      n("Recusado 4...d5", "d5 exd5 Qxd5 cxd4 Bg4 Be2", "As pretas devolvem o peão para ganhar desenvolvimento.", undefined, "decline"),
    ],
  },
  {
    id: "escoces-gambito",
    name: "Gambito Escocês",
    side: "w",
    eco: "C44",
    level: 2,
    summary: "As brancas jogam Bc4 em vez de recapturar em d4 com o cavalo, transformando o Escocês em um jogo aberto de ataque.",
    ideas: ["Desenvolver o bispo com tempo.", "Ataque f7 com Bc4 e cavalos.", "Recuperar o peão d4 com cuidado."],
    base: "e4 e5 Nf3 Nc6 d4 exd4 Bc4",
    tree: [
      n("4...Bc5 — Max Lange", "Bc5 O-O Nf6 e5 d5 exf6 dxc4 Re1+ Be6 Ng5 Qd5 Nc3 Qf5 Nce4 O-O-O", "O ataque Max Lange: posição teórica muito aguda com chances duplas.", undefined, "main"),
      n("4...Cf6 5.e5 d5 6.Bb5 Ce4 7.Cxd4 Bd7", "Nf6 e5 d5 Bb5 Ne4 Nxd4 Bd7", "Defesa de dois cavalos: as pretas devolvem o equilíbrio.", undefined, "defense"),
    ],
  },
  {
    id: "halloween",
    name: "Gambito Halloween",
    side: "w",
    eco: "C46",
    level: 3,
    summary: "Sacrifício de cavalo em e5 na Defesa dos Quatro Cavalos, com ideia de e4-e5 e d4 para expulsar peças pretas.",
    ideas: ["Sacrificar o cavalo por dois peões e iniciativa.", "Avançar d4 e e5 ganhando tempo contra os cavalos.", "Explorar peças mal posicionadas."],
    traps: ["Se as pretas aceitam o sacrifício sem cuidado, o avanço e5 pode ganhar peças."],
    base: "e4 e5 Nf3 Nc6 Nc3 Nf6 Nxe5",
    tree: [
      n("5...Cxe5 6.d4", "Nxe5 d4", "As brancas expulsam o cavalo com d4.", [
        n("6...Cg6 7.e5 Cg8", "Ng6 e5 Ng8", "Os cavalos pretos recuam e as brancas ganham espaço. Teoria duvidosa: o motor prefere as pretas, mas a posição é rica em armadilhas.", undefined, "main"),
        n("6...Cc6 7.d5 Ce5 8.f4 Cg6 9.e5 Cg8", "Nc6 d5 Ne5 f4 Ng6 e5 Ng8", "As pretas ficam sem espaço com os cavalos recuados.", undefined, "alt"),
      ], "main"),
    ],
  },
  {
    id: "staunton",
    name: "Gambito Staunton",
    side: "w",
    eco: "A82–A83",
    level: 2,
    summary: "Resposta agressiva à Defesa Holandesa: as brancas sacrificam o peão e para abrir o jogo e dominar o centro.",
    ideas: ["Bg5 para atacar o cavalo f6.", "Recuperar o peão com Cxe4.", "Aproveitar a fraqueza da diagonal a2-g8."],
    base: "d4 f5 e4",
    tree: [
      n("Aceito 2...fxe4", "fxe4 Nc3 Nf6 Bg5", "O Bg5 pressiona o cavalo f6 e ameaça Cxe4.", [
        n("4...e6 5.Cxe4 Be7 6.Bxf6 Bxf6 7.Cf3 O-O", "e6 Nxe4 Be7 Bxf6 Bxf6 Nf3 O-O", "Linha principal: as brancas recuperam o peão com posição mais ativa.", undefined, "main"),
        n("4...Cc6 5.d5 Ce5 6.Dd4 Cf7", "Nc6 d5 Ne5 Qd4 Nf7", "Linha de Alekhine com jogo complicado.", undefined, "alt"),
      ], "main"),
    ],
  },
];
