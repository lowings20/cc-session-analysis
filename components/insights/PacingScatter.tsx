'use client'

import { useState } from 'react'

export interface PacingPoint {
  sessionId: string
  overrunMin: number
  score: number
  faculty: string
  caseShort: string
  date: string
  responses: number
  color: string
}

interface Props {
  points: PacingPoint[]
  scoreLabel: string
  width?: number
  height?: number
}

const M = { top: 24, right: 24, bottom: 48, left: 48 }

function niceRange(values: number[], pad = 0.15): [number, number] {
  const mn = Math.min(...values)
  const mx = Math.max(...values)
  const span = mx - mn || 1
  return [mn - span * pad, mx + span * pad]
}

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min
  const rawStep = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const step = Math.ceil(rawStep / mag) * mag || 0.5
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let t = start; t <= max + 1e-9; t = Math.round((t + step) * 1000) / 1000) ticks.push(t)
  return ticks
}

export default function PacingScatter({ points, scoreLabel, width = 520, height = 300 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (!points.length) return <p className="text-xs text-[#94a3b8]">No data.</p>

  const plotW = width - M.left - M.right
  const plotH = height - M.top - M.bottom

  const xs = points.map(p => p.overrunMin)
  const ys = points.map(p => p.score)
  const [xMin, xMax] = niceRange(xs)
  const [yMin, yMax] = niceRange(ys)

  const sx = (v: number) => ((v - xMin) / (xMax - xMin)) * plotW
  const sy = (v: number) => plotH - ((v - yMin) / (yMax - yMin)) * plotH

  const xTicks = niceTicks(xMin, xMax)
  const yTicks = niceTicks(yMin, yMax, 4)

  const zeroX = sx(0)

  return (
    <div className="relative overflow-x-auto">
      <svg width={width} height={height} style={{ display: 'block', maxWidth: '100%' }}>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* Grid */}
          {xTicks.map(t => (
            <line key={`gx-${t}`} x1={sx(t)} x2={sx(t)} y1={0} y2={plotH} stroke="#334155" strokeWidth={1} />
          ))}
          {yTicks.map(t => (
            <line key={`gy-${t}`} x1={0} x2={plotW} y1={sy(t)} y2={sy(t)} stroke="#334155" strokeWidth={1} />
          ))}

          {/* Zero overrun line */}
          {zeroX >= 0 && zeroX <= plotW && (
            <line x1={zeroX} x2={zeroX} y1={0} y2={plotH}
              stroke="#475569" strokeWidth={1.5} strokeDasharray="4 3" />
          )}

          {/* Points — sized by response count */}
          {points.map((p, i) => {
            const cx = sx(p.overrunMin)
            const cy = sy(p.score)
            const r = Math.max(4, Math.min(12, 3 + Math.sqrt(p.responses) * 1.5))
            const isHov = hovered === i
            return (
              <circle
                key={p.sessionId}
                cx={cx} cy={cy} r={isHov ? r + 2 : r}
                fill={p.color}
                fillOpacity={isHov ? 1 : 0.75}
                stroke={isHov ? '#e2e8f0' : 'none'}
                strokeWidth={1.5}
                style={{ cursor: 'pointer', transition: 'r 0.1s' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}

          {/* Tooltip */}
          {hovered !== null && (() => {
            const p = points[hovered]
            const cx = sx(p.overrunMin)
            const cy = sy(p.score)
            const tipW = 172, tipH = 62
            const tx = Math.min(Math.max(cx - tipW / 2, 4), plotW - tipW - 4)
            const ty = cy - tipH - 12 < 0 ? cy + 12 : cy - tipH - 12
            return (
              <g>
                <rect x={tx} y={ty} width={tipW} height={tipH} rx={4}
                  fill="#1e293b" stroke="#475569" strokeWidth={1} />
                <text x={tx + 8} y={ty + 15} fontSize={11} fill="#e2e8f0" fontWeight="600">
                  {p.faculty}
                </text>
                <text x={tx + 8} y={ty + 28} fontSize={10} fill="#94a3b8">
                  {p.caseShort} · {p.date.replace(', 2026', '')}
                </text>
                <text x={tx + 8} y={ty + 41} fontSize={10} fill="#94a3b8">
                  {p.overrunMin > 0 ? '+' : ''}{p.overrunMin}m overrun · {scoreLabel}: {p.score.toFixed(2)}
                </text>
                <text x={tx + 8} y={ty + 54} fontSize={9} fill="#475569">
                  n={p.responses} responses
                </text>
              </g>
            )
          })()}

          {/* X axis */}
          {xTicks.map(t => (
            <g key={`xt-${t}`} transform={`translate(${sx(t)},${plotH})`}>
              <line y2={4} stroke="#475569" />
              <text y={16} fontSize={10} fill="#94a3b8" textAnchor="middle">
                {t > 0 ? `+${t}` : t}m
              </text>
            </g>
          ))}

          {/* Y axis */}
          {yTicks.map(t => (
            <g key={`yt-${t}`} transform={`translate(0,${sy(t)})`}>
              <line x2={-4} stroke="#475569" />
              <text x={-8} fontSize={10} fill="#94a3b8" textAnchor="end" dominantBaseline="middle">
                {t.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={plotW / 2} y={plotH + 42} fontSize={11} fill="#94a3b8" textAnchor="middle">
            session overrun (minutes)
          </text>
          <text
            x={-plotH / 2} y={-38}
            fontSize={11} fill="#94a3b8" textAnchor="middle"
            transform="rotate(-90)"
          >
            {scoreLabel}
          </text>

          <rect x={0} y={0} width={plotW} height={plotH} fill="none" stroke="#334155" strokeWidth={1} />
        </g>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[#94a3b8]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#818cf8' }} />
          IWA
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: '#34d399' }} />
          MP
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full border border-[#475569]" />
          <span className="text-[#475569]">Circle size = response count</span>
        </div>
      </div>
    </div>
  )
}
