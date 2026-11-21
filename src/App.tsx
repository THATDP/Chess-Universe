import { Component, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SettingsProvider, useSettings } from "./core/settings/settings";
import { NavContext } from "./core/nav";
import type { NavParams, Page } from "./core/nav";
import { audio } from "./core/audio/audio";
import { getEngine } from "./core/engine/stockfish";
import { EngineBadge } from "./ui/EnginePanel";
import Home from "./features/Home";
import Play from "./features/Play";
import TheoryLab from "./features/lab/TheoryLab";
import Puzzles from "./features/Puzzles";
import Endgames from "./features/Endgames";
import Analysis from "./features/Analysis";
import Editor from "./features/Editor";
import Profile from "./features/Profile";
import Settings from "./features/Settings";
import { cn } from "./utils/cn";

const NAV: { page: Page; icon: string; label: string }[] = [
  { page: "home", icon: "⌂", label: "Início" },
  { page: "play", icon: "♟", label: "Jogar" },
  { page: "lab", icon: "⚔", label: "Gambitos" },
  { page: "openings", icon: "❏", label: "Aberturas" },
  { page: "puzzles", icon: "✦", label: "Táticas" },
  { page: "endgames", icon: "⚑", label: "Finais" },
  { page: "analysis", icon: "◎", label: "Análise" },
  { page: "editor", icon: "✎", label: "Editor" },
  { page: "profile", icon: "☰", label: "Perfil" },
  { page: "settings", icon: "⚙", label: "Ajustes" },
];

class Boundary extends Component<{ children: ReactNode; reset: () => void }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err)
      return (
        <div className="mx-auto max-w-lg rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center">
          <div className="text-lg font-bold text-red-200">Algo deu errado nesta tela</div>
          <p className="mt-2 text-sm text-mute">{this.state.err.message}</p>
          <button className="mt-4 rounded-lg bg-accent px-4 py-2 font-bold text-accent-ink" onClick={() => { this.setState({ err: null }); this.props.reset(); }}>
            Voltar ao início
          </button>
        </div>
      );
    return this.props.children;
  }
}

function Shell() {
  const [page, setPage] = useState<Page>(() => (localStorage.getItem("chessuniverse:v1:page") as Page) || "home");
  const [params, setParams] = useState<NavParams>({});
  const [menu, setMenu] = useState(false);
  const { settings, update } = useSettings();

  const go = useCallback((p: Page, pr: NavParams = {}) => {
    setParams(pr);
    setPage(p);
    setMenu(false);
    localStorage.setItem("chessuniverse:v1:page", p);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    // pré-carrega o Stockfish em segundo plano para a primeira jogada ser instantânea
    const t = window.setTimeout(() => void getEngine("play").init().catch(() => undefined), 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    document.title = "Chess Universe — Xadrez com Stockfish, Gambitos e Análise";
  }, []);

  const ctx = useMemo(() => ({ page, params, go }), [page, params, go]);
  // chave muda quando params mudam para remontar a tela com novos dados
  const pageKey = page + JSON.stringify(Object.keys(params)) + (params.theoryId ?? "") + (params.fen ?? "") + (params.customFen ?? "") + (params.game ? "g" + params.game.moves.length + params.game.startFen : "");

  let view: ReactNode;
  switch (page) {
    case "play":
      view = <Play key={pageKey} />;
      break;
    case "lab":
      view = <TheoryLab key={pageKey} kind="gambit" />;
      break;
    case "openings":
      view = <TheoryLab key={pageKey} kind="opening" />;
      break;
    case "puzzles":
      view = <Puzzles />;
      break;
    case "endgames":
      view = <Endgames />;
      break;
    case "analysis":
      view = <Analysis key={pageKey} />;
      break;
    case "editor":
      view = <Editor />;
      break;
    case "profile":
      view = <Profile />;
      break;
    case "settings":
      view = <Settings />;
      break;
    default:
      view = <Home />;
  }

  const side = (
    <nav className="flex h-full flex-col">
      <button onClick={() => go("home")} className="mb-6 flex items-center gap-3 px-2 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-2xl text-accent-ink shadow-lg shadow-black/40">♞</span>
        <span className="leading-tight">
          <span className="block text-sm font-black tracking-widest text-ink">CHESS</span>
          <span className="block text-sm font-black tracking-widest text-accent">UNIVERSE</span>
        </span>
      </button>
      <div className="space-y-1">
        {NAV.map((n) => (
          <button
            key={n.page}
            onClick={() => { audio.play("click"); go(n.page); }}
            className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition", page === n.page ? "bg-accent text-accent-ink shadow-md" : "text-mute hover:bg-panel2 hover:text-ink")}
          >
            <span className="w-5 text-center">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>
      <div className="mt-auto space-y-3 pt-6">
        <button
          onClick={() => update({ muted: !settings.muted })}
          className="flex w-full items-center justify-between rounded-lg border border-line bg-panel px-3 py-2 text-xs text-mute hover:text-ink"
        >
          <span>{settings.muted ? "✕ Som desligado" : "♪ Som ligado"}</span>
          <span className="text-[10px]">clique p/ {settings.muted ? "ativar" : "silenciar"}</span>
        </button>
        <button
          onClick={() => update({ musicOn: !settings.musicOn, muted: false })}
          className="flex w-full items-center justify-between rounded-lg border border-line bg-panel px-3 py-2 text-xs text-mute hover:text-ink"
        >
          <span>♫ Música ambiente</span>
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", settings.musicOn ? "bg-accent text-accent-ink" : "bg-panel2")}>{settings.musicOn ? "ON" : "OFF"}</span>
        </button>
        <div className="px-1"><EngineBadge /></div>
      </div>
    </nav>
  );

  return (
    <NavContext.Provider value={ctx}>
      <div className="flex min-h-full">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-line bg-bg/80 p-4 backdrop-blur lg:block">{side}</aside>
        {menu && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMenu(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <aside className="absolute left-0 top-0 h-full w-64 border-r border-line bg-bg p-4" onClick={(e) => e.stopPropagation()}>{side}</aside>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur lg:hidden">
            <button onClick={() => setMenu(true)} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-lg" aria-label="Menu">☰</button>
            <span className="text-sm font-black tracking-widest text-ink">CHESS <span className="text-accent">UNIVERSE</span></span>
            <button onClick={() => update({ muted: !settings.muted })} className="rounded-lg border border-line bg-panel px-3 py-1.5" aria-label="Som">{settings.muted ? "✕" : "♪"}</button>
          </header>
          <main className="mx-auto w-full max-w-[1500px] p-4 md:p-6">
            <Boundary reset={() => go("home")} key={pageKey}>{view}</Boundary>
          </main>
        </div>
      </div>
    </NavContext.Provider>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}
