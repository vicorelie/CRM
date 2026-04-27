#!/usr/bin/env php
<?php
/**
 * Script de réparation automatique du template PDF "Devis CNK DEM"
 * À exécuter après chaque modification du template dans PDFMaker
 * Usage: php fix_pdf_template.php
 */

echo str_repeat("═", 60) . "\n";
echo "   RÉPARATION AUTOMATIQUE - Template 'Devis CNK DEM'\n";
echo str_repeat("═", 60) . "\n\n";

// Connexion à la base de données
$db = new mysqli('localhost', 'cnk_dem_user', 'cedcff26783d08a13a92997c415db618', 'cnk_dem');

if ($db->connect_error) {
    die("❌ Erreur de connexion: " . $db->connect_error . "\n");
}

// Récupérer le template actuel
$result = $db->query("SELECT body FROM vtiger_pdfmaker WHERE templateid = 11");

if (!$result || $result->num_rows === 0) {
    die("❌ Erreur: Template introuvable!\n");
}

$row = $result->fetch_assoc();
$template = $row['body'];
$modified = false;

// Vérifier et corriger FORFAIT
if (strpos($template, '#PRODUCTBLOC_SERVICES_START# #PRODUCTBLOC_SERVICES_END#') !== false &&
    strpos($template, '<div class="section-title">FORFAIT</div>') !== false) {

    echo "⚠️  Problème détecté: Les balises FORFAIT sont mal placées\n";

    // Correction: déplacer les balises DANS le tbody
    $template = preg_replace(
        '#(<div class="section-title">FORFAIT</div>)\s*#PRODUCTBLOC_SERVICES_START#\s*#PRODUCTBLOC_SERVICES_END#\s*(<table class="tbl">\s*<thead>.*?</thead>\s*<tbody>)(.*?)(</tbody>)#s',
        "$1\n\n$2\n#PRODUCTBLOC_SERVICES_START#\n$3\n#PRODUCTBLOC_SERVICES_END#\n\t$4",
        $template
    );

    $modified = true;
    echo "  ✓ Balises FORFAIT corrigées\n";
}

// Vérifier et corriger OPTIONS
if (strpos($template, '#PRODUCTBLOC_PRODUCTS_START# #PRODUCTBLOC_PRODUCTS_END#') !== false &&
    strpos($template, '<div class="section-title">OPTIONS</div>') !== false) {

    echo "⚠️  Problème détecté: Les balises OPTIONS sont mal placées\n";

    // Correction: déplacer les balises DANS le tbody
    $template = preg_replace(
        '#(<div class="section-title">OPTIONS</div>)\s*#PRODUCTBLOC_PRODUCTS_START#\s*#PRODUCTBLOC_PRODUCTS_END#\s*(<table class="tbl">\s*<thead>.*?</thead>\s*<tbody>)(.*?)(</tbody>)#s',
        "$1\n\n$2\n#PRODUCTBLOC_PRODUCTS_START#\n$3\n#PRODUCTBLOC_PRODUCTS_END#\n\t$4",
        $template
    );

    $modified = true;
    echo "  ✓ Balises OPTIONS corrigées\n";
}

if (!$modified) {
    echo "✓ Aucun problème détecté - Le template est déjà correct!\n";
} else {
    // Mettre à jour la base de données
    $stmt = $db->prepare("UPDATE vtiger_pdfmaker SET body = ? WHERE templateid = 11");
    $stmt->bind_param('s', $template);

    if ($stmt->execute()) {
        // Vider le cache
        $cacheFiles = glob('/var/www/CNK-DEM/test/templates_c/v7/*');
        foreach ($cacheFiles as $file) {
            if (is_file($file)) {
                unlink($file);
            } elseif (is_dir($file)) {
                rmdir($file);
            }
        }

        echo "\n";
        echo str_repeat("═", 60) . "\n";
        echo "✓ RÉPARATION TERMINÉE !\n";
        echo str_repeat("═", 60) . "\n\n";
        echo "Le cache a été vidé.\n";
        echo "Les produits et services devraient maintenant s'afficher.\n";
    } else {
        echo "❌ Erreur lors de la mise à jour: " . $stmt->error . "\n";
    }

    $stmt->close();
}

$db->close();

echo "\n";
echo "═══════════════════════════════════════════════════════════\n";
echo "Pour utiliser ce script à l'avenir :\n";
echo "  cd /var/www/CNK-DEM\n";
echo "  php fix_pdf_template.php\n";
echo "═══════════════════════════════════════════════════════════\n\n";
?>
