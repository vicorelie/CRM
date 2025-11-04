<?php
// viewSummary.php

session_start(); // Démarrer la session
require 'config.php'; // Inclure le fichier de configuration de la base de données
// Inclure Parsedown depuis le dossier vendor
require_once __DIR__ . '/vendor/parsedown-master/Parsedown.php';

requireSubscription($pdo); // Vérifier l'abonnement de l'utilisateur

include 'includes/header.php';

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Vérifier si l'URL contient document_id ou subject_document_id
if (isset($_GET['document_id'])) {
    $id = $_GET['document_id'];
    // Requête pour document_id avec jointure sur Documents
    $stmt = $pdo->prepare("
        SELECT R.resume_content, D.filename 
        FROM documentResumes R 
        INNER JOIN Documents D ON R.document_id = D.id 
        WHERE R.document_id = :id AND R.uuid = :uuid
    ");
    $stmt->execute(['id' => $id, 'uuid' => $_SESSION['user_uuid']]);
} elseif (isset($_GET['subject_document_id'])) {
    $id = $_GET['subject_document_id'];
    // Requête pour subject_document_id (sans jointure sur Documents)
    $stmt = $pdo->prepare("
        SELECT resume_content 
        FROM documentResumes 
        WHERE subject_document_id = :id AND uuid = :uuid
    ");
    $stmt->execute(['id' => $id, 'uuid' => $_SESSION['user_uuid']]);
} else {
    die($lang_data['error_document_not_specified'] ?? 'Document not specified.');
}

$summary = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$summary) {
    die($lang_data['error_summary_not_found'] ?? 'Summary not found.');
}

// Déterminer l'URL de retour selon la provenance
if (isset($_SERVER['HTTP_REFERER']) && strpos($_SERVER['HTTP_REFERER'], 'studyList.php') !== false) {
    $backUrl = 'studyList.php';
} else {
    $backUrl = 'summaryList.php';
}

// Créer une instance de Parsedown
$parsedown = new Parsedown();
// Convertir le contenu Markdown en HTML
$formattedContent = $parsedown->text($summary['resume_content']);
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?>" dir="<?= in_array($_SESSION['lang'], ['he', 'ar']) ? 'rtl' : 'ltr' ?>">
<head>
    <meta charset="UTF-8">
    <!-- Adaptation pour mobile, tablette, desktop -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($lang_data['summary_page_title'] ?? 'Summary') ?></title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <style>
        /* Styles personnalisés pour un rendu moderne */

        .card-header {
            background-color: #0097b2;
        }
        .card-header h1 {
            margin: 0;
            font-size: 1.75rem;
        }
        .summary-content {
            white-space: normal; /* Laisser le HTML gérer l'espacement */
            line-height: 1.6;
        }
        /* Styles pour le contenu Markdown converti */
        .summary-content h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #0097b2;
        }
        .summary-content h2 {
            font-size: 1.5rem;
            margin-bottom: 0.8rem;
            color: #19d1f1;
        }
        .summary-content h3 {
            font-size: 1.2rem;
            margin-bottom: 0.8rem;
            color: #555;
        }
        .summary-content p {
            margin-bottom: 1rem;
            line-height: 1.6;
        }
    </style>
</head>
<body class="list-container">
<div class="container my-5">
    <!-- Rangée centrée -->
    <div class="row justify-content-center">
        <!-- Carte responsive -->
        <div class="col-12 col-md-10 col-lg-8">
            <div class="card shadow-sm">
                <div class="card-header text-white text-center">
                    <h1><?= htmlspecialchars($lang_data['summary_page_title'] ?? 'Summary') ?></h1>
                </div>
                <div class="card-body">
                    <div class="summary-content mb-4">
                        <?= $formattedContent ?>
                    </div>
                    <!-- Bouton de retour -->
                    <div class="text-center mt-4">
                        <a href="<?= htmlspecialchars($backUrl) ?>" class="btn btn-primary">
                            <i class="bi bi-arrow-left-circle me-2"></i>
                            <?= $lang_data['back_to_summaryList'] ?? 'Back to summary list' ?>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<?php include 'includes/footer.php'; ?>
</body>
</html>
