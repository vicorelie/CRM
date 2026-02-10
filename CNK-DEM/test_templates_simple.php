<?php
/**
 * Script de diagnostic simplifié pour vérifier les templates
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Charger la configuration de la base de données
require_once 'config.inc.php';

header('Content-Type: text/html; charset=UTF-8');

echo "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
echo "<style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; border-bottom: 3px solid #e91e63; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; background: #fff; padding: 10px; border-left: 4px solid #2196F3; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
    th { background-color: #2196F3; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr:hover { background-color: #f5f5f5; }
    .deleted { color: red; text-decoration: line-through; }
    .success { color: green; font-weight: bold; }
    .error { color: red; font-weight: bold; }
    .warning { color: orange; font-weight: bold; }
    .info { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
    hr { border: none; border-top: 2px solid #ddd; margin: 30px 0; }
</style></head><body>";

echo "<h1>🔍 Diagnostic des Templates EMAILMaker et PDFMaker</h1>";

try {
    // Connexion à la base de données
    $conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

    if ($conn->connect_error) {
        die("<p class='error'>❌ Erreur de connexion: " . $conn->connect_error . "</p></body></html>");
    }

    $conn->set_charset("utf8");
    echo "<p class='success'>✅ Connexion à la base de données réussie</p>";

    echo "<hr>";

    // Test 1: EMAILMaker templates
    echo "<h2>📧 1. Templates EMAILMaker</h2>";

    $sql = "SELECT templateid, templatename, deleted, is_theme FROM vtiger_emakertemplates ORDER BY templatename ASC";
    $result = $conn->query($sql);

    if ($result) {
        $totalCount = $result->num_rows;
        echo "<p><strong>Nombre total:</strong> $totalCount templates</p>";

        if ($totalCount > 0) {
            echo "<table>";
            echo "<tr><th>ID</th><th>Nom du Template</th><th>Supprimé</th><th>Thème</th></tr>";

            $activeCount = 0;
            while ($row = $result->fetch_assoc()) {
                $rowClass = ($row['deleted'] == 1) ? 'deleted' : '';
                echo "<tr class='$rowClass'>";
                echo "<td>{$row['templateid']}</td>";
                echo "<td>{$row['templatename']}</td>";
                echo "<td>" . ($row['deleted'] == 1 ? '❌ Oui' : '✅ Non') . "</td>";
                echo "<td>" . ($row['is_theme'] == 1 ? 'Oui' : 'Non') . "</td>";
                echo "</tr>";

                if ($row['deleted'] == 0 && $row['is_theme'] == 0) {
                    $activeCount++;
                }
            }
            echo "</table>";

            echo "<div class='info'>";
            echo "<strong>📊 Résumé:</strong><br>";
            echo "Templates actifs (non supprimés, non thème): <span class='success'>$activeCount</span>";
            echo "</div>";

            if ($activeCount == 0) {
                echo "<p class='warning'>⚠️ Aucun template actif disponible ! Tous les templates sont soit supprimés soit marqués comme thèmes.</p>";
            }
        } else {
            echo "<div class='info'>";
            echo "<p class='error'>❌ <strong>AUCUN template EMAILMaker trouvé dans la base de données!</strong></p>";
            echo "<p>➜ Vous devez créer des templates dans le module <strong>EMAILMaker</strong> avant de pouvoir envoyer des emails.</p>";
            echo "</div>";
        }
    } else {
        echo "<p class='error'>Erreur SQL: " . $conn->error . "</p>";
    }

    echo "<hr>";

    // Test 2: PDFMaker templates
    echo "<h2>📄 2. Templates PDFMaker</h2>";

    $sql = "SELECT templateid, filename, module, deleted FROM vtiger_pdfmaker ORDER BY filename ASC";
    $result = $conn->query($sql);

    if ($result) {
        $totalCount = $result->num_rows;
        echo "<p><strong>Nombre total:</strong> $totalCount templates</p>";

        if ($totalCount > 0) {
            echo "<table>";
            echo "<tr><th>ID</th><th>Nom du Fichier</th><th>Module</th><th>Supprimé</th></tr>";

            $potentialsCount = 0;
            while ($row = $result->fetch_assoc()) {
                $rowClass = ($row['deleted'] == 1) ? 'deleted' : '';
                $highlight = ($row['module'] == 'Potentials' && $row['deleted'] == 0) ? 'style="background:#c8e6c9;"' : '';
                echo "<tr class='$rowClass' $highlight>";
                echo "<td>{$row['templateid']}</td>";
                echo "<td>{$row['filename']}</td>";
                echo "<td><strong>{$row['module']}</strong></td>";
                echo "<td>" . ($row['deleted'] == 1 ? '❌ Oui' : '✅ Non') . "</td>";
                echo "</tr>";

                if ($row['module'] == 'Potentials' && $row['deleted'] == 0) {
                    $potentialsCount++;
                }
            }
            echo "</table>";

            echo "<div class='info'>";
            echo "<strong>📊 Résumé:</strong><br>";
            echo "Templates actifs pour <strong>Potentials</strong>: <span class='success'>$potentialsCount</span>";
            echo "</div>";

            if ($potentialsCount == 0) {
                echo "<p class='warning'>⚠️ Aucun template PDF pour le module Potentials ! Créez des templates PDFMaker pour le module Potentials.</p>";
            }
        } else {
            echo "<div class='info'>";
            echo "<p class='error'>❌ <strong>AUCUN template PDFMaker trouvé dans la base de données!</strong></p>";
            echo "<p>➜ Vous devez créer des templates dans le module <strong>PDFMaker</strong> pour pouvoir joindre des PDFs.</p>";
            echo "</div>";
        }
    } else {
        echo "<p class='error'>Erreur SQL: " . $conn->error . "</p>";
    }

    echo "<hr>";

    // Test 3: Historique des emails
    echo "<h2>📬 3. Emails envoyés (Historique)</h2>";

    $sql = "SELECT COUNT(*) as count FROM vtiger_emaildetails e
            INNER JOIN vtiger_crmentity ce ON ce.crmid = e.emailid
            WHERE ce.deleted = 0";
    $result = $conn->query($sql);

    if ($result) {
        $row = $result->fetch_assoc();
        $emailCount = $row['count'];
        echo "<p><strong>Total emails dans la base:</strong> $emailCount</p>";

        if ($emailCount == 0) {
            echo "<div class='info'>";
            echo "<p class='warning'>⚠️ Aucun email trouvé dans l'historique. C'est normal si vous n'avez pas encore envoyé d'emails via VTiger.</p>";
            echo "</div>";
        }
    }

    $conn->close();

    echo "<hr>";
    echo "<h2>✅ Conclusion</h2>";
    echo "<div class='info'>";
    echo "<p><strong>Pour que le système d'envoi d'emails fonctionne, vous devez :</strong></p>";
    echo "<ol>";
    echo "<li>✅ Créer au moins UN template <strong>EMAILMaker</strong> (actuellement marqué comme actif)</li>";
    echo "<li>✅ Créer au moins UN template <strong>PDFMaker</strong> pour le module <strong>Potentials</strong> (si vous voulez joindre des PDFs)</li>";
    echo "<li>✅ Vérifier que ces templates ne sont PAS marqués comme supprimés</li>";
    echo "</ol>";
    echo "</div>";

} catch (Exception $e) {
    echo "<p class='error'>❌ Erreur: " . $e->getMessage() . "</p>";
}

echo "<hr>";
echo "<p><em>🕐 Diagnostic terminé - " . date('d/m/Y H:i:s') . "</em></p>";
echo "</body></html>";
?>
