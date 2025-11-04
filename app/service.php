<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
session_start();
require 'config.php';
requireSubscription($pdo);
require_once 'vendor/autoload.php';
include 'includes/header.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Vérifier que le subject_id est passé en GET
if (!isset($_GET['subject_id'])) {
    die($lang_data['subject_not_provided'] ?? "Aucune matière spécifiée.");
}
$subject_id = (int)$_GET['subject_id'];

// Récupérer les informations du sujet depuis la table studySubjects
$stmt = $pdo->prepare("SELECT subject_name, subject_unit, subject_level, topic_name FROM studySubjects WHERE id = :id LIMIT 1");
$stmt->execute([':id' => $subject_id]);
$subject = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$subject) {
    die($lang_data['subject_not_found'] ?? "Matière introuvable.");
}

// Récupérer les informations de l'utilisateur depuis la table Users
$stmtUser = $pdo->prepare("SELECT study_country, student_status, student_year FROM Users WHERE uuid = :uuid LIMIT 1");
$stmtUser->execute([':uuid' => $_SESSION['user_uuid']]);
$user = $stmtUser->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    die($lang_data['user_not_found'] ?? "Utilisateur non trouvé.");
}

// Déterminer la langue par défaut en fonction du pays d'étude
$defaultLanguage = "fr";
if (strtolower($user['study_country']) === "israel" || strtolower($user['study_country']) === "ישראל") {
    $defaultLanguage = "he";
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['service_page_title'] ?? 'Services') ?></title>
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        /* Styles pour des cards modernes */
        .service-card {
            cursor: pointer;
            transition: transform 0.2s;
        }
        .service-card:hover {
            transform: scale(1.03);
        }
        .service-card img {
            height: 180px;
            object-fit: cover;
        }
    </style>
</head>
<body class="bg-light">
<div class="container py-4">
    <h1 class="mb-4 text-center"><?= htmlspecialchars($lang_data['service_page_title'] ?? 'Services') ?></h1>
    <div class="row g-4">
        <!-- Carte pour le service Quiz -->
        <div class="col-md-4">
            <div class="card service-card" data-service="quiz">
                <img src="images/quiz.png" class="card-img-top" alt="<?= htmlspecialchars($lang_data['service_quiz'] ?? 'Quiz') ?>">
                <div class="card-body">
                    <h5 class="card-title text-center"><?= htmlspecialchars($lang_data['service_quiz'] ?? 'Quiz') ?></h5>
                </div>
            </div>
        </div>
        <!-- Carte pour le service Résumé -->
        <div class="col-md-4">
            <div class="card service-card" data-service="summary">
                <img src="images/summary.png" class="card-img-top" alt="<?= htmlspecialchars($lang_data['service_summary'] ?? 'Résumé') ?>">
                <div class="card-body">
                    <h5 class="card-title text-center"><?= htmlspecialchars($lang_data['service_summary'] ?? 'Résumé') ?></h5>
                </div>
            </div>
        </div>
        <!-- Carte pour le service Flash -->
        <div class="col-md-4">
            <div class="card service-card" data-service="flash">
                <img src="images/flash.png" class="card-img-top" alt="<?= htmlspecialchars($lang_data['service_flash'] ?? 'Flash') ?>">
                <div class="card-body">
                    <h5 class="card-title text-center"><?= htmlspecialchars($lang_data['service_flash'] ?? 'Flash') ?></h5>
                </div>
            </div>
        </div>
        <!-- Carte pour le service Miss -->
        <div class="col-md-4">
            <div class="card service-card" data-service="miss">
                <img src="images/miss.png" class="card-img-top" alt="<?= htmlspecialchars($lang_data['service_miss'] ?? 'Miss') ?>">
                <div class="card-body">
                    <h5 class="card-title text-center"><?= htmlspecialchars($lang_data['service_miss'] ?? 'Miss') ?></h5>
                </div>
            </div>
        </div>
        <!-- Carte pour le service Pairs -->
        <div class="col-md-4">
            <div class="card service-card" data-service="pair">
                <img src="images/pair.png" class="card-img-top" alt="<?= htmlspecialchars($lang_data['service_pair'] ?? 'Pairs') ?>">
                <div class="card-body">
                    <h5 class="card-title text-center"><?= htmlspecialchars($lang_data['service_pair'] ?? 'Pairs') ?></h5>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal pour le formulaire de service -->
<div class="modal fade" id="serviceModal" tabindex="-1" aria-labelledby="serviceModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <form id="serviceForm" method="POST" action="">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="serviceModalLabel"><?= htmlspecialchars($lang_data['service_form_title'] ?? 'Détails du service') ?></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="<?= htmlspecialchars($lang_data['cancel_button'] ?? 'Annuler') ?>"></button>
        </div>
        <div class="modal-body">
          <!-- Sujet prérempli -->
          <div class="mb-3">
            <label for="service_subject" class="form-label"><?= htmlspecialchars($lang_data['label_subject'] ?? 'Sujet') ?></label>
            <input type="text" class="form-control" id="service_subject" name="subject" value="<?= htmlspecialchars($subject['subject_name']) ?>" readonly>
          </div>
          <!-- Champ pour saisir le sous-sujet -->
          <div class="mb-3">
            <label for="service_sub_subject" class="form-label"><?= htmlspecialchars($lang_data['label_sub_subject'] ?? 'Sous-sujet') ?></label>
            <input type="text" class="form-control" id="service_sub_subject" name="sub_subject" placeholder="<?= htmlspecialchars($lang_data['placeholder_sub_subject'] ?? 'Saisir le sous-sujet') ?>" required>
          </div>
          <!-- Sélection de la langue -->
          <div class="mb-3">
            <label for="service_language" class="form-label"><?= htmlspecialchars($lang_data['label_language'] ?? 'Langue') ?></label>
            <select class="form-select" id="service_language" name="service_language" required>
                <option value="en" <?= ($defaultLanguage == 'en') ? 'selected' : '' ?>><?= htmlspecialchars($lang_data['language_english'] ?? 'Anglais') ?></option>
                <option value="he" <?= ($defaultLanguage == 'he') ? 'selected' : '' ?>><?= htmlspecialchars($lang_data['language_hebrew'] ?? 'Hébreu') ?></option>
                <option value="fr" <?= ($defaultLanguage == 'fr') ? 'selected' : '' ?>><?= htmlspecialchars($lang_data['language_french'] ?? 'Français') ?></option>
                <option value="ru" <?= ($defaultLanguage == 'ru') ? 'selected' : '' ?>><?= htmlspecialchars($lang_data['language_russian'] ?? 'Russe') ?></option>
                <option value="ar" <?= ($defaultLanguage == 'ar') ? 'selected' : '' ?>><?= htmlspecialchars($lang_data['language_arabic'] ?? 'Arabe') ?></option>
            </select>
          </div>
          <!-- Informations cachées -->
          <input type="hidden" name="subject_id" value="<?= htmlspecialchars($subject_id) ?>">
          <input type="hidden" name="service_type" id="service_type" value="">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= htmlspecialchars($lang_data['cancel_button'] ?? 'Annuler') ?></button>
          <button type="submit" class="btn btn-primary"><?= htmlspecialchars($lang_data['submit_button'] ?? 'Valider') ?></button>
        </div>
      </div>
    </form>
  </div>
</div>

<!-- Inclusion de Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function(){
    // Quand l'utilisateur clique sur une carte de service
    document.querySelectorAll('.service-card').forEach(function(card){
        card.addEventListener('click', function(){
            let serviceType = card.getAttribute('data-service');
            // Définir l'action du formulaire en fonction du service choisi
            let form = document.getElementById('serviceForm');
            let actionUrl = '';
            switch(serviceType) {
                case 'quiz':
                    actionUrl = 'generateGeneralQuizAPl.php';
                    break;
                case 'summary':
                    actionUrl = 'generateGeneralSummary.php';
                    break;
                case 'flash':
                    actionUrl = 'generateGeneralFlashApi.php';
                    break;
                case 'miss':
                    actionUrl = 'generateGeneralMissApi.php';
                    break;
                case 'pair':
                    actionUrl = 'generateGeneralPairApi.php';
                    break;
                default:
                    actionUrl = 'generateGeneralQuizAPl.php';
            }
            form.action = actionUrl;
            document.getElementById('service_type').value = serviceType;
            // Ouvrir le modal
            var serviceModal = new bootstrap.Modal(document.getElementById('serviceModal'));
            serviceModal.show();
        });
    });
});
</script>
</body>
</html>
