# Backup e ensaio de restauração (alternativa gratuita)

Sem plano pago (decisão do responsável). O plano gratuito do Supabase não tem
backup diário com restauração a pedido, então o procedimento usa `pg_dump`
para um **segundo projeto gratuito**, só com dados fictícios no ensaio.

## Procedimento (por quem tem o acesso ao banco)

1. Gerar o dump do projeto de origem (nunca no computador de uso comum; apagar o arquivo depois):
   `pg_dump "$DB_URL_ORIGEM" --schema=public --no-owner --no-privileges -Fc -f liccont.dump`
2. Os PDFs ficam no Storage (bucket `acervo`): copiar com a exportação do sistema (`/configuracoes/exportar`) ou com a CLI do Supabase.
3. Criar um projeto Supabase gratuito separado, aplicar as migrações (`supabase db push`) e restaurar:
   `pg_restore --no-owner --data-only -d "$DB_URL_DESTINO" liccont.dump`
4. Conferir: contagem de linhas por tabela igual à origem; login de um usuário fictício; pesquisa de um documento; abrir um PDF.
5. Medir o tempo total e anotar abaixo.

## Ensaio

| Data | Quem | Tempo total | Contagens conferem | Observações |
| --- | --- | --- | --- | --- |
| a fazer | responsável | — | — | Executar antes do piloto, com dados fictícios. **Não foi executado nesta entrega.** |

## Limites conhecidos

- Backup é manual: definir frequência (proposta: semanal e antes de cada migração grande).
- Com dado real, o dump é dado pessoal: guardar cifrado e apagar o arquivo local.
- Quando houver receita, o plano Pro do Supabase (backup diário) substitui este procedimento; custo só com aprovação.
