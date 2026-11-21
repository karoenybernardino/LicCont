-- A pessoa da empresa parceira passa a ATUAR em uma prefeitura por vez (as permitidas pelo dono/alocação)
-- e a operar o acervo e a administrar o ACERVO (estrutura física e temporalidade), sem administrar
-- pessoas. Plano: docs/fases/parceira-acervo.md.
--
-- Como funciona
--   * public.parceira_contexto guarda pessoa -> prefeitura atual. Sem GRANT: só a função parceira_atuar() grava.
--   * app.prefeitura_atual() continua igual para quem é de prefeitura (usuarios) e, para a pessoa da empresa,
--     devolve a prefeitura do contexto SE ela ainda está em app.prefeituras_permitidas() e o segundo fator vale.
--     Desalocar o funcionário (ou desvincular a prefeitura) derruba o contexto na hora, sem apagar linha.
--   * Sem recursão: parceira_contexto_atual() só usa minha_pessoa, prefeituras_permitidas (minha_parceira,
--     sou_dono_parceira) e segundo_fator_ok. Nenhuma delas chama prefeitura_atual.
--   * app.eh_admin() NÃO muda: a parceira nunca é administradora (protege usuários, secretarias, vínculos).
--   * app.pode_administrar_acervo() = eh_admin() OU pessoa da empresa com contexto (segundo fator ok).
--
-- CONCEDIDO à parceira com contexto (só na prefeitura do contexto)
--   Operar: ler todas as secretarias ATIVAS e seus documentos/arquivos/PDF (app.secretarias_permitidas); cadastrar
--     e editar documento e enviar PDF (app.pode_cadastrar, vale também para storage e salvar_texto_pdf/marcar_conferindo);
--     mover documentos (mover_documentos usa a política de documentos); registrar impressão de etiqueta
--     (app.pode_etiquetar: registrar_impressoes, etiquetas); ler estrutura, planta e capacidade.
--     Grupos documentais RESTRITOS (RH, jurídico) continuam invisíveis: não há papel de vínculo para ela.
--   Acervo (app.pode_administrar_acervo no lugar de eh_admin):
--     - estrutura física: políticas de inclusão/alteração de galpões, ruas, módulos e níveis;
--     - planta: app.planta_confere e políticas de planta_elementos, galpoes_altera e ruas_altera (salvar_planta, invoker);
--     - caixas: criar, editar e desativar (a regra LC005 continua: caixa com documento ativo não desativa);
--     - temporalidade: app.pode_editar_classes (classes_salvar, classe_excluir = regras e prazos), modelos_termo
--       (texto-base e assinaturas) e termos de eliminação (descarte_criar, descarte_publicar_edital,
--       descarte_aprovar, descarte_cancelar). A regra "quem gerou o termo não o aprova" e o prazo de 45 dias valem.
--       Para o termo aprovado desativar documentos, app.documento_conferir aceita a parceira SÓ dentro de descarte_aprovar.
--       (A tabela_temporalidade foi removida em 20261215; as regras vivem em classes_documentais.)
--   Leitura de prefeituras: ela NÃO lê a linha de prefeituras pela Data API (mensalidade, contrato, TCE; mesma
--     razão da correção 20261220). Use public.parceira_atuando() (nome, tipo, limite_pdf_mb, caixas_por_modulo).
-- NEGADO e por quê
--   usuários, vínculos, secretarias (cadastro/edição): só equipe LicCONT e administrador da prefeitura; eh_admin() é falso.
--   TCE/PNCP, importação, exportação, grupos e tipologias: dependem de eh_admin() (continua falso).
--   empréstimos e pedidos: pode_cadastrar passou a valer para ela, então foram fechados à parte: política restritiva
--     de leitura e gatilho que recusa gravar (as funções registrar/pedir/devolver são security definer).
--   conferir documento e desativar documento à mão: continuam de coordenador/administrador (app.eh_coordenador_de
--     NÃO foi alterada: ela também guarda aprovação de empréstimo e TCE).
--   marca/logo e parceiras: só equipe LicCONT.
-- Como desfazer: recriar app.prefeitura_atual/secretarias_permitidas/pode_cadastrar/pode_etiquetar/planta_confere/
--   pode_editar_classes/documento_conferir/descarte_* a partir das migrações 20261108190000, 20261108140000, 20261114120000,
--   20261119120000, 20261115120000, 20261215120000 e 20261122120000; recriar as políticas trocando
--   pode_administrar_acervo() por eh_admin(); apagar os gatilhos/políticas *_sem_parceira, recriar prefeituras_le
--   sem o "not parceira_atua()" e apagar a tabela parceira_contexto (só guarda a escolha atual; nenhum dado de cliente).
-- Backup: não apaga nem altera dado existente; mesmo assim confira o backup do Supabase antes de aplicar em produção.

-- ---------------------------------------------------------------------------
-- 1. Tabela (sem GRANT: só funções security definer)
-- ---------------------------------------------------------------------------
create table public.parceira_contexto (
  pessoa_id uuid primary key references public.parceira_pessoas (id) on delete cascade,
  prefeitura_id uuid not null references public.prefeituras (id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index parceira_contexto_prefeitura_idx on public.parceira_contexto (prefeitura_id);
alter table public.parceira_contexto enable row level security;
revoke all on public.parceira_contexto from public, anon, authenticated, service_role;
-- Sem política: nem authenticated enxerga linha (e também não tem GRANT).

-- ---------------------------------------------------------------------------
-- 2. Contexto válido e papéis auxiliares (não chamam prefeitura_atual)
-- ---------------------------------------------------------------------------
create or replace function app.parceira_contexto_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.prefeitura_id
  from public.parceira_contexto c
  where c.pessoa_id = app.minha_pessoa()
    and c.prefeitura_id in (select app.prefeituras_permitidas())
    and app.segundo_fator_ok()
    and not exists (select 1 from public.usuarios u where u.id = auth.uid())
$$;

create or replace function app.parceira_atua()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.parceira_contexto_atual() is not null
$$;

create or replace function app.pode_administrar_acervo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.eh_admin() or app.parceira_atua()
$$;
revoke execute on function app.parceira_contexto_atual(), app.parceira_atua(), app.pode_administrar_acervo() from public, anon;
grant execute on function app.parceira_contexto_atual(), app.parceira_atua(), app.pode_administrar_acervo() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. parceira_atuar e parceira_atuando
-- ---------------------------------------------------------------------------
create or replace function public.parceira_atuar(p_prefeitura uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_pessoa uuid := app.minha_pessoa();
  v_antes uuid;
begin
  if v_pessoa is null or not app.segundo_fator_ok() or p_prefeitura is null
     or not exists (select 1 from app.prefeituras_permitidas() x where x = p_prefeitura) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  select c.prefeitura_id into v_antes from public.parceira_contexto c where c.pessoa_id = v_pessoa;
  insert into public.parceira_contexto (pessoa_id, prefeitura_id) values (v_pessoa, p_prefeitura)
  on conflict (pessoa_id) do update set prefeitura_id = excluded.prefeitura_id, atualizado_em = now();
  -- Auditoria só quando troca de prefeitura (o app regrava a cada requisição).
  if v_antes is distinct from p_prefeitura then
    insert into public.auditoria (prefeitura_id, usuario_id, acao, alvo_tabela, alvo_id, antes, depois)
    values (p_prefeitura, auth.uid(), 'parceira.atuar', 'parceira_contexto', v_pessoa::text,
            case when v_antes is null then null else jsonb_build_object('prefeitura_id', v_antes) end,
            jsonb_build_object('prefeitura_id', p_prefeitura));
  end if;
end $$;
revoke execute on function public.parceira_atuar(uuid) from public, anon;
grant execute on function public.parceira_atuar(uuid) to authenticated;

-- Dados mínimos da prefeitura em que a pessoa atua (no lugar de ler a linha de prefeituras).
create or replace function public.parceira_atuando()
returns table (id uuid, nome text, tipo text, limite_pdf_mb smallint, caixas_por_modulo smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nome, p.tipo, p.limite_pdf_mb, p.caixas_por_modulo
  from public.prefeituras p
  where p.id = app.parceira_contexto_atual()
$$;
revoke execute on function public.parceira_atuando() from public, anon;
grant execute on function public.parceira_atuando() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. prefeitura_atual: lógica de usuarios idêntica à de 20261108190000 + ramo da parceira
-- ---------------------------------------------------------------------------
create or replace function app.prefeitura_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select u.prefeitura_id
     from public.usuarios u
     where u.id = auth.uid()
       and u.ativo
       and not u.troca_senha_obrigatoria
       and (not u.administrador or app.segundo_fator_ok())
       and app.sessao_valida()),
    app.parceira_contexto_atual()
  )
$$;

-- ---------------------------------------------------------------------------
-- 5. secretarias_permitidas, pode_cadastrar, pode_etiquetar
-- ---------------------------------------------------------------------------
create or replace function app.secretarias_permitidas()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.secretarias s
  where s.prefeitura_id = app.prefeitura_atual()
    and (
      (select app.eh_admin())
      or exists (
        select 1 from public.vinculos v
        where v.secretaria_id = s.id and v.usuario_id = auth.uid()
      )
      or (s.ativa and app.parceira_atua())
    )
$$;

create or replace function app.pode_cadastrar(p_secretaria uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.secretarias s
    where s.id = p_secretaria
      and s.ativa
      and s.prefeitura_id = app.prefeitura_atual()
      and (
        app.eh_admin()
        or app.parceira_atua()
        or exists (
          select 1 from public.vinculos v
          where v.secretaria_id = s.id
            and v.usuario_id = auth.uid()
            and v.papel in ('operador', 'coordenador')
        )
      )
  )
$$;

create or replace function app.pode_etiquetar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.eh_admin() or app.parceira_atua() or exists (
    select 1 from public.vinculos v
    join public.secretarias s on s.id = v.secretaria_id
    where v.usuario_id = auth.uid()
      and v.papel in ('operador', 'coordenador')
      and s.ativa
      and v.prefeitura_id = app.prefeitura_atual()
  )
$$;

-- ---------------------------------------------------------------------------
-- 6. Estrutura física, planta e caixas: pode_administrar_acervo no lugar de eh_admin
-- ---------------------------------------------------------------------------
drop policy galpoes_inclui on public.galpoes;
create policy galpoes_inclui on public.galpoes for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()));
drop policy galpoes_altera on public.galpoes;
create policy galpoes_altera on public.galpoes for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())));

drop policy ruas_inclui on public.ruas;
create policy ruas_inclui on public.ruas for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()));
drop policy ruas_altera on public.ruas;
create policy ruas_altera on public.ruas for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())));

drop policy modulos_inclui on public.modulos;
create policy modulos_inclui on public.modulos for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()));
drop policy modulos_altera on public.modulos;
create policy modulos_altera on public.modulos for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()));

drop policy niveis_inclui on public.niveis;
create policy niveis_inclui on public.niveis for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()));
drop policy niveis_altera on public.niveis;
create policy niveis_altera on public.niveis for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()));

drop policy caixas_inclui on public.caixas;
create policy caixas_inclui on public.caixas for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())));
drop policy caixas_altera on public.caixas;
create policy caixas_altera on public.caixas for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())));

drop policy planta_elementos_inclui on public.planta_elementos;
create policy planta_elementos_inclui on public.planta_elementos for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())));
drop policy planta_elementos_altera on public.planta_elementos;
create policy planta_elementos_altera on public.planta_elementos for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and ((select app.pode_administrar_acervo()) or (select app.eh_coordenador())));

-- Gatilho da planta: quem administra o acervo muda qualquer coluna; o coordenador só as da planta.
create or replace function app.planta_confere()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_planta text[] := case tg_table_name
    when 'galpoes' then array['planta_largura', 'planta_profundidade', 'entrada_lado', 'entrada_posicao']
    else array['planta_x', 'planta_y', 'planta_giro']
  end;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;
  if (select app.pode_administrar_acervo()) then
    return new;
  end if;
  if to_jsonb(new) - v_planta is distinct from to_jsonb(old) - v_planta then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- 7. Temporalidade: classes (regras), modelos e termos de eliminação
-- ---------------------------------------------------------------------------
create or replace function app.pode_editar_classes(p_prefeitura uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.eh_equipe() or (app.pode_administrar_acervo() and p_prefeitura = app.prefeitura_atual())
$$;

drop policy modelos_termo_inclui on public.modelos_termo;
create policy modelos_termo_inclui on public.modelos_termo for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()));
drop policy modelos_termo_altera on public.modelos_termo;
create policy modelos_termo_altera on public.modelos_termo for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()))
  with check (prefeitura_id = (select app.prefeitura_atual()) and (select app.pode_administrar_acervo()));

-- Funções do termo: mesmo corpo de 20261122120000, só a checagem de papel muda.
create or replace function public.descarte_criar(p_secretaria uuid, p_documentos uuid[], p_observacao text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefeitura uuid := app.prefeitura_atual();
  v_ano smallint := extract(year from app.hoje())::smallint;
  v_id uuid;
  v_doc uuid;
  v_motivo text;
begin
  if v_prefeitura is null or not (app.eh_coordenador_de(p_secretaria) or app.pode_administrar_acervo()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if not exists (select 1 from public.secretarias s where s.id = p_secretaria and s.prefeitura_id = v_prefeitura) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if p_documentos is null or cardinality(p_documentos) not between 1 and 500 then
    raise exception 'escolha de 1 a 500 documentos' using errcode = 'LD002';
  end if;
  perform pg_advisory_xact_lock(hashtext('descarte:' || v_prefeitura::text));
  insert into public.descartes (prefeitura_id, secretaria_id, ano, numero, observacao)
  values (v_prefeitura, p_secretaria, v_ano,
          coalesce((select max(numero) from public.descartes where prefeitura_id = v_prefeitura and ano = v_ano), 0) + 1,
          nullif(trim(p_observacao), ''))
  returning id into v_id;
  for v_doc in select distinct unnest(p_documentos) loop
    if not exists (select 1 from public.documentos d where d.id = v_doc and d.secretaria_id = p_secretaria and d.prefeitura_id = v_prefeitura) then
      raise exception 'documento de outra secretaria' using errcode = 'LD002';
    end if;
    v_motivo := app.motivo_inelegivel(v_doc);
    if v_motivo is not null then
      raise exception 'documento não pode ser eliminado: %', v_motivo using errcode = 'LD001';
    end if;
    insert into public.descarte_itens (descarte_id, prefeitura_id, secretaria_id, documento_id)
    values (v_id, v_prefeitura, p_secretaria, v_doc);
  end loop;
  return v_id;
end
$$;

create or replace function public.descarte_publicar_edital(p_descarte uuid, p_data date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.descartes;
begin
  select * into d from public.descartes where id = p_descarte and prefeitura_id = app.prefeitura_atual();
  if not found or not (app.eh_coordenador_de(d.secretaria_id) or app.pode_administrar_acervo()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if d.situacao <> 'rascunho' then
    raise exception 'termo fora de rascunho' using errcode = 'LD003';
  end if;
  if p_data is null or p_data > app.hoje() or p_data < (d.gerado_em at time zone 'America/Sao_Paulo')::date then
    raise exception 'data do edital inválida' using errcode = 'LD004';
  end if;
  update public.descartes set situacao = 'em_ciencia', edital_publicado_em = p_data where id = d.id;
end
$$;

create or replace function public.descarte_aprovar(p_descarte uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.descartes;
  v_item record;
  v_motivo text;
begin
  select * into d from public.descartes where id = p_descarte and prefeitura_id = app.prefeitura_atual() for update;
  if not found or not app.pode_administrar_acervo() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if d.situacao <> 'em_ciencia' then
    raise exception 'termo sem edital de ciência' using errcode = 'LD003';
  end if;
  if auth.uid() = d.gerado_por then
    raise exception 'quem gerou o termo não o aprova' using errcode = 'LD005';
  end if;
  if app.hoje() < d.edital_publicado_em + 45 then
    raise exception 'prazo de ciência não cumprido' using errcode = 'LD006';
  end if;
  for v_item in select documento_id from public.descarte_itens where descarte_id = d.id and aberto loop
    v_motivo := app.motivo_inelegivel(v_item.documento_id, d.id);
    if v_motivo is not null then
      raise exception 'documento não pode ser eliminado: %', v_motivo using errcode = 'LD001';
    end if;
  end loop;
  perform set_config('app.descarte_aprovando', '1', true);
  update public.documentos set ativo = false
  where prefeitura_id = d.prefeitura_id
    and id in (select documento_id from public.descarte_itens where descarte_id = d.id and aberto);
  perform set_config('app.descarte_aprovando', '0', true);
  update public.descartes set situacao = 'aprovado', aprovado_por = auth.uid(), aprovado_em = now() where id = d.id;
end
$$;

create or replace function public.descarte_cancelar(p_descarte uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.descartes;
begin
  select * into d from public.descartes where id = p_descarte and prefeitura_id = app.prefeitura_atual() for update;
  if not found or not (app.eh_coordenador_de(d.secretaria_id) or app.pode_administrar_acervo()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if d.situacao not in ('rascunho', 'em_ciencia') then
    raise exception 'termo encerrado não muda' using errcode = 'LD009';
  end if;
  update public.descartes set situacao = 'cancelado', cancelado_em = now() where id = d.id;
  update public.descarte_itens set aberto = false where descarte_id = d.id;
end
$$;

-- O gatilho que guarda conferir/desativar documento aceita a parceira só dentro de descarte_aprovar
-- (a chave local app.descarte_aprovando só é ligada por essa função). Resto idêntico a 20261114120000.
create or replace function app.documento_conferir()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;
  if ((new.conferido_em is distinct from old.conferido_em and new.conferido_em is not null)
      or new.ativo is distinct from old.ativo)
     and not app.eh_coordenador_de(new.secretaria_id)
     and not (new.conferido_em is not distinct from old.conferido_em
              and coalesce(current_setting('app.descarte_aprovando', true), '') = '1'
              and app.pode_administrar_acervo()) then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if old.conferido_em is not null and new.conferido_em is not distinct from old.conferido_em
     and not app.eh_coordenador_de(new.secretaria_id)
     and to_jsonb(new) - array['atualizado_em','conferido_em','conferido_por','ativo','texto_busca']
         is distinct from to_jsonb(old) - array['atualizado_em','conferido_em','conferido_por','ativo','texto_busca'] then
    new.conferido_em := null;
  end if;
  if new.conferido_em is distinct from old.conferido_em then
    new.conferido_em := case when new.conferido_em is null then null else now() end;
    new.conferido_por := case when new.conferido_em is null then null else auth.uid() end;
  else
    new.conferido_por := old.conferido_por;
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- 8. Fechar à parceira: empréstimos e pedidos (leitura e escrita) e a linha de prefeituras
-- ---------------------------------------------------------------------------
create policy emprestimos_sem_parceira on public.emprestimos as restrictive for select to authenticated
  using (not (select app.parceira_atua()));
create policy pedidos_emprestimo_sem_parceira on public.pedidos_emprestimo as restrictive for select to authenticated
  using (not (select app.parceira_atua()));

create or replace function app.recusa_parceira()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.parceira_atua() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke execute on function app.recusa_parceira() from public, anon, authenticated;
create trigger a_emprestimos_sem_parceira before insert or update on public.emprestimos
  for each row execute function app.recusa_parceira();
create trigger a_pedidos_emprestimo_sem_parceira before insert or update on public.pedidos_emprestimo
  for each row execute function app.recusa_parceira();

drop policy prefeituras_le on public.prefeituras;
create policy prefeituras_le on public.prefeituras for select to authenticated
  using ((id = (select app.prefeitura_atual()) and not (select app.parceira_atua())) or (select app.eh_equipe()));
