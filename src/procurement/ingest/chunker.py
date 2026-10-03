import re
from pathlib import Path
from typing import Optional, Union, Any
import yaml

from procurement.models import Clause
from procurement.ingest.parse_pdf import extract_pages_from_pdf


# Regex pattern to match numbered clause headings:
# Matches: "Rule 145", "Rule 1.2", "4.2.1", "1.3", "Clause 2.1"
HEADING_REGEX = re.compile(
    r"(?:^|\n)\s*(?P<heading_label>(?:Rule\s+\d+(?:\.\d+)*|\d+(?:\.\d+)+|Clause\s+\d+(?:\.\d+)*))\s*[:\-\.]?\s*(?P<title>[^\n]*)",
    re.IGNORECASE,
)


def load_meta_sidecar(meta_path: Union[str, Path]) -> dict[str, Any]:
    """Load metadata sidecar yaml file for a document."""
    meta_path = Path(meta_path)
    if not meta_path.exists():
        return {
            "doc_id": meta_path.stem.replace(".meta", ""),
            "doc_title": meta_path.stem.replace(".meta", "").replace("-", " ").title(),
            "doc_type": "policy",
            "version": "v1.0",
            "effective_date": "2024-01-01",
            "is_current": True,
            "superseded_by": None,
        }
    with open(meta_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data


def normalize_clause_id(doc_id: str, heading_label: str) -> str:
    """Normalize heading label to standard clause_id format e.g. DOCID:4.2.1 or DOC:145."""
    clean_label = re.sub(r"^(Rule|Clause)\s*", "", heading_label.strip(), flags=re.IGNORECASE)
    return f"{doc_id}:{clean_label}"


def chunk_text(text: str, meta: dict[str, Any], page: int = 1) -> list[Clause]:
    """Split text into Clauses by numbered headings and attach document metadata."""
    doc_id = meta.get("doc_id", "DOC-UNKNOWN")
    doc_title = meta.get("doc_title", "Procurement Document")
    doc_type = meta.get("doc_type", "policy")
    version = meta.get("version", "v1.0")
    effective_date = meta.get("effective_date", "2024-01-01")
    is_current = meta.get("is_current", True)
    superseded_by = meta.get("superseded_by", None)

    matches = list(HEADING_REGEX.finditer(text))
    if not matches:
        # Fallback to single clause for this text block
        clause_id = f"{doc_id}:P{page}"
        return [
            Clause(
                clause_id=clause_id,
                doc_id=doc_id,
                doc_title=doc_title,
                doc_type=doc_type,
                version=version,
                effective_date=effective_date,
                section_path=f"Page {page}",
                page=page,
                text=text.strip(),
                is_current=is_current,
                superseded_by=superseded_by,
            )
        ]

    clauses: list[Clause] = []
    for i, match in enumerate(matches):
        start_idx = match.start()
        end_idx = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunk_body = text[start_idx:end_idx].strip()

        heading_label = match.group("heading_label").strip()
        heading_title = (match.group("title") or "").strip()
        clause_id = normalize_clause_id(doc_id, heading_label)
        section_path = (
            f"{heading_label} - {heading_title}" if heading_title else heading_label
        )

        clauses.append(
            Clause(
                clause_id=clause_id,
                doc_id=doc_id,
                doc_title=doc_title,
                doc_type=doc_type,
                version=version,
                effective_date=effective_date,
                section_path=section_path,
                page=page,
                text=chunk_body,
                is_current=is_current,
                superseded_by=superseded_by,
            )
        )

    return clauses


def process_document(pdf_path: Union[str, Path], meta_path: Optional[Union[str, Path]] = None) -> list[Clause]:
    """Extract pages from a PDF and chunk them into Clauses."""
    pdf_path = Path(pdf_path)
    if meta_path is None:
        meta_path = pdf_path.with_name(f"{pdf_path.name}.meta.yaml")
        if not meta_path.exists():
            meta_path = pdf_path.with_suffix(".meta.yaml")

    meta = load_meta_sidecar(meta_path)
    pages = extract_pages_from_pdf(pdf_path)

    all_clauses: list[Clause] = []
    for p in pages:
        page_num = p["page"]
        raw_text = p["text"]
        if raw_text.strip():
            page_clauses = chunk_text(raw_text, meta, page=page_num)
            all_clauses.extend(page_clauses)

    return all_clauses


def write_clauses_to_jsonl(clauses: list[Clause], output_path: Union[str, Path]) -> None:
    """Write list of Clauses to a JSONL file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for c in clauses:
            f.write(c.model_dump_json() + "\n")
