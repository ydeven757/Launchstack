"use client";

import { useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { restorePageVersionAction } from "@/server/actions/versions";
import { History } from "lucide-react";

export function RestoreVersionButton({ versionId, pageId }: { versionId: string; pageId: string }) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Restore this version? The current page state is snapshotted first, so the restore is itself reversible. Restored page goes back to DRAFT and must be re-published.")) return;
        start(async () => {
          const r = await restorePageVersionAction(versionId);
          if ("error" in r && r.error) { alert(r.error); return; }
          router.push(`/t/${params.slug}/pages/${pageId}/edit`);
        });
      }}
    >
      <History className="h-3.5 w-3.5" />
      {pending ? "Restoring…" : "Restore"}
    </Button>
  );
}
