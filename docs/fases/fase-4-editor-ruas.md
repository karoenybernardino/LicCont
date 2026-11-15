# Fase 4 · Editor da planta: ruas de um lado só, comprimento e rua nova

Pedido do responsável: ajustar a planta à realidade do galpão.

## O que entra
- **Lados da rua** (`ruas.planta_lados`, 1 ou 2; padrão 2): rua encostada na parede
  tem estante de um lado só, uma fileira de caixas e 1 célula de fundo. Vale no
  desenho 3D, na planta e na validação (parede e sobreposição). Salvo por
  `salvar_planta` junto com a posição; coordenador e administrador.
- **Comprimento da rua**: botões "−" e "+" no editor (só administrador). "+" usa
  `adicionar_modulos` copiando níveis e capacidade do último módulo; "−" desativa
  o último módulo (o banco recusa se houver caixa ativa: LC003).
- **Rua nova** pelo editor (só administrador): letra seguinte livre, já com módulos,
  níveis e caixas por nível. Entra na posição automática; a pessoa arrasta e escolhe os lados.

## O que não entra (e por quê)
- Remover rua inteira: já existe em Estrutura física (desativar).
- Tamanho do módulo em metros por rua: o módulo continua com 1 célula de largura; a
  célula vale "metros por célula" do galpão.

## Testes
- pgTAP: `planta_lados` só 1 ou 2; `salvar_planta` grava lados; valor fora recusado.
- Vitest: `tamanhoRua` com lados e caixas numa fileira só em qualquer giro.
- Estrutura (rua nova, módulos) grava pela sessão da pessoa; o RLS e os gatilhos de
  Estrutura física continuam valendo.
