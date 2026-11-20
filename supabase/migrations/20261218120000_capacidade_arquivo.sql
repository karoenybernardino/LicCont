-- Capacidade do arquivo, contada em CAIXAS: cada nível comporta 6 caixas e cada módulo 30 ou 36
-- (escolha da equipe LicCONT no cadastro do órgão). Capacidade total = módulos ativos x caixas por módulo.
-- Sem tabela nova: uma coluna em prefeituras (o RLS e o GRANT de coluna da tabela valem) e uma função de leitura.
-- A regra "6 por nível" fica na aplicação (esquemas Zod): testes e dados antigos têm níveis com outras capacidades.
-- proxima_caixa_livre não muda: continua escolhendo a menor caixa ativa com espaço para documentos.

alter table public.prefeituras
  add column caixas_por_modulo smallint not null default 36 check (caixas_por_modulo in (30, 36));
-- Só a equipe LicCONT altera prefeituras (políticas existentes); aqui só abre a coluna.
grant insert (caixas_por_modulo), update (caixas_por_modulo) on public.prefeituras to authenticated;

-- Números da própria prefeitura: caixas ativas por módulo (rua, módulo) e por nível (soma de todos os módulos).
create or replace function public.capacidade_arquivo()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select r.codigo as rua, mo.numero as modulo, mo.id
    from public.modulos mo
    join public.ruas r on r.id = mo.rua_id
    join public.galpoes g on g.id = r.galpao_id
    where mo.prefeitura_id = app.prefeitura_atual() and mo.ativo and r.ativo and g.ativo
  ),
  x as (
    select m.rua, m.modulo, n.numero as nivel, count(c.id) as ocup
    from m
    join public.niveis n on n.modulo_id = m.id and n.ativo
    left join public.caixas c on c.nivel_id = n.id and c.ativo
    group by m.rua, m.modulo, n.numero
  )
  select jsonb_build_object(
    'caixas_por_modulo', (select p.caixas_por_modulo from public.prefeituras p where p.id = app.prefeitura_atual()),
    'por_modulo', coalesce((
      select jsonb_agg(jsonb_build_object('rua', q.rua, 'modulo', q.modulo, 'ocupadas', q.o) order by q.rua, q.modulo)
      from (select m.rua, m.modulo, coalesce(sum(x.ocup), 0)::int as o
            from m left join x on x.rua = m.rua and x.modulo = m.modulo
            group by m.rua, m.modulo) q), '[]'::jsonb),
    'por_nivel', coalesce((
      select jsonb_agg(jsonb_build_object('nivel', q.nivel, 'ocupadas', q.o) order by q.nivel)
      from (select x.nivel, sum(x.ocup)::int as o from x group by x.nivel) q), '[]'::jsonb))
$$;
revoke execute on function public.capacidade_arquivo() from public, anon;
grant execute on function public.capacidade_arquivo() to authenticated;
