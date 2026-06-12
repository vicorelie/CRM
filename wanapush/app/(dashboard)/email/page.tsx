// Email marketing — orchestration d'une plateforme pro (Brevo).
// WanaPush ne réenvoie plus lui-même : il connecte Brevo, affiche les vraies
// audiences/campagnes et permet de créer + envoyer via Brevo (délivrabilité pro).
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserEmailConnection, ProviderError } from "@/lib/email-providers";
import type { ProviderList, ProviderSender, ProviderCampaign } from "@/lib/email-providers";
import { EmailConnect } from "./EmailConnect";
import { EmailDashboard } from "./EmailDashboard";

export const dynamic = "force-dynamic";

// Brief prérempli quand on arrive via la carte auto-pilote « Relance tes clients
// inactifs ». Best practice win-back 2026 : ton « tu nous manques », offre de retour
// (livraison gratuite > % remise), CTA clair, bref et chaleureux.
const WINBACK_BRIEF =
  "Campagne de réengagement pour des clients qui n'ont pas commandé depuis 90 jours. " +
  "Ton chaleureux « tu nous manques » (pas « reviens »), rappelle la valeur de la marque, " +
  "propose une offre de retour attractive (idéalement la livraison gratuite, plus efficace qu'un % de remise), " +
  "un seul appel à l'action clair, et reste bref.";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { intent } = await searchParams;
  const initialBrief = intent === "winback" ? WINBACK_BRIEF : "";
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true },
  });
  if (!user) redirect("/login");

  const conn = await getUserEmailConnection(user.id);
  if (!conn) {
    return <EmailConnect />;
  }

  // Données réelles Brevo (en parallèle). Si la clé n'est plus valide → reconnect.
  let lists: ProviderList[] = [];
  let senders: ProviderSender[] = [];
  let campaigns: ProviderCampaign[] = [];
  let providerError: string | null = null;
  try {
    [lists, senders, campaigns] = await Promise.all([
      conn.provider.getLists(conn.apiKey),
      conn.provider.getSenders(conn.apiKey),
      conn.provider.getCampaigns(conn.apiKey, 10),
    ]);
  } catch (e) {
    providerError =
      e instanceof ProviderError ? e.message : "Connexion au fournisseur impossible. Reconnecte ta clé.";
  }

  return (
    <EmailDashboard
      providerLabel={conn.provider.label}
      accountEmail={conn.accountEmail}
      accountName={conn.accountName}
      plan={conn.plan}
      replyTo={user.email}
      lists={lists}
      senders={senders}
      campaigns={campaigns}
      providerError={providerError}
      initialBrief={initialBrief}
    />
  );
}
