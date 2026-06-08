// Lead Scoring — modèle hybride 2026 (rules + IA boost).
//
// Best practices 2026 (sources : Warmly, Breadcrumbs, TrailSpark, mai 2026) :
//  - 4 buckets : firmographic + demographic + behavioral + negative signals
//  - Hybrid : règles pour fit (firmographic/demographic), IA pour intent
//  - Behavioral = 60%+ du poids total
//  - Decay : 30j half-life engagement, 90j intent
//  - Real-time scoring 5-15min après signal
//  - Gradient Boosting pour ML — ici remplacé par Claude (LLM zero-shot suffit
//    pour PME sans dataset historique)
//
// Sortie : score 0-100 + temperature (HOT/WARM/COLD/INVALID) + reason texte
// court (transparence pour les reps — sinon ils ignorent le score).

import { askAi } from "@/lib/ai";

const HOT_THRESHOLD = 75;
const WARM_THRESHOLD = 50;
const COLD_THRESHOLD = 25;

export type LeadTemperature = "HOT" | "WARM" | "COLD" | "INVALID";

export type LeadScoreResult = {
  score: number; // 0-100
  temperature: LeadTemperature;
  reason: string;
  breakdown: {
    rules: number; // 0-50 max (fit firmographic/demographic)
    ai: number; // 0-50 max (intent/behavioral IA)
    bonuses: number; // 0-20 max (formulaire premium signals)
    penalties: number; // negatif (anti-spam patterns, jetable email...)
  };
};

// ─── Phase 1 : Règles (firmographic + demographic fit) ──────────────────────

const PRO_EMAIL_TLDS = ["com", "fr", "io", "co", "net", "org", "eu", "de", "es", "it", "be", "ch"];
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "yopmail.com", "mailinator.com", "guerrillamail.com",
  "10minutemail.com", "throwaway.email", "fake.email", "trash-mail.com",
]);
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "hotmail.com",
  "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "live.fr", "free.fr",
  "orange.fr", "wanadoo.fr", "laposte.net", "icloud.com", "me.com",
]);

function ruleBasedScore(email: string | null, data: Record<string, unknown>): {
  score: number;
  reason: string;
  penalty: number;
} {
  if (!email) return { score: 0, reason: "Pas d'email — pas de scoring possible", penalty: -30 };

  const [_local, domain] = email.toLowerCase().split("@");
  if (!domain) return { score: 0, reason: "Email malformé", penalty: -50 };

  // Penalty : email jetable
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { score: 0, reason: `Email jetable (${domain}) — probable spam`, penalty: -50 };
  }

  let score = 0;
  const reasons: string[] = [];

  // +25 : email pro (domaine custom, pas free) — fort signal B2B
  const isFree = FREE_EMAIL_DOMAINS.has(domain);
  if (!isFree) {
    score += 25;
    reasons.push("email pro (domaine custom)");
  } else {
    score += 5;
    reasons.push("email free (gmail/yahoo/etc)");
  }

  // +5 : TLD légitime
  const tld = domain.split(".").pop();
  if (tld && PRO_EMAIL_TLDS.includes(tld)) {
    score += 5;
  }

  // +10 : champ "company"/"entreprise" rempli
  const companyField = (data.company ?? data.entreprise ?? data.organization) as string | undefined;
  if (typeof companyField === "string" && companyField.trim().length >= 2) {
    score += 10;
    reasons.push("entreprise renseignée");
  }

  // +5 : champ "phone"/"tel" rempli
  const phoneField = (data.phone ?? data.tel ?? data.telephone) as string | undefined;
  if (typeof phoneField === "string" && phoneField.trim().length >= 6) {
    score += 5;
    reasons.push("téléphone renseigné");
  }

  // +5 : champ "jobTitle" rempli (signal seniority)
  const jobField = (data.jobTitle ?? data.poste ?? data.title ?? data.role) as string | undefined;
  if (typeof jobField === "string" && jobField.trim().length >= 2) {
    score += 5;
    reasons.push("poste renseigné");
  }

  return { score, reason: reasons.join(", "), penalty: 0 };
}

// ─── Phase 2 : IA boost (intent depuis le message) ──────────────────────────

async function aiIntentScore(message: string | null): Promise<{ score: number; reason: string }> {
  if (!message || message.trim().length < 10) return { score: 0, reason: "" };

  const prompt = `Tu évalues un lead B2B/B2C reçu via un formulaire de contact. Voici son message :

"""
${message.slice(0, 2000)}
"""

Évalue l'INTENT d'achat sur une échelle 0-50 et explique brièvement.
- 0-10 : curiosité vague, question générale, "info"
- 11-25 : intérêt qualifié, projet identifié, pas de timing/budget
- 26-40 : urgence claire (timing ou budget mentionné), pain point explicite
- 41-50 : achat imminent ("besoin d'un devis avant le X", "budget de Y€", décision proche)

Aussi détecte les RED FLAGS : spam, troll, demande inappropriée → renvoie score 0.

Réponds UNIQUEMENT en JSON strict :
{"score": <int 0-50>, "reason": "<phrase courte fr>"}`;

  try {
    const ai = await askAi({ prompt, system: "Tu es un sales analyst qui qualifie des leads inbound. Réponds toujours en JSON valide." });
    if (!ai?.text) return { score: 0, reason: "" };
    // Parse JSON de la réponse (best-effort)
    const match = ai.text.match(/\{[\s\S]*?\}/);
    if (!match) return { score: 0, reason: "" };
    const parsed = JSON.parse(match[0]) as { score?: number; reason?: string };
    const score = Math.max(0, Math.min(50, Number(parsed.score ?? 0)));
    return { score, reason: parsed.reason ?? "" };
  } catch {
    return { score: 0, reason: "" };
  }
}

// ─── Orchestrator : score complet ───────────────────────────────────────────

/** Calcule le score complet d'un lead. Best-effort : si l'IA timeout/échoue,
 *  on retombe sur les règles seules (graceful degradation). */
export async function scoreLead(
  email: string | null,
  data: Record<string, unknown>,
  options: { skipAi?: boolean } = {},
): Promise<LeadScoreResult> {
  const rules = ruleBasedScore(email, data);

  // Message libre : champ message/text/comment/note
  const message = (data.message ?? data.text ?? data.comment ?? data.note ?? data.body) as
    | string
    | undefined;
  const ai = options.skipAi ? { score: 0, reason: "" } : await aiIntentScore(message ?? null);

  // Bonus : type=newsletter = signal warm engagement (vs contact = transactionnel)
  let bonuses = 0;
  if (data.type === "newsletter") bonuses += 5;
  if (typeof message === "string" && message.length > 200) bonuses += 5; // long message = engagement
  if (typeof email === "string" && email.split("@")[0].length > 3) bonuses += 2; // nom complet probable

  const raw = rules.score + ai.score + bonuses + rules.penalty;
  const score = Math.max(0, Math.min(100, raw));

  let temperature: LeadTemperature;
  if (rules.penalty < 0 && score < COLD_THRESHOLD) temperature = "INVALID";
  else if (score >= HOT_THRESHOLD) temperature = "HOT";
  else if (score >= WARM_THRESHOLD) temperature = "WARM";
  else if (score >= COLD_THRESHOLD) temperature = "COLD";
  else temperature = "INVALID";

  const reasons = [rules.reason, ai.reason].filter(Boolean).join(" | ");

  return {
    score,
    temperature,
    reason: reasons || "Pas assez de signaux pour scorer précisément",
    breakdown: {
      rules: rules.score,
      ai: ai.score,
      bonuses,
      penalties: rules.penalty,
    },
  };
}
