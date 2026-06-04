import { NextResponse } from "next/server";
import { getAdsConnector, saveAdAccount, SUPPORTED_AD_PLATFORMS } from "@/lib/ads";
import { verifyState } from "@/lib/social/state";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: { platform: string } };

function adsRedirectUri(platform: string): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXTAUTH_URL requis");
  return `${base}/api/ads/oauth/${platform.toLowerCase()}/callback`;
}

function back(message: string, ok: boolean, returnTo?: string) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
  const u = new URL(`${base}${returnTo ?? "/ads"}`);
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
  const platform = SUPPORTED_AD_PLATFORMS.find((p) => p === candidate);
  if (!platform) return back(`Plateforme inconnue ${candidate}`, false, v.returnTo);
  if (v.platform !== `ADS_${platform}`)
    return back("State ne correspond pas à la plateforme", false, v.returnTo);

  try {
    const connector = getAdsConnector(platform);
    const accounts = await connector.exchangeCode(code, adsRedirectUri(platform));
    let count = 0;
    for (const acc of accounts) {
      await saveAdAccount(v.userId, platform, acc);
      count++;
    }
    return back(`${count} compte(s) pub connecté(s)`, true, v.returnTo);
  } catch (e) {
    return back(e instanceof Error ? e.message : "Erreur OAuth Ads", false, v.returnTo);
  }
}
