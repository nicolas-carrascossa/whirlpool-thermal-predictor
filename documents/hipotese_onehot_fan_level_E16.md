# Hipótese — one-hot só em `fan_level` (E16)

Investigação de acompanhamento à hipótese F3 (E13). Não altera a decisão do F3.

## Hipótese

O F3 codifica `fan_level` como ordinal: `NA=0, low_or_on=1, medium_or_high=2`. Isso
implica uma ordem (NA é "menos ventilador" que low) que não existe fisicamente —
`NA` significa "não sei", não "vazão zero". A hipótese era que **one-hot só
nessa coluna** (2 colunas binárias: `fan_low_or_on`, `fan_medium_or_high`,
mantendo as outras 7 variáveis em ordinal) resolveria essa distorção sem pagar
o custo de dimensionalidade de fazer one-hot em tudo (`losses` sozinha tem 14
categorias).

## Método

- Mesma base do F3 (36 configs, `agregar_por_config` com 7 vars + `fan_level`).
- Dois codificadores comparados: `F3_ordinal` (o F3 atual) vs. `F3_onehot`
  (ordinal nas 7 vars + one-hot em `fan_level`).
- LOGO nas mesmas 36 configs para os dois — comparação 1:1 direta por
  `config_id` (não precisa da visão "limpa/reconciliada" do E13 porque a
  composição das configs não muda, só a codificação de uma coluna).
- IC95% bootstrap por config, `gb_lr03` (parâmetros fixos, igual ao resto da
  bancada).

## Resultado

| Área | Δ MAE (onehot − ordinal) | IC 95% |
|---|---|---|
| Coil Temps | −0,09 | [−0,45; 0,25] |
| Oven HMI | +0,12 | [−0,01; 0,35] |
| CT Knobs | +0,15 | [−0,03; 0,40] |
| IPC Cooling | +0,20 | [−0,06; 0,64] |
| Mainback | +0,23 | [−0,03; 0,60] |
| IPC Comp | +0,28 | [−0,01; 0,77] |
| Main Vent Sys | +0,28 | [−0,02; 0,71] |

Nenhuma área melhora (nenhum IC inteiro < 0). Nenhuma piora de forma
estatisticamente certa (todos cruzam zero), mas a direção é consistente:
**6 das 7 áreas pioram**, com IPC Comp e Main Vent Sys quase cruzando pra
piora real (limite inferior do IC em −0,01 e −0,02).

## Por que não funcionou

`fan_level=medium_or_high` só existe em 2 das 36 configs. Uma coluna binária
dedicada a um valor tão raro dá à árvore uma variável fácil demais de usar
para "decorar" essas 2 configs específicas em vez de aprender um padrão que
generalize — um tipo leve de overfitting. O ordinal, ao empacotar os 3 níveis
numa única coluna, obriga a árvore a fazer um corte por "quantidade", que
aqui generalizou melhor apesar de logicamente menos "correto".

## Decisão

**Manter ordinal no F3.** A hipótese estava certa sobre o problema de
representação (NA não é ordinal), mas com tão poucos exemplos do nível raro,
a correção "mais correta" custou mais em variância do que ganhou em
precisão de representação.

## Arquivos

- Script: `notebooks/gb_experimentos_v2_onehot_fan_E16.py`
- Dados: `data/gb_v2_E16_oof.csv` (previsões), `data/gb_v2_E16_ic.csv` (IC por área)
- Figura: `assets/graficos/gb_v2_E16_onehot_fan_vs_ordinal.png`
