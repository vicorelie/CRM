import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  parseClickIdsFromUrl,
  parseTtclidFromUrl,
  triggerLeadConversionForFormSubmission,
  triggerLinkedInLeadForFormSubmission,
  triggerTikTokLeadForFormSubmission,
} from "@/lib/ads/enhanced-conversions-pipeline";
import { runLeadPipeline } from "@/lib/leads/sync";

export const runtime = "nodejs";
export const maxDuration = 15;

const SubmitSchema = z.object({
  siteSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "Slug invalide"),
  type: z.enum(["contact", "newsletter"]),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  pageUrl: z.string().optional(),
  /** LinkedIn First-Party Ads Tracking UUID (cookie `li_fat_id` du LinkedIn Insight Tag) */
  liFatId: z.string().max(255).optional(),
  /** TikTok Click ID (cookie wp_ttclid persisté ou URL param) */
  ttclid: z.string().max(255).optional(),
  // Honeypot — un bot remplit ce champ caché, on rejette silencieusement
  hp: z.string().optional(),
});

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + (process.env.NEXTAUTH_SECRET ?? "salt")).digest("hex").slice(0, 32);
}

function extractEmail(data: Record<string, unknown>): string | null {
  // Cherche un champ qui ressemble à un email
  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== "string") continue;
    const isEmailField = /e?mail/i.test(k);
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (isEmailField && looksLikeEmail) return v.toLowerCase().slice(0, 200);
    if (looksLikeEmail) return v.toLowerCase().slice(0, 200);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    let payload: z.infer<typeof SubmitSchema>;
    try {
      const body = await req.json();
      payload = SubmitSchema.parse(body);
    } catch (e) {
      console.error("[forms/submit] validation error:", e);
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    // Honeypot : si rempli, on simule un succès mais on ne stocke rien
    if (payload.hp && payload.hp.length > 0) {
      return NextResponse.json({ ok: true });
    }

    // Rate-limit basique : max 5 soumissions/heure depuis la même IP par slug
    const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "0.0.0.0").trim();
    const ipHash = hashIp(ip);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.formSubmission.count({
      where: { siteSlug: payload.siteSlug, ipHash, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= 5) {
      return NextResponse.json({ error: "Trop de tentatives, réessayez plus tard" }, { status: 429 });
    }

    const email = extractEmail(payload.data);

    // Parse Google click identifiers depuis l'URL de la page d'origine
    // (le lien Google Ad → landing page conserve ?gclid=... dans l'URL).
    // Stockés en DB pour upload Enhanced Conversions via Data Manager API.
    const clickIds = parseClickIdsFromUrl(payload.pageUrl);
    // liFatId : cookie LinkedIn Insight Tag (déposé sur landing si LinkedIn Tag installé)
    const liFatId = payload.liFatId?.slice(0, 255) || null;
    // ttclid : cookie wp_ttclid persisté OU URL param (TikTok valide 7j)
    const ttclid = (payload.ttclid?.slice(0, 255) || parseTtclidFromUrl(payload.pageUrl)) ?? null;

    const submission = await prisma.formSubmission.create({
      data: {
        siteSlug: payload.siteSlug,
        type: payload.type,
        data: payload.data as never,
        email,
        pageUrl: payload.pageUrl?.slice(0, 500) ?? null,
        ipHash,
        gclid: clickIds.gclid ?? null,
        gbraid: clickIds.gbraid ?? null,
        wbraid: clickIds.wbraid ?? null,
        liFatId,
        ttclid,
        ecStatus:
          clickIds.gclid || clickIds.gbraid || clickIds.wbraid ? "PENDING" : null,
        liStatus: liFatId || email ? "PENDING" : null,
        ttStatus: ttclid || email ? "PENDING" : null,
      },
    });

    // Fire-and-forget : Google EC + LinkedIn CAPI + TikTok Events API en parallèle.
    // Chacun gère son propre AdAccount + résolution conversion rule/pixel.
    // Le résultat met à jour FormSubmission.{ec,li,tt}Status (SENT/FAILED/SKIPPED).
    if (clickIds.gclid || clickIds.gbraid || clickIds.wbraid || email) {
      void triggerLeadConversionForFormSubmission(submission.id).catch((e) => {
        console.warn(`[forms/submit] Google EC trigger failed for ${submission.id}: ${e instanceof Error ? e.message : e}`);
      });
    }
    if (liFatId || email) {
      void triggerLinkedInLeadForFormSubmission(submission.id).catch((e) => {
        console.warn(`[forms/submit] LinkedIn CAPI trigger failed for ${submission.id}: ${e instanceof Error ? e.message : e}`);
      });
    }
    if (ttclid || email) {
      void triggerTikTokLeadForFormSubmission(submission.id).catch((e) => {
        console.warn(`[forms/submit] TikTok Events trigger failed for ${submission.id}: ${e instanceof Error ? e.message : e}`);
      });
    }

    // Pipeline auto-pilote leads : scoring IA + EmailContact sync + notif owner +
    // webhooks CRM sortants. Fire-and-forget (ne bloque pas la réponse).
    void runLeadPipeline(submission.id).catch((e) => {
      console.warn(`[forms/submit] runLeadPipeline failed for ${submission.id}: ${e instanceof Error ? e.message : e}`);
    });

    revalidatePath("/leads");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[forms/submit] unexpected error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
