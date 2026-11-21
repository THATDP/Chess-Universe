import { useState } from "react";
import { Btn, Card, PageTitle, Pill } from "../ui/common";
import { deleteGame, getGames, getStats, load } from "../core/storage/db";
import type { LabProgress, EndgameProgress, PuzzleProgress } from "../core/storage/db";
import { useNav } from "../core/nav";
import { parsePgn } from "../core/chess/rules";
import { getNode, getTheory } from "../data/theory";
import { ENDGAMES } from "../data/endgames";

export default function Profile() {
  const { go } = useNav();
  const [games, setGames] = useState(getGames());
  const stats = getStats();
  const lab = load<LabProgress>("labProgress", {});
  const eg = load<EndgameProgress>("endgameProgress", {});
  const pz = load<PuzzleProgress>("puzzleProgress", { solved: [], failed: [] });
  const favG = load<string[]>("favorites:gambit", []);
  const favO = load<string[]>("favorites:opening", []);

  const winRate = stats.games ? Math.round((stats.wins / stats.games) * 100) : 0;
  const open = (id: string) => {
    const g = games.find((x) => x.id === id);
    if (!g) return;
    try {
      const p = parsePgn(g.pgn);
      go("analysis", { game: { startFen: p.startFen, moves: p.moves, headers: p.headers, userColor: g.userColor, id: g.id } });
    } catch {
      /* ignore */
    }
  };
  const labRows = Object.entries(lab)
    .map(([k, v]) => ({ k, v, node: getNode(k), t: getTheory(k.split(".")[0]) }))
    .filter((r) => r.node && r.t)
    .sort((a, b) => b.v.last - a.v.last)
    .slice(0, 10);

  return (
    <div className="page-enter">
      <PageTitle title="Perfil e Estatísticas" subtitle="Seu progresso, salvo localmente neste navegador." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Partidas", stats.games, "text-ink"],
          ["Vitórias", stats.wins, "text-emerald-300"],
          ["Empates", stats.draws, "text-amber-200"],
          ["Derrotas", stats.losses, "text-red-300"],
          ["Aproveitamento", winRate + "%", "text-accent"],
          ["Rating tático", stats.puzzleRating, "text-sky-300"],
          ["Problemas resolvidos", pz.solved.length, "text-emerald-300"],
          ["Análises feitas", stats.analyses, "text-violet-300"],
        ].map(([l, v, c]) => (
          <div key={String(l)} className="rounded-xl border border-line bg-panel p-4">
            <div className={`text-3xl font-black ${c}`}>{v}</div>
            <div className="text-xs text-mute">{l}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Histórico de partidas (${games.length})`}>
          {games.length === 0 && <p className="text-sm text-mute">Nenhuma partida ainda. Jogue contra o Stockfish e ela aparecerá aqui.</p>}
          <div className="max-h-[480px] space-y-1.5 overflow-y-auto pr-1">
            {games.map((g) => {
              const win = (g.result === "1-0" && g.userColor === "w") || (g.result === "0-1" && g.userColor === "b");
              const draw = g.result === "1/2-1/2";
              return (
                <div key={g.id} className="flex items-center gap-2 rounded-lg bg-panel2 p-2.5">
                  <Pill color={draw ? "amber" : win ? "green" : "red"}>{draw ? "Empate" : win ? "Vitória" : "Derrota"}</Pill>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink">{g.white} × {g.black}</div>
                    <div className="text-[11px] text-mute">{new Date(g.date).toLocaleString()} · {g.mode} · {g.moves} lances · {g.reason}{g.accuracy ? ` · precisão ${g.accuracy.w}/${g.accuracy.b}` : ""}</div>
                  </div>
                  <Btn size="sm" onClick={() => open(g.id)}>Analisar</Btn>
                  <Btn size="sm" variant="danger" onClick={() => { deleteGame(g.id); setGames(getGames()); }}>✕</Btn>
                </div>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Por ritmo de jogo">
            {Object.keys(stats.byMode).length === 0 && <p className="text-sm text-mute">Sem dados ainda.</p>}
            <div className="space-y-1.5">
              {Object.entries(stats.byMode).map(([m, v]) => (
                <div key={m} className="flex items-center justify-between rounded-md bg-panel2 px-3 py-2 text-sm">
                  <span className="font-semibold capitalize text-ink">{m}</span>
                  <span className="text-xs text-mute">{v.games} jogos · <span className="text-emerald-300">{v.wins}V</span> <span className="text-amber-200">{v.draws}E</span> <span className="text-red-300">{v.losses}D</span></span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Laboratório de gambitos e aberturas" right={<Btn size="sm" onClick={() => go("lab")}>Abrir</Btn>}>
            <p className="mb-2 text-xs text-mute">Sessões de treino: {stats.labSessions} · Gambitos favoritos: {favG.length} · Aberturas favoritas: {favO.length}</p>
            {labRows.length === 0 && <p className="text-sm text-mute">Nenhum treino realizado.</p>}
            <div className="space-y-1.5">
              {labRows.map((r) => (
                <div key={r.k} className="flex items-center justify-between rounded-md bg-panel2 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate text-ink">{r.t!.name} › {r.node!.title}</span>
                  <span className="ml-2 shrink-0 text-mute">{r.v.attempts}× · <span className="text-emerald-300">{r.v.completed} ✓</span> · {r.v.deviations} desvios</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Finais" right={<Btn size="sm" onClick={() => go("endgames")}>Treinar</Btn>}>
            <div className="space-y-1.5">
              {ENDGAMES.filter((e) => eg[e.id]).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-md bg-panel2 px-3 py-2 text-xs">
                  <span className="text-ink">{e.name}</span>
                  <span className="text-mute">{eg[e.id].success}/{eg[e.id].attempts} concluídos</span>
                </div>
              ))}
              {Object.keys(eg).length === 0 && <p className="text-sm text-mute">Nenhum final treinado ainda.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
