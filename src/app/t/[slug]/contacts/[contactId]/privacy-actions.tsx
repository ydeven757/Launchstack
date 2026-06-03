"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, ShieldAlert } from "lucide-react";
import { exportContactDataAction, eraseContactAction } from "@/server/actions/privacy";

export function PrivacyActions({ contactId, contactEmail }: { contactId: string; contactEmail: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function exportData() {
    setMsg(null);
    start(async () => {
      const r = await exportContactDataAction(contactId);
      if ("error" in r && r.error) { setMsg(r.error); return; }
      if (!("ok" in r) || !r.ok) return;
      const blob = new Blob([JSON.stringify(r.payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dsar-${contactEmail.replace(/[^a-z0-9@.]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Export downloaded");
    });
  }

  function erase() {
    setMsg(null);
    const confirmed = prompt(
      `Type "ERASE ${contactEmail}" to permanently delete this contact + all activity, events, emails, and visitor stitching. The email will be hashed and added to the suppression list so future submissions don't recreate it.`,
    );
    if (confirmed !== `ERASE ${contactEmail}`) { setMsg("Erasure cancelled"); return; }
    start(async () => {
      const r = await eraseContactAction(contactId);
      if ("error" in r && r.error) { setMsg(r.error); return; }
      router.push(`/t/${window.location.pathname.split("/")[2]}/contacts`);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={exportData} disabled={pending}>
          <Download className="h-3.5 w-3.5" /> Export data (DSAR)
        </Button>
        <Button size="sm" variant="danger" onClick={erase} disabled={pending}>
          <ShieldAlert className="h-3.5 w-3.5" /> Erase (right-to-be-forgotten)
        </Button>
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
