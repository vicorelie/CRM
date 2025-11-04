<?php
// flashList.php

session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --------------------------------------------------------------------------------
// 1) Inclus et vérifications initiales
// --------------------------------------------------------------------------------

require 'config.php'; 
requireSubscription($pdo);

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

$userUuid = $_SESSION['user_uuid'];

// Inclure éventuellement vos fichiers de langues ou de configuration
require_once 'vendor/autoload.php';
include 'includes/header.php'; // Contient Bootstrap/CSS/JS

// --------------------------------------------------------------------------------
// 2) Récupération de certaines infos si besoin (pour votre design)
// --------------------------------------------------------------------------------

// Exemple : on récupère le type d’étudiant pour afficher éventuellement les filtres "academic"
$stmtCur = $pdo->prepare("
    SELECT student_type
    FROM studentCurriculum
    WHERE uuid = :uuid
    LIMIT 1
");
$stmtCur->execute([':uuid' => $userUuid]);
$curriculum = $stmtCur->fetch(PDO::FETCH_ASSOC);

$studentTypeInDb = $curriculum['student_type'] ?? '';

// --------------------------------------------------------------------------------
// 3) Préparation des filtres (même design que pairsList/summaryList/quizList)
// --------------------------------------------------------------------------------

// Récupérer la liste des "matières"
$stmtDistinctSubjects = $pdo->prepare("
    SELECT DISTINCT subject_name 
    FROM studySubjects 
    WHERE uuid = :uuid 
      AND subject_name <> '' 
    ORDER BY subject_name ASC
");
$stmtDistinctSubjects->execute([':uuid' => $userUuid]);
$distinctSubjects = $stmtDistinctSubjects->fetchAll(PDO::FETCH_COLUMN);

// Récupérer la liste des topics
$stmtDistinctTopics = $pdo->prepare("
    SELECT DISTINCT topic
    FROM subjectDocuments
    WHERE uuid = :uuid
      AND topic <> ''
    ORDER BY topic ASC
");
$stmtDistinctTopics->execute([':uuid' => $userUuid]);
$distinctTopics = $stmtDistinctTopics->fetchAll(PDO::FETCH_COLUMN);

// Filtre Study, uniquement si studentTypeInDb = academic
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
}

// Récupérer les paramètres GET
$filterSubject = isset($_GET['filterSubject']) ? trim($_GET['filterSubject']) : '';
$topicFilter   = isset($_GET['topicFilter'])   ? trim($_GET['topicFilter'])   : '';
$filterDate    = isset($_GET['filterDate'])    ? trim($_GET['filterDate'])    : '';
$generalSearch = isset($_GET['generalSearch']) ? trim($_GET['generalSearch']) : '';
$filterStudy   = ($studentTypeInDb === 'academic')
    ? (isset($_GET['study']) ? trim($_GET['study']) : '')
    : '';

// --------------------------------------------------------------------------------
// 4) Pagination
// --------------------------------------------------------------------------------
$limit  = 18;
$page   = (isset($_GET['page']) && is_numeric($_GET['page'])) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

// --------------------------------------------------------------------------------
// 5) Construction de la requête principale pour lister les flashes
// --------------------------------------------------------------------------------
try {
    // 5.a) Requête de comptage
    $countQuery = "
        SELECT COUNT(DISTINCT df.id)
        FROM documentFlash df
        INNER JOIN subjectDocuments SD ON df.subject_document_id = SD.id
        LEFT JOIN studySubjects SS     ON SD.study_subjects_id   = SS.id
        WHERE df.uuid = :uuid
    ";
    $params = [':uuid' => $userUuid];

    // Ajout des filtres
    if ($filterSubject !== '') {
        $countQuery .= " AND LOWER(SS.subject_name) LIKE :filterSubject";
        $params[':filterSubject'] = '%' . strtolower($filterSubject) . '%';
    }
    if ($topicFilter !== '') {
        $countQuery .= " AND LOWER(SD.topic) LIKE :topicFilter";
        $params[':topicFilter'] = '%' . strtolower($topicFilter) . '%';
    }
    if ($filterDate !== '') {
        $dates = explode(' to ', $filterDate);
        if (count($dates) === 2) {
            $countQuery .= " AND DATE(df.created_time) BETWEEN :start_date AND :end_date";
            $params[':start_date'] = $dates[0];
            $params[':end_date']   = $dates[1];
        } elseif (count($dates) === 1) {
            $countQuery .= " AND DATE(df.created_time) = :exact_date";
            $params[':exact_date'] = $dates[0];
        }
    }
    if ($generalSearch !== '') {
        $countQuery .= " 
            AND (
                LOWER(SD.topic)          LIKE :generalSearch
                OR LOWER(SD.sub_topic)   LIKE :generalSearch
                OR LOWER(SS.subject_name)LIKE :generalSearch
            )
        ";
        $params[':generalSearch'] = '%' . strtolower($generalSearch) . '%';
    }
    if ($filterStudy !== '') {
        $countQuery .= " AND LOWER(SS.course_name) LIKE :filterStudy";
        $params[':filterStudy'] = '%' . strtolower($filterStudy) . '%';
    }

    $stmtTotal = $pdo->prepare($countQuery);
    $stmtTotal->execute($params);
    $totalFlashes = $stmtTotal->fetchColumn();
    $totalPages = ceil($totalFlashes / $limit);

    // 5.b) Requête principale
    // On regroupe par subject_document_id (même logique que pairsList/summaryList).
    $query = "
        SELECT 
            SD.id                AS subject_document_id,
            SD.topic             AS sd_topic,
            SD.sub_topic         AS sd_sub_topic,
            SS.subject_name      AS ss_subject_name,
            SS.subject_unit      AS ss_subject_unit,
            SS.course_name       AS ss_course_name,
            MIN(df.created_time) AS first_flash_date,
            COUNT(df.id)         AS nb_flashes,

            -- Joindre la table Documents si on veut l'icône/filename :
            Doc.filename         AS doc_filename,
            Doc.type             AS doc_type,
            Doc.path             AS doc_path,
            Doc.extract_content  AS doc_extract_content

        FROM documentFlash df
        INNER JOIN subjectDocuments SD ON df.subject_document_id = SD.id
        LEFT JOIN studySubjects SS ON SD.study_subjects_id = SS.id
        LEFT JOIN Documents Doc  ON SD.documents_id       = Doc.id
        WHERE df.uuid = :uuid
    ";

    // Ajout conditions
    if ($filterSubject !== '') {
        $query .= " AND LOWER(SS.subject_name) LIKE :filterSubject";
    }
    if ($topicFilter !== '') {
        $query .= " AND LOWER(SD.topic) LIKE :topicFilter";
    }
    if ($filterDate !== '') {
        if (count($dates) === 2) {
            $query .= " AND DATE(df.created_time) BETWEEN :start_date AND :end_date";
        } elseif (count($dates) === 1) {
            $query .= " AND DATE(df.created_time) = :exact_date";
        }
    }
    if ($generalSearch !== '') {
        $query .= " 
            AND (
                LOWER(SD.topic)        LIKE :generalSearch
                OR LOWER(SD.sub_topic) LIKE :generalSearch
                OR LOWER(SS.subject_name) LIKE :generalSearch
            )
        ";
    }
    if ($filterStudy !== '') {
        $query .= " AND LOWER(SS.course_name) LIKE :filterStudy";
    }

    $query .= "
        GROUP BY SD.id
        ORDER BY first_flash_date DESC
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':uuid', $userUuid, PDO::PARAM_STR);

    if ($filterSubject !== '') {
        $stmt->bindValue(':filterSubject', '%' . strtolower($filterSubject) . '%', PDO::PARAM_STR);
    }
    if ($topicFilter !== '') {
        $stmt->bindValue(':topicFilter', '%' . strtolower($topicFilter) . '%', PDO::PARAM_STR);
    }
    if (!empty($dates)) {
        if (count($dates) === 2) {
            $stmt->bindValue(':start_date', $dates[0], PDO::PARAM_STR);
            $stmt->bindValue(':end_date',   $dates[1], PDO::PARAM_STR);
        } elseif (count($dates) === 1) {
            $stmt->bindValue(':exact_date', $dates[0], PDO::PARAM_STR);
        }
    }
    if ($generalSearch !== '') {
        $stmt->bindValue(':generalSearch', '%' . strtolower($generalSearch) . '%', PDO::PARAM_STR);
    }
    if ($filterStudy !== '') {
        $stmt->bindValue(':filterStudy', '%' . strtolower($filterStudy) . '%', PDO::PARAM_STR);
    }

    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $flashList = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    die("Erreur SQL : " . htmlspecialchars($e->getMessage()));
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Liste de Flash</title>
    <!-- Flatpickr, FontAwesome, etc. -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* Reprenez ici les styles principaux de pairsList/summaryList/quizList pour assurer le même design */
        .hidden {
            display: none !important;
        }
        .card {
            transition: transform 0.3s ease;
            overflow: hidden;
        }
        .card:hover {
            transform: scale(1.02);
        }
        .text-truncate {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        /* etc. */
    </style>
</head>
<body>

<div class="container py-5">
    <!-- Titre de la page -->
    <h2 class="mb-4 text-center" style="font-size:36px;">
        <?= htmlspecialchars($lang_data['flash_list_title'] ?? 'Liste de Flash') ?>
    </h2>
    <!-- BOUTON FILTRER -->
    <div class="text-end mb-3">
        <button id="toggleFilters" class="btn btn-light">
            <i class="fas fa-filter"></i> <?= htmlspecialchars($lang_data['filter'] ?? 'Filtrer') ?>
        </button>
    </div>

    <!-- Zone de Filtres -->
    <div id="filtersContainer" class="card mb-4 p-3 hidden">
        <div class="card-body">
            <form method="GET" action="flashList.php" class="row g-3 align-items-center filter-form">
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
                    <input type="text" id="filterDate" name="filterDate" class="form-control" 
                           placeholder="<?= htmlspecialchars($lang_data['filter_date_placeholder'] ?? 'Choisir une date ou période') ?>" 
                           value="<?= htmlspecialchars($filterDate) ?>" readonly>
                </div>
                <div class="col-md-6">
                    <input type="text" id="generalSearch" name="generalSearch" class="form-control" 
                           placeholder="<?= htmlspecialchars($lang_data['search_placeholder'] ?? 'Recherche globale') ?>" 
                           value="<?= htmlspecialchars($generalSearch) ?>">
                </div>
                <div class="col-md-12 text-end mt-3">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-search"></i> <?= htmlspecialchars($lang_data['apply'] ?? 'Appliquer') ?>
                    </button>
                    <button type="button" id="resetFilters" 
                            class="btn btn-outline-secondary <?= ($filterSubject || $topicFilter || $filterDate || $generalSearch || $filterStudy) ? '' : 'hidden' ?>">
                        <i class="fas fa-redo"></i> <?= htmlspecialchars($lang_data['reset'] ?? 'Réinitialiser') ?>
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- LISTE DES FLASHES -->
    <?php if (empty($flashList)): ?>
        <div class="alert alert-info text-center">
        <?= htmlspecialchars($lang_data['no-flash-finded'] ?? 'No flash finded') ?>
        </div>
    <?php else: ?>
        <div class="row g-4">
            <?php 
            foreach ($flashList as $row):
                $sdId          = $row['subject_document_id'];
                $topic         = $row['sd_topic']      ?? 'Topic inconnu';
                $subTopic      = $row['sd_sub_topic']  ?? '';
                $subjectName   = $row['ss_subject_name'] ?? '';
                $unitOrCourse  = '';

                if (!empty($row['ss_subject_unit'])) {
                    $unitOrCourse = ' (' . htmlspecialchars($lang_data['subject_unit_label'] ?? 'Coefficient') . ' : ' . $row['ss_subject_unit'] . ')';
                } elseif (!empty($row['ss_course_name'])) {
                    $unitOrCourse = ' (' . $row['ss_course_name'] . ')';
                }

                $docFilename    = $row['doc_filename']       ?? '';
                $docType        = strtolower($row['doc_type'] ?? '');
                $docPath        = $row['doc_path']           ?? '';
                $extract        = $row['doc_extract_content'] ?? '';
                $firstFlashDate = $row['first_flash_date']    ?? null;

                // Déterminer l'icône
                switch ($docType) {
                    case 'pdf':    $iconClass = 'fa-file-pdf'; break;
                    case 'doc':
                    case 'docx':   $iconClass = 'fa-file-word'; break;
                    case 'xls':
                    case 'xlsx':   $iconClass = 'fa-file-excel'; break;
                    case 'ppt':
                    case 'pptx':   $iconClass = 'fa-file-powerpoint'; break;
                    case 'jpg':
                    case 'jpeg':
                    case 'png':    $iconClass = 'fa-file-image'; break;
                    default:       $iconClass = 'fa-file'; break;
                }
            ?>
            <div class="col-lg-4 col-md-6">
                <div class="card shadow-sm h-100">
                    <div class="card-body d-flex flex-column">
                        <!-- Titre (topic) -->
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="mb-0 text-truncate" title="<?= htmlspecialchars($topic) ?>">
                                <?= htmlspecialchars($topic) ?>
                            </h5>
                        </div>

                        <!-- Date + matière -->
                        <?php if ($firstFlashDate): ?>
                            <p class="text-muted mb-1">
                                <i class="far fa-calendar-alt"></i>
                                <?= htmlspecialchars(date('d/m/Y H:i', strtotime($firstFlashDate))) ?>
                            </p>
                        <?php endif; ?>
                        <?php if (!empty($subjectName)): ?>
                            <p class="mb-1">
                                <strong><?= htmlspecialchars($lang_data['subject_label'] ?? 'Matière') ?> :</strong> 
                                <?= htmlspecialchars($subjectName . $unitOrCourse) ?>
                            </p>
                        <?php endif; ?>
                        <?php if (!empty($subTopic)): ?>
                            <p class="small text-muted">
                                <?= htmlspecialchars($lang_data['sub_topic_label'] ?? 'Sous-topic') ?> : <?= htmlspecialchars($subTopic) ?>
                            </p>
                        <?php endif; ?>

                        <!-- Fichier associé, si existe -->
                        <?php if (!empty($docFilename)): ?>
                            <div class="d-flex align-items-center" style="max-width: 300px;">
                                <i class="fas <?= $iconClass ?> me-2" style="font-size:1rem;"></i>
                                <span class="text-truncate" style="max-width: 200px;" title="<?= htmlspecialchars($docFilename) ?>">
                                    <?= htmlspecialchars($docFilename) ?>
                                </span>
                                <?php if ($docPath): ?>
                                    <a href="<?= htmlspecialchars($docPath) ?>"
                                       download="<?= htmlspecialchars($docFilename) ?>"
                                       class="ms-2"
                                       style="text-decoration: none;">
                                        <i class="fas fa-download" style="font-size:1rem;"></i>
                                    </a>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>

                        <!-- Bouton d'action (voir flash) -->
                        <div class="mt-auto">
                            <div class="row mb-2">
                                <div class="col-12">
                                    <a href="viewFlash.php?subject_document_id=<?= urlencode($sdId) ?>"
                                       class="btn btn-primary btn-sm w-100 mb-2">
                                       <i class="fas fa-bolt"></i>
                                       <?= htmlspecialchars($lang_data['view_flash'] ?? 'Voir Flash') ?>
                                    </a>
                                </div>
                            </div>
                            <!-- Pas de second bouton ici, on n'a besoin que d'un bouton -->
                        </div>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- PAGINATION -->
        <?php if ($totalPages > 1): ?>
            <nav aria-label="Page navigation" class="mt-5">
                <ul class="pagination justify-content-center">
                    <!-- Précédent -->
                    <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                        <a class="page-link"
                           href="?page=<?= max(1, $page - 1) ?>
<?= $filterSubject ? '&filterSubject=' . urlencode($filterSubject) : '' ?>
<?= $topicFilter ? '&topicFilter=' . urlencode($topicFilter) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $generalSearch ? '&generalSearch=' . urlencode($generalSearch) : '' ?>
<?= $filterStudy ? '&study=' . urlencode($filterStudy) : '' ?>"
                           aria-label="Précédent">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>

                    <!-- Pages -->
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
<?= $filterStudy ? '&study=' . urlencode($filterStudy) : '' ?>"
                            >
                                <?= $p ?>
                            </a>
                        </li>
                    <?php endfor; ?>

                    <!-- Suivant -->
                    <li class="page-item <?= ($page >= $totalPages) ? 'disabled' : '' ?>">
                        <a class="page-link"
                           href="?page=<?= min($totalPages, $page + 1) ?>
<?= $filterSubject ? '&filterSubject=' . urlencode($filterSubject) : '' ?>
<?= $topicFilter ? '&topicFilter=' . urlencode($topicFilter) : '' ?>
<?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>
<?= $generalSearch ? '&generalSearch=' . urlencode($generalSearch) : '' ?>
<?= $filterStudy ? '&study=' . urlencode($filterStudy) : '' ?>"
                           aria-label="Suivant">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
        <?php endif; ?>
    <?php endif; ?>
</div> <!-- .container -->

<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    const toggleFiltersBtn = document.getElementById('toggleFilters');
    const filtersContainer = document.getElementById('filtersContainer');
    if (toggleFiltersBtn && filtersContainer) {
        toggleFiltersBtn.addEventListener('click', () => {
            filtersContainer.classList.toggle('hidden');
        });
    }

    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            window.location.href = 'flashList.php';
        });
    }

    // Flatpickr pour le champ date
    flatpickr('#filterDate', {
        mode: "range",
        dateFormat: "Y-m-d"
    });
});
</script>

</body>
</html>

<?php include 'includes/footer.php'; ?>
