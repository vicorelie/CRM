// Garde anti-SSRF (audit H2). À utiliser dès qu'on fetch / rend / screenshot une
// URL fournie par l'utilisateur (SEO audit, verify-pixel, screenshot, extraction).
//
// Principe : on n'autorise que http/https vers des hôtes qui résolvent en IP
// PUBLIQUES. On bloque loopback, link-local (169.254.x → metadata cloud), plages
// privées RFC-1918, ULA IPv6, etc. `safeFetch` re-valide chaque hop de redirection
// (un hôte public peut 302 vers http://169.254.169.254/...).

import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 5;

/** True si l'IP (v4 ou v6) est privée / réservée / non routable publiquement. */
export function isPrivateIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) return isPrivateIpv4(ip);
  if (type === 6) return isPrivateIpv6(ip);
  return true; // format inconnu → on bloque par prudence
}

function isPrivateIpv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8 privé
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + metadata cloud
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 192 && b === 0 && p[2] === 0) return true; // 192.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // bench 198.18/15
  if (a >= 224) return true; // multicast/réservé 224+ et 240+
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80") || lower.startsWith("fec0")) return true; // link/site-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  // IPv4-mapped (::ffff:a.b.c.d) → valider la partie v4
  const m = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return isPrivateIpv4(m[1]);
  return false;
}

/**
 * Valide qu'une URL est sûre à fetcher : schéma http/https + toutes les IP
 * résolues sont publiques. Throw une `SsrfError` sinon. Retourne l'URL parsée.
 */
export class SsrfError extends Error {}

export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("URL invalide");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError(`Schéma non autorisé : ${url.protocol}`);
  }
  const host = url.hostname;
  // Si l'hôte est déjà une IP littérale, on la valide directement.
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new SsrfError("IP privée/réservée interdite");
    return url;
  }
  // Sinon on résout le DNS et on rejette si UNE des IP est privée.
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new SsrfError("Résolution DNS impossible");
  }
  if (addrs.length === 0) throw new SsrfError("Hôte non résolu");
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new SsrfError("Hôte résout vers une IP privée");
  }
  return url;
}

/**
 * fetch() anti-SSRF : valide l'URL initiale ET chaque hop de redirection.
 * Utilise `redirect: "manual"` et suit les 3xx en re-validant chaque Location.
 */
export async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, current).toString();
      continue;
    }
    return res;
  }
  throw new SsrfError("Trop de redirections");
}
