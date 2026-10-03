from pathlib import Path
from typing import Union, Any
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None


def extract_pages_from_pdf(pdf_path: Union[str, Path]) -> list[dict[str, Any]]:
    """Extract page number and raw text per page from a PDF file using PyMuPDF."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    if fitz is None:
        raise ImportError(
            "PyMuPDF is required to parse PDF documents. Install via `pip install PyMuPDF`."
        )

    doc = fitz.open(str(pdf_path))
    pages: list[dict[str, Any]] = []

    try:
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text() or ""
            pages.append(
                {
                    "page": page_idx + 1,
                    "text": text.strip(),
                }
            )
    finally:
        doc.close()

    return pages


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        extracted = extract_pages_from_pdf(sys.argv[1])
        print(f"Extracted {len(extracted)} pages.")
        for p in extracted:
            print(f"--- Page {p['page']} ---")
            print(p["text"][:200])
