<?php
/**
 * Script pour sauvegarder l'inventaire directement
 */

header('Content-Type: application/json');

require_once 'config.inc.php';

try {
    // Récupérer les données POST
    $recordId = isset($_POST['record_id']) ? intval($_POST['record_id']) : 0;
    $volume = isset($_POST['volume']) ? floatval($_POST['volume']) : 0;
    $volumeFinal = isset($_POST['volume_final']) ? floatval($_POST['volume_final']) : 0;
    $boxes = isset($_POST['boxes']) ? intval($_POST['boxes']) : 0;
    $inventory = isset($_POST['inventory']) ? $_POST['inventory'] : '{}';

    if ($recordId <= 0) {
        throw new Exception('ID d\'enregistrement invalide');
    }

    // Connexion à la base de données
    $conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

    if ($conn->connect_error) {
        throw new Exception('Erreur de connexion à la base de données');
    }

    // Générer le HTML de l'inventaire
    $inventoryHTML = generateInventoryHTML($conn, json_decode($inventory, true));

    // Mettre à jour l'enregistrement dans la table des custom fields
    $stmt = $conn->prepare("UPDATE vtiger_potentialscf
                            SET cf_939 = ?,
                                cf_1259 = ?,
                                cf_963 = ?,
                                cf_969 = ?,
                                cf_965 = ?
                            WHERE potentialid = ?");

    if (!$stmt) {
        throw new Exception('Erreur de préparation de la requête: ' . $conn->error);
    }

    $stmt->bind_param('ddissi', $volume, $volumeFinal, $boxes, $inventory, $inventoryHTML, $recordId);

    if (!$stmt->execute()) {
        throw new Exception('Erreur lors de la sauvegarde: ' . $stmt->error);
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'message' => 'Inventaire sauvegardé avec succès'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Génère le HTML de l'inventaire pour PDFMaker (format compact sans catégories)
 */
function generateInventoryHTML($conn, $inventory) {
    if (empty($inventory) || !is_array($inventory)) {
        return '';
    }

    // Charger les items depuis la base de données avec leurs volumes
    $itemsResult = $conn->query("SELECT category, item_name, item_volume
                                FROM aridem_inventory_items
                                WHERE active = 1
                                ORDER BY category, sequence, item_name");

    $itemsDB = [];
    if ($itemsResult && $itemsResult->num_rows > 0) {
        while ($row = $itemsResult->fetch_assoc()) {
            $cat = $row['category'];
            if (!isset($itemsDB[$cat])) {
                $itemsDB[$cat] = [];
            }
            $itemsDB[$cat][$row['item_name']] = floatval($row['item_volume']);
        }
    }

    // Collecter tous les items dans une liste plate
    $allItems = [];
    $grandTotal = 0;

    foreach ($inventory as $catId => $catItems) {
        if (!isset($itemsDB[$catId])) {
            continue;
        }
        foreach ($catItems as $itemName => $qty) {
            if ($qty > 0 && isset($itemsDB[$catId][$itemName])) {
                $volume = $itemsDB[$catId][$itemName];
                $total = $qty * $volume;
                $grandTotal += $total;
                $allItems[] = [
                    'name' => $itemName,
                    'qty' => $qty,
                    'volume' => $volume,
                    'total' => $total
                ];
            }
        }
    }

    if (empty($allItems)) {
        return '';
    }

    // Générer le HTML compact - une seule table
    $html = '<table border="0" style="font-size:9px; width:100%; border-collapse:collapse;">
        <thead>
            <tr>
                <th bgcolor="#1b4aad" style="color:#fff; padding:4px 6px; text-align:left; width:50%;"><strong>Article</strong></th>
                <th bgcolor="#1b4aad" style="color:#fff; padding:4px 6px; text-align:center; width:15%;"><strong>Qté</strong></th>
                <th bgcolor="#1b4aad" style="color:#fff; padding:4px 6px; text-align:right; width:15%;"><strong>Vol.</strong></th>
                <th bgcolor="#1b4aad" style="color:#fff; padding:4px 6px; text-align:right; width:20%;"><strong>Total</strong></th>
            </tr>
        </thead>
        <tbody>';

    foreach ($allItems as $item) {
        $html .= '<tr>
            <td style="padding:3px 6px; border-bottom:1px solid #ddd;">' . htmlspecialchars($item['name']) . '</td>
            <td style="padding:3px 6px; border-bottom:1px solid #ddd; text-align:center;">' . $item['qty'] . '</td>
            <td style="padding:3px 6px; border-bottom:1px solid #ddd; text-align:right;">' . number_format($item['volume'], 2, ',', '') . '</td>
            <td style="padding:3px 6px; border-bottom:1px solid #ddd; text-align:right;"><strong>' . number_format($item['total'], 2, ',', '') . '</strong></td>
        </tr>';
    }

    $html .= '<tr>
            <td colspan="3" style="background-color:#f5f5f5; padding:4px 6px; text-align:right;"><strong>Volume total :</strong></td>
            <td style="background-color:#1b4aad; color:#fff; padding:4px 6px; text-align:right;"><strong>' . number_format($grandTotal, 2, ',', ' ') . ' m³</strong></td>
        </tr>
    </tbody>
    </table>';

    return $html;
}
?>
