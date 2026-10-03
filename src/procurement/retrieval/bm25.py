import re
import json
from pathlib import Path
from typing import Optional, Union, Any

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None

from procurement.config import settings
from procurement.models import Clause, ScoredClause
from procurement.retrieval.base import BaseRetriever


def simple_tokenize(text: str) -> list[str]:
    """Lowercase whitespace/word tokenization."""
    return re.findall(r"\b\w+\b", text.lower())


class SimpleBM25Fallback:
    """Lightweight pure-python BM25 fallback if rank_bm25 is not present."""

    def __init__(self, corpus: list[list[str]], k1: float = 1.5, b: float = 0.75):
        import math
        self.corpus_size = len(corpus)
        self.avg_doc_len = sum(len(doc) for doc in corpus) / (self.corpus_size or 1)
        self.doc_lens = [len(doc) for doc in corpus]
        self.k1 = k1
        self.b = b

        # Term document frequencies
        self.doc_freqs: list[dict[str, int]] = []
        df: dict[str, int] = {}
        for doc in corpus:
            frequencies: dict[str, int] = {}
            for word in doc:
                frequencies[word] = frequencies.get(word, 0) + 1
            self.doc_freqs.append(frequencies)
            for word in set(doc):
                df[word] = df.get(word, 0) + 1

        self.idf: dict[str, float] = {}
        for word, freq in df.items():
            self.idf[word] = math.log(
                (self.corpus_size - freq + 0.5) / (freq + 0.5) + 1.0
            )

    def get_scores(self, query_tokens: list[str]) -> list[float]:
        scores = [0.0] * self.corpus_size
        for word in query_tokens:
            if word not in self.idf:
                continue
            idf_val = self.idf[word]
            for i, doc_freq in enumerate(self.doc_freqs):
                tf = doc_freq.get(word, 0)
                if tf > 0:
                    numerator = tf * (self.k1 + 1.0)
                    denominator = tf + self.k1 * (
                        1.0 - self.b + self.b * (self.doc_lens[i] / self.avg_doc_len)
                    )
                    scores[i] += idf_val * (numerator / denominator)
        return scores


class BM25Retriever(BaseRetriever):
    """BM25 Lexical Retriever for procurement clauses."""

    def __init__(
        self,
        clauses: Optional[list[Clause]] = None,
        clauses_file: Optional[Union[str, Path]] = None,
    ):
        self.clauses_file = Path(clauses_file or settings.clauses_file)
        self.clauses: list[Clause] = clauses or self._load_clauses()
        self.tokenized_corpus = [
            simple_tokenize(f"{c.clause_id} {c.section_path} {c.text}")
            for c in self.clauses
        ]

        if BM25Okapi is not None:
            self.model = BM25Okapi(self.tokenized_corpus)
        else:
            self.model = SimpleBM25Fallback(self.tokenized_corpus)

    def _load_clauses(self) -> list[Clause]:
        if not self.clauses_file.exists():
            return []
        loaded: list[Clause] = []
        with open(self.clauses_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    loaded.append(Clause.model_validate_json(line))
        return loaded

    def search(
        self,
        query: str,
        k: int = 5,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[ScoredClause]:
        if not self.clauses:
            return []

        tokens = simple_tokenize(query)
        if not tokens:
            return []

        scores = self.model.get_scores(tokens)

        # Pair clauses with their scores and apply filters
        scored: list[ScoredClause] = []
        for i, score in enumerate(scores):
            clause = self.clauses[i]
            if self.apply_filters(clause, filters):
                scored.append(ScoredClause(clause=clause, score=float(score)))

        # Sort descending by score
        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:k]
