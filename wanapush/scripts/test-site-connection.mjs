// Vérifie qu'on peut lire+écrire sur la SiteConnection stockée en DB.
// Usage : node scripts/test-site-connection.mjs

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

const sites = await prisma.siteConnection.findMany();
console.log(`\n${sites.length} site(s) en DB`);

for (const site of sites) {
  console.log(`\n━━━ ${site.url} (${site.platform}) ━━━`);
  console.log(`  status        : ${site.status}`);
  console.log(`  lastTestAt    : ${site.lastTestAt?.toISOString()}`);

  const creds = JSON.parse(decrypt(site.credentials));
  console.log(`  decrypted user: ${creds.username}`);
  console.log(`  decrypted pwd : ${creds.appPassword.slice(0, 4)}…${creds.appPassword.slice(-4)} (${creds.appPassword.length} chars)`);

  const auth = "Basic " + Buffer.from(`${creds.username}:${creds.appPassword.replace(/\s+/g, "")}`).toString("base64");
  const base = creds.url.replace(/\/+$/, "") + "/wp-json/wp/v2";

  // 1. Vérifier l'identité
  const meRes = await fetch(`${base}/users/me?context=edit`, { headers: { Authorization: auth } });
  console.log(`\n  → /users/me        : HTTP ${meRes.status}`);
  if (meRes.ok) {
    const me = await meRes.json();
    console.log(`     ID=${me.id} username=${me.username} roles=${me.roles?.join(",")}`);
    console.log(`     capabilities.edit_pages = ${me.capabilities?.edit_pages}`);
    console.log(`     capabilities.publish_pages = ${me.capabilities?.publish_pages}`);
  }

  // 2. Lister les pages
  const pagesRes = await fetch(`${base}/pages?per_page=10&_fields=id,title,slug,link,status`, { headers: { Authorization: auth } });
  console.log(`\n  → /pages           : HTTP ${pagesRes.status} (X-WP-Total=${pagesRes.headers.get("X-WP-Total")})`);
  if (pagesRes.ok) {
    const pages = await pagesRes.json();
    pages.forEach((p) => {
      console.log(`     - [${p.id}] ${p.title?.rendered ?? p.title} (${p.status})`);
    });
  }

  // 3. Lister les posts
  const postsRes = await fetch(`${base}/posts?per_page=5&_fields=id,title,status`, { headers: { Authorization: auth } });
  console.log(`\n  → /posts           : HTTP ${postsRes.status} (X-WP-Total=${postsRes.headers.get("X-WP-Total")})`);

  // 4. Vérifier les plugins SEO (Yoast etc.)
  const probeRes = await fetch(`${base}/pages?per_page=1&_fields=id,yoast_head_json,rank_math_seo,_aioseo`, { headers: { Authorization: auth } });
  if (probeRes.ok) {
    const arr = await probeRes.json();
    if (arr.length > 0) {
      const sample = arr[0];
      console.log(`\n  → Plugin SEO détecté :`);
      console.log(`     yoast        : ${!!sample.yoast_head_json}`);
      console.log(`     rankmath     : ${!!sample.rank_math_seo}`);
      console.log(`     aioseo       : ${!!sample._aioseo}`);
    }
  }

  // 5. Test d'écriture (NON DESTRUCTIF) : récupérer le 1er title puis le ré-écrire à l'identique
  if (meRes.ok) {
    const pages = await (await fetch(`${base}/pages?per_page=1&_fields=id,title`, { headers: { Authorization: auth } })).json();
    if (pages.length > 0) {
      const page = pages[0];
      const currentTitle = page.title?.rendered ?? page.title;
      console.log(`\n  → Test d'écriture (idempotent) sur page #${page.id} title="${currentTitle}"`);
      const updRes = await fetch(`${base}/pages/${page.id}`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ title: currentTitle }),
      });
      console.log(`     HTTP ${updRes.status} ${updRes.ok ? "✓ on peut modifier les pages" : "✗ écriture refusée"}`);
      if (!updRes.ok) {
        const txt = await updRes.text();
        console.log(`     body: ${txt.slice(0, 300)}`);
      }
    }
  }
}

await prisma.$disconnect();
console.log();
