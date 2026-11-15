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
insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, empresa, situacao)
select '5eed0000-0000-0000-0000-000000000001', sec.id, cx.id, 'licitacao', 'pregao_eletronico',
       lpad(g::text, 3, '0') || '/' || (2015 + g % 10), 2015 + g % 10,
       'Objeto fictício número ' || g, 'Empresa Fictícia ' || g, 'concluida'
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
insert into public.documentos (prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto, situacao)
select '5eed0000-0000-0000-0000-000000000002', sec.id, cx.id, 'licitacao', 'dispensa',
       lpad(g::text, 3, '0') || '/2024', 2024, 'Objeto fictício da prefeitura de teste ' || g, 'concluida'
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
