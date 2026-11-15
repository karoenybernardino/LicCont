# Fase 6 — Empréstimos e devoluções

Status: **tarefas 1 a 4 e 8 feitas neste PR** (2026-11-15); 5, 6 e 7 ficam de fora
(ver abaixo). O PR #51 (Fase 5) já foi mesclado. Plano geral: `docs/plano-de-desenvolvimento.md`, linha "6 · Empréstimos":
retirada, devolução, prazo, alerta de atraso, termo em PDF e Word. Pronta
quando **documento emprestado aparece como tal no mapa e na pesquisa**.
Fidelidade ao canvas: `docs/telas/` (quadros `EmprestimosEscuro` e
`EmprestimosClaro`).

## Por quê

Hoje o acervo diz onde o documento está, mas não diz quem está com ele. Papel
que sai da caixa sem registro é o maior risco de perda em arquivo de
prefeitura. A Fase 6 registra cada retirada e devolução, cobra o prazo,
avisa o atraso e deixa o mapa e a pesquisa mostrarem "Emprestado".

## O que a Fase 5 deixou pronto

Já no PR #51 (branch `fase5/secretarias`), **a mesclar**:

| Item | Onde | Uso na Fase 6 |
| --- | --- | --- |
| Secretarias com `prazo_emprestimo_dias` (7, 10, 15, 30, 45, 60), `exige_aprovacao_emprestimo`, `avisar_atrasos`, `responsavel_id`, `email_contato` | migração `20261118120000_secretarias_campos.sql` | Prazo padrão, aprovação e destinatário do aviso de atraso |
| Tela `/emprestimos` (abas Em aberto, Atrasados, Devolvidos; busca; painel "Registrar empréstimo") com botões desabilitados ("Em breve") | `src/app/emprestimos/page.tsx` | Vira funcional; layout já bate com o quadro |
| Camada de dados `listarEmprestimos` e `contarEmprestimos` (demo preenchido; produção devolve lista vazia), `situacaoEmprestimo(prazo)` | `src/features/movimento/` | Troca o ramo vazio pela leitura da tabela nova |
| Tela `/auditoria` lendo a tabela `auditoria` que já existe | `src/app/auditoria/` | Empréstimos e devoluções passam a aparecer nela |
| Início com KPIs de empréstimos mostrando 0 | `src/features/inicio/` | Passam a contar de verdade |
| Etiquetas e QR, `/mapa?caixa=<id>` só após login | `src/features/etiquetas/` | Caixa com documento emprestado ganha marca |
| Visualizador de PDF, SHA-256 | `src/app/documentos/[id]/pdf` | Termo de empréstimo reaproveita o padrão |

Já na `main`: estrutura física, documentos, arquivos, mapa 3D, auditoria
geral (tabela só de inclusão), perfis (administrador, coordenador, operador,
consulta), modo demonstração.

**Depende do merge do #51** (não existe na `main`): campos de prazo e regras
da secretaria, telas Empréstimos/Temporalidade/Auditoria, camada
`features/movimento`, Etiquetas, KPIs do Início. Por isso nenhuma tarefa abaixo
começa antes do merge. Se o #51 mudar na revisão, reler este plano.

## Tarefas e PRs

Um PR por tarefa, teste antes do código, mesclado só com CI verde.

| # | Tarefa | Prova | Estado |
| --- | --- | --- | --- |
| 1 | **Tabela `emprestimos`** (documento, caixa de origem, retirado por, setor, secretaria, retirada, prazo, devolução, observação, situação) com RLS, GRANT só para os papéis necessários, sem DELETE e sem `anon`; função de banco que registra retirada e devolução e grava na auditoria | pgTAP `emprestimos_isolamento.test.sql`: outra prefeitura não lê nem escreve; documento de outra prefeitura é recusado; só um empréstimo aberto por documento; consulta não registra; devolução não pode ser desfeita | feito neste PR |
| 2 | **Registrar empréstimo e devolver** (Server Actions com Zod): painel "Registrar empréstimo" e botão "Devolver" do quadro; prazo padrão vem da secretaria; permissão checada no servidor; `AVISO_DEMO` em demonstração | Vitest dos esquemas (datas, prazo máximo, campos) e da regra de permissão; Playwright: registrar, ver na aba Em aberto, devolver, ver em Devolvidos | feito neste PR |
| 3 | **Situação do documento**: "Emprestado" na pesquisa, no painel do documento, em `/documentos/[id]` e na caixa do mapa (marca no mapa 3D, na planta e em "Dentro da caixa") | Vitest da derivação; Playwright: emprestar e achar "Emprestado" na pesquisa e no mapa | feito neste PR |
| 4 | **Atraso e alertas na tela**: abas Atrasados, contagem de dias, KPI do Início e "Vence em N dias" lidos do banco | Vitest de `situacaoEmprestimo` com datas de borda; comparação com o canvas | feito neste PR |
| 5 | **Aprovação de empréstimo** quando a secretaria marca `exige_aprovacao_emprestimo`: pedido, aprovação por coordenador ou administrador, recusa com motivo | pgTAP (operador não aprova o próprio pedido); Vitest; Playwright | fora deste PR: ninguém definiu quem aprova |
| 6 | **Termo de empréstimo em PDF e Word**: documento com dados da retirada e campo de assinatura; geração no servidor, sem gravar dado pessoal em log | Vitest do conteúdo gerado; teste de que erro não vaza dado pessoal | fora deste PR: não há quadro do termo no canvas |
| 7 | **Aviso de atraso por e-mail** (ver seção própria): só depois do registro do serviço | Vitest do cálculo de quem avisar; teste do envio com serviço simulado; sem dado pessoal em log | **fora**: e-mail deixado de fora pelo responsável (2026-11-15) |
| 8 | **Comparação final com o canvas** e fechamento: `npm run telas:comparar -- EmprestimosEscuro EmprestimosClaro`, imagens anexadas ao PR; atualizar `plano-de-desenvolvimento.md` e `telas/README.md` (rota de Empréstimos) | Comparação sem diferença que não seja dado | feito neste PR |

Ordem sugerida: 1, 2, 3, 4 (núcleo; cumpre o critério da fase), depois 5 e 6,
por fim 7. A tarefa 7 não segura o fechamento do núcleo.

## Decisões por tarefa

### Tarefa 1 — tabela
- Colunas mínimas: `id`, `prefeitura_id`, `secretaria_id` (do documento),
  `documento_id`, `caixa_id` (de onde saiu), `retirado_por_nome`,
  `retirado_por_setor`, `retirado_em`, `prazo_em`, `devolvido_em`,
  `devolvido_por`, `observacao`, `criado_por`. Chaves compostas com
  `prefeitura_id` (nunca apontam para outra prefeitura), como em `etiquetas`.
- "Retirado por" é texto livre do quadro (nome e setor). É dado pessoal:
  fica só na tabela, nunca em log nem em mensagem de erro (regra 3).
- Índice único parcial: um empréstimo aberto (`devolvido_em is null`) por
  documento.
- Sem UPDATE direto: registrar e devolver passam por função `security
  definer` no esquema `app`, que valida papel, secretaria e prefeitura.
  Sem DELETE para ninguém.
- Gatilho grava `auditoria` (padrão do `documentos.sql`), sem o nome de quem
  retirou no campo `antes/depois`: guarda só ids e datas.
- Teste de isolamento obrigatório (regra 1) e entrada em
  `convencao_isolamento.test.sql`.

### Tarefa 2 — ações
- Prazo padrão = `prazo_emprestimo_dias` da secretaria dona do documento;
  quem registra pode escolher outra data dentro do limite (pergunta 2).
- Data da retirada não pode ser futura; prazo não pode ser anterior à retirada.
- Quem pode: administrador, coordenador e operador da secretaria do
  documento; consulta não. Escondido o botão **e** checado no servidor.
- Documento sem arquivo pronto ou inativo não pode ser emprestado.

### Tarefa 3 — situação no mapa e na pesquisa
- A situação "Emprestado" é derivada da existência de empréstimo aberto, não
  uma coluna nova em `documentos` (evita dois lugares dizendo coisas
  diferentes). A pesquisa e o mapa leem por visão com o RLS de quem consulta.
- O emprestado continua endereçado à caixa de origem; a caixa fica marcada
  até a devolução, como diz o quadro. A marca usa a cor de aviso da marca;
  laranja/amarelo continua só para a caixa selecionada.
- Mover documento emprestado entre caixas (Fase 4) fica bloqueado até a
  devolução.

### Tarefa 4 — atraso
- Atraso = prazo anterior a hoje, no fuso `America/Sao_Paulo`. Hoje é um
  cálculo na leitura; não há trabalho agendado para marcar atraso.

### Tarefa 5 — aprovação
- Só existe se a pergunta 3 confirmar o fluxo. Sem aprovação, o campo
  `exige_aprovacao_emprestimo` continua gravado e sem efeito, como hoje.

### Tarefa 6 — termo
- PDF e Word gerados no servidor; biblioteca de código aberto, sem serviço
  externo. Quadro do termo não existe no canvas: **pedir ao responsável**
  (pergunta 4) antes de desenhar; não inventar layout.

## E-mail de aviso exige serviço externo

O aviso de atraso por e-mail (tarefa 7) e o texto "O responsável recebe um
aviso por e-mail" da tela Secretarias dependem de um **serviço de envio de
e-mail**, que hoje **não existe** no projeto. Em `docs/lgpd/suboperadores.md`
a linha "E-mail transacional (a escolher)" está como "a criar".

Regras:
1. Regra 4 do `CLAUDE.md`: nenhum serviço externo sem registro. Antes de
   qualquer código de envio: decisão nova em `docs/decisoes/` (próximo número
   livre; hoje a última é 0008, e o #51 não adiciona outra) e linha em
   `docs/lgpd/suboperadores.md` com fornecedor, finalidade, dados (nome e
   e-mail institucional), região e decisão.
2. **Só plano gratuito.** Se o serviço escolhido ou o volume exigir plano
   pago, **parar e perguntar** ao responsável antes de seguir.
3. A chave do serviço só em variável da Vercel (servidor); nunca no
   navegador, nunca no chat. O PR lista o nome da variável e onde colar.
4. Conteúdo do e-mail: sem CPF, sem texto de documento; só título genérico,
   caixa e prazo. Destinatário: `email_contato` ou responsável da
   secretaria, nunca e-mail de cidadão.
5. Envio dispara de uma rotina agendada. Cron da Vercel gratuito tem limite;
   confirmar o limite na hora de decidir (pergunta 1).
6. Sem serviço aprovado, o sistema funciona assim mesmo: o atraso aparece
   na tela, no Início e na auditoria (tarefa 4). O e-mail é só um reforço.

## Decisões do responsável (2026-11-15)

- PR #51 já mesclado: a Fase 6 parte da `main`.
- E-mail de aviso: **deixado de fora**. Nenhum serviço novo, nenhuma chave; o atraso aparece na tela, no Início e na auditoria.
- Perguntas 2 a 9: a lei não responde (a Lei 8.159/1991 e a LAI não fixam prazo nem termo de empréstimo; isso fica no regulamento de cada arquivo). Valeram os padrões: prazo da secretaria com máximo de 60 dias e sem prorrogação; "retirado por" em texto livre (nome e setor, com sugestão das secretarias); só documentos ativos; documento emprestado não muda de caixa nem é desativado; sem fluxo de aprovação e sem termo PDF/Word até haver regra e quadro.
- Desvios do quadro, a conferir: o campo Documento é uma lista (sem o cartão com "Disponível"), o Setor é texto com sugestões (o quadro mostra uma lista) e as datas usam o seletor nativo do navegador.

## Fora do escopo

Temporalidade e eliminação (Fase 7), painel da equipe e relatórios (Fase 8),
empréstimo de caixa inteira, renovação automática, reserva de documento,
SMS e WhatsApp (seriam outro serviço externo).

## Chaves e decisões que faltam

- Decisão em `docs/decisoes/` e linha em `suboperadores.md` para o serviço
  de e-mail (só se o responsável quiser a tarefa 7).
- Variável da Vercel com a chave do serviço de e-mail (nome a definir na
  decisão). Nenhuma outra chave nova nas tarefas 1 a 6.

## Perguntas em aberto para o responsável

1. **E-mail de aviso**: quer o aviso por e-mail agora ou só a sinalização na
   tela? Se quiser, qual serviço (precisa ter plano gratuito suficiente e
   servidor no Brasil ou cláusula de transferência aceitável)? Quantos
   avisos por mês se espera?
2. **Prazo**: o operador pode escolher prazo maior que o da secretaria? Há
   limite máximo? Pode prorrogar? (Hoje o plano só tem "prazo", sem
   renovação.)
3. **Aprovação**: quando a secretaria exige aprovação, quem aprova (coordenador,
   administrador, o responsável da secretaria)? O pedido aguarda quanto
   tempo?
4. **Termo em PDF e Word**: existe modelo de termo da prefeitura? O canvas
   não tem quadro do termo; podemos desenhar um quadro novo antes da
   tarefa 6?
5. **Quem retira**: texto livre (nome e setor) basta, ou precisa ser usuário
   cadastrado no sistema? Texto livre é mais simples, mas guarda nome de
   pessoa sem vínculo.
6. **Empréstimo entre secretarias**: um servidor de outra secretaria pode
   retirar documento de uma que ele não enxerga? Hoje o RLS esconde o
   documento dele; teria de haver um pedido.
7. **Mover documento emprestado**: confirmar que fica bloqueado até a
   devolução (tarefa 3).
8. **Documento só em papel**: empréstimo vale para documento sem PDF
   anexado, ou só os digitalizados?
9. **Aparência da marca "Emprestado" no mapa**: o canvas não traz o estado;
   preferir uma cor de aviso da marca ou outro sinal? Pelo `CLAUDE.md`, não
   inventar sem perguntar.

## Pronto quando

1. Registrar retirada e devolução funciona para quem tem permissão e falha
   para quem não tem, no servidor.
2. Documento emprestado aparece como "Emprestado" na pesquisa e no mapa
   (critério do plano geral) e volta ao normal na devolução.
3. Atrasados e KPIs do Início saem do banco.
4. pgTAP de isolamento verde para `emprestimos`; Vitest e Playwright verdes.
5. Comparação com o canvas anexada ao PR, claro e escuro, sem diferença que
   não seja dado.
6. Nenhum dado pessoal em log; nenhum serviço externo sem registro.

## Decisões do responsável (2026-11-15)

- **Aviso de atraso: só na tela.** O e-mail de atraso fica fora (a infraestrutura de e-mail existe, desligada: decisão 0010).
- Aprovação do empréstimo e termo de empréstimo: o responsável pediu **recomendação** (abaixo). Nada disso foi implementado.

## Aprovação e termo de empréstimo: feitos (2026-11-15)

O responsável mandou fazer as duas recomendações abaixo. **Aprovação:** migração `20261126120000_emprestimo_aprovacao.sql` (tabela `pedidos_emprestimo`, funções `pedir_`, `aprovar_` e `recusar_pedido_emprestimo`, pgTAP `pedidos_emprestimo.test.sql`); em `/emprestimos`, aba "Pendentes" com Aprovar e Recusar. **Termo:** botões PDF e Word em cada linha de `/emprestimos`, texto editável em `/temporalidade/modelo?tipo=emprestimo`. Sem quadro no canvas para a aba e os botões: usam os componentes existentes, a confirmar com o responsável.

## Recomendações (já implementadas)

**1. Aprovação do empréstimo (quem aprova).** Recomendo: quando a secretaria
marca "exige aprovação" (campo da Fase 5), o pedido fica **pendente** e quem
aprova é o **coordenador da secretaria dona do documento**; o **administrador**
pode aprovar no lugar do coordenador (férias, ausência). **Nunca quem pediu**
(mesma regra do termo de eliminação: pedido e aprovação por pessoas
diferentes). O pedido pendente **vence em 3 dias** (a pessoa pode pedir de
novo) e o prazo do empréstimo só começa a contar na aprovação. Aprovação e
recusa vão para a auditoria. Sem a marca "exige aprovação", nada muda: a
retirada continua direta. Custo: uma situação nova no empréstimo
(`pendente`), uma função `public.emprestimo_aprovar` no padrão de
`public.descarte_aprovar`, pgTAP de isolamento e a aba "Pendentes" na tela.
Precisa de quadro novo no canvas para a aba e os botões.

**2. Termo de empréstimo em PDF e Word.** Recomendo reaproveitar o que a Fase 7
entregou: o mesmo gerador (`pdf-lib` + `docx`) e a **mesma tela de modelo
editável** (`/temporalidade/modelo`), que já aceita `tipo = emprestimo` na
tabela `modelos_termo`. O termo traz: prefeitura e secretaria, documento (tipo,
número, objeto, caixa), retirado por (nome e setor, texto livre como hoje),
data da retirada, prazo e devolução prevista, e linhas de assinatura em branco
(retirante e responsável pelo arquivo). **Sem CPF.** Botões "Baixar PDF" e
"Baixar Word" na linha do empréstimo, na tela `/emprestimos`. Custo: um módulo
`termo-emprestimo.ts`, uma rota de arquivo e o ajuste da tela de modelo para
escolher o tipo. Sem serviço externo.
