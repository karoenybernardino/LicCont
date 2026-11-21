-- parceira_alocacoes só é lida por funções; o código do servidor não a usa.
-- Remove o privilégio que o padrão do Supabase dá ao service_role em tabela nova.
revoke all on public.parceira_alocacoes from anon, service_role;
