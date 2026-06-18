# 01 · Design System (não alterar a identidade)

A identidade já está definida. Use exatamente estes valores.

## Cores (Tailwind)
```js
// tailwind.config.js → theme.extend.colors
campo:   '#1B9E4B', // verde principal — ações, estado ativo
mata:    '#0B4A29', // verde escuro — headers/hero
craque:  '#F4A11A', // laranja/dourado — destaque (MVP, capitão, presidente). Usar pouco.
tinta:   '#16261D', // texto principal
musgo:   '#69786D', // texto secundário
linha:   '#E6EADF', // bordas
areia:   '#F1F4ED', // fundo do app
ausente: '#DC5B45', // erro / negativo / badge de pendência
```
Tons de apoio usados nos mocks: `#EAF5EC` (verde claro de ícone), `#FCEFD6` (creme do craque), `#F6F8F3` (fundo de input/sheet), `#A7AFA1` (ícones/textos inativos), `#C58207` (laranja escuro p/ texto sobre creme).

## Tipografia
- **Display** (títulos, marca): geométrica bold — no mock é *Bricolage Grotesque* (600/700/800).
- **Sans** (corpo, labels, botões): *Hanken Grotesk* (400/500/600/700).
- **Jersey** (números, placar, %, código): condensada — *Saira Condensed* (600/700). Todo número grande usa esta.

```js
fontFamily: {
  display: ['"Bricolage Grotesque"','sans-serif'],
  sans:    ['"Hanken Grotesk"','sans-serif'],
  jersey:  ['"Saira Condensed"','sans-serif'],
}
```
Carregar via `next/font/google`.

## Forma & sombra
- Raios: cards 16–22px, pílulas/inputs 11–14px, ícones-container 10–14px.
- Sombra de card: `shadow-[0_1px_3px_rgba(0,0,0,.05)]`.
- Sombra de botão primário: `shadow-[0_10px_22px_rgba(27,158,75,.3)]`.
- Hero verde: `bg-gradient-to-br from-mata to-campo` + textura de linhas de campo (`repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 1px,transparent 1px 46px)`) + círculo central decorativo.
- Container: `max-w-md mx-auto`. Mobile-first.

## Ícones
Use uma lib de ícones de linha (ex.: `lucide-react`), stroke 2. **Escudo** (`shield`) é o símbolo recorrente de "pelada/grupo".

## Componentes-base a criar/garantir
| Componente | Spec |
|---|---|
| `Button` (primário) | `bg-campo text-white font-semibold rounded-[13px] px-5 py-3.5 shadow-[0_10px_22px_rgba(27,158,75,.3)] active:scale-[.98] transition` |
| `Button` (secundário) | `border-[1.5px] border-linha bg-white text-tinta rounded-[13px] px-5 py-3` |
| `Card` | `bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,.05)]` |
| `Input` | `bg-[#F6F8F3] border-[1.5px] border-linha rounded-[13px] px-3.5 py-3` com ícone à esquerda |
| `PeladaCrest` | quadrado `rounded-xl` com gradiente verde + ícone `shield` branco — avatar de uma pelada |
| `RoleBadge` | `PRESIDENTE` → `bg-[#FCEFD6] text-[#8a5a06]`; `JOGADOR` → `bg-[#EAF5EC] text-mata`. `rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold` |
| `SectionLabel` | rótulo de seção: `font-jersey uppercase tracking-[.1em] text-xs text-[#8a857a]` |
| `BottomNav` | fixa, `bg-white/94 backdrop-blur border-t border-linha`; ativo `text-campo` label bold, inativo `text-[#A7AFA1]` |
