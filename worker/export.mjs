import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeEmail } from "./email.mjs";

export function emailsToCsv(rows) {
  if (!Array.isArray(rows)) throw new Error("Invalid export data.");
  const emails = rows.map((row) => row?.email);
  if (emails.some((email) => typeof email !== "string" || normalizeEmail(email) !== email || /[\r\n,\"]/.test(email))) throw new Error("Invalid export data.");
  return [...new Set(emails)].sort().join("\n") + (emails.length ? "\n" : "");
}

export async function exportEmails({ accountId, databaseId, token, output, fetcher = fetch }) {
  if (!/^[a-f0-9]{32}$/i.test(accountId || "") || !/^[a-f0-9-]{36}$/i.test(databaseId || "") || !token || !output) throw new Error("Account ID, database ID, API token and output path are required.");
  const requested = path.resolve(output);
  const repo = await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
  const parent = await fs.realpath(path.dirname(requested));
  const destination = path.join(parent, path.basename(requested));
  const relative = path.relative(repo, destination);
  if (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative)) throw new Error("Choose a private output path outside this repository.");
  const emails = [];
  let cursor = "";
  // Read-only, fixed SQL via authenticated Cloudflare API. No Worker export route.
  while (true) {
    const response = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
      method: "POST", redirect: "error", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql: "SELECT email FROM beta_requests WHERE email > ? ORDER BY email LIMIT 1000", params: [cursor] }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error("Cloudflare export failed; check token permissions and account/database IDs.");
    const payload = await response.json();
    const page = payload?.result?.[0];
    if (payload.success !== true || page?.success !== true || !Array.isArray(page.results)) throw new Error("Cloudflare export failed.");
    emailsToCsv(page.results);
    if (!page.results.length) break;
    const next = page.results.at(-1).email;
    if (next <= cursor) throw new Error("Cloudflare returned an invalid export page.");
    emails.push(...page.results);
    cursor = next;
    if (page.results.length < 1000) break;
  }
  await fs.writeFile(destination, emailsToCsv(emails), { encoding: "utf8", flag: "wx", mode: 0o600 });
  return emails.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.warn("Google Play CSV upload REPLACES the selected tester list. Review and retain existing testers before uploading. This command does not upload or enroll anyone.");
  try {
    const count = await exportEmails({ accountId: process.env.CLOUDFLARE_ACCOUNT_ID, databaseId: process.env.CLOUDFLARE_DATABASE_ID,
      token: process.env.CLOUDFLARE_API_TOKEN, output: process.argv[2] });
    console.log(`Exported ${count} addresses to the private destination. Existing files are never overwritten.`);
  } catch { console.error("Export failed. Verify credentials, private destination and permissions; an existing file will not be overwritten. No addresses were printed."); process.exitCode = 1; }
}
