"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState } from "react";

interface RadarChartProps {
  data: { label: string; score: number; maxScore?: number }[];
  size?: number;
  onSelect?: (index: number) => void;
}

function splitLabel(label: string): [string, string] {
  if (label.length <= 15) return [label, ""];
  const words = label.split(" ");
  let line1 = "";
  let i = 0;
  while (i < words.length && (line1 ? line1 + " " + words[i] : words[i]).length <= 15) {
    line1 = line1 ? line1 + " " + words[i] : words[i];
    i++;
  }
  return [line1 || words[0], words.slice(i).join(" ")];
}

export default function RadarChart({ data, size = 300, onSelect }: RadarChartProps) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");

  const center = size / 2;
  const radius = size / 2 - 26;
  const angleStep = (Math.PI * 2) / data.length;
  const badgeR = 11;
  const margin = badgeR + 8;

  useEffect(() => {
    setIsAnimated(true);
  }, []);

  const getPoint = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const polygonPoints = data
    .map((item, i) => {
      const pt = getPoint(isAnimated ? item.score : 0, i);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  const gridLevels = [20, 40, 60, 80, 100];
  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="w-full">
      <svg
        viewBox={`${-margin} ${-margin} ${size + margin * 2} ${size + margin * 2}`}
        width="100%"
        height="auto"
        className="block w-full h-auto"
      >
        <defs>
          <linearGradient id={`grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#df475b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#e56e7e" stopOpacity="0.3" />
          </linearGradient>
          <filter id={`glow-${uid}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid rings */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 100) * radius}
            fill="none"
            stroke="rgba(0,0,0,0.09)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="rgba(0,0,0,0.09)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <motion.polygon
          points={polygonPoints}
          fill={`url(#grad-${uid})`}
          stroke="#df475b"
          strokeWidth="2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          filter={`url(#glow-${uid})`}
        />

        {/* Data point dots */}
        {data.map((item, i) => {
          const pt = getPoint(item.score, i);
          return (
            <motion.circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === i ? 6 : 4}
              fill="#df475b"
              stroke="white"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: isAnimated ? 1 : 0 }}
              transition={{ delay: 0.8 + i * 0.08, duration: 0.3 }}
            />
          );
        })}

        {/* Center tooltip — appears on badge hover */}
        <AnimatePresence mode="wait">
          {hoveredItem && (
            <motion.g
              key={hoveredIndex}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <rect
                x={center - 72}
                y={center - 26}
                width={144}
                height={52}
                rx={10}
                fill="white"
                fillOpacity={0.97}
                stroke="rgba(0,0,0,0.07)"
                strokeWidth="1"
              />
              {(() => {
                const [line1, line2] = splitLabel(hoveredItem.label);
                const twoLines = line2.length > 0;
                return (
                  <>
                    <text
                      x={center}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="600"
                      fill="#444"
                    >
                      {twoLines ? (
                        <>
                          <tspan x={center} y={center - 12}>{line1}</tspan>
                          <tspan x={center} dy="12">{line2}</tspan>
                        </>
                      ) : (
                        <tspan x={center} y={center - 7}>{line1}</tspan>
                      )}
                    </text>
                    <text
                      x={center}
                      y={twoLines ? center + 16 : center + 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="14"
                      fontWeight="700"
                      fill="#df475b"
                    >
                      {hoveredItem.score}%
                    </text>
                  </>
                );
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Subtle "hover a number" hint when nothing is hovered */}
        <AnimatePresence>
          {!hoveredItem && isAnimated && (
            <motion.text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8"
              fill="rgba(0,0,0,0.2)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.5, duration: 0.4 }}
              style={{ pointerEvents: "none" }}
            >
              hover 1–{data.length}
            </motion.text>
          )}
        </AnimatePresence>

        {/* Numbered badges at axis tips */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const bx = center + (radius + badgeR + 5) * Math.cos(angle);
          const by = center + (radius + badgeR + 5) * Math.sin(angle);
          const isHovered = hoveredIndex === i;
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: isHovered ? 1.3 : 1 }}
              transition={{
                opacity: { delay: 1 + i * 0.05, duration: 0.25 },
                scale: { duration: 0.18, ease: "easeOut" },
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSelect?.(i)}
              style={{ cursor: onSelect ? "pointer" : "default" }}
            >
              <circle
                cx={bx}
                cy={by}
                r={badgeR}
                fill={isHovered ? "#df475b" : "white"}
                stroke={isHovered ? "#df475b" : "rgba(0,0,0,0.12)"}
                strokeWidth="1"
              />
              <text
                x={bx}
                y={by}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontWeight="700"
                fill={isHovered ? "white" : "#aaa"}
                style={{ pointerEvents: "none" }}
              >
                {i + 1}
              </text>
            </motion.g>
          );
        })}
      </svg>
      {/* Legend list */}
      <div className="mt-12 space-y-6">
        {data.map((item, i) => (
          <motion.div
            key={i}
            className={`flex items-center gap-8 rounded-6 px-8 py-4 transition-colors ${
              hoveredIndex === i ? "bg-black-alpha-4" : ""
            }`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 + i * 0.04 }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => onSelect?.(i)}
            style={{ cursor: onSelect ? "pointer" : "default" }}
          >
            {/* Number badge */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full transition-colors"
              style={{
                width: 18,
                height: 18,
                fontSize: 9,
                fontWeight: 700,
                backgroundColor: hoveredIndex === i ? "#df475b" : "rgba(0,0,0,0.06)",
                color: hoveredIndex === i ? "white" : "rgba(0,0,0,0.35)",
              }}
            >
              {i + 1}
            </div>

            {/* Label */}
            <span className="flex-1 text-xs text-black-alpha-64 leading-snug min-w-0">
              {item.label}
            </span>

            {/* Mini progress bar + score */}
            <div className="flex items-center gap-8 flex-shrink-0">
              <div className="w-40 h-3 rounded-full overflow-hidden bg-black-alpha-8">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: "#df475b", width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ delay: 1.3 + i * 0.04, duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: "#df475b", width: 28, textAlign: "right" }}
              >
                {item.score}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
