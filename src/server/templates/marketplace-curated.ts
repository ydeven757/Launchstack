// Curated marketplace catalog — used to seed MarketplaceProduct when no live
// API sync is wired up. These are GENERIC placeholder products (no real
// vendor IDs / copyrighted product names) so the demo + UI work without
// hitting a network. Replace with real sync output before going live.

export type CuratedProduct = {
  network: string;
  externalId: string;
  title: string;
  vendor?: string;
  niche: string;
  category?: string;
  gravity?: number;     // ClickBank-style popularity proxy
  avgPayout?: number;
  initialPayout?: number;
  rebillPayout?: number;
  currency: string;
  commission?: number;
  hopUrl: string;
  salesPageUrl?: string;
  description?: string;
  recommendedFunnel?: "lead_magnet" | "advertorial" | "review" | "webinar";
  tags: string[];
};

export const CURATED_MARKETPLACE: CuratedProduct[] = [
  // Health & Fitness
  { network: "ClickBank", externalId: "fit-001", title: "Bodyweight Reset System",
    vendor: "demo-vendor-fit-a", niche: "Health & Fitness", category: "Fitness Programs",
    gravity: 152, avgPayout: 42.50, initialPayout: 41, rebillPayout: 27, currency: "USD", commission: 75,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=fit-001", salesPageUrl: "https://example.com/bodyweight-reset",
    description: "30-day at-home fitness program with rebill. Top performer on female 35-55 cold paid traffic.",
    recommendedFunnel: "advertorial", tags: ["evergreen", "high-payout", "rebill"] },
  { network: "ClickBank", externalId: "weight-002", title: "Morning Metabolic Ritual",
    vendor: "demo-vendor-wl-b", niche: "Weight Loss", category: "Diet & Nutrition",
    gravity: 318, avgPayout: 81.20, initialPayout: 78, rebillPayout: 0, currency: "USD", commission: 60,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=weight-002", salesPageUrl: "https://example.com/morning-ritual",
    description: "VSL-style supplement offer. Heavy native traffic (Outbrain, Taboola, RevContent).",
    recommendedFunnel: "advertorial", tags: ["VSL", "supplement", "native-friendly"] },
  { network: "ClickBank", externalId: "supp-003", title: "Joint Comfort Formula",
    vendor: "demo-vendor-sp-c", niche: "Supplements", category: "Joint Health",
    gravity: 89, avgPayout: 53.10, initialPayout: 50, rebillPayout: 35, currency: "USD", commission: 65,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=supp-003",
    description: "Joint supplement for the 55+ demographic. Solid Facebook + email combo.",
    recommendedFunnel: "advertorial", tags: ["55+", "supplement"] },

  // Personal Finance
  { network: "ClickBank", externalId: "fin-004", title: "Debt Snowball Blueprint",
    vendor: "demo-vendor-fn-d", niche: "Personal Finance", category: "Debt",
    gravity: 64, avgPayout: 27.40, initialPayout: 27, rebillPayout: 0, currency: "USD", commission: 70,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=fin-004",
    description: "Digital course. Works well as a lead magnet bridge.",
    recommendedFunnel: "lead_magnet", tags: ["course", "evergreen"] },
  { network: "ClickBank", externalId: "credit-005", title: "Credit Score Rapid Restore",
    vendor: "demo-vendor-cr-e", niche: "Credit & Loans", category: "Credit Repair",
    gravity: 102, avgPayout: 96.80, initialPayout: 95, rebillPayout: 25, currency: "USD", commission: 75,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=credit-005",
    description: "High-payout credit repair offer. Best for SEO + paid search.",
    recommendedFunnel: "review", tags: ["high-payout", "review-friendly"] },

  // Make Money Online
  { network: "ClickBank", externalId: "mmo-006", title: "Side Income Starter Kit",
    vendor: "demo-vendor-mm-f", niche: "Make Money Online", category: "Online Business",
    gravity: 47, avgPayout: 38.90, initialPayout: 35, rebillPayout: 19, currency: "USD", commission: 60,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=mmo-006",
    description: "Beginner-friendly MMO course with rebill.",
    recommendedFunnel: "lead_magnet", tags: ["beginner", "rebill"] },
  { network: "ClickBank", externalId: "mmo-007", title: "High-Ticket Coaching Webinar",
    vendor: "demo-vendor-mm-g", niche: "Make Money Online", category: "Coaching",
    gravity: 28, avgPayout: 412.00, initialPayout: 400, rebillPayout: 0, currency: "USD", commission: 40,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=mmo-007",
    description: "High-ticket back-end. Run the webinar funnel.",
    recommendedFunnel: "webinar", tags: ["high-ticket", "webinar"] },

  // Crypto
  { network: "ClickBank", externalId: "crypto-008", title: "Daily Crypto Signal Room",
    vendor: "demo-vendor-cy-h", niche: "Crypto & Trading", category: "Trading",
    gravity: 71, avgPayout: 64.50, initialPayout: 35, rebillPayout: 29, currency: "USD", commission: 50,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=crypto-008",
    description: "Subscription signal service with strong rebill.",
    recommendedFunnel: "lead_magnet", tags: ["rebill", "subscription"] },

  // Survival
  { network: "ClickBank", externalId: "sur-009", title: "Family Emergency Kit",
    vendor: "demo-vendor-sv-i", niche: "Survival & Self-Defense", category: "Preparedness",
    gravity: 134, avgPayout: 58.20, initialPayout: 58, rebillPayout: 0, currency: "USD", commission: 50,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=sur-009",
    description: "Physical product offer. Best for native + Facebook.",
    recommendedFunnel: "advertorial", tags: ["physical-product", "native-friendly"] },

  // Dating
  { network: "ClickBank", externalId: "dat-010", title: "Attachment Style Reading",
    vendor: "demo-vendor-dt-j", niche: "Dating & Relationships", category: "Self-Help",
    gravity: 55, avgPayout: 31.90, initialPayout: 29, rebillPayout: 18, currency: "USD", commission: 70,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=dat-010",
    description: "Quiz-to-product offer. Great with the dating quiz template.",
    recommendedFunnel: "lead_magnet", tags: ["quiz-friendly"] },

  // Spirituality
  { network: "ClickBank", externalId: "spir-011", title: "Personalized Soul Reading",
    vendor: "demo-vendor-sp-k", niche: "Spirituality", category: "Numerology",
    gravity: 92, avgPayout: 43.10, initialPayout: 40, rebillPayout: 22, currency: "USD", commission: 75,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=spir-011",
    description: "Quiz-to-purchase spiritual offer with high stick rate.",
    recommendedFunnel: "lead_magnet", tags: ["quiz-friendly"] },

  // Beauty
  { network: "ClickBank", externalId: "bty-012", title: "Anti-Aging Serum Bundle",
    vendor: "demo-vendor-by-l", niche: "Beauty & Skincare", category: "Anti-Aging",
    gravity: 78, avgPayout: 47.30, initialPayout: 47, rebillPayout: 0, currency: "USD", commission: 65,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=bty-012",
    description: "Physical product. Works with story-style advertorials.",
    recommendedFunnel: "advertorial", tags: ["physical-product", "evergreen"] },

  // Pet
  { network: "ClickBank", externalId: "pet-013", title: "Dog Behavior Mastery",
    vendor: "demo-vendor-pt-m", niche: "Pet & Animal Care", category: "Training",
    gravity: 41, avgPayout: 33.50, initialPayout: 30, rebillPayout: 22, currency: "USD", commission: 70,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=pet-013",
    description: "Digital training program. 5-day mini-course funnel works well.",
    recommendedFunnel: "lead_magnet", tags: ["course", "rebill"] },

  // Real Estate
  { network: "ClickBank", externalId: "re-014", title: "First Deal Mastery Course",
    vendor: "demo-vendor-re-n", niche: "Real Estate Investing", category: "Real Estate",
    gravity: 38, avgPayout: 197.00, initialPayout: 197, rebillPayout: 0, currency: "USD", commission: 50,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=re-014",
    description: "High-ticket digital course. Lead-magnet funnel suits this.",
    recommendedFunnel: "lead_magnet", tags: ["high-ticket"] },

  // Gardening
  { network: "ClickBank", externalId: "gard-015", title: "Backyard Self-Sufficiency Plan",
    vendor: "demo-vendor-gd-o", niche: "Gardening & Homestead", category: "Self-Sufficiency",
    gravity: 23, avgPayout: 36.80, initialPayout: 36, rebillPayout: 0, currency: "USD", commission: 60,
    hopUrl: "https://hop.example.com/?aff={AFF_ID}&p=gard-015",
    description: "Gardening/homestead offer for SEO traffic.",
    recommendedFunnel: "lead_magnet", tags: ["SEO-friendly", "evergreen"] },
];

export const NETWORK_HOP_TEMPLATE_HELP =
  "Replace {AFF_ID} with your network affiliate / nickname when wiring up. We'll do this automatically once your ClickBank integration is configured with a valid Clerk API key — until then the link works for testing.";
