"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Type, Image as ImageIcon, MousePointerClick, AlignCenter, Video, Minus,
  ListChecks, Quote, MoveVertical, Code2, Trash2, ArrowUp, ArrowDown, Eye, Save,
  Globe, ChevronUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BlockTree, type Block } from "./block-renderer";
import { AIAssist } from "./ai-assist";
import {
  updatePageAction, publishPageAction, unpublishPageAction, deletePageAction,
} from "@/server/actions/pages";
import { cn } from "@/lib/utils";

type PageState = "DRAFT" | "PUBLISHED";

const BLOCK_PRESETS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; props: Record<string, unknown> }> = {
  hero:        { label: "Hero",        icon: AlignCenter,       props: { headline: "New headline", subhead: "Subheadline goes here.", align: "center" } },
  text:        { label: "Text",        icon: Type,              props: { body: "Add a paragraph of text…" } },
  form:        { label: "Form",        icon: ListChecks,        props: { fields: ["email"], submitLabel: "Subscribe", placeholder: "Email address" } },
  cta:         { label: "Button (CTA)",icon: MousePointerClick, props: { label: "Click here", href: "#", style: "primary" } },
  image:       { label: "Image",       icon: ImageIcon,         props: { src: "", alt: "" } },
  video:       { label: "Video",       icon: Video,             props: { url: "" } },
  testimonial: { label: "Testimonial", icon: Quote,             props: { quote: "Quote here", attribution: "Name" } },
  divider:     { label: "Divider",     icon: Minus,             props: {} },
  spacer:      { label: "Spacer",      icon: MoveVertical,      props: { height: 48 } },
  html:        { label: "Custom HTML", icon: Code2,             props: { html: "" } },
};

export function PageEditor(props: {
  pageId: string;
  initialName: string;
  initialSlug: string;
  initialType: string;
  initialState: PageState;
  initialBlocks: Block[];
  initialSeoTitle: string | null;
  initialSeoDescription: string | null;
  tenantSlug: string;
  brandPrimary: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(props.initialName);
  const [slug, setSlug] = useState(props.initialSlug);
  const [blocks, setBlocks] = useState<Block[]>(props.initialBlocks);
  const [seoTitle, setSeoTitle] = useState(props.initialSeoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(props.initialSeoDescription ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(props.initialBlocks[0]?.id ?? null);
  const [state, setState] = useState<PageState>(props.initialState);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [seoOpen, setSeoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [publishing, startPub] = useTransition();
  const [deleting, startDel] = useTransition();

  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  function addBlock(type: string) {
    const preset = BLOCK_PRESETS[type];
    if (!preset) return;
    const nb: Block = { id: `b_${Math.random().toString(36).slice(2, 9)}`, type, props: { ...preset.props } };
    setBlocks((bs) => [...bs, nb]);
    setSelectedId(nb.id);
  }
  function removeBlock(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }
  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((bs) => {
      const idx = bs.findIndex((b) => b.id === id);
      if (idx < 0) return bs;
      const ni = idx + dir;
      if (ni < 0 || ni >= bs.length) return bs;
      const next = [...bs];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
  }
  function updateProp(key: string, value: unknown) {
    if (!selected) return;
    setBlocks((bs) => bs.map((b) => (b.id === selected.id ? { ...b, props: { ...(b.props ?? {}), [key]: value } } : b)));
  }
  function updateFields(fields: string[]) {
    updateProp("fields", fields);
  }

  function save() {
    setError(null);
    startSave(async () => {
      const r = await updatePageAction({
        pageId: props.pageId, name, slug, blocks, seoTitle: seoTitle || null, seoDescription: seoDescription || null,
      });
      if ("error" in r && r.error) { setError(r.error); return; }
      setState("DRAFT");
      router.refresh();
    });
  }

  function publish() {
    setError(null);
    startPub(async () => {
      // Save first, then publish
      const s = await updatePageAction({ pageId: props.pageId, name, slug, blocks, seoTitle: seoTitle || null, seoDescription: seoDescription || null });
      if ("error" in s && s.error) { setError(s.error); return; }
      const r = await publishPageAction(props.pageId);
      if ("error" in r && r.error) { setError(r.error); return; }
      setState("PUBLISHED");
      router.refresh();
    });
  }
  function unpublish() {
    startPub(async () => {
      const r = await unpublishPageAction(props.pageId);
      if ("error" in r && r.error) { setError(r.error as string); return; }
      setState("DRAFT");
      router.refresh();
    });
  }
  function del() {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    startDel(async () => {
      await deletePageAction(props.pageId);
      router.push(`/t/${props.tenantSlug}/funnels`);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px] gap-4 min-h-[80vh]">
      {/* Left rail: block palette + page tree */}
      <div className="space-y-4">
        <Card className="p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted px-1 pb-2">Add block</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(BLOCK_PRESETS).map(([type, p]) => {
              const Icon = p.icon;
              return (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition text-xs"
                >
                  <Icon className="h-4 w-4" />
                  {p.label}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted px-1 pb-2">Page tree</div>
          {blocks.length === 0 ? (
            <p className="text-xs text-muted px-1 py-2">Add a block to begin.</p>
          ) : (
            <ol className="space-y-1">
              {blocks.map((b, i) => {
                const Icon = BLOCK_PRESETS[b.type]?.icon ?? Type;
                return (
                  <li
                    key={b.id}
                    draggable
                    onClick={() => setSelectedId(b.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/blockid", b.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData("text/blockid");
                      if (!draggedId || draggedId === b.id) return;
                      setBlocks((bs) => {
                        const from = bs.findIndex((x) => x.id === draggedId);
                        const to = bs.findIndex((x) => x.id === b.id);
                        if (from < 0 || to < 0) return bs;
                        const next = [...bs];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        return next;
                      });
                    }}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing text-sm select-none",
                      selectedId === b.id ? "bg-primary/10 text-primary" : "hover:bg-border/40",
                    )}
                    title="Drag to reorder"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="flex-1 truncate capitalize">{b.type}</span>
                    <span className="text-xs text-muted">{i + 1}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>

      {/* Center: preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-md font-medium" placeholder="Page name" />
          <Badge variant={state === "PUBLISHED" ? "success" : "secondary"}>{state}</Badge>
          <div className="flex-1" />
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button onClick={() => setDevice("desktop")} className={cn("px-3 py-1.5 text-xs", device === "desktop" ? "bg-primary/10 text-primary" : "hover:bg-border/40")}>Desktop</button>
            <button onClick={() => setDevice("mobile")} className={cn("px-3 py-1.5 text-xs border-l border-border", device === "mobile" ? "bg-primary/10 text-primary" : "hover:bg-border/40")}>Mobile</button>
          </div>
          <Button variant="outline" size="sm" onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save draft"}
          </Button>
          {state === "PUBLISHED" ? (
            <Button size="sm" variant="outline" onClick={unpublish} disabled={publishing}>Unpublish</Button>
          ) : (
            <Button size="sm" onClick={publish} disabled={publishing}>{publishing ? "Publishing…" : "Publish"}</Button>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className={cn("mx-auto bg-bg border border-border rounded-lg p-4 overflow-auto", device === "mobile" ? "max-w-sm" : "max-w-3xl")}>
          <BlockTree blocks={blocks} mode="preview" tenantSlug={props.tenantSlug} brandPrimary={props.brandPrimary} />
        </div>

        <div className="flex items-center gap-2 justify-between text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span>Preview URL: <code className="text-fg">/p/{props.tenantSlug}/{slug}</code></span>
          </div>
          <Button variant="ghost" size="sm" onClick={del} disabled={deleting} className="text-danger hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" />Delete page
          </Button>
        </div>
      </div>

      {/* Right rail: inspector */}
      <div className="space-y-4">
        <Card className="p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted px-1 pb-2">Inspector</div>
          {!selected ? (
            <p className="text-xs text-muted px-1 py-2">Select a block to edit its properties.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <Badge variant="outline">{selected.type}</Badge>
                <div className="flex gap-1">
                  <button onClick={() => moveBlock(selected.id, -1)} className="p-1 rounded hover:bg-border/40"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => moveBlock(selected.id, 1)} className="p-1 rounded hover:bg-border/40"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button onClick={() => removeBlock(selected.id)} className="p-1 rounded hover:bg-border/40 text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              {selected.type === "hero" && (
                <>
                  <Field label="Headline" ai={
                    <AIAssist kind="headline" currentValue={(selected.props?.headline as string) ?? ""}
                      onPick={(v) => updateProp("headline", v)} />
                  }>
                    <Input value={(selected.props?.headline as string) ?? ""} onChange={(e) => updateProp("headline", e.target.value)} />
                  </Field>
                  <Field label="Subhead" ai={
                    <AIAssist kind="subheadline" currentValue={(selected.props?.subhead as string) ?? ""}
                      onPick={(v) => updateProp("subhead", v)} />
                  }>
                    <Textarea value={(selected.props?.subhead as string) ?? ""} onChange={(e) => updateProp("subhead", e.target.value)} />
                  </Field>
                  <Field label="Alignment">
                    <Select value={(selected.props?.align as string) ?? "center"} onChange={(e) => updateProp("align", e.target.value)}>
                      <option value="center">Center</option><option value="left">Left</option>
                    </Select>
                  </Field>
                </>
              )}
              {selected.type === "text" && (
                <Field label="Body" ai={
                  <AIAssist kind="advertorial" currentValue={(selected.props?.body as string) ?? ""}
                    onPick={(v) => updateProp("body", v)} />
                }>
                  <Textarea rows={6} value={(selected.props?.body as string) ?? ""} onChange={(e) => updateProp("body", e.target.value)} />
                </Field>
              )}
              {selected.type === "form" && (
                <>
                  <Field label="Fields">
                    <div className="space-y-1.5">
                      {["email", "firstName", "lastName", "phone"].map((f) => {
                        const cur = (selected.props?.fields as string[]) ?? ["email"];
                        const checked = cur.includes(f);
                        return (
                          <label key={f} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={f === "email"}
                              onChange={(e) => {
                                const next = e.target.checked ? [...cur, f] : cur.filter((x) => x !== f);
                                updateFields(Array.from(new Set(next)));
                              }}
                            />
                            {f}
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Submit label"><Input value={(selected.props?.submitLabel as string) ?? ""} onChange={(e) => updateProp("submitLabel", e.target.value)} /></Field>
                  <Field label="Email placeholder"><Input value={(selected.props?.placeholder as string) ?? ""} onChange={(e) => updateProp("placeholder", e.target.value)} /></Field>
                </>
              )}
              {selected.type === "cta" && (
                <>
                  <Field label="Label" ai={
                    <AIAssist kind="cta" currentValue={(selected.props?.label as string) ?? ""}
                      onPick={(v) => updateProp("label", v)} />
                  }>
                    <Input value={(selected.props?.label as string) ?? ""} onChange={(e) => updateProp("label", e.target.value)} />
                  </Field>
                  <Field label="URL"><Input value={(selected.props?.href as string) ?? ""} onChange={(e) => updateProp("href", e.target.value)} /></Field>
                  <Field label="Style">
                    <Select value={(selected.props?.style as string) ?? "primary"} onChange={(e) => updateProp("style", e.target.value)}>
                      <option value="primary">Primary</option><option value="outline">Outline</option>
                    </Select>
                  </Field>
                </>
              )}
              {selected.type === "image" && (
                <>
                  <Field label="Image URL"><Input value={(selected.props?.src as string) ?? ""} onChange={(e) => updateProp("src", e.target.value)} placeholder="https://…" /></Field>
                  <Field label="Alt text"><Input value={(selected.props?.alt as string) ?? ""} onChange={(e) => updateProp("alt", e.target.value)} /></Field>
                </>
              )}
              {selected.type === "video" && (
                <Field label="Embed URL"><Input value={(selected.props?.url as string) ?? ""} onChange={(e) => updateProp("url", e.target.value)} placeholder="YouTube/Vimeo embed URL" /></Field>
              )}
              {selected.type === "testimonial" && (
                <>
                  <Field label="Quote"><Textarea value={(selected.props?.quote as string) ?? ""} onChange={(e) => updateProp("quote", e.target.value)} /></Field>
                  <Field label="Attribution"><Input value={(selected.props?.attribution as string) ?? ""} onChange={(e) => updateProp("attribution", e.target.value)} /></Field>
                </>
              )}
              {selected.type === "spacer" && (
                <Field label="Height (px)"><Input type="number" value={Number(selected.props?.height ?? 48)} onChange={(e) => updateProp("height", Number(e.target.value))} /></Field>
              )}
              {selected.type === "html" && (
                <Field label="HTML"><Textarea rows={8} value={(selected.props?.html as string) ?? ""} onChange={(e) => updateProp("html", e.target.value)} className="font-mono text-xs" /></Field>
              )}
            </div>
          )}
        </Card>

        <Card className="p-3">
          <button onClick={() => setSeoOpen((o) => !o)} className="w-full flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted">
            <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />Page settings &amp; SEO</span>
            {seoOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {seoOpen && (
            <div className="space-y-3 mt-3">
              <Field label="URL slug"><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
              <Field label="SEO title"><Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={120} /></Field>
              <Field label="SEO description"><Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={300} /></Field>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children, ai }: { label: string; children: React.ReactNode; ai?: React.ReactNode }) {
  return (
    <div className="px-1">
      <div className="flex items-center justify-between mb-1">
        <Label className="!mb-0">{label}</Label>
        {ai}
      </div>
      {children}
    </div>
  );
}
