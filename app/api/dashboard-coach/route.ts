import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const DASHBOARD_CONTEXT = `
You are an operations and learning design consultant reviewing session delivery data for cc.abilitie.com, a platform that runs AI-simulation business case sessions for corporate leadership programmes.

CLIENT & PROGRAMME:
- Client: BectonDickinson (BD) EMEA LEAP leadership programme (plus a few other programmes)
- Platform: Arrow (AI simulation business cases)
- Data snapshot: 28 sessions across 10 case types, delivered Apr–May 2026
- Faculty: Nick White, Francois-Alexandre Leonard (FA), Tamara Nolte, Paul Kirkitelos, Valerie Scheer, Matt Rubins, Sara Amighi
- Producers: Ali, Bruna, Ignacio, Hanin, Trazana, Alexis, Eddie

PACING SUMMARY:
- 8 of 28 sessions (29%) ran over scheduled time
- Average overrun when it happened: +7 minutes
- 27 of 28 sessions had a late intro (intro ran longer than the runsheet planned)
- Only 1 incomplete session (fewer chapters delivered than planned)

OVERRUN BY CASE:
- Enabling Peak Performance (EPP): 2/2 sessions overran, avg +4m — 100% overrun rate
- Navigating Critical Conversations (NCC): 2/4 sessions overran, avg +7m — highest overrun when overrunning
- Influencing Without Authority (IWA): 2/6 overran, avg +1m — mostly on track
- Kickoff: Shelf Awareness: 1/6 overran, avg −5m — consistently under
- Managing Profitability (MP): 0/5 overran, avg −5m — never overruns, runs about 5m short
- Creating Strategic Alignment: 0/1, avg −27m — ended dramatically early (possible session issue)

SURVEY SCORES (Arrow survey, 1–5 scale, 10 sessions with data):
- IWA avg: Q1 Content Value=4.51, Q2 Learning=4.29
- MP avg: Q1 Content Value=4.67, Q2 Learning=4.49
- Highest Q1 content value: MP sessions overall
- Note: Q4 facilitator scores are excluded from this analysis — the facilitator/learning gap is a known constant in this format and not a useful signal here

FACULTY NOTES:
- Nick White (MP): 0/2 overruns, avg −8m — runs MP efficiently and scores top Q4
- Paul Kirkitelos (EPP): 2/2 overruns — EPP case may be under-timed or Paul's EPP facilitation needs review
- Francois-Alexandre Leonard (IWA + MP): mixed results — IWA on time, MP solid

NOTABLE PATTERNS:
- Late intros are nearly universal (27/28) — likely a setup or participant readiness issue rather than content pacing
- MP case is consistently short while EPP consistently overruns — suggests the cases themselves may need timing recalibration
- Creating Strategic Alignment ended 27 minutes early — possible session or data issue worth investigating
`.trim()

export async function POST(req: NextRequest) {
  const { type, question } = await req.json() as { type: 'suggestions' | 'question'; question?: string }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY is not set. Add it to .env.local.', { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  const userMessage = type === 'suggestions'
    ? `Based on the dashboard data, give feedback in exactly two parts.

Part 1 — 3 things the team should be AWARE OF as they look at this data. These are the most important patterns, risks, or findings to flag.

AWARE: [title, 5 words or fewer]
DETAIL: [1–2 sentences with specifics from the data]
---

Part 2 — 3 PRODUCT improvements: concrete changes to the Arrow case content or runsheet that the product team could actually make. Think about what to cut from the intro, how to adjust chapter timing, what to restructure in the session flow, or where the planned time doesn't match reality. Do NOT compare facilitator scores to learning scores — that gap is expected and not a product problem. Focus only on what the product itself can change.

IMPROVE: [title, 5 words or fewer]
DETAIL: [1–2 sentences describing the specific change]
---

Output: three AWARE/DETAIL/--- blocks, then three IMPROVE/DETAIL/--- blocks. Nothing else.`
    : `The programme team is asking a question about the dashboard data. Answer specifically using the data. Be direct.

Question: ${question}`

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 700,
    system: DASHBOARD_CONTEXT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
