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
                                cf_963 = ?,
                                cf_969 = ?,
                                cf_965 = ?
                            WHERE potentialid = ?");

    if (!$stmt) {
        throw new Exception('Erreur de préparation de la requête: ' . $conn->error);
    }

    $stmt->bind_param('dissi', $volume, $boxes, $inventory, $inventoryHTML, $recordId);

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
 * Génère le HTML de l'inventaire pour PDFMaker
 */
function generateInventoryHTML($conn, $inventory) {
    if (empty($inventory) || !is_array($inventory)) {
        return '';
    }

    // Charger les items depuis la base de données avec leurs volumes
    $itemsResult = $conn->query("SELECT category, category_label, item_name, item_volume
                                FROM aridem_inventory_items
                                WHERE active = 1
                                ORDER BY category, sequence, item_name");

    $itemsDB = [];
    $categoriesInfo = [];

    if ($itemsResult && $itemsResult->num_rows > 0) {
        while ($row = $itemsResult->fetch_assoc()) {
            $cat = $row['category'];
            if (!isset($itemsDB[$cat])) {
                $itemsDB[$cat] = [];
                $categoriesInfo[$cat] = [
                    'label' => $row['category_label']
                ];
            }
            $itemsDB[$cat][$row['item_name']] = floatval($row['item_volume']);
        }
    }

    // Générer le HTML
    $html = '';
    $position = 1;

    foreach ($inventory as $catId => $catItems) {
        if (!isset($categoriesInfo[$catId])) {
            continue;
        }

        $catInfo = $categoriesInfo[$catId];
        $catItemsWithData = [];

        // Collecter les items avec leurs données
        foreach ($catItems as $itemName => $qty) {
            if ($qty > 0 && isset($itemsDB[$catId][$itemName])) {
                $volume = $itemsDB[$catId][$itemName];
                $catItemsWithData[] = [
                    'name' => $itemName,
                    'qty' => $qty,
                    'volume' => $volume,
                    'total' => $qty * $volume
                ];
            }
        }

        if (count($catItemsWithData) > 0) {
            $html .= '<table border="0" style="font-size:10px; margin-bottom: 20px; width:100%; border-collapse:collapse;">
                <thead>
                    <tr>
                        <th bgcolor="#BDB9B9" style="width:5%; color:#000000; font-weight:600; padding:10px; border-right:2px solid white; text-align:center;">&nbsp;</th>
                        <th bgcolor="#BDB9B9" style="text-align: left; width:45%; color:#000000; font-weight:600; padding:10px; border-right:2px solid white;"><strong>' . htmlspecialchars($catInfo['label']) . '</strong></th>
                        <th bgcolor="#BDB9B9" style="width:15%; color:#000000; font-weight:600; padding:10px; border-right:2px solid white; text-align:center;"><strong>Volume/unité</strong></th>
                        <th bgcolor="#BDB9B9" style="width:15%; color:#000000; font-weight:600; padding:10px; border-right:2px solid white; text-align:center;"><strong>Quantité</strong></th>
                        <th bgcolor="#BDB9B9" style="width:15%; color:#000000; font-weight:600; padding:10px; text-align:center;"><strong>Total</strong></th>
                    </tr>
                </thead>
                <tbody>';

            $catTotal = 0;
            foreach ($catItemsWithData as $item) {
                $catTotal += $item['total'];
                $html .= '<tr>
                    <td bgcolor="#BDB9B9" style="padding:10px; border-bottom:2px solid white; text-align:center;">' . $position++ . '</td>
                    <td bgcolor="#EEEEEE" style="text-align:left; padding:10px; border-bottom:2px solid white;">' . htmlspecialchars($item['name']) . '</td>
                    <td bgcolor="#EEEEEE" style="text-align:right; padding:10px; border-bottom:2px solid white;">' . number_format($item['volume'], 3, ',', ' ') . ' m³</td>
                    <td bgcolor="#EEEEEE" style="text-align:center; padding:10px; border-bottom:2px solid white;">' . $item['qty'] . '</td>
                    <td bgcolor="#EEEEEE" style="text-align:right; padding:10px; border-bottom:2px solid white;"><strong>' . number_format($item['total'], 3, ',', ' ') . ' m³</strong></td>
                </tr>';
            }

            $html .= '<tr>
                    <td colspan="5" bgcolor="white" style="padding:10px; border-bottom:2px solid white;">&nbsp;</td>
                </tr>
                <tr>
                    <td colspan="4" bgcolor="white" style="padding:10px; border-bottom:1px solid #BDB9B9; text-align:left;"><strong>Volume total</strong></td>
                    <td bgcolor="#BDB9B9" style="padding:10px; border-bottom:2px solid #BDB9B9; text-align:right;"><strong>' . number_format($catTotal, 2, ',', ' ') . ' m³</strong></td>
                </tr>
            </tbody>
        </table>';
        }
    }

    return $html;
}
?>
