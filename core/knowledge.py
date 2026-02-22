"""RAG knowledge base with ChromaDB and OpenAI embeddings.

Agent searches before coding to inject relevant context (e.g. coding conventions).
"""

from pathlib import Path
from uuid import uuid4

import chromadb
from chromadb.utils import embedding_functions

COLLECTION_NAME = "coding_conventions"

# Seed documents for coding conventions (PEP 8, project style)
SEED_DOCUMENTS = [
    "Use 4 spaces for indentation. Maximum line length 88-100 characters (PEP 8).",
    "Save code to files before running. Use workspace/ for all file paths.",
    "Use Google-style docstrings for functions: Args, Returns, Raises sections.",
    "Include type hints on function signatures. Use Path from pathlib for paths.",
    "Test with at least 2-3 example inputs before considering a task complete.",
]


def _get_client(persist_dir: Path):
    """Get or create ChromaDB persistent client."""
    persist_dir.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(persist_dir))


def _get_collection(client, embedding_model: str):
    """Get or create collection with OpenAI embeddings."""
    openai_ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=None,  # uses OPENAI_API_KEY from env
        model_name=embedding_model,
    )
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=openai_ef,
    )


def init_knowledge(
    persist_dir: Path,
    embedding_model: str = "text-embedding-3-small",
    seed: bool = True,
) -> None:
    """Create ChromaDB collection. Idempotent. Optionally seed with coding conventions."""
    client = _get_client(persist_dir)
    coll = _get_collection(client, embedding_model)
    if seed and coll.count() == 0:
        add_documents(SEED_DOCUMENTS, persist_dir=persist_dir, embedding_model=embedding_model)


def add_documents(
    docs: list[str],
    ids: list[str] | None = None,
    persist_dir: Path | None = None,
    embedding_model: str = "text-embedding-3-small",
) -> None:
    """Add documents to the collection. Auto-generate IDs if not provided."""
    if persist_dir is None:
        persist_dir = Path("workspace/chromadb")
    if ids is None:
        ids = [str(uuid4()) for _ in docs]
    if len(ids) != len(docs):
        raise ValueError("ids and docs must have same length")
    client = _get_client(persist_dir)
    coll = _get_collection(client, embedding_model)
    coll.add(documents=docs, ids=ids)


def search(
    query: str,
    k: int = 3,
    persist_dir: Path | None = None,
    embedding_model: str = "text-embedding-3-small",
) -> list[str]:
    """Semantic search. Returns top-k document chunks as strings."""
    if persist_dir is None:
        persist_dir = Path("workspace/chromadb")
    client = _get_client(persist_dir)
    coll = _get_collection(client, embedding_model)
    n = coll.count()
    if n == 0:
        return []
    result = coll.query(query_texts=[query], n_results=min(k, n))
    docs = result.get("documents", [[]])
    return docs[0] if docs else []
