import { useEffect, useState } from "react";
import { BarChart3, BookOpen, FlaskConical, GraduationCap, Home, Microscope, Settings as Cog, Swords, Trophy } from "lucide-react";
import { NavCtx, type NavParams, type Screen } from "./components/ui";
import { getEngine } from "./lib/engine";
import { play, setVolumes, unlockAudio } from "./lib/sound";
import { useSettings } from "./lib/store";
import Menu from "./screens/Menu";
import PlayScreen from "./screens/PlayScreen";
import LabScreen from "./screens/LabScreen";
import OpeningsScreen from "./screens/OpeningsScreen";
import TrainingScreen from "./screens/TrainingScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import StatsScreen from "./screens/StatsScreen";
import SettingsScreen from "./screens/SettingsScreen";

const NAV: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: "menu", label: "Início", icon: Home },
  { id: "play", label: "Jogar", icon: Swords },
  { id: "lab", label: "Laboratório", icon: FlaskConical },
  { id: "openings", label: "Aberturas", icon: BookOpen },
  { id: "training", label: "Treino", icon: GraduationCap },
  { id: "analysis", label: "Análise", icon: Microscope },
  { id: "stats", label: "Perfil", icon: Trophy },
  { id: "settings", label: "Ajustes", icon: Cog },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [params, setParams] = useState<NavParams>({});
  const [nonce, setNonce] = useState(0);
  const [engine, setEngine] = useState<"loading" | "ready" | "error">("loading");
  const s = useSettings();

  const go = (sc: Screen, p: NavParams = {}) => {
    play("transition");
    setParams(p);
    setScreen(sc);
    setNonce((n) => n + 1);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const e = getEngine("play");
    getEngine("analysis");
    getEngine("live");
    const t = setInterval(() => {
      if (e.failed) setEngine("error");
      else if (e.isReady) setEngine("ready");
    }, 400);
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => clearInterval(t);
  }, []);
  useEffect(() => setVolumes(s.sfx, s.music, s.muted), [s.sfx, s.music, s.muted]);

  const Active = { menu: Menu, play: PlayScreen, lab: LabScreen, openings: OpeningsScreen, training: TrainingScreen, analysis: AnalysisScreen, stats: StatsScreen, settings: SettingsScreen }[screen];

  return (
    <NavCtx.Provider value={{ go, params }}>
      <div className="min-h-full flex flex-col md:flex-row">
        <aside className="hidden md:flex w-[76px] lg:w-56 shrink-0 flex-col border-r border-white/5 bg-black/30 backdrop-blur-xl sticky top-0 h-screen">
          <button onClick={() => go("menu")} className="flex items-center gap-2 px-4 py-5 text-left">
            <span className="text-3xl leading-none">♞</span>
            <span className="hidden lg:block leading-tight">
              <span className="block text-[15px] font-extrabold tracking-wide bg-gradient-to-r from-amber-200 to-emerald-300 bg-clip-text text-transparent">CHESS UNIVERSE</span>
              <span className="block text-[10px] text-zinc-500">Plataforma de xadrez</span>
            </span>
          </button>
          <nav className="flex-1 px-2 space-y-1">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${screen === n.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                <n.icon size={18} />
                <span className="hidden lg:block">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 text-[11px] text-zinc-500 hidden lg:block">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${engine === "ready" ? "bg-emerald-400" : engine === "error" ? "bg-rose-500" : "bg-amber-400 animate-pulse"}`} />
              {engine === "ready" ? "Stockfish 19 (WASM) pronto" : engine === "error" ? "Erro ao carregar o motor" : "Carregando Stockfish…"}
            </div>
          </div>
        </aside>
        <main key={nonce} className="screen-enter flex-1 min-w-0 p-3 sm:p-5 pb-24 md:pb-6">
          <Active />
        </main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex justify-around bg-black/80 backdrop-blur-xl border-t border-white/10 py-1.5">
          {NAV.filter((n) => ["menu", "play", "lab", "training", "stats"].includes(n.id)).map((n) => (
            <button key={n.id} onClick={() => go(n.id)} className={`flex flex-col items-center text-[10px] px-3 py-1 rounded-lg ${screen === n.id ? "text-emerald-300" : "text-zinc-400"}`}>
              <n.icon size={20} />
              {n.label}
            </button>
          ))}
          <button onClick={() => go("openings")} className={`flex flex-col items-center text-[10px] px-3 py-1 ${screen === "openings" ? "text-emerald-300" : "text-zinc-400"}`}>
            <BookOpen size={20} />
            Aberturas
          </button>
          <button onClick={() => go("settings")} className={`flex flex-col items-center text-[10px] px-3 py-1 ${screen === "settings" ? "text-emerald-300" : "text-zinc-400"}`}>
            <Cog size={20} />
            Ajustes
          </button>
        </nav>
        <BarChart3 className="hidden" />
      </div>
    </NavCtx.Provider>
  );
}
