# 🔍 Audit de code WanaPush — 2026-06-03

> Scan automatisé de l'existant contre les 5 skills WanaPush récemment créés.
> Identifie les violations objectives + estimations de fix.
>
> Méthodologie : grep ciblés sur les anti-patterns documentés dans
> `SKILL_wanapush_stack_best_practices.md`.

## 📊 Synthèse exécutive

| Sévérité | Catégorie | Nombre | Effort estimé |
|---|---|---|---|
| 🔴 CRITIQUE | Routes sans validation Zod | **23** | 4-6h |
| 🔴 CRITIQUE | Prisma queries sans `select` (fuite tokens potentielle) | **15** | 2-3h |
| 🟠 IMPORTANT | Mutations Prisma sans `revalidatePath` | **46** | 3-4h |
| 🟠 IMPORTANT | Client Components > 500 lignes (INP risk) | **10** | 2-3 jours |
| 🟠 IMPORTANT | `$transaction` jamais utilisé (mutations non-atomiques) | tout le projet | 1-2 jours |
| 🟡 MOYEN | Cast `as Type` non vérifiés | **13** | 1-2h |
| 🟡 MOYEN | Modules sans skill dédié | **10 modules** | variable |

**Total estimation MVP fix** : ~3-5 jours pleins, ou 2 semaines en mode 2h/jour.

---

## 🔴 CRITIQUE — À fixer en priorité

### 1. Routes API sans validation Zod (23 routes)

Risque : injection de payload malicieux, types incorrects, crashes serveur,
peut-être bypass d'autorisation.

**Routes concernées (top 10)** :
- `app/api/storefront/[siteSlug]/cart/route.ts`
- `app/api/storefront/[siteSlug]/checkout/route.ts`
- `app/api/storefront/[siteSlug]/cart/discount/route.ts`
- `app/api/storefront/[siteSlug]/cart/items/[itemId]/route.ts`
- `app/api/storefront/[siteSlug]/customer/login/route.ts`
- `app/api/storefront/[siteSlug]/products/[productSlug]/reviews/route.ts`
- `app/api/forms/[id]/route.ts`
- `app/api/ads/sync/route.ts`
- `app/api/shop/route.ts`
- `app/api/shop/[siteSlug]/taxes/route.ts`

⚠️ **Note** : la concentration sur `/api/storefront/*` (publique, sans auth)
en fait un point d'entrée prioritaire pour les attaques. **À fixer d'abord**.

**Pattern à appliquer** (cf `SKILL_wanapush_stack_best_practices.md`) :
```ts
const inputSchema = z.object({ ... });
export async function POST(req: Request) {
  const parsed = inputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalide" },
      { status: 400 },
    );
  }
  // ...
}
```

### 2. Prisma queries sans `select` (15 occurrences)

Risque : fuite de tokens chiffrés (`accessToken`, `refreshToken`,
`capiAccessToken`) dans des objets renvoyés au client OU loggés en clair.

**Fichiers concernés** :
- `app/(dashboard)/ads/setup/page.tsx:19`
- `app/(dashboard)/social/setup/page.tsx:19`
- `app/api/ads/sync/route.ts:22`
- `app/(dashboard)/generated-sites/[id]/pixel/page.tsx:44`
- `app/api/ads/campaigns/route.ts:109`
- `app/api/social/posts/route.ts:84`
- `app/api/ads/meta/geo-search/route.ts:46`
- `app/api/ads/accounts/route.ts:14`
- `app/api/ads/cron/sync/route.ts:17`
- `app/api/capi/[slug]/event/route.ts:146`
- `app/api/ads/destination-options/route.ts:27`
- `app/api/ads/meta/pixels/route.ts:27`
- `app/api/sites/[id]/pixel/route.ts:62`
- `app/api/sites/[id]/pixel/route.ts:85`
- `app/api/social/accounts/[id]/route.ts:15`

**À vérifier** : pour chaque, est-ce que le résultat passe par une route API
qui renvoie au client ? Ou est-ce uniquement consommé serveur-side (cron,
helpers internes) ?

**Pattern à appliquer** :
```ts
// ❌
const accounts = await prisma.adAccount.findMany();

// ✅ Si juste pour serveur-side (token nécessaire)
// → annoter en commentaire pourquoi pas de select

// ✅ Si renvoyé au client
const accounts = await prisma.adAccount.findMany({
  select: { id: true, name: true, status: true, currency: true },
});
```

---

## 🟠 IMPORTANT — À planifier

### 3. Mutations Prisma sans `revalidatePath` (46 routes)

Risque : caches stale, l'UI affiche des données obsolètes après modification.

**Top fichiers à fixer** :
- `app/api/sites/route.ts`
- `app/api/sites/[id]/route.ts`
- `app/api/sites/[id]/pixel/route.ts`
- `app/api/forms/submit/route.ts`
- `app/api/forms/[id]/route.ts`
- `app/api/storefront/[siteSlug]/cart/*`
- `app/api/storefront/[siteSlug]/products/[productSlug]/reviews/route.ts`
- `app/api/ads/accounts/[id]/route.ts`
- ... (38 autres)

**Pattern** :
```ts
await prisma.campaign.update({ where: { id }, data: { status: "PAUSED" } });
revalidatePath("/ads");        // ← À AJOUTER après chaque mutation
// ou plus ciblé :
revalidateTag("campaigns");
```

### 4. Client Components géants (INP risk)

Composants > 500 lignes — risque INP majeur car beaucoup de JS au client.

| Lignes | Fichier | Recommandation |
|---|---|---|
| **2 740** | `app/(dashboard)/ads/CampaignsList.tsx` | Refacto en sous-composants : `PushModal`, `DestinationWidget`, `Section`, `ToggleRow`. Server Component pour la liste, Client Components ciblés pour les interactions. |
| **1 438** | `app/(dashboard)/shop/[siteSlug]/products/ProductEditor.tsx` | Splitter par section éditable (general, variants, images, SEO). |
| **871** | `app/(dashboard)/seo/EnrichContentModal.tsx` | OK pour un modal, surveiller si lazy-loadé. |
| **767** | `app/(dashboard)/seo/SeoAuditClient.tsx` | Splitter en sous-tabs. |
| **640** | `app/(dashboard)/ads/GoogleAdsBuilder.tsx` | Pattern similaire à Meta builder. |
| **574** | `app/(dashboard)/builder/BuilderClient.tsx` | Probablement Server + Client mix possible. |
| **557** | `app/(dashboard)/builder-old/BuilderClient.tsx` | **À supprimer** (legacy `-old`). |
| **532** | `app/(dashboard)/seo/SitewideOptimizer.tsx` | OK si tab séparé, vérifier `<Suspense>`. |
| **514** | `app/(dashboard)/sites/SitesClient.tsx` | À examiner. |
| **512** | `app/(dashboard)/ads/CampaignBuilder.tsx` | Sous-composant de CampaignsList — déjà compté indirectement. |

**Quick win** : appliquer `startTransition()` sur les filtres/recherches dans
ces gros composants pour améliorer l'INP sans refacto complet.

### 5. `$transaction` jamais utilisé

`grep prisma.$transaction app/api/` → **0 résultat** dans tout le projet.

**Risque** : opérations multi-tables non-atomiques peuvent laisser des
états incohérents si l'une échoue.

**Audit cible** : les routes qui font `Campaign.update + AuditLog.create`,
`Order.create + OrderItem.create + StockLevel.update`, etc.

### 6. Cast `as Type` non vérifiés (13)

Top occurrences :
- 3× `as AdPlatform` / `as Platform` dans OAuth callbacks (acceptable car
  enum trusted, mais pourrait être validé via Zod enum)
- 6× `as SiteBrief` / `as SiteMeta` dans accès aux champs Json Prisma
  → **À sécuriser** avec un schéma Zod : `briefSchema.parse(site.brief)` 

---

## 🟡 MOYEN — Backlog

### 7. Modules sans skill dédié (10 modules)

```
app/(dashboard)/
├── analytics/       ← Aucun skill
├── aso/             ← Aucun skill
├── builder/         ← Aucun skill (legacy : builder-old)
├── dashboard/       ← Aucun skill
├── email/           ← Aucun skill (email marketing)
├── gbp/             ← Aucun skill (Google Business Profile)
├── leads/           ← Aucun skill
├── shop/            ← ⚠️ PRIORITAIRE — création en cours
├── sites/           ← Aucun skill (probablement chevauche site-generator)
└── website/         ← Aucun skill (chevauche probablement site-generator)
```

**Recommandation** : prioriser **shop** (e-commerce, gros, Stripe), **gbp**
(SEO local critique), **leads** (lien direct avec /ads), **builder**
(potentiellement legacy à supprimer).

### 8. Code legacy à supprimer

- `app/(dashboard)/builder-old/` (557 lignes Client Component)
- `app/(dashboard)/generate-old/`

**Vérifier** : sont-ils encore utilisés ? Si non, suppression = -1 100 lignes
maintenance + clarification de l'architecture.

---

## 🎯 Plan d'action recommandé

### Sprint 1 (1 journée) — Sécurité critique
1. ✅ Audit fait (ce doc)
2. Fix les 23 routes sans Zod, en commençant par `/api/storefront/*`
3. Audit les 15 Prisma queries sans `select` : marquer celles qui
   exposent au client → ajouter `select`

### Sprint 2 (0.5-1 journée) — Cache & cohérence
4. Ajouter `revalidatePath` dans les 46 routes de mutations
5. Identifier les opérations multi-tables → wrapping en `$transaction`

### Sprint 3 (2-3 journées) — Perf INP
6. Refacto les 2 gros Client Components (CampaignsList, ProductEditor)
7. Appliquer `startTransition` sur les filtres lourds
8. Supprimer `builder-old` et `generate-old`

### Sprint 4 (jours, étalé) — Couverture skills
9. Skill **Shop** (en cours ce soir)
10. Skill **GBP**, **Leads**, **CAPI/Pixel** (priorité business)
11. Skill **Analytics**, **Email**, **ASO** (priorité moyenne)

---

## 📅 Audit suivant

À refaire en **septembre 2026** (post-Google core updates été + sortie
React 19/Next 15 stable).

**Last audit : 2026-06-03**.

---

*Généré automatiquement contre les skills :*
- *`SKILL_wanapush_stack_best_practices.md`*
- *`SKILL_wanapush_seo_module.md` (INP guidance)*
- *`SKILL_wanapush_site_generator.md` (Core Web Vitals)*
