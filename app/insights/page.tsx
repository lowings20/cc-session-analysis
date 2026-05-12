import { ArrowLeft } from 'lucide-react'
import { getDashboard } from '@/lib/data'
import { computeSessionPoints, computeChapterVariance } from '@/lib/insights'
import ScatterPlot, { type ScatterPoint } from '@/components/insights/ScatterPlot'
import ChapterVariance from '@/components/insights/ChapterVariance'
import IncompleteSessions from '@/components/insights/IncompleteSessions'

function Section({ title, subtitle, children }: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#e2e8f0]">{title}</h2>
        <p className="text-xs text-[#94a3b8] mt-0.5">{subtitle}</p>
      </div>
      <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-5">
        {children}
      </div>
    </section>
  )
}

// Summary stat for the regression hint
function regressionHint(points: Array<{ x: number; y: number }>): string | null {
  if (points.length < 4) return null
  const n = points.length
  const mx = points.reduce((s, p) => s + p.x, 0) / n
  const my = points.reduce((s, p) => s + p.y, 0) / n
  const num = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0)
  const den = points.reduce((s, p) => s + (p.x - mx) ** 2, 0)
  if (den === 0) return null
  const slope = num / den
  const r2Raw = (num ** 2) / (den * points.reduce((s, p) => s + (p.y - my) ** 2, 0))
  const r2 = isNaN(r2Raw) ? 0 : r2Raw
  return `slope ≈ ${slope.toFixed(1)}× (R² = ${r2.toFixed(2)})`
}

export default async function InsightsPage() {
  const dashboard = await getDashboard()
  const pts = computeSessionPoints(dashboard)
  const chapterSlots = computeChapterVariance(dashboard)

  const totalSessions = pts.length
  const overranCount = pts.filter(p => p.overran).length
  const incompleteCount = pts.filter(p => p.incomplete).length

  // Scatter 1: intro delta vs end delta
  const introScatterPts: ScatterPoint[] = pts
    .filter(p => p.introDeltaMin !== null && p.endDeltaMin !== null)
    .map(p => ({
      x: p.introDeltaMin!,
      y: p.endDeltaMin!,
      label: p.cohort,
      sub: p.caseTitle,
      color: p.endDeltaMin! > 0 ? '#f87171' : p.endDeltaMin! < 0 ? '#4ade80' : '#94a3b8',
    }))

  const introHint = regressionHint(introScatterPts.map(p => ({ x: p.x, y: p.y })))

  // Scatter 2: session overrun vs debrief cut
  const debriefScatterPts: ScatterPoint[] = pts
    .filter(p => p.endDeltaMin !== null && p.debriefExpectedMin > 0)
    .map(p => ({
      x: p.endDeltaMin!,
      y: p.debriefCutMin,
      label: p.cohort,
      sub: p.caseTitle,
      color: p.debriefCutMin > 2 ? '#fb923c' : p.debriefCutMin < -2 ? '#60a5fa' : '#94a3b8',
    }))

  const debriefHint = regressionHint(debriefScatterPts.map(p => ({ x: p.x, y: p.y })))

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-[#334155] px-6 py-4">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors mb-3"
        >
          <ArrowLeft size={12} />
          Back to dashboard
        </a>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#e2e8f0]">Insights</h1>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              {totalSessions} sessions · {overranCount} overran · {incompleteCount} incomplete
            </p>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-10 max-w-5xl">

        {/* 1. Intro as leading indicator */}
        <Section
          title="1 · Intro as a leading indicator"
          subtitle="Does intro overrun predict final overrun? Each dot is one session. Red = overran, green = ended under."
        >
          <ScatterPlot
            points={introScatterPts}
            xLabel="Intro delta"
            yLabel="Session overrun"
          />
          {introHint && (
            <p className="mt-3 text-[11px] text-[#94a3b8]">
              Linear fit: {introHint}. An R² above 0.5 means intro length is a reliable leading indicator.
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Sessions with late intro that overran', value: introScatterPts.filter(p => p.x > 0 && p.y > 0).length },
              { label: 'Sessions with late intro that still ended on time', value: introScatterPts.filter(p => p.x > 0 && p.y <= 0).length },
              { label: 'Sessions with on-time intro that overran', value: introScatterPts.filter(p => p.x <= 0 && p.y > 0).length },
            ].map(s => (
              <div key={s.label} className="bg-[#0f172a] rounded p-3">
                <div className="text-xl font-bold text-[#e2e8f0]">{s.value}</div>
                <div className="text-[10px] text-[#94a3b8] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 2. Debrief compression */}
        <Section
          title="2 · Debrief compression"
          subtitle="When sessions run over, do debriefs get squeezed? x = session overrun. y = debrief time cut (positive = less debrief than planned). Orange = debriefs got cut."
        >
          <ScatterPlot
            points={debriefScatterPts}
            xLabel="Session overrun"
            yLabel="Debrief cut"
          />
          {debriefHint && (
            <p className="mt-3 text-[11px] text-[#94a3b8]">
              Linear fit: {debriefHint}. A positive slope means facilitators tend to squeeze debriefs when running long.
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              {
                label: 'Sessions that overran AND cut debriefs',
                value: debriefScatterPts.filter(p => p.x > 0 && p.y > 2).length,
              },
              {
                label: 'Sessions that overran but kept full debriefs',
                value: debriefScatterPts.filter(p => p.x > 0 && p.y <= 2).length,
              },
              {
                label: 'Avg debrief cut when overrunning',
                value: (() => {
                  const overran = debriefScatterPts.filter(p => p.x > 0)
                  if (!overran.length) return '—'
                  const avg = overran.reduce((s, p) => s + p.y, 0) / overran.length
                  return `${avg > 0 ? '+' : ''}${Math.round(avg)}m`
                })(),
              },
            ].map(s => (
              <div key={s.label} className="bg-[#0f172a] rounded p-3">
                <div className="text-xl font-bold text-[#e2e8f0]">{s.value}</div>
                <div className="text-[10px] text-[#94a3b8] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 3. Chapter variance */}
        <Section
          title="3 · Chapter duration variance by case"
          subtitle="How consistent are chapter runtimes across sessions? Wider bars = more variable. Yellow line = runsheet plan."
        >
          <ChapterVariance slots={chapterSlots} />
        </Section>

        {/* 4. Incomplete sessions */}
        <Section
          title="4 · Incomplete sessions"
          subtitle="Sessions where the actual number of chapters completed was fewer than the runsheet expected."
        >
          <IncompleteSessions points={pts} />
        </Section>

      </main>
    </div>
  )
}
