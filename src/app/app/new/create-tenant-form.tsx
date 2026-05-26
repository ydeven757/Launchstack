"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, Sparkles } from "lucide-react";
import { createTenantAction } from "@/server/actions/tenants";
import { cn } from "@/lib/utils";

type Tpl = { id: string; name: string; description: string | null; niche: string | null; trafficSource: string | null; funnelType: string | null };

const NICHES = [
  { v: "Health & Fitness",     emoji: "💪", traffic: "Paid Social" },
  { v: "Weight Loss",          emoji: "⚖️", traffic: "Native Ads" },
  { v: "Supplements",          emoji: "💊", traffic: "Paid Social" },
  { v: "Personal Finance",     emoji: "💰", traffic: "Native Ads" },
  { v: "Credit & Loans",       emoji: "💳", traffic: "Organic Search" },
  { v: "Make Money Online",    emoji: "🚀", traffic: "Paid Social" },
  { v: "Crypto & Trading",     emoji: "₿",  traffic: "Paid Search" },
  { v: "Real Estate Investing", emoji: "🏠", traffic: "Paid Social" },
  { v: "Survival & Self-Defense", emoji: "🔥", traffic: "Native Ads" },
  { v: "Dating & Relationships", emoji: "❤️", traffic: "Paid Social" },
  { v: "Spirituality",         emoji: "🔮", traffic: "Paid Social" },
  { v: "Beauty & Skincare",    emoji: "💄", traffic: "Native Ads" },
  { v: "Pet & Animal Care",    emoji: "🐶", traffic: "Paid Social" },
  { v: "Gardening & Homestead", emoji: "🌱", traffic: "Organic Search" },
  { v: "Software & SaaS",      emoji: "⚙️", traffic: "Organic Search" },
  { v: "E-Commerce",           emoji: "🛒", traffic: "Organic Search" },
  { v: "Online Coaching",      emoji: "🎯", traffic: "Email & Paid" },
  { v: "Tech & Software",      emoji: "💻", traffic: "Organic Search" },
  { v: "Lifestyle",            emoji: "✨", traffic: "Organic Search" },
];

export function CreateTenantForm({ templates }: { templates: Tpl[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [name, setName] = useState("");
  const [niche, setNiche] = useState<string>("");
  const [trafficSource, setTrafficSource] = useState<string>("");
  const [conversionGoal, setConversionGoal] = useState<string>("");
  const [tplId, setTplId] = useState<string>("");

  // Filter templates by chosen niche
  const matching = niche ? templates.filter((t) => t.niche === niche) : templates;
  const recommended = matching[0];

  function next() {
    setError(null);
    if (step === 1) {
      if (!name.trim()) return setError("Give your workspace a name");
      if (!niche) return setError("Pick a niche");
      setStep(2);
    } else if (step === 2) {
      if (!conversionGoal) return setError("Pick a primary goal");
      setStep(3);
    }
  }

  function submit() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("niche", niche);
      fd.set("trafficSource", trafficSource);
      fd.set("conversionGoal", conversionGoal);
      if (tplId) fd.set("starterTemplateId", tplId);
      const res = await createTenantAction(fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-1.5 text-xs">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center font-medium",
              step >= s ? "bg-primary text-primary-fg" : "bg-border/40 text-muted",
            )}>
              {step > s ? <Check className="h-3.5 w-3.5" /> : s}
            </div>
            {s < 3 && <div className={cn("w-12 h-px", step > s ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
        <div className="ml-3 text-muted">
          {step === 1 && "Workspace + niche"}
          {step === 2 && "Traffic + goal"}
          {step === 3 && "Pick a starter funnel"}
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>What&apos;s the site called?</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FitCoach Studio, Money Edge, …" required autoFocus />
            <p className="text-xs text-muted mt-1">Visible to you. Public visitors see this in the footer.</p>
          </div>

          <div>
            <Label>Pick a niche</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NICHES.map((n) => (
                <button
                  key={n.v}
                  type="button"
                  onClick={() => { setNiche(n.v); if (!trafficSource) setTrafficSource(n.traffic); }}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition",
                    niche === n.v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="text-lg">{n.emoji}</span>
                  <span className="truncate">{n.v}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Primary traffic source</Label>
            <Select value={trafficSource} onChange={(e) => setTrafficSource(e.target.value)}>
              <option value="">Select…</option>
              <option>Paid Social</option>
              <option>Native Ads</option>
              <option>Organic Search</option>
              <option>Paid Search</option>
              <option>Email</option>
              <option>YouTube</option>
              <option>Influencer</option>
              <option>Email & Paid</option>
            </Select>
            <p className="text-xs text-muted mt-1">We&apos;ll suggest templates designed for this source.</p>
          </div>

          <div>
            <Label>Primary goal</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { v: "Email opt-in", d: "Build a list, sell later" },
                { v: "Affiliate sale", d: "Direct to a network offer" },
                { v: "Webinar registration", d: "High-ticket pre-sell" },
                { v: "Free trial", d: "SaaS / subscription affiliate" },
              ].map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setConversionGoal(g.v)}
                  className={cn(
                    "rounded-md border px-3 py-3 text-left text-sm transition",
                    conversionGoal === g.v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="font-medium">{g.v}</div>
                  <div className="text-xs text-muted mt-0.5">{g.d}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="!mb-0 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Starter funnels matching your niche
            </Label>
            <button type="button" onClick={() => setTplId("")} className="text-xs text-muted hover:text-fg">
              Start empty instead
            </button>
          </div>

          {recommended && (
            <div className="rounded-md border-2 border-primary bg-primary/5 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">⭐ Recommended for you</span>
                <Badge>{recommended.funnelType}</Badge>
              </div>
              <div className="text-sm">{recommended.name}</div>
              <div className="text-xs text-muted mt-1">{recommended.description}</div>
              <Button size="sm" className="mt-2" onClick={() => setTplId(recommended.id)} variant={tplId === recommended.id ? "primary" : "outline"}>
                {tplId === recommended.id ? <><Check className="h-3.5 w-3.5" />Selected</> : "Use this"}
              </Button>
            </div>
          )}

          {matching.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matching.slice(1, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTplId(t.id)}
                  className={cn(
                    "text-left rounded-md border p-3 hover:border-primary transition",
                    tplId === t.id ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted">{t.funnelType}</div>
                  {t.description && <div className="text-xs text-muted mt-1 line-clamp-2">{t.description}</div>}
                </button>
              ))}
            </div>
          )}

          {tplId === "" && (
            <p className="text-xs text-muted">You can apply any template later from the Templates page.</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="ghost" size="sm" disabled={step === 1 || pending}
          onClick={() => setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3)))}>
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </Button>
        {step < 3 ? (
          <Button onClick={next} disabled={pending}>
            Continue <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending}>
            {pending ? "Creating workspace…" : "Create workspace & launch"}
          </Button>
        )}
      </div>
    </div>
  );
}
