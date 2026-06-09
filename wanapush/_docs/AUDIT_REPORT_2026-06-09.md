# Audit complet WanaPush — 2026-06-09

> Audit code (sécurité/qualité/archi/perf), DB (Prisma/MariaDB), et benchmark des best
> practices de mi-2026 (stack + martech). Sources web vérifiées sur docs officielles
> (Prisma, Next.js, Anthropic, Auth.js, Meta/Google/Yahoo, Commission UE) au 2026-06-09.
> Méthode : 5 agents d'audit parallèles + recherche web ciblée. Sévérités calibrées prod.

## TL;DR — ce qui compte vraiment

1. **🔴 RÉSOLU dans ce passage** — IDs de modèles Claude périmés (`claude-sonnet-4-20250514`,
   **retiré le 2026-06-15**). Toute la couche IA (copilot, scoring leads, génération site)
   serait tombée en 404. Corrigé → `claude-sonnet-4-6` dans `lib/anthropic.ts` + `lib/copilot/index.ts`.
2. **🔴 À FAIRE** — Endpoint public `app/api/ads/tiktok/events` sans auth : n'importe qui peut
   utiliser le token TikTok d'un marchand et injecter des conversions forgées (BOLA).
3. **🔴 À FAIRE** — `Account.access_token/refresh_token` stockés **en clair** (table NextAuth) —
   seul secret non chiffré au repos, contredit la règle "tous les tokens AES-256-GCM".
4. **🟠 À FAIRE** — Double-publication sociale possible (pas de claim atomique du cron publish) :
   risque de poster 2× sur les comptes FB/IG/LinkedIn des clients.
5. **🟠 STACK** — 2 choix désormais **officiellement périmés** : Prisma binary engine (supprimé
   en Prisma 7) et NextAuth v4 (maintenance-only depuis sept. 2025). Plan de migration ci-dessous.

---

## 1. Ce qui est excellent (à ne pas casser)

Vérifié, pas supposé :
- **`lib/crypto.ts`** AES-256-GCM correct (IV 12 octets aléatoire, auth tag, test de tamper).
- **CAPI** (`lib/capi/*`) : hash PII conforme spec Meta (fbp/fbc/IP non hashés, email/phone SHA-256),
  opt-out respecté, dédup `event_id`, rétention cron. ~120 tests. **Le meilleur module du repo.**
- **Stripe webhook** : signature vérifiée par-shop, idempotent via `StripeEvent.eventId @unique`.
- **Shop** : ownership `getShopForUser`, prix server-side (pas de tampering), `$transaction` + pagination.
- **Tokens ad/social/gbp** chiffrés sur chaque write ; **MCP** Bearer SHA-256 hashé, TTL ;
  **webhooks leads** HMAC-SHA256 signés ; **webhook Resend** timing-safe + fenêtre 5 min.
- **Isolation multi-tenant** : aucune fuite cross-tenant trouvée sur les endpoints à risque.

## 2. Findings sécurité / correctness (par sévérité)

### 🔴 CRITIQUE
| # | Finding | Fichier |
|---|---------|---------|
| C1 | ~~Model IDs Claude périmés (404 au 2026-06-15)~~ **CORRIGÉ** | `lib/anthropic.ts:8`, `lib/copilot/index.ts:31` |
| C2 | Endpoint TikTok events **public** : pas de session/scope, token marchand utilisable par anonyme (BOLA), pas de rate-limit | `app/api/ads/tiktok/events/route.ts:56-93` |
| C3 | `Account.access_token/refresh_token/id_token` **en clair** en DB (adapter NextAuth) | `prisma/schema.prisma:24-29` |
| C4 | Double-publish social : pas de claim atomique (`updateMany where status=SCHEDULED`) → post 2× | `lib/social/publisher.ts:8-17`, `app/api/social/cron/publish/route.ts:18` |
| C5 | `typescript.ignoreBuildErrors` + `eslint.ignoreDuringBuilds` = `true` : le "strict" n'est pas appliqué, une régression de type dans le paiement passe en prod | `next.config.mjs` |

### 🟠 HIGH
- **H1** Prompt injection scoring leads : message attaquant interpolé direct dans le prompt → un lead peut se noter HOT. `lib/leads/scoring.ts:108-140`.
- **H2** SSRF (pas de blocage IP privées/metadata) sur screenshot, verify-pixel, seo-audit, pagespeed. `app/api/seo/screenshot`, `app/api/ads/verify-pixel`, `lib/seo-audit.ts:85`.
- **H3** `lib/crypto.ts:23` : si `ENCRYPTION_KEY` n'est pas 64-hex → KDF scrypt avec **sel constant en clair** dans le repo. Pas de validation de format.
- **H4** `lib/customer-auth.ts:7` : secret de fallback **codé en dur** (`"wanapush-customer-secret"`) → forge de session customer ; comparaison non timing-safe (`!==`).
- **H5** Stripe order creation = write multi-tables **sans `$transaction`** → état incohérent si échec milieu. `app/api/webhooks/stripe/[siteSlug]/route.ts:98-333`.
- **H6** OAuth `userToken` Facebook stocké **non chiffré** dans `SocialAccount.meta` (seules les colonnes accessToken/refreshToken sont chiffrées). `lib/social/facebook.ts:186`.
- **H7** Refresh token race (GBP + social) : pas de single-flight, deux refresh concurrents peuvent s'invalider. `lib/gbp/index.ts:113`, `lib/social/index.ts:113`.
- **H8** Copilot : pas de rate-limit / plafond de coût par user, historique rejoué intégralement (coût quadratique) → DoS facture Anthropic. `app/api/copilot/ask`, `lib/copilot/index.ts:134`.
- **H9** MCP : `scopes` (read / read:write) stockés mais **jamais vérifiés** dans `handleToolsCall`. Bombe à retardement dès le 1er write-tool. `lib/mcp/server.ts`.
- **H10** Cron auth : `===` non timing-safe + secret accepté en query-string (`?secret=`) → logs nginx. Tous les `app/api/*/cron/*`.

### 🟡 MEDIUM (sélection)
- `AI_PROVIDER` défaut = **`openai`** (`gpt-4o`) : par défaut la plateforme n'utilise **pas** Claude, contredit l'archi "IA = Anthropic". `lib/ai.ts:27`.
- Pas de headers de sécurité (CSP/HSTS/X-Frame-Options) alors que le skill stack les liste. `next.config.mjs`.
- N+1 queries : ads sync (`lib/ads/sync.ts:41`), anomalies cron (boucle 500 users séquentielle).
- Webhook email `openCount: {increment:1}` **non dédupliqué** sur `svix-id` (commentaire dit "idempotent" mais ne l'est pas). `lib/email/webhooks.ts:120`.
- `WANAPUSH_SYSTEM_PROMPT` dupliqué verbatim (`lib/ai.ts` + `lib/anthropic.ts`) → drift.
- Cart racy (`getOrCreateCart` findFirst+create sans contrainte unique).
- Casts `as never`/`as any` sur les boundaries paiement & SDK Anthropic (masquent les vrais mismatches, cf. C5).

### 🟢 LOW
- God files non testés : `react-template.ts` (3277 l), `site-editor.ts` (3191 l), `shop-react-components.ts` (2532 l), `ads/google.ts` (1420 l).
- Logs verbeux exposant des page tokens FB en clair (`lib/social/facebook.ts:137`).
- `dev.db` SQLite committé à la racine (artefact mort sur stack MariaDB).
- Aucun test hors `capi/*` + `crypto` + `generated-site-schema`.

## 3. Findings base de données

- **C3 (ci-dessus)** : `Account.*_token` en clair = priorité #1 DB.
- **H-DB1** Liens cross-tables en string sans FK/cascade : `Shop.siteSlug`, `FormSubmission.emailContactId`, `AudienceSync.shopId`, `Refund.createdBy`, `DiscountUsage.customerId/orderId` → orphelins, pas de `ON DELETE`.
- **H-DB2** Tables à croissance non bornée **sans rétention** : `PostAnalytics` (append par fetch !), `AdMetrics`, `GbpInsight`, `EmailSend`, `AuditLog`, `StripeEvent`, `CopilotMessage`. Seul `CapiEvent` a un cron de rétention. `GeneratedSite.pages` = ~550 KB/ligne (HTML inline).
- **M-DB** Champs `String` qui devraient être enums (`Shop.stripeMode`, `AdAudience.platform` alors qu'`AdPlatform` existe, `FormSubmission.type`, statuts GBP). Argent ads en `Float` (`Campaign.budget`, `AdMetrics.spend`) au lieu de `Decimal` → erreurs d'arrondi ROAS. `FormSubmission` sans `@updatedAt`.
- ✅ Migrations propres (22, aucune destructive), singleton Prisma correct, `engineType="binary"` présent (à conserver tant qu'on n'a pas migré Prisma 7).

## 4. Benchmark stack mi-2026 — ce qui est périmé / à upgrader

| Sujet | État actuel | Standard juin 2026 | Action |
|-------|-------------|--------------------|--------|
| **Prisma binary engine** | `engineType="binary"` (obligatoire aujourd'hui) | **Supprimé en Prisma 7.0** (nov. 2025). Client Rust-free `queryCompiler` + driver adapter **obligatoire** | Migrer vers Prisma 7 + `@prisma/adapter-mariadb`. 3× plus rapide, bundle 14MB→1.6MB. ⚠️ pin une version testée (bug fuite prepared-stmt 7.5.0) |
| **NextAuth v4.24** | JWT strategy | **Maintenance/sécurité seulement** depuis sept. 2025 ; mainteneurs pointent vers **Better Auth** | Court terme : OK. Vérifier **CVE-2025-29927** (bypass middleware) → faire les checks auth au niveau data/route, pas middleware seul. Moyen terme : migrer Better Auth (sessions DB révocables, multi-tenant natif) |
| **Next.js 14.2** | App Router | **Next 16.2** + React 19.2 (Turbopack défaut, Cache Components, React Compiler → gains INP) | Upgrade 14→(15)→16 via codemod. Gains Core Web Vitals + sécurité image |
| **Tailwind 3.4 / Zod 3→4** | v3 / Zod 4 déjà OK | Tailwind v4 (builds 3.5–8× plus rapides) ; Zod 4 (14× parsing) | Non urgent ; Zod 4 déjà en place (bien) |
| **Claude API** | 1 appel, pas de cache | **Prompt caching** (reads 0.1×), **Tool Search** (-95% contexte), **Programmatic Tool Calling** (-37% tokens), **structured outputs** GA | Voir §6. Énorme levier coût/qualité pour copilot + génération |
| **Auth agents/MCP** | Bearer SHA-256 | **OAuth 2.1 + PKCE + Resource Indicators (RFC 8707)** pour MCP distant | À prévoir si MCP exposé publiquement |

## 5. Benchmark martech mi-2026 — must-have conformité/perf

**Must-have (table stakes ou conformité-ou-mort) :**
1. **Meta CAPI + Pixel** sur **Graph/Marketing API v25** (sortie 18 fév. 2026), dédup `event_id`, **EMQ ≥ 8.0** (email/phone/external_id hashés + fbp/fbc/IP/UA **en clair**). ⚠️ ne JAMAIS hasher fbp/fbc/IP.
2. **Google Ads API v24.x** : **sortir de v20 avant le 10 juin 2026**. Enhanced Conversions offline/leads **migrent vers Data Manager API** et sont **bloquées dans l'Ads API à partir du 15 juin 2026**.
3. **Consent Mode v2** (4 signaux). ⚠️ **15 juin 2026** : `ad_storage` devient le contrôle unique du flux ad-data.
4. **Email** : SPF+DKIM+DMARC + **RFC 8058 one-click unsub**, taux plainte < 0.3 %. Google **rejette définitivement** les non-conformes depuis nov. 2025.
5. **EU AI Act Art. 50** : marquer le **contenu IA généré** (visuels/copy) comme artificiel. Applicable **2 août 2026** (contenu pré-existant : 2 déc. 2026). Pertinent direct pour WanaPush (générateur de créa IA).
6. **Server-side tagging** (CAPI gateway / GTM SS) comme backbone mesure — first-party, pas 3rd-party cookies (qui ne meurent PAS sur Chrome, mais first-party reste stratégique).

**Différenciateurs (nice-to-have) :**
- TikTok Events API 2.0 + LinkedIn CAPI (email SHA-256 / click-id).
- Couche de réallocation budget cross-plateforme sur ROAS/CPA blended + détection fatigue créa.
- Monitoring EMQ / Dataset Quality automatisé avec alerting par paramètre.
- Génération + A/B test landing pages câblés au tracking/consent.
- **Volume + vélocité créa = le levier perf #1** (3-5 créas/semaine, 10-15 concurrentes).

**À surveiller :** Meta v26 (~sept. 2026) met en pause les campagnes ASC/AAC restantes. Meta **one-click CAPI** (lancé 27 avr. 2026) = concurrent direct pour SMB sans dev (mais web-only, non configurable → l'avantage WanaPush = offline/CRM/lead events + contrôle paramètres).

## 6. Pattern IA "pro" 2026 à adopter (copilot + génération)

- **Prompt caching** : `tools → system → messages`, breakpoint sur le dernier bloc stable. Reads à 0.1×. Le `WANAPUSH_SYSTEM_PROMPT` (stable) doit être caché. Pré-warm au boot pour la latence.
- **Tool Search** (`defer_loading`) : garder 3-5 tools chauds, défer le reste → ~95 % de contexte préservé sur grandes librairies de tools (les 9 tools copilot/MCP).
- **Programmatic Tool Calling** : -37 % tokens sur orchestrations multi-étapes.
- **Structured outputs** (`output_config.format`) GA → remplacer le parsing JSON fragile par regex (`ai.text.match(/\{.../)`) du copilot et du scoring leads.
- **Modèles** : `claude-opus-4-8` (raisonnement/tool-use lourd, p. ex. copilot), `claude-sonnet-4-6` (défaut), `claude-haiku-4-5` (rapide). Adaptive thinking + `effort`. **Plus de `budget_tokens`** (400 sur 4.7/4.8).
- **Agent SDK / Managed Agents** : pour des agents auto-pilotes long-horizon (la vision produit), Anthropic héberge la boucle + outcomes gradés (rubric). À évaluer pour le "auto-pilote complet".

## 7. Roadmap priorisée

**Sprint 0 (cette semaine — sécurité/prod) :**
1. ✅ Model IDs Claude (fait).
2. C2 : auth + scope ownership sur `ads/tiktok/events` (ou slug signé comme CAPI) + rate-limit.
3. C3 : chiffrer ou ne pas persister `Account.*_token`.
4. C4 : claim atomique du cron publish.
5. C5 : réactiver les checks TS/ESLint au build (ou en CI).
6. H3/H4 : valider format `ENCRYPTION_KEY`, retirer le fallback secret customer + `timingSafeEqual`.

**Sprint 1 (robustesse) :** H1 (fencing prompt injection + validation bornée), H2 (garde SSRF), H5 ($transaction Stripe), H6 (chiffrer meta), H8 (rate-limit + budget copilot), H9 (enforce scopes MCP), H10 (timingSafeEqual cron + retirer query-string). Headers de sécurité.

**Sprint 2 (DB & échelle) :** crons de rétention (PostAnalytics/AdMetrics/…), FK + onDelete sur les liens string, enums + `Decimal` argent ads.

**Sprint 3 (perf IA & conformité martech) :** prompt caching + structured outputs (copilot/génération), EMQ monitoring, Art. 50 labeling créas IA, vérifier Graph API v25 / Ads API v24 / consent v2 deadlines de juin.

**Trimestre (modernisation stack) :** Prisma 7 + adapter-mariadb, plan Next 16, évaluation Better Auth.

---
*Toutes les versions/dates vérifiées sur sources officielles au 2026-06-09. Pourcentages de lift (ROAS/EMQ) issus de sources vendeurs = directionnels.*
