# 03 · Dashboard multi-pelada — N5 e N6

Mobile-first, `max-w-md mx-auto`. Tokens e componentes em `01-design-system.md`.

---

## N5 · Dashboard reorganizado ★
Objetivo: dar protagonismo ao **seletor de pelada** e organizar os atalhos (que hoje variam de 3 a 6 por papel) **sem** competir com os cards-herói.

### Header (3 colunas)
`[logo 36px] [SELETOR — ocupa o meio] [avatar do usuário 36px]`
- **Seletor de pelada ativa** = a pílula central, é o elemento mais proeminente do header:
  - Card branco `rounded-[13px] border border-linha shadow`, contendo: `PeladaCrest` pequeno (28px) + rótulo "PELADA ATIVA" (10px, `#A7AFA1`) sobre o nome da pelada (font display 15px) + chevron-down `campo`.
  - Toque abre o **N6** (bottom sheet).
  - **Só renderiza como seletor clicável se o usuário está em ≥2 peladas.** Em 1 pelada só, mostrar o nome sem chevron (estático).

### Conteúdo (em ordem)
1. Saudação curta "Salve, **{nome}**".
2. **Card-herói "Próxima pelada"** (gradiente `mata→campo`, ponto pulsante `craque`, data/hora, botões "Vou jogar"/"Não vou"). Continua sendo o centro de atenção.
3. **Stats** em grid 2×2 compacto (ícone + número font jersey + label `musgo`).
4. **Seção "Atalhos de jogo"** (`SectionLabel`) — visível a todos, **sempre 3 itens**: Nova pelada, Escalar times, Votar craque. Grid de 3 colunas, cards com ícone `campo` + label.
5. **Seção "Gestão da pelada"** (`SectionLabel` + tag `ADMIN`) — **só para admin/presidente**, separada dos atalhos de jogo, em formato de **lista dentro de um Card** (não grid), cada linha = ícone-container 34px + label + chevron:
   - **Solicitações de entrada** — com **badge contador** `ausente` (ex.: `3`) quando há pendências. É o item de maior prioridade da gestão.
   - **Convites** (ícone `ticket`).
   - **Admins & permissões** (ícone escudo+check).
   - (demais itens de gestão futuros entram nesta lista, não no grid de jogo).

### Bottom nav
Fixa: Início (ativo) · Jogadores · Peladas · Rankings · **Financeiro** (só admin). Ativo `text-campo` bold, inativos `#A7AFA1`.

> Princípio: **atalhos de JOGO** (todos, grid 3) ficam separados de **GESTÃO** (admin, lista com contadores). Isso resolve o grid poluído de 6 itens e deixa convites/solicitações com hierarquia própria, sem brigar com os cards-herói.

---

## N6 · Seletor de pelada (bottom sheet)
Aberto a partir da pílula do header (N5).

- **Overlay** escurecido (`rgba(11,34,22,.45)`) sobre o dashboard.
- **Sheet** subindo de baixo (`rounded-t-[28px]`, fundo `#F6F8F3`), com "grabber" (barrinha 40×5).
- Título display "Suas peladas" + contagem à direita.
- **Lista das peladas do usuário** — cada linha: `PeladaCrest` + nome + (`RoleBadge` PRESIDENTE/JOGADOR) + "{n} jogadores".
  - A **pelada ativa** tem borda `campo` 2px e um check redondo `campo` à direita.
- Divisor, e **duas ações**:
  - **Criar nova** (botão primário, ícone `plus`) → fluxo de criação.
  - **Entrar em outra** (botão secundário, ícone `search`) → **N3**.
- Trocar a pelada ativa fecha o sheet e recarrega o dashboard no contexto da nova pelada (todos os dados — stats, próxima pelada, rankings — passam a ser daquela pelada).

**Comportamento:** fecha ao tocar fora, no grabber (arrastar pra baixo) ou ao selecionar. Animar entrada/saída (slide-up + fade do overlay).
