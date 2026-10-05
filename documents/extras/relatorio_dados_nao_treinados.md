# Relatório de cobertura de sensores e configurações por `key_area`

> **Classificação: sensível para qualidade do modelo.**  
> Auditoria executada em 28 de setembro de 2026 sobre o código, os CSVs por
> área, o catálogo do backend e `src/backend/models/manifest.json`. Este documento descreve
> o modelo atualmente exportado; qualquer novo treino exige regenerar a
> auditoria.
>
> **Revisão independente em 28/09/2026.** Os números foram reconferidos contra
> o manifesto real e os CSVs, por um caminho diferente do script de auditoria.
> Todos se sustentaram — ver
> [Confiabilidade desta auditoria](#confiabilidade-desta-auditoria). A revisão
> corrigiu **enquadramento**, não aritmética: dois achados classificados como
> defeito são, na verdade, decisões de negócio já tomadas e registradas, e um
> terceiro estava subestimado por ter sido agrupado com elas.

## Conclusão executiva

Este relatório parte de uma premissa arquitetural já decidida e validada: há
**um modelo por `key_area`**, e cada modelo prevê conjuntamente os sensores que
pertencem àquela área. A auditoria não questiona essa decisão e não avalia a
criação de um modelo por sensor. Ela mede duas dimensões de cobertura de cada
modelo de área:

1. **cobertura de sensores:** quais sensores da `key_area` estão representados
   como alvos/saídas do modelo;
2. **cobertura de configurações:** quais permutações das sete features foram
   efetivamente usadas para ajustar aquele modelo.

O problema é real e grave. A interface permite o produto cartesiano de sete
features, totalizando **3.744 combinações selecionáveis**, mas cada modelo foi
ajustado com apenas **10 a 25 configurações categóricas distintas**. Mesmo
contando aliases da UI, somente **0,56% a 1,71%** das 3.744 combinações
correspondem a configurações efetivamente usadas no ajuste de cada área.

Os achados mais críticos são:

1. **`IPC Comp` é a área mais vulnerável:** 32 das 56 linhas são descartadas
   pelo complete-case; restam 16 linhas no ajuste e somente 10 configurações
   distintas. Apenas 21 combinações da UI têm correspondência exata com o
   ajuste. Outras **3.312 combinações (88,46%)** contêm ao menos um valor que o
   modelo da área não sabe codificar.
2. **Três sensores selecionáveis não têm saída de modelo — por dois motivos
   diferentes, que exigem respostas diferentes.** TC 20 (`AC Blower Inlet Max`)
   e TC 21 (`AC Blower Inlet Avg`) caíram pela regra de cobertura: têm medição
   em apenas **4 dos 56 ensaios (7,1%)**, muito abaixo do corte de 50%. Já
   TC 6 (`Oven RTD Connector Body`) **não é uma lacuna de modelagem**: a equipe
   decidiu eliminá-lo por erro de coleta do parceiro, e sua coluna sequer
   existe no CSV exportado. Os três precisam sair da seleção da UI, mas apenas
   dois são candidatos a treino futuro.
3. **A API omite a área em vez de explicar o problema ao usuário.** Quando
   `_encode()` falha para uma área, `RealPredictor.predict()` captura o erro,
   guarda-o apenas em `skipped_areas` para auditoria e devolve as outras áreas.
   Se o recorte tiver somente a área incompatível, a interface tende a mostrar
   “Nenhum sensor no recorte”, não “configuração sem suporte de treino”.
4. **O indicador de confiabilidade superestima a cobertura — confirmado e
   quantificado.** O campo `train_configs` do manifesto nasce de todo o
   conjunto limpo, antes do split (`clean[VARIABLES].drop_duplicates()`,
   `export_models.py:401`), e é exatamente ele que `compute_reliability()`
   consulta (`real.py:247`). A conferência fecha a identidade: o `train_configs`
   de cada área tem precisamente o tamanho do conjunto **limpo**, não do
   conjunto de **ajuste**. O falso positivo por área:

   | Área | Configs em `train_configs` | Que de fato ajustaram | Rotuladas "interpolação" sem terem treinado |
   | --- | ---: | ---: | ---: |
   | Mainback | 31 | 24 | 7 (23%) |
   | Coil Temps | 30 | 24 | 6 (20%) |
   | Main Vent Sys | 32 | 23 | 9 (28%) |
   | IPC Cooling | 31 | 23 | 8 (26%) |
   | **IPC Comp** | 15 | 10 | **5 (33%)** |
   | CT Knobs | 32 | 25 | 7 (22%) |
   | Oven HMI | 32 | 25 | 7 (22%) |

   Entre um quinto e um terço das configurações que a interface apresenta como
   "Interpolação" — o rótulo de **maior** confiança — nunca ajustaram o
   estimador.
5. **Dois aliases colapsam escolhas da UI — mas só um está em aberto.**
   `Aluminium`/`Aluminium Plate` foi colapsado por **decisão registrada da
   equipe** (`documents/extras/hipotese_material_sem_correcao_E17.md`): o
   glossário oficial do parceiro documenta apenas 2 níveis e não há confirmação
   de que "Aluminium Plate" seja uma configuração física real. Está decidido,
   pendente só de confirmação com o parceiro.

   `Open`/`Open - Updated` é outro caso e **merece revisão**. Ele é colapsado
   dentro de um dicionário chamado `GRAFIAS_DIVERGENTES` nos notebooks e
   `SPELLING_FIXES` no exportador — ou seja, tratado como *erro de grafia*. Mas
   não parece ser: o plano de front-end descreve os dois como peças fisicamente
   distintas ("Open = tampa removida; **Open - Updated = aberta com rasgos**"),
   a documentação o lista como nível próprio com **674 observações** e a UI o
   oferece como terceira opção. Um nível com 674 observações e geometria
   própria está sendo absorvido como se fosse um typo, sem decisão registrada.

Portanto, a presença de um valor isolado no encoder não prova que uma
permutação completa foi treinada. A lista das combinações que de fato
ajustaram cada modelo é emitida por
`src/scripts/audit_training_coverage.py --markdown`; este relatório detalha o
**inverso** dela, que é o que serve à auditoria de features: as configurações
medidas em laboratório que não chegaram ao ajuste, por sensor e por causa.

## Confiabilidade desta auditoria

Antes de usar este relatório para decidir, é justo saber o que nele foi
conferido de forma independente e o que permanece como interpretação. A
conferência de 28/09/2026 refez os números por um caminho diferente do script
de auditoria — lendo o manifesto realmente exportado, os CSVs e o código — e
comparou os resultados.

| Afirmação do relatório | Como foi conferida | Resultado |
| --- | --- | --- |
| 3.744 combinações na UI | produto das opções de `variable_options.json` (2×3×2×4×13×2×3) | **confirmado** |
| Linhas no ajuste por área (37, 34, 39, 37, 16, 38, 38) | comparadas com `n_train` de `src/backend/models/manifest.json`, que vem do treino real | **confirmado nas 7 áreas** |
| Tabela de cobertura quantitativa | `src/scripts/audit_training_coverage.py --summary` reexecutado | **reproduz a tabela exatamente** |
| Soma das classes = 3.744 por área | somatório por linha | **confirmado nas 7 áreas** |
| `IPC Comp` bloqueia 3.312 (88,46%) | recontagem independente: 2×3×1×3×8×1×3 = 432 alcançáveis; 3.744 − 432 = 3.312 | **confirmado** |
| TC 6, 20 e 21 sem saída de modelo | diferença entre `sensor_registry.json` (77) e `sensor_expansion` do manifesto (74) | **confirmado** |
| `train_configs` vem do conjunto limpo, não do ajuste | `export_models.py:401` lido, e tamanho de `train_configs` comparado ao de configs limpas por área | **confirmado e quantificado** (ver achado 4) |
| A UI mostra "Nenhum sensor no recorte" | `ResultsPanel.tsx:260` | **confirmado** |
| `skipped_areas` não chega ao cliente | ausente de `contract/v1.ts`; só gravado no log de acesso (`predictions.py:52`) | **confirmado** |
| Aliases colapsam as escolhas | `SPELLING_FIXES` no exportador e `GRAFIAS_DIVERGENTES` nos dois notebooks | **confirmado** |

Nenhum número precisou ser corrigido. O que a revisão mudou foi a leitura de
três achados — ver as ressalvas abaixo e os achados 2 e 5.

### Ressalva 1: o relatório audita o exportador, não os notebooks

O escopo correto é o artefato em produção, e é ele que o relatório mede. Mas
vale registrar que **`src/scripts/export_models.py` diverge deliberadamente de
`notebooks/Random_for_regre.ipynb`**: o exportador aplica
`Aluminium Plate → Aluminium` também ao Random Forest, enquanto o notebook de
RF não aplica (só o de Gradient Boosting aplica). A divergência está comentada
no exportador e foi introduzida para que a mesma consulta não significasse
coisas diferentes de área para área.

Consequência prática: quem reauditar pelo **notebook de RF** obterá números
diferentes dos desta tabela para `Mainback`, `IPC Comp` e `IPC Cooling`. O
número válido para o produto é o do exportador — o que está aqui. A docstring
do exportador, que afirma "reproduz o pipeline dos notebooks", precisa ser
corrigida para refletir essa exceção.

### Ressalva 2: `CT Knobs` e `Oven HMI` têm números idênticos, e isso está certo

As duas linhas da tabela quantitativa coincidem em todas as colunas de
cobertura, apesar de partirem de 73 e 55 linhas. Não é erro de transcrição:
após o complete-case, as 55 linhas sobreviventes de `CT Knobs` têm exatamente
o mesmo multiconjunto de configurações das 55 de `Oven HMI` — conferido
diretamente nos CSVs. Mesmas configurações e mesma semente produzem o mesmo
split, os mesmos 38 ensaios de ajuste e as mesmas 25 configurações.

### Ressalva 3: o que este relatório não mede

- Não mede **acurácia**. Uma configuração dentro da whitelist não é por isso
  precisa; ela apenas teve evidência de treino. As métricas por área estão no
  manifesto e contam outra história.
- Não mede **quanto o erro cresce** com a distância ao conjunto de treino. As
  classes "distância 1" e "distância ≥ 2" ordenam risco, não o quantificam.
- Não avalia a decisão de **um modelo por `key_area`**, que é premissa dada.

## Como a auditoria foi calculada

O cálculo reproduz o caminho de `src/scripts/export_models.py`:

1. lê o CSV de cada área;
2. identifica os alvos com pelo menos 50% de cobertura;
3. executa `dropna(subset=kept)` — uma linha só sobrevive se **todos** os alvos
   mantidos daquela área estiverem preenchidos;
4. aplica as normalizações categóricas;
5. reproduz `train_test_split(..., train_size=0.70, random_state=42)`;
6. considera como “treinada” somente uma configuração presente no `X_train`
   que ajustou o estimador final;
7. expande as escolhas canônicas da UI pelas tabelas
   `canonical_to_training` do manifesto.

O script reproduzível está em `src/scripts/audit_training_coverage.py` e não
altera nenhum dado. Para recalcular:

```powershell
.\venv\Scripts\python.exe scripts\audit_training_coverage.py --summary
.\venv\Scripts\python.exe scripts\audit_training_coverage.py --markdown
```

### Correção importante sobre os valores nulos

Os nulos não são tratados de uma única forma:

- **features nulas:** o exportador usa `fillna("Nao Informado")`; elas não são
  descartadas. Porém, `Nao Informado` não é uma opção selecionável na UI, logo
  algumas configurações usadas no ajuste não são alcançáveis pelo cliente;
- **colunas-alvo com cobertura abaixo de 50%:** são removidas;
- **linhas com nulo em qualquer alvo mantido:** são removidas em conjunto.

O terceiro comportamento reduz a base compartilhada do modelo multi-output da
`key_area`: um nulo em um único alvo mantido elimina a linha para o ajuste de
todos os sensores daquela área. Isso não invalida a decisão de modelar por
`key_area`, mas altera materialmente sua cobertura de configurações.

## Legenda das classes de cobertura

| Classe | Critério usado neste relatório | Significado |
| --- | --- | --- |
| Exata no ajuste | a permutação, após normalização, aparece no `X_train` | configuração efetivamente usada para ajustar o estimador |
| Vista apenas fora do ajuste | aparece no conjunto limpo, mas somente no split de teste/validação | não treinou o estimador; hoje pode ser rotulada incorretamente como interpolação |
| Distância 1 | é codificável, mas difere em uma feature da configuração mais próxima do `X_train` | extrapolação moderada, sem observação exata |
| Distância ≥ 2 | é codificável, mas difere em duas ou mais features | extrapolação forte/fora de domínio |
| Bloqueada por valor não visto | ao menos um valor não existe no encoder da área | a área é omitida pela API atual |

As distâncias usam as sete features efetivamente declaradas no manifesto:
`blower_direction`, `housing`, `board_position`, `run_case`, `losses`,
`deflector_hole` e `material_coil_support`.

## Cobertura quantitativa por área

| `key_area` | Algoritmo | Linhas fonte | Linhas após complete-case | Linhas no ajuste | Configs distintas no ajuste | Exatas na UI | Só fora do ajuste | Distância 1 | Distância ≥ 2 | Bloqueadas |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mainback | Random Forest | 56 | 54 | 37 | 24 | 49 (1,31%) | 22 (0,59%) | 692 (18,48%) | 2.981 (79,62%) | 0 |
| Coil Temps | Gradient Boosting | 56 | 49 | 34 | 24 | 53 (1,42%) | 14 (0,37%) | 729 (19,47%) | 2.948 (78,74%) | 0 |
| Main Vent Sys | Gradient Boosting | 56 | 56 | 39 | 23 | 56 (1,50%) | 19 (0,51%) | 807 (21,55%) | 2.862 (76,44%) | 0 |
| IPC Cooling | Random Forest | 55 | 53 | 37 | 23 | 53 (1,42%) | 18 (0,48%) | 710 (18,96%) | 2.963 (79,14%) | 0 |
| **IPC Comp** | Random Forest | 56 | **24** | **16** | **10** | **21 (0,56%)** | 13 (0,35%) | 138 (3,69%) | 260 (6,94%) | **3.312 (88,46%)** |
| CT Knobs | Gradient Boosting | 73 | 55 | 38 | 25 | 64 (1,71%) | 11 (0,29%) | 863 (23,05%) | 2.806 (74,95%) | 0 |
| Oven HMI | Gradient Boosting | 55 | 55 | 38 | 25 | 64 (1,71%) | 11 (0,29%) | 863 (23,05%) | 2.806 (74,95%) | 0 |

Cada linha soma as 3.744 combinações da UI. “Exatas na UI” é maior que o
número de configurações distintas do ajuste porque os aliases `Open / Open -
Updated` e `Aluminium / Aluminium Plate` chegam ao mesmo valor codificado.

## Cobertura conjunta do modelo: sensores e configurações por `key_area`

Cada `key_area` usa um único modelo multi-output, conforme a decisão técnica
validada. Todos os sensores de uma área compartilham o mesmo conjunto de linhas
de ajuste, e portanto **a mesma lista de configurações que treinaram o modelo**.
Nesse sentido não existe uma whitelist por sensor.

**O inverso, porém, é por sensor — e é por isso que ele serve à auditoria.**
A pergunta "quais configurações este sensor foi medido e mesmo assim não
treinaram o modelo?" tem resposta diferente para cada sensor da mesma área,
porque o complete-case descarta uma linha quando **qualquer** alvo da área está
vazio, e o alvo vazio muda de linha para linha. Dois exemplos medidos:

- em `Mainback`, `Door Lock Microswitch Body` perde 7 configurações e os outros
  nove alvos perdem 8 — a linha extra é uma em que esse sensor não tinha
  medição, então ela não conta como perda dele;
- em `IPC Comp`, `Bridge` perde 22 configurações enquanto `Heat Sink` perde 12,
  porque o `Heat Sink` só foi medido em 22 configurações para começar.

A dimensão por sensor indica também se ele é ou não uma saída do modelo; a
dimensão por configuração indica onde o modelo da área recebeu evidência.

| `key_area` | Sensores previstos pelo modelo | Sensores selecionáveis sem saída |
| --- | --- | --- |
| Mainback | TC 1 Door Lock Motor Ambient 1/2&quot; Below; TC 2 Door Lock Microswitch Body; TC 3 Convect Motor Winding; TC 4 Hot Surface Indicator Body; TC 5 Power On Indicator Body; TC 7 Storage Drawer (Metal Above); TC 8 L2, Wire, Power Cord; TC 9 Ambient Below Terminal Block; TC 10 ACU Ambient (Hill Only) Top; TC 11 ACU K8 Housing / Double Line Break | **TC 6 Oven RTD Connector Body** — coluna ausente do CSV: sensor **descartado por decisão da equipe** (erro de coleta do parceiro), não por regra de cobertura |
| Coil Temps | TC 12 Coil FR; TC 13 Coil FL; TC 14 Coil RR; TC 15 Coil RL; TC 16 Aluminium Plate FL; TC 17 Aluminium Plate RR; TC 18 Aluminium Plate RL; TC 19 Aluminium Plate FR | nenhum |
| Main Vent Sys | TC 22 AC Blower HES Connector; TC 23 AC Blower Windings; TC 24 AC Blower Housing; TC 25 Top Duct Inlet; TC 26 Turbo Duct / AC Blower Outlet | **TC 20 AC Blower Inlet Max** e **TC 21 AC Blower Inlet Avg** — removidas por cobertura de **7,1% (4 de 56 ensaios)**, muito abaixo do corte de 50% |
| IPC Cooling | TC 27 IPC Vertical Duct Inlet (Bottom); TC 28 IPC Horizontal Duct Outlet (Inlet IPC Fan); TC 29 IPC Housing Surface; TC 30 IPC Housing Outlet | nenhum |
| IPC Comp | TC 32 IPC Blower (Air Outlet Temp); TC 33 IPC Blower Housing; TC 34 Heat Sink; TC 35 Bridge; TC 36–51 IGBT 1–16; TC 52–55 DCBUS Cap 1–4; TC 56–57 CMC 1–2; TC 58 DMC; TC 59–66 Reso Cap 1–8; TC 67 Beatrice Micro; TC 68 Micro (Below Board) | nenhum; porém TC 36–51 recebem **o mesmo valor**, proveniente do alvo consolidado `IGBT` |
| Oven HMI | TC 69 Thermistor; TC 70 UI Wifi; TC 71 Microchip; TC 72 UI LCD Screen | nenhum |
| CT Knobs | TC 73 Ambient Between Left Encoders; TC 74 Left Encoder; TC 75 Left Center Encoder; TC 76 Ambient Between Right Encoders; TC 77 Right Center Encoder; TC 78 Right Encoder | nenhum |

## Configurações medidas que NÃO treinaram o modelo da área

Esta seção é o inverso de uma whitelist, e é ela que serve à auditoria de
features. Em vez de listar o que o modelo viu, ela lista, **por sensor**, as
configurações em que aquele sensor **foi efetivamente medido em laboratório**
mas que não entraram no ajuste do modelo da sua `key_area`.

A distinção importa porque as duas causas pedem ações opostas:

| Causa | O que significa | O que fazer |
| --- | --- | --- |
| **Complete-case** | O sensor tem medição nessa configuração, mas a linha inteira foi descartada porque **outro** alvo da mesma área estava vazio. É dado que existe e está sendo jogado fora. | Revisar a regra de limpeza. Nenhuma coleta nova é necessária. |
| **Split** | A configuração sobreviveu à limpeza mas caiu no conjunto de teste/validação. | Nada a corrigir — é o custo normal de reservar dados. Mas **não** deve ser rotulada como `interpolation` (achado 4). |

Ambas as causas são finitas e rastreáveis. Não confundir com as combinações
que o laboratório nunca ensaiou: essas estão na tabela de cobertura
quantitativa como "distância 1" e "distância ≥ 2", e não aparecem aqui porque
nunca foram medidas para sensor nenhum.

Uma célula marcada com **†** indica um valor que **não é alcançável pela UI
naquela área**: a categoria só existia nas linhas descartadas, então sumiu do
encoder. Ver o achado de causa raiz logo abaixo.

### Por que isto explica os 88% bloqueados de `IPC Comp`

Os oito valores que bloqueiam `IPC Comp` — e que por isso tornam 3.312 das
3.744 combinações da UI impossíveis — **existem apenas nas linhas que o
complete-case descartou**. Nenhum deles sobrevive na base limpa:

| Feature | Valor | Linhas descartadas onde aparece | Linhas limpas onde aparece |
| --- | --- | ---: | ---: |
| `deflector_hole` | `Open` | 19 | **0** |
| `losses` | `Simone Losses` | 15 | **0** |
| `board_position` | `Right` | 3 | **0** |
| `losses` | `C1 Simone - 240/145/180/180` | 2 | **0** |
| `losses` | `Miro` | 2 | **0** |
| `run_case` | `Broil C1` | 2 | **0** |
| `losses` | `Broil C2 Simone - 240/145/180/180` | 1 | **0** |
| `losses` | `Simone` | 1 | **0** |

Isto reposiciona dois achados que o relatório tratava como separados. O
bloqueio categórico de `IPC Comp` **não** é falta de ensaio: é consequência
direta da regra de limpeza. O laboratório mediu essas configurações; o
`dropna(subset=kept)` as removeu porque algum dos 22 alvos da área estava
vazio naquela linha, e com elas foram embora as categorias inteiras.

Consequência para a priorização: recuperar cobertura em `IPC Comp` é, em
primeiro lugar, um problema de **tratamento de nulos**, não de coleta.

### Como ler as tabelas

"Configs medidas" conta as configurações distintas em que o sensor tem valor.
"Usadas no ajuste" conta quantas dessas chegaram ao `X_train` da área. A
diferença é a lacuna, decomposta nas duas causas. Sensores sem saída no modelo
aparecem em itálico: para eles, nenhuma medição treinou coisa alguma.

### Mainback — 10 alvos no modelo

| Sensor (alvo do modelo) | Configs medidas | Usadas no ajuste | Não usadas | Perdidas no complete-case | Perdidas no split |
| --- | ---: | ---: | ---: | ---: | ---: |
| ACU Ambient (Hill Only) Top | 32 | 24 | **8** | 1 | 7 |
| ACU K8 Housing / Double Line Break | 32 | 24 | **8** | 1 | 7 |
| Ambient Below Terminal Block | 32 | 24 | **8** | 1 | 7 |
| Convect Motor Winding | 32 | 24 | **8** | 1 | 7 |
| Door Lock Microswitch Body | 31 | 24 | **7** | 0 | 7 |
| Door Lock Motor Ambient 1/2" Below | 32 | 24 | **8** | 1 | 7 |
| Hot Surface Indicator Body | 32 | 24 | **8** | 1 | 7 |
| L2, Wire, Power Cord | 32 | 24 | **8** | 1 | 7 |
| Power On Indicator Body | 32 | 24 | **8** | 1 | 7 |
| Storage Drawer (Metal Above) | 32 | 24 | **8** | 1 | 7 |

**A. Perdidas no split — 7 configurações.** Medidas, sobreviveram à limpeza, mas caíram fora do `X_train`. Afetam **todos** os alvos da área.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | N UI |
| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1 | To back | Open / Open - Updated | Center | Broil C2 | Simone Losses | Open | Aluminium / Aluminium Plate | 4 |
| 2 | To back | Open / Open - Updated | Center | Pyro | No losses | Open | Aluminium / Aluminium Plate | 4 |
| 3 | To front | Closed | Center | Broil C2 | Broil C2 Simone - 240/145/180/180 | Closed | Aluminium / Aluminium Plate | 2 |
| 4 | To front | Closed | Center | Broil C2 | Simone Modified - Back Order | Closed | Aluminium / Aluminium Plate | 2 |
| 5 | To front | Closed | Center | Broil Qualitative | Qual Simone - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 6 | To front | Open / Open - Updated | Center | Broil Qualitative | Miro Qualitative  - Back Order | Closed | Aluminium / Aluminium Plate | 4 |
| 7 | To front | Open / Open - Updated | Center | Broil Qualitative | Simone Losses | Open | Aluminium / Aluminium Plate | 4 |

**B. Perdidas no complete-case — 1 configurações.** O sensor **foi medido** nelas, mas a linha caiu porque outro alvo da mesma área estava vazio. É dado existente e descartado.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | Alvos que a perderam |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | To back | Open / Open - Updated | Center | Broil C2 | Simone Modified - Back Order | Closed | Aluminium / Aluminium Plate | 9 de 10 |

### Coil Temps — 8 alvos no modelo

| Sensor (alvo do modelo) | Configs medidas | Usadas no ajuste | Não usadas | Perdidas no complete-case | Perdidas no split |
| --- | ---: | ---: | ---: | ---: | ---: |
| Aluminium Plate  RR | 30 | 24 | **6** | 0 | 6 |
| Aluminium Plate FL | 30 | 24 | **6** | 0 | 6 |
| Aluminium Plate FR | 30 | 24 | **6** | 0 | 6 |
| Aluminium Plate RL | 30 | 24 | **6** | 0 | 6 |
| Coil  RR | 32 | 24 | **8** | 2 | 6 |
| Coil FL | 32 | 24 | **8** | 2 | 6 |
| Coil FR | 32 | 24 | **8** | 2 | 6 |
| Coil RL | 32 | 24 | **8** | 2 | 6 |

**A. Perdidas no split — 6 configurações.** Medidas, sobreviveram à limpeza, mas caíram fora do `X_train`. Afetam **todos** os alvos da área.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | N UI |
| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1 | To back | Open / Open - Updated | Center | Broil C2 | Simone Losses | Open | Aluminium / Aluminium Plate | 4 |
| 2 | To front | Closed | Center | Broil C1 | C1 Simone - 240/145/180/180 | Closed | Plastic | 1 |
| 3 | To front | Closed | Center | Broil C2 | Broil C2 Simone - 240/145/180/180 | Closed | Aluminium / Aluminium Plate | 2 |
| 4 | To front | Closed | Center | Broil Qualitative | Miro Qualitative  - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 5 | To front | Closed | Center | Broil Qualitative | Miro | Closed | Plastic | 1 |
| 6 | To front | Open / Open - Updated | Center | Broil Qualitative | Miro Qualitative  - Back Order | Closed | Aluminium / Aluminium Plate | 4 |

**B. Perdidas no complete-case — 2 configurações.** O sensor **foi medido** nelas, mas a linha caiu porque outro alvo da mesma área estava vazio. É dado existente e descartado.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | Alvos que a perderam |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | To back | Open / Open - Updated | Center | Pyro | No losses | Open | Aluminium / Aluminium Plate | 4 de 8 |
| 2 | To front | Open / Open - Updated | Center | Pyro | No losses | Open | Aluminium / Aluminium Plate | 4 de 8 |

### Main Vent Sys — 5 alvos no modelo

| Sensor (alvo do modelo) | Configs medidas | Usadas no ajuste | Não usadas | Perdidas no complete-case | Perdidas no split |
| --- | ---: | ---: | ---: | ---: | ---: |
| AC Blower HES Connector | 32 | 23 | **9** | 0 | 9 |
| AC Blower Housing | 32 | 23 | **9** | 0 | 9 |
| AC Blower Windings | 32 | 23 | **9** | 0 | 9 |
| Top Duct Inlet | 32 | 23 | **9** | 0 | 9 |
| Turbo Duct / AC Blower Outlet | 32 | 23 | **9** | 0 | 9 |
| _AC Blower Inlet Avg_ (sem saída no modelo) | 3 | 0 | **3** | — | — |
| _AC Blower Inlet Max_ (sem saída no modelo) | 3 | 0 | **3** | — | — |

**A. Perdidas no split — 9 configurações.** Medidas, sobreviveram à limpeza, mas caíram fora do `X_train`. Afetam **todos** os alvos da área.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | N UI |
| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1 | To back | Closed | Center | Broil C2 | Simone Losses | Open | Aluminium / Aluminium Plate | 2 |
| 2 | To back | Open / Open - Updated | Center | Broil Qualitative | **Não informado** † | Open | Aluminium / Aluminium Plate | 4 |
| 3 | To front | Closed | Center | Broil C1 | C1 Simone - 240/145/180/180 | Closed | Aluminium / Aluminium Plate | 2 |
| 4 | To front | Closed | Center | Broil C2 | Broil C2 Simone - 240/145/180/180 | Closed | Aluminium / Aluminium Plate | 2 |
| 5 | To front | Closed | Center | Broil Qualitative | Broil Miro - Front Order | Closed | Plastic | 1 |
| 6 | To front | Closed | Center | Broil Qualitative | Miro Qualitative  - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 7 | To front | Closed | Center | Broil Qualitative | Qual Simone - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 8 | To front | Open / Open - Updated | Center | Broil Qualitative | Miro Qualitative  - Back Order | Closed | Aluminium / Aluminium Plate | 4 |
| 9 | To front | Open / Open - Updated | Center | Broil Qualitative | Simone Losses | Open | Aluminium / Aluminium Plate | 4 |

### IPC Cooling — 4 alvos no modelo

| Sensor (alvo do modelo) | Configs medidas | Usadas no ajuste | Não usadas | Perdidas no complete-case | Perdidas no split |
| --- | ---: | ---: | ---: | ---: | ---: |
| IPC Horizontal Duct Oulet (Inlet IPC Fan) | 32 | 23 | **9** | 1 | 8 |
| IPC Housing Outlet | 32 | 23 | **9** | 1 | 8 |
| IPC Housing Surface  | 31 | 23 | **8** | 0 | 8 |
| IPC Vertical Duct Inlet (Bottom) | 32 | 23 | **9** | 1 | 8 |

**A. Perdidas no split — 8 configurações.** Medidas, sobreviveram à limpeza, mas caíram fora do `X_train`. Afetam **todos** os alvos da área.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | N UI |
| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1 | To back | Open / Open - Updated | Center | Broil C2 | Simone Losses | Open | Aluminium / Aluminium Plate | 4 |
| 2 | To back | Open / Open - Updated | Center | Broil Qualitative | **Não informado** † | Open | Aluminium / Aluminium Plate | 4 |
| 3 | To back | Open / Open - Updated | Center | Pyro | No losses | Open | Aluminium / Aluminium Plate | 4 |
| 4 | To front | Closed | Center | Broil C1 | C1 Simone - 240/145/180/180 | Closed | Plastic | 1 |
| 5 | To front | Closed | Center | Broil C2 | Simone | Closed | Plastic | 1 |
| 6 | To front | Closed | Center | Broil Qualitative | Miro Qualitative  - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 7 | To front | Closed | Center | Broil Qualitative | Simone Losses | Open | Aluminium / Aluminium Plate | 2 |
| 8 | To front | Open / Open - Updated | Center | Broil C2 | Broil C2 Simone - Front Order | Closed | Aluminium / Aluminium Plate | 4 |

**B. Perdidas no complete-case — 1 configurações.** O sensor **foi medido** nelas, mas a linha caiu porque outro alvo da mesma área estava vazio. É dado existente e descartado.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | Alvos que a perderam |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | To front | Open / Open - Updated | Center | Pyro | No losses | Open | Aluminium / Aluminium Plate | 3 de 4 |

### IPC Comp — 22 alvos no modelo

| Sensor (alvo do modelo) | Configs medidas | Usadas no ajuste | Não usadas | Perdidas no complete-case | Perdidas no split |
| --- | ---: | ---: | ---: | ---: | ---: |
| Beatrice Micro | 26 | 10 | **16** | 11 | 5 |
| Bridge | 32 | 10 | **22** | 17 | 5 |
| CMC 1 | 32 | 10 | **22** | 17 | 5 |
| CMC 2 | 32 | 10 | **22** | 17 | 5 |
| DCBUS Cap 1 | 32 | 10 | **22** | 17 | 5 |
| DCBUS Cap 2 | 32 | 10 | **22** | 17 | 5 |
| DCBUS Cap 3 | 32 | 10 | **22** | 17 | 5 |
| DCBUS Cap 4 | 32 | 10 | **22** | 17 | 5 |
| DMC | 32 | 10 | **22** | 17 | 5 |
| Heat Sink (Point/Probe) | 22 | 10 | **12** | 7 | 5 |
| IGBT | 32 | 10 | **22** | 17 | 5 |
| IPC Blower (Air Outlet Temp) | 24 | 10 | **14** | 9 | 5 |
| IPC Blower Housing | 32 | 10 | **22** | 17 | 5 |
| Micro (Below Board)  | 32 | 10 | **22** | 17 | 5 |
| Reso Cap 1 | 32 | 10 | **22** | 17 | 5 |
| Reso Cap 2 | 32 | 10 | **22** | 17 | 5 |
| Reso Cap 3 | 32 | 10 | **22** | 17 | 5 |
| Reso Cap 4 | 32 | 10 | **22** | 17 | 5 |
| Reso Cap 5 | 32 | 10 | **22** | 17 | 5 |
| Reso Cap 6 | 32 | 10 | **22** | 17 | 5 |
| Reso Cap 7 | 32 | 10 | **22** | 17 | 5 |
| Reso Cap 8 | 32 | 10 | **22** | 17 | 5 |

**A. Perdidas no split — 5 configurações.** Medidas, sobreviveram à limpeza, mas caíram fora do `X_train`. Afetam **todos** os alvos da área.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | N UI |
| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1 | To back | Closed | Center | Broil C2 | Simone Modified - Back Order | Closed | Aluminium / Aluminium Plate | 2 |
| 2 | To back | Open / Open - Updated | Center | Broil C2 | Simone Modified - Back Order | Closed | Aluminium / Aluminium Plate | 4 |
| 3 | To front | Closed | Center | Broil Qualitative | Broil Miro - Front Order | Closed | Plastic | 1 |
| 4 | To front | Closed | Center | Broil Qualitative | Miro Qualitative  - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 5 | To front | Open / Open - Updated | Center | Broil C2 | Simone Modified - Back Order | Closed | Aluminium / Aluminium Plate | 4 |

**B. Perdidas no complete-case — 17 configurações.** O sensor **foi medido** nelas, mas a linha caiu porque outro alvo da mesma área estava vazio. É dado existente e descartado.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | Alvos que a perderam |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | To back | Closed | Center | Broil C2 | **Simone Losses** † | **Open** † | Aluminium / Aluminium Plate | 19 de 22 |
| 2 | To back | Closed | Center | Broil Qualitative | **Simone Losses** † | **Open** † | Aluminium / Aluminium Plate | 20 de 22 |
| 3 | To back | Open / Open - Updated | Center | Broil C2 | **Simone Losses** † | **Open** † | Aluminium / Aluminium Plate | 20 de 22 |
| 4 | To back | Open / Open - Updated | Center | Broil Qualitative | **Não informado** † | **Open** † | Aluminium / Aluminium Plate | 21 de 22 |
| 5 | To back | Open / Open - Updated | Center | Broil Qualitative | **Simone Losses** † | **Open** † | Aluminium / Aluminium Plate | 21 de 22 |
| 6 | To back | Open / Open - Updated | Center | Pyro | No losses | **Open** † | Aluminium / Aluminium Plate | 20 de 22 |
| 7 | To back | Open / Open - Updated | **Right** † | Broil Qualitative | **Simone Losses** † | **Open** † | Aluminium / Aluminium Plate | 21 de 22 |
| 8 | To front | Closed | Center | **Broil C1** † | **C1 Simone - 240/145/180/180** † | Closed | Aluminium / Aluminium Plate | 21 de 22 |
| 9 | To front | Closed | Center | **Broil C1** † | **C1 Simone - 240/145/180/180** † | Closed | Plastic | 21 de 22 |
| 10 | To front | Closed | Center | Broil C2 | **Broil C2 Simone - 240/145/180/180** † | Closed | Aluminium / Aluminium Plate | 21 de 22 |
| 11 | To front | Closed | Center | Broil C2 | **Simone** † | Closed | Plastic | 21 de 22 |
| 12 | To front | Closed | Center | Broil Qualitative | Broil Miro - Front Order | Closed | Aluminium / Aluminium Plate | 21 de 22 |
| 13 | To front | Closed | Center | Broil Qualitative | **Miro** † | Closed | Plastic | 21 de 22 |
| 14 | To front | Closed | Center | Broil Qualitative | **Simone Losses** † | **Open** † | Aluminium / Aluminium Plate | 20 de 22 |
| 15 | To front | Closed | **Right** † | Broil Qualitative | **Simone Losses** † | **Open** † | Aluminium / Aluminium Plate | 21 de 22 |
| 16 | To front | Open / Open - Updated | Center | Broil Qualitative | **Simone Losses** † | **Open** † | Aluminium / Aluminium Plate | 21 de 22 |
| 17 | To front | Open / Open - Updated | Center | Pyro | No losses | **Open** † | Aluminium / Aluminium Plate | 20 de 22 |

### CT Knobs — 6 alvos no modelo

| Sensor (alvo do modelo) | Configs medidas | Usadas no ajuste | Não usadas | Perdidas no complete-case | Perdidas no split |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ambient Between Left Encoders | 32 | 25 | **7** | 0 | 7 |
| Ambient Between Right Encoders | 32 | 25 | **7** | 0 | 7 |
| Left Center Encoder | 32 | 25 | **7** | 0 | 7 |
| Left Encoder | 32 | 25 | **7** | 0 | 7 |
| Right Center Encoder | 32 | 25 | **7** | 0 | 7 |
| Right Encoder | 32 | 25 | **7** | 0 | 7 |

**A. Perdidas no split — 7 configurações.** Medidas, sobreviveram à limpeza, mas caíram fora do `X_train`. Afetam **todos** os alvos da área.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | N UI |
| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1 | To back | Open / Open - Updated | Center | Broil Qualitative | **Não informado** † | Open | Aluminium / Aluminium Plate | 4 |
| 2 | To front | Closed | Center | Broil C1 | C1 Simone - 240/145/180/180 | Closed | Aluminium / Aluminium Plate | 2 |
| 3 | To front | Closed | Center | Broil C2 | Broil C2 Simone - 240/145/180/180 | Closed | Aluminium / Aluminium Plate | 2 |
| 4 | To front | Closed | Center | Broil Qualitative | Miro Qualitative  - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 5 | To front | Closed | Center | Broil Qualitative | Miro | Closed | Plastic | 1 |
| 6 | To front | Closed | Center | Broil Qualitative | Qual Simone - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 7 | To front | Closed | Right | Broil Qualitative | Simone Losses | Open | Aluminium / Aluminium Plate | 2 |

### Oven HMI — 4 alvos no modelo

| Sensor (alvo do modelo) | Configs medidas | Usadas no ajuste | Não usadas | Perdidas no complete-case | Perdidas no split |
| --- | ---: | ---: | ---: | ---: | ---: |
| A33/Bellatrix Microchip | 32 | 25 | **7** | 0 | 7 |
| A33/Bellatrix Thermistor | 32 | 25 | **7** | 0 | 7 |
| A33/Bellatrix UI LCD Screen | 32 | 25 | **7** | 0 | 7 |
| A33/Bellatrix UI Wifi  | 32 | 25 | **7** | 0 | 7 |

**A. Perdidas no split — 7 configurações.** Medidas, sobreviveram à limpeza, mas caíram fora do `X_train`. Afetam **todos** os alvos da área.

| # | Fluxo | Housing | Placa | Run case | Losses | Defletor | Material | N UI |
| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1 | To back | Open / Open - Updated | Center | Broil Qualitative | **Não informado** † | Open | Aluminium / Aluminium Plate | 4 |
| 2 | To front | Closed | Center | Broil C1 | C1 Simone - 240/145/180/180 | Closed | Aluminium / Aluminium Plate | 2 |
| 3 | To front | Closed | Center | Broil C2 | Broil C2 Simone - 240/145/180/180 | Closed | Aluminium / Aluminium Plate | 2 |
| 4 | To front | Closed | Center | Broil Qualitative | Miro Qualitative  - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 5 | To front | Closed | Center | Broil Qualitative | Miro | Closed | Plastic | 1 |
| 6 | To front | Closed | Center | Broil Qualitative | Qual Simone - Front Order | Closed | Aluminium / Aluminium Plate | 2 |
| 7 | To front | Closed | Right | Broil Qualitative | Simone Losses | Open | Aluminium / Aluminium Plate | 2 |

## Efeito prático na qualidade e no produto

### 1. A UI promete um espaço que os modelos não cobrem

O formulário oferece 3.744 permutações globais sem condicioná-las ao modelo da
`key_area` selecionada. Para seis das sete áreas, todas as categorias isoladas são
codificáveis, mas aproximadamente 75%–80% das combinações estão a distância
de pelo menos duas features de qualquer linha usada no ajuste. O modelo ainda
produz um número, porém ele é uma extrapolação sem evidência experimental
exata.

### 2. `IPC Comp` falha em nível de categoria e de combinação

Em `IPC Comp`, o problema não é apenas combinação inédita. Valores inteiros de
quatro features desapareceram com as linhas removidas. Qualquer consulta que
contenha um deles não pode ser codificada pelo modelo da área. A implementação
atual omite todas as 37 saídas da `key_area`, inclusive quando o recorte do
usuário contém apenas um de seus sensores.

### 3. Há sensores no catálogo fora da cobertura de saída do modelo da área

TC 6, TC 20 e TC 21 aparecem em `sensor_registry.json`, podem entrar em
`targets.sensors`, mas não aparecem em `sensor_expansion` do modelo. Uma
consulta exclusiva a um desses sensores pode terminar com uma resposta vazia
sem explicar que o respectivo modelo de `key_area` não possui aquela saída.

A causa difere entre eles, e isso muda o encaminhamento. **TC 6** foi
descartado por decisão da equipe (erro de coleta do parceiro) e sua coluna nem
chega ao CSV: é caso de marcar como não previsível em definitivo. **TC 20 e
TC 21** têm 7,1% de cobertura (4 de 56 ensaios); só voltam a ser modeláveis com
nova coleta, não com mudança de código. Em nenhum dos três casos a UI deveria
seguir oferecendo a seleção.

### 4. O complete-case reduz a base compartilhada do modelo por `key_area`

`dropna(subset=kept)` exige que todos os alvos mantidos da área tenham valor na
mesma linha. Em `IPC Comp`, um único nulo entre 22 alvos elimina o ensaio da
base compartilhada da `key_area`, reduzindo 56 linhas a 24 antes do split. O
impacto final é o modelo validado de `IPC Comp`, com 37 saídas expostas ao
usuário, ser ajustado com apenas 16 linhas. O risco apontado é a cobertura do
modelo de área, não a sua granularidade arquitetural.

### 5. “Interpolação” não significa necessariamente “usado no ajuste”

O manifesto registra `clean[VARIABLES].drop_duplicates()` como
`train_configs`, mas `clean` também contém os 30% separados depois. As colunas
“Só fora do ajuste” na tabela quantitativa mostram o tamanho do falso positivo:
entre 11 e 22 escolhas da UI por área podem ser tratadas como observadas mesmo
sem terem ajustado o estimador.

## Recomendações prioritárias

### P0 — impedir confiança indevida imediatamente

1. Gerar no manifesto uma whitelist baseada em **`X_train`**, por área e por
   versão de modelo; não reutilizar o `clean` completo.
2. Fazer a API devolver explicitamente, por `key_area`,
   `configuration_coverage_status`, `nearest_training_distance`,
   `unsupported_features` e `skipped_reason`; e, por sensor, informar se ele
   pertence às saídas cobertas daquele modelo.
3. Não responder silenciosamente com área vazia. Quando todos os targets
   pedidos forem incompatíveis, retornar erro de domínio explícito; quando
   somente parte falhar, devolver aviso estruturado junto à resposta.
4. Remover da seleção da UI TC 6, TC 20 e TC 21, com o catálogo declarando
   `predictable: false` **e a razão específica de cada um** — elas não são a
   mesma. TC 6: descartado por decisão da equipe (erro de coleta do parceiro),
   situação definitiva enquanto a decisão valer. TC 20 e TC 21: cobertura de
   7,1%, reversível apenas com nova coleta. Um rótulo genérico de "sem modelo"
   apagaria essa diferença e faria a equipe reabrir periodicamente um caso já
   fechado.
5. Corrigir o rótulo de confiabilidade para comparar contra o `X_train` real.
6. Corrigir a docstring de `src/scripts/export_models.py`, que afirma reproduzir o
   pipeline dos notebooks. Isso deixou de ser exato quando o exportador passou
   a normalizar `material_coil_support` também no Random Forest, o que o
   notebook de RF não faz. Enquanto a docstring não disser isso, uma reauditoria
   feita pelo notebook vai divergir deste relatório sem que ninguém entenda por
   quê.

### P1 — alinhar seleção do usuário à evidência disponível

1. Ao selecionar áreas/sensores, resolver primeiro seus modelos de `key_area` e
   filtrar as opções seguintes pelas combinações efetivamente suportadas por
   esses modelos. Para múltiplas áreas, usar a interseção das whitelists e
   informar quando ela for vazia.
2. Exibir “configuração não observada” antes de enviar a consulta. Se o produto
   permitir extrapolação, exigir confirmação e mostrar a distância/variáveis
   divergentes.
3. Tratar os dois aliases separadamente, porque têm status diferentes:
   - `Aluminium Plate` → **nada a decidir agora.** A equipe já decidiu colapsar
     (`hipotese_material_sem_correcao_E17.md`), com justificativa registrada. A
     única pendência é a confirmação com o parceiro que aquele documento já
     prevê. Reabrir isso sem dado novo é retrabalho.
   - `Open - Updated` → **decidir.** Está colapsado dentro de um dicionário de
     *grafias*, mas descreve uma geometria distinta ("aberta com rasgos") e tem
     674 observações. Ou existe uma justificativa física para tratá-lo como
     `Open`, e ela precisa ser registrada como decisão, ou os notebooks e o
     exportador devem passar a tratá-lo como categoria própria e os modelos
     precisam ser retreinados. Hoje não há registro de nenhuma das duas coisas.

### P1 — preservar a modelagem por `key_area` e rever sua cobertura de dados

1. Manter um modelo por `key_area`, conforme a decisão técnica validada, e
   medir antes do treino quanto cada alvo contribui para a perda de linhas no
   complete-case compartilhado. Qualquer tratamento alternativo de nulos deve
   preservar essa fronteira por área e ser validado experimentalmente.
2. Para `IPC Comp`, suspender afirmações de cobertura ampla até revisar por que
   32 linhas foram eliminadas e se 16 linhas de ajuste sustentam 22 alvos
   modelados/37 saídas de sensor dentro do modelo da área.
3. Manter métricas no nível do modelo de `key_area` e detalhamento por saída de
   sensor. Uma média da área, isoladamente, pode esconder sensores não cobertos
   e regiões do espaço categórico sem suporte.

## Critério de aceite recomendado

Uma versão seguinte só deve ser considerada segura quando:

- todo sensor selecionável estiver mapeado para uma saída do modelo de sua
  `key_area`, ou estiver explicitamente marcado como não previsível;
- toda área omitida vier acompanhada de erro/aviso visível e estruturado;
- a confiabilidade for calculada contra o conjunto que realmente ajustou o
  modelo;
- a UI diferenciar, por modelo de `key_area`, combinação treinada, vizinha e
  fora de domínio;
- testes cobrirem cada valor não mapeado de `IPC Comp` e os três sensores sem
  saída;
- o relatório for regenerado e revisado sempre que o split, a limpeza, o
  catálogo ou os artefatos mudarem;
- cada sensor sem saída de modelo carregar, no catálogo, a razão pela qual não
  tem — decisão de descarte ou cobertura insuficiente — para que a distinção
  sobreviva à próxima rodada de revisão.

## Fontes auditadas

- `src/scripts/export_models.py`
- `src/scripts/audit_training_coverage.py`
- `src/backend/app/predictors/real.py`
- `src/backend/data/variable_options.json`
- `src/backend/data/sensor_registry.json`
- `src/backend/models/manifest.json`
- `data/mainback_data.csv`
- `data/coil_temps_data.csv`
- `data/main_vent_sys_data.csv`
- `data/ipc_cooling_data.csv`
- `data/ipc_comp_data.csv`
- `data/ct_knobs_data.csv`
- `data/oven_hmi_data.csv`
