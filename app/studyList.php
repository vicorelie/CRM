<?php
// studyList.php

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
$stmtDistinctSubjects = $pdo->prepare("
    SELECT DISTINCT subject_name 
    FROM studySubjects 
    WHERE uuid = :uuid 
      AND subject_name <> '' 
    ORDER BY subject_name ASC
");
$stmtDistinctSubjects->execute([':uuid' => $userUuid]);
$distinctSubjects = $stmtDistinctSubjects->fetchAll(PDO::FETCH_COLUMN);

$stmtDistinctTopics = $pdo->prepare("
    SELECT DISTINCT topic 
    FROM subjectDocuments 
    WHERE uuid = :uuid 
      AND topic <> '' 
    ORDER BY topic ASC
");
$stmtDistinctTopics->execute([':uuid' => $userUuid]);
$distinctTopics = $stmtDistinctTopics->fetchAll(PDO::FETCH_COLUMN);

$filterSubject = isset($_GET['filterSubject']) ? trim($_GET['filterSubject']) : '';
$topicFilter   = isset($_GET['topicFilter'])   ? trim($_GET['topicFilter'])   : '';
$filterDate    = isset($_GET['filterDate'])    ? trim($_GET['filterDate'])    : '';
$generalSearch = isset($_GET['generalSearch']) ? trim($_GET['generalSearch']) : '';

$filterStudy   = '';
$distinctStudies = [];
if ($studentTypeInDb === 'academic') {
    $stmtDistinctStudies = $pdo->prepare("
        SELECT DISTINCT course_name 
        FROM studySubjects 
        WHERE uuid = :uuid 
          AND course_name <> '' 
        ORDER BY course_name ASC
    ");
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
    // Requête de comptage
    $countQuery = "
        SELECT COUNT(*) 
        FROM subjectDocuments D
        LEFT JOIN studySubjects SS ON D.study_subjects_id = SS.id
        WHERE D.uuid = :uuid
    ";
    $params = [':uuid' => $userUuid];

    if ($topicFilter !== '') {
        $countQuery .= " AND LOWER(D.topic) LIKE :topicFilter";
        $params[':topicFilter'] = '%' . strtolower($topicFilter) . '%';
    }
    if ($generalSearch !== '') {
        $countQuery .= " AND (LOWER(D.topic) LIKE :generalSearch 
                        OR LOWER(D.sub_topic) LIKE :generalSearch 
                        OR LOWER(SS.subject_name) LIKE :generalSearch)";
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
    $totalPages = ceil($totalDocuments / $limit);

    // Requête principale
    $query = "
        SELECT 
            D.*,
            SS.subject_name AS ss_subject_name,
            SS.subject_unit AS ss_subject_unit,
            SS.course_name  AS ss_course_name,
            Doc.filename        AS doc_filename,
            Doc.type            AS doc_type,
            Doc.path            AS doc_path,
            Doc.extract_content AS doc_extract_content,
            (SELECT COUNT(*) FROM documentQuestions WHERE subject_document_id = D.id) AS has_qcm,
            (SELECT COUNT(*) FROM documentResumes   WHERE subject_document_id = D.id) AS has_summary,
            (SELECT COUNT(*) FROM documentPairs     WHERE subject_document_id = D.id) AS has_pair,
            (SELECT COUNT(*) FROM documentFlash     WHERE subject_document_id = D.id) AS has_flash,
            (SELECT COUNT(*) FROM documentMiss      WHERE subject_document_id = D.id) AS has_miss,
            (SELECT COUNT(*) FROM documentCrossword WHERE subject_document_id = D.id) AS has_crossword,
            (SELECT COUNT(*) FROM documentTrueFalse WHERE subject_document_id = D.id) AS has_truefalse


        FROM subjectDocuments D
        LEFT JOIN studySubjects SS ON D.study_subjects_id = SS.id
        LEFT JOIN Documents Doc ON D.documents_id = Doc.id
        WHERE D.uuid = :uuid
    ";

    if ($topicFilter !== '') {
        $query .= " AND LOWER(D.topic) LIKE :topicFilter";
    }
    if ($generalSearch !== '') {
        $query .= " AND (LOWER(D.topic) LIKE :generalSearch 
                     OR LOWER(D.sub_topic) LIKE :generalSearch 
                     OR LOWER(SS.subject_name) LIKE :generalSearch)";
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
    if (!empty($dates)) {
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

    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($lang_data['my_subject_documents_title'] ?? 'Mes matières') ?></title>
    <link href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <style>
        .dropdown-menu.custom-shadow {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
        }
        .hidden { display: none !important; }

        /* couleur de l'icon ds confirmations de delete */
        .swal2-icon.swal2-warning {
            border-color: #19d1f1 !important;
            color: #0097b2 !important;
        }
        /* Card des matieres carrée */
        .subject-card {
            aspect-ratio: 1 / 1; 
            justify-content: center;
            min-width: 150px; 
            min-height: 150px;
            padding-top:50%;
            padding-bottom:50%;
        }

    </style>
</head>
<body>

<?php if ($showCurriculumModal): ?>
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
            <?= htmlspecialchars(($lang_data['subject_add_error'] ?? "Erreur lors de l'ajout de la matière.")) ?>
        </div>
    <?php endif; ?>
    <?php if ($docAddSuccess): ?>
        <div class="alert alert-success text-center">
            <?= htmlspecialchars($lang_data['doc_created_success'] ?? 'Nouveau document créé avec succès !') ?>
        </div>
    <?php endif; ?>
    <?php if (!empty($docAddError)): ?>
        <div class="alert alert-danger text-center">
            <?= htmlspecialchars(($lang_data['doc_create_error'] ?? "Erreur lors de la création du document : ")) ?>
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
    <h2 class="mb-4 text-center" style="font-size:36px;" ><?= htmlspecialchars($lang_data['subjects_title'] ?? 'Mes Matières') ?></h2>
    <?php if (count($mySubjects) === 0): ?>
        <div class="alert alert-info text-center">
            <?= htmlspecialchars($lang_data['no_subjects'] ?? 'Aucune matière pour le moment.') ?>
        </div>
    <?php endif; ?>

    <div class="row g-4">
        <?php foreach ($mySubjects as $subj): ?>
            <div class="col-lg-2 col-6">
                <div class="card h-100 text-center position-relative subject-card">
                    <a href="#"
                       class="text-decoration-none subject-click d-block"
                       data-study-subject-id="<?= $subj['id'] ?>"
                       title="<?= htmlspecialchars($lang_data['add_document'] ?? 'Ajouter un document') ?>">
                        <div class="card-body d-flex flex-column justify-content-center align-items-center">
                            <!-- <i class="fas fa-plus-circle fa-2x mb-2"></i> -->
                            <h5 class="card-title mb-0 text-truncate" data-bs-toggle="tooltip" data-bs-placement="top" title="<?= htmlspecialchars($subj['subject_name']) ?>">
                                <?= htmlspecialchars($subj['subject_name']) ?>
                            </h5>

                            <span class="text-dark">
                                <?php if (!empty($subj['subject_unit'])): ?>
                                    <p>
                                        <strong><?= htmlspecialchars($lang_data['subject_unit_label'] ?? 'Coefficient') ?> :</strong>
                                        <?= htmlspecialchars($subj['subject_unit']) ?>
                                    </p>
                                <?php elseif (!empty($subj['course_name'])): ?>
                                    <p>
                                        <!-- <strong><?= htmlspecialchars($lang_data['course_label'] ?? 'Cours') ?> :</strong> -->
                                        <span class="card-title mb-0 text-truncate text-dark" data-bs-toggle="tooltip" data-bs-placement="top" title="<?= htmlspecialchars($subj['course_name']) ?>"><?= htmlspecialchars($subj['course_name']) ?></span>
                                    </p>
                                <?php else: ?>
                                    <p class="text-muted"><?= htmlspecialchars($lang_data['no_details'] ?? 'Aucun détail.') ?></p>
                                <?php endif; ?>
                            </span>
                        </div>
                    </a>
                    <div class="dropup position-absolute bottom-0 start-0">
                        <a style="padding:5px;margin:5px;" class="dropdown-toggle text-decoration-none" href="#" role="button" id="dropdownMenuLink<?= $subj['id'] ?>" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-ellipsis-v"></i>
                        </a>
                        <ul class="dropdown-menu shadow" aria-labelledby="dropdownMenuLink<?= $subj['id'] ?>" style="z-index: 9999; background-color:#bababa;">
                            <li>
                                <form method="POST" action="deleteSubject.php" class="delete-subject-form">
                                    <input type="hidden" name="subject_id" value="<?= $subj['id'] ?>">
                                    <button type="submit" class="dropdown-item"><?= htmlspecialchars($lang_data['delete'] ?? 'Supprimer') ?></button>
                                </form>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>

        <!-- Ajouter une matière -->
        <div class="col-lg-2 col-6">
            <div class="card h-100 text-center position-relative subject-card" style="cursor:pointer; background-color:#0097b2; color:#ffffff;" data-bs-toggle="modal" data-bs-target="#addSubjectModal">
                <div class="card-body" style="background-color:transparent;">
                    <i class="fas fa-plus fa-3x"></i>
                    <h6 class="card-title mt-2 text-white"><?= htmlspecialchars($lang_data['add_subject_btn'] ?? 'Ajouter une matière') ?></h6>
                </div>
            </div>
        </div>
    </div>

    <hr class="my-5" />

    <!-- MES DOCUMENTS -->
    <h2 class="mb-4 text-center" style="font-size:36px;" id="documentsContainer"><?= htmlspecialchars($lang_data['my_documents_title'] ?? 'Mes Documents') ?></h2>
    <div class="text-end mb-3">
        <button id="toggleFilters" class="btn btn-light">
            <i class="fas fa-filter"></i> <?= htmlspecialchars($lang_data['filter'] ?? 'Filtrer') ?>
        </button>
    </div>

    <!-- Zone de Filtres -->
    <div id="filtersContainer" class="card mb-4 p-3 hidden">
        <div class="card-body">
            <form method="GET" action="studyList.php" class="row g-3 align-items-center filter-form">
                <!-- Matière, Topic, Study -->
                <div class="col-md-<?= ($studentTypeInDb === 'academic') ? '4' : '6' ?>">
                    <select name="filterSubject" id="filterSubject" class="form-select">
                        <option value=""><?= htmlspecialchars($lang_data['all_subjects'] ?? 'Toutes les matières') ?></option>
                        <?php foreach ($distinctSubjects as $s): ?>
                            <option value="<?= htmlspecialchars($s) ?>" <?= ($s === $filterSubject) ? 'selected' : '' ?>>
                                <?= htmlspecialchars($s) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-<?= ($studentTypeInDb === 'academic') ? '4' : '6' ?>">
                    <select name="topicFilter" id="topicFilter" class="form-select">
                        <option value=""><?= htmlspecialchars($lang_data['all_topics'] ?? 'Tous les topics') ?></option>
                        <?php foreach ($distinctTopics as $t): ?>
                            <option value="<?= htmlspecialchars($t) ?>" <?= ($t === $topicFilter) ? 'selected' : '' ?>>
                                <?= htmlspecialchars($t) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
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

                <!-- Date, Recherche globale -->
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
    <!-- Zone de vignettes -->
    <?php if (count($documents) === 0): ?>
        <div class="alert alert-info text-center"><?= htmlspecialchars($lang_data['no_documents'] ?? 'Aucun document trouvé.') ?></div>
    <?php else: ?>
        <div id="documentsContainers" class="row g-4">
            <?php foreach ($documents as $doc):
              $title = $doc['ss_subject_name'];
              if (!empty($doc['ss_subject_unit'])) {
                  $title .= " (" . htmlspecialchars($lang_data['subject_unit_label'] ?? 'Coefficient') . " : " . htmlspecialchars($doc['ss_subject_unit']) . ")";
              } elseif (!empty($doc['ss_course_name'])) {
                  $title .= " (" . htmlspecialchars($doc['ss_course_name']) . ")";
              }
                $extension = strtolower($doc['doc_type'] ?? '');
                switch ($extension) {
                    case 'pdf': $iconClass = 'fa-file-pdf'; break;
                    case 'doc':
                    case 'docx': $iconClass = 'fa-file-word'; break;
                    case 'xls':
                    case 'xlsx': $iconClass = 'fa-file-excel'; break;
                    case 'ppt':
                    case 'pptx': $iconClass = 'fa-file-powerpoint'; break;
                    case 'jpg':
                    case 'jpeg':
                    case 'png': $iconClass = 'fa-file-image'; break;
                    default: $iconClass = 'fa-file'; break;
                }
                $hasExtractedContent = (!empty($doc['documents_id']) && !empty($doc['doc_extract_content']));
            ?>
            <div class="col-lg-4 col-md-6 document-card" data-date="<?= htmlspecialchars(date('Y-m-d', strtotime($doc['created_time']))) ?>" data-subject="<?= htmlspecialchars($doc['topic'] ?? '') ?>">
                <div class="card shadow-sm h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="mb-0 text-truncate" data-bs-toggle="tooltip" data-bs-placement="top" title="<?= htmlspecialchars($doc['topic'] ?? $lang_data['unknown_topic'] ?? 'Topic inconnu') ?>">
                                <?= htmlspecialchars($doc['topic'] ?? $lang_data['unknown_topic'] ?? 'Topic inconnu') ?>
                            </h5>
                            <div class="ms-2 d-flex align-items-center">
                                <button type="button" class="btn btn-link p-0 me-2" data-bs-toggle="modal" data-bs-target="#editModal-<?= $doc['id'] ?>" title="<?= htmlspecialchars($lang_data['edit_document'] ?? 'Éditer ce document') ?>">
                                    <i class="fas fa-edit" style="font-size:1.2rem;color:#0097b2;"></i>
                                </button>
                                <form method="POST" action="deleteSubjectDocument.php" class="delete-document-form">
                                    <input type="hidden" name="subject_document_id" value="<?= htmlspecialchars($doc['id']) ?>">
                                    <button type="submit" class="btn btn-link p-0" title="<?= htmlspecialchars($lang_data['delete_document_confirmation'] ?? 'Supprimer ce document') ?>">
                                        <i class="fas fa-trash" style="font-size:1.2rem;color:#19d1f1;"></i>
                                    </button>
                                </form>
                            </div>
                        </div>
                        <p class="text-muted mb-1">
                            <i class="far fa-calendar-alt"></i>
                            <?= htmlspecialchars(date('d/m/Y H:i', strtotime($doc['created_time']))) ?>
                        </p>
                        <?php if (!empty($title)): ?>
                            <p class="mb-1">
                                <strong><?= htmlspecialchars($lang_data['subject_label'] ?? 'Matière') ?> :</strong>
                                <?= htmlspecialchars($title) ?>
                            </p>
                        <?php endif; ?>
                        <?php if (!empty($doc['sub_topic'])): ?>
                            <p class="small text-muted">
                                <?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic') ?>:
                                <?= htmlspecialchars($doc['sub_topic']) ?>
                            </p>
                        <?php endif; ?>
                        <?php if (!empty($doc['documents_id']) && !empty($doc['doc_filename'])): ?>
                            <div class="d-flex align-items-center" style="max-width: 300px;">
                                <i class="fas <?= $iconClass ?> me-2" style="font-size:1rem;"></i>
                                <span class="text-truncate" style="max-width: 200px;" data-bs-toggle="tooltip" title="<?= htmlspecialchars($doc['doc_filename']) ?>">
                                    <?= htmlspecialchars($doc['doc_filename']) ?>
                                </span>
                                <?php if (!empty($doc['doc_path'])): ?>
                                    <a href="<?= htmlspecialchars($doc['doc_path']) ?>" download="<?= htmlspecialchars($doc['doc_filename']) ?>" class="ms-2" style="text-decoration: none;">
                                        <i class="fas fa-download" style="font-size:1rem;"></i>
                                    </a>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>

                        <!-- Zone de boutons -->
                        <div class="mt-auto">
                          <!-- Ligne 1 : Bouton quiz et summary (2 par ligne) -->
                          <div class="row g-2 mb-2">
                              <!-- bouton quiz -->
                              <div class="col-6">
                                  <?php if ($doc['has_qcm'] > 0): ?>
                                      <a href="questionForm.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm w-100">
                                          <i class="fas fa-eye"></i>
                                          <?= htmlspecialchars($lang_data['view_qcm'] ?? 'Voir QCM') ?>
                                      </a>
                                  <?php else: ?>
                                      <button type="button" class="btn btn-outline-primary btn-sm w-100 generate-qcm-btn"
                                              data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                              data-language="<?= htmlspecialchars($doc['language']) ?>"
                                              data-subject="<?= htmlspecialchars($doc['topic'] ?? '') ?>"
                                              data-has-content="<?= $hasExtractedContent ? '1' : '0' ?>"
                                              data-bs-toggle="modal" data-bs-target="#generateQCMModal">
                                          <i class="fas fa-plus"></i>
                                          <?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?>
                                      </button>
                                  <?php endif; ?>
                              </div>
                              <!-- bouton summary -->
                              <div class="col-6">
                                  <?php if ($doc['has_summary'] > 0): ?>
                                      <a href="viewSummary.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm w-100">
                                          <i class="fas fa-eye"></i>
                                          <?= htmlspecialchars($lang_data['view_summary'] ?? 'Voir Résumé') ?>
                                      </a>
                                  <?php else: ?>
                                      <button type="button" class="btn btn-outline-primary btn-sm w-100 generate-summary-btn"
                                              data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                              data-language="<?= htmlspecialchars($doc['language']) ?>"
                                              data-has-content="<?= $hasExtractedContent ? '1' : '0' ?>"
                                              data-bs-toggle="modal" data-bs-target="#generateSummaryModal">
                                          <i class="fas fa-plus"></i>
                                          <?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?>
                                      </button>
                                  <?php endif; ?>
                              </div>
                          </div>

                          <!-- Ligne 2 : Boutons Vrai/Faux et flash (2 par ligne) -->
                          <div class="row g-2 mb-2">
                            <!-- bouton Vrai/Faux-->
                            <div class="col-6">
                                <?php if ($doc['has_truefalse'] > 0): ?>
                                  <a href="viewTrueFalse.php?subject_document_id=<?= urlencode($doc['id']) ?>"
                                    class="btn btn-secondary btn-sm w-100">
                                    <i class="fas fa-eye"></i>
                                    <?= htmlspecialchars($lang_data['view_truefalse'] ?? 'Voir Vrai/Faux') ?>
                                  </a>
                                <?php else: ?>
                                  <button type="button"
                                          class="btn btn-outline-primary btn-sm w-100 generate-tf-btn"
                                          data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                          data-language="<?= htmlspecialchars($doc['language'] ?? 'he') ?>"
                                          data-has-content="<?= $hasExtractedContent ? '1' : '0' ?>"
                                          data-bs-toggle="modal"
                                          data-bs-target="#generateTFModal">
                                    <i class="fas fa-plus"></i>
                                    <?= htmlspecialchars($lang_data['generate_truefalse'] ?? 'Générer Vrai/Faux') ?>
                                  </button>
                                <?php endif; ?>
                              </div>
                              <!-- bouton flash -->
                              <div class="col-6">
                                  <?php if ($doc['has_flash'] > 0): ?>
                                      <a href="viewFlash.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm w-100">
                                          <i class="fas fa-eye"></i>
                                          <?= htmlspecialchars($lang_data['view_flash'] ?? 'Voir Flash') ?>
                                      </a>
                                  <?php else: ?>
                                    <button
                                      type="button"
                                      class="btn btn-outline-primary btn-sm w-100 generate-flash-btn"
                                      data-document-id="<?= $doc['id'] ?>"
                                      data-language="<?= $doc['language'] ?? 'he' ?>"
                                      data-has-content="<?= $hasExtractedContent ? '1' : '0' ?>"
                                    >
                                      <i class="fas fa-plus"></i>
                                      <?= htmlspecialchars($lang_data['generate_flash'] ?? 'Générer Flash') ?>
                                    </button>
                                  <?php endif; ?>
                              </div>
                          </div>

                          <!-- Ligne 3 : Boutons pairs et Miss (2 par ligne) -->
                          <div class="row g-2 mb-2">
                          <!-- bouton paires -->
                          <div class="col-6">
                                  <?php if ($doc['has_pair'] > 0): ?>
                                      <a href="viewPair.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm w-100">
                                          <i class="fas fa-eye"></i>
                                          <?= htmlspecialchars($lang_data['view_pairs'] ?? 'Voir Paires') ?>
                                      </a>
                                  <?php else: ?>
                                      <button type="button" class="btn btn-outline-primary btn-sm w-100 generate-pair-btn"
                                              data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                              data-language="<?= htmlspecialchars($doc['language'] ?? 'he') ?>"
                                              data-has-content="<?= $hasExtractedContent ? '1' : '0' ?>"
                                              data-bs-toggle="modal" data-bs-target="#generatePairModal">
                                          <i class="fas fa-plus"></i>
                                          <?= htmlspecialchars($lang_data['generate_pair'] ?? 'Générer Paires') ?>
                                      </button>
                                  <?php endif; ?>
                              </div>
                              <!-- bouton miss -->
                              <div class="col-6">
                                  <?php if ($doc['has_miss'] > 0): ?>
                                      <a href="viewMiss.php?subject_document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm w-100">
                                          <i class="fas fa-eye"></i>
                                          <?= htmlspecialchars($lang_data['view_miss'] ?? 'Voir Miss') ?>
                                      </a>
                                  <?php else: ?>
                                      <button type="button" class="btn btn-outline-primary btn-sm w-100 generate-miss-btn"
                                              data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                              data-language="<?= htmlspecialchars($doc['language'] ?? 'he') ?>"
                                              data-has-content="<?= $hasExtractedContent ? '1' : '0' ?>"
                                              data-bs-toggle="modal" data-bs-target="#generateMissModal">
                                          <i class="fas fa-plus"></i>
                                          <?= htmlspecialchars($lang_data['generate_miss'] ?? 'Générer Miss') ?>
                                      </button>
                                  <?php endif; ?>
                              </div>
                          </div>
                          <!-- Ligne 4 : bouton Mots-croisés -->
                          <!-- <div class="row g-2 mt-2">
                            <div class="col-12">
                              <?php if ($doc['has_crossword'] > 0): ?>
                                <a href="viewCrossword.php?subject_document_id=<?=urlencode($doc['id'])?>"
                                  class="btn btn-secondary btn-sm w-100">
                                  <i class="fas fa-eye"></i>
                                  <?=htmlspecialchars($lang_data['view_crossword']??'Voir Mots-croisés')?>
                                </a>
                              <?php else: ?>
                                <button type="button"
                                        class="btn btn-outline-secondary btn-sm w-100 generate-crossword-btn"
                                        data-document-id="<?=htmlspecialchars($doc['id'])?>"
                                        data-language="<?=htmlspecialchars($doc['language']??'he')?>"
                                        data-has-content="<?=$hasExtractedContent?'1':'0'?>"
                                        data-bs-toggle="modal"
                                        data-bs-target="#generateCrosswordModal">
                                  <i class="fas fa-plus"></i>
                                  <?=htmlspecialchars($lang_data['generate_crossword']??'Générer Mots-croisés')?>
                                </button>
                              <?php endif; ?>
                            </div>
                          </div> -->


                      </div>
                    </div> <!-- .card-body -->
                </div> <!-- .card -->
            </div> <!-- .col -->
            <!-- Modal Éditer -->
            <div class="modal fade" id="editModal-<?= $doc['id'] ?>" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <form method="POST" action="updateStudyDocument.php">
                            <div class="modal-header">
                                <h5 class="modal-title"><?= htmlspecialchars($lang_data['edit_document'] ?? 'Éditer le Document') ?></h5>
                                <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <input type="hidden" name="subject_document_id" value="<?= htmlspecialchars($doc['id']) ?>">
                                <div class="mb-3">
                                    <label class="form-label"><?= htmlspecialchars($lang_data['subject_label'] ?? 'Matière') ?></label>
                                    <select name="study_subjects_id" class="form-select">
                                        <?php if (!empty($doc['study_subjects_id'])): ?>
                                            <option value="<?= htmlspecialchars($doc['study_subjects_id']) ?>">
                                                <?= htmlspecialchars($doc['ss_subject_name']) ?>
                                            </option>
                                        <?php else: ?>
                                            <option value=""><?= htmlspecialchars($lang_data['select_option'] ?? '-- Sélectionnez --') ?></option>
                                        <?php endif; ?>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= htmlspecialchars($lang_data['topic_label'] ?? 'Topic (obligatoire)') ?></label>
                                    <input type="text" name="topic" class="form-control" value="<?= htmlspecialchars($doc['topic'] ?? '') ?>" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label"><?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic (optionnel)') ?>
                                    <small class="text-muted">
                                      (<?= htmlspecialchars($lang_data['optional'] ?? 'optionnel') ?>)
                                    </small>
                                  </label>
                                    <input type="text" name="sub_topic" class="form-control" value="<?= htmlspecialchars($doc['sub_topic'] ?? '') ?>">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <?= htmlspecialchars($lang_data['save'] ?? 'Enregistrer') ?>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <!-- Fin modal Éditer -->
            <?php endforeach; ?>
        </div> <!-- #documentsContainer -->
        <!-- PAGINATION -->
        <?php if ($totalPages > 1): ?>
            <nav aria-label="Page navigation" class="mt-5">
                <ul class="pagination justify-content-center">
                    <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                        <a class="page-link"
                           href="?page=<?= max(1, $page - 1) ?>
<?= $filterSubject ? '&filterSubject=' . urlencode($filterSubject) : '' ?>
<?= $topicFilter ? '&topicFilter=' . urlencode($topicFilter) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $generalSearch ? '&generalSearch=' . urlencode($generalSearch) : '' ?>
<?= $filterStudy ? '&study=' . urlencode($filterStudy) : '' ?>"
                           aria-label="<?= htmlspecialchars($lang_data['previous'] ?? 'Précédent') ?>">
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
                    for ($p = $start; $p <= $end; $p++): ?>
                        <li class="page-item <?= ($p == $page) ? 'active' : '' ?>">
                            <a class="page-link"
                               href="?page=<?= $p ?>
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
                        <a class="page-link"
                           href="?page=<?= min($totalPages, $page + 1) ?>
<?= $filterSubject ? '&filterSubject=' . urlencode($filterSubject) : '' ?>
<?= $topicFilter ? '&topicFilter=' . urlencode($topicFilter) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $generalSearch ? '&generalSearch=' . urlencode($generalSearch) : '' ?>
<?= $filterStudy ? '&study=' . urlencode($filterStudy) : '' ?>"
                           aria-label="<?= htmlspecialchars($lang_data['next'] ?? 'Suivant') ?>">
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
    <form
      method="POST"
      action="addSubject.php"
      class="modal-content"
      id="addSubjectForm"
    >
      <?= csrf_field() ?>
      <div class="modal-header">
        <h5 class="modal-title">
          <?= htmlspecialchars($lang_data['add_new_subject'] ?? 'Ajouter une nouvelle matière') ?>
        </h5>
        <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">

        <?php if ($studentTypeInDb === 'school'): ?>
          <!-- PARTIE SCHOOL -->

          <!-- Sélection Matière -->
          <div class="form-floating mb-3">
            <select
              name="subject_name"
              id="subject_name"
              class="form-select"
            >
              <option value="">
                <?= htmlspecialchars($lang_data['select_subject_option'] ?? '-- Sélectionnez une matière --') ?>
              </option>
              <option value="other">
                <?= htmlspecialchars($lang_data['other'] ?? 'Autre...') ?>
              </option>
            </select>
            <label for="subject_name">
              <?= htmlspecialchars($lang_data['subject_label'] ?? 'Matière') ?>
            </label>
          </div>

          <!-- Saisir la matière si "other" -->
          <div
            class="form-floating mb-3 d-none"
            id="manualSubjectContainer"
          >
            <input
              type="text"
              name="manual_subject"
              id="manual_subject"
              class="form-control"
              placeholder="<?= htmlspecialchars($lang_data['subject_example'] ?? 'Ex: Philosophie') ?>"
            >
            <label for="manual_subject">
              <?= htmlspecialchars($lang_data['enter_subject'] ?? 'Saisir la matière') ?>
            </label>
          </div>

          <!-- Coefficient -->
          <div class="form-floating mb-3">
          <input
            type="number"
            name="subject_unit"
            class="form-control"
            id="subject_unit"
            placeholder="<?= htmlspecialchars($lang_data['subject_unit_example'] ?? 'Ex: 4') ?>"
            min="1"
            max="10"
            step="1"
          >
          <label for="subject_unit">
            <?= htmlspecialchars($lang_data['subject_unit_label'] ?? 'Coefficient') ?>
          </label>
        </div>

        <?php elseif ($studentTypeInDb === 'academic'): ?>
          <!-- PARTIE ACADEMIC -->

          <!-- Sélection du Cours -->
          <div class="form-floating mb-3">
            <select
              name="course_name"
              id="course_name"
              class="form-select"
            >
              <option value="">
                <?= htmlspecialchars($lang_data['select_course_option'] ?? '-- Sélectionnez un cours --') ?>
              </option>
            </select>
            <label for="course_name">
              <?= htmlspecialchars($lang_data['course_label'] ?? 'Course') ?>
            </label>
          </div>

          <!-- Saisir le Sujet -->
          <div class="form-floating mb-3">
            <input
              type="text"
              name="subject_name"
              class="form-control"
              id="subject_name_academic"
              placeholder="<?= htmlspecialchars($lang_data['subject_placeholder'] ?? 'Ex: Chapitre 1') ?>"
              required
            >
            <label for="subject_name_academic">
              <?= htmlspecialchars($lang_data['subject_label'] ?? 'Sujet') ?>
            </label>
          </div>

        <?php else: ?>
          <!-- Si le type d'étudiant n'est pas défini -->
          <p class="text-danger">
            <?= htmlspecialchars($lang_data['undefined_student_type'] ?? "Votre type d'étudiant n'est pas défini ou non reconnu.") ?>
          </p>
        <?php endif; ?>

      </div> <!-- .modal-body -->

      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          data-bs-dismiss="modal"
        >
          <?= htmlspecialchars($lang_data['cancel'] ?? 'Annuler') ?>
        </button>
        <button type="submit" class="btn btn-primary">
          <!-- <i class="fas fa-save"></i> -->
          <?= htmlspecialchars($lang_data['save'] ?? 'Enregistrer') ?>
        </button>
      </div>
    </form>
  </div>
</div>



<!-- MODAL : CHOIX DU MODE DE CRÉATION DE DOCUMENT (avec ou sans document) -->
<div class="modal fade" id="documentChoiceModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width: 600px;">
    <div class="modal-content border-0 shadow">
      <div class="modal-header" style="background: #0097b2;">
        <h5 class="modal-title text-white">
          <?= htmlspecialchars($lang_data['choice_modal_title'] ?? 'Choisissez une option') ?>
        </h5>
        <button type="button" class="btn btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body p-4">
        <div class="row g-4 justify-content-center">
          <div class="col-12 col-sm-6">
            <div class="card h-100 border-0 text-center p-3 clickable-card" 
                 id="withDocumentCard" 
                 style="cursor:pointer;background-color: #e4f3f6;">
              <div class="mx-auto mb-3" style="width: 130px; height: 130px;">
                <img src="./assets/img/upload-file.png" 
                     alt="<?= htmlspecialchars($lang_data['modal_choice_upload_alt'] ?? 'Illustration upload document') ?>" 
                     style="max-width: 100%; max-height: 100%;">
              </div>
              <h5 class="mb-2">
                <?= htmlspecialchars($lang_data['modal_choice_upload_title'] ?? 'Upload un document') ?>
              </h5>
              <p class="small text-muted mb-0 px-2">
                <?= htmlspecialchars($lang_data['modal_choice_upload_text'] ?? 'Téléversez votre propre fichier et entraînez-vous à partir de son contenu.') ?>
              </p>
            </div>
          </div>
          <div class="col-12 col-sm-6">
            <div class="card h-100 border-0 text-center p-3 clickable-card" 
                 id="withoutDocumentCard" 
                 style="cursor:pointer;background-color: #e4f3f6;">
              <div class="mx-auto mb-3" style="width: 130px; height: 130px;">
                <img src="./assets/img/assistant.png"
                     alt="<?= htmlspecialchars($lang_data['modal_choice_ai_alt'] ?? 'Illustration Intelligence Artificielle') ?>" 
                     style="max-width: 100%; max-height: 100%;">
              </div>
              <h5 class="mb-2">
                <?= htmlspecialchars($lang_data['modal_choice_ai_title'] ?? 'Assistant AI') ?>
              </h5>
              <p class="small text-muted mb-0 px-2">
                <?= htmlspecialchars($lang_data['modal_choice_ai_text'] ?? 'Laissez l\'intelligence artificielle vous créer des questions ou exercices sur mesure.') ?>
              </p>
            </div>
          </div>
          <!-- ==== Choix YouTube ==== -->
          <div class="col-12 col-sm-4">
            <div class="card h-100 border-0 text-center p-3 clickable-card" 
                id="youtubeCard" 
                style="cursor:pointer;background-color: #e4f3f6;">
              <div class="mx-auto mb-3" style="width: 130px; height: 130px;">
                <img src="./assets/img/youtube-link.png"
                     alt="<?= htmlspecialchars($lang_data['modal_choice_youtube_alt'] ?? 'Illustration transcription youtube') ?>" 
                     style="max-width: 100%; max-height: 100%;">
              </div>
              <h5 class="mb-2">
                <?= htmlspecialchars($lang_data['modal_choice_youtube_title'] ?? 'YouTube') ?>
              </h5>
              <p class="small text-muted mb-0 px-2">
                <?= htmlspecialchars($lang_data['modal_choice_youtube_text'] ?? 'Copier/coller un lien YouTube, on extrait l’audio et on transcrit.') ?>
              </p>
            </div>
          </div>

          <!-- ==== Choix Audio ==== -->
          <div class="col-12 col-sm-4">
            <div class="card h-100 border-0 text-center p-3 clickable-card" 
                id="audioCard" 
                style="cursor:pointer;background-color: #e4f3f6;">
              <div class="mx-auto mb-3" style="width: 130px; height: 130px;">
                <img src="./assets/img/audio-upload.png"
                     alt="<?= htmlspecialchars($lang_data['modal_choice_audio_alt'] ?? 'Illustration upload audio') ?>" 
                     style="max-width: 100%; max-height: 100%;">
              </div>
              <h5 class="mb-2">
                <?= htmlspecialchars($lang_data['modal_choice_audio_title'] ?? 'Audio') ?>
              </h5>
              <p class="small text-muted mb-0 px-2">
                <?= htmlspecialchars($lang_data['modal_choice_audio_text'] ?? 'Téléversez un fichier audio et transcrivez-le.') ?>
              </p>
            </div>
          </div>

          <!-- ==== Choix Vidéo ==== -->
          <div class="col-12 col-sm-4">
            <div class="card h-100 border-0 text-center p-3 clickable-card" 
                id="videoCard" 
                style="cursor:pointer;background-color: #e4f3f6;">
              <div class="mx-auto mb-3" style="width: 130px; height: 130px;">
                <img src="./assets/img/video-upload.png"
                     alt="<?= htmlspecialchars($lang_data['modal_choice_video_alt'] ?? 'Illustration upload video') ?>" 
                     style="max-width: 100%; max-height: 100%;">
              </div>
              <h5 class="mb-2">
                <?= htmlspecialchars($lang_data['modal_choice_video_title'] ?? 'Vidéo') ?>
              </h5>
              <p class="small text-muted mb-0 px-2">
                <?= htmlspecialchars($lang_data['modal_choice_video_text'] ?? 'Téléchargez un fichier vidéo, on en extrait l’audio et on transcrit.') ?>
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ==== MODAL : UPLOAD AUDIO (DROPZONE) ==== -->
<div class="modal fade" id="audioModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form id="audioForm"
          method="POST"
          action="audioContent.php"
          enctype="multipart/form-data"
          class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">
          <?= htmlspecialchars($lang_data['audio_modal_title'] ?? 'Importer un fichier audio') ?>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">

        <input type="hidden" name="study_subjects_id"
               id="audio_study_subjects_id">

        <!-- Sujet -->
        <div class="form-floating mb-3">
          <input  type="text" name="topic" id="audio_topic"
                  class="form-control"
                  placeholder="<?= htmlspecialchars($lang_data['topic_placeholder'] ?? '') ?>"
                  required>
          <label for="audio_topic">
            <?= htmlspecialchars($lang_data['topic_label'] ?? 'Sujet') ?>
            <span class="text-danger">*</span>
            <small class="text-muted">
               (<?= htmlspecialchars($lang_data['mandatory'] ?? 'mandatory') ?>)
            </small>
          </label>
        </div>

        <!-- Sous-topic -->
        <div class="form-floating mb-4">
          <input  type="text" name="sub_topic" id="audio_subtopic"
                  class="form-control"
                  placeholder="<?= htmlspecialchars($lang_data['sub_topic_placeholder'] ?? '') ?>">
          <label for="audio_subtopic">
            <?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic') ?>
            <small class="text-muted">
              (<?= htmlspecialchars($lang_data['optional'] ?? 'optionnel') ?>)
            </small>
          </label>
        </div>

        <!-- DROPZONE -->
        <label class="form-label d-block">
          <?= htmlspecialchars($lang_data['audio_file_label'] ?? 'Fichier audio') ?>
          <span class="text-danger">*</span>
        </label>
        <div id="audioUploadDropzone"
             class="upload-dropzone text-center mb-2"
             style="border:2px dashed #ccc; padding:30px; border-radius:10px; transition:border-color .2s;">
          <i class="fas fa-cloud-upload-alt fa-3x upload-icon mb-3"></i>
          <p class="mb-2">
            <?= htmlspecialchars($lang_data['drop_file_here'] ?? 'Déposez un Fichier') ?>
          </p>
          <label for="audio_file" class="btn btn-primary btn-sm">
            <i class="fas fa-folder-open"></i>
            <?= htmlspecialchars($lang_data['choose_file'] ?? 'Choisir un Fichier') ?>
          </label>
          <input type="file"
                 id="audio_file"
                 name="audio_file"
                 accept="audio/*"
                 style="display:none;"
                 required>
          <small class="d-block text-muted mt-2">
            <?= htmlspecialchars($lang_data['allowed_audio_formats'] ?? 'Formats : mp3, wav, ogg, …') ?>
          </small>
        </div>
        <p id="audioFileName" class="mt-2 fw-bold d-none"></p>

      </div><!-- /.modal-body -->

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <?= htmlspecialchars($lang_data['cancel'] ?? 'Annuler') ?>
        </button>
        <button type="submit" class="btn btn-primary">
          <?= htmlspecialchars($lang_data['transcribe'] ?? 'Transcrire') ?>
        </button>
      </div>
    </form>
  </div>
</div>



<!-- ==== MODAL : UPLOAD VIDÉO (DROPZONE) ==== -->
<div class="modal fade" id="videoModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form id="videoForm"
          method="POST"
          action="videoContent.php"
          enctype="multipart/form-data"
          class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">
          <?= htmlspecialchars($lang_data['video_modal_title'] ?? 'Importer depuis un fichier vidéo') ?>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">

        <input type="hidden" name="study_subjects_id"
               id="video_study_subjects_id">

        <!-- Sujet -->
        <div class="form-floating mb-3">
          <input  type="text" name="topic" id="video_topic"
                  class="form-control"
                  placeholder="<?= htmlspecialchars($lang_data['topic_placeholder'] ?? '') ?>"
                  required>
          <label for="video_topic">
            <?= htmlspecialchars($lang_data['topic_label'] ?? 'Sujet') ?>
            <span class="text-danger">*</span>
            <small class="text-muted">
               (<?= htmlspecialchars($lang_data['mandatory'] ?? 'mandatory') ?>)
            </small>
          </label>
        </div>

        <!-- Sous-topic -->
        <div class="form-floating mb-4">
          <input  type="text" name="sub_topic" id="video_subtopic"
                  class="form-control"
                  placeholder="<?= htmlspecialchars($lang_data['sub_topic_placeholder'] ?? '') ?>">
          <label for="video_subtopic">
            <?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic') ?>
            <small class="text-muted">
              (<?= htmlspecialchars($lang_data['optional'] ?? 'optionnel') ?>)
            </small>
          </label>
        </div>

        <!-- DROPZONE -->
        <label class="form-label d-block">
          <?= htmlspecialchars($lang_data['video_file_label'] ?? 'Fichier vidéo') ?>
          <span class="text-danger">*</span>
        </label>
        <div id="videoUploadDropzone"
             class="upload-dropzone text-center mb-2"
             style="border:2px dashed #ccc; padding:30px; border-radius:10px; transition:border-color .2s;">
          <i class="fas fa-cloud-upload-alt fa-3x upload-icon mb-3"></i>
          <p class="mb-2">
            <?= htmlspecialchars($lang_data['drop_file_here'] ?? 'Déposez un Fichier') ?>
          </p>
          <label for="video_file" class="btn btn-primary btn-sm">
            <i class="fas fa-folder-open"></i>
            <?= htmlspecialchars($lang_data['choose_file'] ?? 'Choisir un Fichier') ?>
          </label>
          <input type="file"
                 id="video_file"
                 name="video_file"
                 accept="video/*"
                 style="display:none;"
                 required>
          <small class="d-block text-muted mt-2">
            <?= htmlspecialchars($lang_data['allowed_video_formats'] ?? 'Formats : mp4, mov, avi, …') ?>
          </small>
        </div>
        <p id="videoFileName" class="mt-2 fw-bold d-none"></p>

      </div><!-- /.modal-body -->

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <?= htmlspecialchars($lang_data['cancel'] ?? 'Annuler') ?>
        </button>
        <button type="submit" class="btn btn-primary">
          <?= htmlspecialchars($lang_data['extract_and_transcribe'] ?? 'Extraire & Transcrire') ?>
        </button>
      </div>
    </form>
  </div>
</div>


 <!-- ==== MODAL : SAISIR UNE URL YOUTUBE ==== -->
<div class="modal fade" id="youtubeModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form id="youtubeForm"
          method="POST"
          action="youtubeContent.php"
          class="modal-content">

      <!-- En-tête -->
      <div class="modal-header">
        <h5 class="modal-title">
          <?= htmlspecialchars($lang_data['youtube_modal_title'] ?? 'Importer depuis YouTube') ?>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <!-- Corps -->
      <div class="modal-body">

        <!-- Champ caché : ID de la matière -->
        <input type="hidden" name="study_subjects_id"
               id="yt_study_subjects_id">

        <!-- Sujet -->
        <div class="form-floating mb-3">
          <input  type="text" name="topic" id="youtube_topic"
                  class="form-control"
                  placeholder="<?= htmlspecialchars($lang_data['topic_placeholder'] ?? '') ?>"
                  required>
          <label for="youtube_topic">
            <?= htmlspecialchars($lang_data['topic_label'] ?? 'Sujet') ?>
            <span class="text-danger">*</span>
            <small class="text-muted">
               (<?= htmlspecialchars($lang_data['mandatory'] ?? 'mandatory') ?>)
            </small>
          </label>
        </div>

        <!-- Sous-topic -->
        <div class="form-floating mb-3">
          <input  type="text" name="sub_topic" id="youtube_subtopic"
                  class="form-control"
                  placeholder="<?= htmlspecialchars($lang_data['sub_topic_placeholder'] ?? '') ?>">
          <label for="youtube_subtopic">
            <?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic') ?>
            <small class="text-muted">
              (<?= htmlspecialchars($lang_data['optional'] ?? 'optionnel') ?>)
            </small>
          </label>
        </div>

        <!-- URL YouTube -->
        <div class="form-floating mb-2">
          <input  type="url"  name="youtube_url" id="youtube_url"
                  class="form-control"
                  placeholder="<?= htmlspecialchars($lang_data['youtube_url_placeholder'] ?? 'https://www.youtube.com/...') ?>"
                  required>
          <label for="youtube_url">
            <?= htmlspecialchars($lang_data['youtube_url_label'] ?? 'URL YouTube') ?>
          </label>
        </div>

      </div><!-- /.modal-body -->

      <!-- Pied -->
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary"
                data-bs-dismiss="modal">
          <?= htmlspecialchars($lang_data['cancel'] ?? 'Annuler') ?>
        </button>
        <button type="submit"  name="action" value="download"
                class="btn btn-primary">
          <?= htmlspecialchars($lang_data['extract_and_transcribe'] ?? 'Extraire & Transcrire') ?>
        </button>
      </div>

    </form>
  </div>
</div>



<!-- MODAL : CRÉER UN DOCUMENT D'UNE MATIÈRE + UPLOAD FICHIER -->
<div class="modal fade" id="addDocFromSubjectModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form 
      method="POST"
      action="extractDocumentContent.php"
      enctype="multipart/form-data"
      class="modal-content"
      id="docFromSubjectForm"
    >
      <div class="modal-header">
        <h5 class="modal-title">
          <?= htmlspecialchars($lang_data['modal_create_doc_title'] ?? 'Créer un Document') ?>
        </h5>
        <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <!-- Champ caché pour l’ID de la matière -->
        <input type="hidden" name="study_subjects_id" id="study_subjects_id" value="">

        <!-- Saisie du Topic -->
        <div class="form-floating mb-3">
          <input 
            type="text" 
            class="form-control" 
            name="topic" 
            id="topic"
            placeholder="<?= htmlspecialchars($lang_data['topic_placeholder'] ?? 'Ex: Chapitre 1') ?>" 
            required
          >
          <label for="topic">
            <?= htmlspecialchars($lang_data['topic_label'] ?? 'Topic (obligatoire)') ?>
            <span class="text-danger">*</span>
            <small class="text-muted">
               (<?= htmlspecialchars($lang_data['mandatory'] ?? 'mandatory') ?>)
            </small>
          </label>
        </div>

        <!-- Saisie du Sous-Topic -->
        <div class="form-floating mb-3">
          <input 
            type="text" 
            class="form-control"
            name="sub_topic"
            id="sub_topic"
            placeholder="<?= htmlspecialchars($lang_data['sub_topic_placeholder'] ?? 'Ex: Partie 1') ?>"
          >
          <label for="sub_topic">
            <?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic (optionnel)') ?>
            <small class="text-muted">
              (<?= htmlspecialchars($lang_data['optional'] ?? 'optionnel') ?>)
            </small>
          </label>
        </div>

        <!-- Champ caché pour la langue -->
        <input type="hidden" name="language" value="he">

        <!-- Zone d’upload (Dropzone personnalisée) -->
        <div id="uploadSection" class="mb-3 text-center">
          <label class="form-label d-block">
            <?= htmlspecialchars($lang_data['file_upload_label'] ?? 'Fichier à importer (obligatoire)') ?>
          </label>
          <div
            class="upload-dropzone"
            id="modalUploadDropzone"
            style="
              border: 2px dashed #ccc;
              padding: 30px;
              border-radius: 10px;
              transition: border-color 0.2s;"
          >
            <i class="fas fa-cloud-upload-alt fa-3x upload-icon mb-3"></i>
            <p class="mb-2">
              <?= htmlspecialchars($lang_data['drop_file_here'] ?? 'Déposez un Fichier') ?>
            </p>
            <label for="modal_document" class="btn btn-primary btn-sm">
              <i class="fas fa-folder-open"></i>
              <?= htmlspecialchars($lang_data['choose_file'] ?? 'Choisir un Fichier') ?>
            </label>
            <input
              type="file"
              id="modal_document"
              name="document"
              accept=".doc,.docx,.pdf,.jpeg,.jpg,.png,.xls,.xlsx,.ppt,.pptx"
              style="display: none;"
              oninvalid="this.setCustomValidity('<?= addslashes($lang_data['required_file_error'] ?? 'Veuillez sélectionner un fichier.') ?>')"
              oninput="this.setCustomValidity('')"
            >
            <small class="d-block text-muted mt-2">
              <?= htmlspecialchars($lang_data['allowed_formats'] ?? 'Formats: doc, docx, pdf, images, xls, xlsx, ppt, pptx') ?>
            </small>
          </div>
          <p id="modalFileName" class="mt-2" style="display:none; font-weight: 600;"></p>
        </div>

      </div><!-- .modal-body -->

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <?= htmlspecialchars($lang_data['cancel'] ?? 'Annuler') ?>
        </button>
        <button type="submit" class="btn btn-primary">
          <?= htmlspecialchars($lang_data['create_doc_btn'] ?? 'Créer le Document') ?>
        </button>
      </div>
    </form>
  </div>
</div>




<!-- MODAL : CURRICULUM-->
<?php if ($showCurriculumModal): ?>
<div 
  class="modal fade show"
  id="curriculumModal"
  style="display:block; background:rgba(0,0,0,0.5);"
  tabindex="-1"
  aria-hidden="true"
>
  <div class="modal-dialog modal-lg">
    <form
      action="updateStudentCurriculum.php"
      method="POST"
      class="modal-content"
      id="curriculumForm"
    >
      <input type="hidden" name="from_page" value="studyList">

      <div class="modal-header">
        <h5 class="modal-title">
          <?= htmlspecialchars($lang_data['curriculum_modal_title'] ?? 'Complétez vos informations') ?>
        </h5>
      </div>

      <div class="modal-body">
        <!-- Pays d'étude -->
        <div class="form-floating mb-3">
          <select
            name="student_country"
            id="student_country"
            class="form-select"
            required
          >
            <option value="">
              <?= htmlspecialchars($lang_data['select_country_option'] ?? '-- Sélectionnez un pays --') ?>
            </option>
            <option value="israel">
              <?= htmlspecialchars($lang_data['country_israel'] ?? 'ISRAEL') ?>
            </option>
            <option value="france">
              <?= htmlspecialchars($lang_data['country_france'] ?? 'FRANCE') ?>
            </option>
            <option value="etats-Unis">
              <?= htmlspecialchars($lang_data['country_usa'] ?? 'USA') ?>
            </option>
            <option value="angleterre">
              <?= htmlspecialchars($lang_data['country__UK'] ?? 'UK') ?>
            </option>
            <option value="russie">
              <?= htmlspecialchars($lang_data['country_russia'] ?? 'RUSSIE') ?>
            </option>
          </select>
          <label for="student_country">
            <?= htmlspecialchars($lang_data['student_country_label'] ?? "Pays d'étude") ?>
          </label>
        </div>

        <!-- Type d'Étudiant -->
        <div class="form-floating mb-3">
          <select
            name="student_type"
            id="student_type"
            class="form-select"
            required
          >
            <option value="">
              <?= htmlspecialchars($lang_data['select_student_type_option'] ?? '-- Choisir --') ?>
            </option>
            <option value="school">
              <?= htmlspecialchars($lang_data['school'] ?? 'School') ?>
            </option>
            <option value="academic">
              <?= htmlspecialchars($lang_data['academic'] ?? 'Academic') ?>
            </option>
          </select>
          <label for="student_type">
            <?= htmlspecialchars($lang_data['student_type_label'] ?? "Type d'Étudiant") ?>
          </label>
        </div>

        <!-- SCHOOL FIELDS -->
        <div id="schoolFields" class="d-none">
          <div class="form-floating mb-3">
            <select
              name="student_school_class"
              id="student_school_class"
              class="form-select"
            >
              <option value="">
                <?= htmlspecialchars($lang_data['select_class_option'] ?? '-- Sélectionnez la classe --') ?>
              </option>
            </select>
            <label for="student_school_class">
              <?= htmlspecialchars($lang_data['class_label'] ?? 'Classe') ?>
            </label>
          </div>
        </div>

        <!-- ACADEMIC FIELDS -->
        <div id="academicFields" class="d-none">
          <!-- Lignes Course, Diploma, Year -->
          <div class="row g-2 mb-3">
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_course_1"
                  id="course_1"
                  class="form-select"
                >
                </select>
                <label for="course_1">
                  <?= htmlspecialchars($lang_data['course_label'] ?? 'Course 1') ?>
                </label>
              </div>
            </div>
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_diploma_1"
                  id="diploma_1"
                  class="form-select"
                >
                </select>
                <label for="diploma_1">
                  <?= htmlspecialchars($lang_data['diploma_label'] ?? 'Diplôme 1') ?>
                </label>
              </div>
            </div>
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_year_1"
                  id="year_1"
                  class="form-select"
                >
                </select>
                <label for="year_1">
                  <?= htmlspecialchars($lang_data['year_label'] ?? 'Année 1') ?>
                </label>
              </div>
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_course_2"
                  id="course_2"
                  class="form-select"
                >
                </select>
                <label for="course_2">
                  <?= htmlspecialchars($lang_data['course_label'] ?? 'Course 2') ?>
                </label>
              </div>
            </div>
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_diploma_2"
                  id="diploma_2"
                  class="form-select"
                >
                </select>
                <label for="diploma_2">
                  <?= htmlspecialchars($lang_data['diploma_label'] ?? 'Diplôme 2') ?>
                </label>
              </div>
            </div>
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_year_2"
                  id="year_2"
                  class="form-select"
                >
                </select>
                <label for="year_2">
                  <?= htmlspecialchars($lang_data['year_label'] ?? 'Année 2') ?>
                </label>
              </div>
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_course_3"
                  id="course_3"
                  class="form-select"
                >
                </select>
                <label for="course_3">
                  <?= htmlspecialchars($lang_data['course_label'] ?? 'Course 3') ?>
                </label>
              </div>
            </div>
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_diploma_3"
                  id="diploma_3"
                  class="form-select"
                >
                </select>
                <label for="diploma_3">
                  <?= htmlspecialchars($lang_data['diploma_label'] ?? 'Diplôme 3') ?>
                </label>
              </div>
            </div>
            <div class="col">
              <div class="form-floating">
                <select
                  name="student_academic_year_3"
                  id="year_3"
                  class="form-select"
                >
                </select>
                <label for="year_3">
                  <?= htmlspecialchars($lang_data['year_label'] ?? 'Année 3') ?>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div><!-- .modal-body -->

      <div class="modal-footer">
        <button type="submit" class="btn btn-primary">
          <?= htmlspecialchars($lang_data['save'] ?? 'Enregistrer') ?>
        </button>
      </div>
    </form>
  </div>
</div>
<?php endif; ?>


<!-- MODAUX : QCM, Résumé, Paires, Flash, Miss -->

<!-- QCM -->
<div class="modal fade" id="generateQCMModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralQuizApi.php" id="generateQCMForm">
      <?= csrf_field() ?>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="generateQCMModalLabel">
            <?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?>
          </h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <!-- Champ caché -->
          <input 
            type="hidden"
            name="subject_document_id"
            id="modal_subject_document_id"
          >

          <!-- Thème / Sujet -->
          <div class="form-floating mb-3">
            <input 
              type="text"
              class="form-control"
              id="modal_subject"
              name="subject"
              placeholder="Thème / Sujet"
              required
            >
            <label for="modal_subject">
              <?= htmlspecialchars($lang_data['theme_label'] ?? 'Thème / Sujet') ?>
            </label>
          </div>

          <!-- Langue du QCM -->
          <div class="form-floating mb-3">
            <select
              class="form-select"
              id="modal_quiz_language"
              name="quiz_language"
              required
            >
              <option value="fr">
                <?= htmlspecialchars($lang_data['lang_french'] ?? 'Français') ?>
              </option>
              <option value="en">
                <?= htmlspecialchars($lang_data['lang_english'] ?? 'Anglais') ?>
              </option>
              <option value="he">
                <?= htmlspecialchars($lang_data['lang_hebrew'] ?? 'Hébreu') ?>
              </option>
              <option value="ar">
                <?= htmlspecialchars($lang_data['lang_arabic'] ?? 'Arabe') ?>
              </option>
              <option value="ru">
                <?= htmlspecialchars($lang_data['lang_russian'] ?? 'Russe') ?>
              </option>
            </select>
            <label for="modal_quiz_language">
              <?= htmlspecialchars($lang_data['quiz_language_label'] ?? 'Langue du QCM') ?>
            </label>
          </div>

          <!-- Niveau du QCM -->
          <div class="form-floating mb-3">
            <select
              class="form-select"
              id="modal_quiz_level"
              name="quiz_level"
              required
            >
            <option value="facile">
                <?= htmlspecialchars($lang_data['quiz_level_easy'] ?? 'Facile') ?>
            </option>
            <option value="moyen" selected>
                <?= htmlspecialchars($lang_data['quiz_level_medium'] ?? 'Moyen') ?>
            </option>
            <option value="difficile">
                <?= htmlspecialchars($lang_data['quiz_level_hard'] ?? 'Difficile') ?>
            </option>
            </select>
            <label for="modal_quiz_level">
              <?= htmlspecialchars($lang_data['quiz_level_label'] ?? 'Niveau du QCM') ?>
            </label>
          </div>

          <!-- Nombre de Questions -->
          <div class="form-floating mb-3">
            <input 
              type="number"
              class="form-control"
              id="modal_quiz_number"
              name="quiz_number_of_questions"
              min="1"
              max="50"
              value="5"
              placeholder="Nombre de Questions"
              required
            >
            <label for="modal_quiz_number">
              <?= htmlspecialchars($lang_data['quiz_number_label'] ?? 'Nombre de Questions') ?>
            </label>
          </div>

            <!-- Questions ouvertes : toggle + nombre -->
            <div class="mb-3">
              <div class="form-check">
                <input class="form-check-input"
                      type="checkbox"
                      name="include_open_questions"
                      id="include_open_questions"
                      value="1">
                <label class="form-check-label fw-bold" for="include_open_questions">
                  <?= htmlspecialchars($lang_data['include_open_questions'] ?? 'Ajouter des questions ouvertes') ?>
                </label>
              </div>

              <div id="openQuestionsCountWrap" class="form-floating mb-3">
                <input type="number"
                      class="form-control"
                      id="open_questions_count"
                      name="open_questions_count"
                      min="1"
                      max="5"
                      value="2">
                      <label for="open_questions_count">
                  <?= htmlspecialchars($lang_data['open_questions_count'] ?? 'Nombre de questions ouvertes') ?>
                </label>
              </div>

            </div>

        </div><!-- .modal-body -->

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
          </button>
          <button type="submit" class="btn btn-primary">
            <?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?>
          </button>
        </div>
      </div>
    </form>
  </div>
</div>


<!-- Résumé -->
<div class="modal fade" id="generateSummaryModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralSummaryApi.php" id="generateSummaryForm">
      <?= csrf_field() ?>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?>
          </h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <!-- Champ caché -->
          <input 
            type="hidden"
            name="subject_document_id"
            id="modal_summary_subject_document_id"
          >

          <!-- Langue du Résumé -->
          <div class="form-floating mb-3">
            <select
              class="form-select"
              id="modal_summary_language"
              name="summary_language"
              required
            >
              <option value="fr">
                <?= htmlspecialchars($lang_data['lang_french'] ?? 'Français') ?>
              </option>
              <option value="en">
                <?= htmlspecialchars($lang_data['lang_english'] ?? 'Anglais') ?>
              </option>
              <option value="he">
                <?= htmlspecialchars($lang_data['lang_hebrew'] ?? 'Hébreu') ?>
              </option>
              <option value="ar">
                <?= htmlspecialchars($lang_data['lang_arabic'] ?? 'Arabe') ?>
              </option>
              <option value="ru">
                <?= htmlspecialchars($lang_data['lang_russian'] ?? 'Russe') ?>
              </option>
            </select>
            <label for="modal_summary_language">
              <?= htmlspecialchars($lang_data['summary_language_label'] ?? 'Langue du Résumé') ?>
            </label>
          </div>
        </div><!-- .modal-body -->

        <div class="modal-footer">
          <button 
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
          </button>
          <button type="submit" class="btn btn-primary">
            <?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?>
          </button>
        </div>
      </div>
    </form>
  </div>
</div>


<!-- Paires -->
<div class="modal fade" id="generatePairModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralPairApi.php" id="generatePairForm">
      <?= csrf_field() ?>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <?= htmlspecialchars($lang_data['generate_pair'] ?? 'Générer Paires') ?>
          </h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <!-- Champ caché -->
          <input 
            type="hidden"
            name="subject_document_id"
            id="modal_pair_subject_document_id"
          >

          <!-- Langue pour les Paires -->
          <div class="form-floating mb-3">
            <select
              class="form-select"
              id="modal_pair_language"
              name="pair_language"
              required
            >
              <option value="fr">
                <?= htmlspecialchars($lang_data['lang_french'] ?? 'Français') ?>
              </option>
              <option value="en">
                <?= htmlspecialchars($lang_data['lang_english'] ?? 'Anglais') ?>
              </option>
              <option value="he">
                <?= htmlspecialchars($lang_data['lang_hebrew'] ?? 'Hébreu') ?>
              </option>
              <option value="ar">
                <?= htmlspecialchars($lang_data['lang_arabic'] ?? 'Arabe') ?>
              </option>
              <option value="ru">
                <?= htmlspecialchars($lang_data['lang_russian'] ?? 'Russe') ?>
              </option>
            </select>
            <label for="modal_pair_language">
              <?= htmlspecialchars($lang_data['pair_language_label'] ?? 'Langue pour les Paires') ?>
            </label>
          </div>

          <!-- <p class="mt-3">
            <?= htmlspecialchars($lang_data['generate_pair_confirm'] ?? 'Voulez-vous générer des paires ?') ?>
          </p> -->
        </div><!-- .modal-body -->

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
          </button>
          <button type="submit" class="btn btn-primary">
            <?= htmlspecialchars($lang_data['generate_pair'] ?? 'Générer Paires') ?>
          </button>
        </div>
      </div>
    </form>
  </div>
</div>


<!-- Flash -->
<div class="modal fade" id="generateFlashModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralFlashApi.php" id="generateFlashForm">
      <?= csrf_field() ?>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <?= htmlspecialchars($lang_data['generate_flash'] ?? 'Générer Flash') ?>
          </h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <!-- Champ caché -->
          <input 
            type="hidden"
            name="subject_document_id"
            id="modal_flash_subject_document_id"
          >

          <!-- Langue pour les Flash -->
          <div class="form-floating mb-3">
            <select
              class="form-select"
              id="modal_flash_language"
              name="flash_language"
              required
            >
              <option value="fr">
                <?= htmlspecialchars($lang_data['lang_french'] ?? 'Français') ?>
              </option>
              <option value="en">
                <?= htmlspecialchars($lang_data['lang_english'] ?? 'Anglais') ?>
              </option>
              <option value="he">
                <?= htmlspecialchars($lang_data['lang_hebrew'] ?? 'Hébreu') ?>
              </option>
              <option value="ar">
                <?= htmlspecialchars($lang_data['lang_arabic'] ?? 'Arabe') ?>
              </option>
              <option value="ru">
                <?= htmlspecialchars($lang_data['lang_russian'] ?? 'Russe') ?>
              </option>
            </select>
            <label for="modal_flash_language">
              <?= htmlspecialchars($lang_data['flash_language_label'] ?? 'Langue pour les Flash') ?>
            </label>
          </div>

          <!-- Nombre de Flashcards -->
          <div class="form-floating mb-3">
            <input
              type="number"
              class="form-control"
              id="modal_flash_number"
              name="flash_number"
              min="5"
              max="50"
              value="15"
              placeholder="Nombre de flashcards"
              required
            >
            <label for="modal_flash_number">
              <?= htmlspecialchars($lang_data['flash_number_label'] ?? 'Nombre de flashcards') ?>
            </label>
          </div>

          <!-- <p class="mt-3">
            <?= htmlspecialchars($lang_data['generate_flash_confirm'] ?? 'Voulez-vous générer des flashcards ?') ?>
          </p> -->
        </div><!-- .modal-body -->

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
          </button>
          <button type="submit" class="btn btn-primary">
            <?= htmlspecialchars($lang_data['generate_flash'] ?? 'Générer Flash') ?>
          </button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Modal : CHOIX du mode de génération -->
<div class="modal fade" id="generateFlashChoiceModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title"><?= $lang_data['flash_generation_title'] ?></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body text-center">
        <button id="autoFlashBtn"
                class="btn btn-primary mb-2 w-100">
                <?= $lang_data['flash_generation_auto'] ?>
        </button>

        <button id="manualFlashBtn"
                class="btn btn-secondary w-100">
                <?= $lang_data['flash_generation_manual'] ?>
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Modal : SAISIE MANUELLE d’une flash-card -->
<div class="modal fade" id="generateFlashManualModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form id="generateFlashManualForm" class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title"><?= $lang_data['flash_add_title'] ?></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <input type="hidden" id="manual_subject_document_id"
               name="subject_document_id" value="">

        <div class="mb-3">
          <label for="manual_recto" class="form-label">
            <?= $lang_data['flash_recto_label'] ?>
          </label>
          <textarea id="manual_recto" name="recto"
                    class="form-control" rows="2" required></textarea>
        </div>

        <div class="mb-3">
          <label for="manual_verso" class="form-label">
            <?= $lang_data['flash_verso_label'] ?>
          </label>
          <textarea id="manual_verso" name="verso"
                    class="form-control" rows="3" required></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary"
                data-bs-dismiss="modal">
                <?= $lang_data['flash_cancel'] ?>
        </button>
        <button type="submit" class="btn btn-primary">
                <?= $lang_data['flash_add'] ?>
        </button>
      </div>
    </form>
  </div>
</div>


<!-- MODAL : Générer Mots-croisés -->
<div class="modal fade" id="generateCrosswordModal" tabindex="-1">
  <div class="modal-dialog">
    <form method="POST" action="generate_crossword.php" id="generateCrosswordForm" class="modal-content">
      <?= csrf_field() ?>
      <div class="modal-header">
        <h5 class="modal-title"><?=htmlspecialchars($lang_data['generate_crossword']??'Générer Mots-croisés')?></h5>
        <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <input type="hidden" name="subject_document_id" id="modal_cross_sid">
        <div class="form-floating">
          <select name="crossword_language" id="modal_cross_lang" class="form-select">
            <option value="fr">Français</option><option value="en">English</option>
            <option value="he">עברית</option><option value="ar">العربية</option>
            <option value="ru">Русский</option>
          </select>
          <label>Langue</label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal"><?=$lang_data['close']??'Fermer'?></button>
        <button class="btn btn-primary"><?=$lang_data['generate']??'Générer'?></button>
      </div>
    </form>
  </div>
</div>

<!-- VRAI / FAUX -->
<div class="modal fade" id="generateTFModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralTrueFalseApi.php" id="generateTFForm" class="modal-content">
      <?= csrf_field() ?>
      <div class="modal-header">
        <h5 class="modal-title">
          <?= htmlspecialchars($lang_data['generate_truefalse'] ?? 'Générer Vrai/Faux') ?>
        </h5>
        <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <!-- ID caché du document -->
        <input type="hidden" name="subject_document_id" id="modal_tf_subject_document_id">

        <!-- Choix de la langue -->
        <div class="form-floating mb-3">
          <select class="form-select" id="modal_tf_language" name="tf_language" required>
            <option value="fr"><?= htmlspecialchars($lang_data['lang_french']  ?? 'Français') ?></option>
            <option value="en"><?= htmlspecialchars($lang_data['lang_english'] ?? 'Anglais')   ?></option>
            <option value="he"><?= htmlspecialchars($lang_data['lang_hebrew']  ?? 'Hébreu')    ?></option>
            <option value="ar"><?= htmlspecialchars($lang_data['lang_arabic']  ?? 'Arabe')     ?></option>
            <option value="ru"><?= htmlspecialchars($lang_data['lang_russian'] ?? 'Russe')     ?></option>
          </select>
          <label for="modal_tf_language">
            <?= htmlspecialchars($lang_data['tf_language_label'] ?? 'Langue') ?>
          </label>
        </div>
      </div><!-- /.modal-body -->

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
        </button>
        <button type="submit" class="btn btn-primary">
          <?= htmlspecialchars($lang_data['generate_truefalse'] ?? 'Générer') ?>
        </button>
      </div>
    </form>
  </div>
</div>


<!-- Miss -->
<div class="modal fade" id="generateMissModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <form method="POST" action="generateGeneralMissApi.php" id="generateMissForm">
      <?= csrf_field() ?>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <?= htmlspecialchars($lang_data['generate_miss'] ?? 'Générer Miss') ?>
          </h5>
          <button type="button" class="btn btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <!-- Champ caché -->
          <input 
            type="hidden"
            name="subject_document_id"
            id="modal_miss_subject_document_id"
          >

          <!-- Langue pour les Miss -->
          <div class="form-floating mb-3">
            <select
              class="form-select"
              id="modal_miss_language"
              name="miss_language"
              required
            >
              <option value="fr">
                <?= htmlspecialchars($lang_data['lang_french'] ?? 'Français') ?>
              </option>
              <option value="en">
                <?= htmlspecialchars($lang_data['lang_english'] ?? 'Anglais') ?>
              </option>
              <option value="he">
                <?= htmlspecialchars($lang_data['lang_hebrew'] ?? 'Hébreu') ?>
              </option>
              <option value="ar">
                <?= htmlspecialchars($lang_data['lang_arabic'] ?? 'Arabe') ?>
              </option>
              <option value="ru">
                <?= htmlspecialchars($lang_data['lang_russian'] ?? 'Russe') ?>
              </option>
            </select>
            <label for="modal_miss_language">
              <?= htmlspecialchars($lang_data['miss_language_label'] ?? 'Langue pour les Miss') ?>
            </label>
          </div>

          <!-- <p class="mt-3">
            <?= htmlspecialchars($lang_data['generate_miss_confirm'] ?? 'Voulez-vous générer des exercices “Miss” ?') ?>
          </p> -->
        </div><!-- .modal-body -->

        <div class="modal-footer">
          <button 
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
          </button>
          <button type="submit" class="btn btn-primary">
            <?= htmlspecialchars($lang_data['generate_miss'] ?? 'Générer Miss') ?>
          </button>
        </div>
      </div>
    </form>
  </div>
</div>


<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script>
// ⬅️ NOUVEAU : Variables pour stocker l'état du choix
let pendingFlashDocId     = null;
let pendingFlashLang      = null;
let pendingFlashHasContent = false;

// ---- JS principal ----
document.addEventListener('DOMContentLoaded', function() {

    // 1) Filtre "Afficher/Cacher"
    const toggleFiltersBtn = document.getElementById('toggleFilters');
    const filtersContainer = document.getElementById('filtersContainer');
    if (toggleFiltersBtn && filtersContainer) {
        toggleFiltersBtn.addEventListener('click', () => {
            filtersContainer.classList.toggle('hidden');
        });
    }

    // 2) Bouton "Réinitialiser"
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            window.location.href = 'studyList.php';
        });
    }

    // 3) Flatpickr
    const filterDateInput = document.getElementById('filterDate');
    if (filterDateInput) {
        flatpickr(filterDateInput, { mode: "range", dateFormat: "Y-m-d" });
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
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sId = link.getAttribute('data-study-subject-id') || '';
                if (docModalStudyIdInput) {
                    docModalStudyIdInput.value = sId;
                }
                new bootstrap.Modal(document.getElementById('documentChoiceModal')).show();
            });
        });


    // Pour le cas "Avec Document"
    var withDocCard = document.getElementById('withDocumentCard');
    if (withDocCard) {
        withDocCard.addEventListener('click', function() {
            // Afficher la zone d'upload
            document.getElementById('uploadSection').style.display = 'block';
            // Obtenir les références aux modaux
            const choiceModalEl = document.getElementById('documentChoiceModal');
            const addDocModalEl = document.getElementById('addDocFromSubjectModal');
            // Obtenir ou créer l'instance du modal de choix
            const choiceModalInstance = bootstrap.Modal.getOrCreateInstance(choiceModalEl);
            // Masquer le modal de choix
            choiceModalInstance.hide();
            // Une fois le modal complètement caché, ouvrir le modal de création
            choiceModalEl.addEventListener('hidden.bs.modal', function handler() {
                bootstrap.Modal.getOrCreateInstance(addDocModalEl).show();
                choiceModalEl.removeEventListener('hidden.bs.modal', handler);
            }, { once: true });
            // Rendre le champ file obligatoire
            const fileInput = document.getElementById('modal_document');
            fileInput.setAttribute('required', '');
        });
    }

    // Pour le cas "Sans Document"
    var withoutDocCard = document.getElementById('withoutDocumentCard');
    if (withoutDocCard) {
        withoutDocCard.addEventListener('click', function() {
            // Masquer la zone d'upload
            document.getElementById('uploadSection').style.display = 'none';
            // Obtenir les références aux modaux
            const choiceModalEl = document.getElementById('documentChoiceModal');
            const addDocModalEl = document.getElementById('addDocFromSubjectModal');
            // Obtenir ou créer l'instance du modal de choix
            const choiceModalInstance = bootstrap.Modal.getOrCreateInstance(choiceModalEl);
            // Masquer le modal de choix
            choiceModalInstance.hide();
            // Une fois le modal complètement caché, ouvrir le modal de création
            choiceModalEl.addEventListener('hidden.bs.modal', function handler() {
                bootstrap.Modal.getOrCreateInstance(addDocModalEl).show();
                choiceModalEl.removeEventListener('hidden.bs.modal', handler);
            }, { once: true });
            // Retirer l'attribut "required" du champ file
            const fileInput = document.getElementById('modal_document');
            fileInput.removeAttribute('required');
        });
    }

    // dans DOMContentLoaded
const ytCard = document.getElementById('youtubeCard');
if (ytCard) {
  ytCard.addEventListener('click', () => {
    // on récupère l'ID de la matière sélectionnée
    const sId = document.getElementById('study_subjects_id').value;
    document.getElementById('yt_study_subjects_id').value = sId;
    // on masque le choix et affiche le modal youtube
    bootstrap.Modal.getInstance(document.getElementById('documentChoiceModal')).hide();
    new bootstrap.Modal(document.getElementById('youtubeModal')).show();
  });
}

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
                    sclSel.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_class_option"] ?? "-- Sélectionnez la classe --") ?></option>';
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

    const params = new URLSearchParams(window.location.search);
    if (params.has('docAddSuccess')) { 
        var element = document.getElementById('documentsContainer');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
         }
     }


    // 10) Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // 11) Scripts pour QCM, Résumé, Pair, Flash, Miss
    // On teste data-has-content pour choisir l'API

    // QCM
    const generateQCMButtons = document.querySelectorAll('.generate-qcm-btn');
    const modalQCMForm       = document.getElementById('generateQCMForm');
    const modalQCMDocumentId = document.getElementById('modal_subject_document_id');
    const modalQCMSubject    = document.getElementById('modal_subject');
    const modalQuizLang      = document.getElementById('modal_quiz_language');
    const modalQuizLevel     = document.getElementById('modal_quiz_level');
    const modalQuizNumber    = document.getElementById('modal_quiz_number');

    generateQCMButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const docId         = btn.getAttribute('data-document-id');
            const lang          = btn.getAttribute('data-language') || 'he';
            const subj          = btn.getAttribute('data-subject')  || '';
            const hasExtracted  = (btn.getAttribute('data-has-content') === '1');

            // Choisir l'API selon hasExtracted
            if (hasExtracted) {
                modalQCMForm.action = "generateDocumentQuizApi.php";
            } else {
                modalQCMForm.action = "generateGeneralQuizApi.php";
            }

            modalQCMDocumentId.value = docId;
            modalQCMSubject.value     = subj;
            modalQuizLang.value       = lang;
            modalQuizLevel.value      = 'moyen';
            modalQuizNumber.value     = 5;
        });
    });
    // --- Toggle champ "nombre de questions ouvertes" ---
    (function(){
      const chk  = document.getElementById('include_open_questions');
      const wrap = document.getElementById('openQuestionsCountWrap');
      const inp  = document.getElementById('open_questions_count');
      if (!chk || !wrap || !inp) return;

      function sync() {
        const on = chk.checked;
        wrap.classList.toggle('d-none', !on);
        inp.disabled = !on;
      }

      chk.addEventListener('change', sync);
      sync(); // état initial
    })();

    // Résumé
    const generateSummaryButtons = document.querySelectorAll('.generate-summary-btn');
    const modalSummaryForm       = document.getElementById('generateSummaryForm');
    const modalSummaryDocId      = document.getElementById('modal_summary_subject_document_id');
    const modalSummaryLangSelect = document.getElementById('modal_summary_language');

    generateSummaryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const docId         = btn.getAttribute('data-document-id');
            const lang          = btn.getAttribute('data-language') || 'he';
            const hasExtracted  = (btn.getAttribute('data-has-content') === '1');

            // Choisir l'API
            if (hasExtracted) {
                modalSummaryForm.action = "generateDocumentSummaryApi.php";
            } else {
                modalSummaryForm.action = "generateGeneralSummaryApi.php";
            }

            modalSummaryDocId.value         = docId;
            modalSummaryLangSelect.value    = lang;
        });
    });

    // Paires
    const generatePairButtons = document.querySelectorAll('.generate-pair-btn');
    const modalPairForm       = document.getElementById('generatePairForm');
    const modalPairDocumentId = document.getElementById('modal_pair_subject_document_id');
    const modalPairLanguage   = document.getElementById('modal_pair_language');

    generatePairButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const docId         = btn.getAttribute('data-document-id');
            const lang          = btn.getAttribute('data-language') || 'he';
            const hasExtracted  = (btn.getAttribute('data-has-content') === '1');

            if (hasExtracted) {
                modalPairForm.action = "generateDocumentPairApi.php";
            } else {
                modalPairForm.action = "generateGeneralPairApi.php";
            }

            modalPairDocumentId.value = docId;
            modalPairLanguage.value    = lang;
        });
    });

// 11) Scripts pour Flash
const generateFlashButtons = document.querySelectorAll('.generate-flash-btn');
  const choiceModalEl        = document.getElementById('generateFlashChoiceModal');
  const manualModalEl        = document.getElementById('generateFlashManualModal');

  generateFlashButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    pendingFlashDocId      = btn.getAttribute('data-document-id');
    pendingFlashLang       = btn.getAttribute('data-language') || 'he';
    pendingFlashHasContent = (btn.getAttribute('data-has-content') === '1');

    // préparer le manuel
    document.getElementById('manual_subject_document_id').value = pendingFlashDocId;

    // OUVRIR UNIQUEMENT le choix AUTOMATIQUE / MANUEL
    new bootstrap.Modal(document.getElementById('generateFlashChoiceModal')).show();
  });
});

  // Choix Automatique
  document.getElementById('autoFlashBtn').addEventListener('click', () => {
  bootstrap.Modal.getInstance(choiceModalEl).hide();

  // configurer l’action et la langue
  const form = document.getElementById('generateFlashForm');
  form.action = pendingFlashHasContent
    ? 'generateDocumentFlashApi.php'
    : 'generateGeneralFlashApi.php';
  document.getElementById('modal_flash_subject_document_id').value = pendingFlashDocId;
  document.getElementById('modal_flash_language').value = pendingFlashLang;

  // Ouvrir le modal LANGUE
  new bootstrap.Modal(document.getElementById('generateFlashModal')).show();
});

  // Choix Manuel
  document.getElementById('manualFlashBtn').addEventListener('click', () => {
    bootstrap.Modal.getInstance(choiceModalEl).hide();
    new bootstrap.Modal(manualModalEl).show();
  });

  // Soumission du formulaire manuel (AJAX)
// Soumission du formulaire manuel (AJAX) → redirection vers viewFlash
  document.getElementById('generateFlashManualForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    try {
      const res = await fetch('addFlashCardApi.php', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Fermer le modal manuelle
      bootstrap.Modal.getInstance(manualModalEl).hide();

      // Rediriger vers viewFlash pour afficher la carte
      window.location.href = 'viewFlash.php?subject_document_id=' + encodeURIComponent(pendingFlashDocId);
    } catch(err) {
      Swal.fire('Erreur', err.message, 'error');
    }
  });


    // Miss
    const generateMissButtons = document.querySelectorAll('.generate-miss-btn');
    const modalMissForm       = document.getElementById('generateMissForm');
    const modalMissDocumentId = document.getElementById('modal_miss_subject_document_id');
    const modalMissLanguage   = document.getElementById('modal_miss_language');

    generateMissButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const docId         = btn.getAttribute('data-document-id');
            const lang          = btn.getAttribute('data-language') || 'he';
            const hasExtracted  = (btn.getAttribute('data-has-content') === '1');

            if (hasExtracted) {
                modalMissForm.action = "generateDocumentMissApi.php";
            } else {
                modalMissForm.action = "generateGeneralMissApi.php";
            }

            modalMissDocumentId.value = docId;
            modalMissLanguage.value   = lang;
        });
    });

    // --- Vrai/Faux ---
    const generateTFButtons   = document.querySelectorAll('.generate-tf-btn');
    const modalTFForm         = document.getElementById('generateTFForm');
    const modalTFDocumentId   = document.getElementById('modal_tf_subject_document_id');
    const modalTFLanguage     = document.getElementById('modal_tf_language');

    generateTFButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const docId      = btn.getAttribute('data-document-id');
        const lang       = btn.getAttribute('data-language') || 'he';
        const hasContent = (btn.getAttribute('data-has-content') === '1');

        // Choix de l’API selon contenu extrait ou non
        modalTFForm.action = hasContent
          ? 'generateDocumentTrueFalseApi.php'
          : 'generateGeneralTrueFalseApi.php';

        modalTFDocumentId.value = docId;
        modalTFLanguage.value   = lang;
      });
    });

    // Crossword
    document.querySelectorAll('.generate-crossword-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const form=document.getElementById('generateCrosswordForm');
        form.action = (btn.dataset.hasContent==='1')
          ? 'generate_crossword.php'
          : 'generate_crossword.php';
        document.getElementById('modal_cross_sid').value  = btn.dataset.documentId;
        document.getElementById('modal_cross_lang').value = btn.dataset.language || 'he';
      });
    });


    // 12) section d'upload

    const modalDropzone   = document.getElementById('modalUploadDropzone');
    const modalFileInput  = document.getElementById('modal_document');
    const modalFileNameEl = document.getElementById('modalFileName');

    // Empêcher comportement par défaut sur la zone
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        modalDropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Apparence “dragover”
    modalDropzone.addEventListener('dragover', () => {
        modalDropzone.classList.add('dragover');
    });
    modalDropzone.addEventListener('dragleave', () => {
        modalDropzone.classList.remove('dragover');
    });

    // Déposer un fichier
    modalDropzone.addEventListener('drop', (e) => {
        modalDropzone.classList.remove('dragover');
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            modalFileInput.files = files;  // Assigner le fichier
            showFileName(files[0].name);
        }
    });

    // Choisir un fichier via “Parcourir”
    modalFileInput.addEventListener('change', () => {
        if (modalFileInput.files.length > 0) {
            showFileName(modalFileInput.files[0].name);
        }
    });

    function showFileName(filename) {
        modalFileNameEl.textContent = "<?= addslashes($lang_data['file_selected_label'] ?? 'Fichier sélectionné : ') ?>" + filename;
        modalFileNameEl.style.display = 'block';
    }
    
        //l'upload est required que si on choisit avec document
        var withDocCard = document.getElementById('withDocumentCard');
    if (withDocCard) {
        withDocCard.addEventListener('click', function() {
            document.getElementById('uploadSection').style.display = 'block';
            var choiceModalEl = document.getElementById('documentChoiceModal');
            var choiceModal = bootstrap.Modal.getInstance(choiceModalEl);
            if (choiceModal) {
                choiceModal.hide();
            } else {
                new bootstrap.Modal(choiceModalEl).hide();
            }
            new bootstrap.Modal(document.getElementById('addDocFromSubjectModal')).show();

            // Rendre le file input OBLIGATOIRE
            const fileInput = document.getElementById('modal_document');
            fileInput.setAttribute('required', '');
        });
    }

    var withoutDocCard = document.getElementById('withoutDocumentCard');
    if (withoutDocCard) {
        withoutDocCard.addEventListener('click', function() {
            document.getElementById('uploadSection').style.display = 'none';
            var choiceModalEl = document.getElementById('documentChoiceModal');
            var choiceModal = bootstrap.Modal.getInstance(choiceModalEl);
            if (choiceModal) {
                choiceModal.hide();
            } else {
                new bootstrap.Modal(choiceModalEl).hide();
            }
            new bootstrap.Modal(document.getElementById('addDocFromSubjectModal')).show();

            // Retirer le file input OBLIGATOIRE
            const fileInput = document.getElementById('modal_document');
            fileInput.removeAttribute('required');
        });
    }

    //13) Réinitialiser le formulaire du modal "Ajouter un document" à chaque ouverture
    const addDocModal = document.getElementById('addDocFromSubjectModal');
    if(addDocModal) {
        addDocModal.addEventListener('show.bs.modal', function () {
        // Réinitialise l'ensemble du formulaire
        const form = addDocModal.querySelector('form');
        if(form) {
            form.reset();
        }
        // Optionnel : Masquer le nom du fichier s'il est affiché
        const fileNameEl = document.getElementById('modalFileName');
        if(fileNameEl) {
            fileNameEl.style.display = 'none';
        }
        });
    }

    
    // 14) Sélectionner tous les formulaires de suppression
    // suppression des matieres
    const deleteForms = document.querySelectorAll('.delete-subject-form');
    deleteForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Empêcher la soumission automatique

            Swal.fire({
                title: "<?= htmlspecialchars($lang_data['delete_confirmation_title'] ?? 'Confirmation') ?>",
                text: "<?= htmlspecialchars($lang_data['delete_confirmation_text'] ?? 'Voulez-vous vraiment supprimer cette matière ?') ?>",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0097b2',
                cancelButtonColor: '#19d1f1',
                confirmButtonText: "<?= htmlspecialchars($lang_data['delete_confirmation_confirm'] ?? 'Oui, supprimer') ?>",
                cancelButtonText: "<?= htmlspecialchars($lang_data['delete_confirmation_cancel'] ?? 'Annuler') ?>"
            }).then((result) => {
                if (result.isConfirmed) {
                    form.submit();
                }
            });
        });
    });
    // suppression des documents
    const deleteDocForms = document.querySelectorAll('.delete-document-form');
    deleteDocForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Empêche la soumission automatique
            Swal.fire({
                title: "<?= htmlspecialchars($lang_data['delete_document_confirmation_title'] ?? 'Confirmation') ?>",
                text: "<?= htmlspecialchars($lang_data['delete_document_confirmation_text'] ?? 'Voulez-vous vraiment supprimer ce document ?') ?>",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0097b2',
                cancelButtonColor: '#19d1f1',
                confirmButtonText: "<?= htmlspecialchars($lang_data['delete_document_confirm'] ?? 'Oui, supprimer') ?>",
                cancelButtonText: "<?= htmlspecialchars($lang_data['delete_document_cancel'] ?? 'Annuler') ?>"
            }).then((result) => {
                if (result.isConfirmed) {
                    form.submit();
                }
            });
        });
    });

        // Ouvre le modal upload audio
        const audioCard = document.getElementById('audioCard');
    if (audioCard) {
      audioCard.addEventListener('click', () => {
        // récupère l'ID de la matière
        const sId = document.getElementById('study_subjects_id').value;
        document.getElementById('audio_study_subjects_id').value = sId;
        // ferme le choix modal et ouvre l'audio modal
        bootstrap.Modal.getInstance(
          document.getElementById('documentChoiceModal')
        ).hide();
        new bootstrap.Modal(
          document.getElementById('audioModal')
        ).show();
      });
    }

// Ouvre le modal upload vidéo
const videoCard = document.getElementById('videoCard');
if (videoCard) {
  videoCard.addEventListener('click', () => {
    // récupère l’ID de la matière sélectionnée (même input caché que pour YouTube/audio)
    const sId = document.getElementById('study_subjects_id').value;
    document.getElementById('video_study_subjects_id').value = sId;
    // cache le choix et ouvre le modal vidéo
    bootstrap.Modal.getInstance(document.getElementById('documentChoiceModal')).hide();
    new bootstrap.Modal(document.getElementById('videoModal')).show();
  });
}

    // ----- Bloquer les doubles clics et activer le spinner -----
    const spinner = document.getElementById('spinner');

    // 1) Sur soumission des formulaires "Générer", afficher le spinner et désactiver le bouton
    ['generateQCMForm','generateSummaryForm','generatePairForm','generateFlashForm','generateMissForm','generateTFForm','docFromSubjectForm','youtubeForm','audioForm','videoForm']
    .forEach(formId => {
      const form = document.getElementById(formId);
      if (!form) return;
      form.addEventListener('submit', function() {
        if (spinner) spinner.style.display = 'flex';
        const btn = this.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
      });
    });


    // 2) Sur ouverture de modal "Générer", désactiver le bouton d'origine et le réactiver à la fermeture
    function preventMultiClick(selector, modalId) {
      document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', function() {
          this.disabled = true;
          const mdl = document.getElementById(modalId);
          mdl.addEventListener('hidden.bs.modal', () => {
            this.disabled = false;
          }, { once: true });
        });
      });
    }
    preventMultiClick('.generate-qcm-btn',      'generateQCMModal');
    preventMultiClick('.generate-summary-btn',  'generateSummaryModal');
    preventMultiClick('.generate-pair-btn',     'generatePairModal');
    preventMultiClick('.generate-flash-btn',   'generateFlashModal');
    preventMultiClick('.generate-flash-btn',   'generateFlashChoiceModal');
    preventMultiClick('.generate-flash-btn',   'generateFlashManualModal');
    preventMultiClick('.generate-miss-btn',     'generateMissModal');
    preventMultiClick('.generate-tf-btn', 'generateTFModal');

    
});
</script>
</body>
</html>
<?php include 'includes/footer.php'; ?>