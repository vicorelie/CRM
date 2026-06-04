import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 15;

const SubmitSchema = z.object({
  siteSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "Slug invalide"),
  type: z.enum(["contact", "newsletter"]),
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  pageUrl: z.string().optional(),
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

    await prisma.formSubmission.create({
      data: {
        siteSlug: payload.siteSlug,
        type: payload.type,
        data: payload.data as never,
        email,
        pageUrl: payload.pageUrl?.slice(0, 500) ?? null,
        ipHash,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[forms/submit] unexpected error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
