"""Session persistence with SQLite.

Saves and loads conversation sessions so users can resume later.
"""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def init_storage(db_path: Path) -> None:
    """Create tables if they don't exist."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(session_id)
            );
        """)
        conn.commit()
    finally:
        conn.close()


def _serialize_content(content) -> str:
    """Serialize message content to JSON string."""
    if isinstance(content, str):
        return json.dumps({"type": "text", "text": content})
    return json.dumps(content, default=str)


def _deserialize_content(content_str: str):
    """Deserialize JSON string back to content."""
    data = json.loads(content_str)
    if isinstance(data, dict) and data.get("type") == "text":
        return data.get("text", "")
    return data


def save_session(session_id: str, messages: list[dict], db_path: Path) -> None:
    """Upsert session and replace all messages for that session."""
    init_storage(db_path)
    now = datetime.now(timezone.utc).isoformat()

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO sessions (session_id, created_at, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET updated_at = excluded.updated_at
            """,
            (session_id, now, now),
        )
        conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            conn.execute(
                "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                (session_id, role, _serialize_content(content), now),
            )
        conn.commit()
    finally:
        conn.close()


def load_session(session_id: str, db_path: Path) -> list[dict] | None:
    """Load messages for session. Returns None if session doesn't exist."""
    init_storage(db_path)
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id",
            (session_id,),
        )
        rows = cur.fetchall()
        if not rows:
            cur = conn.execute(
                "SELECT 1 FROM sessions WHERE session_id = ?",
                (session_id,),
            )
            if not cur.fetchone():
                return None
        return [
            {"role": role, "content": _deserialize_content(content)}
            for role, content in rows
        ]
    finally:
        conn.close()


def list_sessions(db_path: Path) -> list[dict]:
    """Return list of {session_id, created_at, updated_at} sorted by updated_at desc."""
    init_storage(db_path)
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.execute(
            "SELECT session_id, created_at, updated_at FROM sessions ORDER BY updated_at DESC"
        )
        return [
            {"session_id": row[0], "created_at": row[1], "updated_at": row[2]}
            for row in cur.fetchall()
        ]
    finally:
        conn.close()
