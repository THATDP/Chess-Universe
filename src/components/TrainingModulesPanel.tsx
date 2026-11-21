import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  EndgameScenario,
  OpeningStudyItem,
  PieceColor,
  TacticalChallenge,
} from '../types/chess';

interface TrainingModulesPanelProps {
  activeMode: 'openings' | 'tactics' | 'endgames';
  // Openings props
  openings: OpeningStudyItem[];
  selectedOpening: OpeningStudyItem;
  currentOpeningPly: number;
  onSelectOpening: (item: OpeningStudyItem) => void;
  onStepOpeningMove: (ply: number) => void;
  onPracticeOpeningVsAI: (item: OpeningStudyItem, color: PieceColor) => void;
  // Tactics props
  tactics: TacticalChallenge[];
  selectedTactic: TacticalChallenge;
  tacticStatus: 'solving' | 'correct' | 'wrong';
  tacticMessage: string;
  solvedTacticsIds: string[];
  tacticsRating: number;
  tacticsStreak: number;
  onSelectTactic: (item: TacticalChallenge) => void;
  onRetryTactic: () => void;
  onNextTactic: () => void;
  onShowTacticSolution: () => void;
  // Endgames props
  endgames: EndgameScenario[];
  selectedEndgame: EndgameScenario;
  completedEndgamesIds: string[];
  endgameStatus: string;
  onSelectEndgame: (item: EndgameScenario) => void;
  onRestartEndgame: () => void;
}

export const TrainingModulesPanel: React.FC<TrainingModulesPanelProps> = ({
  activeMode,
  openings,
  selectedOpening,
  currentOpeningPly,
  onSelectOpening,
  onStepOpeningMove,
  onPracticeOpeningVsAI,
  tactics,
  selectedTactic,
  tacticStatus,
  tacticMessage,
  solvedTacticsIds,
  tacticsRating,
  tacticsStreak,
  onSelectTactic,
  onRetryTactic,
  onNextTactic,
  onShowTacticSolution,
  endgames,
  selectedEndgame,
  completedEndgamesIds,
  endgameStatus,
  onSelectEndgame,
  onRestartEndgame,
}) => {
  const [showHint, setShowHint] = useState(false);

  if (activeMode === 'openings') {
    return (
      <div className="flex flex-col h-full bg-[#131822] border border-[#232C3D] rounded-xl overflow-hidden text-xs">
        <div className="p-3.5 bg-gradient-to-r from-[#171E2C] to-[#131822] border-b border-[#232C3D] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8]">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F3F4F6]">ENCICLOPÉDIA & ESTUDO DE ABERTURAS</h2>
            <p className="text-[11px] text-[#9CA3AF]">
              Explore planos estratégicos de Brancas e Pretas e pratique a posição contra o Stockfish
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {/* Opening Selector List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {openings.map((op) => {
              const isSelected = op.id === selectedOpening.id;
              return (
                <button
                  key={op.id}
                  onClick={() => onSelectOpening(op)}
                  className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#C89D54]/20 border-[#C89D54] text-white'
                      : 'bg-[#0B0E14] hover:bg-[#1B2230] border-[#232C3D] text-[#9CA3AF]'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-[#F3F4F6] truncate">{op.name}</div>
                    <div className="text-[10px] text-[#9CA3AF]">{op.category}</div>
                  </div>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#131822] text-[#C89D54] shrink-0">
                    {op.eco}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Move Stepper */}
          <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#C89D54]">{selectedOpening.name}</span>
              <span className="text-[11px] text-[#9CA3AF]">
                Clique em qualquer lance para inspecionar:
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-[#131822] border border-[#232C3D] font-mono-tabular">
              {selectedOpening.movesSan.map((san, idx) => {
                const ply = idx + 1;
                const moveNum = Math.floor(idx / 2) + 1;
                const isWhite = idx % 2 === 0;
                const isActive = currentOpeningPly === ply;
                return (
                  <button
                    key={idx}
                    onClick={() => onStepOpeningMove(ply)}
                    className={`px-2 py-0.5 rounded text-xs transition ${
                      isActive
                        ? 'bg-[#C89D54] text-[#0B0E14] font-bold'
                        : ply < currentOpeningPly
                        ? 'text-[#10B981] hover:bg-[#1B2230]'
                        : 'text-[#D1D5DB] hover:bg-[#1B2230]'
                    }`}
                  >
                    {isWhite ? `${moveNum}.${san}` : san}
                  </button>
                );
              })}
            </div>

            <p className="text-[#D1D5DB] leading-relaxed">{selectedOpening.description}</p>
          </div>

          {/* Strategic Plans for White & Black */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-1.5">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                ♙ Planos Estratégicos das Brancas
              </h4>
              <ul className="space-y-1 text-[11px] text-[#D1D5DB]">
                {selectedOpening.keyPlansWhite.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#C89D54] font-bold">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-1.5">
              <h4 className="font-bold text-[#38BDF8] uppercase tracking-wider text-[11px]">
                ♟ Planos Estratégicos das Pretas
              </h4>
              <ul className="space-y-1 text-[11px] text-[#D1D5DB]">
                {selectedOpening.keyPlansBlack.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#38BDF8] font-bold">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Practice against Stockfish */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onPracticeOpeningVsAI(selectedOpening, 'w')}
              className="py-2.5 px-3 rounded-xl bg-[#C89D54] hover:bg-[#d6ad65] text-[#0B0E14] font-bold flex items-center justify-center gap-1.5 shadow transition"
            >
              <Play className="w-3.5 h-3.5" /> Praticar de Brancas vs IA
            </button>
            <button
              onClick={() => onPracticeOpeningVsAI(selectedOpening, 'b')}
              className="py-2.5 px-3 rounded-xl bg-[#1B2230] hover:bg-[#232C3D] border border-[#C89D54]/50 text-[#F3F4F6] font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5" /> Praticar de Pretas vs IA
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeMode === 'tactics') {
    return (
      <div className="flex flex-col h-full bg-[#131822] border border-[#232C3D] rounded-xl overflow-hidden text-xs">
        <div className="p-3.5 bg-gradient-to-r from-[#171E2C] to-[#131822] border-b border-[#232C3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F3F4F6]">DESAFIOS TÁTICOS & COMBINAÇÕES</h2>
              <p className="text-[11px] text-[#9CA3AF]">
                Encontre a sequência vencedora forçada no tabuleiro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono-tabular">
            <div className="text-right">
              <span className="text-[10px] text-[#9CA3AF] block">Rating Tático</span>
              <span className="text-sm font-extrabold text-[#C89D54]">{tacticsRating}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#9CA3AF] block">Sequência</span>
              <span className="text-sm font-extrabold text-[#10B981]">🔥 {tacticsStreak}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
          {/* Active Challenge Status Card */}
          <div
            className={`p-3.5 rounded-xl border space-y-2 ${
              tacticStatus === 'correct'
                ? 'bg-[#10B981]/15 border-[#10B981]'
                : tacticStatus === 'wrong'
                ? 'bg-[#EF4444]/15 border-[#EF4444]'
                : 'bg-[#0B0E14] border-[#C89D54]/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{selectedTactic.title}</span>
              <span className="px-2 py-0.5 rounded-full bg-[#131822] border border-[#232C3D] text-[#C89D54] font-mono text-[11px]">
                {selectedTactic.difficulty} • {selectedTactic.elo} ELO
              </span>
            </div>

            <div className="text-xs font-semibold text-[#D1D5DB]">{tacticMessage}</div>

            {tacticStatus === 'correct' && (
              <div className="p-2.5 rounded-lg bg-[#0B0E14]/90 border border-[#10B981]/40 text-[#D1D5DB] text-[11px]">
                <strong className="text-[#10B981]">Explicação Mestre:</strong>{' '}
                {selectedTactic.explanation}
              </div>
            )}

            {showHint && tacticStatus !== 'correct' && (
              <div className="p-2.5 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[11px] flex items-start gap-1.5">
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{selectedTactic.hint}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => setShowHint(!showHint)}
                className="px-2.5 py-1.5 rounded-lg bg-[#1B2230] hover:bg-[#232C3D] border border-[#232C3D] text-[#F59E0B] font-semibold flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Dica Tática
              </button>
              <button
                onClick={onRetryTactic}
                className="px-2.5 py-1.5 rounded-lg bg-[#1B2230] hover:bg-[#232C3D] border border-[#232C3D] text-white font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Tentar Novamente
              </button>
              <button
                onClick={onShowTacticSolution}
                className="px-2.5 py-1.5 rounded-lg bg-[#1B2230] hover:bg-[#232C3D] border border-[#232C3D] text-[#38BDF8] font-semibold"
              >
                Ver Solução ({selectedTactic.solutionSan[0]})
              </button>
              <button
                onClick={() => {
                  setShowHint(false);
                  onNextTactic();
                }}
                className="ml-auto px-3 py-1.5 rounded-lg bg-[#C89D54] hover:bg-[#d6ad65] text-[#0B0E14] font-bold flex items-center gap-1"
              >
                Próximo Desafio <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* All Challenges List */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#9CA3AF] uppercase tracking-wider text-[11px]">
              Catálogo de Problemas Táticos ({solvedTacticsIds.length}/{tactics.length} Resolvidos)
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {tactics.map((tac) => {
                const isSolved = solvedTacticsIds.includes(tac.id);
                const isCurrent = tac.id === selectedTactic.id;
                return (
                  <button
                    key={tac.id}
                    onClick={() => {
                      setShowHint(false);
                      onSelectTactic(tac);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-[#1B2230] border-[#C89D54]'
                        : 'bg-[#0B0E14] hover:bg-[#1B2230]/60 border-[#232C3D]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {isSolved && <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
                        {tac.title}
                      </div>
                      <div className="text-[10px] text-[#9CA3AF]">{tac.theme}</div>
                    </div>
                    <span className="font-mono text-[11px] text-[#C89D54]">{tac.elo} ELO</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ENDGAME TRAINING MODE
  return (
    <div className="flex flex-col h-full bg-[#131822] border border-[#232C3D] rounded-xl overflow-hidden text-xs">
      <div className="p-3.5 bg-gradient-to-r from-[#171E2C] to-[#131822] border-b border-[#232C3D] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/20 border border-[#A78BFA]/40 flex items-center justify-center text-[#A78BFA]">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F3F4F6]">TREINAMENTO TÉCNICO DE FINAIS</h2>
            <p className="text-[11px] text-[#9CA3AF]">
              Converta posições teóricas vencidas jogando diretamente contra a defesa do Stockfish
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] font-bold text-[11px]">
          {completedEndgamesIds.length}/{endgames.length} Dominados
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#C89D54]/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{selectedEndgame.title}</h3>
            <button
              onClick={onRestartEndgame}
              className="px-2.5 py-1 rounded-lg bg-[#C89D54] text-[#0B0E14] font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reiniciar Final
            </button>
          </div>

          <div className="px-2.5 py-1.5 rounded bg-[#131822] border border-[#232C3D] text-[#C89D54] font-semibold">
            Status: {endgameStatus}
          </div>

          <p className="text-[#D1D5DB] leading-relaxed">{selectedEndgame.theoryExplanation}</p>

          <div className="space-y-1 pt-1">
            <span className="font-bold text-[#10B981] uppercase tracking-wider text-[10px]">
              Técnica Vencedora Passo a Passo:
            </span>
            <ul className="space-y-1 text-[11px] text-[#D1D5DB]">
              {selectedEndgame.keyTechnique.map((step, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#C89D54] shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Endgame Scenarios List */}
        <div className="space-y-1.5">
          <h4 className="font-bold text-[#9CA3AF] uppercase tracking-wider text-[11px]">
            Selecione o Cenário de Final
          </h4>
          {endgames.map((eg) => {
            const isDone = completedEndgamesIds.includes(eg.id);
            const isActive = eg.id === selectedEndgame.id;
            return (
              <button
                key={eg.id}
                onClick={() => onSelectEndgame(eg)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                  isActive
                    ? 'bg-[#1B2230] border-[#C89D54]'
                    : 'bg-[#0B0E14] hover:bg-[#1B2230]/60 border-[#232C3D]'
                }`}
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    {isDone && <Award className="w-3.5 h-3.5 text-[#10B981]" />}
                    {eg.title}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF]">
                    Categoria: {eg.category} • Nível: {eg.difficulty}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#131822] text-[#C89D54] text-[10px] font-bold">
                  Praticar →
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
