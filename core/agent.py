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
