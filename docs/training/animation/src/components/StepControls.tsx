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
      <button
        onClick={onReset}
        className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
      >
        ⟲ Reset
      </button>

      <button
        onClick={onPrev}
        disabled={currentStep <= 1}
        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        ◀ Prev
      </button>

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
