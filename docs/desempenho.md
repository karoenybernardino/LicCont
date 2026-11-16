# Desempenho: teste de carga

Plano: `docs/fases/teste-de-carga.md`. Scripts: `supabase/carga/carga.sql` (dados)
e `supabase/carga/medir.sql` (medições). Roda no GitHub Actions, workflow
**Carga** (`.github/workflows/carga.yml`), no Supabase local do runner. Nada toca
produção. Para repetir: Actions > Carga > Run workflow (campo "Textos de OCR por
prefeitura"; padrão 2500 = 10 mil no total).

## Como foi medido

- Data: **16/11/2026**. PostgreSQL 17.11 (imagem do Supabase CLI 3.0.0), runner
  do GitHub com 4 núcleos e 15 GB de RAM.
- Dados fictícios: 100 mil documentos em 4 prefeituras (25 mil cada; 8
  secretarias, 800 caixas, ~20 mil PDFs registrados por prefeitura; 70%
  licitações, 30% contratos, anos 2000 a 2025).
- Texto de OCR em `arquivo_textos`: 100 a 300 páginas por documento (média ~200
  páginas, ~224 mil caracteres; o teto da coluna é 300 mil caracteres). Rodadas
  com 1.000 textos (250 por prefeitura) e 10.000 textos (2.500 por prefeitura).
- Quem consulta: administrador da prefeitura 1 (enxerga as 8 secretarias), com RLS,
  chamando as mesmas funções que o app.
- Cada número: mediana de 3 medidas com `EXPLAIN ANALYZE` (planejamento +
  execução), depois de 1 rodada de aquecimento. Tempo só do banco: não inclui rede
  nem PostgREST.
- Metas: busca < 1 s, listagem < 500 ms, painel < 1 s. Contagem por secretaria
  comparada com a meta da listagem. Exportação sem meta (só registrada).

## Tamanho do banco

| | 1.000 textos de OCR | 10.000 textos de OCR |
|---|---|---|
| Banco inteiro | 605 MB | 1.910 MB |
| `documentos` (tabela + índices) | 93 MB | 93 MB |
| `arquivos` | 59 MB | 59 MB |
| `arquivo_textos` (tabela + TOAST + índices) | 143 MB | 1.449 MB |
| **Índice GIN de `arquivo_textos`** | **9,8 MB** | **107 MB** |
| Índice GIN `documentos_busca_idx` | 17 MB | 17 MB |
| `auditoria` | 295 MB | 294 MB |

O índice GIN de `arquivo_textos` era `arquivo_textos_busca_idx` (só trigramas). Com
a correção, passou a ser `arquivo_textos_busca_pref_idx` (prefeitura + trigramas),
com o mesmo tamanho. O texto do OCR é sintético: vocabulário de licitação com
fragmentos aleatórios no lugar do ruído de OCR. OCR real varia mais, então o GIN
real tende a ser maior que o daqui.

## Resultados (ms)

"Antes" é o banco do `main` em 16/11/2026. "Depois" é com a migração
`20261212120000_busca_pdf_indice.sql`. O "antes" de "habilitacao" foi medido na
primeira tentativa de correção, que não mudava o plano (mesmo Seq Scan do `main`).

| Grupo | Consulta | Meta | 1.000 textos, antes | 10.000 textos, antes | 10.000 textos, depois |
|---|---|---|---|---|---|
| Busca | `pesquisar_documentos`: "pavimentacao" (acha no objeto) | 1000 | 129 ✅ | 1337 ❌ | **23 ✅** |
| Busca | `pesquisar_documentos`: "hidrometro" (só no texto do PDF) | 1000 | 101 ✅ | 1113 ❌ | **85 ✅** |
| Busca | `pesquisar_documentos`: "xilografia" (não acha nada) | 1000 | 96 ✅ | 1141 ❌ | **13 ✅** |
| Busca | `pesquisar_documentos`: "habilitacao" (palavra que está em todos os PDFs) | 1000 | — | 664 ✅ | **660 ✅** |
| Busca | `documentos.texto_busca like` (direto) | 1000 | 11 ✅ | 15 ✅ | 12 ✅ |
| Busca | `arquivo_textos.texto_busca like` (direto, com RLS; o app não usa) | 1000 | 84 ✅ | 1083 ❌ | 865 ✅ |
| Busca | `app.documentos_com_texto` (nova, usada pela pesquisa) | 1000 | — | — | 63 ✅ |
| Listagem | `pesquisar_documentos`: 1ª página | 500 | 49 ✅ | 58 ✅ | 47 ✅ |
| Listagem | 2ª página (cursor) | 500 | 49 ✅ | 59 ✅ | 44 ✅ |
| Listagem | página perto do fim (cursor) | 500 | 40 ✅ | 50 ✅ | 35 ✅ |
| Listagem | filtro secretaria + anos | 500 | 6 ✅ | 7 ✅ | 6 ✅ |
| Painel | `painel_resumo` (todas as secretarias) | 1000 | 65 ✅ | 75 ✅ | 60 ✅ |
| Painel | `painel_resumo` (uma secretaria) | 1000 | 17 ✅ | 23 ✅ | 15 ✅ |
| Painel | `painel_caixas` | 1000 | 8 ✅ | 10 ✅ | 8 ✅ |
| Contagem | contagem por secretaria (as 8) | 500 | 10 ✅ | 13 ✅ | 10 ✅ |
| Exportação | `documentos`, 1ª página de 1000 (offset 0) | — | 3 | 3 | 3 |
| Exportação | `documentos`, última página (offset 24000) | — | 28 | 37 | 28 |
| Exportação | `documentos`, as 25 páginas somadas (1 rodada, sem mediana) | — | 633 | 817 | 602 |

## O que passou e o que não passou

- **Antes da correção:** listagem, painel e contagem passavam. A busca passava
  com 1.000 textos de OCR e **não passava com 10.000** (1,1 a 1,3 s), mesmo para
  termo que não está em PDF nenhum.
- **Depois da correção:** com 10.000 textos de OCR, **todas as consultas
  passaram**.

### Causa e correção

- Com RLS, o Postgres só usa uma condição no índice quando ela é *leakproof*, e o
  `LIKE` não é. Por isso o índice GIN de `arquivo_textos` nunca era usado (nem
  forçando com `enable_seqscan = off`; testado). A busca lia e descomprimia o texto
  de todos os PDFs da prefeitura, para cada pesquisa.
- Correção (migração `20261212120000_busca_pdf_indice.sql`):
  1. `app.documentos_com_texto(termo)`: busca uma vez só, como dona da tabela
     (`security definer`), com o mesmo filtro da política `arquivo_textos_le`
     (prefeitura de quem chama e secretarias permitidas), e devolve só os ids dos
     documentos. Os testes de isolamento estão em `supabase/tests/texto_pdf.test.sql`.
  2. `pesquisar_documentos` usa essa lista no lugar do `exists` por documento.
     A assinatura é a mesma.
  3. Índice GIN com a prefeitura na frente (`btree_gin`, extensão do próprio
     Postgres). Sem ele, uma palavra comum fazia reler o texto das 4 prefeituras
     (2,5 s, medido).

### Limite que continua

- Uma palavra que está em quase todos os PDFs ("habilitacao") ainda obriga a ler o
  texto de todos os PDFs da prefeitura que a contêm: 660 ms com 2.500 PDFs com OCR
  na prefeitura (~265 ms por 1.000). A conta indica que a meta de 1 s estoura perto
  de **3.800 PDFs com OCR numa mesma prefeitura**. Termos específicos (número,
  nome, palavra rara) ficam abaixo de 100 ms.
- Se uma prefeitura chegar perto disso, o caminho é busca por palavra inteira
  (`tsvector`), que não relê o texto. Hoje a busca é por trecho (`LIKE`).
- A busca em `documentos` também não usa o GIN (mesma razão: RLS), mas lê só as
  colunas curtas e fica em ~12 ms com 25 mil documentos por prefeitura.
- Exportação: a página com `offset` cresce com a posição (3 ms → 28 ms). As 25
  páginas de `documentos` somam < 1 s no banco. O tempo real da exportação depende
  sobretudo do download dos PDFs, que não foi medido aqui.

## Ressalvas

- Produção no plano gratuito do Supabase tem bem menos CPU e memória que o runner
  (CPU compartilhada, menos de 1 GB de RAM). Os números de lá tendem a ser
  piores, sobretudo os que leem TOAST.
- Medido com cache quente (dados em memória). A primeira consulta depois de
  reiniciar o banco é mais lenta.
- Sem concorrência: uma consulta por vez.
