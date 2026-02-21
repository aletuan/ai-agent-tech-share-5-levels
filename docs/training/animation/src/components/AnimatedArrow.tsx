import { motion } from "framer-motion";

interface AnimatedArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  isActive: boolean;
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

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowLen = 10;

  return (
    <g>
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
