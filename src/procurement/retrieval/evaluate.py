import json
from pathlib import Path
from typing import Optional, Union, Any

from procurement.config import settings
from procurement.retrieval.bm25 import BM25Retriever
from procurement.retrieval.dense import DenseRetriever
from procurement.retrieval.hybrid import HybridRetriever


def compute_metrics(
    eval_records: list[dict[str, Any]],
    retriever,
    k_vals: tuple[int, ...] = (1, 3, 5),
) -> dict[str, float]:
    """Compute Recall@k and MRR for a given retriever against gold queries."""
    max_k = max(k_vals)
    recalls = {k: 0.0 for k in k_vals}
    rr_sum = 0.0
    total = len(eval_records)

    if total == 0:
        return {"recall@1": 0.0, "recall@3": 0.0, "recall@5": 0.0, "mrr": 0.0}

    for record in eval_records:
        query = record["query"]
        gold_ids = set(record["gold_clause_ids"])

        results = retriever.search(query, k=max_k)
        retrieved_ids = [r.clause.clause_id for r in results]

        # Calculate Recall@k
        for k in k_vals:
            top_k_ids = set(retrieved_ids[:k])
            if top_k_ids & gold_ids:
                recalls[k] += 1.0

        # Calculate Reciprocal Rank (first match rank)
        rr = 0.0
        for rank, cid in enumerate(retrieved_ids, start=1):
            if cid in gold_ids:
                rr = 1.0 / rank
                break
        rr_sum += rr

    metrics = {f"recall@{k}": round(recalls[k] / total, 4) for k in k_vals}
    metrics["mrr"] = round(rr_sum / total, 4)
    return metrics


def run_evaluation(
    gold_file: Optional[Union[str, Path]] = None,
    output_file: Optional[Union[str, Path]] = None,
) -> dict[str, Any]:
    """Run retrieval evaluation on BM25, Dense, and Hybrid retrievers."""
    gold_path = Path(gold_file or (settings.eval_dir / "gold_retrieval.jsonl"))
    out_path = Path(output_file or (settings.eval_dir / "results.json"))

    if not gold_path.exists():
        raise FileNotFoundError(f"Gold retrieval benchmark file not found: {gold_path}")

    records: list[dict[str, Any]] = []
    with open(gold_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))

    print(f"Loaded {len(records)} test queries from {gold_path}")

    bm25 = BM25Retriever()
    dense = DenseRetriever()
    hybrid = HybridRetriever(bm25=bm25, dense=dense)

    bm25_metrics = compute_metrics(records, bm25)
    dense_metrics = compute_metrics(records, dense)
    hybrid_metrics = compute_metrics(records, hybrid)

    summary = {
        "num_queries": len(records),
        "methods": {
            "bm25": bm25_metrics,
            "dense": dense_metrics,
            "hybrid": hybrid_metrics,
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Results written to {out_path}:")
    print(json.dumps(summary, indent=2))
    return summary


if __name__ == "__main__":
    run_evaluation()
