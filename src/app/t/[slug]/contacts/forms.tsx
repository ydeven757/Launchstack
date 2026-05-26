"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createContactAction, createTagAction } from "@/server/actions/contacts";

export function CreateContactForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      action={(fd) => {
        setError(null);
        start(async () => {
          const r = await createContactAction(fd);
          if (r?.error) setError(r.error);
          else (document.activeElement as HTMLElement)?.blur();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
        <div><Label htmlFor="firstName">First name</Label><Input id="firstName" name="firstName" /></div>
        <div><Label htmlFor="lastName">Last name</Label><Input id="lastName" name="lastName" /></div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue="LEAD">
            <option value="LEAD">Lead</option><option value="ENGAGED">Engaged</option>
            <option value="CUSTOMER">Customer</option><option value="UNSUBSCRIBED">Unsubscribed</option>
          </Select>
        </div>
        <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" /></div>
        <div className="col-span-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add contact"}</Button>
    </form>
  );
}

export function CreateTagForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2 items-end"
      action={(fd) => {
        setError(null);
        start(async () => {
          const r = await createTagAction(fd);
          if (r?.error) setError(r.error);
        });
      }}
    >
      <div className="flex-1"><Label htmlFor="tag-name">Name</Label><Input id="tag-name" name="name" placeholder="e.g. webinar-attendee" required /></div>
      <div><Label htmlFor="tag-color">Color</Label><Input id="tag-color" name="color" type="color" defaultValue="#2563eb" className="h-9 w-12 p-0.5" /></div>
      <Button type="submit" disabled={pending} size="sm">{pending ? "Adding…" : "Add tag"}</Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
