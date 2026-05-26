import { cn } from "@/lib/utils";

export type Block = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
};

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
};

/**
 * Renders a single block. Used by both the editor preview and the live page
 * renderer at /p/[slug]. Public mode wires <form> to /api/forms/submit.
 */
export function BlockRenderer({
  block,
  mode,
  tenantSlug,
  pageId,
  brandPrimary,
}: {
  block: Block;
  mode: "preview" | "public";
  tenantSlug?: string;
  pageId?: string;
  brandPrimary?: string;
}) {
  const p = block.props ?? {};
  const accent = brandPrimary ?? "#2563eb";

  switch (block.type) {
    case "hero": {
      const align = (p.align as string) ?? "center";
      return (
        <div
          className={cn(
            "py-12 px-6 rounded-lg",
            align === "center" ? "text-center" : "text-left",
          )}
          style={{ background: `linear-gradient(180deg, ${accent}0d 0%, transparent 100%)` }}
        >
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{(p.headline as string) || "Your headline"}</h1>
          {p.subhead ? <p className="mt-3 text-lg text-muted max-w-2xl mx-auto">{p.subhead as string}</p> : null}
        </div>
      );
    }
    case "text": {
      return <div className="prose prose-sm max-w-none py-2 whitespace-pre-wrap">{(p.body as string) || "Add text…"}</div>;
    }
    case "form": {
      const fields = (Array.isArray(p.fields) ? p.fields : ["email"]) as string[];
      const submitLabel = (p.submitLabel as string) || "Subscribe";
      const placeholder = (p.placeholder as string) || "Email address";
      return (
        <form
          method="POST"
          action={mode === "public" ? "/api/forms/submit" : undefined}
          onSubmit={mode === "preview" ? (e) => e.preventDefault() : undefined}
          className="max-w-md mx-auto space-y-3 py-4"
        >
          {mode === "public" && (
            <>
              <input type="hidden" name="pageId" value={pageId} />
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
            </>
          )}
          {fields.map((f) => (
            <input
              key={f}
              name={f}
              type={f === "email" ? "email" : "text"}
              required={f === "email"}
              placeholder={f === "email" ? placeholder : FIELD_LABELS[f] || f}
              className="block w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm"
            />
          ))}
          <button
            type="submit"
            style={{ background: accent }}
            className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-white hover:opacity-95"
          >
            {submitLabel}
          </button>
        </form>
      );
    }
    case "cta": {
      const label = (p.label as string) || "Click here";
      const href = (p.href as string) || "#";
      const style = (p.style as string) ?? "primary";
      return (
        <div className="py-4 flex justify-center">
          <a
            href={href}
            style={style === "primary" ? { background: accent, color: "white" } : undefined}
            className={cn(
              "rounded-md px-6 py-3 text-sm font-medium",
              style === "primary" ? "hover:opacity-95" : "border border-border hover:bg-border/30",
            )}
          >
            {label}
          </a>
        </div>
      );
    }
    case "image": {
      const src = (p.src as string) ?? "";
      const alt = (p.alt as string) ?? "";
      if (!src) return <div className="py-6 text-center text-muted text-sm">No image set</div>;
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt} className="rounded-lg max-w-full mx-auto" />;
    }
    case "video": {
      const url = (p.url as string) ?? "";
      if (!url) return <div className="py-6 text-center text-muted text-sm">No video URL set</div>;
      return (
        <div className="aspect-video rounded-lg overflow-hidden border border-border">
          <iframe src={url} className="w-full h-full" allowFullScreen title="video" />
        </div>
      );
    }
    case "divider":
      return <hr className="my-6 border-border" />;
    case "spacer":
      return <div style={{ height: `${(p.height as number) ?? 48}px` }} />;
    case "testimonial": {
      return (
        <div className="border-l-4 border-primary pl-4 py-2 italic text-muted">
          “{(p.quote as string) || "Add a quote here."}” <span className="not-italic text-fg text-sm font-medium ml-2">— {(p.attribution as string) || "Anonymous"}</span>
        </div>
      );
    }
    case "faq": {
      const items = (Array.isArray(p.items) ? p.items : []) as { q: string; a: string }[];
      if (items.length === 0) return <div className="py-4 text-sm text-muted">Add FAQ items.</div>;
      return (
        <div className="divide-y divide-border border border-border rounded-lg">
          {items.map((it, i) => (
            <details key={i} className="p-4">
              <summary className="font-medium cursor-pointer">{it.q}</summary>
              <p className="mt-2 text-sm text-muted">{it.a}</p>
            </details>
          ))}
        </div>
      );
    }
    case "html": {
      return <div dangerouslySetInnerHTML={{ __html: (p.html as string) || "" }} />;
    }
    default:
      return <div className="py-2 text-sm text-muted">Unknown block: {block.type}</div>;
  }
}

export function BlockTree({
  blocks,
  mode,
  tenantSlug,
  pageId,
  brandPrimary,
}: {
  blocks: Block[];
  mode: "preview" | "public";
  tenantSlug?: string;
  pageId?: string;
  brandPrimary?: string;
}) {
  if (blocks.length === 0) {
    return <div className="py-16 text-center text-muted text-sm">No content yet. Add a block from the panel.</div>;
  }
  return (
    <div className="space-y-3">
      {blocks.map((b) => (
        <BlockRenderer key={b.id} block={b} mode={mode} tenantSlug={tenantSlug} pageId={pageId} brandPrimary={brandPrimary} />
      ))}
    </div>
  );
}
