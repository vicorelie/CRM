#!/bin/bash
# Script de réparation automatique du template PDF "Devis CNK DEM"
# À exécuter après chaque modification du template dans PDFMaker

echo "════════════════════════════════════════════════════════════"
echo "   RÉPARATION AUTOMATIQUE - Template 'Devis CNK DEM'"
echo "════════════════════════════════════════════════════════════"
echo ""

# Fonction pour échapper les caractères spéciaux pour sed
escape_sed() {
    echo "$1" | sed 's/[&/\]/\\&/g'
}

# Récupérer le template actuel
TEMPLATE=$(mysql -u cnk_dem_user -p'cedcff26783d08a13a92997c415db618' cnk_dem -N -e "SELECT body FROM vtiger_pdfmaker WHERE templateid = 11")

# Vérifier si les balises sont mal placées
if echo "$TEMPLATE" | grep -q "FORFAIT</div>[[:space:]]*#PRODUCTBLOC_SERVICES"; then
    echo "⚠️  Problème détecté: Les balises FORFAIT sont en dehors du tableau"

    # Correction FORFAIT
    TEMPLATE=$(echo "$TEMPLATE" | perl -0777 -pe 's/<div class="section-title">FORFAIT<\/div>\s*#PRODUCTBLOC_SERVICES_START#\s*#PRODUCTBLOC_SERVICES_END#\s*<table class="tbl">\s*<thead>(.*?)<\/thead>\s*<tbody>/<div class="section-title">FORFAIT<\/div>\n\n<table class="tbl">\n\t<thead>$1<\/thead>\n\t<tbody>\n#PRODUCTBLOC_SERVICES_START#/s')

    # Trouver et ajouter la balise END avant </tbody>
    TEMPLATE=$(echo "$TEMPLATE" | perl -0777 -pe 's/(<td class="center">\$PRODUCTQUANTITY\$<\/td>\s*<td class="right"><strong>\$PRODUCTSTOTALAFTERDISCOUNT\$ \$CURRENCYSYMBOL\$<\/strong><\/td>\s*<\/tr>)\s*<\/tbody>\s*<\/table>\s*<div class="section-title">OPTIONS/$1\n#PRODUCTBLOC_SERVICES_END#\n\t<\/tbody>\n<\/table>\n\n<div class="section-title">OPTIONS/s')

    echo "  ✓ Balises FORFAIT corrigées"
fi

if echo "$TEMPLATE" | grep -q "OPTIONS</div>[[:space:]]*#PRODUCTBLOC_PRODUCTS"; then
    echo "⚠️  Problème détecté: Les balises OPTIONS sont en dehors du tableau"

    # Correction OPTIONS
    TEMPLATE=$(echo "$TEMPLATE" | perl -0777 -pe 's/<div class="section-title">OPTIONS<\/div>\s*#PRODUCTBLOC_PRODUCTS_START#\s*#PRODUCTBLOC_PRODUCTS_END#\s*<table class="tbl">\s*<thead>(.*?)<\/thead>\s*<tbody>/<div class="section-title">OPTIONS<\/div>\n\n<table class="tbl">\n\t<thead>$1<\/thead>\n\t<tbody>\n#PRODUCTBLOC_PRODUCTS_START#/s')

    # Trouver et ajouter la balise END avant </tbody>
    TEMPLATE=$(echo "$TEMPLATE" | perl -0777 -pe 's/(<td class="center">\$PRODUCTQUANTITY\$<\/td>\s*<td class="right"><strong>\$PRODUCTSTOTALAFTERDISCOUNT\$ \$CURRENCYSYMBOL\$<\/strong><\/td>\s*<\/tr>)\s*<\/tbody>\s*<\/table>\s*<div style="margin-top:15px;">/$1\n#PRODUCTBLOC_PRODUCTS_END#\n\t<\/tbody>\n<\/table>\n\n<div style="margin-top:15px;">/s')

    echo "  ✓ Balises OPTIONS corrigées"
fi

# Mettre à jour la base de données
echo "$TEMPLATE" | mysql -u cnk_dem_user -p'cedcff26783d08a13a92997c415db618' cnk_dem -e "UPDATE vtiger_pdfmaker SET body = @body WHERE templateid = 11" -v --init-command="SET @body := LOAD_FILE('/dev/stdin')"

# Méthode alternative plus simple
TMP_FILE="/tmp/template_fixed.html"
echo "$TEMPLATE" > "$TMP_FILE"

mysql -u cnk_dem_user -p'cedcff26783d08a13a92997c415db618' cnk_dem <<EOSQL
UPDATE vtiger_pdfmaker
SET body = '$(echo "$TEMPLATE" | sed "s/'/''/g")'
WHERE templateid = 11;
EOSQL

# Vider le cache
rm -rf /var/www/CNK-DEM/test/templates_c/v7/*

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✓ RÉPARATION TERMINÉE !"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Les produits et services devraient maintenant s'afficher"
echo "correctement dans vos PDF."
echo ""
echo "Pour utiliser ce script à l'avenir :"
echo "  cd /var/www/CNK-DEM"
echo "  bash fix_pdf_template.sh"
echo ""
