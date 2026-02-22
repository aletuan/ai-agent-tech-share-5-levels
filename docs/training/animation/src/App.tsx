import { useState, useEffect, useCallback, useMemo } from "react";
import {
  STEPS,
  LEVEL_1_STEP_IDS,
  LEVEL_2_STEP_IDS,
} from "./data/steps";
import ArchitectureDiagram from "./components/ArchitectureDiagram";
import DetailPanel from "./components/DetailPanel";
import StepControls from "./components/StepControls";

export default function App() {
  const [level, setLevel] = useState<1 | 2>(1);
  const [stepIndex, setStepIndex] = useState(0);

  const stepIds = level === 1 ? LEVEL_1_STEP_IDS : LEVEL_2_STEP_IDS;
  const steps = useMemo(
    () => STEPS.filter((s) => stepIds.includes(s.id)),
    [stepIds]
  );
  const step = steps[Math.min(stepIndex, steps.length - 1)] ?? steps[0];

  const goNext = useCallback(
    () => setStepIndex((i) => Math.min(i + 1, steps.length - 1)),
    [steps.length]
  );
  const goPrev = useCallback(
    () => setStepIndex((i) => Math.max(i - 1, 0)),
    []
  );
  const goReset = useCallback(() => setStepIndex(0), []);

  // Reset step when switching level
  useEffect(() => {
    setStepIndex(0);
  }, [level]);

  // Clamp stepIndex when steps change
  useEffect(() => {
    setStepIndex((i) => Math.min(i, steps.length - 1));
  }, [steps.length]);

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

  // Auto-advance to next step after 10s if user doesn't click
  useEffect(() => {
    if (stepIndex >= steps.length - 1) return;
    const timer = setTimeout(goNext, 10_000);
    return () => clearTimeout(timer);
  }, [stepIndex, steps.length, goNext]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="py-4 px-6 border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">
            <span className="text-purple-400">Agent Loop</span> Visualizer
          </h1>
          <div className="flex items-center gap-2">
            <label htmlFor="level-select" className="text-slate-500 text-sm">
              Level:
            </label>
            <select
              id="level-select"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) as 1 | 2)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={1}>1 — Agent with Tools</option>
              <option value={2}>2 — Storage & Knowledge</option>
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
        <ArchitectureDiagram step={step} level={level} />
        <DetailPanel step={step} />
      </main>

      <footer className="py-4 px-6 border-t border-slate-800">
        <StepControls
          currentStep={stepIndex + 1}
          totalSteps={steps.length}
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
