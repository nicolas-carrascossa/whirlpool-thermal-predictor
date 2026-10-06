# Thermal Predictor — apresentação de 5 minutos

## 0:00–0:35 | Abertura: o problema em uma cena

Imagine que uma pequena alteração em um componente de um fogão exija uma nova rodada de simulação térmica, novas horas de processamento, avaliação de especialistas e, em alguns casos, um novo protótipo físico para teste destrutivo.

Esse processo é indispensável: ele protege a segurança, a qualidade e a conformidade do produto. Mas também cria um gargalo. A cada nova alternativa de projeto, a Whirlpool precisa escolher entre velocidade, custo e profundidade técnica.

E, em um mercado que exige renovação constante de portfólio, essa escolha se torna estratégica.

## 0:35–1:15 | Contexto: por que isso importa agora

A Divisão de Fogões da Whirlpool desenvolve produtos para Brasil e México, mercados que exigem mais variedade de produtos, maior eficiência e ciclos de lançamento mais rápidos.

Ao mesmo tempo, a engenharia enfrenta restrições reais: simulações CFD exigem malha, processamento de alta capacidade e tempo de especialistas; protótipos físicos consomem material, fabricação e laboratório; e cada ciclo reduz o número de alternativas que cabem no cronograma.

O problema, portanto, não é apenas técnico. É uma questão de competitividade: **quantas boas decisões de projeto deixam de ser exploradas porque validá-las custa tempo demais?**

## 1:15–1:55 | A dor do processo atual

Hoje, o processo começa pela seleção de poucas configurações candidatas. Em seguida, essas configurações passam por simulação e, nos casos necessários, por validação física.

O desafio é que a decisão sobre o que testar acontece antes de haver evidência suficiente sobre todas as possibilidades. A engenharia precisa apostar nas alternativas mais promissoras, porque não é viável testar tudo.

Isso gera três consequências principais:

1. Menos alternativas de projeto são exploradas.
2. O ciclo de desenvolvimento se torna mais longo e caro.
3. A capacidade técnica do time de CFD fica consumida por variações próximas entre si, em vez de se concentrar nos casos mais críticos e inovadores.

## 1:55–3:00 | A solução: Thermal Predictor

O Thermal Predictor foi criado para atuar antes da simulação completa e antes do protótipo físico.

Ele aprende com o histórico de simulações CFD e ensaios térmicos da Whirlpool a relação entre a configuração de montagem do fogão e a temperatura alcançada em seus pontos monitorados.

Na prática, o engenheiro informa características como direção do fluxo de ar, posição de componentes, condição estrutural, material do suporte da bobina e presença de elementos de deflexão. Em segundos, o sistema retorna:

- A temperatura estimada nas regiões selecionadas;
- A margem de incerteza da previsão;
- O limite de engenharia aplicável para Brasil ou México;
- E, principalmente, um indicador de confiabilidade.

Esse indicador é o elemento que torna a solução útil de forma responsável. Quando a configuração está dentro do histórico já conhecido, a previsão apoia a análise de projeto. Quando está próxima do limite, ela serve para triagem. E, quando está fora do domínio conhecido, a recomendação é voltar para a simulação CFD completa.

O Thermal Predictor não substitui a engenharia térmica. Ele dá à engenharia uma forma mais inteligente de decidir onde investir seu tempo.

## 3:00–3:45 | Evidência de valor

A solução foi estruturada em sete modelos, porque cada região do fogão possui um comportamento térmico próprio.

Nos resultados obtidos, o modelo reduziu o erro médio de referência de 6,55 °C para cerca de 4 °C. Aproximadamente 88% das previsões ficaram dentro da faixa de 10% utilizada como referência pelo projeto.

Esses números mostram que o sistema já é capaz de melhorar significativamente a estimativa em comparação com uma previsão baseada apenas no comportamento médio histórico.

O ganho não está apenas na precisão. Uma previsão é gerada em segundos, enquanto uma simulação CFD pode consumir horas. Isso abre espaço para avaliar diversas configurações antes de selecionar aquelas que realmente precisam seguir para validação completa.

## 3:45–4:25 | Uso responsável e limites do produto

A proposta não é afirmar que um algoritmo pode liberar sozinho um produto para o mercado.

O modelo estima a saída da simulação CFD; ele ainda precisa ser confrontado com a medição física em casos críticos. Além disso, a base histórica possui cobertura limitada de combinações de projeto, o que exige cuidado diante de arquiteturas novas.

Por isso, o produto foi desenhado com limites claros: previsões fora do domínio conhecido devem ser direcionadas para CFD, e nenhuma decisão de segurança ou certificação pode depender apenas da estimativa do modelo.

Essa governança não reduz o valor da ferramenta. Ela aumenta a confiança necessária para adotá-la dentro da engenharia.

## 4:25–5:00 | Fechamento: a mudança proposta

O Thermal Predictor transforma conhecimento térmico já existente, mas disperso em planilhas, simulações e históricos de teste, em uma capacidade contínua de decisão.

Ele permite explorar mais alternativas no mesmo prazo, priorizar ensaios físicos com mais inteligência e concentrar especialistas nos desafios que realmente exigem sua experiência.

Para a Whirlpool, o impacto esperado é direto: reduzir o tempo de desenvolvimento, diminuir o gasto com protótipos e tornar a inovação térmica mais rápida, rastreável e escalável entre Brasil e México.

**O Thermal Predictor não elimina a validação. Ele torna cada validação mais valiosa.**


Pesquisei referências atuais de mercado. O ponto mais importante para o pitch é: o Thermal Predictor não elimina a licença de CFD, mas reduz o número de rodadas caras que consomem capacidade computacional e horas de especialistas. O ganho financeiro deve ser apresentado como custo evitado por simulações, protótipos e retrabalho priorizados, não como economia integral da licença.
Software / categoria	Custo publicado	Leitura para o pitch
Autodesk Fusion + Simulation Extension	US$ 2.145/usuário/ano: US$ 680 da licença Fusion + US$ 1.465 da extensão de simulação	Referência de entrada para CAE térmico e eletrônica; inclui soluções em nuvem. Não possui a mesma profundidade de CFD industrial de um solver dedicado. Autodesk, Fusion
SOLIDWORKS Simulation CFD Engineer	US$ 10.260/usuário/ano	Referência intermediária de CFD comercial. O pacote informado inclui quatro núcleos de computação e 100 GB de armazenamento. Preço publicado por parceiro especializado; a Dassault direciona a compra a revendedores. Lista de preços 2026, SOLIDWORKS
Siemens Simcenter STAR-CCM+	US$ 19.705,20/ano para uma sessão adicional de um núcleo	É uma referência enterprise de alto porte. Este valor é de uma sessão adicional e pressupõe licença STAR-CCM+ já existente, portanto não representa o custo completo de entrada. Ainda assim, mostra a escala de custo da expansão de capacidade em CFD industrial. Siemens
Ansys Fluent	Sob cotação	O fornecedor não publica preço aberto. A ferramenta possui níveis de licença e, além de quatro núcleos incluídos, demanda licenças adicionais para maior uso de HPC; portanto, o custo cresce com a escala computacional. Ansys
COMSOL Multiphysics + CFD Module	Sob cotação	A licença é composta pela plataforma e módulos. Em licenças perpétuas, atualizações e suporte após o primeiro ano custam 20% do preço vigente da licença. COMSOL — licenciamento, CFD Module
SimScale	Community gratuita; Professional e Enterprise sob cotação	Modelo em nuvem: o custo depende da franquia de horas de processamento; excedentes são cobrados mensalmente. Isso evidencia que o custo de CFD pode ser variável conforme o volume de análises. SimScale
OpenFOAM	US$ 0 de licença	É open source sob GPL. Ainda há custo de infraestrutura, operação, preparação de modelos e especialistas; “sem licença” não significa “sem custo de simulação”. OpenFOAM


Para o pitch, eu usaria esta mensagem:
“Mesmo em ferramentas de entrada, a capacidade de simulação representa milhares de dólares anuais por usuário. Em ambientes industriais, uma sessão adicional de CFD pode ultrapassar US$ 19 mil por ano, sem considerar infraestrutura computacional e horas de engenharia. O Thermal Predictor não substitui essas plataformas: ele evita que sua capacidade mais cara seja usada em hipóteses que poderiam ser filtradas em segundos.”

A forma correta de calcular o retorno com dados da Whirlpool é:
\[
\text{Benefício anual} =
(\text{simulações evitadas} \times \text{custo por rodada CFD})
+
(\text{protótipos evitados} \times \text{custo por protótipo})
+
(\text{horas liberadas} \times \text{custo-hora especializado})
\]