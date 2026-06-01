// Hashing SHA256 conforme spec Meta Conversions API pour les PII.
//
// RÈGLES STRICTES (à respecter sinon Match Quality Score drop dramatiquement) :
//   1. `lowercase()` puis `trim()` avant hash, pour tous les champs PII
//   2. Téléphone : retirer tous les non-digits (espaces, +, -, ()) AVANT hash
//   3. State : ISO 3166-2 (ex: "CA" ou "FR-75") — Meta dit lowercase sans le pays
//   4. Country : ISO 3166-1 alpha-2 lowercase (ex: "fr", "us")
//   5. Email : lowercase + trim, c'est tout (Meta gère les + et . côté Gmail)
//   6. Hash final : SHA256 en hex lowercase
//   7. NE PAS hash les champs RAW : client_ip_address, client_user_agent, fbp, fbc, subscription_id
//
// Doc : https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters

import { createHash } from "node:crypto";
import type { UserDataInput, UserDataHashed } from "./types";

/**
 * SHA256 → hex lowercase. Pour les champs déjà normalisés.
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Normalise puis hash. Retourne `undefined` si input vide/invalide.
 */
function normalizeAndHash(input: string | undefined, normalizer: (s: string) => string): string | undefined {
  if (input === undefined || input === null) return undefined;
  const normalized = normalizer(input);
  if (!normalized) return undefined;
  return sha256(normalized);
}

/**
 * Normalisation par type de champ.
 */
const normalizers = {
  // Email : lowercase + trim. Meta laisse les + et . tels quels (le matching
  // côté Meta gère les variantes Gmail).
  email: (s: string) => s.trim().toLowerCase(),

  // Phone : retirer tous les non-digits. Garder le code pays SANS le +.
  // Ex: "+33 6 12 34 56 78" → "33612345678"
  phone: (s: string) => s.replace(/[^\d]/g, ""),

  // First/last name : lowercase + trim, garder les accents (Meta les normalise)
  name: (s: string) => s.trim().toLowerCase(),

  // City : lowercase + retirer espaces (ex: "saint-denis" → "saint-denis", "New York" → "newyork")
  city: (s: string) => s.trim().toLowerCase().replace(/\s+/g, ""),

  // State : lowercase + trim (Meta accepte les codes ISO 3166-2 OU les noms complets)
  state: (s: string) => s.trim().toLowerCase(),

  // ZIP : lowercase + retirer espaces ("75 001" → "75001"). Garder tirets ("ny-10001" OK)
  zip: (s: string) => s.trim().toLowerCase().replace(/\s+/g, ""),

  // Country : ISO 3166-1 alpha-2 lowercase ("FR" → "fr", "France" → erreur user, pas géré ici)
  country: (s: string) => s.trim().toLowerCase().slice(0, 2),

  // Date of birth : YYYYMMDD strict (8 digits)
  dob: (s: string) => s.replace(/[^\d]/g, "").slice(0, 8),

  // Gender : "m" ou "f" lowercase
  gender: (s: string) => s.trim().toLowerCase().charAt(0),

  // External ID : trim seulement (pas de normalisation, c'est un ID applicatif)
  externalId: (s: string) => s.trim(),
} as const;

/**
 * Hash un tableau de valeurs (ex: plusieurs emails sur le même user).
 */
function hashArray(input: string | string[] | undefined, normalizer: (s: string) => string): string[] | undefined {
  if (input === undefined) return undefined;
  const arr = Array.isArray(input) ? input : [input];
  const hashed = arr.map((v) => normalizeAndHash(v, normalizer)).filter((v): v is string => Boolean(v));
  return hashed.length > 0 ? hashed : undefined;
}

/**
 * Transforme un UserDataInput (PII en clair) en UserDataHashed (prêt à envoyer
 * à Meta CAPI). Tous les champs sensibles sont hashed selon les règles Meta.
 *
 * Les champs `client_ip_address`, `client_user_agent`, `fbp`, `fbc`,
 * `subscription_id` sont passés en clair (Meta s'attend à du raw pour ceux-là).
 */
export function hashUserData(input: UserDataInput): UserDataHashed {
  const out: UserDataHashed = {};

  // Champs hashed
  const em = hashArray(input.em, normalizers.email);
  if (em) out.em = em;

  const ph = hashArray(input.ph, normalizers.phone);
  if (ph) out.ph = ph;

  const fn = hashArray(input.fn, normalizers.name);
  if (fn) out.fn = fn;

  const ln = hashArray(input.ln, normalizers.name);
  if (ln) out.ln = ln;

  const ct = normalizeAndHash(input.ct, normalizers.city);
  if (ct) out.ct = ct;

  const st = normalizeAndHash(input.st, normalizers.state);
  if (st) out.st = st;

  const zp = normalizeAndHash(input.zp, normalizers.zip);
  if (zp) out.zp = zp;

  const country = normalizeAndHash(input.country, normalizers.country);
  if (country) out.country = country;

  const db = normalizeAndHash(input.db, normalizers.dob);
  if (db) out.db = db;

  const ge = normalizeAndHash(input.ge, normalizers.gender);
  if (ge) out.ge = ge;

  const externalId = hashArray(input.external_id, normalizers.externalId);
  if (externalId) out.external_id = externalId;

  // Champs RAW (jamais hashed)
  if (input.client_ip_address) out.client_ip_address = input.client_ip_address;
  if (input.client_user_agent) out.client_user_agent = input.client_user_agent;
  if (input.fbp) out.fbp = input.fbp;
  if (input.fbc) out.fbc = input.fbc;
  if (input.subscription_id) out.subscription_id = input.subscription_id;

  return out;
}

/**
 * Helpers exportés pour tests + cas spéciaux (ex: external_id côté code).
 */
export const __testing = { normalizers, normalizeAndHash, hashArray };
