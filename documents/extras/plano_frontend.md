# Plano de Construção do Front-end — Thermal Predictor (v2)

> ⚠️ **Documento histórico — parcialmente superado em 27/09/2026.** As fases e
> os critérios de aceite descritos aqui foram executados e continuam valendo
> como registro de *como* o front-end foi construído. O que **não** vale mais
> são as referências a Docker e `docker compose` (fases 4 e 5): o projeto passou
> a rodar exclusivamente em local, sem containers e sem deploy, e todos os
> arquivos de Docker foram removidos do repositório. Ver
> [`../arquitetura_atual_diagnostico.md`](../arquitetura_atual_diagnostico.md),
> seção 7, e o [`REFACTORING_AGENT_GUIDE.md`](REFACTORING_AGENT_GUIDE.md) nesta mesma pasta.

> Plano de execução em fases. Cada fase é uma unidade autônoma para uma sessão do Claude Code: tem **pré-requisitos**, **tarefas**, **ponto de parada** com critérios verificáveis e **comando de verificação**. Executor único: Claude Code (não há divisão de equipe). Revisado em 10/09/2026 com base no brief, na vistoria do repositório, no style guide oficial da Whirlpool (style.whirlpoolcorp.com) e no código-fonte do protótipo 3D.

## 0. Decisões fechadas

| Tema | Decisão |
|---|---|
| Localização | Neste repositório: `src/frontend/` (React) e `src/backend/` (FastAPI). |
| Arquitetura de dados | Os dados atuais são **Brasil**. México aparece na UI como indisponível. |
| "Mesh duct" do RF01 | Erro de documentação — desconsiderar. As 7 variáveis são as colunas do dataset. |
| Ordem de construção | **Front standalone primeiro** (mock embutido, sem servidor), depois API, depois modelo real. A Fase 1 é a fase demonstrável em apresentação sem API. |
| Contrato | Definido uma vez como tipos TypeScript + JSON Schema (Fase 0); a API FastAPI (Fase 2) e o modelo real (Fase 3) apenas o implementam. |
| Identidade visual | **Style guide Whirlpool** (tema claro), com densidade de dashboard de engenharia. Ver seção 1. |
| Stack | Vite + React 18 + TypeScript; Tailwind CSS com tokens em CSS variables; shadcn/ui (copiado); TanStack Query; Recharts; Three.js via react-three-fiber; FastAPI + Pydantic v2; JWT + SQLite. |
| Git | 1 branch por fase (`feat/front-fase-N`), merge em `dev` no ponto de parada. |

### Correções à documentação (registrar, não bloqueiam)
- RF01 cita "mesh duct" (não existe), omite `material_coil_support` (existe e é variável central) e inclui `board_position`, que a H2 exclui do modelo. Contrato aceita as 7 colunas reais; o backend ignora `losses` e `board_position` e declara isso em `ignored_fields`.
- RF03 fala em 78 sensores; o dataset tem 77.
- O vínculo sensor → `active_limit` → `key_area` está intacto em `data/dataset_pre_processado.csv` — não precisa ser "recuperado".

---

## 1. Sistema visual (fonte: style.whirlpoolcorp.com)

O style guide exige: fundo branco como base, **uma única cor-núcleo por projeto** com seu acento e neutros, texto sempre em neutros, ícones de linha sem preenchimento, contraste ≥ 70% entre fundo e texto, alinhamento à esquerda, entrelinha ≥ 120%, sem caixa-alta em parágrafos.

**Cor-núcleo escolhida: Accomplished Blue** (uso oficial: tecnologia, resultados da empresa — a mais coerente com ferramenta de engenharia).

```css
/* src/frontend/src/styles/tokens.css — única fonte de verdade visual */
:root {
  /* núcleo + acento (Whirlpool) */
  --wp-core:        #0d436b;  /* Accomplished Blue — títulos, botões primários, links */
  --wp-accent:      #00a0dd;  /* Accent Blue — foco, seleção, destaques */
  --wp-accent-lt:   #edf4fc;  /* Light Accent Blue — fundos de seleção, linhas ativas */
  /* neutros (Whirlpool) */
  --wp-gray-05:     #f5f6f7;  /* fundo de página secundário, cabeçalho de tabela */
  --wp-gray-12:     #dee0e3;  /* bordas */
  --wp-gray-20:     #d1d3d4;  /* divisores */
  --wp-gray-45:     #9fa0a1;  /* texto desabilitado */
  --wp-gray-65:     #767777;  /* texto secundário */
  --wp-gray-85:     #484949;  /* texto principal */
  --wp-white:       #ffffff;  /* fundo dominante */
  /* semântica de status (exceção documentada — ver nota) */
  --status-ok:      #6aa342;  /* Conscientious Green — dentro do limite */
  --status-warn:    #e08650;  /* Empathetic Orange — perto do limite (≥ 90%) */
  --status-danger:  #b3261e;  /* fora da paleta: excede o limite */
  /* tipografia */
  --font-display:   'Nunito Sans', 'Noto Sans', system-ui, sans-serif;
  --font-body:      'Open Sans', 'Noto Sans', system-ui, sans-serif;
  --font-mono:      'Noto Sans Mono', ui-monospace, Consolas, monospace;
}
```

**Tipografia** (pesos oficiais): kicker Nunito Sans 700 (mín. 12 pt, tracking 0.05em); título Nunito Sans 300; subtítulo Open Sans 600 (2/3 do título); corpo Open Sans 400 (mín. 8 pt — usar 13–14 px). O guia não define fonte mono; **Noto Sans Mono** foi escolhida por pertencer à família de fallback oficial (Noto) e ser open source. Números sempre com `font-variant-numeric: tabular-nums`.

**Escala de calor do mapa 3D e dos gauges** — exceção de codificação de dados (não é composição de marca): azul → amarelo → laranja → vermelho, usando `#00a0dd → #eeb111 → #e08650 → #b3261e`. Mantém a convenção de saída de CFD que a persona João reconhece. **Validar com o parceiro na primeira demo**; alternativa conservadora é escala monocromática azul (`#edf4fc → #00a0dd → #0d436b`) com laranja/vermelho só para status.

**Proibido pelo guia:** amarelo, laranja e verde núcleo em títulos ou texto corrido; misturar cores-núcleo na interface; ícones preenchidos; logo Whirlpool sem autorização (usar só o nome "Thermal Predictor" + "Inteli × Whirlpool" em texto).

**Do protótipo 3D, o que fica e o que muda:** fica a geometria (`ZONES`, meshes por zona, raycast/hover, lista lateral sincronizada, tooltip, `prefers-reduced-motion`). Muda: fundo escuro → branco/`--wp-gray-05`, fog e grid para tons `--wp-gray-12/20`, luz de acento ciano → `--wp-accent`, fontes → Nunito/Open/Noto Mono, e a fonte dos dados (média histórica → predição da consulta atual).

---

## 2. Contrato (congelado na Fase 0)

```ts
// src/frontend/src/contract/v1.ts  (espelhado em src/backend/app/schemas.py na Fase 2)
type Architecture = "BR" | "MX";
type BlowerDirection = "To Front" | "To Back" | ...;   // enums extraídos do dataset
interface StoveConfig {
  blower_direction: string; housing: string; board_position: string;
  run_case: string; losses: string; deflector_hole: string; material_coil_support: string;
}
interface PredictionRequest {
  architecture: Architecture;
  config: StoveConfig;
  targets?: { key_areas?: string[]; sensors?: number[] };   // vazio = todas
}
type Reliability = "interpolation" | "moderate_extrapolation" | "out_of_domain";
interface SensorPrediction {
  tc_number: number; tc_name: string; key_area: string;
  temp_c: number; error_margin_c: number; error_margin_pct: number;
  active_limit_c: number | null; exceeds_limit: boolean; limit_ratio: number | null;
  reliability: Reliability;
}
interface PredictionResponse {
  request_id: string; model_version: string; architecture: Architecture;
  architecture_available: boolean; ignored_fields: string[];
  predictions: SensorPrediction[]; generated_at: string;
}
interface Metadata {
  architectures: { code: Architecture; available: boolean }[];
  variables: { name: string; label_pt: string; help_pt: string; options: string[] }[];
  sensors: { tc_number: number; tc_name: string; key_area: string; active_limit_c: number | null }[];
  key_areas: string[];
}
```

Interface de acesso a dados no front: `PredictionSource { getMetadata(); predict(req) }` com duas implementações — `LocalMockSource` (Fase 1, roda no navegador) e `ApiSource` (Fase 2, HTTP). Selecionada por `VITE_DATA_SOURCE=local|api`. **É isso que torna a Fase 1 demonstrável sem API e a troca posterior invisível.**

---

## Fase 0 — Fundação, tokens e contrato

**Pré-requisitos:** nenhum.

**Tarefas:**
1. Criar `src/frontend/` com Vite + React + TS, Tailwind, shadcn/ui, TanStack Query, react-router. Instalar Nunito Sans, Open Sans e Noto Sans Mono via Google Fonts (`index.html`).
2. Criar `tokens.css` exatamente como na seção 1 e mapear os tokens no `tailwind.config`. Página `/styleguide` interna mostrando cores, tipografia, botões, badges de status, tabela densa e gauge — serve para validar a identidade antes de qualquer tela.
3. Script Python `scripts/build_registry.py` que lê `data/dataset_pre_processado.csv` e gera `src/frontend/src/data/sensor_registry.json` (77 sensores: `tc_number, tc_name, key_area, active_limit_c` normalizado — o valor textual `"Monitor (150 C)"` vira `null` + flag `is_monitor`) e `src/frontend/src/data/variable_options.json` (enums canônicos por variável, grafia normalizada como nos notebooks) e `src/frontend/src/data/sensor_stats.json` (média/desvio/min/max reais de `temp` por sensor e por combinação `run_case`, semente dos mocks).
4. Escrever `src/frontend/src/contract/v1.ts` (seção 2) + `contracts/api_v1.schema.json` (JSON Schema gerado dos tipos) + `contracts/README.md` explicando cada campo.
5. Implementar `LocalMockSource`: predição determinística (hash da config → seed) amostrada de `sensor_stats.json`, com deslocamentos por variável coerentes com as hipóteses (H3: Broil > Pyro; H4: housing Open aquece IPC; H1: `deflector_hole` redistribui entre console e ventilação). Margem de erro mockada = desvio-padrão do sensor. `reliability` mockada por regra: config existente no dataset → `interpolation`; 1 variável diferente → `moderate_extrapolation`; mais → `out_of_domain`. Textos de ajuda (`help_pt`) das 7 variáveis em `glossary_copy.ts`, redigidos a partir do glossário (**sem reproduzir o PDF confidencial**).

**🛑 Ponto de parada 0:**
- `npm run dev` abre `/styleguide` com a identidade Whirlpool aplicada (fundo branco, Accomplished Blue, Nunito/Open Sans) — revisão humana do visual **aqui**, antes das telas.
- `sensor_registry.json` tem 77 sensores e 7 áreas; `variable_options.json` tem 7 variáveis com opções normalizadas (sem duplicatas por grafia).
- Teste unitário (Vitest): `LocalMockSource.predict()` retorna objeto válido contra o JSON Schema para 50 configs aleatórias; mesma config → mesma resposta; Broil > Pyro na média.
- Merge `feat/front-fase-0` → `dev`.

**Verificação:** `npm run test && npm run build`.

---

## Fase 1 — Demo standalone (⭐ fase apresentável sem API)

**Objetivo:** aplicação completa rodando só no navegador com `LocalMockSource`, gerando um `dist/` estático que abre em qualquer máquina (ou GitHub Pages/Vercel estático) — sem servidor, sem Python, sem login.

**Pré-requisitos:** Fase 0 concluída.

### Checkpoint 1a — Configurar e ler resultados (RF01, RF03, RF04, RF05, RF08)
1. Layout: barra superior (nome do produto, seletor BR/MX com MX desabilitado e tooltip "sem dados de treino para esta arquitetura"), painel esquerdo de configuração fixo, área principal de resultados.
2. Painel de configuração: 7 selects populados por `getMetadata()`, cada um com ícone de ajuda abrindo `help_pt` (ex.: `run_case` com setpoints — Pyro forno 400 °C, cooktop off; Broil C2 forno 280 °C, chapa 246 °C + 2 panelas 110 °C…). Seleção de áreas/sensores com "todas" padrão. Botão "Prever" e presets "Configuração de referência" (uma config real do dataset) para a demo começar preenchida.
3. Resultados: cabeçalho com resumo (sensores previstos, quantos excedem limite, pior razão temp/limite). Cards por `key_area` ordenados pela maior `limit_ratio`; dentro, tabela densa por sensor: nome, temp prevista (mono, tabular), margem `± x,x °C (y,y %)`, limite, barra temp/limite, badge de status (ok / atenção ≥ 90% / excede) e badge de confiabilidade.
4. Gauge circular por área (temp máxima da área vs. menor limite da área) e barras comparativas dos sensores da área selecionada.
5. Estado vazio/erro/carregando; tudo responsivo até 1024 px.

**🛑 Ponto de parada 1a:** sem tocar em código, é possível abrir a página, mudar `housing` de Closed para Open e ver IPC esquentar; alterar `run_case` e ver a média mudar; um sensor forçado acima do limite aparece em vermelho no topo. `npm run build` gera `dist/` que abre via `npx serve dist`. Merge em `dev`.

### Checkpoint 1b — Mapa térmico 3D ao vivo
6. Portar o protótipo para `<ThermalMap3D>` (react-three-fiber), re-temado para o tema claro (seção 1). Entrada: `predictions[]`; cor da zona = média prevista da área na escala de calor, com legenda mín/máx da consulta atual; hover/clique na zona filtra a tabela de resultados; zona sem sensores selecionados fica cinza.
7. Modo "comparar com referência": alternância que colore as zonas pelo **delta** entre a config atual e o preset de referência (divergente azul/laranja) — é a visualização que conta a história da H1 na apresentação.
8. Rodapé com disclaimer "geometria ilustrativa, não CAD" e "dados de demonstração (mock)" enquanto `VITE_DATA_SOURCE=local`.

**🛑 Ponto de parada 1b (demo de apresentação):**
- Roteiro de 3 minutos executável offline: abrir `dist/index.html` servido localmente → config de referência → resultados → mudar `deflector_hole` → 3D muda de cor e a tabela reordena → modo delta.
- Lighthouse acessibilidade ≥ 90; contraste texto/fundo ≥ 4,5:1 nos tokens usados.
- `npm run build` sem warnings; `dist/` versionado como artefato de release (tag `demo-v1`).
- Merge em `dev`.

**Verificação:** `npm run test && npm run build && npx serve dist`.

---

## Fase 1c — Fogão 3D v2: corpo sólido e peças configuráveis

**Motivação:** o mapa da 1b é transparente (herança do protótipo) e só reage à predição (cores), nunca à configuração — trocar `housing` não muda nada visível. Esta fase torna o fogão opaco e faz cada variável geométrica ter representação física que reage ao formulário em tempo real. Independente do backend; toca só `src/components/thermal-map/**` e o slot do mapa. Geometria continua ilustrativa (sem CAD).

**Etapa A — Corpo sólido e modos de vista:** fogão opaco em cinzas do style guide (corpo, porta com vidro, cooktop com grades, backsplash/console, pés); zonas viram superfícies coloridas no corpo; zonas internas ficam dentro. Seletor de vista **Sólido / Corte / Raio-X** (corte por `clippingPlanes` com slider; raio-X = corpo a ~15% e zonas opacas). Presets de câmera (frente, traseira, console, isométrica) + recentralizar.

**Etapa B — Peças configuráveis:** `HousingLid` (Closed = tampa; Open = tampa removida; Open - Updated = aberta com rasgos), `Blower` + `AirflowArrows` (InstancedMesh, sentido por `blower_direction`, ramificação por `deflector_hole`), `DeflectorPlate` (com/sem furo), `ControlBoard` (Center/Right desliza), `CoilSupport` (Aluminium metálico / Aluminium Plate disco metálico / Plastic fosco escuro), `CooktopLoad` + `OvenGlow` por `run_case` (Pyro 400 °C: cooktop off; Broil C2: chapa + 2 panelas; Broil Qualitative: 4 panelas; Broil C1: 3 panelas + 1 chapa; brilho da cavidade proporcional ao setpoint). `losses` só rótulo. Transições animadas, respeitando `prefers-reduced-motion`.

**Etapa C — Ligação com a UI:** prop `config: StoveConfig` (rascunho do formulário) além de `predictions`; peça alterada pulsa ~1 s em `--wp-accent`; hover no select destaca a peça, hover na peça mostra "Variável: valor"; aviso "pré-visualização — clique em Prever" quando rascunho ≠ última predição.

**Etapa D — Acabamento:** testes das funções puras (variável → estado da peça, geração das setas), `/dev/thermal-map` com controles de todas as variáveis, screenshots no `DEMO.md`, FPS ≥ 50 em notebook comum, chunk sob controle.

**🛑 Ponto de parada 1c:** trocar cada uma das 6 variáveis geométricas no formulário produz mudança visível e animada no 3D sem clicar em Prever; os três modos de vista funcionam com as cores da predição; nada transparente por padrão; testes verdes e build limpo.

---

## Fase 1d — Clareza visual do 3D

**Diagnóstico após a 1c:** câmera fechada demais e corte a 75 % fatiando o cooktop; cores decorativas (placa verde, brilho da cavidade, setas ciano) competindo com o mapa de calor; zonas sem rótulo na cena; escala relativa de temperatura responde "onde está mais quente" quando a pergunta do engenheiro é "onde estoura o limite"; slider de corte é controle abstrato; peças alteradas sem nome na cena.

**Etapa A — Enquadramento e navegação:** fit-to-view automático (caixa do fogão → câmera com margem), padrão isométrica ¾ frontal-direita; cortes semânticos "Abrir console / Abrir traseira / Abrir forno" (levantam a tampa correspondente, animado) como controle principal, slider em "avançado"; tampa escura na face cortada; marcadores "Frente/Traseira" no chão.

**Etapa B — Hierarquia de cor:** corpo e peças em neutros, `--wp-accent` só na peça em foco; brilho da cavidade sutil + selo "Forno 400 °C · cooktop desligado"; novo modo de cor **Status (limite)** (verde / laranja ≥ 90 % / vermelho excede, pelo pior sensor da zona) como **padrão**; Absoluto e Δ continuam.

**Etapa C — Rótulos e pinos:** callouts HTML por zona (nome, temp, bolinha de status, linha-guia) visíveis para alertas + selecionada, seletor "Rótulos: todos / alertas / nenhum"; pinos de sensor para os que excedem/atenção e todos da zona selecionada, hover = nome + temp/limite, clique rola e destaca a linha da tabela; callout temporário "Peça → valor" junto do pulso.

**Etapa D — Legenda e contexto in-canvas:** legenda do modo ativo dentro do viewport (status: 3 chips com contagem; absoluto: barra com ticks; Δ: divergente); mini-resumo da configuração no canto.

**Etapa E — Acabamento:** `Environment` neutro + ACES, contorno em hover, opção "câmera segue a peça alterada" (off), testes das funções puras, `/dev/thermal-map`, screenshots nos três modos no `DEMO.md`, FPS com pinos e callouts.

**🛑 Ponto de parada 1d:** ao abrir, fogão inteiro visível com zonas em alerta rotuladas e coloridas por status; "Abrir console" mostra a eletrônica com a peça alterada nomeada; Absoluto/Δ trocam legenda e cores coerentemente; clique num pino leva à linha da tabela; testes verdes, build limpo.

---

## Fase 2 — API FastAPI (mock) + autenticação, atrás do mesmo contrato

**Objetivo:** o mesmo front, agora com `VITE_DATA_SOURCE=api`, falando com um backend real que ainda serve mock — e com login (RF06, RF10 base, RF12 formal).

**Pré-requisitos:** Fase 1 concluída.

**Tarefas:**
1. `src/backend/` com FastAPI, Pydantic v2 espelhando `v1.ts` (gerar e comparar contra `api_v1.schema.json` em teste). Endpoints: `GET /api/v1/metadata`, `POST /api/v1/predictions`, `GET /health`.
2. Portar `LocalMockSource` para Python (`app/predictors/mock.py`) com a mesma semente e regras — teste de paridade: 20 configs, front-mock e api-mock retornam valores iguais (±0,01).
3. Auth: `POST /api/v1/auth/login` (OAuth2 password → JWT), usuários em SQLite via SQLModel, seed de 2 usuários; tabela `access_log` (usuário, timestamp, rota, request_id) preenchida por middleware. Front: tela de login, guarda de rotas, expiração de token.
4. `ApiSource` no front; CORS; `docker-compose.yml` subindo front + API; `.env.example`.

**🛑 Ponto de parada 2:**
- Com `VITE_DATA_SOURCE=api`, o roteiro da demo 1b roda idêntico (mesmos números, já que o mock é o mesmo).
- Swagger em `/docs` reflete o contrato; teste de schema passa.
- Acesso sem token → 401 e redirect para login; `access_log` registra login e consultas.
- `docker compose up` sobe tudo. Merge em `dev`.

**Verificação:** `pytest src/backend && npm run test && docker compose up --build`.

---

## Fase 3 — Modelo real atrás do contrato (RF13, RF14, RF19)

**Pré-requisitos:** Fase 2; notebooks `Random_for_regre.ipynb` e `tratamento_final_dos_dados.ipynb` como referência.

**Tarefas:**
1. `src/backend/model/`: pipeline reproduzível `train.py` que lê `dataset_pre_processado.csv`, gera o wide por área, treina 1 RandomForest multi-output por `key_area` (GridSearchCV como no notebook), salva `artifacts/<version>/<area>.joblib` + encoders + `metrics.json` (MAE/MAPE/R² por termopar no conjunto de teste). Dados fora do repo por `DATA_DIR` (RF16).
2. `app/predictors/real.py`: aplica a mesma normalização de grafia do treino (RF14), roda as 7 áreas, monta `SensorPrediction` com `error_margin_c = MAE` do termopar e `error_margin_pct = MAPE`. `model_version` = pasta do artefato.
3. Seleção por `MODEL_MODE=mock|real`. O mock continua no repo para testes e demo.
4. **Decisão IPC Comp** (R² negativo): opção A — servir com `reliability="out_of_domain"` forçado e banner "modelo insuficiente para esta área"; opção B — excluir da resposta e marcar `available:false` no metadata. Registrar a escolha aqui.

**🛑 Ponto de parada 3:**
- Testes de contrato passam com `MODEL_MODE=real`.
- Para 3 configs do conjunto de teste, a predição da API bate com o notebook (mesma seed).
- `metrics.json` versionado; front exibe `model_version` e margem real.
- Decisão IPC Comp documentada e visível na UI. Merge em `dev`.

**Verificação:** `python -m model.train && MODEL_MODE=real pytest src/backend`.

---

## Fase 4 — Confiabilidade (RF07, RF09, RF18) e explicabilidade

**Pré-requisitos:** Fase 3.

**Tarefas:**
1. Detector de extrapolação real (R04): distância da config consultada às combinações de treino (Hamming sobre as 5 variáveis usadas) → 3 estados; substitui a regra mock. Banner no topo dos resultados quando ≠ interpolation.
2. Comparação lado a lado (RF09): até 4 configs em abas; tabela com uma coluna por config e delta; barras agrupadas; 3D no modo delta entre duas selecionadas. Sem endpoint novo (N chamadas).
3. Lote (RF18): `POST /api/v1/predictions/batch` recebendo CSV de configs; retorno CSV/JSON. Contrato v1.1 (aditivo).
4. SHAP por consulta (`shap.TreeExplainer`) exibido como "fatores associados", sempre com a nota da H2 ("associação, não causa") — nunca como ranking de importância.

**🛑 Ponto de parada 4:** 3 casos de teste de extrapolação (config do treino / vizinha / absurda) classificados corretamente; comparação de 2 configs demonstrável; batch com CSV de 10 linhas; SHAP renderizado com a ressalva. Merge em `dev`.

---

## Fase 5 — Acabamento e entrega (RF02, RF10, RF11)

**Tarefas:**
1. Exportação CSV/XLSX da consulta e da comparação (RF11).
2. Tela de histórico de acessos (RF10): filtros por usuário e período.
3. RF02 finalizado: MX desabilitado com mensagem clara vinda do metadata (`available:false`), pronto para receber modelo MX sem mudança de front.
4. Passada final de aderência ao style guide (checklist da seção 1), acessibilidade, textos.
5. Matriz RF01–RF19 × implementação no `documentacao.md` (seção 6); README de execução (dev, docker, build estático da demo); deploy (front estático + API — alvo a definir).

**🛑 Ponto de parada 5 (final):** matriz RF completa com status; `docker compose up` e build estático funcionando; README validado por alguém que nunca rodou o projeto. Merge `dev` → `main`.

---

## Mapa de requisitos por fase

| RF | Fase | RF | Fase |
|---|---|---|---|
| RF01 config | 1a | RF10 histórico | 2 (base) / 5 |
| RF02 BR/MX | 1a (UI) / 5 | RF11 exportação | 5 |
| RF03 seleção sensores | 1a | RF12 rotina programática | 2 |
| RF04 temperatura | 1a | RF13 modelos por arquitetura | 3 (estrutura) |
| RF05 margem de erro | 1a (mock) / 3 (real) | RF14 pré-processamento consistente | 3 |
| RF06 auth | 2 | RF15 só libs abertas | 0 (garantido pela stack) |
| RF07 extrapolação | 1a (mock) / 4 (real) | RF16 dados fora do repo | 3 |
| RF08 limite normativo | 1a | RF17 retreino sem alterar código | 3 (`train.py` + `DATA_DIR`) |
| RF09 comparação | 4 | RF18 lote | 4 |
| | | RF19 métricas versionadas | 3 |

## Pendências restantes
- **Alvo de deploy** (Fase 5) — a decidir; a demo da Fase 1 não depende disso.
- **Validação da escala de calor** com o parceiro (seção 1) — na primeira demo.
- **Decisão IPC Comp** — na Fase 3.
