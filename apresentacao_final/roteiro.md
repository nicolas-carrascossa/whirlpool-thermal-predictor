1. Introdução (HERO) — “E se pudéssemos prever antes de testar?”

Tempo: 25 segundos | 0:00–0:25

Visual

E se fosse possível prever o comportamento térmico de um fogão antes de construir um novo protótipo?

Thermal Predictor — Inteli × Whirlpool

Fala

“No desenvolvimento de um novo fogão, uma mudança de arquitetura pode exigir uma nova simulação CFD e, em etapas críticas, novos protótipos e testes físicos. Isso significa tempo, custo e uso de recursos especializados antes mesmo de saber se aquela configuração é termicamente viável.

Foi a partir desse problema da Divisão de Fogões da Whirlpool que desenvolvemos o Thermal Predictor.”

Transição

“Mas para entender o valor da nossa solução, primeiro precisamos entender onde está esse gargalo.”



2. PROBLEMA — “Testar cada alternativa custa caro”

Tempo: 45 segundos | 0:25–1:10

Visual

Nova configuração → CFD → análise → protótipo/teste → decisão

Destaques:

Alto lead time

Uso de HPC e especialistas

Protótipos e testes

Menos alternativas avaliadas

Fala

“Hoje, validar termicamente uma nova configuração depende de ciclos que envolvem simulações CFD, capacidade computacional e profissionais especializados. Além disso, determinadas decisões precisam posteriormente de protótipos e testes físicos.

Quanto mais configurações a engenharia deseja comparar, mais esse processo precisa se repetir.

Isso gera um problema de negócio: o tempo gasto na validação limita quantas alternativas podem ser exploradas durante o desenvolvimento e aumenta o custo para chegar até uma configuração segura.

Nosso desafio, então, era utilizar os dados históricos da Whirlpool para permitir decisões mais rápidas antes dessas etapas mais custosas.”

Transição

“E esse problema aparece em diferentes momentos do processo de desenvolvimento.”



3. PERSONAS — “Uma previsão, várias decisões”

Tempo: 30 segundos | 1:10–1:40

Visual

Produtos
Qual arquitetura devemos seguir?

Materiais
Esse componente suporta a temperatura?

Qualidade
Quais casos realmente precisam de validação completa?

Fala

“O Thermal Predictor pode apoiar diferentes profissionais.

A equipe de Produtos precisa comparar arquiteturas antes de congelar o design. Materiais precisa entender se determinado componente suporta a temperatura esperada. E Qualidade precisa identificar configurações de maior risco que justificam uma validação mais completa.

Apesar de decisões diferentes, todos precisam da mesma coisa: informação térmica confiável mais cedo no processo.”

Transição

“É justamente essa informação que buscamos entregar com o Thermal Predictor.”



4. SOLUÇÃO — “Da configuração à previsão em segundos”

Tempo: 1min05s | 1:40–2:45

Visual

Configuração do fogão
↓
Thermal Predictor
↓
Temperatura + margem de erro + confiabilidade
↓
Decisão

Fala

“O Thermal Predictor é um sistema baseado em Machine Learning que aprende com o histórico de simulações térmicas da Whirlpool.

O engenheiro informa características da configuração do fogão, como direção do fluxo de ar, housing, posição de componentes e materiais utilizados.

A partir dessas informações, o sistema estima as temperaturas nas sete regiões térmicas monitoradas.

Como cada região apresenta um comportamento térmico diferente, não utilizamos necessariamente o mesmo algoritmo para todas elas. Após nossos experimentos, foram selecionados modelos de Gradient Boosting em quatro regiões e Random Forest em três.

Essas previsões são disponibilizadas em um dashboard junto de informações que auxiliam na interpretação do resultado.

E existe um ponto importante: o Thermal Predictor não busca eliminar CFD ou testes físicos. Caso uma configuração esteja fora do domínio conhecido pelo modelo, ela ainda deve seguir para uma validação mais completa.

Ou seja, nosso objetivo é ajudar a engenharia a identificar onde esses recursos realmente precisam ser utilizados.”

Transição:

“Mas para essa solução ter valor, precisávamos responder a uma pergunta fundamental: essas previsões realmente são confiáveis? Para mostrar isso, passo agora para o __.”

TROCA DE APRESENTADOR



5. PROVA — “Os dados mostram que o modelo aprendeu”

Tempo: 1min10s | 2:45–3:55

Visual

≈ 4,10 °C
MAE médio

37,5% ↓
erro em relação ao baseline

≈ 87%
previsões dentro da margem de 10%

≈ 479 ms
tempo de uma predição completa

Gráfico:

Baseline: 6,55 °C → Thermal Predictor: 4,10 °C

Fala

“Para verificar isso, comparamos nossos modelos com um baseline simples, que utiliza o comportamento médio histórico e não considera as características específicas de cada configuração.

Esse baseline apresentou um erro médio de 6,55 graus Celsius.

Com os modelos selecionados pelo Thermal Predictor, o erro médio caiu para aproximadamente 4,10 graus, representando uma redução de cerca de 37,5%.

Além disso, aproximadamente 87% das previsões ficaram dentro da margem de 10% definida para avaliação, enquanto o baseline ficou próximo de 76%.

O desempenho varia entre as diferentes regiões térmicas, o que também demonstra a importância de avaliá-las individualmente.

Também temos um ganho importante de velocidade: no sistema desenvolvido, uma previsão contemplando as sete áreas pode ser realizada em aproximadamente 479 milissegundos.

Esses resultados mostram que o modelo consegue utilizar as características do fogão para produzir previsões significativamente melhores que uma referência baseada apenas na média histórica.”

Transição

“E essa diferença técnica se traduz diretamente em uma oportunidade para melhorar o processo de engenharia.”



6. DIFERENCIAL — “Não substituir testes. Testar melhor.”

Tempo: 35 segundos | 3:55–4:30

Visual

Processo tradicional

Testar várias configurações → descobrir quais são críticas

Com Thermal Predictor

Prever várias configurações → priorizar → validar casos críticos

Título principal:

Não substituir testes. Testar melhor.

Fala

“O principal diferencial do Thermal Predictor não é prometer o fim dos testes físicos.

A proposta é permitir que a Whirlpool utilize seus recursos de engenharia de maneira mais estratégica: primeiro avaliar rapidamente diferentes possibilidades e depois concentrar CFD e validações completas nos casos críticos ou desconhecidos.

Isso cria a base para perseguir as metas de negócio definidas pelo projeto, como redução do tempo de desenvolvimento, redução de custos operacionais e maior eficiência no ciclo de validação.

Ou seja: não queremos simplesmente testar menos. Queremos testar melhor.”

Transição

“E isso também define claramente os nossos próximos passos.”

7. CTA — “Do histórico de testes para decisões futuras”

Tempo: 25 segundos | 4:30–4:55

Visual

Mais dados → Validação física → Retreinamento

Mensagem final:

Thermal Predictor

Transformando dados térmicos do passado em decisões de engenharia para o futuro.

Fala

“Os próximos passos passam por ampliar a cobertura de dados, comparar cada vez mais as previsões com medições físicas e continuar aprimorando os modelos conforme novos dados forem produzidos.

O Thermal Predictor transforma informações históricas em uma ferramenta para apoiar decisões futuras.

No final, queremos ajudar a engenharia a mudar uma pergunta.

Em vez de apenas perguntar:

‘Qual configuração devemos testar?’

poder perguntar:

‘Qual configuração realmente precisamos testar?’

Esse é o Thermal Predictor. Obrigado.”