#!/usr/bin/env python3
"""
Script de réparation automatique du template PDF "Devis CNK DEM"
À exécuter après chaque modification du template dans PDFMaker
Usage: python3 fix_pdf_template.py
"""

import pymysql
import re
import shutil
import glob

print("═" * 60)
print("   RÉPARATION AUTOMATIQUE - Template 'Devis CNK DEM'")
print("═" * 60)
print()

# Connexion à la base de données
db = pymysql.connect(
    host='localhost',
    user='cnk_dem_user',
    password='cedcff26783d08a13a92997c415db618',
    database='cnk_dem',
    charset='utf8mb4'
)

cursor = db.cursor()

# Récupérer le template actuel
cursor.execute("SELECT body FROM vtiger_pdfmaker WHERE templateid = 11")
result = cursor.fetchone()

if not result:
    print("❌ Erreur: Template introuvable!")
    exit(1)

template = result[0]
modified = False

# Vérifier et corriger FORFAIT
if '#PRODUCTBLOC_SERVICES_START# #PRODUCTBLOC_SERVICES_END#' in template and \
   '<div class="section-title">FORFAIT</div>' in template:
    print("⚠️  Problème détecté: Les balises FORFAIT sont mal placées")

    # Pattern pour détecter les balises avant le tableau
    pattern_before = r'(<div class="section-title">FORFAIT</div>)\s*#PRODUCTBLOC_SERVICES_START#\s*#PRODUCTBLOC_SERVICES_END#\s*(<table class="tbl">.*?<thead>.*?</thead>\s*<tbody>)(.*?)(</tbody>)'

    def fix_forfait(match):
        return match.group(1) + '\n\n' + match.group(2) + '\n#PRODUCTBLOC_SERVICES_START#\n' + match.group(3) + '\n#PRODUCTBLOC_SERVICES_END#\n\t' + match.group(4)

    template = re.sub(pattern_before, fix_forfait, template, flags=re.DOTALL)
    modified = True
    print("  ✓ Balises FORFAIT corrigées")

# Vérifier et corriger OPTIONS
if '#PRODUCTBLOC_PRODUCTS_START# #PRODUCTBLOC_PRODUCTS_END#' in template and \
   '<div class="section-title">OPTIONS</div>' in template:
    print("⚠️  Problème détecté: Les balises OPTIONS sont mal placées")

    # Pattern pour détecter les balises avant le tableau
    pattern_before = r'(<div class="section-title">OPTIONS</div>)\s*#PRODUCTBLOC_PRODUCTS_START#\s*#PRODUCTBLOC_PRODUCTS_END#\s*(<table class="tbl">.*?<thead>.*?</thead>\s*<tbody>)(.*?)(</tbody>)'

    def fix_options(match):
        return match.group(1) + '\n\n' + match.group(2) + '\n#PRODUCTBLOC_PRODUCTS_START#\n' + match.group(3) + '\n#PRODUCTBLOC_PRODUCTS_END#\n\t' + match.group(4)

    template = re.sub(pattern_before, fix_options, template, flags=re.DOTALL)
    modified = True
    print("  ✓ Balises OPTIONS corrigées")

if not modified:
    print("✓ Aucun problème détecté - Le template est déjà correct!")
else:
    # Mettre à jour la base de données
    cursor.execute("UPDATE vtiger_pdfmaker SET body = %s WHERE templateid = 11", (template,))
    db.commit()

    # Vider le cache
    cache_path = '/var/www/CNK-DEM/test/templates_c/v7/*'
    for file in glob.glob(cache_path):
        try:
            shutil.rmtree(file) if glob.os.path.isdir(file) else glob.os.remove(file)
        except:
            pass

    print()
    print("═" * 60)
    print("✓ RÉPARATION TERMINÉE !")
    print("═" * 60)
    print()
    print("Le cache a été vidé.")
    print("Les produits et services devraient maintenant s'afficher.")

cursor.close()
db.close()

print()
print("Pour utiliser ce script à l'avenir :")
print("  cd /var/www/CNK-DEM")
print("  python3 fix_pdf_template.py")
print()
