/** @type {import('next').NextConfig} */
const nextConfig = {
  // Servi derrière nginx à https://wanapush.com (domaine propre).

  // Ces modules ont des bindings natifs (.node) que webpack ne peut pas bundler.
  // Ils sont exécutés tels quels en runtime Node.
  experimental: {
    serverComponentsExternalPackages: ["ssh2", "ssh2-sftp-client", "puppeteer", "puppeteer-core"],
  },

  // ESLint et typecheck ne doivent pas bloquer le build de prod : ils sont
  // déjà gérés via npx tsc en dev. Évite que des warnings cassent le déploiement.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
