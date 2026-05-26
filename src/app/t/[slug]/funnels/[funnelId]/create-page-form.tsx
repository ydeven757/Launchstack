"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { createPageAction } from "@/server/actions/pages";

export function CreatePageForm({ funnelId }: { funnelId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2"
      action={(fd) => {
        setError(null);
        fd.set("funnelId", funnelId);
        start(async () => {
          const r = await createPageAction(fd);
          if (r?.error) setError(r.error);
        });
      }}
    >
      <Input name="name" placeholder="Page name (e.g. Free Guide Opt-In)" required />
      <Select name="type" defaultValue="OPT_IN">
        <option value="OPT_IN">Opt-in</option>
        <option value="BRIDGE">Bridge</option>
        <option value="ADVERTORIAL">Advertorial</option>
        <option value="THANK_YOU">Thank You</option>
        <option value="CONFIRMATION">Confirmation</option>
        <option value="REVIEW">Review</option>
        <option value="BLOG_POST">Blog Post</option>
        <option value="HOME">Home</option>
        <option value="CUSTOM">Custom</option>
      </Select>
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add page"}</Button>
      {error && <p className="text-sm text-danger col-span-full">{error}</p>}
    </form>
  );
}
