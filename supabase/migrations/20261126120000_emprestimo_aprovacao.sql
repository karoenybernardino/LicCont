-- Fase 6 · Aprovação do empréstimo.
-- Quando a secretaria marca "exige aprovação" (exige_aprovacao_emprestimo), a
-- retirada vira um PEDIDO. Quem aprova é o coordenador da secretaria do
-- documento ou o administrador, nunca quem pediu. O pedido vence em 3 dias e o
-- prazo do empréstimo só começa a contar na aprovação. Ninguém grava direto:
-- tudo passa pelas funções abaixo (mesmo padrão de public.descarte_*).

create table public.pedidos_emprestimo (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  secretaria_id uuid not null,
  documento_id uuid not null,
  retirado_por_nome text not null check (length(trim(retirado_por_nome)) between 1 and 120),
  retirado_por_setor text not null check (length(trim(retirado_por_setor)) between 1 and 120),
  prazo_dias smallint not null check (prazo_dias between 1 and 60),
  observacao text check (observacao is null or length(observacao) <= 500),
  situacao text not null default 'pendente' check (situacao in ('pendente', 'aprovado', 'recusado')),
  pedido_por uuid not null default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now(),
  decidido_por uuid references auth.users (id),
  decidido_em timestamptz,
  emprestimo_id uuid,
  unique (id, prefeitura_id),
  foreign key (documento_id, prefeitura_id, secretaria_id) references public.documentos (id, prefeitura_id, secretaria_id),
  foreign key (emprestimo_id, prefeitura_id) references public.emprestimos (id, prefeitura_id),
  check ((situacao = 'pendente') = (decidido_por is null))
);
create unique index pedidos_emprestimo_um_pendente on public.pedidos_emprestimo (documento_id) where situacao = 'pendente';
create index pedidos_emprestimo_prefeitura on public.pedidos_emprestimo (prefeitura_id, situacao);

alter table public.pedidos_emprestimo enable row level security;
grant select on public.pedidos_emprestimo to authenticated;
revoke all on public.pedidos_emprestimo from anon, service_role;

create policy pedidos_emprestimo_le on public.pedidos_emprestimo for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()));

-- Auditoria sem nome, setor e observação de quem retira (dado pessoal).
create or replace function app.auditar_pedido_emprestimo()
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
          case when tg_op = 'INSERT' then 'pedidos_emprestimo.pedido' else 'pedidos_emprestimo.' || new.situacao end,
          'pedidos_emprestimo', new.id::text, v_antes, v_depois);
  return null;
end
$$;
revoke execute on function app.auditar_pedido_emprestimo() from public, anon, authenticated;
create trigger auditar_pedidos_emprestimo after insert or update on public.pedidos_emprestimo
  for each row execute function app.auditar_pedido_emprestimo();

-- Decidido não muda mais; nada se apaga.
create or replace function app.pedido_emprestimo_imutavel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'pedido não pode ser apagado' using errcode = '42501';
  end if;
  if old.situacao <> 'pendente'
     or (to_jsonb(new) - 'situacao' - 'decidido_por' - 'decidido_em' - 'emprestimo_id')
        <> (to_jsonb(old) - 'situacao' - 'decidido_por' - 'decidido_em' - 'emprestimo_id') then
    raise exception 'pedido não pode ser alterado' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke execute on function app.pedido_emprestimo_imutavel() from public, anon, authenticated;
create trigger pedido_emprestimo_imutavel before update or delete on public.pedidos_emprestimo
  for each row execute function app.pedido_emprestimo_imutavel();

-- Com aprovação exigida, a retirada direta é recusada: só a função de aprovar
-- (que liga a marca abaixo na própria transação) cria o empréstimo.
create or replace function app.emprestimo_exige_aprovacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.emprestimo_aprovando', true), '') <> '1'
     and exists (select 1 from public.secretarias s where s.id = new.secretaria_id and s.exige_aprovacao_emprestimo) then
    raise exception 'esta secretaria exige aprovação' using errcode = 'LE001';
  end if;
  return new;
end
$$;
revoke execute on function app.emprestimo_exige_aprovacao() from public, anon, authenticated;
create trigger emprestimo_exige_aprovacao before insert on public.emprestimos
  for each row execute function app.emprestimo_exige_aprovacao();

-- Pedido: quem cadastra na secretaria do documento, só se ela exige aprovação.
create or replace function public.pedir_emprestimo(
  p_documento uuid, p_nome text, p_setor text, p_prazo_dias integer, p_observacao text)
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
  if not d.ativo or p_prazo_dias not between 1 and 60
     or not exists (select 1 from public.secretarias s where s.id = d.secretaria_id and s.exige_aprovacao_emprestimo) then
    raise exception 'pedido inválido' using errcode = '23514';
  end if;
  if exists (select 1 from public.emprestimos e where e.documento_id = d.id and e.devolvido_em is null) then
    raise exception 'documento emprestado' using errcode = '23505';
  end if;
  insert into public.pedidos_emprestimo (prefeitura_id, secretaria_id, documento_id, retirado_por_nome, retirado_por_setor, prazo_dias, observacao)
  values (d.prefeitura_id, d.secretaria_id, d.id, trim(p_nome), trim(p_setor), p_prazo_dias, nullif(trim(coalesce(p_observacao, '')), ''))
  returning id into v_id;
  return v_id;
end
$$;

-- Aprovar: coordenador da secretaria ou administrador, diferente de quem pediu,
-- até 3 dias depois do pedido. A contagem do prazo começa hoje.
create or replace function public.aprovar_pedido_emprestimo(p_pedido uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pedidos_emprestimo;
  d public.documentos;
  v_emp uuid;
begin
  select * into p from public.pedidos_emprestimo x
  where x.id = p_pedido and x.prefeitura_id = app.prefeitura_atual()
    and x.secretaria_id in (select app.secretarias_permitidas())
  for update;
  if not found or not app.eh_coordenador_de(p.secretaria_id) or p.pedido_por = auth.uid() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p.situacao <> 'pendente' or p.criado_em < now() - interval '3 days' then
    raise exception 'pedido encerrado' using errcode = '23514';
  end if;
  select * into d from public.documentos x where x.id = p.documento_id for update;
  if not d.ativo then
    raise exception 'documento inativo' using errcode = '23514';
  end if;
  perform set_config('app.emprestimo_aprovando', '1', true);
  insert into public.emprestimos (prefeitura_id, secretaria_id, documento_id, caixa_id,
                                  retirado_por_nome, retirado_por_setor, retirado_em, prazo_em, observacao)
  values (p.prefeitura_id, p.secretaria_id, p.documento_id, d.caixa_id,
          p.retirado_por_nome, p.retirado_por_setor, app.hoje(), app.hoje() + p.prazo_dias, p.observacao)
  returning id into v_emp;
  update public.pedidos_emprestimo
  set situacao = 'aprovado', decidido_por = auth.uid(), decidido_em = now(), emprestimo_id = v_emp
  where id = p.id;
  return v_emp;
end
$$;

-- Recusar: o coordenador ou administrador da secretaria, ou quem pediu (cancela).
create or replace function public.recusar_pedido_emprestimo(p_pedido uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.pedidos_emprestimo;
begin
  select * into p from public.pedidos_emprestimo x
  where x.id = p_pedido and x.prefeitura_id = app.prefeitura_atual()
    and x.secretaria_id in (select app.secretarias_permitidas())
  for update;
  if not found or not (app.eh_coordenador_de(p.secretaria_id) or p.pedido_por = auth.uid()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p.situacao <> 'pendente' then
    raise exception 'pedido encerrado' using errcode = '23514';
  end if;
  update public.pedidos_emprestimo set situacao = 'recusado', decidido_por = auth.uid(), decidido_em = now() where id = p.id;
end
$$;

revoke execute on function public.pedir_emprestimo(uuid, text, text, integer, text) from public, anon;
grant execute on function public.pedir_emprestimo(uuid, text, text, integer, text) to authenticated;
revoke execute on function public.aprovar_pedido_emprestimo(uuid) from public, anon;
grant execute on function public.aprovar_pedido_emprestimo(uuid) to authenticated;
revoke execute on function public.recusar_pedido_emprestimo(uuid) from public, anon;
grant execute on function public.recusar_pedido_emprestimo(uuid) to authenticated;
