import React, { useState } from 'react';
import { Chess } from 'chess.js';
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Cpu,
  Flame,
  GitBranch,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import {
  CustomTrainingItem,
  EngineTelemetry,
  GambitDefenseLine,
  GambitDefinition,
  GambitMoveNode,
  GambitStartPosition,
  PieceColor,
} from '../types/chess';

interface GambitLabPanelProps {
  gambits: GambitDefinition[];
  selectedGambit: GambitDefinition;
  selectedDefense: GambitDefenseLine;
  selectedStartPos: GambitStartPosition;
  trainingColor: PieceColor;
  currentPly: number;
  inTheory: boolean;
  theoryCompleted: boolean;
  freePlayOverride: boolean;
  currentFen: string;
  telemetry: EngineTelemetry;
  favoriteGambits: string[];
  studiedLines: string[];
  customTrainings: CustomTrainingItem[];
  onSelectGambit: (gambit: GambitDefinition) => void;
  onSelectDefense: (defense: GambitDefenseLine) => void;
  onSelectStartPos: (startPos: GambitStartPosition) => void;
  onChangeTrainingColor: (color: PieceColor) => void;
  onStartTraining: () => void;
  onToggleFreePlay: () => void;
  onJumpToFen: (fen: string, ply: number, comment?: string) => void;
  onPlayBookMove: (san: string) => void;
  onToggleFavorite: (gambitId: string) => void;
  onAddCustomTraining: (item: CustomTrainingItem) => void;
  onDeleteCustomTraining: (id: string) => void;
  onLoadCustomTraining: (item: CustomTrainingItem) => void;
}

export const GambitLabPanel: React.FC<GambitLabPanelProps> = ({
  gambits,
  selectedGambit,
  selectedDefense,
  selectedStartPos,
  trainingColor,
  currentPly,
  inTheory,
  theoryCompleted,
  freePlayOverride,
  currentFen,
  telemetry,
  favoriteGambits,
  studiedLines,
  customTrainings,
  onSelectGambit,
  onSelectDefense,
  onSelectStartPos,
  onChangeTrainingColor,
  onStartTraining,
  onToggleFreePlay,
  onJumpToFen,
  onPlayBookMove,
  onToggleFavorite,
  onAddCustomTraining,
  onDeleteCustomTraining,
  onLoadCustomTraining,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'w' | 'b' | 'fav' | 'custom'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'defenses' | 'tree' | 'guide' | 'custom-form'>('defenses');
  const [showBookHint, setShowBookHint] = useState(true);

  // Custom Training creator state
  const [customTitle, setCustomTitle] = useState('');
  const [customColor, setCustomColor] = useState<PieceColor>('w');
  const [customFen, setCustomFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [customPgnMoves, setCustomPgnMoves] = useState('1. e4 e5 2. Bc4 Nf6 3. d4 exd4 4. Nf3');
  const [customNotes, setCustomNotes] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const filteredGambits = gambits.filter((g) => {
    if (filterTab === 'w') return g.repertoireColor === 'w';
    if (filterTab === 'b') return g.repertoireColor === 'b';
    if (filterTab === 'fav') return favoriteGambits.includes(g.id);
    return true;
  });

  const expectedBookMove =
    inTheory && !freePlayOverride && currentPly < selectedDefense.movesSan.length
      ? selectedDefense.movesSan[currentPly]
      : null;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!customTitle.trim()) {
      setCustomError('Informe um título para o treinamento personalizado.');
      return;
    }

    try {
      const testChess = new Chess(customFen.trim());
      // Parse PGN or space-separated SAN moves
      const cleaned = customPgnMoves
        .replace(/\{[^}]*\}/g, '')
        .replace(/\d+\.+/g, ' ')
        .trim();
      const tokens = cleaned.split(/\s+/).filter(Boolean);
      const validSan: string[] = [];

      for (const tok of tokens) {
        if (['1-0', '0-1', '1/2-1/2', '*'].includes(tok)) continue;
        const m = testChess.move(tok);
        if (!m) {
          setCustomError(`Lance inválido "${tok}" a partir da posição FEN informada.`);
          return;
        }
        validSan.push(m.san);
      }

      if (validSan.length === 0) {
        setCustomError('Insira ao menos 1 lance válido na sequência PGN/SAN.');
        return;
      }

      const newItem: CustomTrainingItem = {
        id: `custom-${Date.now()}`,
        title: customTitle.trim(),
        color: customColor,
        initialFen: customFen.trim(),
        movesSan: validSan,
        notes: customNotes.trim() || 'Treinamento personalizado criado pelo usuário.',
        createdAt: new Date().toISOString().slice(0, 10),
      };

      onAddCustomTraining(newItem);
      setCustomTitle('');
      setCustomNotes('');
      setActiveSubTab('defenses');
    } catch {
      setCustomError('A posição FEN inicial fornecida é inválida.');
    }
  };

  // Recursive variation tree renderer
  const renderTreeNodes = (nodes: GambitMoveNode[], depthLevel = 0): React.ReactNode => {
    if (!nodes || nodes.length === 0) return null;

    return (
      <div className={`space-y-1.5 ${depthLevel > 0 ? 'pl-3 border-l border-[#232C3D] mt-1' : ''}`}>
        {nodes.map((node) => {
          const isCurrentPos = node.fenAfter === currentFen;
          const isBranchPoint = nodes.length > 1;
          const movePrefix =
            node.color === 'w' ? `${node.moveNumber}.` : `${node.moveNumber}...`;

          return (
            <div key={node.id} className="text-xs">
              <div
                onClick={() => onJumpToFen(node.fenAfter, node.ply, node.comment)}
                className={`flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition border ${
                  isCurrentPos
                    ? 'bg-[#C89D54]/20 border-[#C89D54] text-[#F3F4F6]'
                    : 'bg-[#131822]/90 hover:bg-[#1B2230] border-[#232C3D]/80 text-[#D1D5DB]'
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono-tabular font-bold text-[#C89D54]">
                      {movePrefix} {node.san}
                    </span>
                    {isBranchPoint && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#38BDF8]/15 text-[#38BDF8] font-medium flex items-center gap-0.5">
                        <GitBranch className="w-2.5 h-2.5" /> Variante
                      </span>
                    )}
                    {node.badge === 'brilliant' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] font-bold">
                        !! Brilhante
                      </span>
                    )}
                    {node.isTrap && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EF4444]/20 text-[#EF4444] font-bold">
                        Armadilha!
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] leading-snug">{node.comment}</p>
                  {node.trapWarning && (
                    <p className="text-[10px] text-[#F97316] font-medium">
                      ⚠ {node.trapWarning}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">
                  Ir →
                </span>
              </div>
              {node.children.length > 0 && renderTreeNodes(node.children, depthLevel + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#131822] border border-[#232C3D] rounded-xl overflow-hidden">
      {/* Header Banner */}
      <div className="p-3.5 bg-gradient-to-r from-[#171E2C] via-[#1B2230] to-[#131822] border-b border-[#232C3D] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C89D54]/20 border border-[#C89D54]/50 flex items-center justify-center text-[#C89D54]">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F3F4F6] tracking-wide flex items-center gap-1.5">
              LABORATÓRIO DE GAMBITOS
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C89D54]/20 text-[#C89D54] font-mono">
                PRO
              </span>
            </h2>
            <p className="text-[11px] text-[#9CA3AF]">
              Treine linhas principais, defesas da IA, armadilhas e transições para o Stockfish
            </p>
          </div>
        </div>

        <button
          onClick={() => onToggleFavorite(selectedGambit.id)}
          className={`p-2 rounded-lg border transition ${
            favoriteGambits.includes(selectedGambit.id)
              ? 'bg-[#C89D54]/20 border-[#C89D54] text-[#C89D54]'
              : 'bg-[#1B2230] border-[#232C3D] text-[#9CA3AF] hover:text-white'
          }`}
          title="Favoritar este Gambito"
        >
          <Star
            className="w-4 h-4"
            fill={favoriteGambits.includes(selectedGambit.id) ? '#C89D54' : 'none'}
          />
        </button>
      </div>

      {/* Repertoire Filter Bar */}
      <div className="px-3 pt-2.5 pb-2 border-b border-[#232C3D] space-y-2 bg-[#0F131C]">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'Todos (10)' },
            { id: 'w', label: '♙ Brancas (6)' },
            { id: 'b', label: '♟ Pretas (4)' },
            { id: 'fav', label: `★ Favoritos (${favoriteGambits.length})` },
            { id: 'custom', label: `⚡ Meus Treinos (${customTrainings.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as typeof filterTab)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                filterTab === tab.id
                  ? 'bg-[#C89D54] text-[#0B0E14] font-bold'
                  : 'bg-[#1B2230] text-[#9CA3AF] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gambit Selector Dropdown or Custom List */}
        {filterTab !== 'custom' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
            {filteredGambits.map((g) => {
              const isSelected = g.id === selectedGambit.id;
              return (
                <button
                  key={g.id}
                  onClick={() => onSelectGambit(g)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left border transition ${
                    isSelected
                      ? 'bg-[#C89D54]/18 border-[#C89D54] text-[#F3F4F6]'
                      : 'bg-[#131822] hover:bg-[#1B2230] border-[#232C3D] text-[#9CA3AF]'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-bold text-[#F3F4F6] flex items-center gap-1.5 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          g.repertoireColor === 'w' ? 'bg-white' : 'bg-[#60A5FA]'
                        }`}
                      />
                      {g.name}
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] truncate">{g.subtitle}</div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B0E14] text-[#C89D54] shrink-0">
                    {g.eco}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {customTrainings.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#131822] border border-[#232C3D]"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate">{item.title}</div>
                  <div className="text-[10px] font-mono text-[#C89D54] truncate">
                    {item.movesSan.join(' ')}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onLoadCustomTraining(item)}
                    className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 text-[11px] font-bold"
                  >
                    Treinar
                  </button>
                  <button
                    onClick={() => onDeleteCustomTraining(item.id)}
                    className="p-1 text-[#9CA3AF] hover:text-[#EF4444]"
                    title="Excluir treino"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setActiveSubTab('custom-form')}
              className="w-full py-1.5 rounded-lg border border-dashed border-[#C89D54]/60 text-xs text-[#C89D54] hover:bg-[#C89D54]/10 flex items-center justify-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Criar Novo Treinamento FEN / PGN
            </button>
          </div>
        )}
      </div>

      {/* Live Theory Status Banner & Controls */}
      <div className="px-3.5 py-2.5 bg-[#161C28] border-b border-[#232C3D] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {theoryCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
              <CheckCircle2 className="w-3.5 h-3.5" /> Linha Teórica Concluída! (Stockfish Livre)
            </span>
          ) : inTheory && !freePlayOverride ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#C89D54]/20 text-[#C89D54] border border-[#C89D54]/40">
              <BookOpen className="w-3.5 h-3.5" /> Em Teoria ({currentPly}/{selectedDefense.movesSan.length} lances)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40">
              <Cpu className="w-3.5 h-3.5" /> Fora da Teoria — Jogo Livre vs Stockfish
            </span>
          )}

          {expectedBookMove && showBookHint && (
            <button
              onClick={() => onPlayBookMove(expectedBookMove)}
              className="text-xs px-2 py-0.5 rounded bg-[#1B2230] hover:bg-[#C89D54]/25 text-[#F3F4F6] border border-[#232C3D] font-mono-tabular transition"
              title="Clique para executar o lance teórico no tabuleiro"
            >
              Lance Teórico: <strong className="text-[#C89D54]">{expectedBookMove}</strong>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onStartTraining}
            className="px-2.5 py-1 rounded-lg bg-[#C89D54] hover:bg-[#d6ad65] text-[#0B0E14] font-bold text-xs flex items-center gap-1 transition shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar Linha
          </button>
          <button
            onClick={onToggleFreePlay}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
              freePlayOverride
                ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]'
                : 'bg-[#1B2230] border-[#232C3D] text-[#9CA3AF] hover:text-white'
            }`}
            title="Interromper a sequência forçada e jogar livremente contra o Stockfish a partir desta posição"
          >
            {freePlayOverride ? 'Voltar à Teoria' : 'Jogar Livre (Stockfish)'}
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-[#232C3D] bg-[#131822] text-xs font-semibold">
        {[
          { id: 'defenses', label: 'Defesas & Config', icon: Compass },
          { id: 'tree', label: 'Árvore de Variantes', icon: GitBranch },
          { id: 'guide', label: 'Explicação & Armadilhas', icon: ShieldAlert },
          { id: 'custom-form', label: '+ Criar FEN/PGN', icon: Sparkles },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id as typeof activeSubTab)}
              className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeSubTab === t.id
                  ? 'border-[#C89D54] text-[#C89D54] bg-[#1B2230]/50'
                  : 'border-transparent text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {activeSubTab === 'defenses' && (
          <>
            {/* Training Configuration Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#0B0E14] p-3 rounded-xl border border-[#232C3D]">
              <div>
                <label className="block text-[11px] font-semibold text-[#9CA3AF] mb-1">
                  1. Sua Cor no Treinamento
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => onChangeTrainingColor('w')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      trainingColor === 'w'
                        ? 'bg-white text-[#0B0E14] border-white'
                        : 'bg-[#131822] text-[#9CA3AF] border-[#232C3D]'
                    }`}
                  >
                    ♙ Brancas
                  </button>
                  <button
                    onClick={() => onChangeTrainingColor('b')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      trainingColor === 'b'
                        ? 'bg-[#38BDF8] text-[#0B0E14] border-[#38BDF8]'
                        : 'bg-[#131822] text-[#9CA3AF] border-[#232C3D]'
                    }`}
                  >
                    ♟ Pretas
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#9CA3AF] mb-1">
                  2. Posição Inicial do Treino
                </label>
                <select
                  value={selectedStartPos.id}
                  onChange={(e) => {
                    const found = selectedGambit.startPositions.find((s) => s.id === e.target.value);
                    if (found) onSelectStartPos(found);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#131822] border border-[#232C3D] text-xs text-white focus:outline-none focus:border-[#C89D54]"
                >
                  {selectedGambit.startPositions.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selectable AI Defenses & Variations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                  3. Escolha a Defesa / Variante que a IA Executará ({selectedGambit.defenses.length})
                </h3>
                <label className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBookHint}
                    onChange={(e) => setShowBookHint(e.target.checked)}
                    className="rounded accent-[#C89D54]"
                  />
                  Mostrar Dica Teórica
                </label>
              </div>

              <div className="space-y-2">
                {selectedGambit.defenses.map((def) => {
                  const isActive = def.id === selectedDefense.id;
                  const isStudied = studiedLines.includes(def.id);

                  const catBadgeColor =
                    def.category === 'Aceito'
                      ? 'bg-[#10B981]/15 text-[#10B981]'
                      : def.category === 'Recusado'
                      ? 'bg-[#38BDF8]/15 text-[#38BDF8]'
                      : def.category === 'Contra-Gambito'
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      : def.category === 'Armadilha'
                      ? 'bg-[#EF4444]/15 text-[#EF4444]'
                      : 'bg-[#A78BFA]/15 text-[#A78BFA]';

                  return (
                    <div
                      key={def.id}
                      onClick={() => onSelectDefense(def)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        isActive
                          ? 'bg-[#1B2230] border-[#C89D54] shadow-md'
                          : 'bg-[#0B0E14]/80 hover:bg-[#1B2230]/60 border-[#232C3D]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catBadgeColor}`}>
                            {def.category}
                          </span>
                          <h4 className="text-xs font-bold text-[#F3F4F6]">{def.name}</h4>
                          {isStudied && (
                            <span className="text-[10px] text-[#10B981] flex items-center gap-0.5 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Concluída
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDefense(def);
                          }}
                          className="px-2 py-1 rounded bg-[#C89D54]/20 hover:bg-[#C89D54] text-[#C89D54] hover:text-[#0B0E14] text-[11px] font-bold flex items-center gap-1 transition shrink-0"
                        >
                          <Play className="w-3 h-3" /> Treinar
                        </button>
                      </div>

                      <p className="text-[11px] text-[#9CA3AF] mb-2">{def.description}</p>

                      {/* Sequence of SAN Moves */}
                      <div className="flex flex-wrap gap-1 bg-[#0B0E14] p-2 rounded-lg border border-[#232C3D]/70 font-mono-tabular text-[11px]">
                        {def.movesSan.map((san, idx) => {
                          const moveNum = Math.floor(idx / 2) + 1;
                          const isWhite = idx % 2 === 0;
                          const isDone = isActive && idx < currentPly;
                          const isNext = isActive && idx === currentPly;

                          return (
                            <span
                              key={idx}
                              className={`px-1 rounded ${
                                isNext
                                  ? 'bg-[#C89D54] text-[#0B0E14] font-bold'
                                  : isDone
                                  ? 'text-[#10B981]'
                                  : 'text-[#D1D5DB]'
                              }`}
                            >
                              {isWhite ? `${moveNum}.${san}` : san}
                            </span>
                          );
                        })}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-[#C89D54] font-medium">💡 {def.keyIdea}</span>
                        <span className="font-mono text-[#9CA3AF] shrink-0 ml-2">
                          {def.evaluationVerdict}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stockfish Comparison Box */}
            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F3F4F6] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#10B981]" />
                  Consulta em Tempo Real ao Stockfish
                </span>
                <span className="text-[11px] font-mono text-[#10B981]">
                  Profundidade {telemetry.depth} |{' '}
                  {telemetry.mate !== null
                    ? `Mate em ${Math.abs(telemetry.mate)}`
                    : `${telemetry.scoreCp >= 0 ? '+' : ''}${(telemetry.scoreCp / 100).toFixed(2)}`}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                Melhor continuação calculada:{' '}
                <strong className="font-mono text-white">
                  {telemetry.bestMoveSan || 'Calculando...'}
                </strong>
                {telemetry.lines[0]?.pvSan && (
                  <span className="ml-2 font-mono text-[11px] text-[#9CA3AF]">
                    ({telemetry.lines[0].pvSan.slice(0, 6).join(' ')})
                  </span>
                )}
              </p>
            </div>
          </>
        )}

        {activeSubTab === 'tree' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-[#0B0E14] border border-[#232C3D] text-xs text-[#9CA3AF]">
              Clique em qualquer lance da <strong className="text-white">Árvore de Variantes</strong> abaixo
              para saltar instantaneamente para aquela posição, comparar defesas ou continuar jogando contra o Stockfish:
            </div>
            {renderTreeNodes(selectedGambit.tree)}
          </div>
        )}

        {activeSubTab === 'guide' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D]">
              <h4 className="font-bold text-[#C89D54] mb-1 text-sm">{selectedGambit.name}</h4>
              <p className="text-[#D1D5DB] leading-relaxed">{selectedGambit.overview}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D]">
              <h4 className="font-bold text-[#10B981] mb-2 uppercase tracking-wider text-[11px]">
                Objetivos Estratégicos e Táticos
              </h4>
              <ul className="space-y-1.5 text-[#D1D5DB]">
                {selectedGambit.strategicGoals.map((goal, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#10B981] font-bold">•</span>
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#EF4444]/40">
              <h4 className="font-bold text-[#EF4444] mb-2 uppercase tracking-wider text-[11px]">
                Armadilhas Táticas e Perigos
              </h4>
              <ul className="space-y-1.5 text-[#D1D5DB]">
                {selectedGambit.commonTraps.map((trap, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#EF4444] font-bold">⚠</span>
                    <span>{trap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeSubTab === 'custom-form' && (
          <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2.5">
              <h4 className="font-bold text-[#C89D54] text-sm">
                Criar Treinamento Personalizado (FEN ou Sequência PGN)
              </h4>
              <p className="text-[11px] text-[#9CA3AF]">
                Configure qualquer gambito, variante ou posição específica para treinar contra a IA.
              </p>

              {customError && (
                <div className="p-2 rounded bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] text-[11px]">
                  {customError}
                </div>
              )}

              <div>
                <label className="block text-[#9CA3AF] mb-1 font-medium">Nome do Treinamento</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex: Meu Gambito Letão ou Armadilha em 1.e4"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131822] border border-[#232C3D] text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#9CA3AF] mb-1 font-medium">Treinar de</label>
                  <select
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value as PieceColor)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#131822] border border-[#232C3D] text-white"
                  >
                    <option value="w">Brancas</option>
                    <option value="b">Pretas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#9CA3AF] mb-1 font-medium">Usar FEN Atual?</label>
                  <button
                    type="button"
                    onClick={() => setCustomFen(currentFen)}
                    className="w-full py-1.5 px-2 rounded-lg bg-[#1B2230] hover:bg-[#C89D54]/20 border border-[#232C3D] text-[#C89D54] font-semibold"
                  >
                    Capturar FEN do Tabuleiro
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#9CA3AF] mb-1 font-medium">Posição FEN Inicial</label>
                <input
                  type="text"
                  value={customFen}
                  onChange={(e) => setCustomFen(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131822] border border-[#232C3D] text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] mb-1 font-medium">
                  Sequência de Lances Teóricos (PGN ou SAN)
                </label>
                <textarea
                  rows={2}
                  value={customPgnMoves}
                  onChange={(e) => setCustomPgnMoves(e.target.value)}
                  placeholder="Ex: 1. e4 e5 2. f4 exf4 3. Nf3 g5"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131822] border border-[#232C3D] text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] mb-1 font-medium">Notas Estratégicas</label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ideia chave desta variante..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131822] border border-[#232C3D] text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-[#C89D54] hover:bg-[#d6ad65] text-[#0B0E14] font-bold transition"
              >
                Salvar e Iniciar Treinamento Personalizado
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
