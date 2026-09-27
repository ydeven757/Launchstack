import "server-only";
import {
  getPaperclipConfig,
  dispatchCopyTask,
  pollForResult,
  parseVariations,
} from "./paperclip-client";

/**
 * AI copywriting service.
 *
 * Resolution order (first available wins):
 *   1. Paperclip — a dedicated "Copywriter" agent in a Paperclip company powers
 *      the copy. This is the primary AI engine when configured.
 *   2. Anthropic — direct Claude call with prompt caching on the system prompt.
 *   3. Fallback — deterministic template-based output so the UI still works in
 *      dev / offline with no AI key at all.
 */

export type AICopyKind =
  | "headline"
  | "subheadline"
  | "bullets"
  | "cta"
  | "advertorial"
  | "email_subject"
  | "email_body"
  | "bridge";

export type AICopyInput = {
  kind: AICopyKind;
  context: {
    niche?: string;
    audience?: string;
    offer?: string;
    tone?: "direct" | "story" | "punchy" | "professional";
    trafficSource?: string;
    pageType?: string;
    angle?: string;
  };
  // For "rewrite" mode the existing content
  existing?: string;
  // How many variations to return
  variations?: number;
};

export type AICopyResult = {
  variations: string[];
  source: "paperclip" | "anthropic" | "fallback";
  cached?: boolean;
};

const SYSTEM_PROMPT = `You are a senior direct-response copywriter who has shipped winning ads, advertorials, emails, and landing pages for affiliate offers across health, finance, MMO, survival, dating, supplements, beauty, and SaaS niches.

Your output is:
- specific, never vague
- benefit-led, never feature-led
- written for the audience's vocabulary, not industry jargon
- compliant: no medical/health claims you can't back; no income guarantees; no spammy formatting
- formatted EXACTLY as requested — no preamble, no markdown headings unless asked
- multiple distinct angles when variations are requested — not minor rewrites

Return plain text. Never wrap output in code blocks, quotes, or commentary.`;

const BUDGETS: Record<AICopyKind, { max: number; instructions: string }> = {
  headline: {
    max: 100,
    instructions: "Write ONE headline per variation. Hook + specificity. 6-14 words. Curiosity OR proof OR contrast. No emoji.",
  },
  subheadline: {
    max: 220,
    instructions: "Write ONE subheadline per variation. 1-2 short sentences that reinforce the headline and tee up the next action.",
  },
  bullets: {
    max: 600,
    instructions: "Return ONE bullet list per variation, separated by '---' lines. 3-5 bullets per list. Each bullet: outcome-first, then mechanism. No filler words.",
  },
  cta: {
    max: 60,
    instructions: "Write ONE CTA button label per variation. 2-6 words. Action verb. Specific.",
  },
  advertorial: {
    max: 1400,
    instructions: "Write ONE 3-paragraph story-style advertorial opening per variation, separated by '---' lines. Use a relatable character, specific numbers, no exaggerated claims.",
  },
  email_subject: {
    max: 80,
    instructions: "Write ONE email subject line per variation. 4-9 words. Curiosity or specific benefit. No spammy ALL CAPS.",
  },
  email_body: {
    max: 1200,
    instructions: "Write ONE short broadcast email per variation, separated by '---' lines. Format: greeting, 1-line hook, 2-3 short paragraphs, P.S. line, CTA at the end. Plain text, no salutation flowers.",
  },
  bridge: {
    max: 400,
    instructions: "Write ONE bridge-page body (between ad and offer) per variation, separated by '---' lines. 2 short paragraphs that frame the offer.",
  },
};

function fallbackVariations(input: AICopyInput): string[] {
  const niche = input.context.niche ?? "your niche";
  const offer = input.context.offer ?? "the next step";
  const n = input.variations ?? 3;

  const headlines = [
    `The ${niche} method most operators miss`,
    `How a 41-year-old fixed their ${niche} problem in 7 days`,
    `${offer} — without the usual mistakes`,
    `The 5-minute ${niche} ritual that actually works`,
    `What ${niche} insiders won't tell you about ${offer}`,
  ];
  const subheads = [
    `A simple, no-fluff plan you can start today.`,
    `Free, no credit card, instant access.`,
    `Built for people who've tried everything else.`,
    `Backed by hundreds of operators in the field.`,
  ];
  const ctas = [
    `Get Instant Access`,
    `See the Recommendation →`,
    `Show Me the Plan`,
    `Try It Free Today`,
    `Continue →`,
  ];
  const bullets = [
    `Get the exact ${niche} framework in under 5 minutes\n---\nWhy "common advice" actually backfires for ${niche}\n---\nThe 3-step protocol that compounds over time`,
    `Skip the ${niche} mistakes 90% of beginners make\n---\nWhat happens in week 2 — and how to lock in results\n---\nThe one shift that doubles conversions`,
  ];
  const subjects = [
    `Quick question`,
    `Your ${niche} plan is ready`,
    `One thing most ${niche} folks skip`,
    `Try this before [date]`,
  ];
  const emails = [
    `Hi,\n\nI noticed you grabbed the ${niche} plan — quick favor.\n\nMost people who download it skip step 2. That's the step that actually matters. Here's why:\n\n[1-2 sentences of unique angle]\n\nGive it a try this week and reply if you have questions.\n\n— [Your Name]\n\nP.S. If you want the paired guide, here it is: [link]`,
  ];
  const advertorial = [
    `Three weeks ago, [Reader] was three months from giving up on ${niche}.\n\nThey'd tried the obvious stuff — the apps, the routines, the influencer plans. Nothing stuck.\n\nThen they came across a small change. Not a trick — a different starting point. Within 8 days, the thing they'd struggled with for years started to click. Here's what they did, in their own words, and why most plans get this backwards.`,
  ];
  const bridges = [
    `Before you continue: this isn't for everyone. If you're already getting results, ignore this. If you've tried what you thought were the right things and they didn't work, the next page explains why — and what to do instead. Take 30 seconds, then click through.`,
  ];

  const pool: Record<AICopyKind, string[]> = {
    headline: headlines, subheadline: subheads, bullets, cta: ctas,
    advertorial, email_subject: subjects, email_body: emails, bridge: bridges,
  };
  const arr = pool[input.kind] ?? [];
  return arr.slice(0, n);
}

async function callAnthropic(input: AICopyInput): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const budget = BUDGETS[input.kind];
  const n = input.variations ?? 3;

  const userPrompt = buildUserPrompt(input, n);

  // Prompt caching: keep the system prompt cacheable across calls
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.min(budget.max * n + 200, 4096),
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";

  return text.split(/\n---+[\r\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, n);
}

/**
 * Build the shared user prompt used by both the Anthropic and Paperclip paths.
 * The Paperclip agent receives this as its issue description.
 */
function buildUserPrompt(input: AICopyInput, n: number): string {
  const budget = BUDGETS[input.kind];
  return [
    `Generate ${n} ${input.kind} variations.`,
    `Output format: one variation per response chunk separated by '---' lines.`,
    `Constraints: ${budget.instructions}`,
    "",
    "Context:",
    `- Niche: ${input.context.niche ?? "(unspecified)"}`,
    `- Audience: ${input.context.audience ?? "(unspecified)"}`,
    `- Offer / promise: ${input.context.offer ?? "(unspecified)"}`,
    `- Tone: ${input.context.tone ?? "direct"}`,
    `- Traffic source: ${input.context.trafficSource ?? "(unspecified)"}`,
    `- Page type: ${input.context.pageType ?? "(unspecified)"}`,
    input.context.angle ? `- Angle hint: ${input.context.angle}` : "",
    input.existing ? `\nCurrent text (rewrite, don't just tweak):\n"${input.existing}"` : "",
    "",
    `Now write the ${n} variations. Plain text. Separator '---' lines between variations. No commentary.`,
  ].filter(Boolean).join("\n");
}

/**
 * Dispatch the copy request to the Paperclip copywriter agent and poll for the
 * result. Returns the parsed variations, or throws if the agent didn't finish.
 */
async function callPaperclip(input: AICopyInput): Promise<string[]> {
  const cfg = getPaperclipConfig();
  if (!cfg) throw new Error("Paperclip not configured");

  const n = input.variations ?? 3;
  const prompt = [
    SYSTEM_PROMPT,
    "",
    "TASK:",
    buildUserPrompt(input, n),
    "",
    "When done, save your result (the variations, separated by '---' lines, plain text, no commentary) as a document with key `copy-result` on this issue, then mark the issue done.",
  ].join("\n");

  const issueId = await dispatchCopyTask(cfg, prompt);
  const body = await pollForResult(cfg, issueId);
  if (body == null) throw new Error("Paperclip copywriter did not finish in time");
  return parseVariations(body).slice(0, n);
}

export async function generateCopy(input: AICopyInput): Promise<AICopyResult> {
  // 1. Paperclip (primary AI engine)
  try {
    if (getPaperclipConfig()) {
      const variations = await callPaperclip(input);
      if (variations.length > 0) return { variations, source: "paperclip" };
    }
  } catch (e) {
    console.warn("[ai-copy] Paperclip call failed — trying Anthropic:", (e as Error).message);
  }

  // 2. Anthropic (direct Claude)
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const variations = await callAnthropic(input);
      if (variations.length > 0) return { variations, source: "anthropic" };
    }
  } catch (e) {
    console.warn("[ai-copy] Anthropic call failed — using fallback:", (e as Error).message);
  }

  // 3. Deterministic fallback (no AI key required)
  return { variations: fallbackVariations(input), source: "fallback" };
}
