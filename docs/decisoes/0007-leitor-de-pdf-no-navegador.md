# 0007 — Leitor de PDF no navegador (pdf.js)

Data: 2026-11-14 · Fase 3

## Decisão

Usar a biblioteca `pdfjs-dist` (Mozilla, licença Apache-2.0, gratuita) no
navegador para: gerar a miniatura da página 1, avisar sobre PDF/A e 300 dpi
e mostrar o PDF na tela de visualização.

## Por quê

Visualização igual em qualquer navegador, leitura por partes (HTTP Range)
sem baixar o arquivo inteiro e miniatura sem servidor de imagem.

## Serviço externo?

Não. A biblioteca roda no navegador do usuário e o PDF vem do Storage do
Supabase (já registrado em 0003). Nenhum dado vai a terceiros novos, então
`docs/lgpd/suboperadores.md` não muda.

## Efeitos

- CSP (`src/proxy.ts`): `connect-src` aceita o domínio do Storage e
  `worker-src` aceita o worker do pdf.js do próprio site.
- Links assinados do PDF valem 5 minutos e são renovados na tela aberta.
- Atualização segue a decisão 0004.
