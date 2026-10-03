import json
import hashlib
from pathlib import Path
from typing import Optional, Union, Any
import numpy as np

from procurement.config import settings
from procurement.models import Clause, ScoredClause
from procurement.retrieval.base import BaseRetriever


def generate_deterministic_embedding(text: str, dim: int = 384) -> np.ndarray:
    """Generate a deterministic 384-dimensional unit vector from text.
    
    Used for offline tests and fixture operations without requiring
    external downloads from HuggingFace.
    """
    words = text.lower().split()
    vec = np.zeros(dim, dtype=np.float32)
    if not words:
        vec[0] = 1.0
        return vec

    for word in words:
        # Use md5 hash for reproducible token projection
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) % 2 == 0) else -1.0
        vec[idx] += sign

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    else:
        vec[0] = 1.0
    return vec


class DenseRetriever(BaseRetriever):
    """In-memory dense retriever using sentence-transformers or offline fallback."""

    def __init__(
        self,
        clauses: Optional[list[Clause]] = None,
        clauses_file: Optional[Union[str, Path]] = None,
        index_file: Optional[Union[str, Path]] = None,
        model_name: Optional[str] = None,
        offline: Optional[bool] = None,
    ):
        self.clauses_file = Path(clauses_file or settings.clauses_file)
        self.index_file = Path(index_file or settings.dense_index_file)
        self.clauses: list[Clause] = clauses or self._load_clauses()
        self.clause_map: dict[str, Clause] = {c.clause_id: c for c in self.clauses}
        self.model_name = model_name or settings.dense_model_name
        self.offline = settings.offline_embeddings if offline is None else offline

        self.model = None
        if not self.offline:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name)
            except Exception:
                # Graceful fallback to offline vector projection
                self.offline = True
                self.model = None

        self.clause_ids: list[str] = []
        self.vectors: np.ndarray = np.empty((0, 384), dtype=np.float32)
        self._build_or_load_index()

    def _load_clauses(self) -> list[Clause]:
        if not self.clauses_file.exists():
            return []
        loaded: list[Clause] = []
        with open(self.clauses_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    loaded.append(Clause.model_validate_json(line))
        return loaded

    def _encode_text(self, text: str) -> np.ndarray:
        if not self.offline and self.model is not None:
            vec = self.model.encode(text, normalize_embeddings=True)
            return np.array(vec, dtype=np.float32)
        return generate_deterministic_embedding(text, dim=384)

    def _build_or_load_index(self) -> None:
        if self.index_file.exists():
            try:
                data = np.load(str(self.index_file), allow_pickle=True)
                self.clause_ids = list(data["clause_ids"])
                self.vectors = data["vectors"]
                if len(self.clause_ids) == len(self.clauses):
                    return
            except Exception:
                pass

        # Build vectors from scratch
        if not self.clauses:
            return

        self.clause_ids = [c.clause_id for c in self.clauses]
        vec_list = []
        for c in self.clauses:
            full_text = f"{c.section_path}. {c.text}"
            vec = self._encode_text(full_text)
            vec_list.append(vec)

        self.vectors = np.array(vec_list, dtype=np.float32)
        # Ensure parent dir exists and save
        self.index_file.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            str(self.index_file),
            clause_ids=np.array(self.clause_ids),
            vectors=self.vectors,
        )

    def search(
        self,
        query: str,
        k: int = 5,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[ScoredClause]:
        if len(self.clause_ids) == 0 or len(self.vectors) == 0:
            return []

        q_vec = self._encode_text(query)
        # Cosine similarity via dot product (vectors are normalized)
        scores = np.dot(self.vectors, q_vec)

        scored: list[ScoredClause] = []
        for i, score in enumerate(scores):
            clause_id = self.clause_ids[i]
            clause = self.clause_map.get(clause_id)
            if clause and self.apply_filters(clause, filters):
                scored.append(ScoredClause(clause=clause, score=float(score)))

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:k]
