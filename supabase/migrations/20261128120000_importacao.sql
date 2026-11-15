-- Fase 9 · 9.1 · Base da importação (planilha hoje, TCE-CE depois).
-- Plano: docs/fases/fase-9.md. Teste: supabase/tests/importacao.test.sql.
--
-- Documento que entra sem endereço fica "pendente de localização": caixa_id
-- nulo. Só quem veio de planilha ou do TCE pode ficar sem caixa; o cadastro
-- manual continua exigindo caixa. Só adiciona e afrouxa: o app que está no ar
-- continua funcionando (documento manual segue com caixa).

-- ---------------------------------------------------------------------------
-- documentos: origem, lote e id no TCE
-- ---------------------------------------------------------------------------
alter table public.documentos
  add column origem text not null default 'manual'
    check (origem in ('manual', 'planilha', 'tce')),
  add column lote_id uuid,
  add column tce_id text check (tce_id is null or length(tce_id) between 1 and 80),
  add column importado_em timestamptz;

alter table public.documentos alter column caixa_id drop not null;
alter table public.documentos
  add constraint documentos_caixa_por_origem check (caixa_id is not null or origem <> 'manual');

create unique index documentos_tce_unico on public.documentos (prefeitura_id, tce_id) where tce_id is not null;
create index documentos_pendentes_idx on public.documentos (prefeitura_id, criado_em desc)
  where caixa_id is null and ativo;
create index documentos_lote_idx on public.documentos (lote_id) where lote_id is not null;

-- Sem caixa não há o que conferir na hierarquia física.
create or replace function app.documento_confere()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ativa boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;
  if new.prefeitura_id is distinct from app.prefeitura_atual() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if new.caixa_id is not null
     and (tg_op = 'INSERT' or new.caixa_id is distinct from old.caixa_id
          or (new.ativo and not old.ativo)) then
    select c.ativo and n.ativo and m.ativo and r.ativo and g.ativo
      into v_ativa
    from public.caixas c
    join public.niveis n on n.id = c.nivel_id
    join public.modulos m on m.id = n.modulo_id
    join public.ruas r on r.id = m.rua_id
    join public.galpoes g on g.id = r.galpao_id
    where c.id = new.caixa_id and c.prefeitura_id = new.prefeitura_id;
    if v_ativa is null then
      raise exception 'sem permissão' using errcode = '42501';
    end if;
    if not v_ativa then
      raise exception 'caixa desativada' using errcode = 'LC004';
    end if;
  end if;
  return new;
end
$$;

-- Documento que já tem caixa não volta a ficar sem ela por UPDATE.
create or replace function app.documento_nao_perde_caixa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.caixa_id is not null and new.caixa_id is null then
    raise exception 'documento não pode ficar sem caixa' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke execute on function app.documento_nao_perde_caixa() from public, anon, authenticated;
create trigger documentos_nao_perde_caixa before update of caixa_id on public.documentos
  for each row execute function app.documento_nao_perde_caixa();

-- ---------------------------------------------------------------------------
-- prefeituras: campos do TCE (usados nas tarefas 9.8 a 9.10)
-- ---------------------------------------------------------------------------
alter table public.prefeituras
  add column tce_ativo boolean not null default false,
  add column tce_codigo_municipio text check (tce_codigo_municipio is null or tce_codigo_municipio ~ '^[0-9]{1,10}$');

-- ---------------------------------------------------------------------------
-- lotes_importacao
-- ---------------------------------------------------------------------------
create table public.lotes_importacao (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  origem text not null default 'planilha' check (origem in ('planilha')),
  nome_arquivo text not null check (length(trim(nome_arquivo)) between 1 and 200),
  linhas_total int not null check (linhas_total between 1 and 5000),
  gravados int not null default 0 check (gravados >= 0),
  pulados int not null default 0 check (pulados >= 0),
  situacao text not null default 'aberto' check (situacao in ('aberto', 'gravado', 'desfeito')),
  criado_por uuid not null default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now(),
  desfeito_em timestamptz,
  unique (id, prefeitura_id),
  check ((situacao = 'desfeito') = (desfeito_em is not null))
);
create index lotes_importacao_prefeitura_idx on public.lotes_importacao (prefeitura_id, criado_em desc);

alter table public.documentos
  add constraint documentos_lote_fk foreign key (lote_id, prefeitura_id)
  references public.lotes_importacao (id, prefeitura_id);

alter table public.lotes_importacao enable row level security;
-- Só leitura pela Data API, só administrador. Sem INSERT, UPDATE, DELETE e sem anon.
grant select on public.lotes_importacao to authenticated;
revoke all on public.lotes_importacao from anon, service_role;

create policy lotes_importacao_le on public.lotes_importacao for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

-- ---------------------------------------------------------------------------
-- Funções: criar, gravar e desfazer um lote (só administrador)
-- ---------------------------------------------------------------------------
create or replace function public.criar_lote_importacao(p_nome_arquivo text, p_total int)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not app.eh_admin() or app.prefeitura_atual() is null then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  insert into public.lotes_importacao (prefeitura_id, nome_arquivo, linhas_total)
  values (app.prefeitura_atual(), trim(p_nome_arquivo), p_total)
  returning id into v_id;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
  values (app.prefeitura_atual(), auth.uid(), 'importacao.criar', 'lotes_importacao', v_id::text,
          jsonb_build_object('linhas_total', p_total));
  return v_id;
end
$$;

-- Grava as linhas já validadas pelo servidor. Linha repetida (mesmo processo
-- ativo) é pulada, nunca sobrescrita. Devolve só contagens.
create or replace function public.gravar_lote_importacao(p_lote uuid, p_linhas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lotes_importacao;
  v_linha jsonb;
  v_gravados int := 0;
  v_pulados int := 0;
  v_id uuid;
begin
  select * into l from public.lotes_importacao x
  where x.id = p_lote and x.prefeitura_id = app.prefeitura_atual() for update;
  if not found or not app.eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if l.situacao <> 'aberto' then
    raise exception 'lote já gravado' using errcode = '23514';
  end if;
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) > l.linhas_total then
    raise exception 'linhas inválidas' using errcode = '23514';
  end if;

  for v_linha in select * from jsonb_array_elements(p_linhas) loop
    if not exists (select 1 from public.secretarias s
                   where s.id = (v_linha ->> 'secretaria_id')::uuid
                     and s.prefeitura_id = l.prefeitura_id and s.ativa) then
      raise exception 'secretaria inválida' using errcode = '42501';
    end if;
    insert into public.documentos (prefeitura_id, secretaria_id, tipo, modalidade, numero, ano, objeto,
                                   empresa, cnpj, cpf_credor, valor, situacao, vigencia_inicio, vigencia_fim,
                                   origem, lote_id, importado_em)
    values (l.prefeitura_id, (v_linha ->> 'secretaria_id')::uuid, v_linha ->> 'tipo', v_linha ->> 'modalidade',
            v_linha ->> 'numero', (v_linha ->> 'ano')::smallint, v_linha ->> 'objeto',
            v_linha ->> 'empresa', v_linha ->> 'cnpj', v_linha ->> 'cpf_credor', (v_linha ->> 'valor')::numeric,
            v_linha ->> 'situacao', (v_linha ->> 'vigencia_inicio')::date, (v_linha ->> 'vigencia_fim')::date,
            'planilha', l.id, now())
    on conflict (prefeitura_id, tipo, coalesce(modalidade, ''), numero, ano) where ativo do nothing
    returning id into v_id;
    if v_id is null then v_pulados := v_pulados + 1; else v_gravados := v_gravados + 1; end if;
    v_id := null;
  end loop;

  update public.lotes_importacao set gravados = v_gravados, pulados = v_pulados, situacao = 'gravado'
  where id = l.id;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
  values (l.prefeitura_id, auth.uid(), 'importacao.gravar', 'lotes_importacao', l.id::text,
          jsonb_build_object('gravados', v_gravados, 'pulados', v_pulados));
  return jsonb_build_object('gravados', v_gravados, 'pulados', v_pulados);
end
$$;

-- Desfazer: desativa (nada se apaga) o que ainda está sem endereço e sem
-- empréstimo. Documento que já foi localizado fica onde está.
create or replace function public.desfazer_lote_importacao(p_lote uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.lotes_importacao;
  v_n int;
begin
  select * into l from public.lotes_importacao x
  where x.id = p_lote and x.prefeitura_id = app.prefeitura_atual() for update;
  if not found or not app.eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if l.situacao <> 'gravado' then
    raise exception 'lote não pode ser desfeito' using errcode = '23514';
  end if;
  update public.documentos d set ativo = false
  where d.lote_id = l.id and d.ativo and d.caixa_id is null
    and not exists (select 1 from public.emprestimos e where e.documento_id = d.id and e.devolvido_em is null);
  get diagnostics v_n = row_count;
  update public.lotes_importacao set situacao = 'desfeito', desfeito_em = now() where id = l.id;
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, depois)
  values (l.prefeitura_id, auth.uid(), 'importacao.desfazer', 'lotes_importacao', l.id::text,
          jsonb_build_object('desativados', v_n));
  return v_n;
end
$$;

revoke execute on function public.criar_lote_importacao(text, int) from public, anon;
revoke execute on function public.gravar_lote_importacao(uuid, jsonb) from public, anon;
revoke execute on function public.desfazer_lote_importacao(uuid) from public, anon;
grant execute on function public.criar_lote_importacao(text, int) to authenticated;
grant execute on function public.gravar_lote_importacao(uuid, jsonb) to authenticated;
grant execute on function public.desfazer_lote_importacao(uuid) to authenticated;
