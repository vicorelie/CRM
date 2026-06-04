#!/usr/bin/env node
// Régénère le <script data-editor-injected> dans index.html des sites listés.
// Lit lib/site-editor.ts, extrait le template literal de retour, désescape les
// caractères TS-escaped (\\` → `, \\${ → ${) et substitue le slug.
//
// Usage : node scripts/regen-site-editor.js [slug1 slug2 ...]
// Sans args : régénère tous les sites de website-extraction/

const fs = require("fs");
const path = require("path");

const EDITOR_TS = "/var/www/wanapush/lib/site-editor.ts";
const EXTRACTION_ROOT = "/var/www/wanapush/website-extraction";

function extractTemplate() {
  const src = fs.readFileSync(EDITOR_TS, "utf8");
  const m = src.match(/return `([\s\S]+)`;/);
  if (!m) throw new Error("Impossible d'extraire le template de site-editor.ts");
  return m[1];
}

function makeBlock(rawTemplate, slug) {
  let s = rawTemplate;
  // 1. Substitue le slug TS-interpolé
  s = s.replace(/\$\{JSON\.stringify\(slug\)\}/g, JSON.stringify(slug));
  // 2. Désescape les backticks (utilisés pour les inner template literals)
  s = s.replace(/\\`/g, "`");
  // 3. Désescape les \${...} (interpolations des inner template literals)
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
  const re = /<script(?:\s+type="module")?\s+data-editor-injected>[\s\S]*?<\/script>/;
  const updated = re.test(html)
    ? html.replace(re, block)
    : html.replace("</body>", "  " + block + "\n  </body>");
  fs.writeFileSync(indexPath, updated);
  // Validate JS syntax
  const m = updated.match(/<script data-editor-injected>([\s\S]+?)<\/script>/);
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
  const dirs = fs
    .readdirSync(EXTRACTION_ROOT)
    .filter((d) => fs.statSync(path.join(EXTRACTION_ROOT, d)).isDirectory());
  dirs.forEach(updateSite);
} else {
  slugs.forEach(updateSite);
}
