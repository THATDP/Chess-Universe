import { useEffect, useMemo, useRef, useState } from "react";
import { useChessGame } from "../core/chess/useChessGame";
import { START_FEN, buildPgn, checkFen, parsePgn, uciLineToSan, formatLine, turnOf } from "../core/chess/rules";
import type { MoveRec } from "../core/chess/rules";
import { Board } from "../ui/Board";
import { Btn, Card, PageTitle, Pill, Segmented } from "../ui/common";
import { EvalBar, EvalGraph, MoveList, NavControls } from "../ui/GameWidgets";
import { EnginePanel } from "../ui/EnginePanel";
import { GameLayout } from "../ui/GameLayout";
import { audio } from "../core/audio/audio";
import { useSettings } from "../core/settings/settings";
import { analyzeGame, CLASS_INFO } from "../core/analysis/analyzeGame";
import type { GameAnalysis, MoveClass, PlyEval } from "../core/analysis/analyzeGame";
import { formatEval, getEngine } from "../core/engine/stockfish";
import type { EngineLine } from "../core/engine/stockfish";
import { getGames, updateGame, updateStats } from "../core/storage/db";
import type { SavedGame } from "../core/storage/db";
import { useNav } from "../core/nav";
import type { Page } from "../core/nav";
import { identifyOpening } from "../data/theory";
import { cn } from "../utils/cn";

const ORDER: MoveClass[] = ["brilliant", "best", "excellent", "good", "inaccuracy", "mistake", "blunder"];

export default function Analysis() {
  const { params, go } = useNav();
  const { settings } = useSettings();
  const game = useChessGame();
  const variation = useChessGame();
  const [inVar, setInVar] = useState(false);
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [gameId, setGameId] = useState<string | undefined>();
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [partial, setPartial] = useState<PlyEval[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [speed, setSpeed] = useState<number>(settings.analysisMs);
  const cancel = useRef({ cancelled: false });
  const [live, setLive] = useState(true);
  const [topLine, setTopLine] = useState<EngineLine | null>(null);
  const [pgnText, setPgnText] = useState("");
  const [fenText, setFenText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedGame[]>(() => getGames());
  const [perspective, setPerspective] = useState<"w" | "b">("w");
  const [boardFlip, setBoardFlip] = useState<"w" | "b">("w");

  const loadGame = (startFen: string, moves: MoveRec[], hdr: Record<string, string> = {}, id?: string, userColor?: "w" | "b") => {
    cancel.current.cancelled = true;
    game.reset(startFen, moves, 0);
    setInVar(false);
    setHeaders(hdr);
    setGameId(id);
    setAnalysis(null);
    setPartial([]);
    setProgress(null);
    setErr(null);
    setBoardFlip(userColor ?? "w");
    setPerspective(userColor ?? "w");
  };

  useEffect(() => {
    if (params.game) loadGame(params.game.startFen, params.game.moves, params.game.headers, params.game.id, params.game.userColor);
    return () => {
      cancel.current.cancelled = true;
      getEngine("aux").stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPgn = () => {
    try {
      const p = parsePgn(pgnText);
      if (p.moves.length === 0) throw new Error("A partida não tem lances.");
      loadGame(p.startFen, p.moves, p.headers);
      audio.play("success");
    } catch (e) {
      setErr("PGN inválido: " + (e as Error).message.slice(0, 140));
      audio.play("error");
    }
  };
  const loadFen = () => {
    const v = checkFen(fenText.trim());
    if (!v.ok) {
      setErr("FEN inválida: " + v.error);
      audio.play("error");
      return;
    }
    loadGame(fenText.trim(), [], {});
    audio.play("success");
  };

  const runAnalysis = async () => {
    if (game.moves.length === 0) return;
    cancel.current = { cancelled: false };
    const token = cancel.current;
    setAnalysis(null);
    setPartial([]);
    setProgress({ done: 0, total: game.moves.length + 1 });
    const res = await analyzeGame(game.startFen, game.moves, {
      movetime: speed,
      signal: token,
      onProgress: (done, total, evals) => {
        if (token.cancelled) return;
        setProgress({ done, total });
        setPartial([...evals]);
      },
    });
    if (!res || token.cancelled) {
      setProgress(null);
      return;
    }
    setAnalysis(res);
    setProgress(null);
    audio.play("notify");
    updateStats((s) => ({ ...s, analyses: s.analyses + 1 }));
    if (gameId) {
      updateGame(gameId, { accuracy: res.accuracy });
      setSaved(getGames());
    }
  };

  /* ---- posição exibida (linha principal ou variante) ---- */
  const fen = inVar ? variation.fen : game.fen;
  const lastMove = inVar ? variation.lastMove : game.lastMove;

  const startVariation = (baseFen: string, ucis: string[]) => {
    variation.reset(baseFen, []);
    ucis.forEach((u) => variation.playUci(u));
    setInVar(true);
  };

  const onBoardMove = (f: string, t: string, p?: string) => {
    if (inVar) {
      const r = variation.makeMove(f, t, p);
      if (r) audio.playMove(r, r.san.endsWith("#"));
      return;
    }
    const next = game.moves[game.cursor];
    const uci = f + t + (p ?? "");
    if (next && next.uci === uci) {
      game.forward();
      audio.playMove(next, next.san.endsWith("#"));
      return;
    }
    variation.reset(game.fen, []);
    const r = variation.makeMove(f, t, p);
    if (r) {
      audio.playMove(r, r.san.endsWith("#"));
      setInVar(true);
    }
  };

  const onPlayLine = (ucis: string[]) => startVariation(fen, ucis);

  const goMain = (i: number) => {
    setInVar(false);
    game.goTo(i);
  };

  const cur = game.cursor;
  const info = analysis && cur > 0 ? analysis.moves[cur - 1] : null;
  const evalAt: PlyEval | undefined = (analysis?.evals ?? partial)[cur];
  const barCp = inVar || !evalAt ? topLine?.cp : evalAt.cp;
  const barMate = inVar || !evalAt ? topLine?.mate : evalAt.mate;
  const values = (analysis?.evals ?? partial).map((e) => e.value);
  const opening = useMemo(() => identifyOpening(game.fens.slice(0, cur + 1)), [game.fens, cur]);
  const marks = (i: number) => {
    const m = analysis?.moves[i];
    if (!m) return null;
    if (m.cls === "brilliant" || m.cls === "inaccuracy" || m.cls === "mistake" || m.cls === "blunder") return { text: CLASS_INFO[m.cls].symbol, color: CLASS_INFO[m.cls].color };
    return null;
  };
  const graphMarks = analysis
    ? analysis.moves
        .map((m, i) => ({ i: i + 1, cls: m.cls }))
        .filter((m) => m.cls === "blunder" || m.cls === "mistake" || m.cls === "brilliant")
        .map((m) => ({ i: m.i, color: CLASS_INFO[m.cls].color }))
    : undefined;

  const badge = !inVar && info && game.lastMove && (info.cls === "brilliant" || info.cls === "inaccuracy" || info.cls === "mistake" || info.cls === "blunder")
    ? { square: game.lastMove.to, text: CLASS_INFO[info.cls].symbol, color: CLASS_INFO[info.cls].color }
    : null;

  const showBest = () => {
    if (!info?.bestUci) return;
    const baseFen = game.fens[cur - 1];
    game.goTo(cur - 1);
    startVariation(baseFen, [info.bestUci]);
  };

  const loaded = game.moves.length > 0 || game.startFen !== START_FEN;
  const nm = (v: string | undefined, d: string) => (v && v !== "?" ? v : d);
  const names = { w: nm(headers.White, "Brancas"), b: nm(headers.Black, "Pretas") };
  const arrowsVar = inVar && variation.moves.length ? [] : [];
  const recs = analysis?.recommendations[perspective] ?? [];

  const goAction = (a: Page | "lab" | "puzzles" | "endgames" | "openings" | "play") => go(a as Page);

  return (
    <div className="page-enter">
      <PageTitle
        title="Análise de Partidas"
        subtitle="Carregue um PGN, uma partida do histórico ou um jogo recém-terminado. O Stockfish avalia cada lance e mostra precisão, erros e momentos decisivos."
        right={loaded ? <Pill color="blue">{game.moves.length} lances</Pill> : undefined}
      />
      <GameLayout
        evalBar={<EvalBar cp={barCp} mate={barMate} orientation={boardFlip} />}
        top={
          <div className="flex items-center justify-between rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <span className="font-semibold text-ink">{boardFlip === "w" ? names.b : names.w}</span>
            <span className="text-xs text-mute">{opening ? `❏ ${opening.name}` : headers.Event ?? ""}</span>
          </div>
        }
        bottom={
          <div className="flex items-center justify-between rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <span className="font-semibold text-ink">{boardFlip === "w" ? names.w : names.b}</span>
            <span className="text-xs text-mute">{headers.Result ?? ""}</span>
          </div>
        }
        board={
          <Board
            fen={fen}
            orientation={boardFlip}
            movable={game.outcome.over && !inVar ? null : "both"}
            lastMove={lastMove}
            arrows={arrowsVar}
            badge={badge}
            onMove={onBoardMove}
          />
        }
        side={
          <>
            <Card title="Partida" right={<Btn size="sm" onClick={() => setBoardFlip((o) => (o === "w" ? "b" : "w"))}>⇅ Virar</Btn>}>
              {inVar && (
                <div className="mb-2 flex items-center justify-between rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                  <span>Explorando variante: {variation.moves.map((m) => m.san).join(" ") || "—"}</span>
                  <button className="font-bold underline" onClick={() => setInVar(false)}>voltar à partida</button>
                </div>
              )}
              <MoveList moves={game.moves} cursor={cur} onSelect={goMain} startFen={game.startFen} marks={marks} className="h-44" />
              <NavControls cursor={cur} total={game.moves.length} onGo={goMain} className="mt-2" />
              {inVar && <NavControls cursor={variation.cursor} total={variation.moves.length} onGo={variation.goTo} className="mt-1" />}
              {info && !inVar && (
                <div className="mt-3 rounded-md p-3 text-sm" style={{ background: CLASS_INFO[info.cls].color + "22", border: `1px solid ${CLASS_INFO[info.cls].color}55` }}>
                  <div className="font-bold" style={{ color: CLASS_INFO[info.cls].color }}>
                    {game.moves[cur - 1].san} — {CLASS_INFO[info.cls].label} {CLASS_INFO[info.cls].symbol}
                  </div>
                  <div className="mt-1 text-xs text-ink/80">
                    Avaliação: {formatEval({ cp: analysis!.evals[cur].cp, mate: analysis!.evals[cur].mate })} · perda de chance: {info.loss.toFixed(1)}%
                    {info.cls !== "best" && info.cls !== "brilliant" && info.bestSan && (
                      <>
                        {" "}· Melhor: <b className="font-mono">{info.bestSan}</b>{" "}
                        <button className="underline" onClick={showBest}>mostrar</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Card>

            <Card title="Análise Stockfish">
              {progress ? (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-mute"><span>Analisando posições…</span><span>{progress.done}/{progress.total}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-panel2"><div className="h-full bg-accent transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
                  <Btn size="sm" variant="danger" className="mt-3" onClick={() => { cancel.current.cancelled = true; getEngine("aux").stop(); setProgress(null); }}>Cancelar</Btn>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-[11px] text-mute">Tempo por posição</div>
                    <Segmented value={speed} onChange={setSpeed} options={[{ value: 150, label: "Rápida" }, { value: 300, label: "Normal" }, { value: 800, label: "Profunda" }, { value: 2000, label: "Máxima" }]} />
                  </div>
                  <Btn variant="primary" className="w-full" disabled={game.moves.length === 0} onClick={runAnalysis}>
                    ◎ {analysis ? "Reanalisar partida" : "Analisar partida completa"}
                  </Btn>
                  {game.moves.length === 0 && <p className="text-xs text-mute">Carregue uma partida com lances para análise completa. Você ainda pode usar o motor ao vivo em qualquer posição.</p>}
                </div>
              )}
              {values.length > 1 && (
                <div className="mt-4">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-mute">Gráfico de avaliação</div>
                  <EvalGraph values={values} cursor={Math.min(cur, values.length - 1)} onSelect={goMain} marks={graphMarks} />
                </div>
              )}
            </Card>

            {analysis && (
              <>
                <Card title="Resumo da partida">
                  <div className="grid grid-cols-2 gap-3">
                    {(["w", "b"] as const).map((c) => (
                      <div key={c} className="rounded-lg bg-panel2 p-3 text-center">
                        <div className="text-[11px] text-mute">{names[c]}</div>
                        <div className="text-3xl font-black text-ink">{analysis.accuracy[c].toFixed(1)}<span className="text-sm text-mute">%</span></div>
                        <div className="text-[11px] text-mute">precisão · perda média {analysis.acpl[c]} cp</div>
                      </div>
                    ))}
                  </div>
                  <table className="mt-3 w-full text-xs">
                    <tbody>
                      {ORDER.map((k) => (
                        <tr key={k} className="border-t border-line/60">
                          <td className="py-1.5 pr-2 text-right font-mono text-ink">{analysis.counts.w[k]}</td>
                          <td className="py-1.5 text-center">
                            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: CLASS_INFO[k].color }}>
                              <span className="h-2 w-2 rounded-full" style={{ background: CLASS_INFO[k].color }} />
                              {CLASS_INFO[k].label} <span className="opacity-70">{CLASS_INFO[k].symbol}</span>
                            </span>
                          </td>
                          <td className="py-1.5 pl-2 text-left font-mono text-ink">{analysis.counts.b[k]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[11px] text-mute">Avaliado com Stockfish a {analysis.movetime} ms por posição. Classificação baseada na perda de chance de vitória; lances brilhantes exigem sacrifício de material que mantém a posição.</p>
                </Card>
                <Card title="Momentos decisivos">
                  {analysis.moments.length === 0 && <p className="text-xs text-mute">Partida estável, sem grandes viradas.</p>}
                  <div className="space-y-1.5">
                    {analysis.moments.map((m) => {
                      const mv = game.moves[m.ply];
                      const san = formatLine(game.fens[m.ply], [mv.san]);
                      return (
                        <button key={m.ply} onClick={() => goMain(m.ply + 1)} className="flex w-full items-center justify-between rounded-md bg-panel2 px-3 py-2 text-left text-sm hover:bg-line">
                          <span><span className="font-mono font-bold text-ink">{san}</span> <span className="text-xs text-mute">({m.color === "w" ? names.w : names.b})</span></span>
                          <span className="text-xs font-bold" style={{ color: CLASS_INFO[m.cls].color }}>{CLASS_INFO[m.cls].label} · {m.swing.toFixed(0)}%</span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
                <Card
                  title="Recomendações de treino"
                  right={<Segmented value={perspective} onChange={setPerspective} options={[{ value: "w", label: "Brancas" }, { value: "b", label: "Pretas" }]} />}
                >
                  <div className="space-y-2">
                    {recs.map((r, i) => (
                      <div key={i} className="rounded-md bg-panel2 p-3">
                        <div className="text-sm font-bold text-ink">{r.title}</div>
                        <p className="mt-1 text-xs leading-relaxed text-mute">{r.text}</p>
                        <Btn size="sm" variant="soft" className="mt-2" onClick={() => goAction(r.action)}>
                          {r.action === "puzzles" ? "Ir para desafios táticos" : r.action === "endgames" ? "Treinar finais" : r.action === "openings" ? "Estudar aberturas" : r.action === "lab" ? "Laboratório" : "Jogar"}
                        </Btn>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            <Card>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-mute">Motor ao vivo</span>
              </div>
              <EnginePanel fen={fen} enabled={live} onToggle={setLive} multipv={3} maxDepth={22} onLines={(l) => setTopLine(l[0] ?? null)} onPlayLine={onPlayLine} title="Melhores linhas" />
              <p className="mt-2 text-[11px] text-mute">Clique em um lance de qualquer linha para vê-lo no tabuleiro como variante. Você também pode mover as peças livremente.</p>
            </Card>

            <Card title="Importar / exportar">
              <textarea rows={4} className="font-mono text-xs" placeholder="Cole aqui um PGN…" value={pgnText} onChange={(e) => setPgnText(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <Btn size="sm" variant="primary" onClick={loadPgn} disabled={!pgnText.trim()}>Carregar PGN</Btn>
                <Btn size="sm" onClick={() => { void navigator.clipboard?.writeText(buildPgn(game.startFen, game.moves, headers)); }} disabled={game.moves.length === 0}>Copiar PGN atual</Btn>
              </div>
              <input type="text" className="mt-3 font-mono text-xs" placeholder="Ou cole uma FEN…" value={fenText} onChange={(e) => setFenText(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <Btn size="sm" onClick={loadFen} disabled={!fenText.trim()}>Carregar FEN</Btn>
                <Btn size="sm" onClick={() => void navigator.clipboard?.writeText(fen)}>Copiar FEN da posição</Btn>
              </div>
              {err && <p className="mt-2 rounded-md bg-red-500/15 p-2 text-xs text-red-300">{err}</p>}
            </Card>

            <Card title={`Histórico (${saved.length})`}>
              {saved.length === 0 && <p className="text-xs text-mute">Suas partidas aparecerão aqui automaticamente.</p>}
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {saved.slice(0, 40).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      try {
                        const p = parsePgn(g.pgn);
                        loadGame(p.startFen, p.moves, p.headers, g.id, g.userColor);
                      } catch {
                        setErr("Não foi possível abrir esta partida.");
                      }
                    }}
                    className={cn("flex w-full items-center justify-between rounded-md bg-panel2 px-3 py-2 text-left text-xs hover:bg-line", gameId === g.id && "ring-1 ring-accent")}
                  >
                    <span className="min-w-0 truncate text-ink">{g.white} × {g.black}</span>
                    <span className="ml-2 shrink-0 text-mute">{g.result} {g.accuracy ? `· ${g.accuracy.w.toFixed(0)}/${g.accuracy.b.toFixed(0)}%` : ""}</span>
                  </button>
                ))}
              </div>
            </Card>
          </>
        }
      />
    </div>
  );
}

export { uciLineToSan, turnOf };
