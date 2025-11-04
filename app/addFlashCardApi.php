<?php
// addFlashCardApi.php
session_start();
require 'config.php';
header('Content-Type: application/json; charset=utf-8');

// 1) Vérification authentification
if (!isset($_SESSION['user_uuid'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Accès non autorisé.']);
    exit;
}

// 2) Récupérer les champs
$subjectId = isset($_POST['subject_document_id']) ? (int)$_POST['subject_document_id'] : 0;
$recto     = trim($_POST['recto'] ?? '');
$verso     = trim($_POST['verso'] ?? '');

// 3) Valider
if ($subjectId <= 0 || $recto === '' || $verso === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Champs manquants.']);
    exit;
}

// 4) Tenter de charger la ligne existante
$stmt = $pdo->prepare("
    SELECT id, text_content
    FROM documentFlash
    WHERE subject_document_id = :sid
      AND uuid = :uuid
    ORDER BY created_time DESC
    LIMIT 1
");
$stmt->execute([
    'sid'  => $subjectId,
    'uuid' => $_SESSION['user_uuid']
]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

// 5) Construire le tableau de cartes
if ($row) {
    $cards = json_decode($row['text_content'], true);
    if (!is_array($cards)) {
        $cards = [];
    }
} else {
    $cards = [];
}

// 6) Ajouter la nouvelle carte
$cards[] = ['recto' => $recto, 'verso' => $verso];
$newJson = json_encode($cards, JSON_UNESCAPED_UNICODE);

// 7) Persister : UPDATE si existant, sinon INSERT
if ($row) {
    $upd = $pdo->prepare("UPDATE documentFlash SET text_content = :json WHERE id = :id");
    $upd->execute([
        'json' => $newJson,
        'id'   => $row['id']
    ]);
} else {
    $ins = $pdo->prepare("
        INSERT INTO documentFlash
          (uuid, created_time, subject_document_id, text_content, openaiCost)
        VALUES
          (:uuid, NOW(), :sid, :json, 0)
    ");
    $ins->execute([
        'uuid' => $_SESSION['user_uuid'],
        'sid'  => $subjectId,
        'json' => $newJson
    ]);
}

// 8) Répondre OK
echo json_encode([
    'success' => true,
    'recto'   => $recto,
    'verso'   => $verso
]);
