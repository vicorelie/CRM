// POST /api/email/providers/connect
// Body : { provider: "brevo", apiKey: "xkeysib-..." }
// Valide la clé auprès du fournisseur, puis la stocke chiffrée (AES-256-GCM).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getProvider, isProviderId, ProviderError } from "@/lib/email-providers";

export const runtime = "nodejs";

const BodySchema = z.object({
  provider: z.string().trim().min(1).max(40),
  apiKey: z.string().trim().min(10).max(512),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User introuvable" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalide" }, { status: 400 });
  }
  const { provider, apiKey } = parsed.data;
  if (!isProviderId(provider)) {
    return NextResponse.json({ error: `Fournisseur non supporté : ${provider}` }, { status: 400 });
  }

  // 1) Valider la clé auprès du fournisseur (échoue tôt si invalide).
  let account;
  try {
    account = await getProvider(provider).validate(apiKey);
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : "Impossible de valider la clé.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 2) Stocker chiffré (upsert : reconnecter écrase l'ancienne clé).
  await prisma.emailProviderConnection.upsert({
    where: { userId_provider: { userId: user.id, provider } },
    create: {
      userId: user.id,
      provider,
      apiKey: encrypt(apiKey),
      accountEmail: account.email || null,
      accountName: account.companyName || null,
      plan: account.plan || null,
      status: "CONNECTED",
      lastError: null,
    },
    update: {
      apiKey: encrypt(apiKey),
      accountEmail: account.email || null,
      accountName: account.companyName || null,
      plan: account.plan || null,
      status: "CONNECTED",
      lastError: null,
    },
  });

  revalidatePath("/email");
  return NextResponse.json({ ok: true, account });
}
