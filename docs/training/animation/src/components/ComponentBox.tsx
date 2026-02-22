import { motion } from "framer-motion";
import type { ComponentId, ComponentState } from "../data/steps";

const COMPONENT_CONFIG: Record<
  ComponentId,
  { label: string; icon: string; color: string; glowColor: string }
> = {
  user: {
    label: "User",
    icon: "\u{1F464}",
    color: "border-blue-400",
    glowColor: "shadow-blue-400/50",
  },
  agent: {
    label: "Agent Loop",
    icon: "\u{1F504}",
    color: "border-purple-400",
    glowColor: "shadow-purple-400/50",
  },
  llm: {
    label: "LLM",
    icon: "\u{1F9E0}",
    color: "border-amber-400",
    glowColor: "shadow-amber-400/50",
  },
  tools: {
    label: "Tools",
    icon: "\u{1F6E0}\uFE0F",
    color: "border-green-400",
    glowColor: "shadow-green-400/50",
  },
  filesystem: {
    label: "File System",
    icon: "\u{1F4C1}",
    color: "border-cyan-400",
    glowColor: "shadow-cyan-400/50",
  },
  storage: {
    label: "Storage",
    icon: "\u{1F4BE}",
    color: "border-orange-400",
    glowColor: "shadow-orange-400/50",
  },
  knowledge: {
    label: "Knowledge",
    icon: "\u{1F4DA}",
    color: "border-rose-400",
    glowColor: "shadow-rose-400/50",
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
        w-[128px] min-w-[128px] max-w-[128px] h-[112px] min-h-[112px] rounded-xl border-2 bg-slate-800
        ${config.color}
        ${isActive ? `shadow-lg ${config.glowColor}` : "border-opacity-40"}
        transition-colors duration-300
      `}
      animate={{
        scale: 1,
        opacity: state === "idle" ? 0.5 : 1,
      }}
      transition={{ opacity: { duration: 0.3 } }}
    >
      <span className="text-3xl mb-1">{config.icon}</span>
      <span className="text-sm font-semibold text-center px-1 leading-tight">{config.label}</span>
      {state !== "idle" && (
        <motion.span
          className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-white"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          {state === "sending" ? "\u{1F4E4}" : state === "receiving" ? "\u{1F4E5}" : "\u26A1"}
        </motion.span>
      )}
    </motion.div>
  );
}
