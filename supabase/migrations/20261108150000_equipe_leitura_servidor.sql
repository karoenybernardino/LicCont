-- Fase 1 · Login (tarefa 4): o servidor (service_role) confere se quem entrou
-- por /equipe/entrar é da equipe LicCONT. Só leitura: incluir alguém na
-- equipe continua só por SQL do responsável. Teste: supabase/tests/login_servidor.test.sql.
grant select on public.equipe_liccont to service_role;
