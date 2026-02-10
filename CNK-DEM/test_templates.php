<?php
/**
 * Script de diagnostic pour vérifier les templates EMAILMaker et PDFMaker
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Charger VTiger
chdir(dirname(__FILE__));

try {
    if (file_exists('vtlib/Vtiger/Module.php')) {
        require_once 'vtlib/Vtiger/Module.php';
    }
    if (file_exists('include/utils/utils.php')) {
        require_once 'include/utils/utils.php';
    }
    if (file_exists('includes/runtime/Cache.php')) {
        require_once 'includes/runtime/Cache.php';
    }

    // Initialiser la session
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }

    // Charger l'utilisateur
    require_once 'includes/main/WebUI.php';

} catch (Exception $e) {
    die("<h1>Erreur de chargement VTiger</h1><p>" . $e->getMessage() . "</p>");
}

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>Diagnostic des Templates</h1>";
echo "<hr>";

global $adb, $current_user;

// Test 1: Vérifier EMAILMaker templates
echo "<h2>1. Templates EMAILMaker</h2>";
try {
    $query = "SELECT templateid, templatename, deleted, is_theme
              FROM vtiger_emakertemplates
              ORDER BY templatename ASC";
    $result = $adb->query($query);
    $count = $adb->num_rows($result);

    echo "<p><strong>Nombre total de templates:</strong> $count</p>";

    if ($count > 0) {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Nom</th><th>Deleted</th><th>Is Theme</th></tr>";
        while ($row = $adb->fetchByAssoc($result)) {
            $style = $row['deleted'] == 1 ? 'color: red;' : '';
            echo "<tr style='$style'>";
            echo "<td>{$row['templateid']}</td>";
            echo "<td>{$row['templatename']}</td>";
            echo "<td>{$row['deleted']}</td>";
            echo "<td>{$row['is_theme']}</td>";
            echo "</tr>";
        }
        echo "</table>";

        // Templates actifs
        $activeQuery = "SELECT COUNT(*) as count FROM vtiger_emakertemplates WHERE deleted = 0 AND is_theme = 0";
        $activeResult = $adb->query($activeQuery);
        $activeCount = $adb->query_result($activeResult, 0, 'count');
        echo "<p><strong>Templates actifs (non supprimés, non thème):</strong> $activeCount</p>";
    } else {
        echo "<p style='color: red;'><strong>⚠️ Aucun template EMAILMaker trouvé dans la base de données!</strong></p>";
        echo "<p>Vous devez créer des templates dans le module EMAILMaker.</p>";
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>Erreur: " . $e->getMessage() . "</p>";
}

echo "<hr>";

// Test 2: Vérifier PDFMaker templates
echo "<h2>2. Templates PDFMaker</h2>";
try {
    $query = "SELECT templateid, filename, module, deleted
              FROM vtiger_pdfmaker
              ORDER BY filename ASC";
    $result = $adb->query($query);
    $count = $adb->num_rows($result);

    echo "<p><strong>Nombre total de templates:</strong> $count</p>";

    if ($count > 0) {
        echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Nom</th><th>Module</th><th>Deleted</th></tr>";
        while ($row = $adb->fetchByAssoc($result)) {
            $style = $row['deleted'] == 1 ? 'color: red;' : '';
            echo "<tr style='$style'>";
            echo "<td>{$row['templateid']}</td>";
            echo "<td>{$row['filename']}</td>";
            echo "<td>{$row['module']}</td>";
            echo "<td>{$row['deleted']}</td>";
            echo "</tr>";
        }
        echo "</table>";

        // Templates pour Potentials
        $potentialsQuery = "SELECT COUNT(*) as count FROM vtiger_pdfmaker WHERE deleted = 0 AND module = 'Potentials'";
        $potentialsResult = $adb->query($potentialsQuery);
        $potentialsCount = $adb->query_result($potentialsResult, 0, 'count');
        echo "<p><strong>Templates actifs pour Potentials:</strong> $potentialsCount</p>";
    } else {
        echo "<p style='color: red;'><strong>⚠️ Aucun template PDFMaker trouvé dans la base de données!</strong></p>";
        echo "<p>Vous devez créer des templates dans le module PDFMaker.</p>";
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>Erreur: " . $e->getMessage() . "</p>";
}

echo "<hr>";

// Test 3: Vérifier les permissions
echo "<h2>3. Permissions Utilisateur</h2>";
echo "<p><strong>Utilisateur actuel:</strong> " . $current_user->user_name . " (ID: " . $current_user->id . ")</p>";
echo "<p><strong>Est admin:</strong> " . ($current_user->is_admin == 'on' ? 'Oui' : 'Non') . "</p>";

$modules = ['Potentials', 'EMAILMaker', 'PDFMaker'];
echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
echo "<tr><th>Module</th><th>DetailView</th><th>EditView</th></tr>";
foreach ($modules as $module) {
    $detailPerm = Users_Privileges_Model::isPermitted($module, 'DetailView') ? '✓ Oui' : '✗ Non';
    $editPerm = Users_Privileges_Model::isPermitted($module, 'EditView') ? '✓ Oui' : '✗ Non';
    echo "<tr>";
    echo "<td>$module</td>";
    echo "<td>$detailPerm</td>";
    echo "<td>$editPerm</td>";
    echo "</tr>";
}
echo "</table>";

echo "<hr>";

// Test 4: Tester les actions directement
echo "<h2>4. Test des Actions AJAX</h2>";

echo "<h3>Test EMAILMaker GetTemplatesList</h3>";
echo "<p><a href='index.php?module=EMAILMaker&action=GetTemplatesList&source_module=Potentials' target='_blank'>Cliquer pour tester</a></p>";

echo "<h3>Test PDFMaker GetTemplatesList</h3>";
echo "<p><a href='index.php?module=PDFMaker&action=GetTemplatesList&source_module=Potentials' target='_blank'>Cliquer pour tester</a></p>";

echo "<hr>";
echo "<p><em>Script de diagnostic terminé - " . date('Y-m-d H:i:s') . "</em></p>";
