<?php
// subjectList.php

session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'config.php';
requireSubscription($pdo);

require_once 'vendor/autoload.php';
include 'includes/header.php'; // Contient Bootstrap/CSS/JS

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

$userUuid = $_SESSION['user_uuid'];

// ---------------------------------------------
// 1) Vérifier si l'utilisateur a rempli son curriculum
// ---------------------------------------------
$stmtCur = $pdo->prepare("
    SELECT 
        student_type,
        student_country,
        student_school_class,
        student_academic_course_1,
        student_academic_diploma_1,
        student_academic_year_1
    FROM studentCurriculum
    WHERE uuid = :uuid
    LIMIT 1
");
$stmtCur->execute([':uuid' => $userUuid]);
$curriculum = $stmtCur->fetch(PDO::FETCH_ASSOC);

$showCurriculumModal = false;
$studentTypeInDb     = ''; // Pour usage en JS

if (!$curriculum) {
    $showCurriculumModal = true;
} else {
    $studentTypeInDb = $curriculum['student_type'] ?? '';
    $country         = $curriculum['student_country'] ?? '';

    if (empty($studentTypeInDb) || empty($country)) {
        $showCurriculumModal = true;
    } elseif ($studentTypeInDb === 'school') {
        $class = $curriculum['student_school_class'] ?? '';
        if (empty($class)) {
            $showCurriculumModal = true;
        }
    } elseif ($studentTypeInDb === 'academic') {
        $course  = $curriculum['student_academic_course_1']  ?? '';
        $diploma = $curriculum['student_academic_diploma_1'] ?? '';
        $year    = $curriculum['student_academic_year_1']    ?? '';
        if (empty($course) || empty($diploma) || empty($year)) {
            $showCurriculumModal = true;
        }
    }
}

// ---------------------------------------------
// 2) Charger la liste des matières (studySubjects)
// ---------------------------------------------
$stmtMySubjects = $pdo->prepare("
    SELECT 
        id,
        subject_name,
        subject_unit,
        course_name,
        created_time
    FROM studySubjects
    WHERE uuid = :uuid
    ORDER BY created_time DESC
");
$stmtMySubjects->execute([':uuid' => $userUuid]);
$mySubjects = $stmtMySubjects->fetchAll(PDO::FETCH_ASSOC);

// Gestion des messages / feedback
$addSubjectSuccess    = isset($_GET['addSubjectSuccess']);
$addSubjectError      = isset($_GET['addSubjectError']) ? $_GET['addSubjectError'] : '';
$subjectAlreadyExists = isset($_GET['subjectAlreadyExists']) && $_GET['subjectAlreadyExists'] == 1;

$uploadSuccess = '';
$uploadError   = '';
if (isset($_GET['uploadSuccess'])) {
    $uploadSuccess = $lang_data['upload_success'] ?? "Upload réussi.";
}
if (isset($_GET['uploadError'])) {
    $uploadError = htmlspecialchars($_GET['uploadError']);
}

$updateSuccess = isset($_GET['updateSuccess']);
$docAddSuccess = isset($_GET['docAddSuccess']);
$docAddError   = isset($_GET['docAddError']) ? $_GET['docAddError'] : '';

// ---------------------------------------------
// 3) Préparer les filtres du formulaire
// ---------------------------------------------
// Filtre "Subject" : sélection des subject_name de studySubjects
$stmtDistinctSubjects = $pdo->prepare("SELECT DISTINCT subject_name FROM studySubjects WHERE uuid = :uuid AND subject_name <> '' ORDER BY subject_name ASC");
$stmtDistinctSubjects->execute([':uuid' => $userUuid]);
$distinctSubjects = $stmtDistinctSubjects->fetchAll(PDO::FETCH_COLUMN);

// Filtre "Topic" : sélection des topics de subjectDocuments
$stmtDistinctTopics = $pdo->prepare("SELECT DISTINCT topic FROM subjectDocuments WHERE uuid = :uuid AND topic <> '' ORDER BY topic ASC");
$stmtDistinctTopics->execute([':uuid' => $userUuid]);
$distinctTopics = $stmtDistinctTopics->fetchAll(PDO::FETCH_COLUMN);

// Initialiser les filtres récupérés via GET
$filterSubject = isset($_GET['filterSubject']) ? trim($_GET['filterSubject']) : '';
$topicFilter   = isset($_GET['topicFilter'])   ? trim($_GET['topicFilter'])   : '';
$filterDate    = isset($_GET['filterDate'])    ? trim($_GET['filterDate'])    : '';
$generalSearch = isset($_GET['generalSearch']) ? trim($_GET['generalSearch']) : '';
$filterStudy   = '';
$distinctStudies = [];
if ($studentTypeInDb === 'academic') {
    // Filtre "Study" : sélection des course_name de studySubjects
    $stmtDistinctStudies = $pdo->prepare("SELECT DISTINCT course_name FROM studySubjects WHERE uuid = :uuid AND course_name <> '' ORDER BY course_name ASC");
    $stmtDistinctStudies->execute([':uuid' => $userUuid]);
    $distinctStudies = $stmtDistinctStudies->fetchAll(PDO::FETCH_COLUMN);
    $filterStudy = isset($_GET['study']) ? trim($_GET['study']) : '';
}

// ---------------------------------------------
// 4) Pagination / Construction des requêtes SQL
// ---------------------------------------------
$limit  = 18;
$page   = (isset($_GET['page']) && is_numeric($_GET['page'])) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

try {
    // Requête de comptage avec jointure sur studySubjects
    $countQuery = "SELECT COUNT(*) FROM subjectDocuments D
                   LEFT JOIN studySubjects SS ON D.study_subjects_id = SS.id
                   WHERE D.uuid = :uuid";
    $params = [':uuid' => $userUuid];

    if ($topicFilter !== '') {
        $countQuery .= " AND LOWER(D.topic) LIKE :topicFilter";
        $params[':topicFilter'] = '%' . strtolower($topicFilter) . '%';
    }
    if ($generalSearch !== '') {
        $countQuery .= " AND (LOWER(D.topic) LIKE :generalSearch OR LOWER(D.sub_topic) LIKE :generalSearch OR LOWER(SS.subject_name) LIKE :generalSearch)";
        $params[':generalSearch'] = '%' . strtolower($generalSearch) . '%';
    }
    if ($filterDate !== '') {
        $dates = explode(' to ', $filterDate);
        if (count($dates) === 2) {
            $countQuery .= " AND DATE(D.created_time) BETWEEN :start_date AND :end_date";
            $params[':start_date'] = $dates[0];
            $params[':end_date']   = $dates[1];
        } elseif (count($dates) === 1) {
            $countQuery .= " AND DATE(D.created_time) = :exact_date";
            $params[':exact_date'] = $dates[0];
        }
    }
    if ($filterSubject !== '') {
        $countQuery .= " AND LOWER(SS.subject_name) LIKE :filterSubject";
        $params[':filterSubject'] = '%' . strtolower($filterSubject) . '%';
    }
    if ($filterStudy !== '') {
        $countQuery .= " AND LOWER(SS.course_name) LIKE :filterStudy";
        $params[':filterStudy'] = '%' . strtolower($filterStudy) . '%';
    }

    $stmtTotal = $pdo->prepare($countQuery);
    $stmtTotal->execute($params);
    $totalDocuments = $stmtTotal->fetchColumn();
    $totalPages     = ceil($totalDocuments / $limit);

    // Requête principale pour lister les documents
    $query = "
        SELECT D.*,
               SS.subject_name AS ss_subject_name,
               SS.subject_unit AS ss_subject_unit,
               SS.course_name  AS ss_course_name,
               (SELECT COUNT(*) FROM documentQuestions WHERE subject_document_id = D.id) AS has_qcm,
               (SELECT COUNT(*) FROM documentResumes   WHERE subject_document_id = D.id) AS has_summary,
               (SELECT COUNT(*) FROM documentPairs     WHERE subject_document_id = D.id) AS has_pair,
               (SELECT COUNT(*) FROM documentFlash     WHERE subject_document_id = D.id) AS has_flash,
               (SELECT COUNT(*) FROM documentMiss      WHERE subject_document_id = D.id) AS has_miss
        FROM subjectDocuments D
        LEFT JOIN studySubjects SS ON D.study_subjects_id = SS.id
        WHERE D.uuid = :uuid
    ";
    if ($topicFilter !== '') {
        $query .= " AND LOWER(D.topic) LIKE :topicFilter";
    }
    if ($generalSearch !== '') {
        $query .= " AND (LOWER(D.topic) LIKE :generalSearch OR LOWER(D.sub_topic) LIKE :generalSearch OR LOWER(SS.subject_name) LIKE :generalSearch)";
    }
    if ($filterDate !== '') {
        if (count($dates) === 2) {
            $query .= " AND DATE(D.created_time) BETWEEN :start_date AND :end_date";
        } elseif (count($dates) === 1) {
            $query .= " AND DATE(D.created_time) = :exact_date";
        }
    }
    if ($filterSubject !== '') {
        $query .= " AND LOWER(SS.subject_name) LIKE :filterSubject";
    }
    if ($filterStudy !== '') {
        $query .= " AND LOWER(SS.course_name) LIKE :filterStudy";
    }
    $query .= " ORDER BY D.created_time DESC LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':uuid', $userUuid, PDO::PARAM_STR);
    if ($topicFilter !== '') {
        $stmt->bindValue(':topicFilter', '%' . strtolower($topicFilter) . '%', PDO::PARAM_STR);
    }
    if ($generalSearch !== '') {
        $stmt->bindValue(':generalSearch', '%' . strtolower($generalSearch) . '%', PDO::PARAM_STR);
    }
    if ($filterDate !== '') {
        if (count($dates) === 2) {
            $stmt->bindValue(':start_date', $dates[0], PDO::PARAM_STR);
            $stmt->bindValue(':end_date',   $dates[1], PDO::PARAM_STR);
        } elseif (count($dates) === 1) {
            $stmt->bindValue(':exact_date', $dates[0], PDO::PARAM_STR);
        }
    }
    if ($filterSubject !== '') {
        $stmt->bindValue(':filterSubject', '%' . strtolower($filterSubject) . '%', PDO::PARAM_STR);
    }
    if ($filterStudy !== '') {
        $stmt->bindValue(':filterStudy', '%' . strtolower($filterStudy) . '%', PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit',  $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();
    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    die("Erreur : " . htmlspecialchars($e->getMessage()));
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> <!-- Responsive -->
    <title><?= htmlspecialchars($lang_data['my_subject_documents_title'] ?? 'Mes matières') ?></title>

    <!-- Flatpickr CSS -->
    <link href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .dropdown-menu.custom-shadow {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
        }
    </style>
</head>
<body>

<?php if ($showCurriculumModal): ?>
<!-- Forcer l'affichage du modal Curriculum -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById('curriculumModal');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
});
</script>
<?php endif; ?>

<script>
const studentTypeInDb = "<?= $studentTypeInDb ?>";
</script>

<div class="container py-5">

    <!-- MESSAGES DIVERS -->
    <?php if ($addSubjectSuccess): ?>
        <div class="alert alert-success text-center">
            <?= htmlspecialchars($lang_data['subject_added_success'] ?? 'Votre matière a été ajoutée.') ?>
        </div>
    <?php endif; ?>

    <?php if ($subjectAlreadyExists): ?>
        <div class="alert alert-warning text-center">
            <?= htmlspecialchars($lang_data['subject_exists_warning'] ?? 'Cette matière existe déjà.') ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($addSubjectError)): ?>
        <div class="alert alert-danger text-center">
            <?= htmlspecialchars(($lang_data['subject_add_error'] ?? "Erreur lors de l'ajout de la matière : ") . $addSubjectError) ?>
        </div>
    <?php endif; ?>

    <?php if ($docAddSuccess): ?>
        <div class="alert alert-success text-center">
            <?= htmlspecialchars($lang_data['doc_created_success'] ?? 'Nouveau document créé avec succès !') ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($docAddError)): ?>
        <div class="alert alert-danger text-center">
            <?= htmlspecialchars(($lang_data['doc_create_error'] ?? "Erreur lors de la création du document : ") . $docAddError) ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($uploadSuccess)): ?>
        <div class="alert alert-success text-center">
            <?= htmlspecialchars($uploadSuccess) ?>
        </div>
    <?php elseif (!empty($uploadError)): ?>
        <div class="alert alert-danger text-center">
            <?= htmlspecialchars(($lang_data['upload_error'] ?? "Erreur lors de l'upload : ") . $uploadError) ?>
        </div>
    <?php endif; ?>

    <?php if ($updateSuccess): ?>
        <div class="alert alert-success text-center">
            <?= htmlspecialchars($lang_data['update_success'] ?? 'Le document a été mis à jour.') ?>
        </div>
    <?php endif; ?>

<!-- MES MATIÈRES -->
<h2 class="mb-4 text-center"><?= htmlspecialchars($lang_data['subjects_title'] ?? 'Mes Matières') ?></h2>

<?php if (count($mySubjects) === 0): ?>
    <div class="alert alert-info text-center">
        <?= htmlspecialchars($lang_data['no_subjects'] ?? 'Aucune matière pour le moment.') ?>
    </div>
<?php endif; ?>

<div class="row g-4">
    <?php foreach ($mySubjects as $subj): ?>
        <div class="col-lg-2 col-6">
            <div class="card h-100 text-center position-relative">
                <!-- Lien principal pour ajouter un document -->
                <a href="#"
                   class="text-decoration-none subject-click d-block"
                   data-bs-toggle="modal"
                   data-bs-target="#addDocFromSubjectModal"
                   data-study-subject-id="<?= $subj['id'] ?>"
                   title="<?= htmlspecialchars($lang_data['add_document'] ?? 'Ajouter un document') ?>">
                    <div class="card-body d-flex flex-column justify-content-center align-items-center">
                        <i class="fas fa-plus-circle fa-2x mb-2"></i>
                        <h5 class="card-title"><?= htmlspecialchars($subj['subject_name']) ?></h5>
                        <span class="text-dark">
                            <?php if (!empty($subj['subject_unit'])): ?>
                                <p>
                                    <strong><?= htmlspecialchars($lang_data['subject_unit_label'] ?? 'Coefficient') ?> :</strong>
                                    <?= htmlspecialchars($subj['subject_unit']) ?>
                                </p>
                            <?php elseif (!empty($subj['course_name'])): ?>
                                <p>
                                    <strong><?= htmlspecialchars($lang_data['course_label'] ?? 'Cours') ?> :</strong>
                                    <?= htmlspecialchars($subj['course_name']) ?>
                                </p>
                            <?php else: ?>
                                <p class="text-muted"><?= htmlspecialchars($lang_data['no_details'] ?? 'Aucun détail.') ?></p>
                            <?php endif; ?>
                        </span>
                    </div>
                </a>
                <!-- Dropdown pour le menu -->
                <div class="dropup position-absolute bottom-0 start-0">
                    <a style="padding:5px;margin:5px;" class="dropdown-toggle text-decoration-none" href="#" role="button" id="dropdownMenuLink<?= $subj['id'] ?>" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-ellipsis-v"></i>
                    </a>
                    <ul class="dropdown-menu shadow" aria-labelledby="dropdownMenuLink<?= $subj['id'] ?>" style="z-index: 9999; background-color:#bababa;">
                        <li>
                            <form method="POST" action="deleteSubject.php" onsubmit="return confirm('<?= htmlspecialchars($lang_data['delete_subject'] ?? 'Voulez-vous vraiment supprimer cette matière ?') ?>');">
                                <input type="hidden" name="subject_id" value="<?= $subj['id'] ?>">
                                <button type="submit" class="dropdown-item"><?= htmlspecialchars($lang_data['delete'] ?? 'Supprimer') ?></button>
                            </form>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    <?php endforeach; ?>

    <!-- Carte d'ajout de matière -->
    <div class="col-lg-2 col-6">
        <div class="card h-100 text-center d-flex align-items-center justify-content-center" style="cursor:pointer; background-color:#0097b2; color:#ffffff;" data-bs-toggle="modal" data-bs-target="#addSubjectModal">
            <div class="card-body" style="background-color:transparent;">
                <i class="fas fa-plus fa-3x"></i>
                <h6 class="card-title mt-2 text-white"><?= htmlspecialchars($lang_data['add_subject_btn'] ?? 'Ajouter une matière') ?></h6>
            </div>
        </div>
    </div>
</div>

<hr class="my-5" />

<!-- MES DOCUMENTS -->
<h1 class="mb-4 text-center" id="documentsContainer"><?= htmlspecialchars($lang_data['my_documents_title'] ?? 'Mes Documents') ?></h1>
<div class="text-end mb-3">
    <button id="toggleFilters" class="btn btn-light">
        <i class="fas fa-filter"></i> <?= htmlspecialchars($lang_data['filter'] ?? 'Filtrer') ?>
    </button>
</div>

<!-- Zone de Filtres -->
<div id="filtersContainer" class="card mb-4 p-3 hidden">
    <div class="card-body">
        <form method="GET" action="subjectList.php" class="row g-3 align-items-center filter-form">
            <!-- Ligne 1 : Sélections Subject, Topic et Study (si academic) -->
            <div class="col-md-<?= $studentTypeInDb === 'academic' ? '4' : '6' ?>">
                <select name="filterSubject" id="filterSubject" class="form-select">
                    <option value=""><?= htmlspecialchars($lang_data['all_subjects'] ?? 'Toutes les matières') ?></option>
                    <?php foreach ($distinctSubjects as $s): ?>
                        <option value="<?= htmlspecialchars($s) ?>" <?= ($s === $filterSubject) ? 'selected' : '' ?>>
                            <?= htmlspecialchars($s) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-<?= $studentTypeInDb === 'academic' ? '4' : '6' ?>">
                <select name="topicFilter" id="topicFilter" class="form-select">
                    <option value=""><?= htmlspecialchars($lang_data['all_topics'] ?? 'Tous les topics') ?></option>
                    <?php foreach ($distinctTopics as $t): ?>
                        <option value="<?= htmlspecialchars($t) ?>" <?= ($t === $topicFilter) ? 'selected' : '' ?>>
                            <?= htmlspecialchars($t) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php if($studentTypeInDb === 'academic'): ?>
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
            <!-- Ligne 2 : Date et Recherche globale -->
            <div class="col-md-6">
                <input type="text" id="filterDate" name="filterDate" class="form-control" placeholder="<?= htmlspecialchars($lang_data['filter_date_placeholder'] ?? 'Choisir une date ou période') ?>" value="<?= htmlspecialchars($filterDate) ?>" readonly>
            </div>
            <div class="col-md-6">
                <input type="text" id="generalSearch" name="generalSearch" class="form-control" placeholder="<?= htmlspecialchars($lang_data['search_placeholder'] ?? 'Recherche globale') ?>" value="<?= htmlspecialchars($generalSearch) ?>">
            </div>
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

<?php if (count($documents) === 0): ?>
    <div class="alert alert-info text-center"><?= htmlspecialchars($lang_data['no_documents'] ?? 'Aucun document trouvé.') ?></div>
<?php else: ?>
    <div id="documentsContainer" class="row g-4">
        <?php foreach ($documents as $doc): 
            // Construire le titre à partir des infos de studySubjects
            $title = $doc['ss_subject_name'];
            if (!empty($doc['ss_subject_unit'])) {
                $title .= " (" . htmlspecialchars($doc['ss_subject_unit']) . ")";
            } elseif (!empty($doc['ss_course_name'])) {
                $title .= " (" . htmlspecialchars($doc['ss_course_name']) . ")";
            }
        ?>
        <div class="col-lg-4 col-md-6 document-card" data-date="<?= htmlspecialchars(date('Y-m-d', strtotime($doc['created_time']))) ?>" data-subject="<?= htmlspecialchars($doc['topic'] ?? '') ?>">
            <div class="card shadow-sm h-100">
                <div class="card-body d-flex flex-column">
                    <!-- Header : Affichage du topic -->
                    <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="mb-0 text-truncate"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="<?= htmlspecialchars($doc['topic'] ?? $lang_data['unknown_topic'] ?? 'Topic inconnu') ?>">
                        <?= htmlspecialchars($doc['topic'] ?? $lang_data['unknown_topic'] ?? 'Topic inconnu') ?>
                    </h5>
                        <div class="ms-2 d-flex align-items-center">
                            <!-- Bouton Éditer -->
                            <button type="button" class="btn btn-link p-0 me-2" data-bs-toggle="modal" data-bs-target="#editModal-<?= $doc['id'] ?>" title="<?= htmlspecialchars($lang_data['edit_document'] ?? 'Éditer ce document') ?>">
                                <i class="fas fa-edit" style="font-size:1.2rem;color:#0097b2;"></i>
                            </button>
                            <!-- Bouton Supprimer -->
                            <form method="POST" action="deleteSubjectDocument.php" onsubmit="return confirm('<?= htmlspecialchars($lang_data['delete_document_confirmation'] ?? 'Supprimer ce document ?') ?>');">
                                <input type="hidden" name="subject_document_id" value="<?= htmlspecialchars($doc['id']) ?>">
                                <button type="submit" class="btn btn-link p-0" title="<?= htmlspecialchars($lang_data['delete_document_confirmation'] ?? 'Supprimer ce document') ?>">
                                    <i class="fas fa-trash" style="font-size:1.2rem;color:#19d1f1;"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                    <!-- Date -->
                    <p class="text-muted mb-1">
                        <i class="far fa-calendar-alt"></i>
                        <?= htmlspecialchars(date('d/m/Y H:i', strtotime($doc['created_time']))) ?>
                    </p>
                    <!-- Affichage du titre (matière) -->
                    <?php if (!empty($title)): ?>
                        <p class="mb-1"><strong><?= htmlspecialchars($lang_data['subject_label'] ?? 'Matière') ?> :</strong> <?= htmlspecialchars($title) ?></p>
                    <?php endif; ?>
                    <!-- Sub_topic -->
                    <?php if (!empty($doc['sub_topic'])): ?>
                        <p class="small text-muted"><?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic') ?>: <?= htmlspecialchars($doc['sub_topic']) ?></p>
                    <?php endif; ?>
                    <!-- Boutons QCM, Résumé, Paires, Flash, Miss -->
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between w-100 mb-2">
                            <div class="flex-fill me-1">
                                <?php if ($doc['has_qcm'] > 0): ?>
                                    <a href="questionForm.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-primary btn-sm w-100">
                                        <i class="fas fa-eye"></i> <?= htmlspecialchars($lang_data['view_qcm'] ?? 'Voir QCM') ?>
                                    </a>
                                <?php else: ?>
                                    <button type="button" class="btn btn-outline-primary btn-sm generate-qcm-btn w-100" data-document-id="<?= htmlspecialchars($doc['id']) ?>" data-language="<?= htmlspecialchars($doc['language']) ?>" data-subject="<?= htmlspecialchars($doc['topic'] ?? '') ?>" data-bs-toggle="modal" data-bs-target="#generateQCMModal">
                                        <i class="fas fa-plus"></i> <?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?>
                                    </button>
                                <?php endif; ?>
                            </div>
                            <div class="flex-fill ms-1">
                                <?php if ($doc['has_summary'] > 0): ?>
                                    <a href="viewSummary.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-primary btn-sm w-100">
                                        <i class="fas fa-eye"></i> <?= htmlspecialchars($lang_data['view_summary'] ?? 'Voir Résumé') ?>
                                    </a>
                                <?php else: ?>
                                    <button type="button" class="btn btn-outline-primary btn-sm generate-summary-btn w-100" data-document-id="<?= htmlspecialchars($doc['id']) ?>" data-language="<?= htmlspecialchars($doc['language']) ?>" data-bs-toggle="modal" data-bs-target="#generateSummaryModal">
                                        <i class="fas fa-plus"></i> <?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?>
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between w-100">
                            <div class="flex-fill me-1">
                                <?php if ($doc['has_pair'] > 0): ?>
                                    <a href="viewPair.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm w-100">
                                        <i class="fas fa-eye"></i> <?= htmlspecialchars($lang_data['view_pairs'] ?? 'Voir Paires') ?>
                                    </a>
                                <?php else: ?>
                                    <button type="button" class="btn btn-outline-secondary btn-sm generate-pair-btn w-100" data-document-id="<?= htmlspecialchars($doc['id']) ?>" data-language="<?= htmlspecialchars($doc['language'] ?? 'he') ?>" data-bs-toggle="modal" data-bs-target="#generatePairModal">
                                        <i class="fas fa-plus"></i> <?= htmlspecialchars($lang_data['generate_pair'] ?? 'Générer Paires') ?>
                                    </button>
                                <?php endif; ?>
                            </div>
                            <div class="flex-fill mx-1">
                                <?php if ($doc['has_flash'] > 0): ?>
                                    <a href="viewFlash.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm w-100">
                                        <i class="fas fa-eye"></i> <?= htmlspecialchars($lang_data['view_flash'] ?? 'Voir Flash') ?>
                                    </a>
                                <?php else: ?>
                                    <button type="button" class="btn btn-outline-secondary btn-sm generate-flash-btn w-100" data-document-id="<?= htmlspecialchars($doc['id']) ?>" data-language="<?= htmlspecialchars($doc['language'] ?? 'he') ?>" data-bs-toggle="modal" data-bs-target="#generateFlashModal">
                                        <i class="fas fa-plus"></i> <?= htmlspecialchars($lang_data['generate_flash'] ?? 'Générer Flash') ?>
                                    </button>
                                <?php endif; ?>
                            </div>
                            <div class="flex-fill ms-1">
                                <?php if ($doc['has_miss'] > 0): ?>
                                    <a href="viewMiss.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm w-100">
                                        <i class="fas fa-eye"></i> <?= htmlspecialchars($lang_data['view_miss'] ?? 'Voir Miss') ?>
                                    </a>
                                <?php else: ?>
                                    <button type="button" class="btn btn-outline-secondary btn-sm generate-miss-btn w-100" data-document-id="<?= htmlspecialchars($doc['id']) ?>" data-language="<?= htmlspecialchars($doc['language'] ?? 'he') ?>" data-bs-toggle="modal" data-bs-target="#generateMissModal">
                                        <i class="fas fa-plus"></i> <?= htmlspecialchars($lang_data['generate_miss'] ?? 'Générer Miss') ?>
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div><!-- .card-body -->
            </div><!-- .card -->
        </div><!-- .col -->
        <!-- MODAL Éditer le Document -->
        <div class="modal fade" id="editModal-<?= $doc['id'] ?>" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <form method="POST" action="updateSubjectDocument.php">
                        <div class="modal-header">
                            <h5 class="modal-title"><?= htmlspecialchars($lang_data['edit_document'] ?? 'Éditer le Document') ?></h5>
                            <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" name="subject_document_id" value="<?= htmlspecialchars($doc['id']) ?>">
                            <!-- Select pour la matière -->
                            <div class="mb-3">
                                <label class="form-label"><?= htmlspecialchars($lang_data['subject_label'] ?? 'Matière') ?></label>
                                <select name="study_subjects_id" class="form-select edit-study-subject">
                                    <?php if (!empty($doc['study_subjects_id'])): ?>
                                        <option value="<?= htmlspecialchars($doc['study_subjects_id']) ?>">
                                            <?= htmlspecialchars($doc['ss_subject_name']) ?>
                                        </option>
                                    <?php else: ?>
                                        <option value=""><?= htmlspecialchars($lang_data['select_option'] ?? '-- Sélectionnez --') ?></option>
                                    <?php endif; ?>
                                </select>
                            </div>
                            <!-- Topic -->
                            <div class="mb-3">
                                <label class="form-label"><?= htmlspecialchars($lang_data['topic_label'] ?? 'Topic (obligatoire)') ?></label>
                                <input type="text" name="topic" class="form-control" value="<?= htmlspecialchars($doc['topic'] ?? '') ?>" required>
                            </div>
                            <!-- Sub_topic -->
                            <div class="mb-3">
                                <label class="form-label"><?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic (optionnel)') ?></label>
                                <input type="text" name="sub_topic" class="form-control" value="<?= htmlspecialchars($doc['sub_topic'] ?? '') ?>">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?></button>
                            <button type="submit" class="btn btn-primary"><?= htmlspecialchars($lang_data['save'] ?? 'Enregistrer') ?></button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <!-- Fin MODAL Éditer -->
    <?php endforeach; ?>
    </div><!-- #documentsContainer -->

    <!-- PAGINATION -->
    <?php if ($totalPages > 1): ?>
        <nav aria-label="Page navigation" class="mt-5">
            <ul class="pagination justify-content-center">
                <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                    <a class="page-link" href="?page=<?= max(1, $page - 1) ?>
<?= $filterSubject ? '&filterSubject=' . urlencode($filterSubject) : '' ?>
<?= $topicFilter ? '&topicFilter=' . urlencode($topicFilter) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $generalSearch ? '&generalSearch=' . urlencode($generalSearch) : '' ?>
<?= $filterStudy ? '&study=' . urlencode($filterStudy) : '' ?>" aria-label="<?= htmlspecialchars($lang_data['previous'] ?? 'Précédent') ?>">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
                <?php
                $maxDisplay = 5;
                $start = max(1, $page - floor($maxDisplay / 2));
                $end   = min($totalPages, $start + $maxDisplay - 1);
                if ($end - $start + 1 < $maxDisplay) {
                    $start = max(1, $end - $maxDisplay + 1);
                }
                for ($p = $start; $p <= $end; $p++):
                ?>
                    <li class="page-item <?= ($p == $page) ? 'active' : '' ?>">
                        <a class="page-link" href="?page=<?= $p ?>
<?= $filterSubject ? '&filterSubject=' . urlencode($filterSubject) : '' ?>
<?= $topicFilter ? '&topicFilter=' . urlencode($topicFilter) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $generalSearch ? '&generalSearch=' . urlencode($generalSearch) : '' ?>
<?= $filterStudy ? '&study=' . urlencode($filterStudy) : '' ?>">
                            <?= $p ?>
                        </a>
                    </li>
                <?php endfor; ?>
                <li class="page-item <?= ($page >= $totalPages) ? 'disabled' : '' ?>">
                    <a class="page-link" href="?page=<?= min($totalPages, $page + 1) ?>
<?= $filterSubject ? '&filterSubject=' . urlencode($filterSubject) : '' ?>
<?= $topicFilter ? '&topicFilter=' . urlencode($topicFilter) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $generalSearch ? '&generalSearch=' . urlencode($generalSearch) : '' ?>
<?= $filterStudy ? '&study=' . urlencode($filterStudy) : '' ?>" aria-label="<?= htmlspecialchars($lang_data['next'] ?? 'Suivant') ?>">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        </nav>
    <?php endif; ?>
<?php endif; ?>
</div><!-- .container -->

<!-- MODAL : AJOUT D'UNE MATIÈRE -->
<div class="modal fade" id="addSubjectModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="addSubject.php" class="modal-content" id="addSubjectForm">
      <div class="modal-header">
        <h5 class="modal-title"><?= htmlspecialchars($lang_data['add_new_subject'] ?? 'Ajouter une nouvelle matière') ?></h5>
        <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <?php if ($studentTypeInDb === 'school'): ?>
          <!-- PARTIE SCHOOL -->
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['subject_label'] ?? 'Matière') ?></label>
            <select name="subject_name" id="subject_name" class="form-select">
              <option value=""><?= htmlspecialchars($lang_data['select_subject_option'] ?? '-- Sélectionnez une matière --') ?></option>
              <option value="other"><?= htmlspecialchars($lang_data['other'] ?? 'Autre...') ?></option>
            </select>
          </div>
          <div class="mb-3 d-none" id="manualSubjectContainer">
            <label class="form-label"><?= htmlspecialchars($lang_data['enter_subject'] ?? 'Saisir la matière') ?></label>
            <input type="text" name="manual_subject" id="manual_subject" class="form-control" placeholder="<?= htmlspecialchars($lang_data['subject_example'] ?? 'Ex: Philosophie') ?>">
          </div>
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['subject_unit_label'] ?? 'Coefficient') ?></label>
            <input type="text" name="subject_unit" class="form-control" placeholder="<?= htmlspecialchars($lang_data['subject_unit_example'] ?? 'Ex: 4') ?>">
          </div>
        <?php elseif ($studentTypeInDb === 'academic'): ?>
          <!-- PARTIE ACADEMIC -->
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['course_label'] ?? 'Course') ?></label>
            <select name="course_name" id="course_name" class="form-select">
              <option value=""><?= htmlspecialchars($lang_data['select_course_option'] ?? '-- Sélectionnez un cours --') ?></option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['subject_label'] ?? 'Sujet') ?></label>
            <input type="text" name="subject_name" class="form-control" placeholder="<?= htmlspecialchars($lang_data['subject_placeholder'] ?? 'Ex: Chapitre 1') ?>" required>
          </div>
        <?php else: ?>
          <p class="text-danger"><?= htmlspecialchars($lang_data['undefined_student_type'] ?? "Votre type d'étudiant n'est pas défini ou non reconnu.") ?></p>
        <?php endif; ?>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['cancel'] ?? 'Annuler') ?></button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> <?= htmlspecialchars($lang_data['save'] ?? 'Enregistrer') ?>
        </button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL : CRÉER UN DOCUMENT D'UNE MATIÈRE -->
<div class="modal fade" id="addDocFromSubjectModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="addSubjectDocument.php" class="modal-content" id="docFromSubjectForm">
      <div class="modal-header">
        <h5 class="modal-title"><?= htmlspecialchars($lang_data['create_document'] ?? 'Créer un Document') ?></h5>
        <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <!-- Champ caché pour l'ID de la matière -->
        <input type="hidden" name="study_subjects_id" id="study_subjects_id" />
        <div class="mb-3">
          <label class="form-label"><?= htmlspecialchars($lang_data['topic_label'] ?? 'Topic (obligatoire)') ?></label>
          <input type="text" class="form-control" name="topic" placeholder="<?= htmlspecialchars($lang_data['topic_placeholder'] ?? 'Ex: Chapitre 1') ?>" required>
        </div>
        <div class="mb-3">
          <label class="form-label"><?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic (optionnel)') ?></label>
          <input type="text" class="form-control" name="sub_topic" placeholder="<?= htmlspecialchars($lang_data['sub_topic_placeholder'] ?? 'Ex: Partie 1') ?>">
        </div>
        <input type="hidden" name="language" value="he" />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['cancel'] ?? 'Annuler') ?></button>
        <button type="submit" class="btn btn-primary"><?= htmlspecialchars($lang_data['create_document'] ?? 'Créer le Document') ?></button>
      </div>
    </form>
  </div>
</div>

<!-- MODAL CURRICULUM FORCÉ -->
<?php if ($showCurriculumModal): ?>
<div class="modal fade" id="curriculumModal" style="display:block;background:rgba(0,0,0,0.5);" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <form action="updateStudentCurriculum.php" method="POST" class="modal-content" id="curriculumForm">
      <input type="hidden" name="from_page" value="subjectList">
      <div class="modal-header">
        <h5 class="modal-title"><?= htmlspecialchars($lang_data['curriculum_modal_title'] ?? 'Complétez vos informations') ?></h5>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label"><?= htmlspecialchars($lang_data['student_country_label'] ?? "Pays d'étude") ?></label>
          <select name="student_country" id="student_country" class="form-select" required>
            <option value=""><?= htmlspecialchars($lang_data['select_country_option'] ?? '-- Sélectionnez un pays --') ?></option>
            <option value="israel">Israel</option>
            <option value="france">France</option>
            <option value="usa">USA</option>
            <option value="uk">UK</option>
            <option value="russia">Russia</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label"><?= htmlspecialchars($lang_data['student_type_label'] ?? "Type d'Étudiant") ?></label>
          <select name="student_type" id="student_type" class="form-select" required>
            <option value=""><?= htmlspecialchars($lang_data['select_student_type_option'] ?? '-- Choisir --') ?></option>
            <option value="school"><?= htmlspecialchars($lang_data['school'] ?? 'School') ?></option>
            <option value="academic"><?= htmlspecialchars($lang_data['academic'] ?? 'Academic') ?></option>
          </select>
        </div>
        <!-- Bloc School -->
        <div id="schoolFields" class="d-none">
          <div class="mb-3">
            <label><?= htmlspecialchars($lang_data['class_label'] ?? 'Classe') ?></label>
            <select name="student_school_class" id="student_school_class" class="form-select">
              <option value=""><?= htmlspecialchars($lang_data['select_class_option'] ?? '-- Sélectionnez la classe --') ?></option>
            </select>
          </div>
        </div>
        <!-- Bloc Academic (3 lignes) -->
        <div id="academicFields" class="d-none">
          <!-- LIGNE 1 -->
          <div class="row g-2 mb-3">
            <div class="col">
              <label><?= htmlspecialchars($lang_data['course_label'] ?? 'Course 1') ?></label>
              <select name="student_academic_course_1" id="course_1" class="form-select"></select>
            </div>
            <div class="col">
              <label><?= htmlspecialchars($lang_data['diploma_label'] ?? 'Diplôme 1') ?></label>
              <select name="student_academic_diploma_1" id="diploma_1" class="form-select"></select>
            </div>
            <div class="col">
              <label><?= htmlspecialchars($lang_data['year_label'] ?? 'Année 1') ?></label>
              <select name="student_academic_year_1" id="year_1" class="form-select"></select>
            </div>
          </div>
          <!-- LIGNE 2 -->
          <div class="row g-2 mb-3">
            <div class="col">
              <label><?= htmlspecialchars($lang_data['course_label'] ?? 'Course 2') ?></label>
              <select name="student_academic_course_2" id="course_2" class="form-select"></select>
            </div>
            <div class="col">
              <label><?= htmlspecialchars($lang_data['diploma_label'] ?? 'Diplôme 2') ?></label>
              <select name="student_academic_diploma_2" id="diploma_2" class="form-select"></select>
            </div>
            <div class="col">
              <label><?= htmlspecialchars($lang_data['year_label'] ?? 'Année 2') ?></label>
              <select name="student_academic_year_2" id="year_2" class="form-select"></select>
            </div>
          </div>
          <!-- LIGNE 3 -->
          <div class="row g-2 mb-3">
            <div class="col">
              <label><?= htmlspecialchars($lang_data['course_label'] ?? 'Course 3') ?></label>
              <select name="student_academic_course_3" id="course_3" class="form-select"></select>
            </div>
            <div class="col">
              <label><?= htmlspecialchars($lang_data['diploma_label'] ?? 'Diplôme 3') ?></label>
              <select name="student_academic_diploma_3" id="diploma_3" class="form-select"></select>
            </div>
            <div class="col">
              <label><?= htmlspecialchars($lang_data['year_label'] ?? 'Année 3') ?></label>
              <select name="student_academic_year_3" id="year_3" class="form-select"></select>
            </div>
          </div>
        </div>
      </div><!-- .modal-body -->
      <div class="modal-footer">
        <button type="submit" class="btn btn-primary"><?= htmlspecialchars($lang_data['save'] ?? 'Enregistrer') ?></button>
      </div>
    </form>
  </div>
</div>
<?php endif; ?>

<!-- MODAUX : QCM, Résumé, Paires, Flash, Miss -->
<!-- MODAUX : QCM, Résumé, Paires, Flash, Miss -->

<!-- QCM -->
<div class="modal fade" id="generateQCMModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralQuizApi.php" id="generateQCMForm">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="generateQCMModalLabel"><?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?></h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <input type="hidden" name="subject_document_id" id="modal_subject_document_id" value="">
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['theme_label'] ?? 'Thème / Sujet') ?></label>
            <input type="text" class="form-control" id="modal_subject" name="subject" required>
          </div>
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['quiz_language_label'] ?? 'Langue du QCM') ?></label>
            <select class="form-select" id="modal_quiz_language" name="quiz_language" required>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="he">Hébreu</option>
              <option value="ar">Arabe</option>
              <option value="ru">Russe</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['quiz_level_label'] ?? 'Niveau du QCM') ?></label>
            <select class="form-select" id="modal_quiz_level" name="quiz_level" required>
              <option value="facile">Facile</option>
              <option value="moyen" selected>Moyen</option>
              <option value="difficile">Difficile</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['quiz_number_label'] ?? 'Nombre de Questions') ?></label>
            <input type="number" class="form-control" id="modal_quiz_number" name="quiz_number_of_questions" min="1" max="50" value="5" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?></button>
          <button type="submit" class="btn btn-primary"><?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?></button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Résumé -->
<div class="modal fade" id="generateSummaryModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralSummaryApi.php" id="generateSummaryForm">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?></h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <input type="hidden" name="subject_document_id" id="modal_summary_subject_document_id">
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['summary_language_label'] ?? 'Langue du Résumé') ?></label>
            <select class="form-select" id="modal_summary_language" name="summary_language" required>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="he">Hébreu</option>
              <option value="ar">Arabe</option>
              <option value="ru">Russe</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?></button>
          <button type="submit" class="btn btn-primary"><?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?></button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Paires -->
<div class="modal fade" id="generatePairModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralPairApi.php" id="generatePairForm">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><?= htmlspecialchars($lang_data['generate_pair'] ?? 'Générer Paires') ?></h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <input type="hidden" name="subject_document_id" id="modal_pair_subject_document_id">
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['pair_language_label'] ?? 'Langue pour les Paires') ?></label>
            <select class="form-select" id="modal_pair_language" name="pair_language" required>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="he">Hébreu</option>
              <option value="ar">Arabe</option>
              <option value="ru">Russe</option>
            </select>
          </div>
          <p><?= htmlspecialchars($lang_data['generate_pair_confirm'] ?? 'Voulez-vous générer des paires ?') ?></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?></button>
          <button type="submit" class="btn btn-info"><?= htmlspecialchars($lang_data['generate_pair'] ?? 'Générer Paires') ?></button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Flash -->
<div class="modal fade" id="generateFlashModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralFlashApi.php" id="generateFlashForm">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><?= htmlspecialchars($lang_data['generate_flash'] ?? 'Générer Flash') ?></h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <input type="hidden" name="subject_document_id" id="modal_flash_subject_document_id">
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['flash_language_label'] ?? 'Langue pour les Flash') ?></label>
            <select class="form-select" id="modal_flash_language" name="flash_language" required>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="he">Hébreu</option>
              <option value="ar">Arabe</option>
              <option value="ru">Russe</option>
            </select>
          </div>
          <p><?= htmlspecialchars($lang_data['generate_flash_confirm'] ?? 'Voulez-vous générer des flashcards ?') ?></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?></button>
          <button type="submit" class="btn btn-info"><?= htmlspecialchars($lang_data['generate_flash'] ?? 'Générer Flash') ?></button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Miss -->
<div class="modal fade" id="generateMissModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralMissApi.php" id="generateMissForm">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><?= htmlspecialchars($lang_data['generate_miss'] ?? 'Générer Miss') ?></h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <input type="hidden" name="subject_document_id" id="modal_miss_subject_document_id">
          <div class="mb-3">
            <label class="form-label"><?= htmlspecialchars($lang_data['miss_language_label'] ?? 'Langue pour les Miss') ?></label>
            <select class="form-select" id="modal_miss_language" name="miss_language" required>
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="he">Hébreu</option>
              <option value="ar">Arabe</option>
              <option value="ru">Russe</option>
            </select>
          </div>
          <p><?= htmlspecialchars($lang_data['generate_miss_confirm'] ?? 'Voulez-vous générer des exercices “Miss” ?') ?></p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?></button>
          <button type="submit" class="btn btn-info"><?= htmlspecialchars($lang_data['generate_miss'] ?? 'Générer Miss') ?></button>
        </div>
      </div>
    </form>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script>

document.addEventListener('DOMContentLoaded', function() {

    // 1) Toggle / cacher bloc filtres
    const toggleFiltersBtn = document.getElementById('toggleFilters');
    const filtersContainer = document.getElementById('filtersContainer');
    if (toggleFiltersBtn && filtersContainer) {
        toggleFiltersBtn.addEventListener('click', () => {
            filtersContainer.classList.toggle('hidden');
        });
    }

    // 2) Reset des filtres
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            window.location.href = 'subjectList.php';
        });
    }

    // 3) Initialiser Flatpickr
    const filterDateInput = document.getElementById('filterDate');
    if (filterDateInput) {
        flatpickr(filterDateInput, {
            mode: "range",
            dateFormat: "Y-m-d"
        });
    }

    // 4) Charger la liste des matières pour school OU la liste des courses pour academic
    const subjSelect = document.getElementById('subject_name');
    if (studentTypeInDb === 'school' && subjSelect) {
        // Pour school : charger via getSubjects.php?type=school
        fetch('getSubjects.php?type=school')
            .then(resp => resp.json())
            .then(data => {
                data.forEach(item => {
                    const opt = document.createElement('option');
                    opt.value = item;
                    opt.textContent = item;
                    subjSelect.appendChild(opt);
                });
            })
            .catch(err => console.error('Erreur getSubjects (school):', err));
    } else if (studentTypeInDb === 'academic') {
        // Pour academic : charger la liste de courses dans le select "course_name"
        const courseSelect = document.getElementById('course_name');
        if (courseSelect) {
            fetch('getStudentCurriculum.php')
                .then(resp => resp.json())
                .then(courses => {
                    courseSelect.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_course_option"] ?? "-- Sélectionnez un cours --") ?></option>';
                    courses.forEach(course => {
                        const opt = document.createElement('option');
                        opt.value = course;
                        opt.textContent = course;
                        courseSelect.appendChild(opt);
                    });
                })
                .catch(err => console.error('Erreur getStudentCurriculum:', err));
        }
    }

    // 5) Gestion de l'option "Autre" pour school
    if (subjSelect) {
        const manualSubjCont  = document.getElementById('manualSubjectContainer');
        const manualSubjInput = document.getElementById('manual_subject');
        subjSelect.addEventListener('change', function() {
            if (this.value === 'other') {
                manualSubjCont.classList.remove('d-none');
                manualSubjInput.value = '';
                manualSubjInput.focus();
            } else {
                manualSubjCont.classList.add('d-none');
                manualSubjInput.value = '';
            }
        });
    }

    // 6) Au clic sur une matière dans la liste, remplir le champ caché "study_subjects_id" dans le modal Document
    const subjectLinks = document.querySelectorAll('.subject-click');
    const docModalStudyIdInput = document.getElementById('study_subjects_id');
    subjectLinks.forEach(link => {
        link.addEventListener('click', () => {
            const sId = link.getAttribute('data-study-subject-id') || '';
            if (docModalStudyIdInput) {
                docModalStudyIdInput.value = sId;
            }
        });
    });

    // 7) Gestion du modal Curriculum pour afficher les blocs School ou Academic
    const stTypeSel = document.getElementById('student_type');
    const schoolFields = document.getElementById('schoolFields');
    const academicFields = document.getElementById('academicFields');
    if (stTypeSel) {
        stTypeSel.addEventListener('change', function() {
            if (this.value === 'school') {
                schoolFields.classList.remove('d-none');
                academicFields.classList.add('d-none');
            } else if (this.value === 'academic') {
                schoolFields.classList.add('d-none');
                academicFields.classList.remove('d-none');
                // Charger la liste des cours pour academic (pour tous les selects course_1,2,3)
                fetch('getSubjects.php?type=academic')
                    .then(r => r.json())
                    .then(list => {
                        for (let i = 1; i <= 3; i++) {
                            const cSel = document.getElementById('course_' + i);
                            if (!cSel) continue;
                            cSel.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_course_option"] ?? "-- Sélectionnez un cours --") ?></option>';
                            list.forEach(name => {
                                const opt = document.createElement('option');
                                opt.value = name;
                                opt.textContent = name;
                                cSel.appendChild(opt);
                            });
                        }
                    })
                    .catch(console.error);
            } else {
                schoolFields.classList.add('d-none');
                academicFields.classList.add('d-none');
            }
        });
    }

    // Si déjà academic au chargement, charger la liste des cours
    if (studentTypeInDb === 'academic') {
        fetch('getSubjects.php?type=academic')
            .then(r => r.json())
            .then(list => {
                for (let i = 1; i <= 3; i++) {
                    const cSel = document.getElementById('course_' + i);
                    if (!cSel) continue;
                    cSel.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_course_option"] ?? "-- Sélectionnez un cours --") ?></option>';
                    list.forEach(name => {
                        const opt = document.createElement('option');
                        opt.value = name;
                        opt.textContent = name;
                        cSel.appendChild(opt);
                    });
                }
            })
            .catch(console.error);
    }

    // 8) Si #student_country change, charger getSchoolYear et getAcademicYear
    const stCountrySel = document.getElementById('student_country');
    if (stCountrySel) {
        stCountrySel.addEventListener('change', () => {
            const cVal = stCountrySel.value;
            if (!cVal) return;
            // Charger getSchoolYear
            fetch('getSchoolYear.php?country=' + cVal)
                .then(r => r.json())
                .then(classes => {
                    const sclSel = document.getElementById('student_school_class');
                    if (!sclSel) return;
                    sclSel.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_option"] ?? "-- Sélectionnez --") ?></option>';
                    classes.forEach(cl => {
                        const opt = document.createElement('option');
                        opt.value = cl;
                        opt.textContent = cl;
                        sclSel.appendChild(opt);
                    });
                })
                .catch(console.error);
            // Charger getAcademicYear pour diplomas et years
            fetch('getAcademicYear.php?country=' + cVal)
                .then(r => r.json())
                .then(rows => {
                    const dipSet  = new Set();
                    const yearSet = new Set();
                    rows.forEach(obj => {
                        if (obj.diploma_name) dipSet.add(obj.diploma_name);
                        if (obj.study_year)   yearSet.add(obj.study_year);
                    });
                    const diplomas = [...dipSet];
                    const years    = [...yearSet];
                    for (let i = 1; i <= 3; i++) {
                        const dipSel  = document.getElementById('diploma_' + i);
                        const yearSel = document.getElementById('year_' + i);
                        if (dipSel) {
                            dipSel.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_diploma_option"] ?? "-- Choisir Diplôme --") ?></option>';
                            diplomas.forEach(d => {
                                const opt = document.createElement('option');
                                opt.value = d;
                                opt.textContent = d;
                                dipSel.appendChild(opt);
                            });
                        }
                        if (yearSel) {
                            yearSel.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_year_option"] ?? "-- Choisir Année --") ?></option>';
                            years.forEach(y => {
                                const opt = document.createElement('option');
                                opt.value = y;
                                opt.textContent = y;
                                yearSel.appendChild(opt);
                            });
                        }
                    }
                })
                .catch(console.error);
        });
    }

    // 9) Scroll vers la section documents si le hash est présent
    window.addEventListener('load', function() {
        if (window.location.hash === "#documentsContainer") {
            var element = document.getElementById('documentsContainer');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // 10) Tooltips Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });

    // 11) Scripts pour les modaux QCM, Résumé, Paires, Flash, Miss
    // QCM
    const generateQCMButtons = document.querySelectorAll('.generate-qcm-btn');
    const modalQCMDocumentId = document.getElementById('modal_subject_document_id');
    const modalQCMSubject    = document.getElementById('modal_subject');
    const modalQuizLang      = document.getElementById('modal_quiz_language');
    const modalQuizLevel     = document.getElementById('modal_quiz_level');
    const modalQuizNumber    = document.getElementById('modal_quiz_number');
    if (generateQCMButtons && modalQCMDocumentId) {
        generateQCMButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-document-id');
                const lang  = btn.getAttribute('data-language') || 'he';
                const subj  = btn.getAttribute('data-subject')  || '';
                modalQCMDocumentId.value = docId;
                if (modalQuizLang)   modalQuizLang.value = lang;
                if (modalQuizLevel)  modalQuizLevel.value = 'moyen';
                if (modalQuizNumber) modalQuizNumber.value = 5;
                if (modalQCMSubject) modalQCMSubject.value = subj;
            });
        });
    }

    // Résumé
    const generateSummaryButtons = document.querySelectorAll('.generate-summary-btn');
    const modalSummaryDocId = document.getElementById('modal_summary_subject_document_id');
    const modalSummaryLangSelect = document.getElementById('modal_summary_language');
    if (generateSummaryButtons && modalSummaryDocId) {
        generateSummaryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-document-id');
                const lang  = btn.getAttribute('data-language') || 'he';
                modalSummaryDocId.value = docId;
                if (modalSummaryLangSelect) {
                    modalSummaryLangSelect.value = lang;
                }
            });
        });
    }
    // Paires
    const generatePairButtons = document.querySelectorAll('.generate-pair-btn');
    const modalPairDocumentId = document.getElementById('modal_pair_subject_document_id');
    const modalPairLanguageSelect = document.getElementById('modal_pair_language');
    if (generatePairButtons && modalPairDocumentId) {
        generatePairButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-document-id');
                const lang  = btn.getAttribute('data-language') || 'he';
                modalPairDocumentId.value = docId;
                if (modalPairLanguageSelect) {
                    modalPairLanguageSelect.value = lang;
                }
            });
        });
    }
    // Flash
    const generateFlashButtons = document.querySelectorAll('.generate-flash-btn');
    const modalFlashDocumentId = document.getElementById('modal_flash_subject_document_id');
    const modalFlashLanguageSelect = document.getElementById('modal_flash_language');
    if (generateFlashButtons && modalFlashDocumentId) {
        generateFlashButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-document-id');
                const lang  = btn.getAttribute('data-language') || 'he';
                modalFlashDocumentId.value = docId;
                if (modalFlashLanguageSelect) {
                    modalFlashLanguageSelect.value = lang;
                }
            });
        });
    }
    // Miss
    const generateMissButtons = document.querySelectorAll('.generate-miss-btn');
    const modalMissDocumentId = document.getElementById('modal_miss_subject_document_id');
    const modalMissLanguageSelect = document.getElementById('modal_miss_language');
    if (generateMissButtons && modalMissDocumentId) {
        generateMissButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const docId = btn.getAttribute('data-document-id');
                const lang  = btn.getAttribute('data-language') || 'he';
                modalMissDocumentId.value = docId;
                if (modalMissLanguageSelect) {
                    modalMissLanguageSelect.value = lang;
                }
            });
        });
    }
});
</script>

</body>
</html>

<?php include 'includes/footer.php'; ?>
