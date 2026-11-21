import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "../components/Board";
import { Btn, Card, Chip, EngineLines, EvalBar, Field, MoveList, NavButtons, PageHeader, Segmented, Tabs, inputCls, selectCls, useNav } from "../components/ui";
import { useChessGame } from "../lib/useChessGame";
import { useEvals } from "../lib/useEvals";
import { LEVELS, STYLES, computeAIMove, getLevel, type AIConfig } from "../lib/levels";
import { getEngine } from "../lib/engine";
import { CLASS_INFO, START_FEN, describeLineOutcome, explainMove, fenFromSans, formatScore, formatSanLine, lineCp, materialBalance, parseGameInput, sanFromUci, uciParts, type MoveClass } from "../lib/chessUtils";
import { OPENINGS, NIVEIS, bookLookup, buildTree, getOpening, matchingVariants, splitLine, type Opening, type TreeNode } from "../data/openings";
import { addMistake, markStudied, uid, update, useData, useSettings } from "../lib/store";
import { play, playMoveSound } from "../lib/sound";

interface LabCfg {
  openingId: string;
  openingName: string;
  baseFen: string;
  userColor: "w" | "b";
  line: string[];
  defenseName: string;
  startPly: number;
  follow: boolean;
  ai: AIConfig;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const key = (s: string[]) => s.join(" ");

export default function LabScreen() {
  const { params } = useNav();
  const [cfg, setCfg] = useState<LabCfg | null>(null);
  const [sid, setSid] = useState(0);
  if (cfg) return <LabTrain key={sid} cfg={cfg} onExit={() => setCfg(null)} onRestart={() => setSid((s) => s + 1)} />;
  return <LabSetup initialId={params.openingId} onStart={(c) => { markStudiedSafe(c.openingId); play("start"); setSid((s) => s + 1); setCfg(c); }} />;
}
function markStudiedSafe(id: string) {
  if (id && id !== "custom") markStudied(id);
}

function LabSetup({ initialId, onStart }: { initialId?: string; onStart: (c: LabCfg) => void }) {
  const s = useSettings();
  const [source, setSource] = useState<"catalogo" | "custom">("catalogo");
  const [q, setQ] = useState("");
  const [openingId, setOpeningId] = useState(initialId ?? "gambito-do-rei");
  const o = getOpening(openingId) ?? OPENINGS[0];
  const [side, setSide] = useState<"w" | "b">(o.lado);
  const [variantIdx, setVariantIdx] = useState(0);
  const [startPly, setStartPly] = useState(-1);
  const [follow, setFollow] = useState(true);
  const [custom, setCustom] = useState("");
  const [customName, setCustomName] = useState("Minha posição");
  const [levelId, setLevelId] = useState("gm");
  const [styleId, setStyleId] = useState(s.defaultStyle);
  const [movetime, setMovetime] = useState(1000);
  const [err, setErr] = useState("");

  const parsed = useMemo(() => (source === "custom" && custom.trim() ? parseGameInput(custom) : null), [source, custom]);
  const baseFen = parsed && !("error" in parsed) ? parsed.startFen : START_FEN;
  const line: string[] = source === "custom" ? (parsed && !("error" in parsed) ? parsed.sans : []) : variantIdx < 0 ? splitLine(o.moves) : splitLine(o.variantes[variantIdx]?.moves ?? o.moves);
  const defaultStart = source === "custom" ? 0 : Math.min(line.length, splitLine(o.moves).length);
  const sp = startPly < 0 ? defaultStart : Math.min(startPly, line.length);
  const previewFen = fenFromSans(line.slice(0, sp), baseFen) ?? baseFen;
  const filtered = OPENINGS.filter((x) => (x.nome + x.eco + x.cat).toLowerCase().includes(q.toLowerCase()));
  const groups: [string, Opening[]][] = [
    ["Gambitos das Brancas", filtered.filter((x) => x.cat === "Gambito" && x.lado === "w")],
    ["Gambitos das Pretas", filtered.filter((x) => x.cat === "Gambito" && x.lado === "b")],
    ["Outras aberturas e defesas", filtered.filter((x) => x.cat !== "Gambito")],
  ];

  const pick = (id: string) => {
    const op = getOpening(id)!;
    setOpeningId(id);
    setSide(op.lado);
    setVariantIdx(0);
    setStartPly(-1);
  };

  const start = () => {
    if (source === "custom") {
      if (!parsed || "error" in parsed) return setErr(parsed && "error" in parsed ? parsed.error : "Cole uma posição (FEN), PGN ou lista de lances.");
    }
    onStart({
      openingId: source === "custom" ? "custom" : o.id,
      openingName: source === "custom" ? customName : o.nome,
      baseFen,
      userColor: side,
      line,
      defenseName: source === "custom" ? "Sequência personalizada" : variantIdx < 0 ? "Linha principal" : o.variantes[variantIdx]?.nome ?? "—",
      startPly: sp,
      follow,
      ai: { levelId, styleId, movetime, depth: 0, elo: 0 },
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="⚗️ Laboratório de Gambitos" subtitle="Escolha um gambito, o seu lado, a defesa que a IA vai jogar e a posição de partida. Depois teste ataques, volte no tempo, troque a defesa e compare linhas — com análise do Stockfish em cada lance." right={<Tabs tabs={[{ id: "catalogo", label: "📚 Catálogo" }, { id: "custom", label: "✍️ Posição / sequência própria" }]} value={source} onChange={setSource} />} />
      <div className="grid lg:grid-cols-[320px_1fr_340px] gap-4">
        <Card title={source === "catalogo" ? "1 · Escolha o gambito" : "1 · Cole a posição ou os lances"} className="lg:max-h-[78vh] flex flex-col">
          {source === "catalogo" ? (
            <>
              <input className={inputCls + " mb-2"} placeholder="Buscar gambito, ECO…" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="overflow-y-auto space-y-3 pr-1 max-h-[60vh]">
                {groups.map(([t, list]) => list.length > 0 && (
                  <div key={t}>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">{t}</div>
                    {list.map((x) => (
                      <button key={x.id} onClick={() => pick(x.id)} className={`w-full text-left rounded-lg px-3 py-2 mb-1 text-sm border transition ${x.id === openingId ? "border-emerald-400 bg-emerald-400/10" : "border-transparent hover:bg-white/5"}`}>
                        <div className="font-medium">{x.nome}</div>
                        <div className="text-[11px] text-zinc-500">{x.eco} · {x.variantes.length} linhas · {NIVEIS[x.nivel]}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Field label="Nome do treinamento"><input className={inputCls} value={customName} onChange={(e) => setCustomName(e.target.value)} /></Field>
              <Field label="PGN, lances (ex.: e4 e5 f4 exf4) ou FEN">
                <textarea className={inputCls + " h-40 font-mono"} value={custom} onChange={(e) => { setCustom(e.target.value); setErr(""); }} placeholder="1. e4 e5 2. f4 exf4 3. Nf3 g5" />
              </Field>
              {parsed && "error" in parsed && <p className="text-sm text-rose-400">{parsed.error}</p>}
              {parsed && !("error" in parsed) && <p className="text-sm text-emerald-400">✓ {parsed.sans.length} lances carregados.</p>}
              {err && <p className="text-sm text-rose-400">{err}</p>}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="2 · Seu lado e a defesa da IA">
            <Field label="Você joga de">
              <Segmented value={side} onChange={setSide} options={[{ id: "w", label: "♔ Brancas" }, { id: "b", label: "♚ Pretas" }]} />
            </Field>
            {source === "catalogo" && (
              <>
                <p className="text-xs text-zinc-400 mt-3 mb-2">
                  {o.lado === side ? `Você joga o ${o.nome}; a IA executa a resposta escolhida abaixo.` : `Você defende contra o ${o.nome}; a IA executa o gambito e as continuações da linha escolhida.`}
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {[{ nome: "Linha principal", tipo: "Principal", texto: o.resumo, moves: o.moves, aval: o.aval, idx: -1 }, ...o.variantes.map((v, i) => ({ ...v, idx: i }))].map((v) => (
                    <button key={v.idx} onClick={() => { setVariantIdx(v.idx); setStartPly(-1); }} className={`w-full text-left rounded-xl border px-3 py-2 transition ${variantIdx === v.idx ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 hover:bg-white/5"}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{v.nome}</span>
                        <Chip color={v.tipo === "Aceito" ? "#f59e0b" : v.tipo === "Recusado" ? "#38bdf8" : v.tipo === "Contra-gambito" ? "#f43f5e" : "#a78bfa"}>{v.tipo}</Chip>
                        {v.aval && <span className="text-[11px] text-zinc-500">{v.aval}</span>}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{v.texto}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
            <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer">
              <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="accent-emerald-400" />
              A IA segue a linha teórica enquanto eu também seguir (depois joga com Stockfish)
            </label>
          </Card>
          <Card title="4 · Força da IA fora da teoria">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nível"><select className={selectCls} value={levelId} onChange={(e) => setLevelId(e.target.value)}>{LEVELS.map((l) => <option key={l.id} value={l.id}>{l.nome} (~{l.elo})</option>)}</select></Field>
              <Field label="Estilo"><select className={selectCls} value={styleId} onChange={(e) => setStyleId(e.target.value)}>{STYLES.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Field>
              <Field label={`Tempo de reflexão: ${(movetime / 1000).toFixed(1)}s`}><input type="range" min={200} max={6000} step={100} value={movetime} onChange={(e) => setMovetime(+e.target.value)} className="w-full accent-emerald-400" /></Field>
            </div>
          </Card>
        </div>

        <Card title="3 · Posição inicial do treino">
          <div className="max-w-[300px] mx-auto"><Board fen={previewFen} orientation={side} movable={null} coords={false} /></div>
          <Field label={`Começar após ${sp} ${sp === 1 ? "lance" : "lances"} (${sp}/${line.length})`}>
            <input type="range" min={0} max={line.length} value={sp} onChange={(e) => setStartPly(+e.target.value)} className="w-full accent-emerald-400" />
          </Field>
          <p className="text-xs font-mono text-zinc-400 min-h-10 mt-1">{formatSanLine(baseFen, line.slice(0, sp)) || "Posição inicial"}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Próximo na teoria: <b className="text-zinc-300">{line[sp] ?? "fim da linha"}</b></p>
          <Btn variant="gold" className="w-full mt-4 !py-3" onClick={start}>⚗️ Iniciar treinamento</Btn>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function LabTrain({ cfg, onExit, onRestart }: { cfg: LabCfg; onExit: () => void; onRestart: () => void }) {
  const settings = useSettings();
  const data = useData();
  const g = useChessGame(cfg.baseFen);
  const opening = getOpening(cfg.openingId);
  const evals = useEvals(12);
  const [orientation, setOrientation] = useState<"w" | "b">(cfg.userColor);
  const [book, setBook] = useState<string[] | null>(cfg.line);
  const [follow, setFollow] = useState(cfg.follow);
  const [tab, setTab] = useState<"analise" | "arvore" | "linhas" | "defesas" | "historico">("analise");
  const [showBest, setShowBest] = useState(false);
  const [live, setLive] = useState(false);
  const [nodes, setNodes] = useState<Set<string>>(new Set());
  const [cmp, setCmp] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [note, setNote] = useState("");
  const initRef = useRef(false);
  const flagged = useRef(new Set<string>());
  const aiColor = cfg.userColor === "w" ? "b" : "w";
  const sans = g.history.map((m) => m.san);

  // posição inicial do treino (lances automáticos até o ponto escolhido)
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    g.reset(cfg.baseFen, cfg.line.slice(0, cfg.startPly));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // registra nós explorados
  useEffect(() => {
    setNodes((n) => {
      const nn = new Set(n);
      for (let i = 0; i <= sans.length; i++) nn.add(key(sans.slice(0, i)));
      return nn;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.fen]);

  // avaliações do Stockfish para todas as posições do caminho atual
  useEffect(() => {
    const run = () => {
      evals.ensure(g.startFen);
      g.history.forEach((m) => evals.ensure(m.after));
    };
    run();
    const t = setInterval(run, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.fen, g.startFen]);

  const deviation = useMemo(() => {
    if (!book) return 0;
    for (let i = 0; i < sans.length; i++) if (book[i] !== sans[i]) return i + 1;
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, sans.join(" ")]);
  const inTheory = deviation === null && book !== null;

  // IA: segue o livro ou joga Stockfish
  useEffect(() => {
    if (!g.isLive || g.status.over || g.chess.turn() !== aiColor) return;
    if (!initRef.current || sans.length < cfg.startPly) return;
    let cancelled = false;
    const eng = getEngine("play");
    setThinking(true);
    (async () => {
      await sleep(450);
      if (cancelled) return;
      if (follow && book && deviation === null && book.length > sans.length) {
        const m = g.makeSan(book[sans.length], true);
        if (m) playMoveSound(m);
        setThinking(false);
        return;
      }
      const r = await computeAIMove(eng, g.fen, cfg.ai);
      if (cancelled || !r) return;
      const p = uciParts(r.uci);
      const m = g.makeMove(p.from, p.to, p.promotion, true);
      if (m) playMoveSound(m);
      setThinking(false);
    })();
    return () => {
      cancelled = true;
      eng.cancel();
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.fen, g.isLive, follow, book]);

  const onMove = (from: string, to: string, promo?: string) => {
    if (g.chess.turn() !== cfg.userColor && g.isLive) return;
    if (!g.isLive) {
      // volta a uma posição anterior e experimenta outro lance
      getEngine("play").cancel();
      g.truncate(g.viewPly);
      if (g.viewPly > 0 && new Chess(g.history[g.viewPly - 1].after).turn() !== cfg.userColor) return;
    }
    const m = g.makeMove(from, to, promo, false);
    if (m) playMoveSound(m);
  };

  const classes = useMemo(() => {
    const out: Record<number, MoveClass> = {};
    g.history.forEach((m, i) => {
      const v = evals.verdict(m);
      if (v) out[i + 1] = v.cls;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.history, evals.version]);

  // registra erros do usuário para revisão
  useEffect(() => {
    g.history.forEach((m, i) => {
      if (m.color !== cfg.userColor) return;
      const v = evals.verdict(m);
      const k = m.before + m.san;
      if (v && (v.cls === "mistake" || v.cls === "blunder") && !flagged.current.has(k)) {
        flagged.current.add(k);
        addMistake({ fen: m.before, played: m.san, best: v.bestSan, bestUci: evals.get(m.before)?.best ?? "", source: `Laboratório · ${cfg.openingName}` });
      }
      void i;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evals.version]);

  const viewMove = g.viewPly > 0 ? g.history[g.viewPly - 1] : null;
  const verdict = viewMove ? evals.verdict(viewMove) : null;
  const curEval = evals.get(g.viewFen);
  const bestUci = curEval?.best;
  const arrows = showBest && bestUci ? [{ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4) }] : [];
  const badge = viewMove && classes[g.viewPly] ? { square: viewMove.to, cls: classes[g.viewPly] } : null;
  const opName = bookLookup(g.viewFen);

  const loadSeq = (seq: string[]) => {
    getEngine("play").cancel();
    g.reset(cfg.baseFen, seq);
    if (opening) {
      const cands = matchingVariants(opening, seq);
      if (book && seq.every((x, i) => book[i] === x)) return;
      const lineMain = splitLine(opening.moves);
      if (seq.every((x, i) => lineMain[i] === x) && seq.length <= lineMain.length) setBook(lineMain);
      else if (cands[0]) setBook(splitLine(cands[0].moves));
      else setBook(null);
    }
  };

  const restartVariant = () => loadSeq(cfg.line.slice(0, cfg.startPly));
  const undo = () => {
    getEngine("play").cancel();
    const n = g.chess.turn() === cfg.userColor ? 2 : 1;
    g.undo(Math.min(n, Math.max(0, sans.length - cfg.startPly)));
  };

  const saveSession = () => {
    if (sans.length <= cfg.startPly) return;
    const e = evals.get(g.fen);
    update((d) => {
      d.lab.unshift({ id: uid(), date: Date.now(), openingId: cfg.openingId, openingName: cfg.openingName, userColor: cfg.userColor, defense: cfg.defenseName, moves: sans, evalCp: e ? lineCp(e.score) : undefined, outOfBook: deviation ?? 0 });
      d.lab = d.lab.slice(0, 100);
    });
    setNote("Sessão salva no histórico de treinamento.");
  };
  const saveExercise = () => {
    update((d) => {
      d.exercises.unshift({ id: uid(), name: `${cfg.openingName} — lance ${sans.length}`, fen: g.fen, toMove: g.chess.turn(), objective: "best", created: Date.now(), note: `Posição do Laboratório (${cfg.defenseName})` });
    });
    setNote("Posição salva como exercício (Treinamento → Personalizado).");
  };

  const leaves = useMemo(() => {
    const all = [...nodes].filter((k) => k && !k.startsWith(" "));
    const set = new Set(all);
    return all.filter((k) => !all.some((o) => o !== k && o.startsWith(k + " "))).filter((k) => set.has(k)).map((k) => k.split(" "));
  }, [nodes]);

  const theoryKeys = useMemo(() => {
    const t = new Set<string>();
    if (!opening) return t;
    [opening.moves, ...opening.variantes.map((v) => v.moves)].forEach((l) => {
      const s = splitLine(l);
      for (let i = 0; i <= s.length; i++) t.add(key(s.slice(0, i)));
    });
    return t;
  }, [opening]);

  const mergedTree = useMemo(() => {
    const root: TreeNode = { san: "", ply: 0, children: [], names: [] };
    const add = (seq: string[]) => {
      let n = root;
      seq.forEach((san, i) => {
        let c = n.children.find((x) => x.san === san);
        if (!c) {
          c = { san, ply: i + 1, children: [], names: [] };
          n.children.push(c);
        }
        n = c;
      });
    };
    if (opening) {
      const t = buildTree(opening);
      const walk = (n: TreeNode, path: string[]) => {
        n.children.forEach((c) => {
          add([...path, c.san]);
          walk(c, [...path, c.san]);
        });
      };
      walk(t, []);
    }
    nodes.forEach((k) => k && add(k.split(" ")));
    return root;
  }, [nodes, opening]);

  const renderNode = (n: TreeNode, path: string[], depth: number): React.ReactNode =>
    n.children.map((c) => {
      const p = [...path, c.san];
      const k = key(p);
      const onPath = k === key(sans.slice(0, p.length)) && sans.length >= p.length;
      const label = `${c.ply % 2 === 1 ? Math.ceil(c.ply / 2) + "." : Math.ceil(c.ply / 2) + "…"} ${c.san}`;
      const isTheory = theoryKeys.has(k);
      const head = (
        <span className="inline-flex items-center gap-1.5">
          <button onClick={(e) => { e.preventDefault(); loadSeq(p); }} className={`font-mono text-sm rounded px-1.5 py-0.5 ${onPath ? "bg-emerald-500/25 text-emerald-200" : "hover:bg-white/10 text-zinc-200"}`}>{label}</button>
          {isTheory && <span className="text-[9px] text-amber-400 border border-amber-400/40 rounded px-1">teoria</span>}
          {nodes.has(k) && <span className="text-[9px] text-sky-400 border border-sky-400/40 rounded px-1">explorado</span>}
        </span>
      );
      if (!c.children.length || depth > 28) return <div key={k} className="pl-4 py-0.5">{head}</div>;
      return (
        <details key={k} open={onPath || depth < 1} className="pl-3 border-l border-white/5 ml-1">
          <summary className="cursor-pointer py-0.5 list-none flex items-center gap-1"><span className="text-zinc-600 text-xs">▸</span>{head}</summary>
          {renderNode(c, p, depth + 1)}
        </details>
      );
    });

  const lineInfo = (seq: string[]) => {
    const fen = fenFromSans(seq, cfg.baseFen) ?? cfg.baseFen;
    const ev = evals.get(fen);
    let dev = 0;
    if (book) for (let i = 0; i < seq.length; i++) if (book[i] !== seq[i]) { dev = i + 1; break; }
    return { fen, ev, dev, mat: materialBalance(fen) };
  };

  const alts = useMemo(() => {
    // alternativas conhecidas em cada ponto do caminho atual
    const rows: { ply: number; moves: string[] }[] = [];
    let node = mergedTree;
    for (let i = 0; i < sans.length && node; i++) {
      if (node.children.length > 1 && i >= cfg.startPly) rows.push({ ply: i + 1, moves: node.children.map((c) => c.san) });
      node = node.children.find((c) => c.san === sans[i]) as TreeNode;
    }
    return rows;
  }, [mergedTree, sans.join(" ")]);

  const compat = opening ? matchingVariants(opening, sans) : [];
  const sessions = data.lab.filter((l) => l.openingId === cfg.openingId);
  const eScore = curEval?.score ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h1 className="text-xl font-bold">⚗️ {cfg.openingName}</h1>
        <Chip color="#a78bfa">{cfg.defenseName}</Chip>
        <Chip color={inTheory ? "#10b981" : "#f59e0b"}>{book === null ? "Sem linha teórica" : inTheory ? "📖 Na teoria" : `Fora da teoria desde o lance ${deviation}`}</Chip>
        {opName && <Chip color="#38bdf8">{opName.name}</Chip>}
        <div className="ml-auto flex gap-2"><Btn onClick={() => { saveSession(); onExit(); }}>⟵ Novo treino</Btn></div>
      </div>
      <div className="grid xl:grid-cols-[minmax(0,auto)_minmax(340px,440px)] gap-5 items-start justify-center">
        <div className="flex gap-2 justify-center" style={{ width: "min(100%, calc(100vh - 190px))", minWidth: 280 }}>
          <EvalBar score={eScore} orientation={orientation} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <Board fen={g.viewFen} orientation={orientation} movable={cfg.userColor} lastMove={g.lastMove} anim={g.isLive ? g.anim : null} arrows={arrows} badge={badge} onMove={onMove} />
            <div className="flex items-center justify-between mt-2 text-xs text-zinc-400 h-5">
              <span>{thinking ? "⏳ IA pensando…" : g.status.over ? `🏁 ${g.status.reason}` : g.chess.turn() === cfg.userColor ? "Sua vez" : "Vez da IA"}</span>
              <span>{g.isLive ? "" : "⏪ Visualizando posição anterior — jogue para ramificar daqui"}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              <Btn onClick={undo} className="!px-2 !text-xs" disabled={sans.length <= cfg.startPly}>↩ Desfazer</Btn>
              <Btn onClick={restartVariant} className="!px-2 !text-xs" title="Volta à posição inicial desta variante">⟲ Reiniciar variante</Btn>
              <Btn onClick={() => { saveSession(); onRestart(); }} className="!px-2 !text-xs">↻ Reiniciar tudo</Btn>
              <Btn onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))} className="!px-2 !text-xs">🔄 Inverter</Btn>
              <Btn onClick={() => setShowBest((s) => !s)} className="!px-2 !text-xs">{showBest ? "Ocultar melhor" : "💡 Melhor lance"}</Btn>
              <Btn onClick={() => { const b = evals.get(g.fen)?.best; if (b && g.chess.turn() === cfg.userColor) { const p = uciParts(b); const m = g.makeMove(p.from, p.to, p.promotion, true); if (m) playMoveSound(m); } }} className="!px-2 !text-xs" disabled={!g.isLive || g.chess.turn() !== cfg.userColor}>▶ Jogar melhor</Btn>
              <Btn onClick={saveSession} className="!px-2 !text-xs">💾 Salvar sessão</Btn>
              <Btn onClick={saveExercise} className="!px-2 !text-xs">🎯 Virar exercício</Btn>
            </div>
            {note && <p className="text-xs text-emerald-400 mt-2">{note}</p>}
          </div>
        </div>

        <div className="space-y-3 w-full">
          <Card>
            <div className="h-40 overflow-hidden"><MoveList history={g.history} viewPly={g.viewPly} classes={classes} onSelect={(p) => g.setView(p === g.history.length ? null : p)} /></div>
            <div className="mt-2"><NavButtons ply={g.viewPly} max={g.history.length} onSet={(p) => g.setView(p >= g.history.length ? null : p)} /></div>
            {alts.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-2 space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">Alternativas conhecidas neste caminho</div>
                {alts.map((r) => (
                  <div key={r.ply} className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-zinc-500 w-12">{Math.ceil(r.ply / 2)}{r.ply % 2 ? "." : "…"}</span>
                    {r.moves.map((m) => <button key={m} onClick={() => loadSeq([...sans.slice(0, r.ply - 1), m])} className={`px-2 py-0.5 rounded font-mono ${sans[r.ply - 1] === m ? "bg-emerald-500/25 text-emerald-200" : "bg-white/10 hover:bg-white/20"}`}>{m}</button>)}
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Tabs tabs={[{ id: "analise", label: "Análise" }, { id: "arvore", label: "Árvore" }, { id: "linhas", label: "Linhas" }, { id: "defesas", label: "Defesas" }, { id: "historico", label: "Histórico" }]} value={tab} onChange={setTab} />
          <Card className="max-h-[52vh] overflow-y-auto">
            {tab === "analise" && (
              <div className="space-y-3 text-sm">
                {viewMove ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-base">{viewMove.san}</span>
                      {verdict && <Chip color={CLASS_INFO[verdict.cls].color}>{CLASS_INFO[verdict.cls].sym} {CLASS_INFO[verdict.cls].label}</Chip>}
                      {verdict && <span className="text-zinc-400 text-xs">{formatScore(verdict.before)} → {formatScore(verdict.after)}</span>}
                    </div>
                    <p className="text-zinc-300 leading-relaxed">{explainMove(viewMove.before, viewMove, { cls: verdict?.cls, bestSan: verdict?.bestSan, before: verdict?.before, after: verdict?.after }) || "—"}</p>
                    {verdict && verdict.cls !== "best" && verdict.cls !== "brilliant" && verdict.bestSan && verdict.bestSan !== viewMove.san && <p className="text-amber-300 mt-1">Melhor lance: <b>{verdict.bestSan}</b></p>}
                  </div>
                ) : <p className="text-zinc-500">Faça um lance para ver a análise de cada movimento.</p>}
                {curEval && (
                  <div className="rounded-lg bg-black/25 p-2">
                    <div className="text-[11px] uppercase text-zinc-500 mb-1">Por que esta linha funciona ou falha</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-zinc-300">
                      {describeLineOutcome(g.viewFen, curEval.score, opening?.lado).map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                    {curEval.pv.length > 0 && <p className="mt-2 font-mono text-xs text-zinc-400">Melhor continuação: {(() => { const c = new Chess(g.viewFen); const out: string[] = []; for (const u of curEval.pv.slice(0, 8)) { try { out.push(c.move(uciParts(u)).san); } catch { break; } } return out.join(" "); })()}</p>}
                    <p className="text-[11px] text-zinc-500 mt-1">Sugestão do motor: {bestUci ? sanFromUci(g.viewFen, bestUci) : "—"} · prof. {curEval.depth}</p>
                  </div>
                )}
                {opening && <div className="text-xs text-zinc-400"><b className="text-zinc-300">Objetivos:</b> Brancas — {opening.objW} Pretas — {opening.objB}</div>}
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" className="accent-emerald-400" checked={live} onChange={(e) => setLive(e.target.checked)} /> Análise ao vivo (variantes do Stockfish)</label>
                {live && <EngineLines fen={g.viewFen} multipv={3} onPlay={(u) => { if (g.isLive && g.chess.turn() === cfg.userColor) { const p = uciParts(u); const m = g.makeMove(p.from, p.to, p.promotion, true); if (m) playMoveSound(m); } }} />}
              </div>
            )}
            {tab === "arvore" && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Árvore com a teoria do gambito e todas as linhas que você já explorou. Clique em qualquer lance para carregar a posição.</p>
                <div className="overflow-x-auto">{renderNode(mergedTree, [], 0)}</div>
              </div>
            )}
            {tab === "linhas" && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Linhas exploradas nesta sessão. Marque duas para comparar.</p>
                {leaves.filter((l) => l.length > cfg.startPly).map((l) => {
                  const info = lineInfo(l);
                  const k = key(l);
                  return (
                    <div key={k} className={`rounded-lg border p-2 ${cmp.includes(k) ? "border-emerald-400 bg-emerald-400/10" : "border-white/10"}`}>
                      <div className="font-mono text-xs text-zinc-300 break-words">{formatSanLine(cfg.baseFen, l.slice(cfg.startPly)) || "—"}</div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
                        {info.ev ? <Chip color={lineCp(info.ev.score) >= 0 ? "#e4e4e7" : "#a1a1aa"}>{formatScore(info.ev.score)}</Chip> : <span className="text-zinc-500">analisando…</span>}
                        <span className="text-zinc-500">{info.dev ? `saiu da teoria no lance ${info.dev}` : "teoria"}</span>
                        <span className="ml-auto flex gap-1">
                          <button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20" onClick={() => loadSeq(l)}>carregar</button>
                          <button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20" onClick={() => setCmp((c) => c.includes(k) ? c.filter((x) => x !== k) : [...c.slice(-1), k])}>comparar</button>
                        </span>
                      </div>
                    </div>
                  );
                })}
                {cmp.length === 2 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {cmp.map((k, i) => {
                      const l = k.split(" ");
                      const info = lineInfo(l);
                      return (
                        <div key={k} className="rounded-lg bg-black/30 p-2 text-xs space-y-1">
                          <div className="font-bold">Linha {i + 1}</div>
                          <div>Avaliação: <b>{info.ev ? formatScore(info.ev.score) : "…"}</b></div>
                          <div>Material: {info.mat.diff === 0 ? "igual" : `${info.mat.diff > 0 ? "Brancas" : "Pretas"} +${Math.abs(info.mat.diff)}`}</div>
                          <div>{info.ev ? describeLineOutcome(info.fen, info.ev.score, opening?.lado)[1] ?? "" : ""}</div>
                        </div>
                      );
                    })}
                    <p className="col-span-2 text-[11px] text-zinc-400">
                      {(() => { const a = lineInfo(cmp[0].split(" ")).ev, b = lineInfo(cmp[1].split(" ")).ev; if (!a || !b) return "Aguardando análise…"; const side = cfg.userColor === "w" ? 1 : -1; const d = (lineCp(a.score) - lineCp(b.score)) * side; return Math.abs(d) < 20 ? "As duas linhas são praticamente equivalentes para você." : `A linha ${d > 0 ? 1 : 2} é melhor para você por ${(Math.abs(d) / 100).toFixed(2)} peão(ões).`; })()}
                    </p>
                  </div>
                )}
              </div>
            )}
            {tab === "defesas" && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="accent-emerald-400" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> IA segue a linha teórica</label>
                {opening ? (
                  <>
                    <p className="text-xs text-zinc-500">Defesas/linhas compatíveis com a posição atual — troque a escolha da IA sem perder a posição:</p>
                    {compat.length === 0 && <p className="text-sm text-amber-300">Nenhuma linha do catálogo continua a partir desta posição (você saiu da teoria). A IA joga com Stockfish.</p>}
                    {compat.map((v) => (
                      <div key={v.nome} className={`rounded-lg border p-2 ${book && key(book) === v.moves ? "border-emerald-400" : "border-white/10"}`}>
                        <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{v.nome}</span><Chip>{v.tipo}</Chip></div>
                        <p className="text-[11px] text-zinc-500">{v.texto}</p>
                        <Btn className="!py-1 !px-2 !text-xs mt-1" onClick={() => { setBook(splitLine(v.moves)); setFollow(true); }}>Usar esta linha</Btn>
                      </div>
                    ))}
                    {compat.length > 1 && <Btn onClick={() => { setBook(splitLine(compat[Math.floor(Math.random() * compat.length)].moves)); setFollow(true); }}>🎲 Defesa aleatória</Btn>}
                    <div className="border-t border-white/10 pt-2">
                      <p className="text-xs text-zinc-500 mb-1">Ou reinicie a variante com outra defesa:</p>
                      <div className="flex flex-wrap gap-1">
                        {[{ nome: "Linha principal", moves: opening.moves }, ...opening.variantes].map((v) => (
                          <button key={v.nome} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs" onClick={() => { const l = splitLine(v.moves); setBook(l); setFollow(true); g.reset(cfg.baseFen, l.slice(0, Math.min(cfg.startPly, l.length))); }}>{v.nome}</button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : <p className="text-sm text-zinc-500">Treino personalizado: sem catálogo de defesas.</p>}
              </div>
            )}
            {tab === "historico" && (
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-500">Sessões salvas deste gambito.</p>
                {sessions.length === 0 && <p className="text-sm text-zinc-500">Nenhuma sessão ainda. Use “Salvar sessão”.</p>}
                {sessions.slice(0, 20).map((s) => (
                  <div key={s.id} className="rounded-lg border border-white/10 p-2 text-xs">
                    <div className="flex justify-between"><b>{s.defense}</b><span className="text-zinc-500">{new Date(s.date).toLocaleString("pt-BR")}</span></div>
                    <div className="font-mono text-zinc-400 break-words">{formatSanLine(START_FEN, s.moves)}</div>
                    <div className="flex justify-between mt-1 items-center"><span className="text-zinc-500">{s.evalCp !== undefined ? `Aval. ${(s.evalCp / 100).toFixed(2)}` : ""} · {s.outOfBook ? `fora da teoria no lance ${s.outOfBook}` : "na teoria"}</span><button className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20" onClick={() => loadSeq(s.moves)}>carregar</button></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <input type="hidden" value={settings.boardTheme} readOnly />
      <input type="hidden" value={getLevel(cfg.ai.levelId).nome} readOnly />
    </div>
  );
}
