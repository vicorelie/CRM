<?php
// editExam.php

require 'config.php';
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

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

// Champs
$examId             = intval($_POST['exam_id'] ?? 0);
$examName           = trim($_POST['exam_name'] ?? '');
$examDate           = trim($_POST['exam_date'] ?? '');
$examTime           = trim($_POST['exam_time'] ?? '');
$reminderEnabled    = isset($_POST['reminder_enabled']) ? 1 : 0;
$reminderTimeBefore = intval($_POST['reminder_time_before'] ?? 60);

// Vérif
if ($examId <= 0 || $examName === '' || $examDate === '' || $examTime === '') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false, 
        'message' => $lang_data['all_required_fields'] ?? 'Tous les champs obligatoires doivent être remplis.'
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        UPDATE exams 
           SET exam_name           = :exam_name,
               exam_date           = :exam_date,
               exam_time           = :exam_time,
               reminder_enabled    = :reminder_enabled,
               reminder_time_before= :reminder_time_before
         WHERE id   = :exam_id
           AND uuid = :uuid
    ");
    $stmt->execute([
        ':exam_name'           => $examName,
        ':exam_date'           => $examDate,
        ':exam_time'           => $examTime,
        ':reminder_enabled'    => $reminderEnabled,
        ':reminder_time_before'=> $reminderTimeBefore,
        ':exam_id'             => $examId,
        ':uuid'                => $_SESSION['user_uuid']
    ]);

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true, 
        'message' => $lang_data['exam_updated_successfully'] ?? 'Examen modifié avec succès.'
    ]);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $lang_data['exam_update_error'] ?? "Une erreur est survenue lors de la modification."
    ]);
}
exit;
