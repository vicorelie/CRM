// POST /api/ads/verify-pixel { url, pixelId }
//
// Fetch l'URL fournie et vérifie que le Pixel Meta est installé.
// Cherche dans le HTML : fbq('init', '<pixelId>') OU le script standard pixel.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const inputSchema = z.object({
  url: z.url().max(2048),
  pixelId: z.string().min(5).max(64),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );

  const { url, pixelId } = parsed.data;

  let html: string;
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WanaPushPixelVerifier/1.0; +https://wanapush.com)",
      },
      // 10s timeout sécurité
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          found: false,
          error: `L'URL retourne HTTP ${r.status}. Vérifie qu'elle est accessible publiquement.`,
        },
        { status: 200 },
      );
    }
    html = await r.text();
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        found: false,
        error:
          e instanceof Error
            ? `Impossible de charger l'URL : ${e.message}`
            : "Erreur réseau",
      },
      { status: 200 },
    );
  }

  // Patterns Meta Pixel standards
  const patterns = [
    new RegExp(`fbq\\(['"]init['"]\\s*,\\s*['"]${pixelId}['"]`, "i"),
    new RegExp(`_fbp.*${pixelId}`, "i"),
    new RegExp(`tr\\?id=${pixelId}`, "i"), // pixel image noscript fallback
  ];

  const found = patterns.some((p) => p.test(html));

  return NextResponse.json({
    ok: true,
    found,
    pixelId,
    url,
    hint: found
      ? "Pixel Meta correctement détecté sur la page."
      : "Pixel non détecté. Assure-toi que le snippet est dans le <head> et que la page est rechargée.",
  });
}
