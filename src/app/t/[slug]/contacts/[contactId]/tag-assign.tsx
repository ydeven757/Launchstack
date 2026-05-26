"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTagAction, removeTagAction } from "@/server/actions/contacts";

export function TagAssign({
  contactId,
  allTags,
  assignedTagIds,
}: {
  contactId: string;
  allTags: { id: string; name: string; color: string }[];
  assignedTagIds: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = new Set(assignedTagIds);
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted">Click to toggle</div>
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((t) => {
          const on = set.has(t.id);
          return (
            <button
              key={t.id}
              disabled={pending}
              onClick={() => start(async () => {
                if (on) await removeTagAction(contactId, t.id);
                else await addTagAction(contactId, t.id);
                router.refresh();
              })}
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
      {allTags.length === 0 && <p className="text-xs text-muted mt-1">No tags defined. Create one on the contacts page.</p>}
    </div>
  );
}
