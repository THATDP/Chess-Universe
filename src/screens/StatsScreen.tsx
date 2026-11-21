import { useState } from "react";
import { Btn, Card, Chip, PageHeader, ProgressBar, inputCls, selectCls, useNav } from "../components/ui";
import { goalCurrent, uid, update, useData, type Goal } from "../lib/store";
import { OPENINGS, getOpening } from "../data/openings";
import { PUZZLES, TACTIC_THEMES } from "../data/training";
import { LEVELS, getLevel } from "../lib/levels";
import { toPgn } from "../lib/chessUtils";

const KIND: Record<Goal["kind"], string> = { wins: "Vencer partidas", games: "Jogar partidas", puzzles: "Resolver problemas táticos", gambits: "Estudar gambitos/aberturas", lines: "Dominar linhas (repetição espaçada)" };

export default function StatsScreen() {
  const d = useData();
  const { go } = useNav();
  const [kind, setKind] = useState<Goal["kind"]>("wins");
  const [target, setTarget] = useState(5);
  const sc = d.stats;
  const mastered = Object.entries(d.srs).filter(([, c]) => c.reps >= 3);
  const rate = sc.games ? Math.round((sc.wins / sc.games) * 100) : 0;
  const hist = d.puzzles.history;
  const solvedBy = TACTIC_THEMES.map((t) => {
    const ps = PUZZLES.filter((p) => p.tema === t);
    const ok = ps.filter((p) => (d.puzzles.solved[p.id]?.ok ?? 0) > 0).length;
    return { t, ok, total: ps.length };
  }).filter((x) => x.total > 0);
  const Stat = ({ v, l }: { v: string | number; l: string }) => (
    <div className="rounded-xl bg-black/25 p-3 text-center"><div className="text-2xl font-bold">{v}</div><div className="text-[11px] text-zinc-400">{l}</div></div>
  );
  const chart = () => {
    if (hist.length < 2) return <p className="text-sm text-zinc-500">Resolva alguns problemas para ver sua evolução.</p>;
    const min = Math.min(...hist.map((h) => h.r)) - 20, max = Math.max(...hist.map((h) => h.r)) + 20;
    const pts = hist.map((h, i) => `${(i / (hist.length - 1)) * 400},${100 - ((h.r - min) / (max - min)) * 100}`).join(" ");
    return <svg viewBox="0 0 400 100" className="w-full h-24 bg-zinc-900 rounded-lg" preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="#f59e0b" strokeWidth="2" /></svg>;
  };
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="🏆 Perfil e Progresso" subtitle="Estatísticas, metas e histórico — salvos localmente no seu navegador." />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
        <Stat v={sc.games} l="Partidas" /><Stat v={sc.wins} l="Vitórias" /><Stat v={sc.losses} l="Derrotas" /><Stat v={sc.draws} l="Empates" /><Stat v={`${rate}%`} l="Aproveitamento" /><Stat v={d.puzzles.rating} l="Rating tático" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Resultados por nível da IA">
          {Object.keys(sc.byLevel).length === 0 ? <p className="text-sm text-zinc-500">Jogue contra a IA para registrar resultados.</p> : LEVELS.filter((l) => sc.byLevel[l.id]).map((l) => {
            const r = sc.byLevel[l.id];
            return <div key={l.id} className="flex items-center gap-2 text-sm py-1"><span className="w-36">{l.nome}</span><span className="text-emerald-400">{r.w}V</span><span className="text-zinc-400">{r.d}E</span><span className="text-rose-400">{r.l}D</span></div>;
          })}
        </Card>
        <Card title="Evolução em táticas">
          {chart()}
          <div className="mt-3 space-y-1.5">
            {solvedBy.map((x) => <div key={x.t} className="text-xs"><div className="flex justify-between"><span>{x.t}</span><span className="text-zinc-400">{x.ok}/{x.total}</span></div><ProgressBar value={(x.ok / x.total) * 100} color="#f59e0b" /></div>)}
          </div>
        </Card>
        <Card title="Metas pessoais">
          <div className="space-y-2">
            {d.goals.length === 0 && <p className="text-sm text-zinc-500">Nenhuma meta. Crie uma abaixo.</p>}
            {d.goals.map((g) => {
              const cur = Math.max(0, goalCurrent(d, g.kind) - g.base);
              return <div key={g.id}><div className="flex justify-between text-sm"><span>{KIND[g.kind]}</span><span className="text-zinc-400">{Math.min(cur, g.target)}/{g.target} {cur >= g.target && "✅"} <button className="ml-2 text-rose-400" onClick={() => update((x) => { x.goals = x.goals.filter((y) => y.id !== g.id); })}>✕</button></span></div><ProgressBar value={(cur / g.target) * 100} /></div>;
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as Goal["kind"])}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input type="number" min={1} className={inputCls + " w-20"} value={target} onChange={(e) => setTarget(Math.max(1, +e.target.value))} />
            <Btn variant="primary" onClick={() => update((x) => { x.goals.push({ id: uid(), kind, target, base: goalCurrent(x, kind), created: Date.now() }); })}>+ Meta</Btn>
          </div>
        </Card>
        <Card title="Gambitos e aberturas estudados">
          {Object.keys(d.studied).length === 0 ? <p className="text-sm text-zinc-500">Estude no Laboratório ou no Catálogo para registrar.</p> : (
            <div className="flex flex-wrap gap-1.5">{Object.entries(d.studied).map(([id, s]) => <button key={id} onClick={() => go("openings", { openingId: id })}><Chip color="#10b981">{getOpening(id)?.nome ?? id} · {s.count}×</Chip></button>)}</div>
          )}
          <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 mt-4 mb-1">Aberturas dominadas (3+ acertos seguidos na repetição espaçada)</h4>
          {mastered.length === 0 ? <p className="text-sm text-zinc-500">Ainda nenhuma.</p> : <div className="flex flex-wrap gap-1.5">{mastered.map(([id]) => <Chip key={id} color="#f59e0b">{id.split("::")[0] && getOpening(id.split("::")[0])?.nome}</Chip>)}</div>}
          <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 mt-4 mb-1">Favoritos</h4>
          {d.favorites.length === 0 ? <p className="text-sm text-zinc-500">Marque ★ no catálogo.</p> : <div className="flex flex-wrap gap-1.5">{d.favorites.map((id) => <button key={id} onClick={() => go("openings", { openingId: id })}><Chip color="#f59e0b">★ {OPENINGS.find((o) => o.id === id)?.nome}</Chip></button>)}</div>}
        </Card>
        <Card title={`Histórico de partidas (${d.games.length})`} className="lg:col-span-2">
          {d.games.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma partida registrada ainda.</p> : (
            <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
              {d.games.map((g) => {
                const won = g.result === "1/2-1/2" ? null : g.result === (g.playerColor === "w" ? "1-0" : "0-1");
                return (
                  <div key={g.id} className="flex items-center gap-3 py-2 text-sm flex-wrap">
                    <Chip color={won === null ? "#a1a1aa" : won ? "#10b981" : "#f43f5e"}>{won === null ? "Empate" : won ? "Vitória" : "Derrota"}</Chip>
                    <span>{g.mode}</span><span className="text-zinc-500">vs {getLevel(g.levelId).nome} · {g.sans.length} lances · {g.reason}</span>
                    <span className="text-zinc-600 text-xs">{new Date(g.date).toLocaleString("pt-BR")}</span>
                    <span className="ml-auto flex gap-1">
                      <Btn className="!py-1 !px-2 !text-xs" onClick={() => go("analysis", { pgn: toPgn(g.startFen, g.sans, { White: g.playerColor === "w" ? "Você" : "Stockfish", Black: g.playerColor === "b" ? "Você" : "Stockfish" }, g.result) })}>📊 Analisar</Btn>
                      <Btn className="!py-1 !px-2 !text-xs" onClick={() => update((x) => { x.games = x.games.filter((y) => y.id !== g.id); })}>✕</Btn>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
