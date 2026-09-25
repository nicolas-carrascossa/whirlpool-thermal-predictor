# Hipótese — one-hot em todas as variáveis, no F3 e na referência R (E18/E19)

Investigação de acompanhamento à hipótese F3 (E13) e à decisão de não usar
a correção de material (E17). Fecha a lacuna citada na bancada antiga: one-hot
nas 7 variáveis originais só tinha sido testado sob RepeatedKFold (protocolo
com vazamento, já abandonado), nunca com LOGO+IC.

## Hipótese

Depois de ver que one-hot só em `fan_level` não ajudou (E16) e que one-hot
completo já tinha dado empate técnico sob protocolo fraco (4,15 vs 4,22 °C),
faltava testar **one-hot em todas as variáveis ao mesmo tempo**, com o
protocolo rigoroso (LOGO + IC95%), em duas bases: o F3 atual (7 vars +
`fan_level`) e a referência R (só as 7 vars originais).

## Método

- Mesma estrutura dos testes anteriores: LOGO, comparação 1:1 direta por
  `config_id` (a composição das configs não muda entre ordinal e one-hot,
  só a codificação), IC95% bootstrap por config.
- Rodado em 3 seeds do modelo (42, 7, 123).
- **E18**: base F3 atual (35 configs, 8 variáveis → 32 colunas em one-hot).
- **E19**: base R (32 configs, 7 variáveis → 29 colunas em one-hot).

## Resultado — E18 (F3: fan_level, sem material-plate)

| Área | Melhora nas 3 seeds? | Δ médio |
|---|---|---|
| IPC Comp | não — **piora real em 1/3 seeds** | +0,34 |
| Coil Temps, IPC Cooling, Mainback, CT Knobs, Oven HMI, Main Vent Sys | não, sem mudança | pequeno, sem direção consistente |

Nenhuma área melhora. IPC Comp piora de forma real numa das 3 seeds e fica
perto da piora nas outras duas.

## Resultado — E19 (R: só as 7 variáveis originais)

| Área | Resultado nas 3 seeds |
|---|---|
| Todas as 7 | sem mudança real em nenhuma (todos os IC cruzam zero) |

Empate técnico confirmado — bate com o resultado da bancada antiga
(4,15 vs 4,22 °C), agora validado sob LOGO+IC.

## Achado extra (não previsto): o resultado do E18 muda dependendo do material

O E18 foi rodado duas vezes: uma vez **antes** da decisão de tirar a
correção de material (F3 com 36 configs, material corrigido) e uma vez
**depois** (F3 com 35 configs, sem correção — o resultado acima). Na
primeira rodada, one-hot completo dava um ganho real e forte em **Coil
Temps** (Δ −0,90 °C, 3/3 seeds). Esse ganho **desapareceu inteiramente**
na segunda rodada.

Explicação: a correção de material criava 4 categorias em
`material_coil_support` (Aluminium, Aluminium Plate, Plastic, Plastic
Plate) ordenadas alfabeticamente no ordinal — uma proximidade falsa que o
one-hot corrigia. Sem a correção, a coluna volta a ter só 2 categorias
(Aluminium, Plastic), e com 2 categorias ordinal e one-hot carregam a
mesma informação — não sobra nenhuma distorção pra corrigir. Ou seja: o
ganho do one-hot nunca foi sobre codificação em geral, era um efeito
colateral específico da correção de material que decidimos não usar mais.

## Decisão

**Manter ordinal, tanto em R quanto no F3 atual.** Nenhum cenário testado
(E16, E18, E19, com ou sem `fan_level`, com ou sem material corrigido) deu
ganho real e seguro de one-hot sobre ordinal.

## Nota de desatualização

O documento `hipotese_onehot_fan_level_E16.md` (one-hot só em `fan_level`)
foi escrito **antes** da decisão de tirar a correção de material — os
números lá são do F3 antigo (36 configs, material corrigido). A conclusão
(não adotar) provavelmente se sustenta, mas os números não foram
re-verificados na base atual.

## Arquivos

- Scripts: `notebooks/gb_experimentos_v2_onehot_total_E18.py`,
  `notebooks/gb_experimentos_v2_onehot_total_R_E19.py`
- Dados: `data/gb_v2_E18_ic_multiseed.csv`, `data/gb_v2_E19_ic_multiseed.csv`,
  `data/comparativo_3vias_r2_seed42.csv` (MAE + R² das 4 variantes numa seed)
- Figuras: `assets/graficos/gb_v2_E18_onehot_total_multiseed.png`,
  `assets/graficos/gb_v2_E19_onehot_total_R_multiseed.png`,
  `assets/graficos/comparativo_3vias_onehot.png`,
  `assets/graficos/comparativo_3vias_r2.png`,
  `assets/graficos/f3_ordinal_mae_r2.png`,
  `assets/graficos/r_onehot_vs_f3_ordinal.png`
