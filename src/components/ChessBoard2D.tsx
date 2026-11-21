import React, { useState, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import {
  ArrowAnnotation,
  BoardThemeConfig,
  MoveClassification,
  PieceColor,
  PieceStyleId,
  PieceType,
} from '../types/chess';
import { ChessPieceSVG } from './ChessPieceSVG';
import { getClassificationMeta } from '../analysis/gameAnalyzer';

interface ChessBoard2DProps {
  fen: string;
  orientation: PieceColor;
  theme: BoardThemeConfig;
  pieceStyle: PieceStyleId;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  enableAnimations: boolean;
  showEvalBar: boolean;
  evalCp: number; // White perspective
  mate: number | null; // White perspective
  lastMove?: { from: string; to: string; classification?: MoveClassification } | null;
  arrows?: ArrowAnnotation[];
  interactive?: boolean;
  autoQueenPromotion?: boolean;
  onMove: (from: string, to: string, promotion?: PieceType) => boolean;
  // Position Editor mode props
  editorMode?: boolean;
  onEditorSquareClick?: (square: string) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function squareToCoords(square: string, orientation: PieceColor): { x: number; y: number } {
  const fileIdx = square.charCodeAt(0) - 97;
  const rankIdx = 8 - parseInt(square[1], 10);
  const col = orientation === 'w' ? fileIdx : 7 - fileIdx;
  const row = orientation === 'w' ? rankIdx : 7 - rankIdx;
  return {
    x: col * 12.5 + 6.25,
    y: row * 12.5 + 6.25,
  };
}

export const ChessBoard2D: React.FC<ChessBoard2DProps> = ({
  fen,
  orientation,
  theme,
  pieceStyle,
  showCoordinates,
  showLegalMoves,
  enableAnimations,
  showEvalBar,
  evalCp,
  mate,
  lastMove,
  arrows = [],
  interactive = true,
  autoQueenPromotion = false,
  onMove,
  editorMode = false,
  onEditorSquareClick,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
    color: PieceColor;
  } | null>(null);
  const [userArrows, setUserArrows] = useState<ArrowAnnotation[]>([]);
  const [markedSquares, setMarkedSquares] = useState<Set<string>>(new Set());
  const rightClickStartRef = useRef<string | null>(null);

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    chess = new Chess();
  }

  const board = chess.board();
  const inCheck = chess.inCheck();
  const isCheckmate = chess.isCheckmate();
  const turn = chess.turn();

  // Compute legal moves for selected square
  const legalDestinations = new Map<string, { isCapture: boolean; isPromotion: boolean }>();
  const activeSource = selectedSquare || draggedFrom;

  if (!editorMode && interactive && activeSource) {
    try {
      const moves = chess.moves({ square: activeSource as Square, verbose: true });
      for (const m of moves) {
        legalDestinations.set(m.to, {
          isCapture: Boolean(m.captured) || m.flags.includes('e'),
          isPromotion: Boolean(m.promotion) || m.flags.includes('p'),
        });
      }
    } catch {
      // ignore
    }
  }

  // Find King square if in check
  let kingInCheckSquare: string | null = null;
  if (inCheck) {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === 'k' && p.color === turn) {
          kingInCheckSquare = p.square;
        }
      }
    }
  }

  const attemptMove = (from: string, to: string) => {
    if (from === to) return;
    try {
      const moves = chess.moves({ square: from as Square, verbose: true });
      const matching = moves.filter((m) => m.to === to);
      if (matching.length === 0) return;

      const isPromo = matching.some((m) => m.promotion);
      if (isPromo) {
        if (autoQueenPromotion) {
          onMove(from, to, 'q');
        } else {
          setPendingPromotion({ from, to, color: turn });
        }
      } else {
        onMove(from, to);
      }
      setSelectedSquare(null);
      setUserArrows([]);
      setMarkedSquares(new Set());
    } catch {
      // ignore
    }
  };

  const handleSquareClick = (sq: string) => {
    if (editorMode && onEditorSquareClick) {
      onEditorSquareClick(sq);
      return;
    }
    if (!interactive) return;

    // Clear right-click annotations on left click
    if (userArrows.length > 0 || markedSquares.size > 0) {
      setUserArrows([]);
      setMarkedSquares(new Set());
    }

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }
      if (legalDestinations.has(sq)) {
        attemptMove(selectedSquare, sq);
        return;
      }
    }

    const piece = chess.get(sq as Square);
    if (piece && piece.color === turn) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, sq: string) => {
    if (e.button === 2) {
      rightClickStartRef.current = sq;
    }
  };

  const handleMouseUp = (e: React.MouseEvent, sq: string) => {
    if (e.button === 2 && rightClickStartRef.current) {
      const startSq = rightClickStartRef.current;
      rightClickStartRef.current = null;
      if (startSq === sq) {
        setMarkedSquares((prev) => {
          const next = new Set(prev);
          if (next.has(sq)) next.delete(sq);
          else next.add(sq);
          return next;
        });
      } else {
        setUserArrows((prev) => {
          const exists = prev.some((a) => a.from === startSq && a.to === sq);
          if (exists) return prev.filter((a) => !(a.from === startSq && a.to === sq));
          return [...prev, { from: startSq, to: sq, color: '#F59E0B' }];
        });
      }
    }
  };

  // Evaluation bar calculation
  const evalClamped = Math.max(-1000, Math.min(1000, evalCp));
  const whitePercent =
    mate !== null
      ? mate > 0
        ? 98
        : 2
      : Math.max(4, Math.min(96, 50 + (evalClamped / 1000) * 46));

  const evalDisplay =
    mate !== null
      ? `M${Math.abs(mate)}`
      : `${evalCp >= 0 ? '+' : ''}${(evalCp / 100).toFixed(1)}`;

  const displayRanks = orientation === 'w' ? RANKS : [...RANKS].reverse();
  const displayFiles = orientation === 'w' ? FILES : [...FILES].reverse();
  const allArrows = [...arrows, ...userArrows];

  return (
    <div
      className="flex items-stretch gap-2.5 select-none w-full justify-center"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Vertical Evaluation Bar */}
      {showEvalBar && (
        <div
          className="w-6 sm:w-7 rounded-lg overflow-hidden border border-[#232C3D] bg-[#161B24] flex flex-col relative shadow-inner shrink-0"
          title={`Avaliação do Stockfish: ${evalDisplay}`}
        >
          <div
            className="w-full transition-all duration-300 ease-out"
            style={{
              height: `${orientation === 'w' ? 100 - whitePercent : whitePercent}%`,
              backgroundColor: orientation === 'w' ? '#1B202B' : '#EAE6DF',
            }}
          />
          <div
            className="w-full transition-all duration-300 ease-out"
            style={{
              height: `${orientation === 'w' ? whitePercent : 100 - whitePercent}%`,
              backgroundColor: orientation === 'w' ? '#EAE6DF' : '#1B202B',
            }}
          />
          <span
            className={`absolute left-0 right-0 text-center font-mono-tabular text-[10px] font-bold px-0.5 leading-tight ${
              evalCp >= 0
                ? orientation === 'w'
                  ? 'bottom-1.5 text-[#131822]'
                  : 'top-1.5 text-[#131822]'
                : orientation === 'w'
                ? 'top-1.5 text-[#F3F4F6]'
                : 'bottom-1.5 text-[#F3F4F6]'
            }`}
          >
            {evalDisplay}
          </span>
        </div>
      )}

      {/* Main 2D Chessboard Container */}
      <div
        className="relative aspect-square w-full max-w-[min(74vh,640px)] rounded-xl overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.65)] border-4"
        style={{ borderColor: theme.borderHex }}
      >
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
          {displayRanks.map((rankStr, rIdx) =>
            displayFiles.map((fileStr, fIdx) => {
              const sq = `${fileStr}${rankStr}`;
              const fileNum = FILES.indexOf(fileStr);
              const rankNum = RANKS.indexOf(rankStr);
              const isLight = (fileNum + rankNum) % 2 === 0;
              const piece = board[rankNum][fileNum];

              const isSelected = selectedSquare === sq;
              const isLastMoveFrom = lastMove?.from === sq;
              const isLastMoveTo = lastMove?.to === sq;
              const isKingCheck = kingInCheckSquare === sq;
              const isMarked = markedSquares.has(sq);
              const legalInfo = showLegalMoves ? legalDestinations.get(sq) : undefined;

              const badgeMeta =
                isLastMoveTo && lastMove?.classification
                  ? getClassificationMeta(lastMove.classification)
                  : null;

              return (
                <div
                  key={sq}
                  onClick={() => handleSquareClick(sq)}
                  onMouseDown={(e) => handleMouseDown(e, sq)}
                  onMouseUp={(e) => handleMouseUp(e, sq)}
                  onDragOver={(e) => {
                    if (interactive && !editorMode) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedFrom && draggedFrom !== sq) {
                      attemptMove(draggedFrom, sq);
                    }
                    setDraggedFrom(null);
                  }}
                  className="relative flex items-center justify-center cursor-pointer"
                  style={{
                    backgroundColor: isLight ? theme.lightSquare : theme.darkSquare,
                  }}
                >
                  {/* Last move or selected highlight */}
                  {(isSelected || isLastMoveFrom || isLastMoveTo) && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(200, 157, 84, 0.52)'
                          : 'rgba(200, 157, 84, 0.34)',
                      }}
                    />
                  )}

                  {/* Right-click tactical square highlight */}
                  {isMarked && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.45)' }}
                    />
                  )}

                  {/* King in Check / Checkmate radial crimson glow */}
                  {isKingCheck && <div className="absolute inset-0 check-square-glow pointer-events-none" />}

                  {/* Coordinate Labels */}
                  {showCoordinates && fIdx === 0 && (
                    <span
                      className="absolute top-0.5 left-1 text-[10px] sm:text-[11px] font-bold font-mono-tabular leading-none pointer-events-none opacity-85"
                      style={{ color: isLight ? theme.coordLight : theme.coordDark }}
                    >
                      {rankStr}
                    </span>
                  )}
                  {showCoordinates && rIdx === 7 && (
                    <span
                      className="absolute bottom-0.5 right-1 text-[10px] sm:text-[11px] font-bold font-mono-tabular leading-none pointer-events-none opacity-85"
                      style={{ color: isLight ? theme.coordLight : theme.coordDark }}
                    >
                      {fileStr}
                    </span>
                  )}

                  {/* Legal Move Dot or Capture Ring */}
                  {legalInfo && !legalInfo.isCapture && (
                    <div className="w-[28%] h-[28%] rounded-full bg-[#0F172A]/40 pointer-events-none z-10 transition-transform scale-100" />
                  )}
                  {legalInfo && legalInfo.isCapture && (
                    <div className="absolute inset-1 rounded-full border-[4px] border-[#0F172A]/45 pointer-events-none z-10" />
                  )}

                  {/* Chess Piece SVG */}
                  {piece && (
                    <div
                      draggable={interactive && !editorMode && piece.color === turn}
                      onDragStart={() => {
                        setDraggedFrom(sq);
                        setSelectedSquare(sq);
                      }}
                      onDragEnd={() => setDraggedFrom(null)}
                      className={`w-[84%] h-[84%] z-10 ${
                        enableAnimations && isLastMoveTo ? 'piece-animate' : ''
                      }`}
                    >
                      <ChessPieceSVG
                        type={piece.type as PieceType}
                        color={piece.color as PieceColor}
                        styleId={pieceStyle}
                      />
                    </div>
                  )}

                  {/* Move Classification Badge on Last Move Destination */}
                  {badgeMeta && (
                    <div
                      className="absolute -top-1 -right-1 z-20 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono-tabular shadow-md border border-black/40 pointer-events-none"
                      style={{
                        backgroundColor: badgeMeta.color,
                        color: '#0B0E14',
                      }}
                      title={badgeMeta.label}
                    >
                      {badgeMeta.symbol}
                    </div>
                  )}

                  {/* Checkmate Crown Indicator */}
                  {isKingCheck && isCheckmate && (
                    <div className="absolute -top-1 -left-1 z-20 bg-[#EF4444] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-lg pointer-events-none">
                      #
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* SVG Tactical Arrows Layer */}
        {allArrows.length > 0 && (
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          >
            <defs>
              {allArrows.map((arrow, idx) => (
                <marker
                  key={`marker-${idx}`}
                  id={`arrowhead-${idx}`}
                  markerWidth="3.5"
                  markerHeight="3.5"
                  refX="2.3"
                  refY="1.75"
                  orient="auto"
                >
                  <polygon points="0 0, 3.5 1.75, 0 3.5" fill={arrow.color} />
                </marker>
              ))}
            </defs>
            {allArrows.map((arrow, idx) => {
              const start = squareToCoords(arrow.from, orientation);
              const end = squareToCoords(arrow.to, orientation);
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const len = Math.hypot(dx, dy);
              if (len === 0) return null;
              // Shorten end slightly so arrowhead sits cleanly in square center
              const targetX = end.x - (dx / len) * 2.4;
              const targetY = end.y - (dy / len) * 2.4;

              return (
                <g key={`${arrow.from}-${arrow.to}-${idx}`} opacity="0.88">
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={targetX}
                    y2={targetY}
                    stroke={arrow.color}
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    markerEnd={`url(#arrowhead-${idx})`}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Pawn Promotion Modal Overlay */}
        {pendingPromotion && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs z-30 flex items-center justify-center p-4">
            <div className="bg-[#131822] border border-[#C89D54] rounded-xl p-4 shadow-2xl max-w-xs w-full text-center">
              <h4 className="text-sm font-bold text-[#F3F4F6] mb-1">Promoção de Peão</h4>
              <p className="text-xs text-[#9CA3AF] mb-3">
                Escolha a peça para promover em <span className="font-mono text-[#C89D54]">{pendingPromotion.to}</span>:
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(['q', 'r', 'b', 'n'] as PieceType[]).map((pType) => {
                  const labels: Record<string, string> = {
                    q: 'Dama',
                    r: 'Torre',
                    b: 'Bispo',
                    n: 'Cavalo',
                  };
                  return (
                    <button
                      key={pType}
                      onClick={() => {
                        onMove(pendingPromotion.from, pendingPromotion.to, pType);
                        setPendingPromotion(null);
                      }}
                      className="flex flex-col items-center p-2 rounded-lg bg-[#1B2230] hover:bg-[#C89D54]/25 border border-[#232C3D] hover:border-[#C89D54] transition"
                    >
                      <div className="w-11 h-11">
                        <ChessPieceSVG
                          type={pType}
                          color={pendingPromotion.color}
                          styleId={pieceStyle}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[#F3F4F6] mt-1">
                        {labels[pType]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPendingPromotion(null)}
                className="mt-3 text-xs text-[#9CA3AF] hover:text-white underline"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
