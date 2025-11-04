<?php
// dashboard.php

session_start();
require 'config.php';
requireSubscription($pdo);

require_once 'vendor/autoload.php';

// Inclure le header (qui doit normalement inclure Bootstrap CSS/JS)
include 'includes/header.php';

use Ramsey\Uuid\Uuid;

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

/**
 * Fonction helper pour formater le temps restant avant un examen
 */
function getTimeUntil($examDate, $examTime) {
    global $lang_data;

    $time_in   = $lang_data['time_in']   ?? 'dans';
    $and       = $lang_data['and']       ?? 'et';
    $week      = $lang_data['week']      ?? 'semaine';
    $weeks     = $lang_data['weeks']     ?? 'semaines';
    $day       = $lang_data['day']       ?? 'jour';
    $days      = $lang_data['days']      ?? 'jours';
    $hour      = $lang_data['hour']      ?? 'heure';
    $hours     = $lang_data['hours']     ?? 'heures';
    $minute    = $lang_data['minute']    ?? 'minute';
    $minutes   = $lang_data['minutes']   ?? 'minutes';
    $finished  = $lang_data['finished']  ?? 'Terminé';

    $now = new DateTime();
    $examDateTime = new DateTime("$examDate $examTime");
    $interval = $now->diff($examDateTime);

    if ($interval->invert === 1) {
        return $finished;
    }
    // Plus d'une semaine
    if ($interval->d >= 7) {
        $w = floor($interval->d / 7);
        $d = $interval->d % 7;
        $out = "$time_in $w " . ($w > 1 ? $weeks : $week);
        if ($d > 0) {
            $out .= " $and $d " . ($d > 1 ? $days : $day);
        }
        return $out;
    }
    // Entre 1 et 6 jours
    elseif ($interval->d >= 1) {
        $out = "$time_in {$interval->d} " . ($interval->d > 1 ? $days : $day);
        if ($interval->h > 0) {
            $out .= " $and {$interval->h} " . ($interval->h > 1 ? $hours : $hour);
        }
        return $out;
    }
    // Moins de 24h
    else {
        if ($interval->h >= 1) {
            $out = "$time_in {$interval->h} " . ($interval->h > 1 ? $hours : $hour);
            if ($interval->i > 0) {
                $out .= " $and {$interval->i} " . ($interval->i > 1 ? $minutes : $minute);
            }
            return $out;
        } else {
            if ($interval->i > 0) {
                return "$time_in {$interval->i} " . ($interval->i > 1 ? $minutes : $minute);
            } else {
                return $finished;
            }
        }
    }
}

// Vérifier la connexion
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Messages d'upload
$uploadSuccess = $_GET['uploadSuccess'] ?? '';
$uploadError   = isset($_GET['uploadError']) ? htmlspecialchars($_GET['uploadError']) : '';

// Récupérer infos utilisateur
try {
    $stmtUser = $pdo->prepare("SELECT username, subscription_status FROM Users WHERE uuid = :uuid");
    $stmtUser->execute([':uuid' => $_SESSION['user_uuid']]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);
    if ($user) {
        $username           = htmlspecialchars($user['username']);
        $subscriptionStatus = htmlspecialchars($user['subscription_status']);
    } else {
        header('Location: login.php');
        exit();
    }
} catch (PDOException $e) {
    $username           = $lang_data['user_default'] ?? 'Utilisateur';
    $subscriptionStatus = $lang_data['subscription_inactive'] ?? 'Inactif';
}

// Récupération de stats
try {
    // Documents
    $stmtDocs = $pdo->prepare("SELECT COUNT(*) FROM subjectDocuments WHERE uuid = :uuid");
    $stmtDocs->execute([':uuid' => $_SESSION['user_uuid']]);
    $countDocs = $stmtDocs->fetchColumn();

    // QCM
    $stmtQcm = $pdo->prepare("SELECT COUNT(*) FROM documentQuestions WHERE uuid = :uuid");
    $stmtQcm->execute([':uuid' => $_SESSION['user_uuid']]);
    $countQcm = $stmtQcm->fetchColumn();

    // Résumés
    $stmtResumes = $pdo->prepare("SELECT COUNT(*) FROM documentResumes WHERE uuid = :uuid");
    $stmtResumes->execute([':uuid' => $_SESSION['user_uuid']]);
    $countResumes = $stmtResumes->fetchColumn();

    // Flash
    $stmtFlash = $pdo->prepare("SELECT COUNT(*) FROM documentFlash WHERE uuid = :uuid");
    $stmtFlash->execute([':uuid' => $_SESSION['user_uuid']]);
    $countFlash = $stmtFlash->fetchColumn();

    // Pairs
    $stmtPairs = $pdo->prepare("SELECT COUNT(*) FROM documentPairs WHERE uuid = :uuid");
    $stmtPairs->execute([':uuid' => $_SESSION['user_uuid']]);
    $countPairs = $stmtPairs->fetchColumn();

    // Miss
    $stmtMiss = $pdo->prepare("SELECT COUNT(*) FROM documentMiss WHERE uuid = :uuid");
    $stmtMiss->execute([':uuid' => $_SESSION['user_uuid']]);
    $countMiss = $stmtMiss->fetchColumn();

    // Miss
    $stmtTrueFalse = $pdo->prepare("SELECT COUNT(*) FROM documentTrueFalse WHERE uuid = :uuid");
    $stmtTrueFalse->execute([':uuid' => $_SESSION['user_uuid']]);
    $countTrueFalse = $stmtTrueFalse->fetchColumn();
    
    // Note moyenne
    $stmtAverage = $pdo->prepare("SELECT COALESCE(AVG((submitNote / (LENGTH(submitAnswer) - LENGTH(REPLACE(submitAnswer, ',', '')) + 1)) * 100), 0) FROM qcmSubmit WHERE uuid = :uuid");
    $stmtAverage->execute([':uuid' => $_SESSION['user_uuid']]);
    $averageNote = round($stmtAverage->fetchColumn(), 2);

} catch (PDOException $e) {
    $countDocs = $countQcm = $countResumes = $averageNote = 0;
}

// Gestion du message d'accueil (motivation, etc.)
try {
    switch ($subscriptionStatus) {
        case 'pending':
            $expectedMessage = $lang_data['subscription_pending'] ?? "Actuellement vous n'êtes pas abonné.";
            break;
        case 'suspended':
            $expectedMessage = $lang_data['subscription_suspended'] ?? "Votre compte est suspendu.";
            break;
        case 'active':
            $motivationalPhrases = $lang_data['motivational_phrases'] ?? [];
            if (!empty($motivationalPhrases)) {
                $expectedMessage = $motivationalPhrases[array_rand($motivationalPhrases)];
            } else {
                $expectedMessage = "Merci de votre confiance. Étudiez bien !";
            }
            break;
        default:
            $expectedMessage = $lang_data['welcome_dashboard'] ?? "Bienvenue sur votre tableau de bord.";
    }

    $stmtMessage = $pdo->prepare("
        SELECT id, message_content
          FROM Message
         WHERE uuid = :uuid
           AND page_display = 'dashboard'
         ORDER BY created_time DESC
         LIMIT 1
    ");
    $stmtMessage->execute([':uuid' => $_SESSION['user_uuid']]);
    $existingMessage = $stmtMessage->fetch(PDO::FETCH_ASSOC);

    if ($existingMessage) {
        if (trim($existingMessage['message_content']) !== $expectedMessage) {
            $stmtUpdate = $pdo->prepare("
                UPDATE Message
                   SET message_content = :msg,
                       created_time = NOW()
                 WHERE id = :id
            ");
            $stmtUpdate->execute([
                ':msg' => $expectedMessage,
                ':id'  => $existingMessage['id']
            ]);
        }
    } else {
        $stmtCreate = $pdo->prepare("
            INSERT INTO Message (uuid, message_content, page_display, created_time)
            VALUES (:uuid, :msg, 'dashboard', NOW())
        ");
        $stmtCreate->execute([
            ':uuid' => $_SESSION['user_uuid'],
            ':msg'  => $expectedMessage
        ]);
    }
} catch (PDOException $e) {
    // Optionnel
}

// Récupérer le message final
try {
    $stmtMessages = $pdo->prepare("
        SELECT message_content
          FROM Message
         WHERE uuid = :uuid
           AND page_display = 'dashboard'
         ORDER BY created_time DESC
    ");
    $stmtMessages->execute([':uuid' => $_SESSION['user_uuid']]);
    $messages = $stmtMessages->fetchAll(PDO::FETCH_COLUMN);
} catch (PDOException $e) {
    $messages = [];
}

// Récup examen futurs
try {
    $stmtUpcoming = $pdo->prepare("
        SELECT *
          FROM exams
         WHERE uuid = :uuid
           AND CONCAT(exam_date, ' ', exam_time) >= NOW()
         ORDER BY exam_date, exam_time ASC
    ");
    $stmtUpcoming->execute([':uuid' => $_SESSION['user_uuid']]);
    $upcomingExams = $stmtUpcoming->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $upcomingExams = [];
}

// Gérer la direction (RTL si hébreu, etc.)
$currentLang = $_SESSION['lang'] ?? 'he';
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($currentLang) ?>" dir="<?= in_array($currentLang, ['he', 'ar']) ? 'rtl' : 'ltr' ?>">
<head>
    <meta charset="UTF-8">
    <title><?= $lang_data['dashboard_title'] ?? 'Dashboard - Statistiques' ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Flatpickr CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <!-- SweetAlert2 (CDN) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <!-- Styles persos -->
    <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body class="list-container">
    <div style="background: url('assets/img/bg-empty.png') center/cover no-repeat;">
        <div class="container py-5">
        <div class="welcome-message text-center mb-4">
                        <h1><?= sprintf($lang_data['welcome_message'] ?? 'Bienvenue, %s !', $username) ?></h1>
                        <h6>
                            <?php if (!empty($messages)): ?>
                                <p><?= htmlspecialchars($messages[0]) ?></p>
                            <?php else: ?>
                                <p><?= $lang_data['default_dashboard_message'] ?? '' ?></p>
                            <?php endif; ?>
                        </h6>
                    </div>
            <div class="row">
                <!-- Colonne de gauche : Message de bienvenue et image -->
                <div class="col-md-6">

                    <!-- Card "Examens à venir" -->
                    <div id="upcomingExamsContainer" class="mb-4">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="dashboard-card-title mb-0">
                                    <i class="bi bi-calendar-event-fill"></i>
                                    <?= $lang_data['upcoming_exams_title'] ?? 'Examens à venir' ?>
                                </h5>
                                <!-- Bouton pour ajouter un examen -->
                                <button type="button" class="btn btn-link p-0" data-bs-toggle="modal" data-bs-target="#addExamModal" title="<?= $lang_data['add_exam'] ?? 'Ajouter un examen' ?>">
                                    <i class="bi bi-plus-circle add-exam-icon"></i>
                                </button>
                            </div>
                            <a class="view-more-link" data-bs-toggle="modal" data-bs-target="#allExamsModal" style="text-decoration:none;color:inherit;">
                                <div class="dashboard-card-body">
                                    <?php if (!empty($upcomingExams)): ?>
                                        <?php
                                        $futureExams = array_filter($upcomingExams, function($exam) {
                                            return strtotime($exam['exam_date'] . ' ' . $exam['exam_time']) >= time();
                                        });
                                        $displayExams = array_slice($futureExams, 0, 3);
                                        ?>
                                        <?php if (!empty($displayExams)): ?>
                                            <ul class="list-group" style="text-decoration:none;color:#415560;">
                                                <?php foreach ($displayExams as $exam): ?>
                                                    <li class="d-flex justify-content-between align-items-center">
                                                        <span>
                                                            <strong><?= htmlspecialchars($exam['exam_name']) ?></strong>
                                                        </span>
                                                        <span class="text-muted">
                                                            <?= getTimeUntil($exam['exam_date'], $exam['exam_time']) ?>
                                                        </span>
                                                    </li>
                                                <?php endforeach; ?>
                                            </ul>
                                            <?php if (count($futureExams) > 3): ?>
                                                <div class="mt-2 text-end">
                                                    <a class="view-more-link" data-bs-toggle="modal" data-bs-target="#allExamsModal">
                                                        <?= $lang_data['view_all_exams'] ?? 'Voir plus' ?>
                                                        <i class="bi bi-chevron-down"></i>
                                                    </a>
                                                </div>
                                            <?php endif; ?>
                                        <?php else: ?>
                                            <p class="no-data-message">
                                                <?= htmlspecialchars($lang_data['no_upcoming_exams'] ?? 'Aucun examen à venir.') ?>
                                            </p>
                                        <?php endif; ?>
                                    <?php else: ?>
                                        <p class="no-data-message">
                                            <?= htmlspecialchars($lang_data['no_upcoming_exams'] ?? 'Aucun examen à venir.') ?>
                                        </p>
                                    <?php endif; ?>
                                </div>
                            </a>
                        </div>
                    </div>
                    <!-- Image de bienvenue, ajustez le chemin et l'attribut alt au besoin -->
                    <div class="text-center">
                        <img style="max-height:404px;" src="assets/img/home-first-section.png" alt="<?= $lang_data['dashboard_title'] ?? 'Image de bienvenue' ?>" class="img-fluid">
                    </div>
                    
                </div>

                <!-- Colonne de droite : Cards -->
                <div class="col-md-6">
                    


                    <!-- Card "My Study Area" -->
                    <div class="row">
                    <div class="col-md-12 mb-4">
                        <a href="studyList.php">
                            <div class="card fixed-height-card shadow-sm card-overlap text-center" >
                                <div class="card-body d-flex align-items-center justify-content-center" style="background-color: #0097B2;">
                                    <div class="icon me-3">
                                        <img src="assets/img/study-area2.png" alt="<?= $lang_data['my_study_area'] ?? 'my study area' ?>">
                                    </div>
                                    <div style="color: #fff;">
                                        <h5 class="card-title mb-0 text-white"><?= $lang_data['my_study_area'] ?? 'my study area' ?></h5>
                                        <h2 class="card-text text-white"><?= $countDocs ?></h2>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>

                    <!-- Les 6 cards en grille : Quiz, Summary, Pairs, Miss, Flash, Statistics -->
                    <div class="col-6 col-md-4 mb-4">
                        <a href="quizList.php">
                            <div class="card text-center h-100 shadow-sm card-overlap">
                                <div class="card-body d-flex flex-column justify-content-center">
                                    <div class="icon mb-2">
                                        <img src="assets/img/home-quizz-section.png" alt="<?= $lang_data['quiz'] ?? 'quiz' ?>">
                                    </div>
                                    <h5 class="card-title"><?= $lang_data['quiz'] ?? 'quiz' ?></h5>
                                    <h2 class="card-text"><?= $countQcm ?></h2>
                                </div>
                            </div>
                        </a>
                    </div>

                    <div class="col-6 col-md-4 mb-4">
                        <a href="summaryList.php">
                            <div class="card text-center h-100 shadow-sm card-overlap">
                                <div class="card-body d-flex flex-column justify-content-center">
                                    <div class="icon mb-2">
                                        <img src="assets/img/home-summary-section.png" alt="<?= $lang_data['summary'] ?? 'summary' ?>">
                                    </div>
                                    <h5 class="card-title"><?= $lang_data['summary'] ?? 'summary' ?></h5>
                                    <h2 class="card-text"><?= $countResumes ?></h2>
                                </div>
                            </div>
                        </a>
                    </div>

                    <div class="col-6 col-md-4 mb-4">
                        <a href="pairsList.php">
                            <div class="card text-center h-100 shadow-sm card-overlap">
                                <div class="card-body d-flex flex-column justify-content-center">
                                    <div class="icon mb-2">
                                        <img src="assets/img/home-pairs-section.png" alt="<?= $lang_data['pairs'] ?? 'pairs' ?>">
                                    </div>
                                    <h5 class="card-title"><?= $lang_data['pairs'] ?? 'pairs' ?></h5>
                                    <h2 class="card-text"><?= $countPairs ?></h2>
                                </div>
                            </div>
                        </a>
                    </div>

                    <div class="col-6 col-md-4 mb-4">
                        <a href="missList.php">
                            <div class="card text-center h-100 shadow-sm card-overlap">
                                <div class="card-body d-flex flex-column justify-content-center">
                                    <div class="icon mb-2">
                                        <img src="assets/img/home-miss-section.png" alt="<?= $lang_data['miss'] ?? 'miss' ?>">
                                    </div>
                                    <h5 class="card-title"><?= $lang_data['miss'] ?? 'miss' ?></h5>
                                    <h2 class="card-text"><?= $countMiss ?></h2>
                                </div>
                            </div>
                        </a>
                    </div>

                    <div class="col-6 col-md-4 mb-4">
                        <a href="flashList.php">
                            <div class="card text-center h-100 shadow-sm card-overlap">
                                <div class="card-body d-flex flex-column justify-content-center">
                                    <div class="icon mb-2">
                                        <img src="assets/img/home-flash-section.png" alt="<?= $lang_data['flash'] ?? 'flash' ?>">
                                    </div>
                                    <h5 class="card-title"><?= $lang_data['flash'] ?? 'flash' ?></h5>
                                    <h2 class="card-text"><?= $countFlash ?></h2>
                                </div>
                            </div>
                        </a>
                    </div>

                    <!-- <div class="col-6 col-md-4 mb-4">
                        <a href="statistics.php">
                            <div class="card text-center h-100 shadow-sm card-overlap">
                                <div class="card-body d-flex flex-column justify-content-center">
                                    <div class="icon mb-2">
                                        <img src="assets/img/home-statistics-section-2.png" alt="<?= $lang_data['statistics'] ?? 'statistics' ?>">
                                    </div>
                                    <h5 class="card-title"><?= $lang_data['statistics'] ?? 'statistics' ?></h5>
                                    <h2 class="card-text"><?= $averageNote ?></h2>
                                </div>
                            </div>
                        </a>
                    </div> -->
                    <div class="col-6 col-md-4 mb-4">
                        <a href="trueFalseList.php">
                            <div class="card text-center h-100 shadow-sm card-overlap">
                                <div class="card-body d-flex flex-column justify-content-center">
                                    <div class="icon mb-2">
                                        <img src="assets/img/home-true-false-section.png" alt="<?= $lang_data['truefalse'] ?? 'true/false' ?>">
                                    </div>
                                    <h5 class="card-title"><?= $lang_data['truefalse'] ?? 'true/false' ?></h5>
                                    <h2 class="card-text"><?= $countTrueFalse ?></h2>
                                </div>
                            </div>
                        </a>
                    </div>
                    </div>
                </div>
            </div><!-- fin row -->
        </div><!-- fin container -->
    </div><!-- fin wrapper background -->

    <!-- MODAL Ajouter un examen -->
    <div class="modal fade" id="addExamModal" tabindex="-1" aria-labelledby="addExamModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <form id="addExamForm" action="addExam.php" method="POST">
                    <div class="modal-header">
                        <h5 class="modal-title" id="addExamModalLabel">
                            <?= $lang_data['add_exam'] ?? 'Ajouter un examen' ?>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= $lang_data['close'] ?? 'Fermer' ?>"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="exam_name" class="form-label">
                                <?= $lang_data['exam_name'] ?? 'Nom de l\'examen' ?>
                            </label>
                            <input type="text" class="form-control" id="exam_name" name="exam_name" required>
                        </div>
                        <div class="mb-3">
                            <label for="exam_date" class="form-label">
                                <?= $lang_data['select_date'] ?? 'Sélectionner une date' ?>
                            </label>
                            <input type="text" class="form-control" id="exam_date" name="exam_date" required readonly>
                        </div>
                        <div class="mb-3">
                            <label for="exam_time" class="form-label">
                                <?= $lang_data['select_time'] ?? 'Sélectionner une heure' ?>
                            </label>
                            <input type="text" class="form-control" id="exam_time" name="exam_time" required readonly>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="reminder_enabled" name="reminder_enabled" checked>
                            <label class="form-check-label" for="reminder_enabled">
                                <?= $lang_data['enable_reminder'] ?? 'Activer le rappel' ?>
                            </label>
                        </div>
                        <div class="mb-3">
                            <label for="reminder_time_before" class="form-label">
                                <?= $lang_data['reminder_time_before'] ?? 'Temps avant l\'examen (minutes)' ?>
                            </label>
                            <input type="number" class="form-control" id="reminder_time_before" name="reminder_time_before" value="60" min="1">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <?= $lang_data['close'] ?? 'Fermer' ?>
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <?= $lang_data['save_exam'] ?? 'Enregistrer l\'examen' ?>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL Tous les examens -->
    <div class="modal fade" id="allExamsModal" tabindex="-1" aria-labelledby="allExamsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="allExamsModalLabel">
                        <?= $lang_data['upcoming_exams_title'] ?? 'Examens à venir' ?>
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= $lang_data['close'] ?? 'Fermer' ?>"></button>
                </div>
                <div class="modal-body" id="allExamsContent">
                    <?php if (!empty($upcomingExams)): ?>
                        <ul class="list-group">
                            <?php foreach ($upcomingExams as $exam): ?>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <span>
                                        <strong><?= htmlspecialchars($exam['exam_name']) ?></strong> - 
                                        <?= getTimeUntil($exam['exam_date'], $exam['exam_time']) ?>
                                    </span>
                                    <span>
                                        <a href="#" class="text-primary me-2 edit-exam"
                                           data-id="<?= $exam['id'] ?>"
                                           data-exam_name="<?= htmlspecialchars($exam['exam_name'], ENT_QUOTES) ?>"
                                           data-exam_date="<?= $exam['exam_date'] ?>"
                                           data-exam_time="<?= $exam['exam_time'] ?>"
                                           data-reminder_enabled="<?= $exam['reminder_enabled'] ?>"
                                           data-reminder_time_before="<?= $exam['reminder_time_before'] ?>"
                                           title="<?= $lang_data['edit'] ?? 'Modifier' ?>"
                                        >
                                            <i class="bi bi-pencil"></i>
                                        </a>
                                        <a href="#" class="text-danger delete-exam"
                                           data-id="<?= $exam['id'] ?>"
                                           title="<?= $lang_data['delete'] ?? 'Supprimer' ?>"
                                        >
                                            <i class="bi bi-trash"></i>
                                        </a>
                                    </span>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php else: ?>
                        <p><?= $lang_data['no_upcoming_exams'] ?? 'Aucun examen à venir.' ?></p>
                    <?php endif; ?>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <?= $lang_data['close'] ?? 'Fermer' ?>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL Éditer un examen -->
    <div class="modal fade" id="editExamModal" tabindex="-1" aria-labelledby="editExamModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <form id="editExamForm" action="editExam.php" method="POST">
                    <div class="modal-header">
                        <h5 class="modal-title" id="editExamModalLabel">
                            <?= $lang_data['edit_exam'] ?? 'Modifier l\'examen' ?>
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= $lang_data['close'] ?? 'Fermer' ?>"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="edit_exam_id" name="exam_id">
                        <div class="mb-3">
                            <label for="edit_exam_name" class="form-label">
                                <?= $lang_data['exam_name'] ?? 'Nom de l\'examen' ?>
                            </label>
                            <input type="text" class="form-control" id="edit_exam_name" name="exam_name" required>
                        </div>
                        <div class="mb-3">
                            <label for="edit_exam_date" class="form-label">
                                <?= $lang_data['select_date'] ?? 'Sélectionner une date' ?>
                            </label>
                            <input type="text" class="form-control" id="edit_exam_date" name="exam_date" required readonly>
                        </div>
                        <div class="mb-3">
                            <label for="edit_exam_time" class="form-label">
                                <?= $lang_data['select_time'] ?? 'Sélectionner une heure' ?>
                            </label>
                            <input type="text" class="form-control" id="edit_exam_time" name="exam_time" required readonly>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="edit_reminder_enabled" name="reminder_enabled" checked>
                            <label class="form-check-label" for="edit_reminder_enabled">
                                <?= $lang_data['enable_reminder'] ?? 'Activer le rappel' ?>
                            </label>
                        </div>
                        <div class="mb-3">
                            <label for="edit_reminder_time_before" class="form-label">
                                <?= $lang_data['reminder_time_before'] ?? 'Temps avant l\'examen (minutes)' ?>
                            </label>
                            <input type="number" class="form-control" id="edit_reminder_time_before" name="reminder_time_before" value="60" min="1">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <?= $lang_data['close'] ?? 'Fermer' ?>
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <?= $lang_data['save_exam'] ?? 'Enregistrer l\'examen' ?>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Scripts JS -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script>
      // Couleurs personnalisées pour SweetAlert2
      const confirmColor = '#0097b2';
      const cancelColor  = '#1ad1f1';

      // Variables pour SweetAlert2
      const swalErrorTitle    = "<?= addslashes($lang_data['swal_error_title'] ?? 'Erreur') ?>";
      const swalSuccessTitle  = "<?= addslashes($lang_data['swal_success_title'] ?? 'Succès') ?>";
      const swalConfirmButton = "<?= addslashes($lang_data['swal_confirm_button'] ?? 'OK') ?>";
      const swalCancelButton  = "<?= addslashes($lang_data['swal_cancel_button'] ?? 'Annuler') ?>";

      // Erreurs AJAX / confirm
      const deleteExamConfirmation = "<?= addslashes($lang_data['delete_exam_confirmation'] ?? 'Êtes-vous sûr de vouloir supprimer cet examen ?') ?>";
      const ajaxAddExamError       = "<?= addslashes($lang_data['ajax_add_exam_error'] ?? 'Une erreur est survenue lors de l\'enregistrement.') ?>";
      const ajaxEditExamError      = "<?= addslashes($lang_data['ajax_edit_exam_error'] ?? 'Une erreur est survenue lors de la modification.') ?>";
      const ajaxDeleteExamError    = "<?= addslashes($lang_data['ajax_delete_exam_error'] ?? 'Une erreur est survenue lors de la suppression.') ?>";

      // Modal "Ajouter" => init Flatpickr si pas déjà fait
      $('#addExamModal').on('show.bs.modal', function() {
          $(this).find('form')[0].reset();
          if (!$(this).data('flatpickr-initialized')) {
              flatpickr("#exam_date", {
                  altInput: true,
                  altFormat: "d/m/Y",
                  dateFormat: "Y-m-d",
                  minDate: "today"
              });
              flatpickr("#exam_time", {
                  enableTime: true,
                  noCalendar: true,
                  dateFormat: "H:i",
                  time_24hr: true
              });
              $(this).data('flatpickr-initialized', true);
          }
      });

      // Modal "Éditer" => init Flatpickr
      let editDatePicker = flatpickr("#edit_exam_date", {
          altInput: true,
          altFormat: "d/m/Y",
          dateFormat: "Y-m-d",
          minDate: "today"
      });
      let editTimePicker = flatpickr("#edit_exam_time", {
          enableTime: true,
          noCalendar: true,
          dateFormat: "H:i",
          time_24hr: true
      });

      // Désactiver/activer "reminder_time_before"
      document.addEventListener('DOMContentLoaded', function() {
          $('#reminder_enabled').on('change', function() {
              $('#reminder_time_before').prop('disabled', !this.checked);
          });
          $('#edit_reminder_enabled').on('change', function() {
              $('#edit_reminder_time_before').prop('disabled', !this.checked);
          });
      });

      // Ajouter un examen
      $('#addExamForm').submit(function(e) {
          e.preventDefault();
          let formData = $(this).serialize();
          $.ajax({
              url: 'addExam.php',
              type: 'POST',
              data: formData,
              dataType: 'json',
              success: function(response){
                  if (response.success) {
                      Swal.fire({
                          icon: 'success',
                          title: swalSuccessTitle,
                          text: response.message,
                          confirmButtonText: swalConfirmButton,
                          confirmButtonColor: confirmColor
                      }).then(() => {
                          // Fermer le modal
                          $('#addExamModal').modal('hide');
                          // Actualiser la card "Examens à venir"
                          $("#upcomingExamsContainer").load("dashboard.php #upcomingExamsContainer > *");
                          // Actualiser la liste complète du modal
                          $("#allExamsContent").load("dashboard.php #allExamsContent > *");
                      });
                  } else {
                      Swal.fire({
                          icon: 'error',
                          title: swalErrorTitle,
                          text: response.message,
                          confirmButtonText: swalConfirmButton,
                          confirmButtonColor: confirmColor
                      });
                  }
              },
              error: function(){
                  Swal.fire({
                      icon: 'error',
                      title: swalErrorTitle,
                      text: ajaxAddExamError,
                      confirmButtonText: swalConfirmButton,
                      confirmButtonColor: confirmColor
                  });
              }
          });
      });

      // Clic "éditer"
      $(document).on('click', '.edit-exam', function(e) {
          e.preventDefault();
          let examId             = $(this).data('id');
          let examName           = $(this).data('exam_name');
          let examDate           = $(this).data('exam_date');
          let examTime           = $(this).data('exam_time');
          let reminderEnabled    = $(this).data('reminder_enabled');
          let reminderTimeBefore = $(this).data('reminder_time_before');

          $('#editExamForm')[0].reset();
          $('#edit_exam_id').val(examId);
          $('#edit_exam_name').val(examName);

          // MAJ flatpickr
          editDatePicker.setDate(examDate, true);
          editTimePicker.setDate(examTime, true);

          if (reminderEnabled == 1) {
              $('#edit_reminder_enabled').prop('checked', true);
              $('#edit_reminder_time_before').prop('disabled', false);
          } else {
              $('#edit_reminder_enabled').prop('checked', false);
              $('#edit_reminder_time_before').prop('disabled', true);
          }
          $('#edit_reminder_time_before').val(reminderTimeBefore);

          $('#editExamModal').modal('show');
      });

      // Éditer un examen
      $('#editExamForm').submit(function(e){
          e.preventDefault();
          let formData = $(this).serialize();
          $.ajax({
              url: 'editExam.php',
              type: 'POST',
              data: formData,
              dataType: 'json',
              success: function(response){
                  if (response.success) {
                      Swal.fire({
                          icon: 'success',
                          title: swalSuccessTitle,
                          text: response.message,
                          confirmButtonText: swalConfirmButton,
                          confirmButtonColor: confirmColor
                      }).then(() => {
                          $('#editExamModal').modal('hide');
                          // Actualiser la card "Examens à venir"
                          $("#upcomingExamsContainer").load("dashboard.php #upcomingExamsContainer > *");
                          // Actualiser la liste complète
                          $("#allExamsContent").load("dashboard.php #allExamsContent > *");
                      });
                  } else {
                      Swal.fire({
                          icon: 'error',
                          title: swalErrorTitle,
                          text: response.message,
                          confirmButtonText: swalConfirmButton,
                          confirmButtonColor: confirmColor
                      });
                  }
              },
              error: function(){
                  Swal.fire({
                      icon: 'error',
                      title: swalErrorTitle,
                      text: ajaxEditExamError,
                      confirmButtonText: swalConfirmButton,
                      confirmButtonColor: confirmColor
                  });
              }
          });
      });

      // Supprimer un examen
      $(document).on('click', '.delete-exam', function(e){
          e.preventDefault();
          let examId = $(this).data('id');

          Swal.fire({
              icon: 'warning',
              title: deleteExamConfirmation,
              showCancelButton: true,
              confirmButtonText: swalConfirmButton,
              confirmButtonColor: confirmColor,
              cancelButtonText: swalCancelButton,
              cancelButtonColor: cancelColor
          }).then((result) => {
              if (result.isConfirmed) {
                  $.ajax({
                      url: 'deleteExam.php',
                      type: 'POST',
                      data: { exam_id: examId },
                      dataType: 'json',
                      success: function(response){
                          if (response.success) {
                              Swal.fire({
                                  icon: 'success',
                                  title: swalSuccessTitle,
                                  text: response.message,
                                  confirmButtonText: swalConfirmButton,
                                  confirmButtonColor: confirmColor
                              }).then(() => {
                                  // Actualiser la card "Examens à venir"
                                  $("#upcomingExamsContainer").load("dashboard.php #upcomingExamsContainer > *");
                                  // Actualiser la liste complète
                                  $("#allExamsContent").load("dashboard.php #allExamsContent > *");
                              });
                          } else {
                              Swal.fire({
                                  icon: 'error',
                                  title: swalErrorTitle,
                                  text: response.message,
                                  confirmButtonText: swalConfirmButton,
                                  confirmButtonColor: confirmColor
                              });
                          }
                      },
                      error: function(){
                          Swal.fire({
                              icon: 'error',
                              title: swalErrorTitle,
                              text: ajaxDeleteExamError,
                              confirmButtonText: swalConfirmButton,
                              confirmButtonColor: confirmColor
                          });
                      }
                  });
              }
          });
      });
    </script>
</body>
</html>
<?php include 'includes/footer.php'; ?>
