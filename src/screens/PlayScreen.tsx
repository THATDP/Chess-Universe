import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board, { PieceImg } from "../components/Board";
import { Btn, Card, EvalBar, Field, MoveList, NavButtons, PageHeader, Segmented, formatClock, inputCls, selectCls, useLiveAnalysis, useNav } from "../components/ui";
import { useChessGame } from "../lib/useChessGame";
import { LEVELS, STYLES, computeAIMove, getLevel, getStyle, type AIConfig } from "../lib/levels";
import { getEngine, analyzeFen } from "../lib/engine";
import { START_FEN, formatScore, scoreWhite, sanFromUci, toPgn, uciParts, type Score } from "../lib/chessUtils";
import { play, playMoveSound } from "../lib/sound";
import { recordGame, uid, useSettings } from "../lib/store";

export interface PlayGameProps {
  startFen?: string;
  playerColor: "w" | "b";
  cfg: AIConfig;
  tc: { base: number; inc: number } | null;
  modeLabel: string;
  objective?: string;
  onExit: () => void;
  onResult?: (r: { result: string; reason: string; won: boolean | null }) => void;
  save?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PlayGame({ startFen = START_FEN, playerColor, cfg, tc, modeLabel, objective, onExit, onResult, save = true }: PlayGameProps) {
  const { go } = useNav();
  const g = useChessGame(startFen);
  const [orientation, setOrientation] = useState<"w" | "b">(playerColor);
  const [ending, setEnding] = useState<{ result: string; reason: string } | null>(null);
  const [clocks, setClocks] = useState({ w: tc ? tc.base * 1000 : 0, b: tc ? tc.base * 1000 : 0 });
  const clockRef = useRef(clocks);
  const [hint, setHint] = useState<{ from: string; to: string; text: string } | null>(null);
  const [showEval, setShowEval] = useState(false);
  const [msg, setMsg] = useState("");
  const [thinking, setThinking] = useState(false);
  const cfgRef = useRef(cfg);
  const savedRef = useRef(false);
  const aiColor = playerColor === "w" ? "b" : "w";
  const turn = g.chess.turn();
  const level = getLevel(cfg.levelId);
  const live = useLiveAnalysis(g.viewFen, showEval, 1, 1200);
  const evalScore: Score | null = showEval && live.lines[0] ? scoreWhite(g.viewFen, live.lines[0]) : null;

  const finish = (result: string, reason: string) => {
    if (ending || savedRef.current) return;
    savedRef.current = true;
    setEnding({ result, reason });
    const won = result === "1/2-1/2" ? null : result === (playerColor === "w" ? "1-0" : "0-1");
    setTimeout(() => play(won === null ? "draw" : won ? "win" : "lose"), 700);
    if (save) {
      recordGame({ id: uid(), date: Date.now(), startFen, sans: g.history.map((m) => m.san), result: result as "1-0", reason, playerColor, levelId: cfg.levelId, styleId: cfg.styleId, mode: modeLabel });
    }
    onResult?.({ result, reason, won });
  };

  useEffect(() => {
    if (g.status.over) finish(g.status.result, g.status.reason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.status.over]);

  // relógio
  useEffect(() => {
    if (!tc || ending) return;
    const t = setInterval(() => {
      const c = { ...clockRef.current };
      c[g.chess.turn()] -= 100;
      clockRef.current = c;
      setClocks(c);
      if (c[g.chess.turn()] <= 0) finish(g.chess.turn() === "w" ? "0-1" : "1-0", "Tempo esgotado");
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tc, ending, g.fen]);

  const addInc = (color: "w" | "b") => {
    if (!tc) return;
    clockRef.current = { ...clockRef.current, [color]: clockRef.current[color] + tc.inc * 1000 };
    setClocks(clockRef.current);
  };

  // IA
  useEffect(() => {
    if (ending || !g.isLive || g.chess.turn() !== aiColor || g.status.over) return;
    let cancelled = false;
    const eng = getEngine("play");
    setThinking(true);
    (async () => {
      await sleep(280);
      if (cancelled) return;
      const r = await computeAIMove(eng, g.fen, cfgRef.current, tc ? clockRef.current[aiColor] : undefined);
      if (cancelled) return;
      if (!r) {
        if (eng.failed) setMsg(`⚠ O Stockfish não pôde ser carregado (${eng.failed}). Recarregue a página.`);
        setThinking(false);
        return;
      }
      const p = uciParts(r.uci);
      const m = g.makeMove(p.from, p.to, p.promotion, true);
      if (m) {
        playMoveSound(m);
        addInc(aiColor);
      }
      setThinking(false);
    })();
    return () => {
      cancelled = true;
      eng.cancel();
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.fen, ending, g.isLive]);

  useEffect(() => setHint(null), [g.fen]);

  const onMove = (from: string, to: string, promo?: string) => {
    if (ending || !g.isLive || turn !== playerColor) return;
    const m = g.makeMove(from, to, promo, false);
    if (m) {
      playMoveSound(m);
      addInc(playerColor);
    }
  };

  const undo = () => {
    getEngine("play").cancel();
    const n = turn === playerColor ? 2 : 1;
    g.undo(Math.min(n, g.history.length));
    setMsg("");
  };

  const askHint = async () => {
    setMsg("Calculando dica…");
    const r = await analyzeFen(g.fen, 14, 1);
    if (r?.best) {
      const p = uciParts(r.best);
      setHint({ from: p.from, to: p.to, text: `${sanFromUci(g.fen, r.best)} (${formatScore(scoreWhite(g.fen, r.lines[0]))})` });
      setMsg("");
    }
  };

  const offerDraw = async () => {
    if (g.history.length < 20) return setMsg("A IA recusa o empate: ainda é muito cedo na partida.");
    const r = await analyzeFen(g.fen, 12, 1);
    if (!r) return;
    const cp = scoreWhite(g.fen, r.lines[0]).cp ?? (scoreWhite(g.fen, r.lines[0]).mate! > 0 ? 9999 : -9999);
    const aiCp = aiColor === "w" ? cp : -cp;
    if (aiCp <= 25) finish("1/2-1/2", "Empate por acordo");
    else setMsg("A IA recusa o empate: considera sua posição melhor.");
  };

  const captured = useMemo(() => {
    const cw: string[] = [],
      cb: string[] = [];
    g.history.forEach((m) => {
      if (m.captured) (m.color === "w" ? cw : cb).push(m.captured);
    });
    const order = "qrbnp";
    cw.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    cb.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return { w: cw, b: cb };
  }, [g.history]);

  const bar = (color: "w" | "b") => {
    const isAI = color === aiColor;
    const name = isAI ? `Stockfish · ${level.nome} (${cfg.elo || level.elo})` : "Você";
    const caps = captured[color];
    return (
      <div className="flex items-center justify-between gap-2 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${color === "w" ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-100 border border-white/10"}`}>{isAI ? "🤖" : "👤"}</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{name}</div>
            <div className="flex h-4 items-center">
              {caps.map((c, i) => (
                <PieceImg key={i} color={color === "w" ? "b" : "w"} type={c} className="w-4 h-4 -mr-1.5" />
              ))}
              {isAI && thinking && <span className="ml-2 text-[11px] text-emerald-400 animate-pulse">pensando…</span>}
            </div>
          </div>
        </div>
        {tc && (
          <div className={`font-mono text-lg font-bold rounded-lg px-3 py-1 tabular-nums ${turn === color && !ending ? "bg-zinc-100 text-zinc-900" : "bg-black/40 text-zinc-300"} ${clocks[color] < 10000 ? "!text-rose-500" : ""}`}>{formatClock(clocks[color])}</div>
        )}
      </div>
    );
  };

  const userWon = ending ? (ending.result === "1/2-1/2" ? null : ending.result === (playerColor === "w" ? "1-0" : "0-1")) : null;

  return (
    <div className="grid lg:grid-cols-[minmax(0,auto)_minmax(300px,380px)] gap-5 items-start justify-center">
      <div className="flex gap-2 justify-center" style={{ width: "min(100%, calc(100vh - 150px))", minWidth: 280 }}>
        {showEval && <EvalBar score={evalScore} orientation={orientation} className="shrink-0" />}
        <div className="flex-1 min-w-0">
          {bar(orientation === "w" ? "b" : "w")}
          <div className="relative">
            <Board fen={g.viewFen} orientation={orientation} movable={ending || !g.isLive ? null : playerColor} lastMove={g.lastMove} anim={g.isLive ? g.anim : null} arrows={hint ? [{ from: hint.from, to: hint.to }] : []} onMove={onMove} />
            {ending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px] rounded-lg z-40 animate-[fadeUp_.4s_ease]">
                <div className="text-center bg-zinc-900/95 border border-white/15 rounded-2xl px-8 py-6 shadow-2xl max-w-[90%]">
                  <div className="text-4xl mb-1">{userWon === null ? "🤝" : userWon ? "🏆" : "💀"}</div>
                  <h2 className="text-2xl font-bold">{userWon === null ? "Empate" : userWon ? "Vitória!" : "Derrota"}</h2>
                  <p className="text-zinc-400 text-sm mb-4">{ending.reason} · {ending.result}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Btn variant="primary" onClick={() => go("analysis", { pgn: toPgn(startFen, g.history.map((m) => m.san), { White: playerColor === "w" ? "Você" : "Stockfish", Black: playerColor === "b" ? "Você" : "Stockfish" }, ending.result) })}>📊 Analisar partida</Btn>
                    <Btn onClick={onExit}>Nova partida</Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
          {bar(orientation)}
        </div>
      </div>

      <div className="space-y-3 w-full">
        <Card title={modeLabel} right={<span className="text-[11px] text-zinc-500">{getStyle(cfg.styleId).nome}</span>}>
          {objective && <p className="text-sm text-amber-300 mb-2">🎯 {objective}</p>}
          <div className="h-48 overflow-hidden">
            <MoveList history={g.history} viewPly={g.viewPly} onSelect={(p) => g.setView(p === g.history.length ? null : p)} />
          </div>
          <div className="mt-2">
            <NavButtons ply={g.viewPly} max={g.history.length} onSet={(p) => g.setView(p >= g.history.length ? null : p)} />
          </div>
        </Card>
        <Card>
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={undo} disabled={!!ending || g.history.length === 0}>↩ Desfazer</Btn>
            <Btn onClick={askHint} disabled={!!ending || turn !== playerColor}>💡 Dica</Btn>
            <Btn onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>🔄 Inverter</Btn>
            <Btn onClick={() => setShowEval((s) => !s)}>{showEval ? "Ocultar avaliação" : "📈 Avaliação"}</Btn>
            <Btn onClick={offerDraw} disabled={!!ending}>🤝 Oferecer empate</Btn>
            <Btn variant="danger" onClick={() => finish(playerColor === "w" ? "0-1" : "1-0", "Desistência")} disabled={!!ending}>🏳 Desistir</Btn>
            <Btn onClick={onExit} className="col-span-2">⟵ Nova partida / sair</Btn>
          </div>
          {(hint || msg) && <p className="mt-2 text-sm text-emerald-300">{hint ? `Sugestão: ${hint.text}` : msg}</p>}
          {!hint && !msg && g.status.over === false && g.chess.inCheck() && <p className="mt-2 text-sm text-rose-400">Xeque!</p>}
        </Card>
      </div>
    </div>
  );
}

const TCS = [
  { id: "classica", label: "Clássica 15+10", base: 900, inc: 10 },
  { id: "rapida", label: "Rápida 10+0", base: 600, inc: 0 },
  { id: "blitz", label: "Blitz 3+2", base: 180, inc: 2 },
  { id: "bullet", label: "Bullet 1+0", base: 60, inc: 0 },
  { id: "livre", label: "Sem limite", base: 0, inc: 0 },
];

export default function PlayScreen() {
  const s = useSettings();
  const { params } = useNav();
  const [game, setGame] = useState<PlayGameProps | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [tcId, setTcId] = useState(params.tab && TCS.some((t) => t.id === params.tab) ? params.tab : "livre");
  const [color, setColor] = useState<"w" | "b" | "r">("w");
  const [levelId, setLevelId] = useState(s.defaultLevel);
  const [styleId, setStyleId] = useState(s.defaultStyle);
  const [movetime, setMovetime] = useState(s.thinkTime);
  const [depth, setDepth] = useState(s.depth);
  const [elo, setElo] = useState(s.elo);
  const [fen, setFen] = useState(params.fen ?? "");
  const lv = getLevel(levelId);

  const start = () => {
    let startFen = START_FEN;
    if (fen.trim()) {
      try {
        startFen = new Chess(fen.trim()).fen();
      } catch {
        return alert("FEN inválido.");
      }
    }
    const tc = TCS.find((t) => t.id === tcId)!;
    const pc = color === "r" ? (Math.random() < 0.5 ? "w" : "b") : color;
    play("start");
    setGameKey((k) => k + 1);
    setGame({ startFen, playerColor: pc, cfg: { levelId, styleId, movetime, depth, elo }, tc: tc.base ? { base: tc.base, inc: tc.inc } : null, modeLabel: `${tc.label} · ${lv.nome}`, onExit: () => setGame(null) });
  };

  if (game) return <PlayGame key={gameKey} {...game} />;
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Jogar contra a IA" subtitle="Escolha o ritmo, o nível e o estilo do Stockfish. Cada combinação de força, tempo de reflexão e estilo muda de verdade o comportamento do adversário." />
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Modo de jogo">
          <div className="grid grid-cols-1 gap-2">
            {TCS.map((t) => (
              <button key={t.id} onClick={() => { play("click"); setTcId(t.id); }} className={`text-left rounded-xl px-3 py-2.5 border transition ${tcId === t.id ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 hover:bg-white/5"}`}>
                <span className="font-medium">{t.label}</span>
                <span className="block text-xs text-zinc-500">{t.base ? `${t.base / 60} min ${t.inc ? `+ ${t.inc}s por lance` : "por jogador"}` : "Sem relógio — jogue com calma"}</span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Field label="Sua cor">
              <Segmented value={color} onChange={setColor} options={[{ id: "w", label: "♔ Brancas" }, { id: "r", label: "🎲 Aleatória" }, { id: "b", label: "♚ Pretas" }]} />
            </Field>
          </div>
        </Card>
        <Card title="Adversário">
          <div className="space-y-3">
            <Field label="Nível" hint={lv.desc}>
              <select className={selectCls} value={levelId} onChange={(e) => { setLevelId(e.target.value); setElo(0); }}>
                {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.nome} — ~{l.elo} Elo</option>)}
              </select>
            </Field>
            <Field label="Estilo de jogo" hint={getStyle(styleId).desc}>
              <select className={selectCls} value={styleId} onChange={(e) => setStyleId(e.target.value)}>
                {STYLES.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </Field>
            <Field label={`Tempo de reflexão: ${(movetime / 1000).toFixed(1)} s`}>
              <input type="range" min={200} max={10000} step={100} value={movetime} onChange={(e) => setMovetime(+e.target.value)} className="w-full accent-emerald-400" />
            </Field>
            <Field label={`Força aproximada (Elo): ${elo || "automática"}`} hint="Ajuste fino; 0 = usar o Elo do nível.">
              <input type="range" min={0} max={3200} step={50} value={elo} onChange={(e) => setElo(+e.target.value)} className="w-full accent-emerald-400" />
            </Field>
            <Field label={`Profundidade máxima: ${depth || "automática"}`}>
              <input type="range" min={0} max={30} step={1} value={depth} onChange={(e) => setDepth(+e.target.value)} className="w-full accent-emerald-400" />
            </Field>
            <Field label="Posição inicial personalizada (FEN, opcional)">
              <input className={inputCls} placeholder="deixe vazio para a posição padrão" value={fen} onChange={(e) => setFen(e.target.value)} />
            </Field>
          </div>
        </Card>
      </div>
      <div className="mt-5 flex justify-center">
        <Btn variant="gold" onClick={start} className="!px-10 !py-3 text-base">♞ Iniciar partida</Btn>
      </div>
    </div>
  );
}
