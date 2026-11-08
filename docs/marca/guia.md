# Guia de marca do LicCONT

Fonte da verdade: o canvas **"LicCONT — Telas do sistema"** (claude.ai,
do responsável), em especial as telas "Login — fundo E1" (escuro) e
"Login — versão clara". Este guia traduz o canvas para os tokens do código
(`src/app/globals.css`). Quando o canvas mudar, atualizar os dois.

## Tipografia

| Uso | Fonte | Pesos |
| --- | --- | --- |
| Texto, campos, botões | IBM Plex Sans | 400, 500, 600 |
| Títulos (`h1`–`h3`, classe `font-titulo`) | Sora | 600 |
| Logo | Sora, maiúsculas | "LIC" 300, "CONT" 700 |

As duas vêm do Google Fonts via `next/font`: baixadas no build e servidas
pelo próprio app (o navegador não chama o Google). Ver decisão 0003.
O canvas também usa JetBrains Mono em códigos; entra quando houver tela
que precise.

Rótulo de campo: 12px, peso 500, maiúsculas, espaçamento 0,04em, cor
`texto-suave`. Campo: altura mínima 48px, texto 15px. Botão: altura mínima
44px, peso 600.

## Cores da marca

| Nome | Hex |
| --- | --- |
| Petróleo | `#0B2E3A` |
| Teal | `#0E7490` |
| Aqua | `#2DD4BF` |
| Menta | `#CCFBF1` |
| Aço | `#4F8592` |

## Tokens por tema

| Token (Tailwind) | Claro | Escuro | Uso |
| --- | --- | --- | --- |
| `fundo` | `#EAF3F4` + luzes aqua/menta | `#05090B` + luz petróleo | Fundo da página |
| `superficie` | branco 78% | `#0B1418` | Cartões, formulários |
| `superficie-2` | branco 60% | `#111D22` | Bloco dentro de cartão (ex.: prefeitura escolhida) |
| `campo` | `#FFFFFF` | `#070D10` | Fundo de campo e lista |
| `texto` | `#0B2E3A` | `#EEF5F6` | Texto principal |
| `texto-suave` | `#3F5E66` | `#9BB8BF` | Rótulos, ajuda |
| `linha` | petróleo 12% | `#1F3239` | Bordas de cartão e divisórias |
| `borda-campo` | `#798C93` | `#4F8592` (aço) | Borda de campo e lista (contraste ≥ 3:1, WCAG 1.4.11) |
| `destaque` | `#0E7490` | `#2DD4BF` | Botão principal, links, foco |
| `destaque-texto` | `#FFFFFF` | `#0B2E3A` | Texto sobre o destaque |
| `erro` | `#B42318` | `#FDA29B` | Mensagens de erro |

As luzes do fundo (degradês radiais) ficam em `--luz`, por tema.

## Logo

Ícone de 9 blocos (3×3): 8 na cor `--logo-bloco`, o do meio à direita
"vazio" (`--logo-vazio`) e um bloco aqua deslocado para cima, saindo da
grade. Ao lado, "LICCONT" em Sora maiúscula. Componente: `src/ui/logo.tsx`.

| | Claro | Escuro |
| --- | --- | --- |
| Blocos | `#0B2E3A` | `#8CC5CF` |
| Vazio | `#D5DCE5` | `#285A66` |
| Destaque | `#2DD4BF` | `#2DD4BF` |

## Pendências

- Borda de campo: o canvas usa a mesma cor das linhas (petróleo 12% no
  claro, `#1F3239` no escuro), com contraste abaixo de 3:1 nos dois temas.
  O código usa `borda-campo`, mais forte, para atender a WCAG 1.4.11.
  Atualizar o canvas para bater com o código.
- Atualizar o canvas da tela de login para a Fase 1 sem "Convidar
  usuário" (vira "Cadastrar usuário") e com "Esqueci a senha" orientando a
  falar com o administrador.
