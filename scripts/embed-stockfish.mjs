// Gera src/core/engine/vendor/stockfishWasm.ts (WASM em base64) para a cópia embutida do Stockfish.
// Uso: node scripts/embed-stockfish.mjs
import { readFileSync, writeFileSync } from "fs";
const wasm = readFileSync("src/core/engine/vendor/stockfish-19-lite-single.wasm");
writeFileSync("src/core/engine/vendor/stockfishWasm.ts", `// gerado por scripts/embed-stockfish.mjs — não editar\nexport default "${wasm.toString("base64")}";\n`);
console.log("ok", wasm.length, "bytes");
