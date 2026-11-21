import Board from "../components/Board";
import { Btn, Card, useNav } from "../components/ui";
import { goalCurrent, useData } from "../lib/store";
import { OPENINGS } from "../data/openings";
import { PUZZLES } from "../data/training";

export default function Menu() {
  const { go } = useNav();
  const d = useData();
  const due = Object.values(d.srs).filter((c) => c.due <= Date.now()).length;
  const solved = goalCurrent(d, "puzzles");
  const tiles: { t: string; s: string; icon: string; on: () => void; accent?: string }[] = [
    { t: "Partida Clássica", s: "15+10 contra o Stockfish", icon: "♔", on: () => go("play", { tab: "classica" }) },
    { t: "Partida Rápida", s: "10 minutos", icon: "⚡", on: () => go("play", { tab: "rapida" }) },
    { t: "Blitz", s: "3+2", icon: "🔥", on: () => go("play", { tab: "blitz" }) },
    { t: "Bullet", s: "1 minuto", icon: "🚀", on: () => go("play", { tab: "bullet" }) },
    { t: "Sem limite de tempo", s: "Jogue com calma", icon: "♾️", on: () => go("play", { tab: "livre" }) },
    { t: "Laboratório de Gambitos", s: "Escolha a defesa e teste ataques", icon: "⚗️", on: () => go("lab"), accent: "from-amber-400/20 to-amber-600/5 border-amber-400/40" },
    { t: "Catálogo de Aberturas", s: `${OPENINGS.length} aberturas e gambitos`, icon: "📚", on: () => go("openings") },
    { t: "Treino de Tática", s: `${PUZZLES.length} problemas verificados`, icon: "🧩", on: () => go("training", { tab: "tatica" }) },
    { t: "Treino Estratégico", s: "Centro, peões, casas fracas…", icon: "🏰", on: () => go("training", { tab: "estrategia" }) },
    { t: "Treino de Aberturas", s: due ? `${due} revisões pendentes` : "Repetição espaçada", icon: "🎓", on: () => go("training", { tab: "aberturas" }) },
    { t: "Finais de Jogo", s: "Mates básicos e técnicas", icon: "👑", on: () => go("training", { tab: "finais" }) },
    { t: "Análise de Partidas", s: "Relatório completo com Stockfish", icon: "📊", on: () => go("analysis") },
    { t: "Estudo Livre", s: "Tabuleiro com motor ao vivo", icon: "🔬", on: () => go("analysis", { free: true }) },
    { t: "Posições Personalizadas", s: "Crie, resolva e salve", icon: "🛠️", on: () => go("training", { tab: "custom" }) },
  ];
  return (
    <div className="max-w-6xl mx-auto">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-900/30 via-zinc-900/60 to-violet-900/30 p-6 sm:p-10 mb-6">
        <div className="grid md:grid-cols-[1fr_320px] gap-8 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80 mb-3">Stockfish 19 · WebAssembly · 100% local</p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-amber-100 to-emerald-300 bg-clip-text text-transparent">CHESS<br />UNIVERSE</h1>
            <p className="mt-4 text-zinc-300 max-w-lg">Plataforma pessoal de xadrez com IA de nível super-humano e o laboratório de gambitos mais completo: escolha a defesa, teste ataques, volte no tempo e compare linhas.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Btn variant="gold" className="!px-6 !py-3" onClick={() => go("play")}>♞ Jogar agora</Btn>
              <Btn className="!px-6 !py-3" onClick={() => go("lab")}>⚗️ Laboratório de Gambitos</Btn>
            </div>
            <div className="flex gap-6 mt-6 text-sm text-zinc-400">
              <span><b className="text-white text-lg">{d.stats.games}</b> partidas</span>
              <span><b className="text-white text-lg">{d.stats.wins}</b> vitórias</span>
              <span><b className="text-white text-lg">{solved}</b> problemas</span>
              <span><b className="text-white text-lg">{Object.keys(d.studied).length}</b> gambitos estudados</span>
            </div>
          </div>
          <div className="hidden md:block floaty">
            <Board fen="r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4" movable={null} coords={false} />
          </div>
        </div>
      </section>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <button key={t.t} onClick={t.on} className={`group text-left rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 bg-gradient-to-br ${t.accent ?? "from-white/[0.06] to-white/[0.02] border-white/10 hover:border-white/25"}`}>
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform origin-left">{t.icon}</div>
            <div className="font-semibold">{t.t}</div>
            <div className="text-xs text-zinc-400">{t.s}</div>
          </button>
        ))}
      </div>
      <Card className="mt-6" title="Como funciona">
        <p className="text-sm text-zinc-400 leading-relaxed">Todo o processamento roda no seu navegador: regras oficiais via chess.js e motor Stockfish 19 (versão WebAssembly). Seu progresso, partidas, estatísticas e treinos ficam salvos localmente (localStorage). Nenhum servidor é necessário.</p>
      </Card>
    </div>
  );
}
