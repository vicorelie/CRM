<?php
// documentsList.php

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

// Gestion des messages de succès/erreur suite à l'upload via extractContent.php
$uploadSuccess = '';
$uploadError   = '';
if (isset($_GET['uploadSuccess'])) {
    $uploadSuccess = $lang_data['upload_success'] ?? 'Upload réussi.';
}
if (isset($_GET['uploadError'])) {
    $uploadError = htmlspecialchars($_GET['uploadError']);
}

// Gestion des messages de succès après mise à jour
$updateSuccess = false;
if (isset($_GET['updateSuccess'])) {
    $updateSuccess = true;
}

// Définir le nombre de documents par page
$limit = 18;

// Récupérer le numéro de page depuis les paramètres GET, par défaut 1
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

// Récupérer les filtres s'ils existent
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$filterDate = isset($_GET['filterDate']) ? trim($_GET['filterDate']) : '';
$filterTheme = isset($_GET['theme']) ? trim($_GET['theme']) : '';

try {
    // Récupérer tous les thèmes distincts pour l'utilisateur
    $themeQuery = "SELECT DISTINCT theme FROM Documents WHERE uuid = :uuid AND theme IS NOT NULL AND theme != '' ORDER BY theme ASC";
    $stmtThemes = $pdo->prepare($themeQuery);
    $stmtThemes->execute([':uuid' => $_SESSION['user_uuid']]);
    $themes = $stmtThemes->fetchAll(PDO::FETCH_COLUMN);

    // Compter le nombre total de documents
    $countQuery = "
        SELECT COUNT(*) 
        FROM Documents 
        WHERE uuid = :uuid
    ";
    $params = [':uuid' => $_SESSION['user_uuid']];

    if ($search !== '') {
        $countQuery .= " AND LOWER(filename) LIKE :search";
        $params[':search'] = '%' . strtolower($search) . '%';
    }

    $dates = [];
    if ($filterDate !== '') {
        $dates = explode(' to ', $filterDate);
        if (count($dates) == 2) {
            $countQuery .= " AND DATE(created_time) BETWEEN :start_date AND :end_date";
            $params[':start_date'] = $dates[0];
            $params[':end_date'] = $dates[1];
        } elseif (count($dates) == 1) {
            $countQuery .= " AND DATE(created_time) = :exact_date";
            $params[':exact_date'] = $dates[0];
        }
    }

    if ($filterTheme !== '') {
        $countQuery .= " AND theme = :theme";
        $params[':theme'] = $filterTheme;
    }

    $stmtTotal = $pdo->prepare($countQuery);
    $stmtTotal->execute($params);
    $totalDocuments = $stmtTotal->fetchColumn();

    $totalPages = ceil($totalDocuments / $limit);

    // Récupérer les documents
    $query = "
        SELECT D.*, 
               (SELECT COUNT(*) FROM documentQuestions WHERE document_id = D.id) AS has_qcm,
               (SELECT COUNT(*) FROM documentResumes WHERE document_id = D.id) AS has_summary
        FROM Documents D
        WHERE D.uuid = :uuid
    ";

    if ($search !== '') {
        $query .= " AND LOWER(D.filename) LIKE :search";
    }
    if ($filterDate !== '') {
        if (count($dates) == 2) {
            $query .= " AND DATE(D.created_time) BETWEEN :start_date AND :end_date";
        } elseif (count($dates) == 1) {
            $query .= " AND DATE(D.created_time) = :exact_date";
        }
    }
    if ($filterTheme !== '') {
        $query .= " AND D.theme = :theme";
    }

    $query .= " ORDER BY D.created_time DESC LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':uuid', $_SESSION['user_uuid'], PDO::PARAM_STR);

    if ($search !== '') {
        $stmt->bindValue(':search', '%' . strtolower($search) . '%', PDO::PARAM_STR);
    }
    if ($filterDate !== '') {
        if (count($dates) == 2) {
            $stmt->bindValue(':start_date', $dates[0], PDO::PARAM_STR);
            $stmt->bindValue(':end_date',   $dates[1], PDO::PARAM_STR);
        } elseif (count($dates) == 1) {
            $stmt->bindValue(':exact_date', $dates[0], PDO::PARAM_STR);
        }
    }
    if ($filterTheme !== '') {
        $stmt->bindValue(':theme', $filterTheme, PDO::PARAM_STR);
    }

    $stmt->bindValue(':limit',  (int)$limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);

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
</head>
<body class="list-container">
<div class="container py-5">
    <h1 class="mb-4 text-center"><?= htmlspecialchars($lang_data['my_documents_title'] ?? 'Mes Documents') ?></h1>

    <!-- Formulaire d'upload -->
    <div class="upload-card mb-4">
        <div class="card bg-light text-center p-4 border-0">
            <form method="POST" action="extractContent.php" enctype="multipart/form-data" class="upload-form">
                <div class="upload-dropzone" id="uploadDropzone">
                    <i class="fas fa-cloud-upload-alt fa-3x upload-icon mb-3"></i>
                    <p class="mb-2">
                        <?= htmlspecialchars($lang_data['upload_file'] ?? 'Déposer un Fichier') ?>
                    </p>
                    <label for="document" class="btn btn-primary btn-sm">
                        <i class="fas fa-folder-open"></i> <?= htmlspecialchars($lang_data['choose_file'] ?? 'Choisir un Fichier') ?>
                    </label>
                    <input type="file" id="document" name="document" accept=".docx, .pdf, .jpeg, .jpg" required style="display: none;">
                </div>
                <button type="submit" class="btn btn-success btn-block upload-button d-none" id="uploadButton">
                    <i class="fas fa-upload"></i> <?= htmlspecialchars($lang_data['upload_document_button'] ?? 'Uploader') ?>
                </button>
            </form>
        </div>
    </div>

    <!-- Bouton Filtrer -->
    <div class="text-end mb-3">
        <button id="toggleFilters" class="btn btn-light">
            <i class="fas fa-filter"></i> <?= htmlspecialchars($lang_data['filter'] ?? 'Filtrer') ?>
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
                        <option value=""><?= htmlspecialchars($lang_data['all_themes'] ?? 'Tous les Thèmes') ?></option>
                        <?php foreach ($themes as $theme): ?>
                            <option value="<?= htmlspecialchars($theme) ?>" <?= ($theme === $filterTheme) ? 'selected' : '' ?>>
                                <?= htmlspecialchars($theme) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <!-- Bouton Appliquer et Réinitialiser -->
                <div class="col-md-12 text-end mt-3">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-search"></i> <?= htmlspecialchars($lang_data['apply_filters'] ?? 'Appliquer') ?>
                    </button>
                    <button type="button" id="resetFilters" class="btn btn-outline-secondary <?= ($search || $filterDate || ($filterTheme !== '')) ? '' : 'hidden' ?>">
                        <i class="fas fa-redo"></i> <?= htmlspecialchars($lang_data['reset_filters'] ?? 'Réinitialiser') ?>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Messages de succès/erreur -->
    <?php if (!empty($uploadSuccess)): ?>
        <div class="alert alert-success text-center"><?= htmlspecialchars($uploadSuccess) ?></div>
    <?php elseif (!empty($uploadError)): ?>
        <div class="alert alert-danger text-center"><?= htmlspecialchars($uploadError) ?></div>
    <?php endif; ?>

    <?php if ($updateSuccess): ?>
        <div class="alert alert-success text-center"><?= htmlspecialchars($lang_data['update_success'] ?? 'Le document a bien été mis à jour.') ?></div>
    <?php endif; ?>

    <!-- Document List -->
    <?php if (count($documents) === 0): ?>
        <div class="alert alert-info text-center"><?= htmlspecialchars($lang_data['no_documents'] ?? 'Aucun document trouvé.') ?></div>
    <?php else: ?>
        <div id="documentsContainer" class="row g-4">
            <?php foreach ($documents as $doc): ?>
                <div class="col-lg-4 col-md-6 document-card"
                     data-name="<?= htmlspecialchars(strtolower($doc['filename'] ?? '')) ?>"
                     data-date="<?= htmlspecialchars(date('Y-m-d', strtotime($doc['created_time']))) ?>"
                     data-theme="<?= htmlspecialchars($doc['theme'] ?? '') ?>">
                    <div class="card shadow-sm h-100">
                        <div class="card-body d-flex flex-column">

                            <!-- Nom du document -->
                            <h5 class="card-title text-truncate" 
                                data-bs-toggle="tooltip" 
                                title="<?= htmlspecialchars($doc['filename'] ?? 'Document non trouvé') ?>">
                                <?= htmlspecialchars($doc['filename'] ?? 'Document non trouvé') ?>
                            </h5>

                            <!-- Date de création -->
                            <p class="text-muted mb-2">
                                <i class="far fa-calendar-alt"></i>
                                <?= htmlspecialchars(date('d/m/Y H:i', strtotime($doc['created_time']))) ?>
                            </p>

                            <!-- Thème du document -->
                            <?php if (!empty($doc['theme'])): ?>
                                <p class="mb-2">
                                    <strong><?= htmlspecialchars($lang_data['theme'] ?? 'Thème') ?> :</strong> <?= htmlspecialchars($doc['theme']) ?>
                                </p>
                            <?php else: ?>
                                <p class="mb-2 text-muted">
                                    <em><?= htmlspecialchars($lang_data['no_theme_defined'] ?? 'Pas de thème défini') ?></em>
                                </p>
                            <?php endif; ?>

                            <!-- Boutons divers : QCM / Résumé / Éditer / Supprimer -->
                            <div class="mt-auto d-flex justify-content-between align-items-center">
                                <div class="d-flex flex-wrap gap-2">
                                    <?php if ($doc['has_qcm'] > 0): ?>
                                        <a href="questionForm.php?document_id=<?= urlencode($doc['id']) ?>" class="btn btn-primary btn-sm">
                                            <i class="fas fa-eye"></i> <?= htmlspecialchars($lang_data['view_qcm'] ?? 'Voir QCM') ?>
                                        </a>
                                    <?php else: ?>
                                        <!-- Bouton pour ouvrir le modal QCM (utilise generateQCMMixed.php sous le capot) -->
                                        <button 
                                            type="button" 
                                            class="btn btn-outline-primary btn-sm generate-qcm-btn" 
                                            data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                            data-language="<?= htmlspecialchars($doc['language']) ?>"
                                            data-bs-toggle="modal" 
                                            data-bs-target="#generateQCMModal"
                                        >
                                            <i class="fas fa-plus"></i> <?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?>
                                        </button>
                                    <?php endif; ?>

                                    <?php if ($doc['has_summary'] > 0): ?>
                                        <a href="viewSummary.php?document_id=<?= urlencode($doc['id']) ?>" class="btn btn-secondary btn-sm">
                                            <i class="fas fa-eye"></i> <?= htmlspecialchars($lang_data['view_summary'] ?? 'Voir Résumé') ?>
                                        </a>
                                    <?php else: ?>
                                        <!-- Bouton pour ouvrir le modal de génération de résumé -->
                                        <button 
                                            type="button" 
                                            class="btn btn-outline-secondary btn-sm generate-summary-btn" 
                                            data-document-id="<?= htmlspecialchars($doc['id']) ?>"
                                            data-language="<?= htmlspecialchars($doc['language']) ?>"
                                            data-bs-toggle="modal" 
                                            data-bs-target="#generateSummaryModal"
                                        >
                                            <i class="fas fa-plus"></i> <?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?>
                                        </button>
                                    <?php endif; ?>
                                </div>

                                <!-- Édition et Suppression -->
                                <div class="d-flex gap-2">
                                    <!-- Icône d'Édition -->
                                    <button type="button" class="btn btn-link p-0" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#editModal-<?= $doc['id'] ?>" 
                                            aria-label="<?= htmlspecialchars($lang_data['edit'] ?? 'Éditer') ?>"
                                            data-bs-toggle="tooltip" 
                                            data-bs-placement="top" 
                                            title="<?= htmlspecialchars($lang_data['edit'] ?? 'Éditer') ?>">
                                        <i class="fas fa-edit edit-icon"></i>
                                    </button>

                                    <!-- Suppression -->
                                    <form method="POST" action="deleteDocument.php" class="d-inline" 
                                        onsubmit="return confirm('<?= htmlspecialchars($lang_data['delete_confirmation'] ?? 'Êtes-vous sûr de vouloir supprimer ce document ?') ?>');">
                                        <input type="hidden" name="document_id" value="<?= htmlspecialchars($doc['id']) ?>">
                                        <button type="submit" class="form-button bg-transparent border-0 p-0" aria-label="<?= htmlspecialchars($lang_data['delete'] ?? 'Supprimer') ?>" data-bs-toggle="tooltip" data-bs-placement="top" title="<?= htmlspecialchars($lang_data['delete'] ?? 'Supprimer') ?>">
                                            <i class="fas fa-trash delete-icon"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div> <!-- /.card-body -->
                    </div> <!-- /.card -->
                </div> <!-- /.col -->

                <!-- Modal d'édition pour ce document -->
                <div class="modal fade" id="editModal-<?= $doc['id'] ?>" tabindex="-1" aria-labelledby="editModalLabel-<?= $doc['id'] ?>" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <form method="POST" action="updateDocument.php">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="editModalLabel-<?= $doc['id'] ?>">
                                        <?= htmlspecialchars($lang_data['edit_document'] ?? 'Éditer le Document') ?>
                                    </h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"></button>
                                </div>
                                <div class="modal-body">
                                    <input type="hidden" name="document_id" value="<?= htmlspecialchars($doc['id']) ?>">

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
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
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

    <!-- Modal pour Générer QCM (appelle generateQCMMixed.php) -->
    <div class="modal fade" id="generateQCMModal" tabindex="-1" aria-labelledby="generateQCMModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <form method="POST" action="generateQCMMixed.php" id="generateQCMForm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="generateQCMModalLabel"><?= htmlspecialchars($lang_data['generate_qcm'] ?? 'Générer QCM') ?></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" name="document_id" id="modal_document_id" value="">
                        
                        <div class="mb-3">
                            <label for="modal_theme" class="form-label"><?= htmlspecialchars($lang_data['theme'] ?? 'Thème') ?></label>
                            <input type="text" class="form-control" id="modal_theme" name="theme" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="modal_subject" class="form-label"><?= htmlspecialchars($lang_data['subject'] ?? 'Sujet Principal') ?></label>
                            <input type="text" class="form-control" id="modal_subject" name="subject" required>
                        </div>
                        
                        <div class="mb-3">
                            <label for="modal_quiz_language" class="form-label"><?= htmlspecialchars($lang_data['quiz_language'] ?? 'Langue du QCM') ?></label>
                            <select class="form-control" id="modal_quiz_language" name="quiz_language" required>
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
                            <label for="modal_quiz_level" class="form-label"><?= htmlspecialchars($lang_data['quiz_level'] ?? 'Niveau du QCM') ?></label>
                            <select class="form-control" id="modal_quiz_level" name="quiz_level" required>
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
                            <label for="modal_quiz_number" class="form-label"><?= htmlspecialchars($lang_data['quiz_number_of_questions'] ?? 'Nombre de Questions') ?></label>
                            <input type="number" class="form-control" id="modal_quiz_number" name="quiz_number_of_questions" min="1" max="50" value="5" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
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
    <div class="modal fade" id="generateSummaryModal" tabindex="-1" aria-labelledby="generateSummaryModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <form method="POST" action="generateSummary.php" id="generateSummaryForm">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="generateSummaryModalLabel"><?= htmlspecialchars($lang_data['generate_summary'] ?? 'Générer Résumé') ?></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= htmlspecialchars($lang_data['close'] ?? 'Fermer') ?>"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" name="document_id" id="modal_summary_document_id" value="">
                        
                        <div class="mb-3">
                            <label for="modal_summary_language" class="form-label"><?= htmlspecialchars($lang_data['summary_language'] ?? 'Langue du Résumé') ?></label>
                            <select class="form-control" id="modal_summary_language" name="summary_language" required>
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
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
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

    <!-- Pagination -->
    <?php if ($totalPages > 1): ?>
        <nav aria-label="Page navigation" class="mt-5">
            <ul class="pagination justify-content-center">
                <!-- Bouton Précédent -->
                <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                    <a class="page-link" 
                       href="?page=<?= max(1, $page - 1) ?><?= $search ? '&search=' . urlencode($search) : '' ?><?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?><?= $filterTheme !== '' ? '&theme=' . urlencode($filterTheme) : '' ?>" 
                       aria-label="<?= htmlspecialchars($lang_data['pagination_previous'] ?? 'Précédent') ?>">
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
                           href="?page=<?= $p ?><?= $search ? '&search=' . urlencode($search) : '' ?><?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?><?= $filterTheme !== '' ? '&theme=' . urlencode($filterTheme) : '' ?>">
                            <?= $p ?>
                        </a>
                    </li>
                <?php endfor; ?>

                <!-- Bouton Suivant -->
                <li class="page-item <?= ($page >= $totalPages) ? 'disabled' : '' ?>">
                    <a class="page-link" 
                       href="?page=<?= min($totalPages, $page + 1) ?><?= $search ? '&search=' . urlencode($search) : '' ?><?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?><?= $filterTheme !== '' ? '&theme=' . urlencode($filterTheme) : '' ?>" 
                       aria-label="<?= htmlspecialchars($lang_data['pagination_next'] ?? 'Suivant') ?>">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        </nav>
    <?php endif; ?>

    <!-- Bouton Retour -->
    <div class="text-center mt-4">
        <a href="index.php" class="btn btn-light">
            <i class="fas fa-arrow-left"></i> <?= htmlspecialchars($lang_data['back_to_documents'] ?? 'Retour aux Documents') ?>
        </a>
    </div>
</div>

<!-- Flatpickr -->
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<!-- Font Awesome (JS) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Initialiser les tooltips Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });

    document.addEventListener('DOMContentLoaded', function() {
        const toggleFilters = document.getElementById('toggleFilters');
        const filtersContainer = document.getElementById('filtersContainer');
        const resetFilters = document.getElementById('resetFilters');
        const searchInput = document.getElementById('searchInput');
        const filterDateInput = document.getElementById('filterDate');
        const filterThemeSelect = document.getElementById('filterTheme');
        const documentCards = document.querySelectorAll('.document-card');

        // Affiche/masque la zone de filtres
        toggleFilters.addEventListener('click', () => {
            filtersContainer.classList.toggle('hidden');
            toggleFilters.classList.toggle('active');
        });

        // Initialiser flatpickr en mode "range"
        flatpickr(filterDateInput, {
            mode: "range",
            dateFormat: "Y-m-d",
            onChange: applyFilters
        });

        // Débouncing
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilters, 300);
        });

        // Filtre par thème
        filterThemeSelect.addEventListener('change', applyFilters);

        // Bouton Réinitialiser
        resetFilters.addEventListener('click', () => {
            searchInput.value = '';
            filterDateInput._flatpickr.clear();
            filterThemeSelect.value = '';
            resetFilters.classList.add('hidden');
            applyFilters();
        });

        function applyFilters() {
            const searchValue = searchInput.value.toLowerCase();
            const dateRange = filterDateInput.value;
            const selectedTheme = filterThemeSelect.value;
            const [startDate, endDate] = dateRange.split(" to ");

            documentCards.forEach(card => {
                const name = card.getAttribute('data-name') || '';
                const date = card.getAttribute('data-date') || '';
                const theme = card.getAttribute('data-theme') || '';
                const matchesName = name.includes(searchValue);
                let matchesDate = true;
                let matchesTheme = true;

                if (startDate && endDate) {
                    matchesDate = (date >= startDate && date <= endDate);
                } else if (startDate) {
                    matchesDate = (date === startDate);
                }

                if (selectedTheme !== '') {
                    matchesTheme = (theme === selectedTheme);
                }

                // Condition finale
                card.style.display = (matchesName && matchesDate && matchesTheme) ? '' : 'none';
            });

            if (searchValue || dateRange || selectedTheme !== '') {
                resetFilters.classList.remove('hidden');
            } else {
                resetFilters.classList.add('hidden');
            }
        }
    });

    // Script drag & drop upload
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

    // Script pour QCM / Résumé => passage d'infos dans les modals
    document.addEventListener('DOMContentLoaded', function() {
        // QCM
        const generateQCMButtons = document.querySelectorAll('.generate-qcm-btn');
        const modalQCMDocumentIdInput = document.getElementById('modal_document_id');
        const modalQCMThemeInput = document.getElementById('modal_theme');
        const modalQCMSubjectInput = document.getElementById('modal_subject');
        const modalQuizLanguageSelect = document.getElementById('modal_quiz_language');
        const modalQuizLevelSelect = document.getElementById('modal_quiz_level');
        const modalQuizNumberInput = document.getElementById('modal_quiz_number');

        generateQCMButtons.forEach(button => {
            button.addEventListener('click', function() {
                const documentId = this.getAttribute('data-document-id');
                const language = this.getAttribute('data-language');

                modalQCMDocumentIdInput.value = documentId;
                // On pré-remplit la langue du QCM si on veut coller à la langue d’origine
                modalQuizLanguageSelect.value = language || 'fr';

                modalQuizLevelSelect.value = 'moyen';
                modalQuizNumberInput.value = 5;
                modalQCMThemeInput.value = '';
                modalQCMSubjectInput.value = '';
            });
        });

        // Résumé
        const generateSummaryButtons = document.querySelectorAll('.generate-summary-btn');
        const modalSummaryDocumentIdInput = document.getElementById('modal_summary_document_id');
        const modalSummaryLanguageSelect = document.getElementById('modal_summary_language');

        generateSummaryButtons.forEach(button => {
            button.addEventListener('click', function() {
                const documentId = this.getAttribute('data-document-id');
                const language = this.getAttribute('data-language');

                modalSummaryDocumentIdInput.value = documentId;
                modalSummaryLanguageSelect.value = language || 'fr';
            });
        });

        // Réinitialiser les formulaires lorsque les modals se ferment
        const generateQCMModal = document.getElementById('generateQCMModal');
        generateQCMModal.addEventListener('hidden.bs.modal', function () {
            const form = document.getElementById('generateQCMForm');
            if (form) {
                form.reset();
                // Valeurs par défaut
                modalQuizLanguageSelect.value = 'fr';
                modalQuizLevelSelect.value = 'moyen';
                modalQuizNumberInput.value = 5;
                modalQCMThemeInput.value = '';
                modalQCMSubjectInput.value = '';
            }
        });

        const generateSummaryModal = document.getElementById('generateSummaryModal');
        generateSummaryModal.addEventListener('hidden.bs.modal', function () {
            const form = document.getElementById('generateSummaryForm');
            if (form) {
                form.reset();
                modalSummaryLanguageSelect.value = 'fr';
            }
        });
    });

    // Vérifier si l'accès à la caméra est autorisé (si nécessaire dans votre logique)
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            // Autorisation accordée
        })
        .catch(error => {
            // Permission refusée ou autre erreur
            if (error.name === 'NotAllowedError') {
                alert(<?= json_encode($lang_data['camera_access_refused'], JSON_HEX_APOS | JSON_HEX_QUOT) ?>);
            } else {
                alert(<?= json_encode($lang_data['camera_access_error'], JSON_HEX_APOS | JSON_HEX_QUOT) ?> + error.message);
            }
        });
</script>
</body>
</html>

<!-- Inclure le footer -->
<?php include 'includes/footer.php'; ?>
