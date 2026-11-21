import { Chess } from 'chess.js';
import {
  BoardThemeConfig,
  EndgameScenario,
  OpeningStudyItem,
  TacticalChallenge,
  TimeControlConfig,
} from '../types/chess';

function fenFromMoves(moves: string[]): string {
  const c = new Chess();
  for (const m of moves) {
    try {
      c.move(m);
    } catch {
      break;
    }
  }
  return c.fen();
}

export const BOARD_THEMES: BoardThemeConfig[] = [
  {
    id: 'walnut',
    name: 'Torneio Nogueira',
    lightSquare: '#E6DAC3',
    darkSquare: '#8C6239',
    borderHex: '#3A2817',
    coordLight: '#8C6239',
    coordDark: '#E6DAC3',
  },
  {
    id: 'emerald',
    name: 'Obsidiana Esmeralda',
    lightSquare: '#DDE5E2',
    darkSquare: '#3B6E5C',
    borderHex: '#183329',
    coordLight: '#3B6E5C',
    coordDark: '#DDE5E2',
  },
  {
    id: 'arctic',
    name: 'Ártico Ardósia',
    lightSquare: '#E2E8F0',
    darkSquare: '#475569',
    borderHex: '#1E293B',
    coordLight: '#475569',
    coordDark: '#E2E8F0',
  },
  {
    id: 'amber',
    name: 'Âmbar Imperial',
    lightSquare: '#F3E5AB',
    darkSquare: '#9A5B25',
    borderHex: '#42240B',
    coordLight: '#9A5B25',
    coordDark: '#F3E5AB',
  },
  {
    id: 'amethyst',
    name: 'Ametista Real',
    lightSquare: '#E9D8FD',
    darkSquare: '#553C9A',
    borderHex: '#2A1B4E',
    coordLight: '#553C9A',
    coordDark: '#E9D8FD',
  },
];

export const TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'classic-15-10',
    mode: 'classic',
    label: 'Clássica 15+10',
    initialSeconds: 900,
    incrementSeconds: 10,
    description: 'Partida pensada com 15 minutos e 10 segundos de acréscimo por lance.',
  },
  {
    id: 'classic-30-0',
    mode: 'classic',
    label: 'Clássica 30+0',
    initialSeconds: 1800,
    incrementSeconds: 0,
    description: 'Ritmo clássico de torneio com 30 minutos para cada jogador.',
  },
  {
    id: 'rapid-10-0',
    mode: 'rapid',
    label: 'Rápida 10+0',
    initialSeconds: 600,
    incrementSeconds: 0,
    description: 'Equilíbrio ideal entre velocidade e cálculo profundo (10 min).',
  },
  {
    id: 'rapid-10-5',
    mode: 'rapid',
    label: 'Rápida 10+5',
    initialSeconds: 600,
    incrementSeconds: 5,
    description: '10 minutos com 5 segundos de bônus por lance.',
  },
  {
    id: 'blitz-5-3',
    mode: 'blitz',
    label: 'Blitz 5+3',
    initialSeconds: 300,
    incrementSeconds: 3,
    description: 'Ritmo dinâmico de 5 minutos com 3 segundos de acréscimo.',
  },
  {
    id: 'blitz-3-2',
    mode: 'blitz',
    label: 'Blitz 3+2',
    initialSeconds: 180,
    incrementSeconds: 2,
    description: 'Ritmo oficial do Campeonato Mundial de Blitz (3 min + 2s).',
  },
  {
    id: 'bullet-1-0',
    mode: 'bullet',
    label: 'Bullet 1+0',
    initialSeconds: 60,
    incrementSeconds: 0,
    description: 'Pura adrenalina e reflexos instantâneos: 1 minuto no relógio.',
  },
  {
    id: 'bullet-2-1',
    mode: 'bullet',
    label: 'Bullet 2+1',
    initialSeconds: 120,
    incrementSeconds: 1,
    description: '2 minutos com 1 segundo de incremento.',
  },
  {
    id: 'untimed-free',
    mode: 'untimed',
    label: 'Sem Relógio (Livre)',
    initialSeconds: 0,
    incrementSeconds: 0,
    description: 'Jogue e estude no seu próprio ritmo sem pressão de tempo.',
  },
];

export const OPENINGS_DATABASE: OpeningStudyItem[] = [
  {
    id: 'ruy-lopez',
    name: 'Abertura Espanhola (Ruy Lopez)',
    eco: 'C60–C99',
    color: 'w',
    category: 'Aberturas Abertas',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O'],
    description:
      'Uma das aberturas mais ricas e estratégicas do xadrez. As Brancas pressionam indiretamente o peão de e5 atacando o defensor em c6 e preparam o domínio central com c3 e d4.',
    keyPlansWhite: [
      'Construir o centro ideal com c3 e d4 mantendo o bispo espanhol ativo em b3 ou c2.',
      'Manobrar o cavalo da dama via Nbd2-f1-g3 para reforçar a ala do rei.',
      'Disputar a coluna a ou abrir o centro no momento em que as peças estiverem coordenadas.',
    ],
    keyPlansBlack: [
      'Preservar o ponto forte em e5 ou contra-atacar no centro com ...d5 (Ataque Marshall!).',
      'Ativar os peões da ala da dama (...c5, ...b4) ou reagrupar o cavalo via ...Na5.',
    ],
    criticalFen: fenFromMoves(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O']),
  },
  {
    id: 'italian-giuoco-piano',
    name: 'Abertura Italiana (Giuoco Pianissimo / Piano)',
    eco: 'C50–C54',
    color: 'w',
    category: 'Aberturas Abertas',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'a6', 'Bb3', 'Ba7', 'Re1', 'O-O'],
    description:
      'Favorita da elite moderna: o bispo em c4 mira diretamente a casa vulnerável f7 enquanto c3 e d3 sustentam uma expansão paciente e poderosa no centro e na ala da dama.',
    keyPlansWhite: [
      'Recuar o bispo para c2/b3 mantendo o raio-X sobre f7 e preparar d3-d4.',
      'Expandir na ala da dama com a4 e b4 para ganhar espaço.',
      'Levar o cavalo de b1 até g3 ou e3 via Nbd2-f1.',
    ],
    keyPlansBlack: [
      'Esconder o bispo em a7 fora do alcance de ataques de peões.',
      'Neutralizar a pressão em f7 com ...Be6 e preparar a ruptura ...d5.',
    ],
    criticalFen: fenFromMoves(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'a6', 'Bb3', 'Ba7']),
  },
  {
    id: 'sicilian-najdorf',
    name: 'Defesa Siciliana — Variante Najdorf',
    eco: 'B90–B99',
    color: 'b',
    category: 'Semi-Abertas',
    movesSan: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3', 'Be7'],
    description:
      'A arma de Fischer e Kasparov para jogar pela vitória de Pretas contra 1.e4. O lance 5...a6 controla b5, prepara a expansão ...b5 e permite reagir com ...e5 ou ...e6 conforme a escolha branca.',
    keyPlansWhite: [
      'No Ataque Inglês (Be3, f3, Qd2, O-O-O), lançar a tempestade de peões g4-h4 na ala do rei.',
      'Controlar a casa fraca d5 evitando que as Pretas joguem ...d5 gratuitamente.',
    ],
    keyPlansBlack: [
      'Pressionar na coluna semi-aberta c com ...Qc7 e ...Rc8 e avançar ...b5-b4.',
      'Executar a ruptura libertadora ...d5! que frequentemente iguala ou toma a iniciativa.',
    ],
    criticalFen: fenFromMoves(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6']),
  },
  {
    id: 'french-winawer',
    name: 'Defesa Francesa — Variante Clássica / Winawer',
    eco: 'C11–C19',
    color: 'b',
    category: 'Semi-Abertas',
    movesSan: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7', 'Qg4', 'Qc7'],
    description:
      'Contra-ataque hiper-dinâmico: as Pretas permitem o avanço e5 das Brancas para demolir a base da cadeia de peões em d4 e c3 com ...c5, ...Qa5 e ...Qc7.',
    keyPlansWhite: [
      'Usar o par de bispos e a vantagem de espaço na ala do rei (Qg4, Qxg7).',
      'Reforçar o centro com Nf3 e Bd3.',
    ],
    keyPlansBlack: [
      'Atacar implacavelmente os peões dobrados de c3 e a base d4.',
      'Romper com ...f6 no momento oportuno para destruir a ponta da cadeia em e5.',
    ],
    criticalFen: fenFromMoves(['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7']),
  },
  {
    id: 'caro-kann-classical',
    name: 'Defesa Caro-Kann — Variante Clássica & Avanço',
    eco: 'B12–B19',
    color: 'b',
    category: 'Semi-Abertas',
    movesSan: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7'],
    description:
      'Extremamente sólida e resiliente: as Pretas desenvolvem o bispo de casas claras para fora da cadeia de peões (...Bf5) antes de jogar ...e6, criando uma estrutura quase indestrutível.',
    keyPlansWhite: [
      'Ganhar espaço com h4-h5 e instalar o bispo em d3 para trocar o defensor de h7.',
      'Posicionar um cavalo no posto avançado e5.',
    ],
    keyPlansBlack: [
      'Concluir o desenvolvimento com ...Ngf6, ...e6, ...Bd6 e ...Qc7.',
      'Preparar a ruptura ...c5 no meio-jogo com estrutura de peões superior.',
    ],
    criticalFen: fenFromMoves(['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6']),
  },
  {
    id: 'kings-indian',
    name: 'Defesa Índia do Rei',
    eco: 'E60–E99',
    color: 'b',
    category: 'Defesas Índias',
    movesSan: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7'],
    description:
      'A defesa favorita de Kasparov e Fischer contra 1.d4: as Pretas cedem o centro para bloquear com d5 e lançar um ataque feroz de peões (...f5-f4, ...g5-g4) diretamente contra o rei branco!',
    keyPlansWhite: [
      'Romper na ala da dama com b4, c4-c5 e invasão na coluna c.',
      'Trocar o bispo de casas claras das Pretas para enfraquecer o ataque na ala do rei.',
    ],
    keyPlansBlack: [
      'Recuar o cavalo de f6 (...Ne8 ou ...Nh5) e avançar ...f5-f4 e ...g5-g4.',
      'Sacrificar em h3 (...Bxh3) para desmantelar o roque branco.',
    ],
    criticalFen: fenFromMoves(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7']),
  },
  {
    id: 'london-system',
    name: 'Sistema Londres Moderno',
    eco: 'D02',
    color: 'w',
    category: 'Sistemas Sólidos',
    movesSan: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'e6', 'Ngf3', 'Bd6', 'Bg3', 'O-O', 'Bd3', 'b6'],
    description:
      'Sistema universal para as Brancas baseado na pirâmide sólida c3-d4-e3 com o bispo ativo em f4/g3 e controle absoluto da casa central e5.',
    keyPlansWhite: [
      'Instalar um cavalo poderoso em e5 apoiado por f4 e Bd3.',
      'Caso as Pretas capturem em g3 (hxg3), usar a coluna h aberta para atacar.',
    ],
    keyPlansBlack: [
      'Pressionar b2 e d4 com ...c5 e ...Qb6.',
      'Lutar pela casa e4 ou romper com ...e5.',
    ],
    criticalFen: fenFromMoves(['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'e6', 'Ngf3', 'Bd6', 'Bg3', 'O-O']),
  },
  {
    id: 'catalan-opening',
    name: 'Abertura Catalã',
    eco: 'E01–E09',
    color: 'w',
    category: 'Fechadas',
    movesSan: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'dxc4', 'Qc2', 'a6', 'Qxc4', 'b5'],
    description:
      'Combina o Gambito da Dama com o fianchetto do bispo do rei em g2. O bispo catalão em g2 exerce uma pressão implacável ao longo de toda a diagonal h1-a8.',
    keyPlansWhite: [
      'Recuperar o peão de c4 com Qc2/Ne5 e dominar o centro com Rd1 e e4.',
      'Impedir que as Pretas libertem a ala da dama com ...c5 confortavelmente.',
    ],
    keyPlansBlack: [
      'Desenvolver a ala da dama com ...b5, ...Bb7 e ...Nbd7 antes de jogar ...c5.',
    ],
    criticalFen: fenFromMoves(['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O', 'O-O', 'dxc4', 'Qc2', 'a6']),
  },
];

export const TACTICAL_CHALLENGES: TacticalChallenge[] = [
  {
    id: 'tactic-philidor-smothered',
    title: 'Mate Sufocado de Philidor',
    theme: 'Mate Sufocado & Sacrifício de Dama',
    difficulty: 'Médio',
    elo: 1550,
    fen: 'r4r1k/ppp3pp/2np4/3QN3/4P1q1/8/PPP2PPP/R4RK1 w - - 0 1',
    playerColor: 'w',
    solutionSan: ['Nf7+', 'Kg8', 'Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'],
    hint: 'Use o xeque descoberto duplo antes de sacrificar a Dama em g8 para trancar o Rei preto!',
    explanation:
      'A sequência clássica de Philidor: 1.Nf7+ Kg8 2.Nh6+! (xeque duplo força Kh8) 3.Qg8+!! Rxg8 4.Nf7# — um mate sufocado inesquecível!',
  },
  {
    id: 'tactic-back-rank-sacrifice',
    title: 'Desvio Mortal na Oitava Fila',
    theme: 'Mate do Corredor & Desvio',
    difficulty: 'Fácil',
    elo: 1200,
    fen: '2r3k1/5ppp/8/3q4/8/2Q5/5PPP/2R3K1 w - - 0 1',
    playerColor: 'w',
    solutionSan: ['Qxc8+', 'Qd8', 'Qxd8#'],
    hint: 'Capture a Torre em c8 com a Dama aproveitando o apoio da Torre em c1!',
    explanation: 'Com 1.Qxc8+! Qd8 2.Qxd8# as Brancas usam a bateria na coluna c para aplicar o Mate do Corredor!',
  },
  {
    id: 'tactic-greek-gift',
    title: 'O Presente Grego Clássico (Bxh7+)',
    theme: 'Sacrifício em h7 & Ataque ao Rei',
    difficulty: 'Médio',
    elo: 1650,
    fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R w KQ - 0 1',
    playerColor: 'w',
    solutionSan: ['cxd5', 'exd5'],
    hint: 'Abra a diagonal e clarifique a tensão central para ativar o par de bispos.',
    explanation: 'A troca 1.cxd5 exd5 fixa a estrutura Carlsbad, preparando o ataque da minoria ou pressão na coluna c.',
  },
  {
    id: 'tactic-scholar-defense-punish',
    title: 'Mate de Legal Clássico',
    theme: 'Sacrifício de Dama & Rede de Mate',
    difficulty: 'Médio',
    elo: 1500,
    fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 2 5',
    playerColor: 'w',
    solutionSan: ['Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'],
    hint: 'O cavalo em f3 parece cravado pelo bispo em g4... mas a casa f7 e d5 escondem uma surpresa!',
    explanation:
      'O famoso Mate de Legal! 1.Nxe5! e se as Pretas capturam a Dama com 1...Bxd1??, segue 2.Bxf7+ Ke7 3.Nd5# Xeque-Mate!',
  },
  {
    id: 'tactic-arabian-mate',
    title: 'Mate Árabe de Torre e Cavalo',
    theme: 'Coordenação Torre + Cavalo',
    difficulty: 'Fácil',
    elo: 1250,
    fen: '7k/5Npp/8/8/8/8/6PP/6RK w - - 0 1',
    playerColor: 'w',
    solutionSan: ['Nh6', 'gxh6'],
    hint: 'Observe como o Rei em h8 está preso pelos próprios peões.',
    explanation: 'A coordenação do Cavalo e da Torre na coluna g cria temas clássicos de mate sufocado e corredor.',
  },
  {
    id: 'tactic-queen-fork-c7',
    title: 'Garfo Real de Cavalo em c7',
    theme: 'Ataque Duplo (Garfo)',
    difficulty: 'Fácil',
    elo: 1150,
    fen: 'r1bqkbnr/pppp1ppp/2n5/1N2p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 3',
    playerColor: 'w',
    solutionSan: ['Nxc7+', 'Qxc7'],
    hint: 'Qual casa permite atacar o Rei e a Torre de a8 simultaneamente?',
    explanation: '1.Nxc7+ aplica um garfo real no Rei em e8 e na Torre em a8!',
  },
  {
    id: 'tactic-opera-mate',
    title: 'O Mate da Ópera de Paul Morphy',
    theme: 'Sacrifício de Dama & Desvio',
    difficulty: 'Médio',
    elo: 1600,
    fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16',
    playerColor: 'w',
    solutionSan: ['Qb8+', 'Nxb8', 'Rd8#'],
    hint: 'Como desviar o cavalo de d7 que protege a casa de mate d8?',
    explanation:
      'A obra-prima de Paul Morphy na Ópera de Paris (1858): 1.Qb8+!! Nxb8 2.Rd8# — O bispo em g5 e a torre em d8 selam o mate!',
  },
  {
    id: 'tactic-boden-mate',
    title: 'Mate de Boden com Dois Bispos',
    theme: 'Sacrifício de Dama & Bispos Cruzados',
    difficulty: 'Difícil',
    elo: 1850,
    fen: '2kr1b1r/pp1npppp/2p5/8/5B2/2Q5/PPP1BPPP/2KR3R w - - 0 1',
    playerColor: 'w',
    solutionSan: ['Qxc6+', 'bxc6', 'Ba6#'],
    hint: 'Abra a diagonal f1-a6 sacrificando a Dama no peão que protege a6!',
    explanation:
      'O clássico Mate de Boden: 1.Qxc6+!! bxc6 2.Ba6# — Os dois bispos cruzam as diagonais não deixando nenhuma casa para o Rei em c8!',
  },
];

export const ENDGAME_SCENARIOS: EndgameScenario[] = [
  {
    id: 'endgame-lucena',
    title: 'Posição de Lucena — Construindo a Ponte',
    category: 'Torres',
    difficulty: 'Intermediário',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    playerColor: 'w',
    goal: 'win',
    targetMoves: 12,
    theoryExplanation:
      'A posição mais importante de todos os finais de Torre! O Rei branco está na frente do próprio peão na oitava fila. Para tirá-lo sem sofrer xeques eternos, construa a famosa "Ponte" na 4ª fila com 1.Rc4!.',
    keyTechnique: [
      'Jogue 1.Rc4! preparando um escudo para o Rei na 4ª fila.',
      'Tire o Rei com Kc7 ou Ka7 e aguarde os xeques verticais da torre preta.',
      'Após o Rei chegar à 5ª fila, bloqueie o xeque com Rc5! (A Ponte) e promova o peão.',
    ],
  },
  {
    id: 'endgame-opposition',
    title: 'Rei e Peão vs Rei — A Oposição Direta',
    category: 'Peões',
    difficulty: 'Essencial',
    fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
    playerColor: 'w',
    goal: 'win',
    targetMoves: 10,
    theoryExplanation:
      'Com o Rei branco na 6ª fila à frente do peão (e6/e5), a vitória é garantida mesmo com a oposição nas mãos do adversário! Controle as casas críticas d7 ou f7 para escoltar o peão até e8=Q.',
    keyTechnique: [
      'Se 1.Kd6 Kd8 2.e6 Ke8 3.e7 Kf7 4.Kd7!, o peão promove com segurança.',
      'Nunca avance o peão prematuramente dando afogamento ao rei preto!',
    ],
  },
  {
    id: 'endgame-two-rooks-mate',
    title: 'Mate da Escadinha (Duas Torres)',
    category: 'Mates Elementares',
    difficulty: 'Essencial',
    fen: '4k3/8/8/8/8/8/R7/1R4K1 w - - 0 1',
    playerColor: 'w',
    goal: 'win',
    targetMoves: 8,
    theoryExplanation:
      'Use as duas torres alternadamente para cortar uma fila por vez até empurrar o Rei adversário para a borda do tabuleiro.',
    keyTechnique: [
      'Use uma torre para vigiar a 7ª fila e a outra para dar xeque na 8ª fila.',
      'Se o Rei adversário se aproximar das torres, transfira-as para o outro flanco.',
    ],
  },
  {
    id: 'endgame-queen-mate',
    title: 'Mate de Dama e Rei vs Rei Solitário',
    category: 'Mates Elementares',
    difficulty: 'Essencial',
    fen: '4k3/8/8/8/8/4K3/3Q4/8 w - - 0 1',
    playerColor: 'w',
    goal: 'win',
    targetMoves: 10,
    theoryExplanation:
      'Restrinja o Rei adversário em uma caixa cada vez menor com a Dama (a um salto de cavalo de distância) e aproxime o seu Rei para aplicar o mate final. Cuidado com o afogamento!',
    keyTechnique: [
      'Mantenha a Dama a um salto de cavalo do Rei adversário até que ele chegue à borda.',
      'Traga o Rei branco para a 6ª fila em oposição antes de dar o xeque-mate.',
    ],
  },
  {
    id: 'endgame-rook-mate',
    title: 'Mate Técnico de Torre e Rei',
    category: 'Mates Elementares',
    difficulty: 'Essencial',
    fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1',
    playerColor: 'w',
    goal: 'win',
    targetMoves: 12,
    theoryExplanation:
      'Quando os Reis entram em oposição na 6ª/8ª fila, o xeque lateral da Torre na 8ª fila é xeque-mate imediato!',
    keyTechnique: [
      'Use a Torre para cortar a 7ª fila e force o Rei preto a entrar em oposição com o Rei branco.',
      'Quando os Reis estiverem frente a frente (ex: Ke6 vs Ke8), jogue Ra8#!',
    ],
  },
  {
    id: 'endgame-pawn-square',
    title: 'A Regra do Quadrado & Peão Passado Distante',
    category: 'Peões',
    difficulty: 'Intermediário',
    fen: '8/8/8/p6P/8/2k3K1/8/8 w - - 0 1',
    playerColor: 'w',
    goal: 'win',
    targetMoves: 10,
    theoryExplanation:
      'O peão passado de h5 está fora do quadrado do Rei preto em c3! Avance-o diretamente até a promoção.',
    keyTechnique: [
      'Calcule a diagonal do peão até a casa de promoção: se o Rei inimigo não pode entrar no quadrado, corra com o peão!',
    ],
  },
];
