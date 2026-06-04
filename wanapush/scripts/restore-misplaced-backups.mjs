// Restaure les fichiers .wanapush-backup à la racine /var/www/web/
// (qui ont été modifiés par erreur avant le fix du path resolver SFTP).
// On ne touche PAS aux backups dans /var/www/web/v1/, /v2/, etc.

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { createDecipheriv } from "node:crypto";
import SftpClient from "ssh2-sftp-client";

const prisma = new PrismaClient();

function decrypt(payload) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

const site = await prisma.siteConnection.findFirst({
  where: { platform: "SFTP_HTML" },
});
if (!site) {
  console.error("Aucun site SFTP trouvé");
  process.exit(1);
}

const creds = JSON.parse(decrypt(site.credentials));
const targetDir = "/var/www/web";

console.log(`\nConnexion SFTP à ${creds.host}:${creds.port} en tant que ${creds.username}...`);

const sftp = new SftpClient();
await sftp.connect({
  host: creds.host,
  port: creds.port,
  username: creds.username,
  password: creds.password,
  readyTimeout: 10000,
});
console.log("✓ Connecté\n");

try {
  const items = await sftp.list(targetDir);
  const backups = items.filter((i) => i.type === "-" && i.name.endsWith(".wanapush-backup"));

  console.log(`${backups.length} backup(s) trouvé(s) à la racine ${targetDir} :\n`);
  if (backups.length === 0) {
    console.log("(rien à restaurer)");
  }

  for (const b of backups) {
    const backupPath = `${targetDir}/${b.name}`;
    const originalPath = `${targetDir}/${b.name.replace(/\.wanapush-backup$/, "")}`;
    const originalExists = await sftp.exists(originalPath);

    console.log(`  → ${b.name}`);
    console.log(`    Cible  : ${originalPath}`);
    console.log(`    Présent: ${originalExists ? "OUI (sera remplacé)" : "NON (rename direct)"}`);

    if (originalExists) {
      // Sauvegarde du fichier WanaPush sous .wanapush-bad-edit avant de l'écraser
      const badPath = originalPath + ".wanapush-bad-edit";
      await sftp.rename(originalPath, badPath);
      console.log(`    ↻ Fichier WanaPush déplacé en ${badPath}`);
    }
    await sftp.rename(backupPath, originalPath);
    console.log(`    ✓ Restauré ${originalPath}\n`);
  }

  // Bonus : liste les sous-dossiers /v1/ /v2/ pour info, NON modifié
  console.log(`\n--- Contenu sous-dossiers (non touchés) ---`);
  for (const sub of items.filter((i) => i.type === "d" && /^v\d+$/.test(i.name))) {
    const subItems = await sftp.list(`${targetDir}/${sub.name}`);
    const subBackups = subItems.filter((i) => i.name.endsWith(".wanapush-backup"));
    console.log(`  ${targetDir}/${sub.name}/ : ${subBackups.length} backup(s) (préservés)`);
  }
} finally {
  await sftp.end();
  await prisma.$disconnect();
}
console.log();
