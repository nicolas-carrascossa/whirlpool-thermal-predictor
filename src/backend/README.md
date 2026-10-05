# Back-end — Thermal Predictor (Fase 2)

API FastAPI que serve o **contrato v1** (`src/contracts/api_v1.schema.json`) com o
preditor **mock** portado do front-end, mais autenticação JWT e registro de
acessos. O modelo real entra na Fase 3 atrás da mesma interface.

## Sumário

- [Como rodar](#como-rodar)
- [Usuários de demonstração](#usuários-de-demonstração)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Endpoints](#endpoints)
- [Testes](#testes)
- [Paridade com o mock do navegador](#paridade-com-o-mock-do-navegador)
- [Estrutura](#estrutura)

## Como rodar

Na raiz do repositório (Windows / PowerShell):

```powershell
# 1. ambiente virtual (reaproveite o .venv do projeto, se já existir)
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r src\backend\requirements.txt

# 2. configuração
Copy-Item src\backend\.env.example src\backend\.env

# 3. servidor (http://localhost:8000, /docs para o Swagger)
cd src\backend
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Em Linux/macOS: `python3 -m venv .venv && . .venv/bin/activate && pip install -r
src/backend/requirements.txt && cd src/backend && uvicorn app.main:app --reload --port 8000`.

Na primeira execução o banco SQLite é criado e os dois usuários de demonstração
são semeados automaticamente (senhas com hash bcrypt — nunca em texto puro).

Para o front-end falar com esta API, rode-o com `VITE_DATA_SOURCE=api` e
`VITE_API_BASE_URL=http://localhost:8000`.

## Usuários de demonstração

| Usuário | Senha | Perfil | Nome exibido |
|---|---|---|---|
| `engenheiro` | `thermal2026` | `engineer` | João — Engenharia Térmica |
| `admin` | `admin2026` | `admin` | Administrador |

> **Atenção:** estas credenciais, assim como o `JWT_SECRET` padrão de
> `app/config.py`, existem **apenas para demonstração local** e são públicas por
> estarem neste repositório. Elas não dão acesso a nenhum sistema real nem a
> dados de pessoas. Troque-as antes de qualquer uso fora da máquina de
> desenvolvimento.

## Variáveis de ambiente

Lidas de `src/backend/.env` (ou do ambiente). Ver `.env.example`.

| Variável | Padrão | Para que serve |
|---|---|---|
| `JWT_SECRET` | `dev-secret-change-me` | Assinatura dos tokens. Troque em produção. |
| `JWT_EXPIRES_MIN` | `480` | Validade do token, em minutos. |
| `MODEL_MODE` | `real` | `real` (modelos treinados, padrão) ou `mock` (gerador determinístico, só para testes/demos). É a **única** chave de operação: o algoritmo de cada área vem do manifesto, nunca da requisição. |
| `MODEL_DIR` | `src/backend/models` | Artefatos `.joblib` + `manifest.json`, gerados por `src/scripts/export_models.py`. Só é lido com `MODEL_MODE=real`. |
| `DATA_DIR` | `../frontend/src/data` | Pasta dos JSONs do dataset (e do `model_manifest.json`). O back-end lê **os mesmos arquivos** do front; nada é duplicado. |
| `DB_PATH` | `./thermal.db` | Arquivo SQLite (usuários + `access_log`), relativo a `src/backend/`. |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174,http://localhost:4173` | Origens liberadas, separadas por vírgula. |

## Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/health` | pública | Liveness + `contract_version` + `model_mode`. |
| `POST` | `/api/v1/auth/login` | pública | Formulário OAuth2 (`application/x-www-form-urlencoded`) com `username` e `password` → `{access_token, token_type, expires_in, user}`. Credenciais erradas → `401 {"detail": "Usuário ou senha inválidos"}`. |
| `GET` | `/api/v1/auth/me` | Bearer | Usuário do token. |
| `GET` | `/api/v1/metadata` | Bearer | 7 variáveis (com textos pt-BR), 77 sensores, 7 áreas, arquiteturas e a configuração de referência. |
| `POST` | `/api/v1/predictions` | Bearer | Predição das 77 temperaturas (ou do recorte pedido em `targets`). |

Sem token (ou com token inválido/expirado) qualquer rota `/api/v1/*` responde
`401 {"detail": "Não autenticado"}` com o cabeçalho `WWW-Authenticate: Bearer`.
Valor fora das opções canônicas responde `422 {"detail": "Valor inválido para
\"housing\": ... Valores aceitos: ..."}`. Toda resposta traz `X-Request-Id`
(nas predições, o `request_id` determinístico da consulta).

`MX` é aceito e responde `200` com `architecture_available: false` e
`predictions: []` — não há dados de treino para essa arquitetura.

Exemplo:

```powershell
$tok = (Invoke-RestMethod -Method Post http://localhost:8000/api/v1/auth/login `
        -Body @{username='engenheiro'; password='thermal2026'}).access_token
Invoke-RestMethod http://localhost:8000/api/v1/metadata -Headers @{Authorization="Bearer $tok"}
```

### Registro de acessos (RF10, base)

Todo acesso a `/api/v1/*` — login incluído — grava uma linha em `access_log`:
`id, username, ts_utc, method, path, request_id, status_code, duration_ms`.

A rota de predições preenche ainda, na mesma linha: `architecture`,
`model_set_version`, as 7 variáveis de configuração (uma coluna cada),
`targets_json` (o recorte como submetido) e `area_algorithms_json` (o
mapeamento área → algoritmo **efetivamente aplicado naquela chamada**). Como o
mapeamento é configuração e muda com o tempo, guardá-lo por chamada é o que
permite, meses depois, saber qual modelo produziu aquele número. Nas demais
rotas essas colunas ficam nulas.

A tela de histórico é a Fase 5; hoje a tabela pode ser lida direto do SQLite.

> **Banco de desenvolvimento criado antes da v1.1.** `init_db()` roda um passo
> de migração que adiciona as colunas novas via `ALTER TABLE` — não é preciso
> recriar o `thermal.db`. Se ainda assim quiser começar do zero, apague o
> arquivo (`del srcackend	hermal.db` no Windows) e suba a API de novo: os
> usuários de demonstração são recriados.

### Modelos reais (`MODEL_MODE=real`)

Um único preditor carrega os 7 artefatos e roteia por `key_area`, conforme o
`manifest.json`. Pontos que valem saber:

- **O mapeamento área → algoritmo não está em código.** Vive no manifesto e é
  servido em `Metadata.area_algorithms`; trocá-lo é reexportar, não fazer
  deploy.
- **Cada artefato carrega o próprio dicionário de codificação.** Random Forest
  e Gradient Boosting foram treinados em notebooks distintos e divergem em
  `material_coil_support`; um de-para global codificaria valores errados sem
  erro nenhum.
- **As grafias da API e as do treino são inversas** ("To back" × "To Back",
  "Aluminium" × "Aluminium "). A tradução é resolvida na exportação e gravada
  em `canonical_to_training`.
- **Opção canônica que uma área nunca viu no treino remove aquela área da
  resposta**, e as demais respondem. Valor fora das opções canônicas continua
  sendo 422.
- `scikit-learn` e `joblib` estão com versão **pinada**: o preditor avisa no
  startup se a versão carregada divergir da registrada no manifesto.

## Testes

```powershell
.\.venv\Scripts\python.exe -m pytest src\backend\tests -q
```

Cobrem: `/health`, login ok/falha, 401 sem token, formato do metadata,
predição validada contra o JSON Schema do contrato, opção inválida → 422,
MX indisponível, escrita no `access_log`, ausência de drift entre os modelos
Pydantic e `src/contracts/api_v1.schema.json`, e a paridade com o mock do front.

## Paridade com o mock do navegador

`app/predictors/mock.py` é um port exato de
`src/frontend/src/sources/LocalMockSource.ts`: mesmo FNV-1a de 32 bits, mesmo
PRNG mulberry32 (com a aritmética de 32 bits sem sinal e a semântica de
`Math.imul` reproduzidas) e o mesmo arredondamento `Math.round(v*100)/100`.

A fixture de comparação é gerada pelo front e versionada em
`src/contracts/fixtures/mock_parity_v1.json` (25 configurações determinísticas):

```powershell
cd src\frontend
$env:EXPORT_PARITY='1'; npx vitest run src/sources/exportParityFixture.test.ts
```

`tests/test_parity.py` exige igualdade com tolerância `1e-6` nos campos
numéricos e igualdade exata em textos, booleanos, `request_id`,
`ignored_fields`, `architecture_available` e `model_version`. Se falhar, o erro
está no port em Python — não afrouxe a tolerância nem edite o mock TypeScript.

## Estrutura

```
src/backend/
├── app/
│   ├── config.py          # Settings (pydantic-settings, lê .env)
│   ├── copy_pt.py         # textos pt-BR das variáveis e áreas
│   ├── data.py            # leitura dos 3 JSONs do dataset
│   ├── db.py              # SQLModel: User, AccessLog, seed
│   ├── deps.py            # dependências (auth, preditor)
│   ├── main.py            # app, CORS, /health, tratamento de erros
│   ├── middleware.py      # access_log + X-Request-Id
│   ├── predictors/        # base.py (Protocol), mock.py, seleção por MODEL_MODE
│   ├── routers/           # auth.py, predictions.py
│   ├── schemas.py         # espelho do contrato v1
│   └── security.py        # bcrypt + JWT
└── tests/                 # pytest (api, drift de schema, paridade)
```

> Nota: o `passlib` 1.7.4 é incompatível com o `bcrypt` 5.x instalado neste
> ambiente, então `security.py` usa a biblioteca `bcrypt` diretamente (também
> open source).
