import { NextResponse } from "next/server";
import { getConnector, saveConnectorAccount, SUPPORTED_PLATFORMS } from "@/lib/social";
import { oauthRedirectUri } from "@/lib/social/redirect";
import { verifyState } from "@/lib/social/state";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: { platform: string } };

function back(message: string, ok: boolean, returnTo?: string) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const u = new URL(`${base}${returnTo ?? "/social"}`);
  u.searchParams.set(ok ? "ok" : "error", message);
  return NextResponse.redirect(u);
}

export async function GET(req: Request, { params }: Params) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");

  if (errParam) return back(errParam, false);
  if (!code || !state) return back("Paramètres OAuth manquants", false);

  const v = verifyState(state);
  if (!v) return back("State invalide ou expiré", false);

  const candidate = params.platform.toUpperCase();
  const platform = SUPPORTED_PLATFORMS.find((p) => p === candidate);
  if (!platform) return back(`Plateforme inconnue ${candidate}`, false, v.returnTo);
  if (v.platform !== platform)
    return back("State ne correspond pas à la plateforme", false, v.returnTo);

  try {
    const connector = getConnector(platform);
    const accounts = await connector.exchangeCode(code, oauthRedirectUri(platform));
    let count = 0;
    for (const acc of accounts) {
      await saveConnectorAccount(v.userId, platform, acc);
      count++;
    }
    return back(`${count} compte(s) connecté(s)`, true, v.returnTo);
  } catch (e) {
    return back(e instanceof Error ? e.message : "Erreur OAuth", false, v.returnTo);
  }
}
