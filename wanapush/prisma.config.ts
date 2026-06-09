// Prisma 7 : configuration CLI (remplace les champs url/shadowDatabaseUrl du
// bloc datasource). Le runtime se connecte via l'adapter (lib/prisma.ts) ; ce
// fichier ne sert qu'aux commandes CLI (migrate dev/deploy/status).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
