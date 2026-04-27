# Structure de l'intégration Stripe - CNK-DEM

## 📁 Organisation des fichiers

Tous les fichiers Stripe sont maintenant centralisés dans le dossier `/var/www/CNK-DEM/stripe/`

```
/var/www/CNK-DEM/
├── stripe/                                    # Dossier principal Stripe
│   ├── config.php                            # Configuration centralisée
│   ├── StripeHelper.php                      # Classe helper principale
│   ├── webhook.php                           # Récepteur webhook
│   ├── logs/                                 # Logs Stripe
│   │   └── stripe.log                        # Fichier de log
│   └── STRUCTURE.md                          # Ce fichier
│
├── stripe_webhook.php                        # Redirection (compatibilité)
│
├── modules/Quotes/
│   └── actions/
│       └── GenerateStripePaymentLinks.php   # Action VTiger (refactorisée)
│
└── layouts/v7/modules/Quotes/resources/
    └── StripePaymentLinks.js                # JavaScript UI
```

## 🔧 Fichiers principaux

### 1. `/stripe/config.php`
Configuration centralisée de Stripe avec :
- Clés API (test et live)
- Configuration webhook
- Mapping des champs VTiger
- Options de paiement
- Configuration des logs

### 2. `/stripe/StripeHelper.php`
Classe helper qui centralise toutes les opérations Stripe :

```php
StripeHelper::init()                          // Initialiser Stripe SDK
StripeHelper::createPaymentLink()             // Créer un lien de paiement
StripeHelper::updateQuoteField()              // Mettre à jour un champ du devis
StripeHelper::updatePaymentStatus()           // Mettre à jour le statut de paiement
StripeHelper::createPaymentNote()             // Créer une note de paiement
StripeHelper::log()                           // Logger un message
StripeHelper::getConfig()                     // Récupérer la configuration
```

### 3. `/stripe/webhook.php`
Récepteur webhook qui :
- Vérifie la signature Stripe
- Traite les événements de paiement
- Met à jour VTiger via StripeHelper

### 4. `/modules/Quotes/actions/GenerateStripePaymentLinks.php`
Action VTiger refactorisée qui utilise StripeHelper pour générer les liens de paiement.

### 5. `/layouts/v7/modules/Quotes/resources/StripePaymentLinks.js`
Interface JavaScript pour le bouton "Générer liens Stripe" dans VTiger.

## 🔄 Migration depuis l'ancienne structure

### Fichiers obsolètes (peuvent être supprimés après tests)

- `/var/www/CNK-DEM/config.stripe.php` → Remplacé par `/stripe/config.php`

**Note**: L'ancien `/stripe_webhook.php` est maintenu comme fichier de redirection pour compatibilité.

### Différences clés

**Avant** :
- Configuration : `config.stripe.php`
- Webhook : `stripe_webhook.php`
- Logique dupliquée dans GenerateStripePaymentLinks.php et webhook

**Après** :
- Configuration : `stripe/config.php`
- Webhook : `stripe/webhook.php`
- Logique centralisée dans `stripe/StripeHelper.php`

## 📝 Configuration

### Étape 1 : Mettre à jour les clés API

Éditez `/var/www/CNK-DEM/stripe/config.php` :

```php
'api_keys' => [
    'test' => [
        'secret_key' => 'sk_test_VOTRE_CLE',
        'publishable_key' => 'pk_test_VOTRE_CLE',
    ],
],
```

### Étape 2 : Configurer le webhook Stripe

Dans le dashboard Stripe, créez un webhook avec l'URL :
```
https://crm.cnkdem.com/stripe/webhook.php
```

Ou utilisez l'ancienne URL (compatibilité) :
```
https://crm.cnkdem.com/stripe_webhook.php
```

Copiez le secret du webhook dans `config.php` :

```php
'webhook' => [
    'secret' => 'whsec_VOTRE_SECRET',
],
```

### Étape 3 : Vérifier les logs

Les logs sont maintenant dans :
```
/var/www/CNK-DEM/stripe/logs/stripe.log
```

Pour voir les logs en temps réel :
```bash
tail -f /var/www/CNK-DEM/stripe/logs/stripe.log
```

## 🧪 Tests

### Test 1 : Génération de liens

1. Ouvrir un devis dans VTiger
2. Cliquer sur "Générer liens Stripe"
3. Vérifier les logs : `tail -f /var/www/CNK-DEM/stripe/logs/stripe.log`
4. Vérifier que les liens sont créés dans les champs cf_1079 et cf_1081

### Test 2 : Webhook

```bash
# Tester que le webhook est accessible
curl https://crm.cnkdem.com/stripe/webhook.php

# Tester l'ancienne URL (redirection)
curl https://crm.cnkdem.com/stripe_webhook.php
```

Les deux doivent fonctionner.

### Test 3 : Paiement complet

1. Générer un lien de paiement
2. Ouvrir le lien dans un nouvel onglet
3. Payer avec une carte de test : `4242 4242 4242 4242`
4. Vérifier les logs webhook
5. Vérifier que le statut dans VTiger passe à "Payé"
6. Vérifier qu'une note est créée

## 🎯 Avantages de la nouvelle structure

✅ **Centralisation** : Toute la logique Stripe dans un seul dossier
✅ **Réutilisabilité** : StripeHelper peut être utilisé partout dans VTiger
✅ **Maintenabilité** : Un seul endroit pour modifier la logique Stripe
✅ **Logs centralisés** : Tous les logs Stripe au même endroit
✅ **Configuration claire** : Un seul fichier de configuration bien structuré
✅ **Compatibilité** : L'ancienne URL webhook continue de fonctionner

## 🔒 Sécurité

- Les clés API sont stockées dans `config.php` (hors du webroot de préférence)
- Les signatures webhook sont vérifiées systématiquement
- Les logs ne contiennent pas d'informations sensibles
- Tous les montants sont validés avant envoi à Stripe

## 📚 Ressources

- Guide d'intégration : [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- Documentation Stripe : https://stripe.com/docs
- Stripe PHP SDK : https://github.com/stripe/stripe-php
