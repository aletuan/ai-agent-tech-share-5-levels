# Level 2: Agent with Storage & Knowledge — Implementation Plan

**Goal:** Add session persistence (SQLite) and RAG knowledge base (ChromaDB) so the agent can resume conversations and search coding conventions before coding.

**Architecture:** Extend the Level 1 agent with:
- **Storage**: SQLite DB at `workspace/agents.db` — save/load sessions, messages as JSON
- **Knowledge**: ChromaDB at `workspace/chromadb/` — embed docs with OpenAI `text-embedding-3-small`, semantic search before each task

**Tech Stack:** Python 3.11+, anthropic SDK, openai SDK (embeddings), chromadb, python-dotenv, sqlite3 (stdlib)

---

## Prerequisites

- Level 1 complete (`core/agent.py`, `core/tools.py`, `level_1_tools.py`)
- `ANTHROPIC_API_KEY` in `.env`
- `OPENAI_API_KEY` in `.env` (for embeddings — Level 2 uses text-embedding-3-small)

---

### Task 1: core/storage.py — Session Persistence

**File:** Create `core/storage.py`

**Purpose:** Persist conversation sessions to SQLite so users can resume later.

**Schema:**

```sql
-- sessions: one row per conversation
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- messages: conversation history per session
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
    """Create tables if they don't exist."""

def save_session(session_id: str, messages: list[dict], db_path: Path) -> None:
    """Upsert session and replace all messages for that session."""

def load_session(session_id: str, db_path: Path) -> list[dict] | None:
    """Load messages for session. Returns None if session doesn't exist."""

def list_sessions(db_path: Path) -> list[dict]:
    """Return list of {session_id, created_at, updated_at} sorted by updated_at desc."""
```

**Notes:**
- `messages` stored as JSON-serializable list; each row = one message (role + content as JSON string)
- Use `datetime.utcnow().isoformat()` for timestamps
- `session_id` can be UUID or user-provided slug

---

### Task 2: core/knowledge.py — RAG with ChromaDB

**File:** Create `core/knowledge.py`

**Purpose:** Vector store for documents. Agent searches before coding to inject relevant context (e.g. coding conventions).

**Dependencies:** chromadb, openai (for embeddings)

**API:**

```python
def init_knowledge(persist_dir: Path, embedding_model: str = "text-embedding-3-small") -> None:
    """Create ChromaDB collection. Idempotent."""

def add_documents(docs: list[str], ids: list[str] | None = None, persist_dir: Path = ...) -> None:
    """Add documents to the collection. Auto-generate IDs if not provided."""

def search(query: str, k: int = 3, persist_dir: Path = ...) -> list[str]:
    """Semantic search. Returns top-k document chunks as strings."""
```

**Implementation notes:**
- Use `chromadb.PersistentClient(path=str(persist_dir))`
- Use OpenAI `text-embedding-3-small` for embeddings (ChromaDB can use custom embedding function)
- Collection name: e.g. `coding_conventions`
- Seed data: Add a few default coding convention docs (PEP 8 snippets, project style) on first init

---

### Task 3: Seed Knowledge with Coding Conventions

**File:** `core/knowledge.py` (extend) or `level_2_storage.py` (call on first run)

**Seed documents to add:**
- PEP 8 style (use 4 spaces, max line 88–100, etc.)
- Project convention: "Save code to files before running. Use workspace/ for all file paths."
- Docstrings: "Use Google-style docstrings for functions."

Keep seed docs short (1–3 sentences each) so they fit in context.

---

### Task 4: Extend core/agent.py for Storage & Knowledge

**Changes to `core/agent.py`:**

1. **Constructor:** Add optional params:
   - `session_id: str | None = None`
   - `storage_path: Path | None = None`
   - `knowledge_path: Path | None = None`

2. **run() flow:**
   - If `knowledge_path`: call `search(user_message, k=3)` and prepend results to system or first user message as context
   - If `session_id` and `storage_path`: load existing messages; else start fresh
   - After each assistant turn (final or tool result): save messages to storage

3. **chat() flow:**
   - Same: load session if `session_id`, search knowledge before each user message, save after each turn

**Backward compatibility:** If `storage_path` and `knowledge_path` are None, behave exactly like Level 1 (no persistence, no RAG).

---

### Task 5: level_2_storage.py — Entry Point

**File:** Create `level_2_storage.py`

**Purpose:** Demo Level 2 with session resume and knowledge-augmented coding.

**CLI:**
```bash
python level_2_storage.py                    # Single-shot (like Level 1)
python level_2_storage.py --chat             # Interactive, new session
python level_2_storage.py --chat --session my-session   # Resume session
python level_2_storage.py --list-sessions    # List saved sessions
```

**Default paths:**
- Storage: `workspace/agents.db`
- Knowledge: `workspace/chromadb/`

**Instructions:** Same as Level 1, plus: "Before coding, use the knowledge base to check coding conventions. Follow any relevant conventions you find."

---

### Task 6: requirements.txt

Add:
```
chromadb>=0.4.0
```

(openai already present for embeddings)

---

### Task 7: .env.example

Add note for embeddings (optional if user only uses Anthropic for chat):
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here   # Required for Level 2+ embeddings
```

---

### Task 8: Training Docs (EN + VI)

Create:
- `docs/training/how-storage-works.md` — Session persistence, SQLite schema, resume flow
- `docs/training/how-storage-works.vi.md`
- `docs/training/how-rag-works.md` — ChromaDB, embeddings, RAG flow, when to use
- `docs/training/how-rag-works.vi.md`

---

### Task 9: Update Animation Visualizer

**File:** `docs/training/animation/`

- Add steps/diagram for Storage (SQLite save/load) and Knowledge (ChromaDB search)
- Update `steps.ts` and `ArchitectureDiagram` if new components (Storage, Knowledge) appear in the flow

---

### Task 10: Update README.md

- Add Level 2 to Quick Start
- Add `level_2_storage.py` run commands
- Add training doc links for Storage and RAG

---

## Verification

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
add_documents(['Use 4 spaces for indentation.'], persist_dir=p)
print(search('indentation', k=1, persist_dir=p))
"

# Full run
python level_2_storage.py
python level_2_storage.py --chat --session demo
python level_2_storage.py --list-sessions
```

---

## Summary

| Task | File(s) | Description |
|------|---------|-------------|
| 1 | core/storage.py | SQLite session persistence |
| 2 | core/knowledge.py | ChromaDB + OpenAI embeddings, RAG |
| 3 | core/knowledge.py | Seed coding conventions |
| 4 | core/agent.py | Extend with storage + knowledge params |
| 5 | level_2_storage.py | Entry point, --session, --list-sessions |
| 6 | requirements.txt | Add chromadb |
| 7 | .env.example | Document OPENAI_API_KEY for embeddings |
| 8 | docs/training/ | how-storage-works, how-rag-works (EN + VI) |
| 9 | docs/training/animation/ | Update for Storage + Knowledge flow |
| 10 | README.md | Level 2 run commands, doc links |
