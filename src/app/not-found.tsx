import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="text-center max-w-md">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you were looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="mt-6 inline-block">
          <Button>Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
