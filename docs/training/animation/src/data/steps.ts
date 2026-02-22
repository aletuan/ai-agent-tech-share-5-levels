export type ComponentId =
  | "user"
  | "agent"
  | "llm"
  | "tools"
  | "filesystem"
  | "storage"
  | "knowledge";

export type ComponentState = "idle" | "active" | "sending" | "receiving";

export interface Arrow {
  from: ComponentId;
  to: ComponentId;
  label: string;
}

export interface StepData {
  id: number;
  title: string;
  description: string;
  componentStates: Partial<Record<ComponentId, ComponentState>>;
  arrows: Arrow[];
  code?: string;
  reasoning?: string;
}

export const LEVEL_1_STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
export const LEVEL_2_STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const STEPS: StepData[] = [
  {
    id: 1,
    title: "User \u2192 Agent",
    description: "User sends a task to the agent",
    componentStates: { user: "sending", agent: "receiving" },
    arrows: [{ from: "user", to: "agent", label: "user message" }],
    code: '"Write a Fibonacci function that returns the nth\nFibonacci number. Save it to fib.py with a main\nblock that prints the first 10 values, then run\nit to verify."',
  },
  {
    id: 2,
    title: "Agent builds messages",
    description: "Agent constructs the messages array and tool schemas",
    componentStates: { agent: "active" },
    arrows: [],
    code: 'messages = [\n  { role: "system", content: instructions },\n  { role: "user",   content: user_message },\n]\ntools = [read_file, write_file, run_shell]',
  },
  {
    id: 3,
    title: "Agent \u2192 LLM (API Call 1)",
    description: "Agent sends messages + tools to OpenAI",
    componentStates: { agent: "sending", llm: "receiving" },
    arrows: [{ from: "agent", to: "llm", label: "messages + tools" }],
    code: 'client.chat.completions.create(\n  model="gpt-4.1-mini",\n  messages=messages,\n  tools=tools,\n)',
  },
  {
    id: 4,
    title: "LLM \u2192 Agent (tool_calls)",
    description: "LLM decides to call write_file \u2014 it needs to save code first",
    componentStates: { llm: "sending", agent: "receiving" },
    arrows: [{ from: "llm", to: "agent", label: "tool_calls" }],
    code: 'tool_calls: [{\n  name: "write_file",\n  arguments: {\n    path: "fib.py",\n    content: "def fibonacci(n: int) -> int: ..."\n  }\n}]',
    reasoning: '"User wants code saved to file.\nI have write_file tool. Use it first."',
  },
  {
    id: 5,
    title: "Agent \u2192 Tools \u2192 FileSystem",
    description: "Agent executes write_file \u2014 code is saved to workspace/fib.py",
    componentStates: { agent: "sending", tools: "active", filesystem: "receiving" },
    arrows: [
      { from: "agent", to: "tools", label: "execute_tool()" },
      { from: "tools", to: "filesystem", label: "write fib.py" },
    ],
    code: 'execute_tool("write_file", {\n  path: "fib.py",\n  content: "def fibonacci(n: int) -> int: ..."\n})\n\u2192 "Written 324 bytes to fib.py"',
  },
  {
    id: 6,
    title: "Agent \u2192 LLM (API Call 2)",
    description:
      "Agent sends updated messages (now includes write_file result) back to LLM",
    componentStates: { agent: "sending", llm: "receiving" },
    arrows: [{ from: "agent", to: "llm", label: "messages + tool result" }],
    code: 'messages now includes:\n  ...previous messages,\n  { role: "assistant", tool_calls: [write_file(...)] },\n  { role: "tool", content: "Written 324 bytes to fib.py" }',
    reasoning: '"File saved. Instructions say run\nto verify. Use run_shell."',
  },
  {
    id: 7,
    title: "LLM \u2192 Agent \u2192 Tools \u2192 FileSystem",
    description:
      "LLM calls run_shell \u2192 Agent executes \u2192 Python runs fib.py \u2192 Output captured",
    componentStates: {
      llm: "sending",
      agent: "active",
      tools: "active",
      filesystem: "active",
    },
    arrows: [
      { from: "llm", to: "agent", label: "tool_calls: run_shell" },
      { from: "agent", to: "tools", label: "execute_tool()" },
      { from: "tools", to: "filesystem", label: "python3 fib.py" },
    ],
    code: 'run_shell("python3 fib.py")\n\nSTDOUT:\n  Fibonacci(0) = 0\n  Fibonacci(1) = 1\n  Fibonacci(2) = 1\n  ...\n  Fibonacci(9) = 34\nReturn code: 0',
  },
  {
    id: 8,
    title: "LLM \u2192 Agent \u2192 User (Done!)",
    description:
      "No more tool_calls \u2014 LLM returns final text response to user",
    componentStates: { llm: "sending", agent: "active", user: "receiving" },
    arrows: [
      { from: "llm", to: "agent", label: "content (text)" },
      { from: "agent", to: "user", label: "final response" },
    ],
    code: '"I have written the Fibonacci function to fib.py\nwith a main block that prints the first 10 values.\nThe script ran successfully and printed the correct\nFibonacci sequence."',
    reasoning:
      '"Code ran OK (return code 0).\nNo errors. All steps done.\nReturn final summary."',
  },
  // Level 2: Storage & Knowledge
  {
    id: 9,
    title: "Agent \u2192 Knowledge (Level 2)",
    description: "Agent searches ChromaDB for coding conventions before coding",
    componentStates: { agent: "sending", knowledge: "receiving" },
    arrows: [{ from: "agent", to: "knowledge", label: "search(query)" }],
    code: 'search(user_message, k=3)\n\u2192 ["Use 4 spaces...", "Google-style docstrings..."]',
  },
  {
    id: 10,
    title: "Agent \u2192 Storage (Level 2)",
    description: "Agent saves session to SQLite after each turn",
    componentStates: { agent: "sending", storage: "receiving" },
    arrows: [{ from: "agent", to: "storage", label: "save_session()" }],
    code: "save_session(session_id, messages, db_path)\n\u2192 Persisted to workspace/agents.db",
  },
];
