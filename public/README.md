# ♞ CHESS UNIVERSE — Plataforma Pessoal de Xadrez 2D, Laboratório de Gambitos & Stockfish IA

**CHESS UNIVERSE** é uma aplicação web estática de xadrez 2D de nível profissional, projetada para rodar **100% diretamente no navegador**, sem necessidade de backend, banco de dados externo, login ou servidores pagos. É totalmente compatível com **GitHub Pages**.

---

## ✨ Funcionalidades Principais

### 1. Inteligência Artificial Real (Stockfish em Web Worker + WASM/JS)
- Execução assíncrona via **Web Worker** que jamais trava a interface visual.
- Suporte nativo a **WebAssembly (`stockfish.wasm` / `stockfish.wasm.js`)** com fallback automático para `stockfish.js` e Worker UCI dedicado.
- **9 Níveis Reais de Força** configurados com parâmetros autênticos do motor (`Skill Level` 0 a 20, profundidade de busca e tempo de reflexão configurável):
  1. **Iniciante** (~600 ELO | Skill Level 0)
  2. **Fácil** (~950 ELO | Skill Level 3)
  3. **Intermediário** (~1300 ELO | Skill Level 7)
  4. **Avançado** (~1650 ELO | Skill Level 10)
  5. **Especialista** (~1950 ELO | Skill Level 13)
  6. **Mestre** (~2250 ELO | Skill Level 16)
  7. **Grande Mestre** (~2550 ELO | Skill Level 18)
  8. **Elite** (~2800 ELO | Skill Level 19)
  9. **Força Máxima** (3200+ ELO | Skill Level 20 irrestrito)
- **Telemetria MultiPV em Tempo Real**: Avaliação em centipawns (`+1.45`) ou mate forçado (`M3`), profundidade (`depth`), melhores linhas de continuação (`PV`) e seta tática do melhor lance.

### 2. Laboratório de Gambitos (Prioridade Máxima)
- Repertório completo de **Gambitos de Brancas e Pretas**:
  - **Brancas**: *Gambito do Rei* (Aceito Clássico, Defesa Fischer, Variante Cunningham, Gambito Muzio, Recusado Contra-gambito Falkbeer, Clássico `2...Bc5`, Gambito do Bispo), *Gambito da Dama* (Aceito, Armadilha de `3...b5`, Recusado Ortodoxo, Defesa Eslava, Contra-gambito Albin), *Gambito Evans* (Linha Principal de Kasparov, Defesa Lasker, Ataque Morphy, Recusado), *Gambito Dinamarquês* (Duplo Sacrifício, Defesa Schlechter, Recusado), *Gambito Escocês & Göring* (Ataque Max Lange, Variante Haxo, Göring), *Gambito Smith-Morra vs Siciliana* (Scheveningen, Armadilha Siberiana, Alapin).
  - **Pretas**: *Gambito Stafford* (Armadilha *"Oh No My Queen!"*, Ataque `...h5/...Ng4`, Linha `5.e5`), *Gambito Budapeste* (Variante Adler, Armadilha do Mate Sufocado `8...Nd3#`, Fajarowicz), *Gambito Benko / Volga* (Aceito Fianchetto, Semi-Aceito `5.b6`), *Gambito Englund* (Armadilha de Mate em `c1`, Linha Crítica `6.Nc3`).
- **Árvore de Variantes Navegável**: Clique em qualquer nó da árvore para saltar diretamente à posição, comparar respostas e ler a explicação tática.
- **Obediência Teórica + Transição Automática para o Stockfish**: A IA executa fielmente a defesa selecionada durante a linha teórica e passa a jogar com o motor Stockfish caso o jogador saia da teoria ou conclua a variante.
- **Criador de Treinamentos Personalizados**: Crie e salve seus próprios treinamentos com qualquer código **FEN** ou sequência **PGN/SAN**.

### 3. Todos os 11 Modos de Jogo e Estudo Funcionalmente Completos
1. **Laboratório de Gambitos**
2. **Partida Clássica** (`15+10`, `30+0`)
3. **Partida Rápida** (`10+0`, `10+5`)
4. **Partida Blitz** (`5+3`, `3+2`)
5. **Partida Bullet** (`1+0`, `2+1`)
6. **Partida Sem Relógio (Livre)**
7. **Estudo de Aberturas** (Ruy Lopez, Italiana, Siciliana Najdorf, Francesa Winawer, Caro-Kann, Índia do Rei, Sistema Londres, Catalã)
8. **Desafios Táticos** (Problemas interativos de cálculo com verificação de solução, dicas, sequência de vitórias e Rating Tático)
9. **Treinamento de Finais** (Posição de Lucena, Oposição Direta, Regra do Quadrado, Mate de Duas Torres, Dama e Torre jogados contra o Stockfish)
10. **Análise Profunda** (Precisão `0–100%`, classificação de lances `Brilhante !!`, `Melhor ★`, `Bom ✓`, `Teoria 📖`, `Imprecisão ?!`, `Erro ?`, `Grande Erro ??`, gráfico interativo de avaliação, momentos decisivos e importação de PGN)
11. **Editor de Posições** (Montagem livre de peças no tabuleiro, configuração de turno e roques `KQkq`, exportação/importação FEN)

### 4. Áudio Sintetizado em Tempo Real & Salvamento Local
- Efeitos sonoros reais gerados via **Web Audio API** para **Movimento, Captura, Xeque, Xeque-Mate, Roque, Promoção, Vitória, Derrota, Empate e Interface**, além de **Música Ambiente opcional** e controles individuais de volume.
- Salvamento automático em `localStorage` de todas as preferências visuais, temas, volume, histórico de partidas, gambitos favoritos, estatísticas e treinamentos personalizados.

---

## 🚀 Como Publicar Gratuitamente no GitHub Pages (Passo a Passo Sem Programar)

O projeto compilado na pasta `dist/` (ou todo o repositório) está pronto para ser publicado gratuitamente no **GitHub Pages**. Siga os passos abaixo:

### Passo 1: Criar uma Conta e um Repositório no GitHub
1. Acesse [https://github.com](https://github.com) e entre na sua conta (ou clique em **Sign up** para criar uma conta gratuita).
2. No canto superior direito da página, clique no ícone **`+`** e selecione **New repository** (Novo repositório).
3. No campo **Repository name**, digite o nome desejado para o seu jogo, por exemplo: `chess-universe`.
4. Marque a opção **Public** (Público — necessário para usar o GitHub Pages gratuito).
5. Marque a caixa **Add a README file** (Adicionar um arquivo README).
6. Clique no botão verde **Create repository** no final da página.

### Passo 2: Enviar os Arquivos Prontos do Jogo
Você não precisa instalar nenhum programa no computador para enviar os arquivos:
1. Dentro da página do seu novo repositório no GitHub, clique no botão **Add file** (Adicionar arquivo) e selecione **Upload files** (Enviar arquivos).
2. Abra a pasta `dist/` gerada pelo projeto no seu computador (que contém o `index.html` e a pasta `stockfish/` com `stockfish.js`, `stockfish.wasm` e `stockfish.wasm.js`).
3. Arraste todos os arquivos de dentro da pasta `dist/` para a área pontilhada no navegador do GitHub.
4. Aguarde o carregamento terminar e, no final da página, clique no botão verde **Commit changes** (Confirmar alterações).

### Passo 3: Ativar o GitHub Pages
1. No menu superior do seu repositório no GitHub, clique na aba **Settings** (Configurações — ícone de engrenagem).
2. Na barra lateral esquerda, procure e clique em **Pages** (fica na seção *Code and automation*).
3. Em **Build and deployment** -> **Source**, mantenha selecionado **Deploy from a branch**.
4. Logo abaixo, em **Branch**, clique no botão que diz `None` e selecione **`main`** (ou `master`), mantenha a pasta como **`/ (root)`** e clique em **Save** (Salvar).

### Passo 4: Encontrar o Endereço Público do Seu Jogo
1. Aguarde cerca de **1 a 2 minutos** após clicar em *Save*.
2. Atualize (recarregue) a página **Settings -> Pages**.
3. No topo da página aparecerá uma caixa dizendo:
   > **Your site is live at `https://seu-usuario.github.io/chess-universe/`**
4. Clique em **Visit site**! Esse é o link público do seu **CHESS UNIVERSE**, que funciona em qualquer computador, tablet ou celular sem instalar nada.

### Passo 5: Como Atualizar o Jogo Depois
Sempre que quiser atualizar o jogo:
1. Abra o seu repositório no GitHub.
2. Clique em **Add file** -> **Upload files**.
3. Arraste os novos arquivos atualizados (substituindo os antigos) e clique em **Commit changes**.
4. Em cerca de 1 minuto o GitHub Pages atualizará automaticamente o endereço público do jogo!

---

## 🛠️ Estrutura Modular do Projeto

```text
├── index.html                        # Ponto de entrada HTML5
├── public/
│   ├── stockfish/
│   │   ├── stockfish.js              # Motor Stockfish JS para Web Worker
│   │   ├── stockfish.wasm.js         # Loader WebAssembly do Stockfish
│   │   └── stockfish.wasm            # Binário WebAssembly do Stockfish
├── src/
│   ├── types/chess.ts                # Tipagens completas do ecossistema
│   ├── engine/stockfishWorker.ts     # Controlador UCI Web Worker + 9 níveis reais
│   ├── audio/soundEngine.ts          # Sintetizador acústico Web Audio API + música
│   ├── storage/localStore.ts         # Persistência automática em LocalStorage
│   ├── analysis/gameAnalyzer.ts      # Sistema de Análise Profunda e Precisão
│   ├── data/
│   │   ├── gambitsData.ts            # Banco de Gambitos e Árvore de Variantes
│   │   └── openingsAndTrainingData.ts# Aberturas, Desafios Táticos e Finais
│   ├── components/
│   │   ├── ChessBoard2D.tsx          # Tabuleiro 2D, Barra de Avaliação e Setas SVG
│   │   ├── ChessPieceSVG.tsx         # Peças vetoriais (3 famílias visuais)
│   │   ├── GambitLabPanel.tsx        # Interface do Laboratório de Gambitos
│   │   ├── DeepAnalysisPanel.tsx     # Painel de Análise Profunda e Gráfico
│   │   ├── PositionEditorPanel.tsx   # Editor de Posições e FEN
│   │   ├── TrainingModulesPanel.tsx  # Estudo de Aberturas, Tática e Finais
│   │   └── SettingsAndHistoryModal.tsx # Configurações, Temas, Áudio e Histórico
│   └── App.tsx                       # Aplicação principal integrada
└── README.md                         # Documentação e guia do GitHub Pages
```
