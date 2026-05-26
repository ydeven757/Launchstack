import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email().transform(s => s.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(80).optional(),
});

export const createTenantSchema = z.object({
  name: z.string().min(2).max(80),
  niche: z.string().max(60).optional().nullable(),
  trafficSource: z.string().max(40).optional().nullable(),
  conversionGoal: z.string().max(60).optional().nullable(),
  starterTemplateId: z.string().optional().nullable(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  brandPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  brandSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  brandLogo: z.string().url().nullable().optional(),
  timezone: z.string().max(60).optional(),
  disclosureText: z.string().max(500).nullable().optional(),
  legalFooterHtml: z.string().max(2000).nullable().optional(),
});

export const createFunnelSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(400).optional().nullable(),
});

export const createPageSchema = z.object({
  funnelId: z.string().nullable().optional(),
  type: z.enum(["OPT_IN", "BRIDGE", "ADVERTORIAL", "THANK_YOU", "CONFIRMATION", "BLOG_POST", "HOME", "REVIEW", "CUSTOM"]),
  name: z.string().min(1).max(80),
});

export const blockSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.any()).optional(),
    children: z.array(blockSchema).optional(),
  })
);

export const updatePageSchema = z.object({
  pageId: z.string(),
  name: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(80).optional(),
  blocks: z.array(blockSchema).optional(),
  seoTitle: z.string().max(120).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
});

export const contactSchema = z.object({
  email: z.string().email().transform(s => s.toLowerCase()),
  firstName: z.string().max(60).optional().nullable(),
  lastName: z.string().max(60).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  status: z.enum(["LEAD", "ENGAGED", "CUSTOMER", "UNSUBSCRIBED", "BOUNCED"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

export const formSubmissionSchema = z.object({
  pageId: z.string(),
  email: z.string().email().transform(s => s.toLowerCase()),
  firstName: z.string().max(60).optional(),
  lastName: z.string().max(60).optional(),
  phone: z.string().max(40).optional(),
  utm: z.object({
    source: z.string().max(80).optional(),
    medium: z.string().max(80).optional(),
    campaign: z.string().max(80).optional(),
  }).optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(200),
  fromName: z.string().min(1).max(80),
  fromEmail: z.string().email(),
  bodyHtml: z.string().min(1),
  segmentTagIds: z.array(z.string()).optional(),
});

export const automationSchema = z.object({
  name: z.string().min(1).max(120),
  trigger: z.enum(["FORM_SUBMITTED", "TAG_ADDED", "PAGE_VISITED", "LINK_CLICKED"]),
  triggerRef: z.string().optional().nullable(),
  steps: z.array(z.object({
    type: z.enum(["send_email", "add_tag", "remove_tag", "wait"]),
    config: z.record(z.any()),
  })),
  enabled: z.boolean().optional(),
});

export const domainSchema = z.object({
  hostname: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Enter a valid hostname"),
  isPrimary: z.boolean().optional(),
});

export const offerSchema = z.object({
  name: z.string().min(1).max(120),
  network: z.string().max(60).optional().nullable(),
  payout: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  landingUrl: z.string().url(),
  notes: z.string().max(1000).optional().nullable(),
});

export const affiliateLinkSchema = z.object({
  offerId: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only").min(1).max(60),
  utm: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
  }).optional(),
});
