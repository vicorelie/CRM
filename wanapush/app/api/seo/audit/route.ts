import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { askWanapush, type AiResult } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { runPageSpeed } from "@/lib/pagespeed";
import { crawl, scoreAudit, type Audit } from "@/lib/seo-audit";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  url: z.string().trim().url("URL invalide"),
  withPageSpeed: z.boolean().optional().default(true),
});

async function aiCommentary(audit: Audit): Promise<AiResult | null> {
  try {
    const summary = JSON.stringify(audit, null, 2);
    return await askWanapush(
      `Voici les données brutes d'un audit SEO automatique de la page ${audit.url}, conforme aux règles Google de mai 2026 (Core Web Vitals, E-E-A-T, AI Overviews, Helpful Content).\n\nDonnées :\n\`\`\`json\n${summary}\n\`\`\`\n\nFournis un diagnostic structuré avec recommandations priorisées (effort/impact). Sois concret. Limite-toi aux 5 actions à plus fort impact.`,
    );
  } catch (err) {
    console.error("[seo/audit] AI error", err);
    return null;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  try {
    const [audit, psi] = await Promise.all([
      crawl(parsed.data.url),
      parsed.data.withPageSpeed
        ? runPageSpeed(parsed.data.url, "mobile")
        : Promise.resolve(null),
    ]);

    scoreAudit(audit, psi?.coreWebVitals ?? null);

    const ai = await aiCommentary(audit);

    return NextResponse.json({
      audit,
      pageSpeed: psi
        ? {
            opportunities: psi.opportunities,
            lighthouseScore: psi.coreWebVitals.lighthouseScore,
            source: psi.coreWebVitals.source,
            error: psi.error ?? null,
          }
        : null,
      ai,
    });
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message.includes("aborted")
          ? "Timeout : la page met trop de temps à répondre (>15s)"
          : err.message
        : "Erreur inconnue";
    return NextResponse.json(
      { error: `Impossible d'analyser cette URL : ${msg}` },
      { status: 502 },
    );
  }
}
