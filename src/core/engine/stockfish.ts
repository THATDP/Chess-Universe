// Integração com o Stockfish (WASM) rodando em Web Worker.
// 1º tenta carregar os arquivos em ./stockfish/ (GitHub Pages); se falhar, usa a cópia embutida no bundle.
import { turnOf } from "../chess/rules";
import { getLevel } from "./levels";
import type { Level } from "./levels";

export interface EngineLine {
  depth: number;
  multipv: number;
  /** centipeões na perspectiva das brancas */
  cp?: number;
  /** mate em N (positivo = brancas dão mate) */
  mate?: number;
  pv: string[];
  nodes: number;
  nps: number;
  time: number;
}

export interface SearchOpts {
  movetime?: number;
  depth?: number;
  nodes?: number;
  infinite?: boolean;
  multipv?: number;
  level?: Level | null;
  onInfo?: (lines: EngineLine[]) => void;
}
export interface SearchResult {
  best: string | null;
  ponder?: string;
  lines: EngineLine[];
  cancelled?: boolean;
}

export type EngineStatus = { state: "idle" | "loading" | "ready" | "error"; source?: "files" | "embedded"; message?: string };

const statusListeners = new Set<(s: EngineStatus) => void>();
let globalStatus: EngineStatus = { state: "idle" };
export function getEngineStatus() {
  return globalStatus;
}
export function subscribeEngineStatus(fn: (s: EngineStatus) => void) {
  statusListeners.add(fn);
  return () => {
    statusListeners.delete(fn);
  };
}
function setStatus(s: EngineStatus) {
  globalStatus = s;
  statusListeners.forEach((f) => f(s));
}

let embeddedUrls: Promise<{ js: string; wasm: string }> | null = null;
function loadEmbedded() {
  embeddedUrls ??= (async () => {
    const [{ default: js }, { default: wasmData }] = await Promise.all([
      import("./vendor/stockfish-19-lite-single.js?raw"),
      import("./vendor/stockfishWasm"),
    ]);
    const bin = atob(wasmData);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const wasm = URL.createObjectURL(new Blob([bytes], { type: "application/wasm" }));
    const jsUrl = URL.createObjectURL(new Blob([js], { type: "text/javascript" }));
    return { js: jsUrl + "#" + encodeURIComponent(wasm), wasm };
  })();
  return embeddedUrls;
}

function waitForUci(w: Worker, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      w.removeEventListener("message", onMsg);
      w.removeEventListener("error", onErr);
      resolve(ok);
    };
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data === "string" && e.data.includes("uciok")) finish(true);
    };
    const onErr = () => finish(false);
    const timer = setTimeout(() => finish(false), timeoutMs);
    w.addEventListener("message", onMsg);
    w.addEventListener("error", onErr);
    w.postMessage("uci");
  });
}

async function createWorker(): Promise<{ worker: Worker; source: "files" | "embedded" }> {
  // 1) arquivos estáticos ao lado do index.html
  try {
    const url = new URL("stockfish/stockfish-lite-single.js", document.baseURI).href;
    const w = new Worker(url);
    if (await waitForUci(w, 6000)) return { worker: w, source: "files" };
    w.terminate();
  } catch {
    /* tenta o embutido */
  }
  // 2) cópia embutida
  const e = await loadEmbedded();
  const w = new Worker(e.js);
  if (await waitForUci(w, 20000)) return { worker: w, source: "embedded" };
  w.terminate();
  throw new Error("Não foi possível iniciar o Stockfish neste navegador.");
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private lineHandler: ((l: string) => void) | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private token = 0;
  private searching = false;

  constructor(public readonly name: string) {}

  init(): Promise<void> {
    this.initPromise ??= (async () => {
      setStatus({ state: "loading" });
      try {
        const { worker, source } = await createWorker();
        this.worker = worker;
        worker.onmessage = (e: MessageEvent) => {
          if (typeof e.data === "string") this.lineHandler?.(e.data);
        };
        await this.command("isready", "readyok");
        this.send("setoption name Hash value 32");
        setStatus({ state: "ready", source });
      } catch (err) {
        this.initPromise = null;
        setStatus({ state: "error", message: (err as Error).message });
        throw err;
      }
    })();
    return this.initPromise;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  private command(cmd: string, waitFor: string): Promise<void> {
    return new Promise((resolve) => {
      const prev = this.lineHandler;
      this.lineHandler = (l) => {
        prev?.(l);
        if (l.startsWith(waitFor)) {
          this.lineHandler = prev;
          resolve();
        }
      };
      this.send(cmd);
    });
  }

  stop() {
    this.token++;
    if (this.searching) this.send("stop");
  }

  /** Cancela buscas pendentes sem iniciar outra */
  cancel() {
    this.stop();
  }

  search(fen: string, opts: SearchOpts = {}): Promise<SearchResult> {
    const myToken = ++this.token;
    if (this.searching) this.send("stop");
    const run = async (): Promise<SearchResult> => {
      if (myToken !== this.token) return { best: null, lines: [], cancelled: true };
      await this.init();
      if (myToken !== this.token) return { best: null, lines: [], cancelled: true };
      const lv = opts.level ?? null;
      const mpv = opts.multipv ?? 1;
      if (lv) {
        this.send(`setoption name UCI_LimitStrength value ${lv.elo ? "true" : "false"}`);
        if (lv.elo) this.send(`setoption name UCI_Elo value ${lv.elo}`);
        this.send(`setoption name Skill Level value ${lv.skill}`);
      } else {
        this.send("setoption name UCI_LimitStrength value false");
        this.send("setoption name Skill Level value 20");
      }
      this.send(`setoption name MultiPV value ${mpv}`);
      this.send(`position fen ${fen}`);
      const side = turnOf(fen);
      const lines = new Map<number, EngineLine>();
      let lastEmit = 0;
      const emit = (force = false) => {
        const now = performance.now();
        if (!opts.onInfo || (!force && now - lastEmit < 120)) return;
        lastEmit = now;
        opts.onInfo([...lines.values()].sort((a, b) => a.multipv - b.multipv));
      };
      let go = "go";
      if (opts.infinite) go += " infinite";
      else {
        if (opts.movetime) go += ` movetime ${Math.round(opts.movetime)}`;
        if (opts.depth) go += ` depth ${opts.depth}`;
        if (opts.nodes) go += ` nodes ${opts.nodes}`;
        if (go === "go") go += " movetime 1000";
      }
      return new Promise<SearchResult>((resolve) => {
        this.searching = true;
        this.lineHandler = (l) => {
          if (l.startsWith("info") && l.includes(" score ") && l.includes(" pv ")) {
            const info = parseInfo(l, side);
            if (info) {
              lines.set(info.multipv, info);
              emit();
            }
          } else if (l.startsWith("bestmove")) {
            this.searching = false;
            this.lineHandler = null;
            emit(true);
            const parts = l.split(/\s+/);
            const best = parts[1] && parts[1] !== "(none)" && parts[1] !== "0000" ? parts[1] : null;
            const ponderIdx = parts.indexOf("ponder");
            resolve({
              best,
              ponder: ponderIdx > 0 ? parts[ponderIdx + 1] : undefined,
              lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
              cancelled: myToken !== this.token,
            });
          }
        };
        this.send(go);
      });
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Jogada da IA conforme nível (parâmetros reais do mecanismo) */
  async playMove(fen: string, levelId: number, thinkMs: number, clockMs?: number): Promise<SearchResult> {
    const lv = getLevel(levelId);
    let t = lv.moveTime ?? thinkMs;
    if (lv.moveTime !== null) t = Math.min(Math.max(lv.moveTime, 100), Math.max(thinkMs, 200) * (lv.id >= 7 ? 2 : 1));
    if (clockMs !== undefined) t = Math.max(80, Math.min(t, clockMs / 25));
    return this.search(fen, { level: lv, depth: lv.depth ?? undefined, movetime: t });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.initPromise = null;
  }
}

function parseInfo(line: string, side: "w" | "b"): EngineLine | null {
  const t = line.split(/\s+/);
  const get = (k: string) => {
    const i = t.indexOf(k);
    return i >= 0 ? t[i + 1] : undefined;
  };
  const pvI = t.indexOf("pv");
  if (pvI < 0) return null;
  const sc = t.indexOf("score");
  const kind = t[sc + 1];
  const val = parseInt(t[sc + 2], 10);
  if (Number.isNaN(val)) return null;
  const sign = side === "w" ? 1 : -1;
  const out: EngineLine = {
    depth: parseInt(get("depth") ?? "0", 10),
    multipv: parseInt(get("multipv") ?? "1", 10),
    pv: t.slice(pvI + 1),
    nodes: parseInt(get("nodes") ?? "0", 10),
    nps: parseInt(get("nps") ?? "0", 10),
    time: parseInt(get("time") ?? "0", 10),
  };
  if (kind === "cp") out.cp = val * sign;
  else if (kind === "mate") out.mate = val * sign;
  else return null;
  return out;
}

/** Centipeões equivalentes (mate vira valor grande) */
export function lineCp(l: { cp?: number; mate?: number }): number {
  if (l.mate !== undefined) return l.mate > 0 ? 10000 - l.mate * 10 : -10000 - l.mate * 10;
  return l.cp ?? 0;
}

export function formatEval(l: { cp?: number; mate?: number } | null | undefined): string {
  if (!l) return "—";
  if (l.mate !== undefined) return `${l.mate > 0 ? "" : "-"}#${Math.abs(l.mate)}`;
  const v = (l.cp ?? 0) / 100;
  return (v > 0 ? "+" : "") + v.toFixed(2);
}

const engines = new Map<string, StockfishEngine>();
export function getEngine(name: "play" | "analysis" | "aux" = "play"): StockfishEngine {
  let e = engines.get(name);
  if (!e) {
    e = new StockfishEngine(name);
    engines.set(name, e);
  }
  return e;
}
