import { Chess } from 'chess.js';
import { execSync } from 'child_process';
import fs from 'fs';
// transpila rapidamente os arquivos de dados com esbuild (vem com vite)
import { build } from 'esbuild';
const files = process.argv.slice(2);
for (const f of files) {
  const out = '/tmp/chk_' + f.split('/').pop().replace('.ts','.mjs');
  await build({ entryPoints:[f], bundle:true, format:'esm', outfile:out, platform:'node', logLevel:'silent' });
  const mod = await import(out + '?' + Date.now());
  const arr = Object.values(mod).find(v => Array.isArray(v));
  let bad = 0, total = 0;
  for (const o of arr) {
    const lines = [['main', o.moves], ...o.variantes.map(v => [v.nome, v.moves]), ...o.armadilhas.filter(t=>t.moves).map(t=>['trap '+t.nome, t.moves])];
    for (const [n, l] of lines) {
      total++;
      const c = new Chess();
      let i = 0;
      for (const s of l.split(/\s+/)) { try { c.move(s); i++; } catch { console.log(`ILEGAL ${o.id} / ${n}: "${s}" no lance ${i+1}`); bad++; break; } }
    }
  }
  console.log(f, 'linhas', total, 'ruins', bad);
}
