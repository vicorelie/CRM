/** @type {import('next').NextConfig} */
const nextConfig = {
  // Servi derrière nginx à https://wanapush.com (domaine propre).

  // Ces modules ont des bindings natifs (.node) que webpack ne peut pas bundler.
  // Ils sont exécutés tels quels en runtime Node.
  experimental: {
    serverComponentsExternalPackages: ["ssh2", "ssh2-sftp-client", "puppeteer", "puppeteer-core"],
  },

  // Audit C5 : le typecheck/lint NE bloque PAS le build runtime (éviter qu'un
  // warning casse un déploiement), mais le gate de qualité est dans la CI :
  // `.github/workflows/wanapush-ci.yml` lance `tsc --noEmit` en BLOQUANT (0 erreur
  // à ce jour) + tests, et `npm run lint` en warning-only (legacy à nettoyer avant
  // de le rendre bloquant). Lancer en local : `npm run typecheck`.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Headers de sécurité (audit M1). Set "fort mais non-cassant" :
  //  - X-Frame-Options SAMEORIGIN (pas DENY) : le builder embarque des previews
  //    de sites en iframe same-origin → DENY les casserait.
  //  - HSTS : ignoré par les navigateurs en HTTP, actif derrière nginx HTTPS.
  //  - CSP en REPORT-ONLY pour l'instant : on découvre les violations sans rien
  //    bloquer (une CSP stricte nonce-based nécessite un middleware dédié →
  //    chantier suivant). Passer à `Content-Security-Policy` une fois le rapport propre.
  async headers() {
    const cspReportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
    ];
  },
};

export default nextConfig;
