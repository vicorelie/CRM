#!/usr/bin/env node
// Régénère le <script data-storefront-injected> dans index.html des sites
// listés (similaire à regen-site-editor.js mais pour le storefront).

const fs = require("fs");
const path = require("path");

const STOREFRONT_TS = "/var/www/wanapush/lib/storefront.ts";
const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";

function extractTemplate() {
  const src = fs.readFileSync(STOREFRONT_TS, "utf8");
  const m = src.match(/return `([\s\S]+?)`;\s*\n\}/);
  if (!m) throw new Error("Impossible d'extraire le template de storefront.ts");
  return m[1];
}

function makeBlock(rawTemplate, slug) {
  let s = rawTemplate;
  s = s.replace(/\$\{JSON\.stringify\(slug\)\}/g, JSON.stringify(slug));
  s = s.replace(/\\`/g, "`");
  s = s.replace(/\\\$\{/g, "${");
  return s;
}

function updateSite(slug) {
  const indexPath = path.join(EXTRACTION_ROOT, slug, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.log(`SKIP ${slug} (pas d'index.html)`);
    return false;
  }
  const raw = extractTemplate();
  const block = makeBlock(raw, slug);
  const html = fs.readFileSync(indexPath, "utf8");
  const re = /<script\s+data-storefront-injected>[\s\S]*?<\/script>/;
  const updated = re.test(html)
    ? html.replace(re, block)
    : html.replace("</body>", "  " + block + "\n  </body>");
  fs.writeFileSync(indexPath, updated);
  // Validate JS syntax
  const m = updated.match(/<script data-storefront-injected>([\s\S]+?)<\/script>/);
  try {
    require("vm").compileFunction(m[1], [], {});
    console.log(`OK  ${slug}`);
    return true;
  } catch (e) {
    console.log(`ERR ${slug}: ${e.message}`);
    return false;
  }
}

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  console.error("Usage: node scripts/regen-storefront.js <slug1> [slug2 ...]");
  process.exit(1);
}
for (const slug of slugs) updateSite(slug);
