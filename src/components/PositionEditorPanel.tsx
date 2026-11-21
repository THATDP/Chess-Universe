import React, { useState } from 'react';
import { Chess } from 'chess.js';
import {
  Check,
  Copy,
  Eraser,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PieceColor, PieceStyleId, PieceType } from '../types/chess';
import { ChessPieceSVG } from './ChessPieceSVG';

export type EditorTool = { color: PieceColor; type: PieceType } | 'erase';

interface PositionEditorPanelProps {
  fen: string;
  selectedTool: EditorTool;
  pieceStyle: PieceStyleId;
  onSelectTool: (tool: EditorTool) => void;
  onUpdateFen: (newFen: string) => void;
  onPlayFromPosition: (fen: string, playerColor: PieceColor) => void;
  onAnalyzePosition: (fen: string) => void;
}

const PIECE_TYPES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];

export const PositionEditorPanel: React.FC<PositionEditorPanelProps> = ({
  fen,
  selectedTool,
  pieceStyle,
  onSelectTool,
  onUpdateFen,
  onPlayFromPosition,
  onAnalyzePosition,
}) => {
  const [fenInput, setFenInput] = useState(fen);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parts = fen.split(' ');
  const turn = (parts[1] === 'b' ? 'b' : 'w') as PieceColor;
  const castling = parts[2] || '-';

  const updateFenPart = (partIndex: number, value: string) => {
    const split = fen.split(' ');
    while (split.length < 6) {
      split.push(split.length === 1 ? 'w' : split.length === 2 ? '-' : split.length === 3 ? '-' : '0');
    }
    split[partIndex] = value;
    const candidate = split.join(' ');
    onUpdateFen(candidate);
    setFenInput(candidate);
  };

  const toggleCastleRight = (right: 'K' | 'Q' | 'k' | 'q') => {
    let current = castling === '-' ? '' : castling;
    if (current.includes(right)) {
      current = current.replace(right, '');
    } else {
      current += right;
    }
    const ordered = ['K', 'Q', 'k', 'q'].filter((r) => current.includes(r)).join('');
    updateFenPart(2, ordered || '-');
  };

  const handleClearBoard = () => {
    const bareKingsFen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    onUpdateFen(bareKingsFen);
    setFenInput(bareKingsFen);
    setErrorMsg(null);
  };

  const handleResetStandard = () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    onUpdateFen(startFen);
    setFenInput(startFen);
    setErrorMsg(null);
  };

  const validateAndStart = (action: 'play-w' | 'play-b' | 'analyze') => {
    setErrorMsg(null);
    try {
      const test = new Chess(fen);
      if (test.isGameOver()) {
        setErrorMsg('Esta posição já está encerrada (xeque-mate ou empate).');
        return;
      }
      if (action === 'play-w') onPlayFromPosition(fen, 'w');
      else if (action === 'play-b') onPlayFromPosition(fen, 'b');
      else onAnalyzePosition(fen);
    } catch {
      setErrorMsg(
        'Posição ilegal segundo as regras oficiais do xadrez (verifique se ambos os Reis estão no tabuleiro e se não há peões na 1ª/8ª fila).'
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#131822] border border-[#232C3D] rounded-xl overflow-hidden text-xs">
      <div className="p-3.5 bg-gradient-to-r from-[#171E2C] to-[#131822] border-b border-[#232C3D] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#C89D54]/20 border border-[#C89D54]/40 flex items-center justify-center text-[#C89D54]">
          <Sliders className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#F3F4F6]">EDITOR DE POSIÇÕES & FEN</h2>
          <p className="text-[11px] text-[#9CA3AF]">
            Clique em uma peça abaixo e depois clique nas casas do tabuleiro para montar qualquer posição
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] text-[11px]">
            {errorMsg}
          </div>
        )}

        {/* Piece Palette */}
        <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F3F4F6]">Paleta de Peças</span>
            <button
              onClick={() => onSelectTool('erase')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold border transition ${
                selectedTool === 'erase'
                  ? 'bg-[#EF4444] text-white border-[#EF4444]'
                  : 'bg-[#131822] text-[#9CA3AF] border-[#232C3D] hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" /> Borracha (Remover)
            </button>
          </div>

          {/* White Pieces */}
          <div className="grid grid-cols-6 gap-1.5">
            {PIECE_TYPES.map((pt) => {
              const isSelected =
                selectedTool !== 'erase' && selectedTool.color === 'w' && selectedTool.type === pt;
              return (
                <button
                  key={`w-${pt}`}
                  onClick={() => onSelectTool({ color: 'w', type: pt })}
                  className={`p-1.5 rounded-lg border flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-[#C89D54]/25 border-[#C89D54] shadow-md'
                      : 'bg-[#131822] hover:bg-[#1B2230] border-[#232C3D]'
                  }`}
                >
                  <div className="w-9 h-9">
                    <ChessPieceSVG type={pt} color="w" styleId={pieceStyle} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Black Pieces */}
          <div className="grid grid-cols-6 gap-1.5">
            {PIECE_TYPES.map((pt) => {
              const isSelected =
                selectedTool !== 'erase' && selectedTool.color === 'b' && selectedTool.type === pt;
              return (
                <button
                  key={`b-${pt}`}
                  onClick={() => onSelectTool({ color: 'b', type: pt })}
                  className={`p-1.5 rounded-lg border flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-[#C89D54]/25 border-[#C89D54] shadow-md'
                      : 'bg-[#131822] hover:bg-[#1B2230] border-[#232C3D]'
                  }`}
                >
                  <div className="w-9 h-9">
                    <ChessPieceSVG type={pt} color="b" styleId={pieceStyle} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleResetStandard}
              className="py-1.5 px-2.5 rounded-lg bg-[#131822] hover:bg-[#1B2230] border border-[#232C3D] text-[#D1D5DB] flex items-center justify-center gap-1.5 font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Posição Inicial
            </button>
            <button
              onClick={handleClearBoard}
              className="py-1.5 px-2.5 rounded-lg bg-[#131822] hover:bg-[#1B2230] border border-[#232C3D] text-[#D1D5DB] flex items-center justify-center gap-1.5 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpar (Só Reis)
            </button>
          </div>
        </div>

        {/* Turn & Castling Rights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2">
            <span className="font-bold text-[#9CA3AF] block">Vez de Jogar</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => updateFenPart(1, 'w')}
                className={`py-1.5 rounded-lg font-bold border ${
                  turn === 'w'
                    ? 'bg-white text-[#0B0E14] border-white'
                    : 'bg-[#131822] text-[#9CA3AF] border-[#232C3D]'
                }`}
              >
                ♙ Brancas
              </button>
              <button
                onClick={() => updateFenPart(1, 'b')}
                className={`py-1.5 rounded-lg font-bold border ${
                  turn === 'b'
                    ? 'bg-[#38BDF8] text-[#0B0E14] border-[#38BDF8]'
                    : 'bg-[#131822] text-[#9CA3AF] border-[#232C3D]'
                }`}
              >
                ♟ Pretas
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2">
            <span className="font-bold text-[#9CA3AF] block">Direitos de Roque</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'K', label: 'Brancas O-O' },
                  { id: 'Q', label: 'Brancas O-O-O' },
                  { id: 'k', label: 'Pretas O-O' },
                  { id: 'q', label: 'Pretas O-O-O' },
                ] as const
              ).map((cRight) => (
                <label
                  key={cRight.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#131822] border border-[#232C3D] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={castling.includes(cRight.id)}
                    onChange={() => toggleCastleRight(cRight.id)}
                    className="accent-[#C89D54]"
                  />
                  <span className="text-[11px]">{cRight.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* FEN String Box */}
        <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#9CA3AF]">Código FEN da Posição</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(fen);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="text-[11px] text-[#C89D54] hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'FEN Copiado!' : 'Copiar FEN'}
            </button>
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#131822] border border-[#232C3D] font-mono text-[11px] text-white"
            />
            <button
              onClick={() => {
                try {
                  new Chess(fenInput.trim());
                  onUpdateFen(fenInput.trim());
                  setErrorMsg(null);
                } catch {
                  setErrorMsg('O código FEN colado é inválido.');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#1B2230] hover:bg-[#C89D54] text-[#C89D54] hover:text-[#0B0E14] font-bold transition"
            >
              Aplicar
            </button>
          </div>
        </div>

        {/* Action Launch Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => validateAndStart('play-w')}
            className="py-2.5 px-3 rounded-xl bg-[#C89D54] hover:bg-[#d6ad65] text-[#0B0E14] font-bold flex items-center justify-center gap-1.5 shadow transition"
          >
            <Play className="w-3.5 h-3.5" /> Jogar de Brancas
          </button>
          <button
            onClick={() => validateAndStart('play-b')}
            className="py-2.5 px-3 rounded-xl bg-[#38BDF8] hover:bg-[#60A5FA] text-[#0B0E14] font-bold flex items-center justify-center gap-1.5 shadow transition"
          >
            <Play className="w-3.5 h-3.5" /> Jogar de Pretas
          </button>
          <button
            onClick={() => validateAndStart('analyze')}
            className="py-2.5 px-3 rounded-xl bg-[#1B2230] hover:bg-[#232C3D] border border-[#C89D54]/50 text-[#C89D54] font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> Analisar com Stockfish
          </button>
        </div>
      </div>
    </div>
  );
};
