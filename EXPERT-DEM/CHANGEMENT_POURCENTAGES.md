# Changement des pourcentages Acompte / Solde

## Fichiers à modifier

### 1. Template — Valeurs par défaut des hidden inputs
**Fichier :** `layouts/v7/modules/Potentials/UnifiedDevisTab.tpl`
- Ligne ~65 : `<input type="hidden" name="cf_1133" id="unified_hidden_cf_1133" value="XX">`
- Ligne ~66 : `<input type="hidden" name="cf_1135" id="unified_hidden_cf_1135" value="YY">`

### 2. JavaScript — Fallbacks dans UnifiedView.js
**Fichier :** `layouts/v7/modules/Potentials/resources/UnifiedView.js`
- Rechercher tous les `|| XX` (acompte) et `|| YY` (solde)
- Ce sont les valeurs de secours quand le pourcentage n'est pas défini sur un produit

### 3. JavaScript — Fallbacks dans Edit.js
**Fichier :** `layouts/v7/modules/Quotes/resources/Edit.js`
- Rechercher les `|| XX` et `|| YY` pour pct_acompte / pct_solde

### 4. PHP — Save.php des devis
**Fichier :** `modules/Quotes/actions/Save.php`
- Rechercher `?: XX` (forfaitPctAcompte) et `?: YY` (forfaitPctSolde)

### 5. PHP — UnifiedTabAjax.php
**Fichier :** `modules/Potentials/views/UnifiedTabAjax.php`
- Rechercher tous les `COALESCE(..., XX)` et `?: XX` / `?: YY`
- Concerne les requêtes SQL qui chargent les produits et les fallbacks PHP

### 6. Base de données — Valeurs par défaut des champs
```sql
UPDATE vtiger_field SET defaultvalue = 'XX' WHERE columnname = 'cf_1133';
UPDATE vtiger_field SET defaultvalue = 'YY' WHERE columnname = 'cf_1135';
```

## Impact sur les devis existants

Les pourcentages sont stockés **par ligne produit** dans la table `vtiger_inventoryproductrel` (colonnes `pct_acompte` et `pct_solde`).

- **Nouveaux devis / nouveaux produits** : prennent les nouveaux pourcentages par défaut.
- **Anciens devis** : conservent leurs pourcentages d'origine (stockés en base).
- Les fallbacks (|| et COALESCE) ne s'appliquent que si la valeur est NULL en base.

### Pour mettre à jour les anciens devis (optionnel)
```sql
-- Remplacer XX et YY par les nouveaux pourcentages
-- Remplacer OLD_XX et OLD_YY par les anciens pourcentages
UPDATE vtiger_inventoryproductrel
SET pct_acompte = XX, pct_solde = YY
WHERE pct_acompte = OLD_XX AND pct_solde = OLD_YY;
```

## Rappel
XX = pourcentage acompte (ex: 43)
YY = pourcentage solde (ex: 57)
XX + YY doit toujours = 100
