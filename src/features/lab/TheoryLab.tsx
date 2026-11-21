import { useEffect, useMemo, useState } from "react";
import { useChessGame } from "../../core/chess/useChessGame";
import { START_FEN, checkFen, formatLine, parsePgn, parseSanSequence } from "../../core/chess/rules";
import { Board } from "../../ui/Board";
import { Btn, Card, Modal, PageTitle, Pill, Segmented, Toggle } from "../../ui/common";
import { NavControls } from "../../ui/GameWidgets";
import { LevelPicker } from "../../ui/Pickers";
import { EnginePanel } from "../../ui/EnginePanel";
import { audio } from "../../core/audio/audio";
import { useSettings } from "../../core/settings/settings";
import { getEngine, formatEval } from "../../core/engine/stockfish";
import type { EngineLine } from "../../core/engine/stockfish";
import { getLevel } from "../../core/engine/levels";
import { load, save, uid, usePersisted } from "../../core/storage/db";
import type { CustomTraining, LabProgress } from "../../core/storage/db";
import { countNodes, getNode, getTheories, getTheory, mainContinuation, nodesAtFen, pathTo } from "../../data/theory";
import type { CNode, Kind } from "../../data/theory";
import { useNav } from "../../core/nav";
import { Trainer } from "./Trainer";
import { recsFromSan } from "./lineUtils";
import type { TrainConfig } from "./lineUtils";
import { cn } from "../../utils/cn";

const KIND: Record<Kind, { label: string; cls: string }> = {
  main: { label: "Principal", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  defense: { label: "Defesa", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  decline: { label: "Recusado", cls: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  trap: { label: "Armadilha", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  alt: { label: "Alternativa", cls: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30" },
  refuted: { label: "Refutado", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

function flatten(rootId: string): CNode[] {
  const out: CNode[] = [];
  const walk = (id: string) => {
    const n = getNode(id);
    if (!n) return;
    out.push(n);
    n.children.forEach(walk);
  };
  walk(rootId);
  return out;
}

export default function TheoryLab({ kind }: { kind: "gambit" | "opening" }) {
  const { params } = useNav();
  const { settings } = useSettings();
  const theories = useMemo(() => getTheories(kind), [kind]);
  const isGambit = kind === "gambit";
  const [theoryId, setTheoryId] = useState(params.theoryId && theories.some((t) => t.id === params.theoryId) ? params.theoryId : theories[0].id);
  const [nodeId, setNodeId] = useState<string>(params.nodeId ?? theoryId);
  const [tab, setTab] = useState<"tree" | "train" | "custom">(params.customFen ? "custom" : "tree");
  const [side, setSide] = useState<"all" | "w" | "b">("all");
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [favs, setFavs] = usePersisted<string[]>(`favorites:${kind}`, []);
  const [trainCfg, setTrainCfg] = useState<TrainConfig | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [liveOn, setLiveOn] = useState(false);
  const [progress, setProgress] = useState<LabProgress>(() => load("labProgress", {}));

  const theory = getTheory(theoryId)!;
  const node = getNode(nodeId) ?? getNode(theoryId)!;
  const nodes = useMemo(() => flatten(theory.rootId), [theory.rootId]);

  /* ---- tabuleiro de exploração ---- */
  const game = useChessGame();
  useEffect(() => {
    const n = getNode(nodeId);
    if (!n) return;
    game.reset(START_FEN, recsFromSan(START_FEN, n.line));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const selectTheory = (id: string) => {
    setTheoryId(id);
    setNodeId(id);
    setCollapsed(new Set());
    audio.play("click");
  };

  /* ---- configuração de treino ---- */
  const [tColor, setTColor] = useState<"w" | "b">(theory.side);
  const [startPly, setStartPly] = useState(0);
  const [strict, setStrict] = useState(false);
  const [level, setLevel] = useState(Math.max(4, settings.defaultLevel));
  useEffect(() => {
    setTColor(theory.side);
    setStartPly(0);
  }, [theory.id]);
  const targetSan = useMemo(() => [...node.line, ...mainContinuation(node.id)], [node]);
  useEffect(() => {
    setStartPly((s) => Math.min(s, targetSan.length));
  }, [targetSan.length]);

  const startTraining = () => {
    const line = recsFromSan(START_FEN, targetSan);
    setTrainCfg({
      key: uid(),
      title: node.id === theory.rootId ? theory.name : `${theory.name} › ${node.title}`,
      startFen: START_FEN,
      line,
      startPly: Math.min(startPly, line.length),
      userColor: tColor,
      strict,
      level,
      theoryId: theory.id,
      progressKey: node.id,
    });
  };

  /* ---- treinos personalizados ---- */
  const [customs, setCustoms] = usePersisted<CustomTraining[]>("customTrainings", []);
  const [cName, setCName] = useState("");
  const [cFen, setCFen] = useState(params.customFen ?? "");
  const [cLine, setCLine] = useState("");
  const [cSide, setCSide] = useState<"w" | "b">(params.customSide ?? "w");
  const [cErr, setCErr] = useState<string | null>(null);

  const buildCustom = (): CustomTraining | null => {
    setCErr(null);
    let startFen = cFen.trim() || START_FEN;
    let san: string[] = [];
    const text = cLine.trim();
    if (cFen.trim()) {
      const v = checkFen(startFen);
      if (!v.ok) {
        setCErr("FEN inválida: " + v.error);
        return null;
      }
    }
    if (text) {
      if (text.includes("[")) {
        try {
          const p = parsePgn(text);
          startFen = p.startFen !== START_FEN ? p.startFen : startFen;
          san = p.moves.map((m) => m.san);
        } catch (e) {
          setCErr("PGN inválido: " + (e as Error).message.slice(0, 120));
          return null;
        }
      } else {
        const recs = parseSanSequence(startFen, text);
        if (!recs) {
          setCErr("Sequência de lances inválida a partir dessa posição. Use SAN, ex.: 1. e4 e5 2. f4 exf4");
          return null;
        }
        san = recs.map((r) => r.san);
      }
    }
    return { id: uid(), name: cName.trim() || "Treino personalizado", side: cSide, startFen, san, created: Date.now() };
  };
  const startCustom = (c: CustomTraining) => {
    const line = recsFromSan(c.startFen, c.san);
    setTrainCfg({
      key: c.id,
      title: c.name,
      startFen: c.startFen,
      line,
      startPly: 0,
      userColor: c.side,
      strict,
      level,
      progressKey: "custom:" + c.id,
    });
  };

  const refreshProgress = () => setProgress(load("labProgress", {}));

  if (trainCfg) {
    return (
      <Trainer
        key={trainCfg.key}
        cfg={trainCfg}
        onExit={() => {
          setTrainCfg(null);
          refreshProgress();
        }}
      />
    );
  }

  const list = theories.filter((t) => (side === "all" || t.side === side) && (!favOnly || favs.includes(t.id)) && (!q || t.name.toLowerCase().includes(q.toLowerCase()) || t.eco.toLowerCase().includes(q.toLowerCase())));
  const here = nodesAtFen(game.fen).find((n) => n.theoryId === theory.id);
  const nextBook = here ? here.children.map((c) => getNode(c)!) : [];
  const prog = progress[node.id];
  const visible = (n: CNode) => {
    let p = n.parent ? getNode(n.parent) : null;
    while (p) {
      if (collapsed.has(p.id)) return false;
      p = p.parent ? getNode(p.parent) : null;
    }
    return true;
  };
  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const startLabel = startPly === 0 ? "posição inicial" : `após ${formatLine(START_FEN, targetSan.slice(0, startPly)).split(" ").slice(-1)[0]} (lance ${startPly})`;

  return (
    <div className="page-enter">
      <PageTitle
        title={isGambit ? "Laboratório de Gambitos" : "Estudo de Aberturas"}
        subtitle={
          isGambit
            ? "Escolha um gambito, navegue pela árvore de variantes, selecione a defesa que a IA deve jogar e treine contra o Stockfish. Saia da teoria quando quiser."
            : "Explore as principais aberturas com variantes, ideias e armadilhas — e pratique contra a IA, que segue a linha escolhida."
        }
        right={<Pill color="blue">{theories.length} {isGambit ? "gambitos" : "aberturas"} · {theories.reduce((a, t) => a + countNodes(t.id), 0)} variantes</Pill>}
      />
      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_400px]">
        {/* Biblioteca */}
        <div className="space-y-3 lg:max-h-[calc(100dvh-140px)] lg:overflow-y-auto lg:pr-1">
          <Card title="Biblioteca">
            <input type="text" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
            <Segmented
              className="w-full"
              value={side}
              onChange={setSide}
              options={[{ value: "all", label: "Todos" }, { value: "w", label: "Brancas" }, { value: "b", label: "Pretas" }]}
            />
            <div className="mt-2">
              <Toggle checked={favOnly} onChange={setFavOnly} label="Só favoritos ★" />
            </div>
          </Card>
          <div className="max-h-72 space-y-1.5 overflow-y-auto lg:max-h-none lg:overflow-visible">
            {list.map((t) => {
              const done = Object.entries(progress).filter(([k, v]) => k.startsWith(t.id) && v.completed > 0).length;
              return (
                <div
                  key={t.id}
                  onClick={() => selectTheory(t.id)}
                  className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition", t.id === theoryId ? "border-accent bg-accent/10" : "border-line bg-panel hover:border-mute")}
                >
                  <span className={cn("h-3 w-3 shrink-0 rounded-full", t.side === "w" ? "bg-white" : "bg-neutral-900 ring-1 ring-neutral-500")} title={t.side === "w" ? "Jogado pelas brancas" : "Jogado pelas pretas"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{t.name}</div>
                    <div className="text-[10px] text-mute">{t.eco} · {"●".repeat(t.level)}{"○".repeat(3 - t.level)}{done ? ` · ${done} ✓` : ""}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audio.play("click");
                      setFavs((f) => (f.includes(t.id) ? f.filter((x) => x !== t.id) : [...f, t.id]));
                    }}
                    className={cn("text-lg leading-none", favs.includes(t.id) ? "text-accent" : "text-line hover:text-mute")}
                    aria-label="Favoritar"
                  >
                    ★
                  </button>
                </div>
              );
            })}
            {list.length === 0 && <p className="p-3 text-center text-sm text-mute">Nada encontrado.</p>}
          </div>
        </div>

        {/* Tabuleiro */}
        <div className="space-y-3">
          <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-260px))]">
            <Board fen={game.fen} orientation={theory.side} movable="both" lastMove={game.lastMove} onMove={(f, t, p) => { const r = game.makeMove(f, t, p); if (r) audio.playMove(r, r.san.endsWith("#")); }} />
            <NavControls cursor={game.cursor} total={game.moves.length} onGo={game.goTo} className="mt-2" />
          </div>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-ink">{theory.name}</h2>
              <Pill color="default">{theory.eco}</Pill>
              <Pill color={theory.side === "w" ? "amber" : "violet"}>{theory.side === "w" ? "Brancas" : "Pretas"}</Pill>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-mute">{theory.summary}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-mute">Ideias</div>
                <ul className="list-disc space-y-1 pl-4 text-xs text-ink/80">{theory.ideas.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
              {theory.traps && (
                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-red-300">Armadilhas</div>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-ink/80">{theory.traps.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <Toggle checked={liveOn} onChange={setLiveOn} label="Consultar Stockfish nesta posição" hint="Melhor continuação e avaliação segundo o motor" />
            {liveOn && <div className="mt-3"><EnginePanel fen={game.fen} enabled multipv={3} maxDepth={20} onPlayLine={(u) => { u.forEach((x) => game.playUci(x)); }} /></div>}
          </Card>
        </div>

        {/* Painel direito */}
        <div className="space-y-3">
          <Segmented
            className="w-full"
            value={tab}
            onChange={setTab}
            options={[{ value: "tree", label: "☷ Árvore" }, { value: "train", label: "◉ Treinar" }, { value: "custom", label: "✎ Personalizado" }]}
          />

          {tab === "tree" && (
            <>
              <Card title="Variante selecionada">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{node.title}</span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", KIND[node.kind].cls)}>{KIND[node.kind].label}</span>
                </div>
                <div className="mb-2 rounded-md bg-panel2 p-2 font-mono text-xs leading-relaxed text-ink">{formatLine(START_FEN, node.line)}</div>
                {node.note && <p className="text-xs leading-relaxed text-mute">{node.note}</p>}
                {prog && <p className="mt-2 text-[11px] text-mute">Seu progresso: {prog.attempts} tentativas · {prog.completed} concluídas · {prog.deviations} desvios</p>}
                {nextBook.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-mute">Continuações no livro</div>
                    <div className="flex flex-wrap gap-1.5">
                      {nextBook.map((c) => (
                        <button key={c.id} onClick={() => setNodeId(c.id)} className="rounded-md border border-line bg-panel2 px-2 py-1 text-xs hover:border-accent">
                          <b className="font-mono text-ink">{c.moves[0]}</b> <span className="text-mute">{c.title.slice(0, 26)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Btn variant="primary" onClick={() => setTab("train")}>◉ Treinar esta linha</Btn>
                  <Btn onClick={() => setCompareOpen(true)} disabled={nodes.length < 2}>⚖ Comparar variantes</Btn>
                </div>
              </Card>
              <Card
                title="Árvore de variantes"
                right={
                  <div className="flex gap-1">
                    <button className="rounded px-2 py-1 text-[11px] text-mute hover:bg-panel2" onClick={() => setCollapsed(new Set())}>expandir</button>
                    <button className="rounded px-2 py-1 text-[11px] text-mute hover:bg-panel2" onClick={() => setCollapsed(new Set(nodes.filter((n) => n.children.length).map((n) => n.id)))}>recolher</button>
                  </div>
                }
              >
                <div className="max-h-[420px] overflow-y-auto pr-1">
                  {nodes.filter(visible).map((n) => {
                    const hasKids = n.children.length > 0;
                    const sel = n.id === node.id;
                    const isHere = here?.id === n.id;
                    return (
                      <div key={n.id} className="flex items-start" style={{ paddingLeft: n.depth * 14 }}>
                        <button className={cn("mt-1 w-4 shrink-0 text-xs text-mute", !hasKids && "invisible")} onClick={() => toggleCollapse(n.id)} aria-label="expandir/recolher">
                          {collapsed.has(n.id) ? "▸" : "▾"}
                        </button>
                        <button
                          onClick={() => { setNodeId(n.id); audio.play("click"); }}
                          className={cn("my-0.5 flex-1 rounded-md border px-2 py-1 text-left text-xs transition", sel ? "border-accent bg-accent/15 text-ink" : isHere ? "border-sky-500/40 bg-sky-500/10 text-ink" : "border-transparent text-ink/80 hover:bg-panel2")}
                        >
                          <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: n.kind === "trap" ? "#f87171" : n.kind === "main" ? "#4ade80" : n.kind === "defense" ? "#38bdf8" : n.kind === "decline" ? "#a78bfa" : "#737373" }} />
                          {n.title}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}

          {tab === "train" && (
            <Card title="Configurar treinamento">
              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-mute">{isGambit ? "Defesa / linha que a IA executará" : "Linha que a IA seguirá"}</div>
                  <select value={node.id} onChange={(e) => setNodeId(e.target.value)}>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>{"\u00A0\u00A0".repeat(n.depth)}{n.depth ? "↳ " : ""}{n.title}</option>
                    ))}
                  </select>
                  <div className="mt-1.5 rounded-md bg-panel2 p-2 font-mono text-[11px] leading-relaxed text-mute">{formatLine(START_FEN, targetSan)}</div>
                  <div className="mt-1 text-[11px] text-mute">Caminho: {pathTo(node.id).map((p) => p.title.slice(0, 22)).join(" › ")}</div>
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-mute">Você joga com</div>
                  <Segmented className="w-full" value={tColor} onChange={setTColor} options={[{ value: "w", label: "♔ Brancas" }, { value: "b", label: "♚ Pretas" }]} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] font-bold uppercase tracking-widest text-mute">
                    <span>Posição inicial do treino</span>
                    <span className="normal-case tracking-normal">{startLabel}</span>
                  </div>
                  <input type="range" min={0} max={targetSan.length} value={startPly} onChange={(e) => setStartPly(+e.target.value)} className="w-full accent-[var(--accent)]" />
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Btn size="sm" onClick={() => setStartPly(0)}>Do início</Btn>
                    <Btn size="sm" onClick={() => setStartPly(Math.min(theory.base.split(" ").length, targetSan.length))}>Da base do {isGambit ? "gambito" : "sistema"}</Btn>
                    <Btn size="sm" onClick={() => setStartPly(Math.min(node.ply, targetSan.length))}>Fim da variante</Btn>
                    <Btn size="sm" onClick={() => setStartPly(Math.min(game.cursor, targetSan.length))}>Posição do tabuleiro</Btn>
                  </div>
                </div>
                <Toggle checked={strict} onChange={setStrict} label="Modo teste (teoria obrigatória)" hint="Lances fora da teoria são recusados e contados como erro. Desligado: você pode desviar e a IA continua com Stockfish." />
                <div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-mute">Nível do Stockfish fora da teoria — {getLevel(level).name}</div>
                  <LevelPicker value={level} onChange={setLevel} />
                </div>
                <Btn variant="primary" size="lg" className="w-full" onClick={startTraining}>▶ Iniciar treinamento</Btn>
              </div>
            </Card>
          )}

          {tab === "custom" && (
            <>
              <Card title="Criar treinamento personalizado">
                <div className="space-y-3">
                  <input type="text" placeholder="Nome do treino" value={cName} onChange={(e) => setCName(e.target.value)} />
                  <div>
                    <div className="mb-1 text-[11px] text-mute">Posição inicial (FEN) — vazio = posição padrão</div>
                    <input type="text" placeholder={START_FEN} value={cFen} onChange={(e) => setCFen(e.target.value)} className="font-mono text-xs" />
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] text-mute">Linha teórica (PGN ou lances SAN). A IA seguirá esta sequência.</div>
                    <textarea rows={4} placeholder={"1. e4 e5 2. f4 exf4 3. Nf3 g5"} value={cLine} onChange={(e) => setCLine(e.target.value)} className="font-mono text-xs" />
                  </div>
                  <Segmented className="w-full" value={cSide} onChange={setCSide} options={[{ value: "w", label: "Jogo de brancas" }, { value: "b", label: "Jogo de pretas" }]} />
                  <Toggle checked={strict} onChange={setStrict} label="Modo teste (teoria obrigatória)" />
                  {cErr && <p className="rounded-md bg-red-500/15 p-2 text-xs text-red-300">{cErr}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <Btn variant="primary" onClick={() => { const c = buildCustom(); if (c) { startCustom(c); } }}>▶ Treinar agora</Btn>
                    <Btn onClick={() => { const c = buildCustom(); if (c) { setCustoms((l) => [c, ...l]); setCName(""); audio.play("success"); } }}>▣ Salvar</Btn>
                  </div>
                </div>
              </Card>
              <Card title={`Meus treinos (${customs.length})`}>
                {customs.length === 0 && <p className="text-xs text-mute">Nenhum treino salvo. Eles ficam gravados no seu navegador.</p>}
                <div className="space-y-1.5">
                  {customs.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-lg bg-panel2 p-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{c.name}</div>
                        <div className="text-[10px] text-mute">{c.san.length} lances · {c.side === "w" ? "brancas" : "pretas"}{c.startFen !== START_FEN ? " · FEN própria" : ""}</div>
                      </div>
                      <Btn size="sm" variant="soft" onClick={() => startCustom(c)}>Treinar</Btn>
                      <Btn size="sm" variant="danger" onClick={() => setCustoms((l) => l.filter((x) => x.id !== c.id))}>✕</Btn>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
      <CompareModal open={compareOpen} onClose={() => setCompareOpen(false)} nodes={nodes} a={node} />
    </div>
  );
}

function CompareModal({ open, onClose, nodes, a }: { open: boolean; onClose: () => void; nodes: CNode[]; a: CNode }) {
  const [bId, setBId] = useState<string>("");
  const b = getNode(bId) ?? nodes.find((n) => n.id !== a.id)!;
  const [evals, setEvals] = useState<Record<string, EngineLine | null>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !b) return;
    let alive = true;
    setBusy(true);
    setEvals({});
    (async () => {
      const eng = getEngine("aux");
      for (const n of [a, b]) {
        const r = await eng.search(n.fen, { movetime: 900 });
        if (!alive) return;
        setEvals((e) => ({ ...e, [n.id]: r.lines[0] ?? null }));
      }
      if (alive) setBusy(false);
    })();
    return () => {
      alive = false;
      getEngine("aux").stop();
    };
  }, [open, a, b]);

  if (!open || !b) return null;
  const col = (n: CNode) => (
    <div className="space-y-2">
      <div className="text-sm font-bold text-ink">{n.title}</div>
      <Board fen={n.fen} orientation="w" small lastMove={null} />
      <div className="rounded-md bg-panel2 p-2 font-mono text-[11px] leading-relaxed text-ink">{formatLine(START_FEN, n.line)}</div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-mute">Stockfish:</span>
        <span className="rounded bg-panel2 px-2 py-0.5 font-mono font-bold text-ink">{evals[n.id] ? formatEval(evals[n.id]) : busy ? "…" : "—"}</span>
        {evals[n.id] && <span className="text-xs text-mute">prof. {evals[n.id]!.depth}</span>}
      </div>
      {n.note && <p className="text-xs leading-relaxed text-mute">{n.note}</p>}
    </div>
  );
  return (
    <Modal open={open} onClose={onClose} title="Comparar variantes" wide>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] text-mute">Variante A (selecionada)</div>
          <div className="rounded-md bg-panel2 px-3 py-2 text-sm text-ink">{a.title}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-mute">Variante B</div>
          <select value={b.id} onChange={(e) => setBId(e.target.value)}>
            {nodes.filter((n) => n.id !== a.id).map((n) => (
              <option key={n.id} value={n.id}>{"\u00A0".repeat(n.depth)}{n.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {col(a)}
        {col(b)}
      </div>
      <p className="mt-4 text-[11px] text-mute">Avaliações em centipeões (perspectiva das brancas), calculadas agora pelo Stockfish local ({busy ? "calculando…" : "concluído"}).</p>
    </Modal>
  );
}

// evita aviso de import não usado em builds estritos
void save;
