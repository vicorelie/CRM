// Helper de résolution URL → chemin fichier sur le serveur SFTP.
// Gère le cas où le site est servi depuis un sous-dossier (ex: /v1/) du domaine.

export function resolveSftpFilePath(opts: {
  /** URL racine publique du site connecté (ex: https://web101.spotifone.com/v1/) */
  siteUrl: string;
  /** URL de la page à patcher (ex: https://web101.spotifone.com/v1/spots.html) */
  pageUrl: string;
  /** Chemin racine sur le serveur (ex: /var/www/web ou /var/www/web/v1) */
  rootPath: string;
}): string {
  const sitePathname = new URL(opts.siteUrl).pathname.replace(/\/+$/, ""); // "/v1" ou ""
  const pagePathname = new URL(opts.pageUrl).pathname;
  const cleanRoot = opts.rootPath.replace(/\/+$/, ""); // sans slash final

  // Si rootPath se termine déjà par sitePathname (l'utilisateur a inclus le sous-dossier),
  // on l'utilise tel quel ; sinon on l'ajoute pour matcher la structure réelle.
  const effectiveRoot =
    sitePathname && cleanRoot.endsWith(sitePathname)
      ? cleanRoot
      : `${cleanRoot}${sitePathname}`;

  // Path relatif au site (sans le sitePathname devant)
  let relPath: string;
  if (sitePathname && pagePathname.startsWith(sitePathname + "/")) {
    relPath = pagePathname.slice(sitePathname.length + 1); // "spots.html"
  } else if (sitePathname && pagePathname === sitePathname + "/") {
    relPath = "";
  } else if (sitePathname && pagePathname === sitePathname) {
    relPath = "";
  } else {
    relPath = pagePathname.replace(/^\//, "");
  }

  // Normalisation : path/ → index.html, sans extension → +.html
  let normalized = relPath.replace(/\/$/, "") || "index.html";
  if (pagePathname.endsWith("/") && relPath === "") normalized = "index.html";
  if (!/\.[a-z0-9]{2,5}$/i.test(normalized)) normalized += ".html";

  const filePath = `${effectiveRoot}/${normalized}`.replace(/\/+/g, "/");
  return filePath;
}
