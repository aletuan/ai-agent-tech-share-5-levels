# Cấp 2: Agent với Storage & Knowledge — Kế hoạch Triển khai

**Mục tiêu:** Thêm lưu trữ session (SQLite) và knowledge base RAG (ChromaDB) để agent có thể tiếp tục hội thoại và tìm kiếm coding convention trước khi viết code.

**Kiến trúc:** Mở rộng agent Cấp 1 với:
- **Storage**: SQLite DB tại `workspace/agents.db` — lưu/tải session, messages dạng JSON
- **Knowledge**: ChromaDB tại `workspace/chromadb/` — nhúng tài liệu bằng OpenAI `text-embedding-3-small`, tìm kiếm ngữ nghĩa trước mỗi task

**Tech Stack:** Python 3.11+, anthropic SDK, openai SDK (embeddings), chromadb, python-dotenv, sqlite3 (stdlib)

---

## Điều kiện tiên quyết

- Cấp 1 hoàn thành (`core/agent.py`, `core/tools.py`, `level_1_tools.py`)
- `ANTHROPIC_API_KEY` trong `.env`
- `OPENAI_API_KEY` trong `.env` (cho embeddings — Cấp 2 dùng text-embedding-3-small)

---

### Task 1: core/storage.py — Lưu trữ Session

**File:** Tạo `core/storage.py`

**Mục đích:** Lưu các session hội thoại vào SQLite để người dùng có thể tiếp tục sau.

**Schema:**

```sql
-- sessions: mỗi dòng là một cuộc hội thoại
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- messages: lịch sử hội thoại theo session
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

**API:**

```python
def init_storage(db_path: Path) -> None:
    """Tạo bảng nếu chưa tồn tại."""

def save_session(session_id: str, messages: list[dict], db_path: Path) -> None:
    """Upsert session và thay thế toàn bộ messages của session đó."""

def load_session(session_id: str, db_path: Path) -> list[dict] | None:
    """Tải messages của session. Trả None nếu session không tồn tại."""

def list_sessions(db_path: Path) -> list[dict]:
    """Trả danh sách {session_id, created_at, updated_at} sắp xếp theo updated_at desc."""
```

**Ghi chú:**
- `messages` lưu dạng JSON; mỗi dòng = một message (role + content dạng chuỗi JSON)
- Dùng `datetime.utcnow().isoformat()` cho timestamp
- `session_id` có thể là UUID hoặc slug do người dùng cung cấp

---

### Task 2: core/knowledge.py — RAG với ChromaDB

**File:** Tạo `core/knowledge.py`

**Mục đích:** Vector store cho tài liệu. Agent tìm kiếm trước khi viết code để inject context liên quan (vd. coding conventions).

**Dependencies:** chromadb, openai (cho embeddings)

**API:**

```python
def init_knowledge(persist_dir: Path, embedding_model: str = "text-embedding-3-small") -> None:
    """Tạo ChromaDB collection. Idempotent."""

def add_documents(docs: list[str], ids: list[str] | None = None, persist_dir: Path = ...) -> None:
    """Thêm tài liệu vào collection. Tự sinh ID nếu không cung cấp."""

def search(query: str, k: int = 3, persist_dir: Path = ...) -> list[str]:
    """Tìm kiếm ngữ nghĩa. Trả top-k chunk dạng chuỗi."""
```

**Ghi chú triển khai:**
- Dùng `chromadb.PersistentClient(path=str(persist_dir))`
- Dùng OpenAI `text-embedding-3-small` cho embeddings (ChromaDB hỗ trợ custom embedding function)
- Tên collection: vd. `coding_conventions`
- Seed data: Thêm vài doc coding convention mặc định (PEP 8, project style) khi init lần đầu

---

### Task 3: Seed Knowledge với Coding Conventions

**File:** `core/knowledge.py` (mở rộng) hoặc `level_2_storage.py` (gọi khi chạy lần đầu)

**Tài liệu seed cần thêm:**
- PEP 8 style (dùng 4 spaces, max line 88–100, v.v.)
- Quy ước dự án: "Lưu code vào file trước khi chạy. Dùng workspace/ cho mọi đường dẫn file."
- Docstrings: "Dùng Google-style docstrings cho hàm."

Giữ seed docs ngắn (1–3 câu mỗi doc) để vừa context.

---

### Task 4: Mở rộng core/agent.py cho Storage & Knowledge

**Thay đổi trong `core/agent.py`:**

1. **Constructor:** Thêm params tùy chọn:
   - `session_id: str | None = None`
   - `storage_path: Path | None = None`
   - `knowledge_path: Path | None = None`

2. **Luồng run():**
   - Nếu `knowledge_path`: gọi `search(user_message, k=3)` và thêm kết quả vào system hoặc user message đầu tiên làm context
   - Nếu `session_id` và `storage_path`: load messages có sẵn; không thì bắt đầu mới
   - Sau mỗi lượt assistant (final hoặc tool result): lưu messages vào storage

3. **Luồng chat():**
   - Tương tự: load session nếu có `session_id`, search knowledge trước mỗi user message, lưu sau mỗi lượt

**Tương thích ngược:** Nếu `storage_path` và `knowledge_path` là None, hành vi giống hệt Cấp 1 (không persistence, không RAG).

---

### Task 5: level_2_storage.py — Entry Point

**File:** Tạo `level_2_storage.py`

**Mục đích:** Demo Cấp 2 với resume session và coding có knowledge-augmented.

**CLI:**
```bash
python level_2_storage.py                    # Single-shot (như Cấp 1)
python level_2_storage.py --chat             # Interactive, session mới
python level_2_storage.py --chat --session my-session   # Tiếp tục session
python level_2_storage.py --list-sessions    # Liệt kê session đã lưu
```

**Đường dẫn mặc định:**
- Storage: `workspace/agents.db`
- Knowledge: `workspace/chromadb/`

**Instructions:** Giống Cấp 1, thêm: "Trước khi viết code, dùng knowledge base để kiểm tra coding conventions. Tuân theo các quy ước liên quan bạn tìm được."

---

### Task 6: requirements.txt

Thêm:
```
chromadb>=0.4.0
```

(openai đã có sẵn cho embeddings)

---

### Task 7: .env.example

Thêm ghi chú cho embeddings (tùy chọn nếu user chỉ dùng Anthropic cho chat):
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here   # Cần cho embeddings Cấp 2+
```

---

### Task 8: Training Docs (EN + VI)

Tạo:
- `docs/training/how-storage-works.md` — Session persistence, SQLite schema, luồng resume
- `docs/training/how-storage-works.vi.md`
- `docs/training/how-rag-works.md` — ChromaDB, embeddings, luồng RAG, khi nào dùng
- `docs/training/how-rag-works.vi.md`

---

### Task 9: Cập nhật Animation Visualizer

**File:** `docs/training/animation/`

- Thêm steps/diagram cho Storage (SQLite save/load) và Knowledge (ChromaDB search)
- Cập nhật `steps.ts` và `ArchitectureDiagram` nếu có component mới (Storage, Knowledge) trong flow

---

### Task 10: Cập nhật README.md

- Thêm Cấp 2 vào Quick Start
- Thêm lệnh chạy `level_2_storage.py`
- Thêm link training doc cho Storage và RAG

---

## Kiểm tra

```bash
# Storage
python -c "
from pathlib import Path
from core.storage import init_storage, save_session, load_session, list_sessions
p = Path('workspace/agents.db')
init_storage(p)
save_session('test-1', [{'role':'user','content':'hi'}], p)
print(load_session('test-1', p))
print(list_sessions(p))
"

# Knowledge
python -c "
from pathlib import Path
from core.knowledge import init_knowledge, add_documents, search
p = Path('workspace/chromadb')
init_knowledge(p)
add_documents(['Dùng 4 spaces cho indentation.'], persist_dir=p)
print(search('indentation', k=1, persist_dir=p))
"

# Chạy đầy đủ
python level_2_storage.py
python level_2_storage.py --chat --session demo
python level_2_storage.py --list-sessions
```

---

## Tóm tắt

| Task | File(s) | Mô tả |
|------|---------|-------|
| 1 | core/storage.py | SQLite session persistence |
| 2 | core/knowledge.py | ChromaDB + OpenAI embeddings, RAG |
| 3 | core/knowledge.py | Seed coding conventions |
| 4 | core/agent.py | Mở rộng với params storage + knowledge |
| 5 | level_2_storage.py | Entry point, --session, --list-sessions |
| 6 | requirements.txt | Thêm chromadb |
| 7 | .env.example | Ghi chú OPENAI_API_KEY cho embeddings |
| 8 | docs/training/ | how-storage-works, how-rag-works (EN + VI) |
| 9 | docs/training/animation/ | Cập nhật flow Storage + Knowledge |
| 10 | README.md | Lệnh chạy Cấp 2, link doc |
