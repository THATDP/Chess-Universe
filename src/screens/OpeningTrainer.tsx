import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "../components/Board";
import MoveQuiz, { type QuizResult } from "../components/MoveQuiz";
import { Btn, Card, Chip, Field, Tabs, selectCls, useNav } from "../components/ui";
import { useChessGame } from "../lib/useChessGame";
import { OPENINGS, getOpening, splitLine } from "../data/openings";
import { analyzeFen } from "../lib/engine";
import { explainMove, fenFromSans, formatSanLine, lineCp, scoreWhite, sanFromUci, START_FEN, winPct } from "../lib/chessUtils";
import { markStudied, srsReview, update, useData } from "../lib/store";
import { play, playMoveSound } from "../lib/sound";

type Mode = "aprender" | "completar" | "melhor" | "defesas" | "srs" | "erros";
const strip = (s: string) => s.replace(/[+#]/g, "");

function LinePractice({ line, color, hints, onComplete }: { line: string[]; color: "w" | "b"; hints: boolean; onComplete: (errors: number) => void }) {
  const g = useChessGame(START_FEN);
  const [errors, setErrors] = useState(0);
  const [msg, setMsg] = useState("");
  const [arrow, setArrow] = useState<{ from: string; to: string } | null>(null);
  const done = useRef(false);
  const ply = g.history.length;
  useEffect(() => {
    if (ply >= line.length) {
      if (!done.current) {
        done.current = true;
        play("win");
        onComplete(errors);
      }
      return;
    }
    if (g.chess.turn() !== color) {
      const t = setTimeout(() => {
        const m = g.makeSan(line[ply], true);
        if (m) playMoveSound(m);
      }, 550);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply]);
  const onMove = (from: string, to: string, promo?: string) => {
    if (g.chess.turn() !== color || ply >= line.length) return;
    const c = new Chess(g.fen);
    let mv;
    try {
      mv = c.move({ from, to, promotion: promo });
    } catch {
      return;
    }
    const exp = line[ply];
    if (strip(mv.san) === strip(exp)) {
      const before = g.fen;
      const m = g.makeMove(from, to, promo, false);
      if (m) playMoveSound(m);
      setArrow(null);
      setMsg("✅ " + explainMove(before, { from, to, promotion: promo }));
    } else {
      setErrors((e) => e + 1);
      play("error");
      if (hints) {
        const t = new Chess(g.fen);
        const em = t.move(exp);
        setArrow({ from: em.from, to: em.to });
        setMsg(`❌ Não é o lance da teoria. Aqui se joga ${exp}.`);
      } else setMsg("❌ Lance incorreto — tente lembrar a linha.");
    }
  };
  return (
    <div className="grid md:grid-cols-[minmax(280px,480px)_1fr] gap-4 items-start">
      <Board fen={g.viewFen} orientation={color} movable={color} lastMove={g.lastMove} anim={g.anim} arrows={arrow ? [arrow] : []} onMove={onMove} />
      <Card title={`Progresso ${Math.min(ply, line.length)}/${line.length}`}>
        <p className="text-xs font-mono text-zinc-400 break-words">{formatSanLine(START_FEN, g.history.map((m) => m.san))}</p>
        <p className="text-sm text-zinc-300 mt-3 min-h-12">{msg}</p>
        <p className="text-xs text-zinc-500 mt-2">Erros: <b className={errors ? "text-rose-400" : "text-emerald-400"}>{errors}</b></p>
        {ply >= line.length && <p className="text-emerald-300 mt-2 font-semibold">🎉 Linha concluída com {errors} erro(s)!</p>}
      </Card>
    </div>
  );
}

export default function OpeningTrainer({ initialId }: { initialId?: string }) {
  const data = useData();
  const { go } = useNav();
  const [mode, setMode] = useState<Mode>("aprender");
  const [openingId, setOpeningId] = useState(initialId ?? "gambito-do-rei");
  const o = getOpening(openingId) ?? OPENINGS[0];
  const [lineIdx, setLineIdx] = useState(-1);
  const [color, setColor] = useState<"w" | "b">(o.lado);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState("");
  const lines = [{ nome: "Linha principal", moves: o.moves }, ...o.variantes];
  const line = splitLine(lines[lineIdx + 1]?.moves ?? o.moves);
  useEffect(() => { setLineIdx(-1); setColor(o.lado); setRun((r) => r + 1); setResult(""); }, [o.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // posição do quiz
  const quiz = useMemo(() => {
    const own: number[] = [];
    line.forEach((_, i) => { if ((i % 2 === 0) === (color === "w")) own.push(i); });
    const pool = mode === "completar" ? own.filter((i) => i >= 2) : own.concat(line.map((_, i) => i)).filter((i) => i >= 3);
    const k = pool.length ? pool[Math.floor(Math.random() * pool.length)] : own[0] ?? 0;
    const fen = fenFromSans(line.slice(0, k)) ?? START_FEN;
    return { k, fen, theory: line[k] ?? "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, mode, o.id, lineIdx, color]);

  const accept = async (uci: string, san: string, fen: string): Promise<QuizResult> => {
    const before = await analyzeFen(fen, 14, 1);
    const c = new Chess(fen);
    c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    const after = await analyzeFen(c.fen(), 14, 1);
    if (!before || !after) return { ok: strip(san) === strip(quiz.theory), msg: "" };
    const turn = fen.split(" ")[1];
    const w = (r: typeof before, f: string) => { const x = lineCp(scoreWhite(f, r.lines[0])); return winPct(turn === "w" ? x : -x); };
    const loss = w(before, fen) - w(after, c.fen());
    const best = sanFromUci(fen, before.lines[0].pv[0]);
    if (mode !== "melhor" && strip(san) === strip(quiz.theory)) return { ok: true, msg: `Correto! ${quiz.theory} é o lance da teoria.` };
    if (loss <= 4) return { ok: true, msg: mode === "melhor" ? `Ótimo! ${san} é um dos melhores lances (melhor: ${best}).` : `${san} não é o lance da teoria (${quiz.theory}), mas o Stockfish o considera igualmente bom.` };
    return { ok: false, msg: `Não foi o melhor. Teoria: ${quiz.theory}. Stockfish: ${best}.` };
  };

  const cards = useMemo(() => {
    const ids = new Set([...Object.keys(data.studied), ...data.favorites, ...Object.keys(data.srs).map((k) => k.split("::")[0])]);
    const out: { id: string; oid: string; idx: number }[] = [];
    ids.forEach((oid) => { const op = getOpening(oid); if (op) [-1, ...op.variantes.map((_, i) => i)].forEach((idx) => out.push({ id: `${oid}::${idx}`, oid, idx })); });
    return out;
  }, [data.studied, data.favorites, data.srs]);
  const due = cards.filter((c) => (data.srs[c.id]?.due ?? 0) <= Date.now() && data.srs[c.id]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [mi, setMi] = useState(0);
  const mist = data.mistakes;
  const curM = mist[mi % Math.max(1, mist.length)];

  const picker = (
    <Card className="mb-4">
      <div className="grid sm:grid-cols-4 gap-3 items-end">
        <Field label="Abertura / gambito"><select className={selectCls} value={openingId} onChange={(e) => setOpeningId(e.target.value)}>{OPENINGS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></Field>
        <Field label="Linha"><select className={selectCls} value={lineIdx} onChange={(e) => { setLineIdx(+e.target.value); setRun((r) => r + 1); }}>{lines.map((l, i) => <option key={l.nome} value={i - 1}>{l.nome}</option>)}</select></Field>
        <Field label="Treinar como"><select className={selectCls} value={color} onChange={(e) => { setColor(e.target.value as "w" | "b"); setRun((r) => r + 1); }}><option value="w">Brancas</option><option value="b">Pretas</option></select></Field>
        <Btn onClick={() => update((d) => { [-1, ...o.variantes.map((_, i) => i)].forEach((i) => { d.srs[`${o.id}::${i}`] ??= { ease: 2.5, interval: 0, due: 0, reps: 0, lapses: 0 }; }); })}>+ Adicionar ao baralho (repetição espaçada)</Btn>
      </div>
    </Card>
  );

  return (
    <div>
      <div className="mb-4"><Tabs value={mode} onChange={(m) => { setMode(m); setRun((r) => r + 1); setResult(""); }} tabs={[{ id: "aprender", label: "Aprender linha" }, { id: "completar", label: "Completar lance" }, { id: "melhor", label: "Melhor lance" }, { id: "defesas", label: "Contra defesas" }, { id: "srs", label: `Repetição espaçada${due.length ? ` (${due.length})` : ""}` }, { id: "erros", label: `Revisão de erros (${mist.length})` }]} /></div>
      {["aprender", "completar", "melhor", "defesas"].includes(mode) && picker}
      {mode === "aprender" && <LinePractice key={`${o.id}${lineIdx}${color}${run}`} line={line} color={color} hints onComplete={(e) => { markStudied(o.id); setResult(e === 0 ? "Perfeito! Adicione ao baralho para fixar na memória." : `Concluído com ${e} erro(s). Repita para fixar.`); }} />}
      {mode === "aprender" && result && <p className="text-emerald-300 mt-3">{result} <Btn className="ml-2" onClick={() => setRun((r) => r + 1)}>Repetir</Btn></p>}
      {(mode === "completar" || mode === "melhor") && (
        <div className="grid md:grid-cols-[minmax(280px,480px)_1fr] gap-4 items-start">
          <MoveQuiz fen={quiz.fen} accept={accept} />
          <Card title={mode === "completar" ? "Complete o lance que falta" : "Qual é o melhor lance?"}>
            <p className="text-xs font-mono text-zinc-400 break-words">{formatSanLine(START_FEN, line.slice(0, quiz.k)) || "Posição inicial"}</p>
            <p className="text-sm text-zinc-300 mt-2">{mode === "completar" ? `Linha: ${o.nome} — ${lines[lineIdx + 1].nome}. Qual o próximo lance da teoria?` : "Encontre o melhor lance — o Stockfish julga a sua resposta (aceita lances equivalentes)."}</p>
            <div className="flex gap-2 mt-3"><Btn variant="primary" onClick={() => setRun((r) => r + 1)}>Outra posição →</Btn><Btn onClick={() => setResult(`Resposta: ${quiz.theory}`)}>Mostrar resposta</Btn></div>
            {result && <p className="text-amber-300 text-sm mt-2">{result}</p>}
          </Card>
        </div>
      )}
      {mode === "defesas" && (
        <Card title="Treinar contra diferentes defesas">
          <p className="text-sm text-zinc-300 mb-3">Abra o Laboratório de Gambitos para escolher a defesa que a IA executará e experimentar continuações próprias com análise do Stockfish a cada lance.</p>
          <Btn variant="gold" onClick={() => go("lab", { openingId: o.id })}>⚗️ Abrir {o.nome} no Laboratório</Btn>
        </Card>
      )}
      {mode === "srs" && (
        <div>
          <Card title="Baralho de revisão">
            <p className="text-sm text-zinc-300">Cartas no baralho: <b>{Object.keys(data.srs).length}</b> · Para revisar agora: <b className="text-amber-300">{due.length}</b> · Dominadas (3+ acertos): <b className="text-emerald-300">{Object.values(data.srs).filter((c) => c.reps >= 3).length}</b></p>
            <p className="text-xs text-zinc-500 mt-1">Cada carta é uma linha de abertura. Você recita a linha sem dicas; seus erros definem o próximo intervalo (algoritmo SM-2 simplificado).</p>
            {!reviewing && <div className="mt-3 flex gap-2"><Btn variant="primary" disabled={!due.length} onClick={() => { setReviewing(due[0].id); setRun((r) => r + 1); }}>▶ Iniciar revisão ({due.length})</Btn>{!Object.keys(data.srs).length && <span className="text-sm text-zinc-400">Adicione uma abertura ao baralho no seletor de “Aprender linha”.</span>}</div>}
          </Card>
          {reviewing && (() => {
            const [oid, idx] = reviewing.split("::");
            const op = getOpening(oid)!;
            const l = splitLine(+idx < 0 ? op.moves : op.variantes[+idx].moves);
            return (
              <div className="mt-4">
                <p className="text-sm mb-2"><Chip color="#a78bfa">{op.nome} — {+idx < 0 ? "Linha principal" : op.variantes[+idx].nome}</Chip> <span className="text-zinc-400">Recite a linha de memória.</span></p>
                <LinePractice key={reviewing + run} line={l} color={op.lado} hints={false} onComplete={(e) => {
                  srsReview(reviewing, e === 0 ? 3 : e <= 1 ? 2 : e <= 3 ? 1 : 0);
                  setTimeout(() => { const rest = due.filter((c) => c.id !== reviewing); if (rest.length) { setReviewing(rest[0].id); setRun((r) => r + 1); } else setReviewing(null); }, 1800);
                }} />
              </div>
            );
          })()}
        </div>
      )}
      {mode === "erros" && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
          {curM ? (
            <div className="grid md:grid-cols-[minmax(280px,480px)_1fr] gap-4 items-start">
              <MoveQuiz key={curM.id} fen={curM.fen} onDone={(ok) => update((d) => { const m = d.mistakes.find((x) => x.id === curM.id); if (!m) return; if (ok) { m.solved++; if (m.solved >= 2) d.mistakes = d.mistakes.filter((x) => x.id !== m.id); } else m.fails++; })} accept={async (uci, san, fen) => {
                if (curM.bestUci && uci === curM.bestUci) return { ok: true, msg: `Correto! ${san} é o melhor lance.` };
                const b = await analyzeFen(fen, 13, 1);
                const c = new Chess(fen); c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
                const a = await analyzeFen(c.fen(), 13, 1);
                if (!a || !b) return { ok: false, msg: "Motor indisponível." };
                const t = fen.split(" ")[1]; const f = (r: typeof a, ff: string) => { const x = lineCp(scoreWhite(ff, r.lines[0])); return winPct(t === "w" ? x : -x); };
                return f(b, fen) - f(a, c.fen()) <= 4 ? { ok: true, msg: `${san} também é ótimo!` } : { ok: false, msg: `Ainda não. Você jogou ${curM.played} antes; o melhor é ${curM.best}.` };
              }} />
              <Card title="Revisão de erro"><p className="text-sm text-zinc-300">Origem: {curM.source}</p><p className="text-xs text-zinc-500 mt-1">Você errou aqui jogando {curM.played}. Encontre o melhor lance. Acerte 2 vezes para remover da lista.</p><div className="flex gap-2 mt-3"><Btn onClick={() => setMi((x) => x + 1)}>Próximo →</Btn><Btn variant="danger" onClick={() => update((d) => { d.mistakes = d.mistakes.filter((x) => x.id !== curM.id); })}>Remover</Btn></div></Card>
            </div>
          ) : <Card><p className="text-sm text-zinc-400">Nenhum erro salvo. Seus erros no Laboratório, nos problemas táticos e na Análise de Partidas aparecem aqui para revisão.</p></Card>}
          <Card title="Lista de erros"><div className="max-h-80 overflow-y-auto text-xs space-y-1">{mist.map((m, i) => <button key={m.id} onClick={() => setMi(i)} className={`block w-full text-left rounded px-2 py-1 hover:bg-white/10 ${m.id === curM?.id ? "bg-white/10" : ""}`}>{m.source} · {m.played}→{m.best} <span className="text-zinc-500">({m.fails}✗ {m.solved}✓)</span></button>)}</div></Card>
        </div>
      )}
    </div>
  );
}
