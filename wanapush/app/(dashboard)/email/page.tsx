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

export default async function EmailPage() {
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
    />
  );
}
