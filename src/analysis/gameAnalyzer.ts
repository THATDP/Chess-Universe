import { Chess } from 'chess.js';
import {
  DecisiveMoment,
  GameAnalysisReport,
  MoveClassification,
  RecordedMove,
} from '../types/chess';

const PIECE_VAL: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const CENTER_SQUARES = new Set(['d4', 'e4', 'd5', 'e5']);
const EXTENDED_CENTER = new Set(['c3', 'd3', 'e3', 'f3', 'c4', 'f4', 'c5', 'f5', 'c6', 'd6', 'e6', 'f6']);

/**
 * Fast static + 2-ply tactical evaluator for instant or batch position evaluation
 * when analyzing full games move-by-move without blocking the UI.
 */
export function evaluateFenFast(fen: string): {
  evalCp: number;
  mate: number | null;
  bestMoveSan: string;
  bestMoveUci: string;
  bestLineSan: string[];
} {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) {
    const turn = chess.turn();
    return {
      evalCp: turn === 'w' ? -9900 : 9900,
      mate: turn === 'w' ? -1 : 1,
      bestMoveSan: '',
      bestMoveUci: '',
      bestLineSan: [],
    };
  }
  if (chess.isDraw()) {
    return {
      evalCp: 0,
      mate: null,
      bestMoveSan: '',
      bestMoveUci: '',
      bestLineSan: [],
    };
  }

  const staticEval = (c: Chess): number => {
    if (c.isCheckmate()) {
      return c.turn() === 'w' ? -9500 : 9500;
    }
    if (c.isDraw()) return 0;

    const board = c.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (!p) continue;
        let val = PIECE_VAL[p.type] || 0;
        const sq = p.square;
        if (CENTER_SQUARES.has(sq)) val += p.type === 'p' ? 28 : 24;
        else if (EXTENDED_CENTER.has(sq)) val += 12;

        // Advancement bonus for pawns
        if (p.type === 'p') {
          const rankAdv = p.color === 'w' ? 6 - r : r - 1;
          val += rankAdv * 9;
        }
        // King safety castled bonus
        if (p.type === 'k') {
          if (sq === 'g1' || sq === 'c1' || sq === 'g8' || sq === 'c8') {
            val += 35;
          }
        }
        score += p.color === 'w' ? val : -val;
      }
    }
    return score;
  };

  const turn = chess.turn();
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) {
    return {
      evalCp: staticEval(chess),
      mate: null,
      bestMoveSan: '',
      bestMoveUci: '',
      bestLineSan: [],
    };
  }

  let bestScoreForMover = -999999;
  let bestMove = legal[0];
  let bestReplySan = '';

  for (const m of legal) {
    chess.move(m);
    if (chess.isCheckmate()) {
      chess.undo();
      return {
        evalCp: turn === 'w' ? 9800 : -9800,
        mate: turn === 'w' ? 1 : -1,
        bestMoveSan: m.san,
        bestMoveUci: `${m.from}${m.to}${m.promotion || ''}`,
        bestLineSan: [m.san],
      };
    }

    // Check opponent's strongest tactical reply (1-ply quiescence/response)
    const oppMoves = chess.moves({ verbose: true });
    let worstForMover = turn === 'w' ? staticEval(chess) : -staticEval(chess);
    let topReply = '';

    // Inspect captures and checks plus top positional replies
    const priorityReplies = oppMoves
      .filter((om) => om.captured || om.san.includes('+'))
      .slice(0, 6);
    const sampleReplies = priorityReplies.length > 0 ? priorityReplies : oppMoves.slice(0, 5);

    for (const rMove of sampleReplies) {
      chess.move(rMove);
      const sc = turn === 'w' ? staticEval(chess) : -staticEval(chess);
      if (sc < worstForMover) {
        worstForMover = sc;
        topReply = rMove.san;
      }
      chess.undo();
    }

    if (worstForMover > bestScoreForMover) {
      bestScoreForMover = worstForMover;
      bestMove = m;
      bestReplySan = topReply;
    }

    chess.undo();
  }

  const whiteEvalCp = turn === 'w' ? bestScoreForMover : -bestScoreForMover;
  const line = bestReplySan ? [bestMove.san, bestReplySan] : [bestMove.san];

  return {
    evalCp: whiteEvalCp,
    mate: null,
    bestMoveSan: bestMove.san,
    bestMoveUci: `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}`,
    bestLineSan: line,
  };
}

function cpToWinProbability(cp: number): number {
  const clamped = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

export function getClassificationMeta(classification: MoveClassification): {
  label: string;
  symbol: string;
  color: string;
  bgColor: string;
} {
  switch (classification) {
    case 'brilliant':
      return {
        label: 'Brilhante',
        symbol: '!!',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.18)',
      };
    case 'best':
      return {
        label: 'Melhor Lance',
        symbol: '★',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.14)',
      };
    case 'good':
      return {
        label: 'Bom Lance',
        symbol: '✓',
        color: '#38BDF8',
        bgColor: 'rgba(56, 189, 248, 0.14)',
      };
    case 'book':
      return {
        label: 'Teoria',
        symbol: '📖',
        color: '#C89D54',
        bgColor: 'rgba(200, 157, 84, 0.15)',
      };
    case 'inaccuracy':
      return {
        label: 'Imprecisão',
        symbol: '?!',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.16)',
      };
    case 'mistake':
      return {
        label: 'Erro',
        symbol: '?',
        color: '#F97316',
        bgColor: 'rgba(249, 115, 22, 0.16)',
      };
    case 'blunder':
      return {
        label: 'Grande Erro',
        symbol: '??',
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.18)',
      };
  }
}

/**
 * Generates a full Deep Analysis Report for a list of recorded moves
 */
export function analyzeFullGame(moves: RecordedMove[]): GameAnalysisReport {
  const counts: GameAnalysisReport['counts'] = {
    w: {
      brilliant: 0,
      best: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    },
    b: {
      brilliant: 0,
      best: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    },
  };

  const analyzedMoves: RecordedMove[] = [];
  const decisiveMoments: DecisiveMoment[] = [];

  let prevWhiteEvalCp = 25; // Initial slight White advantage
  const whiteAccuracies: number[] = [];
  const blackAccuracies: number[] = [];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const beforeAnalysis = evaluateFenFast(m.fenBefore);
    const afterAnalysis = evaluateFenFast(m.fenAfter);

    const evalBeforeWhite = i === 0 ? 25 : prevWhiteEvalCp;
    const evalAfterWhite = m.evalCp !== undefined ? m.evalCp : afterAnalysis.evalCp;
    prevWhiteEvalCp = evalAfterWhite;

    const moverSign = m.color === 'w' ? 1 : -1;
    const evalBeforeMover = evalBeforeWhite * moverSign;
    const evalAfterMover = evalAfterWhite * moverSign;
    const cpLoss = Math.max(0, evalBeforeMover - evalAfterMover);

    // Win probability delta for accuracy
    const winBefore = cpToWinProbability(evalBeforeMover);
    const winAfter = cpToWinProbability(evalAfterMover);
    const winLoss = Math.max(0, winBefore - winAfter);
    const moveAcc = Math.max(15, Math.min(100, 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669));

    if (m.color === 'w') whiteAccuracies.push(moveAcc);
    else blackAccuracies.push(moveAcc);

    let classification: MoveClassification = 'good';
    const playedBest = m.san === beforeAnalysis.bestMoveSan;

    if (m.ply <= 6 && cpLoss < 35) {
      classification = 'book';
    } else if (
      (playedBest || cpLoss <= 15) &&
      (m.san.includes('+') || m.captured) &&
      evalAfterMover - evalBeforeMover >= 140
    ) {
      classification = 'brilliant';
    } else if (playedBest || cpLoss <= 22) {
      classification = 'best';
    } else if (cpLoss <= 65) {
      classification = 'good';
    } else if (cpLoss <= 135) {
      classification = 'inaccuracy';
    } else if (cpLoss <= 260) {
      classification = 'mistake';
    } else {
      classification = 'blunder';
    }

    counts[m.color][classification]++;

    const commentMap: Record<MoveClassification, string> = {
      brilliant: `Lance tático brilhante (${m.san})! Ganha iniciativa decisiva.`,
      best: `O melhor lance da posição segundo o motor (${m.san}).`,
      good: `Lance sólido que mantém o equilíbrio dinâmico.`,
      book: `Lance teórico de abertura (${m.san}).`,
      inaccuracy: `Imprecisão. O motor preferia ${beforeAnalysis.bestMoveSan || m.san}.`,
      mistake: `Erro posicional/tático (-${(cpLoss / 100).toFixed(1)}). Melhor era ${beforeAnalysis.bestMoveSan}.`,
      blunder: `Grande erro (-${(cpLoss / 100).toFixed(1)})! Deixa passar ${beforeAnalysis.bestMoveSan}.`,
    };

    const enriched: RecordedMove = {
      ...m,
      evalCp: evalAfterWhite,
      mate: afterAnalysis.mate,
      bestMoveSan: beforeAnalysis.bestMoveSan || m.san,
      bestMoveUci: beforeAnalysis.bestMoveUci || m.uci,
      bestLineSan: beforeAnalysis.bestLineSan,
      classification,
      cpLoss,
      comment: commentMap[classification],
    };

    analyzedMoves.push(enriched);

    if (
      classification === 'blunder' ||
      classification === 'mistake' ||
      classification === 'brilliant'
    ) {
      decisiveMoments.push({
        ply: m.ply,
        moveNumber: m.moveNumber,
        color: m.color,
        playedSan: m.san,
        bestSan: beforeAnalysis.bestMoveSan || m.san,
        fenBefore: m.fenBefore,
        evalBeforeCp: evalBeforeWhite,
        evalAfterCp: evalAfterWhite,
        classification,
        explanation: commentMap[classification],
      });
    }
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 88.5 : Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1));

  const whiteAccuracy = avg(whiteAccuracies);
  const blackAccuracy = avg(blackAccuracies);

  const whiteEstimatedElo = Math.round(700 + whiteAccuracy * 21);
  const blackEstimatedElo = Math.round(700 + blackAccuracy * 21);

  const recommendations: string[] = [];
  const totalBlunders = counts.w.blunder + counts.b.blunder;
  const totalMistakes = counts.w.mistake + counts.b.mistake;

  if (totalBlunders > 0) {
    recommendations.push(
      `Foram detectados ${totalBlunders} Grande(s) Erro(s) táticos. Pratique o módulo "Desafios Táticos" para aprimorar a verificação de ameaças antes de soltar a peça.`
    );
  }
  if (analyzedMoves.some((m) => m.ply <= 12 && (m.classification === 'mistake' || m.classification === 'blunder'))) {
    recommendations.push(
      'Houve perda de vantagem ainda nos primeiros 6 lances. Utilize o "Laboratório de Gambitos" e o "Estudo de Aberturas" para consolidar as linhas teóricas.'
    );
  }
  if (analyzedMoves.length > 50 && totalMistakes > 1) {
    recommendations.push(
      'A precisão caiu na transição para o final de partida. Recomendamos treinar a Posição de Lucena e Oposição no módulo "Treinamento de Finais".'
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      'Partida de altíssimo nível técnico! Experimente elevar o nível do Stockfish ou testar variantes agressivas no Laboratório de Gambitos.'
    );
  }

  const summaryVerdict =
    whiteAccuracy > blackAccuracy + 6
      ? `As Brancas conduziram a partida com superioridade técnica (${whiteAccuracy}% vs ${blackAccuracy}%).`
      : blackAccuracy > whiteAccuracy + 6
      ? `As Pretas demonstraram maior precisão tática (${blackAccuracy}% vs ${whiteAccuracy}%).`
      : `Duelo equilibrado e disputado (${whiteAccuracy}% vs ${blackAccuracy}%).`;

  return {
    whiteAccuracy,
    blackAccuracy,
    whiteEstimatedElo,
    blackEstimatedElo,
    counts,
    moves: analyzedMoves,
    decisiveMoments: decisiveMoments.slice(0, 8),
    recommendations,
    summaryVerdict,
  };
}
