<?php
// askOpenai.php

// 1. Configuration initiale : désactiver l’affichage d’erreurs et forcer le JSON
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

// 2. Session & config
session_start();
require 'config.php';        // doit définir $pdo, OPENAI_API_KEY, OPENAI_MODEL_CHAT

// 3. Méthode et en-tête
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']);
    exit;
}
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Content-Type must be application/json']);
    exit;
}

// 4. Lecture et validation du JSON brut
$rawInput = file_get_contents('php://input');
$data     = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("askOpenai.php: JSON invalide - " . json_last_error_msg());
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'JSON invalide']);
    exit;
}

$question    = trim($data['question'] ?? '');
$aiId        = trim($data['ai_id']   ?? '');
$uuidPost    = trim($data['uuid']    ?? '');
$uuidSession = $_SESSION['user_uuid'] ?? '';

// 5. Vérifications basiques
if (empty($uuidSession) || $uuidPost !== $uuidSession) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non autorisé']);
    exit;
}
if ($question === '' || $aiId === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Paramètres manquants (question ou ai_id)']);
    exit;
}

// 6. Charger le contexte QCM depuis la BDD
try {
    $stmt = $pdo->prepare("
        SELECT questions, answers, explanation
        FROM documentQuestions
        WHERE ai_id = :ai_id
          AND uuid  = :uuid
        LIMIT 1
    ");
    $stmt->execute([':ai_id' => $aiId, ':uuid' => $uuidSession]);
    $ctxRow = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    error_log("askOpenai.php PDO error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur interne serveur']);
    exit;
}

if (!$ctxRow) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Contexte QCM introuvable']);
    exit;
}

// 7. Recomposer le contexte texte
$questionsArr    = json_decode($ctxRow['questions'],    true) ?: [];
$answersArr      = json_decode($ctxRow['answers'],      true) ?: [];
$explanationsArr = json_decode($ctxRow['explanation'], true) ?: [];

$contextText = "Contexte QCM :\n";
foreach ($questionsArr as $i => $q) {
    $num  = $i + 1;
    $questionText = $q['question'] ?? '';
    $contextText .= "\n{$num}. {$questionText}\n";
    $opts = $answersArr[$i]['options'] ?? [];
    foreach ($opts as $ltr => $optText) {
        $contextText .= "   {$ltr}) {$optText}\n";
    }
    $exp = $explanationsArr[$i] ?? '';
    if ($exp !== '') {
        $contextText .= "   Explication {$num} : {$exp}\n";
    }
}

// 8. Préparer la conversation pour l’API
$systemMessage = $contextText
    . "\nRépondez en vous basant uniquement sur ce contexte. "
    . "L’utilisateur pose la question suivante :\n\"{$question}\"";

$payload = [
    'model'       => defined('OPENAI_MODEL_CHAT') ? OPENAI_MODEL_CHAT : 'gpt-3.5-turbo',
    'messages'    => [
        ['role'=>'system', 'content'=>$systemMessage],
        ['role'=>'user',   'content'=>$question      ]
    ],
    'temperature' => 0.7,
    'max_tokens'  => 500,
];

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . OPENAI_API_KEY
    ],
    CURLOPT_POSTFIELDS     => json_encode($payload),
]);

$response = curl_exec($ch);
if (curl_errno($ch)) {
    $err = curl_error($ch);
    error_log("askOpenai.php cURL error: {$err}");
    http_response_code(502);
    echo json_encode(['success'=>false,'message'=>"Erreur cURL : {$err}"]);
    curl_close($ch);
    exit;
}
curl_close($ch);

// 9. Analyse de la réponse
$result = json_decode($response, true);
if (!isset($result['choices'][0]['message']['content'])) {
    error_log("askOpenai.php invalid API response: {$response}");
    http_response_code(502);
    echo json_encode(['success'=>false,'message'=>'Réponse invalide d’OpenAI']);
    exit;
}

$answer = trim($result['choices'][0]['message']['content']);

// 10. Retour JSON final
echo json_encode(['success'=>true,'answer'=>$answer]);
