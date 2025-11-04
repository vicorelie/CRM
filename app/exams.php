<?php
// exams.php

// -------------------- Configuration et Initialisation --------------------

/// Démarrer la session
session_start();

// Inclure les configurations et les fonctions nécessaires
require 'config.php';

// Assurez-vous que le fichier de langue est inclus dans config.php
// et que $lang_data est disponible

requireSubscription($pdo);
require_once 'vendor/autoload.php';

// Inclure le header (qui doit normalement inclure Bootstrap CSS/JS)
include 'includes/header.php';

// Désactiver l'affichage des erreurs en production
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// -------------------- Traitement du Formulaire d'Ajout d'Examen --------------------

// Initialiser les variables
$examName = '';
$examDate = '';
$examTime = '';
$reminderEnabled = false;
$reminderTimeBefore = 60; // par défaut 60 minutes

$errors = [];
$success = false;

// Vérifier si le formulaire a été soumis
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Vérifier le token CSRF (à implémenter si nécessaire)
    // ...

    // Récupérer les données du formulaire
    $examName = isset($_POST['exam_name']) ? trim($_POST['exam_name']) : '';
    $examDate = isset($_POST['exam_date']) ? trim($_POST['exam_date']) : '';
    $examTime = isset($_POST['exam_time']) ? trim($_POST['exam_time']) : '';
    $reminderEnabled = isset($_POST['reminder_enabled']) ? true : false;
    $reminderTimeBefore = isset($_POST['reminder_time_before']) ? intval($_POST['reminder_time_before']) : 60;

    // Validation des données
    if (empty($examName)) {
        $errors[] = $lang_data['exam_name'] ?? 'Le nom de l\'examen est requis.';
    }

    if (empty($examDate)) {
        $errors[] = $lang_data['select_date'] ?? 'La date de l\'examen est requise.';
    } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $examDate)) {
        $errors[] = $lang_data['select_date'] ?? 'La date de l\'examen doit être au format AAAA-MM-JJ.';
    }

    if (empty($examTime)) {
        $errors[] = $lang_data['select_time'] ?? 'L\'heure de l\'examen est requise.';
    } elseif (!preg_match('/^\d{2}:\d{2}$/', $examTime)) {
        $errors[] = $lang_data['select_time'] ?? 'L\'heure de l\'examen doit être au format HH:MM.';
    }

    if ($reminderEnabled && ($reminderTimeBefore <= 0)) {
        $errors[] = $lang_data['reminder_time_before'] ?? 'Le temps de rappel doit être supérieur à 0.';
    }

    // Si aucune erreur, insérer l'examen dans la base de données
    if (empty($errors)) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO exams (uuid, exam_name, exam_date, exam_time, reminder_enabled, reminder_time_before)
                VALUES (:uuid, :exam_name, :exam_date, :exam_time, :reminder_enabled, :reminder_time_before)
            ");

            $stmt->execute([
                ':uuid' => $_SESSION['user_uuid'],
                ':exam_name' => $examName,
                ':exam_date' => $examDate,
                ':exam_time' => $examTime,
                ':reminder_enabled' => $reminderEnabled,
                ':reminder_time_before' => $reminderTimeBefore
            ]);

            // Réinitialiser les variables du formulaire
            $examName = '';
            $examDate = '';
            $examTime = '';
            $reminderEnabled = false;
            $reminderTimeBefore = 60;

            $success = true;
        } catch (PDOException $e) {
            $errors[] = 'Erreur lors de l\'enregistrement de l\'examen.';
            // En production, ne jamais afficher les erreurs complètes
            // $errors[] = $e->getMessage();
        }
    }
}

// -------------------- Récupération des Examens Existants --------------------

try {
    $stmt = $pdo->prepare("
        SELECT * FROM exams
        WHERE uuid = :uuid
        ORDER BY exam_date ASC, exam_time ASC
    ");
    $stmt->execute([':uuid' => $_SESSION['user_uuid']]);
    $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $exams = [];
    // En production, gérer les erreurs de manière appropriée
}

// -------------------- Suppression d'un Examen --------------------

// Vérifier si une demande de suppression est faite via GET
if (isset($_GET['delete'])) {
    $examId = intval($_GET['delete']);

    try {
        $stmt = $pdo->prepare("
            DELETE FROM exams
            WHERE id = :id AND uuid = :uuid
        ");
        $stmt->execute([
            ':id' => $examId,
            ':uuid' => $_SESSION['user_uuid']
        ]);

        // Rediriger après suppression
        header('Location: exams.php?deleted=1');
        exit();
    } catch (PDOException $e) {
        // Gérer l'erreur de suppression
    }
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['exams_title'] ?? 'Exams') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Flatpickr -->
    <link href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" rel="stylesheet">
    <!-- Bootstrap CSS (Assuming it's included in header.php, else include it here) -->
</head>
<body class="list-container">
<div class="container py-5">
    <h1 class="mb-4 text-center"><?= htmlspecialchars($lang_data['exams_title'] ?? 'Exams') ?></h1>

    <!-- Messages de Succès ou d'Erreur -->
    <?php if ($success): ?>
        <div class="alert alert-success">
            <?= htmlspecialchars($lang_data['exam_saved_successfully'] ?? 'Examen enregistré avec succès.') ?>
        </div>
    <?php endif; ?>

    <?php if (isset($_GET['deleted'])): ?>
        <div class="alert alert-warning">
            <?= htmlspecialchars($lang_data['exam_deleted_successfully'] ?? 'Examen supprimé avec succès.') ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($errors)): ?>
        <div class="alert alert-danger">
            <ul>
                <?php foreach ($errors as $error): ?>
                    <li><?= htmlspecialchars($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
    <?php endif; ?>

    <!-- Formulaire d'Ajout d'Examen -->
    <div class="card mb-4">
        <div class="card-header">
            <h5 class="mb-0"><?= htmlspecialchars($lang_data['add_exam'] ?? 'Ajouter un examen') ?></h5>
        </div>
        <div class="card-body">
            <form method="POST" action="exams.php">
                <!-- Nom de l'Examen -->
                <div class="mb-3">
                    <label for="exam_name" class="form-label"><?= htmlspecialchars($lang_data['exam_name'] ?? 'Nom de l\'examen') ?></label>
                    <input
                        type="text"
                        id="exam_name"
                        name="exam_name"
                        class="form-control"
                        placeholder="<?= htmlspecialchars($lang_data['exam_name'] ?? 'Nom de l\'examen') ?>"
                        value="<?= htmlspecialchars($examName) ?>"
                        required
                    >
                </div>
                <!-- Date de l'Examen -->
                <div class="mb-3">
                    <label for="exam_date" class="form-label"><?= htmlspecialchars($lang_data['select_date'] ?? 'Sélectionner une date') ?></label>
                    <input
                        type="text"
                        id="exam_date"
                        name="exam_date"
                        class="form-control"
                        placeholder="<?= htmlspecialchars($lang_data['select_date'] ?? 'Sélectionner une date') ?>"
                        value="<?= htmlspecialchars($examDate) ?>"
                        required
                        readonly
                    >
                </div>
                <!-- Heure de l'Examen -->
                <div class="mb-3">
                    <label for="exam_time" class="form-label"><?= htmlspecialchars($lang_data['select_time'] ?? 'Sélectionner une heure') ?></label>
                    <input
                        type="text"
                        id="exam_time"
                        name="exam_time"
                        class="form-control"
                        placeholder="<?= htmlspecialchars($lang_data['select_time'] ?? 'Sélectionner une heure') ?>"
                        value="<?= htmlspecialchars($examTime) ?>"
                        required
                        readonly
                    >
                </div>
                <!-- Rappel -->
                <div class="mb-3 form-check">
                    <input
                        type="checkbox"
                        class="form-check-input"
                        id="reminder_enabled"
                        name="reminder_enabled"
                        <?= $reminderEnabled ? 'checked' : '' ?>
                    >
                    <label class="form-check-label" for="reminder_enabled"><?= htmlspecialchars($lang_data['enable_reminder'] ?? 'Activer le rappel') ?></label>
                </div>
                <!-- Temps Avant Rappel -->
                <div class="mb-3">
                    <label for="reminder_time_before" class="form-label"><?= htmlspecialchars($lang_data['reminder_time_before'] ?? 'Temps avant l\'examen pour le rappel (minutes)') ?></label>
                    <input
                        type="number"
                        id="reminder_time_before"
                        name="reminder_time_before"
                        class="form-control"
                        placeholder="<?= htmlspecialchars($lang_data['reminder_time_before'] ?? 'Ex. 60') ?>"
                        value="<?= htmlspecialchars($reminderTimeBefore) ?>"
                        min="1"
                        required
                        <?= $reminderEnabled ? '' : 'disabled' ?>
                    >
                </div>
                <!-- Boutons -->
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> <?= htmlspecialchars($lang_data['save_exam'] ?? 'Enregistrer l\'examen') ?>
                </button>
                <button type="reset" class="btn btn-secondary">
                    <i class="fas fa-times"></i> <?= htmlspecialchars($lang_data['cancel'] ?? 'Annuler') ?>
                </button>
            </form>
        </div>
    </div>

    <!-- Liste des Examens Existants -->
    <div class="card">
        <div class="card-header">
            <h5 class="mb-0"><?= htmlspecialchars($lang_data['exams_title'] ?? 'Exams') ?></h5>
        </div>
        <div class="card-body">
            <?php if (!empty($exams)): ?>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th><?= htmlspecialchars($lang_data['exam_name'] ?? 'Nom de l\'examen') ?></th>
                            <th><?= htmlspecialchars($lang_data['select_date'] ?? 'Date') ?></th>
                            <th><?= htmlspecialchars($lang_data['select_time'] ?? 'Heure') ?></th>
                            <th><?= htmlspecialchars($lang_data['reminder'] ?? 'Rappel') ?></th>
                            <th><?= htmlspecialchars($lang_data['actions'] ?? 'Actions') ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($exams as $exam): ?>
                            <tr>
                                <td><?= htmlspecialchars($exam['exam_name']) ?></td>
                                <td><?= htmlspecialchars($exam['exam_date']) ?></td>
                                <td><?= htmlspecialchars($exam['exam_time']) ?></td>
                                <td>
                                    <?= $exam['reminder_enabled'] 
                                        ? htmlspecialchars(sprintf($lang_data['reminder_time_before'] ?? '%d minutes avant', $exam['reminder_time_before'])) 
                                        : htmlspecialchars($lang_data['no'] ?? 'Non') 
                                    ?>
                                </td>
                                <td>
                                    <!-- Optionnel : Ajouter des liens pour éditer -->
                                    <a href="exams.php?delete=<?= htmlspecialchars($exam['id']) ?>" class="btn btn-danger btn-sm" onclick="return confirm('<?= htmlspecialchars($lang_data['confirm_delete'] ?? 'Êtes-vous sûr de vouloir supprimer cet examen ?') ?>');">
                                        <i class="fas fa-trash-alt"></i> <?= htmlspecialchars($lang_data['delete'] ?? 'Supprimer') ?>
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php else: ?>
                <p><?= htmlspecialchars($lang_data['no_exams_found'] ?? 'Aucun examen trouvé.') ?></p>
            <?php endif; ?>
        </div>
    </div>
</div><!-- container -->

<!-- Scripts JS -->
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Initialisation de Flatpickr pour la date
        flatpickr("#exam_date", {
            altInput: true,
            altFormat: "F j, Y",
            dateFormat: "Y-m-d",
            minDate: "today",
            locale: "<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>" // Assurez-vous que Flatpickr supporte la langue
        });

        // Initialisation de Flatpickr pour l'heure
        flatpickr("#exam_time", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            locale: "<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>"
        });

        // Gestion de l'activation/désactivation du champ de rappel
        const reminderCheckbox = document.getElementById('reminder_enabled');
        const reminderInput = document.getElementById('reminder_time_before');

        reminderCheckbox.addEventListener('change', function() {
            if (this.checked) {
                reminderInput.disabled = false;
            } else {
                reminderInput.disabled = true;
            }
        });
    });
</script>

</body>
</html>

<!-- Inclure le footer -->
<?php include 'includes/footer.php'; ?>
