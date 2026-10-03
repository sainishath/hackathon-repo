from typing import Optional, Any
from procurement.models import Clause, ScoredClause
from procurement.retrieval.base import BaseRetriever
from procurement.retrieval.bm25 import BM25Retriever
from procurement.retrieval.dense import DenseRetriever


class HybridRetriever(BaseRetriever):
    """Hybrid Retriever combining BM25 and Dense embeddings via Reciprocal Rank Fusion (RRF)."""

    def __init__(
        self,
        bm25: Optional[BM25Retriever] = None,
        dense: Optional[DenseRetriever] = None,
        rrf_k: int = 60,
    ):
        self.bm25 = bm25 or BM25Retriever()
        self.dense = dense or DenseRetriever()
        self.rrf_k = rrf_k

    def search(
        self,
        query: str,
        k: int = 5,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[ScoredClause]:
        # Query both retrievers for an expanded candidate pool
        fetch_k = max(k * 3, 20)
        bm25_results = self.bm25.search(query, k=fetch_k, filters=filters)
        dense_results = self.dense.search(query, k=fetch_k, filters=filters)

        clause_map: dict[str, Clause] = {}
        rrf_scores: dict[str, float] = {}

        # 1. Accumulate BM25 ranks
        for rank, item in enumerate(bm25_results, start=1):
            cid = item.clause.clause_id
            clause_map[cid] = item.clause
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.rrf_k + rank))

        # 2. Accumulate Dense ranks
        for rank, item in enumerate(dense_results, start=1):
            cid = item.clause.clause_id
            clause_map[cid] = item.clause
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (self.rrf_k + rank))

        # 3. Sort by reciprocal rank score
        ranked_clause_ids = sorted(
            rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True
        )

        results: list[ScoredClause] = []
        for cid in ranked_clause_ids[:k]:
            results.append(
                ScoredClause(clause=clause_map[cid], score=float(rrf_scores[cid]))
            )

        return results
