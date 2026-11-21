// Integração com o Stockfish 19 (WebAssembly, versão lite single-thread) rodando em Web Worker.
// O JS do motor e o binário .wasm são embutidos no bundle e carregados via Blob URL,
// portanto funciona sem servidor próprio e sem cabeçalhos COOP/COEP.
import sfSource from "../assets/sf.js?raw";
import sfWasmUrl from "../assets/sf.wasm?url";

export interface PVLine {
  multipv: number;
  depth: number;
  cp?: number;
  mate?: number;
  pv: string[];
  nodes?: number;
  nps?: number;
}
export interface SearchResult {
  best: string | null;
  lines: PVLine[];
  depth: number;
}
export interface SearchOpts {
  depth?: number;
  movetime?: number;
  nodes?: number;
  multipv?: number;
  elo?: number | null;
  skill?: number | null;
  searchmoves?: string[];
  onInfo?: (lines: PVLine[]) => void;
}

let workerUrlPromise: Promise<string> | null = null;
function getWorkerUrl(): Promise<string> {
  workerUrlPromise ??= (async () => {
    const buf = await (await fetch(sfWasmUrl)).arrayBuffer();
    const wasm = URL.createObjectURL(new Blob([buf], { type: "application/wasm" }));
    // o motor lê o caminho do .wasm em self.location.hash: embutimos o valor diretamente no código
    const patched = sfSource.split("self.location.hash").join(JSON.stringify("#" + encodeURIComponent(wasm)));
    const js = URL.createObjectURL(new Blob([patched], { type: "text/javascript" }));
    return js + "#" + encodeURIComponent(wasm);
  })();
  return workerUrlPromise;
}

export class Engine {
  private worker: Worker | null = null;
  private listeners = new Set<(l: string) => void>();
  ready: Promise<void>;
  failed: string | null = null;
  isReady = false;
  private queue: Promise<unknown> = Promise.resolve();
  private gen = 0;
  private running = false;

  constructor(public name: string) {
    this.ready = this.init();
    this.ready.catch(() => undefined);
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private waitFor(cmd: string, token: string, timeout = 30000) {
    return new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => {
        this.listeners.delete(l);
        reject(new Error("Tempo esgotado aguardando o motor"));
      }, timeout);
      const l = (line: string) => {
        if (line.startsWith(token)) {
          clearTimeout(t);
          this.listeners.delete(l);
          resolve();
        }
      };
      this.listeners.add(l);
      this.send(cmd);
    });
  }

  private async init() {
    try {
      const url = await getWorkerUrl();
      this.worker = new Worker(url);
      this.worker.onmessage = (e) => {
        const line = typeof e.data === "string" ? e.data : String(e.data);
        this.listeners.forEach((l) => l(line));
      };
      this.worker.onerror = (e) => {
        this.failed = e.message || "Erro no worker do motor";
      };
      await this.waitFor("uci", "uciok");
      this.send("setoption name Hash value 32");
      await this.waitFor("isready", "readyok");
      this.isReady = true;
    } catch (err) {
      this.failed = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /** Cancela a busca atual e todas as buscas enfileiradas. */
  cancel() {
    this.gen++;
    if (this.running) this.send("stop");
  }

  search(fen: string, o: SearchOpts = {}): Promise<SearchResult | null> {
    const myGen = this.gen;
    const job = this.queue.then(async () => {
      if (myGen !== this.gen) return null;
      await this.ready;
      if (myGen !== this.gen) return null;
      return this.run(fen, o);
    });
    const safe = job.catch(() => null);
    this.queue = safe;
    return safe as Promise<SearchResult | null>;
  }

  private run(fen: string, o: SearchOpts) {
    return new Promise<SearchResult>((resolve) => {
      const lines = new Map<number, PVLine>();
      let maxDepth = 0;
      const sorted = () => [...lines.values()].sort((a, b) => a.multipv - b.multipv);
      this.running = true;
      const l = (line: string) => {
        if (line.startsWith("info") && line.includes(" pv ") && !line.includes("bound")) {
          const t = line.split(" ");
          const g = (k: string) => {
            const i = t.indexOf(k);
            return i >= 0 ? t[i + 1] : undefined;
          };
          const si = t.indexOf("score");
          if (si < 0) return;
          const pl: PVLine = {
            multipv: Number(g("multipv") ?? 1),
            depth: Number(g("depth") ?? 0),
            pv: t.slice(t.indexOf("pv") + 1),
            nodes: Number(g("nodes") ?? 0),
            nps: Number(g("nps") ?? 0),
          };
          if (t[si + 1] === "cp") pl.cp = Number(t[si + 2]);
          else pl.mate = Number(t[si + 2]);
          lines.set(pl.multipv, pl);
          maxDepth = Math.max(maxDepth, pl.depth);
          o.onInfo?.(sorted());
        } else if (line.startsWith("bestmove")) {
          this.listeners.delete(l);
          this.running = false;
          const best = line.split(" ")[1];
          resolve({ best: !best || best === "(none)" ? null : best, lines: sorted(), depth: maxDepth });
        }
      };
      this.listeners.add(l);
      this.send(`setoption name MultiPV value ${o.multipv ?? 1}`);
      if (o.elo) {
        this.send("setoption name UCI_LimitStrength value true");
        this.send(`setoption name UCI_Elo value ${Math.round(o.elo)}`);
      } else {
        this.send("setoption name UCI_LimitStrength value false");
      }
      this.send(`setoption name Skill Level value ${o.skill ?? 20}`);
      this.send(`position fen ${fen}`);
      let go = "go";
      if (o.depth) go += ` depth ${o.depth}`;
      if (o.movetime) go += ` movetime ${Math.round(o.movetime)}`;
      if (o.nodes) go += ` nodes ${o.nodes}`;
      if (!o.depth && !o.movetime && !o.nodes) go += " depth 12";
      if (o.searchmoves?.length) go += ` searchmoves ${o.searchmoves.join(" ")}`;
      this.send(go);
    });
  }

  terminate() {
    this.worker?.terminate();
  }
}

const engines: Record<string, Engine> = {};
/** "play" = motor do adversário; "analysis" = motor de análise (paralelo). */
export function getEngine(name: "play" | "analysis" | "live" = "play"): Engine {
  engines[name] ??= new Engine(name);
  return engines[name];
}

const cache = new Map<string, SearchResult>();
/** Análise com cache por posição/profundidade. */
export async function analyzeFen(
  fen: string,
  depth = 12,
  multipv = 1,
  engine: Engine = getEngine("analysis"),
  onInfo?: (l: PVLine[]) => void
): Promise<SearchResult | null> {
  const key = `${fen.split(" ").slice(0, 4).join(" ")}|${depth}|${multipv}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = await engine.search(fen, { depth, multipv, onInfo });
  if (r && r.lines.length && r.depth >= Math.min(depth, 6)) {
    // só guarda resultados completos
    if (r.depth >= depth - 1) cache.set(key, r);
  }
  return r;
}
