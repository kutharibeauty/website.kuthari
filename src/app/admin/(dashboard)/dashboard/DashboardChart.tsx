'use client'

interface Props {
  data: { label: string; value: number }[]
}

function buildPath(values: number[]): { line: string; area: string } {
  const n = values.length
  if (n < 2) return { line: '', area: '' }

  const max = Math.max(...values, 1)
  const xs = values.map((_, i) => (i / (n - 1)) * 100)
  const ys = values.map((v) => 90 - (v / max) * 72) // y: 18..90, inverted

  let line = `M${xs[0]},${ys[0]}`
  for (let i = 1; i < n; i++) {
    const cpx = (xs[i - 1] + xs[i]) / 2
    line += ` C${cpx},${ys[i - 1]} ${cpx},${ys[i]} ${xs[i]},${ys[i]}`
  }
  const area = `${line} V100 H0 Z`
  return { line, area }
}

export default function DashboardChart({ data }: Props) {
  const { line, area } = buildPath(data.map((d) => d.value))
  const labels = data.map((d) => d.label)

  return (
    <div className="space-y-2">
      <div className="relative h-52 w-full">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="admin-chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3d2b1f" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3d2b1f" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0" y1={y} x2="100" y2={y}
              stroke="#d2c4bc"
              strokeWidth="0.4"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Area fill */}
          {area && (
            <path d={area} fill="url(#admin-chart-grad)" />
          )}

          {/* Animated line */}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="#3d2b1f"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="animate-chart"
            />
          )}

          {/* Data point dots */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const max = Math.max(...data.map((dd) => dd.value), 1)
            const y = 90 - (d.value / max) * 72
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.2"
                fill="#3d2b1f"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>
      </div>

      {/* Day labels */}
      <div className="flex justify-between px-1">
        {labels.map((lbl) => (
          <span key={lbl} className="font-label-sm text-label-sm text-on-surface-variant">
            {lbl}
          </span>
        ))}
      </div>
    </div>
  )
}
