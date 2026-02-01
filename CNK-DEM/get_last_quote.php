<?php
/**
 * Récupère le dernier devis créé pour une affaire donnée
 */
chdir(dirname(__FILE__));
require_once 'config.inc.php';

header('Content-Type: application/json; charset=utf-8');

$potentialId = isset($_GET['potential_id']) ? intval($_GET['potential_id']) : 0;

if ($potentialId <= 0) {
    echo json_encode(['success' => false, 'error' => 'ID affaire invalide']);
    exit;
}

try {
    $conn = new mysqli($dbconfig['db_server'], $dbconfig['db_username'], $dbconfig['db_password'], $dbconfig['db_name']);

    if ($conn->connect_error) {
        throw new Exception('Erreur de connexion: ' . $conn->connect_error);
    }

    // Récupérer le dernier devis créé pour cette affaire
    $query = "SELECT q.quoteid, q.quote_no, q.subject, c.createdtime
              FROM vtiger_quotes q
              INNER JOIN vtiger_crmentity c ON c.crmid = q.quoteid
              WHERE q.potentialid = ? AND c.deleted = 0
              ORDER BY c.createdtime DESC
              LIMIT 1";

    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $potentialId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        echo json_encode([
            'success' => true,
            'quote_id' => $row['quoteid'],
            'quote_no' => $row['quote_no'],
            'subject' => $row['subject'],
            'created' => $row['createdtime']
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Aucun devis trouvé']);
    }

    $conn->close();
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
