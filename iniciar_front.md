# Como acessar o dashboard localmente

O Thermal Predictor roda **inteiramente na sua máquina**. Não há deploy, nem
Docker, nem servidor remoto. São **dois processos** que você sobe à mão, em
dois terminais:

| Processo | O que é | Porta |
| --- | --- | --- |
| **API** (back-end) | FastAPI que carrega os modelos treinados e responde às predições | `8000` |
| **Interface** (front-end) | React + Vite, o dashboard que você abre no navegador | `5173` |

> A interface **não funciona sozinha**. Sem a API no ar, a tela de login
> responde "Não foi possível contactar a API". É o erro mais comum — e quase
> sempre significa só que o Terminal 1 não foi aberto.

---

## Pré-requisitos (uma vez só)

- **Python 3.12+** e **Node 20+**
- Dependências instaladas:

```powershell
# a partir da raiz do repositório
pip install -r src/backend/requirements.txt
npm run install:frontend
```

Os modelos treinados precisam existir em `models/`. Se a pasta estiver vazia,
gere-os antes:

```powershell
.\venv\Scripts\python.exe scripts\export_models.py
```

---

## Passo 1 — Subir a API (Terminal 1)

### PowerShell (Windows)

```powershell
cd C:\Users\Inteli\Documents\mod_pred_Whirlpool\g03
.\venv\Scripts\Activate.ps1

$env:MODEL_MODE = "real"
cd src\backend
python -m uvicorn app.main:app --port 8000
```

> ⚠️ **No PowerShell, `MODEL_MODE=real python ...` NÃO funciona.** Essa é a
> sintaxe do Bash/Linux. No PowerShell a variável vai numa linha separada, com
> `$env:`. Se você usar a forma do Bash, verá:
> `O termo 'MODEL_MODE=real' não é reconhecido como nome de cmdlet...`

### Bash / Git Bash / Linux / macOS

```bash
cd /caminho/para/g03
source venv/Scripts/activate      # Linux/macOS: source venv/bin/activate

cd src/backend
MODEL_MODE=real python -m uvicorn app.main:app --port 8000
```

**Deu certo quando você vê:**

```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Deixe esse terminal aberto. Para conferir em outro terminal:

```powershell
curl http://localhost:8000/health
# {"status":"ok","contract_version":"1.2.0","model_mode":"real"}
```

Se `model_mode` vier `"mock"`, a variável não foi lida: a API está respondendo
com o gerador determinístico, **não com os modelos treinados**. Volte ao passo
do `$env:MODEL_MODE`.

---

## Passo 2 — Subir a interface (Terminal 2)

Abra um **segundo** terminal, sem fechar o primeiro:

```powershell
cd C:\Users\Inteli\Documents\mod_pred_Whirlpool\g03
npm run dev
```

**Deu certo quando você vê:**

```
VITE v8.3.0  ready in 633 ms
➜  Local:   http://localhost:5173/
```

---

## Passo 3 — Abrir e entrar

Acesse **http://localhost:5173** no navegador.

Credenciais de desenvolvimento:

| Usuário | Senha | Perfil |
| --- | --- | --- |
| `engenheiro` | `thermal2026` | Engenharia térmica |
| `admin` | `admin2026` | Administrador |

> São credenciais de demonstração, semeadas automaticamente na primeira
> execução da API. Troque-as antes de qualquer uso real.

Depois do login você cai na tela principal, com três abas: **Resultados**,
**Mapa térmico** e **Métricas Estatísticas**. Escolha a configuração do fogão
no painel à esquerda e clique em **Prever**.

---

## Quando der errado

### "Não foi possível contactar a API"

A API não está no ar. Confira o Terminal 1 e teste:

```powershell
curl http://localhost:8000/health
```

Sem resposta = o processo do passo 1 não está rodando ou morreu.

### `O termo 'MODEL_MODE=real' não é reconhecido...`

Você usou a sintaxe do Bash no PowerShell. Use `$env:MODEL_MODE = "real"` numa
linha separada (ver passo 1).

### `[Errno 10048] ... apenas uma utilização de cada endereço de soquete`

Já existe algo na porta 8000 — provavelmente uma API que você subiu antes e
esqueceu aberta. Ou reaproveite a que já está rodando (`curl .../health` para
confirmar que responde), ou descubra e encerre o processo:

```powershell
netstat -ano | Select-String ":8000" | Select-String "LISTENING"
# a última coluna é o PID
Stop-Process -Id <PID>
```

### `Port 5173 is already in use`

A interface **não migra mais de porta sozinha** — ela falha de propósito. Isso
é intencional: quando ela subia em 5174 ou 5175, o navegador bloqueava as
chamadas à API por CORS e a tela dizia apenas "Não foi possível contactar a
API", sem pista da causa real. Falhar aqui é mais honesto.

Encerre o processo que está ocupando a porta:

```powershell
netstat -ano | Select-String ":5173" | Select-String "LISTENING"
Stop-Process -Id <PID>
```

Se você **precisa** de outra porta, ela também funciona — a API aceita
qualquer porta de `localhost`:

```powershell
npm run dev -- --port 5180
```

### A tela abre mas os números parecem inventados

Confira o rodapé dos resultados: ele mostra a versão do conjunto de modelos.
Com `models-1.0.0` você está vendo modelos reais. Se a API subiu sem
`MODEL_MODE=real`, ela responde em modo mock — valores determinísticos de
demonstração, não predições do modelo treinado.

---

## Encerrando

`Ctrl+C` em cada um dos dois terminais.
