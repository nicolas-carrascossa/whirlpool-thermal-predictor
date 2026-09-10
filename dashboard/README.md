# Thermal Predictor — Dashboard (Whirlpool × Inteli)

Dashboard em Streamlit para engenheiros de qualidade/CFD consultarem a **temperatura estimada por sensor** de um fogão de piso (freestanding) a partir de uma configuração de projeto, sem precisar rodar uma simulação CFD completa nem um teste físico destrutivo.

> ⚠️ **Fase mock.** O modelo de Machine Learning ainda não está pronto. Toda a interface e as regras de negócio estão funcionando, mas as predições vêm de uma camada de placeholder determinística ([mock_data.py](mock_data.py)). Ver [Substituindo o mock pelo modelo real](#substituindo-o-mock-pelo-modelo-real).

## Como rodar

```bash
pip install -r dashboard/requirements.txt
cd dashboard
streamlit run app.py
```

A aplicação sobe em `http://localhost:8501`.

Dependências: `streamlit`, `pandas` e `openpyxl` (este último só para a exportação em Excel — sem ele, o botão de Excel é substituído por um aviso e o CSV continua funcionando).

> **Sem autenticação, por decisão do time.** A documentação do projeto lista login (RF06, RN11–RN13) como requisito, mas esta versão o deixa de fora deliberadamente — não há tela de login, não há senha, qualquer pessoa com o link acessa a consulta diretamente. Reavaliar antes de expor o dashboard fora de um ambiente interno controlado. O histórico de acessos (RF10) **existe**, mas sem autenticação por trás: identifica quem acessou pelo usuário do sistema operacional, não por uma conta autenticada — ver [access_log.py](access_log.py).

## Estrutura

| Arquivo | Responsabilidade |
|---|---|
| [app.py](app.py) | Interface Streamlit: formulário, resultados, exportação, histórico de acessos. |
| [business_rules.py](business_rules.py) | Validações e regras de exibição RN01–RN15 (exceto as de login, removido — ver nota acima). Não conhece Streamlit nem o modelo. |
| [mock_data.py](mock_data.py) | Domínio (parâmetros, áreas-chave, sensores, limites), o pipeline de pré-processamento, os modelos mock por país e a predição — RF12–RF14, RF17, RF18, RN16, RN17, RN20, RN21. Ver [Requisitos do software preditivo](#requisitos-do-software-preditivo-rf12rf19) abaixo. |
| [model_evaluation.py](model_evaluation.py) | Avaliação do modelo (mock) contra um conjunto de referência fixo — RF19, RN22, RN23. Independente do dashboard; não é importado por `app.py`. |
| [access_log.py](access_log.py) | Histórico de acessos (RF10), sem autenticação por trás — identifica pelo usuário do sistema operacional. |
| [styles.py](styles.py) | Guia de Estilo Whirlpool: paleta (`COLORS`), tipografia e CSS injetado (`inject_custom_css()`), rótulos e classes dos badges. Nenhuma outra parte do código declara cor hexadecimal solta. |
| [.streamlit/config.toml](.streamlit/config.toml) | Tema nativo do Streamlit (`primaryColor` etc.) — necessário além da CSS de `styles.py`: sem ele, componentes internos do Streamlit que a CSS não alcança por classe própria (tags do multiselect, ponto do radio, barra de progresso) ficam com o vermelho padrão do tema em vez do azul do guia. |
| `logs/access_log.csv` | Histórico de acessos (`access_log.py`), gerado em runtime. Não versionado. |
| `logs/model_metrics.jsonl` | Histórico de avaliações do modelo (`model_evaluation.log_metrics()`), gerado em runtime. Não versionado. |

Cada validação traz, em comentário, o código da regra de negócio que implementa (RN01…RN15), para rastreabilidade com a Seção 4.4 de [`documents/documentacao.md`](../documents/documentacao.md).

## Fluxo de uso

1. **Nova consulta** — para cada configuração: país (RN02, RN03) e os seis parâmetros obrigatórios (RN01). O botão "Gerar previsão" só habilita quando não há pendências, e as pendências ficam listadas na tela.
2. **Sensores** — multiselect de áreas-chave (limitado às sete já mapeadas) e dos sensores dentro delas; ao menos um é obrigatório (RN04). A seleção é comum a todas as configurações comparadas, para que a comparação seja sobre os mesmos sensores.
3. **Comparação** — "Adicionar outra configuração" gera até 4 configurações lado a lado (RF09). Cada uma é validada individualmente antes de ser exibida (RN10): uma configuração incompleta bloqueia a consulta, e uma que falhe na predição aparece como erro sem derrubar as demais.
4. **Resultados** — cards por sensor com temperatura + margem de erro sempre juntas (RN05), margem comparada ao critério de aceite de 10% (RN06, verde/vermelho), selo de confiabilidade (RN07), destaque para limite de engenharia excedido (RN09) e o aviso de CFD (RF20, RN15). Fora de domínio, o valor numérico é suprimido e substituído pela recomendação de rodar a simulação CFD completa (RN08). Quando há valor numérico, um segundo selo de **severidade** (Normal/Atenção/Vistoria/Crítico) reforça visualmente o quanto a predição se aproxima ou ultrapassa o limite de engenharia — ver [Guia de Estilo](#guia-de-estilo-cor-e-tipografia) abaixo.
5. **Exportação** — CSV (`;` como separador, decimal `,`, UTF-8 com BOM — abre direto no Excel pt-BR) e XLSX, incluindo obrigatoriamente a configuração consultada, a temperatura estimada, a margem de erro e o estado de confiabilidade (RN14).
6. **Histórico de acessos** — aba separada na barra lateral (RF10). Cada sessão nova é registrada automaticamente (usuário do sistema operacional + data/hora), sem pedir nada a quem está usando — não é login, é só um registro de uso.

## Guia de Estilo (cor e tipografia)

O visual segue o Guia de Estilo Whirlpool (paleta neutra + azul + verde/amarelo + os dois vermelhos de aviso definidos pela equipe, tipografia Nunito Sans / Open Sans), implementado inteiramente em [styles.py](styles.py) e injetado uma vez em `app.py` via `styles.inject_custom_css()`. Regra fixa do guia: **cor é informação** — branco/neutros são a estrutura da tela, azul é interface/medição, verde/amarelo/vermelho aparecem só nos estados da previsão e sempre com rótulo em texto, nunca como decoração.

- **Hierarquia tipográfica:** chapéu (Nunito Sans Bold, caixa alta) → título (Nunito Sans Light, azul central — usa `st.title()`, que já herda o estilo via a regra CSS genérica de `h1…h5`) → subtítulo (Open Sans Semibold, caixa alta) → rótulo de card → texto corrido → número em destaque.
- **Confiabilidade (RF07/RN07)** — os três estados do modelo (`interpolação` / `extrapolação moderada` / `fora de domínio`) usam o mesmo vocabulário de cor do guia (verde = ok, amarelo = atenção, vermelho = exige verificação), mapeados em `styles.RELIABILITY_BADGE_CLASS`.
- **Severidade (RN09)** — `business_rules.classify_severity()` classifica a predição em `normal` / `atencao` / `vistoria` / `critico` a partir da razão `temperatura / limite_de_engenharia` (cortes em 90% / 100% / 115%). **Isto é uma adição da equipe** para operacionalizar visualmente a RN09 com o vocabulário de cor do guia — os cortes numéricos são um ponto de partida de demonstração, não um critério de engenharia validado, e devem ser confirmados com a Whirlpool antes de qualquer uso além da demo. `business_rules.py` continua sem depender de Streamlit: só devolve a chave textual (`"normal"`, etc.); é `app.py` quem resolve o rótulo e a classe CSS via `styles.SEVERITY_LABELS`/`styles.SEVERITY_BADGE_CLASS`.
- **Centralização de cor:** nenhum arquivo além de `styles.py` deve conter cor hexadecimal solta — `app.py` sempre lê de `styles.COLORS` ou aplica uma classe CSS já definida lá.
- **Tema nativo (`.streamlit/config.toml`) além da CSS injetada** — botões, tags de multiselect, o ponto do radio button e a barra de progresso são desenhados pelo Streamlit com a cor de destaque (`primaryColor`) do tema, não por classes que a CSS de `styles.py` alcance sozinha. Sem o `config.toml`, esses elementos ficam com o vermelho padrão do Streamlit mesmo com toda a CSS certa — foi exatamente o bug corrigido nesta rodada. Os ícones do Streamlit (setas, olho de senha, "x" das tags) são glifos de uma fonte de ícones (Material Symbols): a CSS explicitamente poupa `[data-testid="stIconMaterial"]` da troca de fonte para Open Sans, ou eles renderizam como a palavra literal do glifo em vez do ícone.

Pontos em aberto que o guia não resolve e que valem confirmação antes de uma versão além de demonstração:
- Não há logo/marca Whirlpool ou Inteli no cabeçalho — o guia não definia área de proteção de marca para este dashboard.
- O guia é pensado para fundo branco dominante; não há modo escuro implementado (exigiria uma nova decisão de paleta).
- Os cortes de severidade (90%/100%/115%) e o mapeamento de confiabilidade → cor são leituras da equipe, não regras explícitas do guia — sinalizados nos comentários de `business_rules.py`.

## Requisitos do software preditivo (RF12–RF19)

A Seção 6.1.2 do documento de requisitos trata a "rotina de predição" como um software à parte do dashboard — usável programaticamente, independente da tela. Nesta fase, ela é inteiramente mock (não há modelo treinado), mas a estrutura abaixo já implementa o *mecanismo* de cada requisito, isolando exatamente onde o modelo real entra depois.

| Requisito | Onde | Status nesta fase |
|---|---|---|
| RF12 — rotina programática, independente do dashboard | `mock_data.predict()` (alias de `mock_predict()`) | ✅ Pronta a estrutura; mock por trás |
| RF13/RN03 — modelos separados por país | `mock_data.get_model()` / `_MockCountryModel` | ✅ Estrutura pronta (um "modelo" cacheado por país); não há pesos reais |
| RF14/RN17 — mesmo pré-processamento do treino antes de predizer | `mock_data.build_features()` | ✅ Pipeline real (valida domínio de cada campo); troque o *corpo* quando o pré-processamento de treino existir |
| RF15/RN18 — só bibliotecas open source | `requirements.txt` | ✅ Atende — `streamlit`, `pandas`, `openpyxl` |
| RF16/RN19 — dados carregados de fonte externa, não versionados | `.gitignore` da raiz + `mock_data.py` | ✅ Atende — nenhum dado real do parceiro está no repo; o mock gera dados sinteticamente |
| RF17/RN20 — retreinar sem alterar código | `mock_data.retrain_model()` | ⚠️ Placeholder explícito (`NotImplementedError`) — não há modelo para retreinar ainda, mas o ponto de entrada já existe e documenta o contrato |
| RF18/RN21 — predição em lote, item inválido não derruba os demais | `mock_data.predict_batch()` | ✅ Atende — cada item do lote é validado e processado isoladamente |
| RF19/RN22/RN23 — métricas de avaliação sobre dataset de referência, comparável entre versões | [model_evaluation.py](model_evaluation.py) | ✅ Mecanismo pronto (MAE, erro normalizado pela folga térmica, taxa de falso-negativo de segurança, log versionado); números são do mock, não do modelo real |

### Como substituir o mock pelo modelo real

Os pontos de troca ficam isolados em `mock_data.py`, comentados como "PONTO DE INTEGRAÇÃO":

- **`build_features()`** — troque o corpo pelo pré-processamento real (encoding categórico, normalização etc.), mantendo a assinatura `(config, sensor, country_code) -> SensorFeatures`.
- **`_MockCountryModel.predict_one()`** — troque pela chamada ao modelo treinado de verdade (ex.: `self._sklearn_model.predict(X)`).
- **`get_model()`** — troque a instanciação de `_MockCountryModel` pelo carregamento dos artefatos reais (um por país).
- **`retrain_model()`** — implemente o corpo conforme o contrato descrito no docstring da função.

Nada em `app.py` ou `business_rules.py` precisa mudar — eles só conhecem `mock_predict()`/`predict()` e o contrato de retorno abaixo, uma lista de dicts, um por sensor:

| Chave | Tipo | Observação |
|---|---|---|
| `sensor_name` | `str` | |
| `key_area` | `str` | uma das sete áreas de `KEY_AREAS` |
| `predicted_temp` | `float` | °C |
| `error_margin_pct` | `float` | % |
| `reliability_state` | `str` | `"interpolação"`, `"extrapolação moderada"` ou `"fora de domínio"` |
| `engineering_limit` | `float` | °C, já resolvido para o país |
| `exceeds_limit` | `bool` | recalculado em `business_rules` por segurança |

### Predição em lote (RF18)

```python
from mock_data import predict_batch

resultados = predict_batch([
    {"label": "Config A", "country": "Brasil", "blower_direction": "To Front",
     "housing": "Open", "board_position": "Right", "duct_type": "Top Duct",
     "deflector_hole": "Open", "run_case": "Pyro",
     "selected_sensors": ["Mainback - Painel Traseiro Superior"]},
    {"label": "Config B (país inválido, isolado)", "country": "Chile", ...},
])
# resultados[0] == {"label": "Config A", "success": True, "predictions": [...]}
# resultados[1] == {"label": "Config B ...", "success": False, "error": "..."}
```

Cada item é validado e processado de forma independente (RN21): um item malformado ou com país/parâmetro inválido não impede o processamento dos demais. Não há uma tela dedicada de upload em lote no dashboard — a comparação de até 4 configurações lado a lado (RF09) já cobre o uso interativo; `predict_batch()` fica disponível para uso programático (scripts, notebooks, futura API), no mesmo espírito de RF12. Se quiser uma tela de upload de CSV para lote, é uma extensão de `app.py` chamando essa função — avise que eu implemento.

### Avaliação do modelo (RF19)

```python
from model_evaluation import evaluate_and_log, read_metrics_history

metrics = evaluate_and_log("v0-mock")   # calcula e já registra no histórico
# {'mae_c': ..., 'erro_normalizado_folga_termica': ..., 'taxa_falso_negativo_seguranca': ..., ...}

historico = read_metrics_history()      # todas as avaliações já registradas
```

**Atenção:** os números vêm do mock, não de um modelo real — não usar como evidência de qualidade do produto. O que está pronto é o *mecanismo*: as três métricas oficiais (RN22) calculadas sobre o mesmo conjunto de referência (`REFERENCE_CASES`, fixo — RN23) e um histórico versionado em `logs/model_metrics.jsonl`. Quando o modelo real existir, chame `evaluate_and_log()` apontando `REFERENCE_CASES` para o dataset de referência oficial do projeto.

## Suposições e pendências com o parceiro

Itens abaixo são **mock** e precisam ser substituídos quando o dado real chegar:

- **Nomes dos sensores** — genéricos. A lista real de 78 termopares está nos CSVs confidenciais do parceiro, que o `.gitignore` da raiz impede de versionar. Substituir `SENSOR_NAMES` carregando os nomes da fonte de dados externa (RN19).
- **Limites de engenharia por país** — fictícios, gerados por `_mock_limit()` a partir das faixas por área-chave. Quando a tabela oficial BR/MX chegar, preencher `SENSOR_LIMIT_OVERRIDES` em [mock_data.py](mock_data.py) no formato `{(sensor_name, "BR"|"MX"): limite_c}` — os valores ali têm prioridade sobre os gerados.
- **Tipos de mesh duct** — `DUCT_TYPES` é um enum extensível (`Standard Duct`, `New Duct`, `Top Duct`). A lista fechada ainda não foi confirmada pela Whirlpool; acrescentar valores nessa lista é suficiente, nenhum outro módulo depende do conteúdo dela.
- **Exportação fora de domínio** — coerente com a RN08, linhas fora de domínio saem do CSV/Excel **sem** o valor numérico de temperatura, com a recomendação de CFD na coluna "Observação". A margem de erro, a confiabilidade e o limite de engenharia continuam presentes (RN14).
- **Limite excedido fora de domínio** — a coluna "Excede limite" é preenchida mesmo quando o valor numérico é suprimido, conforme a RN09 (o destaque vale "independentemente de a configuração estar ou não dentro da faixa testada").
- **Login (RF06, RN11–RN13)** — removido por decisão do time (ver aviso no topo deste documento). Se for reintroduzido, a implementação anterior (usuários mock com senha em hash) pode ser recriada a partir do histórico de conversa; não há mais código correspondente no repositório.
- **Histórico de acessos sem login (RF10)** — como não há autenticação, a identificação do usuário em [access_log.py](access_log.py) vem do sistema operacional (`getpass.getuser()`), não de uma conta. Isso funciona corretamente quando cada analista roda a própria instância localmente; num deploy real com um servidor único atendendo vários usuários por HTTP, todo mundo apareceria com o mesmo usuário (o do processo do servidor) — nesse cenário, `current_user()` precisaria ler a identidade de outro lugar (ex.: cabeçalho de um proxy autenticado). Documentado no próprio módulo.
