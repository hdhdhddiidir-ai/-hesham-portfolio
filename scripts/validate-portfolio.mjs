import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const edge = fs.readFileSync("supabase/functions/telegram-bot/index.ts", "utf8");
const bot = fs.readFileSync("index.ts", "utf8");

const categories = [
  ["logo-identity", "Logo & Visual Identity"],
  ["business-card", "Business Card"],
  ["advertising", "Advertisement"],
  ["restaurant-menu", "Restaurant Menu"],
  ["invitations", "Invitations"],
  ["social-ads", "Social Media Ads"],
  ["graphic-design", "Graphic Design"],
  ["print-design", "Print Design"],
  ["flyer", "Flyer"],
  ["brochure", "Brochure"],
  ["stickers-labels", "Stickers & Labels"],
  ["posters-banners", "Posters & Banners"],
  ["packaging", "Packaging Design"],
  ["business-design", "Business & Company Designs"],
  ["social-posts", "Social Media Posts & Stories"],
  ["digital-design", "Digital Designs"],
];

const filterMarkup = html.match(/<div class="portfolio-filter-list"[^>]*>([\s\S]*?)<\/div>/)?.[1];
assert.ok(filterMarkup, "Portfolio filter list exists");
assert.equal((filterMarkup.match(/data-work-filter="/g) || []).length, 18, "All + 16 services + Other filter");
assert.match(filterMarkup, /data-work-filter="all"/, "All filter exists");
assert.match(filterMarkup, /data-work-filter="other"/, "Other filter exists");

const labelFunction = html.match(/function syncPortfolioFilterLanguage\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(labelFunction, "Filter language synchronizer exists");
for (const [id] of categories) {
  assert.ok(filterMarkup.includes('data-work-filter="' + id + '"'), "Filter missing: " + id);
  const key = id.replace(/-/g, "\\-");
  assert.match(labelFunction, new RegExp("(?:'" + key + "'|" + key + ")\\s*:"), "Translated labels missing: " + id);
}
assert.match(labelFunction, /other:'Other categories'/, "English Other label exists");
assert.match(labelFunction, /other:'تصنيفات أخرى'/, "Arabic Other label exists");

const matcherSource = html.match(/function matchCat\(raw\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(matcherSource, "Project category matcher exists");
const matchCat = new Function("raw", matcherSource + "\nreturn matchCat(raw);");
for (const [id, label] of categories) {
  assert.equal(matchCat("✨ " + label), id, "Telegram category does not map to filter: " + label);
}
assert.equal(matchCat("legacy uncategorized category"), null, "Unknown categories remain uncategorized");

assert.match(html, /maintenance-status=1/, "Website polls maintenance status");
assert.match(html, /setInterval\(function\(\)[\s\S]*?10000\)/, "Open tabs refresh maintenance state periodically");
assert.match(html, /id="maintenancePage"/, "Maintenance page exists");
assert.match(edge, /maintenance_status_unavailable/, "Maintenance status API reports database failures");
assert.match(edge, /callback_data: "maintenance:on"/, "Bot has maintenance enable action");
assert.match(edge, /callback_data: "maintenance:off"/, "Bot has maintenance disable action");
assert.match(edge, /secret_token: S/, "Webhook registration configures secret token");
assert.match(edge, /x-telegram-bot-api-secret-token/, "Webhook updates validate Telegram secret header");
assert.match(edge, /status: 401/, "Invalid webhook secrets are rejected");
assert.match(edge, /function handleCreateOrder/, "Order creation handler exists");
assert.match(edge, /function handleSubmissionNotification/, "Submission notification handler exists");
assert.match(bot, /const cats\s*=\s*\[/, "Bot service category list exists");
assert.ok(categories.every(([, label]) => bot.includes(label)), "Bot retains the 16 services");

let checkedScripts = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attrs = match[1] || "";
  const body = match[2] || "";
  if (/\bsrc\s*=/.test(attrs) || /\btype\s*=\s*["']application\/(?:ld\+)?json["']/i.test(attrs)) continue;
  if (!body.trim()) continue;
  new vm.Script(body, { filename: "index.html:inline-script-" + (++checkedScripts) });
}
assert.ok(checkedScripts > 0, "Inline JavaScript was syntax-checked");
console.log("Portfolio QA passed: 16 service mappings, filters, maintenance controls, webhook guard, and " + checkedScripts + " inline scripts.");
