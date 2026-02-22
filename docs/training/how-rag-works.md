# How Does RAG (Knowledge Base) Work?

> A beginner-friendly guide to understanding RAG in Level 2 agents.

## The Problem

The agent can write code, but it doesn't know *your* coding conventions. Should it use 4 spaces or 2? Google-style or NumPy-style docstrings? Where should files go?

**Level 2 adds Knowledge** — a vector store (ChromaDB) that the agent searches *before* coding to inject relevant context.

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────┐
│                    RAG Flow                             │
│                                                         │
│  1. User: "Write a Fibonacci function"                 │
│       ↓                                                 │
│  2. Agent searches knowledge: query = user message     │
│       ↓                                                 │
│  3. ChromaDB returns top-k similar documents           │
│     (e.g. "Use 4 spaces", "Google-style docstrings")   │
│       ↓                                                 │
│  4. Agent prepends context to user message              │
│       ↓                                                 │
│  5. LLM receives: [context] + [user message]           │
│       ↓                                                 │
│  6. LLM follows conventions when writing code           │
└─────────────────────────────────────────────────────────┘
```

---

## What is RAG?

**RAG = Retrieval-Augmented Generation**

- **Retrieval**: Search a knowledge base for relevant documents (semantic search)
- **Augmented**: Add those documents to the prompt as context
- **Generation**: The LLM generates a response using that context

We use **semantic search** — not keyword matching. The query "how to indent Python" can match "Use 4 spaces for indentation" even without the word "indent".

---

## How Semantic Search Works

1. **Embeddings**: Each document is converted to a vector (list of numbers) using an embedding model (`text-embedding-3-small`)
2. **Query embedding**: The user's message is also converted to a vector
3. **Similarity**: We find documents whose vectors are closest to the query vector (cosine similarity)
4. **Top-k**: Return the k most similar documents

```
Document: "Use 4 spaces for indentation"
    → Embedding: [0.12, -0.34, 0.56, ...]

Query: "Python style guide"
    → Embedding: [0.11, -0.33, 0.55, ...]
    → Similarity: 0.98 (high!)

Query: "How to cook pasta"
    → Embedding: [-0.8, 0.2, -0.1, ...]
    → Similarity: 0.12 (low)
```

---

## ChromaDB + OpenAI Embeddings

We use:
- **ChromaDB**: Persistent vector store (saved to `workspace/chromadb/`)
- **OpenAI text-embedding-3-small**: Converts text to vectors (requires `OPENAI_API_KEY`)

```python
# core/knowledge.py
def search(query: str, k: int = 3, persist_dir: Path = ...) -> list[str]:
    """Semantic search. Returns top-k document chunks."""
```

---

## Seed Documents

On first run, we seed the knowledge base with coding conventions:

- "Use 4 spaces for indentation. Maximum line length 88-100 characters (PEP 8)."
- "Save code to files before running. Use workspace/ for all file paths."
- "Use Google-style docstrings for functions: Args, Returns, Raises sections."
- "Include type hints on function signatures."
- "Test with at least 2-3 example inputs before considering a task complete."

You can add more with `add_documents()`.

---

## When to Use RAG

- **Coding conventions** — team style, PEP 8, project rules
- **Domain knowledge** — internal docs, API references
- **Few-shot examples** — "Here's how we did X before"

---

## Try It

```python
from pathlib import Path
from core.knowledge import init_knowledge, search, add_documents

p = Path("workspace/chromadb")
init_knowledge(p, seed=True)

# Search
results = search("docstring style", k=2, persist_dir=p)
print(results)  # e.g. ["Use Google-style docstrings..."]

# Add your own docs
add_documents(["We use Black for formatting."], persist_dir=p)
```
