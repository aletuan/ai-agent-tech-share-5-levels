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


def get_tool_schemas(provider: str = "anthropic") -> list[dict]:
    """Return all tool schemas for the given provider API."""
    if provider == "openai":
        return [schema for _, schema in TOOL_REGISTRY.values()]

    # Anthropic format: {"name", "description", "input_schema"}
    schemas = []
    for _, (_, openai_schema) in TOOL_REGISTRY.items():
        fn = openai_schema["function"]
        input_schema = {k: v for k, v in fn["parameters"].items()
                        if k != "additionalProperties"}
        schemas.append({
            "name": fn["name"],
            "description": fn["description"],
            "input_schema": input_schema,
        })
    return schemas


def execute_tool(name: str, args: dict, base_dir: Path) -> str:
    """Execute a tool by name with the given arguments."""
    if name not in TOOL_REGISTRY:
        return f"Error: unknown tool '{name}'"
    fn, _ = TOOL_REGISTRY[name]
    return fn(base_dir, **args)
