-- Fase 8 · tarefas 1, 2 e 6.
--   1. equipe_uso_prefeituras(): só números por prefeitura, nunca conteúdo.
--   2. autorizacoes_suporte: a prefeitura autoriza a equipe por até 5 horas.
--   6. aceites: política de privacidade e termo de uso, só inclusão.

-- ------------------------------------------------------------------ 1
create or replace function public.equipe_uso_prefeituras()
returns table (
  prefeitura_id uuid, secretarias integer, usuarios integer, documentos integer,
  caixas integer, bytes_pdf bigint, ultimo_acesso timestamptz, logins_mes integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
  select p.id,
    (select count(*)::int from public.secretarias s where s.prefeitura_id = p.id),
    (select count(*)::int from public.usuarios u where u.prefeitura_id = p.id and u.ativo),
    (select count(*)::int from public.documentos d where d.prefeitura_id = p.id and d.ativo),
    (select count(*)::int from public.caixas c where c.prefeitura_id = p.id),
    (select coalesce(sum(a.tamanho), 0)::bigint from public.arquivos a where a.prefeitura_id = p.id and a.ativo),
    (select max(x.criado_em) from public.auditoria x where x.prefeitura_id = p.id and x.acao = 'sessao.entrada'),
    (select count(*)::int from public.auditoria x
       where x.prefeitura_id = p.id and x.acao = 'sessao.entrada' and x.criado_em >= date_trunc('month', now()))
  from public.prefeituras p;
end $$;
revoke execute on function public.equipe_uso_prefeituras() from public, anon;
grant execute on function public.equipe_uso_prefeituras() to authenticated;

-- ------------------------------------------------------------------ 2
create table public.autorizacoes_suporte (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  autorizada_por uuid not null references auth.users (id),
  motivo text not null check (char_length(motivo) between 5 and 300),
  inicio timestamptz not null default now(),
  fim timestamptz not null,
  revogada_em timestamptz,
  check (fim > inicio and fim <= inicio + interval '5 hours')
);
create index autorizacoes_suporte_idx on public.autorizacoes_suporte (prefeitura_id, fim desc);
alter table public.autorizacoes_suporte enable row level security;
-- Administrador lê as da própria prefeitura; a equipe lê só pela função de contagem.
create policy autorizacoes_suporte_admin on public.autorizacoes_suporte
  for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
grant select on public.autorizacoes_suporte to authenticated;
revoke all on public.autorizacoes_suporte from anon, service_role;

-- Administrador da própria prefeitura autoriza, de 1 a 5 horas.
create or replace function public.autorizar_suporte(p_motivo text, p_horas integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not (select app.eh_admin()) or (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_horas is null or p_horas < 1 or p_horas > 5 then
    raise exception 'duração inválida' using errcode = '22023';
  end if;
  insert into public.autorizacoes_suporte (prefeitura_id, autorizada_por, motivo, fim)
  values ((select app.prefeitura_atual()), auth.uid(), p_motivo, now() + make_interval(hours => p_horas))
  returning id into v_id;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
  values ((select app.prefeitura_atual()), auth.uid(), 'suporte.autorizar', 'autorizacoes_suporte', v_id::text, jsonb_build_object('horas', p_horas));
  return v_id;
end $$;

create or replace function public.revogar_suporte(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select app.eh_admin()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.autorizacoes_suporte
     set revogada_em = now()
   where id = p_id and prefeitura_id = (select app.prefeitura_atual()) and revogada_em is null and fim > now();
  if not found then
    raise exception 'autorização não encontrada' using errcode = 'P0002';
  end if;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id)
  values ((select app.prefeitura_atual()), auth.uid(), 'suporte.revogar', 'autorizacoes_suporte', p_id::text);
end $$;

-- A equipe só descobre se há autorização valendo agora (sim/não e quando acaba).
create or replace function public.suporte_autorizado(p_prefeitura uuid)
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return (select max(fim) from public.autorizacoes_suporte
           where prefeitura_id = p_prefeitura and revogada_em is null and fim > now());
end $$;

revoke execute on function public.autorizar_suporte(text, integer), public.revogar_suporte(uuid),
  public.suporte_autorizado(uuid) from public, anon;
grant execute on function public.autorizar_suporte(text, integer), public.revogar_suporte(uuid),
  public.suporte_autorizado(uuid) to authenticated;

-- ------------------------------------------------------------------ 6
create table public.aceites (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id),
  prefeitura_id uuid not null,
  documento text not null check (documento in ('privacidade', 'termos')),
  versao text not null check (char_length(versao) between 1 and 40),
  aceito_em timestamptz not null default now(),
  unique (usuario_id, documento, versao)
);
alter table public.aceites enable row level security;
create policy aceites_proprio on public.aceites
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy aceites_admin on public.aceites
  for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
grant select on public.aceites to authenticated;
revoke all on public.aceites from anon, service_role;

-- Só a função grava, só para a própria pessoa, só nas versões em vigor.
create or replace function public.registrar_aceite(p_versao text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_pref uuid;
begin
  v_pref := (select app.prefeitura_atual());
  if auth.uid() is null or v_pref is null or not (select app.sessao_valida()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  insert into public.aceites (usuario_id, prefeitura_id, documento, versao)
  select auth.uid(), v_pref, d, p_versao from unnest(array['privacidade', 'termos']) d
  on conflict (usuario_id, documento, versao) do nothing;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, depois)
  values (v_pref, auth.uid(), 'aceite.registrar', 'aceites', jsonb_build_object('versao', p_versao));
end $$;
revoke execute on function public.registrar_aceite(text) from public, anon;
grant execute on function public.registrar_aceite(text) to authenticated;

-- ------------------------------------------------------------------ 3
-- Exportação de todos os dados (devolução ao fim do contrato): só o
-- administrador da própria prefeitura, e a auditoria guarda só contagens.
create or replace function public.registrar_exportacao(p_documentos integer, p_pdfs integer, p_pdfs_fora integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select app.eh_admin()) or (select app.eh_equipe()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, depois)
  values ((select app.prefeitura_atual()), auth.uid(), 'exportacao.dados', 'prefeituras',
          jsonb_build_object('documentos', p_documentos, 'pdfs', p_pdfs, 'pdfs_fora', p_pdfs_fora));
end $$;
revoke execute on function public.registrar_exportacao(integer, integer, integer) from public, anon;
grant execute on function public.registrar_exportacao(integer, integer, integer) to authenticated;
