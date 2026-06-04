// POST /api/storefront/[siteSlug]/customer/login
// Crée ou récupère le Customer par email, envoie un email avec un magic link
// (token de 30min) qui pointe vers /api/storefront/[slug]/customer/verify.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signCustomerToken, MAGIC_TTL_MIN } from "@/lib/customer-auth";

export const runtime = "nodejs";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const inputSchema = z.object({
  email: z.email({ error: "Email invalide" }).trim().toLowerCase().max(255),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const { email } = parsed.data;

  // Upsert client par email (sans nécessairement d'orders, juste pour identité)
  const customer = await prisma.customer.upsert({
    where: { shopId_email: { shopId: shop.id, email } },
    create: { shopId: shop.id, email },
    update: {},
  });
  if (customer.blocked) {
    return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
  }

  const token = signCustomerToken({ customerId: customer.id, shopId: shop.id }, MAGIC_TTL_MIN * 60);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanatest.com";
  const magicUrl = `${base}/api/storefront/${siteSlug}/customer/verify?token=${encodeURIComponent(token)}`;

  if (resend) {
    const from = shop.fromEmail
      ? `${shop.fromName ?? shop.name} <${shop.fromEmail}>`
      : "WanaPush <onboarding@resend.dev>";
    const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:40px 0;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="500" style="background:white;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;">
          <h1 style="margin:0;font-size:22px;">Connexion à ${shop.name}</h1>
        </td></tr>
        <tr><td style="padding:32px;color:#374151;font-size:15px;line-height:1.7;">
          <p>Pour te connecter, clique sur le bouton ci-dessous. Le lien expire dans ${MAGIC_TTL_MIN} minutes.</p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${magicUrl}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:white;border-radius:10px;font-weight:700;text-decoration:none;">
              Me connecter
            </a>
          </p>
          <p style="color:#9ca3af;font-size:12px;">Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    try {
      await resend.emails.send({
        from,
        to: email,
        subject: `Connexion à ${shop.name}`,
        html,
        replyTo: shop.fromEmail || undefined,
      });
    } catch (e) {
      console.error("[customer/login] resend error:", e);
    }
  } else {
    console.warn("[customer/login] RESEND_API_KEY absente — magic link non envoyé :", magicUrl);
  }

  return NextResponse.json({ ok: true });
}
