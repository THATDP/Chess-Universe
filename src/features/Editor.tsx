import { useMemo, useState } from "react";
import { Board } from "../ui/Board";
import { Btn, Card, PageTitle, Pill, Segmented } from "../ui/common";
import { EnginePanel } from "../ui/EnginePanel";
import { GameLayout } from "../ui/GameLayout";
import { START_FEN, checkFen } from "../core/chess/rules";
import { pieceUrl } from "../ui/pieces";
import { useSettings } from "../core/settings/settings";
import { audio } from "../core/audio/audio";
import { uid, usePersisted } from "../core/storage/db";
import type { CustomPosition } from "../core/storage/db";
import { useNav } from "../core/nav";
import { cn } from "../utils/cn";

type Grid = (string | null)[]; // 64 casas, índice = rank*8 + file (rank 0 = 8ª fila). Peça: "P","n"…

function gridFromFen(fen: string): Grid {
  const g: Grid = Array(64).fill(null);
  fen.split(" ")[0].split("/").forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) f += +ch;
      else if (f < 8 && r < 8) g[r * 8 + f++] = ch;
    }
  });
  return g;
}
function placement(g: Grid): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let s = "";
    let e = 0;
    for (let f = 0; f < 8; f++) {
      const p = g[r * 8 + f];
      if (!p) e++;
      else {
        if (e) s += e;
        e = 0;
        s += p;
      }
    }
    if (e) s += e;
    rows.push(s);
  }
  return rows.join("/");
}
const idx = (sq: string) => (8 - +sq[1]) * 8 + (sq.charCodeAt(0) - 97);

const PALETTE = ["K", "Q", "R", "B", "N", "P", "k", "q", "r", "b", "n", "p"];

export default function Editor() {
  const { settings } = useSettings();
  const { go } = useNav();
  const [grid, setGrid] = useState<Grid>(() => gridFromFen(START_FEN));
  const [turn, setTurn] = useState<"w" | "b">("w");
  const [castle, setCastle] = useState({ K: true, Q: true, k: true, q: true });
  const [ep, setEp] = useState("-");
  const [tool, setTool] = useState<string>("move");
  const [from, setFrom] = useState<string | null>(null);
  const [orient, setOrient] = useState<"w" | "b">("w");
  const [fenIn, setFenIn] = useState("");
  const [saved, setSaved] = usePersisted<CustomPosition[]>("customPositions", []);
  const [name, setName] = useState("");
  const [live, setLive] = useState(false);

  const allowed = {
    K: grid[60] === "K" && grid[63] === "R",
    Q: grid[60] === "K" && grid[56] === "R",
    k: grid[4] === "k" && grid[7] === "r",
    q: grid[4] === "k" && grid[0] === "r",
  };
  const castleStr = (["K", "Q", "k", "q"] as const).filter((c) => castle[c] && allowed[c]).join("") || "-";
  const fen = `${placement(grid)} ${turn} ${castleStr} ${ep} 0 1`;
  const valid = useMemo(() => checkFen(fen), [fen]);

  const place = (sq: string) => {
    const i = idx(sq);
    if (tool === "move") {
      if (from) {
        if (from !== sq) {
          setGrid((g) => {
            const n = [...g];
            n[i] = n[idx(from)];
            n[idx(from)] = null;
            return n;
          });
          audio.play("move");
        }
        setFrom(null);
      } else if (grid[i]) setFrom(sq);
    } else if (tool === "erase") {
      setGrid((g) => {
        const n = [...g];
        n[i] = null;
        return n;
      });
    } else {
      setGrid((g) => {
        const n = [...g];
        n[i] = tool;
        return n;
      });
      audio.play("move");
    }
  };

  const loadFen = (f: string) => {
    const v = checkFen(f);
    if (!v.ok) return false;
    setGrid(gridFromFen(f));
    const parts = f.split(" ");
    setTurn(parts[1] === "b" ? "b" : "w");
    const c = parts[2] ?? "-";
    setCastle({ K: c.includes("K"), Q: c.includes("Q"), k: c.includes("k"), q: c.includes("q") });
    setEp(parts[3] ?? "-");
    return true;
  };

  const epOptions = ["-", ...["a", "b", "c", "d", "e", "f", "g", "h"].map((f) => f + (turn === "w" ? "6" : "3"))];
  const marks: Record<string, string> = from ? { [from]: "rgba(80,180,255,0.5)" } : {};

  return (
    <div className="page-enter">
      <PageTitle title="Editor de Posições" subtitle="Monte qualquer posição, valide com as regras reais do xadrez e use-a para jogar, analisar ou criar treinos." right={valid.ok ? <Pill color="green">✓ Posição válida</Pill> : <Pill color="red">Posição inválida</Pill>} />
      <GameLayout
        board={
          <Board
            fen={fen}
            orientation={orient}
            movable={null}
            marks={marks}
            onSquareClick={place}
            onExternalDrop={(sq, data) => {
              if (PALETTE.includes(data)) {
                setGrid((g) => {
                  const n = [...g];
                  n[idx(sq)] = data;
                  return n;
                });
                audio.play("move");
              }
            }}
          />
        }
        side={
          <>
            <Card title="Peças" right={<Btn size="sm" onClick={() => setOrient((o) => (o === "w" ? "b" : "w"))}>⇅ Virar</Btn>}>
              <div className="grid grid-cols-6 gap-1.5">
                {PALETTE.map((p) => (
                  <button
                    key={p}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", p)}
                    onClick={() => { audio.play("click"); setTool(p); setFrom(null); }}
                    className={cn("aspect-square rounded-lg border p-1 transition", tool === p ? "border-accent bg-accent/20" : "border-line bg-panel2 hover:border-mute")}
                    title="Clique e depois clique no tabuleiro — ou arraste"
                  >
                    <img src={pieceUrl(settings.pieceSet, p === p.toUpperCase() ? "w" : "b", p.toLowerCase())} alt={p} className="h-full w-full" draggable={false} />
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Btn variant={tool === "move" ? "soft" : "ghost"} onClick={() => { setTool("move"); setFrom(null); }}>⇄ Mover peça</Btn>
                <Btn variant={tool === "erase" ? "soft" : "ghost"} onClick={() => { setTool("erase"); setFrom(null); }}>⌫ Apagar casa</Btn>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Btn onClick={() => { setGrid(gridFromFen(START_FEN)); setTurn("w"); setCastle({ K: true, Q: true, k: true, q: true }); setEp("-"); }}>Posição inicial</Btn>
                <Btn variant="danger" onClick={() => { setGrid(Array(64).fill(null)); setEp("-"); }}>Limpar tudo</Btn>
              </div>
            </Card>
            <Card title="Configurações da posição">
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-[11px] text-mute">Lado a jogar</div>
                  <Segmented className="w-full" value={turn} onChange={(v) => { setTurn(v); setEp("-"); }} options={[{ value: "w", label: "Brancas" }, { value: "b", label: "Pretas" }]} />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-mute">Direitos de roque (habilitados conforme rei/torre nas casas originais)</div>
                  <div className="grid grid-cols-4 gap-2">
                    {([["K", "O-O ♔"], ["Q", "O-O-O ♔"], ["k", "O-O ♚"], ["q", "O-O-O ♚"]] as const).map(([k, l]) => (
                      <label key={k} className={cn("flex cursor-pointer items-center justify-center rounded-md border px-1 py-1.5 text-[11px] font-semibold", allowed[k] ? "border-line bg-panel2 text-ink" : "border-line/50 text-mute opacity-40")}>
                        <input type="checkbox" className="mr-1" disabled={!allowed[k]} checked={castle[k] && allowed[k]} onChange={(e) => setCastle((c) => ({ ...c, [k]: e.target.checked }))} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-mute">En passant (opcional)</div>
                  <select value={ep} onChange={(e) => setEp(e.target.value)}>
                    {epOptions.map((o) => (
                      <option key={o} value={o}>{o === "-" ? "Nenhum" : o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
            <Card title="FEN">
              <div className="break-all rounded-md bg-panel2 p-2 font-mono text-[11px] text-ink">{fen}</div>
              {!valid.ok && <p className="mt-2 rounded-md bg-red-500/15 p-2 text-xs text-red-300">{valid.error}</p>}
              <div className="mt-2 flex gap-2">
                <Btn size="sm" onClick={() => void navigator.clipboard?.writeText(fen)}>Copiar FEN</Btn>
              </div>
              <input type="text" className="mt-3 font-mono text-xs" placeholder="Cole uma FEN para carregar…" value={fenIn} onChange={(e) => setFenIn(e.target.value)} />
              <Btn size="sm" className="mt-2" onClick={() => { if (loadFen(fenIn.trim())) { audio.play("success"); setFenIn(""); } else audio.play("error"); }} disabled={!fenIn.trim()}>Carregar FEN</Btn>
            </Card>
            <Card title="Usar esta posição">
              <div className="grid grid-cols-2 gap-2">
                <Btn variant="primary" disabled={!valid.ok} onClick={() => go("play", { fen })}>♟ Jogar contra IA</Btn>
                <Btn disabled={!valid.ok} onClick={() => go("analysis", { game: { startFen: fen, moves: [] } })}>◎ Analisar</Btn>
                <Btn className="col-span-2" disabled={!valid.ok} onClick={() => go("lab", { customFen: fen, customSide: turn })}>⚔ Criar treino personalizado</Btn>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input type="text" placeholder="Nome para salvar" value={name} onChange={(e) => setName(e.target.value)} />
                <Btn size="sm" disabled={!valid.ok} onClick={() => { setSaved((l) => [{ id: uid(), name: name.trim() || `Posição ${l.length + 1}`, fen, created: Date.now() }, ...l]); setName(""); audio.play("success"); }}>▣</Btn>
              </div>
            </Card>
            <Card title={`Posições salvas (${saved.length})`}>
              {saved.length === 0 && <p className="text-xs text-mute">Nenhuma posição salva ainda.</p>}
              <div className="space-y-1.5">
                {saved.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-md bg-panel2 p-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
                    <Btn size="sm" onClick={() => loadFen(p.fen)}>Abrir</Btn>
                    <Btn size="sm" variant="danger" onClick={() => setSaved((l) => l.filter((x) => x.id !== p.id))}>✕</Btn>
                  </div>
                ))}
              </div>
            </Card>
            {valid.ok && (
              <Card>
                <EnginePanel fen={fen} enabled={live} onToggle={setLive} multipv={2} maxDepth={20} title="Avaliar posição" />
              </Card>
            )}
          </>
        }
      />
    </div>
  );
}
