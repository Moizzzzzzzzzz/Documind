from pathlib import Path
from typing import List

import PyPDF2
from PyPDF2.errors import PdfReadError, PdfStreamError
from docx import Document as DocxDocument


def parse_pdf(file_path: Path, filename: str) -> List[dict]:
    try:
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            if reader.is_encrypted:
                raise ValueError("PDF is password-protected and cannot be parsed.")
            pages = []
            for page_num, page in enumerate(reader.pages, start=1):
                text = (page.extract_text() or "").strip()
                if not text:
                    continue
                pages.append({"text": text, "metadata": {"source_file": filename, "page_number": page_num}})
        return pages
    except (PdfReadError, PdfStreamError) as e:
        raise ValueError(f"Failed to parse PDF: {e}") from e


def parse_docx(file_path: Path, filename: str) -> List[dict]:
    try:
        doc = DocxDocument(str(file_path))
        pages = []
        for para_index, para in enumerate(doc.paragraphs):
            text = para.text.strip()
            if not text:
                continue
            # Heuristic: python-docx has no page boundary API; approximate at 10 paragraphs/page
            page = (para_index // 10) + 1
            pages.append({"text": text, "metadata": {"source_file": filename, "page_number": page}})
        return pages
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {e}") from e


def parse_txt(file_path: Path, filename: str) -> List[dict]:
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read().strip()
        if not text:
            return []
        return [{"text": text, "metadata": {"source_file": filename, "page_number": 1}}]
    except OSError as e:
        raise ValueError(f"Failed to parse TXT: {e}") from e


def parse_document(file_path: Path, filename: str) -> List[dict]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return parse_pdf(file_path, filename)
    elif suffix == ".docx":
        return parse_docx(file_path, filename)
    elif suffix == ".txt":
        return parse_txt(file_path, filename)
    else:
        raise ValueError(f"Unsupported file type '{suffix}'. Allowed: .pdf, .docx, .txt")
