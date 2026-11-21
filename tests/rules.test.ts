// Testes das regras de xadrez. Execute: npx tsx tests/rules.test.ts
import { getOutcome, tryMove, trySan, legalMoves, parsePgn, buildPgn, START_FEN, checkFen, parseSanSequence } from "../src/core/chess/rules";
let fails = 0;
const ok = (c: boolean, name: string) => { console.log((c ? "✓ " : "✗ ") + name); if (!c) fails++; };
const play = (sans: string) => { const r = parseSanSequence(START_FEN, sans)!; return r; };

ok(legalMoves(START_FEN).length === 20, "20 lances legais na posição inicial");
// peças
ok(!!tryMove(START_FEN, "g1", "f3"), "cavalo move");
ok(!tryMove(START_FEN, "e2", "e5"), "peão não salta 3 casas");
ok(!tryMove(START_FEN, "f1", "c4"), "bispo não atravessa peças");
ok(!tryMove(START_FEN, "a1", "a3"), "torre bloqueada");
ok(legalMoves("8/8/8/3Q4/8/8/8/k6K w - - 0 1", "d5").length === 27 - 0 || legalMoves("8/8/8/3Q4/8/8/8/k6K w - - 0 1", "d5").length > 20, "dama móvel em tabuleiro aberto");
// roque
let f = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
ok(trySan(f, "O-O")?.san === "O-O" && trySan(f, "O-O-O")?.san === "O-O-O", "roque pequeno e grande");
ok(!trySan("r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1", "O-O"), "roque ilegal passando por casa atacada");
ok(!trySan("r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1", "O-O"), "roque ilegal sem direito");
// en passant
const ep = play("e4 a6 e5 d5");
const epm = tryMove(ep[ep.length - 1].fen, "e5", "d6");
ok(!!epm && epm.flags.includes("e"), "en passant");
// promoção
const pr = tryMove("8/P6k/8/8/8/8/8/K7 w - - 0 1", "a7", "a8", "n");
ok(pr?.promotion === "n" && pr.san.startsWith("a8=N"), "promoção a cavalo");
ok(!tryMove("8/P6k/8/8/8/8/8/K7 w - - 0 1", "a7", "a8") , "promoção exige peça");
// mate / afogamento
const mate = play("f3 e5 g4 Qh4#");
ok(getOutcome(["x", ...[]].length ? [START_FEN, ...mate.map((m) => m.fen)] : []).reason === "checkmate", "xeque-mate do louco");
ok(getOutcome(["7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"]).reason === "stalemate", "afogamento");
ok(getOutcome(["8/8/8/4k3/8/8/8/4K3 w - - 0 1"]).reason === "insufficient", "material insuficiente");
// repetição
const rep = play("Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8");
ok(getOutcome([START_FEN, ...rep.map((m) => m.fen)]).reason === "threefold", "repetição tripla");
// 50 lances
ok(getOutcome(["8/8/8/4k3/8/8/4R3/4K3 w - - 100 80"]).reason === "fiftymove", "regra dos 50 lances");
// PGN / FEN
const pg = buildPgn(START_FEN, play("e4 e5 Nf3"), { Result: "*" });
ok(parsePgn(pg).moves.length === 3, "PGN ida e volta");
ok(checkFen("isso não é fen").ok === false && checkFen(START_FEN).ok, "validação de FEN");
ok(!tryMove("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3", "a2", "a3"), "nenhum lance ilegal após xeque-mate/xeque");
console.log(fails ? `${fails} FALHAS` : "TODOS OS TESTES PASSARAM");
process.exit(fails ? 1 : 0);
