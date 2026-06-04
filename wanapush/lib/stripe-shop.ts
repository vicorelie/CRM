// Helper pour utiliser Stripe avec les clés CHIFFRÉES de chaque Shop.
// Chaque boutique a sa propre paire de clés (test/live) stockée chiffrée
// AES-256-GCM dans la BDD via lib/crypto.ts.

import Stripe from "stripe";
import type { Shop } from "@prisma/client";
import { decrypt } from "@/lib/crypto";

/**
 * Construit un client Stripe pour un Shop donné, en déchiffrant sa clé secrète.
 * Retourne null si la clé n'est pas configurée.
 */
export function stripeForShop(shop: Shop): Stripe | null {
  if (!shop.stripeSecretKey) return null;
  try {
    const key = decrypt(shop.stripeSecretKey);
    return new Stripe(key, { apiVersion: "2026-04-22.dahlia", typescript: true });
  } catch (e) {
    console.error("[stripe-shop] decrypt failed:", e);
    return null;
  }
}

/** Déchiffre le webhook signing secret. Retourne null si absent. */
export function webhookSecretForShop(shop: Shop): string | null {
  if (!shop.stripeWebhookSecret) return null;
  try {
    return decrypt(shop.stripeWebhookSecret);
  } catch {
    return null;
  }
}

/** Convertit un montant en plus petite unité (cents) selon la currency. */
export function toMinorUnit(amount: number | string, currency: string): number {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  // Currencies sans décimales (Stripe : JPY, KRW, etc.)
  const zeroDecimal = ["JPY", "KRW", "VND", "CLP", "PYG", "XAF", "XOF"];
  if (zeroDecimal.includes(currency.toUpperCase())) return Math.round(n);
  return Math.round(n * 100);
}
