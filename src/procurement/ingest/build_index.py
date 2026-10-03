import shutil
from pathlib import Path
from procurement.config import settings
from procurement.retrieval.bm25 import BM25Retriever
from procurement.retrieval.dense import DenseRetriever


def build_all_indexes(force_rebuild: bool = True) -> None:
    """Build BM25 and dense embedding indexes from processed clauses."""
    settings.processed_dir.mkdir(parents=True, exist_ok=True)

    # Ensure clauses.jsonl exists
    if not settings.clauses_file.exists() or settings.clauses_file.stat().st_size == 0:
        fixture_clauses = settings.fixtures_dir / "fixture_clauses.jsonl"
        if fixture_clauses.exists():
            shutil.copyfile(fixture_clauses, settings.clauses_file)
            print(f"Copied fixture clauses to {settings.clauses_file}")
        else:
            raise FileNotFoundError(
                f"No clauses found at {settings.clauses_file} or {fixture_clauses}"
            )

    if force_rebuild and settings.dense_index_file.exists():
        settings.dense_index_file.unlink()

    print(f"Loading clauses from {settings.clauses_file}...")
    bm25 = BM25Retriever(clauses_file=settings.clauses_file)
    print(f"[OK] BM25 Index initialized with {len(bm25.clauses)} clauses.")

    dense = DenseRetriever(
        clauses_file=settings.clauses_file,
        index_file=settings.dense_index_file,
    )
    print(
        f"[OK] Dense Index initialized with {len(dense.clauses)} vectors saved at {settings.dense_index_file}."
    )


if __name__ == "__main__":
    build_all_indexes(force_rebuild=True)
