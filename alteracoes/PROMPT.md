# PROMPT — colar no Claude Code

> Cole este texto no Claude Code com a pasta `claude-code/` anexada (e abra `mock-visual.html` no navegador para ver os layouts).

---

Você vai refatorar/criar **6 telas** do meu app **Next.js + Tailwind** chamado **Dono da Pelada** (PWA mobile-first, gestão de futebol amador entre amigos), para acomodar a nova feature de **multi-pelada** (multi-tenant): o app agora suporta várias peladas/grupos independentes, e um usuário pode participar de mais de uma, criar a sua, buscar uma existente ou entrar por convite.

**As 6 telas-alvo (frames `N1`–`N6` no `mock-visual.html`):**
- **N1** — Login (enxuto + atalho "entrar com código")
- **N2** — Onboarding pós-cadastro "Como você quer começar?" (criar / buscar / convite)
- **N3** — Entrar numa pelada (buscar pelo nome + pedir entrada)
- **N4** — Entrar com convite (código)
- **N5** — Dashboard reorganizado (seletor de pelada no header + atalhos divididos em Jogo/Gestão)
- **N6** — Seletor de pelada (bottom sheet)

**Specs nos arquivos da pasta:**
- `01-design-system.md` — tokens de cor, fontes e componentes-base (NÃO mudar a identidade visual; já está definida).
- `02-login-onboarding.md` — telas **N1, N2, N3, N4**.
- `03-dashboard.md` — telas **N5, N6**.
- `mock-visual.html` — mockup visual de referência das 6 telas.

**Regras:**
1. Sem bibliotecas de UI externas — é tudo Tailwind + componentes próprios simples. Animações: `framer-motion` se já estiver no projeto; senão CSS puro.
2. Mantenha a identidade visual do `01-design-system.md` (cores, fontes, raios, gradiente do hero, escudo/bolinha). Mobile-first, container `max-w-md`.
3. Preserve minha lógica e meus dados atuais — troque estrutura/visual, não a regra de negócio. Não invente telas além de N1–N6.
4. Comece criando/atualizando os componentes reutilizáveis do design system; depois aplique tela por tela.
5. Fluxo de navegação:
   - **Login (N1)** → se já tem conta, vai direto pro Dashboard (N5). Rodapé "Entrar com código de convite" → N4.
   - **Criar conta** → **N2 (onboarding)**, que ramifica em: *Criar minha pelada* (seu fluxo de criação), *Entrar numa pelada* → **N3**, *Tenho um convite* → **N4**.
   - O passo N2 aparece **só logo após criar a conta** — nunca dentro do formulário de login.
   - **N5** header: a pílula de pelada ativa abre o **N6 (bottom sheet)**.

Comece pelas telas de entrada (`02-login-onboarding.md`, N1→N4). Ao terminar cada tela, me mostre os arquivos alterados e um resumo do que mudou antes de seguir para o dashboard.
