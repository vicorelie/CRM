<?php
/**
 * Endpoint de sauvegarde inventaire client - accès par token
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

    $row = $result->fetch_assoc();
    $recordId = intval($row['potential_id']);
    $stmt->close();

    // Récupérer les données POST
    $volume = isset($_POST['volume']) ? floatval($_POST['volume']) : 0;
    $volumeFinal = isset($_POST['volume_final']) ? floatval($_POST['volume_final']) : 0;
    $boxes = isset($_POST['boxes']) ? intval($_POST['boxes']) : 0;
    $inventory = isset($_POST['inventory']) ? $_POST['inventory'] : '{}';

    // Générer le HTML de l'inventaire
    $inventoryHTML = generateInventoryHTML($conn, json_decode($inventory, true));

    // Mettre à jour vtiger_potentialscf
    $stmt2 = $conn->prepare("UPDATE vtiger_potentialscf
                             SET cf_939 = ?,
                                 cf_1259 = ?,
                                 cf_963 = ?,
                                 cf_969 = ?,
                                 cf_965 = ?
                             WHERE potentialid = ?");

    if (!$stmt2) {
        throw new Exception('Erreur de préparation: ' . $conn->error);
    }

    $stmt2->bind_param('ddissi', $volume, $volumeFinal, $boxes, $inventory, $inventoryHTML, $recordId);

    if (!$stmt2->execute()) {
        throw new Exception('Erreur lors de la sauvegarde: ' . $stmt2->error);
    }

    $stmt2->close();
    $conn->close();

    echo json_encode(['success' => true, 'message' => 'Inventaire sauvegardé avec succès']);

} catch (Exception $e) {
    if (isset($conn)) $conn->close();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

/**
 * Génère le HTML de l'inventaire pour PDFMaker (format compact sans catégories)
 */
function generateInventoryHTML($conn, $inventory) {
    if (empty($inventory) || !is_array($inventory)) {
        return '';
    }

    $itemsResult = $conn->query("SELECT category, item_name, item_volume
                                FROM aridem_inventory_items
                                WHERE active = 1
                                ORDER BY category, sequence, item_name");

    $itemsDB = [];
    if ($itemsResult && $itemsResult->num_rows > 0) {
        while ($row = $itemsResult->fetch_assoc()) {
            $cat = $row['category'];
            if (!isset($itemsDB[$cat])) $itemsDB[$cat] = [];
            $itemsDB[$cat][$row['item_name']] = floatval($row['item_volume']);
        }
    }

    $allItems = [];
    $grandTotal = 0;

    foreach ($inventory as $catId => $catItems) {
        if (!isset($itemsDB[$catId])) continue;
        foreach ($catItems as $itemName => $qty) {
            if ($qty > 0 && isset($itemsDB[$catId][$itemName])) {
                $vol = $itemsDB[$catId][$itemName];
                $total = $qty * $vol;
                $grandTotal += $total;
                $allItems[] = ['name' => $itemName, 'qty' => $qty, 'volume' => $vol, 'total' => $total];
            }
        }
    }

    if (empty($allItems)) return '';

    $html = '<table border="0" style="font-size:9px; width:100%; border-collapse:collapse;">
        <thead>
            <tr>
                <th bgcolor="#1F314D" style="color:#fff; padding:4px 6px; text-align:left; width:50%;"><strong>Article</strong></th>
                <th bgcolor="#1F314D" style="color:#fff; padding:4px 6px; text-align:center; width:15%;"><strong>Qté</strong></th>
                <th bgcolor="#1F314D" style="color:#fff; padding:4px 6px; text-align:right; width:15%;"><strong>Vol.</strong></th>
                <th bgcolor="#1F314D" style="color:#fff; padding:4px 6px; text-align:right; width:20%;"><strong>Total</strong></th>
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
            <td colspan="3" bgcolor="#f5f5f5" style="padding:4px 6px; text-align:right;"><strong>Volume total :</strong></td>
            <td bgcolor="#1F314D" style="color:#fff; padding:4px 6px; text-align:right;"><strong>' . number_format($grandTotal, 2, ',', ' ') . ' m³</strong></td>
        </tr>
    </tbody>
    </table>';

    return $html;
}
