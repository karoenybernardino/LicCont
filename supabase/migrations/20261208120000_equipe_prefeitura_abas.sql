-- Fase 9 · tarefa 9.18: a equipe grava o código do município e liga o TCE-CE ao
-- criar ou editar a prefeitura. As políticas de INSERT/UPDATE de prefeituras já
-- são só da equipe com 2º fator; aqui só entra o GRANT das duas colunas.
grant insert (tce_ativo, tce_codigo_municipio), update (tce_ativo, tce_codigo_municipio)
  on public.prefeituras to authenticated;
