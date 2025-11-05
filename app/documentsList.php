<?php
// documentsList.php

session_start();
require 'config.php';
requireSubscription($pdo);
require_once 'vendor/autoload.php';

// Inclure le header (qui doit normalement inclure Bootstrap CSS/JS)
include 'includes/header.php';

use Ramsey\Uuid\Uuid;

// ---------------------------------------------
// 1) Vérifier si l'utilisateur est connecté
// ---------------------------------------------
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

$userUuid = $_SESSION['user_uuid'];

// ---------------------------------------------
// 2) Vérifier le curriculum de l'utilisateur
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
    // Pas de ligne => l'utilisateur n'a rien rempli
    $showCurriculumModal = true;
} else {
    $studentTypeInDb = $curriculum['student_type'] ?? '';
    $country         = $curriculum['student_country'] ?? '';

    if (empty($studentTypeInDb) || empty($country)) {
        // Type étudiant ou pays vide => forcer le modal
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
// 3) Gestion des messages de succès/erreur suite à l'upload
// ---------------------------------------------
$uploadSuccess = '';
$uploadError   = '';
if (isset($_GET['uploadSuccess'])) {
    $uploadSuccess = $lang_data['upload_success'] ?? 'Upload réussi.';
}
if (isset($_GET['uploadError'])) {
    $uploadError = htmlspecialchars($_GET['uploadError']);
}

// Gestion des messages de succès après mise à jour
$updateSuccess = isset($_GET['updateSuccess']) ? true : false;

// ---------------------------------------------
// 4) Pagination et filtres
// ---------------------------------------------
$limit = 18;
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

$search     = isset($_GET['search'])     ? trim($_GET['search'])     : '';
$filterDate = isset($_GET['filterDate']) ? trim($_GET['filterDate']) : '';
$filterTheme= isset($_GET['theme'])      ? trim($_GET['theme'])      : '';

// ---------------------------------------------
// 5) Charger les thèmes distincts
// ---------------------------------------------
try {
    // Récupérer les thèmes distincts
    $themeQuery = "
        SELECT DISTINCT theme
        FROM Documents
        WHERE uuid = :uuid
          AND theme IS NOT NULL
          AND theme != ''
        ORDER BY theme ASC
    ";
    $stmtThemes = $pdo->prepare($themeQuery);
    $stmtThemes->execute([':uuid' => $userUuid]);
    $themes = $stmtThemes->fetchAll(PDO::FETCH_COLUMN);

    // Construire la requête de comptage
    $countQuery = "
        SELECT COUNT(*)
        FROM Documents
        WHERE uuid = :uuid
    ";
    $params = [':uuid' => $userUuid];

    // Filtre search
    if ($search !== '') {
        $countQuery .= " AND LOWER(filename) LIKE :search";
        $params[':search'] = '%' . strtolower($search) . '%';
    }

    // Filtre date
    $dates = [];
    if ($filterDate !== '') {
        $dates = explode(' to ', $filterDate);
        if (count($dates) === 2) {
            $countQuery .= " AND DATE(created_time) BETWEEN :start_date AND :end_date";
            $params[':start_date'] = $dates[0];
            $params[':end_date']   = $dates[1];
        } elseif (count($dates) === 1) {
            $countQuery .= " AND DATE(created_time) = :exact_date";
            $params[':exact_date'] = $dates[0];
        }
    }
    // Filtre thème
    if ($filterTheme !== '') {
        $countQuery .= " AND theme = :theme";
        $params[':theme'] = $filterTheme;
    }

    // Récupération du total
    $stmtTotal = $pdo->prepare($countQuery);
    $stmtTotal->execute($params);
    $totalDocuments = $stmtTotal->fetchColumn();
    $totalPages = ceil($totalDocuments / $limit);

    // ---------------------------------------------
    // 6) Requête principale pour récupérer documents
    // ---------------------------------------------
    $query = "
        SELECT D.*,
               (SELECT COUNT(*) FROM documentQuestions WHERE document_id = D.id) AS has_qcm,
               (SELECT COUNT(*) FROM documentResumes   WHERE document_id = D.id) AS has_summary,
               (SELECT COUNT(*) FROM documentPairs     WHERE document_id = D.id) AS has_pair,
               (SELECT COUNT(*) FROM documentFlash     WHERE document_id = D.id) AS has_flash,
               (SELECT COUNT(*) FROM documentMiss      WHERE document_id = D.id) AS has_miss
        FROM Documents D
        WHERE D.uuid = :uuid
    ";
    if ($search !== '') {
        $query .= " AND LOWER(D.filename) LIKE :search";
    }
    if ($filterDate !== '') {
        if (count($dates) === 2) {
            $query .= " AND DATE(D.created_time) BETWEEN :start_date AND :end_date";
        } elseif (count($dates) === 1) {
            $query .= " AND DATE(D.created_time) = :exact_date";
        }
    }
    if ($filterTheme !== '') {
        $query .= " AND D.theme = :theme";
    }

    $query .= " ORDER BY D.created_time DESC LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':uuid', $userUuid, PDO::PARAM_STR);

    if ($search !== '') {
        $stmt->bindValue(':search', '%' . strtolower($search) . '%', PDO::PARAM_STR);
    }
    if ($filterDate !== '') {
        if (count($dates) === 2) {
            $stmt->bindValue(':start_date', $dates[0], PDO::PARAM_STR);
            $stmt->bindValue(':end_date',   $dates[1], PDO::PARAM_STR);
        } elseif (count($dates) === 1) {
            $stmt->bindValue(':exact_date', $dates[0], PDO::PARAM_STR);
        }
    }
    if ($filterTheme !== '') {
        $stmt->bindValue(':theme', $filterTheme, PDO::PARAM_STR);
    }

    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    die($lang_data['error_fetching_documents'] ?? "Erreur : " . htmlspecialchars($e->getMessage()));
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> <!-- Responsive -->
    <title><?= htmlspecialchars($lang_data['my_documents_title'] ?? 'Mes Documents') ?></title>

    <!-- Flatpickr CSS -->
    <link href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <?php if ($showCurriculumModal): ?>
    <!-- Si le curriculum est manquant : forcer l'affichage du modal -->
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
    // Variable globale en JS pour savoir si "school" ou "academic" dans le curriculum
    const studentTypeInDb = "<?= $studentTypeInDb ?>";
    </script>

</head>
<body class="list-container">
<div class="container py-5">
    <h1 class="mb-4 text-center"><?= htmlspecialchars($lang_data['my_documents_title'] ?? 'Mes Documents') ?></h1>

    <!-- MESSAGES SUCCÈS / ERREUR -->
    <?php if (!empty($uploadSuccess)): ?>
        <div class="alert alert-success text-center">
            <?= htmlspecialchars($uploadSuccess) ?>
        </div>
    <?php elseif (!empty($uploadError)): ?>
        <div class="alert alert-danger text-center">
            <?= htmlspecialchars($uploadError) ?>
        </div>
    <?php endif; ?>

    <?php if ($updateSuccess): ?>
        <div class="alert alert-success text-center">
            <?= htmlspecialchars($lang_data['update_success'] ?? 'Le document a bien été mis à jour.') ?>
        </div>
    <?php endif; ?>

    <!-- Formulaire d'upload -->
    <div class="upload-card mb-4">
        <div class="card bg-light text-center p-4 border-0">
            <form method="POST" action="extractContent.php" enctype="multipart/form-data" class="upload-form">
                <?= csrf_field() ?>
                <div class="upload-dropzone" id="uploadDropzone">
                    <i class="fas fa-cloud-upload-alt fa-3x upload-icon mb-3"></i>
                    <p class="mb-2">
                        <?= htmlspecialchars($lang_data['upload_file'] ?? 'Déposer un Fichier') ?>
                    </p>

                    <!-- MISE À JOUR : on autorise davantage de formats -->
                    <label for="document" class="btn btn-primary btn-sm">
                        <i class="fas fa-folder-open"></i> 
                        <?= htmlspecialchars($lang_data['choose_file'] ?? 'Choisir un Fichier') ?>
                    </label>
                    <input 
                        type="file" 
                        id="document" 
                        name="document" 
                        accept=".docx,.pdf,.jpeg,.jpg,.png,.xls,.xlsx,.ppt,.pptx" 
                        required 
                        style="display: none;"
                    >
                </div>
                <button type="submit" class="btn btn-success btn-block upload-button d-none" id="uploadButton">
                    <i class="fas fa-upload"></i> 
                    <?= htmlspecialchars($lang_data['upload_document_button'] ?? 'Uploader') ?>
                </button>
            </form>
        </div>
    </div>

    <!-- Bouton Filtrer -->
    <div class="text-end mb-3">
        <button id="toggleFilters" class="btn btn-light">
            <i class="fas fa-filter"></i> 
            <?= htmlspecialchars($lang_data['filter'] ?? 'Filtrer') ?>
        </button>
    </div>

    <!-- Zone des filtres -->
    <div id="filtersContainer" class="card mb-4 p-3 hidden">
        <div class="card-body">
            <form method="GET" action="documentsList.php" class="row g-3 align-items-center filter-form">
                <!-- Filtre par nom de document -->
                <div class="col-md-4">
                    <input 
                        type="text" 
                        id="searchInput" 
                        name="search"
                        class="form-control" 
                        placeholder="<?= htmlspecialchars($lang_data['enter_document_name'] ?? 'Rechercher par nom de document...') ?>"
                        value="<?= htmlspecialchars($search) ?>"
                    >
                </div>
                <!-- Filtre par date -->
                <div class="col-md-4">
                    <input 
                        type="text" 
                        id="filterDate" 
                        name="filterDate"
                        class="form-control" 
                        placeholder="<?= htmlspecialchars($lang_data['select_date_or_period'] ?? 'Choisir une date ou une période') ?>"
                        value="<?= htmlspecialchars($filterDate) ?>"
                        readonly
                    >
                </div>
                <!-- Filtre par thème -->
                <div class="col-md-4">
                    <select name="theme" id="filterTheme" class="form-control">
                        <option value="">
                            <?= htmlspecialchars($lang_data['all_themes'] ?? 'Tous les Thèmes') ?>
                        </option>
                        <?php foreach ($themes as $theme): ?>
                            <option 
                                value="<?= htmlspecialchars($theme) ?>" 
                                <?= ($theme === $filterTheme) ? 'selected' : '' ?>
                            >
                                <?= htmlspecialchars($theme) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <!-- Bouton Appliquer et Réinitialiser -->
                <div class="col-md-12 text-end mt-3">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-search"></i> 
                        <?= htmlspecialchars($lang_data['apply_filters'] ?? 'Appliquer') ?>
                    </button>
                    <button 
                        type="button" 
                        id="resetFilters" 
                        class="btn btn-outline-secondary <?= ($search || $filterDate || ($filterTheme !== '')) ? '' : 'hidden' ?>"
                    >
                        <i class="fas fa-redo"></i> 
                        <?= htmlspecialchars($lang_data['reset_filters'] ?? 'Réinitialiser') ?>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Liste des documents -->
    <?php if (count($documents) === 0): ?>
        <div class="alert alert-info text-center">
            <?= htmlspecialchars($lang_data['no_documents'] ?? 'Aucun document trouvé.') ?>
        </div>
    <?php else: ?>
        <div id="documentsContainer" class="row g-4">
            <?php foreach ($documents as $doc): ?>
                <?php
                    // Déterminer l'icône en fonction de l'extension
                    $extension = strtolower(pathinfo($doc['filename'], PATHINFO_EXTENSION));
                    switch ($extension) {
                        case 'pdf':
                            $iconClass = 'fa-file-pdf';
                            break;
                        case 'doc':
                        case 'docx':
                            $iconClass = 'fa-file-word';
                            break;
                        case 'xls':
                        case 'xlsx':
                            $iconClass = 'fa-file-excel';
                            break;
                        case 'ppt':
                        case 'pptx':
                            $iconClass = 'fa-file-powerpoint';
                            break;
                        case 'jpg':
                        case 'jpeg':
                        case 'png':
                            $iconClass = 'fa-file-image';
                            break;
                        default:
                            $iconClass = 'fa-file';
                            break;
                    }
                ?>
                <div class="col-lg-4 col-md-6 document-card"
                     data-name="<?= htmlspecialchars(strtolower($doc['filename'] ?? '')) ?>"
                     data-date="<?= htmlspecialchars(date('Y-m-d', strtotime($doc['created_time']))) ?>"
                     data-theme="<?= htmlspecialchars($doc['theme'] ?? '') ?>"
                >
                    <div class="card shadow-sm h-100">
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex align-items-center">
                                <!-- Lien pour télécharger / afficher le document -->
                                <a href="<?= htmlspecialchars($doc['path']) ?>" target="_blank"
                                   class="download-link d-flex align-items-center text-decoration-none flex-grow-1"
                                   data-bs-toggle="tooltip"
                                   title="<?= htmlspecialchars($doc['filename'] ?? 'Document non trouvé') ?>"
                                   style="transition: background-color 0.2s; cursor: pointer; min-width: 0;"
                                >
                                    <i class="fas <?= $iconClass ?> me-3" style="font-size: 1.5rem;"></i>
                                    <span class="fw-bold text-truncate" style="flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                                        <?= htmlspecialchars($doc['filename'] ?? 'Document non trouvé') ?>
                                    </span>
                                    <i class="fas fa-download ms-2" style="font-size: 1.25rem;"></i>
                                </a>
                                <!-- Bouton Éditer -->
                                <button type="button" class="btn btn-link p-0 ms-2"
                                        data-bs-toggle="modal"
                                        data-bs-target="#editModal-<?= $doc['id'] ?>"
                                        aria-label="<?= htmlspecialchars($lang_data['edit'] ?? 'Éditer') ?>"
                                        title="<?= htmlspecialchars($lang_data['edit'] ?? 'Éditer') ?>">
                                    <i class="fas fa-edit" style="font-size: 1.25rem;color:#0097b2;"></i>
                                </button>
                                <!-- Bouton Supprimer -->
                                <form method="POST" action="deleteDocument.php" class="d-inline ms-2"
                                      onsubmit="return confirm('<?= htmlspecialchars($lang_data['delete_confirmation'] ?? 'Êtes-vous sûr de vouloir supprimer ce document ?') ?>');">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="document_id" value="<?= htmlspecialchars($doc['id']) ?>">
                                    <button type="submit" class="btn btn-link p-0"
                                            aria-label="<?= htmlspecialchars($lang_data['delete'] ?? 'Supprimer') ?>"
                                            title="<?= htmlspecialchars($lang_data['delete'] ?? 'Supprimer') ?>">
                                        <i class="fas fa-trash" style="font-size: 1.25rem;color:#0097b2;"></i>
                                    </button>
                                </form>
                            </div>
                            <!-- Date de création -->
                            <p class="text-muted mb-2">
                                <i class="far fa-calendar-alt"></i>
                                <?= htmlspecialchars(date('d/m/Y H:i', strtotime($doc['created_time']))) ?>
                            </p>

                            <!-- Thème du document -->
                            <?php if (!empty($doc['theme'])): ?>
                                <p class="mb-2">
                                    <strong><?= htmlspecialchars($lang_data['theme'] ?? 'Thème') ?> :</strong>
                                    <?= htmlspecialchars($doc['theme']) ?>
                                </p>
                            <?php else: ?>
                                <p class="mb-2 text-muted">
                                    <em><?= htmlspecialchars($lang_data['no_theme_defined'] ?? 'Pas de thème défini') ?></em>
                                </p>
                            <?php endif; ?>

                            <!-- Boutons Générer / Voir : QCM, Résumé, Paires, Flash, Miss -->
                            <div class="mt-auto">
                                <!-- 1ère ligne : QCM et Résumé -->
                                <div class="d-flex justify-content-between w-100 mb-2">
                                    <div class="flex-fill me-1">
                                        <?php if ($doc['has_qcm'] > 0): ?>
                                            <a href="questionForm.php?document_id=<?= urlencode($doc['id']) ?>"
                                               class="btn btn-primary btn-sm w-100"
                                            >
                                                <i class="fas fa-eye"></i>
                                                <?= htmlspecialchars($lang_data['view_qcm'] ?? 'Voir QCM') ?>
                                            </a>
                                        <?php else: ?>
                                            <button type="button"
                                                    class="btn btn-outline-primary btn-sm generate-qcm-btn w-100"
                                                    data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                                    data-language="<?= htmlspecialchars($doc['language']) ?>"
                                                    data-theme="<?= htmlspecialchars($doc['theme'] ?? '') ?>"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#generateQCMModal"
                                            >
                                                <i class="fas fa-plus"></i>
                                                <?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?>
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                    <div class="flex-fill ms-1">
                                        <?php if ($doc['has_summary'] > 0): ?>
                                            <a href="viewSummary.php?document_id=<?= urlencode($doc['id']) ?>"
                                               class="btn btn-primary btn-sm w-100"
                                            >
                                                <i class="fas fa-eye"></i>
                                                <?= htmlspecialchars($lang_data['view_summary'] ?? 'Voir Résumé') ?>
                                            </a>
                                        <?php else: ?>
                                            <button type="button"
                                                    class="btn btn-outline-primary btn-sm generate-summary-btn w-100"
                                                    data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                                    data-language="<?= htmlspecialchars($doc['language']) ?>"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#generateSummaryModal"
                                            >
                                                <i class="fas fa-plus"></i>
                                                <?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?>
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                </div>
                                <!-- 2e ligne : Paires, Flash, Miss -->
                                <div class="d-flex justify-content-between w-100">
                                    <div class="flex-fill me-1">
                                        <?php if ($doc['has_pair'] > 0): ?>
                                            <a href="viewPair.php?document_id=<?= urlencode($doc['id']) ?>"
                                               class="btn btn-secondary btn-sm w-100"
                                            >
                                                <i class="fas fa-eye"></i>
                                                <?= htmlspecialchars($lang_data['view_pairs'] ?? 'Voir Paires') ?>
                                            </a>
                                        <?php else: ?>
                                            <button type="button"
                                                    class="btn btn-outline-secondary btn-sm generate-pair-btn w-100"
                                                    data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                                    data-language="<?= htmlspecialchars($doc['language'] ?? 'fr') ?>"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#generatePairModal"
                                            >
                                                <i class="fas fa-plus"></i>
                                                <?= htmlspecialchars($lang_data['generate_pair'] ?? 'Générer Paires') ?>
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                    <div class="flex-fill mx-1">
                                        <?php if ($doc['has_flash'] > 0): ?>
                                            <a href="viewFlash.php?document_id=<?= urlencode($doc['id']) ?>"
                                               class="btn btn-secondary btn-sm w-100"
                                            >
                                                <i class="fas fa-eye"></i>
                                                <?= htmlspecialchars($lang_data['view_flash'] ?? 'Voir Flash') ?>
                                            </a>
                                        <?php else: ?>
                                            <button type="button"
                                                    class="btn btn-outline-secondary btn-sm generate-flash-btn w-100"
                                                    data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                                    data-language="<?= htmlspecialchars($doc['language'] ?? 'fr') ?>"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#generateFlashModal"
                                            >
                                                <i class="fas fa-plus"></i>
                                                <?= htmlspecialchars($lang_data['generate_flash'] ?? 'Générer Flash') ?>
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                    <div class="flex-fill ms-1">
                                        <?php if ($doc['has_miss'] > 0): ?>
                                            <a href="viewMiss.php?document_id=<?= urlencode($doc['id']) ?>"
                                               class="btn btn-secondary btn-sm w-100"
                                            >
                                                <i class="fas fa-eye"></i>
                                                <?= htmlspecialchars($lang_data['view_miss'] ?? 'Voir Miss') ?>
                                            </a>
                                        <?php else: ?>
                                            <button type="button"
                                                    class="btn btn-outline-secondary btn-sm generate-miss-btn w-100"
                                                    data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                                    data-language="<?= htmlspecialchars($doc['language'] ?? 'fr') ?>"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#generateMissModal"
                                            >
                                                <i class="fas fa-plus"></i>
                                                <?= htmlspecialchars($lang_data['generate_miss'] ?? 'Générer Miss') ?>
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        </div> <!-- /.card-body -->
                    </div> <!-- /.card -->
                </div> <!-- /.col -->

                <!-- Modal d'édition pour ce document -->
                <div class="modal fade" 
                     id="editModal-<?= $doc['id'] ?>" 
                     tabindex="-1" 
                     aria-labelledby="editModalLabel-<?= $doc['id'] ?>" 
                     aria-hidden="true"
                >
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <form method="POST" action="updateDocument.php">
                                <?= csrf_field() ?>
                                <div class="modal-header">
                                    <h5 class="modal-title" id="editModalLabel-<?= $doc['id'] ?>">
                                        <?= htmlspecialchars($lang_data['edit_document'] ?? 'Éditer le Document') ?>
                                    </h5>
                                    <button 
                                        type="button" 
                                        class="btn-close" 
                                        data-bs-dismiss="modal" 
                                        aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"
                                    ></button>
                                </div>
                                <div class="modal-body">
                                    <input 
                                        type="hidden" 
                                        name="document_id" 
                                        value="<?= htmlspecialchars($doc['id']) ?>"
                                    >
                                    <div class="mb-3">
                                        <label for="filename-<?= $doc['id'] ?>" class="form-label">
                                            <?= htmlspecialchars($lang_data['document_name'] ?? 'Nom du Document') ?>
                                        </label>
                                        <input 
                                            type="text" 
                                            id="filename-<?= $doc['id'] ?>" 
                                            name="filename" 
                                            class="form-control"
                                            value="<?= htmlspecialchars($doc['filename']) ?>"
                                            required
                                        >
                                    </div>
                                    <div class="mb-3">
                                        <label for="theme-<?= $doc['id'] ?>" class="form-label">
                                            <?= htmlspecialchars($lang_data['theme'] ?? 'Thème') ?>
                                        </label>
                                        <input 
                                            type="text" 
                                            id="theme-<?= $doc['id'] ?>" 
                                            name="theme" 
                                            class="form-control"
                                            value="<?= htmlspecialchars($doc['theme'] ?? '') ?>"
                                        >
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button 
                                        type="button" 
                                        class="btn btn-secondary" 
                                        data-bs-dismiss="modal"
                                    >
                                        <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        <?= htmlspecialchars($lang_data['save_changes'] ?? 'Enregistrer les Modifications') ?>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                <!-- Fin du Modal d'Édition -->
            <?php endforeach; ?>
        </div> <!-- /.row -->
    <?php endif; ?>

    <!-- PAGINATION -->
    <?php if ($totalPages > 1): ?>
        <nav aria-label="Page navigation" class="mt-5">
            <ul class="pagination justify-content-center">
                <!-- Précédent -->
                <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                    <a class="page-link" 
                       href="?page=<?= max(1, $page - 1) ?>
<?= $search ? '&search=' . urlencode($search) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $filterTheme !== '' ? '&theme=' . urlencode($filterTheme) : '' ?>" 
                       aria-label="<?= htmlspecialchars($lang_data['pagination_previous'] ?? 'Précédent') ?>"
                    >
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>

                <!-- Numéros de pages -->
                <?php
                $maxDisplay = 5;
                $start = max(1, $page - floor($maxDisplay / 2));
                $end = min($totalPages, $start + $maxDisplay - 1);

                if ($end - $start + 1 < $maxDisplay) {
                    $start = max(1, $end - $maxDisplay + 1);
                }

                for ($p = $start; $p <= $end; $p++): ?>
                    <li class="page-item <?= ($p == $page) ? 'active' : '' ?>">
                        <a class="page-link" 
                           href="?page=<?= $p ?>
<?= $search ? '&search=' . urlencode($search) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $filterTheme !== '' ? '&theme=' . urlencode($filterTheme) : '' ?>"
                        >
                            <?= $p ?>
                        </a>
                    </li>
                <?php endfor; ?>

                <!-- Suivant -->
                <li class="page-item <?= ($page >= $totalPages) ? 'disabled' : '' ?>">
                    <a class="page-link" 
                       href="?page=<?= min($totalPages, $page + 1) ?>
<?= $search ? '&search=' . urlencode($search) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $filterTheme !== '' ? '&theme=' . urlencode($filterTheme) : '' ?>"
                       aria-label="<?= htmlspecialchars($lang_data['pagination_next'] ?? 'Suivant') ?>"
                    >
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        </nav>
    <?php endif; ?>
</div>

<!-- ============== MODAL CURRICULUM OBLIGATOIRE ============== -->
<?php if ($showCurriculumModal): ?>
<div class="modal fade" id="curriculumModal" style="display:block;background:rgba(0,0,0,0.5);" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <form action="updateStudentCurriculum.php" method="POST" class="modal-content" id="curriculumForm">
    <?= csrf_field() ?>
    <input type="hidden" name="from_page" value="documentsList">
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
<!-- ============== FIN MODAL CURRICULUM OBLIGATOIRE ============== -->

<!-- MODAUX : Générer QCM, Résumé, Paires, Flash, Miss (identiques à votre code) -->

<!-- Modal pour Générer QCM -->
<div class="modal fade" 
     id="generateQCMModal" 
     tabindex="-1" 
     aria-labelledby="generateQCMModalLabel" 
     aria-hidden="true"
>
    <div class="modal-dialog">
        <form method="POST" action="generateQuizAPI.php" id="generateQCMForm">
            <?= csrf_field() ?>
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="generateQCMModalLabel">
                        <?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?>
                    </h5>
                    <button 
                        type="button" 
                        class="btn-close" 
                        data-bs-dismiss="modal" 
                        aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"
                    ></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="document_id" id="modal_document_id" value="">
                    
                    <div class="mb-3">
                        <label for="modal_theme" class="form-label">
                            <?= htmlspecialchars($lang_data['theme'] ?? 'Thème') ?>
                        </label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="modal_theme" 
                            name="theme" 
                            required
                        >
                    </div>
                    
                    <div class="mb-3">
                        <label for="modal_subject" class="form-label">
                            <?= htmlspecialchars($lang_data['subject'] ?? 'Sujet Principal') ?>
                        </label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="modal_subject" 
                            name="subject" 
                            required
                        >
                    </div>
                    
                    <div class="mb-3">
                        <label for="modal_quiz_language" class="form-label">
                            <?= htmlspecialchars($lang_data['quiz_language'] ?? 'Langue du QCM') ?>
                        </label>
                        <select 
                            class="form-control" 
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
                    </div>
                    
                    <div class="mb-3">
                        <label for="modal_quiz_level" class="form-label">
                            <?= htmlspecialchars($lang_data['quiz_level'] ?? 'Niveau du QCM') ?>
                        </label>
                        <select 
                            class="form-control" 
                            id="modal_quiz_level" 
                            name="quiz_level" 
                            required
                        >
                            <option value="facile">
                                <?= htmlspecialchars($lang_data['quiz_level_facile'] ?? 'Facile') ?>
                            </option>
                            <option value="moyen" selected>
                                <?= htmlspecialchars($lang_data['quiz_level_moyen'] ?? 'Moyen') ?>
                            </option>
                            <option value="difficile">
                                <?= htmlspecialchars($lang_data['quiz_level_difficile'] ?? 'Difficile') ?>
                            </option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label for="modal_quiz_number" class="form-label">
                            <?= htmlspecialchars($lang_data['quiz_number_of_questions'] ?? 'Nombre de Questions') ?>
                        </label>
                        <input 
                            type="number" 
                            class="form-control" 
                            id="modal_quiz_number" 
                            name="quiz_number_of_questions" 
                            min="1" 
                            max="50" 
                            value="5" 
                            required
                        >
                    </div>
                </div>
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

<!-- Modal pour Générer Résumé -->
<div class="modal fade" 
     id="generateSummaryModal" 
     tabindex="-1" 
     aria-labelledby="generateSummaryModalLabel" 
     aria-hidden="true"
>
    <div class="modal-dialog">
        <form method="POST" action="generateSummary.php" id="generateSummaryForm">
            <?= csrf_field() ?>
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="generateSummaryModalLabel">
                        <?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?>
                    </h5>
                    <button 
                        type="button" 
                        class="btn-close" 
                        data-bs-dismiss="modal" 
                        aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"
                    ></button>
                </div>
                <div class="modal-body">
                    <input 
                        type="hidden" 
                        name="document_id" 
                        id="modal_summary_document_id" 
                        value=""
                    >
                    
                    <div class="mb-3">
                        <label for="modal_summary_language" class="form-label">
                            <?= htmlspecialchars($lang_data['summary_language'] ?? 'Langue du Résumé') ?>
                        </label>
                        <select 
                            class="form-control" 
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
                    </div>
                </div>
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

<!-- Modal pour Générer Paires -->
<div class="modal fade"
     id="generatePairModal"
     tabindex="-1"
     aria-labelledby="generatePairModalLabel"
     aria-hidden="true"
>
    <div class="modal-dialog">
        <form method="POST" action="generatePairApi.php" id="generatePairForm">
            <?= csrf_field() ?>
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="generatePairModalLabel">
                        <?= htmlspecialchars($lang_data['generate_pair_modal_title'] ?? 'Générer Paires') ?>
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"
                    ></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="document_id" id="modal_pair_document_id" value="">

                    <div class="mb-3">
                        <label for="modal_pair_language" class="form-label">
                            <?= htmlspecialchars($lang_data['generate_pair_language'] ?? 'Langue pour les Paires') ?>
                        </label>
                        <select 
                            class="form-control" 
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
                    </div>
                    <p>
                        <?= htmlspecialchars($lang_data['generate_pair_confirm'] ?? 'Voulez-vous générer des paires ?') ?>
                    </p>
                </div>
                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-bs-dismiss="modal"
                    >
                        <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
                    </button>
                    <button type="submit" class="btn btn-info">
                        <?= htmlspecialchars($lang_data['generate_pair'] ?? 'Générer Paires') ?>
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Modal pour Générer Flash -->
<div class="modal fade"
     id="generateFlashModal"
     tabindex="-1"
     aria-labelledby="generateFlashModalLabel"
     aria-hidden="true"
>
    <div class="modal-dialog">
        <form method="POST" action="generateFlashApi.php" id="generateFlashForm">
            <?= csrf_field() ?>
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="generateFlashModalLabel">
                        <?= htmlspecialchars($lang_data['generate_flash_modal_title'] ?? 'Générer Flash') ?>
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"
                    ></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="document_id" id="modal_flash_document_id" value="">

                    <div class="mb-3">
                        <label for="modal_flash_language" class="form-label">
                            <?= htmlspecialchars($lang_data['generate_flash_language'] ?? 'Langue pour les Flash') ?>
                        </label>
                        <select 
                            class="form-control" 
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
                    </div>
                    <p>
                        <?= htmlspecialchars($lang_data['generate_flash_confirm'] ?? 'Voulez-vous générer des flashcards ?') ?>
                    </p>
                </div>
                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-bs-dismiss="modal"
                    >
                        <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
                    </button>
                    <button type="submit" class="btn btn-info">
                        <?= htmlspecialchars($lang_data['generate_flash'] ?? 'Générer Flash') ?>
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Modal pour Générer Miss -->
<div class="modal fade"
     id="generateMissModal"
     tabindex="-1"
     aria-labelledby="generateMissModalLabel"
     aria-hidden="true"
>
    <div class="modal-dialog">
        <form method="POST" action="generateMissApi.php" id="generateMissForm">
            <?= csrf_field() ?>
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="generateMissModalLabel">
                        <?= htmlspecialchars($lang_data['generate_miss_modal_title'] ?? 'Générer Miss') ?>
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="modal"
                        aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"
                    ></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="document_id" id="modal_miss_document_id" value="">

                    <div class="mb-3">
                        <label for="modal_miss_language" class="form-label">
                            <?= htmlspecialchars($lang_data['generate_miss_language'] ?? 'Langue pour les Miss') ?>
                        </label>
                        <select 
                            class="form-control" 
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
                    </div>
                    <p>
                        <?= htmlspecialchars($lang_data['generate_miss_confirm'] ?? 'Voulez-vous générer des exercices “Miss” ?') ?>
                    </p>
                </div>
                <div class="modal-footer">
                    <button
                        type="button"
                        class="btn btn-secondary"
                        data-bs-dismiss="modal"
                    >
                        <?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>
                    </button>
                    <button type="submit" class="btn btn-info">
                        <?= htmlspecialchars($lang_data['generate_miss'] ?? 'Générer Miss') ?>
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>


<!-- Flatpickr -->
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<!-- Font Awesome (JS) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>

<script>
    // 1) Tooltips Bootstrap
    document.addEventListener('DOMContentLoaded', function() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });

    // 2) Afficher/masquer zone de filtres
    document.addEventListener('DOMContentLoaded', function() {
        const toggleFilters = document.getElementById('toggleFilters');
        const filtersContainer = document.getElementById('filtersContainer');
        const resetFilters = document.getElementById('resetFilters');
        const searchInput = document.getElementById('searchInput');
        const filterDateInput = document.getElementById('filterDate');
        const filterThemeSelect = document.getElementById('filterTheme');
        const documentCards = document.querySelectorAll('.document-card');

        toggleFilters.addEventListener('click', () => {
            filtersContainer.classList.toggle('hidden');
            toggleFilters.classList.toggle('active');
        });

        // 3) Flatpickr en mode "range"
        flatpickr(filterDateInput, {
            mode: "range",
            dateFormat: "Y-m-d"
        });

        // 4) Bouton Réinitialiser
        resetFilters.addEventListener('click', () => {
            searchInput.value = '';
            filterDateInput._flatpickr.clear();
            filterThemeSelect.value = '';
            resetFilters.classList.add('hidden');
            window.location.href = 'documentsList.php';
        });
    });

    // 5) Drag & drop upload
    document.addEventListener('DOMContentLoaded', function() {
        const dropzone = document.getElementById('uploadDropzone');
        const fileInput = document.getElementById('document');
        const uploadButton = document.getElementById('uploadButton');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => {
                dropzone.classList.remove('dragover');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                dropzone.classList.remove('dragover');
                showUploadButton();
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                showUploadButton();
            }
        });

        function showUploadButton() {
            uploadButton.classList.remove('d-none');
            uploadButton.classList.add('visible');
        }
    });

    // 6) Scripts pour les modaux QCM / Résumé / Paires / Flash / Miss
    document.addEventListener('DOMContentLoaded', function() {
        // QCM
        const generateQCMButtons = document.querySelectorAll('.generate-qcm-btn');
        const modalQCMDocumentIdInput = document.getElementById('modal_document_id');
        const modalQCMThemeInput    = document.getElementById('modal_theme');
        const modalQCMSubjectInput  = document.getElementById('modal_subject');
        const modalQuizLanguageSelect = document.getElementById('modal_quiz_language');
        const modalQuizLevelSelect    = document.getElementById('modal_quiz_level');
        const modalQuizNumberInput    = document.getElementById('modal_quiz_number');

        generateQCMButtons.forEach(button => {
            button.addEventListener('click', function() {
                const documentId = this.getAttribute('data-document-id');
                const language   = this.getAttribute('data-language') || 'fr';
                const theme      = this.getAttribute('data-theme') || '';

                modalQCMDocumentIdInput.value = documentId;
                modalQuizLanguageSelect.value = language;
                modalQuizLevelSelect.value    = 'moyen';
                modalQuizNumberInput.value    = 5;
                modalQCMThemeInput.value      = theme;
                modalQCMSubjectInput.value    = '';
            });
        });

        // Résumé
        const generateSummaryButtons = document.querySelectorAll('.generate-summary-btn');
        const modalSummaryDocumentIdInput = document.getElementById('modal_summary_document_id');
        const modalSummaryLanguageSelect  = document.getElementById('modal_summary_language');

        generateSummaryButtons.forEach(button => {
            button.addEventListener('click', function() {
                const documentId = this.getAttribute('data-document-id');
                const language   = this.getAttribute('data-language') || 'fr';

                modalSummaryDocumentIdInput.value = documentId;
                modalSummaryLanguageSelect.value  = language;
            });
        });

        // Paires
        const generatePairButtons = document.querySelectorAll('.generate-pair-btn');
        const modalPairDocumentIdInput = document.getElementById('modal_pair_document_id');
        const modalPairLanguageSelect  = document.getElementById('modal_pair_language');

        generatePairButtons.forEach(button => {
            button.addEventListener('click', function() {
                const documentId = this.getAttribute('data-document-id');
                const docLang    = this.getAttribute('data-language') || 'fr';

                modalPairDocumentIdInput.value = documentId;
                modalPairLanguageSelect.value  = docLang;
            });
        });

        // Flash
        const generateFlashButtons = document.querySelectorAll('.generate-flash-btn');
        const modalFlashDocumentIdInput = document.getElementById('modal_flash_document_id');
        const modalFlashLanguageSelect  = document.getElementById('modal_flash_language');

        generateFlashButtons.forEach(button => {
            button.addEventListener('click', function() {
                const documentId = this.getAttribute('data-document-id');
                const docLang    = this.getAttribute('data-language') || 'fr';

                modalFlashDocumentIdInput.value = documentId;
                modalFlashLanguageSelect.value  = docLang;
            });
        });

        // Miss
        const generateMissButtons = document.querySelectorAll('.generate-miss-btn');
        const modalMissDocumentIdInput = document.getElementById('modal_miss_document_id');
        const modalMissLanguageSelect  = document.getElementById('modal_miss_language');

        generateMissButtons.forEach(button => {
            button.addEventListener('click', function() {
                const documentId = this.getAttribute('data-document-id');
                const docLang    = this.getAttribute('data-language') || 'fr';

                modalMissDocumentIdInput.value = documentId;
                modalMissLanguageSelect.value  = docLang;
            });
        });

        // Reset formulaires au hide
        const generateQCMModal = document.getElementById('generateQCMModal');
        if (generateQCMModal) {
            generateQCMModal.addEventListener('hidden.bs.modal', function () {
                const form = document.getElementById('generateQCMForm');
                if (form) {
                    form.reset();
                    modalQuizLanguageSelect.value = 'fr';
                    modalQuizLevelSelect.value    = 'moyen';
                    modalQuizNumberInput.value    = 5;
                    modalQCMThemeInput.value      = '';
                    modalQCMSubjectInput.value    = '';
                }
            });
        }
        const generateSummaryModal = document.getElementById('generateSummaryModal');
        if (generateSummaryModal) {
            generateSummaryModal.addEventListener('hidden.bs.modal', function () {
                const form = document.getElementById('generateSummaryForm');
                if (form) {
                    form.reset();
                    modalSummaryLanguageSelect.value = 'fr';
                }
            });
        }
        const generatePairModal = document.getElementById('generatePairModal');
        if (generatePairModal) {
            generatePairModal.addEventListener('hidden.bs.modal', function () {
                const form = document.getElementById('generatePairForm');
                if (form) {
                    form.reset();
                }
            });
        }
        const generateFlashModal = document.getElementById('generateFlashModal');
        if (generateFlashModal) {
            generateFlashModal.addEventListener('hidden.bs.modal', function () {
                const form = document.getElementById('generateFlashForm');
                if (form) {
                    form.reset();
                }
            });
        }
        const generateMissModal = document.getElementById('generateMissModal');
        if (generateMissModal) {
            generateMissModal.addEventListener('hidden.bs.modal', function () {
                const form = document.getElementById('generateMissForm');
                if (form) {
                    form.reset();
                }
            });
        }
    });

    // 7) Script pour le Curriculum Modal (School/Academic)
    document.addEventListener('DOMContentLoaded', function() {
        const stTypeSel = document.getElementById('student_type');
        const schoolFields   = document.getElementById('schoolFields');
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

        // // Si on sait déjà que l'étudiant est 'academic' => charger direct
        // if (studentTypeInDb === 'academic') {
        //     // Forcer l'affichage du bloc academic
        //     if (schoolFields)   schoolFields.classList.add('d-none');
        //     if (academicFields) academicFields.classList.remove('d-none');
        //     // Charger la liste
        //     fetch('getSubjects.php?type=academic')
        //         .then(r => r.json())
        //         .then(list => {
        //             for (let i = 1; i <= 3; i++) {
        //                 const cSel = document.getElementById('course_' + i);
        //                 if (!cSel) continue;
        //                 cSel.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_course_option"] ?? "-- Sélectionnez un cours --") ?></option>';
        //                 list.forEach(name => {
        //                     const opt = document.createElement('option');
        //                     opt.value = name;
        //                     opt.textContent = name;
        //                     cSel.appendChild(opt);
        //                 });
        //             }
        //         })
        //         .catch(console.error);
        // }

        // // De même pour 'school' => si c'est le cas
        // if (studentTypeInDb === 'school') {
        //     // Forcer l'affichage du bloc school
        //     if (schoolFields)   schoolFields.classList.remove('d-none');
        //     if (academicFields) academicFields.classList.add('d-none');
        //     // Charger la liste des classes
        //     const stCountrySel = document.getElementById('student_country');
        //     if (stCountrySel && stCountrySel.value) {
        //         fetch('getSchoolYear.php?country=' + stCountrySel.value)
        //             .then(r => r.json())
        //             .then(classes => {
        //                 const sclSel = document.getElementById('student_school_class');
        //                 if (!sclSel) return;
        //                 sclSel.innerHTML = '<option value=""><?= htmlspecialchars($lang_data["select_option"] ?? "-- Sélectionnez --") ?></option>';
        //                 classes.forEach(cl => {
        //                     const opt = document.createElement('option');
        //                     opt.value = cl;
        //                     opt.textContent = cl;
        //                     sclSel.appendChild(opt);
        //                 });
        //             })
        //             .catch(console.error);
        //     }
        // }

        // Changement de pays => recharger classes + diplômes
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
    });
</script>

</body>
</html>

<!-- Inclure le footer -->
<?php include 'includes/footer.php'; ?>
