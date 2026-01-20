<?php
chdir(dirname(__FILE__));
require_once 'config.inc.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$productname = isset($_POST['productname']) ? trim($_POST['productname']) : '';
$volume = isset($_POST['unit_price']) ? floatval($_POST['unit_price']) : 0;

if (empty($productname)) {
    echo json_encode(['success' => false, 'error' => 'Nom du produit requis']);
    exit;
}

if ($volume < 0) {
    echo json_encode(['success' => false, 'error' => 'Volume invalide']);
    exit;
}

try {
    $conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

    if ($conn->connect_error) {
        throw new Exception('Erreur de connexion: ' . $conn->connect_error);
    }

    // Insérer dans la table aridem_inventory_items
    $stmt = $conn->prepare("INSERT INTO aridem_inventory_items
                            (category, category_label, category_icon, item_name, item_volume, sequence, active)
                            VALUES ('divers', 'Divers', '', ?, ?, 9999, 1)");
    $stmt->bind_param('sd', $productname, $volume);

    if (!$stmt->execute()) {
        // Vérifier si c'est une erreur de doublon
        if ($conn->errno === 1062) {
            throw new Exception('Un article avec ce nom existe déjà dans la catégorie Divers');
        }
        throw new Exception('Erreur lors de la création de l\'article: ' . $conn->error);
    }

    $itemId = $conn->insert_id;

    echo json_encode([
        'success' => true,
        'itemId' => $itemId,
        'productname' => $productname,
        'volume' => $volume
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn)) {
    $conn->close();
}
