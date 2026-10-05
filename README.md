# Inteli - Instituto de Tecnologia e Liderança

<p align="center">
<a href= "https://www.inteli.edu.br/"><img src="assets/inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" border="0"></a>
</p>

# FOG — Whirlpool Thermal Predictor

## Equipe FOG

## :student: Integrantes: 
- <a href="https://www.linkedin.com/in/felipe-sodr%C3%A9-pess%C3%B4a/">Felipe Sodré Pessôa</a>
- <a href="https://www.linkedin.com/in/gabriel-lorenzo-baglioli-de-loyola/">Gabriel Lorenzo Baglioli de Loyola</a>
- <a href="https://www.linkedin.com/in/lucas-andrade-sva/">Lucas Andrade Silva</a> 
- <a href="https://www.linkedin.com/in/nicolas-rigolin-carrascossa-4492b2261/">Nicolas Rigolin Carrascossa</a> 
- <a href="https://www.linkedin.com/in/samuel-chen-7244893b6/">Samuel Yenyu Chen</a>
- <a href="https://www.linkedin.com/in/lisboavitor/">Vitor Medrado Lisboa</a> 
- <a href="https://www.linkedin.com/in/william-moraes-34b35b26b/">William Martins Moraes</a>

## :teacher: Professores:
### Orientador
- <a href="https://www.linkedin.com/in/fabiocassiosouza/">Fabio Cassio</a>
### Instrutores
- <a href="https://www.linkedin.com/in/roberto-c%C3%A2ndido-450582a0/">Roberto Cândido</a>
- <a href="https://www.linkedin.com/in/egondaxbacher/">Egon Daxbacher</a>
- <a href="https://www.linkedin.com/in/geraldo-magela-severino-vasconcelos-22b1b220/">Geraldo Vasconcelos</a>
- <a href="https://www.linkedin.com/in/heloisacandello/">Heloisa Candello</a>
- <a href="https://www.linkedin.com/in/laizaribeiro/">Laíza Ribeiro</a>


## 📝 Descrição

Na Divisão de Fogões da Whirlpool, cada novo fogão de piso precisa ter o comportamento térmico validado antes de ser aprovado. Hoje essa validação depende de simulações CFD completas, que levam horas e exigem software licenciado, malha, HPC e um especialista dedicado, ou de protótipos físicos submetidos a testes destrutivos. Por isso, cada alternativa de projeto avaliada custa tempo e dinheiro, e poucas combinações cabem no cronograma de desenvolvimento.

O **Thermal Predictor** aprende com o histórico de simulações e ensaios térmicos já realizados pela Whirlpool a relação entre a montagem do fogão e a temperatura de cada sensor. O engenheiro informa uma configuração (direção do blower, estado do housing, posição da placa, material do suporte da bobina, furo do defletor, entre outras) e recebe em segundos a temperatura estimada nos pontos monitorados, com a margem de erro, o limite de engenharia aplicável e um indicador de confiabilidade que avisa quando a consulta está fora do que já foi ensaiado.

A solução usa um modelo por região do fogão (Random Forest ou Gradient Boosting, conforme o desempenho em cada uma das sete regiões). Sob validação Leave-One-Group-Out, erra em média cerca de **4 °C** e mantém **87,9%** das previsões dentro da margem de 10% acordada com o parceiro, contra 75,9% de um baseline que ignora a configuração. A ferramenta não substitui o CFD nem o ensaio de certificação: ela serve para priorizar quais configurações merecem simulação completa ou protótipo.

A entrega é inteiramente open source: um núcleo preditivo em Python exposto por uma API FastAPI e um dashboard interativo em React, ambos executados localmente.

A documentação completa do projeto está em [`documents/documentacao.md`](documents/documentacao.md).

## 📁 Estrutura de pastas

Dentre os arquivos presentes na raiz do projeto, definem-se:

- <b>README.md</b>: arquivo que serve como guia e explicação geral sobre o projeto (o mesmo que você está lendo agora).

- <b>package.json</b>: atalhos de npm para rodar a interface a partir da raiz (<code>npm run dev:api</code>, <code>npm run test</code> etc.); o projeto npm de fato fica em <code>src/frontend</code>.

- <b>requirements.txt</b>: dependências Python dos notebooks.

- <b>assets</b>: todas as imagens e mídias utilizadas nos notebooks e na documentação.

- <b>data</b>: bases de dados do parceiro e derivadas. A pasta e os arquivos de dados não são versionados (ver <code>.gitignore</code>); é preciso criá-la localmente para rodar os notebooks.

- <b>documents</b>: documentação do projeto (<a href="documents/documentacao.md"><code>documentacao.md</code></a>) e documentos de arquitetura. A pasta <b>extras</b> reúne documentos complementares, entre eles o guia de arquitetura usado na refatoração do software (<code>REFACTORING_AGENT_GUIDE.md</code>) e a auditoria de cobertura de sensores e configurações por região no modelo exportado (<code>relatorio_dados_nao_treinados.md</code>).

- <b>notebooks</b>: Jupyter Notebooks de exploração, pré-processamento, modelagem e comparação de modelos.

- <b>src</b>: todo o código do projeto. Execução em <a href="#-execução-dos-projetos">Execução dos projetos</a>, abaixo.
  - <b>src/backend</b>: a API em FastAPI, que carrega os modelos treinados e serve as predições.
  - <b>src/backend/models</b>: os artefatos treinados (um por área-chave) e o <code>manifest.json</code> que descreve qual algoritmo atende cada área. Gerados por <code>src/scripts/export_models.py</code>.
  - <b>src/frontend</b>: a interface em React que consome a API.
  - <b>src/contracts</b>: contrato da API (<code>api_v1.schema.json</code>) compartilhado entre back-end e front-end, com fixtures de exemplo.
  - <b>src/scripts</b>: geração do catálogo de sensores/variáveis lido pela API (<code>build_registry.py</code>), treino/exportação dos modelos (<code>export_models.py</code>), auditoria da cobertura de configurações no treino (<code>audit_training_coverage.py</code>) e um utilitário de gestão das issues no GitLab (<code>datas_sprint4.py</code>).

## 💻 Execução dos projetos

O projeto roda **inteiramente na máquina local** — não há deploy, containers
nem Docker. São dois processos: a API e a interface.

### A aplicação (API + interface)

Pré-requisitos: Python 3.12+ e Node 20+.

```bash
# 1. dependências (na raiz do repositório)
pip install -r src/backend/requirements.txt
npm run install:frontend

# 2. configuração da API: cria src/backend/.env a partir do exemplo
cp src/backend/.env.example src/backend/.env
#    em seguida, abra src/backend/.env e troque MODEL_MODE=mock por
#    MODEL_MODE=real, para a API usar os modelos treinados de src/backend/models/

# 3. API (terminal 1)
cd src/backend
python -m uvicorn app.main:app --port 8000

# 4. interface (terminal 2, na raiz do repositório)
npm run dev:api
```

Os comandos valem para qualquer terminal (bash, PowerShell ou cmd), exceto a
cópia do passo 2: no PowerShell, use
`Copy-Item src/backend/.env.example src/backend/.env`; no cmd,
`copy src\backend\.env.example src\backend\.env`.

A interface sobe em `http://localhost:5173` e fala com a API em
`http://localhost:8000` (configurado em `src/frontend/.env.api`). Para entrar,
use um dos usuários de demonstração, criados automaticamente na primeira
execução da API:

| Usuário | Senha | Perfil |
|---|---|---|
| `engenheiro` | `thermal2026` | Engenharia (uso do dia a dia) |
| `admin` | `admin2026` | Administrador |

São credenciais apenas para uso local; troque-as antes de qualquer uso real
(ver [`src/backend/README.md`](src/backend/README.md#usuários-de-demonstração)).

Sem `MODEL_MODE=real` a API responde com o preditor mock determinístico, útil
para desenvolver a interface sem os artefatos treinados. O que está na tela
diz qual dos dois respondeu — veja a versão do conjunto de modelos no rodapé
dos resultados.

### Os notebooks (pesquisa e treino)

1. Instale as dependências: `pip install -r requirements.txt` (inclui o Jupyter).
2. Coloque o arquivo bruto do parceiro em `data/dataset_bruto.csv` (não versionado — ver `.gitignore`).
3. Abra `notebooks/expl_preprocessamenro_hipote.ipynb` e rode todas as células **em ordem, do início ao fim** (Run All). As seções dependem umas das outras e reescrevem `data/dataset_pre_processado.csv` ao longo da execução.
4. Rode os demais notebooks na ordem abaixo. Cada etapa lê os arquivos gerados pela anterior, e todos leem e gravam em `data/` (um nível acima de `notebooks/`):

| Ordem | Notebook | Lê | Gera | Tempo aproximado |
|---|---|---|---|---|
| 1 | `expl_preprocessamenro_hipote.ipynb` | `data/dataset_bruto.csv` | `data/dataset_pre_processado.csv`, `data/classificacao_colunas.csv` | < 1 min |
| 2 | `tratamento_final_dos_dados.ipynb` | `data/dataset_pre_processado.csv` | `data/<area>_data.csv` (uma planilha por área) | < 1 min |
| 3 | `Decision_tree_regre.ipynb` | `data/<area>_data.csv` | resultados e previsões do Decision Tree | ~3 min |
| 3 | `Grad_Boosting_Regre.ipynb` | `data/<area>_data.csv` | resultados do Gradient Boosting | ~20 min |
| 3 | `Random_for_regre.ipynb` | `data/<area>_data.csv`, `src/backend/data/sensor_registry.json` | resultados do Random Forest | ~30 min |
| 4 | `comparacao_modelos.ipynb` | `data/<area>_data.csv`, `src/scripts/export_models.py` | comparação entre os três modelos | ~3 min |
| 5 | `geracao_dados_sinteticos_kmeans.ipynb` | `data/dataset_pre_processado.csv` | runs sintéticas (ver abaixo) | ~1 min |
| 5 | `avaliacao_dados_sinteticos.ipynb` | `data/dataset_pre_processado.csv`, `data/<area>_data.csv` | avaliação das runs sintéticas | ~5 min |
| 5 | `diagnostico_dados_e_validacao.ipynb` | `data/dataset_pre_processado.csv` | diagnóstico de vazamento de dados | ~1 min |

Notebooks com a mesma ordem não dependem uns dos outros. Use o kernel Python do ambiente em que instalou o `requirements.txt`. A célula 16 do `Decision_tree_regre.ipynb` lê `resultados_experimentos_overfitting.csv`, que não é versionado: sem ele a célula é pulada e o gráfico já salvo fica em `assets/graficos/dt_experimentos_overfitting.png`.

**No Google Colab:**

1. Abra o notebook e salve uma cópia no seu Google Drive antes de editar — sem isso as alterações não são salvas.
2. Faça upload de `data/dataset_bruto.csv` mantendo a mesma estrutura de pastas (`data/` um nível acima de `notebooks/`), ou ajuste os caminhos `../data/...` das células para onde você subiu o arquivo.
3. Rode todas as células em ordem (Ambiente de execução > Executar tudo).

**Geração de runs sintéticas (K-means):**

`notebooks/geracao_dados_sinteticos_kmeans.ipynb` agrupa as 56 runs reais por assinatura térmica,
sorteia 44 configurações de hardware inéditas e gera o perfil de cada uma interpolando runs reais do
cluster previsto. Ele grava três arquivos e **não altera** `data/dataset_pre_processado.csv`:

- `data/dataset_sintetico.csv` — só as 44 runs sintéticas;
- `data/dataset_com_sinteticos.csv` — as 100 runs (56 reais + 44 sintéticas);
- `data/sintetico_rastreabilidade.csv` — de quais runs-mãe cada sintética saiu.

> ⚠️ **Não treine o modelo entregue com `dataset_com_sinteticos.csv`.** A avaliação válida, em
> `notebooks/avaliacao_dados_sinteticos.ipynb` (geração dentro de cada fold, teste 100% real), testou três
> variantes de geração em Random Forest e Gradient Boosting: **nenhuma melhorou o modelo**. Os arquivos
> existem para documentar o experimento e sustentar a conclusão de que o gargalo do dataset é variável
> não medida, não número de runs — ver `notebooks/diagnostico_dados_e_validacao.ipynb`.
> Os números de RMSE da seção 7 do notebook de geração vêm de um harness com vazamento e não devem ser citados.

## 🗃 Histórico de lançamentos

* 1.0.0 - 09/10/2026
    * [sprint 5] Solução final: avaliação, conclusões e recomendações na documentação, dashboard integrado à API e ajustes de publicação.
* 0.4.0 - 25/09/2026
    * [sprint 4] Comparação de modelos preditivos (Decision Tree, Random Forest e Gradient Boosting) e explicabilidade.
* 0.3.0 - 11/09/2026
    * [sprint 3] Preparação dos dados e modelo preditivo preliminar.
* 0.2.0 - 28/08/2026
    * [sprint 2] Análise exploratória e levantamento de hipóteses.
* 0.1.0 - 14/08/2026
    * [sprint 1] Documentação de entendimento do negócio.

## 📋 Licença/License

<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1">
<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1">

<p xmlns:cc="http://creativecommons.org/ns#"
xmlns:dct="http://purl.org/dc/terms/">

<a property="dct:title" rel="cc:attributionURL" href="https://git.inteli.edu.br/graduacao/2026-2a/t29/g03">
FOG — Whirlpool Thermal Predictor
</a> by <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.inteli.edu.br/">
Inteli — Instituto de Tecnologia e Liderança</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/felipe-sodr%C3%A9-pess%C3%B4a/">
Felipe Sodré Pessôa</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/gabriel-lorenzo-baglioli-de-loyola/">
Gabriel Lorenzo Baglioli de Loyola</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/lucas-andrade-sva/">
Lucas Andrade Silva</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/nicolas-rigolin-carrascossa-4492b2261/">
Nicolas Rigolin Carrascossa</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/samuel-chen-7244893b6/">
Samuel Yenyu Chen</a>, <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/lisboavitor/">
Vitor Medrado Lisboa</a> e <a rel="cc:attributionURL dct:creator" property="cc:attributionName" href="https://www.linkedin.com/in/william-moraes-34b35b26b/">
William Martins Moraes</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/?ref=chooser-v1"
target="_blank"
rel="license noopener noreferrer"
style="display:inline-block;">
Attribution 4.0 International</a>.

</p>
