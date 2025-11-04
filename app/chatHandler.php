<?php
// chatHandler.php

header('Content-Type: application/json');

// Vérifier que la requête est de type POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Méthode non autorisée.']);
    exit();
}

// Récupérer les données JSON de la requête
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['error' => 'Données JSON invalides.']);
    exit();
}

$document_id = $input['document_id'] ?? '';
$submit_id   = $input['submit_id'] ?? '';
$message     = trim($input['message'] ?? '');

if (empty($document_id) || empty($submit_id) || empty($message)) {
    echo json_encode(['error' => 'Paramètres manquants.']);
    exit();
}

// Inclure le fichier de configuration pour accéder à la clé API
require 'config.php';

// Optionnel : Valider l'utilisateur et les droits d'accès ici
session_start();
if (!isset($_SESSION['user_uuid'])) {
    echo json_encode(['error' => 'Utilisateur non authentifié.']);
    exit();
}

// Optionnel : Ajouter des logs ou des vérifications supplémentaires

// Construire le prompt pour ChatGPT
$prompt = "Je suis un étudiant qui a répondu au QCM avec l'ID de soumission {$submit_id} pour le document {$document_id}. Voici ma question concernant le QCM : {$message}";

// Préparer la requête à l'API OpenAI
$api_url = 'https://api.openai.com/v1/chat/completions'; // URL de l'API (vérifiez la version actuelle)
$api_key = OPENAI_API_KEY;

$data = [
    'model' => 'gpt-4', // Utilisez le modèle approprié
    'messages' => [
        ['role' => 'system', 'content' => 'Vous êtes un assistant utile pour répondre aux questions concernant les réponses d\'un QCM.'],
        ['role' => 'user', 'content' => $prompt]
    ],
    'max_tokens' => 150, // Ajustez selon vos besoins
    'temperature' => 0.7,
];

$options = [
    'http' => [
        'header'  => "Content-Type: application/json\r\n" .
                     "Authorization: Bearer {$api_key}\r\n",
        'method'  => 'POST',
        'content' => json_encode($data),
        'timeout' => 60, // Temps limite en secondes
    ],
];

$context  = stream_context_create($options);
$result = @file_get_contents($api_url, false, $context);

if ($result === FALSE) {
    echo json_encode(['error' => 'Erreur lors de la communication avec l\'API OpenAI.']);
    exit();
}

$response = json_decode($result, true);

if (isset($response['error'])) {
    echo json_encode(['error' => $response['error']['message'] ?? 'Erreur inconnue de l\'API.']);
    exit();
}

// Extraire la réponse de ChatGPT
$reply = $response['choices'][0]['message']['content'] ?? 'Désolé, je ne peux pas répondre à cela pour le moment.';

echo json_encode(['reply' => $reply]);
?>
