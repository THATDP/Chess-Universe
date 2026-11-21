import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChessGame } from "../core/chess/useChessGame";
import { START_FEN, REASON_LABEL, buildPgn, tryUci, turnOf, uciToSan, totalMaterial } from "../core/chess/rules";
import type { Color, EndReason, MoveRec } from "../core/chess/rules";
import { Board } from "../ui/Board";
import { Btn, Card, Modal, PageTitle, Pill, Segmented } from "../ui/common";
import { EvalBar, MoveList, NavControls, PlayerBar, capturedFromFen } from "../ui/GameWidgets";
import { EnginePanel } from "../ui/EnginePanel";
import { ColorPicker, LevelPicker, ThinkTime } from "../ui/Pickers";
import { GameLayout } from "../ui/GameLayout";
import { useSettings } from "../core/settings/settings";
import { audio } from "../core/audio/audio";
import { getLevel, levelBadge } from "../core/engine/levels";
import { getEngine, lineCp } from "../core/engine/stockfish";
import type { EngineLine } from "../core/engine/stockfish";
import { useEngineMove } from "../core/engine/useEngineMove";
import { addGame, load, recordResult, remove, save, uid } from "../core/storage/db";
import { useNav } from "../core/nav";
import { identifyOpening } from "../data/theory";

const MODES = [
  { id: "classic", name: "Clássica", desc: "15 min + 10 s", base: 900, inc: 10, icon: "♜" },
  { id: "rapid", name: "Rápida", desc: "10 min", base: 600, inc: 0, icon: "◷" },
  { id: "blitz", name: "Blitz", desc: "3 min + 2 s", base: 180, inc: 2, icon: "↯" },
  { id: "bullet", name: "Bullet", desc: "1 min", base: 60, inc: 0, icon: "✹" },
  { id: "untimed", name: "Sem relógio", desc: "Sem limite de tempo", base: 0, inc: 0, icon: "∞" },
] as const;

interface EndInfo {
  result: "1-0" | "0-1" | "1/2-1/2";
  reason: EndReason;
}
interface Session {
  startFen: string;
  ucis: string[];
  userColor: Color;
  level: number;
  modeId: string;
  thinkMs: number;
  clocks: { w: number; b: number };
  gameId: string;
  started: number;
}

export default function Play() {
  const { settings, update } = useSettings();
  const { params, go } = useNav();
  const game = useChessGame();
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const [modeId, setModeId] = useState<string>("rapid");
  const [colorChoice, setColorChoice] = useState<"w" | "b" | "r">("w");
  const [level, setLevel] = useState(settings.defaultLevel);
  const [userColor, setUserColor] = useState<Color>("w");
  const [orientation, setOrientation] = useState<Color>("w");
  const [customFen, setCustomFen] = useState<string | null>(params.fen ?? null);
  const [clocks, setClocks] = useState({ w: 0, b: 0 });
  const [end, setEnd] = useState<EndInfo | null>(null);
  const [showEnd, setShowEnd] = useState(false);
  const [hint, setHint] = useState<{ uci: string; san: string } | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [evalOn, setEvalOn] = useState(false);
  const [topLine, setTopLine] = useState<EngineLine | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [session, setSession] = useState<Session | null>(() => load<Session | null>("session", null));
  const gameId = useRef(uid());
  const startedAt = useRef(Date.now());
  const finished = useRef(false);
  const clockRef = useRef({ w: 0, b: 0 });
  const lastTick = useRef(0);
  const hintsUsed = useRef(0);
  const takebacks = useRef(0);

  const mode = MODES.find((m) => m.id === modeId)!;
  const timed = mode.base > 0;
  const engineColor: Color = userColor === "w" ? "b" : "w";
  const liveFen = game.fens[game.fens.length - 1];
  const liveTurn = turnOf(liveFen);

  /* ---------- fim de partida ---------- */
  const finish = useCallback(
    (info: EndInfo) => {
      if (finished.current) return;
      finished.current = true;
      setEnd(info);
      setShowEnd(true);
      setConfirmResign(false);
      remove("session");
      setSession(null);
      const winner: Color | null = info.result === "1-0" ? "w" : info.result === "0-1" ? "b" : null;
      const outcome = winner === null ? "draw" : winner === userColor ? "win" : "loss";
      const st = game.ref.current;
      const lv = getLevel(level);
      const userName = settings.playerName || "Você";
      const sfName = `Stockfish (${lv.name})`;
      const pgn = buildPgn(st.startFen, st.moves.slice(0, st.moves.length), {
        White: userColor === "w" ? userName : sfName,
        Black: userColor === "b" ? userName : sfName,
        Result: info.result,
        Termination: REASON_LABEL[info.reason],
        TimeControl: timed ? `${mode.base}+${mode.inc}` : "-",
      });
      addGame({
        id: gameId.current,
        date: Date.now(),
        mode: mode.name,
        white: userColor === "w" ? userName : sfName,
        black: userColor === "b" ? userName : sfName,
        result: info.result,
        reason: REASON_LABEL[info.reason],
        pgn,
        moves: st.moves.length,
        level,
        userColor,
      });
      recordResult(mode.id, outcome, Math.round((Date.now() - startedAt.current) / 1000));
      setTimeout(() => audio.play(outcome === "win" ? "win" : outcome === "loss" ? "lose" : "draw"), info.reason === "checkmate" ? 900 : 200);
    },
    [game.ref, level, mode, settings.playerName, timed, userColor]
  );

  useEffect(() => {
    if (phase === "playing" && game.outcome.over && game.atEnd && !finished.current && game.outcome.result && game.outcome.reason) {
      finish({ result: game.outcome.result, reason: game.outcome.reason });
    }
  }, [phase, game.outcome, game.atEnd, finish]);

  /* ---------- relógio ---------- */
  useEffect(() => {
    if (phase !== "playing" || !timed || end) return;
    lastTick.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - lastTick.current;
      lastTick.current = now;
      const st = game.ref.current;
      if (st.moves.length === 0 || st.cursor === undefined) return;
      const last = st.moves[st.moves.length - 1];
      const turn: Color = last.color === "w" ? "b" : "w";
      if (game.outcome.over) return;
      clockRef.current[turn] = Math.max(0, clockRef.current[turn] - dt);
      setClocks({ ...clockRef.current });
      if (clockRef.current[turn] <= 0) {
        const opp: Color = turn === "w" ? "b" : "w";
        const fenNow = last.fen;
        // se o adversário só tem o rei, é empate
        const onlyKing = totalMaterial(fenNow) - 0 <= 0;
        void onlyKing;
        finish({ result: opp === "w" ? "1-0" : "0-1", reason: "timeout" });
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, timed, end, game.ref, game.outcome.over, finish]);

  /* ---------- salvar sessão em andamento ---------- */
  useEffect(() => {
    if (phase !== "playing" || end) return;
    const st = game.ref.current;
    const s: Session = {
      startFen: st.startFen,
      ucis: st.moves.map((m) => m.uci),
      userColor,
      level,
      modeId,
      thinkMs: settings.thinkMs,
      clocks: { ...clockRef.current },
      gameId: gameId.current,
      started: startedAt.current,
    };
    save("session", s);
  }, [phase, end, game.moves, game.ref, userColor, level, modeId, settings.thinkMs, clocks]);

  /* ---------- IA ---------- */
  const onEngineMove = useCallback(
    (uci: string) => {
      const rec = game.playUci(uci);
      if (rec) {
        audio.playMove(rec, rec.san.endsWith("#"));
        if (timed) clockRef.current[rec.color] += mode.inc * 1000;
        setHint(null);
      }
    },
    [game, mode.inc, timed]
  );
  const { thinking } = useEngineMove({
    fen: game.fen,
    engineColor,
    turn: game.turn,
    over: game.outcome.over || !!end,
    atEnd: game.atEnd,
    active: phase === "playing",
    level,
    thinkMs: settings.thinkMs,
    clockMs: timed ? clockRef.current[engineColor] : undefined,
    onMove: onEngineMove,
  });

  /* ---------- início ---------- */
  const beginGame = (opts: { fen: string; uc: Color; lv: number; mid: string; sess?: Session }) => {
    const m = MODES.find((x) => x.id === opts.mid)!;
    finished.current = false;
    setEnd(null);
    setShowEnd(false);
    setHint(null);
    setMsg(null);
    hintsUsed.current = 0;
    takebacks.current = 0;
    gameId.current = opts.sess?.gameId ?? uid();
    startedAt.current = opts.sess?.started ?? Date.now();
    setUserColor(opts.uc);
    setOrientation(opts.uc);
    setLevel(opts.lv);
    setModeId(opts.mid);
    const c = opts.sess ? opts.sess.clocks : { w: m.base * 1000, b: m.base * 1000 };
    clockRef.current = { ...c };
    setClocks({ ...c });
    if (opts.sess) {
      const recs: MoveRec[] = [];
      let f = opts.sess.startFen;
      for (const u of opts.sess.ucis) {
        const r = tryUci(f, u);
        if (!r) break;
        recs.push(r);
        f = r.fen;
      }
      game.reset(opts.sess.startFen, recs);
    } else game.reset(opts.fen, []);
    setPhase("playing");
    window.scrollTo({ top: 0 });
    audio.play("start");
  };

  const start = () => {
    const uc: Color = colorChoice === "r" ? (Math.random() < 0.5 ? "w" : "b") : colorChoice;
    beginGame({ fen: customFen ?? START_FEN, uc, lv: level, mid: modeId });
  };
  const resume = () => {
    if (!session) return;
    beginGame({ fen: session.startFen, uc: session.userColor, lv: session.level, mid: session.modeId, sess: session });
  };

  /* ---------- ações do jogador ---------- */
  const onUserMove = (from: string, to: string, promo?: string) => {
    if (phase !== "playing" || end || !game.atEnd || game.turn !== userColor) return;
    const rec = game.makeMove(from, to, promo);
    if (!rec) {
      audio.play("error");
      return;
    }
    audio.playMove(rec, rec.san.endsWith("#"));
    if (timed) clockRef.current[rec.color] += mode.inc * 1000;
    setHint(null);
    setMsg(null);
  };

  const askHint = async () => {
    if (hintBusy || end || game.turn !== userColor) return;
    setHintBusy(true);
    const r = await getEngine("aux").search(game.fen, { movetime: 900 });
    setHintBusy(false);
    if (r.best) {
      hintsUsed.current++;
      setHint({ uci: r.best, san: uciToSan(game.fen, r.best) });
    }
  };

  const doTakeback = () => {
    if (end || game.moves.length === 0) return;
    const n = game.turn === userColor ? 2 : 1;
    game.takeback(Math.min(n, game.moves.length));
    takebacks.current++;
    setHint(null);
    audio.play("click");
  };

  const offerDraw = async () => {
    if (end || game.moves.length < 10) {
      setMsg("A IA só considera empate após alguns lances (mínimo 5 de cada lado).");
      return;
    }
    setMsg("A IA está avaliando a proposta…");
    const r = await getEngine("aux").search(game.fen, { movetime: 600 });
    const l = r.lines[0];
    const cpEngine = l ? lineCp(l) * (engineColor === "w" ? 1 : -1) : 0;
    if (cpEngine <= 15) {
      setMsg("A IA aceitou o empate.");
      finish({ result: "1/2-1/2", reason: "agreement" });
    } else {
      setMsg(`A IA recusou o empate (ela avalia a posição como favorável: ${(cpEngine / 100).toFixed(1)}).`);
      audio.play("error");
    }
  };

  const resign = () => finish({ result: userColor === "w" ? "0-1" : "1-0", reason: "resign" });

  const backToSetup = () => {
    remove("session");
    setSession(null);
    setPhase("setup");
    setEnd(null);
    setShowEnd(false);
    getEngine("play").stop();
  };

  const analyze = () => {
    const st = game.ref.current;
    go("analysis", { game: { startFen: st.startFen, moves: st.moves, userColor, id: gameId.current, headers: { Result: end?.result ?? "*" } } });
  };

  const copyPgn = () => {
    const st = game.ref.current;
    void navigator.clipboard?.writeText(buildPgn(st.startFen, st.moves, { Result: end?.result ?? "*" }));
    setMsg("PGN copiado para a área de transferência.");
  };

  /* ---------- derivados ---------- */
  const cap = capturedFromFen(game.fen);
  const opening = useMemo(() => identifyOpening(game.fens.slice(0, game.cursor + 1)), [game.fens, game.cursor]);
  const lv = getLevel(level);
  const arrows = hint ? [{ from: hint.uci.slice(0, 2), to: hint.uci.slice(2, 4), color: "rgba(250,204,21,0.9)" }] : [];
  const userName = settings.playerName || "Você";
  const oppColor: Color = orientation === "w" ? "b" : "w";
  const clk = (c: Color) => (timed ? clocks[c] : null);
  const outcomeText = end
    ? end.result === "1/2-1/2"
      ? "Empate"
      : (end.result === "1-0") === (userColor === "w")
        ? "Vitória!"
        : "Derrota"
    : "";

  /* ================== SETUP ================== */
  if (phase === "setup") {
    return (
      <div className="page-enter mx-auto max-w-4xl">
        <PageTitle title="Jogar contra o Stockfish" subtitle="Escolha o ritmo, a cor e o nível. A IA roda localmente no seu navegador, em um Web Worker." />
        {session && (
          <Card className="mb-4 border-accent/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-ink">Partida em andamento encontrada</div>
                <div className="text-sm text-mute">
                  {session.ucis.length} lances · {getLevel(session.level).name} · {MODES.find((m) => m.id === session.modeId)?.name}
                </div>
              </div>
              <div className="flex gap-2">
                <Btn variant="primary" onClick={resume}>Continuar</Btn>
                <Btn variant="danger" onClick={() => { remove("session"); setSession(null); }}>Descartar</Btn>
              </div>
            </div>
          </Card>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Ritmo de jogo">
            <div className="grid grid-cols-1 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { audio.play("click"); setModeId(m.id); }}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${modeId === m.id ? "border-accent bg-accent/15" : "border-line bg-panel2 hover:border-mute"}`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span>
                    <span className="block text-sm font-bold text-ink">{m.name}</span>
                    <span className="block text-xs text-mute">{m.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card title="Sua cor">
              <ColorPicker value={colorChoice} onChange={setColorChoice} />
              {customFen && (
                <div className="mt-3 flex items-center justify-between rounded-md bg-panel2 p-2 text-xs text-mute">
                  <span>Posição personalizada carregada do editor</span>
                  <button className="text-red-300 hover:underline" onClick={() => setCustomFen(null)}>remover</button>
                </div>
              )}
            </Card>
            <Card title="Tempo de reflexão">
              <ThinkTime value={settings.thinkMs} onChange={(v) => update({ thinkMs: v })} />
              <p className="text-xs text-mute">Usado nos níveis Grande Mestre, Elite e Força máxima (os demais têm limites próprios de profundidade).</p>
            </Card>
          </div>
        </div>
        <Card title="Nível da IA" className="mt-4" right={<Pill color="amber">{lv.name} · {levelBadge(lv)}</Pill>}>
          <LevelPicker value={level} onChange={(v) => { setLevel(v); update({ defaultLevel: v }); }} />
          <p className="mt-3 text-xs text-mute">
            {lv.desc} Parâmetros reais do Stockfish: Skill Level {lv.skill}
            {lv.elo ? `, UCI_LimitStrength ≈ ${lv.elo} Elo` : ", sem limite de Elo"}
            {lv.depth ? `, profundidade máx. ${lv.depth}` : ", sem limite de profundidade"}.
          </p>
        </Card>
        <div className="mt-5 flex justify-end">
          <Btn variant="primary" size="lg" onClick={start}>▶ Iniciar partida</Btn>
        </div>
      </div>
    );
  }

  /* ================== JOGO ================== */
  const topBar = (
    <PlayerBar
      name={oppColor === userColor ? userName : `Stockfish · ${lv.name}`}
      sub={oppColor === userColor ? "Jogador" : thinking ? "pensando…" : levelBadge(lv)}
      color={oppColor}
      clock={clk(oppColor)}
      active={!end && liveTurn === oppColor}
      captured={oppColor === "w" ? cap.byWhite : cap.byBlack}
      advantage={oppColor === "w" ? Math.max(0, cap.diff) : Math.max(0, -cap.diff)}
    />
  );
  const bottomBar = (
    <PlayerBar
      name={orientation === userColor ? userName : `Stockfish · ${lv.name}`}
      sub={orientation === userColor ? "Jogador" : thinking ? "pensando…" : levelBadge(lv)}
      color={orientation}
      clock={clk(orientation)}
      active={!end && liveTurn === orientation}
      captured={orientation === "w" ? cap.byWhite : cap.byBlack}
      advantage={orientation === "w" ? Math.max(0, cap.diff) : Math.max(0, -cap.diff)}
    />
  );

  return (
    <div className="page-enter">
      <GameLayout
        evalBar={evalOn && topLine ? <EvalBar cp={topLine.cp} mate={topLine.mate} orientation={orientation} /> : undefined}
        top={topBar}
        bottom={bottomBar}
        board={
          <Board
            fen={game.fen}
            orientation={orientation}
            movable={end || !game.atEnd ? null : userColor}
            lastMove={game.lastMove}
            arrows={arrows}
            onMove={onUserMove}
          />
        }
        side={
          <>
            <Card
              title="Partida"
              right={<div className="flex gap-1.5"><Pill color="blue">{mode.name}</Pill><Pill color="amber">{lv.name}</Pill></div>}
            >
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-mute">Turno</span>
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <span className={`inline-block h-3 w-3 rounded-full ${liveTurn === "w" ? "bg-white" : "bg-neutral-900 ring-1 ring-neutral-500"}`} />
                  {end ? "Partida encerrada" : liveTurn === userColor ? "Sua vez" : thinking ? "IA pensando…" : "Vez da IA"}
                </span>
              </div>
              {opening && <div className="mb-2 rounded-md bg-panel2 px-2 py-1.5 text-xs text-mute">❏ {opening.name}</div>}
              {game.outcome.over === false && game.fen && game.moves.length > 0 && game.moves[game.cursor - 1]?.san.includes("+") && (
                <div className="mb-2 rounded-md bg-red-500/15 px-2 py-1.5 text-xs font-bold text-red-300">♚ Xeque!</div>
              )}
              <MoveList moves={game.moves} cursor={game.cursor} onSelect={game.goTo} startFen={game.startFen} className="h-48" />
              <NavControls cursor={game.cursor} total={game.moves.length} onGo={game.goTo} className="mt-2" />
            </Card>
            <Card title="Controles">
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={askHint} disabled={!!end || game.turn !== userColor || hintBusy}>✧ {hintBusy ? "Calculando…" : "Dica"}</Btn>
                <Btn onClick={doTakeback} disabled={!!end || game.moves.length === 0}>↩ Desfazer</Btn>
                <Btn onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>⇅ Virar</Btn>
                <Btn onClick={offerDraw} disabled={!!end}>= Empate</Btn>
                {!confirmResign ? (
                  <Btn variant="danger" disabled={!!end} onClick={() => setConfirmResign(true)}>⚐ Desistir</Btn>
                ) : (
                  <Btn variant="danger" onClick={resign}>Confirmar?</Btn>
                )}
                <Btn onClick={backToSetup}>⚙ Nova partida</Btn>
              </div>
              {hint && <div className="mt-3 rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-200">Sugestão do Stockfish: <b className="font-mono">{hint.san}</b></div>}
              {msg && <div className="mt-3 rounded-md bg-panel2 px-3 py-2 text-xs text-mute">{msg}</div>}
            </Card>
            <Card title="Avaliação em tempo real">
              <EnginePanel fen={game.fen} enabled={evalOn} onToggle={setEvalOn} multipv={1} onLines={(l) => setTopLine(l[0] ?? null)} maxDepth={18} title="Stockfish" />
              <p className="mt-2 text-[11px] text-mute">Desligada por padrão para não revelar lances durante o jogo.</p>
            </Card>
          </>
        }
      />
      <Modal open={showEnd && !!end} onClose={() => setShowEnd(false)} title="Fim de partida">
        {end && (
          <div className="space-y-4 text-center">
            <div className={`text-4xl font-black ${outcomeText === "Vitória!" ? "text-emerald-300" : outcomeText === "Derrota" ? "text-red-300" : "text-amber-200"}`}>{outcomeText}</div>
            <div className="text-mute">{REASON_LABEL[end.reason]} · {end.result}</div>
            <div className="text-sm text-mute">{game.moves.length} lances · dicas usadas: {hintsUsed.current} · desfazer: {takebacks.current}</div>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="primary" onClick={analyze}>◎ Analisar partida</Btn>
              <Btn onClick={() => beginGame({ fen: game.startFen, uc: userColor === "w" ? "b" : "w", lv: level, mid: modeId })}>⟲ Revanche (trocar cor)</Btn>
              <Btn onClick={copyPgn}>❐ Copiar PGN</Btn>
              <Btn onClick={backToSetup}>⚙ Nova partida</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export { Segmented };
