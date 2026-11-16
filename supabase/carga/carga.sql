-- Teste de carga: dados fictícios no banco LOCAL do CI (supabase db start).
-- Nunca rodar contra produção. Uso: psql "$DB_URL" -v ON_ERROR_STOP=1 -f carga.sql
-- 4 prefeituras x 25 mil documentos = 100 mil, com secretarias, estrutura,
-- caixas, arquivos e, em parte dos documentos, texto de OCR longo.
-- Textos de OCR por prefeitura: padrão 250; o workflow pode trocar (-v ocr_por_prefeitura=N).
\if :{?ocr_por_prefeitura}
\else
\set ocr_por_prefeitura 250
\endif
\timing on

begin;
update app.configuracao set segundo_fator_obrigatorio = true;

-- Prefeituras 1..4 com ids fixos (md5 vira uuid), 8 secretarias cada.
create temp table pref as
select p, md5('carga-pref-' || p)::uuid as id from generate_series(1, 4) p;

insert into public.prefeituras (id, nome, cnpj, status)
select id, 'Prefeitura Fictícia de Carga ' || p, lpad((90000000 + p)::text, 12, '0') || '01', 'ativa' from pref;

insert into public.secretarias (id, prefeitura_id, nome)
select md5('carga-sec-' || p || '-' || s)::uuid, id,
       (array['Saúde', 'Educação', 'Obras', 'Administração', 'Fazenda', 'Assistência Social', 'Meio Ambiente', 'Cultura'])[s]
from pref, generate_series(1, 8) s;

-- Um administrador por prefeitura (mede como quem enxerga tudo da prefeitura).
insert into auth.users (id, email)
select md5('carga-user-' || p)::uuid, 'admin.carga' || p || '@exemplo.test' from pref;
insert into auth.sessions (id, user_id)
select md5('carga-sessao-' || p)::uuid, md5('carga-user-' || p)::uuid from pref;
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria)
select md5('carga-user-' || p)::uuid, id, 'Admin Carga ' || p, true, false from pref;

-- Estrutura: 1 galpão, 4 ruas, 10 módulos por rua, 5 níveis, 4 caixas por nível
-- = 800 caixas por prefeitura (capacidade 50 documentos cada).
insert into public.galpoes (id, prefeitura_id, nome)
select md5('carga-galpao-' || p)::uuid, id, 'Galpão Carga ' || p from pref;
insert into public.ruas (id, prefeitura_id, galpao_id, codigo)
select md5('carga-rua-' || p || '-' || r)::uuid, id, md5('carga-galpao-' || p)::uuid, chr(64 + r)
from pref, generate_series(1, 4) r;
insert into public.modulos (id, prefeitura_id, rua_id, numero)
select md5('carga-mod-' || p || '-' || r || '-' || m)::uuid, id, md5('carga-rua-' || p || '-' || r)::uuid, m
from pref, generate_series(1, 4) r, generate_series(1, 10) m;
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade)
select md5('carga-niv-' || p || '-' || r || '-' || m || '-' || n)::uuid, id,
       md5('carga-mod-' || p || '-' || r || '-' || m)::uuid, n, 4
from pref, generate_series(1, 4) r, generate_series(1, 10) m, generate_series(1, 5) n;
insert into public.caixas (id, prefeitura_id, nivel_id, numero, capacidade_documentos)
select md5('carga-cx-' || p || '-' || r || '-' || m || '-' || n || '-' || c)::uuid, id,
       md5('carga-niv-' || p || '-' || r || '-' || m || '-' || n)::uuid, c, 50
from pref, generate_series(1, 4) r, generate_series(1, 10) m, generate_series(1, 5) n, generate_series(1, 4) c;

-- 25 mil documentos por prefeitura: 70% licitação, 30% contrato; anos 2000..2025;
-- criados ao longo de 5 anos; ~1% com "pavimentação" no objeto.
create temp table cx as
select prefeitura_id, id, row_number() over (partition by prefeitura_id order by id) - 1 as k
from public.caixas where prefeitura_id in (select id from pref);

insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano,
  objeto, empresa, cnpj, valor, situacao, vigencia_inicio, vigencia_fim, criado_em)
select pr.id,
       md5('carga-sec-' || pr.p || '-' || (1 + g % 8))::uuid,
       cx.id,
       case when g % 10 < 7 then 'licitacao' else 'contrato' end,
       case when g % 10 < 7 then (array['pregao_eletronico', 'concorrencia', 'dispensa', 'inexigibilidade', 'pregao_presencial'])[1 + g % 5] end,
       lpad(g::text, 5, '0') || '/' || (2000 + g % 26),
       2000 + g % 26,
       (array['Aquisição de', 'Contratação de', 'Prestação de serviços de', 'Fornecimento de', 'Locação de'])[1 + g % 5] || ' ' ||
       (array['material de consumo', 'medicamentos', 'merenda escolar', 'combustível', 'material de limpeza',
              'equipamentos de informática', 'transporte escolar', 'manutenção predial', 'material gráfico', 'serviços de saúde'])[1 + (g / 5) % 10] ||
       case when g % 97 = 0 then ' e pavimentação de vias' else '' end || ' nº ' || g,
       'Empresa Fictícia ' || (g % 700) || ' Ltda',
       case when g % 3 = 0 then lpad((10000000 + g % 700)::text, 12, '0') || '01' end,
       case when g % 10 >= 7 then round((1000 + (g * 7919) % 2000000)::numeric, 2) end,
       case when g % 10 < 7 then 'concluida' else (array['vigente', 'encerrado', 'rescindido'])[1 + g % 3] end,
       case when g % 10 >= 7 then date '2020-01-01' + (g % 1800) end,
       case when g % 10 >= 7 then date '2020-01-01' + (g % 1800) + 365 end,
       now() - make_interval(mins => (g * 7) % (5 * 365 * 24 * 60))
from pref pr, generate_series(1, 25000) g
join cx on true
where cx.prefeitura_id = pr.id and cx.k = g % 800;

-- Um PDF por documento em 80% deles, já conferido e ativo.
insert into public.arquivos (prefeitura_id, secretaria_id, documento_id, nome_original, tamanho, paginas, enviado_por)
select d.prefeitura_id, d.secretaria_id, d.id, 'processo.pdf', 2000000, 120, u.id
from public.documentos d
join public.usuarios u on u.prefeitura_id = d.prefeitura_id
where d.prefeitura_id in (select id from pref) and abs(hashtext(d.id::text)) % 10 < 8;
update public.arquivos set situacao = 'pronto', ativo = true, conferido_em = now()
where prefeitura_id in (select id from pref);

-- Texto de OCR: 250 documentos por prefeitura, 100 a 300 páginas de ~1000
-- caracteres (o teto da tabela é 300 mil caracteres). Páginas sorteadas de um
-- banco de 3 mil páginas com vocabulário de licitação e "ruído" de OCR
-- (fragmentos hexadecimais), para o índice de trigramas não ficar artificialmente
-- pequeno. 1 em cada 10 textos tem "hidrômetro" (palavra que não está em objeto).
create temp table vocab as
select row_number() over () as i, w from unnest(string_to_array(
  'contrato licitação pregão eletrônico proposta preço unitário global empresa vencedora objeto edital ' ||
  'cláusula vigência prorrogação aditivo reajuste garantia fiscal gestor fiscalização pagamento nota ' ||
  'empenho dotação orçamentária secretaria municipal prefeitura processo administrativo parecer jurídico ' ||
  'homologação adjudicação recurso impugnação habilitação inabilitação certidão regularidade trabalhista ' ||
  'previdenciária FGTS INSS atestado capacidade técnica balanço patrimonial índice liquidez sessão pública ' ||
  'pregoeiro equipe apoio lance desconto item lote quantidade unidade especificação marca modelo prazo ' ||
  'entrega recebimento provisório definitivo termo referência projeto básico planilha custos BDI medição ' ||
  'serviço obra engenharia material consumo permanente patrimônio almoxarifado requisição ordem fornecimento ' ||
  'penalidade multa advertência suspensão rescisão unilateral amigável publicação diário oficial extrato ' ||
  'ata registro preços adesão carona órgão gerenciador participante município estado união recurso ' ||
  'próprio convênio transferência voluntária prestação contas tribunal controle interno externo auditoria ' ||
  'responsável assinatura testemunha representante legal procurador CNPJ inscrição estadual endereço ' ||
  'bairro centro rua avenida número telefone valor total reais centavos mil cento duzentos trezentos', ' ')) w;

create temp table paginas as
select pg, string_agg(case when k % 15 = 0 then substr(md5(pg::text || '-' || k), 1, 6)
                           else (select w from vocab where i = 1 + (abs(hashtext(pg || ':' || k)) % (select count(*) from vocab))) end,
                      ' ' order by k) as t
from generate_series(1, 3000) pg, generate_series(1, 130) k
group by pg;

create temp table alvo as
select d.id as documento_id, d.prefeitura_id, d.secretaria_id, a.id as arquivo_id, a.enviado_por,
       100 + abs(hashtext('pags' || d.id)) % 201 as paginas,
       row_number() over (partition by d.prefeitura_id order by d.id) as n
from public.documentos d
join public.arquivos a on a.documento_id = d.id and a.ativo
where d.prefeitura_id in (select id from pref);
delete from alvo where n > :ocr_por_prefeitura;

insert into public.arquivo_textos (arquivo_id, prefeitura_id, secretaria_id, documento_id, texto, paginas_lidas, criado_por)
select al.arquivo_id, al.prefeitura_id, al.secretaria_id, al.documento_id,
       left(case when al.n % 10 = 0 then 'Leitura do hidrômetro do prédio da secretaria. ' else '' end ||
            (select string_agg(pa.t, E'\n\n' order by s)
             from generate_series(1, al.paginas) s
             join paginas pa on pa.pg = 1 + abs(hashtext(al.documento_id::text || s)) % 3000), 300000),
       al.paginas, al.enviado_por
from alvo al;

commit;

vacuum analyze public.documentos;
vacuum analyze public.arquivos;
vacuum analyze public.arquivo_textos;
vacuum analyze public.caixas;
