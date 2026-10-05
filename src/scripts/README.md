# src/scripts/

## build_registry.py

Le `data/dataset_pre_processado.csv` e gera os arquivos de dados usados pelo
front-end (mock local da Fase 0/1), em `src/frontend/src/data/`:

- `sensor_registry.json` — os 77 sensores (tc_number, tc_name, key_area,
  active_limit_c, is_monitor).
- `variable_options.json` — opcoes canonicas das 7 variaveis de configuracao
  do ensaio (blower_direction, housing, board_position, run_case, losses,
  deflector_hole, material_coil_support).
- `sensor_stats.json` — media/desvio/min/max de temperatura por sensor (geral
  e por `run_case`) e por `key_area`, alem da configuracao de cada um dos 56
  runs do dataset (usado pelo mock para saber se uma configuracao consultada
  existe no conjunto de treino).

A normalizacao de grafia (ex.: "To Back" -> "To back") segue exatamente o que
foi decidido nos notebooks `notebooks/tratamento_final_dos_dados.ipynb` e
`notebooks/expl_preprocessamenro_hipote.ipynb` — o script nao inventa nenhuma
grafia canonica nova.

### Como rodar

A partir da raiz do repositorio, usando o Python do ambiente virtual do
projeto (3.13, com pandas):

```powershell
.\.venv\Scripts\python.exe src\scripts\build_registry.py
```

O script imprime um resumo (contagem de sensores por area, opcoes por
variavel, combinacoes de configuracao entre os runs) e falha com um
`AssertionError` se encontrar uma inconsistencia estrutural (numero de
sensores diferente de 77, sensor com mais de uma key_area/limite, run com mais
de uma combinacao de configuracao, etc.).

Nao precisa de nenhuma dependencia alem de `pandas` (ja presente no `.venv`).
