// Exécute un ScheduledPost : pour chaque target, appelle le connecteur,
// rafraîchit le token si besoin, et met à jour les statuts.
import { prisma } from "@/lib/prisma";
import { ensureFreshAccount, getConnector, toConnectorAccount } from "@/lib/social";
import type { Media } from "./types";

export async function runScheduledPost(postId: string) {
  // Claim ATOMIQUE : on ne traite le post que si on réussit à le passer d'un
  // état "à publier" (DRAFT manuel / SCHEDULED cron / FAILED retry) → PUBLISHING.
  // Si count === 0, le post est déjà PUBLISHING/PUBLISHED → un autre run (cron
  // concurrent, multi-instance, publication manuelle simultanée) l'a déjà pris :
  // on s'arrête pour éviter une DOUBLE PUBLICATION sur les comptes du client. (Audit C4)
  const claim = await prisma.scheduledPost.updateMany({
    where: { id: postId, status: { in: ["DRAFT", "SCHEDULED", "FAILED"] } },
    data: { status: "PUBLISHING" },
  });
  if (claim.count === 0) {
    return { ok: true, okCount: 0, failCount: 0, skipped: true as const };
  }

  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    include: { targets: { include: { account: true } } },
  });
  if (!post) throw new Error("Post introuvable");

  const media = (post.mediaUrls as unknown as Media[]) ?? [];
  const options = (post.options as Record<string, unknown> | null) ?? {};
  let okCount = 0;
  let failCount = 0;

  for (const target of post.targets) {
    if (target.status === "PUBLISHED") {
      okCount++;
      continue;
    }
    try {
      await prisma.scheduledPostTarget.update({
        where: { id: target.id },
        data: { status: "PUBLISHING", attempts: { increment: 1 } },
      });
      const fresh = await ensureFreshAccount(target.account);
      const conn = getConnector(target.platform);
      const res = await conn.publish(toConnectorAccount(fresh), {
        caption: post.caption,
        media,
        options: options as never,
      });
      if (res.ok) {
        await prisma.scheduledPostTarget.update({
          where: { id: target.id },
          data: {
            status: "PUBLISHED",
            externalId: res.externalId,
            externalUrl: res.externalUrl,
            publishedAt: new Date(),
            lastError: null,
          },
        });
        okCount++;
      } else {
        await prisma.scheduledPostTarget.update({
          where: { id: target.id },
          data: { status: "FAILED", lastError: res.error?.slice(0, 1000) },
        });
        failCount++;
      }
    } catch (e) {
      await prisma.scheduledPostTarget.update({
        where: { id: target.id },
        data: {
          status: "FAILED",
          lastError: (e instanceof Error ? e.message : String(e)).slice(0, 1000),
        },
      });
      failCount++;
    }
  }

  const finalStatus =
    failCount === 0 ? "PUBLISHED" : okCount === 0 ? "FAILED" : "PUBLISHED";
  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: finalStatus,
      publishedAt: okCount > 0 ? new Date() : null,
      lastError: failCount > 0 ? `${failCount} cible(s) en échec` : null,
    },
  });

  return { ok: failCount === 0, okCount, failCount };
}
