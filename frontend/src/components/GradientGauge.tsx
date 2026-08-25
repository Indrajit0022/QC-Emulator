// Semicircle gauge with a red→amber→green sweep. The arc up to `score` is
// drawn from a gradient stroke; the remainder shows a faint track. Sweeps in
// on mount so a fresh report feels alive rather than static.
export default function GradientGauge({
  score,
  max = 100,
  size = 200,
  dark = false,
}: {
  score: number;
  max?: number;
  size?: number;
  dark?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, max > 0 ? score / max : 0));

  const w = size;
  const h = size * 0.62;
  const stroke = 16;
  const pad = stroke / 2 + 4;
  const cx = w / 2;
  const cy = h - pad;
  const r = w / 2 - pad;

  const arcLen = Math.PI * r;
  const dashTarget = arcLen * (1 - pct);
  const dashFull = arcLen;

  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;
  const arcPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  const angle = Math.PI - Math.PI * pct;
  const dotX = cx + r * Math.cos(angle);
  const dotY = cy - r * Math.sin(angle);

  const trackColor = dark ? "#2D3148" : "#EEF0F2";
  const textColor = dark ? "#F0F2F8" : "#1C2331";
  const mutedColor = dark ? "#8B93A7" : "#6B7280";

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
          stroke={trackColor}
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Filled arc */}
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
          <circle
            cx={dotX} cy={dotY}
            r={stroke / 2 + 2}
            fill={dark ? "#1A1D27" : "#FFFFFF"}
            stroke="url(#gauge-grad)"
            strokeWidth={3}
          />
        )}
      </svg>

      <div className="absolute bottom-1 text-center">
        <div className="text-4xl font-semibold leading-none tabular-nums" style={{ color: textColor }}>
          {score}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: mutedColor }}>
          of {max}
        </div>
      </div>
    </div>
  );
}
