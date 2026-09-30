# Como iniciar a aplicação localmente

Este guia é para quem acabou de clonar o repositório e quer abrir o dashboard
com a API funcionando. A aplicação usa dois processos locais:

| Processo | Tecnologia | Endereço |
| --- | --- | --- |
| API | FastAPI | `http://localhost:8000` |
| Interface | React + Vite | `http://localhost:5173` |

A interface depende da API. O login e as demais requisições são enviados, por
padrão, para a porta `8000`.

## Pré-requisitos

Instale antes:

- Git;
- Python 3.12 ou superior;
- Node.js 20 ou superior (inclui o npm).

Confirme as versões no terminal:

```powershell
git --version
python --version
node --version
npm --version
```

## 1. Abrir o repositório e preparar as dependências

Após clonar o repositório, abra um PowerShell na pasta raiz — a pasta que
contém `package.json`, `src` e `models`.

```powershell
cd C:\caminho\para\g03
```

Crie e ative um ambiente virtual para as dependências Python:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Se o PowerShell bloquear a ativação por política de execução, libere-a apenas
para a janela atual e tente de novo:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

Com o ambiente virtual ativo, instale as dependências da API e do frontend:

```powershell
python -m pip install --upgrade pip
python -m pip install -r src\backend\requirements.txt
npm run install:frontend
```

> O primeiro `npm run install:frontend` pode demorar alguns minutos. Ele
> instala as dependências em `src/frontend/node_modules`.

## 2. Iniciar a API (Terminal 1)

Abra um primeiro terminal na raiz do repositório, ative o ambiente virtual e
inicie o FastAPI:

```powershell
cd C:\caminho\para\g03
.\venv\Scripts\Activate.ps1
cd src\backend
python -m uvicorn app.main:app --port 8000
```

O terminal deve mostrar uma mensagem semelhante a:

```text
Uvicorn running on http://127.0.0.1:8000
```

Deixe esse terminal aberto. Em outro terminal, confirme que a API responde:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

O resultado deve conter `status` com valor `ok`. A documentação interativa
da API também fica disponível em <http://localhost:8000/docs>.

## 3. Iniciar o frontend (Terminal 2)

Abra um segundo terminal, volte à raiz do repositório e execute:

```powershell
cd C:\caminho\para\g03
npm run dev
```

O Vite deve informar:

```text
Local: http://localhost:5173/
```

Abra <http://localhost:5173> no navegador.

Não é necessário criar um `.env` para o uso local: se
`VITE_API_BASE_URL` não estiver definida, o frontend usa
`http://localhost:8000`. Para apontar o frontend a outra API, crie
`src/frontend/.env` com, por exemplo:

```dotenv
VITE_API_BASE_URL=http://servidor-exemplo:8000
```

Reinicie o Vite depois de alterar essa variável.

## 4. Entrar no dashboard

Use uma das credenciais de desenvolvimento:

| Usuário | Senha | Perfil |
| --- | --- | --- |
| `engenheiro` | `thermal2026` | Engenharia térmica |
| `admin` | `admin2026` | Administrador |

Após o login, escolha uma configuração no painel à esquerda e clique em
**Prever**.

## Verificação rápida

Com os dois processos em execução:

| Verificação | Resultado esperado |
| --- | --- |
| Abrir `http://localhost:8000/health` | JSON com `"status": "ok"` |
| Abrir `http://localhost:5173` | Tela de login |
| Inspecionar o login no navegador | `POST http://localhost:8000/api/v1/auth/login` |

## Problemas comuns

### O login retorna 404 em `localhost:5173/api/v1/auth/login`

Isso indica que uma versão antiga do frontend ainda está em execução, pois a
versão atual envia a requisição para a porta `8000`. Pare o Vite com
`Ctrl+C`, confirme que o código está atualizado e execute `npm run dev`
novamente. Atualize a página do navegador em seguida.

### “Não foi possível contactar a API”

A API não está em execução, encerrou com erro ou não está na porta `8000`.
Confira o Terminal 1 e execute:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Se não houver resposta, inicie novamente a API conforme a etapa 2.

### A porta 8000 ou 5173 já está em uso

Antes de encerrar qualquer processo, descubra qual PID ocupa a porta:

```powershell
Get-NetTCPConnection -LocalPort 8000,5173 -State Listen |
  Select-Object LocalPort, OwningProcess
```

Se o PID for de uma execução anterior deste projeto, encerre somente esse
processo:

```powershell
Stop-Process -Id <PID>
```

Depois, inicie novamente apenas o processo cuja porta estava ocupada.

### A API informa que não encontrou os modelos

Os artefatos em `models/` são necessários para a API iniciar. Em um clone
completo, `models/manifest.json` e os arquivos `.joblib` já devem estar
presentes. Confirme que o clone foi concluído e peça os artefatos à equipe se
eles não vierem no repositório.

O comando `scripts/export_models.py` treina novamente os modelos e requer o
conjunto de dados de treino, que não faz parte deste roteiro de inicialização.

## Encerrar a aplicação

Em cada terminal que estiver executando a API ou o Vite, pressione
`Ctrl+C`. O ambiente virtual pode ser desativado com:

```powershell
deactivate
```
