<?php
// API pour récupérer les articles d'inventaire depuis la base de données
header('Content-Type: application/json; charset=utf-8');

require_once 'config.inc.php';

try {
    $conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

    if ($conn->connect_error) {
        throw new Exception('Connection failed: ' . $conn->connect_error);
    }

    // Récupérer tous les articles actifs avec catégorie valide
    $result = $conn->query('SELECT category, category_label, category_icon, item_name, item_volume
                            FROM aridem_inventory_items
                            WHERE active = 1
                            AND category IS NOT NULL
                            AND category != ""
                            AND category_label IS NOT NULL
                            AND category_label != ""
                            ORDER BY category, sequence, item_name');

    $items = [];
    $categories = [];

    while ($row = $result->fetch_assoc()) {
        $category = $row['category'];

        // Ajouter la catégorie si elle n'existe pas encore
        if (!isset($items[$category])) {
            $items[$category] = [];
            $categories[$category] = [
                'label' => $row['category_label'],
                'icon' => $row['category_icon']
            ];
        }

        // Ajouter l'article
        $items[$category][] = [
            'name' => $row['item_name'],
            'volume' => floatval($row['item_volume'])
        ];
    }

    $conn->close();

    echo json_encode([
        'success' => true,
        'items' => $items,
        'categories' => $categories
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
