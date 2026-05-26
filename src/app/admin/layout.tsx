import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (!user.isSuperAdmin) redirect("/app");

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center gap-4">
          <Link href="/admin" className="font-semibold flex items-center gap-2">
            <span className="inline-block h-5 w-5 rounded bg-danger" />
            Launchstack · Admin
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/admin" className="text-fg/80 hover:text-fg">Tenants</Link>
            <Link href="/admin/audit" className="text-fg/80 hover:text-fg">Audit</Link>
          </nav>
          <div className="flex-1" />
          <Link href="/app" className="text-sm text-muted hover:text-fg">← Back to app</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
