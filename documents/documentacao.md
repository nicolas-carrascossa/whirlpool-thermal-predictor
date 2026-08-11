# Documentação Modelo Preditivo - Inteli

```
INSTRUÇÕES GERAIS (remova este trecho ao final)

Você deve editar este documento utilizando notação markdown - siga as convenções neste link 
https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
```

## Nome da Solução
### Nome do grupo
#### (preencha aqui os nomes dos integrantes, em ordem alfabética, separados por vírgula)

## Sumário
[1. Introdução](#c1)

[2. Objetivos e Justificativa](#c2)

[3. Metodologia](#c3)

[4. Desenvolvimento e Resultados](#c4)

[5. Conclusões e Recomendações](#c5)

[6. Referências](#c6)

[Anexos](#attachments)


## <a name="c1"></a>1. Introdução
```
Apresente de forma sucinta o parceiro de negócio, seu porte, local, área de atuação e posicionamento no mercado. Maiores detalhes deverão ser descritos na seção 4. Descreva resumidamente o problema a ser resolvido (sem ainda mencionar a solução). 

Remova este bloco ao final
```

## <a name="c2"></a>2. Objetivos e Justificativa
### 2.1 Objetivos
```
Descreva resumidamente os objetivos gerais e específicos do seu parceiro de negócios.

Remova este bloco ao final
```

### 2.2 Proposta de solução
```
Descreva resumidamente sua proposta de modelo preditivo e como esse modelo pretende resolver o problema, atendendo os objetivos.

Remova este bloco ao final
```

### 2.3 Justificativa
```
Faça uma breve defesa de sua proposta de solução, escreva sobre seus potenciais, seus benefícios e como ela se diferencia.

Remova este bloco ao final
```

## <a name="c3"></a>3. Metodologia
```
Descreva a metodologia CRISP-DM e suas etapas de desenvolvimento, citando o referencial teórico. Você deve apenas enunciar os métodos, sem dizer ainda como eles foram aplicados, nem quais resultados foram obtidos.

Remova este bloco ao final
```

## <a name="c4"></a>4. Desenvolvimento e Resultados
### 4.1. Compreensão do Problema
#### 4.1.1. Contexto da indústria 
```
Descreva aqui o Contexto Setorial e posicione a análise das 5 Forças de Porter

Remova este bloco ao final
```
#### 4.1.2. Análise SWOT 
```
Posicione aqui sua análise SWOT.

Remova este bloco ao final
```

#### 4.1.3. Planejamento Geral da Solução
```
a) quais os dados disponíveis (fonte e conteúdo - exemplo: dados da área de Compras da empresa descrevendo seus fornecedores).
b) qual a solução proposta (pode ser um resumo do texto da Seção 2.2).
c) como a solução proposta deverá ser utilizada.
d) quais os benefícios trazidos pela solução proposta.
e) qual será o critério de sucesso.

Remova este bloco ao final
```

#### 4.1.4. Value Proposition Canvas

<div align="center">
  <sub>Figura 1 - Canvas de Proposta de Valor da Whirlpool</sub><br>
  <img src="../assets/canvasSolucao.png" width="800" alt="Canvas"><br>
  <sup>Fonte: Autores, 2026.</sup>
</div>

**Produtos e Serviços** 
O bloco reúne os três entregáveis definidos: o modelo preditivo de Machine Learning, o software distribuído em formato open source e o dashboard interativo. Esse último é o ponto de contato direto com a persona Beatriz (Designer UX/UI), responsável por manter e atualizar a interface que traduz as previsões do modelo para os demais usuários. 

**Criadores de Ganho**
Os indicadores de 90% de eficiência frente à simulação tradicional e de 30% de redução no tempo de desenvolvimento sustentam diretamente as necessidades da persona Geraldo (Especialista de Marketing), cuja dor central é depender do cronograma de testes físicos para saber quando o produto estará pronto para divulgação. A pesquisa de gestão de produto melhora a competitividade de várias formas, reduz diretamente os custos de desenvolvimento, permite acesso antecipado ao potencial de mercado e garante vantagens de pioneirismo ¹. Os dois criadores adicionais (eliminação de retrabalho entre arquiteturas BR/MX e democratização de decisões técnicas) sustentam a necessidade de Estela (Engenheira de Materiais) de comparar diferentes materiais e espessuras sem depender de um novo protótipo para cada opção.

**Aliviadores de Dor**
Este bloco tem aderência direta às dores das personas técnicas do projeto. A eliminação da dependência de protótipos físicos e testes destrutivos responde precisamente à dor relatada por João (Engenheiro de Qualidade), que depende de testes físicos destrutivos, lentos e caros, para validar a segurança térmica, e por Estela, que enfrenta o mesmo gargalo ao validar resistência de materiais. Estudos sobre simulação digital no desenvolvimento de produto sustentam esse ganho no qual  uma pesquisa da McKinsey mostra em conversas com líderes de P&D que gêmeos digitais já reduziram os prazos de desenvolvimento em até 50% para alguns usuários, com redução de custo associada, validando a lógica de que substituir ciclos físicos por simulação preditiva é uma estratégia de negócio consolidada, não apenas uma escolha técnica pontual do projeto ².

**Ganhos do Cliente**
O ganho de lançar produtos mais rapidamente sem perder qualidade térmica conecta-se novamente à persona Geraldo, cuja necessidade central é alinhar o cronograma de campanha à data real de validação do produto. Pesquisa publicada no IEEE Transactions on Engineering Management reforça essa relação: em estudo com 692 projetos de desenvolvimento de novos produtos, a velocidade de lançamento mostrou-se geralmente associada de forma positiva ao sucesso do novo produto, sustentando por que a previsibilidade de cronograma é um ganho estratégico, e não apenas operacional ³. O ganho de custo zero de licenciamento, por sua vez, sustenta a viabilidade orçamentária da solução como um todo.

**Dores do Cliente**
O bloco distingue-se dos aliviadores por descrever a dor sob a perspectiva do cliente, e não da solução proposta. Duas dores refletem diretamente o problema central do projeto (lead time elevado e custo de prototipagem física); as demais decorrem de riscos operacionais específicos identificados na fase de planejamento. A opção por ancorar essas dores em riscos reais do projeto, em vez de dores genéricas de mercado, confere maior credibilidade e rastreabilidade ao canvas.

**Tarefas do Cliente**
A tarefa relacionada à precisão térmica dentro da margem de 10% é o item de maior relevância em todo o canvas, pois corresponde ao critério que determinará, de forma mensurável, o sucesso ou insucesso da solução desenvolvida. Da mesma forma, é imprescindível olhar que diversas simulações são feitas em aplicativos licenciados e fisicamente, mas que ainda não são reaproveitadas para previsões de futuras combinações.


#### 4.1.5. Matriz de Riscos
```
Posicione aqui sua matriz.

Remova este bloco ao final
```

#### 4.1.6. Personas
```
Posicione aqui suas Personas (indique se são personas que utilizam o modelo e/ou se são afetadas pelo modelo).

Remova este bloco ao final
```

#### 4.1.7. Jornadas do Usuário
```
Posicione aqui seus mapas de jornadas do usuário que utiliza o modelo.

Remova este bloco ao final
```

#### 4.1.8 Política de Privacidade
```
Posicione aqui sua política de privacidade em acordo com a LGPD

Remova este bloco ao final
```

### 4.2. Compreensão dos Dados

#### 4.2.1. Exploração de dados
```
Apresentar a estatística descritiva básica de cada coluna, identificar se a coluna é numérica ou categórica e pelo menos 3 gráficos para visualizar a relação entre colunas escolhidas pelo grupo.

Remova este bloco ao final
```

#### 4.2.2. Pré-processamento dos dados
```
Apresentar quais foram as ações realizadas de limpeza (tratamento de missing values e remoção de outliers) e transformação (normalização e codificação) das colunas. Se houverem outliers, cite quais são e qual(is) correção(ões) será(ão) aplicada(s).

Remova este bloco ao final
```

#### 4.2.3. Hipóteses
```
Descreva três hipóteses sobre a relação dos dados e o problema. Justifique cada uma delas. 

Remova este bloco ao final
```

### 4.3. Preparação dos Dados e Modelagem
```
Caso seu projeto seja Modelo Supervisionado, apresentar: 
a) Organização dos dados (conjunto de treinamento, validação e testes)
b) Modelagem para o problema (proposta de features com a explicação completa da linha de raciocínio).
c) Métricas relacionadas ao modelo (pelo menos 3).
d) Apresentar o primeiro modelo candidato, e uma discussão sobre os resultados deste modelo (discussão sobre as métricas para esse modelo candidato).

Caso seu projeto seja Modelo Não-Supervisionado, apresentar:
a) Modelagem para o problema (proposta de features com a explicação completa da linha de raciocínio).
b) Primeiro modelo candidato para o problema.
c) Justificativa para a definição do K do modelo.
d) Escolha de um tipo de sistema de recomendação e a justificativa para essa escolha.

Remova este bloco ao final
```

### 4.4. Comparação de Modelos
```
- Descrever e justificar a escolha da métrica de avaliação dos modelos com base no que é mais importante para o problema ao 
  se medir a qualidade desses modelos;
- Descrever ao menos três modelos candidatos, seus respectivos algoritmos, seus tunings de hiperparâmetros e suas métricas 
  alcançadas;

Remova este bloco ao final
```

### 4.5. Avaliação
```
- Descreva a solução final de modelo preditivo e justifique a escolha. Alinhe sua justificativa com a Seção 4.1, resgatando o entendimento 
  do negócio e das personas, explicando de que formas seu modelo atende os requisitos e definições. 
- Descreva também um plano de contingência para os casos em que o modelo falhar em suas predições.
- Além disso, discuta sobre a explicabilidade do modelo (se aplicável) e realize a verificação de aceitação ou refutação das hipóteses.
- Se aplicável, utilize equações, tabelas e gráficos de visualização de dados para melhor ilustrar seus argumentos. 

Remova este bloco ao final
```

## <a name="c5"></a>5. Conclusões e Recomendações
```
Escreva, de forma resumida, sobre os principais resultados do seu projeto e faça recomendações formais ao seu parceiro de negócios em relação ao uso desse modelo. Você pode aproveitar este espaço para comentar sobre possíveis materiais extras, como um manual de usuário mais detalhado na seção “Anexos”. Não se esqueça também das pessoas que serão potencialmente afetadas pelas decisões do modelo preditivo e elabore recomendações que ajudem seu parceiro a tratá-las de maneira estratégica e ética. 

Remova este bloco ao final
```

## <a name="c6"></a>6. Referências

## <a name="attachments"></a>Anexos
```
Utilize esta seção para anexar materiais como manuais de usuário, documentos complementares que ficaram grandes e não couberam no corpo do texto etc.

Remova este bloco ao final
```
