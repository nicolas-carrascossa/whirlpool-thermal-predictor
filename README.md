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

- <b>dashboard</b>: aplicação web em Streamlit (Thermal Predictor) para consulta das temperaturas estimadas por sensor. Instruções de execução e de integração com o modelo em <a href="dashboard/README.md">dashboard/README.md</a>.

## 💻 Execução dos projetos

**Localmente (VS Code):**

1. Instale as dependências: `pip install -r requirements.txt`.
2. Coloque o arquivo bruto do parceiro em `data/dataset_bruto.csv` (não versionado — ver `.gitignore`).
3. Abra `notebooks/expl_preprocessamenro_hipote.ipynb` e rode todas as células **em ordem, do início ao fim** (Run All). As seções dependem umas das outras e reescrevem `data/dataset_pre_processado.csv` ao longo da execução.

**No Google Colab:**

1. Abra o notebook e salve uma cópia no seu Google Drive antes de editar — sem isso as alterações não são salvas.
2. Faça upload de `data/dataset_bruto.csv` mantendo a mesma estrutura de pastas (`data/` um nível acima de `notebooks/`), ou ajuste os caminhos `../data/...` das células para onde você subiu o arquivo.
3. Rode todas as células em ordem (Ambiente de execução > Executar tudo).

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