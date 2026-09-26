# Roteiro de demonstração — Thermal Predictor (Fase 1, checkpoint 1b)

Este roteiro roda **inteiramente offline**, sem servidor Python nem API: o
`LocalMockSource` embutido no bundle estático é a única fonte de dados.

## Como gerar e servir o build

```bash
cd src/frontend
npm install        # se ainda não tiver rodado
npm run build       # gera src/frontend/dist/
npx serve dist       # ou: npm run preview
```

`npx serve dist` sobe um servidor estático simples (porta 3000 por padrão) e
não exige nada além do Node instalado — é o mais próximo de "abrir em
qualquer máquina" sem precisar reinstalar dependências. `npm run preview`
usa o próprio Vite (porta 4173 por padrão) e serve o mesmo `dist/`.

Abra o endereço impresso no terminal em qualquer navegador moderno.

## Roteiro de 3 minutos

1. **Abrir a página.** A tela já carrega com a **configuração de referência**
   preenchida e uma predição automática já executada — não é preciso clicar
   em nada para ver o primeiro resultado. Isso mostra que a aplicação nunca
   abre vazia.

2. **Ler o resumo.** Logo acima das áreas, uma faixa compacta mostra as 7
   variáveis da configuração submetida (as duas não usadas pelo modelo —
   *perfil de perdas* e *posição da placa* — aparecem esmaecidas). Abaixo,
   os números que respondem "posso seguir com esta configuração?": sensores
   previstos, quantos excedem o limite, quantos estão em atenção e a pior
   razão temperatura/limite.

   Números observados nesta execução, na configuração de referência
   (`housing=Closed`, `run_case=Pyro`, `deflector_hole=Closed`):
   - Sensores previstos: **77**
   - Excedem o limite: **2**
   - Em atenção (≥ 90 %): **2**
   - Pior razão: **161,0 %** — *Oven RTD Connector Body · 241,5 °C / 150,0 °C*
   - Confiabilidade: **Interpolação** (a configuração de referência existe
     no conjunto de ensaios)

   Médias por zona no mapa 3D (modo absoluto), da mais quente para a mais
   fria: Painel traseiro 92,4 °C · Ventilação principal 92,0 °C ·
   Compartimento da eletrônica de potência 71,9 °C · Resfriamento da
   eletrônica 64,0 °C · Interface do forno 58,0 °C · Botões do cooktop
   54,2 °C · Resistências 49,6 °C.

3. **Mudar `deflector_hole` para `Open`** no painel esquerdo e clicar em
   **Prever**. O mapa 3D recolore e a lista de áreas ao lado reordena; a
   tabela de resultados também reordena as áreas pela nova pior razão.

   Números observados após a mudança:
   - Excedem o limite: **1** · Em atenção: **3**
   - Pior razão: **154,1 %** — *Oven RTD Connector Body · 231,2 °C / 150,0 °C*
   - Confiabilidade passa para **Extrapolação moderada** (uma variável já
     não corresponde a nenhum ensaio) — o banner amarelo aparece acima da
     tabela.

4. **Ativar o modo delta** (`Δ vs. referência`, ao lado do título "Mapa
   térmico"). As zonas passam para a escala divergente azul/laranja,
   comparando a consulta atual com a configuração de referência. Este é o
   gráfico que conta a história da hipótese H1 (abrir o furo do defletor
   redistribui calor do console para a ventilação):

   Deltas observados (consulta atual − referência):
   - Compartimento da eletrônica de potência: **+3,4 °C**
   - Resfriamento da eletrônica: **+3,2 °C**
   - Interface do forno: **+2,5 °C**
   - Ventilação principal: **−3,9 °C**
   - Painel traseiro: **−3,9 °C**

   Com a configuração de referência sem alterações, o alternador de modo
   fica desabilitado com a dica "A configuração atual é a referência" —
   comparar a referência com ela mesma não teria informação nova.

5. **Clicar em uma zona do mapa** (ex.: "Compartimento da eletrônica de
   potência", tanto no 3D quanto na lista lateral). A tabela de resultados
   filtra para mostrar só aquela área, com um chip "Filtrando: <área> ✕"
   acima dos cards — clicar no chip (ou de novo na mesma zona) limpa o
   filtro.

6. **Mudar `run_case` para `Broil C2`** e prever de novo. A hipótese H3
   (Broil aquece mais que Pyro) fica visível tanto na tabela (mais sensores
   em atenção/excedendo) quanto no delta do mapa:

   Números observados:
   - Excedem o limite: **5** · Em atenção: **7**
   - Pior razão: **133,0 %** — *Oven RTD Connector Body · 199,5 °C / 150,0 °C*
   - Delta de **Resistências: +105,1 °C** em relação à referência — o
     salto mais evidente do roteiro, coerente com o cooktop/chapa ligados
     no Broil C2.

   Aponte o banner de confiabilidade acima da tabela: como só `run_case`
   mudou em relação à referência, a classificação continua **Extrapolação
   moderada**, com o texto explicando que o modelo está estendendo o que
   aprendeu e que os valores perto do limite merecem confirmação.

## Observações desta execução

Os valores acima foram lidos numa execução real do build de produção
(`npm run preview`, mesma configuração de referência do dataset). Como o
mock é determinístico (mesma config → mesma resposta), rodar o roteiro de
novo na mesma máquina deve reproduzir exatamente estes números; pequenas
diferenças de arredondamento não mudam a leitura qualitativa (H1 e H3
continuam visíveis do mesmo jeito).

## Fogão 3D (Fases 1c–1d)

O fogão do mapa 3D é um corpo **opaco** com peças que reagem à configuração
do formulário **em tempo real, antes de clicar em "Prever"**, enquadramento
automático (fit-to-view), aberturas semânticas em vez de um slider abstrato,
rótulos e pinos de sensor dentro da cena, e um modo de cor **Status
(limite)** como padrão — a pergunta que importa é "onde estoura o limite?",
não "onde está mais quente". Roteiro extra, encaixa logo após o passo 2 do
roteiro de 3 minutos acima:

1. **Abrir a página.** O mapa já carrega no modo **Status (limite)**, com o
   console aberto (`Abrir console`, ligado por padrão) mostrando a carcaça
   da eletrônica, o blower, o defletor e a placa. Zonas em atenção/excesso
   aparecem roteladas na cena (rótulo "Alertas", o padrão) com uma bolinha
   colorida — verde/laranja/vermelho — e uma legenda no canto inferior
   direito do canvas mostra quantos **sensores** (não zonas) estão em cada
   status, mais quantos são só monitoramento. Um resumo compacto da
   configuração aparece no canto superior direito ("Blower: To front ·
   Carcaça: Closed · …", recolhível abaixo de 1280 px de largura).

2. **Clicar num pino de sensor** (esfera pequena sobre uma zona em
   atenção/excesso). A tabela de resultados rola até a linha daquele sensor
   e ela pisca em `--wp-accent` por um instante — é a ponte entre "vi um
   problema no 3D" e "onde está o número exato".

3. **Trocar para "Mapa de calor"** (alternador ao lado do título "Mapa
   térmico"). As zonas passam da escala de status para a escala absoluta
   azul → amarelo → laranja → vermelho; a legenda in-canvas troca para uma
   barra de gradiente com 5 marcas (mín, 25 %, 50 %, 75 %, máx das médias
   por zona da consulta atual).

4. **Mudar `deflector_hole` (Furo do defletor) para `Open`** e prever, depois
   trocar para **"Δ vs. referência"**. As setas de fluxo de ar
   (`AirflowArrows`) já se ramificam antes de prever — parte do fluxo desvia
   para a carcaça do IPC; depois de prever, o modo delta mostra a escala
   divergente azul/laranja comparando a consulta atual com a referência,
   com a legenda trocando para "−Δmáx / 0 / +Δmáx" — é a visualização que
   conta a história da hipótese H1.

5. **Clicar em "Abrir forno"** e **mudar `material_coil_support`** para
   `Plastic` (ou `Aluminium Plate`). A porta do forno abaixa revelando a
   resistência e o suporte; o suporte troca de acabamento metálico
   (`Aluminium`) para plástico fosco escuro ou disco metálico
   (`Aluminium Plate`), a peça alterada pulsa em `--wp-accent` e ganha um
   rótulo temporário "Suporte da resistência → Plastic" por ~2 s.

6. **Mudar `run_case`** (ex.: `Pyro` → `Broil C2`) e ler o **selo do
   forno** sobre a cavidade ("Forno 400 °C · cooktop desligado" no Pyro;
   setpoint e carga do cooktop mudam nos outros modos). O cooktop ganha
   chapa/panelas conforme o `run_case` e a cavidade acende um brilho sutil
   proporcional ao setpoint — a versão física da hipótese H3 (Broil aquece
   mais que Pyro).

7. **Clicar em "Abrir traseira".** O painel traseiro se afasta, revelando o
   fundo do console e o caminho do ar por trás — útil para mostrar de onde
   vêm as setas do blower sem precisar do modo Corte.

Outros pontos do 3D, ainda válidos:
- **Presets de câmera** (Frente, Traseira, Console, Isométrica) sempre
  reenquadram com margem pelo fit-to-view — nunca "voam" para uma posição
  fixa nem cortam o fogão.
- **"Avançado"** (na barra sobre o canvas) guarda os controles menos usados:
  vista Sólido/Corte/Raio-X com o slider de profundidade, e o checkbox
  "Câmera segue a peça alterada" (padrão OFF) — ligado, o preset de câmera
  (e a abertura necessária) muda sozinho para onde a peça alterada fica
  visível.
- **Passar o mouse sobre a legenda de peças**, logo abaixo do mapa
  ("Carcaça da eletrônica", "Blower e fluxo de ar", "Defletor de ar",
  "Placa eletrônica", "Suporte da resistência", "Carga do cooktop"): cada
  chip destaca a peça correspondente no 3D — o mesmo destaque acontece ao
  passar o mouse sobre o rótulo/ajuda de qualquer select no painel
  esquerdo, e a peça/zona sob o cursor ganha um contorno `--wp-core` além
  do brilho.

Verificação manual de desempenho (não é possível medir com precisão dentro
do navegador automatizado desta sessão): abra `/dev/thermal-map` — página
interna só de desenvolvimento, fora da navegação do produto — com os
seletores de todas as 7 variáveis, os pinos/rótulos/legenda in-canvas e um
medidor de FPS no canto; o critério é ≥ 50 fps em um notebook comum, com o
corpo sólido, os pinos e os rótulos visíveis.

### Capturas de tela

A sessão que revisou esta fase não teve como salvar `.png` em
`src/frontend/docs/img/` — a ferramenta de navegador automatizada só devolve
a imagem inline, sem escrita em disco. Em vez das capturas, a descrição dos
três quadros do roteiro (verificados visualmente na mesma sessão, em
`http://localhost:5173/`, config de referência):

1. **Abertura, modo Status.** Console aberto; carcaça, blower, defletor e
   placa visíveis; dois rótulos de zona ("Painel traseiro" danger,
   "Compartimento da eletrônica de potência" warn) com bolinha colorida e
   linha-guia; legenda no canto inferior direito do canvas com
   64 / 2 / 2 / 9 (dentro do limite / atenção / excede / monitor — soma 77);
   resumo da configuração no canto superior direito com as 6 variáveis.

2. **Modo Δ vs. referência após abrir o defletor.** Zonas na escala
   divergente azul/laranja; legenda trocada para "−Δmáx / 0 / +Δmáx"; pílula
   "Pré-visualização da configuração" no canto inferior esquerdo enquanto o
   rascunho ainda não foi enviado com "Prever".

3. **"Câmera segue a peça alterada" ligado, forno aberto.** Ao trocar
   `material_coil_support`, o preset de câmera muda sozinho para "Frente"
   com "Abrir forno" ativado, mostrando o suporte da resistência com o
   callout temporário "Suporte da resistência → Plastic".

## Modo API (Fase 2)

A partir da Fase 2 existe uma segunda forma de rodar o front, contra o
back-end FastAPI em `src/backend` (que ainda serve o mesmo mock — os números
do roteiro acima devem bater exatamente). O modo `local` (seções acima)
continua funcionando sem nenhuma mudança — é o que a Fase 1 exige.

```bash
# Terminal 1 — back-end (ver src/backend para detalhes)
cd src/backend
uvicorn app.main:app --reload   # http://localhost:8000

# Terminal 2 — front-end em modo api
cd src/frontend
npm run dev          # padrão do projeto: VITE_DATA_SOURCE=api (modelos reais)
npm run dev:api      # o mesmo, lendo .env.api explicitamente
```

`npm run build:api` gera o build de produção apontando para a API (mesmas
variáveis de `.env.api`).

Diferenças visíveis em modo `api`:
- A tela abre em `/login` (usuários seed: `engenheiro` / `thermal2026` ou
  `admin` / `admin2026`); a sessão fica em `sessionStorage` e expira com o
  token.
- A pílula "dados de demonstração (mock)" da barra superior some; em seu
  lugar aparece o nome do usuário autenticado e o botão "Sair".
- Se a API cair ou não responder, o painel de resultados mostra o erro do
  contrato com a dica "Verifique se a API está em execução em
  VITE_API_BASE_URL".
- Um 401 no meio da sessão (token expirado) mostra o aviso "Sessão expirada
  — entre novamente" e volta para `/login`.

> **Padrão mudou na Fase 3.** `VITE_DATA_SOURCE` agora vale `api` por padrão
> (definido em `src/sources/index.ts`, não só no `.env`, que é ignorado pelo
> git). Para a demo offline, copie `.env.local.example` para `.env.local`
> — ele tem precedência sobre o `.env` e devolve `VITE_DATA_SOURCE=local`.
> O back-end precisa estar no ar em modo `real` para as predições virem dos
> modelos treinados:
>
> ```bash
> MODEL_MODE=real python -m uvicorn app.main:app --port 8000
> ```

O modo `local` nunca pede login — a Fase 1
continua demonstrável offline.
