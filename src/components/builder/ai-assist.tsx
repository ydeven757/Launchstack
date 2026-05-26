"use client";

import { useState, useTransition } from "react";
import { Sparkles, X, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Label } from "@/components/ui/input";
import { generateCopyAction } from "@/server/actions/ai";
import { cn } from "@/lib/utils";
import type { AICopyKind } from "@/server/services/ai-copy";

export function AIAssist({
  kind,
  currentValue,
  context,
  onPick,
  align = "right",
}: {
  kind: AICopyKind;
  currentValue?: string;
  context?: { niche?: string; offer?: string; angle?: string };
  onPick: (value: string) => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [results, setResults] = useState<string[] | null>(null);
  const [tone, setTone] = useState<"direct" | "story" | "punchy" | "professional">("direct");
  const [offer, setOffer] = useState(context?.offer ?? "");
  const [angle, setAngle] = useState(context?.angle ?? "");
  const [source, setSource] = useState<"anthropic" | "fallback" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      const r = await generateCopyAction({
        kind,
        context: { ...context, tone, offer: offer || undefined, angle: angle || undefined },
        existing: currentValue,
        variations: 3,
      });
      if ("error" in r) { setError(r.error); return; }
      setResults(r.variations);
      setSource(r.source);
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!results && !open) run(); }}
        className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary hover:bg-primary/10 transition"
        title="AI copy assist"
      >
        <Sparkles className="h-3 w-3" />
        AI
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 mt-1.5 w-80 rounded-lg border border-border bg-card shadow-xl p-3",
          align === "right" ? "right-0" : "left-0",
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> {kind.replace(/_/g, " ")}
            </div>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-border/40 text-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <Label className="text-[10px]">Tone</Label>
              <Select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="h-7 text-xs">
                <option value="direct">Direct</option>
                <option value="story">Story</option>
                <option value="punchy">Punchy</option>
                <option value="professional">Professional</option>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Offer / promise</Label>
              <input
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                className="h-7 w-full rounded-md border border-border bg-card px-2 text-xs"
                placeholder="e.g. weight loss"
              />
            </div>
          </div>
          <div className="mb-2">
            <Label className="text-[10px]">Angle hint (optional)</Label>
            <Textarea value={angle} onChange={(e) => setAngle(e.target.value)} rows={2} className="text-xs" placeholder="e.g. focus on busy parents" />
          </div>

          <div className="flex items-center justify-between mb-2">
            <Button size="sm" variant="outline" onClick={run} disabled={pending} className="text-xs h-7">
              <RefreshCw className={cn("h-3 w-3", pending && "animate-spin")} />
              {pending ? "Generating…" : "Generate"}
            </Button>
            {source && (
              <span className="text-[10px] text-muted">
                {source === "anthropic" ? "via Claude" : "fallback (no key)"}
              </span>
            )}
          </div>

          {error && <p className="text-xs text-danger mb-2">{error}</p>}

          {results && results.length > 0 && (
            <div className="space-y-1.5 max-h-72 overflow-auto">
              {results.map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onPick(v); setOpen(false); }}
                  className="w-full text-left rounded-md border border-border hover:border-primary hover:bg-primary/5 p-2 text-xs transition"
                >
                  <div className="flex items-start gap-2">
                    <Check className="h-3 w-3 mt-0.5 text-primary shrink-0 opacity-0 group-hover:opacity-100" />
                    <span className="whitespace-pre-wrap leading-relaxed">{v}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
