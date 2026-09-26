# Hipótese e teste — one-hot encoding no Gradient Boosting

Consolida os testes de codificação (one-hot vs. ordinal) feitos sobre o
modelo GB e a decisão final adotada no notebook oficial.

## Hipótese

Codificação **ordinal** (`Closed=0, Open=1, ...`) assume uma ordem entre
categorias que não existe fisicamente. **One-hot** (uma coluna binária por
categoria) não faz essa suposição. A pergunta: isso melhora o modelo?

## Testes feitos (LOGO + IC95% bootstrap por config)

| Teste | Onde | Resultado |
|---|---|---|
| One-hot só em `fan_level` | F3 (com correção de material, versão antiga) | Nenhuma área melhora; direção de piora em 6/7 áreas (nenhuma significativa) |
| One-hot completo (todas as 8 variáveis) | F3 com correção de material | Ganho real em Coil Temps (Δ −0,90 °C, 3/3 seeds) — mas o ganho **desapareceu inteiramente** quando a correção de material foi removida (ver abaixo) |
| One-hot completo (todas as 7 variáveis) | R (referência, sem `fan_level`) | Empate técnico em todas as 7 áreas, todas as seeds — confirma sob LOGO+IC o resultado que a bancada antiga já tinha visto sob protocolo mais fraco (4,15 vs 4,22 °C) |

## Por que o ganho de Coil Temps sumiu

A correção de material criava 4 categorias em `material_coil_support`
(Aluminium, Aluminium Plate, Plastic, Plastic Plate) ordenadas
alfabeticamente no ordinal — uma proximidade falsa que o one-hot corrigia.
Sem a correção (decisão tomada por falta de confirmação do parceiro sobre
esse nível extra — ver hipótese do F3), a coluna volta a ter só 2
categorias, e com 2 categorias ordinal e one-hot carregam a mesma
informação. O ganho nunca foi sobre codificação em geral: era efeito
colateral de uma correção que decidimos não usar mais.

## Decisão final

O notebook oficial (`Grad_Boosting_Regre.ipynb`) foi atualizado para usar
**one-hot** nas 7 variáveis originais (sem `fan_level`/F3, sem correção de
material), mesmo com o resultado sendo estatisticamente neutro. Motivo: sem
custo estatístico (empate confirmado), one-hot é mais correto em princípio
— não força uma ordem entre categorias que não existe fisicamente.

Mudanças aplicadas:
- Codificação: `codificar_ordinal` → `codificar_onehot` (`pd.get_dummies`).
- `material_coil_support` normalizado para 2 níveis (Aluminium/Plastic),
  batendo com o glossário oficial do parceiro — 1 run (48) já vinha rotulado
  "Aluminium Plate" no dado bruto, antes de qualquer correção nossa.
- Função de importância de variáveis ajustada para somar a importância das
  colunas one-hot de volta por variável original (senão quebrava: esperava
  1 coluna por variável, one-hot gera várias).
- Sem `fan_level`: essa investigação é separada (ver hipótese do F3),
  pendente de confirmação do parceiro.

## Arquivo do commit

- `notebooks/Grad_Boosting_Regre.ipynb` (único arquivo — CSVs são
  ignorados pelo git globalmente)
