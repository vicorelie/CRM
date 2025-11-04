<?php
// updateMessage.php

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
if (
    !isset($input['id']) ||
    (!isset($input['message_content']) && !isset($input['page_display']))
) {
    http_response_code(400);
    echo json_encode(['error' => 'L\'ID du message et au moins un champ à mettre à jour sont requis.']);
    exit();
}

$message_id = intval($input['id']);
$fields = [];
$params = [':id' => $message_id, ':uuid' => $_SESSION['user_uuid']];

// Préparer les champs à mettre à jour
if (isset($input['message_content'])) {
    $fields[] = 'message_content = :message_content';
    $params[':message_content'] = trim($input['message_content']);
}

if (isset($input['page_display'])) {
    $fields[] = 'page_display = :page_display';
    $params[':page_display'] = trim($input['page_display']);
}

// S'assurer qu'il y a des champs à mettre à jour
if (empty($fields)) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucun champ à mettre à jour.']);
    exit();
}

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

    // Préparer la requête de mise à jour
    $sql = "UPDATE Message SET " . implode(', ', $fields) . " WHERE id = :id AND uuid = :uuid";
    $stmtUpdate = $pdo->prepare($sql);
    $stmtUpdate->execute($params);

    // Vérifier si la mise à jour a eu un effet
    if ($stmtUpdate->rowCount() > 0) {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Message mis à jour avec succès.']);
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
