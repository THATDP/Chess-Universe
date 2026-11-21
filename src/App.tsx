import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import {
  Activity,
  BookOpen,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Cpu,
  Crown,
  Flame,
  FlipHorizontal,
  History,
  Lightbulb,
  Menu,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Swords,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  AIDifficultyId,
  ArrowAnnotation,
  CustomTrainingItem,
  EndgameScenario,
  EngineTelemetry,
  GambitDefenseLine,
  GambitDefinition,
  GambitStartPosition,
  GameAnalysisReport,
  GameModeId,
  OpeningStudyItem,
  PieceColor,
  PieceType,
  RecordedMove,
  SavedGameRecord,
  TacticalChallenge,
  TimeControlConfig,
  UserPreferences,
  UserStatistics,
} from './types/chess';
import {
  AI_DIFFICULTY_LEVELS,
  getDifficultyConfig,
  stockfishController,
} from './engine/stockfishWorker';
import { GAMBITS_DATABASE } from './data/gambitsData';
import {
  BOARD_THEMES,
  ENDGAME_SCENARIOS,
  OPENINGS_DATABASE,
  TACTICAL_CHALLENGES,
  TIME_CONTROLS,
} from './data/openingsAndTrainingData';
import {
  analyzeFullGame,
  evaluateFenFast,
  getClassificationMeta,
} from './analysis/gameAnalyzer';
import {
  clearGameHistory,
  loadCustomTrainings,
  loadGameHistory,
  loadPreferences,
  loadStatistics,
  saveCustomTrainings,
  saveGameToHistory,
  savePreferences,
  saveStatistics,
} from './storage/localStore';
import { soundEngine } from './audio/soundEngine';
import { ChessBoard2D } from './components/ChessBoard2D';
import { GambitLabPanel } from './components/GambitLabPanel';
import { DeepAnalysisPanel } from './components/DeepAnalysisPanel';
import { EditorTool, PositionEditorPanel } from './components/PositionEditorPanel';
import { TrainingModulesPanel } from './components/TrainingModulesPanel';
import { SettingsAndHistoryModal } from './components/SettingsAndHistoryModal';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function calculateMaterialBalance(fen: string): {
  diffWhite: number;
  capturedByWhite: PieceType[];
  capturedByBlack: PieceType[];
} {
  const startCounts: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const currentW: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const currentB: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const vals: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const placement = fen.split(' ')[0] || '';
  for (const ch of placement) {
    const lower = ch.toLowerCase() as PieceType;
    if (vals[lower] !== undefined) {
      if (ch === ch.toUpperCase()) currentW[lower]++;
      else currentB[lower]++;
    }
  }

  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];
  (['q', 'r', 'b', 'n', 'p'] as PieceType[]).forEach((pt) => {
    const missingB = Math.max(0, startCounts[pt] - currentB[pt]);
    for (let i = 0; i < missingB; i++) capturedByWhite.push(pt);
    const missingW = Math.max(0, startCounts[pt] - currentW[pt]);
    for (let i = 0; i < missingW; i++) capturedByBlack.push(pt);
  });

  let wScore = 0;
  let bScore = 0;
  (['q', 'r', 'b', 'n', 'p'] as PieceType[]).forEach((pt) => {
    wScore += currentW[pt] * vals[pt];
    bScore += currentB[pt] * vals[pt];
  });

  return {
    diffWhite: wScore - bScore,
    capturedByWhite,
    capturedByBlack,
  };
}

export function App() {
  // Preferences, Statistics, History & Custom Trainings from LocalStorage
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadPreferences());
  const [statistics, setStatistics] = useState<UserStatistics>(() => loadStatistics());
  const [gameHistory, setGameHistory] = useState<SavedGameRecord[]>(() => loadGameHistory());
  const [customTrainings, setCustomTrainings] = useState<CustomTrainingItem[]>(() =>
    loadCustomTrainings()
  );

  // Active Game Mode & Navigation
  const [activeMode, setActiveMode] = useState<GameModeId>('gambit-lab');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsModal, setSettingsModal] = useState<{
    open: boolean;
    tab: 'settings' | 'audio' | 'history';
  }>({ open: false, tab: 'settings' });

  // Core Chess Game State
  const [initialFen, setInitialFen] = useState<string>(START_FEN);
  const [moves, setMoves] = useState<RecordedMove[]>([]);
  const [viewPly, setViewPly] = useState<number>(0); // 0 = initialFen, 1..moves.length
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [boardOrientation, setBoardOrientation] = useState<PieceColor>('w');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficultyId>(preferences.defaultDifficulty);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlConfig>(
    TIME_CONTROLS[2] // Rápida 10+0 default
  );

  // Clocks & Game Result
  const [whiteTimeSec, setWhiteTimeSec] = useState<number>(600);
  const [blackTimeSec, setBlackTimeSec] = useState<number>(600);
  const [clockRunning, setClockRunning] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<{
    over: boolean;
    result: '1-0' | '0-1' | '1/2-1/2' | '*';
    reason: string;
  }>({ over: false, result: '*', reason: '' });

  // Stockfish Engine Telemetry
  const [telemetry, setTelemetry] = useState<EngineTelemetry>(() =>
    stockfishController.getTelemetry()
  );
  const [hintMoveUci, setHintMoveUci] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // GAMBIT LAB State
  const [selectedGambit, setSelectedGambit] = useState<GambitDefinition>(GAMBITS_DATABASE[0]);
  const [selectedDefense, setSelectedDefense] = useState<GambitDefenseLine>(
    GAMBITS_DATABASE[0].defenses[0]
  );
  const [selectedStartPos, setSelectedStartPos] = useState<GambitStartPosition>(
    GAMBITS_DATABASE[0].startPositions[0]
  );
  const [gambitInTheory, setGambitInTheory] = useState<boolean>(true);
  const [gambitTheoryCompleted, setGambitTheoryCompleted] = useState<boolean>(false);
  const [gambitFreePlayOverride, setGambitFreePlayOverride] = useState<boolean>(false);

  // OPENINGS, TACTICS & ENDGAMES State
  const [selectedOpening, setSelectedOpening] = useState<OpeningStudyItem>(OPENINGS_DATABASE[0]);
  const [selectedTactic, setSelectedTactic] = useState<TacticalChallenge>(TACTICAL_CHALLENGES[0]);
  const [tacticStepIndex, setTacticStepIndex] = useState<number>(0);
  const [tacticStatus, setTacticStatus] = useState<'solving' | 'correct' | 'wrong'>('solving');
  const [tacticMessage, setTacticMessage] = useState<string>(
    'Encontre o melhor lance tático nesta posição!'
  );
  const [selectedEndgame, setSelectedEndgame] = useState<EndgameScenario>(ENDGAME_SCENARIOS[0]);
  const [endgameStatus, setEndgameStatus] = useState<string>(
    'Jogue para converter a posição contra o Stockfish!'
  );

  // DEEP ANALYSIS Report State
  const [analysisReport, setAnalysisReport] = useState<GameAnalysisReport | null>(null);

  // POSITION EDITOR State
  const [editorFen, setEditorFen] = useState<string>(START_FEN);
  const [editorTool, setEditorTool] = useState<EditorTool>({ color: 'w', type: 'q' });

  const aiThinkingLockRef = useRef<boolean>(false);

  // Compute current active FEN based on viewPly
  const currentFen =
    activeMode === 'editor'
      ? editorFen
      : viewPly === 0 || moves.length === 0
      ? initialFen
      : moves[Math.min(viewPly - 1, moves.length - 1)]?.fenAfter || initialFen;

  const isViewingLatest = viewPly === moves.length;

  // Subscribe to Stockfish telemetry
  useEffect(() => {
    const unsub = stockfishController.subscribe((t) => {
      setTelemetry(t);
    });
    return unsub;
  }, []);

  // Sync audio preferences
  useEffect(() => {
    soundEngine.updatePreferences(preferences.audio);
  }, [preferences.audio]);

  // Run continuous background evaluation when FEN changes
  useEffect(() => {
    setHintMoveUci(null);
    stockfishController.analyzePosition(currentFen, 14, 3);
  }, [currentFen]);

  // Digital Chess Clock Interval
  useEffect(() => {
    const isTimedMode = ['classic', 'rapid', 'blitz', 'bullet'].includes(activeMode);
    if (!isTimedMode || !clockRunning || gameResult.over || selectedTimeControl.initialSeconds === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      const turn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';
      if (turn === 'w') {
        setWhiteTimeSec((prev) => {
          if (prev <= 1) {
            handleFlagFall('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTimeSec((prev) => {
          if (prev <= 1) {
            handleFlagFall('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeMode, clockRunning, gameResult.over, currentFen, selectedTimeControl.initialSeconds]);

  const handleFlagFall = (flaggedColor: PieceColor) => {
    setClockRunning(false);
    const res = flaggedColor === 'w' ? '0-1' : '1-0';
    const winnerName = flaggedColor === 'w' ? 'Pretas' : 'Brancas';
    const reason = `Tempo esgotado! Vitória das ${winnerName}.`;
    setGameResult({ over: true, result: res, reason });
    soundEngine.play(flaggedColor === playerColor ? 'defeat' : 'victory');
  };

  // Helper to update preferences and persist to LocalStorage
  const handleUpdatePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  // Helper to build RecordedMove list from a sequence of SAN moves
  const buildRecordedMovesFromSanList = useCallback(
    (startFenStr: string, sanList: string[]): RecordedMove[] => {
      const c = new Chess(startFenStr);
      const list: RecordedMove[] = [];
      for (let i = 0; i < sanList.length; i++) {
        const fenBefore = c.fen();
        const m = c.move(sanList[i]);
        if (!m) break;
        const fenAfter = c.fen();
        const fastEval = evaluateFenFast(fenAfter);
        list.push({
          ply: i + 1,
          moveNumber: Math.floor(i / 2) + 1,
          color: m.color as PieceColor,
          san: m.san,
          uci: `${m.from}${m.to}${m.promotion || ''}`,
          from: m.from,
          to: m.to,
          piece: m.piece as PieceType,
          captured: m.captured as PieceType | undefined,
          promotion: m.promotion as PieceType | undefined,
          fenBefore,
          fenAfter,
          evalCp: fastEval.evalCp,
          mate: fastEval.mate,
          classification: i < 8 ? 'book' : 'good',
        });
      }
      return list;
    },
    []
  );

  // Initialize or restart a Gambit Lab training session
  const startGambitSession = useCallback(
    (
      gambit: GambitDefinition,
      defense: GambitDefenseLine,
      startPos: GambitStartPosition,
      color: PieceColor
    ) => {
      aiThinkingLockRef.current = false;
      stockfishController.stop();
      setPlayerColor(color);
      setBoardOrientation(color);
      setInitialFen(START_FEN);
      setGameResult({ over: false, result: '*', reason: '' });
      setGambitInTheory(true);
      setGambitTheoryCompleted(false);
      setGambitFreePlayOverride(false);

      const initialPliesCount = Math.min(startPos.plyIndex, defense.movesSan.length);
      const preMoves = defense.movesSan.slice(0, initialPliesCount);
      const recorded = buildRecordedMovesFromSanList(START_FEN, preMoves);
      setMoves(recorded);
      setViewPly(recorded.length);
      setStatusBanner(
        `Treinando ${gambit.name} — ${defense.name}. ${
          color === 'w' ? 'Você joga de Brancas.' : 'Você joga de Pretas.'
        }`
      );
      soundEngine.play('ui');
    },
    [buildRecordedMovesFromSanList]
  );

  // Initialize Gambit Lab on first load
  useEffect(() => {
    startGambitSession(
      GAMBITS_DATABASE[0],
      GAMBITS_DATABASE[0].defenses[0],
      GAMBITS_DATABASE[0].startPositions[0],
      'w'
    );
  }, [startGambitSession]);

  // Check if game ended after a move and record stats/history
  const checkAndHandleGameOver = useCallback(
    (chessInstance: Chess, updatedMoves: RecordedMove[]) => {
      if (!chessInstance.isGameOver()) return false;

      setClockRunning(false);
      let result: '1-0' | '0-1' | '1/2-1/2' = '1/2-1/2';
      let reason = 'Empate';

      if (chessInstance.isCheckmate()) {
        const loser = chessInstance.turn();
        result = loser === 'w' ? '0-1' : '1-0';
        reason = `Xeque-Mate! Vitória das ${loser === 'w' ? 'Pretas' : 'Brancas'}.`;
        const playerWon = (result === '1-0' && playerColor === 'w') || (result === '0-1' && playerColor === 'b');
        soundEngine.play('checkmate');
        setTimeout(() => soundEngine.play(playerWon ? 'victory' : 'defeat'), 350);

        if (activeMode === 'endgames' && playerWon) {
          setEndgameStatus('Parabéns! Você converteu o final com sucesso contra o Stockfish!');
          setStatistics((prev) => {
            const next = {
              ...prev,
              endgamesCompleted: Array.from(new Set([...prev.endgamesCompleted, selectedEndgame.id])),
            };
            saveStatistics(next);
            return next;
          });
        }
      } else if (chessInstance.isStalemate()) {
        reason = 'Empate por Afogamento (Rei sem movimentos legais).';
        soundEngine.play('draw');
      } else if (chessInstance.isThreefoldRepetition()) {
        reason = 'Empate por Tripla Repetição de Posição.';
        soundEngine.play('draw');
      } else if (chessInstance.isInsufficientMaterial()) {
        reason = 'Empate por Material Insuficiente.';
        soundEngine.play('draw');
      } else {
        reason = 'Empate pela Regra dos 50 Movimentos.';
        soundEngine.play('draw');
      }

      setGameResult({ over: true, result, reason });
      setStatusBanner(reason);

      // Generate Deep Analysis Report automatically on game completion
      const report = analyzeFullGame(updatedMoves);
      setAnalysisReport(report);

      // Update local statistics & history for standard games
      if (['classic', 'rapid', 'blitz', 'bullet', 'untimed', 'gambit-lab'].includes(activeMode)) {
        const playerWon =
          (result === '1-0' && playerColor === 'w') ||
          (result === '0-1' && playerColor === 'b');
        const isDraw = result === '1/2-1/2';

        setStatistics((prev) => {
          const next: UserStatistics = {
            ...prev,
            gamesPlayed: prev.gamesPlayed + 1,
            wins: prev.wins + (playerWon ? 1 : 0),
            losses: prev.losses + (!playerWon && !isDraw ? 1 : 0),
            draws: prev.draws + (isDraw ? 1 : 0),
          };
          saveStatistics(next);
          return next;
        });

        const pgnMoves = updatedMoves
          .map((m) => (m.color === 'w' ? `${m.moveNumber}. ${m.san}` : m.san))
          .join(' ');

        const record: SavedGameRecord = {
          id: `game-${Date.now()}`,
          date: new Date().toLocaleString('pt-BR'),
          mode: activeMode,
          modeLabel:
            activeMode === 'gambit-lab'
              ? `Gambito: ${selectedGambit.name}`
              : selectedTimeControl.label,
          playerColor,
          aiDifficulty,
          result,
          terminationReason: reason,
          pgn: pgnMoves,
          finalFen: chessInstance.fen(),
          movesCount: Math.ceil(updatedMoves.length / 2),
          whiteAccuracy: report.whiteAccuracy,
          blackAccuracy: report.blackAccuracy,
        };
        setGameHistory(saveGameToHistory(record));
      }

      return true;
    },
    [activeMode, aiDifficulty, playerColor, selectedEndgame.id, selectedGambit.name, selectedTimeControl.label]
  );

  // Execute a verified move on the board (used by both Human and AI)
  const executeMoveOnBoard = useCallback(
    (from: string, to: string, promotion?: PieceType, isBookMove = false): boolean => {
      try {
        const baseMoves = moves.slice(0, viewPly);
        const startFenForMove =
          baseMoves.length === 0 ? initialFen : baseMoves[baseMoves.length - 1].fenAfter;
        const chess = new Chess(startFenForMove);
        const moveObj = chess.move({ from, to, promotion: promotion || 'q' });
        if (!moveObj) {
          soundEngine.play('illegal');
          return false;
        }

        const fenAfter = chess.fen();
        const ply = baseMoves.length + 1;
        const moveNumber = Math.floor((ply - 1) / 2) + 1;

        // Play appropriate acoustic sound
        if (chess.isCheckmate()) {
          // Handled in checkAndHandleGameOver
        } else if (chess.inCheck()) {
          soundEngine.play('check');
        } else if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
          soundEngine.play('castle');
        } else if (moveObj.flags.includes('p') || moveObj.promotion) {
          soundEngine.play('promote');
        } else if (moveObj.captured || moveObj.flags.includes('e')) {
          soundEngine.play('capture');
        } else {
          soundEngine.play('move');
        }

        const fastEval = evaluateFenFast(fenAfter);
        const newRecorded: RecordedMove = {
          ply,
          moveNumber,
          color: moveObj.color as PieceColor,
          san: moveObj.san,
          uci: `${moveObj.from}${moveObj.to}${moveObj.promotion || ''}`,
          from: moveObj.from,
          to: moveObj.to,
          piece: moveObj.piece as PieceType,
          captured: moveObj.captured as PieceType | undefined,
          promotion: moveObj.promotion as PieceType | undefined,
          fenBefore: startFenForMove,
          fenAfter,
          evalCp: fastEval.evalCp,
          mate: fastEval.mate,
          classification: isBookMove ? 'book' : undefined,
        };

        const updatedMoves = [...baseMoves, newRecorded];
        setMoves(updatedMoves);
        setViewPly(updatedMoves.length);

        // Apply increment if timed mode
        if (['classic', 'rapid', 'blitz', 'bullet'].includes(activeMode) && selectedTimeControl.initialSeconds > 0) {
          setClockRunning(true);
          if (moveObj.color === 'w') {
            setWhiteTimeSec((s) => s + selectedTimeControl.incrementSeconds);
          } else {
            setBlackTimeSec((s) => s + selectedTimeControl.incrementSeconds);
          }
        }

        // Check Gambit Lab theory progression
        if (activeMode === 'gambit-lab' && !gambitFreePlayOverride) {
          const expectedSan = selectedDefense.movesSan[ply - 1];
          if (expectedSan && moveObj.san === expectedSan) {
            setGambitInTheory(true);
            if (ply >= selectedDefense.movesSan.length) {
              setGambitTheoryCompleted(true);
              setStatusBanner(
                `Linha teórica "${selectedDefense.name}" concluída com perfeição! Continue jogando livremente contra o Stockfish.`
              );
              setStatistics((prev) => {
                const next = {
                  ...prev,
                  studiedGambitLines: Array.from(
                    new Set([...prev.studiedGambitLines, selectedDefense.id])
                  ),
                };
                saveStatistics(next);
                return next;
              });
            }
          } else {
            setGambitInTheory(false);
            setStatusBanner(
              `Você jogou ${moveObj.san} (fora da linha teórica ${
                expectedSan || ''
              }). O Stockfish assumiu o jogo livremente!`
            );
          }
        }

        checkAndHandleGameOver(chess, updatedMoves);
        return true;
      } catch {
        soundEngine.play('illegal');
        return false;
      }
    },
    [
      activeMode,
      checkAndHandleGameOver,
      gambitFreePlayOverride,
      initialFen,
      moves,
      selectedDefense,
      selectedTimeControl,
      viewPly,
    ]
  );

  // Handle Player Move depending on active mode (Tactics vs Standard/Gambit/Endgame)
  const handleUserBoardMove = (from: string, to: string, promotion?: PieceType): boolean => {
    if (gameResult.over) return false;

    // TACTICAL CHALLENGES MODE
    if (activeMode === 'tactics') {
      const chess = new Chess(currentFen);
      const moveObj = chess.move({ from, to, promotion: promotion || 'q' });
      if (!moveObj) {
        soundEngine.play('illegal');
        return false;
      }

      const expectedSan = selectedTactic.solutionSan[tacticStepIndex];
      if (moveObj.san === expectedSan || chess.isCheckmate()) {
        executeMoveOnBoard(from, to, promotion, true);
        const nextStep = tacticStepIndex + 1;

        if (nextStep >= selectedTactic.solutionSan.length || chess.isCheckmate()) {
          setTacticStatus('correct');
          setTacticMessage('Excelente! Desafio Tático resolvido com precisão!');
          soundEngine.play('victory');
          setStatistics((prev) => {
            const alreadySolved = prev.tacticsSolved.includes(selectedTactic.id);
            const next: UserStatistics = {
              ...prev,
              tacticsSolved: Array.from(new Set([...prev.tacticsSolved, selectedTactic.id])),
              tacticsStreak: prev.tacticsStreak + 1,
              tacticsRating: alreadySolved ? prev.tacticsRating : prev.tacticsRating + 14,
            };
            saveStatistics(next);
            return next;
          });
        } else {
          // Play opponent's forced tactical response after short delay
          setTacticMessage('Lance correto! Aguarde a resposta adversária...');
          const oppReplySan = selectedTactic.solutionSan[nextStep];
          setTimeout(() => {
            const replyChess = new Chess(chess.fen());
            const replyMove = replyChess.move(oppReplySan);
            if (replyMove) {
              executeMoveOnBoard(
                replyMove.from,
                replyMove.to,
                replyMove.promotion as PieceType | undefined,
                true
              );
              setTacticStepIndex(nextStep + 1);
              setTacticMessage('Continue a combinação! Qual é o golpe final?');
            }
          }, 420);
        }
        return true;
      } else {
        setTacticStatus('wrong');
        setTacticMessage(
          `O lance ${moveObj.san} não é a continuação vencedora. Tente novamente ou veja a dica!`
        );
        soundEngine.play('illegal');
        setStatistics((prev) => {
          const next = { ...prev, tacticsStreak: 0 };
          saveStatistics(next);
          return next;
        });
        return false;
      }
    }

    // Standard Game, Gambit Lab, Openings, Endgames, Analysis
    const turn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';
    const isVsAiMode = [
      'classic',
      'rapid',
      'blitz',
      'bullet',
      'untimed',
      'gambit-lab',
      'endgames',
    ].includes(activeMode);

    if (isVsAiMode && turn !== playerColor) {
      return false;
    }

    return executeMoveOnBoard(from, to, promotion);
  };

  // Trigger AI response automatically when it is the AI's turn
  useEffect(() => {
    const isVsAiMode = [
      'classic',
      'rapid',
      'blitz',
      'bullet',
      'untimed',
      'gambit-lab',
      'endgames',
    ].includes(activeMode);

    if (!isVsAiMode || gameResult.over || !isViewingLatest) return;

    const turn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';
    if (turn === playerColor) return;
    if (aiThinkingLockRef.current) return;

    aiThinkingLockRef.current = true;

    const runAiTurn = async () => {
      try {
        // 1. Check if we are in Gambit Lab AND still following the selected theoretical defense line
        if (
          activeMode === 'gambit-lab' &&
          gambitInTheory &&
          !gambitFreePlayOverride &&
          viewPly < selectedDefense.movesSan.length
        ) {
          const bookSan = selectedDefense.movesSan[viewPly];
          const testChess = new Chess(currentFen);
          const bookMoveObj = testChess.move(bookSan);
          if (bookMoveObj) {
            await new Promise((r) => setTimeout(r, 380));
            aiThinkingLockRef.current = false;
            executeMoveOnBoard(
              bookMoveObj.from,
              bookMoveObj.to,
              bookMoveObj.promotion as PieceType | undefined,
              true
            );
            return;
          }
        }

        // 2. Otherwise use real Stockfish calculation according to selected difficulty level
        const effectiveDifficulty =
          activeMode === 'endgames' ? 'grandmaster' : aiDifficulty;
        const aiResult = await stockfishController.computeAIMove(
          currentFen,
          effectiveDifficulty,
          preferences.customThinkTimeMs
        );

        aiThinkingLockRef.current = false;
        if (aiResult && aiResult.uci.length >= 4) {
          const from = aiResult.uci.slice(0, 2);
          const to = aiResult.uci.slice(2, 4);
          const promo =
            aiResult.uci.length > 4 ? (aiResult.uci[4] as PieceType) : undefined;
          executeMoveOnBoard(from, to, promo, false);
        }
      } catch {
        aiThinkingLockRef.current = false;
      }
    };

    runAiTurn();
  }, [
    activeMode,
    aiDifficulty,
    currentFen,
    executeMoveOnBoard,
    gambitFreePlayOverride,
    gambitInTheory,
    gameResult.over,
    isViewingLatest,
    playerColor,
    preferences.customThinkTimeMs,
    selectedDefense.movesSan,
    viewPly,
  ]);

  // Start a new standard game (Classic, Rapid, Blitz, Bullet, Untimed)
  const startStandardGame = (
    mode: GameModeId,
    tc: TimeControlConfig,
    colorChoice: PieceColor | 'random' = playerColor,
    customStartFen: string = START_FEN
  ) => {
    aiThinkingLockRef.current = false;
    stockfishController.stop();
    const resolvedColor: PieceColor =
      colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice;

    setActiveMode(mode);
    setSelectedTimeControl(tc);
    setPlayerColor(resolvedColor);
    setBoardOrientation(resolvedColor);
    setInitialFen(customStartFen);
    setMoves([]);
    setViewPly(0);
    setWhiteTimeSec(tc.initialSeconds);
    setBlackTimeSec(tc.initialSeconds);
    setClockRunning(tc.initialSeconds > 0);
    setGameResult({ over: false, result: '*', reason: '' });
    setAnalysisReport(null);
    setStatusBanner(
      `Partida ${tc.label} iniciada contra Stockfish (${getDifficultyConfig(aiDifficulty).name}).`
    );
    soundEngine.play('ui');
  };

  // Switch between top-level navigation modes
  const handleSelectMode = (mode: GameModeId) => {
    setMobileMenuOpen(false);
    aiThinkingLockRef.current = false;
    stockfishController.stop();

    if (['classic', 'rapid', 'blitz', 'bullet', 'untimed'].includes(mode)) {
      const matchingTc =
        TIME_CONTROLS.find((t) => t.mode === mode) || TIME_CONTROLS[2];
      startStandardGame(mode, matchingTc, playerColor, START_FEN);
      return;
    }

    setActiveMode(mode);
    setClockRunning(false);

    if (mode === 'gambit-lab') {
      startGambitSession(
        selectedGambit,
        selectedDefense,
        selectedStartPos,
        selectedGambit.repertoireColor
      );
    } else if (mode === 'openings') {
      const op = selectedOpening;
      setInitialFen(START_FEN);
      const rec = buildRecordedMovesFromSanList(START_FEN, op.movesSan);
      setMoves(rec);
      setViewPly(rec.length);
      setBoardOrientation(op.color);
      setGameResult({ over: false, result: '*', reason: '' });
    } else if (mode === 'tactics') {
      loadTacticalChallenge(selectedTactic);
    } else if (mode === 'endgames') {
      loadEndgameScenario(selectedEndgame);
    } else if (mode === 'analysis') {
      const rep = analyzeFullGame(moves);
      setAnalysisReport(rep);
    } else if (mode === 'editor') {
      setEditorFen(currentFen);
    }
    soundEngine.play('ui');
  };

  const loadTacticalChallenge = (challenge: TacticalChallenge) => {
    setSelectedTactic(challenge);
    setInitialFen(challenge.fen);
    setMoves([]);
    setViewPly(0);
    setPlayerColor(challenge.playerColor);
    setBoardOrientation(challenge.playerColor);
    setTacticStepIndex(0);
    setTacticStatus('solving');
    setTacticMessage(
      `Jogue de ${challenge.playerColor === 'w' ? 'Brancas' : 'Pretas'}: encontre a sequência vencedora!`
    );
    setGameResult({ over: false, result: '*', reason: '' });
  };

  const loadEndgameScenario = (scenario: EndgameScenario) => {
    setSelectedEndgame(scenario);
    setInitialFen(scenario.fen);
    setMoves([]);
    setViewPly(0);
    setPlayerColor(scenario.playerColor);
    setBoardOrientation(scenario.playerColor);
    setEndgameStatus(
      `Objetivo: ${
        scenario.goal === 'win' ? 'Vencer a partida' : 'Segurar o empate'
      } contra o Stockfish.`
    );
    setGameResult({ over: false, result: '*', reason: '' });
  };

  // Undo last pair of moves (or single move in analysis)
  const handleUndoMove = () => {
    if (moves.length === 0) return;
    aiThinkingLockRef.current = false;
    stockfishController.stop();

    const stepBack =
      ['classic', 'rapid', 'blitz', 'bullet', 'untimed', 'gambit-lab', 'endgames'].includes(
        activeMode
      ) && moves.length >= 2
        ? 2
        : 1;
    const nextMoves = moves.slice(0, Math.max(0, moves.length - stepBack));
    setMoves(nextMoves);
    setViewPly(nextMoves.length);
    setGameResult({ over: false, result: '*', reason: '' });
    soundEngine.play('ui');
  };

  // Handle Position Editor square click
  const handleEditorSquareClick = (sq: string) => {
    const parts = editorFen.split(' ');
    const rows = parts[0].split('/');
    const boardMatrix: Array<Array<string | null>> = rows.map((r) => {
      const arr: Array<string | null> = [];
      for (const ch of r) {
        if (ch >= '1' && ch <= '8') {
          for (let i = 0; i < parseInt(ch, 10); i++) arr.push(null);
        } else {
          arr.push(ch);
        }
      }
      return arr;
    });

    const fIdx = sq.charCodeAt(0) - 97;
    const rIdx = 8 - parseInt(sq[1], 10);

    if (editorTool === 'erase') {
      boardMatrix[rIdx][fIdx] = null;
    } else {
      const char =
        editorTool.color === 'w'
          ? editorTool.type.toUpperCase()
          : editorTool.type.toLowerCase();
      boardMatrix[rIdx][fIdx] = char;
    }

    const newRows = boardMatrix.map((row) => {
      let str = '';
      let empty = 0;
      for (const cell of row) {
        if (!cell) {
          empty++;
        } else {
          if (empty > 0) {
            str += empty;
            empty = 0;
          }
          str += cell;
        }
      }
      if (empty > 0) str += empty;
      return str;
    });

    parts[0] = newRows.join('/');
    setEditorFen(parts.join(' '));
    soundEngine.play('ui');
  };

  // Import PGN for Deep Analysis
  const handleImportPgn = (pgnText: string): boolean => {
    try {
      const cleaned = pgnText
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\{[^}]*\}/g, '')
        .replace(/\d+\.+/g, ' ')
        .trim();
      const tokens = cleaned.split(/\s+/).filter(Boolean);
      const testChess = new Chess();
      const validSan: string[] = [];

      for (const tok of tokens) {
        if (['1-0', '0-1', '1/2-1/2', '*'].includes(tok)) continue;
        const m = testChess.move(tok);
        if (!m) break;
        validSan.push(m.san);
      }

      if (validSan.length === 0) return false;

      const recorded = buildRecordedMovesFromSanList(START_FEN, validSan);
      setInitialFen(START_FEN);
      setMoves(recorded);
      setViewPly(recorded.length);
      const rep = analyzeFullGame(recorded);
      setAnalysisReport(rep);
      setActiveMode('analysis');
      soundEngine.play('ui');
      return true;
    } catch {
      return false;
    }
  };

  // Build arrows for the board (Hint arrow, Analysis best move arrow, or Gambit book arrow)
  const boardArrows: ArrowAnnotation[] = [];
  if (hintMoveUci && hintMoveUci.length >= 4) {
    boardArrows.push({
      from: hintMoveUci.slice(0, 2),
      to: hintMoveUci.slice(2, 4),
      color: '#10B981',
    });
  } else if (
    (activeMode === 'analysis' || preferences.showBestMoveArrow) &&
    telemetry.bestMoveUci &&
    telemetry.bestMoveUci.length >= 4 &&
    ['analysis', 'openings', 'gambit-lab'].includes(activeMode)
  ) {
    boardArrows.push({
      from: telemetry.bestMoveUci.slice(0, 2),
      to: telemetry.bestMoveUci.slice(2, 4),
      color: '#38BDF8',
    });
  }

  // Gambit theoretical next move arrow in Gold
  if (
    activeMode === 'gambit-lab' &&
    gambitInTheory &&
    !gambitFreePlayOverride &&
    viewPly < selectedDefense.movesSan.length
  ) {
    try {
      const tempChess = new Chess(currentFen);
      const nextBookMove = tempChess.move(selectedDefense.movesSan[viewPly]);
      if (nextBookMove) {
        boardArrows.push({
          from: nextBookMove.from,
          to: nextBookMove.to,
          color: '#C89D54',
        });
      }
    } catch {
      // ignore
    }
  }

  const activeTheme =
    BOARD_THEMES.find((t) => t.id === preferences.boardTheme) || BOARD_THEMES[0];
  const currentLastMove =
    viewPly > 0 && moves[viewPly - 1]
      ? {
          from: moves[viewPly - 1].from,
          to: moves[viewPly - 1].to,
          classification: moves[viewPly - 1].classification,
        }
      : null;

  const material = calculateMaterialBalance(currentFen);
  const activeTurn = currentFen.split(' ')[1] === 'b' ? 'b' : 'w';
  const currentDiffConfig = getDifficultyConfig(aiDifficulty);

  // Group moves into pairs for the Algebraic Move History table
  const movePairs: Array<{
    moveNumber: number;
    white?: RecordedMove;
    black?: RecordedMove;
  }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const NAV_ITEMS: Array<{
    id: GameModeId;
    label: string;
    shortLabel: string;
    icon: React.FC<{ className?: string }>;
    highlight?: boolean;
  }> = [
    {
      id: 'gambit-lab',
      label: 'Laboratório de Gambitos',
      shortLabel: 'Gambitos',
      icon: Flame,
      highlight: true,
    },
    { id: 'rapid', label: 'Partida Rápida (10m)', shortLabel: 'Rápida', icon: Clock },
    { id: 'blitz', label: 'Partida Blitz (3m/5m)', shortLabel: 'Blitz', icon: Zap },
    { id: 'bullet', label: 'Partida Bullet (1m)', shortLabel: 'Bullet', icon: Swords },
    { id: 'classic', label: 'Partida Clássica (15m+)', shortLabel: 'Clássica', icon: Crown },
    { id: 'untimed', label: 'Partida Sem Relógio', shortLabel: 'Sem Tempo', icon: Shield },
    { id: 'openings', label: 'Estudo de Aberturas', shortLabel: 'Aberturas', icon: BookOpen },
    { id: 'tactics', label: 'Desafios Táticos', shortLabel: 'Tática', icon: Compass },
    { id: 'endgames', label: 'Treinamento de Finais', shortLabel: 'Finais', icon: Trophy },
    { id: 'analysis', label: 'Análise Profunda', shortLabel: 'Análise', icon: Activity },
    { id: 'editor', label: 'Editor de Posições', shortLabel: 'Editor', icon: Sliders },
  ];

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#0B0E14] text-[#F3F4F6]">
      {/* TOP COMMAND HEADER */}
      <header className="h-14 px-3 sm:px-5 bg-[#131822]/95 border-b border-[#232C3D] flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#1B2230] text-[#F3F4F6]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => handleSelectMode('gambit-lab')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C89D54] to-[#8C6239] flex items-center justify-center text-[#0B0E14] font-extrabold text-xl shadow-md">
              ♞
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-base sm:text-lg tracking-wider text-white group-hover:text-[#C89D54] transition">
                  CHESS UNIVERSE
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#C89D54]/20 text-[#C89D54] border border-[#C89D54]/40">
                  2D STUDIO PRO
                </span>
              </div>
              <p className="text-[10px] text-[#9CA3AF] hidden sm:block">
                Plataforma Pessoal de Xadrez • Laboratório de Gambitos • Stockfish Local
              </p>
            </div>
          </div>
        </div>

        {/* Engine Live Status Pill & Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0E14] border border-[#232C3D] text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.isThinking ? 'bg-[#10B981] animate-ping' : 'bg-[#10B981]'
              }`}
            />
            <Cpu className="w-3.5 h-3.5 text-[#C89D54]" />
            <span className="font-semibold text-[#D1D5DB]">{telemetry.engineType}</span>
            <span className="font-mono text-[11px] text-[#C89D54]">
              d={telemetry.depth}
            </span>
          </div>

          {/* Quick Mute Toggle */}
          <button
            onClick={() =>
              handleUpdatePreferences({
                ...preferences,
                audio: { ...preferences.audio, muted: !preferences.audio.muted },
              })
            }
            className={`p-2 rounded-xl border transition ${
              preferences.audio.muted
                ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#EF4444]'
                : 'bg-[#1B2230] border-[#232C3D] text-[#D1D5DB] hover:text-white'
            }`}
            title={preferences.audio.muted ? 'Ativar Áudio' : 'Silenciar Áudio'}
          >
            {preferences.audio.muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Saved History Button */}
          <button
            onClick={() => setSettingsModal({ open: true, tab: 'history' })}
            className="px-2.5 py-2 rounded-xl bg-[#1B2230] hover:bg-[#232C3D] border border-[#232C3D] text-xs font-semibold text-[#D1D5DB] flex items-center gap-1.5 transition"
            title="Histórico de Partidas e Estatísticas"
          >
            <History className="w-4 h-4 text-[#C89D54]" />
            <span className="hidden sm:inline">Histórico ({gameHistory.length})</span>
          </button>

          {/* Settings & Themes Button */}
          <button
            onClick={() => setSettingsModal({ open: true, tab: 'settings' })}
            className="px-2.5 py-2 rounded-xl bg-[#C89D54]/20 hover:bg-[#C89D54] border border-[#C89D54]/50 text-[#C89D54] hover:text-[#0B0E14] text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Temas & Som</span>
          </button>
        </div>
      </header>

      {/* MAIN 3-COLUMN WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* 1. LEFT NAVIGATION RAIL */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-0 z-40 bg-[#0B0E14]/95 p-4' : 'hidden'
          } lg:static lg:flex lg:w-56 bg-[#131822] border-r border-[#232C3D] flex-col justify-between p-2.5 shrink-0 overflow-y-auto`}
        >
          <div className="space-y-1">
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center justify-between">
              <span>Modos & Treinamento</span>
              {mobileMenuOpen && (
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-[#C89D54]"
                >
                  Fechar ✕
                </button>
              )}
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectMode(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
                    isActive
                      ? 'bg-[#C89D54] text-[#0B0E14] font-bold shadow-md'
                      : item.highlight
                      ? 'bg-[#C89D54]/12 text-[#C89D54] hover:bg-[#C89D54]/25 border border-[#C89D54]/30'
                      : 'text-[#D1D5DB] hover:bg-[#1B2230] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* AI Difficulty Quick Selector Card in Sidebar */}
          <div className="mt-4 p-3 rounded-xl bg-[#0B0E14] border border-[#232C3D] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#9CA3AF]">Força do Stockfish</span>
              <span
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${currentDiffConfig.badgeColor}25`,
                  color: currentDiffConfig.badgeColor,
                }}
              >
                ~{currentDiffConfig.elo} ELO
              </span>
            </div>

            <select
              value={aiDifficulty}
              onChange={(e) => {
                const nextId = e.target.value as AIDifficultyId;
                setAiDifficulty(nextId);
                handleUpdatePreferences({ ...preferences, defaultDifficulty: nextId });
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#131822] border border-[#232C3D] text-xs font-bold text-white focus:outline-none focus:border-[#C89D54]"
            >
              {AI_DIFFICULTY_LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name} ({lvl.elo} ELO • Skill {lvl.skillLevel})
                </option>
              ))}
            </select>

            <p className="text-[10px] text-[#9CA3AF] leading-snug">
              {currentDiffConfig.description}
            </p>
          </div>
        </aside>

        {/* 2. CENTER BOARD STAGE */}
        <main className="flex-1 flex flex-col items-center justify-between p-2.5 sm:p-4 bg-[radial-gradient(ellipse_at_center,#171E2C_0%,#0B0E14_75%)] overflow-y-auto lg:overflow-hidden">
          {/* Top Opponent Bar (Stockfish / Top Player) */}
          <div className="w-full max-w-[680px] flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#131822]/90 border border-[#232C3D] mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1B2230] border border-[#C89D54]/50 flex items-center justify-center text-[#C89D54]">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Stockfish ({currentDiffConfig.name})
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#C89D54]/20 text-[#C89D54]">
                    {currentDiffConfig.elo} ELO
                  </span>
                  {telemetry.isThinking && (
                    <span className="text-[10px] text-[#10B981] font-mono animate-pulse">
                      calculando...
                    </span>
                  )}
                </div>
                {/* Captured Pieces by Top Side */}
                <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF] h-4">
                  {(boardOrientation === 'w'
                    ? material.capturedByBlack
                    : material.capturedByWhite
                  ).map((p, idx) => (
                    <span key={idx} className="text-xs leading-none">
                      {p === 'q' ? '♕' : p === 'r' ? '♖' : p === 'b' ? '♗' : p === 'n' ? '♘' : '♙'}
                    </span>
                  ))}
                  {boardOrientation === 'w' && material.diffWhite < 0 && (
                    <span className="font-mono text-[10px] text-[#10B981] font-bold ml-1">
                      +{Math.abs(material.diffWhite)}
                    </span>
                  )}
                  {boardOrientation === 'b' && material.diffWhite > 0 && (
                    <span className="font-mono text-[10px] text-[#10B981] font-bold ml-1">
                      +{material.diffWhite}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Opponent Digital Clock */}
            {['classic', 'rapid', 'blitz', 'bullet'].includes(activeMode) &&
              selectedTimeControl.initialSeconds > 0 && (
                <div
                  className={`px-3 py-1 rounded-lg font-mono-tabular text-sm sm:text-base font-extrabold border ${
                    activeTurn !== boardOrientation
                      ? 'bg-[#1B2230] border-[#C89D54] text-white'
                      : 'bg-[#0B0E14] border-[#232C3D] text-[#9CA3AF]'
                  }`}
                >
                  {formatClock(boardOrientation === 'w' ? blackTimeSec : whiteTimeSec)}
                </div>
              )}
          </div>

          {/* Status / Check / Checkmate / Theory Banner */}
          {statusBanner && (
            <div className="w-full max-w-[680px] mb-2 px-3 py-1.5 rounded-lg bg-[#1B2230]/90 border border-[#C89D54]/40 text-xs text-[#F3F4F6] flex items-center justify-between gap-2">
              <span className="truncate">{statusBanner}</span>
              {gameResult.over && (
                <button
                  onClick={() => handleSelectMode('analysis')}
                  className="px-2.5 py-0.5 rounded bg-[#10B981] text-[#0B0E14] font-bold text-[11px] shrink-0"
                >
                  Ver Análise Profunda →
                </button>
              )}
            </div>
          )}

          {/* 2D Chessboard & Evaluation Bar */}
          <div className="w-full flex items-center justify-center my-auto">
            <ChessBoard2D
              fen={currentFen}
              orientation={boardOrientation}
              theme={activeTheme}
              pieceStyle={preferences.pieceStyle}
              showCoordinates={preferences.showCoordinates}
              showLegalMoves={preferences.showLegalMoves}
              enableAnimations={preferences.enableAnimations}
              showEvalBar={preferences.showEvalBar}
              evalCp={telemetry.scoreCp}
              mate={telemetry.mate}
              lastMove={currentLastMove}
              arrows={boardArrows}
              interactive={!gameResult.over}
              autoQueenPromotion={preferences.autoQueenPromotion}
              onMove={handleUserBoardMove}
              editorMode={activeMode === 'editor'}
              onEditorSquareClick={handleEditorSquareClick}
            />
          </div>

          {/* Bottom Player Info Bar & Quick Controls */}
          <div className="w-full max-w-[680px] mt-2 space-y-2">
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#131822]/90 border border-[#232C3D]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border ${
                    boardOrientation === 'w'
                      ? 'bg-white text-[#0B0E14] border-white'
                      : 'bg-[#1B2230] text-white border-[#38BDF8]'
                  }`}
                >
                  {boardOrientation === 'w' ? '♙' : '♟'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      Você ({boardOrientation === 'w' ? 'Brancas' : 'Pretas'})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeTurn === boardOrientation
                          ? 'bg-[#10B981]/20 text-[#10B981]'
                          : 'bg-[#1B2230] text-[#9CA3AF]'
                      }`}
                    >
                      {activeTurn === boardOrientation ? 'Seu Turno' : 'Aguardando...'}
                    </span>
                  </div>
                  {/* Captured Pieces by Bottom Side */}
                  <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF] h-4">
                    {(boardOrientation === 'w'
                      ? material.capturedByWhite
                      : material.capturedByBlack
                    ).map((p, idx) => (
                      <span key={idx} className="text-xs leading-none">
                        {p === 'q' ? '♛' : p === 'r' ? '♜' : p === 'b' ? '♝' : p === 'n' ? '♞' : '♟'}
                      </span>
                    ))}
                    {boardOrientation === 'w' && material.diffWhite > 0 && (
                      <span className="font-mono text-[10px] text-[#10B981] font-bold ml-1">
                        +{material.diffWhite}
                      </span>
                    )}
                    {boardOrientation === 'b' && material.diffWhite < 0 && (
                      <span className="font-mono text-[10px] text-[#10B981] font-bold ml-1">
                        +{Math.abs(material.diffWhite)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Board Toolbar */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setBoardOrientation((o) => (o === 'w' ? 'b' : 'w'))
                  }
                  className="p-2 rounded-lg bg-[#1B2230] hover:bg-[#232C3D] text-[#D1D5DB] hover:text-white border border-[#232C3D]"
                  title="Girar Tabuleiro"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={handleUndoMove}
                  disabled={moves.length === 0}
                  className="p-2 rounded-lg bg-[#1B2230] hover:bg-[#232C3D] disabled:opacity-40 text-[#D1D5DB] hover:text-white border border-[#232C3D]"
                  title="Voltar Lance"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (telemetry.bestMoveUci) {
                      setHintMoveUci(telemetry.bestMoveUci);
                      soundEngine.play('ui');
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1B2230] hover:bg-[#C89D54]/25 text-[#C89D54] border border-[#C89D54]/40 text-xs font-bold flex items-center gap-1"
                  title="Sugerir Melhor Lance do Stockfish"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dica IA</span>
                </button>
              </div>

              {/* Player Digital Clock */}
              {['classic', 'rapid', 'blitz', 'bullet'].includes(activeMode) &&
                selectedTimeControl.initialSeconds > 0 && (
                  <div
                    className={`px-3 py-1 rounded-lg font-mono-tabular text-sm sm:text-base font-extrabold border ${
                      activeTurn === boardOrientation
                        ? 'bg-[#C89D54] border-[#C89D54] text-[#0B0E14]'
                        : 'bg-[#0B0E14] border-[#232C3D] text-[#9CA3AF]'
                    }`}
                  >
                    {formatClock(boardOrientation === 'w' ? whiteTimeSec : blackTimeSec)}
                  </div>
                )}
            </div>
          </div>
        </main>

        {/* 3. RIGHT CONTEXTUAL COMMAND & TELEMETRY DOCK */}
        <section className="w-full lg:w-[440px] xl:w-[480px] bg-[#131822] border-t lg:border-t-0 lg:border-l border-[#232C3D] p-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
          {/* Dynamic Mode Panel */}
          <div className="flex-1 min-h-[380px] flex flex-col">
            {activeMode === 'gambit-lab' && (
              <GambitLabPanel
                gambits={GAMBITS_DATABASE}
                selectedGambit={selectedGambit}
                selectedDefense={selectedDefense}
                selectedStartPos={selectedStartPos}
                trainingColor={playerColor}
                currentPly={viewPly}
                inTheory={gambitInTheory}
                theoryCompleted={gambitTheoryCompleted}
                freePlayOverride={gambitFreePlayOverride}
                currentFen={currentFen}
                telemetry={telemetry}
                favoriteGambits={statistics.favoriteGambits}
                studiedLines={statistics.studiedGambitLines}
                customTrainings={customTrainings}
                onSelectGambit={(g) => {
                  setSelectedGambit(g);
                  const def = g.defenses[0];
                  const sp = g.startPositions[0];
                  setSelectedDefense(def);
                  setSelectedStartPos(sp);
                  startGambitSession(g, def, sp, g.repertoireColor);
                }}
                onSelectDefense={(def) => {
                  setSelectedDefense(def);
                  startGambitSession(selectedGambit, def, selectedStartPos, playerColor);
                }}
                onSelectStartPos={(sp) => {
                  setSelectedStartPos(sp);
                  startGambitSession(selectedGambit, selectedDefense, sp, playerColor);
                }}
                onChangeTrainingColor={(c) => {
                  startGambitSession(selectedGambit, selectedDefense, selectedStartPos, c);
                }}
                onStartTraining={() =>
                  startGambitSession(
                    selectedGambit,
                    selectedDefense,
                    selectedStartPos,
                    playerColor
                  )
                }
                onToggleFreePlay={() => {
                  setGambitFreePlayOverride((prev) => !prev);
                  soundEngine.play('ui');
                }}
                onJumpToFen={(fen, ply, comment) => {
                  setInitialFen(fen);
                  setMoves([]);
                  setViewPly(0);
                  setGambitFreePlayOverride(true);
                  if (comment) setStatusBanner(`Posição da Árvore (Lance ${ply}): ${comment}`);
                  soundEngine.play('ui');
                }}
                onPlayBookMove={(san) => {
                  try {
                    const c = new Chess(currentFen);
                    const m = c.move(san);
                    if (m) {
                      executeMoveOnBoard(
                        m.from,
                        m.to,
                        m.promotion as PieceType | undefined,
                        true
                      );
                    }
                  } catch {
                    // ignore
                  }
                }}
                onToggleFavorite={(gambitId) => {
                  setStatistics((prev) => {
                    const exists = prev.favoriteGambits.includes(gambitId);
                    const nextFavs = exists
                      ? prev.favoriteGambits.filter((id) => id !== gambitId)
                      : [...prev.favoriteGambits, gambitId];
                    const next = { ...prev, favoriteGambits: nextFavs };
                    saveStatistics(next);
                    return next;
                  });
                }}
                onAddCustomTraining={(item) => {
                  const updated = [item, ...customTrainings];
                  setCustomTrainings(updated);
                  saveCustomTrainings(updated);
                }}
                onDeleteCustomTraining={(id) => {
                  const updated = customTrainings.filter((c) => c.id !== id);
                  setCustomTrainings(updated);
                  saveCustomTrainings(updated);
                }}
                onLoadCustomTraining={(item) => {
                  const customDef: GambitDefenseLine = {
                    id: item.id,
                    name: item.title,
                    category: 'Linha Alternativa',
                    description: item.notes,
                    movesSan: item.movesSan,
                    keyIdea: item.notes,
                    evaluationVerdict: 'Treino Personalizado',
                  };
                  setSelectedDefense(customDef);
                  setInitialFen(item.initialFen);
                  setPlayerColor(item.color);
                  setBoardOrientation(item.color);
                  setMoves([]);
                  setViewPly(0);
                  setGambitInTheory(true);
                  setGambitFreePlayOverride(false);
                  setStatusBanner(`Treinamento Personalizado: ${item.title}`);
                }}
              />
            )}

            {activeMode === 'analysis' && (
              <DeepAnalysisPanel
                report={analysisReport}
                currentPly={viewPly}
                telemetry={telemetry}
                onSelectPly={(ply) => setViewPly(ply)}
                onImportPgn={handleImportPgn}
                onPracticeFromFen={(fen) => {
                  const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w';
                  startStandardGame('untimed', TIME_CONTROLS[8], turn, fen);
                }}
              />
            )}

            {activeMode === 'editor' && (
              <PositionEditorPanel
                fen={editorFen}
                selectedTool={editorTool}
                pieceStyle={preferences.pieceStyle}
                onSelectTool={setEditorTool}
                onUpdateFen={setEditorFen}
                onPlayFromPosition={(fen, col) =>
                  startStandardGame('untimed', TIME_CONTROLS[8], col, fen)
                }
                onAnalyzePosition={(fen) => {
                  setInitialFen(fen);
                  setMoves([]);
                  setViewPly(0);
                  setActiveMode('analysis');
                }}
              />
            )}

            {(activeMode === 'openings' ||
              activeMode === 'tactics' ||
              activeMode === 'endgames') && (
              <TrainingModulesPanel
                activeMode={activeMode}
                openings={OPENINGS_DATABASE}
                selectedOpening={selectedOpening}
                currentOpeningPly={viewPly}
                onSelectOpening={(op) => {
                  setSelectedOpening(op);
                  setInitialFen(START_FEN);
                  const rec = buildRecordedMovesFromSanList(START_FEN, op.movesSan);
                  setMoves(rec);
                  setViewPly(rec.length);
                  setBoardOrientation(op.color);
                }}
                onStepOpeningMove={(ply) => setViewPly(ply)}
                onPracticeOpeningVsAI={(op, col) =>
                  startStandardGame('untimed', TIME_CONTROLS[8], col, op.criticalFen)
                }
                tactics={TACTICAL_CHALLENGES}
                selectedTactic={selectedTactic}
                tacticStatus={tacticStatus}
                tacticMessage={tacticMessage}
                solvedTacticsIds={statistics.tacticsSolved}
                tacticsRating={statistics.tacticsRating}
                tacticsStreak={statistics.tacticsStreak}
                onSelectTactic={loadTacticalChallenge}
                onRetryTactic={() => loadTacticalChallenge(selectedTactic)}
                onNextTactic={() => {
                  const idx = TACTICAL_CHALLENGES.findIndex(
                    (t) => t.id === selectedTactic.id
                  );
                  const next =
                    TACTICAL_CHALLENGES[(idx + 1) % TACTICAL_CHALLENGES.length];
                  loadTacticalChallenge(next);
                }}
                onShowTacticSolution={() => {
                  const solMoveSan = selectedTactic.solutionSan[tacticStepIndex];
                  if (!solMoveSan) return;
                  try {
                    const c = new Chess(currentFen);
                    const m = c.move(solMoveSan);
                    if (m) {
                      setHintMoveUci(`${m.from}${m.to}`);
                      setTacticMessage(`Solução sugerida: ${m.san}`);
                    }
                  } catch {
                    // ignore
                  }
                }}
                endgames={ENDGAME_SCENARIOS}
                selectedEndgame={selectedEndgame}
                completedEndgamesIds={statistics.endgamesCompleted}
                endgameStatus={endgameStatus}
                onSelectEndgame={loadEndgameScenario}
                onRestartEndgame={() => loadEndgameScenario(selectedEndgame)}
              />
            )}

            {/* Standard Match Control Panel (Clássica, Rápida, Blitz, Bullet, Sem Relógio) */}
            {['classic', 'rapid', 'blitz', 'bullet', 'untimed'].includes(activeMode) && (
              <div className="flex flex-col h-full bg-[#131822] border border-[#232C3D] rounded-xl overflow-hidden text-xs">
                <div className="p-3.5 bg-gradient-to-r from-[#171E2C] to-[#131822] border-b border-[#232C3D] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#C89D54]" />
                    <h2 className="text-sm font-bold text-white">
                      PARTIDA VS STOCKFISH ({selectedTimeControl.label})
                    </h2>
                  </div>
                  <button
                    onClick={() =>
                      startStandardGame(activeMode, selectedTimeControl, playerColor, START_FEN)
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#C89D54] text-[#0B0E14] font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Nova Partida
                  </button>
                </div>

                <div className="p-3.5 space-y-3 overflow-y-auto">
                  {/* Time Control Presets */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#9CA3AF] mb-1.5 uppercase">
                      Ritmo de Jogo / Relógio
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TIME_CONTROLS.map((tc) => (
                        <button
                          key={tc.id}
                          onClick={() => startStandardGame(tc.mode, tc, playerColor, START_FEN)}
                          className={`py-1.5 px-2 rounded-lg font-semibold border transition text-[11px] ${
                            selectedTimeControl.id === tc.id
                              ? 'bg-[#C89D54]/20 border-[#C89D54] text-[#C89D54] font-bold'
                              : 'bg-[#0B0E14] border-[#232C3D] text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          {tc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Player Color Choice */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#9CA3AF] mb-1.5 uppercase">
                      Jogar Com
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() =>
                          startStandardGame(activeMode, selectedTimeControl, 'w', START_FEN)
                        }
                        className={`py-1.5 rounded-lg font-bold border ${
                          playerColor === 'w'
                            ? 'bg-white text-[#0B0E14] border-white'
                            : 'bg-[#0B0E14] text-[#9CA3AF] border-[#232C3D]'
                        }`}
                      >
                        ♙ Brancas
                      </button>
                      <button
                        onClick={() =>
                          startStandardGame(activeMode, selectedTimeControl, 'random', START_FEN)
                        }
                        className="py-1.5 rounded-lg font-bold border bg-[#0B0E14] hover:bg-[#1B2230] text-[#C89D54] border-[#232C3D]"
                      >
                        🎲 Sorteio
                      </button>
                      <button
                        onClick={() =>
                          startStandardGame(activeMode, selectedTimeControl, 'b', START_FEN)
                        }
                        className={`py-1.5 rounded-lg font-bold border ${
                          playerColor === 'b'
                            ? 'bg-[#38BDF8] text-[#0B0E14] border-[#38BDF8]'
                            : 'bg-[#0B0E14] text-[#9CA3AF] border-[#232C3D]'
                        }`}
                      >
                        ♟ Pretas
                      </button>
                    </div>
                  </div>

                  {/* All 9 AI Difficulty Levels Grid */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#9CA3AF] mb-1.5 uppercase">
                      Nível de Força Real do Stockfish (9 Níveis)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {AI_DIFFICULTY_LEVELS.map((lvl) => {
                        const isSelected = aiDifficulty === lvl.id;
                        return (
                          <button
                            key={lvl.id}
                            onClick={() => setAiDifficulty(lvl.id)}
                            className={`p-2 rounded-lg border text-left transition ${
                              isSelected
                                ? 'bg-[#1B2230] border-[#C89D54]'
                                : 'bg-[#0B0E14] border-[#232C3D] hover:bg-[#1B2230]/50'
                            }`}
                          >
                            <div className="font-bold text-white truncate text-[11px]">
                              {lvl.name}
                            </div>
                            <div
                              className="font-mono text-[10px]"
                              style={{ color: lvl.badgeColor }}
                            >
                              {lvl.elo} ELO • S{lvl.skillLevel}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Post-Game Analysis Trigger */}
                  {moves.length > 0 && (
                    <button
                      onClick={() => {
                        const rep = analyzeFullGame(moves);
                        setAnalysisReport(rep);
                        setActiveMode('analysis');
                      }}
                      className="w-full py-2 rounded-xl bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#0B0E14] border border-[#10B981]/50 font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Sparkles className="w-4 h-4" /> Executar Análise Profunda Desta Partida
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ALGEBRAIC MOVE HISTORY & NAVIGATION SCRUBBER */}
          <div className="h-52 bg-[#0B0E14] border border-[#232C3D] rounded-xl flex flex-col overflow-hidden shrink-0">
            <div className="px-3 py-2 bg-[#131822] border-b border-[#232C3D] flex items-center justify-between text-xs">
              <span className="font-bold text-[#F3F4F6] flex items-center gap-1.5">
                <Play className="w-3 h-3 text-[#C89D54]" /> Histórico Algébrico ({moves.length} lances)
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const pgn = moves
                      .map((m) => (m.color === 'w' ? `${m.moveNumber}. ${m.san}` : m.san))
                      .join(' ');
                    navigator.clipboard.writeText(pgn || currentFen);
                    setStatusBanner('Notação PGN/FEN copiada para a área de transferência!');
                  }}
                  className="px-2 py-0.5 rounded bg-[#1B2230] hover:bg-[#C89D54]/20 text-[10px] text-[#C89D54] flex items-center gap-1 font-semibold"
                  title="Copiar PGN"
                >
                  <Copy className="w-3 h-3" /> PGN
                </button>
              </div>
            </div>

            {/* Two-Column Move List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono-tabular text-xs">
              {movePairs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#9CA3AF] text-[11px]">
                  Nenhum movimento realizado ainda. Clique ou arraste uma peça para jogar.
                </div>
              ) : (
                movePairs.map((pair) => {
                  const wMeta = pair.white?.classification
                    ? getClassificationMeta(pair.white.classification)
                    : null;
                  const bMeta = pair.black?.classification
                    ? getClassificationMeta(pair.black.classification)
                    : null;

                  return (
                    <div
                      key={pair.moveNumber}
                      className="grid grid-cols-7 items-center px-2 py-1 rounded hover:bg-[#131822]"
                    >
                      <span className="col-span-1 text-[#6B7280]">{pair.moveNumber}.</span>
                      {pair.white ? (
                        <button
                          onClick={() => setViewPly(pair.white!.ply)}
                          className={`col-span-3 text-left px-2 py-0.5 rounded flex items-center justify-between ${
                            viewPly === pair.white.ply
                              ? 'bg-[#C89D54]/25 text-[#C89D54] font-bold border-l-2 border-[#C89D54]'
                              : 'text-[#F3F4F6] hover:bg-[#1B2230]'
                          }`}
                        >
                          <span>{pair.white.san}</span>
                          {wMeta && (
                            <span
                              className="text-[10px] font-bold"
                              style={{ color: wMeta.color }}
                            >
                              {wMeta.symbol}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="col-span-3" />
                      )}

                      {pair.black ? (
                        <button
                          onClick={() => setViewPly(pair.black!.ply)}
                          className={`col-span-3 text-left px-2 py-0.5 rounded flex items-center justify-between ${
                            viewPly === pair.black.ply
                              ? 'bg-[#C89D54]/25 text-[#C89D54] font-bold border-l-2 border-[#C89D54]'
                              : 'text-[#D1D5DB] hover:bg-[#1B2230]'
                          }`}
                        >
                          <span>{pair.black.san}</span>
                          {bMeta && (
                            <span
                              className="text-[10px] font-bold"
                              style={{ color: bMeta.color }}
                            >
                              {bMeta.symbol}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="col-span-3" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Move Scrubber Controls */}
            <div className="px-3 py-1.5 bg-[#131822] border-t border-[#232C3D] grid grid-cols-4 gap-1.5">
              <button
                onClick={() => setViewPly(0)}
                disabled={viewPly === 0}
                className="py-1 rounded bg-[#1B2230] hover:bg-[#232C3D] disabled:opacity-40 flex items-center justify-center text-[#D1D5DB]"
                title="Início da Partida"
              >
                <ChevronFirst className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewPly((p) => Math.max(0, p - 1))}
                disabled={viewPly === 0}
                className="py-1 rounded bg-[#1B2230] hover:bg-[#232C3D] disabled:opacity-40 flex items-center justify-center text-[#D1D5DB]"
                title="Lance Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewPly((p) => Math.min(moves.length, p + 1))}
                disabled={viewPly >= moves.length}
                className="py-1 rounded bg-[#1B2230] hover:bg-[#232C3D] disabled:opacity-40 flex items-center justify-center text-[#D1D5DB]"
                title="Próximo Lance"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewPly(moves.length)}
                disabled={viewPly >= moves.length}
                className="py-1 rounded bg-[#1B2230] hover:bg-[#232C3D] disabled:opacity-40 flex items-center justify-center text-[#D1D5DB]"
                title="Lance Atual"
              >
                <ChevronLast className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Settings, Audio & History Modal */}
      <SettingsAndHistoryModal
        isOpen={settingsModal.open}
        initialTab={settingsModal.tab}
        preferences={preferences}
        statistics={statistics}
        history={gameHistory}
        onClose={() => setSettingsModal({ ...settingsModal, open: false })}
        onUpdatePreferences={handleUpdatePreferences}
        onLoadGameFromHistory={(savedGame) => {
          handleImportPgn(savedGame.pgn);
        }}
        onClearHistory={() => {
          clearGameHistory();
          setGameHistory([]);
        }}
      />
    </div>
  );
}
export default App;
