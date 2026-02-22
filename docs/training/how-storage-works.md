# How Does Session Storage Work?

> A beginner-friendly guide to understanding session persistence in Level 2 agents.

## The Problem

In Level 1, every time you restart the agent, you start from zero. The agent has no memory of previous conversations. If you close the terminal, everything is lost.

**Level 2 adds Storage** — we persist conversation sessions to SQLite so you can resume later.

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────┐
│                  Session Storage Flow                    │
│                                                         │
│  User: "Write Fibonacci"                                │
│       ↓                                                 │
│  Agent ↔ LLM ↔ Tools (multi-turn)                      │
│       ↓                                                 │
│  Save messages to SQLite after each turn                │
│       ↓                                                 │
│  User exits. Next time: --session my-session            │
│       ↓                                                 │
│  Load messages from SQLite → Resume conversation        │
└─────────────────────────────────────────────────────────┘
```

---

## SQLite Schema

We use two tables:

```sql
-- One row per conversation
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Conversation history per session
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,        -- "user" or "assistant"
    content TEXT NOT NULL,     -- JSON-serialized message content
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

Each message stores `role` and `content`. The content can be:
- Plain text (user message)
- A list of tool_use blocks (assistant called tools)
- A list of tool_result blocks (tool outputs)

We serialize content as JSON so we can store complex structures.

---

## Key Functions (core/storage.py)

| Function | Purpose |
|----------|---------|
| `init_storage(db_path)` | Create tables if they don't exist |
| `save_session(session_id, messages, db_path)` | Upsert session and replace all messages |
| `load_session(session_id, db_path)` | Load messages for a session; returns `None` if not found |
| `list_sessions(db_path)` | List all sessions sorted by `updated_at` desc |

---

## Resume Flow

1. User runs: `python level_2_storage.py --chat --session my-session`
2. Agent calls `load_session("my-session", db_path)`
3. If session exists: messages are loaded; agent continues from where it left off
4. If session is new: messages start empty
5. After each assistant turn (including tool results): `save_session()` is called

---

## When to Use Storage

- **Multi-turn conversations** you want to resume later
- **Audit trail** — who asked what, when, and what the agent did
- **Debugging** — inspect saved sessions to understand agent behavior

---

## Try It

```bash
# Start a new session (auto-generated ID)
python level_2_storage.py --chat

# Resume with a specific session ID
python level_2_storage.py --chat --session my-project

# List all saved sessions
python level_2_storage.py --list-sessions
```
