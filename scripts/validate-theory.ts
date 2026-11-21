// Valida a teoria: todos os lances legais + avaliação Stockfish das folhas (node scripts/validate-theory.ts via tsx)
import { createRequire } from "module";
import { getTheories, getNode, compileErrors } from "../src/data/theory";
const require = createRequire(import.meta.url);
const errs = compileErrors();
console.log("Erros de compilação:", errs.length);
errs.forEach((e) => console.log("  ", e));
const sf = require("stockfish")("lite-single", (l: string) => handler(l));
let handler: (l: string) => void = () => {};
const evalFen = (fen: string, depth = 10) =>
  new Promise<number>((res) => {
    let last = 0;
    const white = fen.split(" ")[1] === "w" ? 1 : -1;
    handler = (l) => {
      const m = l.match(/score (cp|mate) (-?\d+)/);
      if (m && l.includes(" pv ")) last = m[1] === "cp" ? +m[2] * white : (+m[2] > 0 ? 1 : -1) * white * 9999;
      if (l.startsWith("bestmove")) res(last);
    };
    sf.processCommand("position fen " + fen);
    sf.processCommand("go depth " + depth);
  });
sf.processCommand("uci");
let total = 0;
for (const t of getTheories()) {
  const out: string[] = [];
  const stack = [t.rootId];
  while (stack.length) {
    const nd = getNode(stack.pop()!)!;
    total++;
    if (!nd.children.length || nd.depth === 0) {
      const ev = await evalFen(nd.fen);
      const flag = (t.side === "w" ? ev : -ev) < -150 ? "  <-- ATENÇÃO (lado do gambito em desvantagem)" : "";
      out.push(`   ${nd.id.padEnd(22)} ${String(ev).padStart(6)} ${nd.title.slice(0, 50)}${flag}`);
    }
    nd.children.forEach((c) => stack.push(c));
  }
  console.log(`${t.name} [${t.side}]`);
  out.forEach((o) => console.log(o));
}
console.log("nós:", total);
process.exit(0);
