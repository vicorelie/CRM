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

    // Mettre à jour l'enregistrement dans la table des custom fields
    $stmt = $conn->prepare("UPDATE vtiger_potentialscf
                            SET cf_volume_inventaire = ?,
                                cf_cartons_estimes = ?,
                                cf_inventaire_json = ?,
                                cf_volume_m3_estime = ?
                            WHERE potentialid = ?");

    if (!$stmt) {
        throw new Exception('Erreur de préparation de la requête: ' . $conn->error);
    }

    $stmt->bind_param('disdi', $volume, $boxes, $inventory, $volume, $recordId);

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
?>
