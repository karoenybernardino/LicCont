-- Fase 5 · Etiquetas e QR. Uma etiqueta por caixa, com código aleatório que
-- não se adivinha (122 bits). O QR impresso leva só ao caminho /mapa?caixa=<id>:
-- sem dado pessoal e, sem login, a pessoa cai na tela de entrada.

-- Quem imprime: administrador, ou operador/coordenador de alguma secretaria.
create or replace function app.pode_etiquetar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.eh_admin() or exists (
    select 1 from public.vinculos v
    join public.secretarias s on s.id = v.secretaria_id
    where v.usuario_id = auth.uid()
      and v.papel in ('operador', 'coordenador')
      and s.ativa
      and v.prefeitura_id = app.prefeitura_atual()
  )
$$;
revoke execute on function app.pode_etiquetar() from public, anon;
grant execute on function app.pode_etiquetar() to authenticated;

create table public.etiquetas (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  caixa_id uuid not null,
  codigo text not null unique default replace(gen_random_uuid()::text, '-', '') check (codigo ~ '^[0-9a-f]{32}$'),
  tamanho text not null default 'media' check (tamanho in ('pequena', 'media')),
  criado_por uuid not null default auth.uid(),
  criado_em timestamptz not null default now(),
  impressa_em timestamptz,
  unique (caixa_id),
  unique (id, prefeitura_id),
  foreign key (caixa_id, prefeitura_id) references public.caixas (id, prefeitura_id)
);

alter table public.etiquetas enable row level security;

-- Sem DELETE e sem anon. O código nasce no banco (default) e nunca é gravado pelo app.
grant select on public.etiquetas to authenticated;
grant insert (prefeitura_id, caixa_id, tamanho, impressa_em) on public.etiquetas to authenticated;
grant update (tamanho, impressa_em) on public.etiquetas to authenticated;

create policy etiquetas_le on public.etiquetas for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));
create policy etiquetas_inclui on public.etiquetas for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_etiquetar()));
create policy etiquetas_altera on public.etiquetas for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_etiquetar()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_etiquetar()));
