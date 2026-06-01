// Génère le snippet HTML/JS à injecter dans le <head> des sites WanaPush
// pour activer le tracking Meta Pixel + bridge CAPI server-side.
//
// Logique :
//   1. Pixel JS officiel Meta (https://connect.facebook.net/en_US/fbevents.js)
//   2. window.wpTrack(name, customData, userData) — fonction globale exposée :
//        a) génère un event_id unique
//        b) appelle fbq('track', name, customData, { eventID: event_id })
//        c) fetch POST /api/capi/<slug>/event avec le MÊME event_id pour dedup
//   3. Auto-hook PageView au load
//   4. Auto-hook Lead sur form submit (extrait email/tel des inputs)
//   5. Si consentRequired=true, gate tout derrière un opt-in (bandeau RGPD)
//
// Le snippet est inline (pas de chargement externe sauf fbevents.js officiel).

import { sha256 } from "./hash";

export type PixelInjectionConfig = {
  pixelId: string; // numeric string ex: "1234567890"
  slug: string; // slug WanaPush du site, utilisé pour POST /api/capi/<slug>/event
  events: string[]; // liste des events activés (ex: ["PageView","Lead","ViewContent"])
  consentRequired: boolean; // false en phase test → pas de bandeau, tracking actif au load
  capiEndpoint?: string; // override pour les tests (défaut: "/api/capi")
};

/**
 * Sanitize une valeur destinée à être interpolée dans un attribut JS string.
 * Évite l'injection en cassant les caractères dangereux.
 */
function jsString(value: string): string {
  return JSON.stringify(value);
}

/**
 * Sanitize un slug : autorise alphanum + tirets + underscores. Throw sinon.
 */
function assertSafeSlug(slug: string): void {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(slug)) {
    throw new Error(`Slug non sûr pour injection HTML : "${slug}"`);
  }
}

/**
 * Sanitize un pixelId : doit être numérique uniquement.
 */
function assertSafePixelId(pixelId: string): void {
  if (!/^\d{6,30}$/.test(pixelId)) {
    throw new Error(`Pixel ID non sûr : "${pixelId}" (numérique 6-30 chars attendus)`);
  }
}

/**
 * Génère le snippet HTML complet à injecter dans <head>.
 * Le snippet est minifié inline mais avec retours à la ligne pour lisibilité
 * (gain négligeable de minif à ce stade).
 */
export function buildPixelSnippet(config: PixelInjectionConfig): string {
  assertSafePixelId(config.pixelId);
  assertSafeSlug(config.slug);

  const eventsJson = JSON.stringify(config.events);
  const capiBase = config.capiEndpoint ?? "/api/capi";

  // Le snippet utilise `__wpCapi` comme namespace pour éviter les collisions avec
  // d'autres lib JS du site. La fonction publique reste `window.wpTrack`.
  return `
<!-- WanaPush Pixel + CAPI bridge — config: ${jsString(config.slug)} -->
<script>
// Meta Pixel base code (officiel Meta — ne pas modifier)
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${jsString(config.pixelId)});

// WanaPush bridge — dedup Pixel client + CAPI serveur via event_id partagé
(function(){
  window.__wpCapi = {
    slug: ${jsString(config.slug)},
    events: ${eventsJson},
    endpoint: ${jsString(capiBase)},
    consentRequired: ${config.consentRequired ? "true" : "false"},
    consented: ${config.consentRequired ? "false" : "true"}
  };

  function newEventId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return Date.now() + '-' + Math.random().toString(36).slice(2, 12);
  }

  function shouldTrack(name) {
    var c = window.__wpCapi;
    if (!c.consented) return false;
    if (!c.events || c.events.length === 0) return true;
    return c.events.indexOf(name) !== -1;
  }

  window.wpTrack = function(name, customData, userData) {
    if (!shouldTrack(name)) return;
    var eid = newEventId();
    var cd = customData || {};
    try { fbq('track', name, cd, { eventID: eid }); } catch (_) {}
    try {
      fetch(window.__wpCapi.endpoint + '/' + encodeURIComponent(window.__wpCapi.slug) + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: name,
          event_id: eid,
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: location.href,
          user_data: userData || undefined,
          custom_data: cd
        }),
        credentials: 'omit',
        keepalive: true
      }).catch(function(){});
    } catch (_) {}
  };

  // API consent (utilisable par un bandeau cookie tiers)
  window.wpConsent = function(granted) {
    window.__wpCapi.consented = granted === true;
    if (granted === true) window.wpTrack('PageView');
  };

  // Auto-hook : PageView au load
  function autoPageView() {
    if (shouldTrack('PageView')) window.wpTrack('PageView');
  }

  // Auto-hook : Lead sur form submit (extrait email/tel des inputs si présents)
  function autoLead(e) {
    var f = e.target;
    if (!f || f.tagName !== 'FORM') return;
    var ud = {};
    var em = f.querySelector('input[type=email]') || f.querySelector('input[name*="mail" i]');
    var ph = f.querySelector('input[type=tel]') || f.querySelector('input[name*="tel" i]') || f.querySelector('input[name*="phone" i]');
    var fn = f.querySelector('input[name*="prenom" i], input[name*="firstname" i]');
    var ln = f.querySelector('input[name*="nom" i]:not([name*="prenom" i]):not([name*="full" i]), input[name*="lastname" i]');
    if (em && em.value) ud.em = em.value.trim();
    if (ph && ph.value) ud.ph = ph.value.trim();
    if (fn && fn.value) ud.fn = fn.value.trim();
    if (ln && ln.value) ud.ln = ln.value.trim();
    if (ud.em || ud.ph) window.wpTrack('Lead', {}, ud);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoPageView);
  } else {
    autoPageView();
  }
  document.addEventListener('submit', autoLead, true);
})();
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${config.pixelId}&ev=PageView&noscript=1" alt=""/></noscript>
<!-- /WanaPush Pixel -->
`;
}

/**
 * Injecte le snippet dans un HTML existant juste avant </head>.
 * Si pas de </head> trouvé (HTML mal formé), insère en fin de <body> en fallback.
 * Si déjà injecté (détecté via marker comment), remplace l'ancien snippet.
 */
export function injectPixelIntoHtml(html: string, config: PixelInjectionConfig): string {
  const snippet = buildPixelSnippet(config);

  // Détection d'une injection précédente — on remplace si trouvé
  const startMarker = "<!-- WanaPush Pixel + CAPI bridge —";
  const endMarker = "<!-- /WanaPush Pixel -->";
  const existingStart = html.indexOf(startMarker);
  if (existingStart >= 0) {
    const existingEnd = html.indexOf(endMarker, existingStart);
    if (existingEnd >= 0) {
      return html.slice(0, existingStart) + snippet.trim() + html.slice(existingEnd + endMarker.length);
    }
  }

  // Première injection — avant </head>
  const headCloseIdx = html.indexOf("</head>");
  if (headCloseIdx >= 0) {
    return html.slice(0, headCloseIdx) + snippet + html.slice(headCloseIdx);
  }

  // Fallback : juste avant </body> si head manquant
  const bodyCloseIdx = html.indexOf("</body>");
  if (bodyCloseIdx >= 0) {
    return html.slice(0, bodyCloseIdx) + snippet + html.slice(bodyCloseIdx);
  }

  // Dernier recours : append
  return html + snippet;
}

/**
 * Helper pour calculer un identifiant stable de version de snippet (utile pour
 * cache busting si le code du snippet change un jour). Utilise sha256 du
 * snippet rendu.
 */
export function snippetVersion(config: PixelInjectionConfig): string {
  return sha256(buildPixelSnippet(config)).slice(0, 12);
}

/** Helpers exportés pour tests. */
export const __testing = { assertSafeSlug, assertSafePixelId, jsString };
