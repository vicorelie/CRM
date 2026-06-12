// Couche d'abstraction "fournisseur d'email marketing".
// WanaPush n'envoie plus lui-même les campagnes marketing : il orchestre une
// plateforme pro (Brevo en premier). L'interface ci-dessous est volontairement
// générique pour brancher Mailchimp/Mailjet/etc. plus tard sans tout refaire.

export type ProviderId = "brevo";

export interface ProviderAccount {
  /** Email du compte sur la plateforme */
  email: string;
  /** Nom de société / compte (affichage) */
  companyName?: string;
  /** Libellé du plan (ex: "free", "lite") */
  plan?: string;
}

export interface ProviderList {
  id: number;
  name: string;
  totalSubscribers: number;
}

export interface ProviderSender {
  id: number;
  name: string;
  email: string;
  /** true = expéditeur vérifié et utilisable */
  active: boolean;
}

export interface ProviderCampaignStats {
  sent?: number;
  delivered?: number;
  opens?: number;
  clicks?: number;
}

export interface ProviderCampaign {
  id: string;
  name: string;
  subject: string;
  /** Statut natif de la plateforme : draft | sent | queued | inProcess | suspended */
  status: string;
  sentAt: string | null;
  stats: ProviderCampaignStats | null;
}

export interface CreateCampaignInput {
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  htmlContent: string;
  /** Listes destinataires (audiences) sur la plateforme */
  listIds: number[];
  replyTo?: string;
  /** ISO UTC ; si absent → brouillon non programmé */
  scheduledAt?: string;
}

export interface ImportContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
}

/** Erreur normalisée renvoyée par un provider (message lisible utilisateur). */
export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface EmailProvider {
  readonly id: ProviderId;
  readonly label: string;
  /** Valide la clé API et renvoie les infos de compte (sert au connect). */
  validate(apiKey: string): Promise<ProviderAccount>;
  /** Listes / audiences existantes sur la plateforme. */
  getLists(apiKey: string): Promise<ProviderList[]>;
  /** Expéditeurs validés (pour choisir le from sans erreur de validation). */
  getSenders(apiKey: string): Promise<ProviderSender[]>;
  /** Crée une liste (audience) et renvoie son id. */
  createList(apiKey: string, name: string): Promise<ProviderList>;
  /** Importe des contacts dans une liste (upsert). */
  importContacts(apiKey: string, listId: number, contacts: ImportContactInput[]): Promise<{ imported: number }>;
  /** Campagnes récentes avec stats. */
  getCampaigns(apiKey: string, limit?: number): Promise<ProviderCampaign[]>;
  /** Crée une campagne (brouillon) et renvoie son id natif. */
  createCampaign(apiKey: string, input: CreateCampaignInput): Promise<{ id: string }>;
  /** Envoie immédiatement une campagne existante. */
  sendCampaign(apiKey: string, campaignId: string): Promise<void>;
}
