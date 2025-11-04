<?php
// deleteMessage.php

header('Content-Type: application/json');

// Inclure la configuration de la base de données
require 'config.php';

// Démarrer la session
session_start();

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Utilisateur non authentifié.']);
    exit();
}

// Récupérer les données JSON de la requête
$input = json_decode(file_get_contents('php://input'), true);

// Valider les données requises
if (!isset($input['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'L\'ID du message est requis.']);
    exit();
}

$message_id = intval($input['id']);

try {
    // Vérifier que le message appartient à l'utilisateur
    $stmtCheck = $pdo->prepare("
        SELECT id FROM Message 
        WHERE id = :id AND uuid = :uuid
    ");
    $stmtCheck->execute([':id' => $message_id, ':uuid' => $_SESSION['user_uuid']]);
    $message = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$message) {
        http_response_code(404);
        echo json_encode(['error' => 'Message non trouvé ou accès refusé.']);
        exit();
    }

    // Préparer la requête de suppression
    $stmtDelete = $pdo->prepare("
        DELETE FROM Message 
        WHERE id = :id AND uuid = :uuid
    ");
    $stmtDelete->execute([':id' => $message_id, ':uuid' => $_SESSION['user_uuid']]);

    // Vérifier si la suppression a eu un effet
    if ($stmtDelete->rowCount() > 0) {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Message supprimé avec succès.']);
    } else {
        // Aucun changement effectué
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Aucun changement effectué.']);
    }
} catch (PDOException $e) {
    // En cas d'erreur, répondre avec une erreur interne
    http_response_code(500);
    echo json_encode(['error' => 'Erreur interne du serveur.']);
}
?>
