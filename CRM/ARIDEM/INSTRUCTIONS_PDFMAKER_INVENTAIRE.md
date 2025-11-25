# Instructions - Afficher l'inventaire dans PDFMaker

## Comment ça fonctionne

Le système génère automatiquement un HTML formaté de tous les articles de l'inventaire et le stocke dans le champ custom `cf_inventaire_html`.

Ce HTML est mis à jour automatiquement chaque fois que vous **sauvegardez l'inventaire** dans le popup.

## Utilisation dans PDFMaker

### 1. Ouvrir votre template "Inventaire standard"

1. Allez dans **PDFMaker** > **PDF Templates**
2. Ouvrez votre template **"Inventaire standard"**
3. Cliquez sur **"Edit"**

### 2. Ajouter le placeholder dans le template

Dans l'éditeur de template, ajoutez simplement ce placeholder à l'endroit où vous voulez afficher les articles:

```
$POTENTIALS_CF_INVENTAIRE_HTML$
```

Ce placeholder sera automatiquement remplacé par tous les tableaux d'articles de l'inventaire.

### 3. Exemple de template complet

Voici un exemple de structure de template:

```html
<h1>INVENTAIRE DE DÉMÉNAGEMENT</h1>

<p>
<strong>Client:</strong> $R_RELATED_TO_ACCOUNTNAME$<br />
<strong>Contact:</strong> $R_CONTACTID_LASTNAME$ $R_CONTACTID_FIRSTNAME$<br />
<strong>Départ:</strong> $POTENTIALS_CF_ADRESSE_COMPLETE_DEPART$<br />
<strong>Arrivée:</strong> $POTENTIALS_CF_ADRESSE_COMPLETE_ARRIVEE$<br />
</p>

<h2>Résumé</h2>
<p>
<strong>Volume total:</strong> $POTENTIALS_CF_VOLUME_INVENTAIRE$ m³<br />
<strong>Cartons estimés:</strong> $POTENTIALS_CF_CARTONS_ESTIMES$
</p>

<h2>Détail des articles</h2>
$POTENTIALS_CF_INVENTAIRE_HTML$

<p style="margin-top: 30px;">
<strong>VOLUME TOTAL: $POTENTIALS_CF_VOLUME_INVENTAIRE$ m³</strong>
</p>
```

## Ce qui sera affiché

Le placeholder `$POTENTIALS_CF_INVENTAIRE_HTML$` affichera:

- ✅ Tous les articles sélectionnés dans l'inventaire
- ✅ Organisés par catégorie (Buanderie, Salon, Cuisine, etc.)
- ✅ Avec les colonnes: N°, Nom, Volume/unité, Quantité, Total
- ✅ Avec le total par catégorie
- ✅ Avec les couleurs (en-têtes gris #BDB9B9, lignes beige #EEEEEE)

## Important

⚠️ **Le HTML n'est généré que lorsque vous sauvegardez l'inventaire**

Pour que le placeholder fonctionne:
1. Ouvrez l'affaire dans le CRM
2. Cliquez sur "📋 Inventaire"
3. Modifiez les quantités si besoin
4. **Cliquez sur "💾 Enregistrer"**
5. Le HTML est maintenant généré et stocké
6. Générez le PDF avec PDFMaker → les articles apparaîtront!

## Placeholders disponibles pour l'inventaire

Vous pouvez utiliser ces placeholders dans votre template:

- `$POTENTIALS_CF_INVENTAIRE_HTML$` - Le tableau complet des articles
- `$POTENTIALS_CF_VOLUME_INVENTAIRE$` - Le volume total (ex: 7.87)
- `$POTENTIALS_CF_CARTONS_ESTIMES$` - Le nombre de cartons estimés
- `$POTENTIALS_CF_INVENTAIRE_JSON$` - Les données JSON brutes (technique)
- `$POTENTIALS_CF_ADRESSE_COMPLETE_DEPART$` - Adresse de départ
- `$POTENTIALS_CF_ADRESSE_COMPLETE_ARRIVEE$` - Adresse d'arrivée

## Personnalisation

Si vous voulez modifier le style des tableaux (couleurs, tailles, etc.), il faut:
1. Modifier le fichier `save_inventory_direct.php`
2. Changer les valeurs dans la fonction `generateInventoryHTML()`
3. Ouvrir un inventaire et cliquer sur "💾 Enregistrer" pour régénérer le HTML

## Support

Si les articles n'apparaissent pas dans le PDF:
1. Vérifiez que vous avez bien cliqué sur "💾 Enregistrer" dans le popup inventaire
2. Vérifiez que le placeholder `$POTENTIALS_CF_INVENTAIRE_HTML$` est bien dans votre template
3. Vérifiez qu'il y a bien des articles avec des quantités > 0 dans l'inventaire
