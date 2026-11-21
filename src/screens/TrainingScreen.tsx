import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "../components/Board";
import MoveQuiz from "../components/MoveQuiz";
import { Btn, Card, Chip, PageHeader, ProgressBar, Tabs, useNav } from "../components/ui";
import { PlayGame } from "./PlayScreen";
import OpeningTrainer from "./OpeningTrainer";
import CustomTraining from "./CustomTraining";
import { useChessGame } from "../lib/useChessGame";
import { ENDGAMES, PUZZLES, STRATEGY, STRATEGY_THEMES, TACTIC_THEMES, THEME_INFO, type Puzzle } from "../data/training";
import { analyzeFen } from "../lib/engine";
import { START_FEN, fenFromSans, lineCp, pvToSan, scoreWhite, sanFromUci, uciParts, winPct } from "../lib/chessUtils";
import { addMistake, recordPuzzle, update, useData } from "../lib/store";
import { play, playMoveSound } from "../lib/sound";

type Tab = "tatica" | "estrategia" | "aberturas" | "finais" | "custom";

export default function TrainingScreen() {
  const { params } = useNav();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) ?? "tatica");
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="🎓 Treinamento" subtitle="Tática, estratégia, aberturas com repetição espaçada, finais e exercícios próprios — tudo verificado pelo Stockfish." right={<Tabs value={tab} onChange={setTab} tabs={[{ id: "tatica", label: "🧩 Tática" }, { id: "estrategia", label: "🏰 Estratégia" }, { id: "aberturas", label: "📖 Aberturas" }, { id: "finais", label: "👑 Finais" }, { id: "custom", label: "🛠 Personalizado" }]} />} />
      {tab === "tatica" && <Tactics />}
      {tab === "estrategia" && <Strategy />}
      {tab === "aberturas" && <OpeningTrainer initialId={params.openingId} />}
      {tab === "finais" && <Endgames />}
      {tab === "custom" && <CustomTraining />}
    </div>
  );
}

/* ------------------------------ Tática ------------------------------ */
function PuzzlePlayer({ puzzle, onNext }: { puzzle: Puzzle; onNext: () => void }) {
  const g = useChessGame(puzzle.fen);
  const [active, setActive] = useState<string[] | null>(null);
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState("");
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(false);
  const failed = useRef(false);
  const done = useRef(false);
  const orientation = puzzle.turn;
  const expected = active ? active[step] : puzzle.lines[0][0];

  const fail = () => {
    play("error");
    if (!failed.current) {
      failed.current = true;
      if (!done.current) {
        done.current = true;
        recordPuzzle(puzzle.id, false, puzzle.rating);
        addMistake({ fen: puzzle.fen, played: "—", best: sanFromUci(puzzle.fen, puzzle.lines[0][0]), bestUci: puzzle.lines[0][0], source: `Tática · ${puzzle.tema}` });
      }
    }
  };
  const win = () => {
    setSolved(true);
    setMsg("Problema resolvido! 🎉");
    setTimeout(() => play("win"), 200);
    if (!done.current) {
      done.current = true;
      recordPuzzle(puzzle.id, true, puzzle.rating);
    }
  };
  const onMove = (from: string, to: string, promo?: string) => {
    if (solved || (g.chess.turn() !== puzzle.turn)) return;
    const uci = from + to + (promo ?? "");
    let line = active;
    if (!line) {
      line = puzzle.lines.find((l) => l[0] === uci) ?? null;
      if (!line && puzzle.mateN === 1) {
        const t = new Chess(puzzle.fen);
        try {
          t.move({ from, to, promotion: promo });
          if (t.isCheckmate()) line = [uci];
        } catch { /* ilegal */ }
      }
      if (!line) {
        setMsg("Não é esse lance. Tente de novo (ou peça uma dica).");
        fail();
        return;
      }
      setActive(line);
    } else if (line[step] !== uci) {
      setMsg("Não é esse lance. Tente de novo.");
      fail();
      return;
    }
    const m = g.makeMove(from, to, promo, false);
    if (!m) return;
    playMoveSound(m);
    setHint(false);
    const next = step + 1;
    if (next >= line.length) return win();
    setStep(next + 1);
    setMsg("Correto! Continue…");
    const reply = line[next];
    setTimeout(() => {
      const p = uciParts(reply);
      const mm = g.makeMove(p.from, p.to, p.promotion, true);
      if (mm) playMoveSound(mm);
      if (next + 1 >= line!.length) win();
    }, 500);
  };
  const solution = pvToSan(puzzle.fen, puzzle.pvfull, 8).join(" ");
  return (
    <div className="grid md:grid-cols-[minmax(280px,520px)_1fr] gap-5 items-start">
      <div>
        <Board fen={g.viewFen} orientation={orientation} movable={solved ? null : puzzle.turn} lastMove={g.lastMove} anim={g.anim} onMove={onMove} arrows={hint && expected ? [{ from: expected.slice(0, 2), to: expected.slice(2, 4) }] : []} />
      </div>
      <Card title={`${puzzle.tema} · ~${puzzle.rating}`}>
        <h3 className="font-semibold">{puzzle.titulo}</h3>
        <p className="text-sm text-zinc-400 mt-1">{puzzle.turn === "w" ? "Brancas" : "Pretas"} jogam{puzzle.mateN ? ` e dão mate em ${puzzle.mateN}` : " e ganham vantagem decisiva"}.</p>
        <p className="text-xs text-zinc-500 mt-1">{THEME_INFO[puzzle.tema]}</p>
        <p className={`mt-3 text-sm min-h-6 ${solved ? "text-emerald-300" : "text-amber-300"}`}>{msg}</p>
        {solved && <p className="text-xs font-mono text-zinc-400 mt-1">Linha do motor: {solution}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <Btn onClick={() => { setHint(true); fail(); }} disabled={solved}>💡 Dica</Btn>
          <Btn onClick={() => { setMsg(`Solução: ${solution}`); fail(); setSolved(true); }} disabled={solved}>👁 Ver solução</Btn>
          <Btn variant="primary" onClick={onNext}>Próximo →</Btn>
        </div>
      </Card>
    </div>
  );
}

function Tactics() {
  const d = useData();
  const [theme, setTheme] = useState<string>("todos");
  const pool = useMemo(() => {
    const ps = PUZZLES.filter((p) => theme === "todos" || p.tema === theme);
    return [...ps].sort((a, b) => ((d.puzzles.solved[a.id]?.ok ?? 0) > 0 ? 1 : 0) - ((d.puzzles.solved[b.id]?.ok ?? 0) > 0 ? 1 : 0) || a.rating - b.rating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [theme]);
  const p = pool[idx % Math.max(1, pool.length)];
  const solvedCount = PUZZLES.filter((x) => (d.puzzles.solved[x.id]?.ok ?? 0) > 0).length;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button onClick={() => setTheme("todos")} className={`px-3 py-1 rounded-lg text-sm ${theme === "todos" ? "bg-emerald-500 text-emerald-950 font-semibold" : "bg-white/10"}`}>Todos ({PUZZLES.length})</button>
          {TACTIC_THEMES.filter((t) => PUZZLES.some((p) => p.tema === t)).map((t) => <button key={t} onClick={() => setTheme(t)} className={`px-3 py-1 rounded-lg text-sm ${theme === t ? "bg-emerald-500 text-emerald-950 font-semibold" : "bg-white/10"}`}>{t} ({PUZZLES.filter((x) => x.tema === t).length})</button>)}
          <span className="ml-auto text-sm text-zinc-400">Rating tático: <b className="text-amber-300">{d.puzzles.rating}</b> · resolvidos {solvedCount}/{PUZZLES.length}</span>
        </div>
        <div className="mt-2"><ProgressBar value={(solvedCount / PUZZLES.length) * 100} color="#f59e0b" /></div>
      </Card>
      {p ? <PuzzlePlayer key={p.id + idx} puzzle={p} onNext={() => setIdx((i) => (i + 1) % pool.length)} /> : <p className="text-zinc-500">Nenhum problema.</p>}
    </div>
  );
}

/* ---------------------------- Estratégia ---------------------------- */
function Strategy() {
  const d = useData();
  const [theme, setTheme] = useState(Object.keys(STRATEGY_THEMES)[0]);
  const list = STRATEGY.filter((s) => s.tema === theme);
  const [i, setI] = useState(0);
  const [best, setBest] = useState<string | null>(null);
  useEffect(() => { setI(0); setBest(null); }, [theme]);
  const ex = list[i % list.length];
  const fen = ex.fen ?? fenFromSans(ex.sans!.split(" ")) ?? START_FEN;
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4">
      <Card title="Temas">
        {Object.keys(STRATEGY_THEMES).map((t) => {
          const done = STRATEGY.filter((s) => s.tema === t && d.strategyDone[s.id]).length;
          return <button key={t} onClick={() => setTheme(t)} className={`w-full text-left rounded-lg px-3 py-2 text-sm mb-1 ${theme === t ? "bg-emerald-400/15 border border-emerald-400" : "hover:bg-white/5 border border-transparent"}`}>{t}<span className="float-right text-xs text-zinc-500">{done}/{STRATEGY.filter((s) => s.tema === t).length}</span></button>;
        })}
      </Card>
      <div className="grid md:grid-cols-[minmax(280px,480px)_1fr] gap-4 items-start">
        <MoveQuiz
          key={ex.id}
          fen={fen}
          arrows={best ? [{ from: best.slice(0, 2), to: best.slice(2, 4) }] : []}
          accept={async (uci, _san, f) => {
            const before = await analyzeFen(f, 14, 1);
            const c = new Chess(f);
            c.move(uciParts(uci));
            const after = await analyzeFen(c.fen(), 14, 1);
            if (!before || !after) return { ok: false, msg: "Motor indisponível." };
            const turn = f.split(" ")[1];
            const sc = (x: typeof before, ff: string) => { const w = lineCp(scoreWhite(ff, x.lines[0])); return winPct(turn === "w" ? w : -w); };
            const loss = sc(before, f) - sc(after, c.fen());
            setBest(before.lines[0].pv[0]);
            const bs = sanFromUci(f, before.lines[0].pv[0]);
            if (loss <= 8) { update((s) => { s.strategyDone[ex.id] = Date.now(); }); return { ok: true, msg: loss <= 3 ? `Excelente! Perda de apenas ${loss.toFixed(1)}%. O motor também prefere ${bs}.` : `Boa jogada (perda ${loss.toFixed(1)}%). O motor preferia ${bs}.` }; }
            return { ok: false, msg: `Perde ${loss.toFixed(0)}% de chances. O Stockfish prefere ${bs}. Tente novamente!` };
          }}
        />
        <Card title={ex.titulo}>
          <p className="text-xs text-zinc-400 mb-2">{STRATEGY_THEMES[theme]}</p>
          <p className="text-sm font-medium text-amber-200">❓ {ex.pergunta}</p>
          <p className="text-xs text-zinc-500 mt-3">Ideia: {ex.ideia}</p>
          <div className="flex gap-2 mt-3"><Btn onClick={() => { setBest(null); setI((x) => x + 1); }}>Próximo exercício →</Btn></div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ Finais ------------------------------ */
function Endgames() {
  const d = useData();
  const [sel, setSel] = useState<string | null>(null);
  const e = ENDGAMES.find((x) => x.id === sel);
  const gk = useRef(0);
  if (e) {
    return (
      <div>
        <PlayGame key={gk.current} startFen={e.fen} playerColor={e.turn} cfg={{ levelId: "max", styleId: "equilibrado", movetime: 700, depth: 0, elo: 0 }} tc={null} modeLabel={`Final: ${e.nome}`} objective={e.objective === "win" ? "Vença a partida contra o Stockfish." : "Posição teoricamente empatada: segure o empate (ou aproveite um erro)."} save={false} onExit={() => setSel(null)} onResult={(r) => { if (r.won || (e.objective === "draw" && r.won === null)) update((s) => { s.endgamesDone[e.id] = Date.now(); }); }} />
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ENDGAMES.map((x) => (
        <Card key={x.id} title={x.cat} right={d.endgamesDone[x.id] ? <Chip color="#10b981">✔ concluído</Chip> : undefined}>
          <div className="max-w-[200px] mx-auto mb-2"><Board fen={x.fen} movable={null} coords={false} /></div>
          <h3 className="font-semibold">{x.nome}</h3>
          <p className="text-xs text-zinc-400 my-1">{x.desc}</p>
          <p className="text-xs text-amber-300">Objetivo: {x.objective === "win" ? "vencer" : "empatar"} ({x.turn === "w" ? "você de brancas" : "você de pretas"})</p>
          <Btn variant="primary" className="mt-2 w-full" onClick={() => { gk.current++; setSel(x.id); }}>Praticar contra o Stockfish</Btn>
        </Card>
      ))}
    </div>
  );
}
