// Rédaction IA d'une campagne email à partir d'un brief + du contexte business.
// Renvoie { subject, preheader, bodyMarkdown }. Utilise askAi (lib/ai.ts).

import { prisma } from "@/lib/prisma";
import { askAi } from "@/lib/ai";

export interface DraftedCampaign {
  subject: string;
  preheader: string;
  bodyMarkdown: string;
}

function extractJson(text: string): unknown {
  // Retire d'éventuelles fences ```json … ``` et isole le 1er objet { … }.
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Réponse IA non parsable.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function draftCampaign(userId: string, brief: string): Promise<DraftedCampaign> {
  const business = await prisma.business.findFirst({
    where: { userId },
    select: { name: true, sector: true, website: true },
    orderBy: { createdAt: "asc" },
  });

  const context = business
    ? `Entreprise : ${business.name}${business.sector ? ` (secteur : ${business.sector})` : ""}${business.website ? ` — ${business.website}` : ""}.`
    : "PME francophone.";

  const system =
    "Tu es un copywriter email senior, spécialiste de l'emailing marketing qui convertit (B2C/B2B PME francophone). " +
    "Tu écris en français, ton chaleureux et professionnel, orienté bénéfice client, avec un appel à l'action clair. " +
    "Tu respectes la délivrabilité (pas de spam words, pas de MAJUSCULES abusives, pas d'excès d'emojis). " +
    "Tu réponds STRICTEMENT en JSON valide, sans texte autour, au format : " +
    '{"subject": string (max 60 caractères, accrocheur, sans clickbait trompeur), ' +
    '"preheader": string (max 100 caractères, complète le sujet), ' +
    '"bodyMarkdown": string (corps en Markdown : titres, paragraphes courts, 1 lien d\'action [texte](url) avec url=https://exemple.com à adapter, signature)}.';

  const prompt = `${context}\n\nObjectif de cette campagne email : ${brief}\n\nRédige la campagne maintenant (JSON strict uniquement).`;

  const res = await askAi({ prompt, system, temperature: 0.7, maxTokens: 2000 });
  if (!res?.text) throw new Error("L'IA n'a pas répondu (vérifie la configuration du provider IA).");

  const parsed = extractJson(res.text) as Partial<DraftedCampaign>;
  if (!parsed.subject || !parsed.bodyMarkdown) {
    throw new Error("Réponse IA incomplète (sujet ou contenu manquant).");
  }
  return {
    subject: String(parsed.subject).slice(0, 255),
    preheader: String(parsed.preheader ?? "").slice(0, 150),
    bodyMarkdown: String(parsed.bodyMarkdown),
  };
}
