import "server-only";
import { prisma } from "../db";

/**
 * Mocked email sender for MVP. Persists every message to `EmailMessage` and
 * logs to console. When `RESEND_API_KEY` is set, it would call Resend's API
 * via a thin fetch — left as a stub so MVP has no external dependency.
 */
export async function sendEmail(input: {
  tenantId: string;
  contactId?: string | null;
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  bodyHtml: string;
  source: "broadcast" | "automation" | "transactional";
  sourceId?: string | null;
}) {
  const message = await prisma.emailMessage.create({
    data: {
      tenantId: input.tenantId,
      contactId: input.contactId ?? null,
      subject: input.subject,
      fromEmail: input.from,
      toEmail: input.to,
      bodyHtml: input.bodyHtml,
      source: input.source,
      sourceId: input.sourceId ?? null,
      status: "queued",
    },
  });

  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: input.fromName ? `${input.fromName} <${input.from}>` : input.from,
          to: input.to,
          subject: input.subject,
          html: input.bodyHtml,
        }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    } else {
      // Mock send
      // eslint-disable-next-line no-console
      console.log(`[email/mock] → ${input.to} | ${input.subject}`);
    }

    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "sent", sentAt: new Date() },
    });
    return { ok: true, id: message.id };
  } catch (err) {
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: "failed", error: (err as Error).message },
    });
    return { ok: false, id: message.id, error: (err as Error).message };
  }
}
