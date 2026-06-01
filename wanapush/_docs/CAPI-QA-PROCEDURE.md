# QA E2E — Pixel Meta + Conversions API (Sprint 1)

Procédure de validation finale du Sprint 1 CAPI. À exécuter une fois avec ton vrai
Pixel Meta + CAPI Access Token pour confirmer que tout fonctionne en conditions
réelles (vs nos tests unit + tests live avec token fake).

## Pré-requis

- ✅ Compte publicitaire Meta connecté à WanaPush (déjà fait : "WEBAMA Ads")
- ✅ Un site généré dans WanaPush avec un slug (`capi-test` a été créé par le
  script de seed, mais n'importe quel autre site fera l'affaire)
- ✅ Accès à [Meta Events Manager](https://www.facebook.com/events_manager2/list/pixel)

## Étape 1 — Générer un CAPI Access Token

1. Va sur https://www.facebook.com/events_manager2/list/pixel
2. Sélectionne ton Pixel
3. Onglet **Settings** → section **Conversions API**
4. Clique **Generate access token**
5. Copie le token (commence par `EAA...`) — il ne sera affiché qu'une fois !

## Étape 2 — Récupérer un Test Event Code

1. Toujours dans Meta Events Manager → ton Pixel
2. Onglet **Test Events**
3. Note le code affiché (format `TEST12345`)
4. Garde l'onglet **Test Events** ouvert — c'est là que les events vont apparaître

## Étape 3 — Configurer le SitePixel WanaPush

1. Va sur https://wanapush.com/generated-sites
2. Trouve le site à tracker, clique sur le bouton 📊 (Pixel) à droite
3. Remplis :
   - **Compte publicitaire** : sélectionner le bon (WEBAMA Ads dans ce setup)
   - **Pixel** : sélectionner depuis le dropdown auto-rempli (ou saisir l'ID
     numérique manuellement si l'API échoue)
   - **CAPI Access Token** : coller le token de l'étape 1
   - **Test Event Code** : coller le `TEST12345` de l'étape 2
   - **Events** : laisser PageView + Lead + ViewContent (défaut)
   - **Activer le tracking** : ✓
   - **Exiger consentement RGPD** : ✗ (laisser décoché pour test interne)
4. Clique **Activer le tracking**

## Étape 4 — Ouvrir le site public et déclencher des events

1. Clique **Tester sur le site ↗** dans la page de config, ou va sur
   `https://wanapush.com/sites/<slug>` directement
2. La page se charge → événement **PageView** auto-tracked
3. Reviens sur Meta Events Manager > Test Events → tu devrais voir le PageView
   apparaître dans les 10-30 secondes :
   - **Source** : devrait afficher "Server" ET "Browser" pour le même event
     (= deduplication via event_id partagé fonctionne)
   - Si tu vois seulement "Browser" → le CAPI ne reçoit pas, vérifier le token
   - Si tu vois seulement "Server" → le Pixel JS est bloqué (adblocker?), pas
     critique mais le client-side enrichit le match quality
4. Soumets le formulaire de contact (si présent) → événement **Lead** avec
   email/téléphone hashés visibles dans Meta
5. Si le site a un Shop : ajoute un produit au panier → **AddToCart**

## Étape 5 — Vérifier la qualité du match

1. Dans Meta Events Manager > Diagnostics ou Overview
2. Onglet **Match Quality** → score sur 10
3. Cible : **>= 7/10** (idéalement 8-9)
4. Si < 7 : vérifier que client_ip_address et client_user_agent sont bien envoyés
   par notre CAPI (devraient l'être, on les enrichit côté serveur)

## Étape 6 — Vérifier dans la DB WanaPush

```bash
mysql -uwanapush_user -p685e7aa52904ebbf86e0aed00206fb3a -h127.0.0.1 wanapush \
  -e "SELECT eventName, status, JSON_EXTRACT(metaResponse, '\$.events_received') AS recv, createdAt
      FROM CapiEvent ORDER BY createdAt DESC LIMIT 10;"
```

Attendu :
- `status = SENT` (au lieu de FAILED avec le token fake)
- `recv = 1` dans metaResponse → confirme que Meta a bien reçu l'event

## Étape 7 — Tester l'opt-out

1. Va sur `https://wanapush.com/api/capi/<slug>/opt-out`
2. Réponse : "Tracking désactivé pour 1 an sur ce navigateur."
3. Reviens sur `https://wanapush.com/sites/<slug>` et navigue
4. Aucun event ne doit apparaître dans Meta Events Manager
5. Vérifier dans la DB qu'aucun nouveau CapiEvent n'est créé pour cette session

Pour annuler l'opt-out : vider le cookie `wp-no-track` dans le devtools du
navigateur (Application > Cookies > wp-no-track > Delete).

## Étape 8 — Tester le bandeau RGPD

1. Active **Exiger consentement RGPD** sur la config Pixel
2. Vide les cookies du site
3. Recharge la page : un bandeau noir doit apparaître en bas avec "Accepter" / "Refuser"
4. Aucun event ne doit être envoyé avant clic
5. Clique **Accepter** → PageView est envoyé immédiatement → bandeau disparaît
6. Clique **Refuser** → cookie wp-no-track posé → tracking off, bandeau disparaît

## Étape 9 — Repasser en phase test

Une fois la QA validée, remettre `consentRequired = false` pour rester en mode
test interne sans gate RGPD.

## Notes

- La latence Meta CAPI est en général **5-30 secondes** entre l'envoi et
  l'apparition dans Test Events. Sois patient.
- Les events vus dans Test Events ne polluent PAS la prod (audience, conversions
  optimization, etc.). C'est sandbox.
- Si Meta retourne `error.code = 190` → token expiré, régénérer.
- Si Meta retourne `error.code = 100` → payload invalide, vérifier les hash PII
  (logs côté serveur dans CapiEvent.metaResponse).
