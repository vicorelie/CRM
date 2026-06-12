// POST /api/email/providers/campaigns
// Body : { subject, fromName, fromEmail, bodyMarkdown, listIds:[number], replyTo?, send?:boolean }
// Crée une campagne chez le fournisseur (Brevo) et l'envoie si send=true.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserEmailConnection, ProviderError } from "@/lib/email-providers";
import { wrapProviderCampaignHtml } from "@/lib/email-providers/html";
import { renderMarkdownToHtml } from "@/lib/email";

export const runtime = "nodejs";

const BodySchema = z.object({
  name: z.string().trim().max(200).optional(),
  subject: z.string().trim().min(1).max(255),
  fromName: z.string().trim().min(1).max(100),
  fromEmail: z.email().trim().toLowerCase().max(255),
  replyTo: z.email().optional(),
  bodyMarkdown: z.string().min(1).max(200_000),
  listIds: z.array(z.number().int().positive()).min(1).max(50),
  send: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalide" }, { status: 400 });
  }
  const d = parsed.data;

  const conn = await getUserEmailConnection(user.id);
  if (!conn) {
    return NextResponse.json({ error: "Aucun fournisseur email connecté." }, { status: 400 });
  }

  // Markdown → HTML responsive. La désinscription est gérée par Brevo ({{ unsubscribe }}).
  const htmlContent = wrapProviderCampaignHtml({
    contentHtml: renderMarkdownToHtml(d.bodyMarkdown),
    fromName: d.fromName,
  });

  try {
    const { id } = await conn.provider.createCampaign(conn.apiKey, {
      name: d.name?.trim() || d.subject.slice(0, 80),
      subject: d.subject,
      fromName: d.fromName,
      fromEmail: d.fromEmail,
      htmlContent,
      listIds: d.listIds,
      replyTo: d.replyTo,
    });

    if (d.send) {
      await conn.provider.sendCampaign(conn.apiKey, id);
    }
    await prisma.emailProviderConnection.update({
      where: { id: conn.connectionId },
      data: { lastSyncAt: new Date(), lastError: null },
    });
    return NextResponse.json({ ok: true, campaignId: id, sent: !!d.send });
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : e instanceof Error ? e.message : "Erreur fournisseur.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
