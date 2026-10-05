#!/usr/bin/env python
"""
Define a data de inicio das issues de uma milestone, para um assignee.

O token NUNCA vai no codigo. Ele e lido da variavel de ambiente GITLAB_TOKEN.

    # PowerShell
    $env:GITLAB_TOKEN = "<seu token>"
    python src/scripts/datas_sprint4.py                # inspeciona, nao altera nada
    python src/scripts/datas_sprint4.py --aplicar      # aplica

    # bash
    export GITLAB_TOKEN="<seu token>"

Rode sem --aplicar primeiro. A saida mostra exatamente quais issues seriam tocadas
e se a instancia aceita o campo de data de inicio.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

HOST = "https://git.inteli.edu.br"
PROJETO = "graduacao/2026-2a/t29/g03"
MILESTONE = "Sprint 4"
ASSIGNEE = "vitor.lisboa"
DATA_INICIO = "2026-09-14"

TOKEN = os.environ.get("GITLAB_TOKEN")
if not TOKEN:
    sys.exit("GITLAB_TOKEN nao definida. Veja o cabecalho deste arquivo.")


def rest(caminho, params=None):
    url = "%s/api/v4/%s" % (HOST, caminho)
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(url, headers={"PRIVATE-TOKEN": TOKEN})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def graphql(query, variaveis):
    corpo = json.dumps({"query": query, "variables": variaveis}).encode()
    req = urllib.request.Request(
        "%s/api/graphql" % HOST, data=corpo,
        headers={"PRIVATE-TOKEN": TOKEN, "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


MUTACAO = """
mutation($id: WorkItemID!, $inicio: Date!) {
  workItemUpdate(input: {id: $id, startAndDueDateWidget: {startDate: $inicio}}) {
    errors
    workItem { id iid widgets { ... on WorkItemWidgetStartAndDueDate { startDate dueDate } } }
  }
}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--aplicar", action="store_true",
                    help="grava as alteracoes (sem esta flag, so inspeciona)")
    args = ap.parse_args()

    proj = urllib.parse.quote(PROJETO, safe="")
    try:
        versao = rest("version")
        print("GitLab %s (%s)\n" % (versao.get("version"), versao.get("revision")))
    except urllib.error.HTTPError as e:
        sys.exit("Falha ao autenticar (%s). Token invalido, expirado ou sem escopo 'api'." % e.code)

    issues = rest("projects/%s/issues" % proj,
                  {"milestone": MILESTONE, "assignee_username": ASSIGNEE,
                   "state": "all", "per_page": 100})
    if not issues:
        sys.exit("Nenhuma issue na milestone '%s' com assignee '%s'." % (MILESTONE, ASSIGNEE))

    print("%d issue(s) encontrada(s) na milestone '%s' para '%s':\n"
          % (len(issues), MILESTONE, ASSIGNEE))
    for it in issues:
        print("  #%-5s %-58s estado=%-7s due=%s"
              % (it["iid"], it["title"][:58], it["state"], it.get("due_date") or "-"))

    if not args.aplicar:
        print("\nModo inspecao. Nada foi alterado.")
        print("Para aplicar data de inicio %s: python %s --aplicar" % (DATA_INICIO, sys.argv[0]))
        return

    print("\nAplicando data de inicio %s...\n" % DATA_INICIO)
    ok = falhou = 0
    for it in issues:
        r = graphql(MUTACAO, {"id": it["id"] if str(it["id"]).startswith("gid://")
                              else "gid://gitlab/WorkItem/%s" % it["id"],
                              "inicio": DATA_INICIO})
        erros = r.get("errors") or (r.get("data", {}).get("workItemUpdate") or {}).get("errors")
        if erros:
            print("  #%-5s FALHOU: %s" % (it["iid"], erros))
            falhou += 1
        else:
            print("  #%-5s ok" % it["iid"])
            ok += 1
    print("\n%d alterada(s), %d falha(s)." % (ok, falhou))
    if falhou:
        print("Falha em todas costuma significar que a instancia/tier nao expoe data de")
        print("inicio em issues. Nesse caso o campo so existe em Epics e Milestones.")


if __name__ == "__main__":
    main()
