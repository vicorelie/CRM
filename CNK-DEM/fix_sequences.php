<?php
/**
 * Script de maintenance pour corriger les séquences VTiger
 * Exécuter: php fix_sequences.php
 * Ou via navigateur: http://votre-site/fix_sequences.php
 */

echo "<pre>";
echo "=== CORRECTION DES SÉQUENCES VTIGER ===\n\n";

// Database config
$dbconfig = [
    'db_server' => 'localhost',
    'db_username' => 'cnk_dem_user',
    'db_password' => 'cedcff26783d08a13a92997c415db618',
    'db_name' => 'cnk_dem'
];

try {
    $pdo = new PDO(
        "mysql:host={$dbconfig['db_server']};dbname={$dbconfig['db_name']};charset=utf8",
        $dbconfig['db_username'],
        $dbconfig['db_password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erreur de connexion: " . $e->getMessage());
}

// Sequences to check and fix
$sequences = [
    ['vtiger_field_seq', 'vtiger_field', 'fieldid'],
    ['vtiger_blocks_seq', 'vtiger_blocks', 'blockid'],
    ['vtiger_crmentity_seq', 'vtiger_crmentity', 'crmid'],
    ['vtiger_picklist_seq', 'vtiger_picklist', 'picklistid'],
    ['vtiger_customview_seq', 'vtiger_customview', 'cvid'],
    ['vtiger_relatedlists_seq', 'vtiger_relatedlists', 'relation_id'],
    ['vtiger_links_seq', 'vtiger_links', 'linkid'],
    ['vtiger_users_seq', 'vtiger_users', 'id'],
    ['vtiger_profile_seq', 'vtiger_profile', 'profileid'],
    ['vtiger_settings_field_seq', 'vtiger_settings_field', 'fieldid'],
    ['vtiger_settings_blocks_seq', 'vtiger_settings_blocks', 'blockid'],
    ['vtiger_inventoryproductrel_seq', 'vtiger_inventoryproductrel', 'lineitem_id'],
    ['vtiger_pdfmaker_seq', 'vtiger_pdfmaker', 'templateid'],
    ['vtiger_emailtemplates_seq', 'vtiger_emailtemplates', 'templateid'],
    ['vtiger_eventhandlers_seq', 'vtiger_eventhandlers', 'eventhandler_id'],
    ['com_vtiger_workflows_seq', 'com_vtiger_workflows', 'workflow_id'],
    ['com_vtiger_workflowtasks_seq', 'com_vtiger_workflowtasks', 'task_id'],
];

$fixed = 0;
$errors = 0;

foreach ($sequences as $seq) {
    $seqTable = $seq[0];
    $dataTable = $seq[1];
    $idColumn = $seq[2];

    try {
        // Get current sequence value
        $stmt = $pdo->query("SELECT id FROM {$seqTable}");
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // Handle corrupted seq tables with multiple rows
        if (count($rows) > 1) {
            $seqVal = max($rows);
            echo "⚠️  {$seqTable}: Table corrompue (" . count($rows) . " lignes)\n";
        } else {
            $seqVal = $rows[0] ?? 0;
        }

        // Get max ID from data table
        $stmt = $pdo->query("SELECT MAX({$idColumn}) FROM {$dataTable}");
        $maxId = $stmt->fetchColumn() ?? 0;

        if ($seqVal < $maxId || count($rows) > 1) {
            // Fix the sequence
            $pdo->exec("DELETE FROM {$seqTable}");
            $pdo->exec("INSERT INTO {$seqTable} (id) VALUES ({$maxId})");
            echo "✓ CORRIGÉ: {$seqTable} ({$seqVal} → {$maxId})\n";
            $fixed++;
        } else {
            echo "✓ OK: {$seqTable} (seq={$seqVal}, max={$maxId})\n";
        }

    } catch (PDOException $e) {
        echo "✗ ERREUR: {$seqTable} - " . $e->getMessage() . "\n";
        $errors++;
    }
}

echo "\n=== RÉSUMÉ ===\n";
echo "Séquences vérifiées: " . count($sequences) . "\n";
echo "Séquences corrigées: {$fixed}\n";
echo "Erreurs: {$errors}\n";

if ($fixed > 0) {
    echo "\n⚠️  Videz le cache VTiger après cette correction.\n";
}

echo "</pre>";
