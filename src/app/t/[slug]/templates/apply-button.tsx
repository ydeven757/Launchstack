"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { applyBuiltinTemplateAction } from "@/server/actions/templates";

export function ApplyTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await applyBuiltinTemplateAction(templateId);
          if (r?.error) setMsg(r.error);
          else { setMsg("Applied — new funnel created"); router.refresh(); }
        })}
      >
        {pending ? "Applying…" : "Apply to workspace"}
      </Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
