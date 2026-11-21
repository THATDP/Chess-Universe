import { useEffect, useMemo, useState } from "react";
import Board from "../components/Board";
import { Btn, Card, Chip, EngineLines, NavButtons, PageHeader, ProgressBar, inputCls, useNav } from "../components/ui";
import { OPENINGS, NIVEIS, splitLine, type Opening } from "../data/openings";
import { fenFromSans, formatSanLine, START_FEN } from "../lib/chessUtils";
import { markStudied, toggleFavorite, useData } from "../lib/store";
import { Chess } from "chess.js";

type Filter = "todos" | "gb" | "gp" | "outras" | "fav";

export default function OpeningsScreen() {
  const { go, params } = useNav();
  const data = useData();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [selId, setSelId] = useState(params.openingId ?? OPENINGS[0].id);
  const o: Opening = OPENINGS.find((x) => x.id === selId) ?? OPENINGS[0];
  const [lineKey, setLineKey] = useState("main");
  const [ply, setPly] = useState(splitLine(o.moves).length);
  const [engineOn, setEngineOn] = useState(false);

  const lines = useMemo(
    () => [
      { key: "main", nome: "Linha principal", tipo: "Principal", moves: o.moves, texto: o.resumo, aval: o.aval },
      ...o.variantes.map((v, i) => ({ key: "v" + i, nome: v.nome, tipo: v.tipo, moves: v.moves, texto: v.texto, aval: v.aval })),
      ...o.armadilhas.filter((t) => t.moves).map((t, i) => ({ key: "t" + i, nome: "⚠ " + t.nome, tipo: "Armadilha", moves: t.moves, texto: t.texto, aval: undefined })),
    ],
    [o]
  );
  const cur = lines.find((l) => l.key === lineKey) ?? lines[0];
  const seq = splitLine(cur.moves);
  useEffect(() => {
    setLineKey("main");
    setPly(splitLine(o.moves).length);
  }, [o.id, o.moves]);
  const fen = fenFromSans(seq.slice(0, ply), START_FEN) ?? START_FEN;
  const lastMove = useMemo(() => {
    if (!ply) return null;
    try {
      const c = new Chess();
      let m = null;
      for (const s of seq.slice(0, ply)) m = c.move(s);
      return m ? { from: m.from, to: m.to } : null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply, cur.moves]);

  const list = OPENINGS.filter((x) => {
    if (filter === "gb" && !(x.cat === "Gambito" && x.lado === "w")) return false;
    if (filter === "gp" && !(x.cat === "Gambito" && x.lado === "b")) return false;
    if (filter === "outras" && x.cat === "Gambito") return false;
    if (filter === "fav" && !data.favorites.includes(x.id)) return false;
    return (x.nome + x.eco + x.cat + x.resumo).toLowerCase().includes(q.toLowerCase());
  });
  const studied = data.studied[o.id];
  const fav = data.favorites.includes(o.id);
  const total = o.stats.w + o.stats.d + o.stats.b;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="📚 Catálogo de Aberturas e Gambitos" subtitle={`${OPENINGS.length} aberturas · ${OPENINGS.reduce((a, x) => a + x.variantes.length, 1)} linhas teóricas — com explicações, armadilhas, erros comuns, estatísticas e análise do Stockfish.`} />
      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        <Card className="lg:sticky lg:top-4 lg:max-h-[85vh] flex flex-col">
          <input className={inputCls + " mb-2"} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex flex-wrap gap-1 mb-2">
            {([["todos", "Todos"], ["gb", "Gambitos ♔"], ["gp", "Gambitos ♚"], ["outras", "Outras"], ["fav", "★ Favoritos"]] as [Filter, string][]).map(([id, l]) => (
              <button key={id} onClick={() => setFilter(id)} className={`px-2.5 py-1 rounded-lg text-xs ${filter === id ? "bg-emerald-500 text-emerald-950 font-semibold" : "bg-white/10 text-zinc-300 hover:bg-white/15"}`}>{l}</button>
            ))}
          </div>
          <div className="overflow-y-auto space-y-1 pr-1 max-h-[65vh]">
            {list.map((x) => (
              <button key={x.id} onClick={() => setSelId(x.id)} className={`w-full text-left rounded-lg px-3 py-2 border transition ${x.id === o.id ? "border-emerald-400 bg-emerald-400/10" : "border-transparent hover:bg-white/5"}`}>
                <div className="flex items-center gap-1.5 text-sm font-medium">{data.favorites.includes(x.id) && <span className="text-amber-400">★</span>}{x.nome}{data.studied[x.id] && <span className="text-emerald-400 text-xs">✔</span>}</div>
                <div className="text-[11px] text-zinc-500">{x.eco} · {x.cat} · {x.lado === "w" ? "♔" : "♚"} · {NIVEIS[x.nivel]}</div>
              </button>
            ))}
            {list.length === 0 && <p className="text-sm text-zinc-500 p-2">Nada encontrado.</p>}
          </div>
        </Card>

        <div className="space-y-4 min-w-0">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold">{o.nome}</h2>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Chip color="#38bdf8">ECO {o.eco}</Chip>
                  <Chip color="#a78bfa">{o.cat}</Chip>
                  <Chip color="#f59e0b">{NIVEIS[o.nivel]}</Chip>
                  <Chip color={o.evalCp > 40 ? "#e4e4e7" : o.evalCp < -20 ? "#a1a1aa" : "#10b981"}>Avaliação teórica: {o.aval}</Chip>
                  {studied && <Chip color="#10b981">Estudado {studied.count}×</Chip>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn variant="gold" onClick={() => go("lab", { openingId: o.id })}>⚗️ Laboratório</Btn>
                <Btn variant="primary" onClick={() => go("training", { tab: "aberturas", openingId: o.id })}>🎓 Aprender</Btn>
                <Btn onClick={() => toggleFavorite(o.id)}>{fav ? "★ Favorito" : "☆ Favoritar"}</Btn>
                <Btn onClick={() => markStudied(o.id)} title="Marcar como estudado">✔ Estudei</Btn>
                <Btn onClick={() => go("analysis", { pgn: cur.moves, free: true })}>🔬 Estudo livre</Btn>
              </div>
            </div>
          </Card>

          <div className="grid xl:grid-cols-[minmax(280px,420px)_1fr] gap-4">
            <Card title={cur.nome} right={<Chip>{cur.tipo}</Chip>}>
              <Board fen={fen} movable={null} lastMove={lastMove} orientation={o.lado === "b" && cur.tipo !== "Aceito" ? "b" : "w"} />
              <div className="mt-3"><NavButtons ply={ply} max={seq.length} onSet={setPly} /></div>
              <p className="font-mono text-xs text-zinc-300 mt-3 leading-relaxed break-words">{formatSanLine(START_FEN, seq)}</p>
              <p className="text-sm text-zinc-300 mt-2">{cur.texto}</p>
              <label className="flex items-center gap-2 text-xs mt-3 cursor-pointer"><input type="checkbox" className="accent-emerald-400" checked={engineOn} onChange={(e) => setEngineOn(e.target.checked)} /> Mostrar análise do Stockfish desta posição</label>
              {engineOn && <div className="mt-2"><EngineLines fen={fen} multipv={3} /></div>}
            </Card>
            <Card title="Linhas, variantes e armadilhas">
              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                {lines.map((l) => (
                  <button key={l.key} onClick={() => { setLineKey(l.key); setPly(splitLine(l.moves).length); }} className={`w-full text-left rounded-xl border px-3 py-2 transition ${l.key === cur.key ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 hover:bg-white/5"}`}>
                    <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-medium">{l.nome}</span><Chip color={l.tipo === "Aceito" ? "#f59e0b" : l.tipo === "Recusado" ? "#38bdf8" : l.tipo === "Contra-gambito" ? "#f43f5e" : l.tipo === "Armadilha" ? "#fb923c" : "#a78bfa"}>{l.tipo}</Chip>{l.aval && <span className="text-[11px] text-zinc-500">{l.aval}</span>}</div>
                    <div className="text-[11px] font-mono text-zinc-500 truncate">{formatSanLine(START_FEN, splitLine(l.moves))}</div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Explicação estratégica"><p className="text-sm text-zinc-300 leading-relaxed">{o.estrategia}</p></Card>
            <Card title="Objetivos de cada lado">
              <p className="text-sm text-zinc-300"><b className="text-zinc-100">♔ Brancas:</b> {o.objW}</p>
              <p className="text-sm text-zinc-300 mt-2"><b className="text-zinc-100">♚ Pretas:</b> {o.objB}</p>
            </Card>
            <Card title="Armadilhas conhecidas">
              {o.armadilhas.length ? o.armadilhas.map((t) => (
                <div key={t.nome} className="mb-2 text-sm"><b className="text-amber-300">⚠ {t.nome}</b><p className="text-zinc-400">{t.texto}</p></div>
              )) : <p className="text-sm text-zinc-500">Sem armadilhas registradas.</p>}
            </Card>
            <Card title="Erros comuns">
              <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">{o.erros.map((e) => <li key={e}>{e}</li>)}</ul>
              {o.transp.length > 0 && <><h4 className="text-[11px] uppercase tracking-wider text-zinc-500 mt-3 mb-1">Transposições</h4><ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">{o.transp.map((e) => <li key={e}>{e}</li>)}</ul></>}
            </Card>
            <Card title="Estatísticas da posição" className="md:col-span-2">
              <div className="flex h-5 rounded-full overflow-hidden text-[11px] font-bold text-center leading-5">
                <div style={{ width: `${(o.stats.w / total) * 100}%` }} className="bg-zinc-100 text-zinc-900">{o.stats.w}%</div>
                <div style={{ width: `${(o.stats.d / total) * 100}%` }} className="bg-zinc-500 text-white">{o.stats.d}%</div>
                <div style={{ width: `${(o.stats.b / total) * 100}%` }} className="bg-zinc-800 text-zinc-100">{o.stats.b}%</div>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-500 mt-1"><span>Vitórias das brancas</span><span>Empates</span><span>Vitórias das pretas</span></div>
              <p className="text-[11px] text-zinc-500 mt-2">Percentuais aproximados, baseados em estatísticas gerais de partidas de nível de clube/mestre (valores de referência, não de um banco de dados ao vivo). Ative a análise do Stockfish acima para a avaliação real calculada localmente.</p>
              {studied && <div className="mt-3"><ProgressBar value={Math.min(100, studied.count * 20)} /><p className="text-[11px] text-zinc-500 mt-1">Familiaridade: {Math.min(100, studied.count * 20)}%</p></div>}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
