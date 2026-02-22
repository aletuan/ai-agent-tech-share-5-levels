import type { ComponentId, ComponentState, StepData } from "../data/steps";
import ComponentBox from "./ComponentBox";
import AnimatedArrow from "./AnimatedArrow";

const POSITIONS: Record<ComponentId, { x: number; y: number }> = {
  user: { x: 120, y: 100 },
  agent: { x: 360, y: 100 },
  llm: { x: 600, y: 100 },
  tools: { x: 360, y: 280 },
  filesystem: { x: 600, y: 280 },
};

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
      <svg
        viewBox="0 0 720 380"
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
