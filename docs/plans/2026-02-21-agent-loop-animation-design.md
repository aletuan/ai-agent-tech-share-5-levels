# Agent Loop Interactive Animation — Design Doc

## Goal

Build an interactive animated web page that visualizes the agent loop (Level 1) for training/tech-share presentations. Presenter clicks through each step, seeing data flow between components with smooth animations.

## Decisions

- **Tech**: Vite + React + TypeScript + Framer Motion + Tailwind CSS
- **Scenario**: Happy path — Fibonacci example (8 steps, 3 API calls)
- **Mode**: Step-by-step presenter control (Next/Prev buttons + keyboard arrows)
- **Location**: `docs/training/animation/` (separate mini-app within the project)

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Title + Step indicator + Nav buttons                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  TOP: Architecture Diagram                                   │
│  - 5 component boxes: User, Agent, LLM, Tools, FileSystem   │
│  - Animated arrows (data packets) between active components  │
│  - Active component glows / highlights                       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  BOTTOM: Detail Panel                                        │
│  - Step title and description                                │
│  - Code/messages being sent                                  │
│  - Model reasoning (thought bubble)                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## The 8 Steps

| Step | Source → Target | Animation | Detail Panel |
|------|----------------|-----------|-------------|
| 1 | User → Agent | User glows, arrow flies to Agent | User prompt: "Write a Fibonacci function, save to fib.py, run it" |
| 2 | Agent (internal) | Agent glows, builds messages list | Building messages: [system_prompt, user_message] + tools: [read_file, write_file, run_shell] |
| 3 | Agent → LLM | Arrow flies Agent → LLM | API Call 1: chat.completions.create(messages, tools) |
| 4 | LLM → Agent | LLM thinks, arrow returns | Response: tool_calls: [write_file(path="fib.py", content="def fibonacci...")] |
| 5 | Agent → Tools → FS | Arrow: Agent → Tools → FileSystem | execute_tool("write_file", ...) → "Written 324 bytes to fib.py" |
| 6 | Agent → LLM | Arrow flies again | API Call 2: messages now include write_file result |
| 7 | LLM → Agent → Tools → FS | Multi-hop animation | run_shell("python3 fib.py") → STDOUT: Fibonacci(0)=0... Return code: 0 |
| 8 | LLM → Agent → User | Arrow flies to User, celebration | Final text: "I have written the Fibonacci function..." — No more tool_calls |

## Components

### ComponentBox
- Props: name, icon, isActive, isGlowing
- Framer Motion: scale pulse when active, glow border animation
- States: idle (grey border), active (blue glow), sending (orange pulse), receiving (green pulse)

### AnimatedArrow
- Props: from, to, isAnimating, label
- SVG path with animated dash-offset (data packet effect)
- Label text above arrow showing what's being sent

### DetailPanel
- Props: step data (title, description, code, reasoning)
- Framer Motion: slide-in transition between steps
- Syntax-highlighted code blocks
- Reasoning shown in a thought-bubble styled box

### StepControls
- Next/Prev buttons
- Keyboard: ← → arrows
- Step indicator: "Step 3/8" with progress bar
- Reset button

## File Structure

```
docs/training/animation/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ComponentBox.tsx
│   │   ├── AnimatedArrow.tsx
│   │   ├── ArchitectureDiagram.tsx
│   │   ├── DetailPanel.tsx
│   │   └── StepControls.tsx
│   ├── data/
│   │   └── steps.ts          # All 8 steps defined as data
│   └── styles/
│       └── globals.css
└── public/
```

## Color Scheme

- Background: dark (slate-900)
- Component boxes: slate-800 with colored borders
- User: blue-400
- Agent: purple-400
- LLM: amber-400
- Tools: green-400
- FileSystem: cyan-400
- Active glow: matching color with shadow
- Arrows: white/grey, animated with matching color
