# How Does the Model Know When to Call a Tool?

> A beginner-friendly guide to understanding the tool calling mechanism in AI agents.

## The Big Picture

An LLM (Large Language Model) by itself can only **think** and **generate text**. It cannot read files, write code to disk, or run programs. **Tools** are what give an LLM the ability to **act** in the real world.

But here's the key question: **how does the model decide when to use a tool vs. just respond with text?**

The answer is: **the model reasons about it** — there is no hardcoded if/else rule. The model is trained to understand when an action is needed, and it makes that decision based on three inputs it receives every time we call the API.

---

## The Three Inputs That Drive Tool Calling

```
┌─────────────────────────────────────────────────────────┐
│                    OpenAI API Call                       │
│                                                         │
│  1. TOOLS (JSON Schema)    → What CAN I do?             │
│  2. INSTRUCTIONS (System)  → What SHOULD I do?          │
│  3. MESSAGES (History)     → What HAVE I done?          │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Model reasoning → Decision:                            │
│     A) Call a tool  (I need to take action)             │
│     B) Return text  (I'm done, here's my answer)       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Let's examine each input in detail.

---

### Input 1: Tool Schemas — "What CAN I do?"

When we call the API, we pass a list of **tool definitions** using JSON Schema. Each definition tells the model:
- **Name**: what the tool is called
- **Description**: what it does (in plain English)
- **Parameters**: what arguments it accepts

From our project (`core/tools.py`):

```python
WRITE_FILE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "write_file",                              # ← name
        "description": "Write content to a file. Creates   # ← what it does
                        the file if it doesn't exist,
                        overwrites if it does.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {                                   # ← argument 1
                    "type": "string",
                    "description": "Relative path to the file to write",
                },
                "content": {                                # ← argument 2
                    "type": "string",
                    "description": "Content to write to the file",
                },
            },
            "required": ["path", "content"],
        },
    },
}
```

The model reads this schema and understands: *"I have a tool called `write_file`. If I need to save content to a file, I can call it with a `path` and `content`."*

**Key insight**: The `description` field is critically important. It's written in natural language for the model to understand. A vague description leads to incorrect tool usage.

We pass all tool schemas to the API:

```python
# core/agent.py, line 50-54
response = self.client.chat.completions.create(
    model=self.model,
    messages=messages,
    tools=tools,          # ← list of all tool schemas
)
```

---

### Input 2: Instructions — "What SHOULD I do?"

The system prompt (instructions) tells the model its role and behavioral rules:

```python
# level_1_tools.py
INSTRUCTIONS = """\
You are a coding agent. You write clean, well-documented Python code.

## Workflow
1. Understand the task
2. Write the code and save it to a file      ← implies: use write_file
3. Run the file to verify it works            ← implies: use run_shell
4. If there are errors, fix them and re-run   ← implies: use read_file + write_file + run_shell

## Rules
- Always save code to files before running    ← explicit: write_file before run_shell
"""
```

The instructions don't name tools directly, but the model connects the dots:
- "save it to a file" → I should use `write_file`
- "run the file" → I should use `run_shell`
- "if there are errors, fix them" → I should use `read_file`, then `write_file`, then `run_shell`

**Key insight**: Good instructions = predictable agent behavior. Bad instructions = the agent skips steps or calls tools unnecessarily.

---

### Input 3: Messages History — "What HAVE I done?"

The full conversation history is sent with every API call. This gives the model context about:
- What the user asked
- What tools were already called
- What results those tools returned

```python
messages = [
    {"role": "system",    "content": "You are a coding agent..."},    # instructions
    {"role": "user",      "content": "Write a Fibonacci function..."}, # user request
    {"role": "assistant", "tool_calls": [write_file(...)]},            # model's action
    {"role": "tool",      "content": "Written 324 bytes to fib.py"},   # tool result
    {"role": "assistant", "tool_calls": [run_shell(...)]},             # model's next action
    {"role": "tool",      "content": "STDOUT: Fibonacci(0)=0..."},     # tool result
    # → model sees all of this and decides: "I'm done" → returns text
]
```

**Key insight**: The model sees the **entire history** each time. It knows what it already did and can decide what's left.

---

## The Decision Process: A Step-by-Step Walkthrough

Let's trace through a real execution from our Level 1 agent:

### User asks: "Write a Fibonacci function, save to fib.py, run it"

**API Call 1:**

```
Model receives:
  - Tools: [read_file, write_file, run_shell]
  - Instructions: "Write clean code... save to files before running..."
  - Messages: [system prompt, user message]

Model reasons:
  "The user wants me to write code and save it.
   I have a write_file tool. I should use it first."

Model outputs:
  tool_calls: [write_file(path="fib.py", content="def fibonacci...")]
```

**We execute the tool and send the result back.**

**API Call 2:**

```
Model receives:
  - Tools: [read_file, write_file, run_shell]
  - Instructions: "...run the file to verify it works..."
  - Messages: [system, user, assistant+tool_call, tool_result("Written 324 bytes")]

Model reasons:
  "I wrote the file. My instructions say to run it to verify.
   I have a run_shell tool. I should use it."

Model outputs:
  tool_calls: [run_shell(command="python3 fib.py")]
```

**We execute the tool and send the result back.**

**API Call 3:**

```
Model receives:
  - Tools: [read_file, write_file, run_shell]
  - Instructions: "...if errors, fix and re-run..."
  - Messages: [..., tool_result("STDOUT: Fibonacci(0)=0, Fibonacci(1)=1...")]

Model reasons:
  "The code ran successfully (return code 0, correct output).
   No errors to fix. All steps are complete.
   I should summarize what I did."

Model outputs:
  content: "I have written the Fibonacci function to fib.py..."
  (NO tool_calls → loop ends)
```

---

## The Agent Loop in Code

This is the code that orchestrates everything (`core/agent.py`):

```python
while True:
    # Send everything to the model
    response = self.client.chat.completions.create(
        model=self.model,
        messages=messages,     # full history
        tools=tools,           # available tools
    )

    message = response.choices[0].message

    if message.tool_calls:
        # Model chose to ACT → execute tools, loop back
        for tool_call in message.tool_calls:
            result = execute_tool(tool_call.function.name, ...)
            messages.append({"role": "tool", "content": result})
        continue    # ← go back to the top, call the model again

    # Model chose to RESPOND → we're done
    return message.content
```

The loop is simple:
1. Call the model
2. Did it return `tool_calls`? → Execute them, add results to history, **go to step 1**
3. Did it return text? → **Done**

---

## What the API Response Looks Like

**When the model wants to call a tool:**

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "write_file",
            "arguments": "{\"path\": \"fib.py\", \"content\": \"def fibonacci...\"}"
          }
        }
      ]
    }
  }]
}
```

**When the model wants to respond with text:**

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "I have written the Fibonacci function...",
      "tool_calls": null
    }
  }]
}
```

The difference is simple: `tool_calls` is present or not.

---

## Common Misconceptions

| Misconception | Reality |
|--------------|---------|
| "There's a rule that says when to call tools" | No rule. The model **reasons** about it based on context. |
| "The model always calls tools in a fixed order" | No. Order depends on the task and instructions. |
| "You need to tell the model which tool to use" | No. The model picks the right tool from the schema descriptions. |
| "The model calls one tool per turn" | No. It can call **multiple tools** in a single turn (parallel tool calls). |
| "Tool calling is deterministic" | No. Same input can produce slightly different tool call sequences. |

---

## Factors That Influence Tool Calling Behavior

| Factor | Effect | Where in our code |
|--------|--------|-------------------|
| Tool `description` | Model matches task to tool based on this text | `core/tools.py` — each `*_SCHEMA` |
| System prompt | Guides workflow order and rules | `level_1_tools.py` — `INSTRUCTIONS` |
| User message | States what the user wants done | Passed to `agent.run()` or `agent.chat()` |
| Previous tool results | Model sees what happened and decides next step | Accumulated in `messages` list |
| `strict: True` | Forces model to follow the exact parameter schema | `core/tools.py` — each schema |

---

## Summary

```
                         ┌─────────────────┐
                         │   Model Brain    │
                         │                  │
  Tool Schemas ─────────→│  "What CAN I do" │
  (JSON Schema)          │                  │
                         │   Reasoning:     │
  Instructions ─────────→│  "What SHOULD I" │──→ tool_calls OR text
  (System prompt)        │                  │
                         │  "What HAVE I    │
  Messages History ─────→│   done already"  │
  (Conversation)         │                  │
                         └─────────────────┘
```

**The model decides to call a tool when** it determines that:
1. The task requires an **action** (not just thinking)
2. A suitable tool is **available** (from the schemas)
3. There are **remaining steps** to complete (from instructions + history)

**The model decides to return text when** it determines that:
1. All required actions are **complete**
2. Or the task only requires **thinking/explaining** (no action needed)

This is what makes an agent different from a chatbot: **the ability to reason about when to act vs. when to talk.**
