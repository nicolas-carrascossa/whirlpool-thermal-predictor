### Storytelling
#### Mapeamento do problema:
**1) Tensão de negócio:** Mercado concorrido. A whirlpool precisa renovar arquiteturas de fogões rapidamente sob pressão de margem, concorrência e mudanças de portfólio.
---> 
**2) Heurística por custo:** Simular é caro. O time de engenharia não consegue explorar alternativas relevantes por questão de custo de simulação. Por isso surge o gargalo, qual combinação testar? 
[Dados a buscar: custo de softwares CFD]
--->
**3) Lead time:** Decisão de design estagnada. A batida de martelo sobre a combinação das peças que leva a um design demanda grande espera e compromete as equipes que se sucedem empresa acima.


#### Quem vai resolver?
O Thermal Predictor. O TP é um sistema baseado em machine learning que une combinações específicas de dados e devolve previsões de temperaturas por áreas do fogão. O usuário saberá os valores de temperaturas relativas ao sensores e, portanto, por regiões do fogão.


#### Proposta de valor:
**1) Triagem:** O TP atua como uma abstração inicial, na qual os times podem inputar configurações que eles acham relevantes, descartando configurações que são obsoletas já na combinação de features que não conversam, enaltecendo designs efetivos que avaçaram para testes mais robustos.
**2) Organização:** O TP oferece rastreabilidade das configurações testadas, com histórico das simulações. 
**3) Autonomia:** Os times não técnicos podem executar simulações de designs desejados, para testar hipóteses mais antecipadamente, enquanto times que lidam com qualidade concentram-se em reduzir incertezas.

#### Confiabilidade da solução:
Buscar dados que o modelo trouxe de métricas. 
Essa mostragem passa pela visualização da dashboard:

1) Gráficos de dispersão da previsão vs valores reais.
2) Gráfico de importância das variáveis (Avaliar regiões mais críticas por área e a explicabilidade do modelo).
3) Matriz de confusão.

##### Roadmap inicial: 
Pressão de mercado → Gargalo invisível de engenharia → Custo da decisão lenta → Nova camada de triagem → evidência da PoC.



