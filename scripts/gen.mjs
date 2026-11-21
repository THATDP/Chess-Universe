// Gera src/data/generated.json: problemas táticos verificados pelo Stockfish + finais com objetivo verificado.
import { createRequire } from 'module';
import { Chess } from 'chess.js';
import { build } from 'esbuild';
import fs from 'fs';
const require = createRequire(import.meta.url);
const sf = require('stockfish');
let waiters = [];
const engine = sf('lite-single', (line) => { waiters.forEach(w => w(line)); });
const cmd = (c) => engine.processCommand(c);
function search(fen, depth, mpv = 1) { fs.writeFileSync('/tmp/lastfen.txt', fen);
  return new Promise((resolve) => {
    const lines = new Map();
    const w = (line) => {
      if (line.startsWith('info') && line.includes(' pv ') && !line.includes('bound')) {
        const t = line.split(' '); const g = k => t[t.indexOf(k) + 1];
        const si = t.indexOf('score');
        const o = { mpv: +g('multipv') || 1, depth: +g('depth'), pv: t.slice(t.indexOf('pv') + 1) };
        if (t[si + 1] === 'cp') o.cp = +t[si + 2]; else o.mate = +t[si + 2];
        lines.set(o.mpv, o);
      } else if (line.startsWith('bestmove')) {
        waiters = waiters.filter(x => x !== w);
        resolve([...lines.values()].sort((a, b) => a.mpv - b.mpv));
      }
    };
    waiters.push(w);
    cmd('setoption name MultiPV value ' + mpv);
    cmd('position fen ' + fen);
    cmd('go depth ' + depth);
  });
}
const score = (l) => l.mate !== undefined ? (l.mate > 0 ? 10000 - l.mate : -10000 - l.mate) : l.cp;

// ---- fontes de posições ----
const files = ['src/data/gambitsBrancas.ts', 'src/data/gambitsPretas.ts', 'src/data/outras.ts'];
const lines = [];
for (const f of files) {
  const out = '/tmp/gen_' + f.split('/').pop().replace('.ts', '.mjs');
  await build({ entryPoints: [f], bundle: true, format: 'esm', outfile: out, platform: 'node', logLevel: 'silent' });
  const mod = await import(out + '?' + Date.now());
  for (const o of Object.values(mod).find(Array.isArray)) {
    lines.push({ tag: o.nome, sans: o.moves.split(/\s+/) });
    o.variantes.forEach(v => lines.push({ tag: o.nome, sans: v.moves.split(/\s+/) }));
    o.armadilhas.filter(t => t.moves).forEach(t => lines.push({ tag: t.nome, sans: t.moves.split(/\s+/) }));
  }
}
const famous = [
  ['Partida da Ópera (Morphy, 1858)', 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'],
  ['Partida Imortal (1851)', 'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#'],
  ['Partida Sempre-Viva (1852)', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#'],
  ['Mate do Pastor', 'e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#'],
  ['Mate do Louco', 'f3 e5 g4 Qh4#'],
  ['Mate de Légal', 'e4 e5 Nf3 d6 Bc4 Bg4 Nc3 g6 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#'],
  ['Kieninger', 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 axb4 Nd3#'],
  ['Mate do Corredor', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6 a4 c5 d5 c4 Bg5 h6 Bd2 Bg7 a5 Qc7 Ba4 Nc5'],
  ['Mate Árabe', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Ncb4 Qe4 c6 a3 Na6 d4 Nac7'],
];
famous.forEach(([tag, s]) => lines.push({ tag, sans: s.split(/\s+/), famous: true }));

const seen = new Map();
for (const l of lines) {
  const c = new Chess();
  for (let i = 0; i < l.sans.length; i++) {
    try { c.move(l.sans[i]); } catch { break; }
    if (i < 5) continue;
    if (c.isGameOver()) continue;
    const key = c.fen().split(' ').slice(0, 4).join(' ');
    if (!seen.has(key)) seen.set(key, { fen: c.fen(), tag: l.tag, famous: !!l.famous, ply: i + 1 });
  }
}
console.log('posições candidatas', seen.size);

// ---- problemas feitos à mão ----
const hand = [
  ['Garfo', 'Garfo de cavalo (rei e dama)', '6k1/3q1p1p/8/8/4N3/8/5PPP/6K1 w - - 0 1'],
  ['Garfo', 'Garfo real (rei e torre)', 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1'],
  ['Garfo', 'Garfo em c6 (rei e dama)', '3q4/4k3/8/4N3/8/8/8/4K3 w - - 0 1'],
  ['Espetada', 'Espetada de torre ao rei e dama', 'q3k3/8/8/8/8/8/8/4K2R w - - 0 1'],
  ['Cravada', 'Cravada na diagonal b5–e8', '4k3/3q4/8/1B6/8/8/8/R3K3 w - - 0 1'],
  ['Ataque descoberto', 'Xeque descoberto ganha a dama', '4k3/8/8/8/6q1/4N3/4R3/4K3 w - - 0 1'],
  ['Cravada', 'Dama cravada na coluna e', '4k3/4q3/8/8/8/8/4R3/R3K3 w - - 0 1'],
  ['Cravada', 'Dama cravada na diagonal', '7k/6q1/8/8/8/8/8/B3R1K1 w - - 0 1'],
  ['Garfo', 'Garfo de cavalo nas duas torres', '2r1r1k1/8/8/8/4N3/8/8/6K1 w - - 0 1'],
  ['Ataque descoberto', 'Descoberta com xeque na dama', '4k3/8/8/3q4/8/4N3/8/4RK2 w - - 0 1'],
  ['Mate em 1', 'Mate de corredor', '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1'],
  ['Mate em 1', 'Mate sufocado', '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1'],
  ['Mate em 1', 'Duas torres', '7k/R7/8/8/8/8/8/1R5K w - - 0 1'],
  ['Mate em 2', 'Mate com dama e rei', '7k/8/6K1/8/8/8/8/6Q1 w - - 0 1'],
  ['Mate em 2', 'Escada de torres', '7k/8/8/8/8/8/R7/1R5K w - - 0 1'],
  ['Mate em 3', 'Escada de torres (3)', '7k/8/8/8/8/R7/8/R6K w - - 0 1'],
];

const results = [];
let n = 0;
function themeOf(fen, best, mateN, famous) {
  const c = new Chess(fen);
  const turn = c.turn();
  const mv = c.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
  if (mateN) return mateN === 1 ? 'Mate em 1' : mateN === 2 ? 'Mate em 2' : mateN === 3 ? 'Mate em 3' : 'Combinação tática';
  // garfo: peça movida ataca >= 2 peças valiosas (ou rei + peça)
  try {
    const p = c.fen().split(' '); p[1] = turn; p[3] = '-';
    const c2 = new Chess(p.join(' '));
    const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    const att = c2.moves({ verbose: true }).filter(m => m.from === mv.to && m.captured && V[m.captured] >= 3 && V[m.captured] >= V[mv.piece] - 0.5);
    const checkNow = c.inCheck();
    if ((att.length >= 2 || (checkNow && att.length >= 1)) && mv.piece !== 'k' && !mv.captured) return 'Garfo';
  } catch { }
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const them = turn === 'w' ? 'b' : 'w';
  // xeque descoberto
  if (c.inCheck() && mv.piece !== 'k') {
    const c3 = new Chess(c.fen()); c3.remove(mv.to);
    try { if (c3.inCheck()) return 'Ataque descoberto'; } catch { }
  }
  // cravada / espetada por peça de longo alcance
  if (['b', 'r', 'q'].includes(mv.piece)) {
    const dirs = mv.piece === 'b' ? [[1,1],[1,-1],[-1,1],[-1,-1]] : mv.piece === 'r' ? [[1,0],[-1,0],[0,1],[0,-1]] : [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    const PV = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
    for (const [dx, dy] of dirs) {
      let f = mv.to.charCodeAt(0) - 97 + dx, r = +mv.to[1] - 1 + dy; const found = [];
      while (f >= 0 && f < 8 && r >= 0 && r < 8 && found.length < 2) {
        const p = c.get('abcdefgh'[f] + (r + 1));
        if (p) found.push(p);
        f += dx; r += dy;
        if (p && p.color === turn) break;
      }
      if (found.length === 2 && found[0].color === them && found[1].color === them) {
        if (PV[found[0].type] < PV[found[1].type] && PV[found[1].type] >= 5) return 'Cravada';
        if (PV[found[0].type] > PV[found[1].type] && PV[found[0].type] >= 9 && PV[found[1].type] >= 3) return 'Espetada';
      }
    }
  }
  if (mv.piece !== 'p' && mv.piece !== 'k' && c.isAttacked(mv.to, them) && VAL[mv.piece] - (mv.captured ? VAL[mv.captured] : 0) >= 2) return 'Sacrifício';
  return 'Combinação tática';
}
async function evaluate(fen, tag, forced) {
  const q = await search(fen, 8, 3);
  if (!q.length) return null;
  const b = score(q[0]);
  if (!forced && !(b >= 9000 || b >= 250)) return null;
  if (!forced && q[1] && score(q[1]) > b - 150 && b < 9000) return null;
  const full = await search(fen, 16, 4);
  const top = full[0]; const bs = score(top);
  const isMate = top.mate !== undefined && top.mate > 0;
  if (!(isMate || bs >= 250)) return null;
  const mateN = isMate ? top.mate : 0;
  if (mateN > 4) return null;
  const acc = full.filter(l => isMate ? (l.mate > 0 && l.mate <= mateN) : score(l) >= bs - 40);
  if (acc.length > 3) return null;
  const rest = full.filter(l => !acc.includes(l));
  if (rest[0] && !isMate && score(rest[0]) > bs - 120) return null;
  const quick = await search(fen, 2, 1);
  const easy = quick[0] && quick[0].pv[0] === top.pv[0];
  const turn = fen.split(' ')[1];
  const solLines = acc.map(l => l.pv.slice(0, isMate ? mateN * 2 - 1 : Math.min(l.pv.length, 3)));
  return { tema: themeOf(fen, top.pv[0], mateN, false), fen, turn, lines: solLines, mateN, rating: (mateN ? 700 + mateN * 200 : 1000) + (easy ? 0 : 350) + (forced ? 0 : 0), tag, pvfull: top.pv.slice(0, 8) };
}
for (const [theme, title, fen] of hand) {
  const r = await evaluate(fen, title, true);
  if (!r) { console.log('REJEITADO (mão):', title); continue; }
  const t = ['Garfo', 'Cravada', 'Espetada', 'Ataque descoberto'].includes(theme) ? theme : r.tema;
  if (theme !== r.tema && !['Cravada', 'Espetada', 'Ataque descoberto'].includes(theme)) console.log('tema difere', title, theme, r.tema);
  results.push({ id: 'h' + (++n), ...r, tema: t, titulo: title });
}
let k = 0;
if (process.env.SKIP) { const old = JSON.parse(fs.readFileSync('src/data/generated.json','utf8')); results.push(...old.puzzles.filter(p=>p.id.startsWith('a'))); }
for (const [key, p] of (process.env.SKIP ? [] : seen)) {
  k++;
  if (k % 200 === 0) console.log('scan', k, '/', seen.size, 'achados', results.length);
  const r = await evaluate(p.fen, p.tag, false);
  if (r) results.push({ id: 'a' + (++n), ...r, titulo: p.famous ? p.tag : 'Posição de ' + p.tag });
}
// limita por tema para variedade
const byTheme = {};
const final = [];
for (const r of results.sort((a, b) => a.rating - b.rating)) {
  byTheme[r.tema] = (byTheme[r.tema] || 0) + 1;
  const lim = { 'Mate em 1': 14, 'Mate em 2': 14, 'Mate em 3': 10, 'Garfo': 12, 'Sacrifício': 16, 'Combinação tática': 16 }[r.tema] ?? 10;
  if (byTheme[r.tema] <= lim) final.push(r);
}
console.log(Object.entries(byTheme));

// ---- finais ----
const ends = [
  ['Rei e Dama contra Rei', 'Mate básico', '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', 'Dê mate com dama e rei sem causar afogamento.'],
  ['Rei e Torre contra Rei', 'Mate básico', '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', 'Use a "caixa" para empurrar o rei adversário e dar mate.'],
  ['Posição de Lucena', 'Torres', '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', 'Construa a "ponte" com a torre para promover o peão.'],
  ['Dois Bispos contra Rei', 'Mate básico', '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', 'Os dois bispos devem trabalhar juntos para encurralar o rei.'],
  ['Oposição — Rei e Peão', 'Peões', '8/8/8/3k4/8/3K4/3P4/8 w - - 0 1', 'Use a oposição para escoltar o peão até a promoção.'],
  ['Dama contra Peão em 7ª', 'Dama', '8/8/8/8/8/1k6/p7/2K1Q3 w - - 0 1', 'A dama contra o peão na sétima: encontre o plano vencedor.'],
  ['Cavalo e Bispo contra Rei', 'Mate básico', '8/8/8/4k3/8/8/8/2B1KN2 w - - 0 1', 'O mate mais difícil: exige técnica refinada (Delétang).'],
  ['Torre contra Peão', 'Torres', '8/8/8/8/8/k1K5/p7/7R w - - 0 1', 'Torre contra peão na sétima: encontre o resultado correto.'],
];
const endOut = [];
for (const [nome, cat, fen, desc] of ends) {
  const c = new Chess(fen);
  const r = await search(fen, 20, 1);
  const cpW = (c.turn() === 'w' ? 1 : -1) * score(r[0]);
  const turn = c.turn();
  const objective = Math.abs(cpW) < 120 ? 'draw' : (cpW > 0 ? (turn === 'w' ? 'win' : 'lose') : (turn === 'b' ? 'win' : 'lose'));
  console.log('FINAL', nome, cpW, objective);
  endOut.push({ id: 'e' + (endOut.length + 1), nome, cat, fen, desc, turn, objective, cpW });
}
fs.writeFileSync('src/data/generated.json', JSON.stringify({ puzzles: final, endgames: endOut }, null, 0));
console.log('puzzles', final.length);
process.exit(0);
