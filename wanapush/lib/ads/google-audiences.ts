// Google Ads Custom Audiences — Customer Match (emails) + Remarketing (events).
// Doc : https://developers.google.com/google-ads/api/docs/remarketing/audience-types/customer-match
//       https://developers.google.com/google-ads/api/docs/remarketing/audience-types/remarketing
//
// 2 types supportés :
//   CUSTOMER_LIST — upload emails hashés SHA-256 via OfflineUserDataJobService
//   WEBSITE_TRAFFIC — rule-based user list (événements de conversion Google Tag)

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { AdAudienceType } from "@prisma/client";

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v24";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoogleCustomerListConfig = {
  emails: string[]; // hashés SHA-256 côté serveur avant upload
};

export type GoogleRemarketingConfig = {
  conversionActionId?: string; // resource name optionnel (sinon: all visitors)
  membershipLifeSpan: number; // 1–540 jours
  tagSnippetId?: string; // Google Tag ID (facultatif, pour annot)
};

export type GoogleAudienceCreateInput =
  | { type: "CUSTOMER_LIST"; adAccountId: string; name: string; description: string; config: GoogleCustomerListConfig }
  | { type: "WEBSITE_TRAFFIC"; adAccountId: string; name: string; description: string; config: GoogleRemarketingConfig };

export type GoogleAudienceResult = {
  externalId: string; // user_list resource name (customers/XXX/userLists/YYY)
  listId: string; // numeric list ID
  metaStatus: string;
  estimatedSize: number | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AccountCreds = {
  accessToken: string;
  customerId: string;
  devToken: string;
  loginCustomerId?: string;
};

async function getAccountCreds(userId: string, adAccountId: string): Promise<AccountCreds> {
  const account = await prisma.adAccount.findFirst({
    where: { userId, externalId: adAccountId, platform: "GOOGLE_ADS" },
    select: { accessToken: true, meta: true },
  });
  if (!account?.accessToken) throw new Error(`Compte Google Ads introuvable (${adAccountId})`);

  const accessToken = decrypt(account.accessToken);
  const meta = account.meta as Record<string, unknown> | null;
  const customerId = (meta?.customerId as string) ?? adAccountId.replace(/^customers\//, "");
  const loginCustomerId = meta?.loginCustomerId as string | undefined;
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!devToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN non défini");

  return { accessToken, customerId, devToken, loginCustomerId };
}

function gHeaders(creds: AccountCreds): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${creds.accessToken}`,
    "developer-token": creds.devToken,
    "Content-Type": "application/json",
  };
  if (creds.loginCustomerId) h["login-customer-id"] = creds.loginCustomerId;
  return h;
}

async function gMutate(
  creds: AccountCreds,
  resource: string,
  body: Record<string, unknown>,
): Promise<{ resourceName: string; raw: unknown }> {
  const r = await fetch(`${GOOGLE_ADS_API}/customers/${creds.customerId}/${resource}:mutate`, {
    method: "POST",
    headers: gHeaders(creds),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Google mutate ${resource} ${r.status}: ${text.slice(0, 400)}`);
  const j = JSON.parse(text) as { results?: Array<{ resourceName?: string }> };
  const resourceName = j.results?.[0]?.resourceName ?? "";
  return { resourceName, raw: j };
}

async function gPost(
  creds: AccountCreds,
  path: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const r = await fetch(`${GOOGLE_ADS_API}/${path}`, {
    method: "POST",
    headers: gHeaders(creds),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Google POST ${path} ${r.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

async function gaqlOne(
  creds: AccountCreds,
  query: string,
): Promise<Array<Record<string, unknown>>> {
  const r = await fetch(
    `${GOOGLE_ADS_API}/customers/${creds.customerId}/googleAds:searchStream`,
    { method: "POST", headers: gHeaders(creds), body: JSON.stringify({ query }) },
  );
  const text = await r.text();
  if (!r.ok) throw new Error(`GAQL ${r.status}: ${text.slice(0, 400)}`);
  const j = JSON.parse(text) as Array<{ results?: Array<Record<string, unknown>> }>;
  return j.flatMap((chunk) => chunk.results ?? []);
}

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function extractListId(resourceName: string): string {
  // "customers/123/userLists/456" → "456"
  return resourceName.split("/").pop() ?? resourceName;
}

// ─── Customer Match ───────────────────────────────────────────────────────────

async function createCustomerMatchAudience(
  creds: AccountCreds,
  name: string,
  description: string,
  cfg: GoogleCustomerListConfig,
): Promise<GoogleAudienceResult> {
  // 1. Créer la UserList CRM
  const { resourceName: listResource } = await gMutate(creds, "userLists", {
    operations: [{
      create: {
        name,
        description,
        membershipLifeSpan: 10000, // durée max pour Customer Match
        crmBasedUserList: {
          uploadKeyType: "CONTACT_INFO",
          dataSourceType: "FIRST_PARTY",
        },
      },
    }],
  });

  // 2. Créer l'OfflineUserDataJob
  const jobRes = await gPost(
    creds,
    `customers/${creds.customerId}/offlineUserDataJobs:create`,
    {
      job: {
        type: "CUSTOMER_MATCH_USER_LIST",
        customerMatchUserListMetadata: { userList: listResource },
      },
    },
  ) as { resourceName: string };
  const jobResource = jobRes.resourceName;

  // 3. Uploader les emails hashés
  if (cfg.emails.length > 0) {
    const operations = cfg.emails.map((email) => ({
      create: {
        userIdentifiers: [{ hashedEmail: sha256(email) }],
      },
    }));
    // Google limit: 100k par batch, on chunk si besoin
    const chunkSize = 10_000;
    for (let i = 0; i < operations.length; i += chunkSize) {
      await gPost(
        creds,
        `${jobResource}/operations:addOperations`,
        { operations: operations.slice(i, i + chunkSize), enablePartialFailure: false },
      );
    }
  }

  // 4. Lancer le job
  await gPost(creds, `${jobResource}:run`, {});

  const listId = extractListId(listResource);
  return {
    externalId: listResource,
    listId,
    metaStatus: "PROCESSING",
    estimatedSize: null,
  };
}

// ─── Remarketing (rule-based) ─────────────────────────────────────────────────

async function createRemarketingAudience(
  creds: AccountCreds,
  name: string,
  description: string,
  cfg: GoogleRemarketingConfig,
): Promise<GoogleAudienceResult> {
  // Rule-based UserList : on utilise une COMBINATION_USER_LIST si un
  // conversionActionId est fourni, sinon ALL_VISITORS via LOGICAL rule.
  const ruleItemGroupList = cfg.conversionActionId
    ? {
        ruleItemGroups: [{
          ruleItems: [{
            name: "conversion_action",
            tagSnippetConditionInfo: {
              tagSnippet: cfg.conversionActionId,
              value: "",
            },
          }],
        }],
      }
    : { ruleItemGroups: [{ ruleItems: [{ name: "url", stringRuleItem: { operator: "CONTAINS", value: "/" } }] }] };

  const { resourceName: listResource } = await gMutate(creds, "userLists", {
    operations: [{
      create: {
        name,
        description,
        membershipLifeSpan: cfg.membershipLifeSpan,
        ruleBasedUserList: {
          prepopulationStatus: "REQUESTED",
          inclusionRuleOperator: "AND",
          ...ruleItemGroupList,
        },
      },
    }],
  });

  const listId = extractListId(listResource);
  return { externalId: listResource, listId, metaStatus: "PROCESSING", estimatedSize: null };
}

// ─── Sync depuis GAQL ─────────────────────────────────────────────────────────

export async function syncGoogleAudienceStatus(audienceDbId: string): Promise<{
  metaStatus: string;
  estimatedSize: number | null;
}> {
  const audience = await prisma.adAudience.findUnique({
    where: { id: audienceDbId },
    select: { externalId: true, adAccountId: true, userId: true },
  });
  if (!audience?.externalId || !audience.adAccountId) {
    throw new Error("Audience introuvable ou non liée à Google Ads");
  }

  const creds = await getAccountCreds(audience.userId, audience.adAccountId);
  const listId = extractListId(audience.externalId);

  const rows = await gaqlOne(
    creds,
    `SELECT user_list.id, user_list.size_for_display, user_list.closing_reason, user_list.membership_status FROM user_list WHERE user_list.id = ${listId} LIMIT 1`,
  );
  const ul = (rows[0]?.userList as Record<string, unknown>) ?? {};

  const estimatedSize = typeof ul.sizeForDisplay === "number" ? ul.sizeForDisplay : null;
  // membershipStatus: OPEN = prête, CLOSED = fermée, closingReason = pb
  const membershipStatus = ul.membershipStatus as string | undefined;
  const metaStatus = ul.closingReason
    ? "FAILED"
    : membershipStatus === "OPEN"
    ? "READY"
    : "PROCESSING";

  await prisma.adAudience.update({
    where: { id: audienceDbId },
    data: { metaStatus, estimatedSize, syncedAt: new Date() },
  });

  return { metaStatus, estimatedSize };
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

export async function createGoogleAudience(
  userId: string,
  input: GoogleAudienceCreateInput,
): Promise<{ audienceId: string; externalId: string; metaStatus: string }> {
  const creds = await getAccountCreds(userId, input.adAccountId);

  let result: GoogleAudienceResult;

  if (input.type === "CUSTOMER_LIST") {
    result = await createCustomerMatchAudience(creds, input.name, input.description, input.config);
  } else {
    result = await createRemarketingAudience(creds, input.name, input.description, input.config);
  }

  const audience = await prisma.adAudience.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      type: input.type as AdAudienceType,
      platform: "GOOGLE_ADS",
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
