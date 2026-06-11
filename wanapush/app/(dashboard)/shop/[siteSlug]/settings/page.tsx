import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getShopForUser } from "@/lib/shop";
import { SettingsClient } from "./SettingsClient";

// useSearchParams (onglet via ?tab=) → rendu dynamique (pas de static-gen).
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const shop = await getShopForUser(session.user.email, siteSlug);
  if (!shop) notFound();

  return (
    <SettingsClient
      siteSlug={siteSlug}
      initial={{
        name: shop.name,
        description: shop.description ?? "",
        currency: shop.currency,
        locale: shop.locale,
        timezone: shop.timezone,
        weightUnit: shop.weightUnit,
        email: shop.email ?? "",
        phone: shop.phone ?? "",
        legalName: shop.legalName ?? "",
        legalAddress: shop.legalAddress ?? "",
        vatNumber: shop.vatNumber ?? "",
        logoUrl: shop.logoUrl ?? "",
        // Stripe
        stripeMode: shop.stripeMode,
        stripeAccountId: shop.stripeAccountId ?? "",
        stripePublishableKey: shop.stripePublishableKey ?? "",
        hasStripeSecret: !!shop.stripeSecretKey,
        hasStripeWebhook: !!shop.stripeWebhookSecret,
        // PayPal
        paypalMode: shop.paypalMode,
        paypalClientId: shop.paypalClientId ?? "",
        hasPaypalSecret: !!shop.paypalSecret,
        // Emails
        fromEmail: shop.fromEmail ?? "",
        fromName: shop.fromName ?? "",
        // Settings
        taxesIncluded: shop.taxesIncluded,
        requireShipping: shop.requireShipping,
        allowGuestCheckout: shop.allowGuestCheckout,
      }}
    />
  );
}
