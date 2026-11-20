-- Dados fictícios para desenvolvimento e testes.
-- Nunca coloque aqui dado real de prefeitura, servidor ou empresa.
-- CNPJs inválidos de propósito (só zeros e dígito final).
-- Usuários de teste entram na tarefa de login (Fase 1, tarefa 4).

insert into public.prefeituras (id, nome, cnpj, status) values
  ('5eed0000-0000-0000-0000-000000000001', 'Prefeitura Fictícia de Exemplo', '00000000000809', 'ativa'),
  ('5eed0000-0000-0000-0000-000000000002', 'Prefeitura Fictícia de Teste', '00000000000990', 'ativa');

insert into public.secretarias (prefeitura_id, nome) values
  ('5eed0000-0000-0000-0000-000000000001', 'Saúde'),
  ('5eed0000-0000-0000-0000-000000000001', 'Educação'),
  ('5eed0000-0000-0000-0000-000000000001', 'Administração'),
  ('5eed0000-0000-0000-0000-000000000001', 'Obras'),
  ('5eed0000-0000-0000-0000-000000000002', 'Saúde'),
  ('5eed0000-0000-0000-0000-000000000002', 'Educação');

-- Local e CI: segundo fator obrigatório, como será no piloto (a produção
-- está com ele desligado por decisão do responsável; ver migração 20261108190000).
update app.configuracao set segundo_fator_obrigatorio = true;

-- Estrutura física fictícia (Fase 2): um galpão por prefeitura de teste.
insert into public.galpoes (id, prefeitura_id, nome) values
  ('5eed1000-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000001', 'Galpão Central'),
  ('5eed1000-0000-0000-0000-000000000002', '5eed0000-0000-0000-0000-000000000002', 'Galpão Central');
insert into public.ruas (id, prefeitura_id, galpao_id, codigo) values
  ('5eed2000-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000001', '5eed1000-0000-0000-0000-000000000001', 'A'),
  ('5eed2000-0000-0000-0000-000000000002', '5eed0000-0000-0000-0000-000000000001', '5eed1000-0000-0000-0000-000000000001', 'B'),
  ('5eed2000-0000-0000-0000-000000000003', '5eed0000-0000-0000-0000-000000000002', '5eed1000-0000-0000-0000-000000000002', 'A');
select public.adicionar_modulos('5eed2000-0000-0000-0000-000000000001', 2, 3, 4);
select public.adicionar_modulos('5eed2000-0000-0000-0000-000000000002', 1, 2, 4);
select public.adicionar_modulos('5eed2000-0000-0000-0000-000000000003', 1, 2, 4);
-- Duas caixas em cada nível da Rua A da prefeitura de exemplo.
select public.adicionar_caixas(n.id, 2)
from public.niveis n join public.modulos m on m.id = n.modulo_id
where m.rua_id = '5eed2000-0000-0000-0000-000000000001';

-- Documentos fictícios (Fase 3): 30 na prefeitura de exemplo (Rua A, todas as
-- secretarias) e 6 na de teste, só para provar o isolamento. Nada é real.
with sec as (
  select id, row_number() over (order by nome) as rn from public.secretarias
  where prefeitura_id = '5eed0000-0000-0000-0000-000000000001'
), cx as (
  select c.id, row_number() over (order by c.id) as rn
  from public.caixas c join public.niveis n on n.id = c.nivel_id join public.modulos m on m.id = n.modulo_id
  where m.rua_id = '5eed2000-0000-0000-0000-000000000001'
)
insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto)
select '5eed0000-0000-0000-0000-000000000001', sec.id, cx.id, 'licitacao', 'pregao_eletronico',
       lpad(g::text, 3, '0') || '/' || (2015 + g % 10), 2015 + g % 10,
       'Objeto fictício número ' || g
from generate_series(1, 30) g
join sec on sec.rn = 1 + g % 4
join cx on cx.rn = 1 + g % (select count(*) from cx);

with sec as (
  select id, row_number() over (order by nome) as rn from public.secretarias
  where prefeitura_id = '5eed0000-0000-0000-0000-000000000002'
), cx as (
  select c.id, row_number() over (order by c.id) as rn
  from public.caixas c join public.niveis n on n.id = c.nivel_id join public.modulos m on m.id = n.modulo_id
  where m.rua_id = '5eed2000-0000-0000-0000-000000000003'
)
insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto)
select '5eed0000-0000-0000-0000-000000000002', sec.id, cx.id, 'licitacao', 'dispensa',
       lpad(g::text, 3, '0') || '/2024', 2024, 'Objeto fictício da prefeitura de teste ' || g
from generate_series(1, 6) g
join sec on sec.rn = 1 + g % 2
join cx on cx.rn = 1 + g % (select count(*) from cx);

-- Planta fictícia (Fase 4), em metros (módulo de 1,20 m): galpão de 16,8 x 9,6 m,
-- entrada na frente, duas ruas posicionadas, um pilar e uma porta lateral.
update public.galpoes set planta_largura = 16.8, planta_profundidade = 9.6,
  entrada_lado = 'frente', entrada_posicao = 2.4
where id = '5eed1000-0000-0000-0000-000000000001';
update public.ruas set planta_x = 2.4, planta_y = 1.2, planta_giro = 0
where id = '5eed2000-0000-0000-0000-000000000001';
update public.ruas set planta_x = 2.4, planta_y = 4.8, planta_giro = 0
where id = '5eed2000-0000-0000-0000-000000000002';
insert into public.planta_elementos (prefeitura_id, galpao_id, tipo, rotulo, x, y, largura, profundidade) values
  ('5eed0000-0000-0000-0000-000000000001', '5eed1000-0000-0000-0000-000000000001', 'pilar', null, 9.6, 3.6, 1.2, 1.2),
  ('5eed0000-0000-0000-0000-000000000001', '5eed1000-0000-0000-0000-000000000001', 'porta', 'Porta lateral', 15.6, 4.8, 1.2, 2.4);

-- Classificação documental e etiquetas (fictícias): os sete grupos já nascem com a prefeitura.
-- Classes (prazo fixo, conta do fim do ano do documento): duas de licitações e contratos, uma administrativa e uma de RH.
insert into public.classes_documentais (prefeitura_id, grupo_id, codigo, nome, prazo_corrente_anos, tipo_prazo, destinacao)
select g.prefeitura_id, g.id, x.codigo, x.nome, x.anos, x.tipo_prazo, 'eliminacao'
from public.grupos_documentais g
join (values
  ('licitacoes_contratos', '031', 'Licitações e Contratos', 12, 'fixo'),
  ('licitacoes_contratos', '035', 'Dispensas e inexigibilidades', 5, 'fixo'),
  ('administrativo', '010', 'Ofícios e memorandos', 2, 'fixo'),
  ('rh', '060', 'Fichas funcionais', 50, 'fixo')
) as x(chave, codigo, nome, anos, tipo_prazo) on x.chave = g.chave
where g.prefeitura_id in ('5eed0000-0000-0000-0000-000000000001', '5eed0000-0000-0000-0000-000000000002');

-- Os documentos fictícios de licitação ficam na classe 031.
update public.documentos d set
  classe_id = (select c.id from public.classes_documentais c where c.prefeitura_id = d.prefeitura_id and c.codigo = '031')
where d.classe_id is null;

-- Uma caixa com mais de 4 itens (a etiqueta mostra 4 e a linha "+ N itens") e volume 1/2.
update public.documentos set caixa_id = (
  select id from public.caixas where prefeitura_id = '5eed0000-0000-0000-0000-000000000001' order by sequencial limit 1)
where prefeitura_id = '5eed0000-0000-0000-0000-000000000001' and numero in ('001/2016', '002/2017', '003/2018', '004/2019', '005/2020', '006/2021', '007/2022');
update public.caixas set volume = 1, volumes_total = 2
where id = (select id from public.caixas where prefeitura_id = '5eed0000-0000-0000-0000-000000000001' order by sequencial limit 1);

-- Um documento de RH (grupo restrito: só o administrador vê) e uma observação que sai na etiqueta.
insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, numero, ano, objeto, classe_id)
select '5eed0000-0000-0000-0000-000000000001', s.id, c.id, 'outro', '001', 2010, 'Ficha funcional fictícia',
       (select id from public.classes_documentais where prefeitura_id = '5eed0000-0000-0000-0000-000000000001' and codigo = '060')
from (select id from public.secretarias where prefeitura_id = '5eed0000-0000-0000-0000-000000000001' and nome = 'Administração') s,
     (select id from public.caixas where prefeitura_id = '5eed0000-0000-0000-0000-000000000001' order by sequencial limit 1 offset 1) c;
update public.documentos set observacao = 'Falta o termo aditivo'
where prefeitura_id = '5eed0000-0000-0000-0000-000000000001' and numero = '001/2016';

-- Empresa parceira fictícia, ligada à prefeitura de exemplo (sem logo: a etiqueta sai sem o espaço dela).
insert into public.parceiras (id, nome, cnpj) values ('5eed3000-0000-0000-0000-000000000001', 'Empresa Parceira Fictícia', '00000000000100');
update public.prefeituras set parceira_id = '5eed3000-0000-0000-0000-000000000001', nome_etiqueta = 'Prefeitura de Exemplo'
where id = '5eed0000-0000-0000-0000-000000000001';
