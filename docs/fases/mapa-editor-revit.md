# Mapa 3D — editor da planta ao estilo Revit

Status: implementado neste PR. Pedido do responsável: mudar a entrada do
galpão, lançar paredes, portas, janelas e pilares, e arrastar a ponta de uma
rua para mudar o tamanho dela.

## O que muda
- **Janela** vira tipo de elemento (`planta_elementos.tipo`). Migração
  `20261206120000_planta_janela.sql` só amplia o CHECK; RLS, GRANT e
  políticas da tabela não mudam. Teste pgTAP em `supabase/tests/mapa_isolamento.test.sql`.
- **Entrada**: arrastar o traço laranja até qualquer parede; lado e posição
  seguem o mouse e agarram na grade (`entradaPorPonto`).
- **Parede**: ferramenta Parede, pressionar-arrastar-soltar desenha uma reta
  na grade, com prévia (`paredeDesenhada`).
- **Porta e janela**: clique perto da parede externa encaixa no vão
  (`encaixarNaParede`); longe dela, avisa.
- **Pilar e área**: como antes.
- **Rua**: ao passar o mouse na ponta (direita, ou de baixo se girada) aparece
  a faixa laranja; arrastar mostra a prévia e, ao soltar, chama
  `ajustarModulosDaRua` (só administrador, grava na hora com auditoria; na
  demonstração avisa que nada foi salvo). Mínimo de 1 módulo.

## Fora do escopo
Zoom, menu lateral e layout fixo (outras sessões). Redimensionar pela ponta
inicial da rua (esquerda/cima) e pelas laterais compridas (largura da estante
continua em "Dois lados / Um lado").

## Testes
Vitest `mapa.test.ts` (contas do editor), pgTAP (tipo janela, tipo inválido,
galpão de outra prefeitura), Playwright de demonstração `tests/demo/mapa-demo.spec.ts`.
