<?php
/**
 * Script de test pour quote_popup.php
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Test de quote_popup.php</h1>";

// Simuler un ID d'affaire valide
require_once 'config.inc.php';

$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

if ($conn->connect_error) {
    die('Erreur de connexion: ' . $conn->connect_error);
}

// Trouver une affaire valide
$result = $conn->query("SELECT potentialid, potentialname FROM vtiger_potential LIMIT 1");
if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    echo "<p>Affaire trouvée: ID=" . $row['potentialid'] . ", Nom=" . htmlspecialchars($row['potentialname']) . "</p>";
    echo "<p><a href='quote_popup.php?record=" . $row['potentialid'] . "' target='_blank'>Ouvrir quote_popup.php pour cette affaire</a></p>";
} else {
    echo "<p>Aucune affaire trouvée dans la base de données</p>";
}

$conn->close();
?>
