// Construit le redirectUri OAuth absolu pour une plateforme donnée.
// Doit matcher EXACTEMENT ce qui est configuré côté Meta/Google/LinkedIn/TikTok.
export function oauthRedirectUri(platform: string): string {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXTAUTH_URL requis pour OAuth social");
  return `${base}/api/social/oauth/${platform.toLowerCase()}/callback`;
}
