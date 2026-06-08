// GET  /api/email/unsubscribe/[token] : page de confirmation
// POST /api/email/unsubscribe/[token] : RFC 8058 one-click (Gmail/Yahoo)
//
// Token format : base64url("{contactId}.{sendId}.HMAC") — vérifié stateless.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

async function processUnsub(contactId: string, sendId: string | null): Promise<void> {
  await prisma.emailContact.update({
    where: { id: contactId },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
  if (sendId) {
    await prisma.emailSend.update({
      where: { id: sendId },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    }).catch(() => undefined);
  }
}

/** POST = RFC 8058 one-click unsubscribe (Gmail/Yahoo).
 *  Le body est `List-Unsubscribe=One-Click` mais on n'a pas besoin de le valider —
 *  la présence d'un POST sur l'URL signée suffit. */
export async function POST(_req: Request, { params }: Params) {
  const { token } = await params;
  const decoded = verifyUnsubToken(token);
  if (!decoded) return NextResponse.json({ error: "Token invalide" }, { status: 400 });
  try {
    await processUnsub(decoded.contactId, decoded.sendId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }
}

/** GET = lien dans le footer email. Process puis affiche une page de confirmation. */
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const decoded = verifyUnsubToken(token);
  if (!decoded) {
    return new NextResponse(htmlPage("Lien invalide", "Le lien de désabonnement a expiré ou est invalide."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  try {
    await processUnsub(decoded.contactId, decoded.sendId);
    return new NextResponse(
      htmlPage("Désabonnement confirmé", "Vous ne recevrez plus d'emails marketing de notre part. Vous pouvez fermer cette page."),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch {
    return new NextResponse(htmlPage("Erreur", "Le contact n'existe plus."), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:48px 16px;background:#f9fafb;color:#374151"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center"><h1 style="font-size:22px;color:#111;margin:0 0 16px">${title}</h1><p style="margin:0 0 8px;line-height:1.6">${body}</p></div></body></html>`;
}
