# Dono da Pelada — Refatoração multi-pelada (handoff)

Pacote para o **Claude Code** refatorar/criar 6 telas (N1–N6) do app Next.js + Tailwind.

## Como usar
1. Abra `mock-visual.html` no navegador para ver os layouts das 6 telas.
2. Copie o conteúdo de `PROMPT.md` e cole no Claude Code, anexando esta pasta inteira.
3. Siga a ordem sugerida: telas de entrada (N1–N4), depois dashboard (N5–N6).

## Arquivos
| Arquivo | Conteúdo |
|---|---|
| `PROMPT.md` | Prompt pronto para colar + regras e fluxo de navegação |
| `01-design-system.md` | Tokens de cor, fontes, componentes-base (identidade — não mudar) |
| `02-login-onboarding.md` | Specs das telas **N1, N2, N3, N4** |
| `03-dashboard.md` | Specs das telas **N5, N6** |
| `mock-visual.html` | Mockup visual de referência (abre offline) |

## As 6 telas
- **N1** Login enxuto + atalho "entrar com código"
- **N2** Onboarding pós-cadastro "Como você quer começar?" (criar / buscar / convite)
- **N3** Entrar numa pelada (buscar + pedir entrada)
- **N4** Entrar com convite (código)
- **N5** Dashboard reorganizado (seletor de pelada + atalhos Jogo/Gestão)
- **N6** Seletor de pelada (bottom sheet)
