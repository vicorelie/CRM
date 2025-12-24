# Guide d'intégration Stripe Payment Links - CNK-DEM

## 📋 Table des matières
1. [Configuration Stripe](#configuration-stripe)
2. [Configuration VTiger](#configuration-vtiger)
3. [Utilisation](#utilisation)
4. [Webhook Stripe](#webhook-stripe)
5. [Tests](#tests)
6. [Passage en production](#passage-en-production)
7. [Dépannage](#dépannage)

---

## 1. Configuration Stripe

### Étape 1.1 : Récupérer les clés API

1. Connectez-vous à votre compte Stripe : https://dashboard.stripe.com/
2. En mode TEST, allez dans **Développeurs** → **Clés API**
3. Copiez :
   - **Clé publique** (commence par `pk_test_...`)
   - **Clé secrète** (commence par `sk_test_...`)

### Étape 1.2 : Configurer VTiger

1. Ouvrez le fichier `/var/www/CNK-DEM/stripe/config.php`
2. Remplacez les valeurs suivantes :

```php
'api_keys' => [
    'test' => [
        'secret_key' => 'sk_test_VOTRE_CLE_ICI',        // ← Votre clé secrète
        'publishable_key' => 'pk_test_VOTRE_CLE_ICI',  // ← Votre clé publique
    ],
],
```

### Étape 1.3 : Configurer le webhook

1. Dans Stripe, allez dans **Développeurs** → **Webhooks**
2. Cliquez sur **+ Ajouter un point de terminaison**
3. URL du point de terminaison : `https://crm.cnkdem.com/stripe/webhook.php`
4. Sélectionnez les événements à écouter :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Cliquez sur **Ajouter un point de terminaison**
6. Copiez le **Secret de signature du webhook** (commence par `whsec_...`)
7. Collez-le dans `stripe/config.php` :

```php
'webhook' => [
    'secret' => 'whsec_VOTRE_SECRET_ICI',
],
```

---

## 2. Configuration VTiger

### Champs custom créés

Les champs suivants ont été ajoutés au module Devis :

| Champ | ID | Type | Description |
|-------|-----|------|-------------|
| Lien paiement Acompte | cf_1079 | Text | URL du lien Stripe pour l'acompte |
| Lien paiement Solde | cf_1081 | Text | URL du lien Stripe pour le solde |
| Statut paiement Acompte | cf_1083 | Picklist | Statut : En attente / Payé / Échoué |
| Statut paiement Solde | cf_1085 | Picklist | Statut : En attente / Payé / Échoué |

### Fichiers installés

```
/var/www/CNK-DEM/
├── stripe/                                              # Dossier Stripe (NOUVEAU)
│   ├── config.php                                      # Configuration centralisée
│   ├── StripeHelper.php                                # Classe helper principale
│   ├── webhook.php                                     # Récepteur webhook
│   ├── logs/stripe.log                                 # Fichier de logs
│   └── STRUCTURE.md                                    # Documentation structure
├── stripe_webhook.php                                   # Redirection (compatibilité)
├── libraries/stripe/                                    # SDK Stripe PHP
├── modules/Quotes/
│   ├── actions/GenerateStripePaymentLinks.php          # Action génération liens
│   └── views/Detail.php                                # Vue avec bouton Stripe
└── layouts/v7/modules/Quotes/resources/
    └── StripePaymentLinks.js                           # JavaScript du bouton
```

**Note**: Tous les fichiers Stripe sont maintenant organisés dans le dossier `stripe/`. Voir `stripe/STRUCTURE.md` pour plus de détails.

---

## 3. Utilisation

### Générer des liens de paiement

1. Ouvrez un devis dans VTiger
2. Assurez-vous que les champs **Total Acompte TTC** et **Total Solde TTC** sont remplis
3. Cliquez sur le bouton **Générer liens Stripe** (bouton vert avec icône carte de crédit)
4. Les liens sont générés et affichés dans une popup
5. Les champs `cf_1079` et `cf_1081` sont automatiquement remplis avec les URLs
6. Les statuts sont mis à "En attente"

### Envoyer les liens au client

**Option 1 : Email manuel**
- Copiez les liens depuis les champs custom
- Envoyez-les par email au client

**Option 2 : Modification du template email (à venir)**
- Les liens peuvent être ajoutés automatiquement dans les emails de devis

### Suivi des paiements

Quand un client paie :
1. Le webhook Stripe notifie VTiger
2. Le statut passe automatiquement à "Payé"
3. Un commentaire est ajouté au devis avec les détails du paiement

---

## 4. Webhook Stripe

### Vérification

Vérifiez que le webhook est accessible :

```bash
# Nouvelle URL (recommandée)
curl https://crm.cnkdem.com/stripe/webhook.php

# Ancienne URL (redirection, toujours fonctionnelle)
curl https://crm.cnkdem.com/stripe_webhook.php
```

### Logs

Les logs Stripe sont enregistrés dans :
```
/var/www/CNK-DEM/stripe/logs/stripe.log
```

Pour voir les logs en temps réel :
```bash
tail -f /var/www/CNK-DEM/stripe/logs/stripe.log
```

### Test du webhook

Dans Stripe :
1. Allez dans **Développeurs** → **Webhooks**
2. Cliquez sur votre webhook
3. Onglet **Envoyer un événement test**
4. Sélectionnez `checkout.session.completed`
5. Vérifiez les logs

---

## 5. Tests

### Test complet

1. **Créer un devis test**
   - Montant Acompte : 10,00 €
   - Montant Solde : 5,00 €

2. **Générer les liens Stripe**
   - Cliquer sur "Générer liens Stripe"
   - Vérifier que les liens apparaissent

3. **Tester le paiement Acompte**
   - Ouvrir le lien Acompte dans un nouvel onglet
   - Utiliser une carte de test Stripe :
     - Numéro : `4242 4242 4242 4242`
     - Date : n'importe quelle date future
     - CVC : n'importe quel 3 chiffres
   - Compléter le paiement

4. **Vérifier la mise à jour**
   - Retourner sur le devis dans VTiger
   - Vérifier que le statut Acompte est passé à "Payé"
   - Vérifier qu'un commentaire a été ajouté

### Cartes de test Stripe

| Type | Numéro | Résultat |
|------|--------|----------|
| Succès | 4242 4242 4242 4242 | Paiement réussi |
| Échec | 4000 0000 0000 0002 | Carte déclinée |
| 3D Secure | 4000 0027 6000 3184 | Requiert authentification |

---

## 6. Passage en production

### Avant de passer en prod

✅ Tester tous les scénarios en mode test
✅ Vérifier que les webhooks fonctionnent
✅ Vérifier les montants et calculs
✅ Tester l'envoi d'emails avec liens

### Activation production

1. Dans Stripe, activez votre compte (fournir infos bancaires)
2. Récupérez les clés API LIVE :
   - `sk_live_...`
   - `pk_live_...`
3. Créez un nouveau webhook pour la production
4. Mettez à jour `stripe/config.php` :

```php
'mode' => 'live',  // ← Changez de 'test' à 'live'

'api_keys' => [
    'live' => [
        'secret_key' => 'sk_live_VOTRE_CLE',
        'publishable_key' => 'pk_live_VOTRE_CLE',
    ],
],

'webhook' => [
    'secret' => 'whsec_VOTRE_SECRET_LIVE',
],
```

---

## 7. Dépannage

### Problème : Le bouton "Générer liens Stripe" n'apparaît pas

**Solutions :**
1. Vider le cache du navigateur
2. Vérifier que le fichier JS est chargé :
   ```bash
   ls -la /var/www/CNK-DEM/layouts/v7/modules/Quotes/resources/StripePaymentLinks.js
   ```
3. Vérifier la console JavaScript du navigateur (F12)

### Problème : Erreur "Invalid API key"

**Solutions :**
1. Vérifier que les clés dans `stripe/config.php` sont correctes
2. Vérifier que vous utilisez les bonnes clés (test vs live)
3. Vérifier qu'il n'y a pas d'espaces avant/après les clés

### Problème : Le webhook ne se déclenche pas

**Solutions :**
1. Vérifier que l'URL est accessible publiquement
2. Vérifier les logs : `tail -f /var/www/CNK-DEM/stripe/logs/stripe.log`
3. Tester le webhook depuis le dashboard Stripe
4. Vérifier que le `webhook.secret` est correct dans `stripe/config.php`

### Problème : Les montants sont incorrects

**Solutions :**
1. Vérifier que `cf_1055` et `cf_1057` contiennent les bons montants
2. Vérifier le calcul dans Edit.js
3. Les montants doivent être en euros (pas en centimes)

---

## 📞 Support

En cas de problème :
1. Vérifier les logs : `/var/www/CNK-DEM/stripe/logs/stripe.log`
2. Consulter la structure : `/var/www/CNK-DEM/stripe/STRUCTURE.md`
3. Vérifier les events Stripe : https://dashboard.stripe.com/events
4. Consulter la documentation Stripe : https://stripe.com/docs

---

## 🎉 Félicitations !

Votre intégration Stripe Payment Links est maintenant opérationnelle.

**Prochaines étapes possibles :**
- Ajouter les liens automatiquement dans les emails
- Créer des rapports de paiements
- Gérer les remboursements
- Intégrer Stripe aux factures (en plus des devis)
