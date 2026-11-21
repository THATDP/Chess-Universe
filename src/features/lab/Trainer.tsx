import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChessGame } from "../../core/chess/useChessGame";
import { tryMove, uciToSan, formatLine, START_FEN } from "../../core/chess/rules";
import type { Color } from "../../core/chess/rules";
import { Board } from "../../ui/Board";
import { Btn, Card, Pill, Toggle } from "../../ui/common";
import { EvalBar, MoveList, NavControls, PlayerBar, capturedFromFen } from "../../ui/GameWidgets";
import { EnginePanel } from "../../ui/EnginePanel";
import { GameLayout } from "../../ui/GameLayout";
import { audio } from "../../core/audio/audio";
import { useSettings } from "../../core/settings/settings";
import { getLevel, levelBadge } from "../../core/engine/levels";
import { getEngine } from "../../core/engine/stockfish";
import type { EngineLine } from "../../core/engine/stockfish";
import { useEngineMove } from "../../core/engine/useEngineMove";
import { load, save, updateStats } from "../../core/storage/db";
import type { LabProgress } from "../../core/storage/db";
import { identifyOpening, nodesAtFen, getTheory } from "../../data/theory";
import { useNav } from "../../core/nav";
import type { TrainConfig } from "./lineUtils";

type Status = "theory" | "done" | "deviated" | "free";

function bump(key: string, field: "attempts" | "completed" | "deviations") {
  const p = load<LabProgress>("labProgress", {});
  const cur = p[key] ?? { attempts: 0, completed: 0, deviations: 0, last: 0 };
  p[key] = { ...cur, [field]: cur[field] + 1, last: Date.now() };
  save("labProgress", p);
}

export function Trainer({ cfg, onExit }: { cfg: TrainConfig; onExit: () => void }) {
  const { settings } = useSettings();
  const { go } = useNav();
  const game = useChessGame(cfg.startFen, cfg.line.slice(0, cfg.startPly));
  const [free, setFree] = useState(false);
  const [errors, setErrors] = useState(0);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "warn" | "bad" } | null>(null);
  const [arrow, setArrow] = useState<{ from: string; to: string; color: string }[]>([]);
  const [engineOn, setEngineOn] = useState(false);
  const [topLine, setTopLine] = useState<EngineLine | null>(null);
  const [orientation] = useState<Color>(cfg.userColor);
  const [badge, setBadge] = useState<{ square: string; text: string; color: string } | null>(null);
  const deviatedRec = useRef(false);
  const doneRec = useRef(false);
  const lv = getLevel(cfg.level);
  const engineColor: Color = cfg.userColor === "w" ? "b" : "w";

  useEffect(() => {
    bump(cfg.progressKey, "attempts");
    updateStats((s) => ({ ...s, labSessions: s.labSessions + 1 }));
    audio.play("start");
    return () => getEngine("play").stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefix = useMemo(() => {
    let k = 0;
    while (k < game.moves.length && k < cfg.line.length && game.moves[k].uci === cfg.line[k].uci) k++;
    return k;
  }, [game.moves, cfg.line]);

  const inTheory = !free && prefix === game.moves.length && game.moves.length <= cfg.line.length;
  const status: Status = free ? "free" : inTheory ? (game.moves.length === cfg.line.length ? "done" : "theory") : "deviated";
  const expected = status === "theory" ? cfg.line[game.moves.length] : null;

  // registra desvio / conclusão uma única vez
  useEffect(() => {
    if (status === "deviated" && !deviatedRec.current) {
      deviatedRec.current = true;
      bump(cfg.progressKey, "deviations");
    }
    if (status === "done" && !doneRec.current && game.moves.length > cfg.startPly) {
      doneRec.current = true;
      bump(cfg.progressKey, "completed");
      updateStats((s) => ({ ...s, labMovesInTheory: s.labMovesInTheory + cfg.line.length }));
      audio.play("success");
      setMsg({ text: "Teoria concluída sem desvios! Agora continue livremente contra o Stockfish.", tone: "ok" });
    }
  }, [status, cfg, game.moves.length]);

  const onEngineMove = useCallback(
    (uci: string, fromTheory: boolean) => {
      const rec = game.playUci(uci);
      if (rec) {
        audio.playMove(rec, rec.san.endsWith("#"));
        setArrow([]);
        setBadge(null);
        if (fromTheory) setMsg(null);
      }
    },
    [game]
  );

  const { thinking } = useEngineMove({
    fen: game.fen,
    engineColor,
    turn: game.turn,
    over: game.outcome.over,
    atEnd: game.atEnd,
    active: true,
    level: cfg.level,
    thinkMs: settings.thinkMs,
    respond: () => (status === "theory" && game.turn === engineColor && expected ? expected.uci : null),
    onMove: onEngineMove,
  });

  const onUserMove = (from: string, to: string, promo?: string) => {
    if (game.outcome.over || !game.atEnd || game.turn !== cfg.userColor) return;
    const probe = tryMove(game.fen, from, to, promo);
    if (!probe) return;
    if (status === "theory" && expected && probe.uci !== expected.uci) {
      if (cfg.strict) {
        setErrors((e) => e + 1);
        audio.play("error");
        setBadge({ square: to, text: "✗", color: "#ef4444" });
        setMsg({ text: `Não é o lance da teoria. Tente novamente (use “Dica de teoria” se precisar).`, tone: "bad" });
        setTimeout(() => setBadge(null), 1200);
        return;
      }
      setMsg({
        text: `Você saiu da teoria. O lance esperado era ${uciToSan(game.fen, expected.uci)}. Stockfish assume a partir daqui — use “Voltar à teoria” para retomar.`,
        tone: "warn",
      });
    } else if (status === "theory") {
      setBadge({ square: to, text: "✓", color: "#22c55e" });
      setTimeout(() => setBadge(null), 900);
      setMsg(null);
    }
    const rec = game.makeMove(from, to, promo);
    if (rec) {
      audio.playMove(rec, rec.san.endsWith("#"));
      setArrow([]);
    }
  };

  const theoryHint = () => {
    if (!expected) {
      setMsg({ text: "Não há lance de teoria para esta posição.", tone: "warn" });
      return;
    }
    setArrow([{ from: expected.from, to: expected.to, color: "rgba(34,197,94,0.9)" }]);
    setMsg({ text: `Lance da teoria: ${expected.san}`, tone: "ok" });
  };

  const sfHint = async () => {
    const r = await getEngine("aux").search(game.fen, { movetime: 900 });
    if (r.best) {
      setArrow([{ from: r.best.slice(0, 2), to: r.best.slice(2, 4), color: "rgba(250,204,21,0.9)" }]);
      setMsg({ text: `Melhor lance segundo o Stockfish: ${uciToSan(game.fen, r.best)}`, tone: "warn" });
    }
  };

  const backToTheory = () => {
    const k = Math.max(cfg.startPly, prefix);
    setFree(false);
    game.takeback(Math.max(0, game.moves.length - k));
    setMsg({ text: "Posição retomada na última casa da teoria.", tone: "ok" });
    setArrow([]);
    audio.play("click");
  };

  const restart = () => {
    game.reset(cfg.startFen, cfg.line.slice(0, cfg.startPly));
    setFree(false);
    setErrors(0);
    setMsg(null);
    setArrow([]);
    deviatedRec.current = false;
    doneRec.current = false;
    bump(cfg.progressKey, "attempts");
    audio.play("start");
  };

  const cap = capturedFromFen(game.fen);
  const opening = identifyOpening(game.fens.slice(0, game.cursor + 1));
  const here = nodesAtFen(game.fen).find((nd) => !cfg.theoryId || nd.theoryId === cfg.theoryId) ?? nodesAtFen(game.fen)[0];
  const theory = cfg.theoryId ? getTheory(cfg.theoryId) : undefined;
  const nextBook = useMemo(() => {
    const out: { san: string; title: string }[] = [];
    nodesAtFen(game.fen).forEach((nd) => {
      if (cfg.theoryId && nd.theoryId !== cfg.theoryId) return;
      nd.children.forEach((cid) => {
        const c = getNodeSafe(cid);
        if (c) out.push({ san: c.moves[0], title: c.title });
      });
    });
    return out;
  }, [game.fen, cfg.theoryId]);

  const tone = { ok: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30", warn: "bg-amber-500/15 text-amber-200 border-amber-500/30", bad: "bg-red-500/15 text-red-200 border-red-500/30" };
  const statusPill =
    status === "theory" ? <Pill color="green">● Na teoria</Pill> : status === "done" ? <Pill color="blue">✓ Teoria concluída</Pill> : status === "deviated" ? <Pill color="amber">Fora da teoria</Pill> : <Pill color="violet">Jogo livre</Pill>;
  const opp = cfg.userColor === "w" ? "b" : "w";

  return (
    <div className="page-enter">
      <GameLayout
        evalBar={engineOn && topLine ? <EvalBar cp={topLine.cp} mate={topLine.mate} orientation={orientation} /> : undefined}
        top={
          <PlayerBar name={`Stockfish · ${lv.name}`} sub={thinking ? "pensando…" : status === "theory" ? "segue a teoria" : levelBadge(lv)} color={opp} active={game.turn === opp && !game.outcome.over} captured={opp === "w" ? cap.byWhite : cap.byBlack} advantage={opp === "w" ? Math.max(0, cap.diff) : Math.max(0, -cap.diff)} />
        }
        bottom={
          <PlayerBar name={settings.playerName || "Você"} sub={cfg.title} color={cfg.userColor} active={game.turn === cfg.userColor && !game.outcome.over} captured={cfg.userColor === "w" ? cap.byWhite : cap.byBlack} advantage={cfg.userColor === "w" ? Math.max(0, cap.diff) : Math.max(0, -cap.diff)} />
        }
        board={<Board fen={game.fen} orientation={orientation} movable={game.atEnd && !game.outcome.over ? cfg.userColor : null} lastMove={game.lastMove} arrows={arrow} onMove={onUserMove} badge={badge} />}
        side={
          <>
            <Card title="Treinamento" right={statusPill}>
              <div className="mb-1 text-sm font-bold text-ink">{cfg.title}</div>
              {opening && <div className="mb-2 text-xs text-mute">❏ {opening.name}</div>}
              {msg && <div className={`mb-2 rounded-md border px-3 py-2 text-sm ${tone[msg.tone]}`}>{msg.text}</div>}
              {game.outcome.over && <div className="mb-2 rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-ink">Partida terminada: {game.outcome.result}</div>}
              {status === "theory" && !cfg.strict && expected && game.turn === cfg.userColor && <div className="mb-2 text-xs text-mute">Sua vez: encontre o lance da teoria — ou desvie para testar outra continuação.</div>}
              {here?.note && (
                <div className="rounded-md bg-panel2 p-2.5 text-xs leading-relaxed text-mute">
                  <b className="text-ink">{here.title}.</b> {here.note}
                </div>
              )}
              {errors > 0 && <div className="mt-2 text-xs text-red-300">Erros no modo teste: {errors}</div>}
            </Card>
            <Card title="Ferramentas">
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={theoryHint} disabled={!expected}>❏ Dica de teoria</Btn>
                <Btn onClick={sfHint}>♞ Melhor (Stockfish)</Btn>
                <Btn onClick={backToTheory} disabled={status === "theory" || status === "done"} variant="soft">↶ Voltar à teoria</Btn>
                <Btn onClick={() => { setFree(true); setMsg({ text: "Teoria interrompida: jogo livre contra o Stockfish.", tone: "warn" }); }} disabled={free}>■ Jogar livre</Btn>
                <Btn onClick={() => game.takeback(Math.min(game.turn === cfg.userColor ? 2 : 1, game.moves.length))} disabled={game.moves.length === 0}>↩ Desfazer</Btn>
                <Btn onClick={restart}>⟲ Reiniciar</Btn>
              </div>
              <div className="mt-3 flex gap-2">
                <Btn size="sm" onClick={() => go("analysis", { game: { startFen: game.startFen, moves: game.moves, userColor: cfg.userColor } })} disabled={game.moves.length < 2}>◎ Analisar</Btn>
                <Btn size="sm" variant="ghost" onClick={onExit}>← Biblioteca</Btn>
              </div>
            </Card>
            {nextBook.length > 0 && (
              <Card title="Teoria nesta posição">
                <div className="flex flex-wrap gap-1.5">
                  {nextBook.map((b, i) => (
                    <span key={i} className="rounded-md bg-panel2 px-2 py-1 text-xs text-ink" title={b.title}>
                      <span className="font-mono font-bold">{b.san}</span> <span className="text-mute">{b.title.length > 28 ? b.title.slice(0, 28) + "…" : b.title}</span>
                    </span>
                  ))}
                </div>
              </Card>
            )}
            <Card title="Lances">
              <MoveList moves={game.moves} cursor={game.cursor} onSelect={(i) => { game.goTo(i); setArrow([]); }} startFen={game.startFen} className="h-40" />
              <NavControls cursor={game.cursor} total={game.moves.length} onGo={game.goTo} className="mt-2" />
              <p className="mt-2 text-[11px] text-mute">Clique em qualquer lance para voltar àquela posição e seguir por outro caminho.</p>
            </Card>
            <Card>
              <Toggle checked={engineOn} onChange={setEngineOn} label="Análise Stockfish ao vivo" hint="Melhores continuações e avaliação da posição atual" />
              {engineOn && <div className="mt-2"><EnginePanel fen={game.fen} enabled onLines={(l) => setTopLine(l[0] ?? null)} multipv={2} maxDepth={20} /></div>}
            </Card>
            {theory && (
              <Card title="Ideias principais">
                <ul className="list-disc space-y-1 pl-4 text-xs text-mute">{theory.ideas.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </Card>
            )}
          </>
        }
      />
      <span className="hidden">{formatLine(START_FEN, [])}</span>
    </div>
  );
}

import { getNode } from "../../data/theory";
function getNodeSafe(id: string) {
  return getNode(id);
}
