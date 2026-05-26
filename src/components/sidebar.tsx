"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Workflow, Users, Mail, Bot, FileText, BarChart3, Globe2, Link2, Settings, Store,
} from "lucide-react";

const items = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/funnels", label: "Funnels", icon: Workflow },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/automations", label: "Automations", icon: Bot },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/domains", label: "Domains", icon: Globe2 },
  { href: "/offers", label: "Offers", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname();
  const base = `/t/${tenantSlug}`;
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
      <Link href="/app" className="h-14 flex items-center gap-2 px-5 border-b border-border font-semibold">
        <span className="inline-block h-5 w-5 rounded bg-primary" />
        Launchstack
      </Link>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const full = `${base}${href}`;
          const active = href === "" ? pathname === full : pathname.startsWith(full);
          return (
            <Link
              key={href}
              href={full}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
                active ? "bg-primary/10 text-primary font-medium" : "text-fg/80 hover:bg-border/40",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border text-xs text-muted">v0.1 · MVP</div>
    </aside>
  );
}
