# 0009 — PDF e Word do termo de eliminação com bibliotecas no servidor

Data: 2026-11-15 · Fase 7

## Decisão

Gerar a listagem e o termo de eliminação no servidor, sem serviço externo, com
`pdf-lib` (MIT) para o PDF e `docx` (MIT) para o Word. Versões exatas no
`package.json`. O PDF usa a fonte padrão Helvetica; o texto sai do código
(`src/features/temporalidade/termo.ts`), sem baixar fonte nem modelo de fora.

## Por quê

O termo precisa existir em PDF (assinatura e arquivo) e Word (a prefeitura
ajusta). Bibliotecas rodando no servidor da Vercel não enviam dado a ninguém e
não custam nada. A Fase 6 (termo de empréstimo) deve reaproveitar as mesmas
bibliotecas em um módulo comum.

## Serviço externo?

Não. `docs/lgpd/suboperadores.md` não muda. O termo não leva CPF nem nome de
pessoa: só órgão, secretaria, lista de documentos (tipo, número, objeto, caixa,
período) e linhas de assinatura em branco.

## Base legal e prazos

- Lei 8.159/1991, art. 9º: eliminação de documentos públicos depende de
  autorização da instituição arquivística pública da esfera de competência.
- Resolução CONARQ 40/2014 (nova redação da 44/2020): listagem de eliminação,
  edital de ciência e termo de eliminação. O sistema segue esse fluxo e usa
  **45 dias** de ciência do edital (constante `PRAZO_CIENCIA_DIAS` e função
  `public.descarte_aprovar`). **Confirmar o prazo e o modelo com o jurídico da
  prefeitura**: a autorização do arquivo público competente e a aprovação da
  listagem pela autoridade máxima do órgão acontecem fora do sistema.
- A tabela de temporalidade é da prefeitura (comissão de avaliação). O sistema
  não traz prazos oficiais pré-carregados.
