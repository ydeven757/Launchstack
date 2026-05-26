import "server-only";
import { prisma } from "./db";

export async function audit(input: {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      before: input.before ? JSON.stringify(input.before) : null,
      after: input.after ? JSON.stringify(input.after) : null,
    },
  });
}
