# Fase 7 — Temporalidade e descarte

Status: **implementada, telas pelos quadros do canvas** (2026-11-15). O PR #51 (Fase 5) já
está na `main`. As decisões do responsável estão em "Decisões do responsável"
e o que foi feito em "Entregue neste PR". Plano geral: `docs/plano-de-desenvolvimento.md`, linha "7 ·
Temporalidade": tabela de prazos, fila de descarte, termo de eliminação com
aprovação. Fidelidade ao canvas: `docs/telas/` (quadros `TemporalidadeEscuro`
e `TemporalidadeClaro`).

## Regra de pronto (não negociável)

**Nenhum documento é apagado sem termo de eliminação aprovado e registrado.**
Até lá, e depois, o documento só é **desativado** (`ativo = false`), nunca
apagado (`DELETE` não existe para ninguém em `documentos`). A eliminação é um
estado alcançado por uma única função de banco que exige termo aprovado.

## Por quê

Hoje o acervo só cresce: a Fase 3 deixou "desativar" sem prazo e sem
critério, e a tela Temporalidade da Fase 5 mostra dados de exemplo. A Fase 7
faz a prefeitura cadastrar sua tabela de prazos de guarda, ver o que venceu,
e eliminar com termo assinado, comissão e rastro na auditoria, em vez de
jogar papel fora sem registro.

## O que a Fase 5 deixou pronto

Já no PR #51 (branch `fase5/secretarias`), **a mesclar**:

| Item | Onde | Uso na Fase 7 |
| --- | --- | --- |
| Tela `/temporalidade` (3 cartões, tabela de regras, lista "Prontos para eliminação", botões "Nova regra de prazo", "Editar tabela", "Gerar termo de eliminação", "Imprimir listagem" desabilitados "Em breve") | `src/app/temporalidade/page.tsx` | Vira funcional; layout já bate com o quadro |
| Camada de dados `lerTemporalidade()` (demo preenchido; produção devolve zeros e listas vazias) e tipos `RegraPrazo`, `ProntoEliminacao`, `PrazoAVencer`, `ResumoTemporalidade` | `src/features/movimento/` | Troca o ramo vazio pela leitura das tabelas novas; os tipos são o contrato de saída |
| Dados fictícios `REGRAS_DEMO`, `PRONTOS_DEMO`, `RESUMO_TEMPORALIDADE_DEMO` | `src/features/demo/movimento.ts` | Base da demonstração; ampliar em arquivo próprio (ver contrato) |
| Início com cartão de prazos de guarda e "Vencem em 90 dias" mostrando 0 em produção | `src/app/inicio/page.tsx` | Passa a contar de verdade pelo mesmo `lerTemporalidade()` |
| Tela `/auditoria` lendo a tabela `auditoria` (só inclusão) | `src/app/auditoria/` | Aprovação e eliminação passam a aparecer nela |
| Item "Temporalidade" na navegação lateral | `src/features/sessao/barra-lateral.tsx` | Já existe; só garantir o papel que enxerga |
| Secretarias com `responsavel_id` e `email_contato` | migração `20261118120000_secretarias_campos.sql` | Destinatário do aviso "avisar o responsável do setor" |

Já na `main`: `documentos` com `ativo` (desativar, nunca apagar), `arquivos`
com `ativo` e Storage privado, estrutura física, mapa, auditoria geral,
perfis (administrador, coordenador, operador, consulta), modo demonstração.

**Depende do merge do #51** (não existe na `main`): tela Temporalidade e
`features/movimento`, KPIs do Início, rotas e item de menu, campos da
secretaria. Por isso nenhuma tarefa abaixo começa antes do merge. Se o #51
mudar na revisão, reler este plano.

## Tarefas e PRs

Um PR por tarefa, teste antes do código, mesclado só com CI verde.

| # | Tarefa | Prova | Estado |
| --- | --- | --- | --- |
| 1 | **Tabela `tabela_temporalidade`** (tipo de documento, prazo fase corrente, prazo intermediária, destinação final: eliminação ou guarda permanente) com RLS, GRANT só para os papéis necessários, sem DELETE e sem `anon`; coluna de início da contagem no documento (ver decisões) | pgTAP `temporalidade_isolamento.test.sql`: outra prefeitura não lê nem escreve; consulta e operador não escrevem; tipo repetido na mesma prefeitura é recusado; entrada em `convencao_isolamento.test.sql` | a fazer |
| 2 | **Editar a tabela de prazos** (botões "Nova regra de prazo" e "Editar tabela"): Server Actions com Zod, só administrador; alteração de prazo grava na auditoria; `AVISO_DEMO` em demonstração | Vitest dos esquemas (prazos inteiros, limites, destinação) e da permissão; Playwright: criar e editar regra | a fazer |
| 3 | **Cálculo de vencimento e cartões** (`vencem em 90 dias`, `prontos para eliminação`, `guarda permanente`): função pura que, por tipo e data de início, diz fase, vencimento e destino; leitura real no lugar dos zeros de `lerTemporalidade()` e do Início | Vitest com datas de borda (fuso `America/Sao_Paulo`, ano bissexto, 31 de dezembro); Vitest de que documento de guarda permanente nunca entra em "prontos"; comparação com o canvas | a fazer |
| 4 | **Tabela `descartes`** (termo) e `descarte_itens` (documentos do termo), com RLS, sem DELETE, sem `anon`; função de banco que cria o termo em rascunho, registra aprovação e, só então, elimina; gatilho grava `auditoria` | pgTAP `descartes_isolamento.test.sql`: outra prefeitura não lê nem escreve; documento de outra prefeitura é recusado; documento fora do prazo é recusado; documento de guarda permanente é recusado; documento emprestado é recusado; eliminar sem aprovação falha; termo aprovado não muda mais; mesmo documento em dois termos abertos é recusado | a fazer |
| 5 | **Fila de descarte e geração do termo** (lista "Prontos para eliminação", marcar documentos, "Gerar termo de eliminação", "Imprimir listagem"): Server Actions com Zod, permissão no servidor, `AVISO_DEMO` em demonstração | Vitest da seleção (só prontos, sem emprestados, sem permanentes) e da permissão; Playwright: marcar, gerar termo, ver o termo em rascunho | a fazer |
| 6 | **Aprovação do termo e eliminação**: aprovador diferente de quem gerou; ao aprovar, a função desativa os documentos, marca "eliminado" e registra; nada é apagado antes disso | pgTAP: operador não aprova; quem gerou não aprova o próprio termo (se a pergunta 3 confirmar); aprovação grava auditoria com ids e datas, sem texto de documento; Playwright: gerar, aprovar, ver documentos fora da pesquisa e do mapa | a fazer, depende das perguntas 3 e 4 |
| 7 | **Termo e listagem em PDF e Word**: geração no servidor, sem serviço externo, sem dado pessoal em log; o PDF do termo entra no Storage privado (ver pergunta 7) | Vitest do conteúdo gerado (cabeçalho, documentos, assinaturas); teste de que erro não vaza dado pessoal | a fazer, depende da pergunta 5 (não há quadro do termo no canvas) |
| 8 | **Avisos de vencimento por e-mail** ("avisar o responsável do setor"): só depois do registro do serviço | Vitest de quem avisar; envio com serviço simulado; sem dado pessoal em log | **bloqueada** até a pergunta 1 e o serviço de e-mail da Fase 6 |
| 9 | **Comparação final com o canvas** e fechamento: `npm run telas:comparar -- TemporalidadeEscuro TemporalidadeClaro`, imagens de `test-results/comparacao/` anexadas; atualizar `plano-de-desenvolvimento.md` e `telas/README.md` (rota de Temporalidade) | Comparação sem diferença que não seja dado | a fazer |

Ordem sugerida: 1, 2, 3, 4, 5, 6 (núcleo; cumpre a regra de pronto), depois
7, por fim 8. A tarefa 8 não segura o fechamento do núcleo. A tarefa 7 pode
andar em paralelo à 6 depois da 5 (arquivos diferentes), mas o PDF só vale
com o termo aprovado.

## Decisões por tarefa

### Tarefa 1 — tabela de prazos
- Colunas: `id`, `prefeitura_id`, `tipo` (um dos tipos de `TIPOS` em
  `src/features/documentos/`; uma regra por tipo e prefeitura), `prazo_corrente_anos`,
  `prazo_intermediaria_anos`, `destinacao` (`eliminacao` | `guarda_permanente`),
  `criado_por`, `atualizado_em`. Sem `secretaria_id`: o plano geral isola
  essa tabela só por `prefeitura_id`.
- Os prazos do quadro (Processo licitatório 2+5, Contrato 5+5, Termo aditivo
  5+5, Dispensa e inexigibilidade 2+3, Ata de registro de preços 2+3,
  Convênio 5+10 permanente) são **exemplo**, como diz o quadro. Não entram
  como obrigação nem no `seed.sql` como se fossem oficiais; só como dado
  fictício da demonstração e do seed de teste. A tabela oficial vem da
  prefeitura (pergunta 2).
- Escrever: só administrador. Ler: administrador, coordenador e operador
  (para saber o prazo); consulta não precisa.
- Data de início da contagem: precisa existir no documento (data de
  encerramento ou de assinatura; pergunta 6). Coluna nova em `documentos`,
  opcional, só adiciona; documento sem data não entra em nenhuma fila.
- Mudar um prazo **não** reabre termo já aprovado.

### Tarefa 3 — cálculo
- Vencimento = data de início + corrente + intermediária (anos). Função pura
  em `src/features/temporalidade/`, testada sem banco.
- Fuso `America/Sao_Paulo`, como na Fase 6. Cálculo na leitura; sem trabalho
  agendado.
- "Vencem em 90 dias" = vencimento entre hoje e hoje + 90, destino eliminação.
  "Guarda permanente" conta, mas nunca vai para a fila.
- Documento **inativo** não entra na contagem de cartões.

### Tarefa 4 — termo (`descartes`)
- Colunas mínimas de `descartes`: `id`, `prefeitura_id`, `secretaria_id`
  (ver pergunta 8), `numero` (sequência por prefeitura e ano), `situacao`
  (`rascunho` | `aprovado` | `cancelado`), `gerado_por`, `gerado_em`,
  `aprovado_por`, `aprovado_em`, `observacao`. Itens em `descarte_itens`
  (`descarte_id`, `documento_id`, chaves compostas com `prefeitura_id`).
- Comissão e assinaturas são texto do termo, não usuários do sistema, até a
  pergunta 4 dizer o contrário. Se forem nomes de pessoas, é dado pessoal:
  só na tabela, nunca em log nem em erro (regra 3).
- Sem UPDATE direto e sem DELETE: criar, aprovar e cancelar passam por
  funções `security definer` no esquema `app`, que validam papel,
  prefeitura e secretaria. Termo aprovado é imutável (gatilho).
- A função de aprovação, na mesma transação: confere cada documento (ativo,
  vencido, destino eliminação, sem empréstimo aberto), desativa, grava o
  momento da eliminação e a auditoria. Falhou um item, nada é eliminado.
- "Eliminado" é situação derivada do termo aprovado, não nova coluna solta
  em `documentos` (um só lugar diz a verdade), como "Emprestado" na Fase 6.
- Mantém-se o registro do documento (número, tipo, datas, caixa de origem)
  para o termo e a auditoria durarem; o que sai é o acesso e, conforme a
  pergunta 7, o PDF.
- Teste de isolamento obrigatório (regra 1).

### Tarefa 6 — aprovação
- Quem aprova: padrão proposto, **administrador**; coordenador só gera.
  Aprovador diferente de quem gerou. Confirmar na pergunta 3.
- Aprovação exige dois fatores como as demais ações de administrador
  (`app.admin_exige_aal2`), por ser irreversível.
- Cancelar termo em rascunho é permitido; depois de aprovado, só um termo de
  correção novo (não editar o antigo).

### Tarefa 7 — PDF e Word
- Gerado no servidor com biblioteca de código aberto; sem serviço externo.
  Reaproveitar o padrão do visualizador de PDF e do termo de empréstimo da
  Fase 6 (mesma biblioteca; ver contrato).
- **Não há quadro do termo no canvas.** Pelo `CLAUDE.md` não inventar
  layout: pedir ao responsável (pergunta 5) antes de desenhar.
- Conteúdo mínimo do termo (a confirmar com o modelo da prefeitura): órgão,
  número e data, lista de documentos (tipo, número/ano, objeto, datas
  extremas, caixa), base na tabela de temporalidade, assinaturas da comissão.
  Sem CPF.

## Contrato comum com a Fase 6 (Empréstimos)

As duas fases mexem nos mesmos pontos. Para não colidirem:

| Ponto | Regra comum |
| --- | --- |
| **Documento emprestado** | Fonte única: existência de empréstimo aberto (`devolvido_em is null`), exposta por uma função `app.documento_emprestado(documento_id)` (ou visão equivalente) criada **pela Fase 6**. A Fase 7 só a chama: fila, criação do termo e aprovação recusam documento emprestado. Se a Fase 7 chegar antes, ela cria a função devolvendo `false` e a Fase 6 a redefine (`create or replace`), com teste pgTAP nos dois lados. |
| **Fila sem emprestado** | Documento emprestado some de "Prontos para eliminação" e volta quando devolvido. Aprovação de termo com documento emprestado falha inteira, com mensagem sem dado pessoal. |
| **Ordem das migrações** | Uma migração por tarefa, com data maior que a última do #51 (`20261120120000`). Quem mesclar depois escolhe, ao rebasear, a próxima data livre; a Fase 6 vem antes na ordem. Nunca editar migração já mesclada. |
| **Cartões do Início** | `features/inicio/` monta o cartão a partir de funções de `features/movimento/dados.ts`: Fase 6 mexe só em `contarEmprestimos`/`listarEmprestimos`; Fase 7 só em `lerTemporalidade`. Nenhuma das duas edita a função da outra nem o layout do cartão. |
| **Navegação lateral** | `barra-lateral.tsx` já tem os dois itens (Empréstimos, Temporalidade). Nenhuma fase adiciona item; se precisar mudar a regra de papel, é um PR pequeno próprio, antes. |
| **Modo demonstração** | Dados novos em arquivos separados: `src/features/demo/emprestimos.ts` (Fase 6) e `src/features/demo/temporalidade.ts` (Fase 7). `movimento.ts` não recebe mais dados novos; as duas fases só trocam o import. Todo documento do demo emprestado tem de ter o mesmo id nos dois arquivos para o teste de "emprestado não entra na fila" funcionar na demonstração. Ações que gravam devolvem `AVISO_DEMO`. |
| **Auditoria** | As duas fases acrescentam nomes em `TABELAS_NOME` (`emprestimos`, `descartes`, `descarte_itens`, `tabela_temporalidade`) em PRs separados; conflito é de uma linha, resolver no rebase. Gatilhos de auditoria seguem o padrão de `documentos.sql` e guardam só ids e datas. |
| **Biblioteca de PDF/Word** | Escolhida uma vez, na primeira das tarefas de termo que chegar (Fase 6 tarefa 6 ou Fase 7 tarefa 7), com uma decisão em `docs/decisoes/`; a outra reaproveita um módulo comum em `src/lib/pdf/`. |
| **Serviço de e-mail** | Um só serviço para as duas fases (aviso de atraso e aviso de vencimento): uma decisão e uma linha em `suboperadores.md`, feita pela fase que decidir primeiro. A Fase 7 não registra outro. |
| **Quem merge antes** | A Fase 6 fecha o núcleo (tarefas 1 a 4) antes da tarefa 4 da Fase 7 (termo no banco), porque esta consulta o empréstimo. Tarefas 1 a 3 da Fase 7 não dependem da Fase 6 e podem ir antes. |

## Serviço externo

**Nenhum serviço externo novo é necessário no núcleo** (tarefas 1 a 7): banco,
Storage, PDF e Word rodam no que já existe (Supabase, Vercel) e em
biblioteca de código aberto no servidor.

Só a tarefa 8 (aviso de vencimento por e-mail) precisa de serviço externo, o
mesmo "E-mail transacional (a escolher)" da Fase 6. Regras:
1. Regra 4 do `CLAUDE.md`: nenhuma linha de código de envio antes da decisão
   em `docs/decisoes/` (próximo número livre) e da linha em
   `docs/lgpd/suboperadores.md`.
2. **Só plano gratuito.** Se o serviço ou o volume exigir plano pago,
   **parar e perguntar** ao responsável.
3. Chave só em variável da Vercel; nunca no navegador, nunca no chat; o PR
   lista o nome da variável e onde colar.
4. E-mail sem CPF e sem texto de documento: só tipo genérico, quantidade,
   caixa e data. Destinatário: `email_contato` ou responsável da
   secretaria.
5. Sem o serviço, a Fase 7 funciona: vencimentos aparecem na tela, no Início
   e na auditoria.

## Fora do escopo

Painel da equipe e relatórios (Fase 8); eliminação física do papel (o
sistema registra, não executa); destruição segura dos arquivos em backup
(ver pergunta 7); assinatura digital do termo (ICP-Brasil); OCR; importar a
tabela de temporalidade oficial de arquivo externo; migrar documentos já
eliminados fora do sistema.

## Chaves e decisões que faltam

- Nenhuma chave nas tarefas 1 a 7.
- Tarefa 8: decisão em `docs/decisoes/`, linha em `suboperadores.md` e
  variável da Vercel (nome na decisão), compartilhadas com a Fase 6.
- Decisão em `docs/decisoes/` sobre "o que significa eliminar" (pergunta 7),
  antes da tarefa 6.

## Decisões do responsável (2026-11-15)

| # | Pergunta | Decisão |
| --- | --- | --- |
| 1 | Aviso por e-mail | **Só na tela.** Tarefa 8 fica fora (sem serviço externo) |
| 2 | Tabela de prazos | O sistema **não traz prazos oficiais**: a comissão da prefeitura cadastra os seus. Referência de estrutura: Resolução CONARQ 14/2001 (tabela básica das atividades-meio) |
| 3 | Quem aprova | **Administrador, diferente de quem gerou** (dois fatores). Coordenador gera, registra o edital e cancela |
| 4 | Comissão | Usuários do sistema (futuro); por ora o termo traz linhas de assinatura em branco, sem nome de pessoa |
| 5 | Modelo do termo | Não achei modelo oficial único para município. O termo segue a estrutura da Resolução CONARQ 40/2014 (listagem, edital, termo). **Feito:** o texto do termo é editável pelo administrador (tela `/temporalidade/modelo`), com texto-padrão baseado na Resolução. Envio de PDF próprio fica fora |
| 6 | Início da contagem | Contrato: **fim da vigência**. Licitação: **encerramento do processo** (campo novo `encerrado_em`) |
| 7 | O que é eliminar | **Desativar** o documento; registro, PDF e auditoria permanecem |
| 8 | Termo por secretaria | **Um termo por secretaria** (respeita o isolamento do acervo) |
| 9 | Antecedência do aviso | 90 dias, fixo (`AVISO_DIAS`) |
| 10 | Permanente → eliminação | Pode, só administrador, na auditoria; nunca muda termo já aprovado |
| 11 | Documento só em papel | Entra na fila (o prazo não depende do PDF) |

Base legal (ver `docs/decisoes/0009-termo-de-eliminacao-pdf-word.md`): Lei
8.159/1991 art. 9º e Resolução CONARQ 40/2014 com a 44/2020. O fluxo é:
**rascunho (listagem) → edital de ciência (45 dias) → aprovação**. O prazo de
45 dias, a autorização do arquivo público e a aprovação da listagem pela
autoridade máxima ficam **a confirmar com o jurídico da prefeitura**; o responsável confirmou o prazo de **45 dias** em 2026-11-15.

## Entregue neste PR

| # | Tarefa | Estado |
| --- | --- | --- |
| 1 | `tabela_temporalidade` com RLS e pgTAP | feito (pgTAP só roda no CI) |
| 2 | Editar a tabela (diálogo "Nova regra de prazo" / "Editar tabela", só administrador) | feito |
| 3 | Cálculo de vencimento, cartões e fila de verdade | feito, Vitest |
| 4 | `descartes` e `descarte_itens`, funções `public.descarte_*`, imutabilidade | feito (pgTAP só roda no CI) |
| 5 | Fila de descarte e geração do termo | feito |
| 6 | Edital, aprovação e eliminação (desativa) | feito |
| 7 | PDF e Word do termo e da listagem | feito, Vitest |
| 8 | Aviso por e-mail | **fora** (decisão 1) |
| 9 | Comparação com o canvas | feito (imagens no PR) |

Telas pelos quadros `Temporalidade*`, `Termo*` e `CadastroEncerramento*` (18
quadros, claro e escuro; imagens da comparação no PR): janela da regra de prazo
(eliminação e guarda permanente), painel "Termos de eliminação" (só aparece com
termo existente), página do termo nos cinco estados (rascunho, em ciência com
prazo correndo, em ciência liberada, aprovado, cancelado) e o campo
"Encerramento do processo" com o quadro "Prazo de guarda". Os textos com datas
("Faltam N dias", "Aprovação liberada em ...") saem das datas reais. O prazo de
ciência fecha em edital + 45 dias e a aprovação é liberada nesse dia.

Fora do PR: teste Playwright do fluxo (precisa de Supabase local e dados no
`seed.sql`) e o envio do modelo de termo da prefeitura.

## Pronto quando

1. Nenhuma ação, por nenhum papel, apaga ou elimina documento sem termo
   aprovado; teste pgTAP prova a recusa.
2. Documento emprestado, de guarda permanente ou fora do prazo não entra
   na fila nem no termo; testado no banco e na tela.
3. Termo aprovado e registrado na auditoria, imutável, com PDF e Word.
4. pgTAP de isolamento verde para `tabela_temporalidade`, `descartes` e
   `descarte_itens`; Vitest e Playwright verdes.
5. Cartões da tela Temporalidade e do Início saem do banco.
6. Comparação com o canvas anexada ao PR, claro e escuro, sem diferença que
   não seja dado.
7. Nenhum dado pessoal em log; nenhum serviço externo sem registro.
