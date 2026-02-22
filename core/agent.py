"""The agent loop — the core of every AI agent.

Sends messages to Anthropic Claude, handles tool calls, and loops until the
model produces a final text response.
"""

import json
from pathlib import Path

from anthropic import Anthropic

from core.tools import execute_tool, get_tool_schemas

# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class Agent:
    """A minimal agent that runs a tool-calling loop."""

    def __init__(
        self,
        name: str = "Agent",
        model: str = "claude-haiku-4-5-20251001",
        instructions: str = "You are a helpful assistant.",
        base_dir: Path | None = None,
    ):
        self.name = name
        self.model = model
        self.instructions = instructions
        self.base_dir = base_dir or Path.cwd()
        self.client = Anthropic()  # uses ANTHROPIC_API_KEY from env

    def run(self, user_message: str, stream: bool = False) -> str:
        """Run the agent loop for a single user message.

        Returns the final text response.
        """
        messages = [
            {"role": "user", "content": user_message},
        ]
        tools = get_tool_schemas()

        while True:
            # --- Call the LLM ---
            print(f"\n{'─' * 60}")
            print(f"[{self.name}] Calling {self.model}...")

            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=self.instructions,
                messages=messages,
                tools=tools,
            )

            # --- Case 1: Model wants to call tools ---
            if response.stop_reason == "tool_use":
                # Append the assistant message (with tool_use blocks) to history
                messages.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        fn_name = block.name
                        fn_args = block.input

                        print(f"[{self.name}] Tool call: {fn_name}({fn_args})")

                        # Execute the tool
                        result = execute_tool(fn_name, fn_args, self.base_dir)
                        print(f"[{self.name}] Result: {result[:200]}{'...' if len(result) > 200 else ''}")

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                # Send tool results back as a user message
                messages.append({"role": "user", "content": tool_results})

                # Loop back to call the LLM again with tool results
                continue

            # --- Case 2: Model produced a final text response ---
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text

            print(f"\n{'─' * 60}")
            print(f"[{self.name}] Final response:\n")
            print(final_text)
            return final_text

    def chat(self) -> None:
        """Run an interactive chat loop. Type 'exit' or 'quit' to stop."""
        print(f"\n{'═' * 60}")
        print(f"  {self.name} — Interactive Mode")
        print(f"  Model: {self.model}")
        print(f"  Type 'exit' to quit")
        print(f"{'═' * 60}\n")

        messages = []
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
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    system=self.instructions,
                    messages=messages,
                    tools=tools,
                )

                if response.stop_reason == "tool_use":
                    messages.append({"role": "assistant", "content": response.content})

                    tool_results = []
                    for block in response.content:
                        if block.type == "tool_use":
                            fn_name = block.name
                            fn_args = block.input
                            print(f"  [{fn_name}] {fn_args}")

                            result = execute_tool(fn_name, fn_args, self.base_dir)
                            print(f"  → {result[:200]}{'...' if len(result) > 200 else ''}")

                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": result,
                            })

                    messages.append({"role": "user", "content": tool_results})
                    continue

                final_text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        final_text += block.text

                messages.append({"role": "assistant", "content": final_text})
                print(f"\nAgent: {final_text}\n")
                break
