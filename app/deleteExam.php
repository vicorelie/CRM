<?php
// deleteExam.php

require 'config.php';
csrf_protect_post();

// Charger la langue
$lang = $_SESSION['lang'] ?? 'fr';
$lang_file = __DIR__ . "/lang/$lang.php";
if (file_exists($lang_file)) {
    require $lang_file;
} else {
    require __DIR__ . '/lang/fr.php';
}

// Vérifier connexion
if (!isset($_SESSION['user_uuid'])) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $lang_data['unauthorized_access'] ?? 'Accès non autorisé.'
    ]);
    exit;
}

// exam_id
$examId = intval($_POST['exam_id'] ?? 0);
if ($examId <= 0) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $lang_data['invalid_exam_id'] ?? 'ID examen invalide.'
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        DELETE FROM exams 
         WHERE id   = :exam_id
           AND uuid = :uuid
    ");
    $stmt->execute([
        ':exam_id' => $examId,
        ':uuid'    => $_SESSION['user_uuid']
    ]);

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => $lang_data['exam_deleted_successfully'] ?? 'Examen supprimé avec succès.'
    ]);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $lang_data['exam_delete_error'] ?? "Une erreur est survenue lors de la suppression."
    ]);
}
exit;
