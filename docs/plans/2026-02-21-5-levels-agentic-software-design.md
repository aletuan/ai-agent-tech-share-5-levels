# 5 Levels of Agentic Software — Design Doc

## Goal

Build a coding agent from primitives (raw OpenAI SDK, no frameworks) across 5 progressive levels. Educational project to teach agent programming concepts.

## Decisions

- **LLM**: OpenAI `gpt-4.1-mini`
- **Approach**: All from primitives — no agno or other agent frameworks
- **Reference**: https://github.com/agno-agi/agno/tree/main/cookbook/levels_of_agentic_software

## Project Structure

```
ai-agent-tech-share-5-levels/
├── level_1_tools.py
├── level_2_storage_knowledge.py
├── level_3_memory_learning.py
├── level_4_team.py
├── level_5_api.py
├── core/
│   ├── __init__.py
│   ├── agent.py          # Agent loop
│   ├── tools.py          # Tool registry + built-in tools
│   ├── storage.py        # Session persistence (Level 2)
│   ├── knowledge.py      # Vector search / RAG (Level 2)
│   ├── memory.py         # Long-term memory (Level 3)
│   └── team.py           # Multi-agent orchestration (Level 4)
├── workspace/
├── requirements.txt
└── .env.example
```

## Level 1: Agent with Tools

Core concept: The agent loop — prompt → LLM → tool call → execute → result back → repeat.

Components:
- Tool registry: Python functions with JSON Schema descriptions
- 3 built-in tools: read_file, write_file, run_shell
- Agent loop: while loop using OpenAI chat completions API
- Model: gpt-4.1-mini via raw openai SDK

## Level 2: Agent with Storage & Knowledge

Storage (SQLite):
- Save/load conversation sessions
- Session IDs, messages as JSON
- Resume conversations, audit trail

Knowledge (ChromaDB + OpenAI embeddings):
- Embed documents, semantic search
- text-embedding-3-small for embeddings
- Agent searches knowledge before coding
- Seed with coding conventions

## Level 3: Agent with Memory & Learning

Memory:
- Long-term user preferences stored across sessions
- User profile built over time
- Key-value store backed by SQLite

Learning:
- Lessons learned from each session
- Retrieved for relevant new tasks

## Level 4: Multi-Agent Team

Roles: Coder, Reviewer (read-only), Tester, Team Leader (orchestrator)

## Level 5: Production System

- SQLite → PostgreSQL
- ChromaDB → PgVector
- FastAPI API wrapper
- Tracing/logging
