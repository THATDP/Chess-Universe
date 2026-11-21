import { Chess } from 'chess.js';
import {
  GambitDefenseLine,
  GambitDefinition,
  GambitMoveNode,
  GambitStartPosition,
  PieceColor,
} from '../types/chess';

interface MoveCommentaryMap {
  [plyAndSanKey: string]: {
    comment: string;
    tacticalIdea?: string;
    isTrap?: boolean;
    trapWarning?: string;
    badge?: 'book' | 'brilliant' | 'trap' | 'critical' | 'defense';
  };
}

/**
 * Builds a complete, verified navigable variation tree from a set of defense lines
 */
function buildGambitTree(
  defenses: GambitDefenseLine[],
  commentaryMap: MoveCommentaryMap
): GambitMoveNode[] {
  const rootNodes: GambitMoveNode[] = [];

  for (const defense of defenses) {
    const chess = new Chess();
    let currentLevel = rootNodes;

    for (let i = 0; i < defense.movesSan.length; i++) {
      const san = defense.movesSan[i];
      const ply = i + 1;
      const moveNumber = Math.floor(i / 2) + 1;
      const color: PieceColor = i % 2 === 0 ? 'w' : 'b';

      const moveObj = chess.move(san);
      if (!moveObj) break;

      const uci = `${moveObj.from}${moveObj.to}${moveObj.promotion || ''}`;
      const fenAfter = chess.fen();
      const nodeId = `${ply}-${san}-${fenAfter.split(' ')[0]}`;

      let existingNode = currentLevel.find((n) => n.san === san);
      if (!existingNode) {
        const metaKey = `${ply}:${san}`;
        const meta = commentaryMap[metaKey] || commentaryMap[san];

        const defaultComment =
          i === defense.movesSan.length - 1
            ? `${defense.name}: ${defense.keyIdea} (${defense.evaluationVerdict})`
            : `Lance teórico da variante ${defense.name}.`;

        existingNode = {
          id: nodeId,
          san,
          uci,
          fenAfter,
          ply,
          color,
          moveNumber,
          comment: meta?.comment || defaultComment,
          tacticalIdea: meta?.tacticalIdea || (i === defense.movesSan.length - 1 ? defense.keyIdea : undefined),
          isTrap: meta?.isTrap || defense.category === 'Armadilha',
          trapWarning: meta?.trapWarning,
          badge:
            meta?.badge ||
            (defense.category === 'Armadilha' && i >= defense.movesSan.length - 2
              ? 'trap'
              : i === 2 || i === 3
              ? 'critical'
              : 'book'),
          children: [],
        };
        currentLevel.push(existingNode);
      }

      currentLevel = existingNode.children;
    }
  }

  return rootNodes;
}

function computeFenAfterMoves(movesSan: string[]): string {
  const chess = new Chess();
  for (const m of movesSan) {
    try {
      chess.move(m);
    } catch {
      break;
    }
  }
  return chess.fen();
}

function buildStartPositions(
  gambitName: string,
  rootMoves: string[],
  criticalBranchMoves: string[]
): GambitStartPosition[] {
  return [
    {
      id: 'from-start',
      label: '1. Do Início da Partida (Lance 1)',
      description: `Pratique toda a sequência desde o primeiro lance até entrar no ${gambitName}.`,
      plyIndex: 0,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    },
    {
      id: 'from-tabiya',
      label: `2. Posição Base do Gambito (${rootMoves.join(' ')})`,
      description: `Comece exatamente no momento em que o sacrifício do ${gambitName} é oferecido no tabuleiro.`,
      plyIndex: rootMoves.length,
      fen: computeFenAfterMoves(rootMoves),
    },
    {
      id: 'from-critical',
      label: `3. Momento Crítico de Decisão (${criticalBranchMoves.join(' ')})`,
      description: 'Inicie na bifurcação tática principal onde o ataque e a defesa colidem.',
      plyIndex: criticalBranchMoves.length,
      fen: computeFenAfterMoves(criticalBranchMoves),
    },
  ];
}

// ============================================================================
// 1. GAMBITO DO REI (BRANCAS)
// ============================================================================
const kingsGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'kga-classical',
    name: 'Aceito — Defesa Clássica (3...g5)',
    category: 'Aceito',
    description: 'As Pretas aceitam o peão em f4 e defendem imediatamente com ...g5, buscando expandir na ala do rei.',
    movesSan: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'Bg7', 'O-O', 'd6', 'd4', 'h6', 'c3', 'Nc6'],
    keyIdea: 'Pressione o ponto f7 com Bc4 + Qb3 e prepare a ruptura h4 para minar a cadeia f4/g5.',
    evaluationVerdict: ' Jogo agudo e dinâmico (+0.15)',
  },
  {
    id: 'kga-fischer',
    name: 'Aceito — Defesa Fischer (3...d6)',
    category: 'Aceito',
    description: 'Popularizada por Bobby Fischer: um lance profilático que evita Ne5 das Brancas antes de avançar ...g5.',
    movesSan: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5', 'h4', 'g4', 'Ng1', 'Bh6', 'Nc3', 'Nc6'],
    keyIdea: 'O cavalo recua temporariamente para g1, mas as Brancas dominam o centro com d4+Nc3 e atacam f4 com Nge2.',
    evaluationVerdict: 'Luta estratégica complexa (0.00)',
  },
  {
    id: 'kga-cunningham',
    name: 'Aceito — Defesa Cunningham (3...Be7)',
    category: 'Aceito',
    description: 'As Pretas provocam o xeque em h4 para forçar o rei branco a perder o roque com Kf1.',
    movesSan: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'Be7', 'Bc4', 'Bh4+', 'Kf1', 'd5', 'Bxd5', 'Nf6', 'Nc3', 'Nxd5'],
    keyIdea: 'Embora o Rei branco vá para f1, o bispo preto em h4 fica exposto ao ganho de tempo com Nxh4 ou d4+Bxf4.',
    evaluationVerdict: 'Vantagem espacial das Brancas (+0.35)',
  },
  {
    id: 'kga-muzio',
    name: 'Aceito — Gambito Muzio (Sacrifício de Cavalo!)',
    category: 'Armadilha',
    description: 'A linha mais romântica do xadrez: as Brancas sacrificam um cavalo inteiro em f3 por ataque devastador em f7!',
    movesSan: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'O-O', 'gxf3', 'Qxf3', 'Qf6', 'e5', 'Qxe5', 'd3', 'Bh6'],
    keyIdea: 'Três peças brancas (Bc4, Qf3, Tf1) convergem sobre f7 enquanto o rei preto ainda está no centro!',
    evaluationVerdict: 'Ataque fulminante contra f7! (Brilhante !!)',
  },
  {
    id: 'kgd-falkbeer',
    name: 'Recusado — Contra-Gambito Falkbeer (2...d5)',
    category: 'Contra-Gambito',
    description: 'As Pretas recusam o peão de f4 e contra-atacam imediatamente o centro com 2...d5!',
    movesSan: ['e4', 'e5', 'f4', 'd5', 'exd5', 'e4', 'd3', 'Nf6', 'dxe4', 'Nxe4', 'Nf3', 'Bc5', 'Qe2', 'Bf5'],
    keyIdea: 'Neutralize o peão avançado em e4 com d3 e Nc3, mantendo cautela com a diagonal a7-g1.',
    evaluationVerdict: 'Posição aberta e tática (0.00)',
  },
  {
    id: 'kgd-classical',
    name: 'Recusado — Defesa Clássica (2...Bc5)',
    category: 'Recusado',
    description: 'As Pretas desenvolvem calmamente o bispo para a diagonal a7-g1, impedindo o roque imediato das Brancas.',
    movesSan: ['e4', 'e5', 'f4', 'Bc5', 'Nf3', 'd6', 'Bc4', 'Nf6', 'd3', 'Nc6', 'Nc3', 'Bg4', 'Na4', 'Bb6'],
    keyIdea: 'Elimine o forte bispo de c5 com Na4 e prepare f4-f5 ou captura em e5 no momento oportuno.',
    evaluationVerdict: 'Equilíbrio posicional (+0.10)',
  },
  {
    id: 'kga-bishops-gambit',
    name: 'Linha Alternativa — Gambito do Bispo (3.Bc4)',
    category: 'Linha Alternativa',
    description: 'Permite 3...Qh4+ 4.Kf1 para ganhar tempos valiosos sobre a dama preta com Nf3.',
    movesSan: ['e4', 'e5', 'f4', 'exf4', 'Bc4', 'Qh4+', 'Kf1', 'd6', 'Nf3', 'Qh5', 'Nc3', 'Be6', 'Be2', 'Qa5'],
    keyIdea: 'O Rei em f1 está totalmente seguro e Nf3 ganha tempo direto sobre a Dama preta.',
    evaluationVerdict: 'Desenvolvimento acelerado (+0.25)',
  },
];

const kingsGambitComments: MoveCommentaryMap = {
  '3:f4': {
    comment: 'Gambito do Rei! As Brancas oferecem o peão de f4 para desviar o peão central preto de e5 e abrir a coluna f.',
    tacticalIdea: 'Dominar o centro com d4 e atacar f7 com Bc4 + Tf1.',
    badge: 'brilliant',
  },
  '4:exf4': {
    comment: 'Gambito do Rei Aceito. As Pretas capturam o peão e desafiam as Brancas a provarem a compensação.',
    badge: 'critical',
  },
  '4:d5': {
    comment: 'Contra-Gambito Falkbeer! As Pretas golpeiam o centro imediatamente em vez de defender f4.',
    tacticalIdea: 'Abrir linhas contra o rei branco após 3.exd5 e4.',
    badge: 'defense',
  },
  '4:Bc5': {
    comment: 'Gambito do Rei Recusado Clássico. O bispo em c5 controla a diagonal enfraquecida a7-g1.',
    badge: 'defense',
  },
  '5:Nf3': {
    comment: 'Lance fundamental: desenvolve com ganho de controle central e impede o xeque incômodo ...Qh4+.',
    badge: 'book',
  },
  '6:g5': {
    comment: 'Defesa Clássica: sustenta o peão extra em f4 e ameaça avançar ...g4 atacando o cavalo em f3.',
    badge: 'defense',
  },
  '6:d6': {
    comment: 'Defesa Fischer! Impede que o cavalo branco salte para e5 após ...g5-g4.',
    badge: 'defense',
  },
  '9:O-O': {
    comment: 'GAMBITO MUZIO! As Brancas ignoram a ameaça ...g4 e entregam o cavalo de f3 por um ataque mortal sobre f7!',
    tacticalIdea: 'Após 5...gxf3 6.Qxf3, as Brancas têm 3 peças ativas contra a casa f7.',
    isTrap: true,
    trapWarning: 'Sacrifício de peça inteira por ataque direto ao Rei!',
    badge: 'brilliant',
  },
};

// ============================================================================
// 2. GAMBITO DA DAMA (BRANCAS)
// ============================================================================
const queensGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'qga-main',
    name: 'Aceito — Linha Central Clássica (2...dxc4)',
    category: 'Aceito',
    description: 'As Pretas cedem temporariamente o centro para desenvolver rapidamente e golpear d4 com ...c5.',
    movesSan: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6', 'Bb3', 'Nc6'],
    keyIdea: 'Recupere o peão sem pressa com Bxc4 e mantenha forte presença central com Nc3 e Qe2.',
    evaluationVerdict: 'Vantagem posicional das Brancas (+0.35)',
  },
  {
    id: 'qga-trap',
    name: 'Aceito — Armadilha da Ganância (3...b5?!)',
    category: 'Armadilha',
    description: 'Se as Pretas tentarem segurar o peão de c4 à força com ...b5 e ...c6, caem em uma armadilha clássica na diagonal a8-h1!',
    movesSan: ['d4', 'd5', 'c4', 'dxc4', 'e3', 'b5', 'a4', 'c6', 'axb5', 'cxb5', 'Qf3', 'Nc6', 'Qxc6+', 'Bd7'],
    keyIdea: 'Após a4 e axb5 cxb5, o golpe Qf3! ataca a torre de a8 ou ganha peça limpa em c6!',
    evaluationVerdict: 'Vitória material das Brancas (+3.80)',
  },
  {
    id: 'qgd-orthodox',
    name: 'Recusado — Defesa Ortodoxa (2...e6)',
    category: 'Recusado',
    description: 'A defesa mais sólida da história dos Campeonatos Mundiais: sustenta d5 com o peão de e6.',
    movesSan: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6'],
    keyIdea: 'Execute o ataque da minoria na ala da dama (b4-b5) ou a expansão central com e3-e4.',
    evaluationVerdict: 'Clássico estratégico (+0.25)',
  },
  {
    id: 'qgd-slav',
    name: 'Recusado — Defesa Eslava (2...c6)',
    category: 'Recusado',
    description: 'Sustenta d5 com o peão de c6 sem bloquear a diagonal do bispo de casas claras (c8-h3).',
    movesSan: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4'],
    keyIdea: 'O lance 5.a4! impede ...b5 das Pretas e garante a recuperação confortável do peão de c4.',
    evaluationVerdict: 'Luta posicional equilibrada (+0.20)',
  },
  {
    id: 'qg-albin',
    name: 'Contra-Gambito Albin (2...e5)',
    category: 'Contra-Gambito',
    description: 'As Pretas sacrificam um peão central para instalar uma cunha incômoda em d4 com 3...d4.',
    movesSan: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc6', 'g3', 'Be6', 'Nbd2', 'Qd7', 'Bg2', 'O-O-O'],
    keyIdea: 'Desenvolva o bispo em fianchetto (g3 + Bg2) para pressionar diretamente o peão avançado de d4.',
    evaluationVerdict: 'Vantagem sólida das Brancas (+0.55)',
  },
];

// ============================================================================
// 3. GAMBITO EVANS (BRANCAS)
// ============================================================================
const evansGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'evans-accepted-main',
    name: 'Aceito — Linha Principal de Kasparov (5...Ba5)',
    category: 'Aceito',
    description: 'As Pretas aceitam em b4 e recuam para a5; as Brancas constroem o centro ideal d4+e4 com rápido roque.',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O', 'd6', 'cxd4', 'Bb6'],
    keyIdea: 'Use a bateria Qb3/Ba3 e os peões centrais móveis d4-e4 para sufocar o rei preto.',
    evaluationVerdict: 'Iniciativa duradoura das Brancas (+0.30)',
  },
  {
    id: 'evans-lasker',
    name: 'Aceito — Defesa Lasker (5...Bd6)',
    category: 'Aceito',
    description: 'Método pragmático de Emanuel Lasker para devolver o peão no momento certo e aliviar a pressão tática.',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Bd6', 'd4', 'Nf6', 'O-O', 'O-O', 'Re1', 'h6'],
    keyIdea: 'Mantenha a tensão central ou avance d4-d5 para desalojar o cavalo de c6.',
    evaluationVerdict: 'Jogo posicional rico (+0.20)',
  },
  {
    id: 'evans-morphy',
    name: 'Aceito — Variante Morphy (5...Bc5)',
    category: 'Armadilha',
    description: 'Se o bispo volta para c5, 6.d4 ganha ainda mais tempo atacando o bispo diretamente!',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Bc5', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Kf1', 'Qe7'],
    keyIdea: 'Ba3 é uma arma letal cortando o roque preto na diagonal a3-f8.',
    evaluationVerdict: 'Forte iniciativa das Brancas (+0.65)',
  },
  {
    id: 'evans-declined',
    name: 'Recusado — Retirada 4...Bb6',
    category: 'Recusado',
    description: 'As Pretas recusam o peão de b4 e preservam o bispo na diagonal a7-g1.',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bb6', 'a4', 'a6', 'Nc3', 'Nf6', 'Nd5', 'Nxd5', 'exd5', 'Nd4'],
    keyIdea: 'Expanda na ala da dama com a4-b5 sem ter sacrificado nenhum material!',
    evaluationVerdict: 'Espaço gratuito na ala da dama (+0.25)',
  },
];

// ============================================================================
// 4. GAMBITO DINAMARQUÊS (BRANCAS)
// ============================================================================
const danishGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'danish-double-accept',
    name: 'Aceito — Duplo Sacrifício (4...cxb2 5.Bxb2)',
    category: 'Aceito',
    description: 'As Brancas entregam dois peões para colocar os dois bispos (Bc4 e Bb2) rasgando a ala do rei preta!',
    movesSan: ['e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2', 'd6', 'Ne2', 'Nc6', 'O-O', 'Be6', 'Bxe6', 'fxe6'],
    keyIdea: 'Após 8.Bxe6 fxe6, jogue Qb3! atacando simultaneamente e6 e b7.',
    evaluationVerdict: 'Bispos monstruosos em c4 e b2 (+0.40)',
  },
  {
    id: 'danish-schlechter',
    name: 'Aceito — Defesa Schlechter (5...d5!)',
    category: 'Contra-Gambito',
    description: 'A resposta mais precisa: as Pretas devolvem imediatamente um peão com 5...d5! para liberar suas peças.',
    movesSan: ['e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2', 'd5', 'Bxd5', 'Nf6', 'Bxf7+', 'Kxf7', 'Qxd8', 'Bb4+'],
    keyIdea: 'Na variante 7.Bxf7+ Kxf7 8.Qxd8 Bb4+ 9.Qd2, chegamos a um final dinâmico com par de bispos.',
    evaluationVerdict: 'Igualdade dinâmica (0.00)',
  },
  {
    id: 'danish-declined',
    name: 'Recusado — Contra-Golpe Sorensen (3...d5)',
    category: 'Recusado',
    description: 'As Pretas recusam 3...dxc3 e golpeiam o centro imediatamente.',
    movesSan: ['e4', 'e5', 'd4', 'exd4', 'c3', 'd5', 'exd5', 'Qxd5', 'cxd4', 'Nc6', 'Nf3', 'Bg4', 'Be2', 'Bb4+'],
    keyIdea: 'Jogue com o peão da dama isolado (IQP) usando Nc3 e O-O com colunas abertas.',
    evaluationVerdict: 'Posição ativa de peão isolado (+0.15)',
  },
];

// ============================================================================
// 5. GAMBITO ESCOCÊS (BRANCAS)
// ============================================================================
const scotchGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'scotch-max-lange',
    name: 'Defesa dos Dois Cavalos — Ataque Max Lange',
    category: 'Aceito',
    description: 'Luta tática explosiva onde ambos os lados atacam sem trégua o rei adversário.',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4', 'Nf6', 'O-O', 'Bc5', 'e5', 'd5', 'exf6', 'dxc4', 'Re1+', 'Be6'],
    keyIdea: 'Continue com Ng5! pressionando o bispo cravado em e6 e o peão de g7.',
    evaluationVerdict: 'Tática de altíssima voltagem (+0.20)',
  },
  {
    id: 'scotch-haxo',
    name: 'Variante Clássica (4...Bc5 5.c3)',
    category: 'Linha Alternativa',
    description: 'Transpõe para linhas da Italiana com centro poderoso de peões para as Brancas.',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4', 'Bc5', 'c3', 'Nf6', 'cxd4', 'Bb4+', 'Bd2', 'Bxd2+', 'Nbxd2', 'd5'],
    keyIdea: 'Mantenha o par de peões centrais d4/e5 e ative as torres em e1 e c1.',
    evaluationVerdict: 'Centro clássico forte (+0.25)',
  },
  {
    id: 'scotch-goring',
    name: 'Gambito Göring (4.c3 dxc3 5.Nxc3)',
    category: 'Aceito',
    description: 'Sacrifica um peão em troca de desenvolvimento imediato dos dois cavalos e colunas d e c abertas.',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'c3', 'dxc3', 'Nxc3', 'Bb4', 'Bc4', 'd6', 'Qb3', 'Qe7', 'O-O', 'Bxc3'],
    keyIdea: 'Após 8...Bxc3 9.Qxc3 Nf6, as Brancas têm forte pressão sobre e5 e g7.',
    evaluationVerdict: 'Excelente compensação prática (+0.15)',
  },
];

// ============================================================================
// 6. GAMBITO SMITH-MORRA VS SICILIANA (BRANCAS)
// ============================================================================
const smithMorraDefenses: GambitDefenseLine[] = [
  {
    id: 'morra-accepted-main',
    name: 'Aceito — Formação Scheveningen',
    category: 'Aceito',
    description: 'As Brancas obtêm desenvolvimento relâmpago (Nc3, Nf3, Bc4, Qe2, Rd1) contra a estrutura siciliana.',
    movesSan: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'd6', 'Bc4', 'e6', 'O-O', 'Nf6', 'Qe2', 'Be7'],
    keyIdea: 'Coloque a torre em d1 e busque os sacrifícios temáticos Nd5! ou Bxe6!.',
    evaluationVerdict: 'Forte iniciativa prática (+0.15)',
  },
  {
    id: 'morra-siberian-trap',
    name: 'Aceito — Armadilha Siberiana (Cuidado!)',
    category: 'Armadilha',
    description: 'Conheça a famosa Armadilha Siberiana das Pretas (...Ng4 e ...Nd4!) e como evitá-la ou puni-la!',
    movesSan: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'e6', 'Bc4', 'Qc7', 'O-O', 'Nf6', 'Qe2', 'Ng4', 'Nb5', 'Qb8'],
    keyIdea: 'NUNCA jogue 9.h3?? devido a 9...Nd4! ganhando a dama! Jogue 9.Nb5! impedindo ...Nd4.',
    evaluationVerdict: 'Antídoto essencial contra a armadilha (+0.35)',
  },
  {
    id: 'morra-declined-alapin',
    name: 'Recusado — Transposição Alapin (3...Nf6)',
    category: 'Recusado',
    description: 'As Pretas recusam o peão de c3 e contra-atacam o peão de e4.',
    movesSan: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'Nf6', 'e5', 'Nd5', 'Nf3', 'Nc6', 'cxd4', 'd6', 'Bc4', 'Nb6'],
    keyIdea: 'O peão avançado em e5 restringe a ala do rei preta e garante espaço.',
    evaluationVerdict: 'Vantagem espacial confortável (+0.25)',
  },
];

// ============================================================================
// 7. GAMBITO STAFFORD (PRETAS)
// ============================================================================
const staffordGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'stafford-oh-no-my-queen',
    name: 'Armadilha "Oh No My Queen!" (6.Bg5?! Nxe4!)',
    category: 'Armadilha',
    description: 'A armadilha mais famosa do Gambito Stafford: as Pretas sacrificam a Dama em d8 para dar xeque-mate em 2 lances!',
    movesSan: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Bg5', 'Nxe4', 'Bxd8', 'Bxf2+', 'Ke2', 'Bg4#'],
    keyIdea: '6...Nxe4!! entrega a Dama em d8 porque 7.Bxd8 Bxf2+ 8.Ke2 Bg4# é XEQUE-MATE!',
    evaluationVerdict: 'XEQUE-MATE em 8 lances! (Brilhante !!)',
  },
  {
    id: 'stafford-be2-attack',
    name: 'Ataque Lateral ...h5 e ...Ng4 contra 6.Be2',
    category: 'Aceito',
    description: 'Quando as Brancas jogam o cauteloso 6.Be2, as Pretas lançam ...h5 e ...Ng4 abrindo a coluna h!',
    movesSan: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Be2', 'h5', 'O-O', 'Ng4', 'Bxg4', 'hxg4'],
    keyIdea: 'Após 8...hxg4, a Dama preta entra em h4 com ameaças letais de mate em h2 e h1!',
    evaluationVerdict: 'Ataque devastador na coluna h (-1.20)',
  },
  {
    id: 'stafford-e5-line',
    name: 'Linha Crítica 5.e5 Ne4 6.d4 Qh4',
    category: 'Linha Alternativa',
    description: 'A tentativa mais ambiciosa das Brancas é avançar 5.e5, mas as Pretas contra-atacam f2 imediatamente com ...Qh4!',
    movesSan: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'e5', 'Ne4', 'd4', 'Qh4', 'Be3', 'Bf5', 'Nd2', 'O-O-O'],
    keyIdea: 'Faça o roque grande (...O-O-O) com pressão máxima sobre a coluna d e f2.',
    evaluationVerdict: 'Complicações táticas extremas (-0.20)',
  },
];

// ============================================================================
// 8. GAMBITO BUDAPESTE (PRETAS)
// ============================================================================
const budapestGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'budapest-adler',
    name: 'Aceito — Variante Adler (4.Nf3 Bc5)',
    category: 'Aceito',
    description: 'As Pretas desenvolvem ativamente com ...Ng4 e ...Bc5, recuperando o peão de e5 com jogo fluido.',
    movesSan: ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Nf3', 'Bc5', 'e3', 'Nc6', 'Be2', 'Ngxe5', 'Nxe5', 'Nxe5', 'O-O', 'O-O'],
    keyIdea: 'Use a manobra de elevador da torre (...Re8-e6-g6/h6) para atacar o roque branco!',
    evaluationVerdict: 'Jogo ativo e igualado (0.00)',
  },
  {
    id: 'budapest-smothered-trap',
    name: 'Armadilha do Mate Sufocado (8...Nd3#)',
    category: 'Armadilha',
    description: 'Se as Brancas cobiçarem o bispo preto com a3-axb4??, levam xeque-mate sufocado imediato em d3!',
    movesSan: ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Bf4', 'Nc6', 'Nf3', 'Bb4+', 'Nbd2', 'Qe7', 'a3', 'Ngxe5', 'axb4', 'Nd3#'],
    keyIdea: 'O peão de e2 está cravado pela Dama preta em e7, tornando 8...Nd3# um mate sufocado perfeito!',
    evaluationVerdict: 'MATE SUFOCADO em d3! (Brilhante !!)',
  },
  {
    id: 'budapest-fajarowicz',
    name: 'Variante Fajarowicz (3...Ne4)',
    category: 'Linha Alternativa',
    description: 'Em vez de atacar e5, o cavalo salta para e4 visando armadilhas táticas em b4 e d2.',
    movesSan: ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ne4', 'Nf3', 'Bb4+', 'Nbd2', 'Nc6', 'a3', 'Bxd2+', 'Bxd2', 'Nxd2', 'Qxd2', 'Qe7'],
    keyIdea: 'Recupere o peão em e5 com ...Nxe5 após eliminar o bispo de casas escuras.',
    evaluationVerdict: 'Desenvolvimento rápido (-0.05)',
  },
];

// ============================================================================
// 9. GAMBITO BENKO / VOLGA (PRETAS)
// ============================================================================
const benkoGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'benko-accepted-main',
    name: 'Aceito — Fianchetto e Pressão nas Colunas a/b',
    category: 'Aceito',
    description: 'Sacrifício posicional profundo: as Pretas entregam um peão por pressão eterna nas colunas semi-abertas a e b.',
    movesSan: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5', 'cxb5', 'a6', 'bxa6', 'Bxa6', 'Nc3', 'd6', 'Nf3', 'g6', 'g3', 'Bg7'],
    keyIdea: 'Coloque as torres em b8 e a8, o bispo em g7 e pressione b2 durante todo o meio-jogo e final!',
    evaluationVerdict: 'Compensação posicional de longo prazo (0.00)',
  },
  {
    id: 'benko-b6-return',
    name: 'Semi-Aceito — Devolução 5.b6 Qxb6',
    category: 'Recusado',
    description: 'As Brancas devolvem o peão em b6 para evitar a abertura da coluna a.',
    movesSan: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5', 'cxb5', 'a6', 'b6', 'Qxb6', 'Nc3', 'd6', 'e4', 'g6', 'Nf3', 'Bg7'],
    keyIdea: 'A Dama em b6 e a torre em b8 exercem pressão direta sobre o ponto b2.',
    evaluationVerdict: 'Igualdade confortável das Pretas (0.00)',
  },
];

// ============================================================================
// 10. GAMBITO ENGLUND (PRETAS)
// ============================================================================
const englundGambitDefenses: GambitDefenseLine[] = [
  {
    id: 'englund-mate-trap',
    name: 'Armadilha Clássica — Mate em c1 (8...Qc1#)',
    category: 'Armadilha',
    description: 'Ataque relâmpago com ...Qe7 e ...Qb4+ invadindo b2 e cravando a ala da dama branca!',
    movesSan: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Bc3', 'Bb4', 'Qd2', 'Bxc3', 'Qxc3', 'Qc1#'],
    keyIdea: 'Após 6.Bc3 Bb4!, se as Brancas defenderem com 7.Qd2??, 7...Bxc3 8.Qxc3 Qc1# é xeque-mate!',
    evaluationVerdict: 'XEQUE-MATE na primeira fila! (Armadilha !)',
  },
  {
    id: 'englund-nc3-refutation',
    name: 'Linha Principal Tática (6.Nc3 Bb4 7.Rb1)',
    category: 'Aceito',
    description: 'O teste crítico onde as Brancas jogam 6.Nc3 e 7.Rb1 e as Pretas precisam jogar com precisão cirúrgica.',
    movesSan: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Nc3', 'Bb4', 'Rb1', 'Qa3', 'Nd5', 'Bxd2+'],
    keyIdea: 'Troque em d2 com xeque (...Bxd2+) antes de defender c7 com ...Kd8.',
    evaluationVerdict: 'Posição aguda e desequilibrada (+0.85)',
  },
];

export const GAMBITS_DATABASE: GambitDefinition[] = [
  {
    id: 'kings-gambit',
    name: 'Gambito do Rei',
    subtitle: '1.e4 e5 2.f4 — O ápice do xadrez romântico e tático',
    repertoireColor: 'w',
    eco: 'C30–C39',
    category: 'Agressivo',
    difficulty: 'Intermediário',
    overview:
      'Jogado por Spassky, Bronstein, Nakamura e Carlsen, o Gambito do Rei sacrifica o peão de f4 no segundo lance para desviar o peão central preto de e5, dominar o centro com d4 e abrir a coluna f diretamente contra f7.',
    strategicGoals: [
      'Estabelecer a dupla de peões centrais d4 + e4 com controle de espaço.',
      'Abrir a coluna f após O-O para criar baterias mortais com Tf1, Bc4 e Dama.',
      'Minar a cadeia de peões pretos f4/g5 com a ruptura temática h2-h4.',
    ],
    commonTraps: [
      'Gambito Muzio (5.O-O!): entregar o cavalo de f3 para abrir a coluna f contra o rei no centro.',
      'Permitir ...Qh4+ sem ter jogado Nf3, perdendo o direito ao roque sem compensação preparada.',
    ],
    rootMovesSan: ['e4', 'e5', 'f4'],
    tabiyaFen: computeFenAfterMoves(['e4', 'e5', 'f4']),
    startPositions: buildStartPositions('Gambito do Rei', ['e4', 'e5', 'f4'], ['e4', 'e5', 'f4', 'exf4', 'Nf3']),
    defenses: kingsGambitDefenses,
    tree: buildGambitTree(kingsGambitDefenses, kingsGambitComments),
  },
  {
    id: 'queens-gambit',
    name: 'Gambito da Dama',
    subtitle: '1.d4 d5 2.c4 — Domínio estratégico e precisão clássica',
    repertoireColor: 'w',
    eco: 'D06–D69',
    category: 'Clássico',
    difficulty: 'Iniciante',
    overview:
      'A abertura mais consagrada da elite mundial. As Brancas oferecem o peão de c4 para pressionar imediatamente o centro preto em d5. Caso as Pretas aceitem, cedem o controle central e ficam vulneráveis a armadilhas na ala da dama.',
    strategicGoals: [
      'Pressionar o ponto central d5 com c4 e Nc3.',
      'Recuperar o peão de c4 com desenvolvimento natural do bispo (Bxc4).',
      'Dominar a coluna c aberta com Tc1 e lançar o ataque da minoria.',
    ],
    commonTraps: [
      'Armadilha de 3...b5?!: punida com 4.a4 c6 5.axb5 cxb5 6.Qf3! atacando a torre em a8.',
      'Armadilha de Rubinstein e Elefante na Variante Ortodoxa quando as Pretas tentam ganhar o peão de d4 prematuramente.',
    ],
    rootMovesSan: ['d4', 'd5', 'c4'],
    tabiyaFen: computeFenAfterMoves(['d4', 'd5', 'c4']),
    startPositions: buildStartPositions('Gambito da Dama', ['d4', 'd5', 'c4'], ['d4', 'd5', 'c4', 'dxc4', 'Nf3']),
    defenses: queensGambitDefenses,
    tree: buildGambitTree(queensGambitDefenses, {
      '3:c4': {
        comment: 'Gambito da Dama! Desafia imediatamente o peão central preto de d5.',
        tacticalIdea: 'Se 2...dxc4, as Brancas dominam o centro com e3/e4 e recuperam em c4 com Bxc4.',
        badge: 'critical',
      },
      '11:Qf3': {
        comment: 'GOLPE TÁTICO! A Dama em f3 ataca a Torre indefesa em a8; após ...Nc6, Qxc6+ ganha peça limpa!',
        isTrap: true,
        trapWarning: 'As Pretas perdem uma peça menor ou a Torre de a8!',
        badge: 'brilliant',
      },
    }),
  },
  {
    id: 'evans-gambit',
    name: 'Gambito Evans',
    subtitle: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 — A joia de Morphy e Kasparov',
    repertoireColor: 'w',
    eco: 'C51–C52',
    category: 'Agressivo',
    difficulty: 'Intermediário',
    overview:
      'Criado pelo Capitão William Davies Evans e imortalizado por Paul Morphy e Garry Kasparov, o lance 4.b4! sacrifica um peão lateral para ganhar dois tempos preciosos (c3 e d4), abrindo as diagonais a3-f8 e a2-g8.',
    strategicGoals: [
      'Ganhar tempo sobre o bispo preto com c3 e construir o centro ideal d4 + e4.',
      'Colocar o bispo de casas escuras em a3 impedindo o roque das Pretas.',
      'Criar a bateria Qb3 + Bc4 contra o ponto vulnerável f7.',
    ],
    commonTraps: [
      'Bateria Qb3 + Bc4 combinada com Bxf7+ e Ng5 contra o rei preto no centro.',
      'Cravada na coluna e com Te1 quando o rei preto atrasa o roque.',
    ],
    rootMovesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'],
    tabiyaFen: computeFenAfterMoves(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4']),
    startPositions: buildStartPositions(
      'Gambito Evans',
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3']
    ),
    defenses: evansGambitDefenses,
    tree: buildGambitTree(evansGambitDefenses, {
      '7:b4': {
        comment: 'Gambito Evans! Desvia o bispo de c5 para que as Brancas joguem c3 e d4 com ganho de tempo.',
        badge: 'brilliant',
      },
    }),
  },
  {
    id: 'danish-gambit',
    name: 'Gambito Dinamarquês',
    subtitle: '1.e4 e5 2.d4 exd4 3.c3 — Os dois bispos apontados para o Rei',
    repertoireColor: 'w',
    eco: 'C21',
    category: 'Tático',
    difficulty: 'Intermediário',
    overview:
      'As Brancas sacrificam até dois peões (d4 e c3) para desenvolver os dois bispos em c4 e b2 nas diagonais mais longas do tabuleiro, mirando f7 e g7 antes que as Pretas consigam desenvolver uma única peça.',
    strategicGoals: [
      'Instalar os bispos gêmeos em c4 e b2 cortando toda a ala do rei preta.',
      'Explorar o ponto f7 e g7 com Qb3 e Ne2-f4.',
      'Conhecer a reação à Defesa Schlechter (5...d5!).',
    ],
    commonTraps: [
      'Sacrifício Bxf7+ seguido de Qb3+ ganhando o bispo solto em b4 ou g7.',
    ],
    rootMovesSan: ['e4', 'e5', 'd4', 'exd4', 'c3'],
    tabiyaFen: computeFenAfterMoves(['e4', 'e5', 'd4', 'exd4', 'c3']),
    startPositions: buildStartPositions(
      'Gambito Dinamarquês',
      ['e4', 'e5', 'd4', 'exd4', 'c3'],
      ['e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2']
    ),
    defenses: danishGambitDefenses,
    tree: buildGambitTree(danishGambitDefenses, {}),
  },
  {
    id: 'scotch-gambit',
    name: 'Gambito Escocês & Göring',
    subtitle: '1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Bc4 — Pressão imediata em f7',
    repertoireColor: 'w',
    eco: 'C44',
    category: 'Tático',
    difficulty: 'Intermediário',
    overview:
      'Em vez de recapturar imediatamente em d4 na Abertura Escocesa, as Brancas desenvolvem 4.Bc4 mirando f7 ou jogam 4.c3 (Gambito Göring), acelerando o roque e abrindo a coluna e para ataques diretos.',
    strategicGoals: [
      'Acelerar o roque curto e colocar a torre em e1 antes que o rei preto saia do centro.',
      'Pressionar d5 e f7 com o avanço temático e4-e5.',
    ],
    commonTraps: [
      'Ataque Max Lange: infiltração em f7 e g7 após e5 e exf6.',
    ],
    rootMovesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4'],
    tabiyaFen: computeFenAfterMoves(['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4']),
    startPositions: buildStartPositions(
      'Gambito Escocês',
      ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4', 'Nf6', 'O-O']
    ),
    defenses: scotchGambitDefenses,
    tree: buildGambitTree(scotchGambitDefenses, {}),
  },
  {
    id: 'smith-morra-gambit',
    name: 'Gambito Smith-Morra (vs Siciliana)',
    subtitle: '1.e4 c5 2.d4 cxd4 3.c3 — Destruindo a Defesa Siciliana pela força',
    repertoireColor: 'w',
    eco: 'B21',
    category: 'Agressivo',
    difficulty: 'Avançado',
    overview:
      'A arma mais agressiva contra a Defesa Siciliana (1...c5). As Brancas sacrificam o peão de c3 para abrir as colunas c e d, colocar o cavalo em c3 e lançar sacrifícios explosivos em d5, e6 e f7.',
    strategicGoals: [
      'Domínio total das colunas abertas c e d com Tc1 e Td1.',
      'Preparar os sacrifícios temáticos Nd5! e Bxe6! contra o rei preto no centro.',
      'Evitar a Armadilha Siberiana jogando Nb5 ou a3 antes de h3.',
    ],
    commonTraps: [
      'Armadilha Siberiana (8...Ng4 e 9...Nd4!) se as Brancas jogarem 9.h3?? descuidadamente.',
      'Sacrifício Nd5! abrindo a coluna e contra a dama e o rei pretos.',
    ],
    rootMovesSan: ['e4', 'c5', 'd4', 'cxd4', 'c3'],
    tabiyaFen: computeFenAfterMoves(['e4', 'c5', 'd4', 'cxd4', 'c3']),
    startPositions: buildStartPositions(
      'Gambito Smith-Morra',
      ['e4', 'c5', 'd4', 'cxd4', 'c3'],
      ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3']
    ),
    defenses: smithMorraDefenses,
    tree: buildGambitTree(smithMorraDefenses, {}),
  },
  {
    id: 'stafford-gambit',
    name: 'Gambito Stafford (Pretas)',
    subtitle: '1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 — O arsenal supremo de armadilhas',
    repertoireColor: 'b',
    eco: 'C42',
    category: 'Armadilha',
    difficulty: 'Intermediário',
    overview:
      'Popularizado por Eric Rosen, o Gambito Stafford surge da Defesa Petroff após 3.Nxe5 Nc6!? 4.Nxc6 dxc6. As Pretas sacrificam um peão central, mas abrem as diagonais para os dois bispos e criam inúmeras armadilhas mortais contra f2 e d1!',
    strategicGoals: [
      'Desenvolver rapidamente ...Bc5 apontando para f2.',
      'Explorar cravadas na diagonal h5-d1 com ...Bg4 e saltos de cavalo ...Nxe4 ou ...Ng4.',
      'Lançar o avanço ...h5 seguido de ...Ng4 para abrir a coluna h.',
    ],
    commonTraps: [
      '"Oh No My Queen!" (6.Bg5?! Nxe4!! 7.Bxd8 Bxf2+ 8.Ke2 Bg4#).',
      'Ataque ...Ng4 + ...Qh4 contra o roque curto branco.',
    ],
    rootMovesSan: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6'],
    tabiyaFen: computeFenAfterMoves(['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6']),
    startPositions: buildStartPositions(
      'Gambito Stafford',
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6'],
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5']
    ),
    defenses: staffordGambitDefenses,
    tree: buildGambitTree(staffordGambitDefenses, {
      '12:Nxe4': {
        comment: 'OH NO MY QUEEN!! As Pretas entregam a Dama em d8 para aplicar xeque-mate forçado com Bxf2+ e Bg4#!',
        isTrap: true,
        trapWarning: 'Se 7.Bxd8, segue 7...Bxf2+ 8.Ke2 Bg4# XEQUE-MATE!',
        badge: 'brilliant',
      },
    }),
  },
  {
    id: 'budapest-gambit',
    name: 'Gambito Budapeste (Pretas)',
    subtitle: '1.d4 Nf6 2.c4 e5 — Contra-ataque energético contra 1.d4',
    repertoireColor: 'b',
    eco: 'A51–A52',
    category: 'Contra-Ataque',
    difficulty: 'Intermediário',
    overview:
      'Para jogadores de Pretas que querem dinamismo imediato contra 1.d4. Com 2...e5!, as Pretas quebram o centro branco, ganham tempos com o cavalo em g4 ou e4 e contam com armadilhas clássicas de mate sufocado.',
    strategicGoals: [
      'Cercar e recuperar o peão avançado de e5 com ...Ng4, ...Bc5 e ...Nc6.',
      'Usar a manobra ...Re8-e6-g6 para atacar o rei branco caso recupere o peão.',
      'Punir o avanço descuidado a3-axb4 com o mate sufocado ...Nd3#.',
    ],
    commonTraps: [
      'Mate Sufocado em d3 (8.axb4?? Nd3#) com o peão de e2 cravado pela Dama em e7.',
    ],
    rootMovesSan: ['d4', 'Nf6', 'c4', 'e5'],
    tabiyaFen: computeFenAfterMoves(['d4', 'Nf6', 'c4', 'e5']),
    startPositions: buildStartPositions(
      'Gambito Budapeste',
      ['d4', 'Nf6', 'c4', 'e5'],
      ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4']
    ),
    defenses: budapestGambitDefenses,
    tree: buildGambitTree(budapestGambitDefenses, {}),
  },
  {
    id: 'benko-gambit',
    name: 'Gambito Benko / Volga (Pretas)',
    subtitle: '1.d4 Nf6 2.c4 c5 3.d5 b5 — Sacrifício posicional de Grande Mestre',
    repertoireColor: 'b',
    eco: 'A57–A59',
    category: 'Clássico',
    difficulty: 'Avançado',
    overview:
      'Diferente dos gambitos puramente táticos, o Gambito Benko sacrifica um peão na ala da dama (3...b5 e 4...a6) por pressão posicional duradoura nas colunas a e b e na grande diagonal h8-a1 — uma pressão que persiste até mesmo nos finais!',
    strategicGoals: [
      'Abrir as colunas a e b para as Torres pretas e o Bispo de a6.',
      'Controlar a grande diagonal com ...g6 e ...Bg7.',
      'Trocar o bispo de casas claras das Brancas com ...Bxf1 para deixar o rei branco sem roque.',
    ],
    commonTraps: [
      'Infiltração de cavalo em d3 (...Ne5-d3) combinada com pressão em b2.',
    ],
    rootMovesSan: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5'],
    tabiyaFen: computeFenAfterMoves(['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5']),
    startPositions: buildStartPositions(
      'Gambito Benko',
      ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5'],
      ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5', 'cxb5', 'a6']
    ),
    defenses: benkoGambitDefenses,
    tree: buildGambitTree(benkoGambitDefenses, {}),
  },
  {
    id: 'englund-gambit',
    name: 'Gambito Englund (Pretas)',
    subtitle: '1.d4 e5 — Caos tático imediato no lance 1',
    repertoireColor: 'b',
    eco: 'A40',
    category: 'Armadilha',
    difficulty: 'Iniciante',
    overview:
      'Uma surpresa explosiva no primeiro lance contra 1.d4. As Pretas sacrificam o peão de e5 para lançar a Dama em b4+, capturar em b2 e montar uma rede de cravadas mortais na ala da dama.',
    strategicGoals: [
      'Forçar o bispo branco a voltar para d2/c3 após ...Qb4+ e ...Qxb2.',
      'Cravar o bispo em c3 com ...Bb4!, ameaçando ...Bxc3 e ...Qc1#.',
    ],
    commonTraps: [
      '7.Qd2?? Bxc3 8.Qxc3 Qc1# — Xeque-mate em 8 lances na primeira fila!',
    ],
    rootMovesSan: ['d4', 'e5', 'dxe5', 'Nc6'],
    tabiyaFen: computeFenAfterMoves(['d4', 'e5', 'dxe5', 'Nc6']),
    startPositions: buildStartPositions(
      'Gambito Englund',
      ['d4', 'e5', 'dxe5', 'Nc6'],
      ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+']
    ),
    defenses: englundGambitDefenses,
    tree: buildGambitTree(englundGambitDefenses, {}),
  },
];
