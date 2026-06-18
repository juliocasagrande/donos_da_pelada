# 02 · Telas de entrada — N1 a N4

Mobile-first, `max-w-md mx-auto`. Tokens e componentes em `01-design-system.md`.

---

## N1 · Login (enxuto)
Estrutura atual mantida, **sem** virar formulário gigante.

- **Hero verde** no topo (~300px): gradiente `from-mata to-campo`, textura de linhas de campo, círculo central; logo (quadrado laranja `craque` com bolinha de futebol), nome "Dono da Pelada" (font display) e tagline "FUTEBOL SEM PLANILHA" (font jersey, tracking largo, cor `#9fe3b8`).
- **Card branco flutuante** sobreposto (`rounded-t-[30px]`, sobe sobre o hero): inputs E-mail e Senha (com ícones `mail`/`lock`/`eye`), link "Esqueci a senha", botão primário **Entrar**, linha "Novo na pelada? **Criar conta**".
- **Divisor "ou"** e, abaixo, botão secundário **"Entrar com código de convite"** (ícone `ticket`) → leva para **N4**. Esse é o único acréscimo: dá entrada direta a quem chegou por link, sem inflar o form.

**Navegação:** Entrar → Dashboard (N5). Criar conta → **N2**.

---

## N2 · Onboarding pós-cadastro — "Como você quer começar?" ★
Aparece **uma vez, logo após criar a conta**. É a peça central da feature multi-pelada.

- **Hero compacto** (~200px) com selo "✓ Conta criada" (pílula translúcida) e título display em 2 linhas: "Salve, {nome}! Como você quer começar?".
- **Card branco** sobreposto com **3 opções empilhadas** (cada uma um card clicável: ícone-container 48px + título display 16px + subtítulo `musgo` + chevron à direita):
  1. **Criar minha pelada** — recomendada: borda `campo` 2px, fundo `#F6FBF7`, tag flutuante "SEU PRÓPRIO GRUPO" (`bg-campo text-white`), ícone escudo+plus em container `campo`. Subtítulo: "Você vira presidente e organiza o grupo". → fluxo de criação de pelada.
  2. **Entrar numa pelada** — borda `linha`, ícone `search` em container `#EAF5EC`. Subtítulo: "Busque pelo nome e peça pra entrar". → **N3**.
  3. **Tenho um convite** — borda `linha`, ícone `ticket` em container `#FCEFD6`. Subtítulo: "Use o código ou link que te mandaram". → **N4**.
- **Rodapé** em texto `#A7AFA1`: "Pode mudar depois — dá pra participar de várias peladas ao mesmo tempo."

---

## N3 · Entrar numa pelada (buscar)
- **App bar** com seta voltar + título "Entrar numa pelada".
- **Campo de busca** (foco: borda `campo`), valor exemplo "Society do Zé".
- Linha "{n} peladas encontradas".
- **Lista de resultados** — cada item é um Card: `PeladaCrest` (escudo) + nome + linha "Local · {n} jogadores", e à direita:
  - botão **Pedir entrada** (`bg-campo`), ou
  - estado **Pendente** (texto `#C58207` + ícone relógio) quando já solicitado.
- **Bloco pontilhado** ao final: "Não achou seu grupo? **Criar uma pelada nova**".

**Estados a tratar:** vazio (nenhum resultado → CTA criar), enviando, solicitação pendente, aprovado (entra na pelada).

---

## N4 · Entrar com convite (código)
- **App bar** com seta voltar + título "Tenho um convite".
- Ícone `ticket` grande em container `#FCEFD6`, texto "Digite o código que te mandaram".
- **Input de código segmentado** (font jersey), formato tipo `PEL-7K2` (3 + separador + 3). Aceitar colar e autopreencher.
- Ao validar o código, surge **card de preview** da pelada: selo "✓ CONVITE VÁLIDO" (`campo`), `PeladaCrest` + nome + "{n} jogadores · Presidente: {nome}", e botão primário **Entrar nesta pelada**.
- Rodapé: "Recebeu um link? Toque nele que preenchemos o código automaticamente." (deep link preenche o código).

**Estados:** vazio, código inválido (borda `ausente` + mensagem), válido (mostra preview), entrando.
