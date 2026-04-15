import io
from pathlib import Path
from typing import List

import PyPDF2
from PyPDF2.errors import PdfReadError, PdfStreamError
from docx import Document as DocxDocument


def parse_pdf(file_like: io.BytesIO, filename: str, s3_key: str) -> List[dict]:
    try:
        reader = PyPDF2.PdfReader(file_like)
        if reader.is_encrypted:
            raise ValueError("PDF is password-protected and cannot be parsed.")
        pages = []
        for page_num, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            if not text:
                continue
            pages.append({
                "text": text,
                "metadata": {
                    "source_file": filename,
                    "page_number": page_num,
                    "s3_key": s3_key,
                },
            })
        return pages
    except (PdfReadError, PdfStreamError) as e:
        raise ValueError(f"Failed to parse PDF: {e}") from e


def parse_docx(file_like: io.BytesIO, filename: str, s3_key: str) -> List[dict]:
    try:
        doc = DocxDocument(file_like)
        pages = []
        for para_index, para in enumerate(doc.paragraphs):
            text = para.text.strip()
            if not text:
                continue
            # Heuristic: python-docx has no page boundary API; approximate at 10 paragraphs/page
            page = (para_index // 10) + 1
            pages.append({
                "text": text,
                "metadata": {
                    "source_file": filename,
                    "page_number": page,
                    "s3_key": s3_key,
                },
            })
        return pages
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {e}") from e


def parse_txt(file_like: io.BytesIO, filename: str, s3_key: str) -> List[dict]:
    try:
        text = file_like.read().decode("utf-8", errors="replace").strip()
        if not text:
            return []
        return [{
            "text": text,
            "metadata": {
                "source_file": filename,
                "page_number": 1,
                "s3_key": s3_key,
            },
        }]
    except OSError as e:
        raise ValueError(f"Failed to parse TXT: {e}") from e


def parse_document(file_like: io.BytesIO, filename: str, s3_key: str) -> List[dict]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return parse_pdf(file_like, filename, s3_key)
    elif suffix == ".docx":
        return parse_docx(file_like, filename, s3_key)
    elif suffix == ".txt":
        return parse_txt(file_like, filename, s3_key)
    else:
        raise ValueError(
            f"Unsupported file type '{suffix}'. Allowed: .pdf, .docx, .txt"
        )
