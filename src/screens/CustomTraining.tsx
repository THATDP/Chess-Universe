import { useState } from "react";
import { Chess } from "chess.js";
import { PieceImg } from "../components/Board";
import MoveQuiz from "../components/MoveQuiz";
import { Btn, Card, Chip, Field, Segmented, inputCls, selectCls, useNav } from "../components/ui";
import { PlayGame } from "./PlayScreen";
import { LEVELS } from "../lib/levels";
import { analyzeFen } from "../lib/engine";
import { FILES, START_FEN, lineCp, sanFromUci, scoreWhite, winPct } from "../lib/chessUtils";
import { uid, update, useData, type CustomExercise } from "../lib/store";

type Cell = string | null;
const PALETTE = ["wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"];

function fenToBoard(fen: string): Cell[] {
  const out: Cell[] = [];
  for (const row of fen.split(" ")[0].split("/"))
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) out.push(null);
      else out.push((ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase());
    }
  return out;
}
function boardToFen(b: Cell[], turn: "w" | "b", cast: string): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let s = "", e = 0;
    for (let f = 0; f < 8; f++) {
      const c = b[r * 8 + f];
      if (!c) e++;
      else { if (e) s += e; e = 0; s += c[0] === "w" ? c[1] : c[1].toLowerCase(); }
    }
    rows.push(s + (e || ""));
  }
  return `${rows.join("/")} ${turn} ${cast || "-"} - 0 1`;
}

export default function CustomTraining() {
  const d = useData();
  const { go } = useNav();
  const [board, setBoard] = useState<Cell[]>(fenToBoard(START_FEN));
  const [sel, setSel] = useState<string | null>("wP");
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [cast, setCast] = useState("KQkq");
  const [name, setName] = useState("Meu exercício");
  const [objective, setObjective] = useState<CustomExercise["objective"]>("win");
  const [mateIn, setMateIn] = useState(2);
  const [fenIn, setFenIn] = useState("");
  const [msg, setMsg] = useState("");
  const [levelId, setLevelId] = useState("gm");
  const [solving, setSolving] = useState<CustomExercise | null>(null);
  const [sk, setSk] = useState(0);

  const fen = boardToFen(board, turn, cast);
  const valid = (() => { try { new Chess(fen); return true; } catch { return false; } })();

  const click = (i: number) => setBoard((b) => { const n = [...b]; n[i] = sel === null || n[i] === sel ? null : sel; return n; });
  const objText = (e: CustomExercise) => e.objective === "win" ? "Vença a partida." : e.objective === "draw" ? "Salve o empate (ou vença)." : e.objective === "mate" ? `Dê xeque-mate (em até ${e.mateIn ?? 2} lances, se possível).` : "Encontre o melhor lance.";

  if (solving) {
    const e = solving;
    return (
      <div>
        <Btn className="mb-3" onClick={() => setSolving(null)}>⟵ Voltar aos exercícios</Btn>
        {e.objective === "best" ? (
          <div className="grid md:grid-cols-[minmax(280px,480px)_1fr] gap-4 items-start">
            <MoveQuiz key={e.id + sk} fen={e.fen} accept={async (uci, san, f) => {
              const b = await analyzeFen(f, 15, 1);
              const c = new Chess(f); c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
              const a = await analyzeFen(c.fen(), 15, 1);
              if (!a || !b) return { ok: false, msg: "Motor indisponível." };
              const t = f.split(" ")[1]; const w = (r: typeof a, ff: string) => { const x = lineCp(scoreWhite(ff, r.lines[0])); return winPct(t === "w" ? x : -x); };
              const loss = w(b, f) - w(a, c.fen()); const best = sanFromUci(f, b.lines[0].pv[0]);
              return loss <= 4 ? { ok: true, msg: `Correto! ${san} (melhor: ${best}).` } : { ok: false, msg: `Perde ${loss.toFixed(0)}%. O Stockfish prefere ${best}.` };
            }} />
            <Card title={e.name}><p className="text-sm">{objText(e)}</p>{e.note && <p className="text-xs text-zinc-500 mt-2">{e.note}</p>}</Card>
          </div>
        ) : (
          <PlayGame key={e.id + sk} startFen={e.fen} playerColor={e.toMove} cfg={{ levelId, styleId: "equilibrado", movetime: 800, depth: 0, elo: 0 }} tc={null} modeLabel={`Exercício: ${e.name}`} objective={objText(e)} save={false} onExit={() => setSolving(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[minmax(300px,520px)_1fr] gap-5 items-start">
      <div>
        <div className="grid grid-cols-8 rounded-lg overflow-hidden ring-1 ring-white/10 shadow-xl">
          {board.map((c, i) => (
            <button key={i} onClick={() => click(i)} className={`aspect-square flex items-center justify-center ${(Math.floor(i / 8) + (i % 8)) % 2 ? "bg-[#6f9a52]" : "bg-[#eeeed2]"} hover:brightness-110 relative`}>
              {c && <PieceImg color={c[0] as "w" | "b"} type={c[1]} className="w-full h-full" />}
              {i % 8 === 0 && <span className="absolute left-0.5 top-0 text-[9px] text-black/50">{8 - Math.floor(i / 8)}</span>}
              {i >= 56 && <span className="absolute right-0.5 bottom-0 text-[9px] text-black/50">{FILES[i % 8]}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mt-3 justify-center">
          {PALETTE.map((p) => <button key={p} onClick={() => setSel(p)} className={`w-11 h-11 rounded-lg ${sel === p ? "bg-emerald-400/30 ring-2 ring-emerald-400" : "bg-white/10 hover:bg-white/20"}`}><PieceImg color={p[0] as "w" | "b"} type={p[1]} className="w-full h-full" /></button>)}
          <button onClick={() => setSel(null)} className={`w-11 h-11 rounded-lg text-lg ${sel === null ? "bg-rose-400/30 ring-2 ring-rose-400" : "bg-white/10 hover:bg-white/20"}`} title="Borracha">🧽</button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          <Btn onClick={() => setBoard(fenToBoard(START_FEN))}>Posição inicial</Btn>
          <Btn onClick={() => setBoard(Array(64).fill(null))}>Limpar</Btn>
        </div>
      </div>
      <div className="space-y-4">
        <Card title="Configurar posição">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Quem joga"><Segmented value={turn} onChange={setTurn} options={[{ id: "w", label: "Brancas" }, { id: "b", label: "Pretas" }]} /></Field>
            <Field label="Roques permitidos">
              <div className="flex gap-3 text-sm pt-2">{["K", "Q", "k", "q"].map((c) => <label key={c} className="flex gap-1"><input type="checkbox" className="accent-emerald-400" checked={cast.includes(c)} onChange={(e) => setCast((x) => (e.target.checked ? x + c : x.replace(c, "")))} />{c === "K" ? "O-O ♔" : c === "Q" ? "O-O-O ♔" : c === "k" ? "O-O ♚" : "O-O-O ♚"}</label>)}</div>
            </Field>
            <Field label="Objetivo"><select className={selectCls} value={objective} onChange={(e) => setObjective(e.target.value as CustomExercise["objective"])}><option value="win">Vencer</option><option value="draw">Empatar</option><option value="mate">Mate em N</option><option value="best">Encontrar o melhor lance</option></select></Field>
            {objective === "mate" && <Field label="Mate em quantos lances?"><input type="number" min={1} max={6} className={inputCls} value={mateIn} onChange={(e) => setMateIn(+e.target.value)} /></Field>}
            <Field label="Nome do exercício"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Força do adversário"><select className={selectCls} value={levelId} onChange={(e) => setLevelId(e.target.value)}>{LEVELS.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Field>
          </div>
          <Field label="FEN (importar/exportar)">
            <div className="flex gap-2"><input className={inputCls + " font-mono text-xs"} value={fenIn || fen} onChange={(e) => setFenIn(e.target.value)} />
              <Btn onClick={() => { try { const c = new Chess(fenIn || fen); setBoard(fenToBoard(c.fen())); setTurn(c.turn()); setFenIn(""); setMsg("FEN carregado."); } catch { setMsg("FEN inválido."); } }}>Carregar</Btn></div>
          </Field>
          {!valid && <p className="text-sm text-rose-400 mt-2">Posição inválida (precisa de um rei de cada cor, sem peões na 1ª/8ª fileira e o lado que não joga não pode estar em xeque).</p>}
          {msg && <p className="text-sm text-emerald-400 mt-2">{msg}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            <Btn variant="primary" disabled={!valid} onClick={() => { const e: CustomExercise = { id: uid(), name, fen, toMove: turn, objective, mateIn, created: Date.now() }; setSk((k) => k + 1); setSolving(e); }}>▶ Resolver agora</Btn>
            <Btn variant="gold" disabled={!valid} onClick={() => { update((x) => { x.exercises.unshift({ id: uid(), name, fen, toMove: turn, objective, mateIn, created: Date.now() }); }); setMsg("Exercício salvo!"); }}>💾 Salvar exercício</Btn>
            <Btn disabled={!valid} onClick={() => go("analysis", { fen, free: true })}>🔬 Analisar posição</Btn>
            <Btn disabled={!valid} onClick={() => go("play", { fen })}>♞ Jogar partida desta posição</Btn>
          </div>
        </Card>
        <Card title={`Exercícios salvos (${d.exercises.length})`}>
          {d.exercises.length === 0 ? <p className="text-sm text-zinc-500">Nenhum exercício salvo. Monte uma posição, defina o objetivo e salve. Você também pode salvar posições direto do Laboratório de Gambitos.</p> : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {d.exercises.map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-lg bg-black/25 px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{e.name}</span><Chip>{e.objective === "win" ? "Vencer" : e.objective === "draw" ? "Empatar" : e.objective === "mate" ? `Mate em ${e.mateIn}` : "Melhor lance"}</Chip>
                  <Btn className="!py-1 !px-2 !text-xs" onClick={() => { setSk((k) => k + 1); setSolving(e); }}>Resolver</Btn>
                  <Btn className="!py-1 !px-2 !text-xs" onClick={() => { setBoard(fenToBoard(e.fen)); setTurn(e.toMove); setName(e.name); setObjective(e.objective); }}>Editar</Btn>
                  <Btn className="!py-1 !px-2 !text-xs" onClick={() => update((x) => { x.exercises = x.exercises.filter((y) => y.id !== e.id); })}>✕</Btn>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
