<?php
/**
 * Endpoint AJAX pour récupérer toutes les données d'un devis
 */
chdir(dirname(__FILE__));
require_once 'config.inc.php';

header('Content-Type: application/json');

$quoteId = isset($_GET['quoteid']) ? intval($_GET['quoteid']) : 0;

if ($quoteId <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID invalide']);
    exit;
}

$conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion']);
    exit;
}

try {
    // Récupérer les données du devis
    $query = "SELECT q.*, qcf.*
              FROM vtiger_quotes q
              LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
              WHERE q.quoteid = ?";

    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $quoteId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        echo json_encode(['success' => false, 'message' => 'Devis non trouvé']);
        exit;
    }

    $quoteData = $result->fetch_assoc();

    // Récupérer les produits du devis avec leurs pourcentages acompte/solde
    $productsQuery = "SELECT ipr.*, p.productname, p.unit_price,
                             COALESCE(pcf.cf_1051, 43) as pct_acompte,
                             COALESCE(pcf.cf_1053, 57) as pct_solde
                      FROM vtiger_inventoryproductrel ipr
                      LEFT JOIN vtiger_products p ON p.productid = ipr.productid
                      LEFT JOIN vtiger_productcf pcf ON pcf.productid = ipr.productid
                      WHERE ipr.id = ?
                      ORDER BY ipr.sequence_no";

    $stmt = $conn->prepare($productsQuery);
    $stmt->bind_param('i', $quoteId);
    $stmt->execute();
    $productsResult = $stmt->get_result();

    $products = [];
    while ($product = $productsResult->fetch_assoc()) {
        // Utiliser la description personnalisée si elle existe, sinon le nom du produit
        $displayName = !empty($product['description']) ? $product['description'] : $product['productname'];
        $products[] = [
            'productid' => $product['productid'],
            'productname' => $displayName,
            'description' => $product['description'],
            'quantity' => $product['quantity'],
            'listprice' => $product['listprice'],
            'comment' => $product['comment'],
            'discount_percent' => $product['discount_percent'],
            'discount_amount' => $product['discount_amount'],
            'pct_acompte' => floatval($product['pct_acompte']) ?: 43,
            'pct_solde' => floatval($product['pct_solde']) ?: 57
        ];
    }

    // Retourner les données
    echo json_encode([
        'success' => true,
        'quote' => $quoteData,
        'products' => $products
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
