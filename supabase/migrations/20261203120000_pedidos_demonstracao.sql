-- Site inicial · pedido de demonstração (formulário público).
-- A pessoa que pede não tem login: o servidor grava pela função abaixo, que só o
-- service_role executa. Só a equipe LicCONT lê. Nada de anon.
create table public.pedidos_demonstracao (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  cargo text check (cargo is null or char_length(cargo) <= 120),
  orgao text not null check (char_length(orgao) between 2 and 160),
  email text not null check (char_length(email) between 5 and 200),
  email_hash text not null,
  telefone text check (telefone is null or char_length(telefone) <= 30),
  mensagem text check (mensagem is null or char_length(mensagem) <= 1000),
  criado_em timestamptz not null default now()
);
alter table public.pedidos_demonstracao enable row level security;
create policy pedidos_demonstracao_equipe on public.pedidos_demonstracao
  for select to authenticated using ((select app.eh_equipe()));
grant select on public.pedidos_demonstracao to authenticated;
revoke all on public.pedidos_demonstracao from anon, service_role;

-- Devolve true se gravou, false se passou do limite (3 por e-mail em 24 h,
-- 200 por dia no total). O servidor manda o hash do e-mail para o limite.
create or replace function public.registrar_pedido_demonstracao(
  p_nome text, p_cargo text, p_orgao text, p_email text, p_email_hash text, p_telefone text, p_mensagem text
) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.pedidos_demonstracao where email_hash = p_email_hash and criado_em > now() - interval '24 hours') >= 3
     or (select count(*) from public.pedidos_demonstracao where criado_em > now() - interval '24 hours') >= 200 then
    return false;
  end if;
  insert into public.pedidos_demonstracao (nome, cargo, orgao, email, email_hash, telefone, mensagem)
  values (p_nome, nullif(p_cargo, ''), p_orgao, p_email, p_email_hash, nullif(p_telefone, ''), nullif(p_mensagem, ''));
  return true;
end $$;
revoke execute on function public.registrar_pedido_demonstracao(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_pedido_demonstracao(text, text, text, text, text, text, text) to service_role;
