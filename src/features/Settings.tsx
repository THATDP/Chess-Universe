import { useRef, useState } from "react";
import { ACCENTS, BOARD_THEMES, UI_THEMES, useSettings } from "../core/settings/settings";
import { Board } from "../ui/Board";
import { Btn, Card, PageTitle, Slider, Toggle } from "../ui/common";
import { PIECE_SETS, pieceUrl } from "../ui/pieces";
import { audio } from "../core/audio/audio";
import type { SoundName } from "../core/audio/audio";
import { clearAll, exportAll, importAll } from "../core/storage/db";
import { ThinkTime } from "../ui/Pickers";
import { cn } from "../utils/cn";
import { useEngineStatus } from "../ui/EnginePanel";
import { getEngine } from "../core/engine/stockfish";

const SOUNDS: { n: SoundName; label: string }[] = [
  { n: "move", label: "Movimento" },
  { n: "capture", label: "Captura" },
  { n: "castle", label: "Roque" },
  { n: "check", label: "Xeque" },
  { n: "checkmate", label: "Xeque-mate" },
  { n: "promote", label: "Promoção" },
  { n: "win", label: "Vitória" },
  { n: "lose", label: "Derrota" },
  { n: "draw", label: "Empate" },
  { n: "click", label: "Interface" },
  { n: "success", label: "Acerto" },
  { n: "error", label: "Erro" },
];

export default function Settings() {
  const { settings: s, update, reset } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const status = useEngineStatus();
  const [testing, setTesting] = useState("");

  const doExport = () => {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chess-universe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setMsg("Backup baixado.");
  };
  const doImport = async (f: File) => {
    const ok = importAll(await f.text());
    setMsg(ok ? "Backup restaurado! Recarregando…" : "Arquivo de backup inválido.");
    if (ok) setTimeout(() => location.reload(), 800);
  };

  const testEngine = async () => {
    setTesting("Testando Stockfish…");
    try {
      const t0 = performance.now();
      const r = await getEngine("aux").search("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", { depth: 12 });
      setTesting(`Stockfish respondeu em ${Math.round(performance.now() - t0)} ms — melhor lance: ${r.best} (profundidade ${r.lines[0]?.depth}, ${Math.round((r.lines[0]?.nps ?? 0) / 1000)} kn/s)`);
    } catch (e) {
      setTesting("Falha: " + (e as Error).message);
    }
  };

  const demoFen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";

  return (
    <div className="page-enter">
      <PageTitle title="Configurações" subtitle="Tudo é salvo automaticamente neste navegador (localStorage) e permanece após fechar a página." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Aparência">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-xs text-mute">Tema do tabuleiro</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BOARD_THEMES).map(([k, t]) => (
                    <button key={k} onClick={() => { audio.play("click"); update({ boardTheme: k }); }} title={t.name} className={cn("h-10 w-10 overflow-hidden rounded-lg border-2", s.boardTheme === k ? "border-accent" : "border-transparent")}>
                      <div className="grid h-full w-full grid-cols-2 grid-rows-2">
                        <div style={{ background: t.light }} /><div style={{ background: t.dark }} /><div style={{ background: t.dark }} /><div style={{ background: t.light }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-mute">Estilo das peças</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PIECE_SETS).map(([k, n]) => (
                    <button key={k} onClick={() => { audio.play("click"); update({ pieceSet: k }); }} className={cn("flex items-center gap-1 rounded-lg border px-2 py-1 text-xs", s.pieceSet === k ? "border-accent bg-accent/15 text-ink" : "border-line bg-panel2 text-mute")}>
                      <img src={pieceUrl(k, "w", "n")} alt="" className="h-7 w-7" />
                      <img src={pieceUrl(k, "b", "q")} alt="" className="h-7 w-7" />
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-mute">Tema da interface</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(UI_THEMES).map(([k, t]) => (
                    <button key={k} onClick={() => { audio.play("click"); update({ uiTheme: k }); }} className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", s.uiTheme === k ? "border-accent text-ink" : "border-line text-mute")} style={{ background: t.panel }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs text-mute">Cor de destaque</div>
                <div className="flex gap-2">
                  {Object.entries(ACCENTS).map(([k, a]) => (
                    <button key={k} title={a.name} onClick={() => { audio.play("click"); update({ accent: k }); }} className={cn("h-8 w-8 rounded-full border-2", s.accent === k ? "border-white" : "border-transparent")} style={{ background: a.color }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mx-auto w-44">
              <Board fen={demoFen} small movable={null} lastMove={{ from: "d1", to: "h5" }} />
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <Toggle checked={s.showLegal} onChange={(v) => update({ showLegal: v })} label="Mostrar movimentos legais" />
            <Toggle checked={s.showCoords} onChange={(v) => update({ showCoords: v })} label="Mostrar coordenadas" />
            <Toggle checked={s.highlightLast} onChange={(v) => update({ highlightLast: v })} label="Destacar último lance" />
            <Toggle checked={s.autoQueen} onChange={(v) => update({ autoQueen: v })} label="Promoção automática para dama" />
            <Slider label="Velocidade da animação" value={s.animationMs} min={0} max={500} step={20} onChange={(v) => update({ animationMs: v })} format={(v) => (v === 0 ? "sem animação" : `${v} ms`)} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Áudio" right={<Btn size="sm" variant={s.muted ? "danger" : "ghost"} onClick={() => update({ muted: !s.muted })}>{s.muted ? "✕ Silenciado" : "♪ Som ligado"}</Btn>}>
            <Slider label="Volume geral" value={s.volMaster} min={0} max={1} step={0.05} onChange={(v) => update({ volMaster: v })} format={(v) => Math.round(v * 100) + "%"} onCommit={() => audio.play("move")} />
            <Slider label="Efeitos das peças" value={s.volSfx} min={0} max={1} step={0.05} onChange={(v) => update({ volSfx: v })} format={(v) => Math.round(v * 100) + "%"} onCommit={() => audio.play("capture")} />
            <Slider label="Interface" value={s.volUi} min={0} max={1} step={0.05} onChange={(v) => update({ volUi: v })} format={(v) => Math.round(v * 100) + "%"} onCommit={() => audio.play("click")} />
            <Slider label="Música ambiente" value={s.volMusic} min={0} max={1} step={0.05} onChange={(v) => update({ volMusic: v })} format={(v) => Math.round(v * 100) + "%"} />
            <Toggle checked={s.musicOn} onChange={(v) => update({ musicOn: v })} label="Música ambiente" hint="Trilha generativa suave criada em tempo real (sem arquivos)" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SOUNDS.map((x) => (
                <Btn key={x.n} size="sm" silent onClick={() => audio.play(x.n)}>{x.label}</Btn>
              ))}
            </div>
          </Card>
          <Card title="Motor de xadrez">
            <ThinkTime value={s.thinkMs} onChange={(v) => update({ thinkMs: v })} />
            <Slider label="Tempo por posição na análise" value={s.analysisMs} min={100} max={3000} step={50} onChange={(v) => update({ analysisMs: v })} format={(v) => `${v} ms`} />
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-panel2 p-3 text-xs text-mute">
              <span>
                Stockfish 19 (lite, single-thread, WASM) — estado: <b className="text-ink">{status.state === "ready" ? `pronto (${status.source === "files" ? "arquivos ./stockfish/" : "embutido"})` : status.state === "error" ? "erro" : status.state === "loading" ? "carregando" : "aguardando uso"}</b>
              </span>
              <Btn size="sm" onClick={testEngine}>Testar</Btn>
            </div>
            {testing && <p className="mt-2 text-xs text-mute">{testing}</p>}
          </Card>
          <Card title="Perfil e dados">
            <div className="mb-3">
              <div className="mb-1 text-xs text-mute">Seu nome</div>
              <input type="text" value={s.playerName} maxLength={24} onChange={(e) => update({ playerName: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={doExport}>↓ Exportar backup</Btn>
              <Btn onClick={() => fileRef.current?.click()}>↑ Importar backup</Btn>
              <Btn onClick={reset}>Restaurar configurações</Btn>
              <Btn variant="danger" onClick={() => { if (confirm("Apagar TODOS os dados salvos (partidas, estatísticas, treinos)?")) { clearAll(); location.reload(); } }}>Apagar tudo</Btn>
            </div>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
            {msg && <p className="mt-2 text-xs text-mute">{msg}</p>}
            <p className="mt-3 text-[11px] leading-relaxed text-mute">Os dados ficam somente neste navegador/dispositivo. Não há sincronização entre dispositivos — use o backup para levar seus dados.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
