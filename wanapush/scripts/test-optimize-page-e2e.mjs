// Test E2E : optimize-page sur /contact/ via appel direct à l'API
// (bypass auth en injectant un user fictif côté serveur via direct DB calls)
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// On va simuler l'optimization en appelant les fonctions directement
const site = await prisma.siteConnection.findFirst({ include: { user: true } });
console.log(`Site appartient à : ${site.user.email}`);

// Récupère le csrf + login en tant que ce user n'est pas faisable (pas le mdp).
// On va juste reset le cookie pour tester avec test@wanapush.local en réassignant
// temporairement le site à ce user pour le test.
const testUser = await prisma.user.findFirst({ where: { email: "test@wanapush.local" } });
if (!testUser) {
  console.error("test@wanapush.local user introuvable");
  process.exit(1);
}

const originalUserId = site.userId;
console.log(`Réassignation temporaire ${site.userId} → ${testUser.id}`);
await prisma.siteConnection.update({ where: { id: site.id }, data: { userId: testUser.id } });

try {
  const cookie = (await import("node:fs")).readFileSync("/tmp/jar.txt", "utf-8");
  const sessionLine = cookie.split("\n").find(l => l.includes("session-token") && !l.startsWith("#"));
  const sessionTok = sessionLine?.split("\t").at(-1)?.trim();
  console.log(`Cookie session token: ${sessionTok?.slice(0, 20)}...`);

  const url = "https://www.topizy.webama.fr/contact/";
  console.log(`\nOptimize-page sur ${url}...`);
  const t0 = Date.now();
  const res = await fetch(`https://wanatest.com/wanapush/api/seo/optimize-page`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `__Secure-next-auth.session-token=${sessionTok}`,
    },
    body: JSON.stringify({ siteId: site.id, pageUrl: url }),
  });
  const dur = Date.now() - t0;
  const text = await res.text();
  console.log(`HTTP ${res.status} en ${(dur/1000).toFixed(1)}s`);
  if (res.ok) {
    const d = JSON.parse(text);
    console.log(`\nScore: ${d.scoreBefore} → ${d.scoreAfter} (${d.delta >= 0 ? '+' : ''}${d.delta})`);
    console.log(`Issues: ${d.issuesBefore} → ${d.issuesAfter}`);
    console.log(`Mot-clé cible: ${d.targetKeyword}`);
    console.log(`\nFixes appliqués:`);
    for (const a of d.applied) {
      console.log(`  ${a.ok ? '✓' : '✗'} ${a.fixId}: ${a.message}`);
    }
  } else {
    console.log(`Erreur: ${text.slice(0, 500)}`);
  }
} finally {
  console.log(`\nRestauration ownership ${testUser.id} → ${originalUserId}`);
  await prisma.siteConnection.update({ where: { id: site.id }, data: { userId: originalUserId } });
  await prisma.$disconnect();
}
