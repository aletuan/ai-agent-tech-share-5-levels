# Agent Loop Animation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React + Framer Motion interactive animation that visualizes the Level 1 agent loop for training presentations.

**Architecture:** A single-page React app with a top architecture diagram (5 component boxes connected by animated SVG arrows) and a bottom detail panel. Step-by-step navigation lets the presenter walk through 8 steps of the Fibonacci happy path. Framer Motion handles all transitions and glow effects.

**Tech Stack:** Vite, React 18, TypeScript, Framer Motion, Tailwind CSS v4

---

### Task 1: Scaffold the Vite + React + TS project

**Files:**
- Create: `docs/training/animation/package.json`
- Create: `docs/training/animation/index.html`
- Create: `docs/training/animation/vite.config.ts`
- Create: `docs/training/animation/tsconfig.json`
- Create: `docs/training/animation/src/main.tsx`
- Create: `docs/training/animation/src/App.tsx`
- Create: `docs/training/animation/src/styles/globals.css`

**Step 1: Create package.json**

```json
{
  "name": "agent-loop-animation",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "framer-motion": "^11.18.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.3",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.1.3",
    "typescript": "^5.7.3",
    "vite": "^6.0.5"
  }
}
```

**Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

**Step 4: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Loop Visualizer</title>
  </head>
  <body class="bg-slate-900 text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 5: Create src/styles/globals.css**

```css
@import "tailwindcss";
```

**Step 6: Create src/main.tsx**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Step 7: Create src/App.tsx (placeholder)**

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <h1 className="text-3xl font-bold">Agent Loop Visualizer</h1>
    </div>
  );
}
```

**Step 8: Install dependencies and verify**

Run:
```bash
cd docs/training/animation
npm install
npm run dev
```

Expected: Vite dev server starts, browser shows "Agent Loop Visualizer" on dark background.

**Step 9: Commit**

```bash
git add docs/training/animation/
git commit -m "feat: scaffold animation app with Vite + React + Framer Motion + Tailwind"
```

---

### Task 2: Step Data Model

**Files:**
- Create: `docs/training/animation/src/data/steps.ts`

Define all 8 steps as a typed data structure. This is the single source of truth for the entire animation.

**Step 1: Create src/data/steps.ts**

```typescript
export type ComponentId = "user" | "agent" | "llm" | "tools" | "filesystem";

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
  /** Which components are in which state */
  componentStates: Partial<Record<ComponentId, ComponentState>>;
  /** Arrows to animate for this step */
  arrows: Arrow[];
  /** Code or message content to show in detail panel */
  code?: string;
  /** Model reasoning (shown in thought bubble) */
  reasoning?: string;
}

export const STEPS: StepData[] = [
  {
    id: 1,
    title: "User → Agent",
    description: "User sends a task to the agent",
    componentStates: { user: "sending", agent: "receiving" },
    arrows: [{ from: "user", to: "agent", label: "user message" }],
    code: `"Write a Fibonacci function that returns the nth
Fibonacci number. Save it to fib.py with a main
block that prints the first 10 values, then run
it to verify."`,
  },
  {
    id: 2,
    title: "Agent builds messages",
    description: "Agent constructs the messages array and tool schemas",
    componentStates: { agent: "active" },
    arrows: [],
    code: `messages = [
  { role: "system", content: instructions },
  { role: "user",   content: user_message },
]
tools = [read_file, write_file, run_shell]`,
  },
  {
    id: 3,
    title: "Agent → LLM (API Call 1)",
    description: "Agent sends messages + tools to OpenAI",
    componentStates: { agent: "sending", llm: "receiving" },
    arrows: [{ from: "agent", to: "llm", label: "messages + tools" }],
    code: `client.chat.completions.create(
  model="gpt-4.1-mini",
  messages=messages,
  tools=tools,
)`,
  },
  {
    id: 4,
    title: "LLM → Agent (tool_calls)",
    description: "LLM decides to call write_file — it needs to save code first",
    componentStates: { llm: "sending", agent: "receiving" },
    arrows: [{ from: "llm", to: "agent", label: "tool_calls" }],
    code: `tool_calls: [{
  name: "write_file",
  arguments: {
    path: "fib.py",
    content: "def fibonacci(n: int) -> int: ..."
  }
}]`,
    reasoning: `"User wants code saved to file.
I have write_file tool. Use it first."`,
  },
  {
    id: 5,
    title: "Agent → Tools → FileSystem",
    description: "Agent executes write_file — code is saved to workspace/fib.py",
    componentStates: { agent: "sending", tools: "active", filesystem: "receiving" },
    arrows: [
      { from: "agent", to: "tools", label: "execute_tool()" },
      { from: "tools", to: "filesystem", label: "write fib.py" },
    ],
    code: `execute_tool("write_file", {
  path: "fib.py",
  content: "def fibonacci(n: int) -> int: ..."
})
→ "Written 324 bytes to fib.py"`,
  },
  {
    id: 6,
    title: "Agent → LLM (API Call 2)",
    description: "Agent sends updated messages (now includes write_file result) back to LLM",
    componentStates: { agent: "sending", llm: "receiving" },
    arrows: [{ from: "agent", to: "llm", label: "messages + tool result" }],
    code: `messages now includes:
  ...previous messages,
  { role: "assistant", tool_calls: [write_file(...)] },
  { role: "tool", content: "Written 324 bytes to fib.py" }`,
    reasoning: `"File saved. Instructions say run
to verify. Use run_shell."`,
  },
  {
    id: 7,
    title: "LLM → Agent → Tools → FileSystem",
    description: "LLM calls run_shell → Agent executes → Python runs fib.py → Output captured",
    componentStates: { llm: "sending", agent: "active", tools: "active", filesystem: "active" },
    arrows: [
      { from: "llm", to: "agent", label: "tool_calls: run_shell" },
      { from: "agent", to: "tools", label: "execute_tool()" },
      { from: "tools", to: "filesystem", label: "python3 fib.py" },
    ],
    code: `run_shell("python3 fib.py")

STDOUT:
  Fibonacci(0) = 0
  Fibonacci(1) = 1
  Fibonacci(2) = 1
  ...
  Fibonacci(9) = 34
Return code: 0`,
  },
  {
    id: 8,
    title: "LLM → Agent → User (Done!)",
    description: "No more tool_calls — LLM returns final text response to user",
    componentStates: { llm: "sending", agent: "active", user: "receiving" },
    arrows: [
      { from: "llm", to: "agent", label: "content (text)" },
      { from: "agent", to: "user", label: "final response" },
    ],
    code: `"I have written the Fibonacci function to fib.py
with a main block that prints the first 10 values.
The script ran successfully and printed the correct
Fibonacci sequence."`,
    reasoning: `"Code ran OK (return code 0).
No errors. All steps done.
Return final summary."`,
  },
];
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd docs/training/animation
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add docs/training/animation/src/data/steps.ts
git commit -m "feat: add step data model for 8-step Fibonacci agent loop"
```

---

### Task 3: ComponentBox with Framer Motion

**Files:**
- Create: `docs/training/animation/src/components/ComponentBox.tsx`

**Step 1: Create the component**

```tsx
import { motion } from "framer-motion";
import type { ComponentId, ComponentState } from "../data/steps";

const COMPONENT_CONFIG: Record<
  ComponentId,
  { label: string; icon: string; color: string; glowColor: string }
> = {
  user: {
    label: "User",
    icon: "👤",
    color: "border-blue-400",
    glowColor: "shadow-blue-400/50",
  },
  agent: {
    label: "Agent Loop",
    icon: "🔄",
    color: "border-purple-400",
    glowColor: "shadow-purple-400/50",
  },
  llm: {
    label: "LLM",
    icon: "🧠",
    color: "border-amber-400",
    glowColor: "shadow-amber-400/50",
  },
  tools: {
    label: "Tools",
    icon: "🛠️",
    color: "border-green-400",
    glowColor: "shadow-green-400/50",
  },
  filesystem: {
    label: "File System",
    icon: "📁",
    color: "border-cyan-400",
    glowColor: "shadow-cyan-400/50",
  },
};

interface ComponentBoxProps {
  id: ComponentId;
  state: ComponentState;
}

export default function ComponentBox({ id, state }: ComponentBoxProps) {
  const config = COMPONENT_CONFIG[id];
  const isActive = state !== "idle";

  return (
    <motion.div
      className={`
        relative flex flex-col items-center justify-center
        w-32 h-28 rounded-xl border-2 bg-slate-800
        ${config.color}
        ${isActive ? `shadow-lg ${config.glowColor}` : "border-opacity-40"}
        transition-colors duration-300
      `}
      animate={{
        scale: isActive ? [1, 1.05, 1] : 1,
        opacity: state === "idle" ? 0.5 : 1,
      }}
      transition={{
        scale: {
          duration: 0.6,
          repeat: isActive ? Infinity : 0,
          repeatType: "reverse",
        },
        opacity: { duration: 0.3 },
      }}
    >
      <span className="text-3xl mb-1">{config.icon}</span>
      <span className="text-sm font-semibold">{config.label}</span>
      {state !== "idle" && (
        <motion.span
          className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-white"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          {state === "sending" ? "📤" : state === "receiving" ? "📥" : "⚡"}
        </motion.span>
      )}
    </motion.div>
  );
}
```

**Step 2: Verify it renders — temporarily import in App.tsx**

Update `src/App.tsx`:
```tsx
import ComponentBox from "./components/ComponentBox";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center gap-8">
      <ComponentBox id="user" state="idle" />
      <ComponentBox id="agent" state="active" />
      <ComponentBox id="llm" state="sending" />
      <ComponentBox id="tools" state="receiving" />
      <ComponentBox id="filesystem" state="idle" />
    </div>
  );
}
```

Run: `npm run dev` — verify 5 boxes render with correct colors and animations.

**Step 3: Commit**

```bash
git add docs/training/animation/src/components/ComponentBox.tsx
git commit -m "feat: add ComponentBox with Framer Motion glow and pulse animations"
```

---

### Task 4: AnimatedArrow (SVG)

**Files:**
- Create: `docs/training/animation/src/components/AnimatedArrow.tsx`

**Step 1: Create the SVG arrow component**

```tsx
import { motion } from "framer-motion";

interface AnimatedArrowProps {
  /** SVG start point */
  x1: number;
  y1: number;
  /** SVG end point */
  x2: number;
  y2: number;
  /** Label text */
  label: string;
  /** Is currently animating */
  isActive: boolean;
  /** Color of the arrow */
  color?: string;
}

export default function AnimatedArrow({
  x1,
  y1,
  x2,
  y2,
  label,
  isActive,
  color = "#94a3b8",
}: AnimatedArrowProps) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Arrowhead angle
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLen = 10;

  return (
    <g>
      {/* Arrow line */}
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={isActive ? 2.5 : 1.5}
        strokeDasharray={isActive ? "8 4" : "none"}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: isActive ? 1 : 0.3,
          strokeDashoffset: isActive ? [0, -24] : 0,
        }}
        transition={{
          pathLength: { duration: 0.5 },
          opacity: { duration: 0.3 },
          strokeDashoffset: {
            duration: 0.8,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      />

      {/* Arrowhead */}
      <motion.polygon
        points={`
          ${x2},${y2}
          ${x2 - arrowLen * Math.cos(angle - Math.PI / 6)},${y2 - arrowLen * Math.sin(angle - Math.PI / 6)}
          ${x2 - arrowLen * Math.cos(angle + Math.PI / 6)},${y2 - arrowLen * Math.sin(angle + Math.PI / 6)}
        `}
        fill={color}
        animate={{ opacity: isActive ? 1 : 0.3 }}
        transition={{ duration: 0.3 }}
      />

      {/* Label */}
      {isActive && (
        <motion.text
          x={midX}
          y={midY - 10}
          textAnchor="middle"
          fill="white"
          fontSize={11}
          fontFamily="monospace"
          initial={{ opacity: 0, y: midY }}
          animate={{ opacity: 1, y: midY - 10 }}
          transition={{ duration: 0.3 }}
        >
          {label}
        </motion.text>
      )}
    </g>
  );
}
```

**Step 2: Commit**

```bash
git add docs/training/animation/src/components/AnimatedArrow.tsx
git commit -m "feat: add AnimatedArrow with SVG dash-offset animation"
```

---

### Task 5: ArchitectureDiagram (layout + wiring)

**Files:**
- Create: `docs/training/animation/src/components/ArchitectureDiagram.tsx`

This component positions the 5 ComponentBoxes and draws AnimatedArrows between them based on the current step.

**Step 1: Create the diagram component**

```tsx
import type { ComponentId, ComponentState, StepData } from "../data/steps";
import ComponentBox from "./ComponentBox";
import AnimatedArrow from "./AnimatedArrow";

/** Position of each component center (in SVG viewBox coords) */
const POSITIONS: Record<ComponentId, { x: number; y: number }> = {
  user: { x: 120, y: 100 },
  agent: { x: 360, y: 100 },
  llm: { x: 600, y: 100 },
  tools: { x: 360, y: 280 },
  filesystem: { x: 600, y: 280 },
};

/** Color per component for arrows */
const ARROW_COLORS: Record<ComponentId, string> = {
  user: "#60a5fa",
  agent: "#c084fc",
  llm: "#fbbf24",
  tools: "#4ade80",
  filesystem: "#22d3ee",
};

interface ArchitectureDiagramProps {
  step: StepData;
}

export default function ArchitectureDiagram({ step }: ArchitectureDiagramProps) {
  const getState = (id: ComponentId): ComponentState =>
    step.componentStates[id] ?? "idle";

  return (
    <div className="relative w-full" style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* SVG layer for arrows */}
      <svg
        viewBox="0 0 720 380"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {step.arrows.map((arrow, i) => {
          const from = POSITIONS[arrow.from];
          const to = POSITIONS[arrow.to];
          return (
            <AnimatedArrow
              key={`${step.id}-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              label={arrow.label}
              isActive={true}
              color={ARROW_COLORS[arrow.from]}
            />
          );
        })}
      </svg>

      {/* Component boxes positioned with CSS */}
      <div className="relative" style={{ height: 380 }}>
        {(Object.entries(POSITIONS) as [ComponentId, { x: number; y: number }][]).map(
          ([id, pos]) => (
            <div
              key={id}
              className="absolute"
              style={{
                left: pos.x - 64,
                top: pos.y - 56,
              }}
            >
              <ComponentBox id={id} state={getState(id)} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add docs/training/animation/src/components/ArchitectureDiagram.tsx
git commit -m "feat: add ArchitectureDiagram with positioned boxes and wired arrows"
```

---

### Task 6: DetailPanel

**Files:**
- Create: `docs/training/animation/src/components/DetailPanel.tsx`

**Step 1: Create the detail panel**

```tsx
import { motion, AnimatePresence } from "framer-motion";
import type { StepData } from "../data/steps";

interface DetailPanelProps {
  step: StepData;
}

export default function DetailPanel({ step }: DetailPanelProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Step title */}
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-purple-500/20 text-purple-300 text-xs font-mono px-2 py-1 rounded">
            Step {step.id}/8
          </span>
          <h3 className="text-lg font-bold text-white">{step.title}</h3>
        </div>

        {/* Description */}
        <p className="text-slate-300 mb-4">{step.description}</p>

        {/* Code block */}
        {step.code && (
          <pre className="bg-slate-900 rounded-lg p-4 text-sm font-mono text-green-300 overflow-x-auto mb-4 border border-slate-700">
            {step.code}
          </pre>
        )}

        {/* Reasoning (thought bubble) */}
        {step.reasoning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🧠</span>
              <span className="text-amber-300 text-sm font-semibold">
                Model reasoning
              </span>
            </div>
            <p className="text-amber-200/80 font-mono text-sm whitespace-pre-line">
              {step.reasoning}
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add docs/training/animation/src/components/DetailPanel.tsx
git commit -m "feat: add DetailPanel with code block and reasoning thought bubble"
```

---

### Task 7: StepControls

**Files:**
- Create: `docs/training/animation/src/components/StepControls.tsx`

**Step 1: Create the controls**

```tsx
interface StepControlsProps {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}

export default function StepControls({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onReset,
}: StepControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Reset */}
      <button
        onClick={onReset}
        className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
      >
        ⟲ Reset
      </button>

      {/* Prev */}
      <button
        onClick={onPrev}
        disabled={currentStep <= 1}
        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        ◀ Prev
      </button>

      {/* Step indicator + progress bar */}
      <div className="flex flex-col items-center gap-1 min-w-[120px]">
        <span className="text-sm text-slate-400 font-mono">
          Step {currentStep} / {totalSteps}
        </span>
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-400 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        disabled={currentStep >= totalSteps}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        Next ▶
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add docs/training/animation/src/components/StepControls.tsx
git commit -m "feat: add StepControls with progress bar and keyboard support"
```

---

### Task 8: Wire Everything in App.tsx

**Files:**
- Modify: `docs/training/animation/src/App.tsx`

**Step 1: Assemble all components with keyboard support**

```tsx
import { useState, useEffect, useCallback } from "react";
import { STEPS } from "./data/steps";
import ArchitectureDiagram from "./components/ArchitectureDiagram";
import DetailPanel from "./components/DetailPanel";
import StepControls from "./components/StepControls";

export default function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const goNext = useCallback(
    () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)),
    []
  );
  const goPrev = useCallback(
    () => setStepIndex((i) => Math.max(i - 1, 0)),
    []
  );
  const goReset = useCallback(() => setStepIndex(0), []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "r" || e.key === "R") {
        goReset();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, goReset]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="py-4 px-6 border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="text-purple-400">Agent Loop</span> Visualizer
          </h1>
          <span className="text-slate-500 text-sm font-mono">
            Level 1: Agent with Tools
          </span>
        </div>
      </header>

      {/* Architecture Diagram */}
      <main className="flex-1 flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
        <ArchitectureDiagram step={step} />
        <DetailPanel step={step} />
      </main>

      {/* Footer controls */}
      <footer className="py-4 px-6 border-t border-slate-800">
        <StepControls
          currentStep={step.id}
          totalSteps={STEPS.length}
          onPrev={goPrev}
          onNext={goNext}
          onReset={goReset}
        />
        <p className="text-center text-slate-600 text-xs mt-2">
          ← → arrows to navigate · Space for next · R to reset
        </p>
      </footer>
    </div>
  );
}
```

**Step 2: Run the dev server and verify everything works end-to-end**

Run:
```bash
cd docs/training/animation
npm run dev
```

Test:
1. Click Next → arrows animate, components glow, detail panel updates
2. Click Prev → goes back
3. Press → ← arrow keys → navigation works
4. Press Space → advances
5. Press R → resets to step 1
6. Walk through all 8 steps — verify each step shows correct data

**Step 3: Commit**

```bash
git add docs/training/animation/src/App.tsx
git commit -m "feat: wire App with step navigation, keyboard controls, and full layout"
```

---

### Task 9: Polish and Final Commit

**Files:**
- Modify: `docs/training/animation/.gitignore`
- Modify: `README.md` (add animation section)

**Step 1: Create animation .gitignore**

```
node_modules/
dist/
```

**Step 2: Update project README — add animation entry**

Add to the Training Docs table in `README.md`:

```markdown
| Agent Loop Animation | [Open](docs/training/animation/) | Interactive React app — run `npm run dev` |
```

**Step 3: Final commit and push**

```bash
git add docs/training/animation/.gitignore README.md
git commit -m "feat: complete agent loop animation with all 8 steps

Interactive React + Framer Motion visualization of the Level 1
agent loop. 5 component boxes with animated arrows showing data
flow through the Fibonacci happy path scenario.

Run: cd docs/training/animation && npm install && npm run dev"
git push origin main
```

---

## Summary

| Task | What it builds | Files |
|------|---------------|-------|
| 1 | Project scaffold | package.json, vite.config, tsconfig, index.html, main.tsx, App.tsx |
| 2 | Step data model | steps.ts — all 8 steps as typed data |
| 3 | ComponentBox | Boxes with glow/pulse animations |
| 4 | AnimatedArrow | SVG arrows with dash-offset animation |
| 5 | ArchitectureDiagram | Layout + wiring of boxes and arrows |
| 6 | DetailPanel | Code blocks + reasoning thought bubble |
| 7 | StepControls | Buttons + progress bar |
| 8 | App.tsx | Wire everything + keyboard navigation |
| 9 | Polish | .gitignore + README update |
