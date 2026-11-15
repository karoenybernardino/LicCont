# Fase 8 — Prontidão

Status: **só plano** (2026-11-15). Nada foi construído. Plano geral:
`docs/plano-de-desenvolvimento.md`, linha "8 · Prontidão": painel da equipe
LicCONT, relatórios, documentação de LGPD, revisão de segurança, pentest se
aprovado. Pronta quando o **checklist de segurança está completo e o piloto
roda com dados reais**. Fidelidade ao canvas: `docs/telas/` (quadros
`EquipePrefeituras*`, `EquipeNovaPrefeitura*`, `EquipePrefeituraDetalhe*` e
`Auditoria*`).

Esta é a última fase do plano geral. Diferente das outras, parte do trabalho
**não é código**: é texto jurídico, decisão de custo e prova de que o que já
existe aguenta dado real. Por isso o plano separa o que o sistema faz do que
precisa de advogado, de dinheiro ou do responsável.

## O que esta fase não pode quebrar (regras de pronto)

1. **A equipe LicCONT não lê o acervo.** Nenhum papel da equipe vê número,
   objeto, empresa, CNPJ de credor, nome de caixa ou PDF de documento, salvo
   com autorização registrada (ver tarefa 2). Teste pgTAP prova a recusa.
2. **Nenhum dado real entra em repositório, log, PR ou chat.** O piloto usa
   dado real só dentro do Supabase de produção.
3. **Nada pago sem o responsável autorizar** (regra de custos do `CLAUDE.md`).
   Supabase Pro, Vercel Pro, pentest, monitoramento e backup extra são
   **perguntas**, não decisões deste plano.
4. Parecer jurídico não é função desta fase: tudo que é lei aparece como
   **"a validar com advogado"**.

## O que as fases anteriores já deixaram pronto

Já na `main` (conferido no código em 2026-11-15):

| Item | Onde | Uso na Fase 8 |
| --- | --- | --- |
| Equipe LicCONT: tabela `equipe_liccont` sem nenhum GRANT (só funções `app.*` leem); `app.eh_equipe()` exige dois fatores (aal2) e sessão válida | `20261108140000_acesso.sql`, `20261108190000_segundo_fator_opcional.sql` | Base do painel; a equipe **hoje não tem política nenhuma** em `documentos`, `caixas` etc., só em `prefeituras` |
| Painel `/equipe` (lista, busca, filtros, cartões), `/equipe/nova`, `/equipe/[id]` (situação, administradores, convite), `/equipe/entrar` | `src/app/equipe/`, `src/features/equipe/`, `src/features/prefeituras/` | Tela já existe; a Fase 8 troca números fixos por reais |
| Cartão "Documentos no ar" fixo em **0** com a legenda "o cadastro chega na Fase 3" | `src/app/equipe/page.tsx` | Passa a contar de verdade (tarefa 1). Legenda velha precisa sair |
| Contagem de administradores por prefeitura vinda do servidor (`service_role`, só números) | `src/features/prefeituras/dados.ts` | Modelo de "número sem conteúdo" para o painel |
| `auditoria` só de inclusão (sem UPDATE/DELETE), com IP e aparelho; `registrar_auditoria` com lista fechada de ações de sessão; gatilhos nas tabelas de acervo | `20261108140000_acesso.sql`, `20261114120000_documentos.sql` | Fonte dos relatórios e do painel de uso |
| Tela `/auditoria` (cartões, abas, tabela, filtro por período) lendo a auditoria; botão **"Exportar relatório" ainda desabilitado ("Em breve")** | `src/app/auditoria/page.tsx`, `src/features/auditoria/` | Vira funcional na tarefa 4 |
| `status_prefeitura` (implantação, ativa, suspensa); login só de prefeitura `ativa` | `20261108140000_acesso.sql` | "Suspender" já bloqueia o acesso; base do plano de retorno |
| Senha de 12+ caracteres com checagem de vazamento (k-anonimato), força bruta por conta e IP, saída por inatividade, dois fatores obrigatórios para administrador e equipe | decisão 0006, Fase 1 | Entram no checklist como "já feito, provar" |
| CSP com nonce por requisição, HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'` | `src/proxy.ts`, `next.config.ts` | Checklist: provar por teste. Atenção: `style-src 'unsafe-inline'` (tarefa 8) |
| CI com lint, tipos, Vitest, Playwright, pgTAP, Semgrep, Gitleaks; Dependabot semanal; migrações aplicadas pelo CI | `.github/workflows/ci.yml`, decisões 0002, 0004, 0005 | Falta `npm audit` e varredura do histórico inteiro (tarefa 8) |
| `docs/lgpd/registro-operacoes.md` (rascunho da Fase 3), `docs/lgpd/suboperadores.md` | `docs/lgpd/` | Base do pacote LGPD; ver pendências abaixo |
| `SECURITY.md` com **contato ainda inexistente** (depende de domínio) | raiz | Tarefa 7 |
| Empréstimos com `retirado_por_nome` (nome de pessoa em texto livre) | Fase 6, `20261121120000_emprestimos.sql`, na `main` | Dado pessoal novo: entra no registro de operações e nos relatórios |
| Modo demonstração (`LICCONT_DEMO=1`) com dados em `src/features/demo/`, nunca em Production | `src/features/demo/` | Painel e relatórios novos precisam do ramo demo |

No **PR 53 (Fase 7), ainda aberto, a mesclar** (por isso a Fase 8 só começa
as tarefas que o tocam depois do merge): `tabela_temporalidade`, `descartes`
e `descarte_itens`, funções `public.descarte_*`, tela do termo
(`/temporalidade/termo/[id]`), PDF e Word do termo, decisão 0009. A Fase 8
**lê** esses dados nos relatórios e na checagem de isolamento, não os altera.

Ainda **não existe** em lugar nenhum: aceite de política de privacidade e de
termo de uso, mecanismo de autorização de acesso da equipe, relatórios,
exportação de dados, plano de incidentes, anexo contratual, teste de
restauração de backup, página pública de privacidade e de contato de
segurança.

## Tarefas e PRs

Um PR por tarefa, teste antes do código, mesclado só com CI verde. Tarefas de
documento (7, 9, 11) também passam por PR, com revisão do agente
`conformidade-lgpd` e, onde disser, de advogado.

| # | Tarefa | Prova | Estado |
| --- | --- | --- | --- |
| 1 | **Painel da equipe com números reais, sem ler o acervo**: função de banco `public.equipe_uso_prefeituras()` que devolve só contagens por prefeitura (secretarias, usuários ativos, documentos, caixas, bytes de PDF, último acesso, logins do mês); troca o "0" fixo do cartão "Documentos no ar" e preenche "Secretarias" e "Documentos" do detalhe. Sem tabela nova | pgTAP `equipe_uso.test.sql`: não-equipe e `anon` não executam; equipe sem dois fatores não executa; o resultado só tem colunas numéricas, data e id de prefeitura; **equipe continua sem `select` em `documentos`, `arquivos`, `caixas`, `emprestimos`, `descartes`** (teste lista as tabelas de acervo e tenta ler como equipe); Vitest do formato; comparação `EquipePrefeituras*` e `EquipePrefeituraDetalhe*` | a fazer |
| 2 | **Acesso de suporte com autorização registrada** (só se a pergunta 2 disser sim): tabela `autorizacoes_suporte` (prefeitura, quem da equipe, quem da prefeitura autorizou, motivo, início, fim, revogada). Com RLS, GRANT mínimo, sem DELETE, sem `anon`; função de banco que abre e revoga | pgTAP de isolamento (obrigatório, regra 1): outra prefeitura não lê nem escreve; só administrador da própria prefeitura autoriza; equipe não autoriza a si mesma; autorização vencida ou revogada não vale; duração máxima respeitada; todo uso grava `auditoria`. Playwright do fluxo. **Recomendação: não construir na v1** (ver decisão da tarefa) | **depende da pergunta 2** |
| 3 | **Situação do contrato e saída da prefeitura**: suspender e reativar com aviso claro (hoje só muda o status), e "Exportar todos os dados" para devolução ao fim do contrato (anexo contratual): ZIP com CSV do cadastro, PDFs originais e auditoria da prefeitura. Quem pede: administrador da prefeitura; a equipe só dispara depois de pedido registrado | Vitest do conteúdo do pacote (sem dado de outra prefeitura, proteção contra fórmula em CSV); pgTAP/Playwright: administrador de A não exporta B; exportação grava `auditoria` com ids e contagens, nunca o conteúdo; teste de volume com o acervo de teste da Fase 3 | a fazer |
| 4 | **Relatórios** (ver "Relatórios" abaixo): inventário do acervo, empréstimos e atrasos, termos de eliminação, auditoria (botão "Exportar relatório" do quadro) e ocupação; CSV e PDF, gerados no servidor | Vitest dos esquemas de filtro e do conteúdo (cabeçalho, totais, sem CPF); Vitest de permissão (consulta não exporta; secretaria só a sua); Playwright: exportar e conferir o arquivo; pgTAP: relatório de A nunca traz linha de B; comparação `AuditoriaEscuro`/`AuditoriaClaro` | a fazer; depende do merge da Fase 7 para o relatório de termos |
| 5 | **Relatório de uso da equipe** (mensal, agregado): prefeituras ativas, usuários, documentos, armazenamento, logins e tentativas recusadas; sem conteúdo de acervo | Vitest; pgTAP: só equipe com dois fatores | a fazer, mesma base da tarefa 1 |
| 6 | **Aceite da política de privacidade e do termo de uso**: tabela `aceites` (usuário, prefeitura, documento, versão, momento; só inclusão), tela de aceite no primeiro acesso e quando a versão mudar, páginas públicas `/privacidade` e `/termos`. Os textos vêm da tarefa 7 | pgTAP de isolamento (regra 1): usuário de A não lê nem grava aceite de B; ninguém altera nem apaga; só o próprio usuário grava o próprio aceite; Playwright: sem aceite não entra no sistema, com aceite entra e a auditoria registra; Vitest de "versão nova exige novo aceite"; sem quadro no canvas: **pedir quadro antes de desenhar** | a fazer, depende das perguntas 4 e 5 |
| 7 | **Pacote LGPD** (documentos, ver abaixo): anexo contratual, registro de operações completo, plano de incidentes, procedimento de pedidos de titulares, política de privacidade, termo de uso, política de retenção, RIPD se o advogado pedir, `SECURITY.md` com contato real | Revisão do agente `conformidade-lgpd`; lista de pontos "a validar" fechada pelo advogado antes do piloto; Vitest/Playwright de que `/privacidade`, `/termos` e o contato de segurança respondem sem login | a fazer (texto), **trava no advogado** |
| 8 | **Checklist de segurança** em `docs/seguranca/checklist-fase-8.md`, item a item com prova (ver abaixo), e os testes que faltam: pgTAP que percorre **todas** as tabelas de `public` e exige RLS ligado e nenhum GRANT para `anon`; Playwright dos cabeçalhos; `npm audit` no CI; varredura de segredos no histórico inteiro; rotação das chaves antes do piloto | Os próprios testes novos no CI; revisão pelo agente `auditor-seguranca`; checklist anexado ao PR com cada linha marcada e com o link da prova | a fazer |
| 9 | **Backup e teste de restauração** (ver "Backup"): procedimento escrito, restauração ensaiada num projeto separado com dados fictícios, tempo medido | Relatório do ensaio em `docs/seguranca/` (data, tempo, o que foi conferido); não é teste automático | **bloqueada** até a pergunta 3 (custo) |
| 10 | **Teste de invasão (opcional)**: escopo, regras, ambiente de teste e autorização por escrito; ou a alternativa gratuita (autoavaliação OWASP ASVS nível 1 e varredura OWASP ZAP no ambiente de teste) | Laudo ou relatório da autoavaliação em `docs/seguranca/`; falhas viram issues | **depende da pergunta 4** (custo) |
| 11 | **Piloto com dados reais**: critérios de entrada, preparação do ambiente, migração, acompanhamento, critérios de saída e plano de retorno (ver "Piloto") | Checklist de entrada assinado pelo responsável antes do primeiro dado real; ensaio de migração com dado fictício; ensaio do plano de retorno | a fazer, **só depois das tarefas 6, 7, 8 e 9** |
| 12 | **Fechamento**: `npm run telas:comparar -- EquipePrefeiturasEscuro EquipePrefeiturasClaro`, idem `EquipePrefeituraDetalhe*` e `Auditoria*`, imagens anexadas; atualizar `plano-de-desenvolvimento.md` (marcar Fase 8 e o que ficou decidido), `telas/README.md` (rotas de Auditoria e Etiquetas) e `docs/lgpd/suboperadores.md` | Comparação sem diferença que não seja dado | a fazer |

Ordem sugerida: **1 e 8 primeiro** (independentes, e o 8 pode achar
problema que muda o resto), depois 4 (relatórios) e 5, depois 7 e 6 (texto
jurídico e aceite), 9 e 3. A tarefa 2 só se a pergunta 2 pedir; a 10 só se
a pergunta 4 aprovar. A 11 é a última e **só começa com 6, 7, 8 e 9
fechadas**. A tarefa 7 (texto) pode começar já, em paralelo, porque o gargalo
é o advogado.

## Decisões por tarefa

### Tarefa 1 — painel da equipe sem ler o acervo

- **O que a equipe vê**: situação da prefeitura, número de secretarias,
  usuários ativos, quantidade de documentos e de caixas, bytes de PDF
  guardados, último acesso e logins do mês, tentativas recusadas.
  **Números, nunca conteúdo.**
- **O que a equipe não vê, mesmo no painel**: nenhum campo de texto do acervo
  (número do processo, objeto, empresa, CNPJ de credor, caixa, nome de quem
  retirou). Nem na auditoria: a equipe não lista linhas de `auditoria`, só
  contagens por tipo de ação.
- **Como**: uma função `security definer` no esquema `public` com
  `app.eh_equipe()` dentro (que já exige dois fatores), `search_path` vazio,
  `revoke` de `public` e `anon`. Só devolve agregados. Não se cria política
  de leitura da equipe sobre as tabelas de acervo: a recusa continua sendo a
  ausência de política, que é a prova mais forte.
- **Contagem de documentos é "dado de acervo"?** Um número por prefeitura não
  revela o conteúdo. Pergunta 1 confirma com o responsável.
- Quem é "equipe" continua sendo `equipe_liccont`, sem GRANT. Incluir/remover
  integrante da equipe **não tem tela**: segue por migração/SQL controlado
  (decisão a registrar: quem aprova, e entra na auditoria). Pergunta 6.
- Modo demonstração: a função tem ramo demo (números de `src/features/demo/`),
  sem banco.
- A legenda "o cadastro chega na Fase 3" sai do cartão (não há mais motivo).

### Tarefa 2 — acesso de suporte (recomendação: não construir)

O plano geral diz que a equipe "não lê o acervo sem autorização registrada".
Hoje a regra está cumprida do jeito mais forte: **não existe caminho de
leitura**. Construir o caminho "com autorização" cria o primeiro ponto onde a
equipe toca dado de prefeitura, mexe nas políticas de todas as tabelas de
acervo (risco de furar o isolamento) e cria um novo tratamento de dados para
o advogado validar.

- **Recomendação**: v1 sem acesso de suporte. Quando a prefeitura tiver um
  problema com o acervo, o suporte acontece **com o administrador da
  prefeitura operando** (chamada com compartilhamento de tela) ou com
  exportação feita por ele. O registro dessa regra vai no anexo contratual.
- **Se o responsável quiser o acesso mesmo assim** (pergunta 2): janela curta
  (padrão proposto: 4 horas, máximo 24), só leitura, só da prefeitura que
  autorizou, só **administrador da prefeitura** autoriza (nunca a própria
  equipe), motivo obrigatório sem dado pessoal, revogável, tudo na
  `auditoria`. O acesso não pode baixar PDF. Cada tabela de acervo ganha uma
  política adicional, com teste de isolamento por tabela.

### Tarefa 3 — saída da prefeitura e exportação

- **Suspender**: já bloqueia o login (só prefeitura `ativa` entra). Acrescentar
  o texto do que acontece e o registro do motivo na auditoria. **Nada é
  apagado** ao suspender.
- **Exportar** é o cumprimento da cláusula "devolução ao fim do contrato" do
  anexo. Pacote: CSV (cadastro, estrutura, empréstimos, termos, auditoria),
  PDFs originais e um arquivo de conferência com a soma SHA-256 de cada PDF.
- CSV protegido contra injeção de fórmula (campo que começa com `=`, `+`,
  `-`, `@` ganha apóstrofo). Gerado em partes (acervo grande); link assinado
  de poucos minutos, como os PDFs; nome do arquivo por identificador.
- **Apagar de vez** os dados da prefeitura depois da devolução (fim de
  contrato) é outra operação: exige decisão de prazo e confirmação por
  escrito. Fica no plano de retorno e na pergunta 7. Não existe função de
  apagar nesta fase.

### Tarefa 4 — relatórios (ver seção própria)

### Tarefa 6 — aceite

- Documento e versão ficam no repositório (`docs/lgpd/` e uma constante com a
  versão atual). A tabela guarda **qual versão** a pessoa aceitou, quando, e o
  IP no mesmo padrão da auditoria. Nenhum texto da política duplicado no banco.
- Primeiro acesso: depois do login e antes de qualquer tela. Equipe LicCONT
  também aceita.
- **Sem quadro no canvas** para a tela de aceite e para as páginas
  `/privacidade` e `/termos`. Pelo `CLAUDE.md`, não inventar layout: pedir o
  quadro (pergunta 5). Enquanto não vier, a tarefa fica parada.
- Quem aceita pela prefeitura: o termo de uso é do **usuário**; o aceite do
  **contrato e do anexo** é da prefeitura e não passa pelo sistema (é
  assinatura de contrato). A pergunta 4 confirma a divisão com o advogado.

### Tarefa 8 — checklist (ver seção própria)

### Tarefa 11 — piloto (ver seção própria)

## Relatórios: quais e para quem

| Relatório | Quem pede | O que traz | Observação |
| --- | --- | --- | --- |
| Inventário do acervo | Administrador (todas as secretarias); coordenador e operador (as suas) | Documentos por secretaria, tipo, ano, situação, caixa e endereço físico | Consulta não exporta (só vê na tela). Sem PDF anexado dentro do relatório |
| Empréstimos e atrasos | Administrador e coordenador | Em aberto, atrasados, devolvidos, tempo médio | Traz `retirado_por_nome`: **dado pessoal**; só quem já enxerga a tela de Empréstimos |
| Termos de eliminação | Administrador e coordenador | Termos, situação, documentos de cada um | Só depois do merge da Fase 7 |
| Auditoria | Administrador | O que a tela `/auditoria` mostra, com os filtros de período e ação (botão "Exportar relatório" do quadro) | Traz nome do usuário e IP: dado pessoal. Exportar também fica na auditoria |
| Ocupação da estrutura | Administrador e coordenador | Caixas, capacidade, ocupação por rua e galpão | Já existe na tela do mapa; só exportar |
| Uso do sistema (equipe) | Equipe LicCONT | Agregado mensal por prefeitura | Tarefa 5. **Sem nenhum dado de acervo** |

Regras comuns:
- Gerados no servidor, sem serviço externo. Respeitam a RLS de quem pede:
  o relatório é uma consulta feita **com a sessão da pessoa**, nunca com
  `service_role`, para o banco recusar o que ela não pode ver.
- Limite de linhas por arquivo e filtro de período obrigatório na auditoria,
  para não derrubar a função da Vercel.
- Cada exportação grava `relatorio.exportado` na auditoria com tipo, filtros
  e quantidade de linhas, **sem** o conteúdo.
- Nenhum CPF. Campos livres que pareçam CPF já são recusados no cadastro
  (Fase 3); o relatório não os reintroduz.
- Layout de CSV e de PDF: **não há quadro de relatório no canvas**. O PDF
  usa o padrão do visualizador e dos termos (timbrado da prefeitura); o
  desenho final precisa de quadro (pergunta 5).

## Pacote de LGPD (tarefa 7)

Todo documento é **rascunho técnico para o advogado**, não parecer. O
agente `conformidade-lgpd` revisa; o advogado fecha.

| Documento | Onde | Conteúdo mínimo |
| --- | --- | --- |
| Anexo de tratamento de dados (modelo para o contrato) | `docs/lgpd/anexo-contratual.md` | Prefeitura = controladora, LicCONT = operador; finalidade; dados tratados; suboperadores (Supabase, Vercel); guarda e devolução ao fim; apoio a incidentes e a pedidos de titulares; auditoria pela prefeitura; regra "a equipe não lê o acervo" |
| Registro das operações (art. 37) completo | `docs/lgpd/registro-operacoes.md` (atualizar) | Hoje cobre cadastro, PDF, conferência e auditoria. **Faltam**: empréstimos (nome de quem retirou), termos de eliminação (comissão, assinaturas), login e tentativas (hash do e-mail, IP), etiquetas, usuários e vínculos, aceites, relatórios e exportação |
| Plano de resposta a incidentes | `docs/lgpd/plano-de-incidentes.md` | Conter, avaliar, avisar a prefeitura, apoiar comunicação à ANPD e aos titulares; quem faz o quê (os dois encarregados), contato, modelo de aviso, registro do incidente, ensaio anual |
| Pedidos de titulares | `docs/lgpd/pedidos-de-titulares.md` | O LicCONT recebe e **encaminha ao encarregado da prefeitura**; prazos e formato a validar |
| Política de privacidade e termo de uso | `docs/lgpd/politica-de-privacidade.md`, `docs/lgpd/termo-de-uso.md` | Em português simples; versão numerada; mesmas informações do registro |
| Política de retenção | `docs/lgpd/retencao.md` | Quanto tempo ficam auditoria, tentativas de login, backups, PDFs de documentos eliminados; ver pergunta 7 |
| Relatório de impacto (RIPD) | `docs/lgpd/ripd.md`, se o advogado pedir | Riscos do tratamento e controles |
| `SECURITY.md` | raiz | Contato real (hoje é pendência), prazo de resposta, escopo; depende do domínio e de uma caixa de e-mail (pergunta 8) |
| Lista de suboperadores | `docs/lgpd/suboperadores.md` | Remover "E-mail transacional (a escolher)" se o e-mail continuar fora (Fases 6 e 7 decidiram **sem e-mail**); manter só o que é real |

**Pontos legais a validar com advogado** (nada abaixo é afirmação de que está
certo):

- Base legal para guardar PDFs com dados de terceiros e para eliminar:
  obrigação legal e execução de política pública (LGPD, art. 7º, II e III, e
  art. 23), contra o direito de eliminação (art. 16, I).
- Se o LicCONT é mesmo **operador** (art. 5º, VII) e não controlador de parte
  do tratamento, em especial nos dados de login e de auditoria.
- Transferência internacional: a rede de borda da Vercel passa fora do
  Brasil (art. 33); GitHub nos EUA só com dado fictício.
- **Encarregado**: o plano geral registra que serão **os dois sócios**. O
  advogado confirma se pode haver dois, como publicar o contato e se a
  prefeitura precisa indicar o seu (art. 41 e regulamento da ANPD sobre
  encarregado).
- **Prazo e forma de comunicar incidente à ANPD e aos titulares**: há
  regulamento próprio da ANPD sobre comunicação de incidente de segurança
  (art. 48 da LGPD). Prazo exato, critérios de "risco relevante" e quem
  comunica (a controladora) **devem ser conferidos no texto vigente** antes de
  escrever o plano; não copiar de memória.
- Valor legal da digitalização (Decreto 10.278/2020) e assinatura digital;
  validade do termo de eliminação e dos 45 dias do edital (decisão 0009 da
  Fase 7).
- Contratação pela prefeitura: dispensa ou licitação, vigência, SLA, multa,
  foro; se a prefeitura exige cláusulas próprias de proteção de dados.
- Aceite digital (termo de uso e política) como prova de ciência do servidor.

Fonte a consultar pelo advogado: texto da Lei 13.709/2018 em
`planalto.gov.br` e normas da ANPD em `gov.br/anpd`. Este plano **não
pesquisou nem citou prazos de terceiros**.

## Checklist de segurança (tarefa 8)

Arquivo `docs/seguranca/checklist-fase-8.md`: uma linha por item, com "como
provar", "link da prova" e "data". Item sem prova **não conta como feito**.

| Área | Item | Já existe | O que a Fase 8 acrescenta |
| --- | --- | --- | --- |
| Isolamento | RLS ligado em todas as tabelas de `public`, sem GRANT para `anon` | pgTAP por tabela e `convencao_isolamento.test.sql` (que testa uma tabela **de exemplo**, não percorre as reais) | pgTAP que **lista todas as tabelas reais** e exige RLS e ausência de GRANT para `anon`; falha se uma tabela nova passar sem isso |
| Isolamento | Prefeitura A não lê, edita nem baixa dado da B (tabela, Storage, RPC) | pgTAP por tabela | Playwright de ponta a ponta com duas prefeituras de teste (ler, editar, baixar PDF por link assinado de outra) |
| Equipe | Equipe sem leitura do acervo | — | Teste da tarefa 1 |
| Segredos | `service_role` só no servidor | regra 2 do `CLAUDE.md`, Gitleaks no CI | Teste que procura o nome e o valor-padrão da chave no pacote do navegador (`.next/static`); varredura do **histórico inteiro** do Git; **rotação** das chaves antes do piloto e registro de quem as tem |
| Segredos | Nenhuma chave em log | regra 3 | Revisão por busca de `console.*` e de mensagens de erro com variáveis |
| Navegador | CSP, HSTS, clickjacking, cookies `HttpOnly`/`Secure`/`SameSite` | `src/proxy.ts`, `next.config.ts` | Playwright que confere cada cabeçalho em produção/preview. **Avaliar** tirar `style-src 'unsafe-inline'` (hoje aceito para o Tailwind/Next); se não der, registrar o motivo numa decisão |
| Login | Mensagem única, força bruta, saída por inatividade, dois fatores | Fase 1 | Playwright de regressão desses quatro itens; teste de que `/equipe` e administrador sem segundo fator não entram |
| Entradas | Zod em toda Server Action; upload só de PDF com tipo real | Fases 1 a 7 | Varredura: toda Server Action em `src/` tem esquema Zod e checagem de papel (script de checagem ou teste Vitest que lê os arquivos) |
| Arquivos | Storage privado, link assinado curto, nome trocado | Fase 3 | Playwright: link expira; bucket não lista para `anon` |
| QR | Sem login não mostra nada | Fase 5 | Playwright de regressão |
| Auditoria | Só inclusão | Fase 1 | pgTAP: UPDATE e DELETE falham até para `postgres` via API; relatório exportado aparece nela |
| Dependências | Alerta e atualização automáticas | Dependabot semanal | `npm audit --omit=dev` no CI, falhando em severidade alta; revisar à mão as imagens do Semgrep e do Gitleaks (nota no `ci.yml`) |
| Código | Análise estática | Semgrep no CI | Revisão manual de segurança pelo agente `auditor-seguranca` sobre login, Storage, funções `security definer` |
| Acessibilidade | Contraste, rótulos, teclado | `@axe-core/playwright` em `tests/e2e/ajuda.ts` | Conferir que as telas novas (aceite, relatórios, painel de uso) passam pelo mesmo teste |
| Demonstração | Modo demo nunca em Production | trava por `VERCEL_ENV` e ausência de `service_role` | Teste de que, com `SUPABASE_SERVICE_ROLE_KEY` definida, `LICCONT_DEMO=1` não liga |
| Operação | Backup e restauração | — | Tarefa 9 |
| Operação | Contato de segurança e plano de incidentes | `SECURITY.md` sem contato | Tarefa 7 |
| Operação | Quem tem acesso a Vercel, Supabase e GitHub | — | Lista de pessoas, dois fatores ligados em cada conta, ninguém com acesso de sobra |

## Backup e teste de restauração (tarefa 9)

- O plano geral exige backup diário, recuperação pontual e teste de
  restauração a cada trimestre. O plano gratuito do Supabase **não tem backup
  diário** (decisões 0003 e 0005): é item **pago** (Supabase Pro). **Não
  decidido aqui. Pergunta 3.**
- Alternativa gratuita **rejeitada por regra**: gerar dump agendado no GitHub
  Actions e guardar como artefato. Seria dado real de prefeitura num serviço
  que a lista de suboperadores declara só com dado fictício, nos EUA.
- Sem backup do provedor, **o piloto com dado real não deve começar**
  (critério de entrada).
- Ensaio de restauração (com ou sem Pro): restaurar para um **projeto
  Supabase separado** (gratuito) usando só **dado fictício**, conferir
  contagem de tabelas, RLS ligado, login funcionando e um PDF abrindo; medir
  quanto tempo levou. O ensaio com dado real só acontece **dentro do piloto**,
  por quem tem acesso ao projeto de produção, e o resultado vai ao relatório
  sem conteúdo.
- Os PDFs ficam no Storage: conferir se o backup do provedor cobre o Storage
  ou só o banco (a confirmar no painel, não suponho aqui). Se não cobrir,
  pergunta nova ao responsável.

## Teste de invasão (tarefa 10, opcional)

- O plano geral tem a caixa "[x] fazer ou não pentest" marcada e a frase
  "Recomendo fazer", mas **não diz se a resposta é sim**. Tratar como **não
  aprovado** até o responsável escrever (pergunta 4).
- **Custo**: laudo de empresa externa é pago. Por regra, **parar e perguntar**:
  valor, empresa e quando. Este plano não cota.
- Se aprovado: escopo (o app de produção/preview, não a Vercel nem o
  Supabase), janela, contato de emergência, regras ("não baixar nem copiar
  dado além do mínimo", igual ao `SECURITY.md`), **ambiente de teste com
  dados fictícios** e autorização por escrito. A empresa recebe contas de
  teste, nunca de prefeitura real. Achados viram issues; os de gravidade alta
  travam o piloto. Contratação da empresa é suboperador? Não trata dado
  pessoal se o ambiente é fictício; o advogado confirma; registrar mesmo assim
  em `docs/decisoes/`.
- **Alternativa gratuita** (não substitui o laudo para vender): autoavaliação
  pelo OWASP ASVS nível 1 e varredura do OWASP ZAP em modo básico, **só
  contra o ambiente de teste do próprio projeto**. Ferramenta aberta, roda no
  ambiente de quem testa; se rodar no GitHub Actions, registrar na decisão.

## Piloto com dados reais (tarefa 11)

Prefeitura: **Caririaçu** (o plano geral deixa a caixa "confirmar" aberta;
pergunta 9).

**Critérios de entrada** (todos, por escrito, antes do primeiro dado real):

1. Tarefas 1, 6, 7, 8 e 9 fechadas; fase 7 mesclada.
2. Contrato e anexo de dados assinados pela prefeitura, revisados por
   advogado.
3. Encarregado da prefeitura indicado e contato do LicCONT publicados.
4. Planos pagos necessários **autorizados pelo responsável** e ativos
   (Vercel com uso comercial; Supabase com backup). Sem isso, não entra.
5. Produção limpa: projeto sem os dados do `seed.sql` fictício; uma
   prefeitura de teste separada, se o responsável quiser manter uma.
6. Chaves rotacionadas; dois fatores ligados nas contas de Vercel, Supabase
   e GitHub; lista de quem tem acesso.
7. Backup do dia existe e o ensaio de restauração passou.
8. Administrador da prefeitura criado pela equipe, com dois fatores e aceite
   dos termos feito.
9. Plano de retorno lido e aceito pelas duas partes.

**Migração de dados sem expor dado real em repositório**:

- Dado real **nunca** vai para o Git, para PR, para chat nem para o Preview.
  Nem planilha, nem amostra, nem captura de tela com dado real.
- Entrada pelo **próprio sistema**, por quem trabalha na prefeitura: o
  cadastro já existe (Fase 3). Para volume, **importador por planilha**
  (nova função, a decidir na pergunta 10): administrador envia CSV pela tela,
  o servidor valida com Zod linha a linha, mostra o que seria criado e o que
  foi recusado **sem repetir os dados na mensagem de erro**, e só grava com
  confirmação. Código testado só com planilha fictícia no repositório.
  Caso a pergunta 10 diga que o volume é pequeno, vale o cadastro manual e a
  tarefa de importador sai.
- PDFs: envio pelo cadastro (já faz conferência e SHA-256). Em lote grande,
  fila de OCR/digitalização em lote está **fora da v1**.
- Prefeitura que digitaliza fora: orientação de digitalização (Decreto
  10.278/2020) entregue na implantação, como o plano geral prevê.
- Ensaio antes: migração completa com planilha **fictícia** do mesmo formato.

**Acompanhamento**: semanalmente, pelo painel da equipe (só números) e pelo
relatório de uso; conversa com o administrador. Nenhum acesso da equipe ao
acervo (tarefa 2).

**Critérios de saída (piloto aprovado)**: período combinado (pergunta 9);
sem incidente de segurança aberto; sem perda de dado; documentos cadastrados
batem com a conferência da prefeitura; administrador consegue exportar os
dados; backup e restauração conferidos de novo com dado real.

**Plano de retorno** (se o piloto precisar parar):

1. **Congelar**: equipe muda a prefeitura para `suspensa` (ninguém entra, nada
   é apagado). Registro na auditoria.
2. **Devolver**: administrador (ou a equipe a pedido escrito) gera a
   exportação completa (tarefa 3). A prefeitura confere.
3. **Voltar ao papel e à planilha**: o acervo físico nunca saiu do lugar e
   os originais seguem com a prefeitura; o sistema não é a única cópia do
   registro durante o piloto (combinar que a prefeitura mantém a planilha
   antiga atualizada ou congelada).
4. **Corrigir ou desistir**: corrigir e reativar, ou encerrar o contrato.
5. **Apagar** os dados da prefeitura só depois da confirmação escrita de que
   recebeu e conferiu a exportação, no prazo da pergunta 7, com registro do
   que foi apagado e quando (sem conteúdo). Nesta fase só o **procedimento**
   existe; a operação é feita por quem tem acesso ao projeto, sob ordem
   escrita.
6. Se o problema for **incidente de segurança**: segue o plano de incidentes,
   não o plano de retorno.

## Perguntas em aberto para o responsável

1. **Números no painel da equipe**: tudo bem a equipe ver, por prefeitura, só
   **quantidades** (documentos, caixas, usuários, bytes, último acesso)?
   Recomendo que sim. Nada de texto do acervo.
2. **Acesso de suporte com autorização**: quer o mecanismo na v1? Recomendo
   **não**: suporte com o administrador da prefeitura na tela. Se quiser,
   qual a duração máxima da autorização (proposta: 4 horas)?
3. **Backup (custo)**: autoriza **Supabase Pro** antes do piloto (backup
   diário e recuperação pontual)? Valor a conferir na hora; este plano não
   cota. Sem isso, o piloto com dado real não começa. Vale o mesmo para a
   **Vercel** (uso comercial).
4. **Pentest (custo)**: a resposta é sim ou não? Se sim: quanto pode gastar e
   quando; se não: aceita a autoavaliação gratuita (ASVS 1 e ZAP) no lugar,
   sabendo que não vira laudo para mostrar a prefeituras?
5. **Quadros novos**: o canvas não tem tela de aceite, páginas
   `/privacidade` e `/termos`, painel de uso da equipe nem layout dos
   relatórios. Pode mandar quadros, ou prefere que eu siga o padrão de um
   quadro existente (Usuários, Auditoria) e o senhor revise depois?
6. **Quem entra na equipe LicCONT**: incluir ou remover integrante hoje é por
   SQL controlado. Quem aprova (os dois sócios?) e quer uma tela?
7. **Retenção e fim de contrato**: por quanto tempo guardamos os dados da
   prefeitura depois do fim do contrato antes de apagar (proposta: 90 dias
   após a prefeitura confirmar a exportação)? E a auditoria e o backup,
   quanto tempo? **Validar com advogado.**
8. **Contato de segurança e privacidade**: depende do **domínio** (plano geral:
   `liccont.com.br`, a registrar) e de uma caixa de e-mail. Já tem domínio e
   e-mail? Domínio é item pago.
9. **Piloto**: Caririaçu confirmada? Quanto tempo dura (proposta: 60 dias)?
   Quantos usuários e secretarias entram no começo? Quando começa?
10. **Volume de migração**: quantos documentos a prefeitura tem em planilha e
    quantos PDFs? Se for mais de algumas centenas, construo o importador por
    CSV; se for pouco, cadastro manual.
11. **Advogado**: quem é e quando entrega o parecer (contrato, anexo, termo de
    uso, plano de incidentes e os pontos "a validar")? Isso é o caminho
    crítico do piloto.
12. **Monitoramento** (opcional, **pago** em geral): quer alerta de erro e de
    disponibilidade em produção? Sem serviço externo, só os logs da Vercel e
    da auditoria. Se quiser um serviço, vira decisão em `docs/decisoes/` e
    linha em `suboperadores.md`, só no plano gratuito.

## Pontos de contato com as Fases 6 e 7

| Ponto | O que a Fase 8 faz |
| --- | --- |
| **Cartões do Início** (`features/inicio/`, montados por `features/movimento/dados.ts`) | **Não mexe.** Relatórios de empréstimos e termos leem as mesmas funções (`listarEmprestimos`, `lerTemporalidade`) ou as consultas por trás delas, sem alterar a assinatura nem o cartão |
| **Navegação lateral** (`features/sessao/barra-lateral.tsx`) | O painel da equipe usa a barra própria de `features/equipe/pagina.tsx` (só "Prefeituras"). Entram "Uso" e "Relatórios" **só se a pergunta 5 trouxer o quadro**; para o administrador de prefeitura, "Relatórios" vira ação dentro de cada tela (Auditoria, Empréstimos, Temporalidade, Estrutura), **sem item novo no menu**, no mesmo espírito do contrato da Fase 7 |
| **`src/features/demo/`** | Dados novos em arquivo próprio (`src/features/demo/equipe-uso.ts`, `relatorios.ts`), como as Fases 6 e 7 fizeram; `movimento.ts` não recebe dado novo. Ação que grava, exporta ou aceita devolve `AVISO_DEMO` em demonstração |
| **`features/movimento`** | Só leitura. Em `TABELAS_NOME` acrescentar `autorizacoes_suporte` e `aceites` se existirem (conflito de uma linha) |
| **Auditoria** | Novas ações: `relatorio.exportado`, `dados.exportados`, `aceite.registrado`, `prefeitura.suspensa`, `prefeitura.reativada`. Seguem o padrão: só ids, tipos e contagens |
| **Biblioteca de PDF e Word** | Reaproveita o módulo comum de `src/lib/pdf/` escolhido pelas Fases 6 e 7. Relatórios em PDF não trazem biblioteca nova |
| **Serviço de e-mail** | **Nenhum.** Fases 6 e 7 deixaram o e-mail de fora por decisão do responsável; a Fase 8 não o reintroduz. Contato de segurança e privacidade usa uma caixa comum, que não é serviço do sistema |
| **Ordem de migração** | Migrações novas com data maior que a última na `main` quando a tarefa começar. Nunca editar migração mesclada |

## Serviço externo

**Nenhum serviço novo é necessário para o núcleo** (tarefas 1, 3 a 8, 11). Banco, Storage,
relatórios e exportação rodam no Supabase e na Vercel; PDF e CSV, no servidor.

Possíveis entradas, **todas dependentes de resposta e do plano gratuito**:

| Possível serviço | Para quê | Regra |
| --- | --- | --- |
| Supabase Pro e Vercel Pro | Backup e uso comercial (decisões 0001 e 0003 já previam) | **Pago: parar e perguntar** (pergunta 3). Não é serviço novo, é troca de plano; atualizar a decisão 0003 |
| Empresa de pentest | Laudo | **Pago: parar e perguntar** (pergunta 4) |
| Serviço de monitoramento | Alertas | **Pago em geral**; só com decisão e linha em `suboperadores.md` (pergunta 12) |
| Domínio e caixa de e-mail | Contato de segurança | **Pago** (pergunta 8) |
| OWASP ZAP | Autoavaliação | Ferramenta aberta; se rodar no GitHub Actions, registrar em `docs/decisoes/` |

## Fora do escopo

IA para busca e classificação; OCR e digitalização em lote; integração com
outros sistemas e com o Prummo; aplicativo instalável; assinatura digital
ICP-Brasil do termo; painel financeiro e cobrança (mensalidade e excedente de
armazenamento ficam fora do sistema); selo ou certificação de segurança
(ISO 27001 e semelhantes); envio de e-mail; acesso da equipe ao acervo (salvo
tarefa 2 aprovada); apagamento automático de prefeitura encerrada.

## Chaves e decisões que faltam

Nenhuma chave nova nas tarefas de código. Decisões e itens externos:

- Respostas às perguntas 1 a 12.
- Decisão em `docs/decisoes/` para: "equipe não lê o acervo" (e a tarefa 2,
  qualquer que seja a resposta), backup e restauração, pentest, e atualização
  da 0003 se os planos pagos forem contratados.
- Advogado: parecer sobre os pontos "a validar" (caminho crítico do piloto).
- Rotação das chaves existentes antes do piloto (a equipe cola as novas nas
  variáveis da Vercel e nos segredos do GitHub; **nunca no chat**).
- Domínio e caixa de contato (pergunta 8).
- Planos pagos, se autorizados (perguntas 3 e 12).

## Pronto quando

1. **Equipe sem acesso ao acervo**: pgTAP prova que equipe, com dois fatores,
   não lê nenhuma tabela de acervo; painel mostra só números reais.
2. **Checklist de segurança completo**: todas as linhas marcadas, cada uma
   com prova; pgTAP de "todas as tabelas com RLS e sem `anon`" verde;
   `npm audit` sem item alto; segredos rotacionados.
3. **Backup com restauração ensaiada** e tempo registrado.
4. **Relatórios** funcionando, respeitando a RLS, com exportação na
   auditoria; comparação com o canvas anexada ao PR (`Equipe*` e `Auditoria*`,
   claro e escuro), sem diferença que não seja dado.
5. **Pacote de LGPD** em `docs/lgpd/` revisado pelo advogado; `SECURITY.md`
   com contato real; política e termo publicados e **aceite registrado** no
   primeiro acesso, com pgTAP de isolamento para `aceites`.
6. **Pentest** feito (ou decisão escrita de não fazer, com a autoavaliação
   gratuita no lugar); achados de gravidade alta corrigidos.
7. **Piloto rodando com dados reais**: critérios de entrada cumpridos e
   assinados, migração concluída e conferida pela prefeitura, plano de
   retorno ensaiado.
8. pgTAP de isolamento verde para toda tabela nova desta fase; Vitest e
   Playwright verdes.
9. Nenhum dado pessoal em log ou mensagem de erro; nenhum dado real em
   repositório; nenhum serviço externo sem registro; nada pago sem
   autorização.
