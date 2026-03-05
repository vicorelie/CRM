<?php
/**
 * Endpoint création article Divers - accès par token
 */

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

require_once 'config.inc.php';

try {
    // Valider le token
    $token = isset($_POST['token']) ? preg_replace('/[^a-f0-9]/', '', $_POST['token']) : '';
    if (empty($token)) {
        throw new Exception('Token manquant');
    }

    $conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);
    $conn->set_charset('utf8');

    if ($conn->connect_error) {
        throw new Exception('Erreur de connexion à la base de données');
    }

    $stmt = $conn->prepare("SELECT potential_id FROM vtiger_client_inventory_tokens WHERE token = ? AND expires_at > NOW() LIMIT 1");
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception('Token invalide ou expiré');
    }
    $stmt->close();

    // Récupérer les données
    $productname = isset($_POST['productname']) ? trim($_POST['productname']) : '';
    $volume = isset($_POST['unit_price']) ? floatval($_POST['unit_price']) : 0;

    if (empty($productname)) {
        throw new Exception('Nom du produit requis');
    }
    if ($volume < 0) {
        throw new Exception('Volume invalide');
    }

    // Insérer dans aridem_inventory_items
    $stmt2 = $conn->prepare("INSERT INTO aridem_inventory_items
                             (category, category_label, category_icon, item_name, item_volume, sequence, active)
                             VALUES ('divers', 'Divers', '', ?, ?, 9999, 1)");
    $stmt2->bind_param('sd', $productname, $volume);

    if (!$stmt2->execute()) {
        if ($conn->errno === 1062) {
            throw new Exception('Un article avec ce nom existe déjà dans la catégorie Divers');
        }
        throw new Exception('Erreur lors de la création: ' . $conn->error);
    }

    $itemId = $conn->insert_id;
    $stmt2->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'itemId' => $itemId,
        'productname' => $productname,
        'volume' => $volume
    ]);

} catch (Exception $e) {
    if (isset($conn)) $conn->close();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
