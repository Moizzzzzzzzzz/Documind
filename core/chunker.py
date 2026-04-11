from typing import List

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


def chunk_documents(pages: List[dict]) -> List[Document]:
    if not pages:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    documents = [
        Document(page_content=page["text"], metadata=page["metadata"])
        for page in pages
    ]

    return splitter.split_documents(documents)
