import React, { useState } from 'react';
import {
  History,
  Music,
  Palette,
  Play,
  Settings,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  PieceStyleId,
  SavedGameRecord,
  UserPreferences,
  UserStatistics,
} from '../types/chess';
import { BOARD_THEMES } from '../data/openingsAndTrainingData';
import { soundEngine, SoundEventType } from '../audio/soundEngine';

interface SettingsAndHistoryModalProps {
  isOpen: boolean;
  initialTab?: 'settings' | 'audio' | 'history';
  preferences: UserPreferences;
  statistics: UserStatistics;
  history: SavedGameRecord[];
  onClose: () => void;
  onUpdatePreferences: (newPrefs: UserPreferences) => void;
  onLoadGameFromHistory: (game: SavedGameRecord) => void;
  onClearHistory: () => void;
}

export const SettingsAndHistoryModal: React.FC<SettingsAndHistoryModalProps> = ({
  isOpen,
  initialTab = 'settings',
  preferences,
  statistics,
  history,
  onClose,
  onUpdatePreferences,
  onLoadGameFromHistory,
  onClearHistory,
}) => {
  const [tab, setTab] = useState<'settings' | 'audio' | 'history'>(initialTab);

  if (!isOpen) return null;

  const updateAudio = (patch: Partial<UserPreferences['audio']>) => {
    const nextAudio = { ...preferences.audio, ...patch };
    onUpdatePreferences({ ...preferences, audio: nextAudio });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#131822] border border-[#232C3D] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden text-xs">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-[#0B0E14] border-b border-[#232C3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-[#C89D54]" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              CENTRAL DE CONFIGURAÇÕES, ÁUDIO & HISTÓRICO LOCAL
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1B2230] text-[#9CA3AF] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#232C3D] bg-[#131822] font-bold">
          <button
            onClick={() => setTab('settings')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'settings'
                ? 'border-[#C89D54] text-[#C89D54] bg-[#1B2230]/50'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> Tabuleiro, Temas & IA
          </button>
          <button
            onClick={() => setTab('audio')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'audio'
                ? 'border-[#C89D54] text-[#C89D54] bg-[#1B2230]/50'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" /> Áudio & Música Ambiente
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'history'
                ? 'border-[#C89D54] text-[#C89D54] bg-[#1B2230]/50'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Estatísticas & Partidas ({history.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'settings' && (
            <>
              {/* Board Themes */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Tema do Tabuleiro 2D
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {BOARD_THEMES.map((t) => {
                    const isSelected = preferences.boardTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => onUpdatePreferences({ ...preferences, boardTheme: t.id })}
                        className={`p-2 rounded-xl border text-center transition ${
                          isSelected
                            ? 'bg-[#1B2230] border-[#C89D54] shadow-md'
                            : 'bg-[#0B0E14] border-[#232C3D] hover:border-[#374151]'
                        }`}
                      >
                        <div className="w-full h-8 rounded overflow-hidden grid grid-cols-2 mb-1.5 border border-black/30">
                          <div style={{ backgroundColor: t.lightSquare }} />
                          <div style={{ backgroundColor: t.darkSquare }} />
                        </div>
                        <span className="font-semibold text-[11px] text-[#F3F4F6] block truncate">
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Piece Styles */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Estilo das Peças
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'neo-staunton', label: 'Neo-Staunton Grandmaster' },
                      { id: 'imperial', label: 'Clássico Imperial' },
                      { id: 'cyber', label: 'Minimalista Cyber-Tático' },
                    ] as Array<{ id: PieceStyleId; label: string }>
                  ).map((ps) => (
                    <button
                      key={ps.id}
                      onClick={() => onUpdatePreferences({ ...preferences, pieceStyle: ps.id })}
                      className={`py-2.5 px-3 rounded-xl border font-bold transition ${
                        preferences.pieceStyle === ps.id
                          ? 'bg-[#C89D54]/20 border-[#C89D54] text-[#C89D54]'
                          : 'bg-[#0B0E14] border-[#232C3D] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {ps.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Toggles */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Assistência Visual & Comportamento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'showCoordinates', label: 'Exibir Coordenadas (a-h / 1-8)' },
                    { key: 'showLegalMoves', label: 'Destacar Movimentos Legais' },
                    { key: 'enableAnimations', label: 'Animações Fluidas de Peças' },
                    { key: 'showEvalBar', label: 'Exibir Barra de Avaliação Lateral' },
                    { key: 'showBestMoveArrow', label: 'Exibir Seta de Sugestão nas Análises' },
                    { key: 'autoQueenPromotion', label: 'Promover Automaticamente para Dama' },
                  ].map((item) => {
                    const checked = Boolean(
                      preferences[item.key as keyof UserPreferences]
                    );
                    return (
                      <label
                        key={item.key}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0E14] border border-[#232C3D] cursor-pointer"
                      >
                        <span className="text-[#D1D5DB] font-medium">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            onUpdatePreferences({
                              ...preferences,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-[#C89D54]"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Stockfish Custom Reflection Time */}
              <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">
                    Tempo de Reflexão do Stockfish (Níveis Avançados / Personalizado)
                  </span>
                  <span className="font-mono font-bold text-[#C89D54]">
                    {(preferences.customThinkTimeMs / 1000).toFixed(2)}s ({preferences.customThinkTimeMs} ms)
                  </span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={4500}
                  step={50}
                  value={preferences.customThinkTimeMs}
                  onChange={(e) =>
                    onUpdatePreferences({
                      ...preferences,
                      customThinkTimeMs: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-[#C89D54]"
                />
                <p className="text-[11px] text-[#9CA3AF]">
                  Ajusta o tempo máximo de cálculo por lance do mecanismo Stockfish no Web Worker.
                </p>
              </div>
            </>
          )}

          {tab === 'audio' && (
            <div className="space-y-4">
              {/* Master Mute & Ambient Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => updateAudio({ muted: !preferences.audio.muted })}
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                    preferences.audio.muted
                      ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]'
                      : 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                  }`}
                >
                  {preferences.audio.muted ? (
                    <>
                      <VolumeX className="w-4 h-4" /> Áudio Silenciado (Clique para Ativar)
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" /> Som Ativo (Clique para Silenciar)
                    </>
                  )}
                </button>

                <button
                  onClick={() =>
                    updateAudio({
                      ambientMusicEnabled: !preferences.audio.ambientMusicEnabled,
                    })
                  }
                  className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                    preferences.audio.ambientMusicEnabled
                      ? 'bg-[#C89D54]/20 border-[#C89D54] text-[#C89D54]'
                      : 'bg-[#0B0E14] border-[#232C3D] text-[#9CA3AF]'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  {preferences.audio.ambientMusicEnabled
                    ? 'Música Ambiente: LIGADA'
                    : 'Música Ambiente: DESLIGADA'}
                </button>
              </div>

              {/* Individual Volume Sliders */}
              <div className="p-4 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-3.5">
                {[
                  { key: 'masterVolume', label: 'Volume Principal (Master)' },
                  { key: 'effectsVolume', label: 'Volume de Peças (Movimento, Captura, Roque)' },
                  { key: 'alertsVolume', label: 'Volume de Alertas (Xeque, Mate, Vitória, Promoção)' },
                  { key: 'ambientVolume', label: 'Volume da Música Ambiente de Concentração' },
                ].map((sl) => {
                  const val = preferences.audio[sl.key as keyof UserPreferences['audio']] as number;
                  return (
                    <div key={sl.key} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-[#D1D5DB]">{sl.label}</span>
                        <span className="font-mono text-[#C89D54]">{Math.round(val * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={val}
                        onChange={(e) =>
                          updateAudio({ [sl.key]: parseFloat(e.target.value) })
                        }
                        className="w-full accent-[#C89D54]"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Acoustic Test Pad */}
              <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2">
                <span className="font-bold text-white block">
                  Testar Efeitos Sonoros Sintetizados:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'move', label: 'Movimento' },
                      { id: 'capture', label: 'Captura' },
                      { id: 'castle', label: 'Roque' },
                      { id: 'check', label: 'Xeque' },
                      { id: 'promote', label: 'Promoção' },
                      { id: 'checkmate', label: 'Xeque-Mate' },
                      { id: 'victory', label: 'Vitória' },
                      { id: 'draw', label: 'Empate' },
                    ] as Array<{ id: SoundEventType; label: string }>
                  ).map((snd) => (
                    <button
                      key={snd.id}
                      onClick={() => soundEngine.play(snd.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#131822] hover:bg-[#C89D54]/20 border border-[#232C3D] hover:border-[#C89D54] text-[#F3F4F6] font-semibold transition"
                    >
                      🔊 {snd.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-4">
              {/* Statistics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] text-center">
                  <span className="text-[10px] text-[#9CA3AF] uppercase block">Partidas</span>
                  <span className="text-lg font-extrabold font-mono text-white">
                    {statistics.gamesPlayed}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] text-center">
                  <span className="text-[10px] text-[#10B981] uppercase block">Vitórias</span>
                  <span className="text-lg font-extrabold font-mono text-[#10B981]">
                    {statistics.wins}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] text-center">
                  <span className="text-[10px] text-[#F59E0B] uppercase block">Empates</span>
                  <span className="text-lg font-extrabold font-mono text-[#F59E0B]">
                    {statistics.draws}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] text-center">
                  <span className="text-[10px] text-[#C89D54] uppercase block">Rating Tático</span>
                  <span className="text-lg font-extrabold font-mono text-[#C89D54]">
                    {statistics.tacticsRating}
                  </span>
                </div>
              </div>

              {/* Saved Games List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-[#C89D54]" /> Histórico de Partidas Salvas Localmente
                  </h4>
                  {history.length > 0 && (
                    <button
                      onClick={onClearHistory}
                      className="text-[11px] text-[#EF4444] hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Limpar Histórico
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#0B0E14] border border-[#232C3D] text-center text-[#9CA3AF]">
                    Suas partidas concluídas serão salvas automaticamente aqui no navegador.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((g) => (
                      <div
                        key={g.id}
                        className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="text-[#C89D54] font-mono">{g.result}</span>
                            <span>{g.modeLabel}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#131822] text-[#9CA3AF]">
                              {g.terminationReason}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                            {g.date} • {g.movesCount} lances
                            {g.whiteAccuracy !== undefined &&
                              ` • Precisão: ${g.whiteAccuracy}% vs ${g.blackAccuracy}%`}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onLoadGameFromHistory(g);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#C89D54] text-[#0B0E14] font-bold flex items-center gap-1 shrink-0"
                        >
                          <Play className="w-3 h-3" /> Rever & Analisar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
