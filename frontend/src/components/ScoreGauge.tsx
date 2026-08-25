// Tick-mark radial gauge, matching the dial reference: individual ticks
// filled coral proportional to score, unfilled ticks in `line` gray.
export default function ScoreGauge({
  score,
  max = 100,
  size = 220,
}: {
  score: number;
  max?: number;
  size?: number;
}) {
  const total = 48;
  const active = Math.round((score / max) * total);
  const cx = size / 2;
  const cy = size / 2 + 8;
  const rInner = size * 0.355;
  const rOuter = size * 0.436;
  const startDeg = 180;
  const endDeg = 360;

  const ticks = Array.from({ length: total }, (_, i) => {
    const t = i / (total - 1);
    const deg = startDeg + t * (endDeg - startDeg);
    const rad = (deg * Math.PI) / 180;
    const x1 = cx + rInner * Math.cos(rad);
    const y1 = cy + rInner * Math.sin(rad);
    const x2 = cx + rOuter * Math.cos(rad);
    const y2 = cy + rOuter * Math.sin(rad);
    return { x1, y1, x2, y2, filled: i < active };
  });

  return (
    <div className="relative flex justify-center" style={{ width: size, height: size * 0.6 }}>
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            strokeWidth={4}
            strokeLinecap="round"
            stroke={t.filled ? "#E24B4A" : "#E5E7EB"}
          />
        ))}
      </svg>
      <div className="absolute bottom-1 text-center">
        <div className="text-3xl font-semibold text-ink leading-none">{score}</div>
      </div>
    </div>
  );
}
