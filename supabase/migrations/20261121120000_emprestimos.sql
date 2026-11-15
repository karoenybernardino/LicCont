-- Fase 6 · Empréstimos e devoluções.
-- Quem retira o documento e até quando. A situação "Emprestado" é derivada da
-- existência de empréstimo aberto (devolvido_em is null), não de coluna em
-- documentos. Ninguém grava direto na tabela: registrar e devolver passam
-- pelas funções abaixo, que conferem prefeitura, secretaria e papel.

create table public.emprestimos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  secretaria_id uuid not null,
  documento_id uuid not null,
  caixa_id uuid not null,
  retirado_por_nome text not null check (length(trim(retirado_por_nome)) between 1 and 120),
  retirado_por_setor text not null check (length(trim(retirado_por_setor)) between 1 and 120),
  retirado_em date not null,
  prazo_em date not null,
  observacao text check (observacao is null or length(observacao) <= 500),
  devolvido_em timestamptz,
  devolvido_por uuid references auth.users (id),
  criado_por uuid not null default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now(),
  check (prazo_em >= retirado_em and prazo_em <= retirado_em + 60),
  check ((devolvido_em is null) = (devolvido_por is null)),
  unique (id, prefeitura_id),
  foreign key (documento_id, prefeitura_id, secretaria_id) references public.documentos (id, prefeitura_id, secretaria_id),
  foreign key (caixa_id, prefeitura_id) references public.caixas (id, prefeitura_id)
);

-- Um empréstimo aberto por documento.
create unique index emprestimos_um_aberto on public.emprestimos (documento_id) where devolvido_em is null;
create index emprestimos_prefeitura_aberto on public.emprestimos (prefeitura_id, prazo_em) where devolvido_em is null;

alter table public.emprestimos enable row level security;

-- Só leitura pela Data API. Sem INSERT, UPDATE, DELETE e sem anon.
grant select on public.emprestimos to authenticated;
revoke all on public.emprestimos from anon, service_role;

create policy emprestimos_le on public.emprestimos for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()));

-- Auditoria sem nome, setor e observação de quem retirou (dado pessoal).
create or replace function app.auditar_emprestimo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - 'retirado_por_nome' - 'retirado_por_setor' - 'observacao' end;
  v_depois jsonb := to_jsonb(new) - 'retirado_por_nome' - 'retirado_por_setor' - 'observacao';
begin
  insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, antes, depois)
  values (new.prefeitura_id, auth.uid(),
          case when tg_op = 'INSERT' then 'emprestimos.retirada' else 'emprestimos.devolucao' end,
          'emprestimos', new.id::text, v_antes, v_depois);
  return null;
end
$$;
revoke execute on function app.auditar_emprestimo() from public, anon, authenticated;
create trigger auditar_emprestimos after insert or update on public.emprestimos
  for each row execute function app.auditar_emprestimo();

-- Devolução é só marcar a devolução: nada mais muda numa linha.
create or replace function app.emprestimo_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.devolvido_em is not null
     or (to_jsonb(new) - 'devolvido_em' - 'devolvido_por') <> (to_jsonb(old) - 'devolvido_em' - 'devolvido_por') then
    raise exception 'empréstimo não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke execute on function app.emprestimo_imutavel() from public, anon, authenticated;
create trigger emprestimo_imutavel before update on public.emprestimos
  for each row execute function app.emprestimo_imutavel();
create function app.emprestimo_sem_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'empréstimo não pode ser apagado' using errcode = '42501';
end
$$;
revoke execute on function app.emprestimo_sem_delete() from public, anon, authenticated;
create trigger emprestimo_sem_delete before delete on public.emprestimos
  for each row execute function app.emprestimo_sem_delete();

-- Documento emprestado não muda de caixa nem é desativado até a devolução.
create or replace function app.documento_emprestado_trava()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.caixa_id is distinct from old.caixa_id or (old.ativo and not new.ativo))
     and exists (select 1 from public.emprestimos e where e.documento_id = old.id and e.devolvido_em is null) then
    raise exception 'documento emprestado' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke execute on function app.documento_emprestado_trava() from public, anon, authenticated;
create trigger documento_emprestado_trava before update on public.documentos
  for each row execute function app.documento_emprestado_trava();

-- Registra a retirada. Quem pode: quem cadastra na secretaria do documento.
create or replace function public.registrar_emprestimo(
  p_documento uuid, p_nome text, p_setor text, p_retirada date, p_prazo date, p_observacao text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.documentos;
  v_id uuid;
begin
  select * into d from public.documentos x
  where x.id = p_documento and x.prefeitura_id = app.prefeitura_atual()
    and x.secretaria_id in (select app.secretarias_permitidas())
  for update;
  if not found or not app.pode_cadastrar(d.secretaria_id) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if not d.ativo then
    raise exception 'documento inativo' using errcode = '23514';
  end if;
  if p_retirada > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'retirada no futuro' using errcode = '23514';
  end if;
  insert into public.emprestimos (prefeitura_id, secretaria_id, documento_id, caixa_id,
                                  retirado_por_nome, retirado_por_setor, retirado_em, prazo_em, observacao)
  values (d.prefeitura_id, d.secretaria_id, d.id, d.caixa_id,
          trim(p_nome), trim(p_setor), p_retirada, p_prazo, nullif(trim(coalesce(p_observacao, '')), ''))
  returning id into v_id;
  return v_id;
end
$$;

-- Registra a devolução.
create or replace function public.devolver_emprestimo(p_emprestimo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.emprestimos;
begin
  select * into e from public.emprestimos x
  where x.id = p_emprestimo and x.prefeitura_id = app.prefeitura_atual()
    and x.secretaria_id in (select app.secretarias_permitidas())
  for update;
  if not found or not app.pode_cadastrar(e.secretaria_id) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if e.devolvido_em is not null then
    raise exception 'já devolvido' using errcode = '23514';
  end if;
  update public.emprestimos set devolvido_em = now(), devolvido_por = auth.uid() where id = e.id;
end
$$;

revoke execute on function public.registrar_emprestimo(uuid, text, text, date, date, text) from public, anon;
grant execute on function public.registrar_emprestimo(uuid, text, text, date, date, text) to authenticated;
revoke execute on function public.devolver_emprestimo(uuid) from public, anon;
grant execute on function public.devolver_emprestimo(uuid) to authenticated;
