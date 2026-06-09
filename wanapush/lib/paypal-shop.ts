// Helper PayPal (Orders API v2) par Shop — pendant de lib/stripe-shop.ts.
// Chaque boutique a ses propres identifiants (clientId/secret) chiffrés AES-256-GCM
// + un mode sandbox/live. Aucune dépendance : appels REST via fetch.
//
// Flux : create order (server, montant calculé server-side) → le client approuve
// via le PayPal JS SDK → capture (server) → création de la commande atomique.
// Doc : https://developer.paypal.com/docs/api/orders/v2/

import type { Shop } from "@/lib/generated/prisma/client";
import { decrypt } from "@/lib/crypto";

export type PayPalCreds = { clientId: string; secret: string; baseUrl: string };

export function paypalCredsForShop(shop: Shop): PayPalCreds | null {
  if (!shop.paypalClientId || !shop.paypalSecret) return null;
  try {
    const clientId = decrypt(shop.paypalClientId);
    const secret = decrypt(shop.paypalSecret);
    const baseUrl =
      shop.paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    return { clientId, secret, baseUrl };
  } catch (e) {
    console.error("[paypal-shop] decrypt failed:", e);
    return null;
  }
}

/** Montant PayPal = string décimale ("10.00"). 0 décimale pour JPY/KRW/etc. */
export function toPayPalAmount(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const zeroDecimal = ["JPY", "KRW", "VND", "CLP", "PYG", "XAF", "XOF", "HUF"];
  return zeroDecimal.includes(currency.toUpperCase()) ? String(Math.round(n)) : n.toFixed(2);
}

async function getAccessToken(creds: PayPalCreds): Promise<string> {
  const basic = Buffer.from(`${creds.clientId}:${creds.secret}`).toString("base64");
  const res = await fetch(`${creds.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal OAuth ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error("PayPal: access_token manquant");
  return j.access_token;
}

export type PayPalOrder = {
  id: string;
  status: string;
  // Le custom_id que NOUS avons posé au create (= cartId), renvoyé tel quel par PayPal.
  customId?: string | null;
  amount?: string | null;
  currency?: string | null;
  payerEmail?: string | null;
  payerName?: string | null;
  captureId?: string | null;
  shipping?: unknown;
};

/**
 * Crée une commande PayPal (intent CAPTURE). `amount`/`currency` viennent du
 * panier côté serveur (jamais du client). `customId` = cartId pour résoudre le
 * panier à la capture sans faire confiance au client.
 */
export async function createPayPalOrder(
  shop: Shop,
  opts: { amount: string; currency: string; customId: string; description?: string },
): Promise<{ id: string }> {
  const creds = paypalCredsForShop(shop);
  if (!creds) throw new Error("PayPal non configuré pour cette boutique");
  const token = await getAccessToken(creds);

  const res = await fetch(`${creds.baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: opts.customId,
          description: opts.description?.slice(0, 127),
          amount: { currency_code: opts.currency.toUpperCase(), value: opts.amount },
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`PayPal create order ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const j = (await res.json()) as { id?: string };
  if (!j.id) throw new Error("PayPal: order id manquant");
  return { id: j.id };
}

/**
 * Vérifie la signature d'un webhook PayPal via la méthode POSTBACK (recommandée) :
 * on renvoie les en-têtes de transmission + le webhook_id (config marchand) + l'event
 * à PayPal qui confirme la signature RSA-SHA256. Nécessite `shop.paypalWebhookId`.
 * Doc : POST /v1/notifications/verify-webhook-signature.
 */
export async function verifyPayPalWebhook(
  shop: Shop,
  headers: Record<string, string | null>,
  event: unknown,
): Promise<boolean> {
  const creds = paypalCredsForShop(shop);
  if (!creds || !shop.paypalWebhookId) return false;
  let token: string;
  try {
    token = await getAccessToken(creds);
  } catch {
    return false;
  }
  const res = await fetch(`${creds.baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: shop.paypalWebhookId,
      webhook_event: event,
    }),
  });
  if (!res.ok) return false;
  const j = (await res.json()) as { verification_status?: string };
  return j.verification_status === "SUCCESS";
}

/** Capture une commande PayPal approuvée. Throw si la capture n'est pas COMPLETED. */
export async function capturePayPalOrder(shop: Shop, orderId: string): Promise<PayPalOrder> {
  const creds = paypalCredsForShop(shop);
  if (!creds) throw new Error("PayPal non configuré pour cette boutique");
  const token = await getAccessToken(creds);

  const res = await fetch(`${creds.baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`PayPal capture ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const j = (await res.json()) as {
    id: string;
    status: string;
    payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
    purchase_units?: Array<{
      custom_id?: string;
      shipping?: unknown;
      payments?: { captures?: Array<{ id?: string; amount?: { value?: string; currency_code?: string } }> };
    }>;
  };

  const pu = j.purchase_units?.[0];
  const capture = pu?.payments?.captures?.[0];
  const name = j.payer?.name;
  return {
    id: j.id,
    status: j.status,
    customId: pu?.custom_id ?? null,
    amount: capture?.amount?.value ?? null,
    currency: capture?.amount?.currency_code ?? null,
    payerEmail: j.payer?.email_address ?? null,
    payerName: name ? [name.given_name, name.surname].filter(Boolean).join(" ") || null : null,
    captureId: capture?.id ?? null,
    shipping: pu?.shipping ?? null,
  };
}
