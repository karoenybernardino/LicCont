-- Etiquetas, classificação documental e GED.
-- Grupos documentais, tipologias, classes (tabela de temporalidade por órgão),
-- empresas parceiras, logos, número da caixa, impressões e metadados de digitalização.
-- Sem dado real em produção: a tabela de temporalidade antiga sai.
-- Convenção do projeto: nada de GRANT automático; tabela nova nasce com RLS e GRANT explícito.

-- ---------------------------------------------------------------------------
-- Empresas parceiras (só a equipe LicCONT; ninguém lê a tabela direto)
-- ---------------------------------------------------------------------------
create table public.parceiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 120),
  cnpj text not null unique check (cnpj ~ '^[0-9]{14}$'),
  logo_caminho text check (logo_caminho is null or logo_caminho ~ '^parceiras/[0-9a-f-]{36}/logo\.png$'),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.parceiras enable row level security;
-- Sem GRANT e sem política: a equipe lê e grava só pelas funções equipe_parceira*.

-- Órgão: tipo (prefeitura ou câmara), marca e parceira.
alter table public.prefeituras
  add column tipo text not null default 'prefeitura' check (tipo in ('prefeitura', 'camara')),
  add column nome_etiqueta text check (nome_etiqueta is null or length(trim(nome_etiqueta)) between 2 and 120),
  add column logo_caminho text check (logo_caminho is null or logo_caminho ~ '^orgaos/[0-9a-f-]{36}/logo\.png$'),
  add column parceira_id uuid references public.parceiras (id);

-- ---------------------------------------------------------------------------
-- Grupos documentais e tipologias (por órgão)
-- ---------------------------------------------------------------------------
create table public.grupos_documentais (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  chave text check (chave is null or chave ~ '^[a-z_]{2,30}$'),
  nome text not null check (length(trim(nome)) between 2 and 80),
  restrito boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (prefeitura_id, nome),
  unique (id, prefeitura_id)
);
create unique index grupos_documentais_chave_idx on public.grupos_documentais (prefeitura_id, chave) where chave is not null;

-- Papéis que enxergam um grupo restrito (o administrador do órgão sempre enxerga).
create table public.grupo_papeis (
  grupo_id uuid not null,
  prefeitura_id uuid not null,
  papel public.papel_vinculo not null,
  primary key (grupo_id, papel),
  foreign key (grupo_id, prefeitura_id) references public.grupos_documentais (id, prefeitura_id)
);

create table public.tipologias (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  grupo_id uuid not null,
  nome text not null check (length(trim(nome)) between 2 and 120),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (prefeitura_id, grupo_id, nome),
  unique (id, prefeitura_id),
  foreign key (grupo_id, prefeitura_id) references public.grupos_documentais (id, prefeitura_id)
);

alter table public.grupos_documentais enable row level security;
alter table public.grupo_papeis enable row level security;
alter table public.tipologias enable row level security;

-- Grupos que a pessoa pode ver: os livres, e os restritos quando é administradora
-- ou tem um dos papéis liberados. security definer: lê vínculos e papéis.
create or replace function app.grupos_permitidos()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.id
  from public.grupos_documentais g
  where g.prefeitura_id = app.prefeitura_atual()
    and (
      not g.restrito
      or app.eh_admin()
      or exists (
        select 1
        from public.grupo_papeis p
        join public.vinculos v on v.papel = p.papel
        where p.grupo_id = g.id
          and v.usuario_id = auth.uid()
          and v.prefeitura_id = g.prefeitura_id
      )
    )
$$;
revoke execute on function app.grupos_permitidos() from public, anon;
grant execute on function app.grupos_permitidos() to authenticated;

grant select on public.grupos_documentais, public.tipologias, public.grupo_papeis to authenticated;
grant insert (prefeitura_id, nome, restrito) on public.grupos_documentais to authenticated;
grant update (nome, restrito, ativo) on public.grupos_documentais to authenticated;
grant insert (prefeitura_id, grupo_id, nome) on public.tipologias to authenticated;
grant update (nome, ativa) on public.tipologias to authenticated;

create policy grupos_le on public.grupos_documentais for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and (id in (select app.grupos_permitidos()) or (select app.eh_admin())));
create policy grupos_inclui on public.grupos_documentais for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy grupos_altera on public.grupos_documentais for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

create policy grupo_papeis_le on public.grupo_papeis for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

create policy tipologias_le on public.tipologias for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and (grupo_id in (select app.grupos_permitidos()) or (select app.eh_admin())));
create policy tipologias_inclui on public.tipologias for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));
create policy tipologias_altera on public.tipologias for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.eh_admin()));

-- Só ações de pessoas entram na auditoria (a carga inicial dos grupos não tem usuário).
create trigger auditar_grupos_documentais after insert or update on public.grupos_documentais
  for each row when (auth.uid() is not null) execute function app.auditar_alteracao();
-- Só ações de pessoas entram na auditoria (a carga inicial dos grupos não tem usuário).
create trigger auditar_tipologias after insert or update on public.tipologias
  for each row when (auth.uid() is not null) execute function app.auditar_alteracao();

-- Quem define quais papéis veem um grupo restrito (administrador do órgão).
create or replace function public.grupo_definir_papeis(p_grupo uuid, p_papeis public.papel_vinculo[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_prefeitura uuid := app.prefeitura_atual();
begin
  if v_prefeitura is null or not app.eh_admin() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if not exists (select 1 from public.grupos_documentais g where g.id = p_grupo and g.prefeitura_id = v_prefeitura) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  delete from public.grupo_papeis where grupo_id = p_grupo and prefeitura_id = v_prefeitura;
  insert into public.grupo_papeis (grupo_id, prefeitura_id, papel)
  select p_grupo, v_prefeitura, x from unnest(coalesce(p_papeis, '{}')) as x group by x;
end $$;
revoke execute on function public.grupo_definir_papeis(uuid, public.papel_vinculo[]) from public, anon;
grant execute on function public.grupo_definir_papeis(uuid, public.papel_vinculo[]) to authenticated;

-- Grupos e tipologias padrão: sete grupos; RH e jurídico nascem restritos.
create or replace function app.semear_grupos(p_prefeitura uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_grupo uuid;
  r record;
  t text;
begin
  for r in
    select * from (values
      ('administrativo', 'Administrativo', false,
        array['Ofício', 'Memorando', 'Portaria', 'Decreto', 'Processo administrativo']),
      ('licitacoes_contratos', 'Licitações e Contratos', false, array[]::text[]),
      ('financeiro_contabil', 'Financeiro e Contábil', false,
        array['Empenho', 'Nota fiscal', 'Balancete', 'Prestação de contas']),
      ('rh', 'Recursos Humanos', true,
        array['Ficha funcional', 'Folha de pagamento', 'Processo de aposentadoria']),
      ('juridico', 'Jurídico', true,
        array['Parecer jurídico', 'Processo judicial', 'Contrato jurídico']),
      ('tecnico_obras', 'Técnico e Obras', false,
        array['Projeto', 'Alvará', 'Medição de obra']),
      ('correspondencias_cadastros', 'Correspondências e Cadastros', false,
        array['Correspondência recebida', 'Correspondência expedida', 'Cadastro'])
    ) as v(chave, nome, restrito, tipologias)
  loop
    v_grupo := null;
    insert into public.grupos_documentais (prefeitura_id, chave, nome, restrito)
    values (p_prefeitura, r.chave, r.nome, r.restrito)
    on conflict do nothing
    returning id into v_grupo;
    if v_grupo is null then continue; end if;
    foreach t in array r.tipologias loop
      insert into public.tipologias (prefeitura_id, grupo_id, nome) values (p_prefeitura, v_grupo, t)
      on conflict do nothing;
    end loop;
  end loop;
end $$;
revoke execute on function app.semear_grupos(uuid) from public, anon, authenticated;

create or replace function app.prefeitura_semear()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.semear_grupos(new.id);
  return null;
end $$;
revoke execute on function app.prefeitura_semear() from public, anon, authenticated;
create trigger prefeitura_semear after insert on public.prefeituras
  for each row execute function app.prefeitura_semear();

select app.semear_grupos(id) from public.prefeituras;

-- ---------------------------------------------------------------------------
-- Classes documentais (a tabela de temporalidade de cada órgão)
-- ---------------------------------------------------------------------------
create table public.classes_documentais (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras (id),
  grupo_id uuid not null,
  codigo text not null check (codigo ~ '^[0-9A-Za-z.-]{1,20}$'),
  nome text not null check (length(trim(nome)) between 2 and 160),
  prazo_corrente_anos smallint not null default 0 check (prazo_corrente_anos between 0 and 99),
  prazo_intermediaria_anos smallint not null default 0 check (prazo_intermediaria_anos between 0 and 99),
  -- fixo: conta da data do documento; apos_evento: conta do evento informado; permanente: nunca elimina.
  tipo_prazo text not null default 'fixo' check (tipo_prazo in ('fixo', 'apos_evento', 'permanente')),
  evento text check (evento is null or length(trim(evento)) between 2 and 80),
  destinacao text not null default 'eliminacao' check (destinacao in ('eliminacao', 'guarda_permanente')),
  observacao text check (observacao is null or length(observacao) <= 500),
  ativa boolean not null default true,
  criado_por uuid default auth.uid() references auth.users (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (prefeitura_id, codigo),
  unique (id, prefeitura_id),
  foreign key (grupo_id, prefeitura_id) references public.grupos_documentais (id, prefeitura_id),
  check ((tipo_prazo = 'permanente') = (destinacao = 'guarda_permanente')),
  check (tipo_prazo <> 'apos_evento' or evento is not null)
);
alter table public.classes_documentais enable row level security;
-- Só leitura direta: gravar é pela equipe ou pelo administrador, pelas funções abaixo.
grant select on public.classes_documentais to authenticated;
create policy classes_le on public.classes_documentais for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and (grupo_id in (select app.grupos_permitidos()) or (select app.eh_admin())));
-- Só ações de pessoas entram na auditoria (a carga inicial dos grupos não tem usuário).
create trigger auditar_classes_documentais after insert or update on public.classes_documentais
  for each row when (auth.uid() is not null) execute function app.auditar_alteracao();

-- ---------------------------------------------------------------------------
-- Caixa: número do órgão (CX - 0001), volume e classe
-- ---------------------------------------------------------------------------
create table public.caixa_contador (
  prefeitura_id uuid primary key references public.prefeituras (id),
  proximo integer not null default 1
);
alter table public.caixa_contador enable row level security;

alter table public.caixas
  add column sequencial integer,
  add column volume smallint check (volume is null or volume between 1 and 99),
  add column volumes_total smallint check (volumes_total is null or volumes_total between 2 and 99),
  add column classe_id uuid,
  add check ((volume is null) = (volumes_total is null) and (volume is null or volume <= volumes_total)),
  add foreign key (classe_id, prefeitura_id) references public.classes_documentais (id, prefeitura_id);

update public.caixas c set sequencial = x.n
from (select id, row_number() over (partition by prefeitura_id order by criado_em, id) as n from public.caixas) x
where x.id = c.id;
insert into public.caixa_contador (prefeitura_id, proximo)
select prefeitura_id, max(sequencial) + 1 from public.caixas group by prefeitura_id;
alter table public.caixas alter column sequencial set not null;
alter table public.caixas add constraint caixas_sequencial_unico unique (prefeitura_id, sequencial);

create or replace function app.caixa_sequencial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.caixa_contador (prefeitura_id, proximo) values (new.prefeitura_id, 2)
  on conflict (prefeitura_id) do update set proximo = public.caixa_contador.proximo + 1
  returning proximo - 1 into new.sequencial;
  return new;
end $$;
revoke execute on function app.caixa_sequencial() from public, anon, authenticated;
create trigger b_caixas_sequencial before insert on public.caixas
  for each row execute function app.caixa_sequencial();

grant update (volume, volumes_total, classe_id) on public.caixas to authenticated;

-- ---------------------------------------------------------------------------
-- Documento: grupo, classe, tipologia, data, observação, volume, evento e QR
-- ---------------------------------------------------------------------------
alter table public.documentos
  add column grupo_id uuid,
  add column classe_id uuid,
  add column tipologia_id uuid,
  add column data_producao date,
  add column observacao text check (observacao is null or length(observacao) <= 300),
  add column volume smallint not null default 1 check (volume between 1 and 99),
  add column evento_em date,
  add column qr_codigo text not null unique default replace(gen_random_uuid()::text, '-', '')
    check (qr_codigo ~ '^[0-9a-f]{32}$');

update public.documentos d set grupo_id = g.id
from public.grupos_documentais g
where g.prefeitura_id = d.prefeitura_id and g.chave = 'licitacoes_contratos';
alter table public.documentos alter column grupo_id set not null;
alter table public.documentos
  add foreign key (grupo_id, prefeitura_id) references public.grupos_documentais (id, prefeitura_id),
  add foreign key (classe_id, prefeitura_id) references public.classes_documentais (id, prefeitura_id),
  add foreign key (tipologia_id, prefeitura_id) references public.tipologias (id, prefeitura_id);
create index documentos_grupo_idx on public.documentos (prefeitura_id, grupo_id);
create index documentos_classe_idx on public.documentos (classe_id) where classe_id is not null;

-- Documento de outro grupo (RH, financeiro...) é do tipo "outro": modalidade e situação próprias.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.documentos'::regclass and contype = 'c'
      and (
        (pg_get_constraintdef(oid) like '%ARRAY[''licitacao''::text, ''contrato''::text]%'
          and pg_get_constraintdef(oid) not like '%situacao%')
        or (pg_get_constraintdef(oid) like '%modalidade IS NOT NULL%'
          and pg_get_constraintdef(oid) not like '%situacao%')
        or pg_get_constraintdef(oid) like '%em_andamento%'
      )
  loop
    execute format('alter table public.documentos drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.documentos
  add constraint documentos_tipo_chk check (tipo in ('licitacao', 'contrato', 'outro')),
  add constraint documentos_modalidade_chk check (tipo <> 'licitacao' or modalidade is not null),
  add constraint documentos_situacao_chk check (
    (tipo = 'licitacao' and situacao in ('em_andamento', 'concluida', 'deserta', 'fracassada', 'revogada', 'anulada'))
    or (tipo = 'contrato' and situacao in ('vigente', 'encerrado', 'rescindido'))
    or (tipo = 'outro' and situacao = 'arquivado'));

-- Classe define o grupo. Sem classe nem grupo (importação, TCE), licitação e contrato
-- caem no grupo "Licitações e Contratos"; documento de outro tipo precisa de grupo.
create or replace function app.documento_define_grupo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.classe_id is not null then
    select c.grupo_id into new.grupo_id from public.classes_documentais c
    where c.id = new.classe_id and c.prefeitura_id = new.prefeitura_id;
    if new.grupo_id is null then
      raise exception 'classe de outro órgão' using errcode = '23503';
    end if;
  elsif new.grupo_id is null and new.tipo in ('licitacao', 'contrato') then
    select g.id into new.grupo_id from public.grupos_documentais g
    where g.prefeitura_id = new.prefeitura_id and g.chave = 'licitacoes_contratos';
  end if;
  return new;
end $$;
revoke execute on function app.documento_define_grupo() from public, anon, authenticated;
create trigger a_documentos_define_grupo before insert or update of classe_id, grupo_id on public.documentos
  for each row execute function app.documento_define_grupo();

grant insert (grupo_id, classe_id, tipologia_id, data_producao, observacao, volume, evento_em)
  on public.documentos to authenticated;
grant update (classe_id, tipologia_id, data_producao, observacao, volume, evento_em)
  on public.documentos to authenticated;

-- Permissão por grupo: política restritiva (soma-se às de secretaria).
create policy documentos_grupo on public.documentos as restrictive for all to authenticated
  using (grupo_id in (select app.grupos_permitidos()))
  with check (grupo_id in (select app.grupos_permitidos()));
-- Tabelas filhas seguem o documento: se a pessoa não vê o documento, não vê o resto.
create policy arquivos_grupo on public.arquivos as restrictive for all to authenticated
  using (exists (select 1 from public.documentos d where d.id = documento_id));
create policy arquivo_textos_grupo on public.arquivo_textos as restrictive for all to authenticated
  using (exists (select 1 from public.documentos d where d.id = documento_id));
create policy emprestimos_grupo on public.emprestimos as restrictive for all to authenticated
  using (exists (select 1 from public.documentos d where d.id = documento_id));
create policy pedidos_emprestimo_grupo on public.pedidos_emprestimo as restrictive for all to authenticated
  using (exists (select 1 from public.documentos d where d.id = documento_id));
create policy descarte_itens_grupo on public.descarte_itens as restrictive for all to authenticated
  using (exists (select 1 from public.documentos d where d.id = documento_id));

-- ---------------------------------------------------------------------------
-- Datas e elegibilidade de eliminação com a tabela nova
-- ---------------------------------------------------------------------------
create or replace function app.data_evento(p_documento public.documentos)
returns date
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_documento.evento_em,
    case p_documento.tipo when 'contrato' then p_documento.vigencia_fim
                          when 'licitacao' then p_documento.encerrado_em end)
$$;
revoke execute on function app.data_evento(public.documentos) from public, anon;
grant execute on function app.data_evento(public.documentos) to authenticated;

alter table public.arquivos
  add column titulo text check (titulo is null or length(trim(titulo)) between 1 and 200),
  add column assunto text check (assunto is null or length(trim(assunto)) between 1 and 300),
  add column autor text check (autor is null or length(trim(autor)) between 1 and 200),
  add column local_digitalizacao text check (local_digitalizacao is null or length(trim(local_digitalizacao)) between 1 and 200),
  add column genero text not null default 'textual' check (genero in ('textual', 'iconografico', 'cartografico', 'sonoro', 'audiovisual', 'outro')),
  add column selo text not null default 'consulta' check (selo in ('consulta', 'valor_legal')),
  -- Estrutura da assinatura ICP-Brasil: desligada, sem tela nem função que grave.
  add column assinatura_icp boolean not null default false,
  add column assinatura_certificado text,
  add column assinatura_em timestamptz,
  add check (not assinatura_icp or (assinatura_certificado is not null and assinatura_em is not null));

create or replace function public.salvar_metadados_arquivo(
  p_arquivo uuid, p_titulo text, p_assunto text, p_autor text, p_local text, p_genero text, p_selo text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  a public.arquivos;
begin
  select * into a from public.arquivos
  where id = p_arquivo and prefeitura_id = app.prefeitura_atual();
  if not found or not app.pode_cadastrar(a.secretaria_id)
     or not exists (select 1 from public.documentos d where d.id = a.documento_id) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.arquivos set
    titulo = nullif(trim(p_titulo), ''),
    assunto = nullif(trim(p_assunto), ''),
    autor = nullif(trim(p_autor), ''),
    local_digitalizacao = nullif(trim(p_local), ''),
    genero = p_genero,
    selo = p_selo
  where id = a.id;
end $$;
revoke execute on function public.salvar_metadados_arquivo(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.salvar_metadados_arquivo(uuid, text, text, text, text, text, text) to authenticated;

create or replace function app.motivo_inelegivel(p_documento uuid, p_ignorar uuid default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d public.documentos;
  c public.classes_documentais;
  v_inicio date;
begin
  select * into d from public.documentos
  where id = p_documento and prefeitura_id = app.prefeitura_atual();
  if not found then return 'inexistente'; end if;
  if not d.ativo then return 'inativo'; end if;
  select * into c from public.classes_documentais
  where id = d.classe_id and prefeitura_id = d.prefeitura_id;
  if not found then return 'sem_regra'; end if;
  if c.destinacao <> 'eliminacao' then return 'guarda_permanente'; end if;
  if c.tipo_prazo = 'apos_evento' then
    v_inicio := app.data_evento(d);
    if v_inicio is null then return 'aguardando_evento'; end if;
  else
    v_inicio := d.data_producao;
    if v_inicio is null then return 'sem_data'; end if;
  end if;
  if app.hoje() < (v_inicio + make_interval(years => c.prazo_corrente_anos + c.prazo_intermediaria_anos))::date then
    return 'prazo_nao_cumprido';
  end if;
  -- Digitalizado só sai com assinatura ICP-Brasil; sem PDF é só organização do arquivo.
  if exists (select 1 from public.arquivos a where a.documento_id = d.id and a.ativo and not a.assinatura_icp) then
    return 'digitalizado_sem_icp';
  end if;
  if app.documento_emprestado(d.id) then return 'emprestado'; end if;
  if exists (
    select 1 from public.descarte_itens i
    where i.documento_id = d.id and i.aberto and i.descarte_id is distinct from p_ignorar
  ) then return 'em_outro_termo'; end if;
  return null;
end
$$;
revoke execute on function app.motivo_inelegivel(uuid, uuid) from public, anon;
grant execute on function app.motivo_inelegivel(uuid, uuid) to authenticated;

drop table public.tabela_temporalidade;
drop function if exists app.temporalidade_carimbo();

-- ---------------------------------------------------------------------------
-- Gravar classes: equipe LicCONT (qualquer órgão) ou administrador (o próprio órgão)
-- ---------------------------------------------------------------------------
create or replace function app.pode_editar_classes(p_prefeitura uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.eh_equipe() or (app.eh_admin() and p_prefeitura = app.prefeitura_atual())
$$;
revoke execute on function app.pode_editar_classes(uuid) from public, anon;
grant execute on function app.pode_editar_classes(uuid) to authenticated;

-- p_linhas: [{codigo, nome, grupo, prazo_corrente, prazo_intermediaria, tipo_prazo, evento, destinacao, observacao}].
-- Atualiza a classe de mesmo código e inclui as novas. Com p_substituir, as que não vieram
-- são excluídas quando não têm uso, e desativadas quando têm caixa ou documento.
create or replace function public.classes_salvar(p_prefeitura uuid, p_linhas jsonb, p_substituir boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l jsonb;
  v_grupo uuid;
  v_inseridas int := 0;
  v_atualizadas int := 0;
  v_removidas int := 0;
  v_desativadas int := 0;
  v_codigos text[] := '{}';
  v_codigo text;
  v_tip text;
  r record;
begin
  if not app.pode_editar_classes(p_prefeitura) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if jsonb_typeof(p_linhas) <> 'array' or jsonb_array_length(p_linhas) > 500 then
    raise exception 'tabela inválida' using errcode = '22023';
  end if;
  perform 1 from public.prefeituras where id = p_prefeitura for update;
  for l in select * from jsonb_array_elements(p_linhas) loop
    select g.id into v_grupo from public.grupos_documentais g
    where g.prefeitura_id = p_prefeitura and lower(g.nome) = lower(trim(l ->> 'grupo'));
    if v_grupo is null then
      raise exception 'grupo desconhecido' using errcode = '22023';
    end if;
    v_codigo := trim(l ->> 'codigo');
    v_codigos := v_codigos || v_codigo;
    if exists (select 1 from public.classes_documentais x where x.prefeitura_id = p_prefeitura and x.codigo = v_codigo) then
      v_atualizadas := v_atualizadas + 1;
    else
      v_inseridas := v_inseridas + 1;
    end if;
    insert into public.classes_documentais
      (prefeitura_id, grupo_id, codigo, nome, prazo_corrente_anos, prazo_intermediaria_anos,
       tipo_prazo, evento, destinacao, observacao)
    values (
      p_prefeitura, v_grupo, v_codigo, trim(l ->> 'nome'),
      coalesce((l ->> 'prazo_corrente')::smallint, 0), coalesce((l ->> 'prazo_intermediaria')::smallint, 0),
      coalesce(l ->> 'tipo_prazo', 'fixo'), nullif(trim(l ->> 'evento'), ''),
      coalesce(l ->> 'destinacao', 'eliminacao'), nullif(trim(l ->> 'observacao'), ''))
    on conflict (prefeitura_id, codigo) do update set
      grupo_id = excluded.grupo_id, nome = excluded.nome,
      prazo_corrente_anos = excluded.prazo_corrente_anos, prazo_intermediaria_anos = excluded.prazo_intermediaria_anos,
      tipo_prazo = excluded.tipo_prazo, evento = excluded.evento, destinacao = excluded.destinacao,
      observacao = excluded.observacao, ativa = true, atualizado_em = now();
    -- Tipologias citadas na linha (separadas por ; ou ,) entram no grupo da classe.
    for v_tip in select trim(x) from unnest(regexp_split_to_array(coalesce(l ->> 'tipologias', ''), '[;,]')) as x where trim(x) <> '' loop
      insert into public.tipologias (prefeitura_id, grupo_id, nome) values (p_prefeitura, v_grupo, v_tip)
      on conflict do nothing;
    end loop;
  end loop;
  if p_substituir then
    for r in select id, codigo from public.classes_documentais
             where prefeitura_id = p_prefeitura and not (codigo = any(v_codigos)) loop
      if exists (select 1 from public.documentos d where d.classe_id = r.id)
         or exists (select 1 from public.caixas x where x.classe_id = r.id) then
        update public.classes_documentais set ativa = false, atualizado_em = now() where id = r.id and ativa;
        v_desativadas := v_desativadas + 1;
      else
        delete from public.classes_documentais where id = r.id;
        v_removidas := v_removidas + 1;
      end if;
    end loop;
  end if;
  return jsonb_build_object('inseridas', v_inseridas, 'atualizadas', v_atualizadas,
                            'removidas', v_removidas, 'desativadas', v_desativadas);
end $$;
revoke execute on function public.classes_salvar(uuid, jsonb, boolean) from public, anon;
grant execute on function public.classes_salvar(uuid, jsonb, boolean) to authenticated;

create or replace function public.classe_excluir(p_classe uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.classes_documentais;
begin
  select * into c from public.classes_documentais where id = p_classe;
  if not found or not app.pode_editar_classes(c.prefeitura_id) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if exists (select 1 from public.documentos d where d.classe_id = c.id)
     or exists (select 1 from public.caixas x where x.classe_id = c.id) then
    update public.classes_documentais set ativa = false, atualizado_em = now() where id = c.id;
    return 'desativada';
  end if;
  delete from public.classes_documentais where id = c.id;
  return 'excluida';
end $$;
revoke execute on function public.classe_excluir(uuid) from public, anon;
grant execute on function public.classe_excluir(uuid) to authenticated;

-- A equipe lê as classes de qualquer órgão (só a tabela de temporalidade, sem acervo).
create or replace function public.equipe_classes(p_prefeitura uuid)
returns table (id uuid, grupo_id uuid, grupo text, codigo text, nome text, prazo_corrente_anos smallint,
               prazo_intermediaria_anos smallint, tipo_prazo text, evento text, destinacao text,
               observacao text, ativa boolean, em_uso boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.grupo_id, g.nome, c.codigo, c.nome, c.prazo_corrente_anos, c.prazo_intermediaria_anos,
         c.tipo_prazo, c.evento, c.destinacao, c.observacao, c.ativa,
         (exists (select 1 from public.documentos d where d.classe_id = c.id)
          or exists (select 1 from public.caixas x where x.classe_id = c.id))
  from public.classes_documentais c
  join public.grupos_documentais g on g.id = c.grupo_id and g.prefeitura_id = c.prefeitura_id
  where c.prefeitura_id = p_prefeitura and app.pode_editar_classes(p_prefeitura)
  order by c.codigo
$$;
revoke execute on function public.equipe_classes(uuid) from public, anon;
grant execute on function public.equipe_classes(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Marca: logos no Storage e funções da equipe
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', false, 1048576, array['image/png'])
on conflict (id) do nothing;

create or replace function app.parceira_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.parceira_id from public.prefeituras p where p.id = app.prefeitura_atual()
$$;
revoke execute on function app.parceira_atual() from public, anon;
grant execute on function app.parceira_atual() to authenticated;

create policy marcas_le on storage.objects for select to authenticated
  using (
    bucket_id = 'marcas'
    and (
      (select app.eh_equipe())
      or ((storage.foldername(name))[1] = 'orgaos'
          and (storage.foldername(name))[2] = (select app.prefeitura_atual())::text)
      or ((storage.foldername(name))[1] = 'parceiras'
          and (storage.foldername(name))[2] = (select app.parceira_atual())::text)
    )
  );
create policy marcas_grava on storage.objects for insert to authenticated
  with check (bucket_id = 'marcas' and (select app.eh_equipe()));
create policy marcas_troca on storage.objects for update to authenticated
  using (bucket_id = 'marcas' and (select app.eh_equipe()))
  with check (bucket_id = 'marcas' and (select app.eh_equipe()));
create policy marcas_apaga on storage.objects for delete to authenticated
  using (bucket_id = 'marcas' and (select app.eh_equipe()));

-- Marca do órgão atual, para as etiquetas.
create or replace function public.etiqueta_marca()
returns table (nome text, nome_etiqueta text, tipo text, logo_caminho text, parceira_logo_caminho text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nome, p.nome_etiqueta, p.tipo, p.logo_caminho, pa.logo_caminho
  from public.prefeituras p
  left join public.parceiras pa on pa.id = p.parceira_id and pa.ativa
  where p.id = app.prefeitura_atual()
$$;
revoke execute on function public.etiqueta_marca() from public, anon;
grant execute on function public.etiqueta_marca() to authenticated;

create or replace function public.equipe_parceiras()
returns table (id uuid, nome text, cnpj text, logo_caminho text, ativa boolean, prefeituras bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select pa.id, pa.nome, pa.cnpj, pa.logo_caminho, pa.ativa,
         (select count(*) from public.prefeituras p where p.parceira_id = pa.id)
  from public.parceiras pa
  where app.eh_equipe()
  order by pa.nome
$$;
revoke execute on function public.equipe_parceiras() from public, anon;
grant execute on function public.equipe_parceiras() to authenticated;

create or replace function public.equipe_parceira_orgaos(p_parceira uuid)
returns table (id uuid, nome text, cnpj text, tipo text, ligada boolean, de_outra boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nome, p.cnpj, p.tipo, coalesce(p.parceira_id = p_parceira, false),
         p.parceira_id is not null and p.parceira_id <> p_parceira
  from public.prefeituras p
  where app.eh_equipe()
  order by p.nome
$$;
revoke execute on function public.equipe_parceira_orgaos(uuid) from public, anon;
grant execute on function public.equipe_parceira_orgaos(uuid) to authenticated;

create or replace function public.equipe_parceira_salvar(
  p_id uuid, p_nome text, p_cnpj text, p_logo text, p_prefeituras uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  insert into public.parceiras (id, nome, cnpj, logo_caminho)
  values (p_id, trim(p_nome), p_cnpj, p_logo)
  on conflict (id) do update set nome = excluded.nome, cnpj = excluded.cnpj,
    logo_caminho = coalesce(excluded.logo_caminho, public.parceiras.logo_caminho);
  update public.prefeituras set parceira_id = null where parceira_id = p_id and not (id = any(coalesce(p_prefeituras, '{}')));
  update public.prefeituras set parceira_id = p_id where id = any(coalesce(p_prefeituras, '{}'));
end $$;
revoke execute on function public.equipe_parceira_salvar(uuid, text, text, text, uuid[]) from public, anon;
grant execute on function public.equipe_parceira_salvar(uuid, text, text, text, uuid[]) to authenticated;

create or replace function public.equipe_orgao_marca(
  p_prefeitura uuid, p_tipo text, p_nome_etiqueta text, p_logo text, p_remover_logo boolean, p_parceira uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not app.eh_equipe() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  update public.prefeituras set
    tipo = p_tipo,
    nome_etiqueta = nullif(trim(p_nome_etiqueta), ''),
    logo_caminho = case when p_remover_logo then null else coalesce(p_logo, logo_caminho) end,
    parceira_id = p_parceira
  where id = p_prefeitura;
end $$;
revoke execute on function public.equipe_orgao_marca(uuid, text, text, text, boolean, uuid) from public, anon;
grant execute on function public.equipe_orgao_marca(uuid, text, text, text, boolean, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Impressões de etiqueta (quem imprimiu e quando)
-- ---------------------------------------------------------------------------
create table public.etiqueta_impressoes (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  tipo text not null check (tipo in ('caixa', 'conteudo', 'documento')),
  caixa_id uuid,
  documento_id uuid,
  impresso_por uuid not null default auth.uid() references auth.users (id),
  impresso_em timestamptz not null default now(),
  foreign key (caixa_id, prefeitura_id) references public.caixas (id, prefeitura_id),
  foreign key (documento_id, prefeitura_id) references public.documentos (id, prefeitura_id),
  check (num_nonnulls(caixa_id, documento_id) = 1),
  check ((tipo = 'documento') = (documento_id is not null))
);
create index etiqueta_impressoes_caixa_idx on public.etiqueta_impressoes (caixa_id, impresso_em desc) where caixa_id is not null;
create index etiqueta_impressoes_documento_idx on public.etiqueta_impressoes (documento_id, impresso_em desc) where documento_id is not null;
alter table public.etiqueta_impressoes enable row level security;
grant select on public.etiqueta_impressoes to authenticated;
create policy etiqueta_impressoes_le on public.etiqueta_impressoes for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and (documento_id is null or exists (select 1 from public.documentos d where d.id = documento_id)));
create trigger auditar_etiqueta_impressoes after insert on public.etiqueta_impressoes
  for each row execute function app.auditar_alteracao();

-- p_itens: [{tipo, id}] com id de caixa (caixa, conteudo) ou de documento (documento).
create or replace function public.registrar_impressoes(p_itens jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_prefeitura uuid := app.prefeitura_atual();
  i jsonb;
  v_total integer := 0;
begin
  if v_prefeitura is null or not app.pode_etiquetar() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) not between 1 and 500 then
    raise exception 'escolha de 1 a 500 etiquetas' using errcode = '22023';
  end if;
  for i in select * from jsonb_array_elements(p_itens) loop
    if i ->> 'tipo' = 'documento' then
      insert into public.etiqueta_impressoes (prefeitura_id, tipo, documento_id)
      select v_prefeitura, 'documento', d.id from public.documentos d
      where d.id = (i ->> 'id')::uuid and d.prefeitura_id = v_prefeitura;
    else
      insert into public.etiqueta_impressoes (prefeitura_id, tipo, caixa_id)
      select v_prefeitura, i ->> 'tipo', c.id from public.caixas c
      where c.id = (i ->> 'id')::uuid and c.prefeitura_id = v_prefeitura;
    end if;
    if found then v_total := v_total + 1; end if;
  end loop;
  return v_total;
end $$;
revoke execute on function public.registrar_impressoes(jsonb) from public, anon;
grant execute on function public.registrar_impressoes(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Importação: a linha pode trazer classe, tipologia, data do documento e volume
-- ---------------------------------------------------------------------------
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
    -- A chave composta (classe, prefeitura) recusa classe ou tipologia de outro órgão.
    insert into public.documentos (prefeitura_id, secretaria_id, tipo, modalidade, numero, ano, objeto,
                                   empresa, cnpj, cpf_credor, valor, situacao, vigencia_inicio, vigencia_fim,
                                   classe_id, tipologia_id, data_producao, volume,
                                   origem, lote_id, importado_em)
    values (l.prefeitura_id, (v_linha ->> 'secretaria_id')::uuid, v_linha ->> 'tipo', v_linha ->> 'modalidade',
            v_linha ->> 'numero', (v_linha ->> 'ano')::smallint, v_linha ->> 'objeto',
            v_linha ->> 'empresa', v_linha ->> 'cnpj', v_linha ->> 'cpf_credor', (v_linha ->> 'valor')::numeric,
            v_linha ->> 'situacao', (v_linha ->> 'vigencia_inicio')::date, (v_linha ->> 'vigencia_fim')::date,
            nullif(v_linha ->> 'classe_id', '')::uuid, nullif(v_linha ->> 'tipologia_id', '')::uuid,
            nullif(v_linha ->> 'data_producao', '')::date, coalesce((v_linha ->> 'volume')::smallint, 1),
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

-- Grupos de um órgão, para a equipe montar a tabela de temporalidade dele.
create or replace function public.equipe_grupos(p_prefeitura uuid)
returns table (id uuid, nome text, ativo boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.nome, g.ativo
  from public.grupos_documentais g
  where g.prefeitura_id = p_prefeitura and app.eh_equipe()
  order by g.nome
$$;
revoke execute on function public.equipe_grupos(uuid) from public, anon;
grant execute on function public.equipe_grupos(uuid) to authenticated;
