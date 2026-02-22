# CLAUDE.md — Project Instructions

## Project Overview

Educational project: Build an AI coding agent from scratch (no frameworks) across 5 progressive levels. Each level adds one capability on top of the previous.

- **Reference**: [The 5 Levels of Agentic Software](https://github.com/agno-agi/agno/tree/main/cookbook/levels_of_agentic_software) by Ashpreet Bedi
- **Approach**: All from primitives — raw Anthropic SDK, no agno or agent frameworks
- **LLM**: Anthropic `claude-haiku-4-5-20251001`
- **Language**: Python 3.11+

## The 5 Levels

| Level | Name | Core Addition | Status |
|-------|------|--------------|--------|
| 1 | Agent with Tools | Agent loop + tool calling | Done (tag: `level-1`) |
| 2 | Agent with Storage & Knowledge | SQLite sessions + ChromaDB RAG | Pending |
| 3 | Agent with Memory & Learning | Long-term memory + user preferences | Pending |
| 4 | Multi-Agent Team | Coder + Reviewer + Tester + Leader | Pending |
| 5 | Production System | PostgreSQL + FastAPI + Tracing | Pending |

## Architecture

```
core/                    ← shared modules, evolves with each level
├── agent.py             ← the agent loop (heart of everything)
├── tools.py             ← tool registry + read_file, write_file, run_shell
├── storage.py           ← session persistence (Level 2)
├── knowledge.py         ← vector search / RAG (Level 2)
├── memory.py            ← long-term memory (Level 3)
└── team.py              ← multi-agent orchestration (Level 4)

level_1_tools.py         ← entry point for Level 1
level_2_storage.py       ← entry point for Level 2
level_3_memory.py        ← entry point for Level 3
level_4_team.py          ← entry point for Level 4
level_5_api.py           ← entry point for Level 5

workspace/               ← agent's sandbox (gitignored)
docs/plans/              ← design docs & implementation plans (EN + VI)
docs/training/           ← educational guides (EN + VI)
```

## Development Conventions

### Git Workflow

- **Branch**: All work on `main`
- **Tags**: Each completed level gets an annotated tag (`level-1`, `level-2`, etc.)
- **Tag after**: Tag only after all code + docs + tests for that level are done
- **Commit prefix**: `feat(level-N):` for features, `docs:` for documentation, `chore:` for setup
- **Co-author**: All commits include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

### Tag Commands

```bash
# Create tag after completing a level
git tag -a level-N -m "Level N: Description"
git push origin level-N

# Navigate between levels
git checkout level-1        # view Level 1 code
git diff level-1..level-2   # see what Level 2 added
git checkout main           # back to latest
```

### Documentation

- **Bilingual**: All docs must be in both English (.md) and Vietnamese (.vi.md)
- **Plans**: Saved to `docs/plans/YYYY-MM-DD-<topic>.md`
- **Training guides**: Saved to `docs/training/<topic>.md`
- **Mermaid diagrams**: Use Mermaid sequence diagrams for explaining flows and interactions
- **README.md**: Update after each level with new entry points and training docs

### Code Style

- Python: Type hints on function signatures, Google-style docstrings
- No frameworks for the core agent logic — build from primitives
- Each level's entry point (`level_N_*.py`) is self-contained with its own instructions
- `core/` modules are shared and evolve incrementally
- Path safety: All file tools must validate paths stay within workspace

### Progressive Complexity Principle

> Start from Level 1. Only add capability when the simpler level proves insufficient.

- Each level builds on the previous — never rewrite from scratch
- New `core/` modules are added (not duplicated) per level
- The `Agent` class in `core/agent.py` gains new parameters/methods per level
- Entry points (`level_N_*.py`) demonstrate the new capabilities

## How to Run

```bash
# Setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your ANTHROPIC_API_KEY

# Level 1
python level_1_tools.py              # single-shot demo (Fibonacci)
python level_1_tools.py --chat       # interactive mode

# Agent Loop Animation (React visualizer)
cd docs/training/animation && npm i && npm run dev   # auto-advances every 10s
```

## Key Files to Know

| File | Purpose | When it changes |
|------|---------|----------------|
| `core/agent.py` | The agent loop — `while True: LLM → tool_calls → execute → repeat` | Every level (new capabilities) |
| `core/tools.py` | Tool registry — maps tool names to (function, JSON schema) pairs | Level 1 (stable after) |
| `level_1_tools.py` | Level 1 entry point with instructions and workspace setup | Level 1 only |
| `requirements.txt` | Dependencies — grows with each level | Every level |
| `docs/plans/` | Design docs and implementation plans | Before each level |
| `docs/training/` | Educational guides explaining concepts | After each level |
| `docs/training/animation/` | Agent Loop Visualizer — React app with step-by-step flow, data-flow particles, auto-advance 10s | Training/UX tweaks |

## Environment

- **API Key**: `ANTHROPIC_API_KEY` in `.env` (gitignored)
- **Model**: `claude-haiku-4-5-20251001` (cost-effective for learning)
- **Embeddings**: `text-embedding-3-small` (Level 2+)
- **Storage**: SQLite at `workspace/agents.db` (Level 2+)
- **Vector DB**: ChromaDB at `workspace/chromadb/` (Level 2+)

## When Building a New Level

1. Read the design doc: `docs/plans/2026-02-21-5-levels-agentic-software-design.md`
2. Create an implementation plan: `docs/plans/YYYY-MM-DD-level-N-<name>.md`
3. Create Vietnamese translation: `docs/plans/YYYY-MM-DD-level-N-<name>.vi.md`
4. Implement incrementally — add new `core/` modules, extend `Agent` class
5. Create entry point: `level_N_<name>.py`
6. Update `requirements.txt` if new dependencies are needed
7. Create training docs in `docs/training/` (EN + VI) for key concepts
8. **Update animation visualizer** — update `docs/training/animation/` (steps, diagram, data) so the Agent Loop Visualizer reflects the new level
9. Update `README.md` with new level info and training doc links
10. Tag: `git tag -a level-N -m "Level N: Description"` and push
