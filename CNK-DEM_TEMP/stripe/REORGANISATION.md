# Réorganisation de l'intégration Stripe - CNK-DEM

## 📅 Date de réorganisation
Décembre 2024

## 🎯 Objectif
Centraliser tous les fichiers Stripe dans un dossier dédié pour une meilleure organisation et maintenabilité.

---

## 📋 Changements effectués

### 1. Nouvelle structure de dossiers

**Avant** :
```
/var/www/CNK-DEM/
├── config.stripe.php
├── stripe_webhook.php
├── libraries/stripe/
└── modules/Quotes/actions/GenerateStripePaymentLinks.php
```

**Après** :
```
/var/www/CNK-DEM/
├── stripe/                              ← NOUVEAU DOSSIER
│   ├── config.php                      ← Configuration centralisée
│   ├── StripeHelper.php                ← Classe helper
│   ├── webhook.php                     ← Webhook refactorisé
│   ├── logs/stripe.log                 ← Logs centralisés
│   ├── STRUCTURE.md                    ← Documentation
│   └── REORGANISATION.md               ← Ce fichier
├── stripe_webhook.php                   ← Redirection (compatibilité)
├── config.stripe.php                    ← OBSOLÈTE (marqué)
├── libraries/stripe/
└── modules/Quotes/actions/GenerateStripePaymentLinks.php  ← Refactorisé
```

### 2. Fichiers créés

#### `/stripe/config.php`
Configuration Stripe améliorée avec :
- Structure `api_keys` séparant test et live
- Section `webhook` dédiée
- Mapping des champs VTiger dans `vtiger_fields`
- Options de paiement
- Configuration des logs centralisée

#### `/stripe/StripeHelper.php`
Classe helper centralisée avec toutes les méthodes Stripe :
- `init()` - Initialisation du SDK Stripe
- `createPaymentLink()` - Création de liens de paiement
- `updateQuoteField()` - Mise à jour des champs devis
- `updatePaymentStatus()` - Mise à jour des statuts de paiement
- `createPaymentNote()` - Création de notes de paiement
- `log()` - Logging centralisé
- `getConfig()` - Récupération de configuration (avec dot notation)

#### `/stripe/webhook.php`
Webhook refactorisé qui utilise StripeHelper au lieu de dupliquer la logique.

#### `/stripe/STRUCTURE.md`
Documentation complète de la nouvelle structure.

### 3. Fichiers modifiés

#### `/modules/Quotes/actions/GenerateStripePaymentLinks.php`
**Avant** : 183 lignes avec logique Stripe dupliquée
**Après** : 107 lignes utilisant StripeHelper

**Changements** :
- Remplace la logique Stripe par des appels à StripeHelper
- Utilise `StripeHelper::createPaymentLink()`
- Utilise `StripeHelper::updateQuoteField()`
- Utilise `StripeHelper::log()`
- Utilise `StripeHelper::getConfig()` pour les champs

#### `/stripe_webhook.php`
Transformé en fichier de redirection pour compatibilité avec les webhooks déjà configurés.

#### `/config.stripe.php`
Marqué comme OBSOLÈTE avec avertissement pointant vers `stripe/config.php`.

#### `/STRIPE_INTEGRATION_GUIDE.md`
Mis à jour avec :
- Nouveaux chemins de fichiers
- Nouvelle URL webhook recommandée
- Nouvelle structure de configuration
- Nouveaux chemins de logs

### 4. Compatibilité maintenue

✅ **L'ancienne URL webhook continue de fonctionner** :
- `https://crm.cnkdem.com/stripe_webhook.php` → redirige vers `stripe/webhook.php`

✅ **Aucune modification requise dans Stripe** :
- Les webhooks existants continueront de fonctionner

✅ **Aucune interruption de service** :
- La transition est transparente

---

## 🔍 Avantages de la réorganisation

### 1. Centralisation
- Tous les fichiers Stripe dans un seul dossier
- Plus facile à trouver et à maintenir
- Meilleure séparation des préoccupations

### 2. Réutilisabilité
- `StripeHelper` peut être utilisé partout dans VTiger
- Pas de duplication de code
- Une seule source de vérité pour la logique Stripe

### 3. Maintenabilité
- Un seul endroit pour modifier la logique Stripe
- Configuration centralisée
- Code plus propre et plus court

### 4. Logs centralisés
- Tous les logs Stripe au même endroit : `stripe/logs/stripe.log`
- Plus facile à débuguer
- Meilleure traçabilité

### 5. Évolutivité
- Facile d'ajouter de nouvelles fonctionnalités Stripe
- Structure claire pour les futurs développements
- Documentation à jour

---

## ✅ Vérifications à effectuer

### Après la réorganisation

- [ ] Tester la génération de liens de paiement depuis un devis
- [ ] Vérifier que les liens sont bien sauvegardés dans les champs
- [ ] Tester un paiement complet avec une carte de test
- [ ] Vérifier que le webhook reçoit les événements
- [ ] Vérifier que le statut est mis à jour dans VTiger
- [ ] Vérifier qu'une note est créée après paiement
- [ ] Vérifier les logs : `tail -f /var/www/CNK-DEM/stripe/logs/stripe.log`

### Configuration Stripe à faire

- [ ] Ajouter les clés API test dans `stripe/config.php`
- [ ] Configurer le webhook dans Stripe dashboard
- [ ] Ajouter le secret webhook dans `stripe/config.php`
- [ ] Tester le webhook depuis Stripe (Send test event)

---

## 📝 Notes de migration

### Si vous aviez déjà configuré l'ancienne version

**Clés API** :
- Copiez vos clés de `/config.stripe.php` vers `/stripe/config.php`
- Format de configuration légèrement différent (voir STRUCTURE.md)

**Webhook** :
- L'ancienne URL continue de fonctionner (redirection automatique)
- Recommandé : Mettre à jour l'URL dans Stripe vers `stripe/webhook.php`

**Logs** :
- Anciens logs : `/var/www/CNK-DEM/logs/stripe_webhook.log`
- Nouveaux logs : `/var/www/CNK-DEM/stripe/logs/stripe.log`

---

## 🗑️ Fichiers pouvant être supprimés

**APRÈS avoir vérifié que tout fonctionne** :

- `/config.stripe.php` (marqué comme obsolète, peut être supprimé)
- `/logs/stripe_webhook.log` (ancien fichier de logs)

**À CONSERVER** :

- `/stripe_webhook.php` (redirection pour compatibilité)
- `/libraries/stripe/` (SDK Stripe toujours nécessaire)

---

## 🚀 Prochaines étapes

1. **Configuration initiale** :
   - Ajouter vos clés Stripe dans `stripe/config.php`
   - Configurer le webhook dans Stripe

2. **Tests** :
   - Tester la génération de liens
   - Tester un paiement complet
   - Vérifier les logs

3. **Production** :
   - Une fois les tests validés en mode test
   - Ajouter les clés LIVE dans `stripe/config.php`
   - Changer `'mode' => 'live'`

---

## 📚 Documentation

- **Structure complète** : [STRUCTURE.md](./STRUCTURE.md)
- **Guide d'intégration** : [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Documentation Stripe** : https://stripe.com/docs

---

## 💡 Besoin d'aide ?

Consultez les logs en temps réel :
```bash
tail -f /var/www/CNK-DEM/stripe/logs/stripe.log
```

Vérifiez les événements Stripe :
https://dashboard.stripe.com/events
