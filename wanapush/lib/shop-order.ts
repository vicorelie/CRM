// Création de commande payée — logique PARTAGÉE entre les providers de paiement
// (Stripe, PayPal, …). Extraite du webhook Stripe pour éviter la duplication, et
// wrappée dans un `$transaction` (audit H5 : la création order + stock + discount
// + customer doit être atomique, sinon un échec milieu laisse un état incohérent).
//
// Idempotence : si le panier est déjà COMPLETED, on ne recrée pas de commande
// (protège contre un double webhook / double capture).

import { prisma } from "@/lib/prisma";
import { sendOrderConfirmation } from "@/lib/shop-email";

export type ClickIds = {
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  liFatId?: string | null;
  ttclid?: string | null;
};

export type PaidOrderInput = {
  shopId: string;
  cartId: string;
  provider: "stripe" | "paypal";
  /** Référence paiement (payment_intent Stripe, capture id PayPal). */
  paymentRef: string | null;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingAddress?: unknown;
  billingAddress?: unknown;
  shippingMethod?: string | null;
  /** Montants en unité majeure (€). Si total absent → calculé depuis le panier. */
  amounts?: {
    shippingCost?: number;
    taxAmount?: number;
    discountAmount?: number;
    total?: number;
  };
  clickIds?: ClickIds;
  discountCode?: string | null;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; reason: "cart_not_found" | "already_completed" };

/**
 * Crée une commande payée depuis un panier, de façon ATOMIQUE. Retourne l'orderId.
 * Les effets de bord non critiques (upload conversions, email) sont déclenchés
 * APRÈS la transaction, en fire-and-forget.
 */
export async function createPaidOrderFromCart(input: PaidOrderInput): Promise<CreateOrderResult> {
  const cart = await prisma.cart.findUnique({
    where: { id: input.cartId },
    include: {
      items: {
        include: {
          variant: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } },
        },
      },
    },
  });
  if (!cart) return { ok: false, reason: "cart_not_found" };
  if (cart.status === "COMPLETED") return { ok: false, reason: "already_completed" };

  const { shopId } = input;
  const clk = input.clickIds ?? {};
  const gclid = clk.gclid?.slice(0, 255) || null;
  const gbraid = clk.gbraid?.slice(0, 255) || null;
  const wbraid = clk.wbraid?.slice(0, 255) || null;
  const liFatId = clk.liFatId?.slice(0, 255) || null;
  const ttclid = clk.ttclid?.slice(0, 255) || null;

  const subtotal = cart.items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
  const shippingCost = input.amounts?.shippingCost ?? Number(cart.shipping ?? 0);
  const taxAmount = input.amounts?.taxAmount ?? 0;
  const discountAmount = input.amounts?.discountAmount ?? Number(cart.discount ?? 0);
  const total = input.amounts?.total ?? subtotal + shippingCost + taxAmount - discountAmount;

  const customerEmail = input.customerEmail;
  const customerName = input.customerName ?? null;
  const customerPhone = input.customerPhone ?? null;
  const discountCode = input.discountCode ?? cart.discountCode ?? null;

  // ── Transaction atomique (audit H5) ───────────────────────────────────────
  const result = await prisma.$transaction(async (tx) => {
    // Re-check idempotence DANS la tx (anti-race sur retries concurrents).
    const fresh = await tx.cart.findUnique({ where: { id: cart.id }, select: { status: true } });
    if (!fresh || fresh.status === "COMPLETED") return null;

    const shop = await tx.shop.update({
      where: { id: shopId },
      data: { orderNumberSeq: { increment: 1 } },
    });
    const orderNumber = `#${shop.orderNumberSeq}`;

    let customerId: string | null = null;
    if (customerEmail) {
      const [first = "", ...rest] = (customerName ?? "").split(" ");
      const lastName = rest.join(" ");
      const customer = await tx.customer.upsert({
        where: { shopId_email: { shopId, email: customerEmail } },
        create: {
          shopId, email: customerEmail,
          firstName: first || null, lastName: lastName || null, phone: customerPhone,
          totalSpent: total, ordersCount: 1, lastOrderAt: new Date(),
        },
        update: {
          firstName: first || undefined, lastName: lastName || undefined, phone: customerPhone ?? undefined,
          totalSpent: { increment: total }, ordersCount: { increment: 1 }, lastOrderAt: new Date(),
        },
      });
      customerId = customer.id;
    }

    const order = await tx.order.create({
      data: {
        shopId, customerId, orderNumber,
        status: "CONFIRMED", financialStatus: "PAID", fulfillmentStatus: "UNFULFILLED",
        customerEmail, customerName, customerPhone,
        shippingAddressJson: (input.shippingAddress ?? null) as never,
        billingAddressJson: (input.billingAddress ?? null) as never,
        currency: cart.currency,
        subtotal, shippingCost, taxAmount, discountAmount, total,
        paymentMethod: input.provider,
        paymentIntentId: input.paymentRef,
        paidAt: new Date(),
        shippingMethod: input.shippingMethod ?? null,
        gclid, gbraid, wbraid, liFatId, ttclid,
        ecStatus: gclid || gbraid || wbraid ? "PENDING" : null,
        liStatus: liFatId || customerEmail ? "PENDING" : null,
        ttStatus: ttclid || customerEmail ? "PENDING" : null,
        discountCode: discountCode ?? undefined,
        items: {
          create: cart.items.map((it) => ({
            variantId: it.variantId,
            productTitle: it.variant.product.title,
            variantTitle: it.variant.title !== "Default" ? it.variant.title : null,
            sku: it.variant.sku,
            imageUrl: it.variant.product.images[0]?.url ?? null,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: Number(it.unitPrice) * it.quantity,
            weight: it.variant.weight,
          })),
        },
      },
    });

    await tx.cart.update({ where: { id: cart.id }, data: { status: "COMPLETED" } });

    // Décrément stock (default location)
    const defaultLoc = await tx.stockLocation.findFirst({ where: { shopId, isDefault: true }, select: { id: true } });
    if (defaultLoc) {
      for (const it of cart.items) {
        await tx.stockLevel.updateMany({
          where: { variantId: it.variantId, locationId: defaultLoc.id },
          data: { quantity: { decrement: it.quantity } },
        });
      }
    }

    // Usage du code promo
    if (discountCode) {
      const d = await tx.discount.findFirst({ where: { shopId, code: discountCode }, select: { id: true } });
      if (d) {
        await tx.discount.update({ where: { id: d.id }, data: { usageCount: { increment: 1 } } });
        await tx.discountUsage.create({
          data: { discountId: d.id, customerId, orderId: order.id, amount: order.discountAmount },
        });
      }
    }

    await tx.auditLog.create({
      data: { shopId, action: "order.create", resource: order.id, details: { orderNumber, total, customerEmail, provider: input.provider } },
    });

    return { orderId: order.id, orderNumber };
  });

  if (!result) return { ok: false, reason: "already_completed" };

  // ── Effets de bord post-commit (non bloquants) ────────────────────────────
  if (gclid || gbraid || wbraid || customerEmail) {
    import("@/lib/ads/enhanced-conversions-pipeline")
      .then((m) => m.triggerSaleConversionForOrder(result.orderId))
      .catch((e) => console.warn(`[order] Google EC trigger failed ${result.orderId}: ${e instanceof Error ? e.message : e}`));
  }
  if (liFatId || customerEmail) {
    import("@/lib/ads/enhanced-conversions-pipeline")
      .then((m) => m.triggerLinkedInSaleForOrder(result.orderId))
      .catch((e) => console.warn(`[order] LinkedIn CAPI trigger failed ${result.orderId}: ${e instanceof Error ? e.message : e}`));
  }
  if (ttclid || customerEmail) {
    import("@/lib/ads/enhanced-conversions-pipeline")
      .then((m) => m.triggerTikTokSaleForOrder(result.orderId))
      .catch((e) => console.warn(`[order] TikTok Events trigger failed ${result.orderId}: ${e instanceof Error ? e.message : e}`));
  }

  const orderFull = await prisma.order.findUnique({ where: { id: result.orderId }, include: { items: true } });
  const shopFull = await prisma.shop.findUnique({ where: { id: shopId } });
  if (orderFull && shopFull) {
    sendOrderConfirmation(shopFull, orderFull).catch((e) => console.error("[order] confirmation email failed:", e));
  }

  return { ok: true, orderId: result.orderId, orderNumber: result.orderNumber };
}
