-- Modelo editável dos termos (eliminação agora; empréstimo reaproveita).
-- Cada prefeitura edita o texto-base e as linhas de assinatura. Sem modelo
-- salvo, o sistema usa o texto-padrão do código (Resolução CONARQ 40/2014).
-- Só o administrador escreve (segundo fator); sem DELETE e sem anon.
create table public.modelos_termo (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  tipo text not null check (tipo in ('eliminacao', 'emprestimo')),
  base_legal text not null check (length(base_legal) between 1 and 1500),
  assinaturas text not null check (length(assinaturas) between 1 and 600),
  atualizado_por uuid default auth.uid() references auth.users (id),
  atualizado_em timestamptz not null default now(),
  unique (prefeitura_id, tipo)
);

alter table public.modelos_termo enable row level security;

grant select on public.modelos_termo to authenticated;
grant insert (prefeitura_id, tipo, base_legal, assinaturas) on public.modelos_termo to authenticated;
grant update (base_legal, assinaturas, atualizado_por, atualizado_em) on public.modelos_termo to authenticated;

create policy modelos_termo_le on public.modelos_termo for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy modelos_termo_inclui on public.modelos_termo for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy modelos_termo_altera on public.modelos_termo for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

create or replace function app.modelos_termo_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end
$$;
revoke execute on function app.modelos_termo_carimbo() from public;
create trigger modelos_termo_carimbo before update on public.modelos_termo
  for each row execute function app.modelos_termo_carimbo();
create trigger auditar_modelos_termo after insert or update on public.modelos_termo
  for each row execute function app.auditar_alteracao();
