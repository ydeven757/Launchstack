"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { switchTenantAction } from "@/server/actions/tenants";
import { cn } from "@/lib/utils";

type T = { id: string; slug: string; name: string; brandPrimary: string };

export function TopBar({
  tenants,
  currentTenantId,
  userName,
  isSuperAdmin,
}: {
  tenants: T[];
  currentTenantId: string;
  userName: string;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, start] = useTransition();
  const current = tenants.find((t) => t.id === currentTenantId);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3">
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-border/40 transition-colors text-sm"
        >
          <span className="inline-block h-5 w-5 rounded" style={{ background: current?.brandPrimary }} />
          <span className="font-medium max-w-[180px] truncate">{current?.name ?? "Workspace"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted" />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1.5 w-72 rounded-lg border border-border bg-card shadow-lg z-50 p-1">
            <div className="text-xs uppercase tracking-wide text-muted px-2 py-1.5">Workspaces</div>
            {tenants.map((t) => (
              <button
                key={t.id}
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    await switchTenantAction(t.id);
                    setOpen(false);
                    router.push(`/t/${t.slug}`);
                  });
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-border/40 text-left text-sm",
                  t.id === currentTenantId && "bg-primary/5",
                )}
              >
                <span className="inline-block h-4 w-4 rounded" style={{ background: t.brandPrimary }} />
                <span className="flex-1 truncate">{t.name}</span>
                {t.id === currentTenantId && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <Link
                href="/app/new"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-border/40 text-sm"
              >
                <Plus className="h-3.5 w-3.5" /> New workspace
              </Link>
              <Link
                href="/app"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-border/40 text-sm text-muted"
              >
                Manage workspaces
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {isSuperAdmin && (
        <Link href="/admin">
          <Button variant="outline" size="sm">Admin</Button>
        </Link>
      )}

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center"
        >
          {userName.slice(0, 1).toUpperCase()}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border border-border bg-card shadow-lg z-50 p-1">
            <div className="px-2 py-1.5 text-xs text-muted truncate">{userName}</div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-border/40"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
