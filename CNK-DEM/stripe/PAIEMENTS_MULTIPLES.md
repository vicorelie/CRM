# Système de paiements multiples Stripe

## Vue d'ensemble

Le nouveau système de paiements Stripe permet de gérer des paiements fractionnés pour un devis. Au lieu de générer uniquement deux liens (acompte et solde), vous pouvez maintenant créer autant de paiements que nécessaire.

## Cas d'usage

Ce système permet de gérer des scénarios de paiement complexes comme :
1. Un petit montant pour bloquer l'affaire
2. Un deuxième paiement pour compléter l'acompte
3. Un troisième paiement pour une avance du solde
4. Le solde final (peut être en espèce le jour du déménagement)

## Fonctionnalités

### 1. Bouton "Gérer paiements Stripe"
- Disponible dans la vue détails d'un devis
- Ouvre un popup avec toutes les informations de paiement

### 2. Résumé des montants
Le popup affiche :
- **Total Acompte** : Montant de l'acompte défini dans le devis
- **Total Solde** : Montant du solde défini dans le devis
- **Total Général** : Somme totale (Acompte + Solde)
- **Déjà payé** : Montant total des paiements confirmés
- **En attente** : Montant total des paiements en attente (liens générés mais non payés)
- **Reste à payer** : Montant restant à payer

### 3. Historique des paiements
Affiche tous les paiements créés avec :
- Date de création
- Description du paiement
- Montant
- Statut (En attente / Payé / Échoué / Annulé)
- Lien Stripe cliquable

### 4. Création d'un nouveau paiement
Si il reste un montant à payer :
- Champ **Montant** : Pré-rempli avec le reste à payer (modifiable)
- Champ **Description** : Pour décrire le paiement (ex: "Acompte partiel", "Avance solde")
- Bouton **Générer lien Stripe** : Crée un lien de paiement Stripe
- Bouton **Générer facture** : Crée une facture pour ce montant (à implémenter)

### 5. Actualisation automatique
Après chaque création de lien, le popup se rafraîchit automatiquement pour afficher :
- Le nouveau paiement dans l'historique
- Les montants mis à jour
- Le nouveau reste à payer

## Structure technique

### Table de base de données
**vtiger_stripe_payments**
- `id` : Identifiant unique du paiement
- `quote_id` : ID du devis associé
- `payment_type` : Type (acompte / solde / custom)
- `amount` : Montant du paiement
- `description` : Description du paiement
- `stripe_link` : URL du lien de paiement Stripe
- `stripe_payment_link_id` : ID du payment link chez Stripe
- `status` : Statut (pending / paid / failed / cancelled)
- `invoice_id` : ID de la facture générée (si applicable)
- `created_date` : Date de création
- `paid_date` : Date de paiement (quand status = paid)
- `created_by` : ID de l'utilisateur qui a créé le paiement
- `metadata` : Données additionnelles (JSON)

### Fichiers modifiés

#### 1. JavaScript
**layouts/v7/modules/Quotes/resources/StripePaymentLinks.js**
- Nouvelle interface avec popup modal
- Affichage des montants et historique
- Gestion des événements (création de lien, génération de facture)

#### 2. PHP
**modules/Quotes/actions/ManageStripePayments.php**
- Action principale avec 3 modes :
  - `getPaymentInfo` : Récupère les informations et calcule les montants
  - `createPaymentLink` : Crée un nouveau lien de paiement
  - `generateInvoice` : Génère une facture (à implémenter)

### Anciens fichiers (conservés pour compatibilité)
- `modules/Quotes/actions/GenerateStripePaymentLinks.php` : Ancienne version (2 liens fixes)
- Peut être supprimé si vous ne l'utilisez plus

## Utilisation

1. Ouvrir un devis en vue détails
2. Cliquer sur le bouton **"Gérer paiements Stripe"**
3. Vérifier les montants affichés
4. Si nécessaire, modifier le montant pré-rempli
5. Ajouter une description (recommandé)
6. Cliquer sur **"Générer lien Stripe"**
7. Le lien est créé et affiché dans l'historique
8. Copier le lien pour l'envoyer au client

## Workflow typique

### Exemple : Déménagement avec paiements fractionnés

**Devis :**
- Acompte : 1000 €
- Solde : 2000 €
- **Total : 3000 €**

**Paiements :**

1. **Premier paiement** : 300 € - "Réservation"
   - Description : "Réservation de la date"
   - Génère lien Stripe → Client paie
   - **Reste à payer : 2700 €**

2. **Deuxième paiement** : 700 € - "Complément acompte"
   - Description : "Complément pour atteindre l'acompte de 1000 €"
   - Génère lien Stripe → Client paie
   - **Reste à payer : 2000 €**

3. **Troisième paiement** : 1500 € - "Avance sur solde"
   - Description : "Avance avant le déménagement"
   - Génère lien Stripe → Client paie
   - **Reste à payer : 500 €**

4. **Paiement final** : 500 € - "Solde"
   - Peut être payé en espèce le jour du déménagement
   - Pas de lien Stripe nécessaire

## Statuts des paiements

- **pending** (En attente) : Le lien est créé mais pas encore payé
- **paid** (Payé) : Le paiement a été confirmé par Stripe webhook
- **failed** (Échoué) : Le paiement a échoué
- **cancelled** (Annulé) : Le lien a été annulé manuellement

## Notes importantes

1. **Le montant pré-rempli** est toujours le reste à payer, mais vous pouvez le modifier
2. **Les paiements en attente** ne sont pas comptés dans "Déjà payé" mais apparaissent séparément
3. **L'historique** montre tous les paiements, même annulés, pour la traçabilité
4. **La génération de facture** est prévue mais pas encore implémentée

## Prochaines étapes

- [ ] Implémenter la génération automatique de factures
- [ ] Ajouter la possibilité d'annuler un lien de paiement
- [ ] Envoyer des notifications email automatiques avec les liens
- [ ] Synchroniser les statuts avec les webhooks Stripe
