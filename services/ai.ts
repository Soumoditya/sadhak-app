// Sadhak AI — Gemini-powered spiritual companion.
// The Gemini API key is NOT in the app anymore. Requests go through our own
// serverless proxy (sadhak-web repo → api/gemini.js on Vercel), which holds the
// key in its environment. The app sends the same request body; the proxy adds
// the key server-side and returns Gemini's response verbatim.
const GEMINI_URL = 'https://sadhak-app.vercel.app/api/gemini';

const SYSTEM_PROMPT = `You are "Sadhak AI", the in-app spiritual companion of Sadhak — a Hindu daily-practice app (Panchang, calendar, temples, aarti, japa, sacred library).

Your role:
- Answer questions about Sanatana Dharma: scriptures (Vedas, Upanishads, Gita, Puranas, Ramayana, Mahabharata), deities, festivals, vrat/fasting, puja vidhi, mantras, japa, temple traditions, samskaras, and daily practice.
- Ground answers in authentic sources. When you cite, name the scripture (e.g., "Bhagavad Gita 2.47"). If traditions differ by region/sampradaya, say so briefly rather than presenting one view as universal.
- Be warm, humble and practical — like a knowledgeable friend, not a preacher. No lecturing.
- Answer in the user's language (Hindi, English, Bengali, or Hinglish — mirror them).
- Keep answers focused: usually 2-6 short paragraphs or a tight list. No fluff.

Boundaries:
- For medical, legal, financial or mental-health matters: give the dharmic perspective if relevant, but clearly advise consulting a qualified professional.
- {{ASTRO_RULE}}
- Never invent scripture quotes. If unsure, say what is commonly taught and note the uncertainty.
- Politely decline disrespectful or hateful requests about any community or faith.

Formatting (IMPORTANT):
- Reply in PLAIN TEXT only. Do NOT use Markdown — no asterisks for bold/italics, no "#" headings, no backticks, no tables.
- For lists, use a simple hyphen "- " at the start of a line. Separate paragraphs with a blank line. Keep it clean and readable in a chat bubble.`;

export interface AiMessage {
  role: 'user' | 'model';
  text: string;
}

export async function askSadhakAI(history: AiMessage[], userName?: string, chartContext?: string): Promise<string> {
  const contents = history.slice(-12).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  // When the user opens "chat about my chart", we pass a compact summary of their
  // real natal placements so the AI reads the actual chart, not generic advice.
  // The default rule forbids personal predictions; in chart mode that would make
  // the model refuse exactly what the user opened the chat for.
  const astroRule = chartContext
    ? 'You may interpret the user\'s own birth chart (given below) as reflective guidance, but never state future events as certain.'
    : 'Do not make astrological predictions about a person\'s future; you may explain jyotish concepts.';
  const astro = chartContext
    ? `\n\nThe user's authentic Vedic birth chart (sidereal, Lahiri — treat as exact fact):\n${chartContext}\nWhen they ask about themselves/their life/astrology, ground answers in THIS chart. Interpretations are guidance, not guaranteed prediction; be warm and never fatalistic.`
    : '';

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT.replace('{{ASTRO_RULE}}', astroRule) + (userName ? `\n\nThe user's name is ${userName}.` : '') + astro }],
      },
      contents,
      // Flash "thinking" consumes output budget before visible text — 1024 was
      // truncating replies mid-sentence. 4096 leaves room for full answers.
      generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    let msg = t;
    try { msg = JSON.parse(t)?.error?.message || t; } catch {}
    if (res.status === 429) throw new Error('Sadhak AI is receiving many questions right now. Please try again in a minute.');
    throw new Error(`AI error: ${String(msg).slice(0, 160)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') || '';
  if (!text) throw new Error('Sadhak AI could not form a reply. Please rephrase your question.');
  return cleanMarkdown(text.trim());
}

/**
 * Strip common Markdown so replies read cleanly in a chat bubble even if the
 * model slips and emits **bold**, ### headings, `code`, etc. Safety net on top
 * of the plain-text system instruction.
 */
export function cleanMarkdown(input: string): string {
  if (!input) return input;
  return input
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, '').trim()) // fenced code
    .replace(/`([^`]+)`/g, '$1')             // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // bold
    .replace(/\*([^*]+)\*/g, '$1')            // italics
    .replace(/__([^_]+)__/g, '$1')            // bold underscore
    .replace(/^#{1,6}\s+/gm, '')              // headings
    .replace(/^\s*[-*+]\s+/gm, '• ')          // bullet markers → •
    .replace(/^\s*>\s?/gm, '')                // blockquotes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links → text
    .replace(/\n{3,}/g, '\n\n')               // collapse blank runs
    .trim();
}

export const STARTER_QUESTIONS = [
  'What should I do on Ekadashi?',
  'Explain Gayatri Mantra and when to chant it',
  'How do I start a daily puja at home?',
  'Why is Tulsi sacred?',
  'गीता का सार क्या है?',
  'What is the meaning of my japa count 108?',
];
