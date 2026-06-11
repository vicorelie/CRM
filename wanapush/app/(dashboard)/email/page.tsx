// Email marketing — page réelle (le backend Resend + APIs contacts/campaigns existe déjà).
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmailClient } from "./EmailClient";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true },
  });
  if (!user) redirect("/login");

  // Domaine d'envoi vérifié WanaPush (le même que l'optimizer/rapports hebdo).
  // → l'utilisateur n'a AUCUN domaine à vérifier : ça marche d'emblée.
  // On dérive le domaine depuis l'adresse vérifiée existante pour rester synchro.
  const verifiedFrom = process.env.OPTIMIZER_EMAIL_FROM ?? "autopilote@wanapush.com";
  const verifiedDomain = (verifiedFrom.match(/@([^>\s]+)/)?.[1] ?? "wanapush.com").trim();
  const defaultFromEmail = `newsletters@${verifiedDomain}`;

  const [activeContacts, totalContacts, sentCampaigns, campaigns] = await Promise.all([
    prisma.emailContact.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.emailContact.count({ where: { userId: user.id } }),
    prisma.emailCampaign.count({ where: { userId: user.id, status: "SENT" } }),
    prisma.emailCampaign.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, subject: true, status: true, sentAt: true, stats: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <EmailClient
      activeContacts={activeContacts}
      totalContacts={totalContacts}
      sentCampaigns={sentCampaigns}
      defaultFromName={user.name ?? "WanaPush"}
      defaultFromEmail={defaultFromEmail}
      replyTo={user.email}
      campaigns={campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        status: c.status,
        sentAt: c.sentAt ? c.sentAt.toISOString() : null,
        stats: (c.stats as Record<string, number> | null) ?? null,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
