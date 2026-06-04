import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import puppeteer, { type Browser } from "puppeteer";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { applyDesignToHtml, scanPageDesign } from "@/lib/design-scanner";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  pageUrl: z.string().url(),
  /** HTML à injecter (bloc enrichissement) */
  htmlToInject: z.string().min(1),
});

// Browser réutilisable (partagé avec /api/seo/screenshot via le module séparé serait mieux,
// mais ici on instancie un nouveau pour simplicité)
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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  // 1. Fetch HTML public de la page
  let originalHtml: string;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(parsed.data.pageUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WanaPushPreview/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Page inaccessible : HTTP ${res.status}` },
        { status: 502 },
      );
    }
    originalHtml = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch échoué : ${err instanceof Error ? err.message : "?"}` },
      { status: 502 },
    );
  }

  // 2. Applique les classes du thème au HTML d'enrichissement (cohérence visuelle)
  const design = await scanPageDesign(parsed.data.pageUrl);
  let injectedHtml = parsed.data.htmlToInject;
  if (design.hasDesignSignals) {
    injectedHtml = applyDesignToHtml(injectedHtml, design);
  }

  // 3. Injecte le contenu dans le HTML
  // Stratégie : insère DANS un container existant (section/article) pour
  // que le CSS scopé du thème s'applique correctement, plutôt qu'à la racine
  // de <main> qui peut être hors contexte CSS.
  const $ = cheerio.load(originalHtml);

  // Marker visuel pour identifier le bloc dans le screenshot
  const previewMarker = `<div data-wanapush-preview style="position:relative;outline:2px dashed #6366f1;outline-offset:8px;background:linear-gradient(transparent,rgba(99,102,241,0.04));margin:1rem 0;padding:1rem 0;">
    <div style="position:absolute;top:-12px;right:0;background:#6366f1;color:white;padding:3px 12px;border-radius:9999px;font-size:11px;font-family:system-ui;font-weight:600;z-index:9999;">APERÇU WANAPUSH</div>
    ${injectedHtml}
  </div>`;

  // Cherche un container existant similaire à celui détecté pour insérer dedans
  let inserted = false;
  if (design.sectionClass) {
    // Prend la 1re classe (ex: "pagehead reveal" → "pagehead")
    const firstClass = design.sectionClass.split(/\s+/)[0];
    const matchingSection = $(`section.${firstClass}`).last();
    if (matchingSection.length) {
      matchingSection.after(`<section class="${design.sectionClass}">${previewMarker}</section>`);
      inserted = true;
    }
  }
  if (!inserted && design.containerClass) {
    const firstClass = design.containerClass.split(/\s+/)[0];
    const matchingContainer = $(`.${firstClass}`).last();
    if (matchingContainer.length) {
      matchingContainer.after(`<div class="${design.containerClass}">${previewMarker}</div>`);
      inserted = true;
    }
  }
  if (!inserted) {
    if ($("main").length) {
      $("main").last().append(previewMarker);
    } else if ($("body").length) {
      $("body").append(previewMarker);
    } else {
      return NextResponse.json(
        { error: "Page sans <main> ni <body> — impossible d'injecter" },
        { status: 502 },
      );
    }
  }

  // Force base href pour que les ressources relatives (CSS/images) soient résolues
  // par rapport au site original
  if (!$("base").length) {
    $("head").prepend(`<base href="${parsed.data.pageUrl}">`);
  }

  const modifiedHtml = $.html();

  // 4. Render via Puppeteer + screenshot fullpage
  let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
    await page.setUserAgent("Mozilla/5.0 (compatible; WanaPushPreview/1.0)");

    await page.setContent(modifiedHtml, {
      waitUntil: "networkidle2",
      timeout: 25_000,
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Auto-scroll pour lazy-load
    await page.evaluate(async () => {
      const distance = 500;
      let scrolled = 0;
      const maxHeight = document.body.scrollHeight;
      while (scrolled < maxHeight) {
        window.scrollBy(0, distance);
        scrolled += distance;
        await new Promise((r) => setTimeout(r, 100));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 500));

    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 75,
      fullPage: true,
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Capture impossible : ${err instanceof Error ? err.message : "?"}`,
      },
      { status: 502 },
    );
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        /* ignore */
      }
    }
  }
}
