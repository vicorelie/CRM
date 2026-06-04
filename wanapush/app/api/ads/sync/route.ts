// Sync manuel : POST /api/ads/sync { accountId? }
// Si accountId → sync ce compte uniquement, sinon sync tous les comptes du user.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { syncAccount } from "@/lib/ads/sync";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

const inputSchema = z.object({
  accountId: z.string().trim().max(64).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = inputSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  const where = parsed.data.accountId
    ? { id: parsed.data.accountId, user: { email: session.user.email } }
    : { user: { email: session.user.email } };

  // ⚠️ Pas de `select` ici : on a besoin de tous les champs (accessToken, refreshToken,
  // tokenExpiresAt, meta, ...) pour appeler syncAccount() côté serveur. Les comptes ne
  // sont JAMAIS renvoyés au client — la réponse ne contient que { accountId, platform, ... }.
  const accounts = await prisma.adAccount.findMany({ where });
  if (accounts.length === 0)
    return NextResponse.json({ error: "Aucun compte pub à synchroniser" }, { status: 404 });

  const results = [];
  for (const acc of accounts) {
    try {
      results.push({
        accountId: acc.id,
        platform: acc.platform,
        ...(await syncAccount(acc)),
      });
    } catch (e) {
      results.push({
        accountId: acc.id,
        platform: acc.platform,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return NextResponse.json({ results });
}
