import pytest
from procurement.retrieval.bm25 import BM25Retriever
from procurement.retrieval.dense import DenseRetriever
from procurement.retrieval.hybrid import HybridRetriever


@pytest.fixture
def retrievers():
    bm25 = BM25Retriever()
    dense = DenseRetriever()
    hybrid = HybridRetriever(bm25=bm25, dense=dense)
    return bm25, dense, hybrid


def test_bm25_retrieval(retrievers):
    bm25, _, _ = retrievers
    results = bm25.search("Direct Purchase 25000", k=3)
    assert len(results) > 0
    top_ids = [r.clause.clause_id for r in results]
    assert "FIXTURE-POLICY:1.1" in top_ids


def test_dense_retrieval(retrievers):
    _, dense, _ = retrievers
    results = dense.search("Local Purchase Committee quotations", k=3)
    assert len(results) > 0
    top_ids = [r.clause.clause_id for r in results]
    assert "FIXTURE-POLICY:1.2" in top_ids


def test_hybrid_retrieval_rrf(retrievers):
    _, _, hybrid = retrievers
    results = hybrid.search("open tender CPP portal 25 lakh", k=3)
    assert len(results) > 0
    assert results[0].clause.clause_id == "FIXTURE-POLICY:1.4"


def test_superseded_filtering(retrievers):
    bm25, _, _ = retrievers
    # Default search excludes superseded clause
    default_results = bm25.search("Direct Purchase 15000 2020", k=10)
    default_ids = [r.clause.clause_id for r in default_results]
    assert "FIXTURE-POLICY:OLD:1.0" not in default_ids

    # Search with include_superseded=True includes it
    all_results = bm25.search(
        "Direct Purchase 15000 2020", k=10, filters={"include_superseded": True}
    )
    all_ids = [r.clause.clause_id for r in all_results]
    assert "FIXTURE-POLICY:OLD:1.0" in all_ids
