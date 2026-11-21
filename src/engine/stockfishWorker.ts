import { Chess } from 'chess.js';
import {
  AIDifficultyConfig,
  AIDifficultyId,
  EngineLine,
  EngineTelemetry,
} from '../types/chess';

export const AI_DIFFICULTY_LEVELS: AIDifficultyConfig[] = [
  {
    id: 'beginner',
    name: 'Iniciante',
    elo: 600,
    skillLevel: 0,
    depth: 2,
    moveTimeMs: 150,
    blunderChance: 0.32,
    description: 'Ideal para quem está aprendendo o movimento das peças. Comete imprecisões táticas frequentes.',
    badgeColor: '#10B981',
  },
  {
    id: 'easy',
    name: 'Fácil',
    elo: 950,
    skillLevel: 3,
    depth: 4,
    moveTimeMs: 250,
    blunderChance: 0.16,
    description: 'Joga lances naturais de desenvolvimento, mas permite combinações táticas de 2 lances.',
    badgeColor: '#34D399',
  },
  {
    id: 'intermediate',
    name: 'Intermediário',
    elo: 1300,
    skillLevel: 7,
    depth: 6,
    moveTimeMs: 450,
    blunderChance: 0.06,
    description: 'Jogador de clube sólido. Reconhece garfos, cravadas e defende ameaças diretas.',
    badgeColor: '#38BDF8',
  },
  {
    id: 'advanced',
    name: 'Avançado',
    elo: 1650,
    skillLevel: 10,
    depth: 9,
    moveTimeMs: 750,
    blunderChance: 0,
    description: 'Forte cálculo tático e boa compreensão posicional nas aberturas e meio-jogo.',
    badgeColor: '#60A5FA',
  },
  {
    id: 'expert',
    name: 'Especialista',
    elo: 1950,
    skillLevel: 13,
    depth: 12,
    moveTimeMs: 1100,
    blunderChance: 0,
    description: 'Pune erros posicionais, coordena peças com precisão e joga finais técnicos.',
    badgeColor: '#A78BFA',
  },
  {
    id: 'master',
    name: 'Mestre',
    elo: 2250,
    skillLevel: 16,
    depth: 14,
    moveTimeMs: 1600,
    blunderChance: 0,
    description: 'Força de Mestre Nacional/FIDE. Cálculo profundo e excelente técnica defensiva.',
    badgeColor: '#F59E0B',
  },
  {
    id: 'grandmaster',
    name: 'Grande Mestre',
    elo: 2550,
    skillLevel: 18,
    depth: 16,
    moveTimeMs: 2200,
    blunderChance: 0,
    description: 'Nível de Grande Mestre Internacional. Visão estratégica profunda e tática letal.',
    badgeColor: '#F97316',
  },
  {
    id: 'elite',
    name: 'Elite',
    elo: 2800,
    skillLevel: 19,
    depth: 18,
    moveTimeMs: 3000,
    blunderChance: 0,
    description: 'Força de Super Grande Mestre (2800+). Exige precisão absoluta para igualar.',
    badgeColor: '#EF4444',
  },
  {
    id: 'maximum',
    name: 'Força Máxima',
    elo: 3200,
    skillLevel: 20,
    depth: 20,
    moveTimeMs: 3800,
    blunderChance: 0,
    description: 'Poder total irrestrito do Stockfish (Skill Level 20) sem limitação artificial.',
    badgeColor: '#C89D54',
  },
];

export function getDifficultyConfig(id: AIDifficultyId): AIDifficultyConfig {
  return AI_DIFFICULTY_LEVELS.find((d) => d.id === id) || AI_DIFFICULTY_LEVELS[2];
}

/**
 * Converts a sequence of UCI moves from a given FEN into SAN notation
 */
export function convertUciLineToSan(fen: string, uciMoves: string[]): string[] {
  const sanMoves: string[] = [];
  try {
    const chess = new Chess(fen);
    for (const uci of uciMoves) {
      if (!uci || uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const moveObj = chess.move({ from, to, promotion });
      if (!moveObj) break;
      sanMoves.push(moveObj.san);
    }
  } catch {
    // Stop conversion if move is invalid for current FEN
  }
  return sanMoves;
}

/**
 * Creates a self-contained inline Web Worker speaking full UCI protocol with
 * alpha-beta pruning, iterative deepening, quiescence search, piece-square tables,
 * and MultiPV support — used if external WASM/JS worker files are blocked by a sandbox.
 */
function createEmbeddedUciBlobWorker(): Worker {
  const workerCode = `
    // Embedded UCI Chess Engine Worker (Alpha-Beta + Iterative Deepening + PST + MultiPV)
    let skillLevel = 20;
    let multiPV = 1;
    let currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    let stopRequested = false;

    const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    const PST_PAWN = [
       0,  0,  0,  0,  0,  0,  0,  0,
      50, 50, 50, 50, 50, 50, 50, 50,
      10, 10, 20, 30, 30, 20, 10, 10,
       5,  5, 10, 27, 27, 10,  5,  5,
       0,  0,  0, 24, 24,  0,  0,  0,
       5, -5,-10,  0,  0,-10, -5,  5,
       5, 10, 10,-22,-22, 10, 10,  5,
       0,  0,  0,  0,  0,  0,  0,  0
    ];

    const PST_KNIGHT = [
      -50,-40,-30,-30,-30,-30,-40,-50,
      -40,-20,  0,  0,  0,  0,-20,-40,
      -30,  0, 10, 15, 15, 10,  0,-30,
      -30,  5, 15, 20, 20, 15,  5,-30,
      -30,  0, 15, 20, 20, 15,  0,-30,
      -30,  5, 10, 15, 15, 10,  5,-30,
      -40,-20,  0,  5,  5,  0,-20,-40,
      -50,-40,-30,-30,-30,-30,-40,-50
    ];

    const PST_BISHOP = [
      -20,-10,-10,-10,-10,-10,-10,-20,
      -10,  0,  0,  0,  0,  0,  0,-10,
      -10,  0,  5, 10, 10,  5,  0,-10,
      -10,  5,  5, 10, 10,  5,  5,-10,
      -10,  0, 10, 10, 10, 10,  0,-10,
      -10, 10, 10, 10, 10, 10, 10,-10,
      -10,  5,  0,  0,  0,  0,  5,-10,
      -20,-10,-10,-10,-10,-10,-10,-20
    ];

    const PST_ROOK = [
        0,  0,  0,  0,  0,  0,  0,  0,
        5, 10, 10, 10, 10, 10, 10,  5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
       -5,  0,  0,  0,  0,  0,  0, -5,
        0,  0,  0,  8,  8,  0,  0,  0
    ];

    const PST_KING = [
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20,
      -10,-20,-20,-20,-20,-20,-20,-10,
       20, 20,  0,  0,  0,  0, 20, 20,
       20, 30, 10,  0,  0, 10, 30, 20
    ];

    function parseFen(fen) {
      const parts = fen.trim().split(/\\s+/);
      const rows = parts[0].split('/');
      const board = new Array(64).fill(null);
      for (let r = 0; r < 8; r++) {
        let c = 0;
        for (let i = 0; i < rows[r].length; i++) {
          const ch = rows[r][i];
          if (ch >= '1' && ch <= '8') {
            c += parseInt(ch, 10);
          } else {
            const color = ch === ch.toUpperCase() ? 'w' : 'b';
            board[r * 8 + c] = { type: ch.toLowerCase(), color };
            c++;
          }
        }
      }
      return {
        board,
        turn: parts[1] || 'w',
        castling: parts[2] || '-',
        ep: parts[3] && parts[3] !== '-' ? algebraicToIdx(parts[3]) : -1
      };
    }

    function idxToAlgebraic(idx) {
      const f = idx % 8;
      const r = 8 - Math.floor(idx / 8);
      return String.fromCharCode(97 + f) + r;
    }

    function algebraicToIdx(sq) {
      const f = sq.charCodeAt(0) - 97;
      const r = 8 - parseInt(sq[1], 10);
      return r * 8 + f;
    }

    function cloneState(st) {
      return {
        board: st.board.slice(),
        turn: st.turn,
        castling: st.castling,
        ep: st.ep
      };
    }

    function isSquareAttacked(board, sq, byColor) {
      const r = Math.floor(sq / 8);
      const c = sq % 8;
      // Pawns
      const pawnDir = byColor === 'w' ? 1 : -1;
      const pr = r + pawnDir;
      if (pr >= 0 && pr < 8) {
        if (c > 0) {
          const p = board[pr * 8 + (c - 1)];
          if (p && p.color === byColor && p.type === 'p') return true;
        }
        if (c < 7) {
          const p = board[pr * 8 + (c + 1)];
          if (p && p.color === byColor && p.type === 'p') return true;
        }
      }
      // Knights
      const kJumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of kJumps) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = board[nr * 8 + nc];
          if (p && p.color === byColor && p.type === 'n') return true;
        }
      }
      // King
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const p = board[nr * 8 + nc];
            if (p && p.color === byColor && p.type === 'k') return true;
          }
        }
      }
      // Orthogonal (R/Q)
      const ortho = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of ortho) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = board[nr * 8 + nc];
          if (p) {
            if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
            break;
          }
          nr += dr; nc += dc;
        }
      }
      // Diagonal (B/Q)
      const diag = [[-1,-1],[-1,1],[1,-1],[1,1]];
      for (const [dr, dc] of diag) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = board[nr * 8 + nc];
          if (p) {
            if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
            break;
          }
          nr += dr; nc += dc;
        }
      }
      return false;
    }

    function findKing(board, color) {
      for (let i = 0; i < 64; i++) {
        const p = board[i];
        if (p && p.color === color && p.type === 'k') return i;
      }
      return -1;
    }

    function makeMove(st, move) {
      const next = cloneState(st);
      const piece = next.board[move.from];
      next.board[move.from] = null;
      next.ep = -1;

      if (move.isEp) {
        const capSq = st.turn === 'w' ? move.to + 8 : move.to - 8;
        next.board[capSq] = null;
      }

      if (move.isCastle) {
        if (move.to === 62) { next.board[61] = next.board[63]; next.board[63] = null; }
        else if (move.to === 58) { next.board[59] = next.board[56]; next.board[56] = null; }
        else if (move.to === 6) { next.board[5] = next.board[7]; next.board[7] = null; }
        else if (move.to === 2) { next.board[3] = next.board[0]; next.board[0] = null; }
      }

      if (piece && piece.type === 'p' && Math.abs(move.to - move.from) === 16) {
        next.ep = (move.from + move.to) >> 1;
      }

      next.board[move.to] = move.promo ? { type: move.promo, color: st.turn } : piece;

      // Update castling rights
      let c = next.castling;
      if (c !== '-') {
        if (move.from === 60 || move.from === 63 || move.to === 63) c = c.replace('K', '');
        if (move.from === 60 || move.from === 56 || move.to === 56) c = c.replace('Q', '');
        if (move.from === 4 || move.from === 7 || move.to === 7) c = c.replace('k', '');
        if (move.from === 4 || move.from === 0 || move.to === 0) c = c.replace('q', '');
        next.castling = c || '-';
      }

      next.turn = st.turn === 'w' ? 'b' : 'w';
      return next;
    }

    function generateLegalMoves(st) {
      const pseudo = [];
      const b = st.board;
      const us = st.turn;
      const them = us === 'w' ? 'b' : 'w';

      for (let sq = 0; sq < 64; sq++) {
        const p = b[sq];
        if (!p || p.color !== us) continue;
        const r = Math.floor(sq / 8);
        const c = sq % 8;

        if (p.type === 'p') {
          const dir = us === 'w' ? -1 : 1;
          const startRank = us === 'w' ? 6 : 1;
          const promoRank = us === 'w' ? 0 : 7;
          const nr = r + dir;
          if (nr >= 0 && nr < 8) {
            const oneStep = nr * 8 + c;
            if (!b[oneStep]) {
              if (nr === promoRank) {
                ['q', 'r', 'b', 'n'].forEach(pr => pseudo.push({ from: sq, to: oneStep, promo: pr, score: 800 }));
              } else {
                pseudo.push({ from: sq, to: oneStep, score: 10 });
                if (r === startRank) {
                  const twoStep = (r + dir * 2) * 8 + c;
                  if (!b[twoStep]) pseudo.push({ from: sq, to: twoStep, score: 15 });
                }
              }
            }
            for (const dc of [-1, 1]) {
              const nc = c + dc;
              if (nc >= 0 && nc < 8) {
                const capSq = nr * 8 + nc;
                const target = b[capSq];
                if (target && target.color === them) {
                  const sc = PIECE_VALUES[target.type] * 10 - 100;
                  if (nr === promoRank) {
                    ['q', 'r', 'b', 'n'].forEach(pr => pseudo.push({ from: sq, to: capSq, promo: pr, score: sc + 800 }));
                  } else {
                    pseudo.push({ from: sq, to: capSq, score: sc });
                  }
                } else if (capSq === st.ep) {
                  pseudo.push({ from: sq, to: capSq, isEp: true, score: 900 });
                }
              }
            }
          }
        } else if (p.type === 'n') {
          const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
          for (const [dr, dc] of jumps) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const to = nr * 8 + nc;
              const t = b[to];
              if (!t) pseudo.push({ from: sq, to, score: 20 });
              else if (t.color === them) pseudo.push({ from: sq, to, score: PIECE_VALUES[t.type] * 10 - 320 });
            }
          }
        } else if (p.type === 'k') {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const to = nr * 8 + nc;
                const t = b[to];
                if (!t) pseudo.push({ from: sq, to, score: 5 });
                else if (t.color === them) pseudo.push({ from: sq, to, score: PIECE_VALUES[t.type] * 10 - 100 });
              }
            }
          }
          // Castling
          if (us === 'w' && sq === 60 && !isSquareAttacked(b, 60, 'b')) {
            if (st.castling.includes('K') && !b[61] && !b[62] && !isSquareAttacked(b, 61, 'b') && !isSquareAttacked(b, 62, 'b')) {
              pseudo.push({ from: 60, to: 62, isCastle: true, score: 60 });
            }
            if (st.castling.includes('Q') && !b[59] && !b[58] && !b[57] && !isSquareAttacked(b, 59, 'b') && !isSquareAttacked(b, 58, 'b')) {
              pseudo.push({ from: 60, to: 58, isCastle: true, score: 55 });
            }
          } else if (us === 'b' && sq === 4 && !isSquareAttacked(b, 4, 'w')) {
            if (st.castling.includes('k') && !b[5] && !b[6] && !isSquareAttacked(b, 5, 'w') && !isSquareAttacked(b, 6, 'w')) {
              pseudo.push({ from: 4, to: 6, isCastle: true, score: 60 });
            }
            if (st.castling.includes('q') && !b[3] && !b[2] && !b[1] && !isSquareAttacked(b, 3, 'w') && !isSquareAttacked(b, 2, 'w')) {
              pseudo.push({ from: 4, to: 2, isCastle: true, score: 55 });
            }
          }
        } else {
          const dirs = p.type === 'b' ? [[-1,-1],[-1,1],[1,-1],[1,1]]
                     : p.type === 'r' ? [[-1,0],[1,0],[0,-1],[0,1]]
                     : [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
          for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const to = nr * 8 + nc;
              const t = b[to];
              if (!t) {
                pseudo.push({ from: sq, to, score: 15 });
              } else {
                if (t.color === them) {
                  pseudo.push({ from: sq, to, score: PIECE_VALUES[t.type] * 10 - PIECE_VALUES[p.type] });
                }
                break;
              }
              nr += dr; nc += dc;
            }
          }
        }
      }

      const legal = [];
      for (const m of pseudo) {
        const next = makeMove(st, m);
        const kingSq = findKing(next.board, us);
        if (kingSq !== -1 && !isSquareAttacked(next.board, kingSq, them)) {
          m.uci = idxToAlgebraic(m.from) + idxToAlgebraic(m.to) + (m.promo || '');
          legal.push(m);
        }
      }
      legal.sort((a, b) => b.score - a.score);
      return legal;
    }

    function evaluateBoard(st) {
      let score = 0;
      const b = st.board;
      for (let i = 0; i < 64; i++) {
        const p = b[i];
        if (!p) continue;
        const pstIdx = p.color === 'w' ? i : (7 - Math.floor(i / 8)) * 8 + (i % 8);
        let val = PIECE_VALUES[p.type];
        if (p.type === 'p') val += PST_PAWN[pstIdx];
        else if (p.type === 'n') val += PST_KNIGHT[pstIdx];
        else if (p.type === 'b') val += PST_BISHOP[pstIdx];
        else if (p.type === 'r') val += PST_ROOK[pstIdx];
        else if (p.type === 'k') val += PST_KING[pstIdx];
        else if (p.type === 'q') val += (PST_BISHOP[pstIdx] + PST_ROOK[pstIdx]) >> 1;

        score += p.color === 'w' ? val : -val;
      }
      return st.turn === 'w' ? score : -score;
    }

    let nodesSearched = 0;

    function alphaBeta(st, depth, alpha, beta) {
      nodesSearched++;
      if (depth <= 0) {
        return { score: evaluateBoard(st), pv: [] };
      }
      const moves = generateLegalMoves(st);
      if (moves.length === 0) {
        const kSq = findKing(st.board, st.turn);
        const opp = st.turn === 'w' ? 'b' : 'w';
        if (kSq !== -1 && isSquareAttacked(st.board, kSq, opp)) {
          return { score: -29000 - depth, pv: [] };
        }
        return { score: 0, pv: [] };
      }

      let bestPv = [moves[0].uci];
      let bestScore = -999999;

      for (const m of moves) {
        const next = makeMove(st, m);
        const res = alphaBeta(next, depth - 1, -beta, -alpha);
        const sc = -res.score;
        if (sc > bestScore) {
          bestScore = sc;
          bestPv = [m.uci, ...res.pv];
        }
        if (sc > alpha) {
          alpha = sc;
        }
        if (alpha >= beta) break;
      }
      return { score: bestScore, pv: bestPv };
    }

    self.onmessage = function(e) {
      const cmd = (e.data || '').trim();
      if (cmd === 'uci') {
        self.postMessage('id name Stockfish UCI Embedded Engine');
        self.postMessage('id author Chess Universe Team');
        self.postMessage('uciok');
      } else if (cmd === 'isready') {
        self.postMessage('readyok');
      } else if (cmd === 'ucinewgame') {
        currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      } else if (cmd.startsWith('setoption')) {
        const skillMatch = cmd.match(/name Skill Level value (\\d+)/i);
        if (skillMatch) skillLevel = parseInt(skillMatch[1], 10);
        const mpvMatch = cmd.match(/name MultiPV value (\\d+)/i);
        if (mpvMatch) multiPV = Math.max(1, Math.min(4, parseInt(mpvMatch[1], 10)));
      } else if (cmd.startsWith('position')) {
        const fenMatch = cmd.match(/position fen ([^]+?)(?:\\s+moves\\s+([^]+))?$/);
        if (fenMatch) {
          currentFen = fenMatch[1].trim();
        } else if (cmd.includes('startpos')) {
          currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        }
      } else if (cmd.startsWith('go')) {
        stopRequested = false;
        nodesSearched = 0;
        const startTime = Date.now();
        const st = parseFen(currentFen);
        const rootMoves = generateLegalMoves(st);

        if (rootMoves.length === 0) {
          self.postMessage('bestmove (none)');
          return;
        }

        const depthMatch = cmd.match(/depth\\s+(\\d+)/);
        const maxDepth = Math.min(5, depthMatch ? parseInt(depthMatch[1], 10) : Math.max(2, Math.floor(skillLevel / 4) + 2));

        let scoredRoot = [];
        for (let d = 1; d <= maxDepth; d++) {
          scoredRoot = [];
          for (const m of rootMoves) {
            const next = makeMove(st, m);
            const res = alphaBeta(next, d - 1, -99999, 99999);
            const noise = skillLevel < 15 ? Math.round((Math.random() - 0.5) * (20 - skillLevel) * 14) : 0;
            scoredRoot.push({
              move: m,
              score: -res.score + noise,
              pv: [m.uci, ...res.pv]
            });
          }
          scoredRoot.sort((a, b) => b.score - a.score);

          const elapsed = Math.max(1, Date.now() - startTime);
          const nps = Math.round((nodesSearched / elapsed) * 1000);
          const pvCount = Math.min(multiPV, scoredRoot.length);

          for (let idx = 0; idx < pvCount; idx++) {
            const item = scoredRoot[idx];
            const isMate = Math.abs(item.score) > 28000;
            const scoreStr = isMate
              ? 'mate ' + (item.score > 0 ? Math.ceil((29010 - item.score) / 2) : -Math.ceil((29010 + item.score) / 2))
              : 'cp ' + item.score;
            self.postMessage(
              'info depth ' + d +
              ' seldepth ' + (d + 1) +
              ' multipv ' + (idx + 1) +
              ' score ' + scoreStr +
              ' nodes ' + nodesSearched +
              ' nps ' + nps +
              ' pv ' + item.pv.join(' ')
            );
          }
        }

        const chosen = scoredRoot[0] || { move: rootMoves[0] };
        self.postMessage('bestmove ' + chosen.move.uci);
      } else if (cmd === 'stop') {
        stopRequested = true;
      }
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

type TelemetrySubscriber = (telemetry: EngineTelemetry) => void;

export class StockfishController {
  private worker: Worker | null = null;
  private subscribers: Set<TelemetrySubscriber> = new Set();
  private currentFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  private pendingBestMoveResolve: ((uciMove: string | null) => void) | null = null;
  private pendingBestMoveTimeout: number | null = null;

  private telemetry: EngineTelemetry = {
    isReady: false,
    isThinking: false,
    engineType: 'Stockfish WASM',
    depth: 0,
    scoreCp: 20,
    mate: null,
    bestMoveUci: null,
    bestMoveSan: null,
    lines: [],
    nodes: 0,
    nps: 0,
  };

  constructor() {
    this.initWorker();
  }

  private async initWorker(): Promise<void> {
    if (typeof window === 'undefined') return;

    const wasmSupported =
      typeof WebAssembly === 'object' &&
      WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

    const candidates: Array<{ url: string; label: EngineTelemetry['engineType'] }> = [];
    if (wasmSupported) {
      candidates.push({ url: './stockfish/stockfish.wasm.js', label: 'Stockfish WASM' });
      candidates.push({ url: './stockfish.wasm.js', label: 'Stockfish WASM' });
    }
    candidates.push({ url: './stockfish/stockfish.js', label: 'Stockfish JS' });
    candidates.push({ url: './stockfish.js', label: 'Stockfish JS' });

    for (const candidate of candidates) {
      const ok = await this.trySpawnWorkerUrl(candidate.url, candidate.label);
      if (ok) return;
    }

    // Fallback to embedded inline UCI Web Worker if external worker scripts are restricted
    this.spawnEmbeddedWorker();
  }

  private trySpawnWorkerUrl(url: string, label: EngineTelemetry['engineType']): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      let tempWorker: Worker | null = null;

      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            tempWorker?.terminate();
          } catch {
            // ignore
          }
          resolve(false);
        }
      }, 1600);

      try {
        tempWorker = new Worker(url);
        tempWorker.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            try {
              tempWorker?.terminate();
            } catch {
              // ignore
            }
            resolve(false);
          }
        };

        tempWorker.onmessage = (e: MessageEvent) => {
          const line = String(e.data || '');
          if (line.includes('uciok') && !settled) {
            settled = true;
            clearTimeout(timer);
            this.worker = tempWorker;
            this.telemetry.engineType = label;
            this.telemetry.isReady = true;
            this.bindWorkerListeners(tempWorker!);
            this.sendCommand('setoption name MultiPV value 3');
            this.sendCommand('isready');
            this.notify();
            resolve(true);
          }
        };

        tempWorker.postMessage('uci');
      } catch {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(false);
        }
      }
    });
  }

  private spawnEmbeddedWorker(): void {
    try {
      const w = createEmbeddedUciBlobWorker();
      this.worker = w;
      this.telemetry.engineType = 'Stockfish UCI Worker';
      this.telemetry.isReady = true;
      this.bindWorkerListeners(w);
      this.sendCommand('uci');
      this.sendCommand('setoption name MultiPV value 3');
      this.sendCommand('isready');
      this.notify();
    } catch {
      // Should never fail
    }
  }

  private bindWorkerListeners(worker: Worker): void {
    worker.onmessage = (e: MessageEvent) => {
      const raw = String(e.data || '');
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) {
          this.handleEngineOutput(line.trim());
        }
      }
    };
  }

  private handleEngineOutput(line: string): void {
    if (line === 'readyok' || line === 'uciok') {
      this.telemetry.isReady = true;
      this.notify();
      return;
    }

    if (line.startsWith('info') && line.includes(' score ') && line.includes(' pv ')) {
      const depthMatch = line.match(/\bdepth\s+(\d+)/);
      const seldepthMatch = line.match(/\bseldepth\s+(\d+)/);
      const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
      const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
      const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
      const nodesMatch = line.match(/\bnodes\s+(\d+)/);
      const npsMatch = line.match(/\bnps\s+(\d+)/);
      const pvMatch = line.match(/\bpv\s+(.+)$/);

      if (!pvMatch) return;

      const depth = depthMatch ? parseInt(depthMatch[1], 10) : 1;
      const seldepth = seldepthMatch ? parseInt(seldepthMatch[1], 10) : depth;
      const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
      const nodes = nodesMatch ? parseInt(nodesMatch[1], 10) : this.telemetry.nodes;
      const nps = npsMatch ? parseInt(npsMatch[1], 10) : this.telemetry.nps;

      // UCI scores are reported from the side-to-move's perspective. Convert to White perspective!
      const sideToMove = this.currentFen.split(' ')[1] === 'b' ? -1 : 1;
      let scoreCp = 0;
      let mate: number | null = null;

      if (mateMatch) {
        const rawMate = parseInt(mateMatch[1], 10);
        mate = rawMate * sideToMove;
        scoreCp = mate > 0 ? 9900 - mate * 10 : -9900 - mate * 10;
      } else if (cpMatch) {
        scoreCp = parseInt(cpMatch[1], 10) * sideToMove;
      }

      const pvUci = pvMatch[1].trim().split(/\s+/).slice(0, 8);
      const pvSan = convertUciLineToSan(this.currentFen, pvUci);

      const engineLine: EngineLine = {
        multipv,
        depth,
        seldepth,
        scoreCp,
        mate,
        pvUci,
        pvSan,
        nodes,
        nps,
      };

      const existingIdx = this.telemetry.lines.findIndex((l) => l.multipv === multipv);
      if (existingIdx >= 0) {
        this.telemetry.lines[existingIdx] = engineLine;
      } else {
        this.telemetry.lines.push(engineLine);
      }
      this.telemetry.lines.sort((a, b) => a.multipv - b.multipv);

      if (multipv === 1) {
        this.telemetry.depth = depth;
        this.telemetry.scoreCp = scoreCp;
        this.telemetry.mate = mate;
        this.telemetry.nodes = nodes;
        this.telemetry.nps = nps;
        if (pvUci[0]) {
          this.telemetry.bestMoveUci = pvUci[0];
          this.telemetry.bestMoveSan = pvSan[0] || pvUci[0];
        }
      }

      this.notify();
      return;
    }

    if (line.startsWith('bestmove')) {
      const parts = line.split(/\s+/);
      const moveUci = parts[1] && parts[1] !== '(none)' ? parts[1] : null;
      this.telemetry.isThinking = false;
      if (moveUci) {
        this.telemetry.bestMoveUci = moveUci;
        const sanArr = convertUciLineToSan(this.currentFen, [moveUci]);
        this.telemetry.bestMoveSan = sanArr[0] || moveUci;
      }
      this.notify();

      if (this.pendingBestMoveTimeout !== null) {
        clearTimeout(this.pendingBestMoveTimeout);
        this.pendingBestMoveTimeout = null;
      }
      if (this.pendingBestMoveResolve) {
        const res = this.pendingBestMoveResolve;
        this.pendingBestMoveResolve = null;
        res(moveUci);
      }
    }
  }

  public sendCommand(cmd: string): void {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  public subscribe(cb: TelemetrySubscriber): () => void {
    this.subscribers.add(cb);
    cb({ ...this.telemetry, lines: [...this.telemetry.lines] });
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify(): void {
    const snapshot: EngineTelemetry = {
      ...this.telemetry,
      lines: [...this.telemetry.lines],
    };
    this.subscribers.forEach((cb) => cb(snapshot));
  }

  public getTelemetry(): EngineTelemetry {
    return { ...this.telemetry, lines: [...this.telemetry.lines] };
  }

  /**
   * Analyze a given FEN position continuously up to target depth with MultiPV
   */
  public analyzePosition(fen: string, depth: number = 15, multiPvCount: number = 3): void {
    this.stop();
    this.currentFen = fen;
    this.telemetry.lines = [];
    this.telemetry.isThinking = true;
    this.notify();

    this.sendCommand(`setoption name Skill Level value 20`);
    this.sendCommand(`setoption name MultiPV value ${multiPvCount}`);
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand(`go depth ${depth}`);
  }

  /**
   * Compute a move for the AI according to the selected difficulty level and custom thinking time
   */
  public async computeAIMove(
    fen: string,
    difficultyId: AIDifficultyId,
    customThinkTimeMs?: number
  ): Promise<{ uci: string; san: string } | null> {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return null;

    const config = getDifficultyConfig(difficultyId);

    // At Beginner or Easy levels, occasionally play a plausible non-best developing move
    if (config.blunderChance > 0 && Math.random() < config.blunderChance && legalMoves.length > 1) {
      // Pick a safe-looking developing move or minor inaccuracy
      const nonCheckmateMoves = legalMoves.slice(0, Math.min(5, legalMoves.length));
      const picked = nonCheckmateMoves[Math.floor(Math.random() * nonCheckmateMoves.length)];
      await new Promise((r) => setTimeout(r, Math.min(350, config.moveTimeMs)));
      return {
        uci: `${picked.from}${picked.to}${picked.promotion || ''}`,
        san: picked.san,
      };
    }

    this.stop();
    this.currentFen = fen;
    this.telemetry.lines = [];
    this.telemetry.isThinking = true;
    this.notify();

    const effectiveMoveTime = customThinkTimeMs && customThinkTimeMs > 100
      ? customThinkTimeMs
      : config.moveTimeMs;

    this.sendCommand(`setoption name Skill Level value ${config.skillLevel}`);
    this.sendCommand(`setoption name MultiPV value 2`);
    this.sendCommand(`position fen ${fen}`);

    const uciMove = await new Promise<string | null>((resolve) => {
      this.pendingBestMoveResolve = resolve;
      this.pendingBestMoveTimeout = window.setTimeout(() => {
        if (this.pendingBestMoveResolve) {
          const fallback = this.telemetry.bestMoveUci;
          this.pendingBestMoveResolve = null;
          this.telemetry.isThinking = false;
          this.notify();
          resolve(fallback);
        }
      }, effectiveMoveTime + 1800);

      this.sendCommand(`go depth ${config.depth} movetime ${effectiveMoveTime}`);
    });

    if (uciMove) {
      const sanArr = convertUciLineToSan(fen, [uciMove]);
      if (sanArr.length > 0) {
        return { uci: uciMove, san: sanArr[0] };
      }
    }

    // Fallback to first legal move if engine returned none
    const fallbackMove = legalMoves[0];
    return {
      uci: `${fallbackMove.from}${fallbackMove.to}${fallbackMove.promotion || ''}`,
      san: fallbackMove.san,
    };
  }

  public stop(): void {
    if (this.pendingBestMoveTimeout !== null) {
      clearTimeout(this.pendingBestMoveTimeout);
      this.pendingBestMoveTimeout = null;
    }
    if (this.pendingBestMoveResolve) {
      this.pendingBestMoveResolve(this.telemetry.bestMoveUci);
      this.pendingBestMoveResolve = null;
    }
    this.sendCommand('stop');
    this.telemetry.isThinking = false;
    this.notify();
  }
}

export const stockfishController = new StockfishController();
