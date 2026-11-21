import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "../components/Board";
import { Btn, Card, Chip, EngineLines, EvalBar, EvalGraph, MoveList, NavButtons, PageHeader, ProgressBar, inputCls, useNav } from "../components/ui";
import { useChessGame } from "../lib/useChessGame";
import { useEvals } from "../lib/useEvals";
import { CLASS_INFO, START_FEN, accuracyFromLoss, explainMove, lineCp, parseGameInput, toPgn, uciParts, type MoveClass } from "../lib/chessUtils";
import { addMistake, useData, useSettings } from "../lib/store";
import { playMoveSound } from "../lib/sound";
import { bookLookup } from "../data/openings";

const ORDER: MoveClass[] = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "blunder"];

export default function AnalysisScreen() {
  const { params, go } = useNav();
  const data = useData();
  const settings = useSettings();
  const g = useChessGame(START_FEN);
  const ex = useChessGame(START_FEN);
  const [exploring, setExploring] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [orientation, setOrientation] = useState<"w" | "b">("w");
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [report, setReport] = useState(false);
  const [live, setLive] = useState(!!params.free);
  const [title, setTitle] = useState("Estudo livre");
  const evals = useEvals(settings.analysisDepth);
  const runId = useRef(0);
  const [saved, setSaved] = useState(false);

  const load = (txt: string, run = true, label?: string) => {
    const p = parseGameInput(txt);
    if ("error" in p) return setErr(p.error);
    setErr("");
    g.reset(p.startFen, p.sans);
    g.setView(0);
    setLoaded(true);
    setExploring(false);
    setReport(false);
    setTitle(label ?? (p.headers.White ? `${p.headers.White} × ${p.headers.Black}` : "Partida carregada"));
    if (p.headers.Black === "Você") setOrientation("b");
    if (run && p.sans.length) setTimeout(() => analyze(p.startFen, p.sans), 50);
  };

  useEffect(() => {
    if (params.pgn) load(params.pgn, !params.free, params.free ? "Linha de estudo" : undefined);
    else if (params.fen) { g.reset(params.fen); setLoaded(true); setLive(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyze = async (startFen: string, sans: string[]) => {
    const id = ++runId.current;
    setProgress(0);
    const c = new Chess(startFen);
    const fens = [c.fen()];
    for (const s of sans) {
      c.move(s);
      fens.push(c.fen());
    }
    for (let i = 0; i < fens.length; i++) {
      if (runId.current !== id) return;
      await evals.ensure(fens[i]);
      setProgress(((i + 1) / fens.length) * 100);
    }
    if (runId.current === id) {
      setProgress(null);
      setReport(true);
    }
  };

  const hist = g.history;
  const verdicts = useMemo(() => hist.map((m) => evals.verdict(m)), [hist, evals.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const classes: Record<number, MoveClass> = {};
  verdicts.forEach((v, i) => v && (classes[i + 1] = v.cls));
  const complete = report && verdicts.every(Boolean);
  const evalSeries = useMemo(() => {
    const arr: number[] = [];
    const first = evals.get(g.startFen);
    arr.push(first ? lineCp(first.score) : 0);
    hist.forEach((m) => {
      const e = evals.get(m.after);
      arr.push(e ? Math.max(-1000, Math.min(1000, lineCp(e.score))) : arr[arr.length - 1]);
    });
    return arr;
  }, [hist, evals.version, g.startFen]); // eslint-disable-line react-hooks/exhaustive-deps

  const sideStats = (color: "w" | "b") => {
    const counts: Record<string, number> = {};
    let acc = 0, n = 0;
    hist.forEach((m, i) => {
      const v = verdicts[i];
      if (!v || m.color !== color) return;
      counts[v.cls] = (counts[v.cls] ?? 0) + 1;
      acc += accuracyFromLoss(v.loss * (v.cls === "book" ? 0 : 1));
      n++;
    });
    return { counts, accuracy: n ? acc / n : 0, n };
  };
  const W = sideStats("w"), B = sideStats("b");

  const moments = useMemo(() => hist.map((m, i) => ({ i, m, v: verdicts[i] })).filter((x) => x.v && x.v.loss > 12 && x.v.cls !== "book").sort((a, b) => b.v!.loss - a.v!.loss).slice(0, 6), [hist, verdicts]);

  const current = exploring ? ex : g;
  const viewFen = exploring ? ex.viewFen : g.viewFen;
  const curEval = evals.get(viewFen);
  const viewMove = !exploring && g.viewPly > 0 ? hist[g.viewPly - 1] : null;
  const verdict = viewMove ? verdicts[g.viewPly - 1] : null;

  const onMove = (from: string, to: string, promo?: string) => {
    if (exploring) {
      const m = ex.makeMove(from, to, promo, false);
      if (m) playMoveSound(m);
      return;
    }
    if (g.viewPly === hist.length) {
      const m = g.makeMove(from, to, promo, false);
      if (m) playMoveSound(m);
      setLoaded(true);
    } else {
      const next = hist[g.viewPly];
      if (next && next.from === from && next.to === to && (next.promotion ?? "") === (promo ?? "")) return g.setView(g.viewPly + 1);
      ex.reset(g.viewFen);
      const m = ex.makeMove(from, to, promo, false);
      if (m) playMoveSound(m);
      setExploring(true);
    }
  };

  const saveMistakes = () => {
    hist.forEach((m, i) => {
      const v = verdicts[i];
      if (v && (v.cls === "mistake" || v.cls === "blunder")) addMistake({ fen: m.before, played: m.san, best: v.bestSan, bestUci: evals.get(m.before)?.best ?? "", source: "Análise de partida" });
    });
    setSaved(true);
  };

  const phaseErrors = (from: number, to: number) => hist.filter((_m, i) => i >= from && i < to && verdicts[i] && ["mistake", "blunder"].includes(verdicts[i]!.cls)).length;
  const sugg: { t: string; go: () => void }[] = [];
  if (complete) {
    const blunders = (W.counts.blunder ?? 0) + (B.counts.blunder ?? 0);
    if (blunders > 0) sugg.push({ t: `Treinar tática: houve ${blunders} grande(s) erro(s) — pratique garfos, cravadas e mates.`, go: () => go("training", { tab: "tatica" }) });
    if (phaseErrors(0, 20) > 0) sugg.push({ t: "Erros na abertura: revise suas linhas no Laboratório / repetição espaçada.", go: () => go("training", { tab: "aberturas" }) });
    if (phaseErrors(20, 60) > 1) sugg.push({ t: "Erros no meio-jogo: pratique treino estratégico (centro, casas fracas, segurança do rei).", go: () => go("training", { tab: "estrategia" }) });
    if (phaseErrors(60, 300) > 0) sugg.push({ t: "Erros no final: estude os finais básicos.", go: () => go("training", { tab: "finais" }) });
    if (!sugg.length) sugg.push({ t: "Partida muito limpa! Aumente o nível da IA para continuar evoluindo.", go: () => go("play") });
  }

  const Row = ({ color, s }: { color: "w" | "b"; s: ReturnType<typeof sideStats> }) => (
    <div className="rounded-xl bg-black/25 p-3">
      <div className="flex justify-between items-baseline"><b>{color === "w" ? "♔ Brancas" : "♚ Pretas"}</b><span className="text-2xl font-black text-emerald-300">{s.accuracy.toFixed(1)}%</span></div>
      <div className="text-[11px] text-zinc-500 mb-2">Precisão</div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs">
        {ORDER.map((c) => <div key={c} className="flex items-center gap-1"><span style={{ color: CLASS_INFO[c].color }} className="font-bold w-5">{CLASS_INFO[c].sym}</span><span className="text-zinc-400 truncate">{CLASS_INFO[c].label}</span><b className="ml-auto">{s.counts[c] ?? 0}</b></div>)}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="📊 Análise de Partidas e Estudo Livre" subtitle="Cole um PGN, uma lista de lances ou uma posição (FEN), carregue uma partida salva ou jogue lances livres com o Stockfish ao vivo." />
      {!loaded && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Card title="Importar partida">
            <textarea className={inputCls + " h-36 font-mono"} placeholder="Cole o PGN, os lances (1. e4 e5 2. Nf3…) ou um FEN" value={text} onChange={(e) => setText(e.target.value)} />
            {err && <p className="text-sm text-rose-400 mt-1">{err}</p>}
            <div className="flex gap-2 mt-2"><Btn variant="primary" onClick={() => load(text)}>🔍 Analisar</Btn><Btn onClick={() => load(text, false, "Estudo livre")}>Só carregar</Btn><Btn onClick={() => { g.reset(START_FEN); setLoaded(true); setLive(true); }}>🔬 Estudo livre (tabuleiro novo)</Btn></div>
          </Card>
          <Card title="Partidas salvas">
            {data.games.length === 0 ? <p className="text-sm text-zinc-500">Jogue contra a IA para ter partidas aqui.</p> : <div className="max-h-52 overflow-y-auto space-y-1">{data.games.slice(0, 30).map((s) => <button key={s.id} className="w-full text-left text-sm rounded-lg px-3 py-2 hover:bg-white/10 flex justify-between" onClick={() => load(toPgn(s.startFen, s.sans, { White: s.playerColor === "w" ? "Você" : "Stockfish", Black: s.playerColor === "b" ? "Você" : "Stockfish" }, s.result))}><span>{s.mode} · {s.sans.length} lances</span><span className="text-zinc-500">{s.result} · {new Date(s.date).toLocaleDateString("pt-BR")}</span></button>)}</div>}
          </Card>
        </div>
      )}
      {loaded && (
        <div className="grid xl:grid-cols-[minmax(0,auto)_minmax(340px,460px)] gap-5 items-start justify-center">
          <div className="flex gap-2 justify-center" style={{ width: "min(100%, calc(100vh - 150px))", minWidth: 280 }}>
            <EvalBar score={curEval?.score ?? null} orientation={orientation} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 text-sm"><b>{title}</b>{exploring && <Chip color="#f59e0b">Variante — exploração livre</Chip>}</div>
              <Board fen={viewFen} orientation={orientation} movable="both" lastMove={exploring ? ex.lastMove : g.lastMove} anim={null} onMove={onMove} badge={!exploring && viewMove && classes[g.viewPly] ? { square: viewMove.to, cls: classes[g.viewPly] } : null} arrows={!exploring && curEval?.best && !live ? [{ from: curEval.best.slice(0, 2), to: curEval.best.slice(2, 4) }] : []} />
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {exploring ? (
                  <>
                    <Btn onClick={() => setExploring(false)}>⟵ Voltar à partida</Btn>
                    <Btn onClick={() => ex.undo(1)} disabled={ex.history.length === 0}>↩ Desfazer</Btn>
                  </>
                ) : (
                  <>
                    <NavButtons ply={g.viewPly} max={hist.length} onSet={(p) => g.setView(p)} />
                    <Btn onClick={() => g.undo(1)} disabled={hist.length === 0} className="!px-2">↩</Btn>
                  </>
                )}
                <Btn onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>🔄</Btn>
                <Btn onClick={() => { setLoaded(false); setReport(false); runId.current++; setProgress(null); }}>📂 Outra partida</Btn>
              </div>
            </div>
          </div>
          <div className="space-y-3 w-full">
            {progress !== null && <Card title="Analisando com Stockfish…"><ProgressBar value={progress} /><p className="text-xs text-zinc-500 mt-1">{Math.round(progress)}% — profundidade {settings.analysisDepth}</p></Card>}
            <Card>
              <div className="h-36 overflow-hidden"><MoveList history={hist} viewPly={exploring ? -1 : g.viewPly} classes={classes} onSelect={(p) => { setExploring(false); g.setView(p); }} /></div>
              {!exploring && report && <div className="mt-3"><EvalGraph values={evalSeries} current={g.viewPly} onSelect={(i) => g.setView(i)} /></div>}
            </Card>
            <Card title="Posição atual">
              {viewMove && verdict ? (
                <div className="mb-2 text-sm">
                  <div className="flex items-center gap-2"><b className="font-mono">{viewMove.san}</b><Chip color={CLASS_INFO[verdict.cls].color}>{CLASS_INFO[verdict.cls].sym} {CLASS_INFO[verdict.cls].label}</Chip>{bookLookup(viewMove.after) && <span className="text-[11px] text-amber-400">{bookLookup(viewMove.after)!.name}</span>}</div>
                  <p className="text-zinc-300 mt-1">{explainMove(viewMove.before, viewMove, { cls: verdict.cls, bestSan: verdict.bestSan, before: verdict.before, after: verdict.after })}</p>
                </div>
              ) : null}
              <label className="flex items-center gap-2 text-xs cursor-pointer mb-2"><input type="checkbox" className="accent-emerald-400" checked={live} onChange={(e) => setLive(e.target.checked)} /> Variantes do Stockfish ao vivo (3 linhas)</label>
              {live ? <EngineLines fen={viewFen} multipv={3} onPlay={(u) => { const p = uciParts(u); onMove(p.from, p.to, p.promotion); }} /> : curEval ? <p className="text-xs text-zinc-400">Melhor lance do motor: <b>{curEval.pv.length ? new Chess(viewFen).move(uciParts(curEval.best)).san : "—"}</b> (profundidade {curEval.depth})</p> : <p className="text-xs text-zinc-500">Sem avaliação para esta posição.</p>}
            </Card>
            {complete && (
              <>
                <Card title="Relatório da partida"><div className="grid sm:grid-cols-2 gap-2"><Row color="w" s={W} /><Row color="b" s={B} /></div></Card>
                <Card title="Momentos decisivos">
                  {moments.length === 0 ? <p className="text-sm text-zinc-500">Nenhum erro grave — partida equilibrada!</p> : moments.map((x) => (
                    <button key={x.i} onClick={() => { setExploring(false); g.setView(x.i + 1); }} className="w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 text-sm">
                      <span className="text-zinc-500 w-10">{Math.ceil((x.i + 1) / 2)}{x.i % 2 ? "…" : "."}</span><b className="font-mono">{x.m.san}</b>
                      <Chip color={CLASS_INFO[x.v!.cls].color}>{CLASS_INFO[x.v!.cls].label}</Chip><span className="text-xs text-zinc-500 ml-auto">melhor: {x.v!.bestSan}</span>
                    </button>
                  ))}
                </Card>
                <Card title="Comparação com o Stockfish">
                  <div className="max-h-48 overflow-y-auto text-xs font-mono divide-y divide-white/5">
                    {hist.map((m, i) => verdicts[i] && (
                      <button key={i} onClick={() => { setExploring(false); g.setView(i + 1); }} className="w-full flex gap-2 py-1 hover:bg-white/5">
                        <span className="w-10 text-zinc-500">{Math.ceil((i + 1) / 2)}{i % 2 ? "…" : "."}</span><span className="w-16 text-left">{m.san}</span>
                        <span className="text-zinc-500">motor:</span><span className="w-16 text-left text-emerald-300">{verdicts[i]!.bestSan || "—"}</span><span className="ml-auto" style={{ color: CLASS_INFO[verdicts[i]!.cls].color }}>{CLASS_INFO[verdicts[i]!.cls].label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
                <Card title="Sugestões de treinamento">
                  {sugg.map((s) => <button key={s.t} onClick={s.go} className="block w-full text-left text-sm rounded-lg px-3 py-2 hover:bg-white/10 mb-1">→ {s.t}</button>)}
                  <Btn className="mt-2" onClick={saveMistakes} disabled={saved}>{saved ? "✔ Erros salvos para revisão" : "💾 Salvar meus erros para revisão"}</Btn>
                </Card>
              </>
            )}
            {!report && progress === null && hist.length > 0 && <Btn variant="primary" onClick={() => analyze(g.startFen, hist.map((m) => m.san))}>🔍 Gerar relatório completo</Btn>}
          </div>
        </div>
      )}
      <input type="hidden" value={current.fen} readOnly />
    </div>
  );
}
