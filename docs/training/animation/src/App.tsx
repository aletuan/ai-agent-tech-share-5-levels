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

      <main className="flex-1 flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
        <ArchitectureDiagram step={step} />
        <DetailPanel step={step} />
      </main>

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
