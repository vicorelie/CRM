// Prisma 7 — client Rust-free via le driver adapter MariaDB.
// Le binary engine n'existe plus : la connexion passe par @prisma/adapter-mariadb
// (driver `mariadb` pur JS). L'URL reste DATABASE_URL (mysql://…).
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/lib/generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

// Singleton Prisma — évite de multiplier les connexions en dev (HMR Next.js).
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
