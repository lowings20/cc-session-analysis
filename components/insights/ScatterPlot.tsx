'use client'

import { useState } from 'react'

export interface ScatterPoint {
  x: number
  y: number
  label: string
  sub?: string
  color: string
}

interface Props {
  points: ScatterPoint[]
  xLabel: string
  yLabel: string
  width?: number
  height?: number
}

const M = { top: 24, right: 24, bottom: 48, left: 56 }

function niceRange(values: number[], pad = 0.18): [number, number] {
  const mn = Math.min(...values)
  const mx = Math.max(...values)
  const span = mx - mn || 10
  return [mn - span * pad, mx + span * pad]
}

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min
  const step = Math.ceil(span / count / 5) * 5 || 1
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let t = start; t <= max; t += step) ticks.push(t)
  return ticks
}

export default function ScatterPlot({ points, xLabel, yLabel, width = 520, height = 310 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const plotW = width - M.left - M.right
  const plotH = height - M.top - M.bottom

  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const [xMin, xMax] = niceRange(xs)
  const [yMin, yMax] = niceRange(ys)

  const sx = (v: number) => ((v - xMin) / (xMax - xMin)) * plotW
  const sy = (v: number) => plotH - ((v - yMin) / (yMax - yMin)) * plotH

  const xTicks = niceTicks(xMin, xMax)
  const yTicks = niceTicks(yMin, yMax)

  const zeroX = sx(0)
  const zeroY = sy(0)

  return (
    <div className="relative overflow-x-auto">
      <svg width={width} height={height} style={{ display: 'block', maxWidth: '100%' }}>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* Grid lines */}
          {xTicks.map(t => (
            <line
              key={`gx-${t}`}
              x1={sx(t)} x2={sx(t)} y1={0} y2={plotH}
              stroke="#334155" strokeWidth={1}
            />
          ))}
          {yTicks.map(t => (
            <line
              key={`gy-${t}`}
              x1={0} x2={plotW} y1={sy(t)} y2={sy(t)}
              stroke="#334155" strokeWidth={1}
            />
          ))}

          {/* Zero lines */}
          {zeroX >= 0 && zeroX <= plotW && (
            <line x1={zeroX} x2={zeroX} y1={0} y2={plotH}
              stroke="#475569" strokeWidth={1.5} strokeDasharray="4 3" />
          )}
          {zeroY >= 0 && zeroY <= plotH && (
            <line x1={0} x2={plotW} y1={zeroY} y2={zeroY}
              stroke="#475569" strokeWidth={1.5} strokeDasharray="4 3" />
          )}

          {/* Quadrant labels */}
          {zeroX >= 0 && zeroX <= plotW && zeroY >= 0 && zeroY <= plotH && (
            <>
              <text x={zeroX + 6} y={8} fontSize={9} fill="#475569">over + late intro</text>
              <text x={2} y={zeroY - 6} fontSize={9} fill="#475569">under</text>
              <text x={zeroX + 6} y={zeroY - 6} fontSize={9} fill="#475569">over</text>
            </>
          )}

          {/* Points */}
          {points.map((p, i) => {
            const cx = sx(p.x)
            const cy = sy(p.y)
            const isHov = hovered === i
            return (
              <circle
                key={i}
                cx={cx} cy={cy} r={isHov ? 7 : 5}
                fill={p.color}
                fillOpacity={isHov ? 1 : 0.8}
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
            const cx = sx(p.x)
            const cy = sy(p.y)
            const tipW = 160, tipH = 46
            const tx = Math.min(Math.max(cx - tipW / 2, 4), plotW - tipW - 4)
            const ty = cy - tipH - 10 < 0 ? cy + 12 : cy - tipH - 10
            return (
              <g>
                <rect x={tx} y={ty} width={tipW} height={tipH} rx={4}
                  fill="#1e293b" stroke="#475569" strokeWidth={1} />
                <text x={tx + 8} y={ty + 16} fontSize={11} fill="#e2e8f0" fontWeight="600">
                  {p.label.length > 22 ? p.label.slice(0, 21) + '…' : p.label}
                </text>
                {p.sub && (
                  <text x={tx + 8} y={ty + 30} fontSize={10} fill="#94a3b8">{p.sub}</text>
                )}
                <text x={tx + 8} y={ty + (p.sub ? 42 : 30)} fontSize={10} fill="#94a3b8">
                  {xLabel}: {p.x > 0 ? '+' : ''}{Math.round(p.x)}m · {yLabel}: {p.y > 0 ? '+' : ''}{Math.round(p.y)}m
                </text>
              </g>
            )
          })()}

          {/* X axis ticks + labels */}
          {xTicks.map(t => (
            <g key={`xt-${t}`} transform={`translate(${sx(t)},${plotH})`}>
              <line y2={4} stroke="#475569" />
              <text y={16} fontSize={10} fill="#94a3b8" textAnchor="middle">
                {t > 0 ? `+${t}` : t}m
              </text>
            </g>
          ))}

          {/* Y axis ticks + labels */}
          {yTicks.map(t => (
            <g key={`yt-${t}`} transform={`translate(0,${sy(t)})`}>
              <line x2={-4} stroke="#475569" />
              <text x={-8} fontSize={10} fill="#94a3b8" textAnchor="end" dominantBaseline="middle">
                {t > 0 ? `+${t}` : t}m
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text
            x={plotW / 2} y={plotH + 42}
            fontSize={11} fill="#94a3b8" textAnchor="middle"
          >
            {xLabel}
          </text>
          <text
            x={-plotH / 2} y={-44}
            fontSize={11} fill="#94a3b8" textAnchor="middle"
            transform="rotate(-90)"
          >
            {yLabel}
          </text>

          {/* Plot border */}
          <rect x={0} y={0} width={plotW} height={plotH}
            fill="none" stroke="#334155" strokeWidth={1} />
        </g>
      </svg>
    </div>
  )
}
