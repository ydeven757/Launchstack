import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireTenant, tenantDb } from "@/server/tenant";
import { CreateAutomationForm } from "./create-automation-form";
import { ToggleAutomationButton, DeleteAutomationButton } from "./automation-actions";
import { safeJsonParse } from "@/lib/utils";

export default async function AutomationsPage() {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);

  const [automations, tags] = await Promise.all([
    db.automation.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { runs: true } } } }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Automations</h1>
        <p className="text-sm text-muted">Trigger → steps. Runs inline on event in MVP.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New automation</CardTitle>
          <CardDescription>Choose a trigger and steps that run when it fires.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAutomationForm tags={tags.map((t) => ({ id: t.id, name: t.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing automations</CardTitle></CardHeader>
        <CardContent>
          {automations.length === 0 ? (
            <EmptyState title="No automations yet" description="Try: when a form is submitted, send a welcome email and add a tag." />
          ) : (
            <ul className="divide-y divide-border">
              {automations.map((a) => {
                const steps = safeJsonParse<{ type: string }[]>(a.stepsJson, []);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{a.name}</span>
                        <Badge variant="outline">{a.trigger}</Badge>
                        <Badge variant={a.enabled ? "success" : "secondary"}>{a.enabled ? "ON" : "OFF"}</Badge>
                      </div>
                      <div className="text-xs text-muted mt-0.5">{steps.length} step{steps.length === 1 ? "" : "s"} · {a._count.runs} run{a._count.runs === 1 ? "" : "s"}</div>
                    </div>
                    <ToggleAutomationButton automationId={a.id} enabled={a.enabled} />
                    <DeleteAutomationButton automationId={a.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
