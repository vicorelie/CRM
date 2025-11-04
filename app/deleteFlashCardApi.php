<?php
// deleteFlashCardApi.php
session_start();
require 'config.php';
header('Content-Type: application/json; charset=utf-8');

// 1) Vérification de l’authentification
if (!isset($_SESSION['user_uuid'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Accès non autorisé.']);
    exit;
}

// 2) Récupérer et valider les paramètres
$subjectId = isset($_POST['subject_document_id']) ? (int)$_POST['subject_document_id'] : 0;
$index     = isset($_POST['card_index'])            ? (int)$_POST['card_index']            : -1;

if ($subjectId <= 0 || $index < 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Paramètres invalides.']);
    exit;
}

// 3) Charger la dernière ligne de flash cards
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
if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Aucune flash-card trouvée pour ce document.']);
    exit;
}

// 4) Décoder et vérifier l’index
$cards = json_decode($row['text_content'], true);
if (!is_array($cards) || !isset($cards[$index])) {
    http_response_code(400);
    echo json_encode(['error' => 'Index de carte invalide.']);
    exit;
}

// 5) Supprimer la carte et réindexer
unset($cards[$index]);
$cards = array_values($cards);
$newJson = json_encode($cards, JSON_UNESCAPED_UNICODE);

// 6) Mettre à jour la base (UPDATE si toujours des cartes, sinon DELETE)
if (count($cards) > 0) {
    $upd = $pdo->prepare("UPDATE documentFlash SET text_content = :json WHERE id = :id");
    $upd->execute([
        'json' => $newJson,
        'id'   => $row['id']
    ]);
} else {
    $del = $pdo->prepare("DELETE FROM documentFlash WHERE id = :id");
    $del->execute(['id' => $row['id']]);
}

// 7) Réponse succès
echo json_encode(['success' => true]);
