// Script de seed pour créer un site test + pixel config en DB.
// Usage : npx tsx scripts/seed-capi-test.ts
//
// Crée :
//   - 1 GeneratedSite avec slug="capi-test" et un HTML minimal
//   - 1 SitePixel lié à ce site, avec un capiAccessToken fictif chiffré
//   - Idempotent : si déjà créé, met à jour
//
// Note : le capiAccessToken est fictif → l'envoi à Meta échouera (erreur 190
// Invalid token) mais ça suffit pour vérifier l'injection HTML et le logging
// CapiEvent en DB.

import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

const USER_EMAIL = "vicorelie@hotmail.com";
const AD_ACCOUNT_EXTERNAL_ID = "act_158763862416579"; // WEBAMA Meta Ads
const FAKE_PIXEL_ID = "1234567890";
const FAKE_CAPI_TOKEN = "EAATESTFAKETOKEN_for_local_dev_only";

async function main() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: USER_EMAIL } });
  console.log(`✓ User trouvé : ${user.id} (${user.email})`);

  const adAccount = await prisma.adAccount.findFirstOrThrow({
    where: { userId: user.id, externalId: AD_ACCOUNT_EXTERNAL_ID },
  });
  console.log(`✓ AdAccount trouvé : ${adAccount.id} (${adAccount.name})`);

  // 1) Upsert GeneratedSite avec slug="capi-test"
  const slug = "capi-test";
  const minimalHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Test CAPI WanaPush</title>
  <meta name="description" content="Page de test pour valider l'injection Pixel + CAPI">
</head>
<body>
  <h1>WanaPush CAPI Test</h1>
  <p>Cette page est utilisée pour valider l'injection du Pixel Meta et le bridge CAPI.</p>
  <form id="contact-form">
    <input type="email" name="email" placeholder="Votre email" required>
    <input type="tel" name="phone" placeholder="Votre téléphone">
    <button type="submit">Envoyer</button>
  </form>
  <button onclick="window.wpTrack('ViewContent', { content_name: 'Test CTA' })">Track ViewContent</button>
</body>
</html>`;

  const site = await prisma.generatedSite.upsert({
    where: { slug },
    update: {
      pages: [
        {
          path: "index.html",
          title: "Test CAPI WanaPush",
          metaDescription: "Page de test",
          h1: "WanaPush CAPI Test",
          navLabel: "Accueil",
          html: minimalHtml,
        },
      ] as unknown as object,
    },
    create: {
      userId: user.id,
      slug,
      brief: { type: "test", sector: "test" } as unknown as object,
      pages: [
        {
          path: "index.html",
          title: "Test CAPI WanaPush",
          metaDescription: "Page de test",
          h1: "WanaPush CAPI Test",
          navLabel: "Accueil",
          html: minimalHtml,
        },
      ] as unknown as object,
      meta: { siteSlug: slug, source: "capi-seed" } as unknown as object,
    },
  });
  console.log(`✓ GeneratedSite : ${site.id} (slug=${site.slug})`);

  // 2) Upsert SitePixel
  const encryptedToken = encrypt(FAKE_CAPI_TOKEN);
  const events = ["PageView", "Lead", "ViewContent"];

  const sitePixel = await prisma.sitePixel.upsert({
    where: { generatedSiteId: site.id },
    update: {
      pixelId: FAKE_PIXEL_ID,
      pixelName: "Test Pixel (dev)",
      capiAccessToken: encryptedToken,
      enabled: true,
      events,
      consentRequired: false,
      adAccountId: adAccount.id,
    },
    create: {
      generatedSiteId: site.id,
      adAccountId: adAccount.id,
      pixelId: FAKE_PIXEL_ID,
      pixelName: "Test Pixel (dev)",
      capiAccessToken: encryptedToken,
      enabled: true,
      events,
      consentRequired: false,
    },
  });
  console.log(`✓ SitePixel : ${sitePixel.id} (pixelId=${sitePixel.pixelId}, enabled=${sitePixel.enabled})`);

  console.log("\nTest URLs :");
  console.log(`  Public site : http://localhost:3000/sites/${slug}`);
  console.log(`  CAPI endpoint : http://localhost:3000/api/capi/${slug}/event`);
  console.log("\nLe Pixel sera injecté dans le <head>. Le forward Meta échouera (token fake) mais le CapiEvent sera loggé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
