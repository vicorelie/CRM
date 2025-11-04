<?php
// statistics.php

// -----------------------------------------------------------------------------
// 1. Initialisation et vérifications de sécurité
// -----------------------------------------------------------------------------
session_start();
require 'config.php'; 
requireSubscription($pdo);
require_once 'vendor/autoload.php';
include 'includes/header.php';

ini_set('display_errors', 0);
error_reporting(0);

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}
$userUuid = $_SESSION['user_uuid'];

// --------------------------------------------------------------------------------
// 2. Récupération de certaines infos supplémentaires
// (exemple : type d'étudiant pour le filtre "study")
// --------------------------------------------------------------------------------
$stmtCurr = $pdo->prepare("SELECT student_type FROM studentCurriculum WHERE uuid = :uuid LIMIT 1");
$stmtCurr->execute([':uuid' => $userUuid]);
$curriculum = $stmtCurr->fetch(PDO::FETCH_ASSOC);
$studentTypeInDb = $curriculum['student_type'] ?? '';

// --------------------------------------------------------------------------------
// 3. Récupération et préparation des filtres
// --------------------------------------------------------------------------------

// Récupération de la liste des matières
$stmtDistinctSubjects = $pdo->prepare("
    SELECT DISTINCT subject_name 
    FROM studySubjects 
    WHERE uuid = :uuid AND subject_name <> '' 
    ORDER BY subject_name ASC
");
$stmtDistinctSubjects->execute([':uuid' => $userUuid]);
$distinctSubjects = $stmtDistinctSubjects->fetchAll(PDO::FETCH_COLUMN);

// Récupération de la liste des topics
$stmtDistinctTopics = $pdo->prepare("
    SELECT DISTINCT topic
    FROM subjectDocuments
    WHERE uuid = :uuid AND topic <> ''
    ORDER BY topic ASC
");
$stmtDistinctTopics->execute([':uuid' => $userUuid]);
$distinctTopics = $stmtDistinctTopics->fetchAll(PDO::FETCH_COLUMN);

// Filtre Study (uniquement pour 'academic')
$distinctStudies = [];
if ($studentTypeInDb === 'academic') {
    $stmtDistinctStudies = $pdo->prepare("
        SELECT DISTINCT course_name
        FROM studySubjects
        WHERE uuid = :uuid AND course_name <> ''
        ORDER BY course_name ASC
    ");
    $stmtDistinctStudies->execute([':uuid' => $userUuid]);
    $distinctStudies = $stmtDistinctStudies->fetchAll(PDO::FETCH_COLUMN);
}

// Récupération des paramètres GET
$filterSubject = isset($_GET['filterSubject']) ? trim($_GET['filterSubject']) : '';
$topicFilter   = isset($_GET['topicFilter'])   ? trim($_GET['topicFilter'])   : '';
$filterDate    = isset($_GET['filterDate'])      ? trim($_GET['filterDate'])    : '';
$generalSearch = isset($_GET['generalSearch'])   ? trim($_GET['generalSearch']) : '';
$filterStudy   = ($studentTypeInDb === 'academic')
    ? (isset($_GET['study']) ? trim($_GET['study']) : '')
    : '';

// Pour compatibilité avec votre ancien code de statistics, on initialise aussi $search
$search = $generalSearch; // Vous pouvez ajuster selon vos besoins

// --------------------------------------------------------------------------------
// 4. Construction du WHERE pour les statistiques
// --------------------------------------------------------------------------------

// Ici, on utilise subjectDocuments (d) et studySubjects (s)
$whereClauses = ["d.uuid = :uuid"];
$paramsStats  = [':uuid' => $userUuid];

if ($filterSubject !== '') {
    $whereClauses[] = "LOWER(s.subject_name) LIKE :filterSubject";
    $paramsStats[':filterSubject'] = '%' . strtolower($filterSubject) . '%';
}
if ($topicFilter !== '') {
    $whereClauses[] = "LOWER(d.topic) LIKE :topicFilter";
    $paramsStats[':topicFilter'] = '%' . strtolower($topicFilter) . '%';
}
if ($filterDate !== '') {
    $dates = explode(' to ', $filterDate);
    if (count($dates) === 2) {
        $whereClauses[] = "DATE(d.created_time) BETWEEN :start_date AND :end_date";
        $paramsStats[':start_date'] = $dates[0];
        $paramsStats[':end_date']   = $dates[1];
    } elseif (count($dates) === 1) {
        $whereClauses[] = "DATE(d.created_time) = :exact_date";
        $paramsStats[':exact_date'] = $dates[0];
    }
}
if ($generalSearch !== '') {
    $whereClauses[] = "(
       LOWER(d.topic)        LIKE :generalSearch
       OR LOWER(d.sub_topic)  LIKE :generalSearch
       OR LOWER(s.subject_name) LIKE :generalSearch
    )";
    $paramsStats[':generalSearch'] = '%' . strtolower($generalSearch) . '%';
}
if ($filterStudy !== '') {
    $whereClauses[] = "LOWER(s.course_name) LIKE :filterStudy";
    $paramsStats[':filterStudy'] = '%' . strtolower($filterStudy) . '%';
}

$whereSQL = count($whereClauses) > 0 ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

// --------------------------------------------------------------------------------
// 5. Définition des couleurs pour les graphiques
// --------------------------------------------------------------------------------
$predefinedColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#66FF66', '#FF6666', '#6666FF', '#FF66CC',
    '#E7E9ED', '#8A2BE2', '#00CED1', '#FF1493', '#7FFF00', '#DC143C'
];
$predefinedColorsJson = json_encode($predefinedColors);

// --------------------------------------------------------------------------------
// 6. Récupération des données statistiques et graphiques
// --------------------------------------------------------------------------------
try {
    // Exemple : Récupérer la liste des matières distinctes (pour le dropdown de statistics)
    $sql = "SELECT DISTINCT IFNULL(s.subject_name, 'Non précisé') AS subject_name
            FROM subjectDocuments d
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL
            ORDER BY subject_name ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $subjectsList = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // 6.1 Moyenne des submitNote normalisées (calculées sur 10)
    $sql = "SELECT AVG( (q.submitNote / (LENGTH(q.submitAnswer) - LENGTH(REPLACE(q.submitAnswer, ',', '')) + 1)) * 100 ) as avg_submit_note
            FROM qcmSubmit q
            JOIN subjectDocuments d ON q.subject_document_id = d.id
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $avgSubmitNote = $stmt->fetchColumn();
    $avgSubmitNote = $avgSubmitNote ? round($avgSubmitNote, 2) : 0;

    // 6.2 Total de QCM
    $sql = "SELECT COUNT(*) as total_qcm
            FROM qcmSubmit q
            JOIN subjectDocuments d ON q.subject_document_id = d.id
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $totalQcmResolved = $stmt->fetchColumn();

    // 6.3 Moyenne QCM par jour
    $sql = "SELECT COUNT(*)/
           CASE WHEN :dateRange = 'custom' THEN DATEDIFF(:end_date, :start_date)+1 ELSE 30 END as avg_qcm_per_day
           FROM qcmSubmit q
           JOIN subjectDocuments d ON q.subject_document_id = d.id
           LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
           $whereSQL";
    $stmt = $pdo->prepare($sql);
    $dateRange = ($filterDate !== '') ? 'custom' : 'default';
    $paramsForAvg = $paramsStats + [
        ':dateRange'  => $dateRange,
        ':start_date' => isset($dates[0]) ? $dates[0] : '1970-01-01',
        ':end_date'   => isset($dates[1]) ? $dates[1] : '1970-01-02'
    ];
    $stmt->execute($paramsForAvg);
    $avgQcmPerDay = $stmt->fetchColumn();
    $avgQcmPerDay = $avgQcmPerDay ? round($avgQcmPerDay, 2) : 0;

    // 6.4 Total de Documents
    $sql = "SELECT COUNT(*) as total_documents
            FROM subjectDocuments d
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $totalDocuments = $stmt->fetchColumn();

    // 6.5 Documents par matière
    $sql = "SELECT IFNULL(s.subject_name, 'Non précisé') AS subject_name, COUNT(*) as count_docs
            FROM subjectDocuments d
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL
            GROUP BY s.subject_name
            ORDER BY count_docs DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $docsPerSubject = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6.6 Documents par Mois
    $sql = "SELECT DATE_FORMAT(d.created_time, '%Y-%m') as month, COUNT(*) as count_docs
            FROM subjectDocuments d
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL
            GROUP BY month
            ORDER BY month ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $docsPerMonth = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6.7 Documents par Jour
    $sql = "SELECT DATE(d.created_time) as day, COUNT(*) as count_docs
            FROM subjectDocuments d
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL
            GROUP BY day
            ORDER BY day ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $docsPerDay = $stmt->fetchAll(PDO::FETCH_ASSOC);


    // 6.8 Ratio QCM / Résumé
    $sql = "SELECT COUNT(*) as total_qcm
            FROM qcmSubmit q
            WHERE q.subject_document_id IN (
                SELECT d.id FROM subjectDocuments d
                LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
                $whereSQL
            )";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $totalQcm = $stmt->fetchColumn();

    $sql = "SELECT COUNT(*) as total_resumes
            FROM documentResumes r
            WHERE r.subject_document_id IN (
                SELECT d.id FROM subjectDocuments d
                LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
                $whereSQL
            )";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $totalResumes = $stmt->fetchColumn();

    // 6.9 Moyenne / nombre QCM et résumés par matière (pour graphiques pie)
    // --> Normalisation appliquée ici également
    $sql = "SELECT IFNULL(s.subject_name, 'Non précisé') as subject_name,
                   COALESCE(AVG((q.submitNote / (LENGTH(q.submitAnswer) - LENGTH(REPLACE(q.submitAnswer, ',', '')) + 1)) * 100), 0) as avg_note
            FROM subjectDocuments d
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            LEFT JOIN qcmSubmit q ON d.id = q.subject_document_id AND q.uuid = :uuid_qcm
            $whereSQL
            GROUP BY s.subject_name
            ORDER BY avg_note DESC";
    $paramsCam = $paramsStats + [':uuid_qcm' => $userUuid];
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsCam);
    $submitNoteBySubject = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT IFNULL(s.subject_name, 'Non précisé') as subject_name,
                   COALESCE(COUNT(q.id), 0) as qcm_count
            FROM subjectDocuments d
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            LEFT JOIN qcmSubmit q ON d.id = q.subject_document_id AND q.uuid = :uuid_qcm
            $whereSQL
            GROUP BY s.subject_name
            ORDER BY qcm_count DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsCam);
    $qcmBySubject = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT IFNULL(s.subject_name, 'Non précisé') as subject_name,
                   COALESCE(COUNT(r.id), 0) as resume_count
            FROM subjectDocuments d
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            LEFT JOIN documentResumes r ON d.id = r.subject_document_id AND r.uuid = :uuid_res
            $whereSQL
            GROUP BY s.subject_name
            ORDER BY resume_count DESC";
    $paramsRes = $paramsStats + [':uuid_res' => $userUuid];
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsRes);
    $resumesBySubject = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6.10 Évolution des submitNote par date (Line Chart) avec normalisation
    $sql = "SELECT DATE(q.created_time) as dateDay, AVG((q.submitNote / (LENGTH(q.submitAnswer) - LENGTH(REPLACE(q.submitAnswer, ',', '')) + 1)) * 100) as avg_note
            FROM qcmSubmit q
            JOIN subjectDocuments d ON q.subject_document_id = d.id
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL
            GROUP BY dateDay
            ORDER BY dateDay ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $submitNoteEvolution = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6.11 Évolution du nombre de QCM par date (Line Chart)
    $sql = "SELECT DATE(q.created_time) as dateDay, COUNT(*) as count_qcm
            FROM qcmSubmit q
            JOIN subjectDocuments d ON q.subject_document_id = d.id
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL
            GROUP BY dateDay
            ORDER BY dateDay ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $qcmEvolution = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6.12 Évolution du nombre de résumés par date (Line Chart)
    $sql = "SELECT DATE(r.created_time) as dateDay, COUNT(*) as count_resumes
            FROM documentResumes r
            JOIN subjectDocuments d ON r.subject_document_id = d.id
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL
            GROUP BY dateDay
            ORDER BY dateDay ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $resumesEvolution = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6.13 Évolution des notes par matière (multi-line) avec normalisation
    $sql = "SELECT DATE(q.created_time) as dateDay,
                   IFNULL(s.subject_name, 'Non précisé') as subject_name,
                   AVG((q.submitNote / (LENGTH(q.submitAnswer) - LENGTH(REPLACE(q.submitAnswer, ',', '')) + 1)) * 100) as avg_note
            FROM qcmSubmit q
            JOIN subjectDocuments d ON q.subject_document_id = d.id
            LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
            $whereSQL
            GROUP BY dateDay, subject_name
            ORDER BY dateDay ASC, subject_name ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($paramsStats);
    $evolutionAllSubjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Préparation des données pour le graphique multi-line (par matière)
    $subjectsInEvolution = array_unique(array_column($evolutionAllSubjects, 'subject_name'));
    $datesInEvolution    = array_unique(array_column($evolutionAllSubjects, 'dateDay'));
    sort($subjectsInEvolution);
    sort($datesInEvolution);
    $dataPerSubject = [];
    foreach ($subjectsInEvolution as $subName) {
        foreach ($datesInEvolution as $dte) {
            $dataPerSubject[$subName][$dte] = 0;
        }
    }
    foreach ($evolutionAllSubjects as $row) {
        $dataPerSubject[$row['subject_name']][$row['dateDay']] = round($row['avg_note'], 2);
    }

    // ---------------------------------------------
    // 6.14 Flash par matière (Pie Chart)
    // ---------------------------------------------
    $sql = "SELECT IFNULL(s.subject_name, 'Non précisé') as subject_name, COUNT(f.id) as flash_count
    FROM subjectDocuments d
    LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
    LEFT JOIN documentFlash f ON d.id = f.subject_document_id AND f.uuid = :uuid_flash
    $whereSQL
    GROUP BY s.subject_name
    ORDER BY flash_count DESC";
    $stmt = $pdo->prepare($sql);
    $paramsFlash = $paramsStats + [':uuid_flash' => $userUuid];
    $stmt->execute($paramsFlash);
    $flashBySubject = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ---------------------------------------------
    // 6.15 Pairs par matière (Pie Chart)
    // ---------------------------------------------
    $sql = "SELECT IFNULL(s.subject_name, 'Non précisé') as subject_name, COUNT(p.id) as pairs_count
    FROM subjectDocuments d
    LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
    LEFT JOIN documentPairs p ON d.id = p.subject_document_id AND p.uuid = :uuid_pairs
    $whereSQL
    GROUP BY s.subject_name
    ORDER BY pairs_count DESC";
    $stmt = $pdo->prepare($sql);
    $paramsPairs = $paramsStats + [':uuid_pairs' => $userUuid];
    $stmt->execute($paramsPairs);
    $pairsBySubject = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ---------------------------------------------
    // 6.16 Miss par matière (Pie Chart)
    // ---------------------------------------------
    $sql = "SELECT IFNULL(s.subject_name, 'Non précisé') as subject_name, COUNT(m.id) as miss_count
    FROM subjectDocuments d
    LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
    LEFT JOIN documentMiss m ON d.id = m.subject_document_id AND m.uuid = :uuid_miss
    $whereSQL
    GROUP BY s.subject_name
    ORDER BY miss_count DESC";
    $stmt = $pdo->prepare($sql);
    $paramsMiss = $paramsStats + [':uuid_miss' => $userUuid];
    $stmt->execute($paramsMiss);
    $missBySubject = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ---------------------------------------------
// 6.17 Ratio QCM avec document / sans document (Donut Chart)
// ---------------------------------------------
$sql = "
    SELECT 
        CASE 
            WHEN d.documents_id IS NULL THEN 'without_document'
            ELSE 'with_document'
        END AS status_key,
        COUNT(*) AS count_docs
    FROM subjectDocuments d
    LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
    $whereSQL
    GROUP BY status_key
";
$stmt = $pdo->prepare($sql);
$stmt->execute($paramsStats);
$rawRatio = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Map status_key to translated label
$docRatio = array_map(function($row) use($lang_data) {
    return [
        'doc_status' => $lang_data[$row['status_key']],
        'count_docs' => (int)$row['count_docs']
    ];
}, $rawRatio);


    // 6.18 Distribution des notes (bar chart) si la table documentNotes existe
    if ($tableExists) {
        // moyenne globale
        $sql = "SELECT AVG(n.note)
                FROM documentNotes n
                WHERE n.subject_document_id IN (
                    SELECT d.id
                    FROM subjectDocuments d
                    LEFT JOIN studySubjects s
                        ON d.study_subjects_id = s.id
                    $whereSQL
                )";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($paramsStats);
        $avgNoteOverall = round($stmt->fetchColumn() ?: 0, 2);

        // distribution
        $sql = "SELECT n.note, COUNT(*) as count_notes
                FROM documentNotes n
                WHERE n.subject_document_id IN (
                    SELECT d.id
                    FROM subjectDocuments d
                    LEFT JOIN studySubjects s
                        ON d.study_subjects_id = s.id
                    $whereSQL
                )
                GROUP BY n.note
                ORDER BY n.note ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($paramsStats);
        $notesDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


        // 6.19 Évolution des flash (Line Chart)
        $sql = "SELECT DATE(f.created_time) AS dateDay, COUNT(*) AS count_flash
                FROM documentFlash f
                JOIN subjectDocuments d ON f.subject_document_id = d.id
                LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
                $whereSQL
                GROUP BY dateDay
                ORDER BY dateDay ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($paramsStats);
        $flashEvolution = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 6.20 Évolution des pairs (Line Chart)
        $sql = "SELECT DATE(p.created_time) AS dateDay, COUNT(*) AS count_pairs
                FROM documentPairs p
                JOIN subjectDocuments d ON p.subject_document_id = d.id
                LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
                $whereSQL
                GROUP BY dateDay
                ORDER BY dateDay ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($paramsStats);
        $pairsEvolution = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 6.21 Évolution des miss (Line Chart)
        $sql = "SELECT DATE(m.created_time) AS dateDay, COUNT(*) AS count_miss
                FROM documentMiss m
                JOIN subjectDocuments d ON m.subject_document_id = d.id
                LEFT JOIN studySubjects s ON d.study_subjects_id = s.id
                $whereSQL
                GROUP BY dateDay
                ORDER BY dateDay ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($paramsStats);
        $missEvolution = $stmt->fetchAll(PDO::FETCH_ASSOC);

    } catch (PDOException $e) {
        die("Erreur SQL : " . htmlspecialchars($e->getMessage()));
    }
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['statistics_title'] ?? 'Statistiques') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Font Awesome et Flatpickr -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <!-- CSS Bootstrap si nécessaire -->
    <style>
        .hidden { display: none; }
    </style>
</head>
<body class="list-container">
<div class="container py-5">

<h2 class="mb-4 text-center" style="font-size:36px;" ><?= htmlspecialchars($lang_data['statistics_title'] ?? 'Statistiques') ?></h2>

    <!-- Zone de filtres -->
    <div id="filtersContainer" class="card mb-4 p-3">
        <div class="card-body">
            <form method="GET" action="statistics.php" class="row g-3 align-items-center">
                <!-- Filtre Matière -->
                <div class="col-md-4">
                    <select name="filterSubject" id="filterSubject" class="form-select">
                        <option value=""><?= htmlspecialchars($lang_data['all_subjects'] ?? 'Toutes les matières') ?></option>
                        <?php foreach ($distinctSubjects as $s): ?>
                            <option value="<?= htmlspecialchars($s) ?>" <?= ($s === $filterSubject) ? 'selected' : '' ?>>
                                <?= htmlspecialchars($s) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <!-- Filtre Topic -->
                <div class="col-md-4">
                    <select name="topicFilter" id="topicFilter" class="form-select">
                        <option value=""><?= htmlspecialchars($lang_data['all_topics'] ?? 'Tous les topics') ?></option>
                        <?php foreach ($distinctTopics as $t): ?>
                            <option value="<?= htmlspecialchars($t) ?>" <?= ($t === $topicFilter) ? 'selected' : '' ?>>
                                <?= htmlspecialchars($t) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <!-- Filtre Study si academic -->
                <?php if ($studentTypeInDb === 'academic'): ?>
                    <div class="col-md-4">
                        <select name="study" id="study" class="form-select">
                            <option value=""><?= htmlspecialchars($lang_data['all_studies'] ?? 'Tous les studies') ?></option>
                            <?php foreach ($distinctStudies as $study): ?>
                                <option value="<?= htmlspecialchars($study) ?>" <?= ($study === $filterStudy) ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($study) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                <?php endif; ?>
                <!-- Filtre Date -->
                <div class="col-md-6">
                    <input type="text" id="filterDate" name="filterDate" class="form-control"
                           placeholder="<?= htmlspecialchars($lang_data['filter_date_placeholder'] ?? 'Choisir une date ou période') ?>"
                           value="<?= htmlspecialchars($filterDate) ?>" readonly>
                </div>
                <!-- Filtre Recherche Globale -->
                <div class="col-md-6">
                    <input type="text" id="generalSearch" name="generalSearch" class="form-control"
                           placeholder="<?= htmlspecialchars($lang_data['search_placeholder'] ?? 'Recherche globale') ?>"
                           value="<?= htmlspecialchars($generalSearch) ?>">
                </div>
                <!-- Boutons Appliquer & Réinitialiser -->
                <div class="col-md-12 text-end mt-3">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-search"></i> <?= htmlspecialchars($lang_data['apply'] ?? 'Appliquer') ?>
                    </button>
                    <button type="button" id="resetFilters" class="btn btn-outline-secondary <?= ($filterSubject || $topicFilter || $filterDate || $generalSearch || $filterStudy) ? '' : 'hidden' ?>">
                        <i class="fas fa-redo"></i> <?= htmlspecialchars($lang_data['reset'] ?? 'Réinitialiser') ?>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Cartes rapides -->
    <div class="row stats-cards text-center mb-4">
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                <div class="card-body">
                    <h5><?= htmlspecialchars($lang_data['average_notes'] ?? 'Moyenne des Notes') ?></h5>
                    <h2><?= htmlspecialchars($avgSubmitNote) ?></h2>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                <div class="card-body">
                    <h5><?= htmlspecialchars($lang_data['qcm_resolved'] ?? 'QCM résolus') ?></h5>
                    <h2><?= htmlspecialchars($totalQcmResolved) ?></h2>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                <div class="card-body">
                    <h5>
                        <?= htmlspecialchars(sprintf(
                            $lang_data['qcm_per_day'] ?? 'QCM / Jour (%s jours)',
                            ($filterDate !== '') ? (round((strtotime($dates[1]) - strtotime($dates[0])) / 86400) + 1) : 30
                        )) ?>
                    </h5>
                    <h2><?= htmlspecialchars($avgQcmPerDay) ?></h2>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card h-100">
                <div class="card-body">
                    <h5><?= htmlspecialchars($lang_data['total_documents'] ?? 'Total Documents') ?></h5>
                    <h2><?= htmlspecialchars($totalDocuments) ?></h2>
                </div>
            </div>
        </div>
    </div>

    <!-- Graphiques -->
    <!-- Nouvel agencement pour les 5 camemberts prioritaires -->
    <div class="row">
        <!-- 1. QCM par matière (Pie Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['qcm_resolved_by_theme'] ?? 'QCM par Matière') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($qcmBySubject, 'qcm_count')) > 0): ?>
                        <canvas id="qcmBySubjectChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- 2. Résumés par matière (Pie Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['resumes_by_theme'] ?? 'Résumés par Matière') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($resumesBySubject, 'resume_count')) > 0): ?>
                        <canvas id="resumesBySubjectChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- 3. Flash par matière (Pie Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['flash_by_theme'] ?? 'Flash par Matière') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($flashBySubject, 'flash_count')) > 0): ?>
                        <canvas id="flashBySubjectChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- 4. Pairs par matière (Pie Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['pairs_by_theme'] ?? 'Pairs par Matière') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($pairsBySubject, 'pairs_count')) > 0): ?>
                        <canvas id="pairsBySubjectChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- 5. Miss par matière (Pie Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['miss_by_theme'] ?? 'Miss par Matière') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($missBySubject, 'miss_count')) > 0): ?>
                        <canvas id="missBySubjectChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <!-- 6. Moyenne des notes par matière (Pie Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['submit_notes_by_theme'] ?? 'Notes par Matière') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($submitNoteBySubject, 'avg_note')) > 0): ?>
                        <canvas id="submitNoteBySubjectChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>


    <div class="row">
        <!-- 1. Évolution des notes (Line Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['evolution_submit_notes'] ?? 'Évolution des Notes') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (!empty($submitNoteEvolution)): ?>
                        <canvas id="submitNoteEvolutionChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>





        <!-- 3. Évolution du nombre de QCM (Line Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['evolution_qcm_resolved'] ?? 'Évolution du nombre de QCM résolus') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (!empty($qcmEvolution)): ?>
                        <canvas id="qcmEvolutionChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>



        <!-- 6. Évolution du nombre de résumés (Line Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['evolution_resumes'] ?? 'Évolution du nombre de Résumés') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (!empty($resumesEvolution)): ?>
                        <canvas id="resumesEvolutionChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>


    
        <!-- 7. Documents par matière (Pie Chart) -->
        <!-- <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['documents_per_theme'] ?? 'Documents par Matière') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($docsPerSubject, 'count_docs')) > 0): ?>
                        <canvas id="docsBySubjectChart"></canvas>
                    <?php else: ?>
                        <p>Aucun document par matière</p>
                    <?php endif; ?>
                </div>
            </div>
        </div> -->
        <!-- 8. Documents par mois (Bar Chart) -->
        <!-- <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['documents_per_month'] ?? 'Documents par Mois') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($docsPerMonth, 'count_docs')) > 0): ?>
                        <canvas id="docsPerMonthChart"></canvas>
                    <?php else: ?>
                        <p>Aucun document par mois</p>
                    <?php endif; ?>
                </div>
            </div>
        </div> -->
        <!-- 9. Documents par jour (Line Chart) -->
        <!-- <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['documents_per_day'] ?? 'Documents Uploadés par Jour') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (array_sum(array_column($docsPerDay, 'count_docs')) > 0): ?>
                        <canvas id="docsPerDayChart"></canvas>
                    <?php else: ?>
                        <p>Aucun document uploadé par jour</p>
                    <?php endif; ?>
                </div>
            </div>
        </div> -->

    <!-- 7. Évolution des flash (Line Chart) -->
    <div class="col-lg-6 mb-4">
      <div class="card h-100">
        <div class="card-header">
          <h5><?= htmlspecialchars($lang_data['evolution_flash'] ?? 'Évolution des flash') ?></h5>
        </div>
        <div class="card-body">
          <?php if (!empty($flashEvolution)): ?>
            <canvas id="flashEvolutionChart"></canvas>
          <?php else: ?>
            <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <!-- 8. Évolution des pairs (Line Chart) -->
    <div class="col-lg-6 mb-4">
      <div class="card h-100">
        <div class="card-header">
          <h5><?= htmlspecialchars($lang_data['evolution_pairs'] ?? 'Évolution des pairs') ?></h5>
        </div>
        <div class="card-body">
          <?php if (!empty($pairsEvolution)): ?>
            <canvas id="pairsEvolutionChart"></canvas>
          <?php else: ?>
            <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <!-- 9. Évolution des miss (Line Chart) -->
    <div class="col-lg-6 mb-4">
      <div class="card h-100">
        <div class="card-header">
          <h5><?= htmlspecialchars($lang_data['evolution_miss'] ?? 'Évolution des miss') ?></h5>
        </div>
        <div class="card-body">
          <?php if (!empty($missEvolution)): ?>
            <canvas id="missEvolutionChart"></canvas>
          <?php else: ?>
            <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
          <?php endif; ?>
        </div>
      </div>
    </div>

        <!-- 10. Ratio QCM / Résumé / Flash / Pairs / Miss (Donut Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['qcm_resume_ratio'] ?? 'Ratio QCM / Résumé / Flash / Pairs / Miss') ?></h5>
                </div>
                <div class="card-body">
                    <?php 
                    // On calcule les totaux à partir des tableaux déjà récupérés
                    $totalFlash = array_sum(array_column($flashBySubject, 'flash_count'));
                    $totalPairs = array_sum(array_column($pairsBySubject, 'pairs_count'));
                    $totalMiss  = array_sum(array_column($missBySubject, 'miss_count'));
                    if ($totalQcm > 0 || $totalResumes > 0 || $totalFlash > 0 || $totalPairs > 0 || $totalMiss > 0):
                    ?>
                        <canvas id="qcmResumeFlashPairsMissChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div><!-- row -->

        <!-- 11. Ratio QCM avec document / sans document (Donut Chart) -->
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['qcm_document_ratio'] ?? 'Ratio QCM avec document / sans document') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (!empty($docRatio)): ?>
                        <canvas id="docRatioChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <!-- 1.1 Évolution des notes par matière (Line Chart) -->
        <div class="row">
        <div class="col-lg-12 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['evolution_notes_by_subject'] ?? 'Évolution des notes par matière') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (!empty($evolutionAllSubjects)): ?>
                        <canvas id="evolutionNotesBySubjectChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- Distribution des notes (Histogramme) -->
    <?php if ($tableExists): ?>
    <div class="row">
        <div class="col-12 mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5><?= htmlspecialchars($lang_data['notes_distribution'] ?? 'Distribution des Notes') ?></h5>
                </div>
                <div class="card-body">
                    <?php if (!empty($notesDistribution) && array_sum(array_column($notesDistribution, 'count_notes')) > 0): ?>
                        <canvas id="notesDistributionChart"></canvas>
                    <?php else: ?>
                        <p><?= htmlspecialchars($lang_data['no_data'] ?? 'Aucune donnée disponible') ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>


</div><!-- .container -->

<!-- Scripts JS -->
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
// Initialisation de Flatpickr pour le sélecteur de date
flatpickr('#filterDate', {
    mode: "range",
    dateFormat: "Y-m-d",
    locale: { rangeSeparator: " to " }
});

// Bouton Réinitialiser des filtres
document.getElementById('resetFilters').addEventListener('click', function(){
    window.location.href = 'statistics.php';
});

// ------------------- Fonctions pour Graphiques -------------------
const predefinedColors = <?= $predefinedColorsJson ?>;
function getPredefinedColors(count){
    const colors = [];
    for (let i = 0; i < count; i++){
        colors.push(predefinedColors[i % predefinedColors.length]);
    }
    return colors;
}

// 1. Évolution des submitNote (Line Chart)
<?php if (!empty($submitNoteEvolution)): ?>
  (function(){
    const ctx = document.getElementById('submitNoteEvolutionChart').getContext('2d');
    const labels  = <?= json_encode(array_column($submitNoteEvolution, 'dateDay')) ?>;
    const dataVals= <?= json_encode(array_column($submitNoteEvolution, 'avg_note')) ?>;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: <?= json_encode($lang_data['average_notes']) ?>,
          data: dataVals,
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54,162,235,0.5)',
          fill: true,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: <?= json_encode($lang_data['evolution_submit_notes']) ?> }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            title: { display: true, text: <?= json_encode($lang_data['notes_label']) ?> } 
          },
          x: { 
            title: { display: true, text: <?= json_encode($lang_data['date_label']) ?> } 
          }
        }
      }
    });
  })();
<?php endif; ?>

// 2. Moyenne des notes par matière (Pie Chart)
<?php if (array_sum(array_column($submitNoteBySubject, 'avg_note')) > 0): ?>
(function(){
  const ctx     = document.getElementById('submitNoteBySubjectChart').getContext('2d');
  const labels  = <?= json_encode(array_column($submitNoteBySubject, 'subject_name')) ?>;
  const dataVals= <?= json_encode(array_column($submitNoteBySubject, 'avg_note')) ?>;

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: dataVals,
        backgroundColor: getPredefinedColors(labels.length),
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend:   { position: 'bottom' },
        title:    { display: true, text: <?= json_encode($lang_data['submit_notes_by_theme']) ?> }
      }
    }
  });
})();
<?php endif; ?>


// 3. Évolution du nombre de QCM (Line Chart)
<?php if (!empty($qcmEvolution)): ?>
(function(){
  const ctx      = document.getElementById('qcmEvolutionChart').getContext('2d');
  const labels   = <?= json_encode(array_column($qcmEvolution, 'dateDay')) ?>;
  const dataVals = <?= json_encode(array_column($qcmEvolution, 'count_qcm')) ?>;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: <?= json_encode($lang_data['qcm_resolved']) ?>,
        data: dataVals,
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255,99,132,0.5)',
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { 
          display: true, 
          text: <?= json_encode($lang_data['evolution_qcm_resolved']) ?> 
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          title: { display: true, text: <?= json_encode($lang_data['qcm_label']) ?> } 
        },
        x: { 
          title: { display: true, text: <?= json_encode($lang_data['date_label']) ?> } 
        }
      }
    }
  });
})();
<?php endif; ?>


// 4. QCM par matière (Pie Chart)
<?php if (array_sum(array_column($qcmBySubject, 'qcm_count')) > 0): ?>

(function(){
  const ctx      = document.getElementById('qcmBySubjectChart').getContext('2d');
  const labels   = <?= json_encode(array_column($qcmBySubject, 'subject_name')) ?>;
  const dataVals = <?= json_encode(array_column($qcmBySubject, 'qcm_count')) ?>;

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: dataVals,
        backgroundColor: getPredefinedColors(labels.length),
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { 
          display: true, 
          text: <?= json_encode($lang_data['qcm_by_theme']) ?> 
        }
      }
    }
  });
})();

<?php endif; ?>


// 5. Résumés par matière (Pie Chart)
<?php if (array_sum(array_column($resumesBySubject, 'resume_count')) > 0): ?>

(function(){
  const ctx      = document.getElementById('resumesBySubjectChart').getContext('2d');
  const labels   = <?= json_encode(array_column($resumesBySubject, 'subject_name')) ?>;
  const dataVals = <?= json_encode(array_column($resumesBySubject, 'resume_count')) ?>;

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: dataVals,
        backgroundColor: getPredefinedColors(labels.length),
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['resumes_by_theme']) ?>
        }
      }
    }
  });
})();

<?php endif; ?>


// 6. Évolution du nombre de résumés (Line Chart)
<?php if (!empty($resumesEvolution)): ?>

(function(){
  const ctx      = document.getElementById('resumesEvolutionChart').getContext('2d');
  const labels   = <?= json_encode(array_column($resumesEvolution, 'dateDay')) ?>;
  const dataVals = <?= json_encode(array_column($resumesEvolution, 'count_resumes')) ?>;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: <?= json_encode($lang_data['resumes_label']) ?>,
        data: dataVals,
        borderColor: '#4BC0C0',
        backgroundColor: 'rgba(75,192,192,0.5)',
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['evolution_resumes']) ?>
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: <?= json_encode($lang_data['resumes_label']) ?>
          }
        },
        x: {
          title: {
            display: true,
            text: <?= json_encode($lang_data['date_label']) ?>
          }
        }
      }
    }
  });
})();

<?php endif; ?>


// 7. Évolution des flash
<?php if (!empty($flashEvolution)): ?>

(function(){
  const ctx = document.getElementById('flashEvolutionChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: <?= json_encode(array_column($flashEvolution, 'dateDay')) ?>,
      datasets: [{
        label: <?= json_encode($lang_data['flash_label']) ?>,
        data: <?= json_encode(array_column($flashEvolution, 'count_flash')) ?>,
        borderColor: '#FFCE56',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { 
          display: true, 
          text: <?= json_encode($lang_data['evolution_flash']) ?> 
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          title: { 
            display: true, 
            text: <?= json_encode($lang_data['flash_label']) ?> 
          } 
        },
        x: { 
          title: { 
            display: true, 
            text: <?= json_encode($lang_data['date_label']) ?> 
          } 
        }
      }
    }
  });
})();

<?php endif; ?>


// 8. Évolution des pairs
<?php if (!empty($pairsEvolution)): ?>

(function(){
  const ctx = document.getElementById('pairsEvolutionChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: <?= json_encode(array_column($pairsEvolution, 'dateDay')) ?>,
      datasets: [{
        label: <?= json_encode($lang_data['pairs_label']) ?>,
        data: <?= json_encode(array_column($pairsEvolution, 'count_pairs')) ?>,
        borderColor: '#4BC0C0',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['evolution_pairs']) ?>
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: <?= json_encode($lang_data['pairs_label']) ?>
          }
        },
        x: {
          title: {
            display: true,
            text: <?= json_encode($lang_data['date_label']) ?>
          }
        }
      }
    }
  });
})();

<?php endif; ?>

// 9. Évolution des miss
<?php if (!empty($missEvolution)): ?>

(function(){
  const ctx = document.getElementById('missEvolutionChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: <?= json_encode(array_column($missEvolution, 'dateDay')) ?>,
      datasets: [{
        label: <?= json_encode($lang_data['miss_label']) ?>,
        data: <?= json_encode(array_column($missEvolution, 'count_miss')) ?>,
        borderColor: '#DC143C',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['evolution_miss']) ?>
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: <?= json_encode($lang_data['miss_label']) ?>
          }
        },
        x: {
          title: {
            display: true,
            text: <?= json_encode($lang_data['date_label']) ?>
          }
        }
      }
    }
  });
})();

<?php endif; ?>


// // 7. Documents par matière (Pie Chart)
// <?php if (array_sum(array_column($docsPerSubject, 'count_docs')) > 0): ?>
// {
//     const ctx = document.getElementById('docsBySubjectChart').getContext('2d');
//     const labels = <?= json_encode(array_column($docsPerSubject, 'subject_name')) ?>;
//     const dataVals = <?= json_encode(array_column($docsPerSubject, 'count_docs')) ?>;
//     new Chart(ctx, {
//         type: 'pie',
//         data: {
//             labels: labels,
//             datasets: [{
//                 data: dataVals,
//                 backgroundColor: getPredefinedColors(labels.length),
//                 hoverOffset: 4
//             }]
//         },
//         options: {
//             responsive: true,
//             plugins: {
//                 legend: { position: 'bottom' },
//                 title: { display: true, text: 'Documents par Matière' }
//             }
//         }
//     });
// }
// <?php endif; ?>

// // 8. Documents par Mois (Bar Chart)
// <?php if (array_sum(array_column($docsPerMonth, 'count_docs')) > 0): ?>
// {
//     const ctx = document.getElementById('docsPerMonthChart').getContext('2d');
//     const labels = <?= json_encode(array_column($docsPerMonth, 'month')) ?>;
//     const dataVals = <?= json_encode(array_column($docsPerMonth, 'count_docs')) ?>;
//     new Chart(ctx, {
//         type: 'bar',
//         data: {
//             labels: labels,
//             datasets: [{
//                 label: 'Documents / Mois',
//                 data: dataVals,
//                 backgroundColor: '#36A2EB',
//                 borderColor: '#36A2EB',
//                 borderWidth: 1
//             }]
//         },
//         options: {
//             responsive: true,
//             plugins: {
//                 legend: { display: false },
//                 title: { display: true, text: 'Documents par Mois' }
//             },
//             scales: {
//                 y: { beginAtZero: true, title: { display: true, text: 'Documents' } },
//                 x: { title: { display: true, text: 'Mois' } }
//             }
//         }
//     });
// }
// <?php endif; ?>

// // 9. Documents par Jour (Line Chart)
// <?php if (array_sum(array_column($docsPerDay, 'count_docs')) > 0): ?>
// {
//     const ctx = document.getElementById('docsPerDayChart').getContext('2d');
//     const labels = <?= json_encode(array_column($docsPerDay, 'day')) ?>;
//     const dataVals = <?= json_encode(array_column($docsPerDay, 'count_docs')) ?>;
//     new Chart(ctx, {
//         type: 'line',
//         data: {
//             labels: labels,
//             datasets: [{
//                 label: 'Documents / Jour',
//                 data: dataVals,
//                 borderColor: '#FF6384',
//                 backgroundColor: 'rgba(255,99,132,0.5)',
//                 fill: false,
//                 tension: 0.1
//             }]
//         },
//         options: {
//             responsive: true,
//             plugins: {
//                 legend: { display: false },
//                 title: { display: true, text: 'Documents par Jour' }
//             },
//             scales: {
//                 y: { beginAtZero: true, title: { display: true, text: 'Documents' } },
//                 x: { title: { display: true, text: 'Date' } }
//             }
//         }
//     });
// }
// <?php endif; ?>

// 10. Ratio QCM / Résumé /Flash / Pairs / Miss (Donut Chart)
<?php if ($totalQcm > 0 || $totalResumes > 0 || $totalFlash > 0 || $totalPairs > 0 || $totalMiss > 0): ?>

(function(){
  const ctx = document.getElementById('qcmResumeFlashPairsMissChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [
        <?= json_encode($lang_data['qcm_label']) ?>,
        <?= json_encode($lang_data['resume_label']) ?>,
        <?= json_encode($lang_data['flash_label']) ?>,
        <?= json_encode($lang_data['pairs_label']) ?>,
        <?= json_encode($lang_data['miss_label']) ?>
      ],
      datasets: [{
        label: <?= json_encode($lang_data['qcm_resume_ratio']) ?>,
        data: [
          <?= (int)$totalQcm ?>,
          <?= (int)$totalResumes ?>,
          <?= (int)$totalFlash ?>,
          <?= (int)$totalPairs ?>,
          <?= (int)$totalMiss ?>
        ],
        backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF'],
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['qcm_resume_ratio']) ?>
        }
      }
    }
  });
})();

<?php endif; ?>


// 11. Flash par matière
<?php if (array_sum(array_column($flashBySubject, 'flash_count')) > 0): ?>

(function(){
  const ctx = document.getElementById('flashBySubjectChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: <?= json_encode(array_column($flashBySubject, 'subject_name')) ?>,
      datasets: [{
        data: <?= json_encode(array_column($flashBySubject, 'flash_count')) ?>,
        backgroundColor: getPredefinedColors(<?= count($flashBySubject) ?>),
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['flash_by_theme']) ?>
        }
      }
    }
  });
})();

<?php endif; ?>

// 12. Pairs par matière
<?php if (array_sum(array_column($pairsBySubject, 'pairs_count')) > 0): ?>

(function(){
  const ctx = document.getElementById('pairsBySubjectChart').getContext('2d');
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: <?= json_encode(array_column($pairsBySubject, 'subject_name')) ?>,
      datasets: [{
        data: <?= json_encode(array_column($pairsBySubject, 'pairs_count')) ?>,
        backgroundColor: getPredefinedColors(<?= count($pairsBySubject) ?>),
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['pairs_by_theme']) ?>
        }
      }
    }
  });
})();

<?php endif; ?>

// 13. Miss par matière
<?php if (array_sum(array_column($missBySubject, 'miss_count')) > 0): ?>

(function(){
  const ctx      = document.getElementById('missBySubjectChart').getContext('2d');
  const labels   = <?= json_encode(array_column($missBySubject, 'subject_name')) ?>;
  const dataVals = <?= json_encode(array_column($missBySubject, 'miss_count')) ?>;

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: dataVals,
        backgroundColor: getPredefinedColors(labels.length),
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['miss_by_theme']) ?>
        }
      }
    }
  });
})();

<?php endif; ?>


// 14. Evolution des notes par matière
<?php if (!empty($evolutionAllSubjects)): ?>

(function(){
  const ctx     = document.getElementById('evolutionNotesBySubjectChart').getContext('2d');
  const labels  = <?= json_encode(array_values(array_unique(array_column($evolutionAllSubjects, 'dateDay')))) ?>;
  const subjects= <?= json_encode(array_values(array_unique(array_column($evolutionAllSubjects, 'subject_name')))) ?>;
  const raw     = <?= json_encode($evolutionAllSubjects) ?>;

  const datasets = subjects.map((sub,i) => ({
    label: sub,
    data: labels.map(date => {
      const e = raw.find(r => r.dateDay===date && r.subject_name===sub);
      return e ? parseFloat(e.avg_note) : 0;
    }),
    borderColor: getPredefinedColors(subjects.length)[i],
    fill: false,
    tension: 0.1
  }));

  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['evolution_notes_by_subject']) ?>
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: <?= json_encode($lang_data['notes_label']) ?> }
        },
        x: {
          title: { display: true, text: <?= json_encode($lang_data['date_label']) ?> }
        }
      }
    }
  });
})();

<?php endif; ?>

// 15. Ratio Ratio QCM avec document / sans document
<?php if (!empty($docRatio)): ?>

(function(){
  const ctx      = document.getElementById('docRatioChart').getContext('2d');
  const labels   = <?= json_encode(array_column($docRatio, 'doc_status')) ?>;
  const dataVals = <?= json_encode(array_column($docRatio, 'count_docs')) ?>;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataVals,
        backgroundColor: getPredefinedColors(labels.length),
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: <?= json_encode($lang_data['qcm_document_ratio']) ?>
        }
      }
    }
  });
})();

<?php endif; ?>

</script>


<?php include 'includes/footer.php'; ?>
</body>
</html>
