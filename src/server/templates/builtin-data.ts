// PURE DATA — no imports, no server-only. Shared between server runtime and the
// plain-Node seed script. The 21-template starter library lives here.
// Helpers + DB writes live in `starter-templates.ts`.

export type Block = { id: string; type: string; props?: Record<string, unknown> };

export type StarterTemplate = {
  id: string;
  name: string;
  description?: string;
  niche?: string;
  trafficSource?: string;
  funnelType?: string;
  funnelName: string;
  pages: { name: string; type: "OPT_IN" | "BRIDGE" | "ADVERTORIAL" | "THANK_YOU" | "CONFIRMATION" | "BLOG_POST" | "HOME" | "REVIEW" | "CUSTOM"; blocks: Block[] }[];
};

const hero = (id: string, headline: string, subhead = "", align: "center" | "left" = "center"): Block =>
  ({ id, type: "hero", props: { headline, subhead, align } });
const text = (id: string, body: string): Block => ({ id, type: "text", props: { body } });
const form = (id: string, label = "Get Free Access", placeholder = "Enter your best email", fields: string[] = ["email"]): Block =>
  ({ id, type: "form", props: { fields, submitLabel: label, placeholder } });
const cta = (id: string, label: string, href = "#"): Block =>
  ({ id, type: "cta", props: { label, href, style: "primary" } });

export const BUILTIN_TEMPLATES: StarterTemplate[] = [
  // ── Health & Fitness ──────────────────────────────────────────────────────
  {
    id: "tpl-leadmagnet-fitness",
    name: "Fitness Lead Magnet",
    description: "Capture leads with a free training plan; routes to a recommended program offer.",
    niche: "Health & Fitness", trafficSource: "Paid Social", funnelType: "lead_magnet",
    funnelName: "Fitness Lead Magnet",
    pages: [
      { name: "Get the 7-Day Reset", type: "OPT_IN", blocks: [
        hero("h", "The 7-Day Reset", "A simple plan for the first week back. Free, no fluff."),
        form("f", "Send Me the Plan"),
        text("t", "We'll send the plan immediately and a few short follow-ups. Unsubscribe anytime."),
      ]},
      { name: "Recommended Next Step", type: "THANK_YOU", blocks: [
        hero("h", "Plan on the way", "While you wait — here's what we recommend next."),
        text("t", "Most readers also use this paired training app — it removes the guesswork from week two."),
        cta("c", "See the recommendation →"),
      ]},
    ],
  },
  {
    id: "tpl-weightloss-advertorial",
    name: "Weight Loss Advertorial",
    description: "Cold-traffic-friendly advertorial → bridge → offer. Conversion-optimized for Facebook + native.",
    niche: "Weight Loss", trafficSource: "Native Ads", funnelType: "advertorial",
    funnelName: "Weight Loss Advertorial",
    pages: [
      { name: "How [Reader] Dropped 22 lbs Without Cardio", type: "ADVERTORIAL", blocks: [
        hero("h", "How a 41-Year-Old Mom Dropped 22 lbs Without Touching a Treadmill", "And the simple morning ritual she swears by.", "left"),
        text("t1", "Open with the reader's daily life before. Three short paragraphs — relatable, specific, no medical claims."),
        text("t2", "The turning point — what they tried, what didn't work, what finally clicked."),
        text("t3", "The change in detail — 5-6 bullet points of what they did differently. End with a soft call to read more."),
        cta("c", "See what she's using now →"),
      ]},
      { name: "Bridge — Before You See the Offer", type: "BRIDGE", blocks: [
        hero("h", "Read this before you continue", "30 seconds of context for the offer on the next page.", "left"),
        cta("c", "Continue →"),
      ]},
    ],
  },
  {
    id: "tpl-supplement-quiz",
    name: "Supplement Quiz Funnel",
    description: "Quiz-style opt-in. Higher conversion than plain forms when the answer is the offer.",
    niche: "Supplements", trafficSource: "Paid Social", funnelType: "lead_magnet",
    funnelName: "Supplement Match Quiz",
    pages: [
      { name: "Which supplement matches your body?", type: "OPT_IN", blocks: [
        hero("h", "Which Supplement Matches Your Body Type?", "Answer 3 quick questions and we'll match you."),
        text("t", "Step-by-step quiz UX is a roadmap — Q1: goal, Q2: age range, Q3: sensitivity. The form below is the final email-gate."),
        form("f", "See My Match", "Email for your match"),
      ]},
      { name: "Your Match", type: "THANK_YOU", blocks: [
        hero("h", "Your match is on the way", "Open your inbox in the next minute."),
        cta("c", "See it →"),
      ]},
    ],
  },
  // ── Personal Finance ─────────────────────────────────────────────────────
  {
    id: "tpl-advertorial-finance",
    name: "Finance Advertorial",
    description: "Long-form story page that warms cold traffic before sending to the offer.",
    niche: "Personal Finance", trafficSource: "Native Ads", funnelType: "advertorial",
    funnelName: "Finance Advertorial",
    pages: [
      { name: "How One Reader Cut Their Bill", type: "ADVERTORIAL", blocks: [
        hero("h", "How a 38-Year-Old Cut Their Monthly Bill by Half", "A simple change that most providers don't talk about.", "left"),
        text("t", "Three paragraphs of story-style narrative. Establish the problem, the change, and the result. End with a clear next-step."),
        cta("c", "Check if you qualify →"),
      ]},
      { name: "Bridge", type: "BRIDGE", blocks: [
        hero("h", "Before you continue — read this", "A 30-second context for the offer on the next page.", "left"),
        cta("c", "Continue →"),
      ]},
    ],
  },
  {
    id: "tpl-finance-debt-leadmag",
    name: "Debt-Relief Lead Magnet",
    description: "Free 5-minute assessment → email capture → bridge to the network's offer.",
    niche: "Personal Finance", trafficSource: "Paid Search", funnelType: "lead_magnet",
    funnelName: "Debt-Relief Assessment",
    pages: [
      { name: "Free Debt Relief Check", type: "OPT_IN", blocks: [
        hero("h", "Free 5-Minute Debt-Relief Check", "See your options in under a minute. No credit pull."),
        form("f", "Show My Options", "Your email", ["email", "firstName"]),
        text("t", "Disclosure: results vary. Not financial advice."),
      ]},
      { name: "Your Options", type: "THANK_YOU", blocks: [
        hero("h", "Here's what we recommend"),
        cta("c", "See your matched program →"),
      ]},
    ],
  },
  {
    id: "tpl-credit-review",
    name: "Credit-Repair Review Page",
    description: "Long-form SEO-style review for credit/repair products.",
    niche: "Credit & Loans", trafficSource: "Organic Search", funnelType: "review",
    funnelName: "Credit Repair Review",
    pages: [
      { name: "[Product] Review — Real or Scam?", type: "REVIEW", blocks: [
        hero("h", "[Product] Credit Repair Review — Real or Scam?", "I tried it for 60 days. Here's exactly what happened.", "left"),
        text("p1", "Quick verdict — TL;DR for skimmers. Then the body."),
        text("p2", "What it is, who runs it, what's claimed."),
        text("p3", "What worked / didn't work — be specific."),
        text("p4", "Pricing breakdown + my actual results."),
        cta("c", "Check the latest price →"),
        text("disc", "Disclosure: I may earn a commission on links above. This doesn't change my opinion."),
      ]},
    ],
  },
  // ── Make Money Online ─────────────────────────────────────────────────────
  {
    id: "tpl-mmo-webinar",
    name: "MMO Webinar Funnel",
    description: "Registration → confirmation → replay. Classic for high-ticket make-money-online offers.",
    niche: "Make Money Online", trafficSource: "Paid + Email", funnelType: "webinar",
    funnelName: "MMO Webinar",
    pages: [
      { name: "Free Workshop Registration", type: "OPT_IN", blocks: [
        hero("h", "Free 45-Minute Workshop: [Specific Result] in [Specific Time]"),
        text("t", "Three things you'll learn — bulleted, outcome-focused."),
        form("f", "Save My Seat", "Email for the reminder", ["email", "firstName"]),
      ]},
      { name: "You're Registered", type: "CONFIRMATION", blocks: [
        hero("h", "You're in", "We'll send the link 10 minutes before."),
        cta("c", "Add to calendar"),
      ]},
      { name: "Replay / Thank You", type: "THANK_YOU", blocks: [
        hero("h", "Workshop replay"),
        cta("c", "Claim the bonus →"),
      ]},
    ],
  },
  {
    id: "tpl-mmo-cheatsheet",
    name: "MMO Cheatsheet Opt-In",
    description: "Lower-friction lead magnet for cold paid traffic.",
    niche: "Make Money Online", trafficSource: "Paid Social", funnelType: "lead_magnet",
    funnelName: "MMO Cheatsheet",
    pages: [
      { name: "Free MMO Cheatsheet", type: "OPT_IN", blocks: [
        hero("h", "The 1-Page Cheatsheet: How [Niche] Beginners Make Their First $100", "Get it free — no credit card."),
        form("f", "Send Me the Cheatsheet"),
      ]},
      { name: "Bridge → Offer", type: "BRIDGE", blocks: [
        hero("h", "While you read the cheatsheet"),
        text("t", "Most readers also grab this kit — it's the next step after the cheatsheet."),
        cta("c", "See the kit →"),
      ]},
    ],
  },
  // ── Survival ──────────────────────────────────────────────────────────────
  {
    id: "tpl-survival-advertorial",
    name: "Survival Advertorial",
    description: "Fear-of-loss style advertorial for prepper/survival offers.",
    niche: "Survival & Self-Defense", trafficSource: "Native Ads", funnelType: "advertorial",
    funnelName: "Survival Advertorial",
    pages: [
      { name: "What [Authority Figure] Just Warned About", type: "ADVERTORIAL", blocks: [
        hero("h", "Why [Authority Figure] Just Warned About [Threat]", "And what most families are still missing.", "left"),
        text("t1", "Open with the news event or trend. Establish credibility, then move to the practical implication."),
        text("t2", "Cover the three most common mistakes people make — be educational, not preachy."),
        cta("c", "See the family kit →"),
      ]},
    ],
  },
  // ── Dating ────────────────────────────────────────────────────────────────
  {
    id: "tpl-dating-quiz",
    name: "Dating Quiz Funnel",
    description: "Personality-quiz opt-in funnel. Strong conversion for emotional niches.",
    niche: "Dating & Relationships", trafficSource: "Paid Social", funnelType: "lead_magnet",
    funnelName: "Dating Personality Quiz",
    pages: [
      { name: "Find Your Attachment Style", type: "OPT_IN", blocks: [
        hero("h", "Find Your Attachment Style in 60 Seconds", "Free quiz — get your result instantly."),
        form("f", "Get My Result", "Email for your result"),
      ]},
      { name: "Your Result", type: "THANK_YOU", blocks: [
        hero("h", "Your result is on the way"),
        cta("c", "See the guide →"),
      ]},
    ],
  },
  // ── Spirituality ──────────────────────────────────────────────────────────
  {
    id: "tpl-spiritual-reading",
    name: "Spiritual Reading Opt-In",
    description: "Free reading / numerology / astrology lead magnet → bridge to the paid reading offer.",
    niche: "Spirituality", trafficSource: "Paid Social", funnelType: "lead_magnet",
    funnelName: "Free Reading",
    pages: [
      { name: "Free Personalized Reading", type: "OPT_IN", blocks: [
        hero("h", "Get Your Free Personalized Reading", "Discover what the year ahead is preparing for you."),
        form("f", "Get My Reading", "Your email + birth date", ["email", "firstName"]),
      ]},
      { name: "Your Reading", type: "THANK_YOU", blocks: [
        hero("h", "Your reading is being prepared"),
        cta("c", "Get the full reading →"),
      ]},
    ],
  },
  // ── Beauty / Anti-Aging ──────────────────────────────────────────────────
  {
    id: "tpl-beauty-advertorial",
    name: "Anti-Aging Advertorial",
    description: "Before/after story angle for skincare/anti-aging offers.",
    niche: "Beauty & Skincare", trafficSource: "Native Ads", funnelType: "advertorial",
    funnelName: "Anti-Aging Story",
    pages: [
      { name: "How [Person] Looks 10 Years Younger", type: "ADVERTORIAL", blocks: [
        hero("h", "How a 52-Year-Old Looks 10 Years Younger Without Surgery", "And the simple 5-minute habit that started it.", "left"),
        text("t", "Story-driven narrative. Focus on the emotional journey + the practical change. Avoid medical claims."),
        cta("c", "See what she's using →"),
      ]},
    ],
  },
  // ── Crypto ────────────────────────────────────────────────────────────────
  {
    id: "tpl-crypto-leadmag",
    name: "Crypto Lead Magnet",
    description: "Free 'crypto strategy' PDF → bridge to the trading-room/signal offer.",
    niche: "Crypto & Trading", trafficSource: "Paid Search", funnelType: "lead_magnet",
    funnelName: "Crypto Strategy",
    pages: [
      { name: "Free Crypto Strategy 2026", type: "OPT_IN", blocks: [
        hero("h", "The 2026 Crypto Strategy I'm Following", "Free 12-page guide. No credit card."),
        form("f", "Send Me the Strategy", "Email for the guide"),
        text("d", "Disclosure: Not financial advice. Trading involves risk."),
      ]},
      { name: "Bridge → Signal Room", type: "BRIDGE", blocks: [
        hero("h", "Take the strategy further"),
        cta("c", "See the signal room →"),
      ]},
    ],
  },
  // ── Pet / Dog Training ────────────────────────────────────────────────────
  {
    id: "tpl-dog-training",
    name: "Dog Training Lead Magnet",
    description: "5-day mini-course opt-in → upsell to full program.",
    niche: "Pet & Animal Care", trafficSource: "Paid Social", funnelType: "lead_magnet",
    funnelName: "Dog Training Mini-Course",
    pages: [
      { name: "Free 5-Day Dog Training Course", type: "OPT_IN", blocks: [
        hero("h", "Train Your Dog in 5 Days — Free", "One short email per day. No fluff."),
        form("f", "Start Day 1", "Email for your daily lesson", ["email", "firstName"]),
      ]},
      { name: "Day 1 Sent", type: "THANK_YOU", blocks: [
        hero("h", "Day 1 is on its way"),
        cta("c", "See the full program →"),
      ]},
    ],
  },
  // ── Gardening / Homestead ────────────────────────────────────────────────
  {
    id: "tpl-gardening-leadmag",
    name: "Gardening Lead Magnet",
    description: "Seasonal planting guide → bridge to gardening product offer.",
    niche: "Gardening & Homestead", trafficSource: "Organic Search", funnelType: "lead_magnet",
    funnelName: "Seasonal Planting Guide",
    pages: [
      { name: "Free Planting Guide", type: "OPT_IN", blocks: [
        hero("h", "Free Planting Guide for [Your Zone]", "What to plant this month + a quick-start checklist."),
        form("f", "Get My Guide", "Email for the guide"),
      ]},
      { name: "Bridge", type: "BRIDGE", blocks: [
        hero("h", "Take it further"),
        cta("c", "See the kit →"),
      ]},
    ],
  },
  // ── Software / SaaS ──────────────────────────────────────────────────────
  {
    id: "tpl-software-review",
    name: "SaaS Review Funnel",
    description: "Long-form SEO review for SaaS affiliate offers.",
    niche: "Software & SaaS", trafficSource: "Organic Search", funnelType: "review",
    funnelName: "SaaS Review",
    pages: [
      { name: "[Tool] Review — Honest 2026 Take", type: "REVIEW", blocks: [
        hero("h", "[Tool] Review — Is It Worth It in 2026?", "Hands-on after 60 days.", "left"),
        text("p1", "TL;DR — who it's for, who it's not for, price."),
        text("p2", "Best features (3-5)."),
        text("p3", "Drawbacks I noticed."),
        text("p4", "Pricing breakdown + alternatives."),
        cta("c", "Try [Tool] free →"),
        text("disc", "Affiliate disclosure: I earn a commission if you sign up via my link, at no extra cost to you."),
      ]},
    ],
  },
  // ── E-Commerce niche site ────────────────────────────────────────────────
  {
    id: "tpl-ecom-blog",
    name: "Niche E-Commerce Blog",
    description: "Home + first review post for an SEO-driven affiliate site (kitchen, outdoor, home goods).",
    niche: "E-Commerce", trafficSource: "Organic Search", funnelType: "lead_magnet",
    funnelName: "Niche Site",
    pages: [
      { name: "Home", type: "HOME", blocks: [
        hero("h", "Welcome to [Brand]", "What we cover, for whom, and what to read first."),
        cta("c", "Read the latest →"),
      ]},
      { name: "Top Pick Review", type: "REVIEW", blocks: [
        hero("h", "Our Top Pick — [Product] Review", "After testing 7 [category] for 90 days."),
        text("t", "Long-form pillar post. Include a comparison table placeholder, 5 detailed pros, 3 honest cons."),
        cta("c", "Check the latest price →"),
      ]},
    ],
  },
  // ── Coaching ──────────────────────────────────────────────────────────────
  {
    id: "tpl-webinar-coaching",
    name: "Coaching Webinar",
    description: "Webinar opt-in → confirmation → replay funnel for high-ticket coaches.",
    niche: "Online Coaching", trafficSource: "Email & Paid", funnelType: "webinar",
    funnelName: "Coaching Webinar",
    pages: [
      { name: "Register for the Workshop", type: "OPT_IN", blocks: [
        hero("h", "Free 45-minute workshop", "What we cover, who it's for, and when it starts."),
        form("f", "Save My Seat", "Email for the reminder", ["email", "firstName"]),
      ]},
      { name: "You're Registered", type: "CONFIRMATION", blocks: [
        hero("h", "You're in", "We'll send the link 10 minutes before we go live."),
      ]},
    ],
  },
  // ── Generic content site ──────────────────────────────────────────────────
  {
    id: "tpl-home-blog",
    name: "Niche Blog + Home",
    description: "Simple home page + first blog post to anchor an SEO-driven affiliate site.",
    niche: "Lifestyle", trafficSource: "Organic Search", funnelType: "lead_magnet",
    funnelName: "Niche Site",
    pages: [
      { name: "Home", type: "HOME", blocks: [
        hero("h", "Welcome to [Brand]", "What we cover, for whom, and what to read first."),
        cta("c", "Read the latest →"),
      ]},
      { name: "First Post", type: "BLOG_POST", blocks: [
        hero("h", "Your first post", "Author • date", "left"),
        text("t", "Write a 1500-word post that solves one specific reader problem and recommends one product."),
      ]},
    ],
  },
  // ── Tech ─────────────────────────────────────────────────────────────────
  {
    id: "tpl-review-tech",
    name: "Tech Product Review",
    description: "SEO-friendly review page with comparison table placeholder + offer CTA.",
    niche: "Tech & Software", trafficSource: "Organic Search", funnelType: "review",
    funnelName: "Tech Review",
    pages: [
      { name: "[Product] Review 2026", type: "REVIEW", blocks: [
        hero("h", "[Product] Review — Is it actually worth it?", "Hands-on review after 30 days of use.", "left"),
        text("t", "Cover: who it's for, who it isn't, the 3 biggest pros, the 2 biggest cons, and the price."),
        cta("c", "Check the latest price →"),
      ]},
    ],
  },
  // ── Real Estate ───────────────────────────────────────────────────────────
  {
    id: "tpl-realestate-leadmag",
    name: "Real Estate Lead Magnet",
    description: "Free 'first-deal blueprint' opt-in → bridge to real-estate-investing course.",
    niche: "Real Estate Investing", trafficSource: "Paid Social", funnelType: "lead_magnet",
    funnelName: "First-Deal Blueprint",
    pages: [
      { name: "Free First-Deal Blueprint", type: "OPT_IN", blocks: [
        hero("h", "The First-Deal Blueprint", "A 1-page roadmap to your first rental or flip — free."),
        form("f", "Send Me the Blueprint", "Email for the PDF"),
      ]},
      { name: "Bridge → Course", type: "BRIDGE", blocks: [
        hero("h", "Take it further"),
        cta("c", "See the course →"),
      ]},
    ],
  },
];
