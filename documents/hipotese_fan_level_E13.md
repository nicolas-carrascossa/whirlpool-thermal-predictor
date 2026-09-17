# Hipótese F3 — fan_level colapsado a 3 níveis (E13)

Extraído de `documents/relatorio_experimentos_v2.md` (seção E13 do sweep de experimentos do modelo GB por área), referente ao card #171.

## E13 — separar a configuração 22 por velocidade do ventilador (`fan_level`)

**Motivação.** O E12 mostrou que a config 22 (`Pyro`/`Closed housing`/`Aluminium`,
5 runs: 57, 60, 61, 62, 63) mistura 5 condições físicas distintas sob um único
rótulo — o `reason` de cada run descreve velocidades de ventilador diferentes
("Blower On", "Blower On Medium", "Blower On High", "Broil wo Cookitop",
"Broil wo Cookitop and fan on low") — e que excluí-la do treino melhora IPC
Comp e Oven HMI dentro do IC95%, mas às custas de descartar dado. Este
experimento testa a alternativa: **não descartar, separar** — tratar
`fan_level` como uma 8ª variável categórica, de modo que a config 22 vire até
5 configs distintas em vez de uma média borrada.

**De onde vem `fan_level`.** É a mesma ideia do E1, extraída por regex do
texto livre de `reason` — **não é uma variável de ensaio registrada**. Das 56
runs, só **8 têm `fan_level` diferente de "NA"**: as 5 da config 22 (on,
medium, high, NA, low) e mais 3 fora dela (run 35 = double flow; runs
73/74/75 = 16 CFM). Todas as demais 48 runs ficam com `fan_level="NA"`.
*Correção de bug*: `parse_reason_flags_min` (`gb_experimentos_v2.py`)
classifica a run 57 ("Aluminium Plate Pyro Blower On") como `low` em vez de
`on`, porque a substring `"low"` casa dentro de "b**low**er" e o `elif` de
`low` é testado antes do de `"blower on"`. Esse arquivo não pode ser alterado
(fora de escopo), então este experimento reimplementa a extração em
`parse_fan_level_fixed` (dentro de `gb_experimentos_v2_fan.py`, script novo)
usando `\bhigh\b`/`\bmedium\b`/`\blow\b` com fronteira de palavra, que não
casam dentro de "blower"/"flow". Todos os números abaixo já usam a versão
corrigida (run 57 → `on`).

**Três formas de olhar para o resultado — nenhuma sozinha é suficiente:**

1. **RAW**: cada variante avaliada no seu próprio LOGO. Simples, mas as
   configs não são as mesmas entre variantes (número e composição mudam), e
   configs "singleton" de `fan_level` (um valor visto uma única vez, ou seja,
   impossível de aprender em Leave-One-Group-Out) entram no teste e inflam o
   MAE de área inteira mesmo quando o resto do dado não piorou.
2. **RECONCILIADA**: cada config dividida é reagrupada na config original
   (média das previsões dos membros do split) e comparada ao par
   real/`pred` de R na mesma config — bootstrap sobre as 32 configs
   originais. **Otimista**: a média entre 2–5 previsões de splits raros
   suaviza exatamente o erro grande que o RAW mostra, escondendo que
   splits individuais são ruins.
3. **LIMPA (C)**: restrita às configs originais **intocadas** por qualquer
   variante (nenhum run membro teve relabel de material nem `fan_level` ≠
   "NA") — comparação 1:1 estrita, sem nenhuma média. Responde "conhecer
   `fan_level`/material de **outras** configs ajuda ou atrapalha a previsão
   das configs que **não mudaram**?" — é o teste mais rigoroso porque
   isola o efeito de composição/regularização do efeito de resolver a
   ambiguidade da própria config 22.

**Variantes e configs resultantes** (loader `agregar_por_config`, run-level,
7 vars cruas + `fan_level`; ver nota sobre esse loader no §2):

| Variante | Descrição | n_configs | das quais "limpas" |
|---|---|---|---|
| R | referência: 7 vars cruas (sem relabel) | 32 | 32 |
| F1 | R + `fan_level` (8ª var) | 37 | 30 |
| F2 | material reclassificado (E2-c) + `fan_level` | 38 | 30 |
| F3 | F2 com `fan_level` colapsado a 3 níveis | 36 | 30 |
| F4 | vars de F2, runs da config 22 **excluídos** (E12) | 33 | 30 |

F3 colapsa os 6 níveis em `{NA, low_or_on, medium_or_high}`: `low`/`on`/`cfm16`
→ `low_or_on` (vazões baixas/nominal); `medium`/`high`/`double` →
`medium_or_high` (vazões elevadas) — escolha por ordem de grandeza de vazão,
não validada fisicamente. As 30 configs "limpas" são as mesmas nas 4
variantes (as 2 configs restantes, além da 22, contêm os runs 35/73/74/75).

**1) RAW — MAE por área, LOGO próprio de cada variante** (não comparável
linha a linha):

| Área | R (32) | F1 (37) | F2 (38) | F3 (36) | F4 (33) |
|---|---|---|---|---|---|
| Coil Temps | 10.15 | 9.83 | 9.16 | 9.22 | 8.79 |
| IPC Comp | 5.14 | 4.82 | 4.41 | 4.09 | 3.88 |
| Mainback | 3.31 | 6.10 | 5.97 | 4.35 | 3.61 |
| IPC Cooling | 3.82 | 3.82 | 3.52 | 3.32 | 2.83 |
| CT Knobs | 2.22 | 3.80 | 3.58 | 2.53 | 2.07 |
| Oven HMI | 2.25 | 3.20 | 3.11 | 2.43 | 1.89 |
| Main Vent Sys | 2.34 | 4.42 | 4.24 | 3.15 | 2.27 |

**2) RECONCILIADA — diff (V−R) [IC95%] sobre as 32 configs originais em
comum:**

| Área | MAE R | F1 | F2 | F3 | F4 (n=31)⁽¹⁾ |
|---|---|---|---|---|---|
| Coil Temps | 10.15 | -0.75 [-2.78, 0.52] | -1.38 [-3.42, -0.14] | -1.17 [-2.97, 0.02] | **-0.86 [-1.56, -0.14]** |
| **IPC Comp** | 5.14 | **-0.80 [-2.17, -0.05]** | **-1.15 [-2.70, -0.33]** | **-1.19 [-2.71, -0.36]** | **-0.58 [-0.83, -0.35]** |
| IPC Cooling | 3.82 | **-0.82 [-2.04, -0.12]** | **-1.12 [-2.36, -0.36]** | **-1.10 [-2.33, -0.35]** | **-0.55 [-0.86, -0.25]** |
| CT Knobs | 2.22 | 0.09 [-0.53, 0.67] | -0.13 [-0.71, 0.36] | -0.19 [-0.69, 0.22] | -0.07 [-0.23, 0.11] |
| Main Vent Sys | 2.34 | 0.20 [-0.32, 0.78] | 0.10 [-0.35, 0.54] | 0.14 [-0.11, 0.49] | 0.01 [-0.08, 0.11] |
| Mainback | 3.31 | 0.19 [-0.40, 0.98] | 0.19 [-0.42, 0.94] | 0.08 [-0.35, 0.63] | 0.09 [-0.18, 0.33] |
| Oven HMI | 2.25 | -0.21 [-0.76, 0.23] | -0.27 [-0.80, 0.11] | -0.27 [-0.77, 0.03] | -0.15 [-0.34, 0.01] |

⁽¹⁾ *Correção*: o F4 exclui os 5 runs da config 22 inteiramente, então essa
config **não existe** em F4 — a versão anterior deste relatório comparava
32 configs "em comum" por um bug de junção (reindexação silenciosa criava
`NaN`s tratados como zero); corrigido para inner join real: **31** configs.

**3) LIMPA — diff (V−R) [IC95%] só nas 30 configs originais intocadas,
comparação 1:1 (sem nenhuma média):**

| Área | MAE R (limpo) | F1 | F2 | F3 | F4 |
|---|---|---|---|---|---|
| Coil Temps | 9.63 | 0.12 [-0.38, 0.77] | -0.61 [-1.28, -0.01] | -0.50 [-1.16, 0.16] | **-0.94 [-1.71, -0.23]** |
| **IPC Comp** | 4.62 | **-0.16 [-0.31, -0.02]** | **-0.49 [-0.77, -0.24]** | **-0.56 [-0.93, -0.28]** | **-0.59 [-0.85, -0.36]** |
| IPC Cooling | 3.32 | **-0.29 [-0.54, -0.07]** | **-0.55 [-0.93, -0.24]** | **-0.53 [-0.90, -0.21]** | **-0.53 [-0.87, -0.22]** |
| CT Knobs | 2.07 | 0.34 [0.00, 0.83] | 0.10 [-0.18, 0.46] | 0.03 [-0.23, 0.35] | -0.06 [-0.22, 0.13] |
| **Main Vent Sys** | 2.29 | **0.38 [0.04, 0.88]** | **0.27 [0.00, 0.61]** | 0.20 [-0.01, 0.53] | 0.02 [-0.08, 0.12] |
| Mainback | 3.17 | 0.37 [-0.14, 1.10] | 0.36 [-0.17, 1.02] | 0.22 [-0.18, 0.71] | 0.08 [-0.23, 0.34] |
| Oven HMI | 2.16 | 0.02 [-0.21, 0.31] | -0.05 [-0.25, 0.16] | -0.07 [-0.19, 0.06] | -0.15 [-0.36, 0.01] |

Negrito = IC95% inteiramente de um lado de zero (verde nas figuras =
melhora fora do IC; vermelho = piora fora do IC).

**A visão RECONCILIADA é otimista e esconde uma piora real.** Em nenhuma área
o IC reconciliado fica inteiramente acima de zero — mas na visão LIMPA,
**Main Vent Sys piora fora do IC em F1 (+0.38 [0.04, 0.88]) e em F2 (+0.27
[0.00, 0.61])**, isto é: mesmo nas 30 configs que **não mudaram**, adicionar
`fan_level`/relabel piora Main Vent Sys de forma estatisticamente
detectável — não é ruído de amostragem, é um efeito real de composição
(mais uma variável categórica pouco informativa para essa área dilui o
sinal). A média de reconciliação (que mistura essas 30 configs estáveis com
os splits voláteis) empurra o IC de volta para dentro de zero e mascara isso.

**Quanto da piora RAW é só configs singleton (não aprendíveis em LOGO)?**
Comparando ΔRAW (RAW F2 − RAW R) com ΔLIMPO (mesma diferença, só nas 30
configs intocadas):

| Área | ΔRAW (F2−R) | ΔLIMPO (F2−R) | % do gap RAW explicado por configs tocadas | Piora real nas limpas? |
|---|---|---|---|---|
| CT Knobs | +1.36 | +0.10 (ns) | ~92% | não |
| Main Vent Sys | +1.90 | **+0.27 (sig.)** | ~86% | **sim, pequena (0.27 °C)** |
| Mainback | +2.66 | +0.36 (ns) | ~86% | não |
| Oven HMI | +0.85 | -0.05 (ns, melhora) | 100%+ | não |

MAE bruto nas 8 configs tocadas de F2 (sem comparação com R, que não as tem
divididas): CT Knobs 8.87, Coil Temps 9.88, IPC Comp 5.85, IPC Cooling 6.36,
Main Vent Sys 10.55, Mainback 15.04, Oven HMI 6.83 °C — muito acima do MAE nas
configs limpas (2–4 °C), confirmando que a maior parte da piora RAW vem de
splits vistos uma única vez no treino (não aprendíveis em LOGO), exceto em
Main Vent Sys, onde há também uma piora real e pequena nas configs
inalteradas.

**Decisão (regra: adotar só se ≥1 área melhora fora do IC nas configs LIMPAS
E nenhuma área piora fora do IC na visão LIMPA — ou a piora RAW for
inteiramente atribuível a configs `fan_level` singleton, quantificada
acima).**

- **F1 e F2 NÃO cumprem a regra**: ambos pioram Main Vent Sys fora do IC
  **na comparação limpa** (não é artefato de singleton — é o mesmo conjunto
  de 30 configs em R e em V), então a piora não pode ser descartada como
  "só ruído de config rara". F2 é o caso limítrofe (IC [0.00, 0.61], quase
  toca zero, magnitude pequena, 0.27 °C) — não é um "não" confortável, mas
  também não justifica ignorar.
- **F3 cumpre a regra**: `fan_level` colapsado a 3 níveis melhora **IPC
  Comp** (-0.56 [-0.93, -0.28]) e **IPC Cooling** (-0.53 [-0.90, -0.21]) fora
  do IC nas configs limpas, e Main Vent Sys fica dentro do IC (0.20
  [-0.01, 0.53], toca zero mas não cruza) — nenhuma área piora fora do IC. É
  a variante recomendada entre as que não descartam dado.
- **F4** (excluir a config 22 inteira) é a mais forte: Coil Temps, IPC Comp
  e IPC Cooling melhoram fora do IC mesmo nas configs limpas, e nada piora —
  mas descarta 5 runs, então só é preferível a F3 se a qualidade desses runs
  for considerada inaceitável (ver E12).

**"Primeira melhoria de área com IC95% fora de zero obtida sem descartar
dados" — mantido, mas restrito a IPC Comp e IPC Cooling em F3** (e também
presente, com a ressalva de Main Vent Sys, em F2): os ganhos nessas duas
áreas sobrevivem na comparação mais rigorosa (LIMPA, 1:1, sem média), não são
artefato da reconciliação otimista. Oven HMI **não** entra nessa frase: seu
IC toca zero em toda visão (nunca significativo), diferente do E12
(exclusão), onde Oven HMI melhorava fora do IC.

**Adotar:** **F3** (relabel de material E2-c + `fan_level` em 3 níveis) —
melhora IPC Comp e IPC Cooling fora do IC mesmo na comparação mais rigorosa,
sem descartar dado e sem piora detectável em nenhuma área. F2 (6 níveis) é
alternativa próxima, mas carrega uma piora pequena e estatisticamente real em
Main Vent Sys nas configs inalteradas — prefira F3. Incorporar como próxima
versão do modelo, condicionado a `fan_level` virar variável registrada
(abaixo).

**Limitação para produção.** O back-end hoje não recebe `fan_level` do
usuário (`MODEL_FIELDS` em `src/backend/app/data.py` tem 5 variáveis; nem as
7 completas incluem isso) — `fan_level` só existe porque foi retro-extraído
do texto livre de `reason` de 8 runs específicas do laboratório. Para usar
esse ganho em produção, `fan_level` precisa virar uma **variável de ensaio
registrada** (formulário, não texto livre), o que se conecta à checklist de
ensaios recomendados do E8: ao planejar as próximas rodadas de laboratório,
registrar explicitamente a velocidade/vazão do ventilador como campo
estruturado, não deixar para inferir de `reason` depois.

**Mudanças recomendadas no notebook de tratamento** (não aplicadas aqui — é
`tratamento_final_dos_dados.ipynb`, fora do escopo desta tarefa):
(1) reclassificar `material_coil_support` a partir de `reason` (E2-c, já
recomendado); (2) adicionar uma coluna `fan_level` com extração por fronteira
de palavra (sem o bug de substring `"low"`/`"blower"`, corrigido aqui em
`parse_fan_level_fixed`), preferencialmente colapsada a 3 níveis (F3); (3)
para runs com `fan_level` distinto sob a mesma config física (como a 22),
**manter os runs como configs distintas** em vez de fazer a média entre
condições de ventilador diferentes — é exatamente o que causa o borrão hoje.

Figura: `assets/graficos/gb_v2_E13_fan_level_por_area.png` — três painéis: (A)
RAW, MAE por área, R vs. F1–F4; (B) RECONCILIADA, diff F2−R com IC95%
bootstrap sobre as 32 configs originais (otimista); (C) LIMPA, diff F2−R com
IC95% só nas 30 configs intocadas, 1:1, sem média (rigorosa — mostra Main
Vent Sys em vermelho, piora fora do IC, invisível no painel B).

Arquivos: `notebooks/gb_experimentos_v2_fan.py` (não modifica os notebooks
existentes; reimplementa a extração de `fan_level` corrigida); `data/gb_v2_E13_resumo.csv`
(MAE por área/variante, RAW), `data/gb_v2_E13_resumo_ic.csv` (diferenças
RECONCILIADAS + IC95%), `data/gb_v2_E13_resumo_limpo.csv` (diferenças LIMPAS
+ IC95% nas 30 configs intocadas, e MAE bruto nas configs tocadas por
variante), `data/gb_v2_E13_oof.csv` (previsões fora da amostra de todas as
variantes).

