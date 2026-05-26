import "server-only";
import { prisma } from "../db";
import { tenantDb } from "../tenant";
import { sendEmail } from "./email-sender";
import { safeJsonParse } from "@/lib/utils";

type Step =
  | { type: "send_email"; config: { subject: string; bodyHtml: string; fromEmail?: string; fromName?: string } }
  | { type: "add_tag"; config: { tagId: string } }
  | { type: "remove_tag"; config: { tagId: string } }
  | { type: "wait"; config: { seconds: number } };

/**
 * Trigger any matching automations for a contact. MVP runs steps inline
 * (apart from `wait`, which we acknowledge but skip — a real impl would
 * enqueue a delayed job). Designed so swapping for BullMQ is mechanical.
 */
export async function triggerAutomations(input: {
  tenantId: string;
  contactId: string;
  trigger: "FORM_SUBMITTED" | "TAG_ADDED" | "PAGE_VISITED" | "LINK_CLICKED";
  triggerRef?: string | null;
}) {
  const db = tenantDb(input.tenantId);

  const automations = await db.automation.findMany({
    where: {
      enabled: true,
      trigger: input.trigger,
      OR: [{ triggerRef: null }, { triggerRef: input.triggerRef ?? null }],
    },
  });

  const contact = await db.contact.findFirst({ where: { id: input.contactId } });
  if (!contact) return;

  for (const auto of automations) {
    const steps = safeJsonParse<Step[]>(auto.stepsJson, []);
    const run = await prisma.automationRun.create({
      data: {
        tenantId: input.tenantId,
        automationId: auto.id,
        contactId: contact.id,
        state: "running",
        cursor: 0,
        log: "[]",
      },
    });

    const log: Array<{ step: number; type: string; ok: boolean; detail?: string }> = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        if (step.type === "send_email") {
          const r = await sendEmail({
            tenantId: input.tenantId,
            contactId: contact.id,
            to: contact.email,
            from: step.config.fromEmail || process.env.DEFAULT_FROM_EMAIL || "noreply@launchstack.local",
            fromName: step.config.fromName,
            subject: step.config.subject,
            bodyHtml: step.config.bodyHtml,
            source: "automation",
            sourceId: auto.id,
          });
          log.push({ step: i, type: step.type, ok: r.ok, detail: r.error });
        } else if (step.type === "add_tag") {
          await db.contactTag.upsert({
            where: { contactId_tagId: { contactId: contact.id, tagId: step.config.tagId } },
            create: { tenantId: input.tenantId, contactId: contact.id, tagId: step.config.tagId },
            update: {},
          });
          await db.activity.create({
            data: { tenantId: input.tenantId, contactId: contact.id, type: "tag_added", payload: JSON.stringify({ tagId: step.config.tagId, via: `automation:${auto.id}` }) },
          });
          log.push({ step: i, type: step.type, ok: true });
        } else if (step.type === "remove_tag") {
          await db.contactTag.deleteMany({ where: { contactId: contact.id, tagId: step.config.tagId } });
          log.push({ step: i, type: step.type, ok: true });
        } else if (step.type === "wait") {
          // MVP: log + continue. Real impl would enqueue.
          log.push({ step: i, type: step.type, ok: true, detail: `would wait ${step.config.seconds}s` });
        }
        await prisma.automationRun.update({ where: { id: run.id }, data: { cursor: i + 1, log: JSON.stringify(log) } });
      } catch (err) {
        log.push({ step: i, type: step.type, ok: false, detail: (err as Error).message });
        await prisma.automationRun.update({
          where: { id: run.id },
          data: { state: "failed", log: JSON.stringify(log) },
        });
        break;
      }
    }

    if ((await prisma.automationRun.findUnique({ where: { id: run.id } }))?.state === "running") {
      await prisma.automationRun.update({ where: { id: run.id }, data: { state: "completed" } });
    }
  }
}
