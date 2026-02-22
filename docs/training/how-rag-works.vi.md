# RAG (Knowledge Base) Hoạt Động Như Thế Nào?

> Hướng dẫn dễ hiểu về RAG trong agent Cấp 2.

## Vấn Đề

Agent có thể viết code, nhưng không biết *quy ước* của bạn. Dùng 4 spaces hay 2? Docstring kiểu Google hay NumPy? File lưu ở đâu?

**Cấp 2 thêm Knowledge** — vector store (ChromaDB) mà agent tìm kiếm *trước khi* viết code để inject context liên quan.

---

## Tổng Quan

```
┌─────────────────────────────────────────────────────────┐
│                    Luồng RAG                            │
│                                                         │
│  1. User: "Viết function Fibonacci"                    │
│       ↓                                                 │
│  2. Agent search knowledge: query = user message       │
│       ↓                                                 │
│  3. ChromaDB trả top-k document tương tự               │
│     (vd. "Dùng 4 spaces", "Google-style docstrings")   │
│       ↓                                                 │
│  4. Agent thêm context vào user message                │
│       ↓                                                 │
│  5. LLM nhận: [context] + [user message]               │
│       ↓                                                 │
│  6. LLM tuân theo conventions khi viết code            │
└─────────────────────────────────────────────────────────┘
```

---

## RAG Là Gì?

**RAG = Retrieval-Augmented Generation**

- **Retrieval**: Tìm kiếm knowledge base lấy document liên quan (semantic search)
- **Augmented**: Thêm các document đó vào prompt làm context
- **Generation**: LLM sinh phản hồi dựa trên context đó

Chúng ta dùng **semantic search** — không phải keyword. Query "cách thụt lề Python" có thể khớp "Dùng 4 spaces cho indentation" dù không có từ "indent".

---

## Semantic Search Hoạt Động Thế Nào

1. **Embeddings**: Mỗi document được chuyển thành vector (danh sách số) bằng embedding model (`text-embedding-3-small`)
2. **Query embedding**: User message cũng được chuyển thành vector
3. **Similarity**: Tìm document có vector gần nhất với query vector (cosine similarity)
4. **Top-k**: Trả về k document tương tự nhất

```
Document: "Dùng 4 spaces cho indentation"
    → Embedding: [0.12, -0.34, 0.56, ...]

Query: "Python style guide"
    → Embedding: [0.11, -0.33, 0.55, ...]
    → Similarity: 0.98 (cao!)

Query: "Cách nấu mì"
    → Embedding: [-0.8, 0.2, -0.1, ...]
    → Similarity: 0.12 (thấp)
```

---

## ChromaDB + OpenAI Embeddings

Chúng ta dùng:
- **ChromaDB**: Vector store lưu trữ (lưu tại `workspace/chromadb/`)
- **OpenAI text-embedding-3-small**: Chuyển text thành vector (cần `OPENAI_API_KEY`)

```python
# core/knowledge.py
def search(query: str, k: int = 3, persist_dir: Path = ...) -> list[str]:
    """Semantic search. Trả top-k document chunks."""
```

---

## Seed Documents

Lần chạy đầu, ta seed knowledge base với coding conventions:

- "Use 4 spaces for indentation. Maximum line length 88-100 characters (PEP 8)."
- "Save code to files before running. Use workspace/ for all file paths."
- "Use Google-style docstrings for functions: Args, Returns, Raises sections."
- "Include type hints on function signatures."
- "Test with at least 2-3 example inputs before considering a task complete."

Bạn có thể thêm bằng `add_documents()`.

---

## Khi Nào Dùng RAG

- **Coding conventions** — style team, PEP 8, quy tắc dự án
- **Domain knowledge** — tài liệu nội bộ, API reference
- **Few-shot examples** — "Đây là cách chúng ta làm X trước đây"

---

## Thử Nghiệm

```python
from pathlib import Path
from core.knowledge import init_knowledge, search, add_documents

p = Path("workspace/chromadb")
init_knowledge(p, seed=True)

# Search
results = search("docstring style", k=2, persist_dir=p)
print(results)  # vd. ["Use Google-style docstrings..."]

# Thêm doc của bạn
add_documents(["Chúng ta dùng Black cho formatting."], persist_dir=p)
```
