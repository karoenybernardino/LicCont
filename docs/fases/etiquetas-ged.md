# Fase: Etiquetas, classificação documental e GED — plano

Instrução completa: `docs/LicCONT_instrucao_etiquetas_GED.md`. Substitui `docs/fases/etiquetas.md`
(que cobria só as peças impressas e as parceiras). Quadros lidos: `EtqPapelCaixa`, `EtqPapelConteudo`,
`EtqPapelDocumento`, `EtiquetasClaro/Escuro`, `EquipeParceirasClaro/Escuro`, `Temporalidade*`,
`TemporalidadeRegra*`, `TemporalidadeRegraPermanente*`.

Situação: **implementada na branch `feat/etiquetas-ged`** (uma branch só, uma migração: `20261215120000_etiquetas_ged.sql`). Ver "Resultado" no fim.

## 1. Já existe / muda / é novo

Legenda: **E** já existe (reaproveitar) · **M** existe e muda · **N** é novo.

### Tabela de temporalidade e classificação (seção 2)

| # | Item | Situação | O que há hoje e o que fazer |
|---|------|----------|-----------------------------|
| 1 | Tabela de classes por órgão (código, classe, grupo, tipologias, prazo, destinação) | M | Hoje existe `tabela_temporalidade` com 3 classes fixas (`licitacao`, `dispensa_inexigibilidade`, `contrato`) e prazo em anos (corrente + intermediária). Trocar por `classes_documentais` (código livre, classe, grupo, prazo, destinação, ativo). Como não há dado real, a tabela antiga sai. Os campos "fase corrente" e "intermediária" do quadro continuam; o prazo total é a soma. |
| 2 | Prazo "N anos após evento" e "aguardando evento" | M | Hoje o evento é fixo: `encerrado_em` (licitação) ou `vigencia_fim` (contrato), e `motivo_inelegivel` já devolve `sem_data`. Passa a ter `tipo_prazo` (fixo / após evento / permanente) e `evento` (texto) na classe e `evento_em` (data) no documento. Fixo conta da data de produção do documento. |
| 3 | Prefeitura e Câmara como órgãos separados | N | Cada órgão já é uma linha de `prefeituras` com isolamento próprio. Falta só `prefeituras.tipo` (`prefeitura` ou `camara`) e os textos da interface. |
| 4 | Botão "Baixar modelo" (.xlsx) | N | Gerar o .xlsx com `fflate` (já instalado), sem dependência nova. |
| 5 | Enviar tabela em .xlsx ou .csv | M | Reaproveitar a leitura de planilha da importação (`read-excel-file`, `importacao/planilha.ts`). |
| 6 | Enviar tabela em PDF (texto e escaneado) | N | Usar o pdf.js e o tesseract.js que já rodam no navegador. Ver seção 2. |
| 7 | Prévia com erros destacados e correção na própria prévia | N | Mesmo visual da prévia da importação. Linhas de leitura duvidosa vêm marcadas. |
| 8 | Cadastro à mão (incluir, editar, excluir) | M | `dialogo-regra.tsx` hoje só edita as 3 regras fixas. Passa a incluir, editar e excluir, com código, grupo e tipo de prazo. |
| 9 | Reenvio pergunta "substituir ou acrescentar" | N | |
| 10 | Classe com vínculo não se exclui, só se desativa | N | Chave estrangeira mais coluna `ativa`. |
| 11 | Escolher a classe preenche código, prazo e destinação na caixa e no documento | N | Hoje a caixa não tem classe e o documento só tem `tipo`. |

### Tipologias, grupos e permissões (seção 3)

| # | Item | Situação | O que há hoje e o que fazer |
|---|------|----------|-----------------------------|
| 12 | 7 grupos documentais | N | Lista fixa no banco (check), não editável. |
| 13 | Tipologias por órgão, com lista padrão dos 7 grupos | N | Tabela `tipologias`, carregada com a lista padrão quando o órgão é criado. |
| 14 | Tipologia opcional, sem ela nada aparece | N | |
| 15 | Documento de qualquer grupo (não só licitação e contrato) | M | Hoje `documentos.tipo` aceita só `licitacao` e `contrato`, com modalidade e situação obrigatórias. Proposta: novo tipo `geral` com título livre; modalidade e situação continuam só para licitação e contrato. |
| 16 | Permissão por grupo (RH e jurídico restritos por padrão) | N | Hoje o acesso é por secretaria (`app.secretarias_permitidas()`). Nova tabela de acesso por grupo e perfil, e `app.grupos_permitidos()` nas políticas de `documentos`, `arquivos`, `arquivo_textos`, empréstimos e descarte, e nas funções `security definer` (busca, painel, relatórios, exportação, etiquetas). Padrão: RH e jurídico só o administrador. |

### Empresas parceiras e logos (seção 4)

| # | Item | Situação | O que há hoje e o que fazer |
|---|------|----------|-----------------------------|
| 17 | Cadastro de empresa parceira (nome, CNPJ, logo PNG/SVG até 1 MB) | N | Tela da Equipe pelo quadro `EquipeParceiras`. Tabela com RLS e GRANT só para a equipe, bucket de logos restrito. O SVG vira PNG no navegador no envio, porque o pdf-lib não desenha SVG. |
| 18 | Uma empresa por órgão; uma empresa atende vários órgãos | N | `prefeituras.parceira_id`. |
| 19 | Logo do órgão "vindo do cadastro, como já é hoje" | **N** | **Não existe logo do órgão hoje**, nem coluna nem bucket. Precisa de campo e envio no cadastro do órgão, e não há quadro para isso. Sem logo, sai o nome do órgão em texto. |
| 20 | Logo do LicCONT fixo no rodapé | E | A marca já existe na interface. Falta desenhá-la no PDF. |

### Etiquetas e folha de conteúdo (seção 5)

| # | Item | Situação | O que há hoje e o que fazer |
|---|------|----------|-----------------------------|
| 21 | Etiqueta da caixa em PDF, A4 deitada, 2 por folha | M | Hoje `/etiquetas` imprime pelo navegador (`window.print`), em tamanhos 5×3 e 10×7, só com QR e código. Passa a ser um PDF gerado no servidor com pdf-lib, como o termo de eliminação. |
| 22 | Título GRUPO – ANO e selo VOL. x/y | N | Novos campos na caixa: classe, ano, volume e total de volumes. |
| 23 | "CX - 0001" | N | `caixas.numero` é a posição no nível (1 a 200), não um número do órgão. Novo `caixas.codigo` sequencial por órgão. |
| 24 | Localização "Rua B · Módulo 2 · Nível 4" | E | Os dados existem (`codigoPosicao`). Só muda o formato do texto. |
| 25 | QR da caixa com código aleatório | M | `etiquetas.codigo` aleatório existe, mas **o QR de hoje leva o id do banco** (`/mapa?caixa=<uuid>`), contra a regra da Fase 2. Corrigir para uma rota `/q/<codigo>` que exige login e respeita a permissão. |
| 26 | QR do documento | N | Código aleatório por documento. |
| 27 | Folha de conteúdo paginada, cabeçalho repetido, "Folha X de Y" | N | |
| 28 | Etiqueta do documento, 4 por folha, Data e Observação | N | Faltam `documentos.data_producao` (a "Data", que também é metadado do Decreto) e `documentos.observacao`. |
| 29 | PDF único em lote | N | Uma rota GET que gera o PDF a partir das caixas e documentos escolhidos. |
| 30 | Tela com caixas de seleção, filtros, vários tipos ao mesmo tempo, lista de documentos, "Baixar etiquetas (N)" e "nunca impressas" | M | **Diverge do quadro**: o `EtiquetasClaro/Escuro` tem rádio (um tipo por vez), só lista de caixas com busca, sem filtros, e botões "Baixar PDF" e "Imprimir N etiquetas". |
| 31 | Atalho "Baixar etiqueta" na caixa e no documento | N | Botão que não está nos quadros da caixa e do documento. |
| 32 | Registrar quem imprimiu e quando | M | `etiquetas.impressa_em` existe só para a caixa. Passa a ter um registro de impressões (caixa e documento) com usuário e data, que entra na auditoria. |
| 33 | Lista mostra se já foi impressa e quando | M | Hoje só para a caixa. |

### Digitalização (seção 6)

| # | Item | Situação | O que há hoje e o que fazer |
|---|------|----------|-----------------------------|
| 34 | Metadados do Decreto 10.278/2020, Anexo II | M | Já existem: `sha256`, responsável (`enviado_por`), data (`enviado_em`), identificador (`arquivos.id`). Novos em `arquivos`: título, assunto, autor, local da digitalização e gênero. Classe, prazo, destinação e data de produção vêm do documento e da classe. |
| 35 | Checagem de qualidade no envio (abre, PDF/A, 300 dpi), só aviso | E | Já existe: recusa `nao_pdf`, `com_senha` e `corrompido`; avisa `resolucao_baixa` (< 300 dpi) e `sem_pdfa`. |
| 36 | Busca pelo conteúdo do PDF | M | Já existe: OCR no navegador (tesseract.js, até 40 páginas), `arquivo_textos` com índice trigram e busca em `pesquisar_documentos`. Muda: ler primeiro a camada de texto e fazer OCR só nas páginas sem texto, com fila em segundo plano. Ver seção 2. |
| 37 | Selo "apenas consulta" ou "com valor legal" | N | Coluna em `arquivos`, padrão "apenas consulta". |
| 38 | Estrutura da assinatura ICP-Brasil, desligada | N | Colunas de assinatura, certificado e data, sem tela para preencher. |
| 39 | Eliminação do papel bloqueada sem ICP-Brasil e sem listagem | N | Depende da pergunta 4. |

### Importação, dados de exemplo e testes

| # | Item | Situação | O que há hoje e o que fazer |
|---|------|----------|-----------------------------|
| 40 | Importação com classe ou código, tipologia e volume | M | Novos campos em `importacao/colunas.ts` e em `gravar_lote_importacao`, ligados às classes do órgão. A classe é procurada pelo código ou pelo nome. |
| 41 | Dados de exemplo | M | `seed.sql`: classes, tipologias, uma parceira, uma Câmara e caixas com mais de 4 itens e com volumes. |
| 42 | Modo demonstração | M | `src/features/demo/` com os mesmos dados; ações que gravam devolvem `AVISO_DEMO`. |
| 43 | Testes | M | pgTAP de isolamento para cada tabela nova, Vitest para as regras (prazo, leitura da tabela e paginação) e todos os testes atuais. O pgTAP só roda no CI (não há Docker na máquina). |

## 2. Leitura de PDF dentro do plano gratuito

Tudo roda **no navegador de quem envia**, como o OCR já roda hoje. Não entra serviço novo, não há custo,
e o PDF não sai da máquina para ser lido.

Por que não no servidor: a Vercel gratuita tem tempo e memória curtos por função e o OCR passaria
do limite. As Edge Functions do Supabase têm limite de CPU de poucos segundos. Um serviço de OCR
pago, ou o Google Vision, exigiria cadastro de suboperador e teria custo.

**Busca pelo conteúdo (documentos):**
1. No envio, o pdf.js lê a camada de texto de cada página. É rápido.
2. Só a página sem texto (escaneada) passa pelo tesseract.js. O limite de páginas de OCR continua o de hoje (40).
3. O texto é lido depois do envio, sem travar a tela. O arquivo ganha a situação do texto
   (`pendente`, `lendo`, `pronto`, `falhou`). Se a pessoa fechar a aba no meio, o texto fica
   pendente e é retomado na próxima vez que alguém da secretaria abrir o documento ou a tela de envio.
4. O texto é salvo em `arquivo_textos`. A busca continua com o índice trigram que já existe
   (`busca_pdf_indice`), que aceita parte de palavra e erro de OCR melhor que o full-text puro.

**Tabela de temporalidade em PDF:**
1. O pdf.js devolve cada trecho de texto com a posição. O tesseract.js devolve cada palavra com a
   posição e a confiança.
2. O sistema agrupa as palavras em linhas pela altura e em colunas pelos espaços em branco
   repetidos. Assim remonta a tabela.
3. Cada linha é interpretada por regras: código no começo da linha, prazos ("5 anos", "permanente",
   "até a aprovação das contas", "N anos após ..."), destinação ("eliminação", "guarda permanente").
   Texto que continua na linha de baixo é juntado à linha de cima.
4. Fica marcada como **duvidosa** a linha sem código, sem prazo legível, com destinação não
   reconhecida ou com confiança do OCR abaixo de 80%. A prévia é obrigatória.
5. Limites: até 60 páginas. Tabelas com células mescladas ou muito irregulares podem sair
   desalinhadas; nesse caso a prévia mostra e a pessoa corrige, ou usa o modelo .xlsx.

Dependência nova: só `@pdf-lib/fontkit`, para embutir Sora, IBM Plex Sans e JetBrains Mono no PDF
das etiquetas e ficar igual ao canvas. Hoje os PDFs usam Helvetica. É uma biblioteca, não um serviço.
As fontes têm licença OFL.

## 3. Ordem de execução (uma branch, `feat/etiquetas-ged`)

1. Banco: grupos, tipologias, classes, tipo de órgão, campos da caixa e do documento, parceiras,
   logos, impressões, metadados, selo e ICP, permissão por grupo, e as funções de descarte e busca
   ajustadas. pgTAP para cada tabela nova.
2. Temporalidade: cadastro à mão, modelo .xlsx, envio de .xlsx, .csv e PDF, prévia e regras de prazo.
3. Cadastro da caixa e do documento com classe, tipologia, volume, data, observação e evento.
4. Parceiras (Equipe) e logo do órgão.
5. PDFs: etiqueta da caixa, folha de conteúdo, etiqueta do documento e lote.
6. Tela de etiquetas, rota do QR e atalhos.
7. Digitalização: metadados, selo, ICP desligado, fila de texto e camada de texto antes do OCR.
8. Importação, dados de exemplo e demonstração.
9. Testes completos, `telas:comparar`, revisão de código e de segurança por outro agente, e PR.

Atenção: a migração vai para produção pelo CI ao entrar no `main` (decisão 0005). Ela apaga
`tabela_temporalidade` e muda checks de `documentos`. Sem dado real isso é seguro, mas a versão
anterior do app quebra entre a migração e o novo deploy. Fazer `db dump` antes, como manda a regra.

## 4. Decisões tomadas pelo responsável

1. Tela de etiquetas e cadastro de tabela/logo no cadastro do órgão: quadros novos (`EtiquetasEscuro/Claro`, `EquipePrefeituraLogo*`, `EquipeParceiras*`).
2. Todo documento pertence a um grupo. Grupos e tipologias se cadastram em **Configurações › Grupos documentais** (botão próprio).
3. Eliminação: só o documento **digitalizado** exige assinatura ICP-Brasil; o que não tem PDF pode ser eliminado pelo termo (é só organização do arquivo).
4. Prazo fixo conta da **data em que o documento foi feito** (`documentos.data_producao`).

## 5. Resultado

**Feito:** migração (grupos, tipologias, classes, parceiras, marca do órgão, número da caixa, impressões, metadados do Decreto 10.278, selo e estrutura ICP desligada, permissão por grupo); tabela de temporalidade por planilha (.xlsx/.csv) e PDF (texto e OCR) com prévia obrigatória; cadastro à mão; grupos e tipologias em Configurações; classe, data, volume e observação no cadastro do documento; empresas parceiras e aba "Logo e temporalidade" na Equipe; PDFs da etiqueta da caixa, folha de conteúdo (paginada) e etiqueta do documento; tela de etiquetas; QR em `/q/<código>`; metadados e selo na página do documento; texto do PDF (camada de texto antes do OCR); importação com classe, tipologia, volume e data; seed e demonstração.

**Diferenças em relação ao pedido (para o responsável confirmar):**
- Os PDFs usam Helvetica e Courier, não as fontes da marca (Sora, IBM Plex, JetBrains Mono): não há arquivo de fonte no projeto e embutir exigiria baixar fontes e a dependência `@pdf-lib/fontkit`.
- Cada tipo sai no seu próprio PDF (como diz o quadro novo da tela). O servidor aceita vários tipos num PDF só.
- A prévia da tela é aproximada (HTML). Mostrar o PDF dentro da tela exigiria afrouxar `frame-ancestors` e `X-Frame-Options`, e não mexi na segurança do site sem aval.
- Classe e data do documento são obrigatórias no **formulário** (Zod). No **banco**, `classe_id` aceita vazio para não quebrar a importação do TCE e a planilha antiga; o grupo é sempre obrigatório. Documento sem classe cai em "sem regra" e não entra em eliminação.
- Leitura do texto do PDF: no navegador, a partir da página do documento ("Ler o texto agora") e na importação em lote; não há fila no servidor (o plano gratuito não comporta). PDF enviado pelo formulário de um documento só fica com texto "pendente" até alguém usar esse botão.
- O PDF baixado do Storage (`acervo`) não tem a trava por grupo; o acesso é pelo link assinado de quem passou pela página do documento (que respeita o grupo).
- Tela de cadastro das classes dentro do `/temporalidade` do órgão (administrador) segue o visual do quadro novo, mas o quadro de `/temporalidade` em si não foi redesenhado.

**Não verificado aqui:** pgTAP (só roda no CI, sem Docker local), Playwright e o `db push` da migração. Testes de unidade, `tsc`, ESLint e `next build` passam.
