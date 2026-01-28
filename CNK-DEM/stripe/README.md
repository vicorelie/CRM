# 💳 Intégration Stripe pour CNK-DEM

## ✅ Installation terminée

Tous les fichiers Stripe ont été réorganisés dans ce dossier pour une meilleure organisation.

---

## 📂 Contenu de ce dossier

```
stripe/
├── config.php                    # Configuration Stripe (COMMENCER ICI)
├── StripeHelper.php              # Classe helper principale
├── webhook.php                   # Récepteur webhook Stripe
├── webhook_standalone.php        # Webhook autonome (traitement complet)
├── logs/                         # Logs Stripe
│   └── stripe.log
├── templates/                    # Templates email
├── verify_installation.php       # Script de vérification
├── README.md                     # Ce fichier
├── STRUCTURE.md                  # Documentation structure
└── REORGANISATION.md             # Détails de la réorganisation

Fichiers liés (hors dossier stripe/):
├── modules/Quotes/actions/ManageStripePayments.php    # Actions AJAX paiements
└── layouts/v7/modules/Quotes/resources/StripePaymentLinks.js  # Interface JS
```

---

## 🚀 Démarrage rapide

### 1. Vérifier l'installation

```bash
php /var/www/CNK-DEM/stripe/verify_installation.php
```

Vous devriez voir :
- ✅ 15 succès
- ⚠️ 3 avertissements (clés à configurer)

### 2. Configurer les clés Stripe

Éditez `config.php` et remplacez :

```php
'api_keys' => [
    'test' => [
        'secret_key' => 'sk_test_VOTRE_CLE_ICI',           // ← Votre clé
        'publishable_key' => 'pk_test_VOTRE_CLE_ICI',     // ← Votre clé
    ],
],
```

**Où trouver vos clés ?**
1. Connectez-vous à Stripe : https://dashboard.stripe.com/
2. Allez dans **Développeurs** → **Clés API**
3. Copiez vos clés de test

### 3. Configurer le webhook

Dans Stripe Dashboard :
1. Allez dans **Développeurs** → **Webhooks**
2. Cliquez sur **+ Ajouter un point de terminaison**
3. URL : `https://crm.cnkdem.com/stripe/webhook.php`
4. Événements à écouter :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copiez le **Secret de signature** (commence par `whsec_...`)
6. Ajoutez-le dans `config.php` :

```php
'webhook' => [
    'secret' => 'whsec_VOTRE_SECRET_ICI',    // ← Votre secret
],
```

### 4. Tester

1. Ouvrez un devis dans VTiger
2. Cliquez sur **Générer liens Stripe**
3. Vérifiez que les liens sont créés
4. Testez un paiement avec la carte : `4242 4242 4242 4242`

---

## 📊 Suivi et logs

### Voir les logs en temps réel

```bash
tail -f /var/www/CNK-DEM/stripe/logs/stripe.log
```

### Vérifier les événements Stripe

https://dashboard.stripe.com/events

---

## 📖 Documentation complète

- **Guide d'intégration** : [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Structure détaillée** : [STRUCTURE.md](./STRUCTURE.md)
- **Détails réorganisation** : [REORGANISATION.md](./REORGANISATION.md)

---

## 🔧 Comment ça marche ?

### 1. Interface de gestion

Depuis la vue détail d'un devis, cliquez sur **"Gérer paiements Stripe"** :

1. Modal avec résumé des montants (acompte, solde, payé, reste)
2. Historique complet des paiements avec statuts
3. Création de nouveaux paiements (Stripe ou manuels)
4. Actions : PDF facture, copier lien, email, modifier statut, supprimer

### 2. Génération de liens

Quand vous créez un paiement Stripe :

1. `ManageStripePayments.php` reçoit la demande
2. Qui utilise `StripeHelper::createPaymentLinkWithDetails()`
3. Qui crée un lien de paiement Stripe avec métadonnées
4. Le paiement est enregistré dans `vtiger_stripe_payments`

### 3. Paiement client

Quand le client paie :

1. Stripe traite le paiement
2. Stripe envoie une notification à `webhook_standalone.php`
3. Le webhook met à jour le statut du paiement
4. Une facture est automatiquement générée
5. Les statuts acompte/solde du devis sont mis à jour

### 4. Génération de factures

À chaque paiement validé :

1. Une facture VTiger est créée automatiquement
2. Les produits du devis sont copiés vers la facture
3. L'ID facture est lié au paiement
4. Bouton PDF pour ouvrir avec template "FACTURE (CNK DEM)"

### 5. Centralisation

Toute la logique Stripe est dans `StripeHelper.php` :
- Plus facile à maintenir
- Pas de duplication de code
- Réutilisable partout

---

## ✨ Fonctionnalités

### Gestion des paiements
✅ Génération automatique de liens de paiement Stripe
✅ Gestion des Acomptes et Soldes séparément
✅ Mise à jour automatique des statuts après paiement
✅ Support des paiements manuels (virement, espèces, chèque)
✅ Modification des statuts de paiement
✅ Suppression des paiements en attente

### Facturation automatique
✅ Génération automatique de factures à chaque paiement
✅ Bouton PDF pour ouvrir la facture (template "FACTURE (CNK DEM)")
✅ Copie des produits du devis vers la facture
✅ Mise à jour des statuts acompte/solde

### Interface utilisateur
✅ Modal "Gérer paiements Stripe" dans les devis
✅ Tableau récapitulatif des montants (acompte, solde, payé, reste)
✅ Historique complet des paiements avec statuts
✅ Envoi d'emails de paiement personnalisés
✅ Copie des liens de paiement en un clic

### Technique
✅ Création de notes de paiement dans VTiger
✅ Logs complets pour le débogage
✅ Support test et production
✅ Configuration centralisée
✅ Webhook sécurisé avec vérification de signature

---

## 🔒 Sécurité

- ✅ Vérification des signatures webhook
- ✅ Validation des montants
- ✅ Logs sans informations sensibles
- ✅ Configuration séparée test/production
- ✅ Clés API hors de portée du web (dans config.php)

---

## 🆘 Problèmes courants

### Le bouton "Générer liens Stripe" n'apparaît pas

1. Vider le cache du navigateur (Ctrl+F5)
2. Vérifier que le fichier JS existe :
   ```bash
   ls -la /var/www/CNK-DEM/layouts/v7/modules/Quotes/resources/StripePaymentLinks.js
   ```

### Erreur "Invalid API key"

1. Vérifier les clés dans `config.php`
2. Vérifier qu'il n'y a pas d'espaces avant/après
3. Vérifier que vous utilisez les bonnes clés (test vs live)

### Le webhook ne fonctionne pas

1. Vérifier les logs : `tail -f stripe/logs/stripe.log`
2. Tester l'URL : `curl https://crm.cnkdem.com/stripe/webhook.php`
3. Vérifier le secret webhook dans `config.php`
4. Envoyer un événement test depuis Stripe Dashboard

---

## 🎯 Prochaines étapes

### Après les tests

Quand tout fonctionne en mode test :

1. Activer votre compte Stripe (fournir infos bancaires)
2. Récupérer les clés LIVE
3. Configurer le webhook LIVE
4. Modifier `config.php` :
   ```php
   'mode' => 'live',  // ← Passer en production
   ```

### Extensions possibles

- Ajouter les liens automatiquement dans les emails
- Créer des rapports de paiements
- Gérer les remboursements
- Étendre aux factures

---

## 💬 Support

**En cas de problème :**

1. Vérifier les logs : `tail -f stripe/logs/stripe.log`
2. Lancer la vérification : `php stripe/verify_installation.php`
3. Consulter les événements Stripe : https://dashboard.stripe.com/events
4. Consulter la documentation : [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

---

## 📅 Historique

- **Janvier 2026** : Ajout bouton PDF facture dans modal paiements
- **Janvier 2026** : Génération automatique de factures à chaque paiement
- **Janvier 2026** : Support des paiements manuels (virement, espèces, chèque)
- **Janvier 2026** : Modal de gestion des paiements multiples
- **Janvier 2026** : Envoi d'emails de paiement personnalisés
- **Décembre 2024** : Réorganisation complète dans dossier `stripe/`
- **Décembre 2024** : Installation initiale de l'intégration Stripe

---

**🎉 Votre intégration Stripe est prête ! Il ne reste plus qu'à configurer vos clés API.**
