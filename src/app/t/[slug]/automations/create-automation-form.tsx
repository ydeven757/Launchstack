"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAutomationAction } from "@/server/actions/automations";
import { Plus, X, Mail, Tag as TagIcon, Hourglass, ArrowDown, Zap, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Step =
  | { type: "send_email"; config: { subject: string; bodyHtml: string; fromEmail?: string; fromName?: string } }
  | { type: "add_tag"; config: { tagId: string } }
  | { type: "remove_tag"; config: { tagId: string } }
  | { type: "wait"; config: { seconds: number } };

const TRIGGER_LABELS: Record<string, { label: string; sub: string; icon: typeof Zap }> = {
  FORM_SUBMITTED: { label: "Form submitted", sub: "When a visitor opts in via any form", icon: Mail },
  TAG_ADDED:      { label: "Tag added",      sub: "When a specific tag is added to a contact", icon: TagIcon },
  PAGE_VISITED:   { label: "Page visited",   sub: "When a contact visits a tracked page", icon: Zap },
  LINK_CLICKED:   { label: "Link clicked",   sub: "When a contact clicks a tracked link", icon: Zap },
};

const STEP_META: Record<Step["type"], { label: string; icon: typeof Mail; tone: string }> = {
  send_email:  { label: "Send email",   icon: Mail,      tone: "bg-primary/10 text-primary border-primary/30" },
  add_tag:     { label: "Add tag",      icon: TagIcon,   tone: "bg-success/10 text-success border-success/30" },
  remove_tag:  { label: "Remove tag",   icon: TagIcon,   tone: "bg-warning/10 text-warning border-warning/30" },
  wait:        { label: "Wait",         icon: Hourglass, tone: "bg-border/40 text-muted border-border" },
};

export function CreateAutomationForm({ tags }: { tags: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<keyof typeof TRIGGER_LABELS>("FORM_SUBMITTED");
  const [steps, setSteps] = useState<Step[]>([]);

  function addStep(type: Step["type"]) {
    let blank: Step;
    if (type === "send_email") blank = { type, config: { subject: "Welcome!", bodyHtml: "<p>Thanks for signing up.</p>" } };
    else if (type === "add_tag") blank = { type, config: { tagId: tags[0]?.id ?? "" } };
    else if (type === "remove_tag") blank = { type, config: { tagId: tags[0]?.id ?? "" } };
    else blank = { type, config: { seconds: 3600 } };
    setSteps((s) => [...s, blank]);
  }
  function removeStep(i: number) { setSteps((s) => s.filter((_, idx) => idx !== i)); }
  function updateStep(i: number, patch: Record<string, unknown>) {
    setSteps((s) => s.map((step, idx) => idx === i ? ({ ...step, config: { ...step.config, ...patch } } as Step) : step));
  }

  const TriggerIcon = TRIGGER_LABELS[trigger].icon;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) { setError("Name is required"); return; }
        if (steps.length === 0) { setError("Add at least one step"); return; }
        start(async () => {
          const r = await createAutomationAction({
            name,
            trigger: trigger as "FORM_SUBMITTED" | "TAG_ADDED" | "PAGE_VISITED" | "LINK_CLICKED",
            steps: steps.map((s) => ({ type: s.type, config: s.config as Record<string, unknown> })),
          });
          if (r?.error) setError(r.error);
          else { setName(""); setSteps([]); }
        });
      }}
    >
      <div>
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Welcome series" />
      </div>

      {/* Trigger picker */}
      <div>
        <Label>When this happens</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(TRIGGER_LABELS).map(([key, t]) => {
            const Icon = t.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTrigger(key as keyof typeof TRIGGER_LABELS)}
                className={cn(
                  "text-left rounded-md border p-2.5 transition",
                  trigger === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
                <div className="text-[10px] text-muted leading-snug">{t.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Flow */}
      <div>
        <Label>Then do this</Label>
        <Card className="p-4 bg-bg/30">
          {/* Trigger node */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-2.5">
              <TriggerIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Trigger: {TRIGGER_LABELS[trigger].label}</span>
            </div>
          </div>

          {/* Steps */}
          {steps.length === 0 ? (
            <div className="my-4 text-center">
              <ArrowDown className="h-4 w-4 mx-auto text-muted mb-3" />
              <div className="inline-block rounded-md border border-dashed border-border px-4 py-3 text-xs text-muted">
                Add steps below
              </div>
            </div>
          ) : (
            <div className="my-2">
              {steps.map((s, i) => {
                const meta = STEP_META[s.type];
                const Icon = meta.icon;
                return (
                  <div key={i}>
                    <div className="flex justify-center my-2">
                      <ArrowDown className="h-4 w-4 text-muted" />
                    </div>
                    <Card className="p-3 max-w-xl mx-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", meta.tone)}>
                          <Icon className="h-3 w-3" />{meta.label}
                        </span>
                        <Badge variant="outline">Step {i + 1}</Badge>
                        <button type="button" onClick={() => removeStep(i)} className="ml-auto p-1 rounded hover:bg-border/40 text-muted">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {s.type === "send_email" && (
                        <div className="space-y-2">
                          <Input value={s.config.subject} onChange={(e) => updateStep(i, { subject: e.target.value })} placeholder="Subject" />
                          <Textarea value={s.config.bodyHtml} onChange={(e) => updateStep(i, { bodyHtml: e.target.value })} className="font-mono text-xs" rows={4} placeholder="<p>Body HTML…</p>" />
                        </div>
                      )}
                      {(s.type === "add_tag" || s.type === "remove_tag") && (
                        <Select value={(s.config as { tagId: string }).tagId} onChange={(e) => updateStep(i, { tagId: e.target.value })}>
                          {tags.length === 0 && <option value="">No tags available — create one in Contacts</option>}
                          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </Select>
                      )}
                      {s.type === "wait" && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" min={1}
                            value={(s.config as { seconds: number }).seconds}
                            onChange={(e) => updateStep(i, { seconds: Number(e.target.value) })}
                            className="max-w-[160px]"
                          />
                          <span className="text-sm text-muted">seconds (acknowledged in MVP — swap for BullMQ in prod)</span>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add-step bar */}
          <div className="flex justify-center mt-3">
            <div className="inline-flex gap-1.5 rounded-md border border-border bg-card p-1">
              {(Object.keys(STEP_META) as Step["type"][]).map((t) => {
                const meta = STEP_META[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addStep(t)}
                    className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-border/40 transition"
                  >
                    <Plus className="h-3 w-3 text-muted" />
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create automation"}</Button>
    </form>
  );
}
