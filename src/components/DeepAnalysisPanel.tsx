import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle,
  Cpu,
  FileText,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  EngineTelemetry,
  GameAnalysisReport,
  MoveClassification,
} from '../types/chess';
import { getClassificationMeta } from '../analysis/gameAnalyzer';

interface DeepAnalysisPanelProps {
  report: GameAnalysisReport | null;
  currentPly: number;
  telemetry: EngineTelemetry;
  onSelectPly: (ply: number) => void;
  onImportPgn: (pgn: string) => boolean;
  onPracticeFromFen: (fen: string) => void;
}

const CLASSIFICATION_ORDER: MoveClassification[] = [
  'brilliant',
  'best',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'blunder',
];

export const DeepAnalysisPanel: React.FC<DeepAnalysisPanelProps> = ({
  report,
  currentPly,
  telemetry,
  onSelectPly,
  onImportPgn,
  onPracticeFromFen,
}) => {
  const [pgnInput, setPgnInput] = useState('');
  const [showPgnModal, setShowPgnModal] = useState(false);
  const [pgnError, setPgnError] = useState<string | null>(null);

  const handleLoadSamplePgn = () => {
    const sampleImmortal =
      '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#';
    onImportPgn(sampleImmortal);
    setShowPgnModal(false);
  };

  const handlePgnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPgnError(null);
    const ok = onImportPgn(pgnInput);
    if (!ok) {
      setPgnError('Não foi possível interpretar este PGN. Verifique a notação dos lances.');
    } else {
      setShowPgnModal(false);
      setPgnInput('');
    }
  };

  // Build SVG points for evaluation graph
  const renderEvaluationChart = () => {
    if (!report || report.moves.length === 0) return null;
    const moves = report.moves;
    const width = 460;
    const height = 105;
    const midY = height / 2;

    const points = moves.map((m, idx) => {
      const x = moves.length === 1 ? width / 2 : (idx / (moves.length - 1)) * width;
      const cp = Math.max(-700, Math.min(700, m.evalCp || 0));
      const y = midY - (cp / 700) * (midY - 8);
      return { x, y, ply: m.ply, san: m.san, cp };
    });

    const polylinePoints = [
      `0,${midY}`,
      ...points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    ].join(' ');

    const areaPoints = [
      `0,${midY}`,
      ...points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
      `${width},${midY}`,
    ].join(' ');

    const activePoint = points.find((p) => p.ply === currentPly);

    return (
      <div className="bg-[#0B0E14] border border-[#232C3D] rounded-xl p-2.5">
        <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] mb-1.5">
          <span className="font-semibold flex items-center gap-1 text-[#F3F4F6]">
            <TrendingUp className="w-3.5 h-3.5 text-[#C89D54]" /> Gráfico de Avaliação da Partida
          </span>
          <span>Clique no gráfico para saltar ao lance</span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 bg-[#131822] rounded-lg cursor-pointer overflow-visible"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const targetIdx = Math.max(
              0,
              Math.min(moves.length - 1, Math.round(relX * (moves.length - 1)))
            );
            onSelectPly(moves[targetIdx].ply);
          }}
        >
          {/* Center 0.00 equilibrium line */}
          <line
            x1="0"
            y1={midY}
            x2={width}
            y2={midY}
            stroke="#374151"
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Shaded evaluation curve */}
          <polygon points={areaPoints} fill="rgba(200, 157, 84, 0.22)" />
          <polyline
            fill="none"
            stroke="#C89D54"
            strokeWidth="2"
            points={polylinePoints}
          />

          {/* Highlight blunders/brilliants as dots */}
          {points.map((pt, idx) => {
            const m = moves[idx];
            if (
              m.classification !== 'blunder' &&
              m.classification !== 'mistake' &&
              m.classification !== 'brilliant'
            ) {
              return null;
            }
            const meta = getClassificationMeta(m.classification);
            return (
              <circle
                key={pt.ply}
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill={meta.color}
                stroke="#0B0E14"
                strokeWidth="1"
              />
            );
          })}

          {/* Active Ply Cursor */}
          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1={0}
                x2={activePoint.x}
                y2={height}
                stroke="#38BDF8"
                strokeWidth="1.5"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="4.5"
                fill="#38BDF8"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#131822] border border-[#232C3D] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-[#171E2C] to-[#131822] border-b border-[#232C3D] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#10B981]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F3F4F6]">
              ANÁLISE PROFUNDA & LABORATÓRIO PÓS-JOGO
            </h2>
            <p className="text-[11px] text-[#9CA3AF]">
              Precisão percentual, classificação de lances, gráfico e momentos decisivos
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPgnModal(!showPgnModal)}
          className="px-2.5 py-1.5 rounded-lg bg-[#1B2230] hover:bg-[#C89D54]/20 border border-[#232C3D] hover:border-[#C89D54] text-xs font-semibold text-[#C89D54] flex items-center gap-1.5 transition"
        >
          <FileText className="w-3.5 h-3.5" /> Importar PGN
        </button>
      </div>

      {/* PGN Import Drawer */}
      {showPgnModal && (
        <form
          onSubmit={handlePgnSubmit}
          className="p-3 bg-[#0B0E14] border-b border-[#232C3D] space-y-2 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#C89D54]">Cole o PGN da Partida para Análise:</span>
            <button
              type="button"
              onClick={handleLoadSamplePgn}
              className="text-[11px] text-[#38BDF8] hover:underline"
            >
              Carregar "Partida Imortal de Anderssen (1851)"
            </button>
          </div>
          {pgnError && <div className="text-[#EF4444] text-[11px]">{pgnError}</div>}
          <textarea
            rows={3}
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ..."
            className="w-full p-2 rounded-lg bg-[#131822] border border-[#232C3D] text-white font-mono text-[11px]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPgnModal(false)}
              className="px-3 py-1 rounded bg-[#1B2230] text-[#9CA3AF]"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-[#C89D54] text-[#0B0E14] font-bold"
            >
              Analisar Partida
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {/* Live Stockfish MultiPV Panel */}
        <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F3F4F6] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#10B981]" />
              Motor {telemetry.engineType} (MultiPV)
            </span>
            <span className="font-mono text-[11px] text-[#C89D54]">
              Profundidade {telemetry.depth} |{' '}
              {telemetry.mate !== null
                ? `Mate em ${Math.abs(telemetry.mate)}`
                : `${telemetry.scoreCp >= 0 ? '+' : ''}${(telemetry.scoreCp / 100).toFixed(2)}`}
            </span>
          </div>

          <div className="space-y-1">
            {telemetry.lines.length > 0 ? (
              telemetry.lines.slice(0, 3).map((line) => {
                const evalStr =
                  line.mate !== null
                    ? `M${line.mate}`
                    : `${line.scoreCp >= 0 ? '+' : ''}${(line.scoreCp / 100).toFixed(2)}`;
                return (
                  <div
                    key={line.multipv}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-[#131822] border border-[#232C3D]/70 font-mono-tabular text-[11px]"
                  >
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold shrink-0 ${
                        line.scoreCp >= 0
                          ? 'bg-white text-[#0B0E14]'
                          : 'bg-[#1B2230] text-[#F3F4F6] border border-[#374151]'
                      }`}
                    >
                      {evalStr}
                    </span>
                    <span className="text-[#D1D5DB] truncate">
                      {line.pvSan.join(' ') || line.pvUci.join(' ')}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-[#9CA3AF] text-[11px]">
                Faça lances no tabuleiro ou carregue uma partida para visualizar as linhas do motor.
              </div>
            )}
          </div>
        </div>

        {!report || report.moves.length === 0 ? (
          <div className="p-6 text-center bg-[#0B0E14] border border-[#232C3D] rounded-xl space-y-2">
            <Award className="w-8 h-8 text-[#C89D54] mx-auto" />
            <h3 className="text-sm font-bold text-white">Nenhuma Partida para Relatório Ainda</h3>
            <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto">
              Jogue uma partida contra o Stockfish ou clique em <strong>Importar PGN</strong> acima
              para gerar o relatório completo de precisão, gráfico de avaliação e momentos decisivos.
            </p>
            <button
              onClick={handleLoadSamplePgn}
              className="mt-2 px-3.5 py-1.5 rounded-lg bg-[#C89D54] text-[#0B0E14] font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Analisar Partida Imortal de Exemplo
            </button>
          </div>
        ) : (
          <>
            {/* Accuracy Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] block">
                    Precisão Brancas
                  </span>
                  <span className="text-xl font-extrabold font-mono-tabular text-white">
                    {report.whiteAccuracy}%
                  </span>
                  <span className="block text-[10px] text-[#C89D54] font-mono">
                    Performance ~{report.whiteEstimatedElo} ELO
                  </span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-white text-[#0B0E14] flex items-center justify-center font-extrabold text-sm shadow">
                  ♙
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] block">
                    Precisão Pretas
                  </span>
                  <span className="text-xl font-extrabold font-mono-tabular text-[#38BDF8]">
                    {report.blackAccuracy}%
                  </span>
                  <span className="block text-[10px] text-[#C89D54] font-mono">
                    Performance ~{report.blackEstimatedElo} ELO
                  </span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#1B2230] border border-[#374151] text-white flex items-center justify-center font-extrabold text-sm shadow">
                  ♟
                </div>
              </div>
            </div>

            <div className="px-3 py-2 rounded-lg bg-[#C89D54]/15 border border-[#C89D54]/40 text-[#F3F4F6] text-[11px]">
              <strong>Veredito Técnico:</strong> {report.summaryVerdict}
            </div>

            {/* Evaluation Curve Chart */}
            {renderEvaluationChart()}

            {/* Move Classification Breakdown Table */}
            <div className="bg-[#0B0E14] border border-[#232C3D] rounded-xl p-3">
              <h4 className="font-bold text-[#F3F4F6] mb-2 text-xs uppercase tracking-wider">
                Classificação dos Lances
              </h4>
              <div className="space-y-1.5">
                {CLASSIFICATION_ORDER.map((cls) => {
                  const meta = getClassificationMeta(cls);
                  const wCount = report.counts.w[cls];
                  const bCount = report.counts.b[cls];
                  return (
                    <div
                      key={cls}
                      className="grid grid-cols-3 items-center py-1 px-2 rounded bg-[#131822]/70 font-mono-tabular"
                    >
                      <span className="font-bold text-white text-left">{wCount}</span>
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                          style={{ backgroundColor: meta.bgColor, color: meta.color }}
                        >
                          {meta.symbol} {meta.label}
                        </span>
                      </div>
                      <span className="font-bold text-[#38BDF8] text-right">{bCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Decisive Moments */}
            {report.decisiveMoments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-[#F3F4F6] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                  Momentos Decisivos & Correções do Stockfish ({report.decisiveMoments.length})
                </h4>
                <div className="space-y-2">
                  {report.decisiveMoments.map((dm) => {
                    const meta = getClassificationMeta(dm.classification);
                    return (
                      <div
                        key={dm.ply}
                        onClick={() => onSelectPly(dm.ply)}
                        className="p-2.5 rounded-xl bg-[#0B0E14] hover:bg-[#1B2230] border border-[#232C3D] cursor-pointer transition space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white">
                            Lance {dm.moveNumber} ({dm.color === 'w' ? 'Brancas' : 'Pretas'}):{' '}
                            <span style={{ color: meta.color }}>
                              {dm.playedSan} ({meta.symbol})
                            </span>
                          </span>
                          <span className="text-[11px] font-mono text-[#10B981]">
                            Melhor: <strong>{dm.bestSan}</strong>
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9CA3AF]">{dm.explanation}</p>
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPracticeFromFen(dm.fenBefore);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#C89D54]/20 hover:bg-[#C89D54] text-[#C89D54] hover:text-[#0B0E14] font-bold transition"
                          >
                            Jogar esta Posição vs Stockfish →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Training Recommendations */}
            <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#10B981]/40 space-y-1.5">
              <h4 className="font-bold text-[#10B981] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Recomendações Personalizadas de Treinamento
              </h4>
              <ul className="space-y-1 text-[11px] text-[#D1D5DB]">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#10B981] font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
