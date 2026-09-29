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

## Passo 0 — Ver o que já está rodando (10 segundos)

Faça isto **antes** de tentar subir qualquer coisa. Se um dos dois processos
já estiver no ar (de uma sessão anterior que você esqueceu aberta, ou de uma
janela que fechou sem encerrar o processo), os comandos abaixo vão falhar com
"porta em uso" — e é fácil ler isso como "está tudo quebrado" quando, na
verdade, **a aplicação pode já estar funcionando**.

```powershell
curl http://localhost:8000/health    # API
curl http://localhost:5173/          # interface
```

| Resultado | O que fazer |
| --- | --- |
| Os dois respondem | Nada. Abra <http://localhost:5173> e use. Pule para o Passo 3. |
| Nenhum responde | Siga os Passos 1 e 2 normalmente. |
| Só um responde | Suba apenas o que falta, ou rode [`Free-Port`](#resetar-do-zero-liberando-as-portas) nos dois para começar limpo. |

> Encerrar o terminal **não garante** que o processo morreu. No Windows, o
> `npm run dev` deixa um `node` filho órfão segurando a porta 5173 mesmo
> depois que a janela some. Por isso a checagem acima vale mais que a memória
> de "eu fechei tudo".

---

## Passo 1 — Subir a API (Terminal 1)

### PowerShell (Windows)

```powershell
cd C:\Users\Inteli\Documents\mod_pred_Whirlpool\g03
.\venv\Scripts\Activate.ps1

cd src\backend
python -m uvicorn app.main:app --port 8000
```

### Bash / Git Bash / Linux / macOS

```bash
cd /caminho/para/g03
source venv/Scripts/activate      # Linux/macOS: source venv/bin/activate

cd src/backend
python -m uvicorn app.main:app --port 8000
```

**Deu certo quando você vê:**

```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Deixe esse terminal aberto. Para conferir em outro terminal:

```powershell
curl http://localhost:8000/health
# {"status":"ok","contract_version":"1.2.0","model_version":"models-1.0.0"}
```

Se a API não subir, o erro mais comum é `models/manifest.json` ausente —
gere os artefatos com `python scripts/export_models.py` (ver
[Pré-requisitos](#pré-requisitos-uma-vez-só)).

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

### `[Errno 10048] ... apenas uma utilização de cada endereço de soquete`

Já existe algo na porta 8000 — provavelmente uma API que você subiu antes e
esqueceu aberta. Ou reaproveite a que já está rodando (`curl .../health` para
confirmar que responde), ou libere a porta com
[`Free-Port 8000`](#resetar-do-zero-liberando-as-portas).

### `Port 5173 is already in use`

A interface **não migra mais de porta sozinha** — ela falha de propósito. Isso
é intencional: quando ela subia em 5174 ou 5175, o navegador bloqueava as
chamadas à API por CORS e a tela dizia apenas "Não foi possível contactar a
API", sem pista da causa real. Falhar aqui é mais honesto.

**Antes de matar o processo, confira se ele não é a própria interface já
funcionando:**

```powershell
curl http://localhost:5173/
```

Se responder, está tudo certo — é só abrir o navegador, não precisa subir
nada. Se não responder (ou você quiser começar limpo), libere a porta com
[`Free-Port 5173`](#resetar-do-zero-liberando-as-portas).

Esse processo preso costuma ser um `node` órfão de um `npm run dev` anterior:
fechar a janela do terminal **não** o encerra no Windows, e ele continua
segurando a porta indefinidamente — é exatamente o caso que `Free-Port` existe
para resolver.

Se você **precisa** de outra porta, ela também funciona — a API aceita
qualquer porta de `localhost`:

```powershell
npm run dev -- --port 5180
```

### A tela abre mas os números parecem inventados

Confira o rodapé dos resultados: ele mostra a versão do conjunto de modelos
(`models-1.0.0`). Se o valor não aparecer ou a API não tiver subido, confira
`curl http://localhost:8000/health` — se faltar `models/manifest.json`, gere
os artefatos com `python scripts/export_models.py`.

---

## Encerrando

`Ctrl+C` em cada um dos dois terminais.

No Windows, isso costuma **não ser suficiente** para a interface: o
`npm run dev` deixa um `node.exe` filho vivo, segurando a porta 5173, mesmo
depois que o terminal fecha ou o processo pai morre. Se a próxima tentativa de
subir a interface falhar com `Port 5173 is already in use` mesmo tendo dado
`Ctrl+C`, é esse órfão — vá para a seção abaixo.

## Resetar do zero (liberando as portas)

Quando você quiser ter certeza de que nada do projeto ficou para trás — para
rodar o `iniciar_front.md` de fato desde o início, ou depois de qualquer
sessão que tenha travado — cole isto **uma vez** no PowerShell:

```powershell
function Free-Port {
  param([Parameter(Mandatory)][int]$Port)
  $line = netstat -ano | Select-String ":$Port " | Select-String "LISTENING"
  if ($line) {
    $procId = ($line -split '\s+')[-1]
    Write-Output "Porta $Port ocupada por PID $procId — encerrando..."
    Stop-Process -Id $procId -Force
  } else {
    Write-Output "Porta $Port já está livre."
  }
}
```

Isso define a função só para a sessão atual do terminal (cole de novo se abrir
outro). Com ela definida, para liberar as duas portas do projeto:

```powershell
Free-Port 8000
Free-Port 5173
```

Confirme que ficou tudo livre:

```powershell
netstat -ano | Select-String ":8000|:5173" | Select-String "LISTENING"
# sem saída nenhuma = as duas portas estão livres
```

A partir daqui, `iniciar_front.md` pode ser executado do
[Passo 1](#passo-1--subir-a-api-terminal-1) como se fosse a primeira vez.

> Alternativa mais bruta, se você só quer matar **tudo** de Python e Node da
> sua sessão (não só o deste projeto) e não se importa com outros processos
> que possam estar rodando:
>
> ```powershell
> Get-Process python, node -ErrorAction SilentlyContinue | Stop-Process -Force
> ```
