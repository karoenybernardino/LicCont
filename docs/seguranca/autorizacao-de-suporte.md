# Autorização de suporte: o que ela libera hoje

**Hoje a autorização de suporte (`autorizacoes_suporte`) não libera nada.** Ela só
registra quando a prefeitura permitiu a ajuda da equipe, por 1 a 5 horas. A
equipe consulta apenas "valendo até" (`suporte_autorizado`). Nenhuma política de
RLS lê esta tabela para abrir dado de cliente, e a equipe não lê acervo nem
documento de prefeitura nenhuma.

## Regra para qualquer política futura

Se um dia uma política abrir dado por causa da autorização (hoje só com pedido
do responsável e depois do advogado, ver `docs/pendencias.md`), ela deve:

1. Checar sempre `fim > now() and revogada_em is null`, da autorização da
   própria prefeitura do dado.
2. Valer por tabela, nunca por esquema inteiro.
3. Vir com teste pgTAP que prove: autorização vencida não abre, autorização
   revogada não abre, autorização de outra prefeitura não abre.
4. Deixar rastro na auditoria de cada leitura.
