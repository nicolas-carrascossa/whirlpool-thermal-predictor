"""Random Forest com o estimador hibrido da Secao 4.4.2 da documentacao.

Cada arvore agrupa os ensaios de treino em folhas e, por padrao, preve a MEDIA
da folha. O estimador hibrido troca essa media pela MEDIANA quando a media cai
fora do intervalo interquartil (IQR) dos valores de treino daquela folha — um
ensaio atipico deixa de puxar o grupo inteiro. A regra e aplicada por folha e
por termopar, e a previsao final e a media das arvores.

E a mesma regra de `estatisticas_por_folha` / `prever_hibrido` em
`notebooks/Random_for_regre.ipynb` (Celula 20), com duas diferencas so de
implementacao, sem efeito no numero:

- as estatisticas de folha sao calculadas UMA vez, no `fit`, e guardadas como
  uma tabela por no; o notebook as recalcula a cada chamada de previsao;
- a previsao e vetorizada (uma indexacao por arvore), em vez de um laco em
  Python por linha.

Como no notebook, as estatisticas usam TODAS as linhas de treino, nao so a
amostra bootstrap de cada arvore.

Este modulo vive no back-end, e nao em `scripts/`, porque o artefato `.joblib`
guarda o caminho de importacao da classe: `scripts/export_models.py` e o
`RealPredictor` precisam importa-la do mesmo lugar (`app.hybrid_forest`).
"""

from __future__ import annotations

from typing import Any

import numpy as np


class HybridForestRegressor:
    """`RandomForestRegressor` multi-saida com previsao hibrida media/mediana."""

    def __init__(self, **forest_params: Any) -> None:
        self.forest_params = forest_params

    def fit(self, X: Any, Y: Any) -> "HybridForestRegressor":
        from sklearn.ensemble import RandomForestRegressor

        X = np.asarray(X, dtype=np.float32)
        Y = np.asarray(Y, dtype=float)
        if Y.ndim == 1:
            Y = Y.reshape(-1, 1)
        self.forest_ = RandomForestRegressor(**self.forest_params).fit(X, Y)
        self.n_outputs_ = Y.shape[1]
        self.leaf_values_ = [self._leaf_table(tree, X, Y) for tree in self.forest_.estimators_]
        return self

    @staticmethod
    def _leaf_table(tree: Any, X: np.ndarray, Y: np.ndarray) -> np.ndarray:
        """Valor hibrido de cada folha, indexado pelo id do no na arvore."""
        leaves = tree.apply(X)
        table = np.full((tree.tree_.node_count, Y.shape[1]), np.nan)
        for leaf in np.unique(leaves):
            values = Y[leaves == leaf]
            mean = values.mean(axis=0)
            median = np.median(values, axis=0)
            q1 = np.percentile(values, 25, axis=0)
            q3 = np.percentile(values, 75, axis=0)
            outside_iqr = (mean < q1) | (mean > q3)
            table[leaf] = np.where(outside_iqr, median, mean)
        return table

    def predict(self, X: Any) -> np.ndarray:
        X = np.asarray(X, dtype=np.float32)
        per_tree = [
            table[tree.apply(X)]
            for tree, table in zip(self.forest_.estimators_, self.leaf_values_)
        ]
        return np.mean(per_tree, axis=0)

    @property
    def feature_importances_(self) -> np.ndarray:
        return self.forest_.feature_importances_
