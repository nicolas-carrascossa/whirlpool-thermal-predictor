/**
 * Textos de interface (pt-BR) para as 7 variáveis de configuração e as 7
 * áreas do produto. Redigidos pela equipe a partir do entendimento do domínio
 * e das hipóteses H1–H4 documentadas em `documents/documentacao.md`.
 *
 * Nenhum trecho aqui reproduz material confidencial do parceiro.
 */

export interface CopyEntry {
  label_pt: string
  help_pt: string
}

/** Chave = nome da coluna do dataset. */
export const VARIABLE_COPY: Record<string, CopyEntry> = {
  run_case: {
    label_pt: 'Modo de operação',
    help_pt:
      'Cenário de uso simulado, cada um com seus setpoints. Pyro: autolimpeza com o forno a 400 °C e o cooktop desligado. Broil C2: forno a 280 °C com o cooktop ligado, chapa a 246 °C e duas panelas a 110 °C. Broil Qualitative: forno a 280 °C com o cooktop ligado e quatro panelas a 110 °C. Broil C1: forno a 280 °C com o cooktop desligado, três panelas e uma chapa. Na média dos sensores, os modos Broil operam por volta de 83 °C contra cerca de 71 °C do Pyro (H3): o forno mais quente do Pyro não compensa o calor que o cooktop ligado injeta na região da eletrônica.',
  },
  blower_direction: {
    label_pt: 'Direção do blower',
    help_pt:
      'Sentido em que o ventilador de resfriamento empurra o ar dentro do produto. "To front" sopra em direção à frente do console, aliviando os botões do cooktop e a interface do forno; "To back" empurra o ar para o fundo, o que desloca o calor para o painel traseiro. É uma escolha de qual região proteger, não de quanto calor existe no total.',
  },
  housing: {
    label_pt: 'Carcaça da eletrônica',
    help_pt:
      'Estado da carcaça que envolve a eletrônica de potência: fechada, aberta, ou "Open - Updated" (geometria aberta revisada). Contra a intuição, a carcaça aberta deixa o sensor IGBT 1 mais quente que a fechada — cerca de 9,6 °C acima na base analisada (H4) — porque abrir a carcaça redireciona o fluxo de ar em vez de simplesmente liberar calor.',
  },
  deflector_hole: {
    label_pt: 'Furo do defletor',
    help_pt:
      'Furo no defletor de ar, aberto ou fechado. Abri-lo redistribui o fluxo entre a região do console/IPC e o sistema de ventilação principal: uma área esfria enquanto a outra esquenta (H1). O calor total do produto não diminui, apenas muda de endereço — a decisão é qual área você prefere proteger.',
  },
  material_coil_support: {
    label_pt: 'Material do suporte da resistência',
    help_pt:
      'Material da peça que sustenta a resistência: alumínio, chapa de alumínio ou plástico. O material muda a condução de calor para os componentes vizinhos — o plástico isola e faz a própria região da resistência trabalhar mais quente, enquanto a chapa de alumínio espalha melhor o calor.',
  },
  losses: {
    label_pt: 'Perfil de perdas',
    help_pt:
      'Perfil de dissipação térmica (em W) assumido na simulação, calculado por analistas diferentes e para ordens de montagem diferentes. Os modelos treinados USAM esta variável e, em "Resfriamento da eletrônica" e "Compartimento da eletrônica de potência", ela é a de maior importância. Leia esse peso com cautela: no conjunto de 56 ensaios cada categoria de perdas corresponde a um único valor de "Furo do defletor" (H2), então parte do efeito atribuído a ela pode na verdade ser do defletor.',
  },
  board_position: {
    label_pt: 'Posição da placa',
    help_pt:
      'Posição da placa eletrônica no produto (centro ou direita). Os modelos treinados USAM esta variável, com peso baixo na maioria das áreas e maior em "Painel traseiro". No desenho dos ensaios ela está confundida com as demais (H2): não existe par de ensaios que a isole, então o efeito medido pode ser de outras mudanças que variaram junto com ela.',
  },
}

/** Chave = valor de `key_area` no dataset. */
export const KEY_AREA_COPY: Record<string, CopyEntry> = {
  Mainback: {
    label_pt: 'Mainback',
    help_pt:
      'Região do painel traseiro do fogão, onde ficam componentes como a trava da porta e o motor de convecção. Recebe boa parte do calor quando o blower sopra para trás.',
  },
  'Coil Temps': {
    label_pt: 'Coil Temps',
    help_pt:
      'Sensores nas resistências e no seu suporte. É a área mais quente do produto e a mais sensível ao material do suporte da resistência.',
  },
  'Main Vent Sys': {
    label_pt: 'Main Vent Sys',
    help_pt:
      'Sistema de ventilação principal, por onde o ar quente deixa o produto. Aparece com frequência como a área que recebe o calor retirado das outras quando uma configuração muda (H1).',
  },
  'IPC Comp': {
    label_pt: 'IPC Comp',
    help_pt:
      'Compartimento que abriga a eletrônica de potência (IGBTs, placa de controle). Concentra a maior parte das leituras da base e é a área mais afetada pelo estado da carcaça.',
  },
  'IPC Cooling': {
    label_pt: 'IPC Cooling',
    help_pt:
      'Caminho de resfriamento da eletrônica de potência: dutos, saídas de ar e o blower que serve o compartimento. Responde diretamente à direção do blower e ao furo do defletor.',
  },
  'Oven HMI': {
    label_pt: 'Oven HMI',
    help_pt:
      'Interface de usuário do forno (display e comandos). Área de contato com o usuário, com limites relativamente baixos apesar de temperaturas moderadas.',
  },
  'CT Knobs': {
    label_pt: 'CT Knobs',
    help_pt:
      'Botões e hastes de comando do cooktop. É a região mais fria do produto, mas também de contato direto com o usuário, o que a torna crítica em conforto e segurança.',
  },
}
