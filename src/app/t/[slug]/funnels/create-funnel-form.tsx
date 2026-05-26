"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFunnelAction } from "@/server/actions/funnels";

export function CreateFunnelForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      action={(fd) => {
        setError(null);
        start(async () => {
          const r = await createFunnelAction(fd);
          if (r?.error) setError(r.error);
        });
      }}
    >
      <Input name="name" placeholder="Funnel name (e.g. Lead Magnet — Newsletter)" required className="flex-1" />
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create funnel"}</Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
