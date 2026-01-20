# Système de Calcul Automatique pour les Devis (Quotes)

## 📋 OBJECTIF DU SYSTÈME

Mettre à jour **automatiquement et instantanément** tous les champs calculés d'un devis (Quotes) lorsqu'on modifie un champ via l'édition inline (crayon) dans la vue Detail, **sans avoir à rafraîchir la page**.

### Champs mis à jour automatiquement :

**Champs personnalisés (custom fields) :**
- `cf_1137` - Total Forfait HT (= cf_1127 + cf_1129)
- `cf_1055` - Acompte TTC
- `cf_1057` - Solde TTC
- `cf_1143` - Assurance calculée (= ((cf_1139 / 1000) - 4) * cf_1141)

**Champs LineItems (section Products & Services) :**
- Total des Articles (subtotal = produits + forfait + assurance)
- Remise générale (discount_amount)
- Pre Tax Total (= subtotal - remise)
- Total taxe (TVA 20%)
- Total TTC (Grand Total)

### Champs déclencheurs (qui lancent le recalcul) :
- `cf_1127` - Forfait Tarif
- `cf_1129` - Forfait Supplément
- `cf_1133` - Forfait % Acompte (défaut: 43%)
- `cf_1135` - Forfait % Solde (défaut: 57%)
- `cf_1139` - Montant assurance
- `cf_1141` - Tarif assurance pour 1000€

---

## 🎨 POPUP GÉNÉRATION DE DEVIS (quote_popup.php)

### Fonctionnalités

Le popup accessible depuis la vue Detail d'une Affaire (Potentials) permet de créer et modifier des devis rapidement.

**Bouton d'accès** : "Générer un devis" (couleur #8e44ad - violet)

### Champs du popup :

| Section | Champ | Type | Description |
|---------|-------|------|-------------|
| **Général** | Sujet | Texte | Auto-rempli avec "Dev-{NomAffaire}" |
| | Date de validité | Date | cf_1005 - défaut: +7 jours |
| **Forfait** | Type de forfait | Select | cf_1125 - ECO, ECO PLUS, CONFORT, LUXE |
| | Type de déménagement | Select | cf_1269 - défaut: "Spécial" |
| | Forfait Tarif HT | Nombre | cf_1127 |
| | Forfait Tarif TTC | Nombre | Calculé (HT × 1.20) - sync bidirectionnelle |
| | Forfait Supplément | Nombre | cf_1129 |
| | Forfait + Supplément TTC | Lecture seule | (cf_1127 + cf_1129) × 1.20 |
| **Produits** | Recherche produits | Auto-complete | Ajoute des produits avec quantité et prix |
| | Total HT par ligne | Calculé | Quantité × Prix unitaire |
| **Assurance** | Montant assurance | Select | cf_1139 - de 4000€ à 26000€ |
| **Montant Total** | Montant Total HT | Lecture seule | Forfait + Supplément + Produits + Assurance |
| | Montant Total TTC | Lecture seule | Total HT × 1.20 |

### Formule Assurance dans le Total :
```
Assurance HT = ((Montant Assurance - 4000) / 1000) × 14
```

### Champs cachés avec valeurs par défaut :
- `cf_1133` = 43 (Pourcentage acompte forfait)
- `cf_1135` = 57 (Pourcentage solde forfait)
- `cf_1141` = 14 (Tarif assurance pour 1000€)

### Valeurs Type de forfait (cf_1125) :
- `ECO` (affiché: ECO)
- `ECO PLUS` (affiché: ECO PLUS)
- `CONFORT` (affiché: CONFORT)
- `LUXE` (affiché: LUXE)

⚠️ **IMPORTANT** : Le workflow "Description forfait" doit utiliser ces valeurs SANS le mot "FORFAIT"

---

## 📁 FICHIERS MODIFIÉS

### 1. `/var/www/CNK-DEM/quote_popup.php`

**Rôle** : Popup de création/édition rapide de devis depuis les Affaires.

**Fonctionnalités :**
- Affiche les devis existants sous forme de cartes cliquables
- Formulaire de création/modification de devis
- Calculs TTC en temps réel
- Recherche de produits avec auto-complétion
- Soumission vers VTiger Save action

---

### 2. `/var/www/CNK-DEM/get_quote_data.php`

**Rôle** : API pour récupérer les données d'un devis existant (chargement dans le popup).

**Retourne** : JSON avec données du devis + produits associés

---

### 3. `/var/www/CNK-DEM/modules/Quotes/actions/Save.php`

**Rôle** : Action de sauvegarde des devis avec calculs automatiques.

**Calculs effectués :**
- `cf_1137` = Total Forfait HT
- `cf_1055` = Acompte TTC
- `cf_1057` = Solde TTC
- Mise à jour des totaux VTiger (subtotal, pre_tax_total, total)

---

### 4. `/var/www/CNK-DEM/layouts/v7/modules/Potentials/DetailViewActions.tpl`

**Modification** : Bouton "Générer un devis" en couleur #8e44ad (violet)

---

### 5. `/var/www/CNK-DEM/layouts/v7/modules/Potentials/resources/Edit.js`

**Ajout** : Auto-complétion d'adresses via API Base Adresse Nationale (BAN)

**Groupes d'adresses configurés :**
| Groupe | Adresse | Code postal | Ville |
|--------|---------|-------------|-------|
| Départ | cf_955 | cf_935 | cf_933 |
| Arrivée | cf_957 | cf_951 | cf_949 |
| Adresse 1 | cf_1087 | cf_1089 | cf_1091 |
| Adresse 2 | cf_1093 | cf_1095 | cf_1097 |
| Adresse 3 | cf_1099 | cf_1101 | cf_1103 |
| Adresse 4 | cf_1105 | cf_1107 | cf_1109 |
| Adresse 5 | cf_1111 | cf_1113 | cf_1115 |

---

### 6. `/var/www/CNK-DEM/modules/Quotes/actions/RecalculateQuoteTotals.php`

**Rôle** : Action PHP qui recalcule tous les totaux du devis et les sauvegarde en DB.

**Points clés :**
- Lit les champs custom depuis `vtiger_quotescf` + `vtiger_quotes` (pour discount_amount)
- Calcule le subtotal des produits depuis `vtiger_inventoryproductrel`
- Applique les formules de calcul
- Retourne un JSON avec tous les champs calculés

---

### 7. `/var/www/CNK-DEM/layouts/v7/modules/Quotes/resources/Detail.js`

**Rôle** : Détecte les modifications inline et met à jour l'interface instantanément.

---

### 8. `/var/www/CNK-DEM/layouts/v7/modules/Inventory/LineItemsDetail.tpl`

**Rôle** : Template Smarty pour afficher la section Products & Services en mode Detail.

**Modifications** : Ajout d'IDs sur les éléments pour mise à jour dynamique.

---

## 🔄 FLUX D'EXÉCUTION - POPUP DEVIS

```
1. Utilisateur clique "Générer un devis" dans vue Detail Affaire
   ↓
2. Popup s'ouvre avec les devis existants (cartes)
   ↓
3. Clic sur un devis → get_quote_data.php charge les données
   ↓
4. Modification des champs (forfait, produits, assurance)
   ↓
5. Calculs TTC en temps réel (JavaScript)
   ↓
6. Clic "Créer" ou "Sauvegarder"
   ↓
7. Formulaire soumis vers VTiger Save action
   ↓
8. Save.php calcule et sauvegarde les totaux
   ↓
9. Workflows VTiger s'exécutent (ex: Description forfait)
   ↓
10. Redirection vers vue Detail du devis
```

---

## 📊 STRUCTURE DES DONNÉES

### Champs personnalisés Quotes (vtiger_quotescf)

| Champ | Label | Type | Description |
|-------|-------|------|-------------|
| cf_1005 | Validité | Date | Date de validité du devis |
| cf_1125 | Type de forfait | Picklist | ECO, ECO PLUS, CONFORT, LUXE |
| cf_1269 | Type de déménagement | Picklist | Groupage, Spécial |
| cf_1127 | Forfait Tarif | Number | Montant HT du forfait |
| cf_1129 | Forfait Supplément | Number | Supplément HT |
| cf_1133 | % Acompte forfait | Number | Pourcentage (défaut 43%) |
| cf_1135 | % Solde forfait | Number | Pourcentage (défaut 57%) |
| cf_1137 | Total Forfait HT | Number | Calculé: cf_1127 + cf_1129 |
| cf_1139 | Montant assurance | Number | Valeur assurée |
| cf_1141 | Tarif pour 1000€ | Number | Taux assurance (défaut 14) |
| cf_1143 | Assurance calculée | Number | Prime d'assurance |
| cf_1055 | Acompte TTC | Number | Montant de l'acompte |
| cf_1057 | Solde TTC | Number | Montant du solde |

---

## ✅ ÉTAT ACTUEL DU SYSTÈME

### Ce qui fonctionne :
- ✅ Popup de génération de devis depuis les Affaires
- ✅ Bouton violet "Générer un devis"
- ✅ Chargement des devis existants dans le popup
- ✅ Calculs TTC temps réel dans le popup
- ✅ Sauvegarde des pourcentages par défaut (43%/57%)
- ✅ Date de validité (cf_1005)
- ✅ Type de déménagement par défaut "Spécial"
- ✅ Auto-complétion des adresses dans Potentials
- ✅ Détection des modifications inline (AJAX)
- ✅ Calculs automatiques dans Save.php
- ✅ Mise à jour des champs custom

---

## 🔧 WORKFLOWS VTIGER

### Workflow "Description forfait"

**Condition** : Doit utiliser les valeurs SANS "FORFAIT" :
```
if cf_1125=='ECO' then '...'
else if cf_1125=='ECO PLUS' then '...'
else if cf_1125=='CONFORT' then '...'
else if cf_1125=='LUXE' then '...'
```

---

## 🔄 BACKUP

**Dernier backup complet** : `2026-01-20 01:20`
**Emplacement** : `/var/www/backups/CNK-DEM_20260120_012042/`
**Contenu** :
- `cnk-dem-dump.sql.gz` (561K) - Base de données
- `CNK-DEM_files.tar.gz` (169M) - Tous les fichiers

---

## 📝 NOTES IMPORTANTES

1. **Cache VTiger** : Toujours vider après modification de templates :
   ```bash
   rm -rf /var/www/CNK-DEM/test/templates_c/v7/*
   ```

2. **Cache navigateur** : Ctrl+F5 pour recharger le JS

3. **TVA hardcodée** : Le taux de 20% est codé en dur

4. **Valeurs cf_1125** : Utiliser ECO, ECO PLUS, CONFORT, LUXE (pas FORFAIT ECO, etc.)

5. **Champ date** : Utiliser cf_1005 (pas validtill)

---

**Dernière mise à jour** : 2026-01-20
**Version du système** : 1.1
