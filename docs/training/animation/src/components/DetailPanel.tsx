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
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-purple-500/20 text-purple-300 text-xs font-mono px-2 py-1 rounded">
            Step {step.id}/8
          </span>
          <h3 className="text-lg font-bold text-white">{step.title}</h3>
        </div>

        <p className="text-slate-300 mb-4">{step.description}</p>

        {step.code && (
          <pre className="bg-slate-900 rounded-lg p-4 text-sm font-mono text-green-300 overflow-x-auto mb-4 border border-slate-700">
            {step.code}
          </pre>
        )}

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
