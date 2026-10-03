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
    results = bm25.search("Direct Purchase 50000 without quotation HoD", k=5)
    assert len(results) > 0
    top_ids = [r.clause.clause_id for r in results]
    assert any(cid in top_ids for cid in ["MGP-2024-C4.12", "INST-2026-DP1"])


def test_dense_retrieval(retrievers):
    _, dense, _ = retrievers
    results = dense.search("Local Purchase Committee quotations Dean", k=5)
    assert len(results) > 0
    top_ids = [r.clause.clause_id for r in results]
    assert any(cid in top_ids for cid in ["MGP-2024-C4.13", "INST-2026-DP2"])


def test_hybrid_retrieval_rrf(retrievers):
    _, _, hybrid = retrievers
    results = hybrid.search("open tender CPPP portal 25 lakh Advertised Tender", k=5)
    assert len(results) > 0
    top_ids = [r.clause.clause_id for r in results]
    assert any(
        cid in top_ids
        for cid in ["MGP-2024-C4.15", "INST-2026-DP3", "GFR-2017-R161"]
    )


def test_superseded_filtering(retrievers):
    bm25, _, _ = retrievers
    # Default search excludes superseded clauses (is_current=False)
    # GFR-2017-R154 is superseded
    default_results = bm25.search("Rule 154 Purchase of goods directly without quotation 25000", k=20)
    default_ids = [r.clause.clause_id for r in default_results]
    assert "GFR-2017-R154" not in default_ids

    # Search with include_superseded=True includes it
    all_results = bm25.search(
        "Rule 154 Purchase of goods directly without quotation 25000",
        k=20,
        filters={"include_superseded": True},
    )
    all_ids = [r.clause.clause_id for r in all_results]
    assert "GFR-2017-R154" in all_ids
