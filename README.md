# ♞ CHESS UNIVERSE

Plataforma de xadrez 2D que roda **100% no navegador**: Stockfish 19 (WebAssembly) em Web Worker, laboratório de gambitos, estudo de aberturas, desafios táticos, treino de finais, análise profunda de partidas, editor de posições, sons e salvamento local.

Sem backend, sem login, sem multiplayer, sem servidores pagos. Compatível com **GitHub Pages**.

---

## O que tem dentro

| Modo | Descrição |
|---|---|
| **Jogar** | Clássica (15+10), Rápida (10), Blitz (3+2), Bullet (1) e Sem relógio contra o Stockfish. Dica, desfazer, empate (a IA avalia a proposta), desistência, retomada de partida em andamento após fechar o navegador. |
| **Laboratório de Gambitos** | 22 gambitos (11 de brancas, 11 de pretas), ~120 variantes em árvore navegável. Você escolhe o gambito, a cor, a **defesa que a IA executará**, a **posição inicial do treino**, e pode sair da teoria a qualquer momento (o Stockfish assume), voltar a qualquer posição, retomar a teoria, comparar variantes lado a lado com avaliação do motor e consultar o melhor lance. Treinos personalizados por **FEN** e **PGN/SAN**. Favoritos e progresso salvos. |
| **Estudo de Aberturas** | 13 aberturas/defesas (Italiana, Ruy López, Escocesa, Inglesa, Londres, Catalã, Najdorf, Francesa, Caro-Kann, Índia do Rei, Nimzo-Índia, Escandinava, Petrov, Grünfeld) com a mesma árvore e treino. |
| **Desafios Táticos** | 135 problemas reais do banco aberto do Lichess (CC0), rating adaptativo, dicas, filtro por tema. |
| **Treinamento de Finais** | 12 posições clássicas (mates básicos, peões, Lucena, defesas de empate). A IA defende em força máxima. Avaliações verificadas com Stockfish. |
| **Análise de Partidas** | Importa PGN/FEN ou usa o histórico. Precisão, imprecisões/erros/grandes erros, melhores lances, lances brilhantes, gráfico de avaliação, momentos decisivos, comparação com o Stockfish, recomendações de treino, motor ao vivo com várias linhas clicáveis e exploração de variantes. |
| **Editor de Posições** | Arrastar/clicar peças, lado a jogar, roque, en passant, validação de FEN, usar para jogar/analisar/treinar. |
| **Perfil / Configurações** | Estatísticas, histórico, temas de tabuleiro/peças/interface, volumes individuais, música ambiente, backup (exportar/importar JSON). |

### Níveis da IA (parâmetros reais do Stockfish)

| Nível | Skill Level | UCI_LimitStrength / Elo | Profundidade máx. |
|---|---|---|---|
| Iniciante | 0 | ≈1320 | 1 |
| Fácil | 3 | ≈1450 | 3 |
| Intermediário | 7 | ≈1650 | 5 |
| Avançado | 11 | ≈1900 | 8 |
| Especialista | 14 | ≈2200 | 11 |
| Mestre | 17 | ≈2500 | 14 |
| Grande Mestre | 19 | sem limite | 18 |
| Elite | 20 | sem limite | 24 |
| Força máxima | 20 | sem limite | sem limite (usa o *tempo de reflexão* configurável) |

---

## Publicar no GitHub Pages (passo a passo, sem programar)

### 1. Criar uma conta e um repositório
1. Acesse <https://github.com> e crie uma conta gratuita (ou entre na sua).
2. Clique em **+** (canto superior direito) → **New repository**.
3. Em *Repository name* escreva, por exemplo, `chess-universe`. Deixe **Public** marcado e clique em **Create repository**.

### 2. Enviar os arquivos
1. Na página do repositório recém-criado clique em **uploading an existing file**.
2. Arraste **todo o conteúdo desta pasta do projeto** (inclusive as pastas `src`, `public`, `scripts`, `tests` e `.github`, e os arquivos `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `README.md`). **Não envie** `node_modules` nem `dist`.
   > Dica: a pasta oculta `.github` precisa ser enviada — é ela que contém a publicação automática. Se o seu sistema não deixa arrastar pastas ocultas, use o botão **Add file → Create new file**, digite `.github/workflows/deploy.yml` e cole o conteúdo do arquivo.
3. Clique em **Commit changes**.

### 3. Ativar o GitHub Pages
1. No repositório: **Settings** → **Pages** (menu à esquerda).
2. Em **Build and deployment → Source** escolha **GitHub Actions**.
3. Vá na aba **Actions**: o fluxo "Publicar no GitHub Pages" roda sozinho (1–2 min). Quando ficar verde ✓, está publicado.
   (Se não iniciou, abra o fluxo e clique em *Run workflow*.)

### 4. Encontrar o endereço público
Em **Settings → Pages** aparece: *Your site is live at* **`https://SEU-USUARIO.github.io/chess-universe/`**. Esse é o link do jogo — pode compartilhar.

### 5. Atualizar o jogo depois
Qualquer alteração enviada ao branch `main` (arquivo editado pelo site do GitHub ou novo upload com *Add file → Upload files*, mantendo os mesmos nomes) republica automaticamente em poucos minutos.

### Alternativa: publicar a pasta já compilada
Se preferir não usar Actions: rode `npm install && npm run build` no seu computador e envie o conteúdo de `dist/` para um repositório; em **Settings → Pages** escolha *Deploy from a branch* → `main` / `(root)`.

---

## Como o Stockfish é carregado (WASM e caminhos relativos)

* Versão: **Stockfish 19 "lite", single-thread** (pacote npm `stockfish`, licença GPLv3 — veja `public/stockfish/LICENSE-GPLv3.txt`). Escolhida porque **GitHub Pages não envia os cabeçalhos COOP/COEP** exigidos pelas versões multi-thread.
* `public/stockfish/stockfish-lite-single.js` e `.wasm` são copiados para `dist/stockfish/`. O app carrega `./stockfish/stockfish-lite-single.js` com **caminho relativo** (funciona em subpastas como `/chess-universe/`).
* Se esses arquivos não puderem ser carregados (ex.: só o `index.html` foi copiado), o app usa automaticamente a **cópia embutida** no próprio `index.html` (JS + WASM em base64) via Blob URL. A tela *Configurações → Motor de xadrez → Testar* informa qual fonte está ativa.
* O motor roda em **Web Worker**: a interface nunca trava.

## Desenvolvimento

```bash
npm install
npm run dev       # servidor local
npm run build     # gera dist/ (index.html único + pasta stockfish/)
npx tsx tests/rules.test.ts          # testes das regras (roque, en passant, promoção, mate, afogamento, repetição, 50 lances, PGN/FEN)
npx tsx scripts/validate-theory.ts   # valida a legalidade de TODAS as variantes e avalia as folhas com Stockfish
node scripts/embed-stockfish.mjs     # regenera a cópia WASM embutida
```

Estrutura:

```
src/core/chess      regras (chess.js), hook de partida, PGN/FEN
src/core/engine     Stockfish (worker), níveis, hook da IA
src/core/analysis   análise de partidas (precisão, classificação, momentos)
src/core/audio      efeitos e música sintetizados (Web Audio)
src/core/storage    localStorage (histórico, stats, treinos, backup)
src/core/settings   configurações e temas
src/data            gambitos, aberturas, finais, problemas táticos
src/ui              tabuleiro, peças, componentes
src/features        telas (Jogar, Laboratório, Táticas, Finais, Análise, Editor…)
```

## Testes realizados

Executados em navegador real (Chromium headless) e em Node:

* Regras: 20 verificações automatizadas (movimentos, roque legal/ilegal, en passant, promoção, mate do louco, afogamento, material insuficiente, repetição tripla, regra dos 50 lances, PGN/FEN) — todas passaram.
* Teoria: as ~210 posições de gambitos/aberturas foram checadas lance a lance (todos legais) e avaliadas com Stockfish; linhas em que o motor discorda da teoria estão **sinalizadas nas notas** (ex.: Muzio, Halloween, Latviano).
* Navegador: carregamento do WASM (arquivos e fallback embutido), partida contra o Stockfish com resposta da IA, laboratório (teoria seguida pela IA, desvio → "Fora da teoria"), análise completa de um PGN, editor, finais, configurações, perfil e persistência após recarregar a página — **sem erros no console**.
* Áudio: sintetizado por Web Audio; o código foi executado sem erros, mas a qualidade sonora só pode ser julgada ouvindo (Configurações → Áudio tem botões de teste para cada som).

## Limitações honestas

* O Stockfish *lite single-thread* é bem forte, porém mais fraco que a versão completa com rede NNUE grande (~94 MB, inviável para GitHub Pages).
* A teoria dos gambitos foi escrita com linhas principais conhecidas e conferida quanto a legalidade e sanidade pelo motor, mas **não substitui um livro de aberturas**; use as avaliações do Stockfish embutidas para conferir.
* Dados ficam somente no navegador/dispositivo (sem sincronização). Use *Exportar backup* para levá-los.
* Problemas táticos: 135 selecionados do banco do Lichess (ratings de ~400 a ~2000).

## Créditos e licenças
Stockfish.js (GPLv3), chess.js (BSD), peças de xadrez do projeto Lichess (cburnett, merida, staunty, cardinal, companion — licenças livres), problemas do Lichess (CC0). Como o projeto inclui Stockfish (GPLv3), distribua-o também sob GPLv3.
