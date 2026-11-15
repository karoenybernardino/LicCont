# Fase 3 — Documentos

Status: **plano, aguardando aprovação do responsável** (2026-11-14).
Nenhum código antes da aprovação das perguntas do fim.

Segue `docs/plano-de-desenvolvimento.md`:

- Modelo de dados: `documentos` (tipo, modalidade, número/ano, objeto,
  empresa, valor, situação, caixa) e `arquivos` (PDF no Storage, hash,
  tamanho), ambas com `prefeitura_id` e `secretaria_id`.
- Seção "PDFs e digitalizações".
- Linha da Fase 3: "Cadastro, edição, upload de PDF com checagem e cópia
  leve, visualizador, pesquisa com o painel de filtros aprovado".

Telas de referência: canvas "LicCONT — Telas do sistema" (Cadastro novo,
Pesquisa com filtros novos, Pesquisa com painel do documento; claro e
escuro). Onde este texto e o plano divergirem, vale o que for aprovado aqui.

## Por quê

Hoje o LicCONT sabe onde ficam as caixas (Fase 2), mas não sabe o que tem
dentro delas. É o documento que a prefeitura procura: "o Pregão 015/2023 da
Saúde, com a TecnoMed". Esta fase faz três coisas:

1. **Cadastrar** cada licitação ou contrato com o endereço da caixa
   ("Rua B · Módulo 3 · Nível 3 · Caixa 02").
2. **Anexar o PDF** da digitalização, sem perder o valor legal do original.
3. **Achar** qualquer documento em menos de um segundo, com o painel de
   filtros aprovado.

O mapa 3D (Fase 4), as etiquetas (Fase 5), os empréstimos (Fase 6) e o
descarte (Fase 7) leem estas tabelas.

## Pronto quando

1. **pgTAP — isolamento por prefeitura**
   (`supabase/tests/documentos_isolamento.test.sql`). Em `documentos` e
   `arquivos`, usuário de outra prefeitura:
   - não lê, não insere e não altera (o `WITH CHECK` barra INSERT e UPDATE);
   - não consegue apontar um documento para uma caixa de outra prefeitura,
     e o erro é o mesmo de uma caixa que não existe (sem oráculo, como o
     `app.estrutura_pai_confere()` da Fase 2).

   A chave composta impede um arquivo de apontar para um documento de outra
   prefeitura ou de outra secretaria, mesmo pelo dono do banco.
2. **pgTAP — isolamento por secretaria.** Um operador com vínculo só em
   Obras:
   - não lê, não insere e não altera documento nem arquivo da Saúde;
   - não grava documento com `secretaria_id` da Saúde.

   O administrador (com segundo fator, quando obrigatório) lê todas as
   secretarias da prefeitura. Consulta lê só as suas e não escreve. Equipe
   LicCONT não lê. `anon` não tem privilégio. DELETE não tem GRANT para
   ninguém.
3. **pgTAP — Storage** (`supabase/tests/storage_acervo.test.sql`). Nas
   políticas de `storage.objects` do bucket `acervo`:
   - outra prefeitura e outra secretaria não leem nem gravam o objeto;
   - Consulta não grava;
   - ninguém sobrescreve um objeto existente nem grava fora do caminho
     `prefeitura/secretaria/arquivo.pdf`;
   - ninguém grava sem uma linha em `arquivos` na situação `enviando`, criada
     pela própria pessoa;
   - só quem enviou apaga, e só o envio recusado ou abandonado.
4. **pgTAP — desempenho** (`supabase/tests/documentos_desempenho.test.sql`).
   Com 100 mil documentos fictícios gerados no teste (`generate_series`,
   2 prefeituras e 6 secretarias), `public.pesquisar_documentos` responde
   em menos de 1 s (`performs_ok`) em cada combinação de filtros:
   - só a busca (texto, número do processo e CNPJ parciais);
   - busca + período;
   - modalidade + secretaria;
   - situação + valor + vigência;
   - todos os filtros juntos;
   - nenhum filtro.

   O mesmo vale como Consulta (com o RLS e as secretarias permitidas) e
   como administrador. A contagem das abas (Todos, Licitações e Contratos)
   sai na mesma chamada que a lista, numa consulta só, e bate com
   `count(*)`.
5. **pgTAP — ocupação da caixa:**
   - a ocupação da caixa conta os documentos ativos de **todas** as
     secretarias e não devolve nenhum dado deles além do número;
   - "próxima caixa livre" devolve a primeira caixa ativa com folga, na
     ordem do código;
   - caixa desativada não recebe documento;
   - desativar caixa com documento ativo é recusado.
6. **pgTAP — auditoria:** inclusão e alteração de documento e de arquivo
   entram em `auditoria` pelo gatilho `app.auditar_alteracao()`. Valores
   antes e depois são registrados, sem o conteúdo do PDF.
7. **Vitest:**
   - esquemas Zod do cadastro (tipo, modalidade por tipo, CNPJ com dígito
     verificador, valor em reais, vigência com fim depois do início);
   - montagem dos filtros da pesquisa a partir da URL, e o caminho de
     volta;
   - título do documento ("Pregão Eletrônico 015/2023");
   - conferência do PDF no servidor: cabeçalho `%PDF-`, fim `%%EOF`,
     `/Encrypt`, tamanho máximo e hash SHA-256 por partes;
   - formatação "38 páginas · 2,4 MB".
8. **Playwright com axe** (`tests/e2e/documentos.spec.ts`):
   - o operador cadastra um documento, escolhe a caixa pelas listas, usa
     "Próxima livre", anexa um PDF fictício, vê a miniatura e abre o
     visualizador;
   - "Baixar original" baixa o arquivo idêntico (o mesmo hash);
   - um arquivo que não é PDF, apenas com o nome trocado para `.pdf`, é
     recusado;
   - a pesquisa filtra pelas abas e pelos filtros, as contagens mudam
     juntas, "Limpar" volta ao início e o filtro fica na URL (dá para
     copiar o link);
   - Consulta pesquisa e abre o PDF, mas não vê "Cadastrar" e é recusada no
     servidor;
   - o operador de Obras não acha o documento da Saúde;
   - o axe não aponta falha em nenhuma tela nova, no claro e no escuro.

   A demonstração é conferida na prévia, porque o CI roda com banco.
9. As migrações são compatíveis com a versão anterior do app (só
   adicionam), são aplicadas pelo job `migracoes` (decisão 0005), e os
   checks atuais seguem verdes.

## Fora do escopo

- **OCR** (leitura do texto dentro do PDF) e busca por palavra dentro da
  digitalização: entram na fila de segundo plano de uma fase posterior.
- **Aviso de página ruim** (em branco, escura ou torta): entra com o OCR,
  porque precisa analisar cada página como imagem.
- **Validação completa de PDF/A** (veraPDF): não roda no navegador nem no
  plano gratuito. Ver pergunta 6.
- **Mapa 3D, planta baixa, "Ver no mapa 3D", "Ir para o mapa 3D" e "Dentro
  da caixa"**: Fase 4. Os botões aparecem desabilitados, com o texto
  "Disponível na Fase 4", ou ficam escondidos (pergunta 10).
- **Etiqueta com QR, "Imprimir etiqueta" e "Salvar e imprimir etiqueta"**:
  Fase 5. A prévia da etiqueta aparece no cadastro, mas sem QR de verdade.
- **Empréstimos, a situação "Emprestado" e "Registrar empréstimo"**:
  Fase 6. A situação "Emprestado" vem do empréstimo e não é gravada no
  documento.
- **Descarte e temporalidade**: Fase 7. Nesta fase o documento nunca é
  apagado, só desativado pelo coordenador ou pelo administrador.
- **Mover documentos em lote** de uma caixa para outra: entra com a Fase 4.
  Nesta fase, para mover, edita-se o documento e troca-se a caixa.
- **Digitalização em lote** e envio de vários PDFs de uma vez.
- **Credor pessoa física (CPF)**: o campo aceita só CNPJ (ver "Dados
  pessoais").
- **Planta e mapa em PNG de 600 dpi** (Decreto 10.278): nesta fase o envio
  aceita só PDF.

## Fracasso mesmo funcionando

- Um documento ou um PDF de outra prefeitura, ou de uma secretaria sem
  vínculo, aparecendo em qualquer lista, contagem, miniatura ou link.
- Um link do PDF que continua abrindo horas depois, ou que pode ser
  compartilhado fora do sistema sem prazo.
- O original alterado, recomprimido ou trocado sem registro. O hash
  gravado não bate com o arquivo baixado.
- Um arquivo que não é PDF (ou um PDF com senha) aceito como digitalização.
- A pesquisa lenta com o acervo cheio, ou contagens das abas que não batem
  com a lista.
- Um documento cadastrado numa caixa desativada ou de outra prefeitura.
- Um botão escondido para quem não pode, mas a ação passando no servidor ou
  no banco.
- Um PDF enviado pela metade (a internet caiu) aparecendo como pronto.
- O nome original do arquivo, ou o conteúdo do documento, num log ou numa
  mensagem de erro.
- Gastar além do plano gratuito sem aviso (Storage passando de 1 GB).

## Modelo de dados (migração em `supabase/migrations/`)

Tudo com RLS ligado e GRANT explícito por coluna. Nada para `anon` nem para
`service_role`: as telas do servidor usam a sessão da pessoa, e o
`seed.sql` roda como dono. As convenções são as das Fases 1 e 2:

- `unique (id, prefeitura_id)` no pai e chave estrangeira composta no
  filho;
- auditoria por gatilho;
- funções `app.*` com `search_path = ''`;
- nenhum DELETE.

### `documentos`

| Campo | Tipo e regra |
| --- | --- |
| `id` | uuid |
| `prefeitura_id`, `secretaria_id` | obrigatórios. Chave composta `(secretaria_id, prefeitura_id)` para `secretarias`. |
| `caixa_id` | obrigatório (pergunta 4). Chave composta `(caixa_id, prefeitura_id)` para `caixas`. |
| `tipo` | `licitacao` ou `contrato` |
| `modalidade` | Licitação: pregão eletrônico, pregão presencial, concorrência, concurso, leilão, diálogo competitivo, dispensa, inexigibilidade. Também as da lei antiga (tomada de preços, convite), porque o acervo tem processos de 2010 em diante. Contrato: opcional (a modalidade da licitação de origem). |
| `numero` | texto de 1 a 30 caracteres, como está no processo ("015/2023", "PE-15/2023-SMS"). O canvas chama de "Título do processo"; a tela mostra o título montado, por exemplo "Pregão Eletrônico 015/2023". |
| `ano` | 1950 até o ano atual + 1 |
| `objeto` | de 3 a 2.000 caracteres |
| `empresa` | nome do credor ou da empresa vencedora, até 200 caracteres. Opcional (licitação deserta não tem). |
| `cnpj` | 14 dígitos com dígito verificador, opcional. Nunca CPF. |
| `valor` | `numeric(15,2)`, maior ou igual a 0, opcional |
| `situacao` | Licitação: em andamento, concluída, deserta, fracassada, revogada, anulada. Contrato: vigente, encerrado, rescindido (pergunta 8). |
| `vigencia_inicio`, `vigencia_fim` | só contrato; o fim não pode vir antes do início |
| `conferido_em`, `conferido_por` | o selo "Conferido" do canvas. É marcado pelo coordenador ou pelo administrador. |
| `ativo` | `false` = desativado (nunca apagado) |
| `criado_por`, `criado_em`, `atualizado_em` | preenchidos pelo banco |
| `texto_busca` | coluna gerada: número, objeto, empresa e CNPJ, sem acento e em minúsculas (função `app.sem_acento`, imutável, sobre `unaccent`) |

Único: `(prefeitura_id, tipo, modalidade, numero, ano)`, só para os
documentos ativos. Evita cadastrar o mesmo processo duas vezes; a
mensagem diz "Já existe um documento com este número".

### `arquivos`

| Campo | Tipo e regra |
| --- | --- |
| `id` | uuid. É também o nome do objeto no Storage. |
| `prefeitura_id`, `secretaria_id`, `documento_id` | chave composta `(documento_id, prefeitura_id, secretaria_id)` para `documentos`: o arquivo herda a secretaria do documento e não diverge dela |
| `caminho` | `acervo/<prefeitura_id>/<secretaria_id>/<id>.pdf`. É gerado pelo banco e não pode ser escolhido por quem envia. |
| `nome_original` | o nome do arquivo enviado, limpo (sem caminho nem caractere de controle), até 200 caracteres. Aparece na tela e no "Baixar original", nunca em log. |
| `tamanho` | em bytes, até o limite da prefeitura |
| `sha256` | hash do original, calculado **no servidor** na conferência |
| `paginas` | número de páginas, lido na conferência |
| `situacao` | `enviando` → `conferindo` → `pronto` ou `recusado` |
| `motivo_recusa` | código fixo: `nao_pdf`, `com_senha`, `corrompido`, `grande_demais`, `incompleto` |
| `avisos` | lista fixa: `resolucao_baixa`, `sem_pdfa`. São avisos e não impedem o envio (pergunta 6). |
| `miniatura_caminho` | imagem da 1ª página no bucket `miniaturas` |
| `copia_leve_caminho` | vazio nesta fase (pergunta 2) |
| `ativo` | ao "Trocar", o arquivo anterior fica `ativo = false` e o objeto continua guardado |
| `enviado_por`, `enviado_em`, `conferido_em` | preenchidos pelo banco |

Único: um arquivo ativo por documento (índice parcial em `documento_id`
onde `ativo`).

### Mudanças em tabelas existentes (só adicionam)

- `caixas.capacidade_documentos`: `smallint`, padrão 50, de 1 a 500. É uma
  estimativa de quantos documentos cabem na caixa (pergunta 5). Entra no
  GRANT de UPDATE do administrador e do coordenador.
- `prefeituras.limite_pdf_mb`: `smallint`, padrão 50, de 1 a 50. O teto é o
  limite do plano gratuito do Supabase. Sem tela nesta fase: só a equipe
  LicCONT muda, pelo banco.
- O gatilho de desativar caixa (`app.estrutura_desativa_confere`) passa a
  recusar também a caixa com documento ativo (o código novo será LC005).

### Quem lê e quem escreve

| Papel | Lê | Escreve |
| --- | --- | --- |
| Administrador (com segundo fator, quando obrigatório) | documentos e arquivos de todas as secretarias da prefeitura | cadastra, edita, anexa, troca o PDF, marca como conferido, desativa |
| Coordenador | os das secretarias vinculadas | o mesmo que o administrador, mas só nas secretarias vinculadas |
| Operador | os das secretarias vinculadas | cadastra, edita e anexa nas secretarias vinculadas. Não marca como conferido nem desativa. |
| Consulta | os das secretarias vinculadas | nada |
| Equipe LicCONT | nada | nada |

Políticas só com funções `app.*` (nunca o JWT direto):

- **Leitura:** `prefeitura_id = (select app.prefeitura_atual()) and
  secretaria_id in (select app.secretarias_permitidas())`. O `select` em
  volta faz o Postgres calcular a função uma vez por consulta, e não uma
  vez por linha. Isso é essencial para o critério de 1 s.
- **Inclusão e edição:** o mesmo, mais uma função nova
  `app.pode_cadastrar(secretaria_id)`: vínculo de operador, coordenador ou
  administrador em secretaria **ativa**.
- **Conferir e desativar:** gatilho que aceita a mudança de
  `conferido_em` e de `ativo` só de quem é coordenador da secretaria do
  documento ou administrador.
- **GRANT por coluna:**
  - INSERT nas colunas de dado;
  - UPDATE nas colunas de dado, exceto `prefeitura_id`, `secretaria_id`,
    `criado_*` e `texto_busca`;
  - em `arquivos`, UPDATE só em `ativo`. A situação, o hash e as páginas
    mudam só pela função de conferência (abaixo).
- **Trocar a secretaria de um documento:** não é permitido nesta fase.
  Desativa-se e cadastra-se de novo. Isso evita que o PDF fique numa pasta
  de outra secretaria.

### Ocupação da caixa

- A capacidade da caixa é estimada em documentos
  (`caixas.capacidade_documentos`). A ocupação é calculada e nunca gravada:
  documentos ativos ÷ capacidade.
- A caixa guarda documentos de várias secretarias (decisão 1 da Fase 2),
  mas cada pessoa só lê as suas. Por isso a contagem vem de uma função
  `security definer`, `public.ocupacao_caixas(caixa_ids uuid[])`. Ela:
  - devolve só `caixa_id`, `documentos` e `capacidade`;
  - aceita só caixas da prefeitura atual;
  - não devolve título, secretaria nem nenhum outro dado do documento.
- `public.proxima_caixa_livre(nivel_id | modulo_id | rua_id)` devolve a
  primeira caixa ativa com folga, na ordem do código (`B-M3-N3-C02`). É o
  botão "Próxima livre" do cadastro.
- Caixa cheia: avisa, não bloqueia (pergunta 5). O texto do canvas é
  "38 documentos, cabem cerca de 20".

### Pesquisa

Uma função, `public.pesquisar_documentos(...)`, `security invoker` (o RLS
vale). Uma chamada devolve:

- `contagens`: Todos, Licitações e Contratos, numa consulta só, com
  `count(*) filter (where tipo = ...)`. As contagens aplicam todos os
  filtros, menos a aba;
- `total` da aba escolhida;
- até 50 `itens` da aba, com: id, tipo, modalidade, título, situação,
  objeto, empresa, código da posição, `tem_pdf`, data;
- paginação por cursor (`criado_em`, `id`), sem `offset`.

Parâmetros: busca, aba, ano inicial e final, modalidade, secretaria,
situação, faixa de valor, vigência (vigentes, vencidos, vencem em 30 dias)
e ordem ("Mais recentes", "Mais antigos", "Maior valor"). A regra de cada
filtro está na pergunta 7.

Índices:

- GIN `pg_trgm` em `texto_busca`. Acha pedaço de palavra, de número de
  processo e de CNPJ ("015/20", "tecnomed", "12.345"), sem acento e sem
  diferença de maiúscula;
- B-tree `(prefeitura_id, secretaria_id, tipo, ano)`, mais
  `(prefeitura_id, criado_em desc, id)` para a ordem e o cursor;
- parciais para contratos: `(prefeitura_id, vigencia_fim)` e
  `(prefeitura_id, valor)` onde `tipo = 'contrato'`.

Busca com menos de 3 letras usa igualdade no número e no CNPJ, e não o
trigram. Os índices e o plano de cada combinação do critério 4 são
conferidos com `EXPLAIN ANALYZE` no PR do banco. Se alguma combinação
passar de 1 s, entra um índice a mais antes de seguir.

## Arquivos PDF (Storage)

### Buckets (criados pela migração, com `insert into storage.buckets`)

| Bucket | Público | Limite por arquivo | Tipos aceitos |
| --- | --- | --- | --- |
| `acervo` | não | 50 MB | `application/pdf` |
| `miniaturas` | não | 300 KB | `image/webp`, `image/png` |

As políticas de `storage.objects` usam as mesmas funções `app.*`:

- a 1ª pasta do caminho é a prefeitura atual e a 2ª está entre as
  secretarias permitidas;
- INSERT só quando existe a linha em `arquivos`, com aquele caminho, na
  situação `enviando` e `enviado_por = auth.uid()`;
- SELECT só para quem lê o documento;
- nenhum UPDATE: sem sobrescrever, sem `upsert`;
- DELETE só para quem enviou, e só com a linha em `enviando` (abandonado)
  ou `recusado`.

### Como o envio funciona

O app não expõe a sessão ao navegador (cookies HttpOnly) e as funções da
Vercel recebem no máximo 4,5 MB por requisição. Por isso o PDF vai **direto
do navegador para o Storage**, sem passar pelo servidor do app:

1. **Server Action "iniciar envio".** Confere a permissão e o tamanho
   declarado. Cria a linha em `arquivos` (`enviando`). Pede ao Storage um
   link de envio assinado, que vale só para aquele caminho
   (`createSignedUploadUrl`), com a sessão da pessoa: a política de INSERT
   vale.
2. **O navegador envia o arquivo.** Retomar o envio se a internet cair
   (TUS, em partes de 6 MB) depende de o Storage aceitar o link assinado
   nesse modo. Isso é conferido na 1ª tarefa do PDF. Se não aceitar, o
   envio vai numa parte só (até 50 MB) e um envio interrompido recomeça do
   zero, com aviso. A alternativa, entregar ao navegador a sessão da
   pessoa, **não** entra, porque mudaria a regra dos cookies HttpOnly da
   Fase 1.
3. **No navegador, antes de enviar** (pdf.js, biblioteca aberta da Mozilla,
   licença Apache-2.0, roda na máquina da pessoa):
   - confere se o arquivo abre e se tem senha;
   - conta as páginas;
   - estima a resolução das 3 primeiras páginas;
   - lê a marca de PDF/A;
   - gera a miniatura da 1ª página em WebP.

   É só para avisar cedo. O navegador não é confiável, por isso o servidor
   confere de novo.
4. **Server Action "conferir envio".** Lê o objeto do Storage em partes,
   por um link assinado curto:
   - calcula o SHA-256;
   - confere o tamanho real;
   - confere o cabeçalho `%PDF-` e o fim `%%EOF`;
   - procura `/Encrypt` (PDF com senha).

   Passou: a situação vira `pronto`, com hash, páginas e avisos. Não
   passou: `recusado` com o motivo, e o objeto é apagado. A troca de
   situação é feita por uma função `security definer`,
   `app.concluir_conferencia`, que aceita só o arquivo da própria pessoa em
   `conferindo`.
5. Um envio abandonado em `enviando` por mais de 24 horas aparece para quem
   enviou com "Enviar de novo". A limpeza automática fica para a fila de
   segundo plano.

O documento aparece cadastrado na hora. O PDF aparece como "Conferindo…"
até o passo 4 terminar.

### Visualizador, cópia leve e miniatura

- **Visualizador próprio** com pdf.js: página por página, zoom, igual em
  qualquer navegador e no celular. Ele lê o **original** por partes
  (pedidos HTTP com `Range`, que o Storage aceita) com um link assinado de
  5 minutos, renovado enquanto a tela está aberta. Um PDF de 50 MB abre a
  1ª página sem baixar o arquivo inteiro.
- **"Baixar original"**: link assinado de 5 minutos com o `nome_original`.
  Aparece para todos que leem o documento (pergunta 3).
- **Miniatura da 1ª página**: gerada no navegador no passo 3 e guardada no
  bucket `miniaturas`. Aparece na lista e no painel do documento. Se
  faltar, aparece um ícone de PDF.
- **Cópia leve**: ver a pergunta 2. A recomendação é **não gerar nesta
  fase**. O visualizador por partes já evita baixar o arquivo inteiro, e
  gerar a cópia de um PDF de 300 páginas no navegador de quem cadastra
  travaria o computador. A coluna `copia_leve_caminho` já existe. A cópia
  entra na fila de segundo plano junto com o OCR, se a medição mostrar que
  é preciso.

### Onde processar, no plano gratuito

| Opção | Serve? | Por quê |
| --- | --- | --- |
| Navegador de quem cadastra (pdf.js) | **Sim**, para a miniatura e os avisos | Grátis, sem serviço novo, o PDF não sai do sistema |
| Supabase Edge Functions | Não | Limite de 2 s de CPU por chamada e pouca memória: não renderiza PDF |
| Funções da Vercel | Só a conferência (hash e marcas) | Lê em partes sem carregar o arquivo inteiro na memória. Renderizar PDF exigiria biblioteca nativa e passaria do tempo das funções. |
| Serviço de PDF pago ou externo | Não | Custo, mais um suboperador e o PDF saindo do sistema |

O pdf.js e o tus-js-client (se o envio retomável funcionar) rodam no
navegador e não enviam dado a ninguém. Não são suboperadores, mas entram
como dependência nova pela decisão 0007 (registro em `docs/decisoes/`).
O pdf.js também pede ajuste na CSP (`worker-src` do próprio site e
`connect-src` para o Storage), feito no PR do visualizador.

### Limites do plano gratuito do Supabase

| Limite | Plano gratuito | O que significa |
| --- | --- | --- |
| Armazenamento | 1 GB | Cerca de 400 PDFs de 2,4 MB. Serve para teste e demonstração, **não para o piloto**. |
| Tamanho por arquivo | 50 MB | É o teto do `limite_pdf_mb` |
| Saída de dados (download) | 5 GB por mês | Cada conferência lê o PDF uma vez, e cada abertura lê as páginas vistas |
| Banco | 500 MB | Os 100 mil documentos do teste rodam só no CI (banco local), nunca no projeto |

Um painel da equipe LicCONT com o espaço usado fica para a Fase 8. Antes
de qualquer PDF de verdade, o responsável decide o plano pago (regra de
custos: parar e perguntar). Até lá, só PDFs fictícios.

### Decreto 10.278/2020

- O original é guardado **exatamente** como chegou. Nada de compressão nem
  conversão, e o hash prova que é o mesmo.
- Resolução abaixo de 300 dpi e falta da marca de PDF/A geram **aviso** na
  tela e no painel do documento ("A digitalização pode não ter valor
  legal"), sem bloquear (pergunta 6).
- Metadados e assinatura digital para substituir o papel continuam a
  confirmar com o advogado (plano geral).

### Dados pessoais

- O PDF é do acervo da prefeitura. O LicCONT guarda e mostra, mas não lê o
  conteúdo; o pdf.js só desenha as páginas e não extrai texto.
- O credor é registrado por CNPJ (dado de empresa). CPF não é aceito no
  campo: o esquema recusa 11 dígitos e a mensagem orienta a não informar.
- Nenhum log com objeto, empresa, nome do arquivo ou hash. As mensagens de
  erro são fixas.
- O Supabase já é suboperador para PDFs (decisão 0003). Nenhum serviço novo
  entra nesta fase.

## Telas

O código fica em `src/features/documentos/`, que contém:

- `dados.ts` (só no servidor), com o ramo da demonstração;
- `acoes.ts`, `esquemas.ts`, `filtros.ts` (URL de ida e volta) e
  `titulo.ts`;
- `envio.ts` (no navegador: pdf.js, miniatura e envio);
- `visualizador.tsx`.

Reutiliza de `src/features/estrutura/`: `Painel`, `Etiqueta`, `Rotulo`,
`codigoPosicao`, `mensagemErro` (que ganha LC005) e os estilos de tabela.
O menu de `src/features/sessao/pagina.tsx` ganha "Pesquisa" (todos os
perfis) e "Cadastrar documento" (quem pode). Todas as telas seguem o
canvas, no claro e no escuro.

- **Cadastrar documento** (`/documentos/novo`; editar em
  `/documentos/[id]/editar`). Trilha "Acervo · Novo".
  1. **Dados do documento:** Licitação | Contrato, Modalidade (a lista
     muda conforme o tipo), Número do processo, Objeto, Empresa vencedora,
     CNPJ, Secretaria (só as permitidas para cadastrar; já vem com a
     secretaria do seletor do cabeçalho), Ano, Valor (R$), Situação (a
     lista muda conforme o tipo) e, para contrato, Vigência (início e
     fim).
  2. **Onde a caixa está guardada:**
     - listas dependentes Rua → Módulo → Nível → Caixa;
     - "Buscar rua…" com o percentual de ocupação de cada rua (da visão
       `estrutura_ocupacao`);
     - a linha "Rua B · Módulo 3 · Nível 3 · Caixa 02 · 38 documentos,
       cabem cerca de 20";
     - botão "Próxima livre";
     - prévia da etiqueta da caixa, com o QR desenhado como imagem fixa e
       o texto "QR na Fase 5".
  3. **Arquivo digital (opcional):** escolher ou arrastar o PDF, nome,
     tamanho, barra de envio, avisos (resolução, PDF/A), "Trocar".

  Botões: "Salvar e novo" e "Salvar" (o "Salvar e imprimir etiqueta" chega
  na Fase 5).
- **Pesquisa** (`/pesquisa`, todos os perfis). Segue a variante "Pesquisa —
  filtros novos" do canvas:
  - busca única ("Processo, objeto, credor ou CNPJ", Enter pesquisa);
  - abas Todos / Licitações / Contratos com a contagem;
  - painel de filtros: Período (ano inicial e final), Licitação
    (modalidade, secretaria), Contratos (situação, valor, vigência),
    "Limpar";
  - "N documentos encontrados" e "Ver no mapa 3D" (Fase 4);
  - lista: título, situação, "objeto · empresa", código `B-M3-N3-C02`,
    ordem "Mais recentes";
  - a variante com chips ("Ano: 2023", "Limpar filtros") é usada no
    celular, onde o painel lateral não cabe;
  - os filtros vivem na URL (`?q=&aba=&de=&ate=...`): voltar, recarregar e
    compartilhar o link mantêm a pesquisa.
- **Painel do documento** (à direita da pesquisa; tela inteira em
  `/documentos/[id]` e no celular):
  - "Licitação · Pregão eletrônico", título, objeto, selo "Conferido";
  - Empresa, Secretaria, Ano, Valor;
  - "Onde está guardado" (Rua B · Módulo 3 · Nível 3 · Caixa 02);
  - prévia da etiqueta;
  - miniatura e "pregao-015-2023.pdf · 38 páginas · 2,4 MB";
  - "Abrir PDF", "Baixar original";
  - "Editar", "Marcar como conferido" e "Desativar", para quem pode.

  "Ir para o mapa 3D", "Mapa do galpão", "Imprimir etiqueta" e "Registrar
  empréstimo" seguem a pergunta 10.
- **Visualizador** (`/documentos/[id]/pdf`): página atual / total,
  anterior e próxima, zoom (ajustar à largura, +, −), "Baixar original",
  "Voltar". Funciona pelo teclado e tem rótulos para leitor de tela. Se o
  pdf.js falhar, aparece "Não foi possível mostrar o PDF aqui" com
  "Baixar original".

### Demonstração (`LICCONT_DEMO=1`)

- `src/features/demo/documentos.ts`: cerca de 40 documentos fictícios nas
  caixas das ruas A a D da demonstração da Fase 2. Inclui os 5 do canvas
  (Pregão Eletrônico 015/2023 da TecnoMed etc.), com secretarias, anos,
  valores e situações variados.
- A pesquisa e as contagens rodam em memória, com as mesmas regras de
  filtro (`filtros.ts` é compartilhado e testado no Vitest).
- Um PDF fictício pequeno, gerado para o projeto (texto "Documento de
  demonstração", 3 páginas), fica em `public/demo/`. O visualizador e o
  "Baixar original" usam esse arquivo.
- Cadastrar, editar, enviar PDF, conferir e desativar devolvem
  `AVISO_DEMO`. Nada é gravado e nada vai ao Storage.
- A troca de perfil pela faixa amarela mostra a diferença entre Operador
  (cadastra) e Consulta (só pesquisa).

## Entregas e ordem (uma branch e um PR por tarefa)

| # | Branch | Entrega | Como provar |
| --- | --- | --- | --- |
| 1 | `fase-3/banco-documentos` | Migração: `documentos`, `arquivos`, `caixas.capacidade_documentos`, `prefeituras.limite_pdf_mb`, `app.sem_acento`, `app.pode_cadastrar`, gatilhos (caixa da prefeitura, sem oráculo, conferir e desativar, LC005), `pesquisar_documentos`, `ocupacao_caixas`, `proxima_caixa_livre`, índices, auditoria. `seed.sql` com cerca de 30 documentos fictícios por prefeitura de teste. | pgTAP dos critérios 1, 2, 4, 5 e 6. `EXPLAIN ANALYZE` das combinações no PR. |
| 2 | `fase-3/storage` | Buckets `acervo` e `miniaturas`, políticas de `storage.objects`, `app.concluir_conferencia`. Teste de que o link assinado aceita o envio retomável. | pgTAP do critério 3. Resultado do teste do envio retomável no PR. |
| 3 | `fase-3/cadastro` | Tela Cadastrar e editar (sem PDF), listas dependentes da caixa, ocupação, "Próxima livre", conferir, desativar, menu, demonstração | Vitest (esquemas, título). Playwright: o operador cadastra e edita; Consulta é recusada no servidor; axe. |
| 4 | `fase-3/pesquisa` | Tela Pesquisa com busca, abas, filtros, URL, painel do documento, lista paginada, demonstração | Vitest (filtros). Playwright: filtros, contagens, Limpar, link copiado, Obras não acha a Saúde; axe. |
| 5 | `fase-3/envio-pdf` | Envio direto ao Storage, avisos no navegador, conferência no servidor (hash, marcas, senha), miniatura, "Trocar", "Enviar de novo" | Vitest (conferência). Playwright: PDF fictício aceito com miniatura; `.pdf` falso recusado; PDF com senha recusado. |
| 6 | `fase-3/visualizador` | Visualizador pdf.js por partes, "Baixar original", CSP, registro das dependências (decisão 0007) | Playwright: abre a página 2, aplica zoom; o download tem o mesmo SHA-256; axe. |

Cada tarefa:

- o teste que falha vem primeiro;
- passa pela revisão do `revisor-codigo` e do `auditor-seguranca` antes do
  PR;
- a tarefa 5 também passa pelo `conformidade-lgpd`.

No fechamento, a seção "Resultado" é preenchida neste arquivo. Se o
responsável preferir, as 6 tarefas viram 3 PRs (pergunta 9).

## O que você precisa fazer

- **Nenhuma chave nova.** Os buckets e as políticas são criados pela
  migração, aplicada pelo CI no merge (decisão 0005). Não há variável nova
  na Vercel nem segredo novo no GitHub. Se alguma tarefa descobrir que
  falta algo, o PR lista o que é e onde colar. Nunca no chat.
- **Responder às perguntas abaixo** (ou aprovar as recomendações).
- **Antes de qualquer PDF de verdade:** decidir o plano do Supabase. O
  gratuito tem 1 GB de arquivos. Até lá, só PDFs fictícios, como manda a
  regra do projeto.
- **Conferir a demonstração** de cada PR (ou do PR único) na prévia, como
  na Fase 2.

## Perguntas que só o responsável decide

| # | Pergunta | Recomendação |
| --- | --- | --- |
| 1 | **Tamanho máximo do PDF** por arquivo? | **50 MB**, que é o teto do plano gratuito do Supabase. Fica em `prefeituras.limite_pdf_mb` para baixar por prefeitura. Para subir acima de 50 MB, é preciso plano pago. Processo maior se divide em volumes (Volume 1, Volume 2), como já se faz no papel. |
| 2 | **Onde gerar a miniatura e a cópia leve?** | **Miniatura no navegador** de quem envia (pdf.js), sem serviço novo e sem custo. **Cópia leve fica para depois:** o visualizador lê o original por partes, o que já evita baixar o arquivo inteiro. A cópia entra na fila de segundo plano com o OCR, se a medição com PDFs reais mostrar que é preciso. Sem Edge Function (não aguenta renderizar PDF) e sem serviço pago. |
| 3 | **Quem pode "Baixar original"?** | **Todos que leem o documento**, Consulta inclusive (o plano geral diz "para quem tem permissão"; ler já é a permissão). Cada link vale 5 minutos. **Não auditar cada visualização nesta fase** (muitas linhas), só inclusões e alterações. Auditar acesso entra na Fase 8, se a prefeitura exigir. |
| 4 | **Campos obrigatórios** no cadastro? | **Tipo, modalidade (para licitação), número, ano, objeto, secretaria, situação e caixa.** Empresa, CNPJ, valor, vigência e PDF são opcionais: o acervo antigo muitas vezes não tem esses dados à mão, e o cadastro não pode travar a digitalização. Documento sem caixa (só digital) não entra nesta fase. |
| 5 | **Caixa cheia**: o que acontece? | **Avisa e deixa salvar.** A capacidade em documentos é estimada (os processos têm espessuras diferentes), padrão de 50 por caixa, ajustável caixa a caixa pelo administrador ou pelo coordenador. A linha fica em âmbar a partir de 90% e em vermelho acima de 100%. "Próxima livre" pula as cheias. Bloquear faria o operador mentir a caixa. |
| 6 | **PDF/A e 300 dpi**: exigir ou avisar? | **Avisar, sem bloquear.** Validar PDF/A de verdade exige o veraPDF (Java), que não roda no navegador nem no plano gratuito. Nesta fase o sistema lê a marca de PDF/A e estima a resolução, e mostra "A digitalização pode não ter valor legal". Exigir fica para depois de ouvir o advogado. |
| 7 | **Como os filtros se combinam** entre os grupos? | Busca, Período e Secretaria valem para todos. **Os filtros do grupo Licitação (modalidade) só restringem licitações, e os do grupo Contratos (situação, valor, vigência) só restringem contratos.** Ao escolher um filtro de Contratos, a aba vai sozinha para Contratos. As contagens das abas mostram o efeito de cada grupo. A secretaria sai do grupo Licitação e vai para junto do Período (vale para os dois tipos). |
| 8 | **Situações** do documento? | Licitação: **em andamento, concluída, deserta, fracassada, revogada, anulada**. Contrato: **vigente, encerrado, rescindido**. "Emprestado" não é situação: vem do empréstimo (Fase 6) e aparece como selo. A lista fica no banco (`check`) e pode crescer depois. |
| 9 | **Seis PRs ou menos?** | **Três PRs**, cada um com a demonstração para aprovar: (a) banco + Storage, (b) cadastro + pesquisa, (c) envio do PDF + visualizador. A Fase 3 é bem maior que a 2, e um PR único ficaria difícil de revisar. |
| 10 | **Botões de fases futuras** no canvas ("Ver no mapa 3D", "Imprimir etiqueta", "Registrar empréstimo")? | **Escondidos** até a fase deles. Botão desabilitado confunde quem usa e o leitor de tela. A prévia da etiqueta no cadastro aparece, porque mostra onde a caixa está. |
| 11 | **Quem vê qual secretaria** na pesquisa? | Como na Fase 1: **operador, coordenador e consulta veem as secretarias vinculadas; o administrador vê todas.** A pesquisa mostra **todas as permitidas** de uma vez, e o filtro Secretaria restringe. O seletor do cabeçalho só define a secretaria padrão do cadastro. A ocupação da caixa conta documentos de todas as secretarias (só o número, nunca o conteúdo). |
| 12 | **Credor pessoa física** (CPF)? | **Não aceitar nesta fase.** O CPF é dado pessoal e exige base legal e cuidado na pesquisa. Credor pessoa física não entra: "Empresa" é para razão social (CPF é recusado também no texto livre). Se precisar, entra depois, com máscara e decisão de LGPD. |

## Decisões do responsável

Em 2026-11-14 o responsável aprovou as 12 recomendações acima, com estas mudanças:

- **Um PR só** (PR 31) em vez de três, junto com a moldura e as telas refeitas pelo canvas.
- **Ícones de fases futuras aparecem desabilitados** ("em breve") na barra lateral.
- As telas sem quadro antes (rua, visualizador de PDF, erros) seguem o canvas atual.

- **Número de processo repetido** na prefeitura: o índice único vale para a prefeitura inteira e o aviso pode revelar que o número existe em outra secretaria. Aceito: o número do processo é público por natureza.
- **PDF de documento desativado** continua acessível a quem lê (desativar não apaga). Aceito para a Fase 3.
- **Tela 403** do canvas não é usada de propósito: documento de outra secretaria pedido por endereço responde 404, para não revelar que existe.
- **Conferência do PDF** só é concluída pelo servidor (`service_role`); envios parados há mais de 1 hora são limpos no próximo envio da pessoa.

## Resultado

Entregue no PR 31: tabelas `documentos` e `arquivos` com RLS e auditoria, pesquisa
(`pesquisar_documentos`), ocupação e "próxima caixa livre", buckets `acervo` e
`miniaturas`, cadastro, edição, conferência, desativação e visualizador (pdf.js, decisão 0007).

Desvios do plano:

- Conferência: funções `public.marcar_conferindo` e `public.concluir_conferencia` (não `app.*`).
- Caminho no bucket sem o prefixo `acervo/`.
- Envio **sem retomada (TUS)**: se a internet cair, recomeça do zero. Fica para uma tarefa própria.
- Pendentes: tela 403 ligada às rotas, busca na lista de ruas, "Salvar e imprimir etiqueta".
- Desempenho: `supabase/tests/documentos_desempenho.test.sql` (100 mil documentos, < 1 s) roda no CI.

## Pendências fechadas em 2026-11-15

O responsável autorizou o que ficou de fora de propósito:

| Item | Estado |
| --- | --- |
| Credor pessoa física (CPF) | **Feito.** Campo "CNPJ ou CPF do credor" com dígito verificador; o CPF vai para a coluna `cpf_credor` (migração `20261124120000_credor_cpf.sql`), sai da auditoria e não entra na busca. Teste pgTAP em `temporalidade.test.sql` e Vitest |
| Limpeza automática de PDF abandonado | **Feito.** Rotina diária `/api/limpeza/envios` (Vercel Cron, `vercel.json`) que chama `public.limpar_envios_todos()`. **Falta:** criar `CRON_SECRET` nas variáveis da Vercel (Production); sem ele a rotina fica desligada |
| Digitalização em lote (vários PDFs de uma vez) | **Feito.** Tela `/documentos/lote` (botão "Enviar vários PDFs" no cadastro): escolhe até 50 PDFs, o sistema sugere o documento pelo número e ano no nome do arquivo (`src/features/documentos/lote.ts`), a pessoa confere cada linha e envia; cada PDF passa pelo mesmo caminho do cadastro (link assinado e conferência no servidor). Sem quadro no canvas: a tela usa os componentes e tokens existentes, a confirmar com o responsável |
| OCR e busca dentro do PDF | **Feito, sem serviço externo** (decisão 0011): `tesseract.js` roda no navegador de quem envia (opção "Ler o texto dos PDFs" no envio em lote), até 40 páginas por PDF. O texto vai para `arquivo_textos` (RLS, pgTAP `texto_pdf.test.sql`) e a Pesquisa acha o documento pelo texto (4 letras ou mais). **Não feito:** aviso de página ruim (em branco, escura, torta) e OCR no formulário de um documento só (sem quadro) |
