// POST /api/email/webhooks/resend
// Webhook Resend (Svix-signed). Vérifie signature HMAC-SHA256 puis applique l'event.
//
// À configurer côté Resend Dashboard > Webhooks :
//  - URL : https://wanapush.com/api/email/webhooks/resend
//  - Events : email.sent, email.delivered, email.opened, email.clicked,
//             email.bounced, email.complained, email.failed
//  - Copier le signing secret (whsec_...) dans RESEND_WEBHOOK_SECRET (.env)

import { NextResponse } from "next/server";
import { verifyResendSignature, applyResendEvent, type ResendEvent } from "@/lib/email/webhooks";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET non configuré" }, { status: 503 });
  }

  // Lecture RAW body avant tout parsing (signature dépend des octets exacts)
  const rawBody = await req.text();
  const headers = {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  };

  if (!verifyResendSignature(rawBody, headers, secret)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  try {
    const r = await applyResendEvent(event);
    return NextResponse.json({ received: true, matched: r.matched });
  } catch (e) {
    console.error("[resend-webhook] apply failed:", e);
    return NextResponse.json({ received: true, error: "apply failed" });
  }
}
