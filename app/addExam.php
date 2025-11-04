<?php
// addExam.php

require 'config.php';
csrf_protect_post();

// Charger la langue
$lang = $_SESSION['lang'] ?? 'fr';
$lang_file = __DIR__ . "/lang/$lang.php";
if (file_exists($lang_file)) {
    require $lang_file; // => $lang_data
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

// Récupérer champs
$examName          = trim($_POST['exam_name'] ?? '');
$examDate          = trim($_POST['exam_date'] ?? '');
$examTime          = trim($_POST['exam_time'] ?? '');
$reminderEnabled   = isset($_POST['reminder_enabled']) ? 1 : 0;
$reminderTimeBefore= intval($_POST['reminder_time_before'] ?? 60);
$uuid              = $_SESSION['user_uuid'];

// Vérifier champs obligatoires
if ($examName === '' || $examDate === '' || $examTime === '') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $lang_data['all_required_fields'] ?? 'Tous les champs obligatoires doivent être remplis.'
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO exams (uuid, exam_name, exam_date, exam_time, reminder_enabled, reminder_time_before)
        VALUES (:uuid, :exam_name, :exam_date, :exam_time, :reminder_enabled, :reminder_time_before)
    ");
    $stmt->execute([
        ':uuid'                => $uuid,
        ':exam_name'           => $examName,
        ':exam_date'           => $examDate,
        ':exam_time'           => $examTime,
        ':reminder_enabled'    => $reminderEnabled,
        ':reminder_time_before'=> $reminderTimeBefore
    ]);

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => $lang_data['exam_saved_successfully'] ?? 'Examen enregistré avec succès.'
    ]);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $lang_data['exam_save_error'] ?? "Une erreur est survenue lors de l'enregistrement."
    ]);
}
exit;
