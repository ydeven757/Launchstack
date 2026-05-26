"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, Input, Label } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { cloneFunnelToTenantAction } from "@/server/actions/clone";

export function CloneFunnelButton({ funnelId, sourceTenantId, allTenants }: {
  funnelId: string;
  sourceTenantId: string;
  allTenants: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const targets = allTenants.filter((t) => t.id !== sourceTenantId);
  const [target, setTarget] = useState<string>(targets[0]?.id ?? "");
  const [name, setName] = useState<string>("");

  if (targets.length === 0) {
    return (
      <Button size="sm" variant="outline" disabled title="Create a second workspace to clone funnels across">
        <Copy className="h-3.5 w-3.5" />Clone to workspace
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
        <Copy className="h-3.5 w-3.5" />Clone to workspace
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 rounded-lg border border-border bg-card shadow-xl p-3 z-50 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Clone to another workspace</div>
          <div>
            <Label>Target workspace</Label>
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>New name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave blank for '… (cloned)'" />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const r = await cloneFunnelToTenantAction({ sourceFunnelId: funnelId, targetTenantId: target, newName: name || undefined });
                  if ("error" in r && r.error) { setError(r.error); return; }
                  if ("ok" in r && r.ok) router.push(`/t/${r.targetSlug}/funnels/${r.funnelId}`);
                });
              }}>
              {pending ? "Cloning…" : "Clone"}
            </Button>
          </div>
          <p className="text-[10px] text-muted">Structural assets only — contacts and analytics never cross workspaces.</p>
        </div>
      )}
    </div>
  );
}
