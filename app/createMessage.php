<?php
// createMessage.php

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
    !isset($input['message_content']) ||
    !isset($input['page_display'])
) {
    http_response_code(400);
    echo json_encode(['error' => 'Les champs message_content et page_display sont requis.']);
    exit();
}

$message_content = trim($input['message_content']);
$page_display = trim($input['page_display']);

// Optionnel : Valider la longueur ou le contenu des champs
if (empty($message_content) || empty($page_display)) {
    http_response_code(400);
    echo json_encode(['error' => 'Les champs message_content et page_display ne peuvent pas être vides.']);
    exit();
}

try {
    // Préparer la requête d'insertion
    $stmt = $pdo->prepare("
        INSERT INTO Message (uuid, message_content, page_display)
        VALUES (:uuid, :message_content, :page_display)
    ");

    // Exécuter la requête avec les paramètres
    $stmt->execute([
        ':uuid' => $_SESSION['user_uuid'],
        ':message_content' => $message_content,
        ':page_display' => $page_display
    ]);

    // Récupérer l'ID du message créé
    $message_id = $pdo->lastInsertId();

    // Répondre avec le succès et les détails du message
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Message créé avec succès.',
        'data' => [
            'id' => $message_id,
            'uuid' => $_SESSION['user_uuid'],
            'message_content' => $message_content,
            'page_display' => $page_display,
            'created_time' => date('Y-m-d H:i:s')
        ]
    ]);
} catch (PDOException $e) {
    // En cas d'erreur, répondre avec une erreur interne
    http_response_code(500);
    echo json_encode(['error' => 'Erreur interne du serveur.']);
}
?>
