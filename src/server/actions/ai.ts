"use server";

import { requireTenant } from "../tenant";
import { requirePermission } from "../permissions";
import { audit } from "../audit";
import { rateLimit } from "../rate-limit";
import { generateCopy, type AICopyInput, type AICopyResult } from "../services/ai-copy";

export async function generateCopyAction(input: AICopyInput): Promise<AICopyResult | { error: string }> {
  const ctx = await requireTenant();
  requirePermission(ctx.role, "page.update");

  // Per-tenant rate limit — cheap insurance against runaway requests
  const rl = rateLimit(`ai-copy:${ctx.tenant.id}`, { capacity: 30, refillPerSec: 0.5 });
  if (!rl.ok) return { error: `Too many AI requests. Retry in ${rl.retryAfterSec}s.` };

  // Auto-populate context from the tenant where the operator didn't specify
  const merged: AICopyInput = {
    ...input,
    context: {
      niche: input.context.niche ?? ctx.tenant.niche ?? undefined,
      audience: input.context.audience,
      offer: input.context.offer,
      tone: input.context.tone ?? "direct",
      trafficSource: input.context.trafficSource ?? ctx.tenant.trafficSource ?? undefined,
      pageType: input.context.pageType,
      angle: input.context.angle,
    },
  };

  const result = await generateCopy(merged);
  await audit({
    tenantId: ctx.tenant.id,
    actorUserId: ctx.userId,
    action: "ai.copy.generate",
    resourceType: "AICopy",
    after: { kind: input.kind, source: result.source, count: result.variations.length },
  });
  return result;
}
