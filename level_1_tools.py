"""Level 1: Agent with Tools

An agent without tools is just an LLM. Tools are what turn an LLM into an Agent.
For a coding agent, the minimum viable toolset is: read files, write files, run shell.

This is the simplest possible agent — stateless, no memory, no knowledge.
Every run starts from zero.
"""

from pathlib import Path

from dotenv import load_dotenv

from core.agent import Agent

# Load .env for ANTHROPIC_API_KEY
load_dotenv()

# ---------------------------------------------------------------------------
# Workspace — the agent's sandbox for reading/writing files
# ---------------------------------------------------------------------------
WORKSPACE = Path(__file__).parent / "workspace"
WORKSPACE.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Instructions — tell the agent what it is and how to behave
# ---------------------------------------------------------------------------
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
"""

# ---------------------------------------------------------------------------
# Create and run the Level 1 agent
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    agent = Agent(
        name="L1 Coding Agent",
        model="claude-haiku-4-5-20251001",
        instructions=INSTRUCTIONS,
        base_dir=WORKSPACE,
    )

    if "--chat" in sys.argv:
        # Interactive mode: multi-turn conversation
        agent.chat()
    else:
        # Single-shot mode: run one task
        agent.run(
            "Write a Fibonacci function that returns the nth Fibonacci number. "
            "Save it to fib.py with a main block that prints the first 10 values, "
            "then run it to verify.",
        )
