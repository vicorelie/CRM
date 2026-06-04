// Test E2E du flow "Appliquer un fix" sans passer par l'API HTTP.
// 1) Lit les creds chiffrés en DB
// 2) Trouve la homepage WP (page_on_front)
// 3) POST une meta description via /pages/{id} avec le meta_key WanaPush
// 4) Re-fetch le HTML public et vérifie que <meta name="description"> est présent

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { createDecipheriv } from "node:crypto";

const prisma = new PrismaClient();

function decrypt(payload) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

const site = await prisma.siteConnection.findFirst();
if (!site) { console.error("Aucun site"); process.exit(1); }

const creds = JSON.parse(decrypt(site.credentials));
const auth = "Basic " + Buffer.from(`${creds.username}:${creds.appPassword.replace(/\s+/g, "")}`).toString("base64");
const base = creds.url.replace(/\/+$/, "") + "/wp-json/wp/v2";

console.log(`━━━ ${creds.url} ━━━\n`);

// 1) Confirme que le plugin WanaPush est bien installé
const pingRes = await fetch(creds.url.replace(/\/+$/, "") + "/wp-json/wanapush/v1/ping");
console.log(`1. Ping plugin    : HTTP ${pingRes.status}`);
if (!pingRes.ok) { console.error("Plugin pas installé !"); process.exit(1); }
const ping = await pingRes.json();
console.log(`   → version ${ping.version}, WP ${ping.wp}, PHP ${ping.php}`);

// 2) Trouve la page d'accueil
const settingsRes = await fetch(`${base}/settings`, { headers: { Authorization: auth } });
const settings = await settingsRes.json();
console.log(`\n2. Settings        : show_on_front=${settings.show_on_front} page_on_front=${settings.page_on_front}`);

let pageId;
if (settings.show_on_front === "page" && settings.page_on_front) {
  pageId = settings.page_on_front;
  console.log(`   → homepage = page #${pageId}`);
} else {
  const pages = await (await fetch(`${base}/pages?per_page=1`, { headers: { Authorization: auth } })).json();
  pageId = pages[0]?.id;
  console.log(`   → fallback sur première page #${pageId}`);
}

// 3) Lit l'état actuel de la meta
const beforeRes = await fetch(`${base}/pages/${pageId}?_fields=id,title,link,meta`, { headers: { Authorization: auth } });
const before = await beforeRes.json();
console.log(`\n3. Avant fix       : meta._wanapush_meta_description = ${JSON.stringify(before.meta?._wanapush_meta_description ?? null)}`);

// 4) Pose une meta description test
const newDesc = `WanaPush test ${new Date().toISOString().slice(11, 19)} — Découvrez les dernières actualités et conseils.`;
console.log(`\n4. POST nouvelle meta description (${newDesc.length} car.)`);
const updRes = await fetch(`${base}/pages/${pageId}`, {
  method: "POST",
  headers: { Authorization: auth, "Content-Type": "application/json" },
  body: JSON.stringify({ meta: { _wanapush_meta_description: newDesc } }),
});
console.log(`   HTTP ${updRes.status}`);
if (!updRes.ok) {
  console.log(`   Body: ${(await updRes.text()).slice(0, 400)}`);
  process.exit(1);
}
const after = await updRes.json();
console.log(`   → meta retournée par WP : "${after.meta?._wanapush_meta_description}"`);

// 5) Re-fetch le HTML public et grep <meta name="description">
console.log(`\n5. Vérification publique (HTML servi par WP)`);
await new Promise((r) => setTimeout(r, 1000)); // laisse les caches se vider

const htmlRes = await fetch(creds.url, { cache: "no-store", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } });
const html = await htmlRes.text();
const match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
if (match) {
  console.log(`   ✓ TROUVÉ : <meta name="description" content="${match[1]}">`);
  if (match[1].includes("WanaPush test")) {
    console.log(`   ✓ ✓ ✓  C'EST BIEN NOTRE MODIFICATION !`);
  } else {
    console.log(`   ⚠ Mais ce n'est pas notre nouvelle valeur (cache HTTP/CDN ?)`);
  }
} else {
  console.log(`   ✗ Pas de <meta name="description"> dans le HTML servi`);
  // Cherche les marqueurs WanaPush
  if (html.includes("WanaPush SEO")) {
    console.log(`     (mais le commentaire "<!-- WanaPush SEO -->" est présent)`);
  }
}

await prisma.$disconnect();
