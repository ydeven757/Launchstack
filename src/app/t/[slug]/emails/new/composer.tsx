"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createCampaignAction } from "@/server/actions/campaigns";

export function CampaignComposer({
  tenantSlug,
  tags,
  defaultFromName,
  defaultFromEmail,
}: {
  tenantSlug: string;
  tags: { id: string; name: string; color: string }[];
  defaultFromName: string;
  defaultFromEmail: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggle(id: string) {
    setSelectedTags((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        setError(null);
        fd.set("segmentTagIds", JSON.stringify(selectedTags));
        start(async () => {
          const r = await createCampaignAction(fd);
          if (r?.error) { setError(r.error); return; }
          router.push(`/t/${tenantSlug}/emails/${r.campaignId}`);
        });
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2"><Label>Campaign name (internal)</Label><Input name="name" required placeholder="e.g. December newsletter" /></div>
        <div className="md:col-span-2"><Label>Subject</Label><Input name="subject" required placeholder="What recipients see in their inbox" /></div>
        <div><Label>From name</Label><Input name="fromName" required defaultValue={defaultFromName} /></div>
        <div><Label>From email</Label><Input name="fromEmail" type="email" required defaultValue={defaultFromEmail} /></div>
      </div>

      <div>
        <Label>Body (HTML)</Label>
        <Textarea name="bodyHtml" required rows={12} className="font-mono text-xs" placeholder={"<p>Hi {{firstName}},</p>\n<p>Your message…</p>\n<p><a href=\"https://example.com\">Read more</a></p>"} />
        <p className="text-xs text-muted mt-1">Open + click tracking is added automatically when you send.</p>
      </div>

      <div>
        <Label>Send to contacts with any of these tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 && <span className="text-xs text-muted">No tags yet — campaign will go to all subscribers.</span>}
          {tags.map((t) => {
            const on = selectedTags.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => toggle(t.id)}
                className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs"
                style={{
                  borderColor: on ? t.color : "rgb(226 232 240)",
                  background: on ? `${t.color}22` : "transparent",
                  color: on ? t.color : "rgb(100 116 139)",
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-1">Leave empty to send to all contacts (LEAD / ENGAGED / CUSTOMER).</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create draft"}</Button>
    </form>
  );
}
