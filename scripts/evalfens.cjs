const sf = require("stockfish")("lite-single", l=>handler(l));
let handler=()=>{};
const fens = process.argv.slice(2);
const ev = (fen)=>new Promise(res=>{let last="";const w=fen.split(" ")[1]==="w"?1:-1;handler=l=>{const m=l.match(/score (cp|mate) (-?\d+)/);if(m&&l.includes(" pv "))last=m[1]==="cp"?String(+m[2]*w):"mate"+(+m[2]*w);if(l.startsWith("bestmove"))res(last)};sf.processCommand("position fen "+fen);sf.processCommand("go depth 20")});
(async()=>{sf.processCommand("uci");for(const f of fens){console.log((await ev(f)).padStart(8),f)}process.exit(0)})();
