"""The agent loop — the core of every AI agent.

Sends messages to Anthropic Claude, handles tool calls, and loops until the
model produces a final text response.
"""

from pathlib import Path

from anthropic import Anthropic

from core.tools import execute_tool, get_tool_schemas

# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------


def _content_to_serializable(content) -> list | str:
    """Convert message content to JSON-serializable form for storage."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        result = []
        for item in content:
            if hasattr(item, "model_dump"):
                result.append(item.model_dump())
            elif isinstance(item, dict):
                result.append(item)
            else:
                result.append({"type": "text", "text": str(item)})
        return result
    return str(content)


def _prepare_messages_for_storage(messages: list) -> list[dict]:
    """Convert messages to storage format (JSON-serializable)."""
    return [
        {"role": m["role"], "content": _content_to_serializable(m["content"])}
        for m in messages
    ]


class Agent:
    """A minimal agent that runs a tool-calling loop."""

    def __init__(
        self,
        name: str = "Agent",
        model: str = "claude-haiku-4-5-20251001",
        instructions: str = "You are a helpful assistant.",
        base_dir: Path | None = None,
        session_id: str | None = None,
        storage_path: Path | None = None,
        knowledge_path: Path | None = None,
    ):
        self.name = name
        self.model = model
        self.instructions = instructions
        self.base_dir = base_dir or Path.cwd()
        self.session_id = session_id
        self.storage_path = storage_path
        self.knowledge_path = knowledge_path
        self.client = Anthropic()  # uses ANTHROPIC_API_KEY from env

    def _inject_knowledge(self, user_message: str) -> str:
        """Search knowledge base and prepend relevant context to user message."""
        if not self.knowledge_path:
            return user_message
        try:
            from core.knowledge import search

            results = search(user_message, k=3, persist_dir=self.knowledge_path)
            if not results:
                return user_message
            context = "\n".join(f"- {r}" for r in results)
            return f"[Relevant coding conventions from knowledge base:\n{context}]\n\n{user_message}"
        except Exception as e:
            print(f"[{self.name}] Knowledge search skipped: {e}")
            return user_message

    def _save_messages(self, messages: list) -> None:
        """Save messages to storage if session_id and storage_path are set."""
        if not self.session_id or not self.storage_path:
            return
        try:
            from core.storage import init_storage, save_session

            init_storage(self.storage_path)
            save_session(
                self.session_id,
                _prepare_messages_for_storage(messages),
                self.storage_path,
            )
        except Exception as e:
            print(f"[{self.name}] Storage save failed: {e}")

    def run(self, user_message: str, stream: bool = False) -> str:
        """Run the agent loop for a single user message.

        Returns the final text response.
        """
        user_message = self._inject_knowledge(user_message)

        messages: list[dict]
        if self.session_id and self.storage_path:
            from core.storage import load_session

            loaded = load_session(self.session_id, self.storage_path)
            messages = loaded if loaded is not None else []
            if not messages:
                messages = [{"role": "user", "content": user_message}]
            else:
                messages = list(messages)
                messages.append({"role": "user", "content": user_message})
        else:
            messages = [{"role": "user", "content": user_message}]

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
                self._save_messages(messages)

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

            messages.append({"role": "assistant", "content": final_text})
            self._save_messages(messages)

            print(f"\n{'─' * 60}")
            print(f"[{self.name}] Final response:\n")
            print(final_text)
            return final_text

    def chat(self) -> None:
        """Run an interactive chat loop. Type 'exit' or 'quit' to stop."""
        print(f"\n{'═' * 60}")
        print(f"  {self.name} — Interactive Mode")
        print(f"  Model: {self.model}")
        if self.session_id:
            print(f"  Session: {self.session_id}")
        print("  Type 'exit' to quit")
        print(f"{'═' * 60}\n")

        messages: list[dict]
        if self.session_id and self.storage_path:
            from core.storage import load_session

            loaded = load_session(self.session_id, self.storage_path)
            messages = list(loaded) if loaded else []
        else:
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

            user_input = self._inject_knowledge(user_input)
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
                    self._save_messages(messages)

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
                self._save_messages(messages)
                print(f"\nAgent: {final_text}\n")
                break
