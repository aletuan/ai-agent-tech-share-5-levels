import type { ComponentId, ComponentState, StepData } from "../data/steps";
import ComponentBox from "./ComponentBox";
import AnimatedArrow from "./AnimatedArrow";

// Row 1: user, agent, llm (center 360)
// Row 2: tools, filesystem (center 360, aligned)
// Row 3: storage, knowledge (Level 2 only, same x as row 2 for vertical alignment)
const ROW_GAP = 200;
const ROW1_Y = 100;
const ROW2_Y = ROW1_Y + ROW_GAP;
const ROW3_Y = ROW2_Y + ROW_GAP;
const CENTER_X = 360;
const COL_LEFT_X = 240;  // tools, storage
const COL_RIGHT_X = 480; // filesystem, knowledge

const POSITIONS: Record<ComponentId, { x: number; y: number }> = {
  user: { x: 120, y: ROW1_Y },
  agent: { x: CENTER_X, y: ROW1_Y },
  llm: { x: 600, y: ROW1_Y },
  tools: { x: COL_LEFT_X, y: ROW2_Y },
  filesystem: { x: COL_RIGHT_X, y: ROW2_Y },
  storage: { x: COL_LEFT_X, y: ROW3_Y },
  knowledge: { x: COL_RIGHT_X, y: ROW3_Y },
};

const ARROW_COLORS: Record<ComponentId, string> = {
  user: "#60a5fa",
  agent: "#c084fc",
  llm: "#fbbf24",
  tools: "#4ade80",
  filesystem: "#22d3ee",
  storage: "#fb923c",
  knowledge: "#fb7185",
};

interface ArchitectureDiagramProps {
  step: StepData;
  level: 1 | 2;
}

const LEVEL_2_COMPONENTS: ComponentId[] = ["storage", "knowledge"];

export default function ArchitectureDiagram({ step, level }: ArchitectureDiagramProps) {
  const getState = (id: ComponentId): ComponentState =>
    step.componentStates[id] ?? "idle";

  const visiblePositions = Object.entries(POSITIONS).filter(
    ([id]) => level === 2 || !LEVEL_2_COMPONENTS.includes(id as ComponentId)
  ) as [ComponentId, { x: number; y: number }][];

  return (
    <div className="relative w-full" style={{ maxWidth: 720, margin: "0 auto" }}>
      <svg
        viewBox="0 0 720 600"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {step.arrows.map((arrow, i) => {
          const from = POSITIONS[arrow.from];
          const to = POSITIONS[arrow.to];
          // Agent → Knowledge/Storage: bent path (down → horizontal → down) to avoid cutting through row 2
          const waypoints =
            arrow.from === "agent" && arrow.to === "knowledge"
              ? [
                  { x: CENTER_X, y: ROW2_Y + 100 },
                  { x: COL_RIGHT_X, y: ROW2_Y + 100 },
                ]
              : arrow.from === "agent" && arrow.to === "storage"
                ? [
                    { x: CENTER_X, y: ROW2_Y + 100 },
                    { x: COL_LEFT_X, y: ROW2_Y + 100 },
                  ]
                : undefined;
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
              waypoints={waypoints}
            />
          );
        })}
      </svg>

      <div className="relative" style={{ height: 600 }}>
        {visiblePositions.map(([id, pos]) => (
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
