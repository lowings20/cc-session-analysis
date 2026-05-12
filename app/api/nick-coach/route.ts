import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const NICK_CONTEXT = `
You are an expert facilitation coach giving honest, specific coaching to Nick White. You have access to his session data including talk time from transcripts, simulation scores, reflection participation rates, survey scores, and participant open-text feedback. When asked what to work on, be candid and specific — reference the data. When asked about other facilitators to learn from, draw on what you know about Tam and FA from this programme's data and be specific about what Nick would actually learn.

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

SIMULATION SCORES (out of 100, team averages):
- IWA Apr 8 Ch4: avg 75, median 74, min 63, max 90 (n=8 teams)
- MP Apr 29 Ch1: avg 88, Ch2: avg 81, Ch3: avg 84 (n=7 teams each)
- MP Apr 30 Ch1: avg 74, Ch2: avg 89, Ch3: avg 75 (n=13 teams — note 2 teams failed Ch1)

REFLECTION PARTICIPATION:
- IWA Apr 8: 33% of participants completed reflections
- MP Apr 29: 11% of participants completed reflections
- MP Apr 30: 12% of participants completed reflections

NOTABLE FACILITATION MOVES (from transcripts):
- Opened MP sessions with "Why do you think we're learning about finance in the age of AI?" — led with provocation before content
- Redirected finance expert Mark Norman from participant to "coach": "Mark, I want to reframe your role here today. You're not a participant, you're a coach."
- Debriefed via AI character: "What did Zena tell you that surprised you?"
- Stated philosophy: "I am not here to teach, I am here to facilitate. Facilitation is about planting seeds."

PARTICIPANT OPEN-TEXT FEEDBACK — LIKED MOST (Q6):
IWA: "Great balance of theory and practice", "The case studies", "Interactive, relevant", "Influencing without authority is key for my role", "I love everything about it", "Understanding the two types of power"
MP: "The simulator helps understand impact of variables", "The Zena discussion helps fine-tune our position", "Simple case study with clear scenarios helps understand finance mechanics", "Nice to work through the case challenges"

PARTICIPANT FEEDBACK — HOW TO IMPROVE (Q7, verbatim):
IWA Apr 8: "I would prefer a discussion and construction in group but individual submissions", "I think these sessions need more theory", "I would suggest small teams of 4 people instead of only 2"
IWA Apr 9: "Better explanation of the positional and personal — formal and informal powers", "Make it longer :)"
MP Apr 29: "Practise by myself on the platform"
MP Apr 30: "Longer conversation with Zena", "For someone not familiar with finance terminology, the pace was slightly fast"
`.trim()

export async function POST(req: NextRequest) {
  const { type, question } = await req.json() as { type: 'suggestions' | 'question'; question?: string }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY is not set. Add it to .env.local.', { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  const userMessage = type === 'suggestions'
    ? `You are writing directly to Nick White about what makes him a distinctive facilitator. The goal is to help him feel seen and recognised — not evaluated. Be specific, warm, and grounded in the actual data.

Give Nick exactly 3–5 "things to lean into": the specific qualities, moves, and instincts that make his facilitation memorable and effective. Draw on the magic moments from transcripts, his talk time pattern, participant quotes, and any score or reflection data. Name the actual moves. Quote him where it lands. Reference specific sessions and specific participants where you can.

Format each item as:

LEAN: [the quality or move — 6 words or fewer, evocative]
DETAIL: [2–3 sentences. Be specific. Reference the actual transcript moment, the quote, the participant response, or the score. Help Nick recognise himself in this.]
---

Output only LEAN/DETAIL/--- blocks. Nothing else. No preamble, no summary.`
    : `Nick or his programme manager is asking a coaching question. Answer specifically using his session data. Be grounded in the data and constructive in tone — frame observations as opportunities and growth edges rather than deficits. When pointing to something to work on, name what to move toward, not just what to move away from. Stay specific and avoid vague encouragement.

Question: ${question}`

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 900,
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
