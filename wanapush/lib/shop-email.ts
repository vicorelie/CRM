// Envoi des emails transactionnels boutique (confirmation, expédition, etc.)
// via Resend. La clé RESEND_API_KEY est globale (dans .env), partagée par
// toutes les boutiques. L'expéditeur vient de shop.fromEmail / shop.fromName.

import { Resend } from "resend";
import type { Order, Shop } from "@/lib/generated/prisma/client";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type OrderWithItems = Order & {
  items: Array<{
    productTitle: string;
    variantTitle: string | null;
    quantity: number;
    unitPrice: unknown;
    totalPrice: unknown;
    imageUrl: string | null;
  }>;
};

function formatMoney(amount: number | string, currency: string, locale: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
  } catch {
    return n.toFixed(2) + " " + currency;
  }
}

function escape(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export async function sendOrderConfirmation(shop: Shop, order: OrderWithItems): Promise<boolean> {
  if (!resend || !order.customerEmail) {
    console.warn("[shop-email] skip (no Resend key or no customer email)");
    return false;
  }
  const from = shop.fromEmail
    ? `${shop.fromName ?? shop.name} <${shop.fromEmail}>`
    : "WanaPush <onboarding@resend.dev>"; // fallback Resend test sender
  const subject = `Confirmation de votre commande ${order.orderNumber}`;

  const ship = (order.shippingAddressJson ?? null) as null | {
    line1?: string; line2?: string; city?: string; postal_code?: string; country?: string;
  };

  const itemsHtml = order.items.map((it) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
        ${it.imageUrl ? `<img src="${escape(it.imageUrl)}" width="60" height="60" style="border-radius:8px;object-fit:cover;vertical-align:middle;margin-right:12px;" />` : ""}
        <span style="display:inline-block;vertical-align:middle;">
          <strong style="color:#111827;">${escape(it.productTitle)}</strong>
          ${it.variantTitle ? `<br/><span style="color:#6b7280;font-size:12px;">${escape(it.variantTitle)}</span>` : ""}
          <br/><span style="color:#6b7280;font-size:12px;">Qté : ${it.quantity}</span>
        </span>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;">
        ${formatMoney(Number(it.totalPrice), order.currency, shop.locale)}
      </td>
    </tr>
  `).join("");

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,system-ui,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="background:white;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;">
          ${shop.logoUrl ? `<img src="${escape(shop.logoUrl)}" alt="" style="max-height:48px;margin-bottom:16px;" />` : ""}
          <h1 style="margin:0 0 8px;font-size:22px;">Merci pour votre commande !</h1>
          <p style="margin:0;opacity:0.9;font-size:14px;">Commande ${escape(order.orderNumber)} · ${escape(shop.name)}</p>
        </td></tr>

        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Bonjour ${escape(order.customerName) || escape(order.customerEmail)},
          </p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            Nous avons bien reçu votre commande. Voici le récapitulatif :
          </p>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
            ${itemsHtml}
          </table>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;border-radius:10px;padding:16px;">
            <tr><td style="color:#6b7280;font-size:13px;">Sous-total</td>
              <td align="right" style="color:#111827;font-size:13px;">${formatMoney(Number(order.subtotal), order.currency, shop.locale)}</td></tr>
            ${Number(order.shippingCost) > 0 ? `<tr><td style="color:#6b7280;font-size:13px;padding-top:6px;">Livraison</td>
              <td align="right" style="color:#111827;font-size:13px;padding-top:6px;">${formatMoney(Number(order.shippingCost), order.currency, shop.locale)}</td></tr>` : ""}
            ${Number(order.taxAmount) > 0 ? `<tr><td style="color:#6b7280;font-size:13px;padding-top:6px;">TVA</td>
              <td align="right" style="color:#111827;font-size:13px;padding-top:6px;">${formatMoney(Number(order.taxAmount), order.currency, shop.locale)}</td></tr>` : ""}
            ${Number(order.discountAmount) > 0 ? `<tr><td style="color:#059669;font-size:13px;padding-top:6px;">Remise</td>
              <td align="right" style="color:#059669;font-size:13px;padding-top:6px;">-${formatMoney(Number(order.discountAmount), order.currency, shop.locale)}</td></tr>` : ""}
            <tr><td colspan="2" style="padding:8px 0;border-top:1px solid #e5e7eb;"></td></tr>
            <tr><td style="color:#111827;font-size:16px;font-weight:700;">Total</td>
              <td align="right" style="color:#111827;font-size:16px;font-weight:700;">${formatMoney(Number(order.total), order.currency, shop.locale)}</td></tr>
          </table>

          ${ship ? `
          <div style="margin-top:24px;padding-top:24px;border-top:1px solid #e5e7eb;">
            <strong style="color:#111827;display:block;margin-bottom:6px;">Adresse de livraison</strong>
            <div style="color:#6b7280;font-size:13px;line-height:1.6;">
              ${escape(ship.line1)}<br/>
              ${ship.line2 ? `${escape(ship.line2)}<br/>` : ""}
              ${escape(ship.postal_code)} ${escape(ship.city)}<br/>
              ${escape(ship.country)}
            </div>
          </div>
          ` : ""}

          <p style="margin:32px 0 0;color:#6b7280;font-size:13px;line-height:1.6;text-align:center;">
            Une question ? Réponds simplement à cet email.
          </p>
        </td></tr>

        <tr><td style="padding:20px 32px;background:#f9fafb;text-align:center;color:#9ca3af;font-size:11px;">
          ${escape(shop.legalName ?? shop.name)}
          ${shop.legalAddress ? `· ${escape(shop.legalAddress)}` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const r = await resend.emails.send({
      from,
      to: order.customerEmail,
      subject,
      html,
      replyTo: shop.fromEmail || undefined,
    });
    if (r.error) {
      console.error("[shop-email] resend error:", r.error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[shop-email] send failed:", e);
    return false;
  }
}
