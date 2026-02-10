<?php
/**
 * Vérifier la structure de la table EMAILMaker
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.inc.php';

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #2196F3; color: white; }
        .info { background: #e3f2fd; padding: 15px; margin: 15px 0; }
    </style>
</head>
<body>

<h1>🔍 Structure de la table vtiger_emakertemplates</h1>

<?php
try {
    $conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

    if ($conn->connect_error) {
        die("Erreur de connexion: " . $conn->connect_error);
    }

    // Obtenir la structure de la table
    echo "<h2>Colonnes de la table:</h2>";
    $result = $conn->query("DESCRIBE vtiger_emakertemplates");

    if ($result) {
        echo "<table><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
        while ($row = $result->fetch_assoc()) {
            $highlight = ($row['Field'] == 'module' || $row['Field'] == 'for_module') ? 'style="background:#ffeb3b;"' : '';
            echo "<tr $highlight>";
            echo "<td><strong>{$row['Field']}</strong></td>";
            echo "<td>{$row['Type']}</td>";
            echo "<td>{$row['Null']}</td>";
            echo "<td>{$row['Key']}</td>";
            echo "<td>{$row['Default']}</td>";
            echo "<td>{$row['Extra']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

    // Vérifier quelques templates avec leurs valeurs
    echo "<h2>Échantillon de templates (5 premiers):</h2>";
    $result = $conn->query("SELECT * FROM vtiger_emakertemplates WHERE deleted = 0 LIMIT 5");

    if ($result && $result->num_rows > 0) {
        echo "<table>";
        $firstRow = true;
        while ($row = $result->fetch_assoc()) {
            if ($firstRow) {
                echo "<tr>";
                foreach (array_keys($row) as $col) {
                    echo "<th>$col</th>";
                }
                echo "</tr>";
                $firstRow = false;
            }
            echo "<tr>";
            foreach ($row as $value) {
                echo "<td>" . htmlspecialchars($value) . "</td>";
            }
            echo "</tr>";
        }
        echo "</table>";
    }

    $conn->close();

} catch (Exception $e) {
    echo "<p style='color:red;'>Erreur: " . $e->getMessage() . "</p>";
}
?>

<p><em>Test terminé - <?php echo date('d/m/Y H:i:s'); ?></em></p>

</body>
</html>
