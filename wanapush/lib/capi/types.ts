// Types pour Meta Conversions API (CAPI) — spec Graph API v24.0
// Doc : https://developers.facebook.com/docs/marketing-api/conversions-api/parameters

/**
 * Standard events Meta supportés. On en active 7 par défaut, les autres peuvent
 * être ajoutés au cas par cas via la config SitePixel.events.
 *
 * @see https://developers.facebook.com/docs/meta-pixel/reference#standard-events
 */
export const STANDARD_EVENTS = [
  "PageView", // visite d'une page (auto)
  "ViewContent", // clic sur un CTA / produit
  "Lead", // formulaire contact soumis
  "CompleteRegistration", // inscription
  "AddToCart", // ajout panier (Shop)
  "InitiateCheckout", // accès au checkout (Shop)
  "AddPaymentInfo", // saisie moyen paiement (Shop)
  "Purchase", // achat confirmé (Shop)
  "Subscribe", // abonnement
  "StartTrial", // début essai
  "Schedule", // RDV pris (Calendly)
  "Contact", // contact effectué
  "Donate",
  "FindLocation",
  "Search",
  "CustomizeProduct",
  "AddToWishlist",
] as const;

export type StandardEvent = (typeof STANDARD_EVENTS)[number];

/**
 * Champs PII envoyés à Meta CAPI. Les champs marqués HASHED doivent être
 * SHA256 du `lowercase(trim(value))` avant envoi. Les champs marqués RAW
 * doivent être envoyés en clair (Meta s'occupe du hashing).
 *
 * Champs prioritaires pour Match Quality Score > 7/10 :
 *   - em (email) — meilleur signal
 *   - ph (phone) — 2ème meilleur
 *   - fbp (Facebook Browser ID) — depuis cookie _fbp
 *   - fbc (Facebook Click ID) — depuis cookie _fbc ou param ?fbclid
 *   - client_ip_address + client_user_agent — fallback toujours présents
 */
export type UserDataInput = {
  // HASHED — emails (peut être multiple)
  em?: string | string[];
  // HASHED — phones (international E.164 sans + : "33612345678")
  ph?: string | string[];
  // HASHED — first names lowercase
  fn?: string | string[];
  // HASHED — last names lowercase
  ln?: string | string[];
  // HASHED — city lowercase sans espace
  ct?: string;
  // HASHED — state ISO 3166-2 (ex: "fr-75")
  st?: string;
  // HASHED — postal code
  zp?: string;
  // HASHED — country ISO 2 lowercase (ex: "fr")
  country?: string;
  // HASHED — date of birth YYYYMMDD
  db?: string;
  // HASHED — gender "m" ou "f"
  ge?: "m" | "f";
  // HASHED — external_id (ID interne user dans WanaPush si connu)
  external_id?: string | string[];
  // RAW — IP du visiteur (jamais hashed côté Meta)
  client_ip_address?: string;
  // RAW — User-Agent du visiteur
  client_user_agent?: string;
  // RAW — Facebook Browser ID (cookie _fbp : "fb.1.<timestamp>.<random>")
  fbp?: string;
  // RAW — Facebook Click ID (cookie _fbc ou construit depuis param ?fbclid)
  fbc?: string;
  // RAW — subscription_id (Stripe customer ID si Shop)
  subscription_id?: string;
};

/**
 * UserData après hashing — prêt à envoyer à Meta. Les champs PII sont des
 * strings SHA256 hex lowercase. Les champs RAW restent inchangés.
 */
export type UserDataHashed = {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  db?: string;
  ge?: string;
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
  subscription_id?: string;
};

/**
 * CustomData : valeurs métier de l'event (valeur conversion, contenus vus, etc.)
 * Champs courants documentés ; les champs custom sont autorisés.
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/custom-data
 */
export type CustomData = {
  value?: number; // valeur monétaire (ex: 99.90 pour un achat)
  currency?: string; // ISO 4217 majuscule (ex: "EUR", "USD")
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: "product" | "product_group";
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  num_items?: number;
  order_id?: string;
  predicted_ltv?: number;
  search_string?: string;
  status?: string;
  delivery_category?: "in_store" | "curbside" | "home_delivery";
  // Champs custom autorisés (Meta les stocke tels quels)
  [key: string]: unknown;
};

/**
 * Source action — d'où vient l'event. Pour les sites générés WanaPush c'est
 * toujours "website".
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event#action-source
 */
export type ActionSource =
  | "email"
  | "website"
  | "phone_call"
  | "chat"
  | "physical_store"
  | "system_generated"
  | "business_messaging"
  | "other";

/**
 * Server event envoyé à Meta CAPI. C'est le payload final après hashing PII.
 */
export type ServerEvent = {
  event_name: string;
  event_time: number; // Unix timestamp en SECONDES (pas ms)
  event_id?: string; // UUID partagé avec le Pixel client pour dedup
  event_source_url?: string;
  action_source: ActionSource;
  user_data: UserDataHashed;
  custom_data?: CustomData;
  data_processing_options?: string[]; // ["LDU"] pour Limited Data Use (CCPA)
  data_processing_options_country?: number; // 1 = US
  data_processing_options_state?: number; // 1000 = California
  opt_out?: boolean;
};

/**
 * Payload complet envoyé à `POST graph.facebook.com/v24.0/{pixelId}/events`.
 */
export type CapiPayload = {
  data: ServerEvent[];
  test_event_code?: string; // pour Meta > Events Manager > Test Events
  partner_agent?: string; // identifiant partenaire (ex: "wanapush-saas-1.0")
};

/**
 * Réponse Meta après envoi events. Toujours du JSON.
 *
 * Succès : { events_received: 1, messages: [], fbtrace_id: "AbCdEf..." }
 * Erreur : { error: { message, type, code, fbtrace_id, ... } }
 */
export type CapiResponse =
  | {
      events_received: number;
      messages: string[];
      fbtrace_id: string;
    }
  | {
      error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id: string;
      };
    };

/**
 * Input que reçoit notre endpoint /api/capi/[slug]/event depuis le bridge JS
 * client. Le serveur fera ensuite : enrich (ip, ua, fbp, fbc cookies) → hash
 * → forward CAPI Meta.
 */
export type ClientEventInput = {
  event_name: string;
  event_id: string; // généré côté client (crypto.randomUUID), partagé avec Pixel
  event_time?: number; // optionnel — si absent on prend Date.now()/1000
  event_source_url?: string;
  user_data?: UserDataInput; // PII en clair, hashing fait côté serveur
  custom_data?: CustomData;
};
