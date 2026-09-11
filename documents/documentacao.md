# Documentação Modelo Preditivo - Inteli

```
INSTRUÇÕES GERAIS (remova este trecho ao final)

Você deve editar este documento utilizando notação markdown - siga as convenções neste link 
https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax
```

## Whirlpool Thermal Predictor

### FOG - A predição que nasce da névoa dos dados do Dataset

#### Felipe Sodré Pessôa, Gabriel Lorenzo Baglioli de Loyola, Lucas Andrade Silva, Nícolas Rigolin Carrascossa, Samuel Yenyu Chen, Vitor Medrado Lisbôa, William Martins Moraes


## Sumário
[1. Introdução](#c1)

[2. Objetivos e Justificativa](#c2)

[3. Metodologia](#c3)

[4. Desenvolvimento e Resultados](#c4)

[5. Conclusões e Recomendações](#c5)

[6. Estrutura da Solução Visual e Acesso ao Modelo Preditivo](#c6)

[7. Referências](#c7)

[Anexos](#attachments)


## <a name="c1"></a>1. Introdução

A Whirlpool Corporation é uma multinacional fundada nos EUA em 1911, inicialmente com o propósito de fabricar máquinas de lavar roupa manuais. Atualmente, ela é conhecida como empresa líder global na fabricação de eletrodomésticos para cozinha e lavanderia, com operações em cerca de 170 países e faturamento de R$12,9 bilhões no Brasil em 2024²¹. Ela já está presente no Brasil há mais de 70 anos por meio de marcas amplamente reconhecidas no mercado brasileiro, como Brastemp, Consul, KitchenAid, B.blend etc, detendo cerca de 38% de participação no mercado de linha branca. A parceira direta no caso deste trabalho é a Divisão de Fogões da companhia, responsável pelo desenvolvimento de produtos para os mercados do Brasil e do México, com atuação voltada à engenharia e à pesquisa e desenvolvimento (P&D) de eletrodomésticos.

Nesse setor, o desenvolvimento de novos modelos de fogões de piso depende diretamente da construção de protótipos físicos e da realização de testes destrutivos para validar o comportamento térmico dos equipamentos. Esse processo é indispensável para validar se o fogão desenvolvido realmente se enquadra nos padrões de qualidade, segurança e desempenho exigidos. Porém, o desenvolvimento desses protótipos demanda grandes investimentos e é bem demorado, já que cada teste exige novos protótipos e ciclos completos de testes físicos. Portanto, o processo de um novo lançamento de um fogão é caro e lento, o que pode ser considerado uma fraqueza para esse setor do mercado, levantando um obstáculo que necessita de uma solução.


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

O desenvolvimento deste projeto segue o CRISP-DM (Cross Industry Standard Process for Data Mining), metodologia amplamente reconhecida como a mais utilizada em projetos de mineração de dados, análise de dados e ciência de dados no mundo, sendo consistentemente apontada como a abordagem mais adotada em pesquisas conduzidas ao longo de mais de uma década. Seu objetivo é oferecer uma abordagem sistemática que garanta que projetos de dados sejam bem definidos, geridos de forma estruturada e capazes de entregar resultados de valor, reduzindo o risco de erros custosos e mantendo o alinhamento com os objetivos de negócio (SHARMA, 2025).
A metodologia consiste em seis fases, que embora normalmente sigam uma sequência lógica, podem ser revisitadas de forma iterativa ao longo do projeto, já que o resultado de uma fase frequentemente indica a necessidade de retornos (HOTZ, 2024):
1. Entendimento do Negócio (Business Understanding): fase inicial voltada a compreender, sob a perspectiva do negócio, os objetivos e requisitos do projeto. Envolve determinar os objetivos de negócio, avaliar a situação (recursos, riscos e restrições disponíveis), traduzir esses objetivos em metas técnicas de mineração de dados e produzir um plano de projeto.
2. Entendimento dos Dados (Data Understanding): etapa de coleta, descrição, exploração e verificação da qualidade dos dados disponíveis. Inclui identificar e acessar as fontes de dados relevantes, compreender o significado de cada variável, aplicar técnicas de visualização e análise estatística para identificar padrões e relações, e identificar problemas de qualidade, como valores ausentes ou outliers.
3. Preparação dos Dados (Data Preparation): é conhecida como a fase mais demorada do processo, na qual os dados brutos são selecionados, limpos, transformados e organizados em um formato adequado à modelagem. Contempla o tratamento de valores ausentes, a identificação e correção de outliers, a padronização de formatos e rótulos, a construção de novas variáveis (feature engineering), a normalização/padronização de escalas e a codificação de variáveis categóricas.
4. Modelagem (Modeling): fase em que técnicas de modelagem são selecionadas e aplicadas aos dados preparados, podendo envolver desde modelos estatísticos tradicionais até algoritmos de aprendizado de máquina. Inclui a definição do desenho de teste (divisão entre dados de treino, teste e validação), a construção dos modelos e a avaliação técnica de seu desempenho por meio de métricas apropriadas.
5. Avaliação (Evaluation): aqui os resultados obtidos são analisados de forma mais ampla, verificando se atendem aos critérios de sucesso definidos na fase de Entendimento do Negócio, e não apenas aos critérios técnicos da fase de Modelagem. Envolve revisar todo o processo executado e decidir os próximos passos, a fim de avançar para a implantação, iterar novamente ou explorar abordagens alternativas.
6. Implantação (Deployment): fase final, cuja complexidade pode variar desde a geração de um relatório até a implementação de um processo repetível dentro da organização. Contempla o planejamento da implantação, da manutenção e do monitoramento contínuo dos resultados, a produção de um relatório final e a revisão retrospectiva do projeto.


## <a name="c4"></a>4. Desenvolvimento e Resultados
### 4.1. Compreensão do Problema
#### 4.1.1. Contexto da indústria

O setor de linha branca no Brasil e no México é dominado por um pequeno grupo de fabricantes multinacionais que competem simultaneamente em escala industrial, penetração de marca e velocidade de lançamento de produto. Nesse cenário, a Divisão de Fogões da Whirlpool, parceira direta deste projeto, atua como unidade de engenharia e P&D responsável pelo desenvolvimento de fogões de piso (freestanding) para as arquiteturas de produto do Brasil e do México, sob o guarda-chuva comercial da Whirlpool Latin America e das marcas Brastemp, Consul e KitchenAid.


##### 4.1.1.1. Concorrentes identificados

Três empresas atuam como concorrentes diretos da Whirlpool. A Electrolux é a marca com maior penetração domiciliar do país, presente em 67% dos lares brasileiros⁹, e inaugurou em agosto de 2025 sua quinta planta no país, em São José dos Pinhais (PR), com investimento de R$ 700 milhões, para reduzir a dependência de importação asiática e nacionalizar categorias hoje importadas¹⁰. A Midea, multinacional chinesa, já não deve ser tratada apenas como ameaça potencial de entrada (Força 4): ocupa hoje a terceira posição no mercado brasileiro de eletrodomésticos, com cerca de 8% de participação em refrigeradores¹¹, e converteu sua estratégia de importação para manufatura local ao inaugurar em Pouso Alegre (MG) sua primeira planta 100% própria no país, investimento de R$ 630 milhões¹². Por fim, a Mabe, grupo mexicano com planta dedicada a fogões e produtos de cocção a gás em Durango, é historicamente o concorrente mais diretamente sobreposto ao escopo do Thermal Predictor: já deteve cerca de 70% de participação em eletrodomésticos na América Latina (excluindo Estados Unidos e México) e anuncia US$ 668 milhões em investimento para 2025–2027¹³.

##### 4.1.1.2. Análise do modelo de negócio do parceiro

A Whirlpool Latin America opera um modelo de negócio ancorado em três pilares: segmentação de marca multiportfólio, manufatura local verticalizada e diversificação incipiente para serviços e economia circular. Brastemp, Consul e KitchenAid ocupam territórios de posicionamento distintos e deliberadamente não concorrentes: Brastemp em design, tecnologia e aspiração; Consul em durabilidade, eficiência e acesso, com distribuição voltada à base da pirâmide; KitchenAid no extremo premium a super-premium de eletroportáteis. Essa arquitetura permite competir simultaneamente em múltiplas faixas de preço sem canibalizar a marca âncora, resposta direta à pressão de rivalidade (Força 1) e ao poder de barganha do canal varejista (Força 3). Mais de 95% dos produtos vendidos pela Whirlpool no Brasil são fabricados localmente, com cerca de 80% dos insumos adquiridos de fornecedores nacionais, historicamente a principal barreira de proteção contra concorrência via importação (Força 4) e resposta direta à exposição cambial. A companhia também opera canal de venda direta ao consumidor (Compra Certa) e programa de logística reversa que já coletou mais de 1 milhão de produtos usados, inclusive de marcas concorrentes, sinalizando tentativa de capturar valor além da venda única de hardware, ainda que como fração marginal da receita frente ao modelo tradicional de venda via grande varejo. Investe cerca de 4% da receita em pesquisa e inovação, mantém hub de inovação em Rio Claro (SP) e parcerias com universidades, sustentando um ritmo constante de lançamento de novos produtos.

##### 4.1.1.3. Análise das tendências do setor do parceiro

O setor de linha branca na América Latina converge, para 2026, em torno de quatro tendências estruturais: premiumização funcional, em que o consumidor prioriza conveniência, multifuncionalidade e benefícios de saúde e bem-estar acima do preço puro; conectividade e inteligência artificial embarcada (cozinha conectada, sensores de ajuste automático, monitoramento remoto via aplicativo), destacada na Eletrolar Show All Connected 2026 como principal eixo de diferenciação do setor; eficiência energética e sustentabilidade, que deixaram de ser diferencial competitivo e se consolidaram como requisito básico de mercado; e miniaturização/reconfiguração de portfólio, com migração observável para produtos mais compactos e tecnologias alternativas de cocção como a indução. Em conjunto, essas tendências reforçam a tese central desta análise: a competitividade no setor passou a exigir capacidade de iteração rápida de produto sobre novas arquiteturas térmicas e eletrônicas — exatamente a capacidade que o Thermal Predictor busca viabilizar.

##### 4.1.1.4. Análise do contexto da Whirlpool segundo as cinco forças de Porter
###### 1. Rivalidade entre concorrentes existentes — Alta

A Whirlpool Latin America lidera a região com Brastemp, Consul e KitchenAid, mas opera em um oligopólio fragmentado e ativamente disputado por preço:

- **Multinacionais âncora:** Electrolux, Mabe, BSH/Bosch e Midea (joint-venture sino-americana consolidada como terceira força relevante em linha branca).
- **Fabricantes nacionais robustos:** Esmaltec (líder em fogões no Nordeste), Mueller, Britânia, Philco, Atlas e Continental (marca do grupo Mabe).
- **Entrantes chinesas em expansão acelerada:** Hisense, TCL e Gree, competindo agressivamente por preço.

A evidência mais forte de rivalidade é financeira: a compressão de margem EBIT de 6,0% para 3,0% em um ano, atribuída pela própria Whirlpool a "intensidade promocional" no Brasil¹. Em 2023, a Whirlpool reportava recuperação de quase 4 pontos de *market share* em refrigeradores, lavadoras e fogões em um único trimestre, evidência de disputa constante por participação². O setor de linha branca no Brasil recuou 1% em vendas em 2025, segundo a Eletros³, mercado maduro em que o crescimento de um player passa a depender da erosão da fatia dos concorrentes.

###### 2. Poder de negociação dos fornecedores — Moderado, com concentração pontual em componentes eletrônicos

A Whirlpool Latin America mantém uma base ampla de 3.730 fornecedores (750 de materiais diretos, 2.980 de indiretos), concentrados nos estados onde possui plantas — Amazonas, Santa Catarina e São Paulo⁴. Essa diversificação dilui o poder da maioria dos fornecedores, mas não de forma homogênea entre categorias de insumo:

- **Componentes eletrônicos (placas, sensores, semicondutores):** segmento sujeito a choques globais de oferta, elevando o poder de barganha de fornecedores especializados em ciclos de escassez, à medida que a Whirlpool amplia a eletrônica embarcada de seus produtos.
- **Aço e insumos de commodity:** menor poder de barganha, dado o caráter padronizado e substituível do material.

O volume de compra da própria Whirlpool, como maior fabricante de eletrodomésticos da América Latina, gera poder de barganha reverso relevante sobre fornecedores de médio e pequeno porte.

###### 3. Poder de negociação dos compradores — Alto

Como o modelo é B2C indireto, o comprador relevante para fins de precificação e condição comercial é o canal varejista, não o consumidor final isolado:

- No Brasil, Magazine Luiza e Grupo Casas Bahia (via Via Varejo, ~1.073 lojas) concentram parcela relevante do volume de eletrodomésticos, com lojas físicas ainda decisivas em 87% da jornada de compra.
- A fragilidade financeira recente de grandes varejistas — Americanas em recuperação judicial, desvalorizações acionárias expressivas de Casas Bahia e Magazine Luiza — eleva, paradoxalmente, o poder de barganha de curto prazo desses varejistas, que passam a exigir condições comerciais mais favoráveis².
- No México, cadeias como Liverpool e Elektra cumprem função equivalente.
- O baixo custo de troca do consumidor final entre marcas no segmento econômico reforça o papel do varejo como intermediário capaz de colocar fabricantes concorrentes em disputa direta.

###### 4. Ameaça de novos entrantes — Moderada, em elevação estrutural

As barreiras tradicionais de entrada permanecem relevantes — intensidade de capital, certificação regulatória (INMETRO), rede de distribuição consolidada e fidelidade de marca (Brastemp e Consul têm mais de 70 anos de presença regional). Contudo, dois movimentos reduzem a efetividade dessas barreiras: marcas chinesas (Hisense, TCL, Midea, Gree) expandem agressivamente no varejo brasileiro, redirecionando capacidade excedente das tarifas americanas e contornando a barreira de manufatura local via importação, a própria Whirlpool reconhece que a presença chinesa "contribui para aumentar o mercado e expor os diferenciais das marcas". No México, o boom de *nearshoring*, puxado pelo USMCA, eleva a barreira para quem não possui planta local, mas também sinaliza custo crescente de entrada via manufatura doméstica, o que direciona novos entrantes à rota de importação, o mesmo caminho já adotado pelas chinesas no Brasil.

###### 5. Ameaça de produtos e comportamentos substitutos — Alta e estruturalmente crescente

A ameaça de substituição é alta e estruturalmente crescente, com quatro camadas atuando sobre o portfólio de cocção e refrigeração da Whirlpool na América Latina.

**a) Substituição tecnológica intra-categoria — fogão a gás por indução.** A indução ganha tração em 2026 por eficiência energética, segurança e queda de preço de entrada, com modelos compactos a partir de R$ 180–350. A própria Whirlpool responde com início de produção nacional de fogões por indução em Manaus a partir do segundo semestre de 2026, migração de capacidade fabril, não apenas de portfólio de importação⁶.

**b) *Unbundling* funcional do fogão por eletroportáteis — a air fryer.** A penetração de air fryers nos domicílios brasileiros saltou de 36,2% para 64% entre 2022 e 2025, com o mercado da categoria crescendo 340% no período⁷. As ocasiões de preparo rápido já respondem por mais de 30% dos preparos domésticos, enquanto a fritura tradicional caiu para 17% das ocasiões. Não é substituição de compra, mas de **uso e intensidade de uso**: funções do fogão migram para um eletroportátil dedicado, o que tende a alongar o ciclo de reposição e a pressionar para baixo a demanda por capacidade e robustez térmica do produto principal.

**c) Substituição do próprio ato de cozinhar — aplicativos de delivery.** A penetração de pedidos por aplicativo entre consumidores brasileiros passou de 80% em 2020 para 89% em 2022, e "não querer cozinhar" é a motivação declarada por 24% dos usuários, a razão mais citada⁸. O efeito líquido sobre a demanda por eletrodomésticos é ambíguo: o consumo doméstico agregado de alimentos ainda cresceu 3,09% entre 2022 e 2023, sugerindo complementaridade mais do que substituição direta na média da população. Ainda assim, evidencia redução na frequência de uso do fogão em domicílios urbanos menores e unipessoais.

**d) Substituição por mudança de hábito alimentar e de moradia — o efeito GLP-1 e a compactação urbana.** Segundo executivos da Whirlpool entrevistados em janeiro de 2026, a disseminação de impacto de medicamentos GLP-1 (Ozempic, Mounjaro, Wegovy), cuja importação cresceu 88% em 2025 já altera o padrão de compra de eletrodomésticos: consumidores priorizam freezers maiores e **migram para fogões menores, com menos bocas**, "as pessoas não querem mais aqueles fogões enormes", nas palavras do diretor de marketing de categoria da companhia. Em resposta, a Whirlpool renovou por completo as linhas de cooktop de Consul e Brastemp, e reposicionou o frigobar Brastemp Retrô como solução de armazenamento fora da cozinha. O relatório *Home Appliances Outlook 2026*, da NielsenIQ, corrobora a tendência: o consumidor latino-americano já prioriza conveniência, multifuncionalidade e bem-estar acima de preço puro, com o valor das vendas globais de eletrodomésticos crescendo 5% no primeiro semestre de 2025 mesmo com volume estável (+1%)⁵.

###### Síntese e implicações estratégicas

O setor de linha branca na América Latina apresenta atratividade moderada a baixa sob a ótica de Porter: rivalidade alta (compressão da margem EBIT de 6,0% para 3,0% em um ano), poder de barganha elevado do canal varejista, fornecedores concentrados em componentes eletrônicos críticos, barreiras de entrada em erosão frente a competidores asiáticos, e uma ameaça de substituição multifacetada que combina fatores tecnológicos, comportamentais e sociodemográficos.

Duas forças têm implicação mais direta sobre o Thermal Predictor. Da segunda (fornecedores) decorre dependência crescente de componentes eletrônicos e sensores embarcados, à medida que a Whirlpool amplia a eletrônica de seus produtos, dependência que eleva o custo e o risco de desenvolvimento baseado em iteração física repetida de protótipos, reforçando o valor de um modelo preditivo capaz de antecipar o comportamento térmico sem múltiplos ciclos de teste. Da quinta (substitutos) decorre uma transição de portfólio já em curso, fogões mais compactos, com menos bocas, e migração para indução, que amplia, e não reduz, a necessidade de um modelo preditivo robusto: cada nova arquitetura exige um novo ciclo de simulação e teste, incompatível com a velocidade de renovação de portfólio já imposta pelo mercado.

Em conjunto, essas duas forças convertem a leitura setorial em justificativa direta de negócio para o projeto: o Thermal Predictor não responde apenas a uma dor operacional interna de lead time e custo de prototipagem, mas a uma pressão estrutural de mercado que torna a velocidade de validação térmica um fator de competitividade. Reduzir a dependência de ciclos físicos de teste é, neste contexto, condição para que a Whirlpool consiga acompanhar o ritmo de transição de portfólio já imposto pela concorrência e pelo comportamento do consumidor.

#### 4.1.2. Análise SWOT

##### Escopo e critério de classificação

A análise delimita-se à Divisão de Fogões da Whirlpool — engenharia e P&D de fogões de piso (Freestanding) para Brasil e México, subordinada à Whirlpool Latin America —, no recorte do desenvolvimento de produtos de cocção e da avaliação térmica por CFD, ponto do negócio em que a solução se insere.

<div align="center">
  <sub>Figura 1 — Matriz SWOT da Solução para Whirlpool Brasil/México</sub><br>
  <img src="../assets/analise_swot.png" alt="Matriz SWOT da Solução para Whirlpool Brasil/México" width="100%"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

---

##### S: Forças (internas)

- **S1. Parque industrial integrado nas Américas** — Joinville (SC), Rio Claro (SP), Manaus (AM); cinco unidades no México (três em Apodaca/Nuevo León, uma em Celaya/Guanajuato, uma em Ramos Arizpe/Coahuila), 3º país mais relevante em manufatura do grupo: escala que dilui o custo fixo de investimento em ferramentas de engenharia por um volume grande de unidades.
- **S2. Investimento contínuo em P&D e manufatura avançada** — cerca de R$500 milhões/ano em pesquisa, desenvolvimento e automação; centro de capacitação em manufatura avançada em Rio Claro¹⁴: reduz o risco de rejeição cultural à tecnologia digital.
- **S3. Acervo proprietário de simulações CFD e ensaios térmicos** — matéria-prima que viabiliza o aprendizado de máquina e barreira de entrada de difícil replicação por concorrentes sem a mesma longevidade na categoria.
- **S4. Cultura de melhoria contínua consolidada (WCM)** — planta de Ramos Arizpe é referência na América do Norte¹⁵: favorece disciplina de dados e versionamento.
- **S5. Engenharia térmica e laboratórios de validação próprios** — permitem confrontar internamente a saída do modelo com dados reais e encurtar o ciclo de verificação.
- **S6. Portfólio multimarca reaproveitável em BR/MX** — Brastemp, Consul, KitchenAid e Whirlpool desenvolvem simultaneamente famílias com requisitos térmicos distintos, multiplicando o retorno de uma mesma ferramenta.

##### W: Fraquezas (internas)

- **W1. Ciclo de simulação térmica longo e caro** — malha, HPC e especialista dedicado por rodada; limita o número de alternativas testáveis no cronograma — gargalo central que o projeto endereça.
- **W2. Dados de engenharia sem estrutura analítica** — base transposta (variáveis em linhas), tipos mistos, referências quebradas, sem dicionário de dados nem pipeline de ingestão orientado a ML.
- **W3. Baixo volume amostral por família de produto** — cada registro é uma simulação custosa; eleva o risco de sobreajuste e limita a generalização para geometrias não observadas no treino.
- **W4. Conhecimento térmico concentrado em poucos especialistas** — risco de descontinuidade e gargalo de agenda, pois a validação do modelo compete com as demais demandas dessas pessoas.
- **W5. Confidencialidade restringe a colaboração externa** — geometrias, materiais e desempenho são informação sensível, tensionando entregas em repositório público com a proteção dos dados do parceiro.
- **W6. Reestruturação da rede fabril em curso** — encerramento de planta em Apodaca até o 2T2027, custo estimado de US$165 milhões¹⁶: desloca linhas, exige revalidação e disputa capex e atenção gerencial com projetos de inovação.

##### O: Oportunidades (externas)

- **O1. Regulação de eficiência energética em endurecimento** — Etiquetagem INMETRO¹⁷ e Selo PROCEL como critério de compra e de acesso a programas habitacionais: favorece quem itera mais alternativas por unidade de tempo.
- **O2. Nacionalização de linhas e crescimento das exportações** — amplia a variedade de produtos desenvolvidos no Brasil; cada nova configuração é um caso de uso adicional para a ferramenta.
- **O3. Padronização de engenharia entre Brasil e México** — modelo validado no Brasil, transferível ao portfólio mexicano a custo marginal baixo, convertendo entrega local em ativo regional.
- **O4. Ecossistema acadêmico e incentivos fiscais à P&D** — testam hipóteses tecnológicas a custo e risco baixos e dão acesso a métodos e literatura recentes sobre modelos substitutos aplicados à engenharia.

##### T: Ameaças (externas)

- **T1. Escassez e disputa por talentos de dados e ML** — perfil necessário para monitorar, retreinar e evoluir o modelo, remunerado acima da média da indústria.
- **T2. Elevação contínua dos patamares normativos** — resoluções do CGIEE e revisões das portarias do INMETRO¹⁷: erro de previsão térmica em fase de projeto pode gerar reprovação em certificação, retrabalho ou risco de campo.
- **T3. Avanço de importados e de fabricantes asiáticos** — Samsung, LG e Midea operam com estruturas de P&D de escala global, encurtando janelas de lançamento e reduzindo a tolerância a ciclos longos.
- **T4. Exposição da produção mexicana à política tarifária dos EUA** — Ramos Arizpe destina quase toda a produção aos mercados norte-americanos¹⁵; alterações tarifárias redirecionam prioridades de investimento.
- **T5. Elasticidade preço-demanda comprime o orçamento de P&D** — cada 1% de aumento de custo reduz a demanda em 0,7% a 1%; juros elevados deixam pouco espaço para repassar custos.

---

##### Matriz TOWS

| | **Forças (S)** | **Fraquezas (W)** |
|:---|:---|:---|
| **Oportunidades (O)** | **SO —** Usar o acervo de CFD (S3) e a validação própria (S5) para maximizar a classe de eficiência energética (O1) antes de comprometer horas de CFD, estendendo o ganho às linhas nacionalizadas (O2) e ao portfólio mexicano (O3). | **WO —** Estruturar o dicionário de dados, padronizar a saída das simulações e planejar novas rodadas por DOE nas regiões de maior incerteza (W2, W3), apoiando-se na parceria acadêmica e nos incentivos à P&D (O4). |
| **Ameaças (T)** | **ST —** Encurtar o ciclo de concepção e validação com escala industrial (S1), cultura de melhoria contínua (S4) e engenharia própria (S5), respondendo à concorrência asiática (T3), preservando margem (T5) e mitigando exposição de propriedade intelectual. | **🛡 WT —** Posicionar o modelo como ferramenta de triagem e priorização, não substituto do CFD na homologação, reportando faixa de erro explícita e critério objetivo de escalonamento para simulação completa, para conter o risco normativo (T2); documentar o pipeline e automatizar o retreino reduz a dependência de especialistas (W4) e a exposição à rotatividade de talentos (T1). |

##### Implicação para o projeto

O gargalo de custo e lentidão do ciclo de simulação térmica (W1) coincide com as pressões externas que mais crescem: exigência regulatória de eficiência (O1, T2), concorrência acelerada (T3) e necessidade de mais variantes de produto por período (O2, O3). A empresa detém os ativos para atacá-lo, acervo histórico de simulações (S3), engenharia térmica própria (S5) e orçamento de P&D consolidado (S2). O modelo preditivo converte essa fraqueza operacional em capacidade de resposta ao mercado; a principal condicionante de sucesso, evidenciada pela própria análise, não é algorítmica, mas de qualidade e volume de dados (W2, W3), o que justifica a prioridade das etapas de estruturação do dataset no cronograma do projeto.

##### Limitações da análise

Os fatores internos relativos a dados e à concentração de conhecimento foram inferidos a partir do material disponibilizado e da interação com o parceiro, não de auditoria formal, e carecem de validação com o time de engenharia. A seleção de fatores reflete o recorte declarado: elementos de alto impacto corporativo sem conexão com a etapa de simulação térmica foram deliberadamente excluídos. Os dados externos referem-se ao período até meados de 2026, e o setor é sensível a juros, câmbio e política comercial, de modo que a análise deve ser revisitada ao longo do projeto.


#### 4.1.3. Planejamento Geral da Solução
 
A base de dados disponibilizada pela Whirlpool reúne o histórico de simulações numéricas (CFD) e de testes físicos internos referentes aos fogões de piso (Freestanding) das arquiteturas do Brasil e do México. Ao todo, são 39 rodadas de teste (Runs), cada uma definida por sete variáveis de configuração, como direção do fluxo de ar do blower, estado do housing, posição da placa e material do suporte da bobina, e acompanhada da leitura de temperatura de 78 sensores/termopares, distribuídos entre as seis áreas-chave do equipamento identificadas no dicionário de dados: Mainback, bobinas, sistemas de ventilação, componentes do IPC, comandos do cooktop (CT Knobs) e região de HMI. Trata-se de um conjunto de dados confidencial, de uso interno da Whirlpool, que deverá ser complementado e corrigido ao longo do projeto conforme alinhado com o parceiro.
 
A solução proposta é um modelo de machine learning supervisionado, treinado a partir desses dados históricos, capaz de aprender a relação entre a configuração de montagem do fogão e a temperatura resultante em cada sensor. Com isso, torna-se possível estimar a temperatura de uma nova configuração sem a necessidade de executar uma simulação CFD completa ou construir um protótipo físico para testá-la.
 
Do ponto de vista operacional, o dashboard funciona da seguinte forma: como input, o usuário seleciona os parâmetros de configuração do fogão que deseja avaliar, direção do fluxo de ar do blower, estado do housing, posição da placa, material do suporte da bobina e presença do furo do defletor. Como output, o modelo retorna a temperatura estimada para os sensores/termopares das áreas-chave selecionadas, acompanhada de sua margem de erro esperada e de uma indicação de confiabilidade, sinalizando se a configuração consultada está dentro da faixa de combinações já testadas pela Whirlpool ou se representa uma extrapolação do modelo, caso em que a estimativa deve ser tratada com mais cautela.

O uso está previsto para múltiplas áreas da Whirlpool identificadas junto ao parceiro no kickoff do projeto, cada uma impactada de forma distinta pela solução. Para o time de Engenharia (CFD), hoje responsável por rodar as simulações numéricas completas, o impacto é a liberação de capacidade: em vez de simular todas as configurações candidatas, a equipe pode usar o dashboard para triar rapidamente quais delas realmente justificam o tempo de uma simulação CFD completa ou de um teste físico, concentrando seu esforço especializado nos casos mais críticos — o que é especialmente relevante diante da disponibilidade limitada já identificada para essa equipe no primeiro semestre de 2026. Para os times de Produtos e Design, o impacto é a redução do tempo de iteração: decisões de posicionamento de componentes que hoje dependem do ciclo completo de simulação ou protótipo passam a poder ser exploradas em minutos ainda na fase conceitual, permitindo avaliar mais alternativas de design dentro do mesmo prazo de projeto. Para o time de Qualidade, o impacto é a priorização mais informada de quais configurações merecem avançar para testes físicos e destrutivos, reduzindo o número de protótipos construídos apenas para serem descartados. Já para o time de Marketing, o impacto é o acesso antecipado a características térmicas do produto, antes da validação final, para embasar posicionamento e comunicação sem depender do cronograma de testes físicos.

Os principais benefícios esperados são a redução do tempo de desenvolvimento em até 30% e a diminuição dos gastos operacionais com protótipos em até 25%, conforme estimado pelo parceiro no Project Charter. Espera-se, ainda, uma contribuição indireta para a redução do desperdício de materiais associado à fabricação de protótipos físicos e à realização de testes destrutivos.
 
Como critério de sucesso, o modelo deverá prever a temperatura com margem de erro máxima de 10% e apresentar uma eficiência de tempo pelo menos 90% maior do que a simulação numérica tradicional. Por se tratar de uma prova de conceito (PoC), o sucesso desta primeira etapa também será avaliado pela validação consistente do modelo nos sensores e áreas priorizadas em conjunto com o parceiro, e não necessariamente pela cobertura de todos os 78 sensores monitorados.

#### 4.1.4. Value Proposition Canvas

<div align="center">
  <sub>Figura 2 — Canvas de Proposta de Valor da Whirlpool</sub><br>
  <img src="../assets/caanvasSolucao.png" width="800" alt="Canvas"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

**Segmento de clientes.** O cliente primário da solução são as áreas de Engenharia e Qualidade, que operam diretamente o modelo e tomam a decisão técnica a partir da previsão gerada. Produtos, Design e Marketing são beneficiários secundários, que consomem o resultado da previsão sem operar a ferramenta.

**Produtos e Serviços** 

O bloco reúne os três entregáveis definidos: o modelo preditivo de Machine Learning, o software distribuído em formato open source e o dashboard interativo. O dashboard é a interface pela qual Engenharia e Qualidade operam o modelo, tendo em Beatriz (Designer UX/UI) a persona responsável por mantê-la e evoluí-la. 

**Criadores de Ganho**

Os dois criadores centrais — eliminação de retrabalho entre arquiteturas BR/MX e democratização de decisões técnicas — sustentam a necessidade de Estela (Engenheira de Materiais), operadora direta do modelo, de comparar diferentes materiais e espessuras sem depender de um novo protótipo para cada opção. Em posição de apoio, os indicadores de 90% de eficiência frente à simulação tradicional e de 30% de redução no tempo de desenvolvimento sustentam as necessidades da persona Geraldo (Especialista de Marketing), cuja dor central é depender do cronograma de testes físicos para saber quando o produto estará pronto para divulgação. A pesquisa de gestão de produto reforça essa relação: reduz diretamente os custos de desenvolvimento, permite acesso antecipado ao potencial de mercado e garante vantagens de pioneirismo¹⁸.

**Aliviadores de Dor**

Este bloco tem aderência direta às dores das personas técnicas do projeto. A eliminação da dependência de protótipos físicos e testes destrutivos responde precisamente à dor relatada por João (Engenheiro de Qualidade), que depende de testes físicos destrutivos, lentos e caros, para validar a segurança térmica, e por Estela, que enfrenta o mesmo gargalo ao validar resistência de materiais. Estudos sobre simulação digital no desenvolvimento de produto sustentam esse ganho: uma pesquisa da McKinsey, em conversas com líderes de P&D, mostra que gêmeos digitais já reduziram os prazos de desenvolvimento em até 50% para alguns usuários, com redução de custo associada, validando a lógica de que substituir ciclos físicos por simulação preditiva é uma estratégia de negócio consolidada, não apenas uma escolha técnica pontual do projeto¹⁹.

**Ganhos do Cliente**

O ganho de tomar decisões de engenharia baseadas em dados, e não em intuição, conecta-se diretamente a João (Engenheiro de Qualidade) e Estela (Engenheira de Materiais), que passam a aprovar ou priorizar configurações com base em um número verificável, em vez de aguardar o ciclo completo de teste físico. Em posição de apoio, o ganho de lançar produtos mais rapidamente sem perder qualidade térmica conecta-se à persona Geraldo, cuja necessidade central é alinhar o cronograma de campanha à data real de validação do produto — relação sustentada por pesquisa publicada no IEEE Transactions on Engineering Management: em estudo com 692 projetos de desenvolvimento de novos produtos, a velocidade de lançamento mostrou-se geralmente associada de forma positiva ao sucesso do novo produto²⁰. O ganho de custo zero de licenciamento, por sua vez, sustenta a viabilidade orçamentária da solução como um todo.

**Dores do Cliente**

O bloco distingue-se dos aliviadores por descrever a dor sob a perspectiva do cliente, e não da solução proposta. Duas dores refletem diretamente o problema central do projeto (lead time elevado e custo de prototipagem física); as demais decorrem de riscos operacionais específicos identificados na fase de planejamento. A opção por ancorar essas dores em riscos reais do projeto, em vez de dores genéricas de mercado, confere maior credibilidade e rastreabilidade ao canvas.

**Tarefas do Cliente**

A tarefa relacionada à precisão térmica dentro da margem de 10% é o item de maior relevância em todo o canvas, pois corresponde ao critério que determinará, de forma mensurável, o sucesso ou insucesso da solução desenvolvida. Da mesma forma, é imprescindível olhar que diversas simulações são feitas em aplicativos licenciados e fisicamente, mas que ainda não são reaproveitadas para previsões de futuras combinações.


#### 4.1.5. Matriz de Riscos

A Matriz de Riscos é uma ferramenta que auxilia na identificação, análise e priorização dos principais riscos de um projeto, permitindo uma gestão mais estratégica e preventiva. Ela organiza os riscos com base em critérios como probabilidade de ocorrência e impacto, possibilitando classificá-los e definir planos de resposta adequados. No contexto deste projeto, a matriz de riscos foi utilizada para mapear ameaças e oportunidades relacionadas ao desenvolvimento do Thermal Predictor, modelo de Machine Learning para previsão da temperatura de fogões de piso (Freestanding) da Whirlpool nas arquiteturas do Brasil e do México. Entre os riscos mapeados, destacam-se a possível desorganização dos dados históricos de simulações numéricas (CFD) e testes físicos, que pode atrasar a construção da Prova de Conceito, e a disponibilidade limitada da equipe interna de CFD da Whirlpool no primeiro semestre de 2026, o que pode gerar gargalos na fase de validação dos modelos. O mapeamento desses riscos permite à equipe antecipar problemas críticos e tomar decisões mais seguras ao longo do desenvolvimento do projeto, contribuindo para o cumprimento das metas de acurácia (margem de erro ≤ 10%) e eficiência de tempo definidas com o parceiro.

<p align="center">
  <sub>Figura 3 — Matriz de Risco: Ameaças</sub><br>
  <img src="../assets/matriz_amecas.png" alt="Matriz de Ameaças" width="600"/>
  <br>
  <em>Fonte: Elaborado pelos autores (2026).</em>
</p>

**1. Inconsistência estrutural e perda de rastreabilidade da base histórica (R01):**

Trata-se de um risco de natureza tecnológica. Sua probabilidade de ocorrência foi estimada em 90%, uma vez que a inspeção da base fornecida já evidenciou o problema: cabeçalhos de coluna duplicados (Run 22, 43, 44 e 45 aparecem repetidos), erros #REF! na coluna identificadora dos termopares, aproximadamente 12% de células vazias e uma coluna de limite que mistura valores numéricos com texto. O impacto foi classificado como alto porque nenhum modelo pode ser treinado sobre uma base em formato wide, na qual cada simulação é uma coluna e não uma observação, e porque o descarte de execuções irrecuperáveis agrava diretamente a escassez amostral tratada em R02. A combinação desses fatores resulta em uma classificação geral alta. O impacto não foi classificado como muito alto porque o problema é integralmente detectável antes do treinamento, não podendo propagar-se silenciosamente até a decisão de engenharia. Como plano de ação, a equipe desenvolverá um pipeline de ETL versionado em Python que realizará o unpivot da planilha para o formato long, resolverá as duplicidades por sufixo de repetição, substituirá os identificadores corrompidos por chave estável documentada em dicionário de dados e aplicará validação automática com Pandera por regras nomeadas. Caso mais de 5% dos registros sejam reprovados na validação, o treinamento será interrompido até revisão manual da base junto à equipe de CFD da Whirlpool.

**2. Volume amostral insuficiente de simulações (R02):**

Trata-se de um risco de natureza de dados e Machine Learning. Sua probabilidade de ocorrência foi estimada em 70%, pois a obtenção de execuções históricas adicionais depende de extração nos servidores internos da Whirlpool e da priorização do parceiro, condição favorável à ocorrência mas ainda não confirmada, uma vez que o mapeamento do acervo disponível não foi concluído. O impacto foi classificado como muito alto porque a escassez de amostras impede estimar o erro de generalização com significância estatística e inviabiliza sustentar contratualmente a margem de 10% exigida no Project Charter. A combinação desses fatores resulta em uma classificação geral alta. A base disponibilizada contém trinta e nove execuções independentes, e não aproximadamente três mil e quinhentas observações, pois os termopares de uma mesma simulação compartilham geometria, malha e solver. Como plano de ação, a equipe solicitará formalmente ao Sponsor a extração de execuções adicionais, priorizará algoritmos de baixa variância — Ridge, Random Forest raso e Gradient Boosting regularizado — em vez de redes neurais, adotará validação cruzada Leave-One-Group-Out aninhada com agrupamento por configuração física e reportará toda métrica acompanhada de intervalo de confiança de 95%. Caso o número de execuções utilizáveis permaneça abaixo de sessenta, o escopo será renegociado com o Sponsor para um modelo restrito às condições de operação com maior densidade de dados.

**3. Superajuste do modelo com estimativa de erro otimista (R03):**

Trata-se de um risco de natureza de dados e Machine Learning. Sua probabilidade de ocorrência foi estimada em 70%, devido à alta razão entre o número de variáveis — parâmetros geométricos, direção do soprador, tipo de placa e modo de operação — e o número de execuções independentes disponíveis, condição estrutural presente desde o início do projeto. O impacto foi classificado como alto porque um modelo superajustado apresentaria métricas excelentes em laboratório e desempenho degradado em uso, comprometendo o critério de aceite e exigindo retrabalho de modelagem. A combinação desses fatores resulta em uma classificação geral alta. O risco é agravado pela existência de execuções muito semelhantes entre si na base, que vazam informação entre treino e validação quando o particionamento é feito por linha. Cabe registrar que o impacto não foi classificado como muito alto porque o superajuste, isoladamente, é detectável pelo protocolo de validação antes de qualquer entrega, sendo suas consequências de segurança tratadas em R04. Como plano de ação, a equipe aplicará regularização L1 e L2, separará o conjunto de teste por execução completa e nunca por linha, manterá um conjunto de teste congelado até a validação técnica e exigirá que o modelo supere dois baselines obrigatórios. Caso a diferença entre o erro de treino e o erro de validação ultrapasse cinco pontos percentuais, os hiperparâmetros serão reajustados e a complexidade do modelo reduzida antes de qualquer apresentação de resultados ao parceiro.

**4. Baixa generalização para novos modelos de fogão (R04):**

Trata-se de um risco de natureza de dados e Machine Learning. Sua probabilidade de ocorrência foi estimada em 50%, pois depende do comportamento de uso da ferramenta pelos engenheiros: consultas dentro do envelope de arquiteturas conhecidas não configuram extrapolação, e a proporção entre usos interpolados e extrapolados só será conhecida após a entrega. O impacto foi classificado como muito alto, uma vez que previsões extrapoladas e silenciosamente erradas poderiam levar à aprovação de um projeto termicamente inseguro sem emitir qualquer sinal de alerta ao engenheiro. A combinação desses fatores resulta em uma classificação geral alta. As arquiteturas do Brasil e do México possuem diferenças construtivas relevantes entre si, e o valor de negócio do projeto reside justamente na previsão de produtos ainda não prototipados. Como plano de ação, a equipe implementará um detector de extrapolação em duas camadas, combinando verificação de envelope marginal com detecção de novidade multivariada, e o dashboard exibirá três estados — interpolação, extrapolação moderada e fora de domínio —, suprimindo o valor numérico neste último e recomendando a simulação CFD tradicional, pois exibir um número acompanhado de ressalva textual não impede seu uso. Caso mais de 20% das consultas de teste caiam fora do envelope de treinamento, o domínio de validade será formalmente documentado e comunicado aos engenheiros usuários.

**5. Herança do erro sistemático do solver CFD (R05):**

Trata-se de um risco de natureza de dados e Machine Learning, e constitui a principal ameaça à validade física dos resultados do projeto. Sua probabilidade de ocorrência foi estimada em 50%, pois, embora o aprendizado supervisionado reproduza o alvo por construção, o solver empregado pela Whirlpool é calibrado internamente contra testes físicos, de modo que a magnitude do desvio residual é desconhecida e pode situar-se dentro da tolerância aceitável. O impacto foi classificado como muito alto porque, caso o desvio seja relevante, a previsão pode situar-se simultaneamente dentro da tolerância de 10% em relação ao CFD e fora da realidade física, conduzindo à aprovação de um projeto inseguro sem que nenhuma métrica interna acuse o problema. A combinação desses fatores resulta em uma classificação geral alta. O erro do próprio solver, decorrente da discretização de malha, do modelo de turbulência e das condições de contorno, estabelece o teto real de acurácia alcançável pela solução. Como plano de ação, a equipe reservará um subconjunto de testes físicos como conjunto de calibração independente, quantificará e reportará o desvio entre simulação e teste físico como erro irredutível de referência e declarará explicitamente no dashboard que a previsão estima a saída do CFD, e não a medição. Caso o desvio ultrapasse 5% em qualquer termopar com limite normativo definido, será aplicada camada de correção de viés calibrada sobre os testes físicos disponíveis.

**6. Critério de aceite de 10% não operacionalizável (R06):**

Trata-se de um risco de natureza estratégica. Sua probabilidade de ocorrência foi estimada em 90%, pois a ambiguidade não é uma possibilidade futura, mas uma condição já presente no documento vigente: o Project Charter estabelece erro máximo de 10% sem definir métrica, unidade ou nível de agregação. O impacto foi classificado como alto porque a acurácia é o principal indicador de sucesso do projeto e um critério não verificável impossibilita declarar objetivamente seu atingimento. A combinação desses fatores resulta em uma classificação geral alta. O erro percentual pressupõe escala de razão com zero absoluto, condição que a escala Celsius não satisfaz por ser intervalar: 10% de 150 °C correspondem a 15 °C, mas os mesmos 150 °C equivalem a 423,15 K, cujos 10% correspondem a 42,3 °C, de modo que a métrica se altera conforme a unidade adotada. O impacto não foi classificado como muito alto porque o risco é integralmente resolúvel por acordo documental, sem depender do desempenho técnico da solução. Como plano de ação, a equipe formalizará um aditivo ao Project Charter, antes do início da modelagem, definindo uma métrica tríplice: erro médio absoluto em graus Celsius por termopar, erro normalizado pela folga térmica e taxa de falsos-negativos de segurança. Caso o Sponsor mantenha contratualmente o critério percentual, as três métricas serão reportadas em paralelo e a limitação metodológica será formalmente registrada no relatório final.

**7. Falha de integração e ausência de sustentação do software (R07):**

Trata-se de um risco de natureza de engenharia de software. Sua probabilidade de ocorrência foi estimada em 50%, pois depende de decisão organizacional da Whirlpool quanto à designação de um mantenedor interno, além da formalização do contrato de interface entre o modelo preditivo e o dashboard, ainda pendente. O impacto foi classificado como moderado porque falhas de integração são detectáveis por testes automatizados e corrigíveis dentro do próprio ciclo de desenvolvimento, gerando retrabalho localizado sem comprometer o critério de aceite, enquanto a ausência de sustentação produz seus efeitos apenas após o encerramento do projeto. A combinação desses fatores resulta em uma classificação geral média. Ainda assim, em um ciclo de projeto de um único semestre, não há tempo hábil para tratar integração e sustentação como atividades de encerramento. Como plano de ação, a equipe definirá o contrato de interface com esquema de entrada e saída versionado, implementará testes de integração automatizados em pipeline de integração contínua, elaborará inventário de dependências e respectivas licenças submetido a validação jurídica e entregará plano formal de sustentação com mantenedor designado na Whirlpool. Caso seja identificada licença incompatível com o uso industrial interno ou falha de contrato nos testes automatizados, o componente será substituído antes da Prova de Conceito.

**8. Não adoção da ferramenta pela equipe de engenharia (R08):**

Trata-se de um risco de natureza estratégica e de experiência do usuário. Sua probabilidade de ocorrência foi estimada em 30%, pois a demanda partiu da própria liderança de engenharia e o patrocínio interno reduz substancialmente a resistência organizacional, ainda que a substituição de um processo consolidado exija confiança em previsões que o engenheiro precisa poder auditar. O impacto foi classificado como alto, uma vez que a não adoção anularia integralmente os benefícios previstos de redução de 30% no tempo de desenvolvimento e de 25% nos gastos com protótipos. A combinação desses fatores resulta em uma classificação geral média. Engenheiros tendem a rejeitar previsões que não conseguem auditar, sobretudo quando apresentadas como valor pontual, sem faixa de incerteza associada. Como plano de ação, os usuários finais serão envolvidos como co-criadores desde a Prova de Conceito, será implementada camada de explicabilidade com valores SHAP e exibição de casos análogos do conjunto de treino, os intervalos de predição serão exibidos obrigatoriamente junto a cada previsão, a hierarquia de informação seguirá o agrupamento por Key Area já utilizado pelo time e o dashboard contará com telemetria de uso instrumentada. Caso menos de 50% dos engenheiros treinados utilizem a ferramenta no primeiro mês após a entrega, será realizada nova rodada de treinamento com casos reais escolhidos pela própria equipe.

<p align="center">
  <sub>Figura 4 — Matriz de Risco: Oportunidades</sub><br>
  <img src="../assets/matriz_oportunidades.png" alt="Matriz de Oportunidades" width="600"/>
  <br>
  <em>Fonte: Elaborado pelos autores (2026).</em>
</p>

**1. Avaliação em larga escala de configurações de projeto (R01)**

Trata-se de uma oportunidade de natureza de negócio e engenharia. Sua probabilidade de ocorrência foi estimada em 70%, pois decorre de uma característica intrínseca da solução e depende apenas de execução pela equipe: uma simulação CFD leva horas para ser concluída, enquanto uma previsão do modelo treinado é obtida em frações de segundo. O impacto foi classificado como muito alto porque permite avaliar centenas de configurações em uma única sessão de trabalho, volume inviável no processo atual, alterando a própria natureza do trabalho de engenharia. A combinação desses fatores resulta em uma classificação geral alta. Hoje o engenheiro seleciona previamente poucas alternativas e simula apenas essas, enquanto a ferramenta permite varrer sistematicamente o conjunto de possibilidades e identificar combinações que dificilmente seriam escolhidas para simulação individual. Como plano de ação, a equipe implementará no dashboard uma funcionalidade de avaliação em lote, capaz de processar simultaneamente múltiplas combinações de direção do soprador, tipo de placa e modo de operação, com resultados ordenados pela proximidade ao limite normativo. Caso a funcionalidade registre uso por mais de 50% dos engenheiros treinados no primeiro mês, será desenvolvido módulo complementar capaz de sugerir configurações que atendam a um alvo térmico especificado.

**2. Consolidação da base histórica como acervo permanente (R02)**

Trata-se de uma oportunidade de natureza de dados. Sua probabilidade de ocorrência foi estimada em 70%, uma vez que o pipeline de tratamento previsto como resposta ao risco R01 produzirá, como resultado necessário, uma base padronizada, documentada e versionada, dependendo apenas de sua formalização como entregável. O impacto foi classificado como alto porque a Whirlpool passará a dispor de um histórico de simulações organizado e consultável, condição hoje inexistente, cujo valor persiste independentemente do desempenho do modelo preditivo. A combinação desses fatores resulta em uma classificação geral alta. Trata-se da única entrega do projeto que gera valor mesmo na hipótese de a meta de 10% de erro não ser plenamente atingida, o que a torna especialmente relevante diante da concentração de riscos descrita na matriz de ameaças. Como plano de ação, a equipe tratará a base tratada e seu dicionário de dados como entregáveis formais do projeto, e não como artefatos internos de desenvolvimento, documentando-os para transferência à Whirlpool e estruturando o formato de modo a acomodar execuções futuras sem retrabalho. Caso a base tratada ultrapasse 95% de conformidade nas regras de validação e seja aprovada pela equipe de CFD na Prova de Conceito, será elaborado procedimento padronizado de ingestão para que novas simulações alimentem o acervo sem intervenção da equipe de dados.

**3. Priorização dos ensaios físicos a partir do modelo (R03)**

Trata-se de uma oportunidade de natureza de negócio. Sua probabilidade de ocorrência foi estimada em 50%, pois depende de resultado técnico ainda não verificado: o modelo precisa ordenar corretamente as configurações por criticidade térmica, ainda que não necessariamente acerte a temperatura absoluta de cada uma. O impacto foi classificado como muito alto porque permitiria concentrar os protótipos físicos remanescentes nas configurações de maior risco, superando a meta de redução de 25% prevista no Project Charter. A combinação desses fatores resulta em uma classificação geral alta. Cabe destacar que ordenar configurações por criticidade é tarefa substancialmente mais simples do que prever sua temperatura exata, de modo que esta oportunidade pode concretizar-se mesmo em cenário de atingimento apenas parcial do critério de aceite. Como plano de ação, a equipe avaliará não apenas o erro absoluto do modelo, mas também sua capacidade de ordenar corretamente as configurações por risco térmico, e desenvolverá no dashboard uma visão de priorização que classifique os casos candidatos por temperatura estimada e por grau de confiança associado. Caso a ordenação produzida pelo modelo coincida com a ordenação real em pelo menos 80% dos pares de configurações avaliados na validação técnica, a funcionalidade será proposta à Whirlpool como apoio formal ao planejamento dos ensaios.

**4. Replicação da solução para outras linhas de produto (R04)**

Trata-se de uma oportunidade de natureza estratégica. Sua probabilidade de ocorrência foi estimada em 30%, pois a decisão excede a alçada da equipe de projeto e depende de deliberação da liderança da Whirlpool, além de exigir a disponibilização de bases históricas de outras linhas, hoje não mapeadas. O impacto foi classificado como muito alto porque a maior parte do que está sendo construído — o processo de tratamento de dados, a arquitetura de modelagem, os alertas de uso fora do domínio válido e o dashboard — independe do produto ser um fogão de piso, podendo ser replicada a fornos, cooktops e demais linhas com esforço significativamente inferior ao do projeto inicial. A combinação desses fatores resulta em uma classificação geral alta, uma vez que a matriz mantém na faixa superior as oportunidades de ganho muito expressivo ainda que de ocorrência incerta. O valor desta oportunidade reside menos no modelo treinado e mais no método replicável que o projeto estabelece. Como plano de ação, a equipe documentará no relatório final quais componentes da solução são independentes do produto e quais foram desenvolvidos especificamente para fogões de piso. Caso o mapa de replicabilidade indique que mais de 70% dos componentes são reutilizáveis sem alteração, o esforço estimado para replicação será formalmente apresentado ao Sponsor na reunião de encerramento.

**5. Identificação de relações entre geometria e temperatura (R05)**

Trata-se de uma oportunidade de natureza de engenharia. Sua probabilidade de ocorrência foi estimada em 50%, pois o modelo analisa as trinta e nove execuções em conjunto, perspectiva indisponível na leitura individual de cada simulação, embora a relevância dos achados dependa de validação pelos especialistas e nem toda relação identificada seja necessariamente desconhecida deles. O impacto foi classificado como alto, uma vez que compreender como determinadas características construtivas influenciam a temperatura gera conhecimento aplicável a projetos futuros, independentemente da adoção da ferramenta preditiva. A combinação desses fatores resulta em uma classificação geral alta. Efeitos combinados entre parâmetros geométricos e modo de operação são particularmente difíceis de perceber na análise caso a caso, e tendem a emergir apenas quando os dados são examinados de forma agregada. Como plano de ação, a equipe aplicará técnicas de interpretabilidade para identificar quais características mais influenciam a temperatura prevista, registrará sistematicamente os padrões encontrados e os submeterá à equipe de CFD no marco de validação técnica, com a ressalva de que correlação estatística não estabelece, por si só, causalidade física. Caso alguma característica figure entre as cinco de maior influência e não seja reconhecida como esperada pela equipe de CFD, o achado será formalizado como entrega complementar no relatório final.

**6. Revisão das margens de segurança com base quantitativa (R06)**

Trata-se de uma oportunidade de natureza de engenharia e custo. Sua probabilidade de ocorrência foi estimada em 30%, pois não basta que o modelo informe sua margem de erro: é necessário que a engenharia esteja disposta a revisar folgas de segurança historicamente consolidadas, decisão que envolve critérios normativos e cultura técnica interna, e não apenas evidência numérica. O impacto foi classificado como alto porque margens excessivamente conservadoras implicam superdimensionamento de isolamento e de materiais, com custo unitário recorrente em toda a produção. A combinação desses fatores resulta em uma classificação geral média, uma vez que o ganho, embora relevante, depende de decisão organizacional pouco provável no horizonte do projeto. Projetos de engenharia térmica frequentemente adotam folgas generosas justamente por não disporem de estimativa formal da incerteza envolvida, de modo que quantificá-la é condição prévia para discutir sua redução. Como plano de ação, a equipe apresentará, junto a cada previsão, a faixa de variação esperada e a distribuição das folgas observadas no histórico, oferecendo à engenharia base quantitativa para avaliar seus critérios. Caso sejam identificados termopares cuja folga média em relação ao limite normativo seja superior ao dobro da incerteza estimada pelo modelo, a relação desses pontos será encaminhada como subsídio à revisão dos critérios de projeto, cabendo à Whirlpool a decisão final.

**7. Identificação de simulações históricas inconsistentes (R07)**

Trata-se de uma oportunidade de natureza de qualidade de dados. Sua probabilidade de ocorrência foi estimada em 50%, pois a comparação entre os valores previstos pelo modelo e os registrados na base evidencia naturalmente as execuções cujo comportamento diverge do padrão das demais, restando incerta a confirmação da inconsistência pela equipe de CFD. O impacto foi classificado como moderado porque não altera diretamente os objetivos definidos no Project Charter, mas contribui para a confiabilidade do próprio acervo de simulações da Whirlpool. A combinação desses fatores resulta em uma classificação geral média. Uma execução que diverge sistematicamente das demais admite duas explicações igualmente informativas: a ausência de alguma variável relevante na base ou uma inconsistência na configuração daquela simulação específica, hipótese de interesse direto para a equipe de CFD. Como plano de ação, a equipe listará as execuções com maior divergência entre valor previsto e valor registrado e as submeterá à equipe de CFD acompanhadas de sua configuração completa, sem presumir qual das duas explicações se aplica. Caso alguma execução apresente divergência superior a três desvios-padrão e a inconsistência seja confirmada pelo parceiro, esta será excluída do conjunto de treino e o achado registrado como contribuição do projeto à qualidade da base.

**8. Padronização de nomenclatura e indicadores entre Brasil e México (R08)**

Trata-se de uma oportunidade de natureza organizacional. Sua probabilidade de ocorrência foi estimada em 50%, pois o tratamento conjunto das bases das duas regiões exigirá, de qualquer forma, conciliar nomenclaturas de termopares, definições de Key Area e critérios de limite, restando incerta apenas a validação do resultado pelas duas unidades. O impacto foi classificado como alto porque uma nomenclatura comum permite comparar diretamente o desempenho térmico das arquiteturas das duas regiões, comparação atualmente dificultada por divergências terminológicas, e não apenas por diferenças construtivas reais. A combinação desses fatores resulta em uma classificação geral alta. Como essa conciliação é condição técnica prévia à modelagem conjunta, o trabalho será realizado de todo modo, restando incerta apenas sua adoção formal pela organização. Como plano de ação, a equipe consolidará em documento único a correspondência entre as nomenclaturas das duas unidades, distinguindo o que é divergência meramente terminológica do que reflete diferença construtiva efetiva, e o submeterá às equipes de engenharia de ambas as regiões. Caso o mapeamento seja validado sem divergências pendentes pelas duas equipes, será proposto à Whirlpool como padrão de referência para o registro de simulações futuras.

#### 4.1.6. Personas

As personas são representações fictícias dos diferentes perfis de usuários e pessoas
impactadas por uma solução. Elas funcionam como um guia para lembrar para quem o
produto está sendo desenvolvido e quem pode ser afetado por ele, orientando as
decisões de projeto a partir das necessidades, dores e objetivos reais desses perfis.

Para o Thermal Predictor, estamos usando proto-personas (suposições embasadas),
definidas com base no entendimento atual do problema e nos diferentes papéis que se
relacionam com a solução: a Engenheira de Materiais, o Especialista de Marketing, a Designer UX/UI, o Engenheiro de Qualidade e o Engenheiro de Produtos.

##### Engenheira de Materiais

<div align="center">
  <sub>Figura 5 — Persona: Engenheira de Materiais</sub><br>
  <img src="../assets/personaEstela.png" width="800" alt="Estela"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

A persona de Estela foi escolhida por representar um dos cargos diretamente responsáveis pelas decisões que o Thermal Predictor visa otimizar, já que a escolha do material de cada componente do fogão depende diretamente da temperatura que ele vai atingir em uso.
Hoje, para aprovar ou descartar um material, Estela depende de um protótipo físico e, muitas vezes, de um teste destrutivo, um processo lento e caro que atrasa a decisão de engenharia. Sua necessidade é validar rapidamente se um material resiste termicamente ao ponto de ser aprovado, comparando diferentes materiais e espessuras sem precisar de um novo protótipo para cada opção. No dia a dia, ela consulta o dashboard antes de solicitar um teste físico, usando a previsão do modelo e sua margem de erro para priorizar quais combinações realmente justificam avançar para validação física completa.
Diferente de outras personas que se relacionam com a solução de forma mais indireta, Estela toma decisões técnicas diretamente a partir do resultado da previsão, sendo diretamente impactada pela margem de erro do modelo. Trata-se, portanto, da persona que representa o ganho central do projeto: substituir a dependência de testes físicos demorados e caros por uma validação rápida e confiável.

##### Especialista de Marketing

<div align="center">
  <sub>Figura 6 — Persona: Especialista de Marketing</sub><br>
  <img src="../assets/personaGeraldo.png" width="800" alt="Geraldo"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

Esta persona foi escolhida porque toda solução técnica só gera valor real para a empresa se esse ganho puder ser traduzido e comunicado ao mercado, e é justamente essa ponte entre resultado técnico e resultado de negócio que a persona de Marketing representa no projeto.
Geraldo depende do cronograma de testes físicos e de validação térmica para saber quando um produto está de fato pronto para divulgação, o que dificulta planejar campanhas e datas de lançamento com antecedência. Sua necessidade é ter acesso antecipado a características térmicas e de desempenho do produto, ainda na fase de desenvolvimento, para embasar o posicionamento e a comunicação da campanha sem depender da validação final. Por isso, acompanha os indicadores de prazo e de progresso da validação térmica do produto para ajustar o calendário de lançamento e os argumentos de diferenciação frente à concorrência.
Diferente das personas técnicas, que se relacionam diretamente com a previsão e a acurácia do modelo, Geraldo importa porque garante que a redução de lead time e de custo conquistada pelo Thermal Predictor não fique restrita à engenharia, mas se converta em velocidade de lançamento e em argumentos concretos de diferenciação frente à concorrência. Sua inclusão evita que o projeto seja avaliado apenas por métricas internas e assegura que ele também seja medido pelo impacto que gera na capacidade da empresa de chegar ao mercado mais rápido e de forma mais competitiva.

##### Designer UX/UI

<div align="center">
  <sub>Figura 7 — Persona: Designer UX/UI</sub><br>
  <img src="../assets/persona-1.png" width="800" alt="Beatriz"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

Esta persona foi escolhida porque o dashboard é um dos principais entregáveis do
Thermal Predictor, e a designer de interface é a responsável por mantê-lo e
atualizá-lo, garantindo que as previsões do modelo sejam apresentadas em telas
claras e confiáveis para os usuários.
A dor de Beatriz é o risco de os engenheiros pararem de usar o dashboard caso a informação seja apresentada de forma confusa, especialmente quando a previsão vem acompanhada de faixa de erro e de estados como interpolação, extrapolação moderada ou fora de domínio (Seção 4.1.5, R04), que precisam ser compreendidos sem ambiguidade. Ela precisa de uma hierarquia de informação clara, agrupada por Key Area, como já é utilizado pelo time de engenharia, que comunique previsão, margem de erro e nível de confiabilidade de forma imediata, sem exigir interpretação técnica adicional do usuário. No dia a dia, atualiza a interface a partir do retorno dos usuários e da telemetria de uso do dashboard, priorizando ajustes nas telas e nos fluxos mais utilizados pelas equipes de Engenharia, Qualidade e Marketing.
Embora a construção inicial do dashboard seja
feita pela equipe de desenvolvimento e Beatriz não utilize as previsões para tomar
decisões, é uma persona importante porque assegura que os resultados do modelo
continuem sendo apresentados de forma compreensível e que gerem confiança em quem
consome a informação. É, portanto, a persona que garante a usabilidade e a adoção
contínua da solução.

##### Engenheiro de Qualidade

<div align="center">
  <sub>Figura 8 — Persona: Engenheiro de Qualidade</sub><br>
  <img src="../assets/persona-2.png" width="800" alt="João"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

Esta persona foi escolhida por representar um dos usuários diretos e mais críticos do
projeto: o Engenheiro de Qualidade é responsável por validar a segurança
térmica dos produtos e decidir se um design pode ou não ser liberado.
João depende de testes físicos destrutivos, lentos e caros, para confirmar que cada componente se mantém dentro do limite térmico normativo antes de liberar um design. Sua necessidade é verificar rapidamente, para múltiplas configurações, se um componente ultrapassa seu limite térmico, com uma margem de erro clara (≤ 10%) que permita auditar a previsão antes de confiar nela. Por isso, usa o dashboard para triar quais configurações apresentam maior risco térmico e, a partir daí, decide quais ainda precisam de teste físico completo antes da liberação do produto.
É uma persona importante porque tanto usa a solução no dia a dia quanto é
diretamente impactada por ela: a confiabilidade da previsão (margem de erro ≤ 10%)
afeta diretamente sua decisão de aprovar ou reprovar um produto. Por atuar em um
ponto crítico do processo, a liberação do produto, João garante que a solução contribua
para decisões mais rápidas e seguras.

##### Engenheiro de Produtos

<div align="center">
  <sub>Figura 9 — Persona: Engenheiro de Produtos</sub><br>
  <img src="../assets/personaRafael.png" width="800" alt="Rafael"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

Esta persona foi escolhida por representar o profissional que define a arquitetura do produto e, portanto, toma as decisões que originam o comportamento térmico que todas as demais personas depois avaliam: a geometria, o arranjo dos componentes e a configuração construtiva do fogão.
Hoje, cada alteração de arquitetura proposta por Rafael exige uma nova rodada de simulação de CFD, processo que leva dias e restringe o número de alternativas que ele consegue explorar antes de congelar o design. Sua necessidade é estimar o efeito térmico de uma mudança de geometria ou de arranjo ainda na concepção, comparando múltiplas arquiteturas em paralelo e sabendo em quais Key Areas o risco se concentra. No dia a dia, ele usa o dashboard para varrer configurações candidatas logo no início do projeto, observando a margem de erro e o indicador de confiabilidade (Seção 4.1.5, R04) para distinguir os casos em que a previsão é interpolação daqueles em que o design é inédito e ainda exige validação por simulação completa.
Diferente de Estela e João, que consultam a previsão para aprovar ou reprovar uma escolha já feita, Rafael atua um passo antes: ele usa a previsão para gerar e descartar alternativas de projeto, no momento em que mudar o produto ainda é barato. É a persona que desloca o ganho do Thermal Predictor da etapa de validação para a etapa de concepção, evitando que decisões de arquitetura tomadas no início se revelem termicamente inviáveis apenas ao final do ciclo de desenvolvimento.

#### 4.1.7. Jornadas do Usuário

Um mapa de jornada do usuário representa, em uma linha do tempo, as ações, pensamentos e emoções de uma persona ao buscar um objetivo, evidenciando onde surgem dúvida, confiança e decisão ao longo da experiência, e não apenas o funcionamento técnico do sistema. Essa ferramenta é especialmente relevante para o Thermal Predictor porque a solução não devolve uma resposta definitiva, e sim uma previsão de aprendizado de máquina com margem de erro e indicador de confiabilidade (Seção 4.1.5, R04). O valor do produto depende de como cada persona interpreta essa previsão e a converte em uma decisão real de engenharia, e o mapa torna esse processo de interpretação e decisão explícito, permitindo identificar onde a solução pode reduzir incerteza e apoiar decisões mais rápidas e seguras, sem tratar a previsão do modelo como verdade absoluta.

##### Jornada do Usuário — Engenheiro de Qualidade (João) — Cenário Atual (As Is)

**Cenário:** João recebe da equipe de Design um pedido de validação térmica para uma nova configuração de fogão. Sem uma previsão inicial disponível, ele precisa levantar manualmente o histórico de validações semelhantes, acionar a equipe de CFD para simulação e prototipagem física, aguardar a fila de agenda dessas equipes e, dentro do prazo e do orçamento de protótipos disponíveis, testar apenas algumas das alternativas possíveis antes de emitir seu parecer para as equipes de módulos e produto.

<div align="center">
  <sub>Figura 10 — Mapa de Jornada do Usuário (As Is): Engenheiro de Qualidade (João)</sub><br>
  <img src="../assets/journeyMapAsIs.png" width="800" alt="Mapa de jornada atual de João"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

**Fase 1 — Recebimento do Design**

- *Ações:* Recebe o pedido de validação térmica, identifica a arquitetura (BR ou MX) e os componentes no escopo.
- *Pensamento:* "A assinatura é minha. Se passar algo errado, a responsabilidade vem para cá."
- *Emoção:* Neutra.
- *Ponto de dor:* Assume a responsabilidade da liberação sem saber se já existe validação semelhante para aquela configuração.

**Fase 2 — Preparação da Validação**

- *Ações:* Levanta os limites normativos por Key Area e busca no histórico ensaios de configurações semelhantes.
- *Pensamento:* "Tenho certeza de que já validamos algo parecido, mas achar essa evidência é uma caçada."
- *Emoção:* Frustração.
- *Ponto de dor:* Evidência histórica dispersa em pastas e planilhas; refaz um contexto que a empresa já produziu.

**Fase 3 — Solicitação e Espera**

- *Ações:* Aciona a equipe de CFD e/ou solicita o protótipo, e aguarda a fila de agenda dessas equipes.
- *Pensamento:* "Meu prazo não depende de mim. Fico parado esperando outra área, e quem cobra o cronograma não vê a espera, vê o atraso."
- *Emoção:* Impotência.
- *Ponto de dor:* Cobrado por um prazo que não controla: depende da fila da equipe de CFD e da agenda de protótipos.

**Fase 4 — Ensaio e Verificação**

- *Ações:* Acompanha o ensaio térmico e compara a temperatura de cada sensor com o limite, identificando extrapolações.
- *Pensamento:* "Cada ensaio consome um protótipo caro e só me responde sobre esta configuração. Sei o que falhou, mas não bem por quê."
- *Emoção:* Tensão.
- *Ponto de dor:* Cada teste destrutivo consome um protótipo caro e responde por uma única configuração; mostra a falha, não a causa.

**Fase 5 — Triagem Limitada e Retrabalho**

- *Ações:* Seleciona manualmente as poucas alternativas que cabem no prazo; se reprovado, reporta o resultado e retorna à fase 3.
- *Pensamento:* "Testo três alternativas, não trinta. Posso estar reprovando algo viável, ou liberando a pior das opções que não olhei. E cada volta custa mais um protótipo."
- *Emoção:* Vale da jornada — o ponto mais baixo do processo.
- *Ponto de dor:* Avalia poucas alternativas por limite de prazo e custo; cada reprovação reinicia fila, protótipo e ensaio.

**Fase 6 — Entrega da Decisão**

- *Ações:* Registra as combinações aprovadas e excluídas e emite o parecer para as equipes de módulos e produto.
- *Pensamento:* "Decidi com segurança, mas atrasado e caro. E esse aprendizado fica na minha planilha, comigo."
- *Emoção:* Alívio parcial.
- *Ponto de dor:* Decisão correta, mas tardia e cara; o aprendizado fica preso na planilha pessoal e não é reaproveitado.

Essa jornada atual evidencia os gargalos que o Thermal Predictor busca endereçar: dependência de filas de outras equipes, custo e escassez de protótipos físicos, evidência histórica dispersa e aprendizado que não é reaproveitado entre configurações. A jornada a seguir (To Be) mostra como esses pontos de dor são reduzidos com o uso da solução.

##### Jornada do Usuário — Engenheiro de Qualidade (João) — Cenário com o Thermal Predictor (To Be)

**Cenário:** João recebe da equipe de Design uma nova configuração de fogão para avaliar antes da liberação do produto. Em vez de aguardar uma bateria completa de testes físicos destrutivos, ele usa o Thermal Predictor para gerar uma previsão térmica por sensor, com margem de erro e indicador de confiabilidade, e a partir dela decide quais componentes podem ser aprovados diretamente e quais ainda exigem confirmação por teste físico antes do encerramento do parecer.

<div align="center">
  <sub>Figura 11 — Mapa de Jornada do Usuário (To Be): Engenheiro de Qualidade (João)</sub><br>
  <img src="../assets/designJoaoQUalidade.png" width="800" alt="Mapa de jornada de João"><br>
  <sup>Fonte: Elaborado pelos autores (2026).</sup>
</div>

**Fase 1 — Acessar e Triar**

- *Ações:* Acessa a plataforma e faz login com suas credenciais, abre a configuração recebida da equipe da Beatriz do Design no dashboard, confere o identificador e a revisão da configuração recebida, e verifica na tela de "casos similares" se já existe parecer emitido para configurações parecidas.
- *Pensamento:* "Já vi algo parecido com isso antes? Existe parecer anterior que eu deva consultar antes de começar do zero?"
- *Emoção:* Neutra, modo organização.
- *Ponto de dor:* Sem esse filtro, revisaria pareceres antigos manualmente e correria o risco de duplicar uma análise já feita.

**Fase 2 — Configurar Parâmetros**

- *Ações:* Seleciona as áreas-chave a avaliar (Mainback, bobinas, ventilação, área do cooktop, painel de comandos), preenche os parâmetros da configuração (direção do fluxo de ar, estado do housing, posição da placa, material do suporte da bobina, presença do furo do defletor), confere no resumo da tela se todos os campos obrigatórios foram preenchidos e clica em "Gerar previsão".
- *Pensamento:* "Um campo errado invalida a previsão inteira — preciso conferir antes de enviar."
- *Emoção:* Atenção concentrada.
- *Ponto de dor:* Sem validação prévia, o erro só apareceria depois de gerada a previsão, obrigando a repetir o ciclo.

**Fase 3 — Explorar Resultados**

- *Ações:* Na tela de resultados, visualiza a lista de sensores com temperatura estimada e selo de confiabilidade, ordena por proximidade do limite normativo e identifica o da área do cooktop (IPC) destacado em "extrapolação moderada".
- *Pensamento:* "A maioria está tranquila, mas esse ponto está no limite — preciso olhar com mais cuidado."
- *Emoção:* Alívio parcial; atenção no ponto crítico.
- *Ponto de dor:* Sem ordenação por criticidade, o sensor de risco passaria despercebido em meio aos demais.

**Fase 4 — Conferir o Ponto Crítico**

- *Ações:* Abre o detalhe do sensor da área do cooktop (IPC), confere o valor previsto e sua margem de erro (10%) contra o limite térmico normativo cadastrado para aquele componente, e registra no campo de anotações o motivo da dúvida.
- *Pensamento:* "Com essa margem de erro, esse valor ainda está dentro do que a norma permite?"
- *Emoção:* Atenção redobrada antes de decidir.
- *Ponto de dor:* Sem o limite normativo exibido junto ao valor previsto, teria que consultar a norma em outro documento para confirmar a folga real.

**Fase 5 — Decidir (decisão crítica)**

- *Ações:* Marca o sensor da área do cooktop (IPC) como "pendente de teste físico", os demais como "aprovado por previsão", preenche o campo obrigatório de justificativa da pendência e clica em "Salvar decisão parcial".
- *Pensamento:* "Só esse ponto precisa de confirmação física — o resto já pode seguir."
- *Emoção:* Segurança na decisão, com peso do ponto em aberto.
- *Ponto de dor:* Sem status por componente, seria forçado a aprovar ou reprovar tudo de uma vez.

**Fase 6 — Encaminhar e Encerrar**

- *Ações:* Clica em "Gerar parecer", confere o documento consolidado, envia à equipe de engenharia da produção pelo próprio dashboard e acompanha o status "pendente" na tela de acompanhamento até a equipe registrar o resultado do teste físico; então atualiza o status do componente pendente e clica em "Encerrar parecer".
- *Pensamento:* "Reduzi de uma bateria completa de testes para um único ponto crítico — agora só falta confirmar."
- *Emoção:* Dever cumprido e fechamento do ciclo.
- *Ponto de dor:* Sem notificação de retorno e trava de encerramento, o parecer ficaria "aberto" indefinidamente, sem sinalizar quando a decisão final está de fato concluída.

**Oportunidades identificadas**

- Tela de "casos similares" com busca por parecer anterior, evitando retrabalho de análise (Fase 1).
- Validação de campos obrigatórios antes da geração da previsão, evitando ciclos de repetição (Fase 2).
- Ordenação da lista de sensores por proximidade do limite normativo, destacando o ponto mais crítico (Fase 3).
- Exibição do limite térmico normativo junto ao valor previsto e sua margem de erro, dispensando consulta a documento externo (Fase 4).
- Status de decisão por componente (aprovado por previsão / pendente de teste físico), permitindo decisões parciais em vez de tudo-ou-nada (Fase 5).
- Notificação de retorno do teste físico e trava de encerramento do parecer, garantindo rastreabilidade até a decisão final (Fase 6).

##### Comparação entre as Jornadas As Is e To Be

As duas jornadas foram construídas pela própria equipe do projeto, como exercício analítico de UX, e não a partir de entrevista ou observação direta de um engenheiro de qualidade real; a leitura a seguir deve ser tratada como uma síntese comparativa das fases descritas acima, não como medição validada de ganho. A tabela abaixo organiza lado a lado o que já está descrito em cada fase, para facilitar a leitura cruzada.

| Dimensão | Cenário Atual (As Is) | Cenário com o Thermal Predictor (To Be) |
|---|---|---|
| Ponto de partida | Nenhuma estimativa disponível antes de acionar CFD e/ou teste físico (Fase 1) | Previsão térmica disponível assim que a configuração é preenchida (Fase 2) |
| Dependência de outras equipes | Aguarda fila da equipe de CFD e agenda de protótipos para avançar (Fase 3) | Gera e interpreta a previsão sem depender de outra equipe; teste físico é acionado só para o(s) ponto(s) marcado(s) como pendente (Fase 5) |
| Uso de evidência histórica | Busca manual em pastas e planilhas, sem garantia de encontrar o caso equivalente (Fase 2) | Consulta a uma tela de "casos similares" antes de iniciar a análise (Fase 1) |
| Abrangência avaliada | Poucas alternativas testadas fisicamente, limitadas por prazo e custo de protótipo (Fase 5) | Todos os sensores da configuração informada recebem previsão simultânea (Fase 3) |
| Granularidade da decisão | Tudo-ou-nada por rodada de teste: uma reprovação reinicia fila, protótipo e ensaio (Fase 5) | Por componente: aprova por previsão o que está dentro do limite e marca como pendente só o que exige confirmação física (Fase 5) |
| Fase de maior tensão | Fase 5 — Triagem Limitada e Retrabalho | Fase 2 — Configurar Parâmetros e Fase 4 — Conferir o Ponto Crítico |
| Registro e encerramento | Combinações aprovadas/excluídas registradas pelo próprio João; conhecimento fica com ele (Fase 6) | Parecer, decisões parciais e retorno do teste físico registrados no dashboard até o encerramento (Fase 6) |

A leitura cruzada aponta três diferenças descritas nas próprias jornadas: menor dependência de fila de terceiros para obter uma primeira estimativa, decisão por componente em vez de tudo-ou-nada, e um registro centralizado no lugar do conhecimento disperso em planilhas pessoais. Essas diferenças coincidem com as oportunidades já listadas para as Fases 1 e 5 da jornada To Be, o que é esperado, já que ambas as jornadas partem da mesma análise.

<h5 align="center">Demais Jornadas de Usuário</h5>

O mapa de jornada completo, com todas as fases, ações, pensamentos, emoções e oportunidades detalhadas, foi construído para João (Engenheiro de Qualidade) por ele representar o usuário mais crítico da solução: é quem interage diretamente com a previsão do modelo para tomar a decisão de liberação do produto, o cenário em que a margem de erro e o indicador de confiabilidade (R04) têm maior peso. O mínimo exigido pelo WAD — uma jornada detalhada — está atendido por essa jornada. Para as demais personas (Geraldo, Estela e Beatriz), que também interagem com a solução mas em pontos de decisão menos críticos ou mais indiretos, optou-se por um resumo objetivo de suas jornadas, preservando o cenário, o principal ponto de decisão e a oportunidade central identificada em cada uma.

**Geraldo (Especialista de Marketing):** Ao planejar o lançamento de um novo fogão, Geraldo depende de dados técnicos de desempenho térmico e de uma data confiável de validação para montar o cronograma de campanha; com o Thermal Predictor, passa a acessar essas previsões ainda na fase de modelagem, antes da conclusão dos testes físicos. Seu momento crítico é decidir o que pode ser afirmado publicamente com base numa previsão e não numa validação física, por isso opta por ancorar a comunicação em atributos (ex.: "segurança ao toque") em vez de números absolutos, mantendo margem para ajuste. A oportunidade central é exibir o intervalo de confiança da previsão no dashboard, hoje ausente, que é justamente o dado que separaria uma decisão de campanha segura de uma aposta reputacional.

**Estela (Engenheira de Materiais):** Estela usa o dashboard para comparar combinações candidatas de material e espessura antes de enviá-las a teste físico, e seu momento de maior tensão ocorre quando um resultado contraintuitivo diverge da sua experiência prévia, gerando desconfiança momentânea no modelo até que ela consiga confrontar a previsão com casos históricos semelhantes. A oportunidade central é oferecer explicabilidade da previsão (quais variáveis mais influenciaram o resultado) e comparação com casos históricos do dataset, ancorando previsões contraintuitivas em precedentes reais e acelerando a recuperação de confiança na ferramenta.

**Beatriz (Designer UX/UI):** Beatriz não usa o dashboard para gerar previsões, mas para evoluí-lo: cruza feedback qualitativo das demais equipes com telemetria de uso para diagnosticar problemas de hierarquia de informação e ambiguidade nos estados do modelo (interpolação, extrapolação, fora de domínio; R04), redesenha as telas priorizadas e valida com testes de usabilidade se engenheiros e profissionais de marketing conseguem interpretar previsão, margem de erro e confiabilidade sem explicação adicional. A oportunidade central é um painel de métricas de adoção pós-lançamento (acesso por Key Area, tempo de permanência, dúvidas recorrentes), que fecha o ciclo de melhoria contínua da interface de volta ao diagnóstico.

#### 4.1.8 Política de Privacidade

Projeto Thermal Predictor

**Informações Gerais:**

Esta política de privacidade informa como o projeto Thermal Predictor, desenvolvido pelo grupo FOG em parceria com a Whirlpool (Divisão de Fogões BR/MX), trata os dados pessoais coletados durante o uso da solução. Está em conformidade com a Lei nº 13.709/2018 – LGPD²².

A solução envolve duas naturezas de dados, submetidas a regimes jurídicos distintos. Os dados técnicos e operacionais de produto, temperaturas de sensores, limites de engenharia, configurações de teste e identificadores de componentes que compõem o dataset, não são dados pessoais e, portanto, não estão sob a incidência da LGPD; sua proteção decorre dos acordos de confidencialidade e de propriedade intelectual firmados com a Whirlpool. Os dados pessoais, únicos regidos por esta política, limitam-se às informações de identificação dos usuários que operam o sistema. Nenhum registro do dataset de temperatura se refere a pessoa natural identificada ou identificável, nos termos do art. 5º, I, da LGPD.

**Dados Coletados:**

Dados fornecidos diretamente: nome e e-mail, informados no cadastro e no login da solução.

Dados coletados automaticamente: data, hora e identificador de sessão dos acessos (logs de sistema), para fins de segurança e rastreabilidade.

Os dados de componentes e temperaturas inseridos na solução são dados técnicos de produto, e não dados pessoais, conforme a distinção acima.

**Finalidade do Tratamento:**

Autenticar usuários e controlar o acesso ao dashboard preditivo, assegurando que apenas profissionais autorizados das áreas de Engenharia e Qualidade utilizem a ferramenta.

O tratamento apoia-se em duas bases legais. O nome e o e-mail são tratados com fundamento na execução de contrato e de procedimentos preliminares (art. 7º, V), pois o usuário adere aos Termos de Uso da solução e o cadastro é condição para a prestação do serviço. Os logs de acesso apoiam-se no legítimo interesse do controlador (art. 7º, IX), voltado à segurança da informação e à auditoria, limitado ao mínimo necessário e sem sobrepor-se aos direitos e liberdades do titular. Observam-se os princípios do art. 6º, em especial finalidade, adequação, necessidade, transparência e segurança. Não há elaboração de perfil, publicidade ou decisão automatizada sobre pessoas: o modelo prevê a temperatura de componentes do produto, não o comportamento de indivíduos, de modo que não incide a hipótese do art. 20 da Lei.

**Armazenamento e Retenção:**

Local: ambiente local em que o sistema é executado, sem hospedagem em nuvem pública. O dataset fornecido pelo parceiro não é versionado no repositório público do projeto.

Prazo: durante a vigência do módulo acadêmico, com eliminação ao término, em observância ao princípio da necessidade (art. 6º, III) e às hipóteses de término do tratamento previstas nos arts. 15 e 16 da LGPD.

**Compartilhamento de Dados:**

Equipe do projeto, orientadores e supervisores acadêmicos do Inteli e Whirlpool. Não há venda, cessão ou compartilhamento com terceiros.

Como o parceiro desenvolve produtos para as arquiteturas de Brasil e México, dados de engenharia podem transitar entre as duas jurisdições. Os dados técnicos de produto são regidos pelos acordos de confidencialidade corporativos da Whirlpool. Eventual transferência internacional de dados pessoais observaria os arts. 33 a 36 da LGPD, que a condicionam a país com grau de proteção adequado ou à adoção de garantias contratuais específicas, como cláusulas-padrão contratuais ou normas corporativas globais; no México, aplica-se a Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)²³. No escopo atual, os dados pessoais permanecem armazenados no Brasil e não há transferência internacional ativa; caso o piloto seja estendido às equipes mexicanas, a base de transferência será formalizada antes da liberação de acesso.

**Segurança dos Dados:**

Autenticação individual com senha armazenada em formato de hash criptográfico; controle de acesso por perfil, segundo o princípio do menor privilégio, de modo que cada usuário acesse apenas as funcionalidades pertinentes à sua área; registro de logs de acesso para auditoria; e segregação entre o repositório público do projeto e os dados do parceiro, que não são publicados. Em caso de incidente de segurança com risco relevante aos titulares, a equipe comunicará o Encarregado, o parceiro e, quando aplicável, a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares afetados, nos termos do art. 48 da LGPD.

**Direitos dos Titulares:**

Acesso, correção, exclusão e revogação de consentimento, além de confirmação da existência de tratamento, anonimização, bloqueio, portabilidade e informação sobre compartilhamento, nos termos do art. 18 da LGPD. Como o tratamento se apoia em execução de contrato e em legítimo interesse, e não em consentimento, não há consentimento em vigor a ser revogado; caso alguma finalidade futura passe a depender dele, a revogação será garantida a qualquer momento, por procedimento gratuito e facilitado (art. 8º, § 5º). Ao titular assegura-se, ainda, o direito de oposição ao tratamento realizado com dispensa de consentimento (art. 18, § 2º).

Solicitações via e-mail: felipe.pessoa@sou.inteli.edu.br

**Encarregado de Dados (DPO):**

Nome: Felipe Sodré Pessôa

E-mail: felipe.pessoa@sou.inteli.edu.br

### 4.2. Compreensão dos Dados

#### 4.2.1. Exploração de dados

##### Classificação das colunas

A classificação abaixo foi obtida com `df.dtypes` como ponto de partida, seguida de revisão manual para corrigir casos ambíguos (ex.: identificadores numéricos que não são quantidades, colunas com sujeira de formatação). Fonte: `data/dataset_pre_processado.csv` (formato tidy, uma linha por combinação Run x TC), gerado na Seção 0 e classificado na Seção 1.1 de [`notebooks/expl_preprocessamenro_hipote.ipynb`](../notebooks/expl_preprocessamenro_hipote.ipynb).

| Coluna | Tipo |
|---|---|
| run_id | Categórica |
| tc_number | Categórica |
| tc_name | Categórica |
| key_area | Categórica |
| active_limit | Numérica |
| temp | Numérica |
| reason | Categórica |
| blower_direction | Categórica |
| housing | Categórica |
| board_position | Categórica |
| run_case | Categórica |
| losses | Categórica |
| deflector_hole | Categórica |
| material_coil_support | Categórica |

**Observações da revisão manual:**

- `tc_number` parece numérico mas é um **identificador** do sensor (rótulo), não uma quantidade — não faz sentido calcular média/desvio dele, por isso ficou como Categórica apesar de o `dtype` bruto ser inteiro.
- `active_limit` é majoritariamente numérica (limite de temperatura em °C), mas ainda tem 1 valor residual de texto (`"Monitor (150 C)"`) — sensor sem limite de segurança definido. Precisa virar `NaN` (ou um flag `is_monitor` à parte) no pré-processamento da Seção 4.2.2 antes de qualquer cálculo estatístico.
- `reason` (138→134 ausentes conforme a limpeza mais recente) e `losses` (418 ausentes) têm muitos valores faltantes — considerar no tratamento de missing values da Seção 4.2.2.
- `material_coil_support` (material do suporte da bobina: alumínio vs. plástico) **está presente e preenchida** no dataset — é a variável central de uma das hipóteses de negócio do projeto de referência, e pode ser testada com estes dados (relevante para a Seção 4.2.3).


##### Estatística descritiva das colunas

Para cada coluna já classificada, foram calculadas as métricas descritivas correspondentes: média, desvio-padrão e quartis para as numéricas; moda, valores únicos e frequência para as categóricas. Cálculo na Seção 1.2 de [`notebooks/expl_preprocessamenro_hipote.ipynb`](../notebooks/expl_preprocessamenro_hipote.ipynb), a partir de `data/dataset_pre_processado.csv`.

###### Colunas numéricas

| Estatística | temp | active_limit |
|---|---|---|
| Contagem | 4065 | 4009 |
| Média | 81,77 | 184,43 |
| Desvio-padrão | 33,28 | 235,17 |
| Mínimo | 27,69 | 60,00 |
| Q1 (25%) | 59,11 | 100,00 |
| Mediana (50%) | 76,50 | 110,00 |
| Q3 (75%) | 96,02 | 150,00 |
| Máximo | 273,60 | 1000,00 |

###### Colunas categóricas — resumo

| Coluna | Moda | Nulos | Valores únicos |
|---|---|---|---|
| `run_id` | Run 20 | 0 | 56 |
| `tc_number` | 1 | 0 | 77 |
| `tc_name` | AC Blower HES Connector | 0 | 77 |
| `key_area` | IPC Comp | 0 | 7 |
| `reason` | Baseline new Duct | 134 | 34 |
| `blower_direction` | To Front | 0 | 4 |
| `housing` | Closed | 0 | 3 |
| `board_position` | Center | 0 | 3 |
| `run_case` | Broil Qualitative | 0 | 7 |
| `losses` | Simone Losses | 418 | 14 |
| `deflector_hole` | Closed | 0 | 2 |
| `material_coil_support` | Aluminium | 0 | 3 |

###### Distribuição das principais categóricas

**`key_area`** (região do fogão onde o sensor está):

| Valor | Frequência |
|---|---|
| IPC Comp | 1979 |
| Mainback | 610 |
| Coil Temps | 420 |
| CT Knobs | 330 |
| Main Vent Sys | 288 |
| Oven HMI | 220 |
| IPC Cooling | 218 |

**`housing`** (configuração da carcaça):

| Valor | Frequência |
|---|---|
| Closed | 2063 |
| Open | 1328 |
| Open - Updated | 674 |

**`run_case`** (tipo de caso de teste):

| Valor | Frequência |
|---|---|
| Broil Qualitative | 1444 |
| Broil C2 | 1176 |
| Pyro | 569 |
| Broil Case 2 | 355 |
| Qualitative | 225 |
| Broil C1 | 148 |
| Broil Qual | 148 |

###### Gráficos exploratórios — relação entre variáveis

Além das tabelas de estatística descritiva, foram produzidos gráficos para investigar como a temperatura (`temp`) se relaciona com variáveis de configuração e localização do ensaio. Código completo na Seção 1.3 de [`notebooks/expl_preprocessamenro_hipote.ipynb`](../notebooks/expl_preprocessamenro_hipote.ipynb).

<div align="center">
  <sub>Figura 12 — Temperatura por área do produto (key_area)</sub><br>
  <img src="../assets/graficos/temp_por_area.png" alt="Boxplot de temperatura por key_area, com Coil Temps apresentando a maior mediana e maior dispersão" width="90%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>
</div>

`key_area` é a variável que mais separa os patamares de temperatura: a mediana varia de 47,1 °C em `CT Knobs` a 123,8 °C em `Coil Temps`, e `Mainback` concentra a maior parte dos valores extremos acima de 200 °C — coerente com o papel dessa região como destino do calor redistribuído, discutido na H1 (Seção 4.2.3).

<div align="center">
  <sub>Figura 13 — Temperatura média por housing e direção do blower</sub><br>
  <img src="../assets/graficos/temp_housing_blower.png" alt="Gráfico de barras da temperatura média cruzando housing (Closed, Open, Open - Updated) com blower_direction (To Back, To Front)" width="80%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>
</div>

As duas configurações interagem: com o housing `Closed`, o blower para trás (`To back`, 81,5 °C) aquece um pouco mais que para frente (`To front`, 79,8 °C); com o housing `Open`, essa ordem se inverte (86,2 °C para frente contra 83,4 °C para trás). Nenhuma combinação isolada é a mais fria em todas as áreas, o que antecipa o resultado da H2 (Seção 4.2.3): as configurações não têm efeito independente entre si.

<div align="center">
  <sub>Figura 14 — Taxa de excedência do limite por material do suporte da bobina</sub><br>
  <img src="../assets/graficos/exceeds_por_material.png" alt="Gráfico de barras da porcentagem de leituras que excedem o active_limit, por material_coil_support: Aluminium 8,4%, Aluminium Plate 4,1%, Plastic 4,1%" width="70%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>
</div>

Sensores com suporte de bobina em `Aluminium` excedem o `active_limit` em 8,4% das leituras, cerca do dobro da taxa observada em `Aluminium Plate` (4,1%) e `Plastic` (4,1%). O gráfico não isola causalidade — `material_coil_support` está confundido com outras configurações do ensaio, como discutido na H2 —, mas evidencia que o material é uma variável relevante para priorizar testes físicos.

<div align="center">
  <sub>Figura 15 — Temperatura medida vs. limite de engenharia por sensor</sub><br>
  <img src="../assets/graficos/temp_vs_limite.png" alt="Dispersão de temp contra active_limit por sensor, com pontos acima da diagonal identidade destacados em vermelho como excedências" width="75%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>
</div>

Cada ponto é uma leitura de sensor; a linha tracejada marca `temp = active_limit`. Excluídas as leituras sem `active_limit` registrado e o placeholder `active_limit = 1000` (sensores sem limite definido, Seção 4.2.1), restam 3.707 leituras com limite físico válido; dessas, 309 (8,3%) ficam acima da diagonal, ou seja, excedem o limite de engenharia do próprio sensor — a maior concentração de excedências ocorre nos sensores com limite de 150 °C, componente central da ressalva metodológica tratada na Seção 4.2.2.

#### 4.2.2. Pré-processamento dos dados

O pré-processamento dos dados foi realizado para organizar a base, tratar valores ausentes e registrar inconsistências sem alterar informações que podem representar comportamentos reais dos testes. As etapas foram conduzidas sobre o arquivo `dataset_pre_processado.csv`, gerado na reestruturação da planilha original, mantendo uma linha por combinação entre Run e TC. Implementação completa na Seção 2 de [`notebooks/expl_preprocessamenro_hipote.ipynb`](../notebooks/expl_preprocessamenro_hipote.ipynb).

Primeiramente foi feito o **tratamento de valores ausentes** nas colunas categóricas `reason`, `blower_direction`, `housing`, `board_position`, `run_case`, `losses`, `deflector_hole` e `material_coil_support`. Os valores `NaN` dessas colunas foram substituídos por **"Não informado"**, preservando os registros na base sem atribuir a eles uma categoria (como a moda) que não corresponde ao que foi de fato registrado no ensaio. Os valores nulos de `temp` já haviam sido retirados durante a reestruturação da planilha, pois, por ser a variável-alvo do modelo, preenchê-la com média, mediana ou outra estimativa introduziria um valor artificial exatamente na grandeza que o Thermal Predictor deve prever, o que poderia distorcer tanto a análise exploratória quanto o treinamento do modelo.

Em seguida, foi realizada a **identificação de outliers** nas temperaturas por `tc_name` utilizando o método do **Intervalo Interquartil (IQR)**. Para cada termopar, foram calculados o primeiro quartil (Q1), o terceiro quartil (Q3) e o intervalo interquartil, com os limites definidos por `[Q1 - 1,5 × IQR, Q3 + 1,5 × IQR]`. Os valores abaixo do limite inferior ou acima do limite superior foram contabilizados por `tc_name`, mas não foram removidos. A remoção comprometeria o aprendizado do modelo, pois cada tipo de teste pode apresentar um comportamento térmico diferente para cada peça. Por exemplo, testes com `run_case` **Pyro** apresentam temperaturas de Coil temperatures próximas de 50 °C, enquanto testes **Broil C2** podem atingir aproximadamente 220 °C. Portanto, valores classificados como outliers quando analisados em conjunto podem representar condições reais de um teste específico.

Também foram documentados **dados confusos ou insuficientes**:

 - O `active_limit` do componente Turbo Duct / AC Blower Outlet aparece como `Monitor (150 C)`, sem deixar claro se o componente não possui limite de temperatura ou se o limite é 150 °C. 
 
-  O componente Dedicated IPC/CKTP Outlet, por sua vez, estava completamente sem informações e foi retirado durante a reestruturação. 

- Para o Oven RTD Connector Body, foi observada uma divergência entre o `active_limit` de 150 °C e temperaturas próximas de 200 °C. A anotação disponível sugere que o componente provavelmente não atingirá 150 °C e poderia ser removido em uma simulação inicial, mas essa orientação é subjetiva. Por isso, o grupo optou por manter os dados do componente sem alterações até obter uma validação técnica.


Como tratamento pontual, o valor textual `Monitor (150 C)` da coluna `active_limit` foi convertido para o valor numérico `150`, permitindo manter um padrão numérico nessa coluna. As linhas que continham esse valor foram armazenadas e exibidas para conferência antes da substituição. 

#### 4.2.3. Processamento final dos dados

Nesta nova etapa de limpeza dos dados, a equipe consolidou um conjunto de ajustes voltados a simplificar a identificação dos registros e a reorganizar a base por área do produto. Em primeiro lugar, foram removidas as colunas “tc_id” e “tc_number”, que atuavam como identificadores redundantes do sensor: como ambas cumpriam a mesma função de rótulo já desempenhada por “tc_name”, sem agregar informação adicional e sem possuir significado quantitativo, sua manutenção apenas aumentava a redundância da base sem trazer ganho analítico. A partir dessa mudança, a identificação de cada termopar passa a ser feita exclusivamente pelo “tc_name”, simplificando o esquema de colunas sem perda de rastreabilidade.

Em relação à coluna “key_area”, o grupo optou por decompor a base única em sete novas tabelas, uma para cada área-chave do fogão: “Mainback”, “Coil Temps”, “Main Vent Sys”, “IPC Cooling”, “IPC Comp”, “CT Knobs” e “Oven HMI”. Essa separação reorganiza os dados originalmente consolidados em “key_area” de modo que cada tabela reúna apenas os sensores e leituras pertencentes à sua respectiva região do produto, facilitando análises e comparações centradas em cada área térmica sem exigir filtragem repetida da base principal.

Dentro de cada uma dessas sete tabelas, a coluna “tc_name” foi mantida como identificador do sensor, mas passou por uma reestruturação adicional: em vez de permanecer como uma coluna categórica com um valor de temperatura por linha (formato longo), cada tipo de termopar presente na área passou a ocupar uma coluna própria, e as leituras de temperatura passaram a ser organizadas como linhas da tabela (formato largo). Essa reorganização, definida como a versão final da estruturação do dataset destinado ao treino do modelo, evita a repetição do rótulo do sensor a cada linha e alinha cada observação às temperaturas simultâneas de todos os termopares daquela área, facilitando o uso direto da base pelas próximas etapas de modelagem (Seção 4.3).

Nessa tabela larga, cada linha passa a representar uma combinação das variáveis de configuração (“VAR.CONFIG”: `housing`, `blower_direction`, `deflector_hole`, `material_coil_support`, `run_case`, `losses` e `board_position`), e cada coluna de termopar guarda a temperatura observada para aquela combinação. Para o treino do modelo, essa tabela larga é achatada em uma tabela longa auxiliar com três colunas — “tc_name”, “VAR.CONFIG” e “TEMP” —, deixando explícita a relação `(tc_name) x (VAR.CONFIG) → TEMP`: a temperatura é o alvo, determinado pela combinação entre o termopar e a configuração testada. A coluna “active_limit” acompanha essa mesma chave (termopar x configuração), servindo de referência para calcular o quanto cada leitura se aproxima ou ultrapassa o limite de engenharia do sensor correspondente. Na modelagem (Seção 4.3), essa estrutura se traduz em um problema de regressão multi-saída: o vetor das sete variáveis de configuração (x₁, ..., x₇) é usado para prever simultaneamente o vetor de temperaturas de todos os termopares da área (y₁, ..., yₙ).

#### 4.2.4. Hipóteses

Hipóteses em um projeto de análise preditiva de dados são extremamente importantes, porque definem as premissas e expectativas que vão guiar todo o processo de pré-processamento, engenharia de features e construção do modelo. Assim, essa etapa garante que as variáveis selecionadas, as métricas de avaliação e as decisões de modelagem estejam alinhadas aos objetivos definidos junto ao parceiro na Seção 4.1.

Sobre o projeto, a temperatura observada em cada sensor do fogão depende de um conjunto de variáveis de configuração e de operação que atuam em conjunto sobre o comportamento térmico do produto. Fatores como a localização física do componente (key_area), a configuração da carcaça (housing), a direção do fluxo de ar do blower (blower_direction), o material do suporte da bobina (material_coil_support) e o modo de operação simulado (run_case) influenciam diretamente o quanto cada região do fogão aquece e o quão perto ela fica do limite de engenharia do próprio sensor. Diante disso, as hipóteses a seguir buscam explorar como cada uma dessas variáveis se relaciona com a temperatura medida e com o risco de superaquecimento, permitindo identificar padrões de comportamento térmico e fornecer subsídios tanto para a etapa de modelagem preditiva quanto para a priorização de testes físicos junto ao parceiro.

O resumo abaixo apresenta o que cada hipótese afirma e a conclusão obtida; os testes, gráficos e valores completos estão na Seção 3 de [`notebooks/expl_preprocessamenro_hipote.ipynb`](../notebooks/expl_preprocessamenro_hipote.ipynb).

| # | Hipótese | Resultado |
|---|---|---|
| **H1** | O efeito de uma configuração muda de sinal conforme a área do produto: a mesma alteração aquece uma área e resfria outra. | Confirmada |

| **H2** | As sete configurações não são variáveis independentes — o desenho dos 56 ensaios as confunde, ao ponto de `losses` ser redundante com `deflector_hole`. | Confirmada |

| **H3** | A temperatura depende do modo de operação: `run_case` varia a média de ~71 °C (Pyro) a ~85 °C (Broil). | Confirmada |

| **H4** | A carcaça aberta eleva a temperatura do IGBT 1: com o housing aberto, o componente opera ~9,6 °C mais quente que fechado, o contrário do esperado. | Confirmada |

##### H1 — Configurações redistribuem calor, não o eliminam

A hipótese é de que nenhuma configuração deixa o fogão inteiro mais quente ou mais frio: cada mudança move calor de uma região para outra. Escolher uma configuração seria, portanto, escolher qual área proteger, e não reduzir o aquecimento como um todo.

A hipótese se confirmou. Em todas as configurações testadas o efeito aparece com sinais opostos entre áreas: abrir o `deflector_hole`, por exemplo, aquece a área do IPC e resfria o sistema de ventilação principal, com diferença estatisticamente significativa entre as duas. O mesmo padrão se repete em `blower_direction`, `housing` e `material_coil_support`, e vale também em risco, não só em temperatura — a mesma mudança aumenta a excedência do limite em uma área enquanto a reduz em outra. A área de ventilação principal aparece de forma recorrente como aquela que recebe o calor retirado das demais, comportamento coerente com conservação de energia.

Nem toda configuração, porém, é uma troca: `blower_direction = To Back` piora simultaneamente as duas áreas eletrônicas sem melhorar nenhuma outra, ou seja, é uma condição pior em termos absolutos.

A consequência direta para a modelagem (Seção 4.3) é que a predição precisa ser condicionada à área. Um modelo que ignore a interação entre área e configuração estimaria um efeito médio que não descreve nenhuma das áreas e erra o sinal em pelo menos uma delas.

##### H2 — As configurações não são independentes entre si

A hipótese é de que as configurações estão confundidas no desenho experimental, porque os 56 ensaios não vêm de um experimento fatorial planejado: são um histórico de testes, em que cada run respondia a uma pergunta específica e mudanças em uma peça vinham acompanhadas de mudanças em outras.

A hipótese se confirmou, no caso mais extremo possível. Cada categoria de `losses` corresponde a um único valor de `deflector_hole`, sem nenhum ensaio que separe as duas variáveis — não é apenas associação forte, é identidade. Outros pares também aparecem fortemente associados (`run_case` com `losses`, `housing` com `losses`, `blower_direction` com `deflector_hole`), e o espaço de combinações é esparso: das 36 combinações possíveis entre as três variáveis principais, apenas 11 foram ensaiadas, e metade dos runs se concentra em duas delas.

Isso não invalida a H1, mas delimita o que ela mede: os efeitos são reais e reproduzíveis, porém pertencem a blocos de configuração inteiros, não a peças isoladas. A base permite identificar configurações de risco, não atribuir a causa a um componente específico.

As decisões que isso gera para a modelagem são: manter as sete variáveis de configuração como preditoras — `losses` e `board_position` inclusos —, já que a redundância estatística observada reflete uma limitação do desenho experimental (ensaios não fatoriais, histórico), não a ausência de relevância física dessas variáveis; não apresentar ranking de importância de variáveis ao parceiro como evidência de causa, já que modelos de árvore distribuem o crédito arbitrariamente entre variáveis redundantes; e recomendar que os próximos ensaios sejam planejados para quebrar essas dependências.

##### H3 — O modo de operação eleva a temperatura, mas é um fator secundário

A hipótese é de que o modo de operação afeta a temperatura medida nos componentes: os modos Broil (grelhar), que acionam o elemento superior em alta potência, operariam mais quentes que o Pyro (autolimpeza) e os casos Qualitative.

A hipótese se confirmou. Os modos Broil operam a 83,5 °C em média contra 74,5 °C nos demais, uma diferença de 9,1 °C, e a amplitude entre o modo mais quente (Broil C2, 84,7 °C) e o mais frio (Pyro, 71,4 °C) chega a 13,3 °C. A separação é muito significativa, confirmada por ANOVA, Kruskal-Wallis e pelo contraste Broil vs. demais (Welch e Mann-Whitney), todos com p < 0,001.

<div align="center">
  <sub>Figura 16 — Temperatura por modo de operação (run_case) e contraste Broil vs. demais</sub><br>
  <img src="../assets/graficos/g_h3.png" alt="Boxplot de temperatura por run_case e barras comparando Broil vs. demais modos" width="100%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>
</div>

A ressalva é sobre a magnitude: o modo explica apenas cerca de 2% da variância da temperatura (η² ≈ 0,02; Cohen's d ≈ 0,28). Com mais de quatro mil leituras, a significância é quase garantida, então a leitura honesta se apoia no efeito absoluto em °C, não no p-valor. A maior parte da variação vem da área do sensor (key_area), não do modo.

Para a modelagem (Seção 4.3), isso significa manter run_case como preditor, é um fator real e consistente, porém com peso secundário frente à área do sensor. Como nas demais hipóteses, os fatores estão confundidos entre si, de modo que o resultado identifica um padrão associado ao modo, não uma causa isolada.

##### H4 — A carcaça aberta aquece o IGBT 1, contra a intuição

A hipótese é de que a configuração da carcaça (housing) influencia a temperatura do IGBT 1, o sensor de maior presença na base, na área IPC Comp (~49% dos registros). A intuição inicial seria de que a carcaça fechada, ao prender o calor, deixaria o componente mais quente; a hipótese testa se ocorre o oposto, com a carcaça aberta redirecionando o fluxo de ar de forma a aquecer o IGBT 1 em vez de resfriá-lo. O recorte fixa o sensor (uma leitura por run, n = 56, limite constante de 110 °C), evitando pseudo-replicação.

A hipótese se confirmou, na direção contra-intuitiva. Com a carcaça aberta o IGBT 1 opera a 91,7 °C em média, contra 82,1 °C com ela fechada, uma diferença de +9,6 °C, ou seja, aberto é mais quente, não o contrário. O efeito é estatisticamente significativo no teste de médias (Welch, p ≈ 0,03) e de magnitude média (Cohen's d ≈ 0,59), maior que o observado na H3.

<div align="center">
  <sub>Figura 17 — Temperatura do IGBT 1 por configuração da carcaça (housing)</sub><br>
  <img src="../assets/graficos/g_h4.png" alt="Boxplot e barras comparando a temperatura do IGBT 1 entre housing fechado e aberto" width="100%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>
</div>

A ressalva é o tamanho da amostra: com apenas 56 leituras (28 por grupo), os testes mais conservadores ficam no limite, o Mann-Whitney não alcança significância (p ≈ 0,08) e o Fisher exato na taxa de excedência do limite (110 °C) também não (p ≈ 0,67, com poucos pontos acima do limite em ambos os grupos). A leitura honesta se apoia no efeito absoluto em °C e no Welch/Cohen's d, não numa convergência de todos os testes. Vale registrar ainda que, apesar de o IGBT 1 dominar a base em volume, ele é o mais frio dos 16 IGBTs, sua relevância vem da quantidade de dados, não da severidade térmica.

Para a modelagem (Seção 4.3), isso indica que a interação entre housing e a posição do componente deve ser considerada: o efeito da carcaça sobre a temperatura não é uniforme nem segue a intuição de "fechado aquece". Como nas demais hipóteses, housing está confundido com outras configurações no desenho dos ensaios, de modo que o resultado identifica uma associação, não uma causa isolada.

### 4.3. Preparação dos Dados e Modelagem

O Thermal Predictor é um modelo supervisionado: a variável a ser prevista (temperatura de cada termopar) é conhecida no histórico de ensaios, o que permite treinar o modelo por aprendizado supervisionado sobre esses exemplos rotulados.

**a) Organização dos dados**

Antes do treinamento, as sete variáveis de configuração de entrada são codificadas ordinalmente: cada categoria de uma variável recebe um número inteiro (0, 1, 2...) em ordem alfabética. Essa codificação não atribui significado ao valor numérico em si, o que não é um problema para um modelo baseado em árvores como o `RandomForestRegressor`: a árvore aprende limiares de decisão sobre esse número, não uma relação linear com ele. A justificativa da escolha de cada uma das sete features está detalhada em Features de entrada, abaixo.

Os dados de cada `key_area` são então divididos em três conjuntos disjuntos: 70% para treino, 20% para teste e 10% para verificação. O treino é o único conjunto usado para ajustar o modelo. Teste e verificação ficam totalmente fora do treinamento e são avaliados apenas ao final, sobre dados que o modelo nunca viu.

Dentro do conjunto de treino, os hiperparâmetros do modelo (número de árvores, profundidade máxima, mínimo de amostras por folha, número de features consideradas em cada divisão) são escolhidos por validação cruzada via `GridSearchCV`: o treino é dividido internamente em partições, o modelo é treinado e avaliado em cada combinação de hiperparâmetros da grade, e a combinação com melhor erro médio absoluto (MAE) entre as partições é escolhida. Esse processo nunca toca os dados de teste ou verificação. O número de partições é reduzido automaticamente quando o conjunto de treino de uma `key_area` é pequeno demais para o número de partições padrão.

**b) Modelagem para o problema**

**Enquadramento do problema**

O modelo precisa prever a temperatura de cada termopar, uma variável numérica contínua, não uma categoria. Por isso o problema é enquadrado como **regressão**, não classificação: o objetivo é estimar um valor em °C, não decidir entre rótulos discretos.

Dentro de cada `key_area`, cada ensaio produz uma leitura simultânea de vários termopares para a mesma configuração de entrada. Chegou a se cogitar treinar **um modelo por termopar**, mas essa abordagem foi descartada: tratar cada sensor como um problema isolado ignoraria que todos os termopares de uma mesma região respondem à mesma física de transferência de calor e à mesma configuração de ensaio, desperdiçando o sinal que um sensor carrega sobre os demais da sua área. Por isso o problema foi modelado como **regressão multi-output**: um único `RandomForestRegressor` por `key_area`, cuja saída é um vetor com a temperatura de todos os termopares daquela região simultaneamente — cada folha da árvore armazena um vetor de médias, uma por termopar, em vez de uma única média.

**Por que um modelo por `key_area`**

As sete `key_area` do produto correspondem a regimes térmicos distintos, não a um recorte arbitrário do conjunto de dados. A hipótese H1, confirmada na Seção 4.2.4, mostra isso diretamente: o efeito de uma mesma configuração de montagem muda de sinal conforme a área. Uma alteração que aquece um componente em uma região esfria outro em outra região. Um modelo único, treinado sobre o conjunto completo, estimaria um efeito médio entre as áreas, que não descreveria corretamente nenhuma delas e erraria o sinal do efeito em pelo menos uma.

A tabela de parâmetros por `key_area` (Anexos, subseção de Escalonamento) quantifica essa heterogeneidade: a amplitude de temperatura vai de 28,37 °C em `Oven HMI` a 238,19 °C em `Mainback`, uma diferença de 8,4 vezes, e o coeficiente de variação varia de 0,068 a 0,590 entre as sete regiões. Por isso o pipeline treina **um `RandomForestRegressor` por `key_area`** (sete modelos), em vez de um único modelo global: cada modelo aprende a relação entre configuração e temperatura dentro do regime térmico da sua própria região, sem que esse sinal seja diluído ou invertido pelas demais áreas. A justificativa para cada modelo prever, de uma vez, todos os termopares da sua área (abordagem multi-output) já foi apresentada em Enquadramento do problema, acima.

**Features de entrada**

*Em andamento.*

#### Métricas de avaliação do modelo

A avaliação do Thermal Predictor responde a três perguntas distintas 
para identificar quão bom o modelo é, e
nenhuma métrica isolada responde às três: se o erro médio é pequeno, se há erros
grandes escondidos atrás desse erro médio, e se o modelo aprendeu a relação entre
configuração e temperatura ou apenas reproduz o comportamento médio de cada
sensor. As três métricas abaixo cobrem uma pergunta cada e são reportadas em
conjunto, sempre por termopar (`tc_name`), sobre o conjunto de teste e em graus
Celsius, a unidade em que a decisão de engenharia é tomada. Estão implementadas
com a biblioteca scikit-learn²⁶ na seção de métricas do notebook do modelo
candidato, que acompanha ainda o afastamento entre o erro de treino e o de teste,
indicador de sobreajuste, risco elevado aqui pelo número reduzido de execuções
disponíveis (R02, Seção 4.1.5).

Onde $y_i$ é a temperatura registrada, $\hat{y}_i$ a temperatura prevista e $n$
o número de leituras do termopar avaliado:

**MAE (Erro Absoluto Médio)** média das diferenças absolutas entre valores
reais e previstos. Responde a quantos graus, em média, a previsão erra. Por não
elevar o erro ao quadrado, é a mais robusta das três diante de valores extremos.
É a primeira das métricas oficiais formalizadas no plano de ação do risco R06; as outras duas métricas desse plano, o erro normalizado pela folga até o limite de engenharia e a taxa de falsos-negativos de segurança, compõem o critério formal de aceite reportado a cada nova versão do modelo, não este comparativo entre candidatos. RMSE e R², descritos a seguir, servem exclusivamente à seleção do modelo nesta fase de modelagem, e não substituem essas duas métricas de aceite.

$$
MAE = \frac{1}{n} \sum_{i=1}^{n} \left| y_i - \hat{y}_i \right|
$$

**RMSE (Raiz do Erro Quadrático Médio)** mede a mesma distância, mas elevando
cada erro ao quadrado antes da média, com a raiz devolvendo o resultado à unidade
do alvo. Erros grandes passam a pesar desproporcionalmente, o que expõe previsões
pontualmente ruins que uma média simples esconderia. É sempre maior ou igual ao
MAE, e a igualdade só ocorre quando todos os erros têm a mesma magnitude²⁷.

$$
RMSE = \sqrt{\frac{1}{n} \sum_{i=1}^{n} \left( y_i - \hat{y}_i \right)^2}
$$

**R² (Coeficiente de Determinação)** indica quanto da variação da temperatura
o modelo explica, comparando seu erro com o de um preditor que ignora as
entradas e responde sempre a média do alvo. R² = 1 é previsão perfeita, R² = 0 é
empate com essa média e R² negativo significa desempenho pior que ela. MAE e
RMSE informam o tamanho do erro; o R² informa se houve aprendizado.

$$
R^{2} = 1 - \frac{\sum_{i=1}^{n} (y_i - \hat{y}_i)^2}{\sum_{i=1}^{n} (y_i - \bar{y})^2}
$$

##### Por que a escolha dessas métricas para avaliar o modelo?

O MAE é a métrica principal por estar na unidade em que a decisão é tomada: um
erro em graus Celsius é confrontável com a folga até o limite normativo do
componente, o que não ocorreria com uma métrica adimensional ou em °C². Sua
limitação é tratar todos os erros com o mesmo peso.

O RMSE cobre exatamente essa cegueira. A razão RMSE/MAE revela se o erro está
concentrado em poucos pontos ou distribuído: quanto mais ela se afasta de 1,
maior a cauda de previsões ruins. Isso importa porque uma única previsão que
subestime um componente crítico pode liberar um projeto termicamente inseguro
(R04), daí ambas serem calculadas por termopar, e não só como média entre
alvos, para localizar o componente problemático.

O R² é o único que distingue aprendizado de reprodução da média. Sua referência
é a média do próprio conjunto de teste, um preditor-oráculo que ninguém conhece
antes de medir; por isso o notebook reporta em paralelo um
`DummyRegressor(strategy="mean")` ajustado no treino, contraparte realista que
atende ao requisito de baselines obrigatórios do risco R03. É medido por termopar
porque, agregado, o preditor de referência seria
a média de todos os sensores do produto,

valor que nenhum engenheiro usaria como
estimativa. Como as regiões operam em patamares distintos (amplitude de 28,37 °C
em `Oven HMI` contra 238,19 °C em `Mainback`, Anexos), o R² agregado mediria essa
diferença de patamar, já conhecida, e não o que o modelo aprendeu.

O erro percentual (MAPE) foi descartado por incorrer na crítica do risco R06: a
escala Celsius é intervalar, logo 10% de 150 °C são 15 °C, mas os mesmos 150 °C
valem 423,15 K, cujos 10% são 42,3 °C. MAE e RMSE contornam o problema por
reportarem erro absoluto, e o R² por ser invariante a transformações afins do
alvo. O notebook reporta ainda o afastamento entre o MAE de treino e o de teste,
indicador de sobreajuste. O R03 fixa esse gatilho em cinco pontos percentuais sem
definir a grandeza sobre a qual o percentual incide, ambiguidade análoga à do
critério de 10%, razão pela qual o afastamento é reportado em graus Celsius e
em variação relativa, sem converter um no outro.

#### 4.3.4. Análise e interpretação dos resultados do modelo candidato

O primeiro modelo candidato do Thermal Predictor é um **Gradient Boosting Regressor** multi-saída, treinado em sete instâncias independentes — uma por `key_area`. Sua arquitetura e seus hiperparâmetros estão implementados nas Seções 1 a 8 de [`notebooks/Grad_Boosting_Regre.ipynb`](../notebooks/Grad_Boosting_Regre.ipynb); esta subseção interpreta **o que suas métricas significam** para o uso pretendido pelo parceiro, e onde estão os limites do que ele pode sustentar. A consolidação das métricas dos três modelos está na Seção 9 do mesmo notebook.

##### Desempenho comparado

A Figura 18 e a tabela abaixo trazem as métricas médias entre os sete setores no conjunto de teste, para os três algoritmos avaliados pelo grupo. A comparação é direta porque os três notebooks partem da mesma base, com a mesma semente (42) e a mesma divisão 70/20/10 — apenas o algoritmo varia.

<div align="center">
  <sub>Figura 18 — Comparativo de métricas entre os modelos candidatos no conjunto de teste</sub><br>
  <img src="../assets/graficos/modelo_candidato_comparativo.png" alt="Painéis comparando MAE, RMSE, R², MAPE e fração dentro de 10% entre Gradient Boosting, Decision Tree e Random Forest, e gráfico de MAE por setor" width="100%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir dos notebooks de modelagem.</sup>
</div>

| Modelo | MAE (°C) ↓ | RMSE (°C) ↓ | R² ↑ | MAPE (%) ↓ | Dentro de 10% ↑ |
|---|---|---|---|---|---|
| **Gradient Boosting** | **4,18** | **6,40** | 0,156 | **5,73** | **85,6%** |
| Decision Tree | 4,72 | 8,02 | 0,156 | 6,04 | 85,5% |
| Random Forest | 4,88 | 7,18 | **0,283** | 6,54 | 79,8% |

**Pontos fortes.** O Gradient Boosting vence em quatro das cinco métricas. O ganho mais relevante para o parceiro é o MAE: **4,18 °C** contra 4,72 °C da árvore de decisão e 4,88 °C da floresta aleatória — uma redução de 11% a 14% no erro típico, medido na mesma unidade em que a engenharia negocia margem de projeto. O RMSE, que penaliza erros grandes de forma quadrática, cai proporcionalmente mais (6,40 contra 8,02 e 7,18): o ganho não vem de acertar melhor o caso médio, mas de **errar menos nos casos extremos** — exatamente o comportamento desejável em um modelo cuja função é sinalizar risco de superaquecimento, já que o custo de uma previsão errada não é simétrico. Subestimar em 15 °C um componente próximo do `active_limit` libera para ensaio físico uma configuração que deveria ter sido barrada; superestimar apenas desperdiça uma checagem. Por fim, **85,6% das previsões caem dentro da margem de 10%** acordada com o parceiro, contra 79,8% do Random Forest.

##### A ressalva do R², e o que ela delimita

O Gradient Boosting **perde** na única métrica adimensional: seu R² médio é 0,156, contra 0,283 do Random Forest. Mais do que isso, o R² é **negativo** em dois setores (`mainback`, −0,01; `ipc_comp`, −0,89), o que significa que, nesses casos, prever simplesmente a média histórica da área teria explicado a variância tão bem ou melhor que o modelo.

Esse resultado não contradiz o anterior, e a distância entre os dois é o achado central desta análise. MAE e MAPE medem a distância entre o valor previsto e o observado; o R² mede quanto da **variação** entre ensaios o modelo consegue reproduzir. Um modelo pode acertar o patamar térmico de uma área com folga e ainda assim falhar em ordenar corretamente os ensaios dentro dela. É o que ocorre aqui: o Gradient Boosting acerta **onde a área opera** (4,18 °C de erro típico), mas ainda **não distingue com segurança duas configurações próximas** dentro da mesma área.

A consequência é uma qualificação explícita do escopo de uso do modelo candidato:

- **Uso sustentado pelas métricas atuais — triagem térmica.** Estimar o patamar de temperatura esperado de uma área sob uma dada configuração e sinalizar proximidade do `active_limit`, priorizando quais ensaios físicos executar primeiro. É exatamente a dor descrita na jornada do Engenheiro de Qualidade (Seção 4.1.7), em que a fila de ensaios é hoje ordenada por experiência tácita.
- **Uso ainda não sustentado — ranqueamento fino.** Escolher entre duas configurações candidatas com base na diferença prevista entre elas, sobretudo em `mainback` e `ipc_comp`. Essa decisão continua exigindo ensaio físico, e apresentá-la como capacidade do modelo hoje seria prometer além da evidência.

##### Superajuste

O erro médio de treino do Gradient Boosting é de 2,03 °C contra 4,18 °C no teste, um **gap de 2,15 °C**. É um sinal claro de superajuste, embora menor que o da árvore de decisão (2,80 °C): a amostragem estocástica de linhas a cada estágio (`subsample = 0,8`), mecanismo de regularização proposto por Friedman justamente para conter a variância do *boosting* em amostras pequenas (FRIEDMAN, 2001), somada à profundidade limitada a 3 níveis, contém melhor a memorização do que a árvore única, que chegou a 8 níveis e 23 folhas em `coil_temps`.

Esse gap materializa o **risco R03** mapeado na Seção 4.1.5, e sua causa é dimensional antes de ser algorítmica: 56 ensaios, dos quais restam de 24 a 56 linhas úteis por área, e apenas 31 combinações distintas de configuração. Nenhum ajuste de hiperparâmetro resolve escassez de dados — o caminho é ampliar a base de ensaios, e a recomendação ao parceiro é que os próximos sejam planejados para cobrir combinações ainda não testadas, não para repetir as já frequentes.

##### O que a explicabilidade pode e não pode afirmar

A Figura 19 mostra a importância média das variáveis para a área `Mainback`, com o termopar mais sensível a cada uma.

<div align="center">
  <sub>Figura 19 — Explicabilidade do modelo candidato: importância das variáveis na área Mainback</sub><br>
  <img src="../assets/graficos/modelo_candidato_explicabilidade.png" alt="Gráfico de barras horizontais com a importância média de cada variável de configuração para o Gradient Boosting na área Mainback, indicando o termopar mais sensível a cada variável" width="100%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de notebooks/Grad_Boosting_Regre.ipynb.</sup>
</div>

O `run_case` domina, com importância de 0,481 — quase o triplo da segunda variável (`housing`, 0,152) —, resultado coerente com a **H3** (Seção 4.2.4), que já identificara o modo de operação como fator real de elevação térmica. O detalhe que só a arquitetura multi-saída revela é *onde* cada variável pesa: o `run_case` concentra 0,866 de importância no termopar `Storage Drawer (Metal Above)`, justamente o de maior amplitude térmica da área (90,25 °C a 171,57 °C). Para o parceiro, essa leitura por sensor é acionável — indica qual ponto instrumentar com prioridade ao validar uma mudança de modo de operação.

O gráfico, porém, **não deve ser lido como evidência de causa**. A **H2** demonstrou que as sete configurações estão confundidas no desenho experimental: cada categoria de `losses` corresponde a um único valor de `deflector_hole`, uma relação de identidade, não apenas de associação. Diante de variáveis redundantes, algoritmos baseados em árvores distribuem o crédito preditivo de forma arbitrária entre elas. A importância de 0,003 de `material_coil_support` indica que o modelo **não precisou** dessa variável — não que o material do suporte seja termicamente irrelevante. A leitura correta é que a figura descreve **como o modelo decide**, não **como o fogão aquece**.

Vale registrar ainda uma divergência assumida em relação à H2, que recomendara retirar `losses` e `board_position` do modelo por redundância. Este primeiro candidato mantém as sete variáveis deliberadamente: com apenas 31 combinações distintas, removê-las antes de medir seu efeito eliminaria a própria evidência de que são dispensáveis. As importâncias agora medidas (0,055 e 0,098) confirmam com número o que a H2 antecipara por análise do desenho experimental, e transformam a remoção em um teste objetivo para a Seção 4.4.

##### Síntese

O Gradient Boosting sustenta-se como primeiro modelo candidato por entregar o menor erro em graus, a menor incidência de erros extremos e a maior taxa de acerto dentro da margem acordada com o parceiro. Seus limites são igualmente explícitos e decorrem da base disponível, não do algoritmo: baixo poder explicativo da variância intra-área (R² de 0,156, negativo em dois setores), superajuste de 2,15 °C e impossibilidade de atribuição causal por confundimento no desenho dos ensaios. Em termos práticos, o modelo já serve para **priorizar ensaios**, e ainda não para **substituí-los**. As Seções 4.4 e 4.5 retomam esse candidato para a comparação formal entre modelos e para a definição da solução final, incluindo o plano de contingência para os casos em que a previsão falhar.

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

## <a name="c6"></a>6. Estrutura da Solução Visual e Acesso ao Modelo Preditivo

O Thermal Predictor é entregue em duas partes que operam em conjunto: um **dashboard interativo**, que é a camada visual da solução, e um **software preditivo open source**, que é o seu núcleo. O software abriga o pré-processamento, os modelos treinados e a rotina de predição; o dashboard traduz esse núcleo em uma interface de consulta. Ambos são construídos apenas com bibliotecas de código aberto em Python, sem qualquer dependência de software licenciado.

Essa divisão define duas formas distintas de acesso ao modelo. Pelo dashboard, o usuário consulta a temperatura estimada de uma configuração de fogão sem escrever uma linha de código: informa os parâmetros de montagem que deseja avaliar e recebe as previsões dos sensores de interesse. É o caminho dos times de Produtos, Design, Qualidade e Marketing. Pelo software, o usuário chama o modelo diretamente, integrando-o a rotinas próprias, executando predições em lote e retreinando o modelo à medida que novos dados de simulação e de teste físico ficam disponíveis. É o caminho da equipe de Engenharia (CFD).

Esta primeira parte da documentação enuncia os requisitos funcionais das duas partes, isto é, o que a solução deve permitir que o usuário faça. Cada requisito descreve uma única capacidade e recebe um nível de prioridade — alta para o que sustenta o fluxo essencial de predição, média para o que amplia o uso analítico da solução e baixa para o que agrega conveniência. As tabelas estão ordenadas por prioridade. A arquitetura de implementação, o layout das telas e a escolha das bibliotecas serão definidos nas etapas seguintes do projeto.

### 6.1. Requisitos funcionais

#### 6.1.1. Requisitos funcionais do dashboard

| ID | Requisito funcional | Prioridade |
| --- | --- | --- |
| RF01 | Permitir que o usuário informe os parâmetros de configuração do fogão a ser avaliado: direção do fluxo de ar do blower, estado do housing, posição da placa, material do suporte da bobina e presença do furo do defletor. | Alta |
| RF02 | Permitir que o usuário selecione o país de referência da consulta, Brasil ou México, para que a predição seja avaliada contra os limites de engenharia do mercado correspondente. | Alta |
| RF03 | Permitir que o usuário selecione quais sensores ou áreas-chave deseja consultar, em vez de exigir a leitura dos 78 sensores a cada consulta. | Alta |
| RF04 | Exibir a temperatura estimada para cada sensor ou área-chave selecionada, desde que a confiabilidade da predição permita a exibição de um valor numérico. | Alta |
| RF05 | Exibir, junto de cada predição, a margem de erro esperada. | Alta |
| RF06 | Controlar o acesso ao dashboard por autenticação individual, com usuário e senha. | Alta |
| RF07 | Classificar e sinalizar a confiabilidade de cada predição em um dos três estados possíveis: interpolação (a configuração está dentro da faixa já testada), extrapolação moderada (está próxima dessa faixa) ou fora de domínio (está fora de qualquer faixa testada). No estado fora de domínio, o valor numérico é suprimido e o sistema recomenda simulação CFD completa. | Alta |
| RF08 | Exibir o limite de engenharia aplicável a cada sensor consultado, destacando as predições que o excedem. | Média |
| RF09 | Permitir a consulta simultânea de duas ou mais configurações, exibindo os resultados lado a lado. | Média |
| RF10 | Registrar o histórico de acessos ao dashboard, incluindo a data e o horário de cada acesso. | Baixa |
| RF11 | Permitir a exportação dos resultados da consulta em formato tabular. | Baixa |
| RF20 | Exibir, junto de cada predição, um aviso de que o valor representa uma estimativa da saída da simulação numérica (CFD) — conforme mitigação do risco R05, Seção 4.1.5 — e não uma medição física direta. | Média |

#### 6.1.2. Requisitos funcionais do software preditivo

| ID | Requisito funcional | Prioridade |
| --- | --- | --- |
| RF12 | Expor uma rotina de predição que receba uma configuração de montagem e retorne as temperaturas estimadas, permitindo uso programático independente do dashboard. | Alta |
| RF13 | Manter os limites de engenharia de temperatura organizados por país, Brasil ou México, aplicados às temperaturas estimadas por um único modelo preditivo. | Alta |
| RF14 | Aplicar, sobre os dados de entrada da predição, o mesmo pré-processamento usado no treinamento. | Alta |
| RF15 | Ser distribuído exclusivamente com bibliotecas de código aberto, sem depender de nenhum software licenciado. | Alta |
| RF16 | Carregar os dados de simulação e os históricos de teste a partir de uma fonte externa ao repositório de código, ou permitir que o usuário anexe novos dados de teste diretamente no sistema para que passem a integrar o conjunto de treinamento. | Alta |
| RF17 | Permitir o retreinamento dos modelos com novos dados de simulação (CFD) ou de testes físicos, sem exigir alteração do código-fonte. | Média |
| RF18 | Permitir a predição em lote, a partir de um conjunto de configurações fornecido pelo usuário. | Média |
| RF19 | Calcular e registrar as métricas de avaliação do modelo sobre um conjunto de dados de referência, para acompanhar sua evolução entre versões. | Média |

### 6.2. Regras de negócio

Enquanto os requisitos funcionais descrevem o que a solução deve permitir que o usuário faça, as regras de negócio descrevem as condições, restrições e critérios que governam como essas ações são executadas e validadas. Cada regra está associada ao(s) requisito(s) funcional(is) que ela restringe ou complementa.

#### 6.2.1. Regras de negócio do dashboard

| ID | Regra de negócio | RF relacionado(s) |
| --- | --- | --- |
| RN01 | Uma consulta só pode ser submetida se todos os parâmetros de configuração forem informados; o dashboard não deve aceitar o envio com algum desses campos em branco. | RF01 |
| RN02 | A seleção do país de referência é obrigatória em toda consulta realizada no dashboard. | RF02 |
| RN03 | O país selecionado determina os limites de temperatura de engenharia aplicáveis a cada sensor consultado; o modelo preditivo usado na predição é o mesmo para os dois países, apenas os limites de comparação variam. | RF02, RF13 |
| RN04 | Ao menos um sensor ou área-chave deve ser selecionado para que a consulta seja realizada, dentro das áreas-chave já mapeadas: Mainback, bobinas, sistemas de ventilação, componentes do IPC, comandos do cooktop (CT Knobs) e região de HMI. | RF03 |
| RN05 | Toda temperatura estimada exibida deve vir acompanhada de sua margem de erro; não é permitido exibir uma predição sem indicar sua incerteza associada. | RF04, RF05 |
| RN06 | A margem de erro exibida deve ser apresentada em formato comparável ao critério de aceite oficial do projeto, o erro máximo de 10%. | RF04, RF05 |
| RN07 | Toda predição deve passar pela classificação de confiabilidade antes de ser exibida ao usuário; o dashboard não deve apresentar um resultado que ainda não tenha sido classificado. | RF07 |
| RN08 | No estado fora de domínio, o valor numérico da temperatura não pode ser exibido, devendo ser substituído pela recomendação de simulação CFD completa. | RF07 |
| RN09 | Toda predição com valor numérico exibido que exceda o limite de engenharia definido para o sensor consultado deve ser destacada visualmente, esteja a configuração em interpolação ou em extrapolação moderada. | RF08 |
| RN10 | Na consulta simultânea de múltiplas configurações, cada uma deve ser validada individualmente pelas mesmas regras antes de ser exibida lado a lado com as demais. | RF09 |
| RN11 | Nenhuma ação do dashboard pode ser realizada sem uma sessão autenticada válida, com usuário e senha individuais. | RF06 |
| RN12 | Não é permitido o acesso anônimo ao dashboard, nem o compartilhamento de credenciais entre usuários. | RF06 |
| RN13 | Toda tentativa de acesso ao dashboard, bem-sucedida ou não, deve ser registrada no histórico com identificação do usuário, data e horário, de modo a permitir auditoria de uso. | RF06, RF10 |
| RN14 | A exportação de resultados deve incluir, além da temperatura estimada, a configuração consultada, a margem de erro e a indicação de confiabilidade, nunca apenas o valor bruto da predição. | RF04, RF05, RF07, RF11 |

#### 6.2.2. Regras de negócio do software preditivo

| ID | Regra de negócio | RF relacionado(s) |
| --- | --- | --- |
| RN15 | Toda avaliação de uma predição contra os limites de engenharia deve informar obrigatoriamente o país de referência, Brasil ou México, usado exclusivamente para selecionar a tabela de limites aplicável, e não para escolher entre modelos preditivos distintos. | RF13 |
| RN16 | Uma predição é considerada inválida se os dados de entrada não tiverem passado pelo mesmo pré-processamento aplicado no treinamento. | RF14 |
| RN17 | A vedação a bibliotecas proprietárias ou licenciadas vale para todas as etapas do software: pré-processamento, treinamento e predição. | RF15 |
| RN18 | Os dados de simulação (CFD), de testes físicos e os anexados pelo usuário não podem ser versionados junto ao código-fonte; devem sempre residir na fonte de dados externa ao repositório. | RF16 |
| RN19 | O retreinamento dos modelos não pode exigir alteração do código-fonte da rotina de predição; a atualização deve se limitar à fonte de dados externa e ao disparo do retreinamento. | RF16, RF17 |
| RN20 | Na predição em lote, cada configuração do conjunto deve ser validada e processada de forma independente, de modo que uma configuração inválida ou malformada não invalide o resultado das demais configurações do lote. | RF18, RF12 |
| RN21 | Toda nova versão do modelo deve reportar as métricas que operacionalizam o critério de aceite de erro máximo de 10%: o erro médio absoluto em °C por termopar, o erro normalizado pela folga entre a temperatura prevista e o limite de engenharia do sensor, e a taxa de falsos-negativos de segurança (a proporção de predições não sinalizadas como excedentes que, no teste físico correspondente, ultrapassam o limite de engenharia). | RF08, RF19 |
| RN22 | As métricas de avaliação de uma nova versão do modelo devem ser calculadas sobre o mesmo conjunto de dados de referência utilizado em versões anteriores. | RF19 |
| RN23 | Toda predição exibida deve comunicar explicitamente que o valor representa uma estimativa da saída da simulação CFD e não uma medição física direta, para que o usuário não a interprete como dado de campo. | RF20 |

## <a name="c7"></a>7. Referências

As referências abaixo estão numeradas na ordem em que aparecem citadas ao longo do texto.

1. GURUFOCUS. *Whirlpool Corp (WHR) Q2 2026 Earnings Call Highlights: Strategic Pricing and Cost Actions Drive Sequential Margin Improvement Amid Market Headwinds.* ago. 2026. Disponível em: https://www.gurufocus.com/news/9002695/whirlpool-corp-whr-q2-2026-earnings-call-highlights-strategic-pricing-and-cost-actions-drive-sequential-margin-improvement-amid-market-headwinds. Acesso em: 13 ago. 2026.
2. BLOOMBERG LÍNEA. *Whirlpool vê retomada da demanda e aposta em produtos para apartamentos menores.* nov. 2023. Disponível em: https://www.bloomberglinea.com.br/negocios/whirpool-ve-retomada-da-demanda-e-aposta-em-produtos-para-apartamentos-menores/. Acesso em: 13 ago. 2026.
3. ELETROS — Associação Nacional de Fabricantes de Produtos Eletroeletrônicos. *Dados setoriais de linha branca.* 2025.
4. WHIRLPOOL CORPORATION BRASIL. *Whirlpool apresenta metas de qualidade e sustentabilidade para fornecedores.* [201-?]. Disponível em: https://www.whirlpool.com.br/0000/00/whirlpool-apresenta-metas-de-qualidade-e-sustentabilidade-para-fornecedores/. Acesso em: 13 ago. 2026.
5. BLOOMBERG LÍNEA. *Da geladeira ao frigobar, canetas emagrecedoras já impactam o mercado de linha branca.* jan. 2026. Disponível em: https://www.bloomberglinea.com.br/negocios/da-geladeira-ao-frigobar-canetas-emagrecedoras-ja-impactam-o-mercado-de-linha-branca/. Acesso em: 13 ago. 2026.
6. JORNAL DO COMMERCIO. *Whirlpool acelera a era das casas inteligentes com nova linha de produção de indução em Manaus.* 2026. Disponível em: https://jcam.com.br/colunas/whirlpool-acelera-a-era-das-casas-inteligentes-com-nova-linha-de-producao-de-inducao-em-manaus/. Acesso em: 13 ago. 2026.
7. CENTRAL DO VAREJO. *Airfryer chega a 64% dos lares brasileiros e lidera nova onda de eletrodomésticos de conveniência.* 2025. Disponível em: https://centraldovarejo.com.br/airfryer-chega-a-64-dos-lares-brasileiros-e-lidera-nova-onda-de-eletrodomesticos-de-conveniencia/. Acesso em: 14 ago. 2026.
8. O TEMPO. *Delivery cresce e acende debate nas redes: o ato de cozinhar em casa vai acabar?* 2023. Disponível em: https://www.otempo.com.br/economia/delivery-cresce-e-acende-debate-nas-redes-o-ato-de-cozinhar-em-casa-vai-acabar-1.3336447. Acesso em: 14 ago. 2026.
9. DATA MERCANTIL. *Electrolux, a sueca que está dominando o Brasil; entenda.* mar. 2024. Disponível em: https://datamercantil.com.br/2024/03/04/electrolux-a-sueca-que-esta-dominando-o-brasil-entenda/. Acesso em: 14 ago. 2026.
10. ELECTROLUX GROUP. *Com investimentos de R$ 700 milhões, Electrolux Group inaugura planta 100% sustentável que marca sua maior expansão na América Latina.* ago. 2025. Disponível em: https://www.electroluxgroup.com/en/news/com-investimentos-de-r-700-milhoes-electrolux-group-inaugura-planta-100-sustentavel-que-marca-sua-maior-expansao-na-america-latina/. Acesso em: 14 ago. 2026.
11. TIMES BRASIL. *Diretora da Midea: somos o 3º player no Brasil, e iremos aumentar.* 2025. Disponível em: https://timesbrasil.com.br/empresas-e-negocios/midea-carrier-brasil-player/. Acesso em: 14 ago. 2026.
12. CORREIO DE MINAS. *Chinesa Midea investe R$ 630 milhões e inaugura nova fábrica em Pouso Alegre.* dez. 2024. Disponível em: https://correiodeminas.com.br/2024/12/14/chinesa-midea-investe-r-630-milhoes-e-inaugura-nova-fabrica-em-pouso-alegre-a-primeira-unidade-100-propria-no-brasil-promete-revolucionar-o-mercado-de-eletrodomesticos-no-pais/. Acesso em: 14 ago. 2026.
13. GEO-MEXICO. *Mexico's multinationals: Mabe, domestic appliance manufacturer.* Disponível em: https://geo-mexico.com/?p=11419. Acesso em: 14 ago. 2026.
14. BLOOMBERG LÍNEA. *Whirlpool inaugura hub de inovação em Rio Claro e vê novo impulso para vendas.* Disponível em: https://www.bloomberglinea.com.br/negocios/whirlpool-inaugura-hub-de-inovacao-em-rio-claro-e-ve-novo-impulso-para-vendas/. Acesso em: 14 ago. 2026.
15. MEXICOINDUSTRY. *Whirlpool Ramos Arizpe.* Disponível em: https://mexicoindustry.com/hecho-en-mexico/whirlpool-ramos-arizpe-producen-los-refrigeradores-que-llegan-hasta-los-hogares-de-estados-unidos-. Acesso em: 14 ago. 2026.
16. XATAKA MÉXICO. *Whirlpool cerrará una planta en México.* Disponível em: https://www.xataka.com.mx/empresas-y-economia/whirlpool-quiere-fabricar-refrigeradores-forma-barata-eso-cerrara-planta-mexico. Acesso em: 14 ago. 2026.
17. INMETRO. *Programa Brasileiro de Etiquetagem (PBE) / ENCE.* Base legal: Lei nº 10.295/2001 e Decreto nº 9.864/2019. 2026.
18. SELECTO GLOBAL. *The race to market: achieving speed and quality in product launch.* Disponível em: https://selectoglobal.com/blog-post/the-race-to-market-achieving-speed-and-quality-in-product-launch. Acesso em: 13 ago. 2026.
19. MCKINSEY & COMPANY. *Digital twins: the key to smart product development.* Disponível em: https://www.mckinsey.com.br/industries/industrials/our-insights/digital-twins-the-key-to-smart-product-development. Acesso em: 13 ago. 2026.
20. CHEN, Jiyao; REILLY, Richard R.; LYNN, Gary S. *The impacts of speed-to-market on new product success: the moderating effects of uncertainty.* IEEE Transactions on Engineering Management, v. 52, n. 2, p. 199-212, 2005.
21. COMO a Whirlpool, dona de Brastemp e Consul, cresce 12% com dólar e juros altos. Brazil Economy, [s.l.], 10 abr. 2025. Disponível em: https://brazileconomy.com.br/empresas/2025/04/o-segredo-da-whirlpool-dona-de-brastemp-e-consul-para-crescer-com-juro-alto-e-dolar-caro/. Acesso em: 6 ago. 2026.
22. BRASIL. **Lei nº 13.709, de 14 de agosto de 2018.** Lei Geral de Proteção de Dados Pessoais (LGPD). Brasília, DF: Presidência da República, 2018. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. Acesso em: 1 set. 2026.
23. MÉXICO. **Ley Federal de Protección de Datos Personales en Posesión de los Particulares.** Diario Oficial de la Federación, Ciudad de México, 5 jul. 2010. Disponível em: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf. Acesso em: 1 set. 2026.
24. HOTZ, Nick. What is CRISP DM?. Data Science PM, 9 dez. 2024. Disponível em: https://www.datascience-pm.com/crisp-dm-2/. Acesso em: 8 set. 2026.
25. SHARMA, Rajat. CRISP-DM Explained: A Proven Data Mining Methodology. Udacity Blog, 13 mar. 2025. Disponível em: https://www.udacity.com/blog/crisp-dm-explained-a-proven-data-mining-methodology/. Acesso em: 8 set. 2026.
26. PEDREGOSA, F. et al. Scikit-learn: Machine Learning in Python. Journal of Machine Learning Research, v. 12, p. 2825-2830, 2011. Disponível em: https://jmlr.org/papers/v12/pedregosa11a.html. Acesso em: 11 set. 2026.
27. CHAI, T.; DRAXLER, R. R. Root mean square error (RMSE) or mean absolute error (MAE)? – Arguments against avoiding RMSE in the literature. Geoscientific Model Development, v. 7, p. 1247-1250, 2014. Disponível em: https://gmd.copernicus.org/articles/7/1247/2014/. Acesso em: 11 set. 2026.
28. FRIEDMAN, Jerome H. *Greedy function approximation: a gradient boosting machine.* The Annals of Statistics, v. 29, n. 5, p. 1189-1232, 2001.

## <a name="attachments"></a>Anexos

#### Análise e teste de normalidade da variável quantitativa

Esta subseção descreve os procedimentos de análise estatística aplicados ao conjunto de dados do grupo, organizados em duas etapas principais: o teste de normalidade e o escalonamento das variáveis quantitativas. Primeiro, verifica-se se as variáveis seguem uma distribuição normal, combinando métodos estatísticos formais e representações gráficas. Em seguida, aplica-se o escalonamento (normalização) dos dados, de modo a colocar as variáveis em escalas comparáveis e adequadas para a construção de modelos preditivos e para as análises subsequentes.

**Nota sobre o número de variáveis analisadas.** O roteiro deste anexo pede a análise de três variáveis quantitativas. O dataset fornecido pela Whirlpool Latin America, porém, possui apenas **uma** variável quantitativa contínua de fato: `temp`. As outras duas colunas numéricas do `dtype` bruto foram descartadas dessa categoria já na classificação da Seção 4.2.1, por motivos estruturais do dado, não por escolha do grupo:

- `tc_number` é um identificador de sensor (rótulo), não uma quantidade — média, desvio-padrão e normalização não têm significado sobre ele.
- `active_limit` é um parâmetro de especificação de engenharia atribuído a cada termopar (constante para o mesmo sensor em todas as execuções), não uma grandeza medida no experimento; além disso, carrega placeholders sem significado físico (`"Monitor (150 C)"` e `active_limit = 1000` para "sem limite definido"), o que tornaria qualquer teste de normalidade ou escalonamento sobre essa coluna pouco interpretável.

Diante disso, o grupo optou por aprofundar a análise em `temp` — a única variável quantitativa contínua e também a variável-alvo do modelo — em vez de forçar testes estatísticos sobre colunas que não representam grandezas contínuas. O grupo tomou essa decisão ciente de que ela diverge do número de variáveis pedido no roteiro, e a registra aqui para validação explícita com o professor.

**a) Hipóteses**


**Afirmação:**

O objetivo deste estudo é verificar se a variável quantitativa "Temperatura" (`temp`), medida em graus Celsius nos termopares posicionados nos componentes térmicos do forno, segue uma distribuição normal. Essa variável é a única variável quantitativa contínua do conjunto de dados fornecido pela Whirlpool Latin America, sendo também a variável-alvo (*target*) do modelo preditivo desenvolvido pelo grupo.

**Hipóteses Estatísticas do Teste de Normalidade:**

Para testar isso de forma rigorosa, foram formuladas duas hipóteses mutuamente excludentes para a variável. De um lado, temos a hipótese nula ($H_0$), que assume que a variável segue uma distribuição normal. Do outro, a hipótese alternativa ($H_a$), que defende que ela não segue.

- Para a variável "Temperatura" (`temp`):
    - $H_0$ (Hipótese Nula): A variável "Temperatura" segue uma distribuição normal.
    - $H_a$ (Hipótese Alternativa): A variável "Temperatura" não segue uma distribuição normal.

O nível de significância adotado é $\alpha = 0{,}05$. Dessa forma, se o *p-valor* obtido no teste for menor que $0{,}05$, rejeita-se $H_0$, concluindo-se que há evidência estatística de que a variável não segue uma distribuição normal. Caso contrário, não há evidências suficientes para rejeitar $H_0$.

**b) Nível de significância**

Nível de significância (α): 0,05 (5%).

Regra de decisão:

Se $p \geq 0{,}05$: não rejeita $H_0$ (ausência de evidência contra a normalidade).

Se $p < 0{,}05$: rejeita $H_0$ (não segue distribuição normal).

**c) Teste de Normalidade**

Foram aplicados três testes formais, todos com $H_0$ = "a amostra vem de uma distribuição normal": Shapiro-Wilk (W = 0,8669; p = 2,72 × 10⁻⁵⁰), D'Agostino-Pearson (K² = 1.484,31; p ≈ 0) e Anderson-Darling (A² = 93,89, acima do valor crítico de 0,752 a 5%). Os três convergem na mesma decisão: rejeita-se $H_0$, ou seja, temp não segue distribuição normal.

**Observação:** o Shapiro-Wilk é o mais indicado para bases desse tamanho e é o mais sensível para perceber quando os dados fogem da normalidade; o D'Agostino-Pearson olha para o formato da distribuição, unindo assimetria (se os dados pendem mais para um lado) e curtose (se há muitos valores extremos) em um único resultado; e o Anderson-Darling é parecido com os outros dois, mas dá atenção especial às pontas da distribuição, ou seja, aos valores mais altos e mais baixos.

Variáveis analisadas (conforme o dataset):

- `temp` (temperatura dos sensores/termopares)

A classificação da Seção 1.1 identifica duas colunas numéricas, `temp` e `active_limit`. Apenas `temp` é submetida a teste de normalidade e escalonamento: `active_limit` não é uma medição repetida com distribuição própria, e sim um limite de engenharia por sensor, usado como referência de excedência (`temp > active_limit`). Além disso, após o tratamento do valor `"Monitor (150 °C)"` na Seção 2 (Pré-processamento), o placeholder de "sem limite definido" deixou de ser distinguível do limite real de 150 °C em 361 linhas, o que tornaria qualquer teste de normalidade sobre essa coluna pouco interpretável.

Resultados do teste (valores fornecidos):

| Variável | p-valor (científico) | Conclusão (α = 0,05) |
|:---|:---|:---|
| `temp` | 2,72 × 10⁻⁵⁰ | Rejeita $H_0$ — não normal |

Interpretação: o p-valor encontrado é astronomicamente pequeno (um número com dezenas de zeros após a vírgula antes de chegar ao primeiro dígito). Ele é muito, mas muito menor que o nosso nível de significância de 0,05. Portanto, com base no teste de Shapiro-Wilk, temos evidências estatísticas avassaladoras para rejeitar a hipótese de normalidade da variável `temp`.

Código utilizado para execução (Python):

```python
from scipy import stats

alpha = 0.05
temp = df['temp'].dropna()

# Shapiro-Wilk
w_stat, p_shapiro = stats.shapiro(temp)

# D'Agostino-Pearson
k2_stat, p_dagostino = stats.normaltest(temp)

# Anderson-Darling
resultado_ad = stats.anderson(temp, dist='norm')

print(f"Shapiro-Wilk: W = {w_stat:.4f}, p = {p_shapiro:.3e}")
print(f"D'Agostino-Pearson: K² = {k2_stat:.2f}, p = {p_dagostino:.3e}")
print(f"Anderson-Darling: A² = {resultado_ad.statistic:.2f}, "
      f"valor crítico (5%) = {resultado_ad.critical_values[2]:.3f}")

conclusao = ("Rejeita H₀ — evidência de não normalidade" if p_shapiro < alpha
             else "Não rejeita H₀ — sem evidência suficiente para afastar a normalidade")
print(f"Conclusão (α = {alpha}): {conclusao}")
```

**d) Histogramas e resultados dos testes estatísticos de normalidade**

O item c) registrou uma única variável quantitativa analisada, `temp`. O histograma abaixo usa os dados originais dessa variável, sem escalonamento, e serve para confrontar o formato visual da distribuição com o resultado dos testes formais. Gerado em [`notebooks/expl_preprocessamenro_hipote.ipynb`](../notebooks/expl_preprocessamenro_hipote.ipynb), Seção 4.

<div align="center">
  <sub>Figura 20 — Distribuição de temp em dados originais, sem escalonamento (n = 4.065)</sub><br>
  <img src="../assets/graficos/hist_temp.png" alt="Histograma da temperatura em dados originais, com corpo entre 40 e 132 °C, pico próximo de 75 °C e cauda longa à direita até 273 °C" width="80%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>
</div>

**`temp` — o formato visual reforça o resultado do teste.**

O Shapiro-Wilk rejeitou H₀ (W = 0,8669; p = 2,72 × 10⁻⁵⁰), e o histograma mostra, por evidência independente, as quatro características que explicam essa rejeição:

- **Não há formato de sino.** Uma normal é simétrica em torno da média; aqui o corpo da distribuição se concentra entre 40 °C e 132 °C, com pico na faixa de 70,7 °C a 76,9 °C (434 leituras), e os dois lados do pico se comportam de maneira diferente.
- **Assimetria à direita.** O coeficiente de assimetria é +1,76 e a média (81,77 °C) fica 5,27 °C acima da mediana (76,50 °C) — numa distribuição simétrica as duas coincidiriam. Três quartos das leituras estão até 96,02 °C, mas o máximo chega a 273,60 °C.
- **Cauda longa à direita.** 95% das leituras estão até 132,24 °C, e ainda assim a distribuição se estende por mais 141 °C acima desse ponto. A curtose em excesso é de 4,90, bem acima do zero esperado para uma normal, o que confirma o peso dos valores extremos.
- **Corte abrupto à esquerda.** A primeira barra começa em 27,69 °C e não há nada abaixo disso, porque a temperatura ambiente do ensaio funciona como piso físico. Uma normal não tem limite inferior, e essa barreira sozinha já inviabiliza o ajuste.

Há ainda um quinto elemento que os testes formais não separam, mas que o histograma revela: um **modo secundário** entre 206,0 °C e 212,1 °C (45 leituras), destacado de uma faixa esparsa entre 138 °C e 200 °C. A distribuição não é unimodal, o que é coerente com o fato de `temp` agregar sete `key_area` com regimes térmicos distintos — conforme o item a) da subseção seguinte, a amplitude por região vai de 28,37 °C em `Oven HMI` a 238,19 °C em `Mainback`. O que o gráfico mostra é uma mistura de distribuições, não uma distribuição única deformada.

**Ressalva metodológica.** Com n = 4.065, o Shapiro-Wilk rejeita H₀ mesmo diante de desvios pequenos, de modo que um p-valor baixo, isoladamente, não prova que o afastamento seja grande. É justamente o histograma que resolve essa dúvida: o desvio aqui é estrutural e visível a olho nu (assimetria, cauda longa, piso físico e bimodalidade), não um artefato do tamanho da amostra. Visual e teste apontam na mesma direção — **`temp` não segue distribuição normal** —, e métodos que pressupõem normalidade ficam desaconselhados para essa variável em escala global.

**e) Comparação entre a média e a mediana**

Em uma distribuição normal, por ser simétrica, a média e a mediana coincidem. Quanto maior a distância entre as duas medidas, maior a assimetria da distribuição e mais forte o indício de afastamento da normalidade. A comparação abaixo funciona, portanto, como uma verificação independente do resultado dos testes formais do item c).

O código usado para essa métrica, está no notebook em baixo da sessão da hipotese 4.

| Variável | Média | Mediana | Diferença (Média − Mediana) |
|:---|:---|:---|:---|
| `temp` | 81,77 °C | 76,50 °C | +5,27 °C |

A média fica 5,27 °C acima da mediana. Esse sinal, média maior que a mediana, é a assinatura de uma distribuição **assimétrica à direita**: os valores extremos elevados (a cauda que se estende até 273,60 °C, evidenciada no histograma do item d) puxam a média para cima, enquanto a mediana, por depender apenas da posição central dos dados, permanece resistente a esses extremos. Se a temperatura seguisse uma distribuição normal, as duas medidas seriam praticamente iguais.

Os valores, portanto, **reforçam os resultados dos testes estatísticos de normalidade**: a diferença entre média e mediana é coerente com a assimetria positiva (coeficiente de +1,76) já apontada, e converge com a rejeição de H₀ pelos três testes do item c). Tanto a evidência formal quanto as medidas de tendência central levam à mesma conclusão: `temp` não segue uma distribuição normal.

Embora a média ≈ mediana seja condição necessária para simetria, ela não bastaria sozinha para provar normalidade; no caso da temp, porém, a diferença é clara (+5,27 °C) e aponta na mesma direção dos testes formais.

**f) Diagnóstico comparativo por segmentação da variável**

Os itens c) a e) trataram `temp` como uma distribuição única. O roteiro, porém, pede **diversidade de diagnóstico comparativo**, e a base não a oferece pela via usual: como registrado na nota de abertura desta subseção, há uma só variável quantitativa contínua. A alternativa adotada aqui é obter essa diversidade **dentro da própria variável** — em vez de comparar `temp` com outras colunas, comparam-se recortes de `temp` por região do produto, por configuração de ensaio e por período da campanha de ensaios. Cada recorte é uma distribuição própria, submetida às mesmas hipóteses do item a), ao mesmo $\alpha = 0{,}05$ do item b) e aos mesmos três testes do item c).

A motivação não é apenas cumprir o roteiro. O item d) mostrou que a `temp` global é uma **mistura de sete regimes térmicos**, e uma mistura de normais pode ser fortemente não normal ainda que cada componente seja normal. Testar apenas o agregado não distingue as duas causas possíveis da rejeição:

- **(i)** cada subpopulação é, ela própria, não normal; ou
- **(ii)** as subpopulações são normais e a rejeição vem exclusivamente da mistura.

Segmentar responde a essa pergunta. Ao todo foram testados **75 recortes** de `temp`: 7 por região, 16 por configuração, 3 por período, 21 no cruzamento região × período e 28 no cruzamento região × modo de operação.

**f.1) Segmentação por região do produto (`key_area`)**

| `key_area` | n | W (Shapiro-Wilk) | p (SW) | K² (D'Agostino) | p (DP) | A² (Anderson-Darling) | Crítico 5% | Decisão |
|---|---:|---:|---:|---:|---:|---:|---:|:---|
| Mainback | 610 | 0,7496 | 2,33 × 10⁻²⁹ | 215,98 | 1,26 × 10⁻⁴⁷ | 47,90 | 0,751 | Rejeita $H_0$ |
| Coil Temps | 420 | 0,9539 | 3,54 × 10⁻¹⁰ | 8,18 | 1,67 × 10⁻² | 6,71 | 0,751 | Rejeita $H_0$ |
| Main Vent Sys | 288 | 0,9533 | 5,90 × 10⁻⁸ | 21,10 | 2,62 × 10⁻⁵ | 4,59 | 0,750 | Rejeita $H_0$ |
| IPC Cooling | 218 | 0,9319 | 1,59 × 10⁻⁸ | 14,62 | 6,68 × 10⁻⁴ | 5,45 | 0,749 | Rejeita $H_0$ |
| IPC Comp | 1.979 | 0,9815 | 2,40 × 10⁻¹⁵ | 61,76 | 3,89 × 10⁻¹⁴ | 11,24 | 0,752 | Rejeita $H_0$ |
| CT Knobs | 330 | 0,9418 | 4,24 × 10⁻¹⁰ | 29,65 | 3,64 × 10⁻⁷ | 6,71 | 0,750 | Rejeita $H_0$ |
| Oven HMI | 220 | 0,9561 | 2,87 × 10⁻⁶ | 21,88 | 1,77 × 10⁻⁵ | 2,31 | 0,749 | Rejeita $H_0$ |

<sup>Fonte: Elaborado pelos autores (2026). Referência global do item c): W = 0,8669; A² = 93,89.</sup>

As sete regiões rejeitam $H_0$, o que **descarta a hipótese (ii) pura**: a não normalidade não é apenas efeito da mistura. Mas a comparação entre segmentos, que o teste global não permitia fazer, revela duas coisas:

- **O grau de afastamento varia muito.** O W vai de 0,7496 (`Mainback`) a 0,9815 (`IPC Comp`) — o W global de 0,8669 não representa nenhuma região em particular, é um valor intermediário que não descreve nem a pior nem a melhor.
- **A mistura responde por boa parte do afastamento.** O A² global é 93,89; nenhuma região isolada passa de 47,90, seis das sete ficam abaixo de 11,3 e `Oven HMI` chega a 2,31 — cerca de 40 vezes menor que o agregado. Separar os regimes térmicos reduz muito a distância para a normal, sem eliminá-la.

**f.2) Segmentação por configuração de ensaio**

Cada run tem uma combinação de parâmetros de configuração. A tabela abaixo aplica o Shapiro-Wilk e o Anderson-Darling a cada categoria das seis configurações com mais de uma categoria efetiva.

| Configuração | Categoria | n | W | p (SW) | A² | Crítico 5% | Decisão |
|---|---|---:|---:|---:|---:|---:|:---|
| `run_case` | Broil C1 | 148 | 0,8253 | 5,33 × 10⁻¹² | 5,67 | 0,748 | Rejeita $H_0$ |
| `run_case` | Broil C2 | 1.531 | 0,8061 | 2,09 × 10⁻³⁹ | 71,47 | 0,752 | Rejeita $H_0$ |
| `run_case` | Broil Qualitative | 1.817 | 0,9344 | 1,44 × 10⁻²⁷ | 14,70 | 0,752 | Rejeita $H_0$ |
| `run_case` | Pyro | 569 | 0,7519 | 2,42 × 10⁻²⁸ | 28,45 | 0,751 | Rejeita $H_0$ |
| `housing` | Closed | 2.063 | 0,8332 | 4,73 × 10⁻⁴² | 63,74 | 0,752 | Rejeita $H_0$ |
| `housing` | Open | 1.328 | 0,9161 | 1,71 × 10⁻²⁶ | 17,04 | 0,752 | Rejeita $H_0$ |
| `housing` | Open - Updated | 674 | 0,8500 | 9,18 × 10⁻²⁵ | 19,84 | 0,751 | Rejeita $H_0$ |
| `blower_direction` | To back | 1.212 | 0,8938 | 4,18 × 10⁻²⁸ | 24,33 | 0,752 | Rejeita $H_0$ |
| `blower_direction` | To front | 2.853 | 0,8525 | 1,16 × 10⁻⁴⁵ | 72,73 | 0,752 | Rejeita $H_0$ |
| `deflector_hole` | Closed | 2.714 | 0,8351 | 1,47 × 10⁻⁴⁶ | 83,63 | 0,752 | Rejeita $H_0$ |
| `deflector_hole` | Open | 1.351 | 0,9195 | 3,11 × 10⁻²⁶ | 17,52 | 0,752 | Rejeita $H_0$ |
| `board_position` | Center | 3.843 | 0,8574 | 2,02 × 10⁻⁵⁰ | 96,40 | 0,752 | Rejeita $H_0$ |
| `board_position` | Right | 222 | 0,9529 | 1,17 × 10⁻⁶ | 2,31 | 0,749 | Rejeita $H_0$ |
| `material_coil_support` | Aluminium | 3.397 | 0,8774 | 9,81 × 10⁻⁴⁶ | 70,10 | 0,752 | Rejeita $H_0$ |
| `material_coil_support` | Aluminium Plate | 74 | 0,8439 | 2,40 × 10⁻⁷ | 2,42 | 0,744 | Rejeita $H_0$ |
| `material_coil_support` | Plastic | 594 | 0,8066 | 4,76 × 10⁻²⁶ | 24,93 | 0,751 | Rejeita $H_0$ |

<sup>Fonte: Elaborado pelos autores (2026).</sup>

As 16 categorias rejeitam $H_0$, e o resultado relevante aqui é **negativo**: segmentar por configuração **não reduz** o afastamento da normal. O W permanece na faixa de 0,81 a 0,95, em torno do valor global de 0,8669, e o A² de `board_position = Center` (96,40) chega a superar o do conjunto completo (93,89). A explicação é estrutural: configuração é propriedade do *run*, não do ponto de medição — cada fatia por configuração continua contendo as sete regiões térmicas e, portanto, continua sendo uma mistura. O contraste com o item f.1 é o achado: **a fonte dominante da não normalidade é espacial (a região), não operacional (a configuração)**.

Vale registrar o caso extremo: `run_case = Pyro` tem o pior W da tabela (0,7519), com assimetria de +3,06 e curtose em excesso de +15,40. É coerente com o comportamento descrito no tratamento de outliers da Seção 4.2.2 — no modo de autolimpeza as *coils* operam muito mais frias que nos modos Broil, o que acentua a bimodalidade dentro da fatia.

**f.3) Segmentação por período da campanha de ensaios**

A base não tem coluna de data; o que existe é a ordem de execução codificada em `run_id` (Run 1 a Run 75, com lacunas, totalizando 56 runs). "Período", aqui, significa **posição na campanha**, não tempo de calendário. Os runs foram ordenados e divididos em três terços.

| Período | Runs | n | W | p (SW) | A² | Crítico 5% | Assimetria | Média (°C) | Decisão |
|---|---|---:|---:|---:|---:|---:|---:|---:|:---|
| P1 | Run 1 – Run 19 (17 runs) | 1.351 | 0,9195 | 3,11 × 10⁻²⁶ | 17,52 | 0,752 | +1,27 | 83,79 | Rejeita $H_0$ |
| P2 | Run 20 – Run 35 (16 runs) | 1.227 | 0,8641 | 2,62 × 10⁻³¹ | 30,73 | 0,752 | +1,67 | 84,43 | Rejeita $H_0$ |
| P3 | Run 38 – Run 75 (16 runs) | 1.487 | 0,7989 | 1,83 × 10⁻³⁹ | 59,34 | 0,752 | +2,29 | 77,75 | Rejeita $H_0$ |

<sup>Fonte: Elaborado pelos autores (2026).</sup>

Os três períodos rejeitam $H_0$, mas há uma **tendência monotônica** que nenhum outro corte revelou: o afastamento da normal **cresce ao longo da campanha** (W cai de 0,9195 para 0,7989; A² sobe de 17,52 para 59,34; a assimetria vai de +1,27 a +2,29). A leitura mais provável é de cobertura, não de deterioração do ensaio: os runs finais introduzem configurações e condições mais severas — o máximo global de 273,60 °C, por exemplo, só aparece em P3 —, ampliando a cauda direita. O ponto é retomado no item f) da subseção de escalonamento, porque tem consequência direta sobre a escolha dos parâmetros de normalização.

**f.4) Cruzamentos: região × período e região × modo de operação**

Os três cortes anteriores são unidimensionais e cada um deixa a mistura parcialmente intacta. Cruzar região com condição de ensaio isola ao mesmo tempo o regime térmico e o regime de operação — é o recorte mais próximo de "uma distribuição, um mecanismo".

*Região × período (21 segmentos)*

| Segmento | n | W | p (SW) | p (DP) | A² | Crítico 5% | Decisão |
|---|---:|---:|---:|---:|---:|---:|:---|
| Oven HMI × P1 | 76 | 0,9695 | 0,0644 | 0,0769 | 0,542 | 0,744 | **Não rejeita $H_0$** |
| Oven HMI × P2 | 64 | 0,9793 | 0,3578 | 0,4564 | 0,495 | 0,743 | **Não rejeita $H_0$** |
| Oven HMI × P3 | 80 | 0,8435 | 9,88 × 10⁻⁸ | 1,04 × 10⁻⁶ | 4,559 | 0,745 | Rejeita $H_0$ |
| Main Vent Sys × P1 | 103 | 0,9697 | 0,0183 | 0,6677 | 0,845 | 0,746 | Rejeita $H_0$ (SW e AD) |
| Coil Temps × P1 | 124 | 0,9636 | 0,0020 | 0,5864 | 1,858 | 0,747 | Rejeita $H_0$ (SW e AD) |
| Mainback × P2 | 186 | 0,7184 | 1,66 × 10⁻¹⁵ | 4,72 × 10⁻²⁶ | 16,828 | 0,749 | Rejeita $H_0$ |

<sup>Fonte: Elaborado pelos autores (2026). Recorte dos segmentos que sustentam a leitura; os 21 estão no notebook.</sup>

O contraste dentro de `Oven HMI` é o resultado mais informativo do item: a mesma região passa de **compatível com a normal** em P1 e P2 para **rejeição inequívoca** em P3 (p = 9,88 × 10⁻⁸), com a assimetria virando de +0,59 para −1,47. Não é a região que mudou de natureza: é a campanha que, no terço final, passou a incluir condições que deslocam a cauda esquerda dessa região.

*Região × modo de operação (`run_case`, 28 segmentos)*

Oito dos 28 segmentos não rejeitam $H_0$ em **nenhum** dos três testes:

| Segmento | n | W | p (SW) | p (DP) | A² | Crítico 5% |
|---|---:|---:|---:|---:|---:|---:|
| Coil Temps × Pyro | 52 | 0,9723 | 0,2641 | 0,2694 | 0,370 | 0,741 |
| Main Vent Sys × Pyro | 44 | 0,9690 | 0,2799 | 0,3151 | 0,405 | 0,739 |
| IPC Cooling × Pyro | 30 | 0,9449 | 0,1235 | 0,5050 | 0,431 | 0,732 |
| IPC Comp × Broil C1 | 72 | 0,9701 | 0,0845 | 0,3807 | 0,649 | 0,744 |
| CT Knobs × Broil C1 | 12 | 0,8912 | 0,1221 | 0,3294 | 0,527 | 0,698 |
| Main Vent Sys × Broil C1 | 10 | 0,8766 | 0,1192 | 0,4742 | 0,545 | 0,685 |
| IPC Cooling × Broil C1 | 8 | 0,8622 | 0,1264 | 0,2464 | 0,477 | 0,666 |
| Oven HMI × Broil C1 | 8 | 0,8892 | 0,2301 | 0,6540 | 0,520 | 0,666 |

<sup>Fonte: Elaborado pelos autores (2026).</sup>

**Ressalva de poder estatístico.** Cinco desses oito segmentos têm n < 50 — `Broil C1` tem apenas 148 linhas no total, distribuídas entre sete regiões. Com amostras desse tamanho o teste tem pouco poder, e "não rejeitar" reflete tanto ausência de evidência contra a normalidade quanto incapacidade de detectá-la. Os casos que sustentam conclusão são os de amostra maior: `Oven HMI × P1` (n = 76), `IPC Comp × Broil C1` (n = 72), `Oven HMI × P2` (n = 64), `Coil Temps × Pyro` (n = 52) e `Main Vent Sys × Pyro` (n = 44).

**Ressalva de multiplicidade.** Foram 75 testes ao nível de 5%; se $H_0$ fosse verdadeira em todos, esperar-se-iam cerca de 3,75 rejeições apenas por acaso. Com correção de Bonferroni ($\alpha_{ajustado} = 0{,}05 / 75 = 6{,}67 \times 10^{-4}$), 17 dos 75 segmentos deixariam de rejeitar pelo Shapiro-Wilk, contra 10 no critério não corrigido — entrariam no grupo casos como `Coil Temps × P1` (p = 0,0020) e `Main Vent Sys × P1` (p = 0,0183). A correção, portanto, **reforça** a leitura desta subseção em vez de enfraquecê-la: quanto mais rigoroso o critério, mais segmentos sobrevivem como compatíveis com a normal. A conclusão global do item c) não se altera, porque lá os p-valores são da ordem de 10⁻⁵⁰, muitas ordens de grandeza abaixo de qualquer limiar corrigido.

**Síntese do diagnóstico comparativo**

| Nível de recorte | Segmentos | Rejeitam $H_0$ nos 3 testes | Faixa de W | Leitura |
|---|---:|---:|---|---|
| Global (item c) | 1 | 1 | 0,8669 | Não normal |
| Região | 7 | 7 | 0,7496 – 0,9815 | Não normal em toda parte, com grau muito desigual |
| Configuração | 16 | 16 | 0,8061 – 0,9529 | Não normal; segmentar por configuração não ajuda |
| Período | 3 | 3 | 0,7989 – 0,9195 | Não normal; afastamento cresce ao longo da campanha |
| Região × período | 21 | 15 | 0,7184 – 0,9793 | 2 segmentos compatíveis com a normal |
| Região × modo | 28 | 15 | 0,6979 – 0,9723 | 8 segmentos compatíveis com a normal |
| **Total** | **75** | **56** | — | **10 segmentos sem rejeição em nenhum dos 3 testes** |

<sup>Fonte: Elaborado pelos autores (2026).</sup>

A resposta à pergunta formulada no início do item é **"as duas causas, em proporções diferentes"**: cada região é individualmente não normal (causa i), mas a mistura amplifica bastante o afastamento (causa ii) — o A² cai de 93,89 no agregado para no máximo 47,90 em qualquer região isolada e para 2,31 em `Oven HMI`. E, quando se fixam simultaneamente região e condição de ensaio, a não normalidade deixa de ser universal: em 10 dos 75 recortes nenhum dos três testes rejeita $H_0$.

**Consequências para o projeto**

1. **Confirma a decisão de modelar por `key_area`.** A variação de W entre regiões (0,7496 a 0,9815) mostra que as sete regiões não são realizações da mesma distribuição, que é exatamente a premissa do argumento 4 do item a) da subseção de escalonamento.
2. **Confirma o Min-Max no lugar do Z-score.** A rejeição não é marginal em nenhuma região: mesmo a melhor delas (`IPC Comp`, W = 0,9815) rejeita com p = 2,40 × 10⁻¹⁵. Não há região em que a leitura "em número de desvios-padrão" do Z-score seja estatisticamente confortável sobre a variável bruta.
3. **Segmentar por configuração não substitui segmentar por região.** O item f.2 mostra que a configuração isolada não reduz o afastamento; usá-la como chave de escalonamento seria trocar uma mistura por outra equivalente.
4. **Abre espaço para métodos paramétricos em escopo restrito.** Nas células região × modo com amostra suficiente e sem rejeição (`Coil Temps × Pyro`, `Main Vent Sys × Pyro`, `IPC Comp × Broil C1`), técnicas que pressupõem normalidade — intervalos de confiança de regressão, cartas de controle — passam a ser defensáveis *dentro daquele escopo*, o que não vale para a variável global.
5. **Alerta sobre o período.** A tendência do item f.3 indica que os runs finais ampliam a faixa observada. Isso é tratado como risco operacional no item f) da subseção seguinte.

**Código utilizado (Python):**

```python
import numpy as np
import pandas as pd
from scipy import stats

ALPHA = 0.05


def testar_normalidade(serie, rotulo):
    """Aplica os tres testes do item c) a um segmento de temp."""
    s = serie.dropna()
    if len(s) < 8:                       # n minimo exigido pelo Shapiro-Wilk
        return None
    w, p_sw = stats.shapiro(s)
    k2, p_dp = stats.normaltest(s)
    ad = stats.anderson(s, dist='norm')
    critico_5 = ad.critical_values[2]    # indice 2 = nivel de 5%
    return {
        'segmento': rotulo, 'n': len(s), 'W': w, 'p_sw': p_sw,
        'K2': k2, 'p_dp': p_dp, 'A2': ad.statistic, 'critico_5': critico_5,
        # so conta como "nao rejeita" quando os tres testes concordam
        'nao_rejeita': (p_sw >= ALPHA) and (p_dp >= ALPHA)
                       and (ad.statistic <= critico_5),
    }


# Periodo = posicao na campanha (a base nao tem data): terco da ordem de execucao.
df['run_num'] = df['run_id'].str.extract(r'Run\s*(\d+)').astype(float)
tercos = np.array_split(np.array(sorted(df['run_num'].dropna().unique())), 3)
df['periodo'] = np.select(
    [df['run_num'].isin(tercos[0]), df['run_num'].isin(tercos[1])],
    ['P1', 'P2'], default='P3')

CONFIGS = ['run_case', 'housing', 'blower_direction', 'deflector_hole',
           'board_position', 'material_coil_support']

resultados = []
for area, g in df.groupby('key_area'):                        # f.1 — 7 segmentos
    resultados.append(testar_normalidade(g['temp'], area))
for col in CONFIGS:                                           # f.2 — 16 segmentos
    for cat, g in df.groupby(col):
        resultados.append(testar_normalidade(g['temp'], f'{col}={cat}'))
for periodo, g in df.groupby('periodo'):                      # f.3 — 3 segmentos
    resultados.append(testar_normalidade(g['temp'], periodo))
for chave in ['periodo', 'run_case']:                         # f.4 — 21 + 28 segmentos
    for (area, valor), g in df.groupby(['key_area', chave]):
        resultados.append(testar_normalidade(g['temp'], f'{area} x {valor}'))

tabela = pd.DataFrame([r for r in resultados if r is not None])
print(f"{len(tabela)} segmentos testados | "
      f"{tabela['nao_rejeita'].sum()} sem rejeicao nos tres testes")
print(tabela[tabela['nao_rejeita']].to_string(index=False))
```


#### Escalonamento (Padronização ou normalização) da variável quantitativa

Assim como no teste de normalidade, esta subseção aplica o escalonamento apenas a `temp`, pela mesma razão registrada na nota da subseção anterior: é a única variável quantitativa contínua do dataset (`tc_number` é identificador, `active_limit` é parâmetro de engenharia com placeholders sem significado físico).

**a) Tipo de Escalonamento e Justificativa**

**Método escolhido: Min-Max Scaling (normalização para o intervalo [0, 1]), aplicado
por `key_area`, e não sobre o conjunto global.**

A escolha se apoia em quatro argumentos:

**1. `temp` é uma variável fisicamente limitada.** A temperatura medida nos termopares
possui limite inferior natural (temperatura ambiente do ensaio) e limite superior
determinado pelas propriedades dos materiais e pelos limites normativos (`active_limit`).
Variáveis com fronteiras físicas conhecidas são adequadamente representadas por uma
normalização que preserva esse caráter delimitado, mapeando os valores para um
intervalo fechado [0, 1].

**2. A distribuição não é normal.** O conjunto completo apresenta assimetria
(skewness) de **+1,76**, com cauda longa à direita. A padronização Z-score
(`StandardScaler`) pressupõe distribuição aproximadamente simétrica para que os
valores resultantes tenham interpretação estatística clara (desvios em torno da média).
Com assimetria dessa magnitude, o Z-score produziria valores cuja leitura em "número
de desvios-padrão" é enganosa.

**3. As escalas variam drasticamente entre regiões do produto.** A amplitude de
`temp` vai de **28,37 °C** em `Oven HMI` a **238,19 °C** em `Mainback` — diferença de
~8,4×. O coeficiente de variação vai de 0,068 (`Oven HMI`) a 0,590 (`Mainback`) —
diferença de ~8,7×. Um escalonamento global comprimiria as regiões de baixa variância
(`Oven HMI`, `CT Knobs`) para uma faixa quase constante, eliminando a capacidade do
modelo de discriminar variações relevantes nessas áreas. O escalonamento por
`key_area` preserva o poder discriminativo dentro de cada região.

**4. Coerência com a arquitetura de modelagem adotada.** Como a decisão do projeto é, até a sprint atual,
construir um modelo por `key_area` (regimes de transferência de calor distintos entre
mainback, coils, sistemas de ventilação, IPC e HMI), escalonar por região mantém
consistência entre a etapa de preparação dos dados e a etapa de modelagem.

**b) Dados Estatísticos Utilizados para análise da variável**

Os dados foram analisados via DataFrame em Pandas, a partir do dataset fornecido pelo parceiro. A análise estatística global (sem segmentação por `key_area`) registrou as observações a seguir.

**Conjunto de dados completo (`temp`, n = 4.065)**
 
| Estatística | Valor |
|---|---|
| Valor mínimo | 27,69 °C |
| Valor máximo | 273,60 °C |
| Média | 81,7745 °C |
| Desvio padrão populacional (ddof = 0) | 33,2792 °C |
| Amplitude | 245,91 °C |
| Assimetria (skewness) | +1,763 |

Para a análise da variável-alvo `temp`, a decisão de segmentar o estudo dos dados por áreas, seguindo a própria arquitetura da tabela (`key_area`), faz com que os dados estatísticos sejam calculados separadamente para cada região. Dessa forma, foram coletados os dados de temperatura via DataFrame em funções nativas da biblioteca Pandas na ordem: Mínimo (°C), Máximo (°C), Média (°C), Desvio populacional (°C), Amplitude (°C), Coeficiente de Variação (CV).

**Parâmetros por `key_area` — base efetiva do escalonamento**

| key_area | n | Mínimo (°C) | Máximo (°C) | Média (°C) | Desvio pop. (°C) | Amplitude (°C) | CV |
|---|---|---|---|---|---|---|---|
| Mainback | 610 | 35,41 | 273,60 | 80,6997 | 47,6323 | 238,19 | 0,590 |
| Coil Temps | 420 | 40,80 | 234,60 | 126,9350 | 44,9730 | 193,80 | 0,354 |
| Main Vent Sys | 288 | 41,56 | 135,00 | 80,5051 | 21,4384 | 93,44 | 0,266 |
| IPC Cooling | 218 | 27,69 | 114,94 | 57,3842 | 18,6344 | 87,25 | 0,325 |
| IPC Comp | 1.979 | 45,58 | 129,63 | 83,4398 | 17,0215 | 84,05 | 0,204 |
| CT Knobs | 330 | 34,34 | 73,42 | 49,3033 | 7,6785 | 39,08 | 0,156 |
| Oven HMI | 220 | 43,64 | 72,01 | 58,0965 | 3,9472 | 28,37 | 0,068 |

A implementação do código necessário para obtenção desses dados está em: 'notebooks\expl_preprocessamenro_hipote.ipynb'

**c) Equações do Escalonamento**

O método adotado é o **Min-Max Scaling**, aplicado independentemente dentro de cada `key_area`.

**Equação de normalização**

Para cada observação $i$ pertencente à região $k$:

$$
temp\_scaled_{i} = \frac{temp_{i} - \min(temp_{k})}{\max(temp_{k}) - \min(temp_{k})}
$$

onde:

- $temp_{i}$ — temperatura medida na observação $i$, em °C;
- $\min(temp_{k})$ — menor temperatura observada na `key_area` $k$;
- $\max(temp_{k})$ — maior temperatura observada na `key_area` $k$;
- $temp\_scaled_{i} \in [0, 1]$ — valor normalizado.

**Equação de transformação inversa**

Como `temp` é a variável-alvo, caso as previsões do modelo retornem em escala normalizada e precisem ser convertidas de volta a graus Celsius para avaliação do KPI de erro do projeto:

$$
temp_{i} = temp\_scaled_{i} \times \left[\max(temp_{k}) - \min(temp_{k})\right] + \min(temp_{k})
$$
**d) Equações para Estatística Descritiva das 'key_area'**

As estatísticas descritivas não foram calculadas apenas para caracterizar o conjunto: elas são os parâmetros operacionais do escalonamento. Cada `key_area` recebe seu próprio conjunto de valores, e é essa separação que sustenta a decisão de normalizar por região. As três equações a seguir são aplicadas independentemente a cada um dos sete subconjuntos de `temp`.


**Média aritmética**

Estabelece o centro da distribuição térmica de cada região e serve de referência para o cálculo da dispersão.

$$
\bar{x}_{k} = \frac{1}{n_{k}} \sum_{i=1}^{n_{k}} x_{i}
$$

onde $k$ identifica a `key_area` e $n_{k}$ o número de observações naquela região.

**Desvio padrão populacional (ddof = 0)**

Adotou-se o denominador $n$, e não $n-1$, porque o conjunto analisado corresponde à totalidade das simulações disponibilizadas pela Whirlpool — não a uma amostra extraída de uma população maior. A correção de Bessel seria inadequada nesse contexto.

$$
\sigma_{k} = \sqrt{\frac{1}{n_{k}} \sum_{i=1}^{n_{k}} \left(x_{i} - \bar{x}_{k}\right)^{2}}
$$

**Coeficiente de variação**

Como as regiões operam em patamares térmicos distintos, o desvio absoluto em °C não é comparável entre elas. O CV normaliza a dispersão pela média, permitindo comparação direta.

$$
CV_{k} = \frac{\sigma_{k}}{\bar{x}_{k}}
$$


**Aplicação por segmento**

A tabela consolida os termos de cada equação para as sete regiões, incluindo a soma dos valores ($\sum x_i$) e a soma dos quadrados dos desvios ($\sum (x_i - \bar{x})^2$), que são os agregados intermediários efetivamente calculados.

| `key_area` | $n_k$ | $\sum x_i$ | $\bar{x}_k$ (°C) | $\sum (x_i - \bar{x}_k)^2$ | $\sigma_k$ (°C) | $CV_k$ |
|---|---|---|---|---|---|---|
| Mainback | 610 | 49.226,79 | 80,6997 | 1.383.990,55 | 47,6323 | 0,5902 |
| Coil Temps | 420 | 53.312,68 | 126,9350 | 849.478,95 | 44,9730 | 0,3543 |
| Main Vent Sys | 288 | 23.185,47 | 80,5051 | 132.366,31 | 21,4384 | 0,2663 |
| IPC Cooling | 218 | 12.509,75 | 57,3842 | 75.698,65 | 18,6344 | 0,3247 |
| IPC Comp | 1.979 | 165.127,41 | 83,4398 | 573.381,78 | 17,0215 | 0,2040 |
| CT Knobs | 330 | 16.270,10 | 49,3033 | 19.456,37 | 7,6785 | 0,1557 |
| Oven HMI | 220 | 12.781,23 | 58,0965 | 3.427,62 | 3,9472 | 0,0679 |


**Verificação numérica — dois casos de contraste**

Para tornar explícito o cálculo, aplicam-se as equações às duas regiões que delimitam os extremos de dispersão do conjunto.

*Região de maior dispersão — `Mainback`*

$$
\bar{x} = \frac{49.226{,}79}{610} = 80{,}6997 \ ^\circ\text{C}
$$

$$
\sigma = \sqrt{\frac{1.383.990{,}55}{610}} = \sqrt{2.268{,}84} = 47{,}6323 \ ^\circ\text{C}
$$

$$
CV = \frac{47{,}6323}{80{,}6997} = 0{,}5902
$$

*Região de menor dispersão — `Oven HMI`*

$$
\bar{x} = \frac{12.781{,}23}{220} = 58{,}0965 \ ^\circ\text{C}
$$

$$
\sigma = \sqrt{\frac{3.427{,}62}{220}} = \sqrt{15{,}58} = 3{,}9472 \ ^\circ\text{C}
$$

$$
CV = \frac{3{,}9472}{58{,}0965} = 0{,}0679
$$

O contraste é o argumento central da segmentação: `Mainback` apresenta dispersão relativa **8,7 vezes maior** que `Oven HMI`. Sob um escalonamento global, essa diferença desapareceria — variações de poucos décimos de grau em `Oven HMI`, estatisticamente relevantes naquele contexto, seriam indistinguíveis de ruído.


**Aplicação do Min-Max por segmento**

Definidos os parâmetros de mínimo e máximo de cada região, a normalização segue:

$$
temp\_scaled_{i} = \frac{temp_{i} - \min(temp_{k})}{\max(temp_{k}) - \min(temp_{k})}
$$

A tabela abaixo demonstra a transformação com uma observação real de cada `key_area`, selecionada próxima à mediana da respectiva distribuição.

| `key_area` | Observação de referência | $temp_i$ (°C) | $\min_k$ | $\max_k$ | Cálculo | $temp\_scaled_i$ |
|---|---|---|---|---|---|---|
| CT Knobs | Run 26 · TC 73 — *Ambient Between Left Encoders* | 47,14 | 34,34 | 73,42 | $(47{,}14 - 34{,}34)/39{,}08$ | 0,3275 |
| Coil Temps | Run 19 · TC 16 — *Aluminium Plate FL* | 123,79 | 40,80 | 234,60 | $(123{,}79 - 40{,}80)/193{,}80$ | 0,4282 |
| IPC Comp | Run 27 · TC 38 — *IGBT 3* | 81,53 | 45,58 | 129,63 | $(81{,}53 - 45{,}58)/84{,}05$ | 0,4277 |
| IPC Cooling | Run 75 · TC 30 — *IPC Housing Outlet* | 58,01 | 27,69 | 114,94 | $(58{,}01 - 27{,}69)/87{,}25$ | 0,3475 |
| Main Vent Sys | Run 1 · TC 22 — *AC Blower HES Connector* | 85,63 | 41,56 | 135,00 | $(85{,}63 - 41{,}56)/93{,}44$ | 0,4716 |
| Mainback | Run 5 · TC 9 — *Ambient Below Terminal Block* | 71,08 | 35,41 | 273,60 | $(71{,}08 - 35{,}41)/238{,}19$ | 0,1498 |
| Oven HMI | Run 4 · TC 69 — *A33/Bellatrix Thermistor* | 58,39 | 43,64 | 72,01 | $(58{,}39 - 43{,}64)/28{,}37$ | 0,5199 |

Duas leituras se destacam. Em `Oven HMI`, uma temperatura de 58,39 °C — praticamente a média da região — resulta em 0,5199, ocupando o centro do intervalo normalizado, como esperado. Em `Mainback`, uma temperatura de 71,08 °C, também próxima da média regional (80,70 °C), resulta em apenas 0,1498, deslocada para o extremo inferior. A discrepância é consequência direta da assimetria positiva daquela região (*skewness* = +1,83, valor pontual — ver nota abaixo) e do máximo de 273,60 °C, que estende o denominador. É essa característica que motiva a ressalva registrada sobre a sensibilidade do Min-Max a valores extremos em `Mainback`, e a recomendação de validar tal máximo junto à Whirlpool antes da consolidação definitiva dos parâmetros.

*Nota sobre rastreabilidade:* o valor de +1,83 citado acima é pontual e não aparece nas tabelas de parâmetros por `key_area` (que trazem apenas mínimo, máximo, média, desvio padrão, amplitude e CV). O cálculo de assimetria e curtose para as sete regiões está implementado e executado no notebook (célula logo após a Seção 6 "Preparação dos dados estatísticos para escalonamento", que estende a tabela `estat_area` com as colunas `skewness` e `curtose_excesso`):

| `key_area` | Assimetria (skewness) | Curtose (excesso) |
|---|---:|---:|
| Mainback | +1,8333 | +3,0001 |
| Coil Temps | +0,3458 | −0,0645 |
| Main Vent Sys | −0,1533 | −0,7811 |
| IPC Cooling | +0,0099 | −0,7811 |
| IPC Comp | +0,4105 | −0,2982 |
| CT Knobs | +0,8095 | +0,0824 |
| Oven HMI | −0,4242 | +2,3256 |

---

**Transformação inversa**

Como `temp` é a variável-alvo, as predições retornam em escala normalizada. A avaliação do KPI de erro do projeto exige conversão de volta a graus Celsius:

$$
temp_{i} = temp\_scaled_{i} \times \left[\max(temp_{k}) - \min(temp_{k})\right] + \min(temp_{k})
$$

Verificação com o caso de `IPC Comp`:

$$
0{,}4277 \times 84{,}05 + 45{,}58 = 35{,}95 + 45{,}58 = 81{,}53 \ ^\circ\text{C} \quad 
$$

Os pares $(\min_k, \max_k)$ devem, portanto, ser persistidos junto ao modelo — sem eles, as predições não são interpretáveis em unidade física.

**e) Histograma da variável após o escalonamento**

O histograma abaixo apresenta `temp` depois da normalização Min-Max por `key_area` definida no item c). Gerado em [`notebooks/expl_preprocessamenro_hipote.ipynb`](../notebooks/expl_preprocessamenro_hipote.ipynb), Seção 5, a partir das mesmas 4.065 observações usadas na Figura 20.

<div align="center">
  <sub>Figura 21 — Distribuição de temp após o escalonamento Min-Max por key_area (n = 4.065)</sub><br>
  <img src="../assets/graficos/hist_temp_scaled.png" alt="Histograma da temperatura normalizada por key_area, distribuída ao longo de todo o intervalo de 0 a 1, sem cauda longa" width="80%"><br>
  <sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>
</div>

**Comparação com o histograma antes do escalonamento (Figura 20)**

| Medida | Antes (°C) | Depois (adimensional) |
|:---|---:|---:|
| Mínimo | 27,69 | 0,0000 |
| Máximo | 273,60 | 1,0000 |
| Média | 81,7745 | 0,4002 |
| Mediana | 76,5000 | 0,3830 |
| Assimetria | +1,7630 | +0,2831 |
| Curtose (excesso) | +4,8996 | −0,4546 |
| n | 4.065 | 4.065 |

Antes do escalonamento, o histograma de `temp` (Figura 20, descrito em detalhe no item d) da subseção anterior) é assimétrico à direita, com cauda longa até 273,60 °C, corte físico abrupto em 27,69 °C e um modo secundário entre 206,0 °C e 212,1 °C — traços consistentes com a mistura de sete regimes térmicos regionais (`key_area`) numa única variável.

Depois do escalonamento, a variável ocupa o intervalo [0, 1], com mínimo e máximo exatos de 0,0 e 1,0 em cada uma das sete `key_area`. A Figura 21 mostra uma distribuição mais espalhada ao longo do intervalo, sem a cauda longa da Figura 20: média (0,4002) e mediana (0,3830) se deslocam para perto do centro, a assimetria cai de +1,763 para +0,283 (mantendo média > mediana) e a curtose em excesso passa de +4,90 para −0,45, caudas mais curtas que as de uma normal. O modo secundário de ~209 °C deixa de ser discernível como pico isolado. Origem do efeito: a assimetria de `Mainback` (skewness = +1,83, item c) empurra a maior parte de suas leituras para perto de 0 no intervalo normalizado — esse encolhimento, região por região, dilui o modo secundário e encurta a cauda direita.

**O que muda.** Além da escala do eixo X (°C → [0, 1]), a forma da distribuição também muda, e esse é o ponto central da comparação: assimetria de +1,76 para +0,28, curtose em excesso de +4,90 para −0,45, cauda longa e modo secundário (Figura 20) desaparecem. A correlação de Pearson entre a série original e a escalonada é de apenas 0,688 — baixa para duas versões da mesma variável, o que confirma que a transformação reestrutura os valores entre regiões, não só muda a régua.

**Por que muda.** O escalonamento é **sete** transformações lineares independentes, uma por `key_area`, cada uma com seu próprio mínimo e máximo (item b). Cada região é esticada para o intervalo [0, 1] separadamente, o que elimina por construção a diferença de patamar térmico entre regiões — a causa da cauda longa original. As leituras mais quentes de `Mainback` (até 273,60 °C) e as mais frias de `Oven HMI` (a partir de 43,64 °C) passam a ocupar a mesma posição relativa, 1,0 e 0,0.

Em contraste, um Min-Max **global** preservaria a forma exatamente (assimetria e curtose permaneceriam em +1,7630 e +4,8996, correlação de 1,000000), alterando só a escala do eixo. A mudança de forma na Figura 21 é, portanto, consequência esperada de segmentar por região (item a), não um erro de execução.

**Relação com os testes de normalidade.** Os três testes aplicados aos dados originais — Shapiro-Wilk (W = 0,8669; p = 2,72 × 10⁻⁵⁰), D'Agostino-Pearson (K² = 1.484,31; p ≈ 0) e Anderson-Darling (A² = 93,89, acima do crítico de 0,752 a 5%) — rejeitam H₀, o que converge com a Figura 20 (sem formato de sino, assimétrica, cauda longa, corte à esquerda). Nenhum teste foi recalculado sobre `temp_scaled`; a comparação pós-escalonamento usa só os indicadores descritivos acima. A queda de assimetria e curtose sugere uma distribuição menos distante de uma normal, mas +0,283 ainda é diferente de zero e a curtose negativa já é incompatível com a de uma normal — não há base para afirmar que o escalonamento "tornou `temp` normal", só que ficou menos assimétrica e com caudas mais curtas. Confirmar normalidade exigiria repetir o teste sobre `temp_scaled`.

**O que permanece.** A ordenação **dentro de cada** `key_area` é preservada — a transformação é monotônica crescente por região. Não há perda de observações (4.065 antes e depois) nem valores fora do intervalo previsto. A distribuição continua não normal, só por outros motivos.

**f) Alerta de produção — congelamento dos parâmetros de mínimo e máximo**

O Min-Max por `key_area` (item a) tem uma propriedade que os itens anteriores não tornam explícita: **cada par $(\min_k, \max_k)$ é calculado sobre o conjunto de treino e precisa ser reutilizado, sem recálculo, sobre qualquer dado novo** — validação, teste e, mais adiante, produção. Diferente do que ocorre num pipeline em que o escalonamento é só um passo de conveniência, aqui os mínimos e máximos são também os parâmetros que definem a régua de cada região: recalculá-los sobre um conjunto diferente desloca essa régua e invalida a comparação entre o dado novo e o que o modelo aprendeu.

O risco é concreto neste dataset porque, como o item f.3 da subseção de normalidade mostrou, a distribuição de `temp` **não é estável ao longo da campanha de ensaios**: o terço final introduz condições mais severas, e é justamente lá que aparece o máximo global de 273,60 °C. Um split temporal — treinar com os runs iniciais e validar com os finais, prática comum quando os dados têm ordem de coleta — é o cenário em que o efeito do congelamento fica mais visível.

**Simulação do efeito.** Os 56 runs foram ordenados por `run_id` e divididos em treino (Run 1 a Run 35, 33 runs, 2.578 observações) e teste (Run 38 a Run 75, 16 runs, 1.487 observações), reproduzindo os mesmos terços do item f.3. Os parâmetros $(\min_k, \max_k)$ foram calculados **apenas sobre o treino** e depois comparados aos parâmetros que o item b) já reporta, calculados sobre a base completa:

| `key_area` | Mín. treino (°C) | Mín. total (°C) | Máx. treino (°C) | Máx. total (°C) | Amplitude treino (°C) | Amplitude total (°C) |
|---|---:|---:|---:|---:|---:|---:|
| Mainback | 36,07 | 35,41 | 251,09 | 273,60 | 215,02 | 238,19 |
| Coil Temps | 43,95 | 40,80 | 234,60 | 234,60 | 190,65 | 193,80 |
| Main Vent Sys | 42,29 | 41,56 | 126,70 | 135,00 | 84,41 | 93,44 |
| IPC Comp | 48,24 | 45,58 | 129,63 | 129,63 | 81,39 | 84,05 |
| IPC Cooling | 27,69 | 27,69 | 114,94 | 114,94 | 87,25 | 87,25 |
| CT Knobs | 36,99 | 34,34 | 73,42 | 73,42 | 36,43 | 39,08 |
| Oven HMI | 49,77 | 43,64 | 72,01 | 72,01 | 22,24 | 28,37 |

<sup>Fonte: Elaborado pelos autores (2026). "Total" reproduz a tabela do item b); "treino" usa apenas Run 1–35.</sup>

Em cinco das sete regiões o **máximo** do treino já coincide com o da base inteira — os valores mais extremos aparecem cedo na campanha —, mas o **mínimo** do treino é sistematicamente mais alto que o real (a diferença chega a 6,13 °C em `Oven HMI`). `Mainback` é o caso mais grave: o máximo do treino (251,09 °C) fica 22,51 °C abaixo do máximo verdadeiro (273,60 °C), porque a leitura de 273,60 °C só ocorre em runs do terço final.

Aplicando esses parâmetros do treino à fórmula do item c) sobre as observações de teste:

| `key_area` | n (teste) | Abaixo de 0 | Acima de 1 | % fora de [0, 1] | scaled mín. | scaled máx. |
|---|---:|---:|---:|---:|---:|---:|
| Oven HMI | 80 | 8 | 0 | 10,0% | −0,2756 | 0,7428 |
| Main Vent Sys | 100 | 2 | 3 | 5,0% | −0,0086 | 1,0983 |
| CT Knobs | 120 | 3 | 0 | 2,5% | −0,0727 | 0,8993 |
| Mainback | 219 | 2 | 3 | 2,3% | −0,0031 | 1,1047 |
| Coil Temps | 160 | 2 | 0 | 1,3% | −0,0165 | 0,9824 |
| IPC Comp | 728 | 4 | 0 | 0,5% | −0,0327 | 0,7109 |
| IPC Cooling | 80 | 0 | 0 | 0,0% | 0,0473 | 0,6866 |
| **Total** | **1.487** | **21** | **6** | **1,8%** | −0,2756 | 1,1047 |

<sup>Fonte: Elaborado pelos autores (2026).</sup>

Congelar os parâmetros no treino produz **27 observações (1,8% do conjunto de teste) fora do intervalo [0, 1]**, com `temp_scaled` chegando a −0,2756 em `Oven HMI` e a 1,1047 em `Mainback`. Isso não é um bug de implementação: é a consequência esperada e correta de aplicar, sobre dado novo, uma régua fixada no passado — o próprio objetivo do congelamento é permitir que o dado extrapole a régua quando for mais extremo do que tudo que o treino viu. O ponto do alerta é que essas 27 observações **precisam de uma decisão explícita de tratamento**, e não podem ser silenciosamente aceitas nem descartadas sem registro.

**Efeito de um recorte (clipping) em [0, 1].** Se as observações fora do intervalo forem forçadas para os extremos — prática comum para manter a saída de um `MinMaxScaler` compatível com o intervalo esperado pelo modelo —, o erro introduzido, traduzido de volta para °C pela equação inversa do item c), tem média de **2,10 °C** e máximo de **22,51 °C** (a leitura de 273,60 °C de `Mainback`, recortada para 1,0, passaria a representar 251,09 °C). Para a variável-alvo do projeto, esse é um erro sistemático que se soma ao erro do próprio modelo, e que o KPI de erro do projeto não distingue de erro de previsão a menos que seja documentado.

**Contraste com o vazamento (data leakage).** Se, em vez de congelar, os parâmetros forem recalculados sobre o conjunto de teste — ou, pior, sobre a base completa antes do split, erro mais comum na prática —, o mesmo dado de teste recebe valores de `temp_scaled` sistematicamente diferentes: a diferença média entre as duas versões é de 0,0276 (equivalente a 2,10 °C na régua do treino) e chega a 0,2756 em `Oven HMI`. Esse desvio não aparece como erro explícito — o pipeline roda sem falhar —, mas contamina a avaliação do modelo com informação que, num cenário real de produção, ainda não existiria no momento da previsão.

**Recomendações para a etapa de modelagem (Seção 4.3):**

1. **Persistir os sete pares $(\min_k, \max_k)$ junto ao artefato do modelo**, exatamente como o item c) já recomenda para a transformação inversa — não como metadado documental, mas como parte do contrato de inferência: o mesmo `key_area` sempre usa o mesmo par, em treino, validação e produção.
2. **Ajustar os parâmetros exclusivamente sobre o conjunto de treino**, nunca sobre validação, teste ou a base completa — o padrão `fit` (só treino) e `transform` (treino, validação, teste e produção) do próprio `MinMaxScaler` do scikit-learn já impõe essa separação quando usado corretamente por `key_area`.
3. **Monitorar em produção a fração de leituras que caem fora de [0, 1]** por região, com a tabela deste item como linha de base (0,0% a 10,0%, dependendo da região). Um aumento sustentado nessa fração é sinal de *drift*: a distribuição de temperatura real se afastando da distribuição observada no treino, o que este próprio anexo já demonstrou ser plausível (item f.3 da subseção de normalidade, sobre a tendência de a campanha ficar mais extrema ao longo do tempo).
4. **Decidir e documentar o tratamento de valores fora do intervalo antes da consolidação do pipeline** — recortar em [0, 1] (com o custo de erro sistemático quantificado acima), permitir extrapolação sem recorte, ou tratar como excedência de `active_limit` (Seção 4.2.3) — em vez de deixar essa escolha implícita no comportamento padrão da biblioteca utilizada.

**Código utilizado (Python):**

```python
import numpy as np
import pandas as pd

df['run_num'] = df['run_id'].str.extract(r'Run\s*(\d+)').astype(float)
runs = sorted(df['run_num'].dropna().unique())
tercos = np.array_split(np.array(runs), 3)          # mesmos tercos do item f.3
runs_treino = np.concatenate([tercos[0], tercos[1]])
runs_teste = tercos[2]

treino = df[df['run_num'].isin(runs_treino)]
teste = df[df['run_num'].isin(runs_teste)].copy()

# Parametros SOMENTE do treino - o congelamento em si.
parametros_treino = treino.groupby('key_area')['temp'].agg(minimo='min', maximo='max')

teste = teste.join(parametros_treino, on='key_area')
teste['temp_scaled'] = ((teste['temp'] - teste['minimo'])
                         / (teste['maximo'] - teste['minimo']))
teste['fora_do_intervalo'] = (teste['temp_scaled'] < 0) | (teste['temp_scaled'] > 1)

resumo = teste.groupby('key_area').agg(
    n=('temp', 'size'),
    fora=('fora_do_intervalo', 'sum'),
    pct_fora=('fora_do_intervalo', 'mean'),
    scaled_min=('temp_scaled', 'min'),
    scaled_max=('temp_scaled', 'max'),
)
resumo['pct_fora'] = (resumo['pct_fora'] * 100).round(1)
print(resumo.round(4).to_string())
print(f"\nTotal fora de [0,1]: {teste['fora_do_intervalo'].sum()} de {len(teste)} "
      f"({teste['fora_do_intervalo'].mean() * 100:.1f}%)")
```

**g) Tabelas Comparativas dos Dados**

O objetivo desta questão foi apresentar as variáveis quantitativas analisadas do conjunto de dados e exibir os 10 primeiros registros tanto dos dados originais quanto dos dados após escalonamento Min-Max.

Conforme a classificação das colunas apresentada na Seção 4.2.1, o conjunto `data/dataset_pre_processado.csv` possui uma única variável quantitativa efetiva: `temp`, a temperatura registrada pelo termopar ao final do ensaio, em °C. As demais colunas numéricas na origem não viraram variáveis quantitativas pelos seguintes motivos:

- `tc_number` tem `dtype` inteiro, mas é um identificador do sensor, não uma quantidade. Média, desvio-padrão e normalização não têm significado sobre um rótulo, por isso foi classificada como categórica.
- `active_limit` é expressa em °C, mas é um parâmetro de especificação de engenharia atribuído a cada termopar, não uma grandeza medida no experimento: seu valor é constante para um mesmo sensor em todas as execuções, funcionando como atributo do ponto de medição, não como observação. Além disso, a coluna carrega sujeira documentada na Seção 4.2.1 (o valor textual `Monitor (150 C)` e as 302 linhas com `active_limit = 1000`, placeholder numérico de "sem limite definido"), o que tornaria qualquer escalonamento dependente de um valor sem significado físico.
- Todas as demais colunas (`run_id`, `tc_name`, `key_area`, `reason`, `blower_direction`, `housing`, `board_position`, `run_case`, `losses`, `deflector_hole`, `material_coil_support`) são categóricas nominais.

Portanto, o escalonamento foi aplicado exclusivamente a `temp`.

Procedimento de preparação:

1. Padronizar os nomes das colunas (remover espaços no início e no fim).
2. Converter a variável para valor numérico, substituindo vírgula decimal por ponto, para garantir tipagem consistente independentemente da origem do arquivo.
3. Verificar registros inválidos (`NaN`). A coluna `temp` não apresentou valores ausentes: as 4.065 linhas do conjunto foram mantidas, sem descarte.
4. Aplicar o escalonamento Min-Max com o `MinMaxScaler`, que transforma linearmente a variável para o intervalo `[0,1]` segundo a fórmula `x' = (x - min) / (max - min)`.

---

#### Código utilizado

```python
from sklearn.preprocessing import MinMaxScaler
import pandas as pd

# padronizar nomes das colunas (remover espaços no início/fim)
df.columns = df.columns.str.strip()

# variável quantitativa analisada
variaveis = ['temp']

# garantir tipagem numérica (corrigindo eventual vírgula decimal)
for v in variaveis:
    df[v] = df[v].astype(str).str.replace(',', '.')
    df[v] = pd.to_numeric(df[v], errors='coerce')

# cópia limpa para não alterar o df original
df_limpo = df.dropna(subset=variaveis).copy()
df_limpo.reset_index(drop=True, inplace=True)

# Tabela 1 — dados originais
print("Tabela 1: Dados Originais")
print(df_limpo[['run_id', 'tc_name', 'key_area'] + variaveis].head(10))

# Escalonamento Min-Max
scaler = MinMaxScaler()
dados_escalonados_array = scaler.fit_transform(df_limpo[variaveis])

# novo dataframe com dados escalonados
df_scaled = pd.DataFrame(dados_escalonados_array, columns=variaveis)

# Tabela 2 — dados normalizados
print("\nTabela 2: Dados Normalizados")
print(df_scaled.head(10))

# limites usados pelo scaler
print("\nmin:", scaler.data_min_, "| max:", scaler.data_max_)
```

---

### Tabela 1: Dados Originais — 10 primeiros registros

As colunas `run_id`, `tc_name` e `key_area` são exibidas apenas como contexto de identificação do registro; a variável submetida ao escalonamento é `temp`.

| # | run_id | tc_name | key_area | temp (°C) |
|---|--------|---------|----------|-----------|
| 0 | Run 1 | Door Lock Motor Ambient 1/2" Below | Mainback | 99.35 |
| 1 | Run 1 | Door Lock Microswitch Body | Mainback | 114.72 |
| 2 | Run 1 | Convect Motor Winding | Mainback | 89.93 |
| 3 | Run 1 | Storage Drawer (Metal Above) | Mainback | 167.87 |
| 4 | Run 1 | L2, Wire, Power Cord | Mainback | 53.65 |
| 5 | Run 1 | Ambient Below Terminal Block | Mainback | 48.94 |
| 6 | Run 1 | ACU Ambient (Hill Only) Top | Mainback | 60.00 |
| 7 | Run 1 | ACU K8 Housing / Double Line Break | Mainback | 55.44 |
| 8 | Run 1 | Coil FR | Coil Temps | 55.69 |
| 9 | Run 1 | Coil FL | Coil Temps | 49.33 |

<sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>

---

### Tabela 2: Dados Escalonados (Min-Max) — 10 primeiros registros

| # | temp (original, °C) | temp (escalonada) |
|---|---------------------|-------------------|
| 0 | 99.35 | 0.291407 |
| 1 | 114.72 | 0.353910 |
| 2 | 89.93 | 0.253101 |
| 3 | 167.87 | 0.570046 |
| 4 | 53.65 | 0.105567 |
| 5 | 48.94 | 0.086414 |
| 6 | 60.00 | 0.131390 |
| 7 | 55.44 | 0.112846 |
| 8 | 55.69 | 0.113863 |
| 9 | 49.33 | 0.088000 |

<sup>Fonte: Elaborado pelos autores (2026), a partir de data/dataset_pre_processado.csv.</sup>

---

#### Interpretação dos resultados

Os parâmetros usados pelo `MinMaxScaler`, calculados sobre as 4.065 observações de `temp`:

| Estatística | Valor (°C) |
|-------------|------------|
| Mínimo | 27.69 |
| Máximo | 273.60 |
| Amplitude | 245.91 |
| Média | 81.77 |
| Mediana | 76.50 |
| Desvio-padrão | 33.28 |

**Verificação do cálculo:** aplicando a fórmula ao primeiro registro, `(99.35 - 27.69) / 245.91 = 0.291407`, valor idêntico ao da Tabela 2. Por ser uma transformação monotônica, o Min-Max preserva a ordem relativa dos registros: `Storage Drawer` (167.87 °C) segue o mais quente da amostra nas duas tabelas (0.570), e `Ambient Below Terminal Block` (48.94 °C) o mais frio nas duas (0.086).

**Concentração na faixa inferior do intervalo:** os dez valores normalizados ficam entre 0.086 e 0.570, sem se aproximar do topo da escala, refletindo a assimetria à direita de `temp` (mediana de 76.50 °C abaixo da média de 81.77 °C, com máximo de 273.60 °C isolado em `Coil Temps`/`Mainback`). Como o Min-Max se baseia apenas nos dois extremos, esse máximo comprime a maior parte das observações na metade inferior do intervalo `[0,1]`.

Implicação para a modelagem: ainda que exista apenas uma variável quantitativa, o escalonamento continua sendo necessário porque as variáveis categóricas passarão por codificação ordinal (Seção 4.3, item a), gerando colunas de inteiros pequenos (0, 1, 2...). Sem normalizar `temp`, ela entraria no modelo em uma escala até duas ordens de grandeza maior que essas colunas codificadas, dominando o cálculo de distância em algoritmos sensíveis à magnitude (KNN, K-Means, SVM) e a inicialização dos pesos em redes neurais. O Min-Max coloca `temp` na mesma faixa das variáveis codificadas. Como ressalva, por depender exclusivamente dos extremos, o Min-Max é sensível a outliers — caso a etapa de modelagem indique perda de desempenho por esse motivo, `StandardScaler` (média e desvio-padrão) ou `RobustScaler` (mediana e IQR) são alternativas mais estáveis para essa distribuição assimétrica.

A comparação estatística de `temp` antes × depois do escalonamento já foi apresentada e discutida no item e) acima. Este item complementa esse resultado com a verificação, região a região, de que o Min-Max segmentado mapeou cada `key_area` para o intervalo [0, 1] esperado.

**Verificação do intervalo de `temp_scaled` por `key_area`**

| `key_area` | n | mín(`temp_scaled`) | máx(`temp_scaled`) |
|---|---:|---:|---:|
| Mainback | 610 | 0,0000 | 1,0000 |
| Coil Temps | 420 | 0,0000 | 1,0000 |
| Main Vent Sys | 288 | 0,0000 | 1,0000 |
| IPC Cooling | 218 | 0,0000 | 1,0000 |
| IPC Comp | 1.979 | 0,0000 | 1,0000 |
| CT Knobs | 330 | 0,0000 | 1,0000 |
| Oven HMI | 220 | 0,0000 | 1,0000 |

Por construção da equação de normalização (item c), o mínimo e o máximo de cada `key_area` são necessariamente mapeados para 0 e 1 — a tabela acima, portanto, não é uma medição sujeita a variação amostral, mas uma verificação de que a implementação (Seção 5 do notebook) respeitou a fórmula em todas as sete regiões, sem observações fora do intervalo [0, 1] previsto.
