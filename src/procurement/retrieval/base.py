from abc import ABC, abstractmethod
from typing import Optional, Any
from procurement.models import Clause, ScoredClause


class BaseRetriever(ABC):
    """Abstract base class for procurement clause retrieval."""

    @abstractmethod
    def search(
        self,
        query: str,
        k: int = 5,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[ScoredClause]:
        """Search clauses by text query with optional metadata filtering."""
        pass

    def apply_filters(
        self,
        clause: Clause,
        filters: Optional[dict[str, Any]] = None,
    ) -> bool:
        """Check whether a clause satisfies specified filters.
        
        Default behavior:
        - Only include is_current=True unless filters['include_superseded'] is True.
        - Additional exact key-value filters match Clause attributes.
        """
        if filters is None:
            filters = {}

        # Default filter: is_current=True unless include_superseded is requested
        include_superseded = filters.get("include_superseded", False)
        if not include_superseded and not clause.is_current:
            return False

        # Additional metadata filters
        for key, val in filters.items():
            if key == "include_superseded":
                continue
            if hasattr(clause, key):
                if getattr(clause, key) != val:
                    return False

        return True
