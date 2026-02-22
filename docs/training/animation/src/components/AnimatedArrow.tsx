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

/** Number of data-flow particles traveling along the arrow */
const FLOW_PARTICLE_COUNT = 3;

/** Duration for one particle to travel from source to target */
const FLOW_DURATION = 1.2;

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
      {/* Base line with dashed flow animation */}
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

      {/* Data-flow particles: travel from source to target along the line */}
      {isActive &&
        Array.from({ length: FLOW_PARTICLE_COUNT }).map((_, i) => (
          <motion.circle
            key={i}
            r={4}
            fill={color}
            filter="url(#flow-glow)"
            initial={{ cx: x1, cy: y1, opacity: 0 }}
            animate={{
              cx: [x1, x2],
              cy: [y1, y2],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              cx: {
                duration: FLOW_DURATION,
                repeat: Infinity,
                ease: "linear",
                delay: i * (FLOW_DURATION / FLOW_PARTICLE_COUNT),
              },
              cy: {
                duration: FLOW_DURATION,
                repeat: Infinity,
                ease: "linear",
                delay: i * (FLOW_DURATION / FLOW_PARTICLE_COUNT),
              },
              opacity: {
                duration: FLOW_DURATION,
                repeat: Infinity,
                times: [0, 0.1, 0.9, 1],
                delay: i * (FLOW_DURATION / FLOW_PARTICLE_COUNT),
              },
            }}
          />
        ))}

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
