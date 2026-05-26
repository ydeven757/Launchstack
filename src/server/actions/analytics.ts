"use server";

import { requireTenant, tenantDb } from "../tenant";

export type DashboardStats = {
  totalContacts: number;
  newContacts7d: number;
  totalVisitors7d: number;
  totalFormSubmits7d: number;
  optInRate: number;
  topPages: { id: string; name: string; visits: number; submits: number }[];
  topSources: { source: string; count: number }[];
  daily: { date: string; visits: number; submits: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getDashboardStats(range = 7): Promise<DashboardStats> {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const since = new Date(Date.now() - range * DAY_MS);

  const [totalContacts, newContacts, events] = await Promise.all([
    db.contact.count(),
    db.contact.count({ where: { createdAt: { gte: since } } }),
    db.event.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, type: true, pageId: true, utmSource: true, createdAt: true },
    }),
  ]);

  const visits = events.filter(e => e.type === "page_view");
  const submits = events.filter(e => e.type === "form_submit");

  const optInRate = visits.length === 0 ? 0 : submits.length / visits.length;

  // Top pages
  const pageMap = new Map<string, { visits: number; submits: number }>();
  for (const e of events) {
    if (!e.pageId) continue;
    const cur = pageMap.get(e.pageId) ?? { visits: 0, submits: 0 };
    if (e.type === "page_view") cur.visits += 1;
    if (e.type === "form_submit") cur.submits += 1;
    pageMap.set(e.pageId, cur);
  }
  const pageIds = Array.from(pageMap.keys());
  const pages = pageIds.length > 0
    ? await db.page.findMany({ where: { id: { in: pageIds } }, select: { id: true, name: true } })
    : [];
  const topPages = pages.map(p => ({ id: p.id, name: p.name, ...(pageMap.get(p.id) ?? { visits: 0, submits: 0 }) }))
    .sort((a, b) => b.visits - a.visits).slice(0, 5);

  // Top sources
  const srcMap = new Map<string, number>();
  for (const e of events) {
    const src = e.utmSource ?? "(direct)";
    srcMap.set(src, (srcMap.get(src) ?? 0) + 1);
  }
  const topSources = Array.from(srcMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count).slice(0, 5);

  // Daily trend
  const daily: Map<string, { visits: number; submits: number }> = new Map();
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    daily.set(d.toISOString().slice(0, 10), { visits: 0, submits: 0 });
  }
  for (const e of events) {
    const k = new Date(e.createdAt).toISOString().slice(0, 10);
    const cur = daily.get(k);
    if (!cur) continue;
    if (e.type === "page_view") cur.visits += 1;
    if (e.type === "form_submit") cur.submits += 1;
  }

  return {
    totalContacts,
    newContacts7d: newContacts,
    totalVisitors7d: visits.length,
    totalFormSubmits7d: submits.length,
    optInRate,
    topPages,
    topSources,
    daily: Array.from(daily.entries()).map(([date, v]) => ({ date, ...v })),
  };
}

export async function getFunnelReport(funnelId: string) {
  const ctx = await requireTenant();
  const db = tenantDb(ctx.tenant.id);
  const pages = await db.page.findMany({
    where: { funnelId },
    orderBy: { position: "asc" },
    select: { id: true, name: true, type: true, position: true },
  });
  const pageIds = pages.map(p => p.id);
  if (pageIds.length === 0) return { funnelId, steps: [] as { id: string; name: string; type: string; visits: number; submits: number; convRate: number; dropoff: number }[] };

  const events = await db.event.findMany({
    where: { pageId: { in: pageIds }, type: { in: ["page_view", "form_submit"] } },
    select: { pageId: true, type: true },
  });

  const stats = new Map<string, { visits: number; submits: number }>();
  for (const e of events) {
    const k = e.pageId!;
    const cur = stats.get(k) ?? { visits: 0, submits: 0 };
    if (e.type === "page_view") cur.visits += 1;
    if (e.type === "form_submit") cur.submits += 1;
    stats.set(k, cur);
  }

  let prevVisits = pages[0] ? (stats.get(pages[0].id)?.visits ?? 0) : 0;
  const steps = pages.map((p) => {
    const s = stats.get(p.id) ?? { visits: 0, submits: 0 };
    const dropoff = prevVisits === 0 ? 0 : Math.max(0, 1 - s.visits / prevVisits);
    prevVisits = s.visits;
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      visits: s.visits,
      submits: s.submits,
      convRate: s.visits === 0 ? 0 : s.submits / s.visits,
      dropoff,
    };
  });

  return { funnelId, steps };
}
