import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emailsToCsv, exportEmails } from "../export.mjs";

test("CSV is one email per line, sorted and unique without header/BOM; unsafe rows fail", () => {
  assert.equal(emailsToCsv([{ email: "z@example.com" }, { email: "a@example.com" }, { email: "a@example.com" }]), "a@example.com\nz@example.com\n");
  assert.equal(emailsToCsv([]), "");
  for (const email of [null, "Upper@example.com", "=formula@example.com", "x,y@example.com", "x\ny@example.com"]) assert.throws(() => emailsToCsv([{ email }]));
});
test("authenticated export uses fixed SELECT, writes only private new file, and refuses overwrite", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "remote-export-test-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const output = path.join(dir, "test.csv");
  const settings = { accountId: "a".repeat(32), databaseId: "12345678-1234-1234-1234-123456789abc", token: "test-only-token", output,
    fetcher: async (url, options) => {
      assert(url.startsWith("https://api.cloudflare.com/client/v4/accounts/"));
      assert.equal(options.redirect, "error");
      assert.equal(options.headers.Authorization, "Bearer test-only-token");
      assert.equal(JSON.parse(options.body).sql, "SELECT email FROM beta_requests WHERE email > ? ORDER BY email LIMIT 1000");
      return Response.json({ success: true, result: [{ success: true, results: [{ email: "test@example.com" }] }] });
    } };
  assert.equal(await exportEmails(settings), 1);
  assert.equal(await fs.readFile(output, "utf8"), "test@example.com\n");
  await assert.rejects(exportEmails(settings), { code: "EEXIST" });
  assert.equal(await fs.readFile(output, "utf8"), "test@example.com\n");
  await assert.rejects(exportEmails({ ...settings, output: fileURLToPath(new URL("../unsafe.csv", import.meta.url)) }), /private output path/);
});
test("Cloudflare failures never write an export", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "remote-export-failure-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const output = path.join(dir, "test.csv");
  await assert.rejects(exportEmails({ accountId: "a".repeat(32), databaseId: "12345678-1234-1234-1234-123456789abc", token: "test-only-token", output,
    fetcher: async () => Response.json({ success: false, errors: [{ message: "private@example.com" }] }) }), /Cloudflare export failed/);
  await assert.rejects(fs.stat(output), { code: "ENOENT" });
});

test("an outside directory alias into the repository cannot receive private exports", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "remote-export-alias-"));
  const alias = path.join(dir, "repo-alias");
  t.after(async () => { await fs.unlink(alias).catch(() => {}); await fs.rmdir(dir); });
  const repo = fileURLToPath(new URL("../../", import.meta.url));
  await fs.symlink(repo, alias, process.platform === "win32" ? "junction" : "dir");
  let calls = 0;
  await assert.rejects(exportEmails({ accountId: "a".repeat(32), databaseId: "12345678-1234-1234-1234-123456789abc", token: "test-only-token", output: path.join(alias, "never-export.csv"),
    fetcher: async () => { calls++; return Response.json({}); } }), /private output path/);
  assert.equal(calls, 0);
});
