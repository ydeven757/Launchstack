"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[ui]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="text-center max-w-md">
        <p className="text-xs font-medium uppercase tracking-wide text-danger">Error</p>
        <h1 className="mt-2 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">An unexpected error occurred while loading this page.</p>
        {error.digest && <p className="mt-1 text-xs text-muted font-mono">ref: {error.digest}</p>}
        <div className="mt-6 flex gap-2 justify-center">
          <Button onClick={reset}>Try again</Button>
          <a href="/"><Button variant="outline">Home</Button></a>
        </div>
      </div>
    </div>
  );
}
