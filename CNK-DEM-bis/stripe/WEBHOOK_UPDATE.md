# MISE À JOUR URGENTE - URL Webhook Stripe

## Problème résolu

L'ancien webhook (`webhook.php`) ne pouvait pas s'exécuter à cause de dépendances VTiger manquantes.

## Solution

Un nouveau webhook **autonome** a été créé : `webhook_standalone.php`

Ce fichier fonctionne SANS dépendances VTiger problématiques.

## Action requise

Vous DEVEZ mettre à jour l'URL du webhook dans Stripe Dashboard:

### Étapes:

1. Allez sur https://dashboard.stripe.com/test/webhooks

2. Cliquez sur votre webhook existant

3. Cliquez sur **"..."** (menu) puis **"Update details"**

4. Changez l'URL de:
   ```
   https://crm.cnkdem.com/stripe/webhook.php
   ```
   
   vers:
   ```
   https://crm.cnkdem.com/stripe/webhook_standalone.php
   ```

5. Cliquez sur **"Update endpoint"**

## Test

Après la mise à jour, envoyez un événement test:
- Dans Stripe Dashboard → Webhooks → Votre webhook
- Cliquez sur "Send test event"
- Choisissez "checkout.session.completed"
- Vérifiez les logs: `tail -f /var/www/CNK-DEM/stripe/logs/stripe.log`

Vous devriez voir des lignes comme:
```
[...] [info] === Nouveau webhook recu ===
[...] [info] Event type: checkout.session.completed
[...] [info] Traitement checkout.session.completed
```

## Une fois testé

Refaites un paiement test et vérifiez que le statut passe à "Payé" !
