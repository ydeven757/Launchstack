import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-5 w-5 rounded bg-primary" />
            Launchstack
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">{children}</main>
    </div>
  );
}
