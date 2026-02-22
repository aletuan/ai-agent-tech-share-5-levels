# 5 Levels of Agentic Software

Build an AI coding agent from scratch — no frameworks, just Python + Anthropic SDK.
Each level adds one capability. Start simple, scale when needed.

> Based on [The 5 Levels of Agentic Software](https://github.com/agno-agi/agno/tree/main/cookbook/levels_of_agentic_software) by Ashpreet Bedi.

## Levels Overview

| Level | Name | What's Added | Tag |
|-------|------|-------------|-----|
| 1 | **Agent with Tools** | Agent loop + read/write/run tools | `level-1` |
| 2 | Agent with Storage & Knowledge | SQLite sessions + ChromaDB RAG | `level-2` |
| 3 | Agent with Memory & Learning | Long-term memory + user preferences | `level-3` |
| 4 | Multi-Agent Team | Coder + Reviewer + Tester + Leader | `level-4` |
| 5 | Production System | PostgreSQL + FastAPI + Tracing | `level-5` |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/aletuan/ai-agent-tech-share-5-levels.git
cd ai-agent-tech-share-5-levels

# Setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create .env with your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env
echo "OPENAI_API_KEY=sk-your-key-here" >> .env   # Level 2+ embeddings

# Run Level 1
python level_1_tools.py              # single-shot demo
python level_1_tools.py --chat       # interactive mode

# Run Level 2 (Storage + Knowledge)
python level_2_storage.py                    # single-shot
python level_2_storage.py --chat             # interactive, new session
python level_2_storage.py --chat --session my-session   # resume session
python level_2_storage.py --list-sessions    # list saved sessions
```

## Navigating Between Levels

Each level is tagged in git. You can switch between levels to see the code at each stage:

```bash
# View all available levels
git tag -l "level-*"

# Switch to a specific level
git checkout level-1          # Level 1: Agent with Tools
git checkout level-2          # Level 2: + Storage & Knowledge
git checkout main             # Latest code

# See what changed between levels
git diff level-1..level-2     # What Level 2 added
git diff level-2..level-3     # What Level 3 added

# View tag details (description + components)
git tag -n20 level-1
```

## Project Structure

```
ai-agent-tech-share-5-levels/
├── core/
│   ├── agent.py             # The agent loop (heart of everything)
│   ├── tools.py             # Tool registry + built-in tools
│   ├── storage.py           # Session persistence (Level 2)
│   ├── knowledge.py         # Vector search / RAG (Level 2)
│   ├── memory.py            # Long-term memory (Level 3)
│   └── team.py              # Multi-agent orchestration (Level 4)
├── level_1_tools.py         # Level 1 entry point
├── level_2_storage.py       # Level 2 entry point
├── level_3_memory.py        # Level 3 entry point
├── level_4_team.py          # Level 4 entry point
├── level_5_api.py           # Level 5 entry point
├── workspace/               # Agent's sandbox for files
├── docs/
│   ├── plans/               # Design docs & implementation plans (EN + VI)
│   └── training/            # Educational guides (EN + VI)
└── requirements.txt
```

## Training Docs

| Topic | English | Vietnamese |
|-------|---------|------------|
| How Tool Calling Works | [EN](docs/training/how-tool-calling-works.md) | [VI](docs/training/how-tool-calling-works.vi.md) |
| How Storage Works | [EN](docs/training/how-storage-works.md) | [VI](docs/training/how-storage-works.vi.md) |
| How RAG Works | [EN](docs/training/how-rag-works.md) | [VI](docs/training/how-rag-works.vi.md) |
| Agent Loop Animation | [Run locally](docs/training/animation/) | `cd docs/training/animation && npm i && npm run dev` |
| Design Overview | [EN](docs/plans/2026-02-21-5-levels-agentic-software-design.md) | [VI](docs/plans/2026-02-21-5-levels-agentic-software-design.vi.md) |
| Level 1 Plan | [EN](docs/plans/2026-02-21-level-1-agent-with-tools.md) | [VI](docs/plans/2026-02-21-level-1-agent-with-tools.vi.md) |
| Level 2 Plan | [EN](docs/plans/2026-02-22-level-2-storage-knowledge.md) | [VI](docs/plans/2026-02-22-level-2-storage-knowledge.vi.md) |

## The Core Idea

```
User prompt → LLM → tool_calls? → yes → Execute tools → Feed results back → Loop
                                 → no  → Final text response → Done
```

An LLM without tools is just a chatbot. Tools + an agent loop = an agent that can act.
