"""Level 2: Agent with Storage & Knowledge

Adds session persistence (SQLite) and RAG knowledge base (ChromaDB).
Resume conversations and search coding conventions before coding.
"""

import argparse
import uuid
from pathlib import Path

from dotenv import load_dotenv

from core.agent import Agent
from core.storage import init_storage, list_sessions

load_dotenv()

WORKSPACE = Path(__file__).parent / "workspace"
WORKSPACE.mkdir(parents=True, exist_ok=True)
STORAGE_PATH = WORKSPACE / "agents.db"
KNOWLEDGE_PATH = WORKSPACE / "chromadb"

INSTRUCTIONS = """\
You are a coding agent. You write clean, well-documented Python code.

## Workflow

1. Understand the task
2. Write the code and save it to a file
3. Run the file to verify it works
4. If there are errors, fix them and re-run

## Rules

- Always save code to files before running
- Include type hints on function signatures
- Add a brief docstring to each function
- Test with at least 2-3 example inputs
- Before coding, use the knowledge base to check coding conventions. Follow any relevant conventions you find.
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Level 2: Agent with Storage & Knowledge")
    parser.add_argument("--chat", action="store_true", help="Interactive mode")
    parser.add_argument("--session", type=str, default=None, help="Session ID to resume")
    parser.add_argument("--list-sessions", action="store_true", help="List saved sessions")
    args = parser.parse_args()

    if args.list_sessions:
        init_storage(STORAGE_PATH)
        sessions = list_sessions(STORAGE_PATH)
        if not sessions:
            print("No saved sessions.")
            return
        print("Saved sessions:")
        for s in sessions:
            print(f"  {s['session_id']}  updated: {s['updated_at']}")
        return

    init_storage(STORAGE_PATH)
    from core.knowledge import init_knowledge

    init_knowledge(KNOWLEDGE_PATH, seed=True)

    session_id = args.session or (f"session-{uuid.uuid4().hex[:8]}" if args.chat else None)

    agent = Agent(
        name="L2 Storage Agent",
        model="claude-haiku-4-5-20251001",
        instructions=INSTRUCTIONS,
        base_dir=WORKSPACE,
        session_id=session_id,
        storage_path=STORAGE_PATH if session_id else None,
        knowledge_path=KNOWLEDGE_PATH,
    )

    if args.chat:
        agent.chat()
    else:
        agent.run(
            "Write a Fibonacci function that returns the nth Fibonacci number. "
            "Save it to fib.py with a main block that prints the first 10 values, "
            "then run it to verify.",
        )


if __name__ == "__main__":
    main()
