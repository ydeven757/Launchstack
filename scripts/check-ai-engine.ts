// Integration check: exercise the real generateCopy() code path against the
// live Paperclip Copywriter agent. Run with: npx tsx scripts/check-ai-engine.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env manually (tsx doesn't auto-load it; Next.js does at runtime).
for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
}

import { generateCopy } from "../src/server/services/ai-copy";

async function main() {
  const result = await generateCopy({
    kind: "cta",
    context: { niche: "weight loss", offer: "7-day reset plan", tone: "direct" },
    variations: 3,
  });
  console.log("source:", result.source);
  console.log("variations:", result.variations.length);
  result.variations.forEach((v, i) => console.log(`  ${i + 1}. ${v}`));
  if (result.source !== "paperclip") {
    console.error("EXPECTED source=paperclip, got", result.source);
    process.exit(1);
  }
  if (result.variations.length === 0) {
    console.error("EXPECTED non-empty variations");
    process.exit(1);
  }
  console.log("OK: Paperclip AI engine path works end-to-end");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
