import "server-only";

/**
 * Paperclip AI-engine client.
 *
 * Launchstack's AI copywriting can be powered by a Paperclip "Copywriter" agent
 * instead of (or in addition to) a direct Anthropic call. The flow:
 *
 *   1. `dispatchCopyTask` creates an issue in a dedicated Paperclip company,
 *      assigned to the copywriter agent, with the copy request in the description.
 *   2. `pollForResult` polls the issue until the agent marks it `done` (or a
 *      timeout elapses), then reads the result document the agent saved.
 *   3. The result document body is the same `---`-separated variation format the
 *      Anthropic path uses, so downstream parsing is identical.
 *
 * If any Paperclip env var is missing, `getPaperclipConfig()` returns null and
 * the caller falls through to Anthropic / the deterministic fallback — the app
 * still works with no AI key at all.
 */

export type PaperclipConfig = {
  apiUrl: string;
  boardToken: string;
  companyId: string;
  agentId: string;
  /** How long (ms) to poll for the agent to finish before giving up. */
  timeoutMs: number;
};

export function getPaperclipConfig(): PaperclipConfig | null {
  const apiUrl = process.env.PAPERCLIP_API_URL?.replace(/\/+$/, "");
  const boardToken = process.env.PAPERCLIP_BOARD_TOKEN;
  const companyId = process.env.PAPERCLIP_COPYWRITER_COMPANY_ID;
  const agentId = process.env.PAPERCLIP_COPYWRITER_AGENT_ID;
  if (!apiUrl || !boardToken || !companyId || !agentId) return null;
  const timeoutMs = Number(process.env.PAPERCLIP_COPY_TIMEOUT_MS ?? "90000");
  return { apiUrl, boardToken, companyId, agentId, timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 90000 };
}

const RESULT_DOC_KEY = "copy-result";

type Issue = {
  id: string;
  status: string;
};

async function paperclipFetch(
  cfg: PaperclipConfig,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${cfg.apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.boardToken}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Paperclip ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  }
  return res;
}

/**
 * Create a copywriting issue assigned to the copywriter agent and return its id.
 *
 * Paperclip silently drops `assigneeId` on issue CREATION (the issue lands in
 * `backlog`/unassigned and never wakes the agent), so we create first, then
 * PATCH `assigneeAgentId` + `status: "todo"` — the two-step that reliably fires
 * the assignment wake.
 */
export async function dispatchCopyTask(
  cfg: PaperclipConfig,
  prompt: string,
): Promise<string> {
  const createRes = await paperclipFetch(cfg, `/api/companies/${cfg.companyId}/issues`, {
    method: "POST",
    body: JSON.stringify({
      title: `AI copy request — ${new Date().toISOString()}`,
      description: prompt,
    }),
  });
  const issue = (await createRes.json()) as Issue;
  if (!issue?.id) throw new Error("Paperclip issue creation returned no id");

  // Assign + set todo so the assignment wake fires (see note above).
  await paperclipFetch(cfg, `/api/issues/${issue.id}`, {
    method: "PATCH",
    body: JSON.stringify({ assigneeAgentId: cfg.agentId, status: "todo" }),
  });

  return issue.id;
}

/**
 * Poll the issue until it reaches `done` (or `cancelled`/`blocked`), then read
 * the result document. Returns the raw document body, or null on timeout/failure.
 */
export async function pollForResult(
  cfg: PaperclipConfig,
  issueId: string,
): Promise<string | null> {
  const deadline = Date.now() + cfg.timeoutMs;
  const pollIntervalMs = 2000;

  let status = "";
  while (Date.now() < deadline) {
    const res = await paperclipFetch(cfg, `/api/issues/${issueId}`);
    const issue = (await res.json()) as Issue;
    status = issue.status;
    if (status === "done" || status === "cancelled" || status === "blocked") break;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  if (status !== "done") return null;

  // Read the result document the agent saved under the fixed key.
  const docsRes = await paperclipFetch(cfg, `/api/issues/${issueId}/documents`);
  const docs = (await docsRes.json()) as Array<{ key: string; body?: string }>;
  const result = docs.find((d) => d.key === RESULT_DOC_KEY);
  return result?.body ?? null;
}

/**
 * Parse a result body into variations. The agent is instructed to return
 * variations separated by `---` lines (identical to the Anthropic contract).
 * Returns an empty array if the body is empty or malformed.
 */
export function parseVariations(body: string | null): string[] {
  if (!body) return [];
  return body
    .split(/^\s*---+\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
}
