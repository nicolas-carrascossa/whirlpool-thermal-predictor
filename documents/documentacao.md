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
### 4.1.2. Análise SWOT
#### Escopo e critério de classificação

A análise a seguir tem como unidade de análise a **Whirlpool Latin America**, que corresponde essencialmente às operações de **Brasil e México**. Forças e fraquezas descrevem fatores **internos**, sobre os quais a empresa exerce governança direta (ativos, processos, competências e decisões próprias); oportunidades e ameaças descrevem fatores **externos**, originados em mercado, regulação, concorrência e conjuntura macroeconômica.

O recorte adotado é o do **desenvolvimento de produtos de cocção**, com foco na etapa de avaliação térmica por simulação computacional (CFD), ponto do negócio em que a solução deste projeto se insere. Esse recorte é intencional: uma SWOT corporativa genérica produziria fatores válidos, porém pouco acionáveis para as decisões de escopo, dados e modelagem que o grupo precisa tomar.

<div align="center">
  <sub>Figura 1 — Matriz SWOT da Solução para Whirlpool Brasil/México </sub><br>
  <img src="../assets/analise_swot.png" alt="Matriz SWOT da Solução para Whirlpool Brasil/México" width="100%"><br>
  <sup>Fonte: Elaborado pelos autores (2026)</sup>
</div>
---

#### S: Forças (internas)

**S1. Parque industrial integrado nas Américas.** No Brasil, a empresa opera plantas em Joinville (SC), Rio Claro (SP) e Manaus (AM); no México, mantém cinco unidades produtivas — três no campus de Apodaca (Nuevo León), uma em Celaya (Guanajuato) e uma em Ramos Arizpe (Coahuila). O México é descrito pela própria companhia como o terceiro país mais relevante em manufatura do grupo. Essa escala dilui o custo fixo de qualquer investimento em ferramentas de engenharia por um volume muito grande de unidades, tornando economicamente racional desenvolver internamente um modelo preditivo que uma empresa menor não conseguiria justificar.

**S2. Investimento contínuo em P&D e manufatura avançada.** A operação brasileira investe cerca de R$ 500 milhões por ano em pesquisa, desenvolvimento e automação, e inaugurou em Rio Claro um centro de capacitação em manufatura avançada com meta de treinar milhares de profissionais. Há, portanto, orçamento, patrocínio executivo e precedente institucional para adoção de tecnologia digital na engenharia, o que reduz o risco de rejeição cultural da solução.

**S3. Acervo proprietário de simulações CFD e ensaios térmicos.** Anos de simulações numéricas e de medições em bancada sobre os próprios produtos constituem a matéria prima que viabiliza a abordagem de aprendizado de máquina. Sem histórico de casos já resolvidos por método numérico e validados experimentalmente, não haveria como treinar um modelo substituto. Trata se de barreira de entrada difícil de replicar por concorrentes sem a mesma longevidade na categoria.

**S4. Cultura de melhoria contínua consolidada (World Class Manufacturing).** A companhia opera sob o modelo WCM, no qual a planta de Ramos Arizpe é referência na América do Norte. Uma organização que já mede, padroniza e audita processos de forma sistemática tende a absorver com menos atrito uma ferramenta que exige disciplina de dados e de versionamento.

**S5. Engenharia térmica e laboratórios de validação próprios.** Equipe especializada em simulação e infraestrutura de ensaio permitem confrontar internamente a saída do modelo com dados reais, encurtando o ciclo de verificação e aumentando a confiabilidade percebida da solução, condição indispensável para que um modelo estatístico seja aceito em um ambiente de engenharia.

**S6. Portfólio multimarca reaproveitável nos dois países.** Com Brastemp, Consul, KitchenAid e Whirlpool, a empresa desenvolve simultaneamente famílias com requisitos térmicos distintos em Brasil e México. Uma ferramenta que acelere a análise térmica é reutilizável em todo esse portfólio, multiplicando o retorno sobre um mesmo esforço de desenvolvimento.

#### W: Fraquezas (internas)

**W1. Ciclo de simulação térmica longo e computacionalmente caro.** A avaliação por CFD exige preparação de malha, processamento em máquinas de alto desempenho e um especialista dedicado por rodada. Na prática, limita o número de alternativas de projeto testáveis dentro do cronograma de um lançamento: a equipe converge para uma solução aceitável em vez de explorar o espaço de projeto até uma solução ótima. É o gargalo central que o projeto endereça.

**W2. Dados de engenharia sem estrutura analítica.** O histórico de simulações não foi gerado com finalidade de modelagem. O material disponibilizado ao grupo apresenta estrutura transposta (variáveis em linhas), colunas com tipos mistos, referências quebradas entre planilhas e ausência de dicionário de dados. Não existe pipeline de ingestão nem governança orientada a ML, o que transfere para a etapa de preparação boa parte do esforço do projeto.

**W3. Baixo volume amostral por família de produto.** Como cada registro corresponde a uma simulação custosa, o conjunto disponível é pequeno para os padrões de aprendizado de máquina. Isso restringe a complexidade dos modelos utilizáveis, eleva o risco de sobreajuste e limita a generalização para geometrias e condições de contorno não observadas no treino.

**W4. Conhecimento térmico concentrado em poucos especialistas.** A interpretação dos resultados e o julgamento sobre plausibilidade física dependem de um número reduzido de engenheiros. Além do risco de descontinuidade, há um gargalo de agenda: a validação do modelo compete com as demais demandas dessas mesmas pessoas.

**W5. Confidencialidade restringe a colaboração externa.** Geometrias, materiais e resultados de desempenho são informação concorrencialmente sensível. Isso impõe atrito a iniciativas de inovação aberta, inclusive a este projeto, que precisa conciliar entregas em repositório público com a proteção dos dados do parceiro.

**W6. Reestruturação da rede fabril em curso consome capex e atenção gerencial.** Em 2026 a companhia comunicou ao regulador norte americano o encerramento gradual de uma de suas plantas em Apodaca até o segundo trimestre de 2027, com custo estimado de reorganização em torno de US$ 165 milhões, como parte de um esforço de otimização da rede global de manufatura. Movimentos dessa natureza deslocam linhas entre plantas, exigem revalidação de produtos e processos e disputam recursos com projetos de inovação, um risco de agenda concreto para a implantação da solução.

#### O: Oportunidades (externas)

**O1. Endurecimento e valorização da regulação de eficiência energética.** O Programa Brasileiro de Etiquetagem do INMETRO abrange, em 2026, dezenas de programas e produtos, e o Selo PROCEL tornou-se critério de decisão de compra e condição de acesso a programas habitacionais públicos. Melhorar classe de eficiência exige otimizar comportamento térmico, e otimizar exige iterar: quem avalia mais alternativas por unidade de tempo tem vantagem direta nesse jogo regulatório.

**O2. Nacionalização de linhas e crescimento das exportações.** A absorção de linhas antes produzidas fora do país, incluindo modelos com padrão construtivo distinto do mercado local, amplia a variedade de produtos desenvolvidos no Brasil. Cada nova configuração é um conjunto adicional de análises térmicas e, portanto, um caso de uso a mais para a ferramenta.

**O3. Padronização de engenharia entre Brasil e México.** Sendo os dois países o núcleo da operação regional, um modelo preditivo validado no Brasil é transferível para o portfólio mexicano com custo marginal baixo. Isso converte uma entrega local em um ativo regional e aumenta significativamente o retorno esperado do projeto.

**O4. Ecossistema acadêmico e incentivos fiscais à P&D.** A proximidade com instituições de ensino e a existência de incentivos à inovação permitem testar hipóteses tecnológicas a custo e risco baixos antes de comprometer recursos internos, modelo do qual este próprio projeto é exemplo. Além do resultado técnico, a parceria dá acesso a métodos e literatura recentes sobre modelos substitutos aplicados à engenharia, área que amadureceu rapidamente e cujo custo de adoção vem caindo.

#### T: Ameaças (externas)

**T1. Escassez e disputa por talentos de dados e aprendizado de máquina.** A sustentação da solução após a entrega depende de profissionais capazes de monitorar, retreinar e evoluir o modelo. Esse perfil é disputado por setores que remuneram acima da média da indústria, o que representa risco direto de continuidade para qualquer iniciativa de ML internalizada.

**T2. Elevação contínua dos patamares normativos de eficiência e segurança.** Resoluções do CGIEE e revisões das portarias do INMETRO alteram periodicamente os requisitos mínimos. Erro de previsão térmica em fase de projeto pode gerar reprovação em certificação, retrabalho, atraso de lançamento ou, no limite, risco de campo.

**T3. Avanço de importados e de fabricantes asiáticos.** A participação de produtos importados permanece elevada em vários segmentos do mercado interno, e concorrentes como Samsung, LG e Midea operam com estruturas de P&D de escala global, inclusive com capacidade de internalizar antes ferramentas de simulação acelerada. A pressão competitiva encurta janelas de lançamento e reduz a tolerância a ciclos longos de desenvolvimento.

**T4. Exposição da produção mexicana à política tarifária dos Estados Unidos.** A planta de Ramos Arizpe destina a quase totalidade de sua produção aos mercados norte americanos. Alterações tarifárias ou de regras de origem afetam diretamente a rentabilidade da operação regional e podem redirecionar prioridades de investimento, inclusive as de engenharia.

**T5. Elasticidade entre preço e demanda comprimindo a margem disponível para P&D.** Levantamentos setoriais indicam que cada 1% de aumento de custo se traduz em queda de 0,7% a 1% na demanda por eletrodomésticos. Em ambiente de juros elevados e confiança do consumidor oscilante, sobra pouco espaço para repassar custos, o que expõe orçamentos de engenharia a corte.

---

#### Estratégias derivadas do cruzamento (matriz TOWS)

A matriz por si só é descritiva; o valor analítico está no cruzamento entre os fatores internos e externos. As quatro combinações abaixo indicam como a solução proposta neste projeto se posiciona.

| | **Forças (S)** | **Fraquezas (W)** |
|:---|:---|:---|
| **Oportunidades (O)** | **SO — ofensiva:** usar o acervo de simulações (S3) e a capacidade de validação própria (S5) para varrer rapidamente configurações de projeto e maximizar classe de eficiência energética (O1) antes de comprometer horas de CFD; estender o mesmo ativo às novas linhas nacionalizadas (O2) e ao portfólio mexicano (O3), transformando uma entrega local em ferramenta regional. | **WO — reforço:** aproveitar a parceria acadêmica e os incentivos à P&D (O4) para atacar as fraquezas de dados: estruturar dicionário de dados, padronizar a saída das simulações e planejar novas rodadas por delineamento de experimentos (DOE) nas regiões em que o modelo apresentar maior incerteza, convertendo o custo do CFD em investimento dirigido (W2, W3). |
| **Ameaças (T)** | **ST — confronto:** empregar escala industrial (S1), cultura de melhoria contínua (S4) e engenharia própria (S5) para encurtar o ciclo de concepção e validação e responder ao encurtamento das janelas de lançamento imposto pela concorrência (T3), preservando margem em um cenário de repasse de custo limitado (T5). Manter o desenvolvimento internamente também mitiga exposição de propriedade intelectual. | **WT — defensiva:** posicionar o modelo como ferramenta de triagem e priorização, não como substituto do CFD na homologação, reportando faixa de erro explícita e definindo critério objetivo de escalonamento para simulação completa, o que limita o risco normativo (T2). Documentar o pipeline e automatizar o retreino reduz simultaneamente a dependência de especialistas (W4) e a exposição à rotatividade de talentos (T1). |

#### Implicação para o projeto

O cruzamento indica que o principal gargalo interno da Whirlpool no escopo analisado, o custo e a lentidão do ciclo de simulação térmica (W1), coincide com o ponto em que as pressões externas mais crescem: exigência regulatória de eficiência (O1, T2), concorrência acelerada (T3) e necessidade de desenvolver mais variantes de produto por período (O2, O3). Simultaneamente, a empresa detém justamente os ativos necessários para atacar esse gargalo: acervo histórico de simulações (S3), engenharia térmica própria (S5) e orçamento de P&D consolidado (S2).

A solução proposta neste projeto, um modelo de aprendizado de máquina que estima a temperatura de componentes térmicos como alternativa rápida ao CFD, atua precisamente nessa interseção, convertendo uma fraqueza operacional em capacidade de resposta às oportunidades e ameaças do mercado. A principal condicionante de sucesso, evidenciada pela própria análise, não é de natureza algorítmica, mas de qualidade e volume de dados (W2 e W3), o que justifica a prioridade das etapas de estruturação do dataset no cronograma do projeto.

#### Limitações da análise

Três ressalvas devem acompanhar a leitura desta seção. Primeiro, os fatores internos relativos a dados e à concentração de conhecimento foram **inferidos a partir do material disponibilizado ao grupo** e da interação com o parceiro, não de auditoria formal, carecem de validação com o time de engenharia. Segundo, a seleção dos fatores reflete o recorte declarado no início da seção: elementos de alto impacto corporativo mas sem conexão com a etapa de simulação térmica foram deliberadamente deixados de fora. Terceiro, os dados externos referem-se ao período até meados de 2026 e o setor é sensível a juros, câmbio e política comercial, de modo que a análise deve ser revisitada ao longo do projeto.


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
```
Posicione aqui seu canvas.

Remova este bloco ao final
```

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

- BLOOMBERG LÍNEA. *Whirlpool inaugura hub de inovação em Rio Claro e vê novo impulso para vendas.* Disponível em: https://www.bloomberglinea.com.br/negocios/whirlpool-inaugura-hub-de-inovacao-em-rio-claro-e-ve-novo-impulso-para-vendas/
- BLOOMBERG LÍNEA. *Whirlpool vê salto de exportação à Argentina com fábrica em Rio Claro.* Disponível em: https://www.bloomberglinea.com.br/negocios/whirlpool-ve-salto-de-exportacao-a-argentina-com-fabrica-em-rio-claro-afirma-vp/
- MEXICOINDUSTRY. *Whirlpool Ramos Arizpe.* Disponível em: https://mexicoindustry.com/hecho-en-mexico/whirlpool-ramos-arizpe-producen-los-refrigeradores-que-llegan-hasta-los-hogares-de-estados-unidos-
- XATAKA MÉXICO. *Whirlpool cerrará una planta en México.* Disponível em: https://www.xataka.com.mx/empresas-y-economia/whirlpool-quiere-fabricar-refrigeradores-forma-barata-eso-cerrara-planta-mexico
- INMETRO. *Programa Brasileiro de Etiquetagem (PBE) / ENCE.* Base legal: Lei nº 10.295/2001 e Decreto nº 9.864/2019.
- ELETROS — Associação Nacional de Fabricantes de Produtos Eletroeletrônicos. Dados setoriais de linha branca.
- WHIRLPOOL CORPORATION. *Corporate Style Guide.* Disponível em: https://style.whirlpoolcorp.com

## <a name="attachments"></a>Anexos
```
Utilize esta seção para anexar materiais como manuais de usuário, documentos complementares que ficaram grandes e não couberam no corpo do texto etc.

Remova este bloco ao final
```
