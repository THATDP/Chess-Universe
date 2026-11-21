import { Btn, Card, Pill } from "../ui/common";
import { useNav } from "../core/nav";
import type { Page } from "../core/nav";
import { getStats } from "../core/storage/db";
import { getTheories, countNodes } from "../data/theory";
import { Board } from "../ui/Board";
import { EngineBadge } from "../ui/EnginePanel";
import { audio } from "../core/audio/audio";

const CARDS: { page: Page; icon: string; title: string; text: string }[] = [
  { page: "play", icon: "♟", title: "Jogar", text: "Clássica, rápida, blitz, bullet ou sem relógio contra 9 níveis reais do Stockfish." },
  { page: "lab", icon: "⚔", title: "Laboratório de Gambitos", text: "22 gambitos com árvore de variantes: escolha a defesa que a IA joga e treine." },
  { page: "openings", icon: "❏", title: "Estudo de Aberturas", text: "Aberturas e defesas principais com ideias, armadilhas e treino contra a IA." },
  { page: "puzzles", icon: "✦", title: "Desafios Táticos", text: "Problemas reais do Lichess com rating adaptativo e dicas." },
  { page: "endgames", icon: "⚑", title: "Treinamento de Finais", text: "Mates básicos, finais de peões e torres contra a IA em força máxima." },
  { page: "analysis", icon: "◎", title: "Análise de Partidas", text: "Precisão, erros, lances brilhantes, gráfico e momentos decisivos." },
  { page: "editor", icon: "✎", title: "Editor de Posições", text: "Monte qualquer posição e jogue, analise ou transforme em treino." },
  { page: "profile", icon: "☰", title: "Perfil", text: "Histórico, estatísticas e progresso salvos no seu navegador." },
];

export default function Home() {
  const { go } = useNav();
  const stats = getStats();
  const gambits = getTheories("gambit");
  const daily = gambits[Math.floor(Date.now() / 86400000) % gambits.length];
  const variants = getTheories().reduce((a, t) => a + countNodes(t.id), 0);

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-panel p-6 md:p-10">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_320px]">
          <div>
            <Pill color="amber">♞ Stockfish 19 · WebAssembly · 100% no navegador</Pill>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-ink md:text-6xl">
              CHESS <span className="text-accent">UNIVERSE</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-mute">
              Plataforma pessoal de xadrez com IA poderosa, laboratório de gambitos, treinamento tático, análise profissional e sons — sem login, sem servidor, sem internet depois de carregar.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Btn variant="primary" size="lg" onClick={() => go("play")}>▶ Jogar agora</Btn>
              <Btn size="lg" onClick={() => go("lab")}>⚔ Laboratório de Gambitos</Btn>
            </div>
            <div className="mt-5"><EngineBadge /></div>
          </div>
          <div className="mx-auto w-full max-w-[320px]">
            <Board fen="r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5" small movable={null} lastMove={{ from: "b1", to: "c3" }} />
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card title="Gambito do dia" className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-xl">
              <div className="text-xl font-black text-ink">{daily.name}</div>
              <p className="mt-1 text-sm text-mute">{daily.summary}</p>
            </div>
            <Btn variant="primary" onClick={() => go("lab", { theoryId: daily.id })}>Estudar →</Btn>
          </div>
        </Card>
        <Card title="Seu progresso">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="text-2xl font-black text-ink">{stats.games}</div><div className="text-[10px] text-mute">partidas</div></div>
            <div><div className="text-2xl font-black text-emerald-300">{stats.wins}</div><div className="text-[10px] text-mute">vitórias</div></div>
            <div><div className="text-2xl font-black text-sky-300">{stats.puzzleRating}</div><div className="text-[10px] text-mute">rating tático</div></div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <button
            key={c.page}
            onClick={() => { audio.play("click"); go(c.page); }}
            className="group rounded-2xl border border-line bg-panel p-5 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-xl hover:shadow-black/30"
          >
            <div className="mb-3 text-3xl">{c.icon}</div>
            <div className="font-bold text-ink group-hover:text-accent">{c.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-mute">{c.text}</p>
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-mute">{variants} variantes teóricas · 135 problemas táticos reais · 12 posições de finais verificadas · tudo salvo localmente.</p>
    </div>
  );
}
