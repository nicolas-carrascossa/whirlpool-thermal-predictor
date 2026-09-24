# Hipótese — F3 sem a correção de material (E17)

Investigação de acompanhamento à hipótese F3 (E13).

**Status: DECISÃO ATUALIZADA.** Apesar do resultado estatístico deste
experimento apontar para manter a correção (ver abaixo), o grupo decidiu
**não usar mais a reclassificação de material** (`Aluminium` →
`Aluminium Plate` / `Plastic` → `Plastic Plate`) na variante F3, a partir de
agora. Motivo: o glossário oficial do parceiro só documenta 2 níveis
(Aluminium/Plastic) — não temos confirmação de que "Aluminium Plate" seja
uma configuração física real, e não é boa prática apresentar/produzir algo
sobre uma premissa não confirmada. **Isso será levado à sprint review e
confirmado com o parceiro** antes de decidir se volta a ser adotado.
As planilhas (`data/*_data_f3.csv`) e o notebook já foram atualizados para
refletir essa decisão (só `fan_level`, material como veio dos dados).

## Hipótese

O F3 usa duas correções: `fan_level` (E13) e `material_coil_support`
reclassificado a partir do texto livre do `reason` (E2-c) — 9 runs cujo
`reason` menciona "Aluminium Plate" eram rotulados só como "Aluminium" e
foram corrigidos para uma categoria nova.

Ao revisar o **glossário oficial do parceiro** (`Glossário - Parceria
Whirlpool & Inteli.pdf`), a variável `Material Coil Support` está
documentada com só **2 níveis: Aluminium e Plastic**. Não existe
"Aluminium Plate" nem "Plastic Plate" como nível formal do fatorial.

Hipótese do grupo: se não há configuração física real distinta, não
deveria haver diferença de temperatura atribuível a essa correção — logo,
remover a correção de material do F3 (mantendo só `fan_level`) deveria ser
neutro ou inofensivo.

## Método

- Três variantes: **R** (referência, 32 configs, sem nenhuma correção),
  **F3** (o F3 atual: material corrigido + `fan_level` 3 níveis, 36 configs),
  **F3_sem_material** (`fan_level` 3 níveis, mas `material_coil_support`
  como veio nos dados, sem relabel, 35 configs).
- Visão **LIMPA** (1:1, só as 30 configs originais intactas nas 3
  variantes) — o mesmo padrão rigoroso do E13, IC95% bootstrap por config.
- Repetido em **4 seeds do modelo** (`gb.SEMENTE` = 42, 7, 123, 2024) para
  checar se a conclusão é robusta ou depende de sorte de uma rodada — a
  seed do bootstrap do IC ficou fixa, só a aleatoriedade interna do GB
  (`subsample=0,8`) variou.

## Resultado

Contagem de quantas das 4 seeds confirmam melhora (IC inteiro < 0) ou piora
(IC inteiro > 0) real, por área:

| Área | F3 completo | F3 sem material |
|---|---|---|
| IPC Comp | melhora em 4/4 seeds (Δ médio −0,53) | melhora em 4/4 seeds, mas mais fraco (Δ médio −0,19) |
| IPC Cooling | melhora em 4/4 seeds | melhora em só 3/4 seeds |
| CT Knobs | nunca piora | **piora real em 2/4 seeds** |
| Main Vent Sys | nunca piora | **piora real em 1/4 seeds** |
| Coil Temps, Mainback, Oven HMI | sem mudança nas duas variantes | sem mudança nas duas variantes |

MAE absoluto por área (seed=42, visão LIMPA, 30 configs), R vs. F3 completo
(descontinuado) vs. F3 atual (sem correção de material):

![Efeito de remover a correção de material](../assets/graficos/decisao_remover_material_mae.png)

IC 95% da diferença por área, nas 4 seeds do modelo (verde = melhora real,
cinza = sem mudança, vermelho = piora real):

![IC95% multi-seed, F3 completo vs. F3 sem material](../assets/graficos/gb_v2_E17_material_multiseed.png)

## Interpretação

O resultado é o oposto do esperado pela hipótese: remover a correção de
material **não foi neutro — piorou e desestabilizou** o modelo. Isso não
prova que "Aluminium Plate" é um nível físico real (só o parceiro pode
confirmar isso), mas prova que **o rótulo carrega sinal preditivo real**,
seja porque:

1. É de fato uma variante física que o glossário não documentou nesse
   slide, ou
2. O texto que gera o rótulo está correlacionado com outro fator físico
   não capturado (ex.: eram os runs mais recentes/melhor documentados),
   funcionando como proxy acidental.

## O que a estatística recomendaria, isoladamente

Só olhando pro IC95%, a resposta seria manter a correção — ela produz o
ganho mais forte e mais seguro (nenhuma área piora). A pendência já
registrada no E13 (seção 8 do resumo: "confirmar com a Whirlpool se os runs
44–63 usaram placa de alumínio") ficaria **mais importante, não menos** —
o modelo dependeria desse sinal pra manter o ganho completo em IPC Comp e
IPC Cooling, e pra não piorar CT Knobs e Main Vent Sys.

## Decisão final do grupo

**Não usar a correção de material por enquanto.** Não é uma decisão
estatística — é uma decisão de não assumir como verdade uma reclassificação
que o glossário oficial do parceiro não confirma. Ainda sobra ganho real em
IPC Comp (todas as seeds) e na maioria das seeds em IPC Cooling, só que
mais fraco e com risco novo de piora em CT Knobs/Main Vent Sys em parte das
seeds — um custo aceito conscientemente até a confirmação do parceiro.
**Esse ponto será apresentado na sprint review e a resposta da Whirlpool
pode reverter essa decisão.**

## Arquivos

- Script: `notebooks/gb_experimentos_v2_sem_material_E17.py`
- Dados: `data/gb_v2_E17_ic_multiseed.csv`
- Figura: `assets/graficos/gb_v2_E17_material_multiseed.png`
- Fonte da dúvida: `Glossário - Parceria Whirlpool & Inteli.pdf` (páginas 2-3,
  seção "Material Coil Support")
