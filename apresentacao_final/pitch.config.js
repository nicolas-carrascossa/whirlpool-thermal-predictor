/*
 * Pitch final — Thermal Predictor (equipe FOG)
 * =============================================
 * A apresentação é um deck de páginas: cada item de `paginas` é um slide.
 * Tudo o que aparece na tela e nas notas sai daqui; o layout fica no index.html.
 * Fontes do conteúdo: roteiro.md, ideias_apresentacao.md, ideias.md e o PDF do
 * kickoff, todos nesta pasta.
 *
 * Campos de cada página
 * - `secao` / `secaoNome`: a seção do roteiro. Trocar de seção abre a cortina de
 *   calor com o número e o nome do capítulo; dentro da mesma seção, a página nova
 *   entra como cortina lateral.
 * - `tipo`: o layout (não troque sem trocar o `conteudo`).
 * - `segundos`: tempo planejado de fala. A soma deve dar `duracaoSegundos`.
 * - `calor`: de 0 (azul) a 1 (vermelho) na escala do mapa de calor. É a cor de
 *   acento da página e, na primeira página de cada seção, a cor da cortina.
 *   Paradas: 0 azul · 0,35 âmbar · 0,68 laranja · 1 vermelho.
 * - `fundo`: 'claro' ou 'escuro'.
 * - `transicao` (opcional): 'nevoa' ou 'subida' força uma entrada especial.
 * - Algumas páginas têm passos: a seta avança dentro da página antes de trocar
 *   de página (tensão, mapa, confiabilidade, virada).
 * - `ativa: false` tira a página do deck.
 * - `notas`: a fala; [entre colchetes] = indicação de palco.
 * - Em títulos, *entre asteriscos* = destaque na cor de calor.
 *
 * Atalhos
 *   → ↓ Espaço PageDown  avança      ← ↑ PageUp  volta      Home/End  início/fim
 *   1–6  vai ao início da seção       T cronômetro    R zera    P notas nesta tela
 *   J    console do apresentador em outra janela (2º monitor)    F tela cheia   ? ajuda
 *   A roda do mouse e o gesto de deslizar também passam as páginas.
 */
window.PITCH_CONFIG = {
  meta: {
    produto: 'Thermal Predictor',
    equipe: 'FOG',
    parceria: 'Inteli × Whirlpool',
    ano: '2026',
  },

  apresentacao: {
    duracaoSegundos: 300,
    titulos: 'serifa', // 'serifa' (Cormorant, como o White Desert) ou 'inter' (tudo em Inter Tight)
    barraDeTempo: true,
    cronometroAutomatico: true,
    toleranciaDeRitmoSegundos: 8,
    rodaDoMouse: true,
    animacoes: true, // respeita "reduzir movimento" do sistema
    movimentoDoFogao: 'balanco', // 'balanco' (vai e volta) ou 'volta' (giro completo)
    balancoGraus: 36, // amplitude do balanço em torno da vista 3/4 do mapa (até 58)
    periodoSegundos: 14,
    painelDoApresentadorAberto: false,
  },

  marca: {
    logoProduto: 'assets/tp.png',
  },

  sequencias: {
    // quadros renderizados pelo próprio mapa 3D do Thermal Predictor
    balanco: { pasta: 'assets/balanco', quadros: 60, grausPorQuadro: 2 },
    giro: { pasta: 'assets/giro', quadros: 60 },
    desmontagem: { pasta: 'assets/desmontagem', quadros: 21, raioX: 'assets/desmontagem/raio-x.webp' },
  },

  paginas: [
    {
      id: 'abertura',
      secao: 1,
      secaoNome: 'Introdução',
      tipo: 'calor',
      fundo: 'claro',
      calor: 0,
      segundos: 12,
      notas:
        '[Os queimadores acendem um a um.] No desenvolvimento de um novo fogão, uma mudança de arquitetura pode exigir uma nova simulação CFD e, em etapas críticas, novos protótipos e testes físicos. Isso significa tempo, custo e uso de recursos especializados antes mesmo de saber se aquela configuração é termicamente viável. [transição] Para entender o valor da nossa solução, primeiro precisamos entender onde está esse gargalo.',
      conteudo: {
        titulo: 'E se fosse possível prever o comportamento térmico de um fogão *antes de construir um novo protótipo?*',
      },
    },
    {
      id: 'problema',
      secao: 2,
      secaoNome: 'Problema',
      tipo: 'fluxo',
      fundo: 'claro',
      calor: 0.85,
      segundos: 13,
      notas:
        'Validar termicamente uma nova configuração depende de ciclos que envolvem simulações CFD, capacidade computacional e profissionais especializados. Determinadas decisões ainda precisam de protótipos e testes físicos. [aponte para a volta] Quanto mais configurações a engenharia deseja comparar, mais esse processo precisa se repetir.',
      conteudo: {
        titulo: 'Testar cada alternativa leva um *longo processo.*',
        etapas: ['Nova configuração', 'CFD', 'Análise', 'Protótipo e teste', 'Decisão'],
        retorno: 'a cada nova alternativa, o ciclo recomeça',
      },
    },
    {
      id: 'custo',
      secao: 2,
      secaoNome: 'Problema',
      tipo: 'custo',
      fundo: 'claro',
      calor: 1,
      segundos: 14,
      notas:
        'E simular custa caro. Mesmo em ferramentas de entrada, a capacidade de simulação representa milhares de dólares por usuário, por ano. Em ambientes industriais, uma única sessão adicional de CFD passa de 19 mil dólares por ano, sem contar infraestrutura e horas de engenharia. [Ansys Fluent e COMSOL não publicam preço: sob cotação.] [pausa] Então a engenharia precisa escolher: qual combinação vale testar?',
      conteudo: {
        titulo: 'Simular é caro. *Qual combinação testar?*',
        itens: [
          { valor: 2145, ferramenta: 'Autodesk Fusion + Simulation', unidade: 'por usuário, por ano' },
          { valor: 10260, ferramenta: 'SOLIDWORKS Simulation CFD Engineer', unidade: 'por usuário, por ano' },
          { valor: 19705, ferramenta: 'Simcenter STAR-CCM+', unidade: 'por ano, uma sessão extra de 1 núcleo' },
        ],
        nota: 'Preços públicos de referência, sem HPC, malha nem horas de especialista.',
      },
    },
    {
      id: 'tensao',
      secao: 2,
      secaoNome: 'Problema',
      tipo: 'tensao',
      fundo: 'claro',
      calor: 0.85,
      segundos: 15,
      notas:
        '[Curva apresentada no kickoff da Divisão de Fogões.] Para a Whirlpool, velocidade é competitividade: o mercado pede renovação constante de arquiteturas, sob pressão de margem e de concorrência. E quanto mais tarde uma decisão de projeto acontece, mais cara fica qualquer mudança. [aponte para "hoje"] Hoje, a evidência térmica chega tarde, na fase de testes e protótipos. [avance] O Thermal Predictor leva essa evidência para o começo do projeto, onde mudar ainda é barato.',
      conteudo: {
        titulo: 'Quanto mais tarde a decisão, *mais cara a mudança.*',
        fases: ['Definição / Escopo', 'Desenvolvimento (CAD)', 'Testes & Protótipos', 'Produção (SOP)'],
        curvas: { custo: 'Custo de alteração no projeto', liberdade: 'Liberdade de design' },
        hoje: 'Hoje, a evidência térmica chega aqui',
        depois: 'Com o Thermal Predictor, aqui',
      },
    },
    {
      id: 'decisoes',
      secao: 2,
      secaoNome: 'Problema',
      tipo: 'decisoes',
      fundo: 'claro',
      calor: 0.6,
      segundos: 25,
      notas:
        'O Thermal Predictor pode apoiar diferentes profissionais. A equipe de Produtos precisa comparar arquiteturas antes de congelar o design. Materiais precisa entender se determinado componente suporta a temperatura esperada. E Qualidade precisa identificar configurações de maior risco que justificam uma validação mais completa. [pausa] Apesar de decisões diferentes, todos precisam da mesma coisa: informação térmica confiável mais cedo no processo. [transição] E é essa informação que o tempo de espera de hoje atrasa.',
      conteudo: {
        titulo: 'Uma previsão tardia *trava várias decisões.*',
        decisoes: [
          { area: 'Produtos', pergunta: 'Qual arquitetura devemos seguir?' },
          { area: 'Materiais', pergunta: 'Esse componente suporta a temperatura?' },
          { area: 'Qualidade', pergunta: 'Quais casos realmente precisam de validação completa?' },
        ],
      },
    },
    {
      id: 'lead-time',
      secao: 2,
      secaoNome: 'Problema',
      tipo: 'mapa',
      fundo: 'escuro',
      calor: 0.68,
      transicao: 'subida',
      segundos: 18,
      notas:
        'E há o tempo. [aponte para a partida] Hoje, resultados térmicos definitivos levam de semanas a meses, e um assessment térmico leva cerca de três semanas. [avance: a rota se desenha] A meta da Divisão de Fogões é chegar a menos de um dia. Nosso desafio era usar os dados históricos da Whirlpool para encurtar esse caminho. [transição] Foi a partir desse problema da Divisão de Fogões que desenvolvemos o Thermal Predictor.',
      conteudo: {
        titulo: 'De onde partimos, *aonde queremos chegar.*',
        partida: { rotulo: 'Ponto de partida', local: 'Hoje · CFD e protótipo', imagem: 'assets/fogao-destruido.webp', reserva: 'assets/balanco/30.webp' },
        destino: { rotulo: 'Destino', local: 'Assessment em menos de 1 dia', imagem: 'assets/tela-resultados.webp' },
        dados: [
          { rotulo: 'Resultados térmicos definitivos', valor: 'Semanas a meses' },
          { rotulo: 'Assessment térmico hoje', valor: '3 semanas' },
          { rotulo: 'Meta da Divisão de Fogões', valor: '< 1 dia', destino: true },
        ],
      },
    },
    {
      id: 'thermal-predictor',
      secao: 3,
      secaoNome: 'Solução',
      tipo: 'marca',
      fundo: 'claro',
      calor: 0,
      transicao: 'nevoa',
      segundos: 13,
      notas:
        'Este é o Thermal Predictor. [transição] Vamos ver como ele funciona.',
      conteudo: {
        logo: 'assets/logoWhirlpool.png',
        alt: 'Whirlpool · Thermal Predictor',
      },
    },
    {
      id: 'solucao',
      secao: 3,
      secaoNome: 'Solução',
      tipo: 'solucao',
      fundo: 'claro',
      calor: 0.35,
      segundos: 22,
      notas:
        'O Thermal Predictor é um sistema baseado em Machine Learning que aprende com o histórico de simulações térmicas da Whirlpool. O engenheiro informa características da configuração do fogão, como direção do fluxo de ar, housing, posição de componentes e materiais utilizados. [o fogão se abre] A partir dessas informações, o sistema estima as temperaturas nas sete regiões térmicas monitoradas. Como cada região tem um comportamento térmico próprio, são sete modelos: Gradient Boosting em quatro regiões e Random Forest em três.',
      conteudo: {
        titulo: 'Da configuração à previsão *em segundos.*',
        etapas: ['Configuração do fogão', 'Thermal Predictor', 'Temperatura + margem de erro + confiabilidade', 'Decisão'],
      },
    },
    {
      id: 'dashboard',
      secao: 3,
      secaoNome: 'Solução',
      tipo: 'dashboard',
      fundo: 'claro',
      calor: 0.45,
      segundos: 24,
      notas:
        'Essas previsões chegam num dashboard: o veredito por área, o mapa térmico 3D e o histórico de consultas, que organiza e dá rastreabilidade ao que já foi avaliado. Times não técnicos também conseguem testar hipóteses mais cedo. [transição] Mas para essa solução ter valor, precisávamos responder a uma pergunta fundamental: essas previsões realmente são confiáveis?',
      conteudo: {
        titulo: 'A previsão chega *pronta para decidir.*',
        telas: [
          { imagem: 'assets/tela-resultados.webp', rotulo: 'Veredito por área' },
          { imagem: 'assets/tela-mapa.webp', rotulo: 'Mapa térmico 3D' },
          { imagem: 'assets/tela-historico.webp', rotulo: 'Histórico de consultas' },
        ],
      },
    },
    {
      id: 'confiabilidade',
      secao: 4,
      secaoNome: 'Prova',
      tipo: 'confianca',
      fundo: 'escuro',
      calor: 0,
      segundos: 44,
      notas:
        'Mas essas previsões são confiáveis? Para verificar, comparamos o modelo com o laboratório, em configurações que ele não viu no treino. É a aba de Métricas Estatísticas do produto; o exemplo é a região Mainback. [cartão 1] Cada ponto é uma medição real: quanto mais perto da diagonal, melhor a previsão. [avance] A previsão é explicável: nesta região, o modo de operação responde por 47% do que o modelo usa. [avance] E contra o limite de engenharia, 310 das 320 decisões batem com o laboratório. Onde o modelo erra, a própria tela mostra, e é por isso que os casos perto do limite seguem para validação.',
      conteudo: {
        titulo: 'Por que *confiar?*',
        cartoes: [
          {
            titulo: 'Previsto × real',
            texto: 'Cada ponto é uma medição real. Perto da diagonal, acerto.',
            imagem: 'assets/metrica-previsto.webp',
            dado: 'Mainback · 320 leituras de laboratório',
          },
          {
            titulo: 'O que pesa',
            texto: 'Quanto cada escolha de montagem pesa na previsão.',
            imagem: 'assets/metrica-importancia.webp',
            dado: 'Mainback · modo de operação pesa 47%',
          },
          {
            titulo: 'Decisão contra o limite',
            texto: 'O modelo aprova ou reprova; o laboratório confere.',
            imagem: 'assets/metrica-matriz.webp',
            dado: 'Mainback · 310 de 320 decisões corretas',
          },
        ],
      },
    },
    {
      id: 'precisao',
      secao: 4,
      secaoNome: 'Prova',
      tipo: 'kpis',
      fundo: 'escuro',
      calor: 0,
      segundos: 24,
      notas:
        'Comparamos o modelo com um baseline que usa só a média histórica. Esse baseline errava, em média, 6,55 graus; o Thermal Predictor erra cerca de 4,10 graus. Além disso, cerca de 87% das previsões ficaram dentro da margem de 10%, contra 76% do baseline. E uma previsão das sete áreas leva cerca de 479 milissegundos. [transição] E essa precisão só vale se chegar a quem decide, de formas diferentes. [transição]',
      conteudo: {
        titulo: 'Os dados mostram que *o modelo aprendeu.*',
        erro: { de: 6.55, para: 4.1, destaque: '4,1', sufixo: ' °C', rotulo: 'de erro médio em cada previsão de temperatura', unidade: '°C' },
        kpis: [
          { valor: 87, prefixo: '≈ ', sufixo: '%', rotulo: 'das previsões dentro da margem de 10%', comparacao: 'baseline: 76%', anel: 0.87, anelComparacao: 0.76 },
          { valor: 479, prefixo: '≈ ', sufixo: ' ms', rotulo: 'para prever as 7 regiões de uma vez' },
        ],
      },
    },

    // ================================================================ 5 · Diferencial
    {
      id: 'publicos',
      secao: 5,
      secaoNome: 'Diferencial',
      tipo: 'publicos',
      fundo: 'claro',
      calor: 0.62,
      segundos: 36,
      notas:
        'E tem um diferencial que costuma faltar em ferramentas de engenharia: o Thermal Predictor fala com dois públicos, na mesma tela. [vídeo da esquerda] Na visão não técnica, o overview mostra o resumo, só os sensores que pedem atenção e o veredito de confiabilidade, Aprovado ou não: dá para testar uma hipótese sem depender de um especialista. [vídeo da direita] Basta alternar para a visão técnica: aparecem todos os sensores, inclusive os dentro do limite, e a análise técnica logo abaixo, com comparação com o histórico e sensibilidade. [pausa] Mesma previsão, mesmo modelo: só muda o nível de detalhe. Assim, cada área decide no seu nível, e o time técnico concentra o esforço onde a incerteza é maior.',
      conteudo: {
        titulo: 'Mesma previsão, *dois níveis de leitura.*',
        colunas: [
          { rotulo: 'Visão não técnica', pergunta: 'Posso seguir com esta configuração?', video: 'assets/videos/overview-nao-tecnico.webm', descricao: 'overview da plataforma só com o que pede atenção' },
          { rotulo: 'Visão técnica', pergunta: 'Por que o resultado é este?', video: 'assets/videos/overview-tecnico.webm', descricao: 'overview da plataforma com todos os sensores e a análise técnica' },
        ],
      },
    },

    // ================================================================ 6 · Próximos passos
    {
      id: 'pergunta',
      secao: 6,
      secaoNome: 'Próximos passos',
      tipo: 'virada',
      fundo: 'escuro',
      calor: 1,
      segundos: 26,
      notas:
        'Os próximos passos passam por ampliar a cobertura de dados, comparar cada vez mais as previsões com medições físicas e retreinar os modelos conforme novos dados forem produzidos. O Thermal Predictor transforma informações históricas em uma ferramenta para apoiar decisões futuras. [pausa] No final, queremos ajudar a engenharia a mudar uma pergunta. Em vez de perguntar: “Qual configuração devemos testar?” [avance: a pergunta muda] poder perguntar: “Qual configuração realmente precisamos testar?”',
      conteudo: {
        inicio: 'Qual configuração',
        antes: 'devemos',
        depois: 'realmente precisamos',
        fim: 'testar?',
      },
    },
    {
      id: 'obrigado',
      secao: 6,
      secaoNome: 'Próximos passos',
      tipo: 'final',
      fundo: 'claro',
      calor: 0,
      transicao: 'nevoa',
      segundos: 14,
      notas: 'Esse é o Thermal Predictor, da equipe FOG. Obrigado.',
      conteudo: {
        titulo: 'Thermal Predictor',
        frase: 'Transformando dados térmicos do passado em decisões de engenharia para o futuro.',
        agradecimento: 'Obrigado.',
        equipe: [
          { nome: 'Felipe Pessoa', foto: 'assets/equipe/felipe.png' },
          { nome: 'Gabriel Loyola', foto: 'assets/equipe/gabriel.png' },
          { nome: 'Lucas Andrade', foto: 'assets/equipe/lucas.png' },
          { nome: 'Nicolas Carrascossa', foto: 'assets/equipe/nicolas.png' },
          { nome: 'Samuel Chen', foto: 'assets/equipe/samuel.png' },
          { nome: 'Vitor Lisboa', foto: 'assets/equipe/vitor.png' },
          { nome: 'William Moraes', foto: 'assets/equipe/william.png' },
        ],
      },
    },
  ],
}
