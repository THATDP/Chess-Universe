import { useRef, useState } from "react";
import Board from "../components/Board";
import { Btn, Card, Field, PageHeader, Segmented, selectCls, useNav } from "../components/ui";
import { BOARD_THEMES, PIECE_THEMES } from "../lib/themes";
import { DEFAULT_SETTINGS, getData, importData, resetAll, setSetting, update, useSettings } from "../lib/store";
import { LEVELS, STYLES } from "../lib/levels";
import { play } from "../lib/sound";

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer text-sm">
    <span>{label}</span>
    <button type="button" onClick={() => { play("click"); onChange(!value); }} className={`w-11 h-6 rounded-full transition relative ${value ? "bg-emerald-500" : "bg-zinc-700"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
    </button>
  </label>
);

export default function SettingsScreen() {
  const s = useSettings();
  const { go } = useNav();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const exportData = () => {
    const blob = new Blob([JSON.stringify(getData(), null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "chess-universe-backup.json";
    a.click();
  };
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="⚙️ Configurações" subtitle="Aparência, sons e preferências da IA. Tudo é salvo automaticamente no seu navegador." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Tema do tabuleiro">
          <div className="grid grid-cols-3 gap-2">
            {BOARD_THEMES.map((t) => {
              const l = t.id === "custom" ? s.customLight : t.light, d = t.id === "custom" ? s.customDark : t.dark;
              return (
                <button key={t.id} onClick={() => setSetting("boardTheme", t.id)} className={`rounded-xl p-1.5 border text-xs ${s.boardTheme === t.id ? "border-emerald-400" : "border-white/10 hover:border-white/30"}`}>
                  <div className="grid grid-cols-4 rounded overflow-hidden mb-1">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square" style={{ background: (i + Math.floor(i / 4)) % 2 ? d : l }} />)}</div>
                  {t.nome}
                </button>
              );
            })}
          </div>
          {s.boardTheme === "custom" && (
            <div className="flex gap-4 mt-3">
              <Field label="Casas claras"><input type="color" value={s.customLight} onChange={(e) => setSetting("customLight", e.target.value)} className="w-16 h-9 bg-transparent" /></Field>
              <Field label="Casas escuras"><input type="color" value={s.customDark} onChange={(e) => setSetting("customDark", e.target.value)} className="w-16 h-9 bg-transparent" /></Field>
            </div>
          )}
        </Card>
        <Card title="Tema das peças">
          <div className="grid grid-cols-3 gap-2">
            {PIECE_THEMES.map((t) => (
              <button key={t.id} onClick={() => setSetting("pieceTheme", t.id)} className={`rounded-xl p-1.5 border text-xs ${s.pieceTheme === t.id ? "border-emerald-400" : "border-white/10 hover:border-white/30"}`}>
                <div className="flex justify-center bg-zinc-700/60 rounded mb-1">
                  <PieceTheme id={t.id} />
                </div>
                {t.nome}
              </button>
            ))}
          </div>
          {s.pieceTheme === "custom" && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {([["customWFill", "Preenchimento brancas"], ["customWStroke", "Contorno brancas"], ["customBFill", "Preenchimento pretas"], ["customBStroke", "Contorno pretas"]] as const).map(([k, l]) => (
                <Field key={k} label={l}><input type="color" value={s[k]} onChange={(e) => setSetting(k, e.target.value)} className="w-16 h-9 bg-transparent" /></Field>
              ))}
            </div>
          )}
          <div className="max-w-[220px] mx-auto mt-4"><Board fen="r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3" movable={null} lastMove={{ from: "g1", to: "f3" }} /></div>
        </Card>
        <Card title="Tabuleiro e animações">
          <Toggle label="Mostrar coordenadas" value={s.coords} onChange={(v) => setSetting("coords", v)} />
          <Toggle label="Mostrar movimentos legais" value={s.legalMoves} onChange={(v) => setSetting("legalMoves", v)} />
          <Toggle label="Destacar último lance" value={s.highlightLast} onChange={(v) => setSetting("highlightLast", v)} />
          <Toggle label="Animações das peças" value={s.animations} onChange={(v) => setSetting("animations", v)} />
          <Toggle label="Promover automaticamente a dama" value={s.autoQueen} onChange={(v) => setSetting("autoQueen", v)} />
        </Card>
        <Card title="Som">
          <Toggle label="Silenciar tudo" value={s.muted} onChange={(v) => setSetting("muted", v)} />
          <Field label={`Efeitos sonoros: ${Math.round(s.sfx * 100)}%`}><input type="range" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => setSetting("sfx", +e.target.value)} onPointerUp={() => play("capture")} className="w-full accent-emerald-400" /></Field>
          <div className="mt-2"><Field label={`Música ambiente: ${Math.round(s.music * 100)}%`}><input type="range" min={0} max={1} step={0.05} value={s.music} onChange={(e) => setSetting("music", +e.target.value)} className="w-full accent-emerald-400" /></Field></div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(["move", "capture", "check", "castle", "promote", "mate", "win", "lose", "draw"] as const).map((n) => <button key={n} onClick={() => play(n)} className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs">▶ {({ move: "Lance", capture: "Captura", check: "Xeque", castle: "Roque", promote: "Promoção", mate: "Mate", win: "Vitória", lose: "Derrota", draw: "Empate" })[n]}</button>)}
          </div>
        </Card>
        <Card title="IA e análise (padrões)">
          <div className="space-y-3">
            <Field label="Nível padrão"><select className={selectCls} value={s.defaultLevel} onChange={(e) => setSetting("defaultLevel", e.target.value)}>{LEVELS.map((l) => <option key={l.id} value={l.id}>{l.nome} (~{l.elo})</option>)}</select></Field>
            <Field label="Estilo padrão"><select className={selectCls} value={s.defaultStyle} onChange={(e) => setSetting("defaultStyle", e.target.value)}>{STYLES.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Field>
            <Field label={`Tempo de reflexão padrão: ${(s.thinkTime / 1000).toFixed(1)}s`}><input type="range" min={200} max={10000} step={100} value={s.thinkTime} onChange={(e) => setSetting("thinkTime", +e.target.value)} className="w-full accent-emerald-400" /></Field>
            <Field label="Profundidade da análise de partidas"><Segmented value={String(s.analysisDepth)} onChange={(v) => setSetting("analysisDepth", +v)} options={[{ id: "10", label: "Rápida (10)" }, { id: "12", label: "Normal (12)" }, { id: "16", label: "Profunda (16)" }]} /></Field>
          </div>
        </Card>
        <Card title="Dados locais">
          <div className="flex flex-wrap gap-2">
            <Btn onClick={exportData}>⬇ Exportar backup</Btn>
            <Btn onClick={() => file.current?.click()}>⬆ Importar backup</Btn>
            <Btn variant="danger" onClick={() => { if (confirm("Apagar TODO o progresso, partidas e configurações?")) { resetAll(); setMsg("Dados apagados."); } }}>🗑 Apagar tudo</Btn>
            <Btn onClick={() => { update((d) => { d.settings = { ...DEFAULT_SETTINGS }; }); setMsg("Configurações restauradas."); }}>Restaurar padrões</Btn>
            <input ref={file} type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setMsg(importData(await f.text()) ? "Backup importado com sucesso." : "Arquivo inválido."); }} />
          </div>
          {msg && <p className="text-sm text-emerald-400 mt-2">{msg}</p>}
          <p className="text-xs text-zinc-500 mt-3">Tudo é salvo em localStorage do navegador. Stockfish 19 (lite, WebAssembly) executado localmente; chess.js para as regras.</p>
          <Btn className="mt-3" onClick={() => go("menu")}>⟵ Voltar ao início</Btn>
        </Card>
      </div>
    </div>
  );
}

function PieceTheme({ id }: { id: string }) {
  // pré-visualização de um tema específico sem alterar o global
  const t = PIECE_THEMES.find((x) => x.id === id)!;
  return <ThemedPieces theme={t} />;
}
import { pieceUrl, type PieceTheme as PT } from "../lib/themes";
import { useSettings as useS } from "../lib/store";
function ThemedPieces({ theme }: { theme: PT }) {
  const s = useS();
  const th = theme.id === "custom" ? { ...theme, wFill: s.customWFill, wStroke: s.customWStroke, bFill: s.customBFill, bStroke: s.customBStroke } : theme;
  return (
    <>
      <img src={pieceUrl(th, "w", "n")} className="w-9 h-9" alt="" />
      <img src={pieceUrl(th, "b", "q")} className="w-9 h-9" alt="" />
    </>
  );
}
