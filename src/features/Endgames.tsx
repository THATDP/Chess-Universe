import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENDGAMES } from "../data/endgames";
import type { Endgame } from "../data/endgames";
import { useChessGame } from "../core/chess/useChessGame";
import { uciToSan } from "../core/chess/rules";
import type { Color } from "../core/chess/rules";
import { Board } from "../ui/Board";
import { Btn, Card, PageTitle, Pill } from "../ui/common";
import { MoveList, NavControls } from "../ui/GameWidgets";
import { GameLayout } from "../ui/GameLayout";
import { audio } from "../core/audio/audio";
import { getEngine } from "../core/engine/stockfish";
import { useEngineMove } from "../core/engine/useEngineMove";
import { load, save } from "../core/storage/db";
import type { EndgameProgress } from "../core/storage/db";
import { useNav } from "../core/nav";
import { cn } from "../utils/cn";

export default function Endgames() {
  const [sel, setSel] = useState<Endgame | null>(null);
  const [prog, setProg] = useState<EndgameProgress>(() => load("endgameProgress", {}));
  const cats = Array.from(new Set(ENDGAMES.map((e) => e.category)));

  if (sel) {
    return (
      <Drill
        key={sel.id}
        eg={sel}
        onExit={() => {
          setSel(null);
          setProg(load("endgameProgress", {}));
        }}
      />
    );
  }
  return (
    <div className="page-enter">
      <PageTitle title="Treinamento de Finais" subtitle="Posições clássicas verificadas pelo Stockfish. A IA defende com força máxima — cumpra o objetivo dentro do limite de lances." />
      {cats.map((c) => (
        <div key={c} className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-mute">{c}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ENDGAMES.filter((e) => e.category === c).map((e) => {
              const p = prog[e.id];
              return (
                <button key={e.id} onClick={() => { audio.play("click"); setSel(e); }} className="rounded-xl border border-line bg-panel p-4 text-left transition hover:border-accent">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="font-bold text-ink">{e.name}</div>
                    {p?.success ? <Pill color="green">✓ {p.success}</Pill> : null}
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <Pill color={e.goal === "win" ? "amber" : "blue"}>{e.goal === "win" ? "Vencer" : "Empatar"}</Pill>
                    <Pill>{e.side === "w" ? "Brancas" : "Pretas"}</Pill>
                    <Pill>{"●".repeat(e.level)}{"○".repeat(3 - e.level)}</Pill>
                  </div>
                  <p className="text-xs leading-relaxed text-mute">{e.idea}</p>
                  {p && <div className="mt-2 text-[11px] text-mute">{p.attempts} tentativa(s)</div>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Drill({ eg, onExit }: { eg: Endgame; onExit: () => void }) {
  const game = useChessGame(eg.fen);
  const { go } = useNav();
  const [result, setResult] = useState<null | "success" | "fail">(null);
  const [reason, setReason] = useState("");
  const [arrow, setArrow] = useState<{ from: string; to: string; color: string }[]>([]);
  const [hintTxt, setHintTxt] = useState("");
  const recorded = useRef(false);
  const user: Color = eg.side;
  const engineColor: Color = user === "w" ? "b" : "w";
  const userMoves = useMemo(() => game.moves.filter((m) => m.color === user).length, [game.moves, user]);

  const record = useCallback(
    (ok: boolean, why: string) => {
      if (recorded.current) return;
      recorded.current = true;
      setResult(ok ? "success" : "fail");
      setReason(why);
      const p = load<EndgameProgress>("endgameProgress", {});
      const cur = p[eg.id] ?? { attempts: 0, success: 0 };
      p[eg.id] = { attempts: cur.attempts + 1, success: cur.success + (ok ? 1 : 0) };
      save("endgameProgress", p);
      audio.play(ok ? "win" : "lose");
    },
    [eg.id]
  );

  useEffect(() => {
    if (!game.outcome.over || recorded.current) return;
    const o = game.outcome;
    if (o.reason === "checkmate") {
      const userWon = o.winner === user;
      record(userWon && eg.goal === "win", userWon ? "Xeque-mate! Objetivo cumprido." : "Você foi mateado.");
    } else {
      record(eg.goal === "draw", `Empate (${o.reason === "stalemate" ? "afogamento" : o.reason === "insufficient" ? "material insuficiente" : o.reason === "threefold" ? "repetição" : "50 lances"}).` + (eg.goal === "win" ? " Você precisava vencer — cuidado com afogamentos e repetições." : ""));
    }
  }, [game.outcome, eg, record, user]);

  useEffect(() => {
    if (recorded.current) return;
    if (userMoves >= eg.maxMoves && !game.outcome.over) {
      if (eg.goal === "draw") record(true, `Você segurou o empate por ${eg.maxMoves} lances!`);
      else record(false, `Limite de ${eg.maxMoves} lances atingido sem vencer.`);
    }
  }, [userMoves, eg, game.outcome.over, record]);

  const onEngineMove = useCallback(
    (uci: string) => {
      const r = game.playUci(uci);
      if (r) audio.playMove(r, r.san.endsWith("#"));
    },
    [game]
  );
  const { thinking } = useEngineMove({
    fen: game.fen,
    engineColor,
    turn: game.turn,
    over: game.outcome.over || !!result,
    atEnd: game.atEnd,
    active: true,
    level: 9,
    thinkMs: 500,
    onMove: onEngineMove,
  });
  useEffect(() => () => getEngine("play").stop(), []);

  const onMove = (f: string, t: string, p?: string) => {
    if (result || game.turn !== user || !game.atEnd) return;
    const r = game.makeMove(f, t, p);
    if (r) {
      audio.playMove(r, r.san.endsWith("#"));
      setArrow([]);
      setHintTxt("");
    }
  };

  const hint = async () => {
    const r = await getEngine("aux").search(game.fen, { movetime: 800 });
    if (r.best) {
      setArrow([{ from: r.best.slice(0, 2), to: r.best.slice(2, 4), color: "rgba(250,204,21,0.9)" }]);
      setHintTxt(`Stockfish sugere ${uciToSan(game.fen, r.best)}`);
    }
  };
  const restart = () => {
    game.reset(eg.fen, []);
    setResult(null);
    setReason("");
    setArrow([]);
    setHintTxt("");
    recorded.current = false;
    audio.play("start");
  };

  return (
    <div className="page-enter">
      <GameLayout
        board={<Board fen={game.fen} orientation={user} movable={result || !game.atEnd ? null : user} lastMove={game.lastMove} arrows={arrow} onMove={onMove} />}
        side={
          <>
            <Card title={eg.category} right={<Pill color={eg.goal === "win" ? "amber" : "blue"}>{eg.goal === "win" ? "Objetivo: vencer" : "Objetivo: empatar"}</Pill>}>
              <h2 className="text-lg font-black text-ink">{eg.name}</h2>
              <p className="mt-1 text-sm text-mute">{eg.idea}</p>
              <div className="mt-3 flex items-center justify-between rounded-md bg-panel2 px-3 py-2 text-sm">
                <span className="text-mute">Seus lances</span>
                <span className="font-mono font-bold text-ink">{userMoves} / {eg.maxMoves}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel2"><div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, (userMoves / eg.maxMoves) * 100)}%` }} /></div>
              <div className="mt-2 text-xs text-mute">{result ? "" : game.turn === user ? "Sua vez." : thinking ? "A IA está calculando…" : "Vez da IA."}</div>
              {result && (
                <div className={cn("mt-3 rounded-md border px-3 py-2 text-sm font-semibold", result === "success" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200" : "border-red-500/40 bg-red-500/15 text-red-200")}>
                  {result === "success" ? "✓ " : "✗ "}{reason}
                </div>
              )}
              {hintTxt && <div className="mt-2 rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-200">{hintTxt}</div>}
            </Card>
            <Card title="Ferramentas">
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={hint} disabled={!!result || game.turn !== user}>✧ Dica do Stockfish</Btn>
                <Btn onClick={() => game.takeback(Math.min(game.turn === user ? 2 : 1, game.moves.length))} disabled={game.moves.length === 0 || !!result}>↩ Desfazer</Btn>
                <Btn onClick={restart}>⟲ Reiniciar</Btn>
                <Btn onClick={onExit}>← Lista</Btn>
                <Btn className="col-span-2" onClick={() => go("analysis", { game: { startFen: game.startFen, moves: game.moves, userColor: user } })} disabled={game.moves.length < 2}>◎ Analisar esta tentativa</Btn>
              </div>
            </Card>
            <Card title="Lances">
              <MoveList moves={game.moves} cursor={game.cursor} onSelect={game.goTo} startFen={game.startFen} className="h-40" />
              <NavControls cursor={game.cursor} total={game.moves.length} onGo={game.goTo} className="mt-2" />
            </Card>
          </>
        }
      />
    </div>
  );
}
