import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const NICK_CONTEXT = `
You are an expert facilitation coach giving honest, specific coaching to Nick White.

Nick is a business school facilitator running AI-simulation case sessions for BectonDickinson's EMEA LEAP leadership programme on the Arrow platform.

SESSION DATA (5 sessions total):
- Kickoff, Apr 1, 2026 — BD EMEA both cohorts together, 30 min
- IWA (Influencing Without Authority), Apr 8 — BD EMEA Cohort 1, 65 min scheduled
- IWA, Apr 9 — BD EMEA Cohort 2, 65 min scheduled
- MP (Managing Profitability), Apr 29 — BD EMEA Cohort 1, 65 min scheduled
- MP, Apr 30 — BD EMEA Cohort 2, 65 min scheduled

TALK TIME (word share from Zoom transcripts):
- Kickoff Apr 1 (30 min): Nick 82%, Client host Caroline 10%, Producer 7%, Participants 1%
- MP Apr 29 (55 min actual): Nick 89%, Participants 9%, Producer 2%
- MP Apr 30 (63 min actual — overran): Nick 85%, Producer Trazana 7%, Participants 8%

SURVEY SCORES (Arrow survey, scale 1–5 — Q4 facilitator scores excluded, not a useful signal here):
- IWA Apr 8: Q1 Content Value=4.38, Q2 Learning=4.25 (n=8)
- IWA Apr 9: Q1 Content Value=4.67, Q2 Learning=4.56 (n=9)
- MP Apr 29: Q1 Content Value=4.80, Q2 Learning=4.40 (n=5)
- MP Apr 30: Q1 Content Value=4.71, Q2 Learning=4.67 (n=7)

PACING:
- MP Apr 30 overran by ~8 minutes
- IWA Apr 8 intro ran 5 minutes late
- MP Apr 29 ran roughly on time

NOTABLE FACILITATION MOVES (from transcripts):
- Opened MP sessions with "Why do you think we're learning about finance in the age of AI?" — led with provocation before content
- Redirected finance expert Mark Norman from participant to "coach": "Mark, I want to reframe your role here today. You're not a participant, you're a coach."
- Debriefed via AI character: "What did Zena tell you that surprised you?"
- Stated philosophy: "I am not here to teach, I am here to facilitate. Facilitation is about planting seeds."

PARTICIPANT OPEN-TEXT FEEDBACK:
IWA: "Great balance of theory and practice", "The case studies", "Interactive, relevant", "Influencing without authority is key for my role", "I love everything about it", "Understanding the two types of power"
MP: "The simulator helps understand impact of variables", "The Zena discussion helps fine-tune our position", "Simple case study with clear scenarios helps understand finance mechanics", "Nice to work through the case challenges"
`.trim()

export async function POST(req: NextRequest) {
  const { type, question } = await req.json() as { type: 'suggestions' | 'question'; question?: string }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY is not set. Add it to .env.local.', { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  const userMessage = type === 'suggestions'
    ? `Give Nick White feedback on his facilitation in exactly two parts.

Part 1 — 3 things he does OUTSTANDINGLY well. Be specific and grounded in the data.

STRONG: [title, 5 words or fewer]
DETAIL: [1–2 sentences referencing specific data — talk time %, scores, participant quotes, or facilitation moves]
---

Part 2 — 3 things he should CONSIDER working on. Be honest and direct; do not soften or hedge. Do NOT flag that facilitator scores are higher than learning scores — that gap is a known constant in this format and is not meaningful feedback for Nick.

CONSIDER: [title, 5 words or fewer]
DETAIL: [1–2 sentences referencing specific data]
---

Output: three STRONG/DETAIL/--- blocks, then three CONSIDER/DETAIL/--- blocks. Nothing else.`
    : `Nick or his programme manager is asking a coaching question. Answer specifically using his session data. Be direct.

Question: ${question}`

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 700,
    system: NICK_CONTEXT,
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
