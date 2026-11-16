# Desempenho: teste de carga

Plano: `docs/fases/teste-de-carga.md`. Scripts: `supabase/carga/carga.sql` (dados)
e `supabase/carga/medir.sql` (medições). Roda no GitHub Actions, workflow
**Carga** (`.github/workflows/carga.yml`), no Supabase local do runner. Nada toca
produção. Para repetir: Actions > Carga > Run workflow (campo "Textos de OCR por
prefeitura").

## Como foi medido

- Data: **16/11/2026**. PostgreSQL 17.11 (imagem do Supabase CLI 3.0.0), runner
  do GitHub com 4 núcleos e 15 GB de RAM.
- Dados fictícios: 100 mil documentos em 4 prefeituras (25 mil cada; 8
  secretarias, 800 caixas, ~20 mil PDFs registrados por prefeitura; 70%
  licitações, 30% contratos, anos 2000 a 2025).
- Texto de OCR em `arquivo_textos`: 100 a 300 páginas por documento (média ~200
  páginas, ~224 mil caracteres; o teto da coluna é 300 mil caracteres). Duas
  rodadas: 1.000 textos (250 por prefeitura) e 10.000 textos (2.500 por prefeitura).
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
| Banco inteiro | 605 MB | 1.914 MB |
| `documentos` (tabela + índices) | 93 MB | 93 MB |
| `arquivos` | 59 MB | 59 MB |
| `arquivo_textos` (tabela + TOAST + índices) | 143 MB | 1.452 MB |
| **Índice GIN `arquivo_textos_busca_idx`** | **9,8 MB** | **108 MB** |
| Índice GIN `documentos_busca_idx` | 17 MB | 17 MB |
| `auditoria` | 295 MB | 295 MB |

O texto do OCR é sintético (vocabulário de licitação com fragmentos aleatórios no
lugar do ruído de OCR). OCR real tem mais variação, então o GIN real tende a ser
maior que o daqui.

## Resultados (ms)

| Grupo | Consulta | Meta | 1.000 textos | 10.000 textos |
|---|---|---|---|---|
| Busca | `pesquisar_documentos`: "pavimentacao" (acha no objeto) | 1000 | 129 ✅ | **1337 ❌** |
| Busca | `pesquisar_documentos`: "hidrometro" (só no texto do PDF) | 1000 | 101 ✅ | **1113 ❌** |
| Busca | `pesquisar_documentos`: "xilografia" (não acha nada) | 1000 | 96 ✅ | **1141 ❌** |
| Busca | `documentos.texto_busca like` (direto) | 1000 | 11 ✅ | 15 ✅ |
| Busca | `arquivo_textos.texto_busca like` (direto) | 1000 | 84 ✅ | **1083 ❌** |
| Listagem | `pesquisar_documentos`: 1ª página | 500 | 49 ✅ | 58 ✅ |
| Listagem | 2ª página (cursor) | 500 | 49 ✅ | 59 ✅ |
| Listagem | página perto do fim (cursor) | 500 | 40 ✅ | 50 ✅ |
| Listagem | filtro secretaria + anos | 500 | 6 ✅ | 7 ✅ |
| Painel | `painel_resumo` (todas as secretarias) | 1000 | 65 ✅ | 75 ✅ |
| Painel | `painel_resumo` (uma secretaria) | 1000 | 17 ✅ | 23 ✅ |
| Painel | `painel_caixas` | 1000 | 8 ✅ | 10 ✅ |
| Contagem | contagem por secretaria (as 8) | 500 | 10 ✅ | 13 ✅ |
| Exportação | `documentos`, 1ª página de 1000 (offset 0) | — | 3 | 3 |
| Exportação | `documentos`, última página (offset 24000) | — | 28 | 37 |
| Exportação | `documentos`, as 25 páginas somadas (1 rodada, sem mediana) | — | 633 | 817 |

## O que passou e o que não passou

- **Passaram nas duas rodadas:** listagem com cursor, painel (`painel_resumo` e
  `painel_caixas`), contagem por secretaria e busca direta em `documentos`.
- **Busca passou com 1.000 textos de OCR e não passou com 10.000.** As três
  buscas pela `pesquisar_documentos` e a busca direta em `arquivo_textos` ficam
  entre 1,08 s e 1,34 s.
- **Causa (do plano):** `arquivo_textos` é lida com *Seq Scan*; o índice GIN
  existe e não é usado. O planejador estima 1 linha e custo baixo porque a tabela
  principal é pequena (o texto fica no TOAST), mas a leitura descomprime o texto
  de **todos** os documentos com OCR do banco, de todas as prefeituras, e só
  depois filtra prefeitura e termo. O tempo cresce em linha reta com o total de
  textos de OCR: ~85 a 110 ms por 1.000 textos neste runner. Ou seja, a meta de 1 s
  estoura perto de 10 mil PDFs com OCR **somando todas as prefeituras**.
- A busca em `documentos` também ignora o GIN (lê as 25 mil linhas da prefeitura
  pelo índice de prefeitura), mas fica em ~15 ms e não preocupa nesse volume.
- Exportação: a página com `offset` cresce com a posição (3 ms → 37 ms). As 25
  páginas de `documentos` somam < 1 s no banco; o tempo real da exportação é
  dominado pelo download dos PDFs, não medido aqui.

## Próximo passo (fora deste PR)

Fazer a busca em `arquivo_textos` usar o índice GIN (ex.: consultar primeiro os
`documento_id` que batem no índice e só então juntar com `documentos`, ou índice
que comece por `prefeitura_id`) e repetir este teste com 10.000 textos.

## Ressalvas

- Produção no plano gratuito do Supabase tem bem menos CPU e memória que o runner
  (CPU compartilhada, menos de 1 GB de RAM); os números de lá tendem a ser piores,
  sobretudo os que leem TOAST.
- Medido com cache quente (dados em memória). Primeira consulta após reinício do
  banco é mais lenta.
- Sem concorrência: uma consulta por vez.
