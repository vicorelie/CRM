// GET /api/gbp/oauth/google/callback
// Reçoit le code OAuth, échange en tokens, fetch les accounts du user, upsert
// en DB (1 GbpAccount par googleAccountId). Redirige vers /gbp avec status.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyState } from "@/lib/social/state";
import { encrypt } from "@/lib/crypto";
import { exchangeCode, listAccounts } from "@/lib/gbp";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? `${url.protocol}//${url.host}`;

  if (error) return NextResponse.redirect(`${base}/gbp?gbpError=${encodeURIComponent(error)}`);
  if (!code || !stateRaw) return NextResponse.redirect(`${base}/gbp?gbpError=missing_code_state`);

  const state = verifyState(stateRaw);
  if (!state || state.platform !== "gbp") {
    return NextResponse.redirect(`${base}/gbp?gbpError=invalid_state`);
  }

  try {
    const redirectUri = `${base}/api/gbp/oauth/google/callback`;
    const tokens = await exchangeCode(code, redirectUri);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    // Fetch les accounts pour stocker au moins le premier (un user peut avoir
    // plusieurs Business Profile accounts — on les ajoute un par un sur sync)
    const accounts = await listAccounts(tokens.accessToken);
    if (accounts.length === 0) {
      return NextResponse.redirect(`${base}/gbp?gbpError=no_business_profile`);
    }

    // Upsert le premier (l'user pourra trigger un sync pour récupérer les autres)
    let created = 0;
    for (const a of accounts) {
      await prisma.gbpAccount.upsert({
        where: { userId_googleAccountId: { userId: state.userId, googleAccountId: a.name } },
        create: {
          userId: state.userId,
          googleAccountId: a.name,
          accountName: a.accountName,
          accountType: a.type,
          accessToken: encrypt(tokens.accessToken),
          refreshToken: encrypt(tokens.refreshToken),
          expiresAt,
          scopes: tokens.scope,
          status: "CONNECTED",
        },
        update: {
          accessToken: encrypt(tokens.accessToken),
          refreshToken: encrypt(tokens.refreshToken),
          expiresAt,
          scopes: tokens.scope,
          status: "CONNECTED",
          lastError: null,
        },
      });
      created++;
    }

    return NextResponse.redirect(`${base}${state.returnTo ?? "/gbp"}?gbpOk=${created}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(`${base}/gbp?gbpError=${encodeURIComponent(msg.slice(0, 100))}`);
  }
}
