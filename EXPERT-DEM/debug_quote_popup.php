<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Debug quote_popup.php</h1>";

chdir(dirname(__FILE__));
require_once 'config.inc.php';

$potentialId = 11; // ID de test

echo "<p>Étape 1: Connexion à la base de données...</p>";

$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

if ($conn->connect_error) {
    die('Erreur de connexion: ' . $conn->connect_error);
}

echo "<p>✓ Connexion réussie</p>";

echo "<p>Étape 2: Récupération de l'affaire...</p>";

$stmt = $conn->prepare("SELECT potentialname, contact_id FROM vtiger_potential WHERE potentialid = ?");
if (!$stmt) {
    die('Erreur de préparation: ' . $conn->error);
}

$stmt->bind_param('i', $potentialId);
$stmt->execute();
$result = $stmt->get_result();
$potential = $result->fetch_assoc();

if (!$potential) {
    die('Affaire non trouvée');
}

echo "<p>✓ Affaire trouvée: " . htmlspecialchars($potential['potentialname']) . "</p>";

echo "<p>Étape 3: Chargement des devis...</p>";

$quotesQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.quotestage, q.total,
                       qcf.cf_1125 as type_forfait, qcf.cf_1127 as tarif_forfait,
                       qcf.cf_1055 as total_acompte, qcf.cf_1057 as total_solde,
                       c.createdtime
                FROM vtiger_quotes q
                LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
                INNER JOIN vtiger_crmentity c ON c.crmid = q.quoteid
                WHERE q.potential_id = ? AND c.deleted = 0
                ORDER BY c.createdtime DESC";

$stmt = $conn->prepare($quotesQuery);
if (!$stmt) {
    die('Erreur préparation devis: ' . $conn->error);
}

$stmt->bind_param('i', $potentialId);
$stmt->execute();
$quotesResult = $stmt->get_result();

$quotes = [];
if ($quotesResult) {
    while ($row = $quotesResult->fetch_assoc()) {
        $quotes[] = $row;
    }
}

echo "<p>✓ Nombre de devis trouvés: " . count($quotes) . "</p>";

if (count($quotes) > 0) {
    echo "<pre>";
    print_r($quotes[0]);
    echo "</pre>";
}

echo "<p>Étape 4: Chargement des produits...</p>";

$productsQuery = "SELECT p.productid as id, p.productname, p.unit_price
                  FROM vtiger_products p
                  INNER JOIN vtiger_crmentity c ON c.crmid = p.productid
                  WHERE c.deleted = 0
                  ORDER BY p.productname ASC
                  LIMIT 5";

$productsResult = $conn->query($productsQuery);
$products = [];

if ($productsResult) {
    while ($row = $productsResult->fetch_assoc()) {
        $products[] = $row;
    }
}

echo "<p>✓ Nombre de produits trouvés: " . count($products) . "</p>";

echo "<p><strong>Tous les tests ont réussi!</strong></p>";
echo "<p><a href='quote_popup.php?record=11'>Ouvrir quote_popup.php avec l'ID 11</a></p>";

$conn->close();
?>
