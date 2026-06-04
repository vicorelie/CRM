// Screenshot d'un site distant via Puppeteer (Chrome headless).
// Renvoie un PNG en base64 (data:image/png;base64,...) prêt à envoyer à une IA vision.

import puppeteer from "puppeteer";

export type ScreenshotResult = {
  base64: string;          // data URL complet
  bytes: number;           // taille du PNG
  viewportWidth: number;
  viewportHeight: number;
};

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/**
 * Capture le premier viewport d'une URL (haut de page, plein écran 1280×800).
 * - Bloque les vidéos lourdes / fonts externes pour accélérer
 * - 12s de timeout max
 * - Renvoie null si le rendu échoue (jamais throw côté caller)
 */
export async function captureFirstViewport(url: string): Promise<ScreenshotResult | null> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (type === "media" || type === "websocket" || type === "eventsource") {
        req.abort();
      } else {
        req.continue();
      }
    });

    const timeout = setTimeout(() => browser?.close().catch(() => {}), 15_000);
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 12_000 });
    } catch {
      // Tant pis si networkidle2 timeout : on screenshot quand même ce qui est là.
    }
    clearTimeout(timeout);

    // Petit délai pour laisser les animations/fonts se stabiliser.
    await new Promise((r) => setTimeout(r, 800));

    const buffer = await page.screenshot({
      type: "png",
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
    const base64 = `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
    return { base64, bytes: buffer.length, viewportWidth: 1280, viewportHeight: 800 };
  } catch (err) {
    console.error("[screenshot] échec:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    await browser?.close().catch(() => {});
  }
}
