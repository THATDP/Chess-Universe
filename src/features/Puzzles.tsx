import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import data from "../data/puzzles.json";
import { useChessGame } from "../core/chess/useChessGame";
import { tryMove, tryUci, turnOf } from "../core/chess/rules";
import { Board } from "../ui/Board";
import { Btn, Card, PageTitle, Pill } from "../ui/common";
import { audio } from "../core/audio/audio";
import { load, save, updateStats, usePersisted } from "../core/storage/db";
import type { PuzzleProgress, Stats } from "../core/storage/db";
import { DEFAULT_STATS } from "../core/storage/db";
import { cn } from "../utils/cn";

type P = [string, string, string, number, string[]];
const PUZZLES = data as unknown as P[];

const THEME_PT: Record<string, string> = {
  mateIn1: "Mate em 1",
  mateIn2: "Mate em 2",
  mateIn3: "Mate em 3",
  mate: "Mate",
  fork: "Garfo",
  pin: "Cravada",
  skewer: "Espeto",
  discoveredAttack: "Ataque descoberto",
  deflection: "Desvio",
  backRankMate: "Mate do corredor",
  hangingPiece: "Peça pendurada",
  trappedPiece: "Peça presa",
  sacrifice: "Sacrifício",
  endgame: "Final",
  promotion: "Promoção",
  attraction: "Atração",
  smotheredMate: "Mate sufocado",
  quietMove: "Lance silencioso",
  zugzwang: "Zugzwang",
  xRayAttack: "Raio-X",
  doubleCheck: "Xeque duplo",
  middlegame: "Meio-jogo",
  opening: "Abertura",
  crushing: "Esmagador",
  advantage: "Vantagem",
  equality: "Igualdade",
  short: "Curto",
  long: "Longo",
  veryLong: "Muito longo",
  oneMove: "Um lance",
  master: "Partida de mestre",
  masterVsMaster: "Mestre × Mestre",
  superGM: "Super GM",
  capturingDefender: "Capturar defensor",
  intermezzo: "Lance intermediário",
  clearance: "Liberação",
  interference: "Interferência",
  exposedKing: "Rei exposto",
  kingsideAttack: "Ataque no flanco do rei",
  queensideAttack: "Ataque no flanco da dama",
  defensiveMove: "Lance defensivo",
  advancedPawn: "Peão avançado",
  rookEndgame: "Final de torres",
  pawnEndgame: "Final de peões",
  bishopEndgame: "Final de bispos",
  knightEndgame: "Final de cavalos",
  queenEndgame: "Final de damas",
  queenRookEndgame: "Final de dama e torre",
  arabianMate: "Mate árabe",
  anastasiaMate: "Mate de Anastasia",
  hookMate: "Mate do gancho",
  bodenMate: "Mate de Boden",
  dovetailMate: "Mate rabo de andorinha",
};
const tp = (t: string) => THEME_PT[t] ?? t;

const ALL_THEMES = ["mateIn1", "mateIn2", "mateIn3", "fork", "pin", "skewer", "discoveredAttack", "deflection", "backRankMate", "hangingPiece", "trappedPiece", "sacrifice", "endgame", "promotion", "attraction", "smotheredMate", "quietMove", "zugzwang", "xRayAttack", "doubleCheck"];

export default function Puzzles() {
  const [prog, setProg] = usePersisted<PuzzleProgress>("puzzleProgress", { solved: [], failed: [] });
  const [stats, setStats] = useState<Stats>(() => load("stats", DEFAULT_STATS));
  const [theme, setTheme] = useState<string>("all");
  const [idx, setIdx] = useState<number>(() => pick(load<PuzzleProgress>("puzzleProgress", { solved: [], failed: [] }), load("stats", DEFAULT_STATS).puzzleRating, "all"));
  const puzzle = PUZZLES[idx];
  const game = useChessGame(puzzle[1]);
  const [step, setStep] = useState(0); // índice do próximo lance esperado em moves[]
  const [status, setStatus] = useState<"loading" | "solving" | "solved" | "failed">("loading");
  const [msg, setMsg] = useState("");
  const [userColor, setUserColor] = useState<"w" | "b">("w");
  const [hintLevel, setHintLevel] = useState(0);
  const [failedOnce, setFailedOnce] = useState(false);
  const [badge, setBadge] = useState<{ square: string; text: string; color: string } | null>(null);
  const timers = useRef<number[]>([]);
  const solution = useMemo(() => puzzle[2].split(" "), [puzzle]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const load_ = useCallback(
    (i: number) => {
      clearTimers();
      const p = PUZZLES[i];
      setIdx(i);
      setStatus("loading");
      setStep(0);
      setHintLevel(0);
      setFailedOnce(false);
      setBadge(null);
      setMsg("");
      game.reset(p[1], []);
      // lance do adversário que prepara o problema
      const first = p[2].split(" ")[0];
      setUserColor(turnOf(p[1]) === "w" ? "b" : "w");
      timers.current.push(
        window.setTimeout(() => {
          const r = game.playUci(first);
          if (r) audio.playMove(r, false);
          setStep(1);
          setStatus("solving");
        }, 600)
      );
    },
    [game]
  );

  useEffect(() => {
    load_(idx);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rate = (success: boolean) => {
    updateStats((s) => {
      const exp = 1 / (1 + Math.pow(10, (puzzle[3] - s.puzzleRating) / 400));
      const delta = Math.round(32 * ((success ? 1 : 0) - exp));
      const streak = success ? s.puzzleStreak + 1 : 0;
      return {
        ...s,
        puzzleRating: Math.max(100, s.puzzleRating + delta),
        puzzlesSolved: s.puzzlesSolved + (success ? 1 : 0),
        puzzlesFailed: s.puzzlesFailed + (success ? 0 : 1),
        puzzleStreak: streak,
        bestStreak: Math.max(s.bestStreak, streak),
      };
    });
    setStats(load("stats", DEFAULT_STATS));
  };

  const onMove = (from: string, to: string, promo?: string) => {
    if (status !== "solving" || game.turn !== userColor) return;
    const probe = tryMove(game.fen, from, to, promo);
    if (!probe) return;
    const expected = solution[step];
    const isMate = probe.san.endsWith("#");
    if (probe.uci === expected || isMate) {
      const rec = game.makeMove(from, to, promo)!;
      audio.playMove(rec, isMate);
      setBadge({ square: to, text: "✓", color: "#22c55e" });
      setHintLevel(0);
      const nextStep = step + 1;
      if (isMate || nextStep >= solution.length) {
        setStatus("solved");
        setMsg(failedOnce ? "Resolvido (com erros — sem pontos)." : "Excelente! Problema resolvido.");
        audio.play("success");
        if (!failedOnce) rate(true);
        setProg((p) => (p.solved.includes(puzzle[0]) ? p : { ...p, solved: [...p.solved, puzzle[0]] }));
      } else {
        setStep(nextStep);
        setMsg("Correto! Continue…");
        timers.current.push(
          window.setTimeout(() => {
            setBadge(null);
            const r = game.playUci(solution[nextStep]);
            if (r) audio.playMove(r, r.san.endsWith("#"));
            setStep(nextStep + 1);
          }, 500)
        );
      }
    } else {
      audio.play("error");
      setBadge({ square: to, text: "✗", color: "#ef4444" });
      setMsg("Não é esse lance. Tente de novo!");
      if (!failedOnce) {
        setFailedOnce(true);
        rate(false);
        setProg((p) => (p.failed.includes(puzzle[0]) ? p : { ...p, failed: [...p.failed, puzzle[0]] }));
      }
      timers.current.push(window.setTimeout(() => setBadge(null), 900));
    }
  };

  const showSolution = () => {
    if (status !== "solving") return;
    clearTimers();
    if (!failedOnce) {
      setFailedOnce(true);
      rate(false);
    }
    let f = game.fen;
    let i = step;
    const play = () => {
      if (i >= solution.length) {
        setStatus("failed");
        setMsg("Solução exibida.");
        return;
      }
      const r = tryUci(f, solution[i]);
      if (!r) return;
      game.playUci(solution[i]);
      audio.playMove(r, r.san.endsWith("#"));
      f = r.fen;
      i++;
      timers.current.push(window.setTimeout(play, 800));
    };
    play();
  };

  const next = () => {
    const i = pick(load<PuzzleProgress>("puzzleProgress", { solved: [], failed: [] }), load<Stats>("stats", DEFAULT_STATS).puzzleRating, theme, idx);
    load_(i);
  };

  useEffect(() => {
    save("puzzleProgress", prog);
  }, [prog]);

  const expectedMove = status === "solving" ? solution[step] : null;
  const marks: Record<string, string> = {};
  const arrows: { from: string; to: string; color?: string }[] = [];
  if (expectedMove && hintLevel >= 1) marks[expectedMove.slice(0, 2)] = "rgba(250,204,21,0.55)";
  if (expectedMove && hintLevel >= 2) arrows.push({ from: expectedMove.slice(0, 2), to: expectedMove.slice(2, 4), color: "rgba(250,204,21,0.9)" });

  const count = PUZZLES.filter((p) => theme === "all" || p[4].includes(theme)).length;
  const solvedCount = prog.solved.length;

  return (
    <div className="page-enter">
      <PageTitle
        title="Desafios Táticos"
        subtitle="Problemas reais extraídos do banco de dados aberto do Lichess (CC0). Encontre o melhor lance — seu rating tático é atualizado a cada resultado."
        right={
          <div className="flex gap-2">
            <Pill color="amber">Rating {stats.puzzleRating}</Pill>
            <Pill color="green">✓ {solvedCount}/{PUZZLES.length}</Pill>
            <Pill color="blue">✹ {stats.puzzleStreak}</Pill>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-200px))]">
          <div className={cn("mb-2 rounded-lg border px-3 py-2 text-sm font-semibold", status === "solved" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200" : status === "failed" ? "border-red-500/40 bg-red-500/15 text-red-200" : "border-line bg-panel text-ink")}>
            {status === "loading" ? "Preparando o problema…" : status === "solving" ? `Sua vez — ${userColor === "w" ? "brancas" : "pretas"} jogam. ${msg}` : msg}
          </div>
          <Board fen={game.fen} orientation={userColor} movable={status === "solving" ? userColor : null} lastMove={game.lastMove} marks={marks} arrows={arrows} onMove={onMove} badge={badge} />
        </div>
        <div className="space-y-4">
          <Card title={`Problema ${puzzle[0]}`} right={<Pill color="violet">Dificuldade {puzzle[3]}</Pill>}>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {status === "solved" || status === "failed" ? (
                puzzle[4].slice(0, 6).map((t) => <Pill key={t}>{tp(t)}</Pill>)
              ) : (
                <span className="text-xs text-mute">Os temas serão revelados ao final.</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Btn onClick={() => setHintLevel((h) => Math.min(2, h + 1))} disabled={status !== "solving"}>✧ Dica {hintLevel > 0 ? `(${hintLevel}/2)` : ""}</Btn>
              <Btn onClick={showSolution} disabled={status !== "solving"}>◉ Ver solução</Btn>
              <Btn variant="primary" className="col-span-2" onClick={next}>Próximo desafio →</Btn>
            </div>
            <p className="mt-3 text-[11px] text-mute">Dicas não alteram o rating, mas errar ou ver a solução sim. Aceitamos qualquer lance que dê mate.</p>
          </Card>
          <Card title="Filtrar por tema" right={<span className="text-xs text-mute">{count} problemas</span>}>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="all">Todos os temas</option>
              {ALL_THEMES.map((t) => (
                <option key={t} value={t}>{tp(t)} ({PUZZLES.filter((p) => p[4].includes(t)).length})</option>
              ))}
            </select>
            <Btn className="mt-2 w-full" size="sm" onClick={() => load_(pick(prog, stats.puzzleRating, theme, idx))}>Aplicar e sortear</Btn>
          </Card>
          <Card title="Seu desempenho">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-panel2 p-2"><div className="text-xl font-black text-emerald-300">{stats.puzzlesSolved}</div><div className="text-[10px] text-mute">acertos</div></div>
              <div className="rounded-md bg-panel2 p-2"><div className="text-xl font-black text-red-300">{stats.puzzlesFailed}</div><div className="text-[10px] text-mute">erros</div></div>
              <div className="rounded-md bg-panel2 p-2"><div className="text-xl font-black text-accent">{stats.bestStreak}</div><div className="text-[10px] text-mute">melhor sequência</div></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Escolhe um problema ainda não resolvido, o mais próximo do rating do jogador */
function pick(prog: PuzzleProgress, rating: number, theme: string, current = -1): number {
  const pool = PUZZLES.map((p, i) => ({ p, i })).filter(({ p, i }) => (theme === "all" || p[4].includes(theme)) && i !== current);
  const unsolved = pool.filter(({ p }) => !prog.solved.includes(p[0]));
  const src = unsolved.length ? unsolved : pool;
  if (!src.length) return 0;
  src.sort((a, b) => Math.abs(a.p[3] - rating) - Math.abs(b.p[3] - rating));
  const top = src.slice(0, Math.min(4, src.length));
  return top[Math.floor(Math.random() * top.length)].i;
}
