# Fase 5 — Etiquetas e QR, e o que a Fase 4 deixou

Status: **concluída e na `main`** (PR #51; atualizado em 2026-11-15). Um PR por tarefa, cada um com o teste antes
do código, mesclado na `main` só com o CI verde. Plano geral:
`docs/plano-de-desenvolvimento.md` (linha "5 · Etiquetas e QR": geração e
impressão em lote, leitura pelo celular; pronta quando o QR lido no celular
abre a caixa só depois do login). Fidelidade ao canvas: `docs/telas/`.

## Tarefas e PRs

| # | Tarefa | Prova | Estado |
| --- | --- | --- | --- |
| 1 | **Secretarias**: sigla, telefone, e-mail, responsável, cargo, regras do acervo (prazo de empréstimo, rua preferencial, 4 caixas), telas Secretarias, Nova secretaria e Editar | pgTAP `secretarias_campos.test.sql`, Vitest `esquemas.test.ts`, comparação com o canvas | feito neste PR |
| 2 | **Cadastro**: rótulo "Título do processo", busca de rua, "Salvar e imprimir etiqueta" (depende da 4) | Playwright | feito neste PR |
| 3 | **Início**: KPIs de empréstimos, prazos de guarda, últimas movimentações, ocupação por rua (empréstimos e prazos dependem das Fases 6 e 7: mostram 0 até lá) | Vitest + comparação | feito neste PR |
| 4 | **Etiquetas e QR**: tabela `etiquetas` (código aleatório, RLS), geração e impressão em lote, "Imprimir etiqueta", tela Etiquetas, tela "Caixa lida pelo celular" (QR abre `/mapa?caixa=<id>` só depois do login) | pgTAP de isolamento, Vitest, Playwright | feito neste PR |
| 5 | **Telas sem rota**: Empréstimos, Temporalidade, Auditoria (leitura da auditoria que já existe); botões "em breve" de empréstimo ficam desabilitados até a Fase 6 | comparação | feito neste PR |
| 6 | **Visualizador de PDF**: resolução, cópia de leitura, SHA-256 se o dado existir; "Imprimir" | Vitest | feito neste PR |
| 7 | **Equipe** (`/equipe`, Nova prefeitura, Detalhe) e telas de **Erro** (sessão expirada, 404, 403, 500) | comparação | feito neste PR |
| 8 | **Mapa, decisões do responsável (2026-11-14)**: (a) na vista Planta do Mapa, paredes e metros aparecem só no Editor da planta; a Planta do Mapa fica sem eles; (b) o Editor da planta passa a trabalhar em metros (tamanho de rua, posições e comprimento), conforme `metrosCelula` em `src/features/mapa/` | Vitest da conversão, Playwright do editor, comparação | feito neste PR |

## Tarefa 1 — decisões

- Colunas novas em `secretarias` (todas opcionais ou com padrão; só
  adiciona): `sigla` (2 a 12 letras/números, única por prefeitura),
  `telefone`, `email_contato`, `responsavel_id` e `rua_preferencial_id`
  (chave composta com `prefeitura_id`: nunca apontam para outra
  prefeitura), `cargo_responsavel`, `recebe_licitacoes`, `recebe_contratos`,
  `exige_aprovacao_emprestimo`, `avisar_atrasos`, `prazo_emprestimo_dias`.
- RLS e GRANT: as políticas não mudam (ler: prefeitura; escrever: só o
  administrador). GRANT de INSERT e UPDATE só nas colunas novas. Sem DELETE,
  sem `anon`.
- O e-mail e o telefone são da secretaria (institucionais), não de pessoa.
  O responsável é uma referência (id); o nome vem de `usuarios`, que só o
  administrador lista.
- Prazos oferecidos: 7, 10, 15, 30, 45 e 60 dias.
- O texto "O responsável recebe um aviso por e-mail" está no quadro, mas o
  envio de e-mail depende de um serviço externo ainda não registrado
  (regra 4 do CLAUDE.md). Fica como no quadro; o aviso real entra com a
  Fase 6 (alertas), junto do registro em `docs/lgpd/suboperadores.md`.
- As regras do acervo (recebe licitações/contratos, aprovação, avisos,
  prazo, rua preferencial) são gravadas agora e usadas pelas Fases 5 a 6.
  A "Rua preferencial" será usada na sugestão de caixa do cadastro.
- A coluna "Documentos" da lista passa a contar de verdade.

## Pendências fechadas em 2026-11-15

- As linhas Auditoria, Etiquetas e "Caixa lida pelo celular" de `docs/telas/README.md` e `telas.json` apontam para as rotas reais (`/auditoria`, `/etiquetas`, `/etiquetas/celular`).
- Aviso por e-mail das secretarias: o envio está **pronto e desligado** (`src/lib/email/enviar.ts`, decisão 0010). Liga quando `EMAIL_API_KEY` e `EMAIL_REMETENTE` existirem na Vercel; até lá o aviso fica só na tela.
