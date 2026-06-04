import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { testSftp, type SftpCredentials } from "@/lib/connectors/sftp";
import { testWordpress, type WpCredentials } from "@/lib/connectors/wordpress";
import { encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

// Schémas par plateforme
const wordpressSchema = z.object({
  platform: z.literal("WORDPRESS"),
  url: z.string().trim().url("URL invalide"),
  label: z.string().trim().max(100).optional(),
  username: z.string().trim().min(1, "Username requis"),
  appPassword: z.string().trim().min(8, "Application Password requis"),
});

const sftpSchema = z.object({
  platform: z.literal("SFTP_HTML"),
  url: z.string().trim().url("URL invalide"),
  label: z.string().trim().max(100).optional(),
  host: z.string().trim().min(1, "Host requis"),
  port: z.coerce.number().int().min(1).max(65535).optional().default(22),
  username: z.string().trim().min(1, "Username requis"),
  password: z.string().min(1, "Password requis"),
  rootPath: z.string().trim().min(1, "Chemin racine requis (ex: /home/user/public_html)"),
});

const inputSchema = z.discriminatedUnion("platform", [wordpressSchema, sftpSchema]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sites = await prisma.siteConnection.findMany({
    where: { user: { email: session.user.email! } },
    select: {
      id: true,
      url: true,
      platform: true,
      label: true,
      status: true,
      lastTestAt: true,
      lastError: true,
      meta: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ sites });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: session.user.email! },
    select: { id: true },
  });

  // Test la connexion AVANT de sauvegarder
  let testResult;
  let credentialsToStore: unknown;
  if (data.platform === "WORDPRESS") {
    const creds: WpCredentials = {
      url: data.url,
      username: data.username,
      appPassword: data.appPassword,
    };
    testResult = await testWordpress(creds);
    credentialsToStore = creds;
  } else if (data.platform === "SFTP_HTML") {
    const creds: SftpCredentials = {
      host: data.host,
      port: data.port,
      username: data.username,
      password: data.password,
      rootPath: data.rootPath,
    };
    testResult = await testSftp(creds);
    credentialsToStore = creds;
  } else {
    return NextResponse.json(
      { error: `Plateforme non supportée : ${(data as { platform: string }).platform}` },
      { status: 400 },
    );
  }

  if (!testResult.ok) {
    return NextResponse.json(
      { error: `Connexion échouée : ${testResult.error}` },
      { status: 400 },
    );
  }

  // Stocke aussi le rootPath en clair dans meta pour SFTP — utile pour différencier
  // 2 sites sur le même serveur (l'host est identique mais le rootPath diffère).
  const metaPayload =
    data.platform === "SFTP_HTML"
      ? {
          capabilities: testResult.capabilities,
          info: testResult.info,
          rootPath: data.rootPath,
          host: data.host,
        }
      : {
          capabilities: testResult.capabilities,
          info: testResult.info,
        };

  const site = await prisma.siteConnection.create({
    data: {
      userId: user.id,
      url: data.url,
      platform: data.platform,
      label: data.label ?? testResult.info?.name ?? null,
      credentials: encryptJson(credentialsToStore),
      status: "CONNECTED",
      lastTestAt: new Date(),
      meta: metaPayload as never,
    },
    select: {
      id: true,
      url: true,
      platform: true,
      label: true,
      status: true,
      meta: true,
    },
  });

  revalidatePath("/sites");
  revalidatePath("/generated-sites");
  return NextResponse.json({ site }, { status: 201 });
}
