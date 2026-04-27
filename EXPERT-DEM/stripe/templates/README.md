# Template PDF pour les Factures de Paiement Stripe

## Description

Ce template est utilisé pour générer automatiquement des factures PDF lorsqu'un paiement Stripe est marqué comme "payé".

## Installation du template dans VTiger

### Via PDFMaker (si installé)

1. Connectez-vous à VTiger en tant qu'administrateur
2. Allez dans **Settings** > **PDF Maker** (ou **Inventory** > **PDF Templates**)
3. Cliquez sur **Create New Template**
4. Sélectionnez le module **Invoice**
5. Copiez le contenu du fichier `invoice_payment_template.html`
6. Collez-le dans l'éditeur de template
7. Donnez un nom au template (ex: "Facture Paiement Stripe")
8. Sauvegardez

### Configuration manuelle dans la base de données

Si vous n'avez pas accès à l'interface PDFMaker, vous pouvez importer le template directement :

```sql
-- À adapter selon votre configuration
INSERT INTO vtiger_pdfmaker (name, module, body, header, footer)
VALUES ('Facture Paiement Stripe', 'Invoice', '[CONTENU DU TEMPLATE]', '', '');
```

## Variables disponibles dans le template

### Informations facture
- `$INVOICE_INVOICE_NO$` - Numéro de facture
- `$INVOICE_INVOICEDATE$` - Date de la facture
- `$INVOICE_DUEDATE$` - Date d'échéance
- `$INVOICE_RECEIVED$` - Montant déjà payé
- `$INVOICE_BALANCE$` - Solde à payer

### Informations commercial
- `$R_USERS_LAST_NAME$` - Nom de famille du commercial
- `$R_USERS_FIRST_NAME$` - Prénom du commercial
- `$R_USERS_PHONE_MOBILE$` - Téléphone mobile
- `$R_USERS_EMAIL1$` - Email du commercial

### Informations client
- `$R_CONTACTID_CONTACT_NO$` - Numéro client
- `$R_CONTACTID_FIRSTNAME$` - Prénom du contact
- `$R_CONTACTID_LASTNAME$` - Nom de famille du contact
- `$R_CONTACTID_MOBILE$` - Téléphone mobile
- `$R_CONTACTID_EMAIL$` - Email du contact

### Informations déménagement (opportunité)
- Champs personnalisés du module Potential (cf_XXXX)
- Ex: `$R_POTENTIAL_ID_CF_1043$` pour les dates
- Ex: `$R_POTENTIAL_ID_CF_955$` pour les adresses

### Bloc produits
```html
#PRODUCTBLOC_START#
<!-- Le contenu ici sera répété pour chaque produit -->
$PRODUCTTITLE$ - Titre du produit
$PRODUCTEDITDESCRIPTION$ - Description
$PRODUCTLISTPRICE$ - Prix unitaire
$PRODUCTQUANTITY$ - Quantité
$PRODUCTSTOTALAFTERDISCOUNT$ - Total
#PRODUCTBLOC_END#
```

### Totaux
- `$TOTALWITHOUTVAT$` - Sous-total HT
- `$TOTALDISCOUNT$` - Remise globale
- `$TOTALAFTERDISCOUNT$` - Total après remise HT
- `$VATPERCENT$` - Pourcentage TVA
- `$VAT$` - Montant TVA
- `$TOTAL$` - Total TTC
- `$CURRENCYSYMBOL$` - Symbole devise (EUR, USD, etc.)

## Fonctionnement automatique

Lorsqu'un paiement Stripe est reçu :

1. Le webhook Stripe (`/stripe/webhook_standalone.php`) est notifié
2. Le paiement est marqué comme "paid" dans `vtiger_stripe_payments`
3. Une facture est automatiquement créée dans VTiger
4. Les produits du devis sont copiés vers la facture
5. Le montant payé est enregistré dans la facture
6. L'ID de la facture est enregistré dans le paiement
7. Un commentaire est ajouté au devis avec les détails

## Génération PDF manuelle

Pour générer le PDF d'une facture :

1. Ouvrez la facture dans VTiger
2. Cliquez sur **Export to PDF**
3. Sélectionnez le template "Facture Paiement Stripe"
4. Le PDF sera généré avec toutes les informations

## Notes

- Le template utilise l'encodage UTF-8 pour les caractères accentués
- Les montants "Déjà payé" et "Solde à payer" sont mis en évidence
- Le template inclut les informations de chargement/livraison du déménagement
- Les produits sont affichés avec leur description détaillée

## Support

Pour toute question sur le template, consultez la documentation VTiger PDFMaker ou contactez votre administrateur système.
