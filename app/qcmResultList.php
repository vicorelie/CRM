<?php
//qcmResultList.php

session_start();

// Inclure la config et les fonctions nécessaires
require 'config.php';

// Inclure le header
include 'includes/header.php';

requireSubscription($pdo);

require_once 'vendor/autoload.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}



// Gestion des variables de pagination et de filtrage
$limit = 18;
$page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$filterDate = isset($_GET['filterDate']) ? trim($_GET['filterDate']) : '';

// On prépare la requête de comptage
$countQuery = "
    SELECT COUNT(*) 
    FROM qcmSubmit qs
    INNER JOIN subjectDocuments d ON qs.subject_document_id = d.id
    WHERE d.uuid = :uuid
";

// Conditions dynamiques
$params = ['uuid' => $_SESSION['user_uuid']];
if ($search !== '') {
    $countQuery .= " AND LOWER(d.filename) LIKE :search";
    $params['search'] = '%' . strtolower($search) . '%';
}

$dates = [];
if ($filterDate !== '') {
    $dates = explode(' to ', $filterDate);
    if (count($dates) == 2) {
        $countQuery .= " AND DATE(qs.created_time) BETWEEN :start_date AND :end_date";
        $params['start_date'] = $dates[0];
        $params['end_date'] = $dates[1];
    } elseif (count($dates) == 1) {
        $countQuery .= " AND DATE(qs.created_time) = :exact_date";
        $params['exact_date'] = $dates[0];
    }
}

// Exécuter la requête de comptage
try {
    $stmtTotal = $pdo->prepare($countQuery);
    $stmtTotal->execute($params);
    $totalSubmissions = $stmtTotal->fetchColumn();
    $totalPages = ceil($totalSubmissions / $limit);

    // Requête pour récupérer les soumissions
    $query = "
        SELECT qs.id, qs.subject_document_id, d.filename, qs.created_time, qs.submitNote
        FROM qcmSubmit qs
        INNER JOIN subjectDocuments d ON qs.subject_document_id = d.id
        WHERE d.uuid = :uuid
    ";

    if ($search !== '') {
        $query .= " AND LOWER(d.filename) LIKE :search";
    }
    if ($filterDate !== '') {
        if (count($dates) == 2) {
            $query .= " AND DATE(qs.created_time) BETWEEN :start_date AND :end_date";
        } elseif (count($dates) == 1) {
            $query .= " AND DATE(qs.created_time) = :exact_date";
        }
    }

    $query .= " ORDER BY qs.created_time DESC LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':uuid', $_SESSION['user_uuid'], PDO::PARAM_STR);
    if ($search !== '') {
        $stmt->bindValue(':search', '%' . strtolower($search) . '%', PDO::PARAM_STR);
    }
    if ($filterDate !== '') {
        if (count($dates) == 2) {
            $stmt->bindValue(':start_date', $dates[0], PDO::PARAM_STR);
            $stmt->bindValue(':end_date', $dates[1], PDO::PARAM_STR);
        } elseif (count($dates) == 1) {
            $stmt->bindValue(':exact_date', $dates[0], PDO::PARAM_STR);
        }
    }
    $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
    $stmt->execute();

    $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $error = $lang_data['error_fetching_qcm'] . ' ' . htmlspecialchars($e->getMessage());
    $submissions = [];
    $totalPages = 0;
    $page = 1;
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($lang_data['qcm_list_title']) ?></title>

    <!-- Flatpickr -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

</head>
<body class="list-container">

<div class="container py-5">
    <h1 class="mb-4 text-center"><?= htmlspecialchars($lang_data['qcm_list_title']) ?></h1>

    <!-- Affichage des messages d'erreur ou de succès -->
    <?php if (!empty($error)): ?>
        <div class="alert alert-danger" role="alert">
            <?= htmlspecialchars($error) ?>
        </div>
    <?php endif; ?>

    <!-- Bouton Filtrer -->
    <div class="text-end mb-3">
        <button id="toggleFilters" class="btn btn-light">
            <i class="fas fa-filter"></i> <?= $lang_data['filter'] ?>
        </button>
    </div>

    <!-- Zone des filtres -->
    <div id="filtersContainer" class="card mb-4 p-3 hidden">
        <div class="card-body">
            <form method="GET" action="qcmResultList.php" class="row g-3 align-items-center filter-form">
                <div class="col-md-5">
                    <input 
                        type="text" 
                        id="searchInput" 
                        name="search"
                        class="form-control" 
                        placeholder="<?= $lang_data['enter_document_name'] ?? 'Rechercher par nom de document...' ?>"
                        value="<?= htmlspecialchars($search) ?>"
                    >
                </div>
                <div class="col-md-5">
                    <input 
                        type="text" 
                        id="filterDate" 
                        name="filterDate"
                        class="form-control" 
                        placeholder="<?= $lang_data['select_date_or_period'] ?? 'Choisir une date ou une période' ?>"
                        value="<?= htmlspecialchars($filterDate) ?>"
                        readonly
                    >
                </div>
                <div class="col-md-2 text-end">
                    <button type="submit" class="btn btn-primary w-100">
                        <i class="fas fa-search"></i> <?= $lang_data['apply_filters'] ?>
                    </button>
                </div>
            </form>
            <div class="text-end mt-3">
                <button id="resetFilters" class="btn btn-outline-secondary <?= ($search || $filterDate) ? '' : 'hidden' ?>">
                    <i class="fas fa-redo"></i> <?= $lang_data['reset_filters'] ?>
                </button>
            </div>
        </div>
    </div>

    <!-- Liste des soumissions de QCM -->
    <?php if (!empty($submissions)): ?>
        <div id="submissionContainer" class="row g-4">
            <?php foreach ($submissions as $submission): ?>
                <div 
                    class="col-lg-4 col-md-6 col-sm-12 submission-card" 
                    data-name="<?= htmlspecialchars(strtolower($submission['filename'])) ?>" 
                    data-date="<?= htmlspecialchars(date('Y-m-d', strtotime($submission['created_time']))) ?>"
                >
                    <div class="card h-100">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-truncate mb-2" data-bs-toggle="tooltip" title="<?= htmlspecialchars($submission['filename']) ?>">
                                <?= htmlspecialchars($submission['filename']) ?>
                            </h5>
                            <p class="text-muted mb-2" style="font-size:0.9rem;">
                                <i class="far fa-calendar-alt"></i> <?= htmlspecialchars(date('d/m/Y H:i', strtotime($submission['created_time']))) ?>
                            </p>
                            <p class="mb-4">
                                <strong><?= htmlspecialchars($lang_data['qcm_result_score']) ?>:</strong> 
                                <?= htmlspecialchars($submission['submitNote']) ?> / 10
                            </p>
                            <div class="mt-auto">
                                <a href="qcmResult.php?subject_document_id=<?= urlencode($submission['subject_document_id']) ?>&submit_id=<?= urlencode($submission['id']) ?>" class="btn btn-primary btn-sm w-100">
                                    <i class="fas fa-eye"></i> <?= $lang_data['qcm_action_view_details'] ?>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php else: ?>
        <div class="alert alert-warning text-center">
            <?= $lang_data['no_qcm_submissions_found'] ?>
        </div>
    <?php endif; ?>

    <!-- Pagination -->
    <?php if ($totalPages > 1): ?>
        <nav aria-label="Page navigation" class="mt-5">
            <ul class="pagination justify-content-center">
                <!-- Bouton Précédent -->
                <li class="page-item <?= ($page <= 1) ? 'disabled' : '' ?>">
                    <a class="page-link" 
                       href="?page=<?= max(1, $page - 1) ?>
                          <?= $search ? '&search=' . urlencode($search) : '' ?>
                          <?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>"
                       aria-label="<?= $lang_data['pagination_previous'] ?>"
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
                              <?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>"
                        >
                            <?= $p ?>
                        </a>
                    </li>
                <?php endfor; ?>

                <!-- Bouton Suivant -->
                <li class="page-item <?= ($page >= $totalPages) ? 'disabled' : '' ?>">
                    <a class="page-link" 
                       href="?page=<?= min($totalPages, $page + 1) ?>
                          <?= $search ? '&search=' . urlencode($search) : '' ?>
                          <?= $filterDate ? '&filterDate=' . urlencode($filterDate) : '' ?>"
                       aria-label="<?= $lang_data['pagination_next'] ?>"
                    >
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            </ul>
        </nav>
    <?php endif; ?>

    <!-- Bouton Retour -->
    <div class="text-center mt-4">
        <a href="studyList.php" class="btn btn-light">
            <i class="fas fa-arrow-left"></i> <?= $lang_data['back_to_documents'] ?>
        </a>
    </div>
</div>

<!-- Scripts JS -->
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const toggleFilters = document.getElementById('toggleFilters');
        const filtersContainer = document.getElementById('filtersContainer');
        const resetFilters = document.getElementById('resetFilters');
        const searchInput = document.getElementById('searchInput');
        const filterDateInput = document.getElementById('filterDate');
        const submissionCards = document.querySelectorAll('.submission-card');

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

        // Ecouter le changement de recherche
        searchInput.addEventListener('input', debounce(applyFilters, 300));

        // Réinitialiser les filtres
        resetFilters.addEventListener('click', () => {
            searchInput.value = '';
            filterDateInput._flatpickr.clear();
            resetFilters.classList.add('hidden');
            applyFilters();
        });

        // Applique les filtres en JS (pour un filtrage instantané côté client)
        function applyFilters() {
            const searchValue = searchInput.value.toLowerCase();
            const dateRange = filterDateInput.value;
            const [startDate, endDate] = dateRange.split(" to ");

            submissionCards.forEach(card => {
                const name = card.getAttribute('data-name');
                const date = card.getAttribute('data-date');
                const matchesName = name.includes(searchValue);
                let matchesDate = true;

                if (startDate && endDate) {
                    matchesDate = (date >= startDate && date <= endDate);
                } else if (startDate) {
                    matchesDate = (date === startDate);
                }

                // Afficher/Masquer la card selon les critères
                card.style.display = (matchesName && matchesDate) ? '' : 'none';
            });

            // Gérer le bouton "Réinitialiser"
            if (searchValue || dateRange) {
                resetFilters.classList.remove('hidden');
            } else {
                resetFilters.classList.add('hidden');
            }
        }

        // Fonction de "debounce" pour éviter un filtrage trop fréquent
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        // Initialiser les tooltips (Bootstrap 5)
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    });
</script>


</body>
</html>

<?php
// Footer
include 'includes/footer.php';
?>
