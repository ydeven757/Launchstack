import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-5 w-5 rounded bg-primary" />
            Launchstack
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/signup"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-20">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
            Multi-site affiliate operating system
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight">
            Run every affiliate site from one dashboard.
          </h1>
          <p className="mt-4 text-lg text-muted">
            Funnels, pages, CRM, email, analytics, domains — one master account, many workspaces.
            Built for operators who manage portfolios, not a single site.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/signup"><Button size="lg">Start a workspace</Button></Link>
            <Link href="/login"><Button variant="outline" size="lg">Sign in</Button></Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { t: "Funnel + page builder", d: "Block-based pages. Opt-in, bridge, advertorial, review, blog." },
            { t: "CRM with tagging", d: "Tenant-scoped contacts, segmentation, activity timeline." },
            { t: "Email + automations", d: "Broadcasts, triggers on form submit / tag added." },
            { t: "Analytics", d: "Per-tenant dashboards. Funnel drop-off, top pages, sources." },
            { t: "Custom domains", d: "Multiple domains per tenant. System subdomain fallback." },
            { t: "Templates", d: "Niche × traffic source × funnel type. Save your own." },
          ].map((f) => (
            <div key={f.t} className="rounded-lg border border-border bg-card p-5">
              <div className="font-medium">{f.t}</div>
              <div className="mt-1 text-sm text-muted">{f.d}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between text-xs text-muted">
          <span>© Launchstack MVP</span>
          <span>Built with Next.js + Prisma</span>
        </div>
      </footer>
    </div>
  );
}
