import { motion } from "framer-motion";

interface AnimatedArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  isActive: boolean;
  color?: string;
  /** Optional waypoints for bent path (down → right → down). Path: start → waypoints → end */
  waypoints?: { x: number; y: number }[];
}

/** Number of data-flow particles traveling along the arrow */
const FLOW_PARTICLE_COUNT = 3;

/** Pixels per second — same speed for all arrows regardless of path length */
const FLOW_PIXELS_PER_SECOND = 300;

function buildPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  waypoints?: { x: number; y: number }[]
): { d: string; points: { x: number; y: number }[] } {
  const points = waypoints?.length
    ? [{ x: x1, y: y1 }, ...waypoints, { x: x2, y: y2 }]
    : [{ x: x1, y: y1 }, { x: x2, y: y2 }];
  const d = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  return { d, points };
}

/** Compute segment lengths, total path length, and keyframe times */
function pathMetrics(points: { x: number; y: number }[]): {
  totalLength: number;
  times: number[];
} {
  let total = 0;
  const segs: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.hypot(dx, dy);
    segs.push(total);
  }
  const len = total || 1;
  return { totalLength: total, times: segs.map((s) => s / len) };
}

export default function AnimatedArrow({
  x1,
  y1,
  x2,
  y2,
  label,
  isActive,
  color = "#94a3b8",
  waypoints,
}: AnimatedArrowProps) {
  const { d, points } = buildPath(x1, y1, x2, y2, waypoints);
  const { totalLength, times } = pathMetrics(points);
  const flowDuration = totalLength / FLOW_PIXELS_PER_SECOND;
  const midIdx = Math.floor(points.length / 2);
  const midX = points[midIdx].x;
  const midY = points[midIdx].y;

  const lastSeg = points[points.length - 2];
  const angle = Math.atan2(y2 - lastSeg.y, x2 - lastSeg.x);
  const arrowLen = 10;

  const cxKeyframes = points.map((p) => p.x);
  const cyKeyframes = points.map((p) => p.y);

  return (
    <g>
      {/* Base line: path (bent) or straight */}
      <motion.path
        d={d}
        fill="none"
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

      {/* Data-flow particles: travel along path */}
      {isActive &&
        Array.from({ length: FLOW_PARTICLE_COUNT }).map((_, i) => (
          <motion.circle
            key={i}
            r={4}
            fill={color}
            filter="url(#flow-glow)"
            initial={{ cx: x1, cy: y1, opacity: 0 }}
            animate={{
              cx: cxKeyframes,
              cy: cyKeyframes,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              cx: {
                duration: flowDuration,
                repeat: Infinity,
                ease: "linear",
                times,
                delay: i * (flowDuration / FLOW_PARTICLE_COUNT),
              },
              cy: {
                duration: flowDuration,
                repeat: Infinity,
                ease: "linear",
                times,
                delay: i * (flowDuration / FLOW_PARTICLE_COUNT),
              },
              opacity: {
                duration: flowDuration,
                repeat: Infinity,
                times: [0, 0.1, 0.9, 1],
                delay: i * (flowDuration / FLOW_PARTICLE_COUNT),
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
