// Semicircle gauge with a red→amber→green sweep. The arc up to `score` is
// drawn from a gradient stroke; the remainder shows a faint track. Sweeps in
// on mount so a fresh report feels alive rather than static.
export default function GradientGauge({
  score,
  max = 100,
  size = 240,
}: {
  score: number;
  max?: number;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(1, max > 0 ? score / max : 0));

  // Geometry: viewBox 0..size wide, half-height plus a little padding.
  const w = size;
  const h = size * 0.62;
  const stroke = 18;
  const pad = stroke / 2 + 4;
  const cx = w / 2;
  const cy = h - pad;
  const r = w / 2 - pad;

  // Semicircle arc: 180° → 360° in SVG coords.
  const arcLen = Math.PI * r;
  const dashTarget = arcLen * (1 - pct); // stroke-dashoffset target
  const dashFull = arcLen;

  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;
  const arcPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  // Sweep endpoint (for the little dot at the end of the filled arc).
  const angle = Math.PI - Math.PI * pct; // radians, 0..π mapped to π..0
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy - r * Math.sin(angle);

  return (
    <div className="relative flex justify-center" style={{ width: w, height: h + 8 }}>
      <svg width={w} height={h + 8} viewBox={`0 0 ${w} ${h + 8}`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E24B4A" />
            <stop offset="50%" stopColor="#F5A524" />
            <stop offset="100%" stopColor="#639922" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={arcPath}
          fill="none"
          stroke="#EEF0F2"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Filled arc, animated in via CSS custom props on mount */}
        <path
          d={arcPath}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLen}
          className="gauge-sweep"
          style={{
            ["--dash-full" as string]: `${dashFull}`,
            ["--dash-target" as string]: `${dashTarget}`,
          } as React.CSSProperties}
        />

        {/* End cap dot */}
        {pct > 0 && (
          <circle cx={dotX} cy={dotY} r={stroke / 2 + 2} fill="#FFFFFF" stroke="url(#gauge-grad)" strokeWidth={3} />
        )}
      </svg>

      <div className="absolute bottom-1 text-center">
        <div className="text-4xl font-semibold text-ink leading-none tabular-nums">{score}</div>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-muted">of {max}</div>
      </div>
    </div>
  );
}
