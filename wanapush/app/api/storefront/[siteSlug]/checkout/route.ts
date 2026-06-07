// POST /api/storefront/[siteSlug]/checkout
// Crée une Stripe Checkout Session à partir du panier courant.
// Renvoie l'URL de checkout hébergé par Stripe → le client redirige.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripeForShop, toMinorUnit } from "@/lib/stripe-shop";

export const runtime = "nodejs";

const inputSchema = z.object({
  sessionId: z.string().trim().min(1).max(128),
  email: z.email().trim().toLowerCase().max(255).optional(),
  // Click identifiers Google Ads — captés côté storefront depuis l'URL de la
  // landing page (?gclid=…) et propagés au checkout pour Enhanced Conversions.
  gclid: z.string().trim().max(255).optional(),
  gbraid: z.string().trim().max(255).optional(),
  wbraid: z.string().trim().max(255).optional(),
  // LinkedIn First-Party Ads Tracking UUID (cookie `li_fat_id`)
  liFatId: z.string().trim().max(255).optional(),
});

type Params = { params: Promise<{ siteSlug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { siteSlug } = await params;
  const shop = await prisma.shop.findUnique({ where: { siteSlug } });
  if (!shop) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });

  const stripe = stripeForShop(shop);
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe n'est pas encore configuré. Le marchand doit ajouter sa clé secrète dans les paramètres." },
      { status: 503 },
    );
  }

  const parsed = inputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Charge le panier
  const cart = await prisma.cart.findFirst({
    where: { shopId: shop.id, sessionId: body.sessionId, status: "ACTIVE" },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: { images: { take: 1, orderBy: { position: "asc" } } },
              },
            },
          },
        },
      },
    },
  });
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }

  // Construit les line items pour Stripe
  const lineItems: Array<{ price_data: { currency: string; product_data: { name: string; description?: string; images?: string[]; metadata?: Record<string, string> }; unit_amount: number; tax_behavior?: "inclusive" | "exclusive" }; quantity: number }> = cart.items.map((it) => {
    const img = it.variant.product.images[0]?.url;
    return {
      price_data: {
        currency: cart.currency.toLowerCase(),
        product_data: {
          name: it.variant.product.title + (it.variant.title !== "Default" ? " — " + it.variant.title : ""),
          description: it.variant.product.excerpt ?? undefined,
          images: img && img.startsWith("http") ? [img] : undefined,
          metadata: { variantId: it.variantId, productId: it.variant.productId },
        },
        unit_amount: toMinorUnit(it.unitPrice.toString(), cart.currency),
        tax_behavior: shop.taxesIncluded ? "inclusive" : "exclusive",
      },
      quantity: it.quantity,
    };
  });

  // Charge les méthodes de livraison disponibles (toutes zones, MVP)
  const shippingMethods = await prisma.shippingMethod.findMany({
    where: { zone: { shopId: shop.id }, enabled: true, type: { in: ["FLAT", "FREE", "PICKUP"] } },
    take: 5,
  });
  const shippingOptions = shippingMethods.map((m) => ({
    shipping_rate_data: {
      type: "fixed_amount" as const,
      fixed_amount: {
        amount: toMinorUnit(Number(m.flatRate ?? 0), cart.currency),
        currency: cart.currency.toLowerCase(),
      },
      display_name: m.name,
      delivery_estimate: m.estimatedDays
        ? { minimum: { unit: "business_day" as const, value: 1 }, maximum: { unit: "business_day" as const, value: 7 } }
        : undefined,
    },
  }));

  // URL de retour (success/cancel) - on revient sur le site
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wanatest.com";
  const successUrl = `${base}/preview/${siteSlug}/?order=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}/preview/${siteSlug}/?order=cancel`;

  // Si un code promo est appliqué au panier, on crée un Stripe Coupon dynamique
  // qui sera attaché à la session de checkout (passe par stripe.coupons.create
  // puis discounts: [{ coupon }]).
  let stripeCouponId: string | undefined;
  if (cart.discountCode && Number(cart.discount) > 0) {
    const dbDiscount = await prisma.discount.findFirst({
      where: { shopId: shop.id, code: cart.discountCode, enabled: true },
    });
    if (dbDiscount) {
      try {
        const couponParams: Record<string, unknown> = { duration: "once", name: dbDiscount.code };
        if (dbDiscount.type === "PERCENTAGE") {
          couponParams.percent_off = Number(dbDiscount.value);
        } else if (dbDiscount.type === "FIXED_AMOUNT") {
          couponParams.amount_off = toMinorUnit(Number(dbDiscount.value), cart.currency);
          couponParams.currency = cart.currency.toLowerCase();
        }
        const coupon = await stripe.coupons.create(couponParams as never);
        stripeCouponId = coupon.id;
      } catch (e) {
        console.warn("[checkout] coupon dynamic create failed:", e);
      }
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      // Le typage strict des codes pays est variable selon la version de
      // @types/stripe ; on caste en `as never` pour éviter le mismatch sans
      // perdre la valeur effective.
      shipping_address_collection: shop.requireShipping
        ? { allowed_countries: (["FR", "BE", "CH", "LU", "DE", "ES", "IT", "PT", "NL", "GB"] as unknown) as never }
        : undefined,
      shipping_options: shippingOptions.length > 0 ? shippingOptions : undefined,
      customer_email: body.email,
      // Code promo (notre Discount → Stripe Coupon dynamique). Si pas de code,
      // on permet à Stripe d'afficher son propre champ promo_code (utilisable
      // par des Promotion Codes natifs Stripe).
      discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
      allow_promotion_codes: stripeCouponId ? undefined : true,
      automatic_tax: { enabled: false }, // Stripe Tax désactivé par défaut, opt-in à venir
      metadata: {
        cartId: cart.id,
        shopId: shop.id,
        siteSlug,
        discountCode: cart.discountCode ?? "",
        // Click identifiers propagés au webhook → stockés sur Order pour upload
        // Enhanced Conversions Google Ads + LinkedIn CAPI après paiement.
        gclid: body.gclid ?? "",
        gbraid: body.gbraid ?? "",
        wbraid: body.wbraid ?? "",
        liFatId: body.liFatId ?? "",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Audit (note : le shop.id est dans shopId)
    await prisma.auditLog.create({
      data: { shopId: shop.id, action: "checkout.create", resource: session.id, details: { cartId: cart.id, total: cart.total } },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur Stripe";
    console.error("[checkout] Stripe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

