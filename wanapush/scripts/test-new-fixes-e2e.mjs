// E2E des 3 nouveaux fixes : H1, image alts en lot, schema.org JSON-LD
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
const creds = JSON.parse(decrypt(site.credentials));
const auth = "Basic " + Buffer.from(`${creds.username}:${creds.appPassword.replace(/\s+/g, "")}`).toString("base64");
const base = creds.url.replace(/\/+$/, "") + "/wp-json/wp/v2";

const settings = await (await fetch(`${base}/settings`, { headers: { Authorization: auth } })).json();
const pageId = settings.page_on_front ?? 6;
console.log(`Page cible: #${pageId} sur ${creds.url}\n`);

// ─── TEST 1 : Pose un schema.org Article via le plugin v1.1 ───
console.log("━━━ Test 1 : Injection schema.org Article ━━━");
const articleJsonld = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Topizy — Démo WanaPush v1.1",
  description: "Article de test injecté via le plugin WanaPush SEO Bridge",
  author: { "@type": "Person", name: "Yassine" },
  datePublished: new Date().toISOString().slice(0, 10),
  dateModified: new Date().toISOString().slice(0, 10),
  mainEntityOfPage: creds.url,
  inLanguage: "fr-FR",
};
const r1 = await fetch(`${base}/pages/${pageId}`, {
  method: "POST",
  headers: { Authorization: auth, "Content-Type": "application/json" },
  body: JSON.stringify({ meta: { _wanapush_schema_jsonld: JSON.stringify(articleJsonld) } }),
});
console.log(`  POST schema_jsonld: HTTP ${r1.status}`);

// Vérifie côté client
await new Promise(r => setTimeout(r, 1500));
const html1 = await (await fetch(creds.url, { cache: "no-store" })).text();
const m1 = html1.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
console.log(`  HTML public: <script application/ld+json> ${m1 ? "✓ TROUVÉ" : "✗ ABSENT"}`);
if (m1) {
  const parsed = JSON.parse(m1[1]);
  console.log(`    @type=${parsed["@type"]}, headline="${parsed.headline}"`);
}

// ─── TEST 2 : Récupère les images de la page et update un alt ───
console.log("\n━━━ Test 2 : Mise à jour alt d'une image ━━━");
const media = await (await fetch(`${base}/media?per_page=5`, { headers: { Authorization: auth } })).json();
if (media.length > 0) {
  const target = media[0];
  console.log(`  Cible: image #${target.id} (${target.source_url.split("/").pop()})`);
  console.log(`  Alt actuel: "${target.alt_text}"`);
  const newAlt = `Test WanaPush ${new Date().toISOString().slice(11, 19)}`;
  const r2 = await fetch(`${base}/media/${target.id}`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ alt_text: newAlt }),
  });
  console.log(`  POST alt: HTTP ${r2.status}`);
  if (r2.ok) {
    const updated = await r2.json();
    console.log(`  → Nouveau alt: "${updated.alt_text}" ${updated.alt_text === newAlt ? "✓" : "✗"}`);
  }
} else {
  console.log("  Aucune image dans la médiathèque");
}

// ─── TEST 3 : Vérifie qu'on peut update le content (pour fix-h1) ───
console.log("\n━━━ Test 3 : Update content (test idempotent pour fix-h1) ━━━");
const pageRes = await fetch(`${base}/pages/${pageId}?context=edit&_fields=content`, { headers: { Authorization: auth } });
const page = await pageRes.json();
const hasH1 = /<h1[^>]*>/i.test(page.content?.raw ?? "");
console.log(`  H1 actuellement présent dans content.raw: ${hasH1 ? "OUI" : "NON"}`);
console.log(`  Capacité écriture content: ${pageRes.ok ? "✓" : "✗"} (statut ${pageRes.status})`);

await prisma.$disconnect();
console.log();
