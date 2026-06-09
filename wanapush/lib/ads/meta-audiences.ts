// Meta Custom Audiences — création, upload et synchronisation.
// Doc : https://developers.facebook.com/docs/marketing-api/audiences/
//
// 3 types supportés :
//   WEBSITE_TRAFFIC — pixel retargeting (règles inclusion/exclusion)
//   CUSTOMER_LIST   — upload liste emails hashés SHA-256
//   LOOKALIKE       — lookalike depuis une audience source

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { AdAudienceType } from "@/lib/generated/prisma/client";

const GRAPH = "https://graph.facebook.com/v24.0";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WebsiteTrafficConfig = {
  pixelId: string;
  retentionDays: number; // 1–180
  rules?: Array<{
    event: string; // "ViewContent" | "Purchase" | "PageView" | ...
    urlFilter?: string; // contient ce fragment (optionnel)
  }>;
};

export type CustomerListConfig = {
  emails: string[]; // emails en clair — hashés côté serveur avant envoi
};

export type LookalikeConfig = {
  sourceAudienceId: string; // externalId d'une AdAudience source (WA ou CT)
  country: string; // "FR" | "BE" | ...
  ratio: number; // 0.01–0.20 (1 % – 20 %)
};

export type MetaAudienceCreateInput =
  | { type: "WEBSITE_TRAFFIC"; adAccountId: string; name: string; description: string; config: WebsiteTrafficConfig }
  | { type: "CUSTOMER_LIST"; adAccountId: string; name: string; description: string; config: CustomerListConfig }
  | { type: "LOOKALIKE"; adAccountId: string; name: string; description: string; config: LookalikeConfig };

export type MetaAudienceResult = {
  externalId: string;
  metaStatus: string;
  estimatedSize: number | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAccessToken(userId: string, adAccountId: string): Promise<string> {
  const account = await prisma.adAccount.findFirst({
    where: { userId, externalId: adAccountId, platform: "META_ADS" },
    select: { accessToken: true },
  });
  if (!account?.accessToken) throw new Error(`Compte Meta Ads introuvable (${adAccountId})`);
  return decrypt(account.accessToken);
}

async function graphPost(path: string, body: Record<string, unknown>, token: string): Promise<unknown> {
  const res = await fetch(`${GRAPH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (data.error) {
    const err = data.error as Record<string, unknown>;
    throw new Error(`Meta API error ${err.code}: ${err.message}`);
  }
  return data;
}

async function graphGet(path: string, params: Record<string, string>, token: string): Promise<unknown> {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}${path}?${qs}`);
  const data = await res.json() as Record<string, unknown>;
  if (data.error) {
    const err = data.error as Record<string, unknown>;
    throw new Error(`Meta API error ${err.code}: ${err.message}`);
  }
  return data;
}

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// ─── Création Website Traffic (pixel retargeting) ────────────────────────────

async function createWebsiteTrafficAudience(
  adAccountId: string,
  name: string,
  description: string,
  cfg: WebsiteTrafficConfig,
  token: string,
): Promise<MetaAudienceResult> {
  // Règle Meta : pixel + événement + fenêtre de rétention
  const rules = cfg.rules && cfg.rules.length > 0
    ? cfg.rules.map((r) => {
        const filter: Record<string, unknown> = {
          operator: "AND",
          filters: [{ field: "event", operator: "=", value: r.event }],
        };
        if (r.urlFilter) {
          (filter.filters as unknown[]).push({ field: "url", operator: "CONTAINS", value: r.urlFilter });
        }
        return filter;
      })
    : [{ operator: "AND", filters: [{ field: "event", operator: "=", value: "PageView" }] }];

  const pixel_rule = JSON.stringify({
    inclusions: {
      operator: "OR",
      rules: rules.map((r) => ({
        event_sources: [{ id: cfg.pixelId, type: "PIXEL" }],
        retention_seconds: cfg.retentionDays * 86400,
        filter: r,
      })),
    },
  });

  const data = await graphPost(`/${adAccountId}/customaudiences`, {
    name,
    description,
    subtype: "WEBSITE",
    retention_days: cfg.retentionDays,
    pixel_id: cfg.pixelId,
    rule: pixel_rule,
  }, token) as { id: string };

  return { externalId: data.id, metaStatus: "PROCESSING", estimatedSize: null };
}

// ─── Création Customer List ───────────────────────────────────────────────────

async function createCustomerListAudience(
  adAccountId: string,
  name: string,
  description: string,
  cfg: CustomerListConfig,
  token: string,
): Promise<MetaAudienceResult> {
  // 1. Créer l'audience vide
  const created = await graphPost(`/${adAccountId}/customaudiences`, {
    name,
    description,
    subtype: "CUSTOM",
    customer_file_source: "USER_PROVIDED_ONLY",
  }, token) as { id: string };

  const audienceId = created.id;

  // 2. Uploader les emails hashés SHA-256
  if (cfg.emails.length > 0) {
    const hashed = cfg.emails.map((e) => sha256(e));
    // Meta attend schema=[EXTERN_ID|EMAIL|...] + data=[[hash1],[hash2],...]
    await graphPost(`/${audienceId}/users`, {
      session: { session_id: Date.now(), batch_seq: 1, last_batch_flag: true, estimated_num_total: hashed.length },
      payload: {
        schema: ["EMAIL_SHA256"],
        data: hashed.map((h) => [h]),
      },
    }, token);
  }

  return { externalId: audienceId, metaStatus: "READY", estimatedSize: cfg.emails.length };
}

// ─── Création Lookalike ───────────────────────────────────────────────────────

async function createLookalikeAudience(
  adAccountId: string,
  name: string,
  description: string,
  cfg: LookalikeConfig,
  token: string,
): Promise<MetaAudienceResult> {
  const data = await graphPost(`/${adAccountId}/customaudiences`, {
    name,
    description,
    subtype: "LOOKALIKE",
    origin_audience_id: cfg.sourceAudienceId,
    lookalike_spec: JSON.stringify({
      type: "similarity",
      country: cfg.country,
      ratio: cfg.ratio,
    }),
  }, token) as { id: string };

  return { externalId: data.id, metaStatus: "PROCESSING", estimatedSize: null };
}

// ─── Sync status depuis Meta ──────────────────────────────────────────────────

export async function syncMetaAudienceStatus(audienceDbId: string): Promise<{
  metaStatus: string;
  estimatedSize: number | null;
}> {
  const audience = await prisma.adAudience.findUnique({
    where: { id: audienceDbId },
    select: { externalId: true, adAccountId: true, userId: true },
  });
  if (!audience?.externalId || !audience.adAccountId) {
    throw new Error("Audience introuvable ou non liée à Meta");
  }

  const token = await getAccessToken(audience.userId, audience.adAccountId);
  const data = await graphGet(
    `/${audience.externalId}`,
    { fields: "approximate_count,delivery_status" },
    token,
  ) as { approximate_count?: number; delivery_status?: { code: number; description: string } };

  const estimatedSize = typeof data.approximate_count === "number" ? data.approximate_count : null;
  // delivery_status.code 200 = prête, 400+ = erreur, autre = en cours
  const statusCode = data.delivery_status?.code ?? 0;
  const metaStatus = statusCode === 200 ? "READY" : statusCode >= 400 ? "FAILED" : "PROCESSING";

  await prisma.adAudience.update({
    where: { id: audienceDbId },
    data: { metaStatus, estimatedSize, syncedAt: new Date() },
  });

  return { metaStatus, estimatedSize };
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

export async function createMetaAudience(
  userId: string,
  input: MetaAudienceCreateInput,
): Promise<{ audienceId: string; externalId: string; metaStatus: string }> {
  const token = await getAccessToken(userId, input.adAccountId);

  let result: MetaAudienceResult;

  if (input.type === "WEBSITE_TRAFFIC") {
    result = await createWebsiteTrafficAudience(
      input.adAccountId, input.name, input.description, input.config, token,
    );
  } else if (input.type === "CUSTOMER_LIST") {
    result = await createCustomerListAudience(
      input.adAccountId, input.name, input.description, input.config, token,
    );
  } else {
    result = await createLookalikeAudience(
      input.adAccountId, input.name, input.description, input.config, token,
    );
  }

  const audience = await prisma.adAudience.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      type: input.type as AdAudienceType,
      platform: "META_ADS",
      adAccountId: input.adAccountId,
      externalId: result.externalId,
      config: input.config as object,
      metaStatus: result.metaStatus,
      estimatedSize: result.estimatedSize,
      syncedAt: new Date(),
    },
  });

  return { audienceId: audience.id, externalId: result.externalId, metaStatus: result.metaStatus };
}
