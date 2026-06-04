import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { createDecipheriv } from "node:crypto";

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

const sftpSites = await prisma.siteConnection.findMany({ where: { platform: "SFTP_HTML" } });
console.log(`${sftpSites.length} site(s) SFTP à migrer\n`);

for (const s of sftpSites) {
  const creds = JSON.parse(decrypt(s.credentials));
  const currentMeta = (s.meta) || {};
  if (currentMeta.rootPath) {
    console.log(`  ✓ ${s.id} déjà migré (rootPath=${currentMeta.rootPath})`);
    continue;
  }
  await prisma.siteConnection.update({
    where: { id: s.id },
    data: {
      meta: { ...currentMeta, rootPath: creds.rootPath, host: creds.host },
    },
  });
  console.log(`  ⬆ ${s.id} url=${s.url} rootPath=${creds.rootPath} migré`);
}
await prisma.$disconnect();
