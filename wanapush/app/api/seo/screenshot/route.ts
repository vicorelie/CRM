import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import puppeteer, { type Browser } from "puppeteer";
import { authOptions } from "@/lib/auth";
import { assertPublicUrl, SsrfError } from "@/lib/ssrf";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cache simple en mémoire (TTL 1h) pour éviter de re-screenshot la même URL
const cache = new Map<string, { buffer: Buffer; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000;

// Browser réutilisé entre les requêtes (économie de RAM/temps)
let browserPromise: Promise<Browser> | null = null;
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browserPromise;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const url = params.get("url");
  const fullPage = params.get("fullPage") === "1";
  const width = Math.min(parseInt(params.get("width") ?? "1280", 10) || 1280, 1920);
  const refresh = params.get("refresh") === "1";

  if (!url) {
    return NextResponse.json({ error: "Param 'url' requis" }, { status: 400 });
  }
  // Garde anti-SSRF (audit H2) : on bloque localhost / IP privées / metadata
  // AVANT de lancer Puppeteer. (Résiduel : DNS-rebinding TOCTOU possible côté
  // navigation Puppeteer → durcir via interception de requêtes si besoin.)
  try {
    await assertPublicUrl(url);
  } catch (e) {
    if (e instanceof SsrfError) {
      return NextResponse.json({ error: `URL refusée : ${e.message}` }, { status: 400 });
    }
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  const cacheKey = createHash("sha1")
    .update(`${url}|${fullPage}|${width}`)
    .digest("hex");

  if (!refresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return new Response(new Uint8Array(cached.buffer), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=3600",
          "X-WanaPush-Cache": "HIT",
        },
      });
    }
  }

  let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
  // Garde-fou global : 50s max pour toute l'opération screenshot
  // (sinon Puppeteer peut hang indéfiniment sur certaines pages → freeze tout le serveur)
  const globalTimeout = setTimeout(() => {
    if (page) {
      page.close().catch(() => {});
    }
  }, 50_000);
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width, height: 800, deviceScaleFactor: 1 });
    await page.setUserAgent(
      "Mozilla/5.0 (compatible; WanaPushScreenshot/1.0; +https://wanapush.com)",
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 25000,
    });
    // Petit délai pour les animations/lazy-loaded
    await new Promise((r) => setTimeout(r, 1500));

    // Force le scroll pour déclencher le lazy-loading des images bas de page
    if (fullPage) {
      await page.evaluate(async () => {
        const distance = 500;
        const delay = 100;
        let scrolled = 0;
        const maxHeight = document.body.scrollHeight;
        while (scrolled < maxHeight) {
          window.scrollBy(0, distance);
          scrolled += distance;
          await new Promise((r) => setTimeout(r, delay));
        }
        window.scrollTo(0, 0);
      });
      await new Promise((r) => setTimeout(r, 500));
    }

    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 75,
      fullPage,
    });

    cache.set(cacheKey, { buffer: Buffer.from(buffer), expires: Date.now() + CACHE_TTL });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600",
        "X-WanaPush-Cache": "MISS",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Capture impossible : ${
          err instanceof Error
            ? err.message.includes("timeout")
              ? "page trop lente à charger (>25s)"
              : err.message
            : "erreur inconnue"
        }`,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(globalTimeout);
    if (page) {
      try {
        await page.close();
      } catch {
        /* ignore */
      }
    }
  }
}
