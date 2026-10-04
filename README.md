# Inteli - Instituto de Tecnologia e Liderança 

<p align="center">
<a href= "https://www.inteli.edu.br/"><img src="assets/inteli.png" alt="Inteli - Instituto de Tecnologia e Liderança" border="0"></a>
</p>

# FOG

## Equipe FOG

## :student: Integrantes: 
- <a href="https://www.linkedin.com/in/felipe-sodr%C3%A9-pess%C3%B4a/">Felipe Pessoa</a>
- <a href="https://www.linkedin.com/in/gabriel-lorenzo-baglioli-de-loyola/">Gabriel Loyola</a>
- <a href="https://www.linkedin.com/in/lucas-andrade-sva/">Lucas Andrade</a> 
- <a href="https://www.linkedin.com/in/nicolas-rigolin-carrascossa-4492b2261/">Nicolas Carrascossa</a> 
- <a href="https://www.linkedin.com/in/samuel-chen-7244893b6/">Samuel Chen</a>
- <a href="https://www.linkedin.com/in/lisboavitor/">Vitor Lisboa</a> 
- <a href="https://www.linkedin.com/in/william-moraes-34b35b26b/">William Moraes</a>

## :teacher: Professores:
### Orientador
- <a href="https://www.linkedin.com/in/fabiocassiosouza/">Fabio Cassio</a>
### Instrutores
- <a href="https://www.linkedin.com/in/roberto-c%C3%A2ndido-450582a0/">Roberto Cândido</a>
- <a href="https://www.linkedin.com/in/roberto-c%C3%A2ndido-450582a0/">Egon Daxbacher</a> 
- <a href="https://www.linkedin.com/in/geraldo-magela-severino-vasconcelos-22b1b220/">Geraldo Vasconcelos</a> 
- <a href="https://www.linkedin.com/in/heloisacandello/">Heloisa Candello</a>
- <a href="https://www.linkedin.com/in/laizaribeiro/">Laíza Ribeiro</a> 


## 📝 Descrição

Escreva uma curta descrição sobre o seu projeto (problema a ser resolvido e solução proposta). (minímo 150 palavras, máximo 600 palavras)

<b>Link para vídeo demonstrativo:</b> <a href="https://inteli.edu.br">Coloque seu link aqui</a>

Caso tenha publicado seu modelo preditivo em uma aplicação web, não deixe de colocar o link de acesso aqui.

## 📁 Estrutura de pastas

Dentre os arquivos presentes na raiz do projeto, definem-se:

- <b>readme.md</b>: arquivo que serve como guia e explicação geral sobre o projeto (o mesmo que você está lendo agora).

- <b>assets</b>: todas as imagens e mídias utilizadas nos notebooks e documentação são posicionadas aqui.

- <b>documents</b>: aqui estarão todos os documentos do projeto. Há também uma pasta denominada <b>extras</b> onde estão presentes documentos complementares.

- <b>notebooks</b>: todos os Jupyter Notebooks criados para desenvolvimento do projeto.

- <b>src</b>: a aplicação. <b>src/backend</b> é a API em FastAPI, que carrega os modelos treinados de <code>models/</code> e serve as predições; <b>src/frontend</b> é a interface em React que consome essa API. Execução em <a href="#-execução-dos-projetos">Execução dos projetos</a>, abaixo.

- <b>models</b>: os artefatos treinados (um por área-chave) e o <code>manifest.json</code> que descreve qual algoritmo atende cada área. Gerados por <code>scripts/export_models.py</code>.

- <b>scripts</b>: geração do catálogo de sensores/variáveis lido pela API (<code>build_registry.py</code>) e treino/exportação dos modelos (<code>export_models.py</code>).

## 💻 Execução dos projetos

O projeto roda **inteiramente na máquina local** — não há deploy, containers
nem Docker. São dois processos: a API e a interface.

### A aplicação (API + interface)

Pré-requisitos: Python 3.12+ e Node 20+.

```bash
# 1. dependências
pip install -r src/backend/requirements.txt
npm run install:frontend

# 2. API (terminal 1) — MODEL_MODE=real usa os modelos treinados de models/
cd src/backend
MODEL_MODE=real python -m uvicorn app.main:app --port 8000

# 3. interface (terminal 2)
npm run dev
```

A interface sobe em `http://localhost:5173` e fala com a API em
`http://localhost:8000` (configurável em `src/frontend/.env`). O login padrão
de desenvolvimento está em `src/backend/README.md`. Essas credenciais servem
apenas para demonstração local e não dão acesso a nenhum sistema real.

Sem `MODEL_MODE=real` a API responde com o preditor mock determinístico, útil
para desenvolver a interface sem os artefatos treinados. O que está na tela
diz qual dos dois respondeu — veja a versão do conjunto de modelos no rodapé
dos resultados.

### Os notebooks (pesquisa e treino)

1. Instale as dependências: `pip install -r requirements.txt`.
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
| 4 | `comparacao_modelos.ipynb` | `data/<area>_data.csv`, `scripts/export_models.py` | comparação entre os três modelos | ~3 min |
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

* 1.0.0 - 11/10/2024
    * [sprint 5] Lançamento da primeira versão do modelo preditivo com documentação.
* 0.6.0 - 27/09/2024
    * [sprint 4] Comparação de modelos preditivos
* 0.3.1 - 13/09/2024
    * [sprint 3] Preparação de dados e modelo preditivo preliminar
* 0.2.7 - 30/08/2024
    * [sprint 2] Análise exploratória e levantamento de hipóteses
* 0.1.3 - 16/08/2024
    * [sprint 1] Documentação de entendimento do negócio

## 📋 Licença/License

<img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/cc.svg?ref=chooser-v1"><img style="height:22px!important;margin-left:3px;vertical-align:text-bottom;" src="https://mirrors.creativecommons.org/presskit/icons/by.svg?ref=chooser-v1"><p xmlns:cc="http://creativecommons.org/ns#" xmlns:dct="http://purl.org/dc/terms/"><a property="dct:title" rel="cc:attributionURL" href="https://github.dev/Intelihub/Template_M3">MODELO GIT INTELI</a> by Inteli is licensed under <a href="http://creativecommons.org/licenses/by/4.0/?ref=chooser-v1" target="_blank" rel="license noopener noreferrer" style="display:inline-block;">Attribution 4.0 International</a>.</p>