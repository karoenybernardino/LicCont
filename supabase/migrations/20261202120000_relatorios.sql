-- Fase 9 · 9.15 · Registro dos relatórios baixados.
-- Teste: supabase/tests/relatorios.test.sql.
--
-- Cada relatório baixado (PDF ou planilha) deixa uma linha aqui e na auditoria,
-- só com o tipo, o formato, a contagem e os filtros (período e secretaria).
-- Nunca o conteúdo do relatório. Ninguém grava direto na tabela. Só adiciona
-- objetos: compatível com o app que está no ar.

create table public.relatorios_gerados (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  usuario_id uuid not null,
  relatorio text not null check (relatorio in ('inventario', 'sem_endereco', 'emprestimos_atraso', 'descartes', 'contratos_vigencia')),
  formato text not null check (formato in ('pdf', 'planilha')),
  linhas int not null check (linhas >= 0),
  periodo_de date,
  periodo_ate date,
  secretaria_id uuid,
  criado_em timestamptz not null default now(),
  unique (id, prefeitura_id),
  foreign key (secretaria_id, prefeitura_id) references public.secretarias (id, prefeitura_id)
);
create index relatorios_gerados_prefeitura_idx on public.relatorios_gerados (prefeitura_id, criado_em desc);

alter table public.relatorios_gerados enable row level security;
-- Só leitura pela Data API. Sem INSERT, UPDATE, DELETE e sem anon.
grant select on public.relatorios_gerados to authenticated;
revoke all on public.relatorios_gerados from anon, service_role;

-- Cada pessoa vê os próprios relatórios; o administrador vê os da prefeitura.
create policy relatorios_gerados_le on public.relatorios_gerados for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and (usuario_id = (select auth.uid()) or (select app.eh_admin())));

create function app.relatorio_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'relatório registrado não muda' using errcode = '42501';
end
$$;
revoke execute on function app.relatorio_imutavel() from public, anon, authenticated;
create trigger relatorio_imutavel before update or delete on public.relatorios_gerados
  for each row execute function app.relatorio_imutavel();

-- Quem exporta: administrador ou quem cadastra em ao menos uma secretaria
-- (consulta não exporta). Com secretaria informada, só a que a pessoa enxerga.
create or replace function public.registrar_relatorio(
  p_relatorio text, p_formato text, p_linhas int, p_de date, p_ate date, p_secretaria uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_pode boolean;
begin
  if app.prefeitura_atual() is null then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  v_pode := app.eh_admin() or exists (
    select 1 from public.vinculos v
    where v.usuario_id = auth.uid() and v.papel in ('operador', 'coordenador')
      and (p_secretaria is null or v.secretaria_id = p_secretaria));
  if not v_pode then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_secretaria is not null and not (p_secretaria in (select app.secretarias_permitidas())) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  insert into public.relatorios_gerados (prefeitura_id, usuario_id, relatorio, formato, linhas, periodo_de, periodo_ate, secretaria_id)
  values (app.prefeitura_atual(), auth.uid(), p_relatorio, p_formato, greatest(p_linhas, 0), p_de, p_ate, p_secretaria)
  returning id into v_id;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
  values (app.prefeitura_atual(), auth.uid(), 'relatorio.gerar', 'relatorios_gerados', v_id::text,
          jsonb_build_object('relatorio', p_relatorio, 'formato', p_formato, 'linhas', p_linhas));
  return v_id;
end
$$;

revoke execute on function public.registrar_relatorio(text, text, int, date, date, uuid) from public, anon;
grant execute on function public.registrar_relatorio(text, text, int, date, date, uuid) to authenticated;
