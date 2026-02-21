# Level 1: Agent with Tools — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a coding agent from primitives (raw OpenAI SDK) that can read files, write files, and run shell commands.

**Architecture:** A simple agent loop that sends user prompts to OpenAI's chat completions API with tool definitions. When the model returns tool_calls, we execute them locally and feed results back. The loop continues until the model produces a final text response.

**Tech Stack:** Python 3.11+, openai SDK, python-dotenv

---

### Task 1: Project Setup

**Files:**
- Create: `requirements.txt`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `core/__init__.py`

**Step 1: Create requirements.txt**

```
openai>=1.82.0
python-dotenv>=1.1.0
```

**Step 2: Create .env.example**

```
OPENAI_API_KEY=sk-your-key-here
```

**Step 3: Create .gitignore**

```
__pycache__/
*.pyc
.env
workspace/
*.db
chromadb/
.venv/
```

**Step 4: Create core/__init__.py**

Empty file.

**Step 5: Create virtual environment and install dependencies**

Run:
```bash
cd /Users/andy/Workspace/Agents/ai-agent-tech-share-5-levels
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Expected: Dependencies install successfully.

**Step 6: Create .env with real API key**

Ask user for their OPENAI_API_KEY and create `.env`.

**Step 7: Commit**

```bash
git init
git add requirements.txt .env.example .gitignore core/__init__.py
git commit -m "chore: project setup with openai SDK"
```

---

### Task 2: Tool Registry & Built-in Tools

**Files:**
- Create: `core/tools.py`

This is the foundation — we define tools as plain Python functions, then describe them with JSON Schema so the LLM knows how to call them.

**Step 1: Write core/tools.py**

```python
"""Tool registry and built-in coding tools.

A tool is a plain Python function + a JSON Schema description.
The registry maps tool names to their (function, schema) pairs.
"""

import json
import subprocess
from pathlib import Path

# ---------------------------------------------------------------------------
# Tool definitions (JSON Schema for OpenAI function calling)
# ---------------------------------------------------------------------------

READ_FILE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "read_file",
        "description": "Read the contents of a file. Returns the file content as a string.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path to the file to read",
                }
            },
            "required": ["path"],
            "additionalProperties": False,
        },
        "strict": True,
    },
}

WRITE_FILE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "write_file",
        "description": "Write content to a file. Creates the file if it doesn't exist, overwrites if it does.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Relative path to the file to write",
                },
                "content": {
                    "type": "string",
                    "description": "Content to write to the file",
                },
            },
            "required": ["path", "content"],
            "additionalProperties": False,
        },
        "strict": True,
    },
}

RUN_SHELL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "run_shell",
        "description": "Run a shell command and return stdout and stderr. Use for running Python scripts, installing packages, or any CLI command.",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to execute",
                }
            },
            "required": ["command"],
            "additionalProperties": False,
        },
        "strict": True,
    },
}


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def read_file(base_dir: Path, path: str) -> str:
    """Read a file relative to base_dir."""
    file_path = base_dir / path
    if not file_path.resolve().is_relative_to(base_dir.resolve()):
        return f"Error: path '{path}' is outside the workspace"
    if not file_path.exists():
        return f"Error: file '{path}' not found"
    return file_path.read_text(encoding="utf-8")


def write_file(base_dir: Path, path: str, content: str) -> str:
    """Write content to a file relative to base_dir."""
    file_path = base_dir / path
    if not file_path.resolve().is_relative_to(base_dir.resolve()):
        return f"Error: path '{path}' is outside the workspace"
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")
    return f"Written {len(content)} bytes to {path}"


def run_shell(base_dir: Path, command: str) -> str:
    """Run a shell command inside base_dir."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=base_dir,
            capture_output=True,
            text=True,
            timeout=30,
        )
        output = ""
        if result.stdout:
            output += f"STDOUT:\n{result.stdout}"
        if result.stderr:
            output += f"STDERR:\n{result.stderr}"
        if not output:
            output = "(no output)"
        output += f"\nReturn code: {result.returncode}"
        return output
    except subprocess.TimeoutExpired:
        return "Error: command timed out after 30 seconds"


# ---------------------------------------------------------------------------
# Tool registry
# ---------------------------------------------------------------------------

# Maps tool name -> (callable, schema)
# The callable signature is: fn(base_dir, **parsed_args) -> str
TOOL_REGISTRY: dict[str, tuple[callable, dict]] = {
    "read_file": (read_file, READ_FILE_SCHEMA),
    "write_file": (write_file, WRITE_FILE_SCHEMA),
    "run_shell": (run_shell, RUN_SHELL_SCHEMA),
}


def get_tool_schemas() -> list[dict]:
    """Return all tool schemas for the OpenAI API."""
    return [schema for _, schema in TOOL_REGISTRY.values()]


def execute_tool(name: str, args: dict, base_dir: Path) -> str:
    """Execute a tool by name with the given arguments."""
    if name not in TOOL_REGISTRY:
        return f"Error: unknown tool '{name}'"
    fn, _ = TOOL_REGISTRY[name]
    return fn(base_dir, **args)
```

**Step 2: Verify the module imports cleanly**

Run:
```bash
cd /Users/andy/Workspace/Agents/ai-agent-tech-share-5-levels
source .venv/bin/activate
python -c "from core.tools import get_tool_schemas, execute_tool; print('OK:', len(get_tool_schemas()), 'tools')"
```

Expected: `OK: 3 tools`

**Step 3: Commit**

```bash
git add core/tools.py
git commit -m "feat(level-1): add tool registry with read_file, write_file, run_shell"
```

---

### Task 3: The Agent Loop

**Files:**
- Create: `core/agent.py`

This is the heart of the agent. The loop:
1. Send messages + tool definitions to OpenAI
2. If response contains tool_calls → execute each tool → append results → go to 1
3. If response is text (no tool_calls) → print and stop

```
User prompt
    ↓
┌─→ LLM (with tools) ─→ tool_calls? ─yes─→ Execute tools ─→ Append results ─┐
│                            │                                                 │
│                            no                                                │
│                            ↓                                                 │
│                      Print response                                          │
│                            ↓                                                 │
│                          DONE                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Step 1: Write core/agent.py**

```python
"""The agent loop — the core of every AI agent.

Sends messages to OpenAI, handles tool calls, and loops until the model
produces a final text response.
"""

import json
from pathlib import Path

from openai import OpenAI

from core.tools import execute_tool, get_tool_schemas

# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class Agent:
    """A minimal agent that runs a tool-calling loop."""

    def __init__(
        self,
        name: str = "Agent",
        model: str = "gpt-4.1-mini",
        instructions: str = "You are a helpful assistant.",
        base_dir: Path | None = None,
    ):
        self.name = name
        self.model = model
        self.instructions = instructions
        self.base_dir = base_dir or Path.cwd()
        self.client = OpenAI()  # uses OPENAI_API_KEY from env

    def run(self, user_message: str, stream: bool = False) -> str:
        """Run the agent loop for a single user message.

        Returns the final text response.
        """
        messages = [
            {"role": "system", "content": self.instructions},
            {"role": "user", "content": user_message},
        ]
        tools = get_tool_schemas()

        while True:
            # --- Call the LLM ---
            print(f"\n{'─' * 60}")
            print(f"[{self.name}] Calling {self.model}...")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tools,
            )

            choice = response.choices[0]
            message = choice.message

            # --- Case 1: Model wants to call tools ---
            if message.tool_calls:
                # Append the assistant message (with tool_calls) to history
                messages.append(message.model_dump())

                for tool_call in message.tool_calls:
                    fn_name = tool_call.function.name
                    fn_args = json.loads(tool_call.function.arguments)

                    print(f"[{self.name}] Tool call: {fn_name}({fn_args})")

                    # Execute the tool
                    result = execute_tool(fn_name, fn_args, self.base_dir)
                    print(f"[{self.name}] Result: {result[:200]}{'...' if len(result) > 200 else ''}")

                    # Append tool result to messages
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result,
                        }
                    )

                # Loop back to call the LLM again with tool results
                continue

            # --- Case 2: Model produced a final text response ---
            final_text = message.content or ""
            print(f"\n{'─' * 60}")
            print(f"[{self.name}] Final response:\n")
            print(final_text)
            return final_text
```

**Step 2: Verify the module imports cleanly**

Run:
```bash
cd /Users/andy/Workspace/Agents/ai-agent-tech-share-5-levels
source .venv/bin/activate
python -c "from core.agent import Agent; print('Agent class loaded OK')"
```

Expected: `Agent class loaded OK`

**Step 3: Commit**

```bash
git add core/agent.py
git commit -m "feat(level-1): add agent loop with tool calling"
```

---

### Task 4: Level 1 Entry Point

**Files:**
- Create: `level_1_tools.py`
- Create: `workspace/` directory

**Step 1: Write level_1_tools.py**

```python
"""Level 1: Agent with Tools

An agent without tools is just an LLM. Tools are what turn an LLM into an Agent.
For a coding agent, the minimum viable toolset is: read files, write files, run shell.

This is the simplest possible agent — stateless, no memory, no knowledge.
Every run starts from zero.
"""

from pathlib import Path

from dotenv import load_dotenv

from core.agent import Agent

# Load .env for OPENAI_API_KEY
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
    agent = Agent(
        name="L1 Coding Agent",
        model="gpt-4.1-mini",
        instructions=INSTRUCTIONS,
        base_dir=WORKSPACE,
    )

    agent.run(
        "Write a Fibonacci function that returns the nth Fibonacci number. "
        "Save it to fib.py with a main block that prints the first 10 values, "
        "then run it to verify.",
    )
```

**Step 2: Run it end-to-end**

Run:
```bash
cd /Users/andy/Workspace/Agents/ai-agent-tech-share-5-levels
source .venv/bin/activate
python level_1_tools.py
```

Expected: The agent should:
1. Call `write_file` to create `workspace/fib.py`
2. Call `run_shell` to execute `python fib.py`
3. If errors, fix and re-run
4. Print a final text response summarizing what it did

**Step 3: Verify the workspace file was created**

Run:
```bash
cat workspace/fib.py
```

Expected: A Python file with a Fibonacci function.

**Step 4: Commit**

```bash
git add level_1_tools.py
git commit -m "feat(level-1): add entry point — coding agent with tools"
```

---

### Task 5: Add Interactive Mode

**Files:**
- Modify: `core/agent.py` (add `chat()` method)
- Modify: `level_1_tools.py` (add interactive option)

Currently the agent handles a single prompt. Let's add a REPL so you can have a multi-turn conversation (still stateless between restarts — that's Level 2).

**Step 1: Add chat() method to core/agent.py**

Add this method to the Agent class:

```python
def chat(self) -> None:
    """Run an interactive chat loop. Type 'exit' or 'quit' to stop."""
    print(f"\n{'═' * 60}")
    print(f"  {self.name} — Interactive Mode")
    print(f"  Model: {self.model}")
    print(f"  Type 'exit' to quit")
    print(f"{'═' * 60}\n")

    messages = [{"role": "system", "content": self.instructions}]
    tools = get_tool_schemas()

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if user_input.lower() in ("exit", "quit"):
            print("Goodbye!")
            break
        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})

        # --- Agent loop (same as run(), but reuses messages) ---
        while True:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tools,
            )

            choice = response.choices[0]
            message = choice.message

            if message.tool_calls:
                messages.append(message.model_dump())

                for tool_call in message.tool_calls:
                    fn_name = tool_call.function.name
                    fn_args = json.loads(tool_call.function.arguments)
                    print(f"  [{fn_name}] {fn_args}")

                    result = execute_tool(fn_name, fn_args, self.base_dir)
                    print(f"  → {result[:200]}{'...' if len(result) > 200 else ''}")

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result,
                        }
                    )
                continue

            final_text = message.content or ""
            messages.append({"role": "assistant", "content": final_text})
            print(f"\nAgent: {final_text}\n")
            break
```

**Step 2: Update level_1_tools.py to support interactive mode**

Replace the `if __name__ == "__main__":` block:

```python
if __name__ == "__main__":
    import sys

    agent = Agent(
        name="L1 Coding Agent",
        model="gpt-4.1-mini",
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
```

**Step 3: Test interactive mode**

Run:
```bash
python level_1_tools.py --chat
```

Type: `Write a hello world script and run it`
Then type: `Now modify it to accept a name argument`
Then type: `exit`

Expected: Agent handles multi-turn conversation, remembering context within the session.

**Step 4: Commit**

```bash
git add core/agent.py level_1_tools.py
git commit -m "feat(level-1): add interactive chat mode"
```

---

## Summary

After completing all 5 tasks, you'll have:

| Component | File | What it does |
|-----------|------|-------------|
| Tool registry | `core/tools.py` | 3 tools (read_file, write_file, run_shell) + registry |
| Agent loop | `core/agent.py` | The while loop that makes an LLM into an agent |
| Entry point | `level_1_tools.py` | Level 1 agent with single-shot and interactive modes |

**What you'll understand after Level 1:**
- The agent loop is just a while loop: LLM → tool calls → execute → feed back → repeat
- Tools are Python functions + JSON Schema descriptions
- Without storage, every restart is a blank slate (motivation for Level 2)
