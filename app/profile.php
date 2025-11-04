<?php
// profile.php

session_start();

// Sécurité des cookies de session
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1); // Assurez-vous que le site utilise HTTPS
session_regenerate_id(true);

require 'config.php';
require 'paypalConfig.php';

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

include 'includes/header.php';

try {
    $stmt = $pdo->prepare("SELECT * FROM Users WHERE uuid = :uuid");
    $stmt->execute(['uuid' => $_SESSION['user_uuid']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        session_destroy();
        header('Location: login.php');
        exit();
    }
} catch (PDOException $e) {
    error_log("Erreur DB (profile.php - Récupérer utilisateur): " . $e->getMessage());
    die($lang_data['profile_error_fetching_user'] ?? "Erreur lors de la récupération des informations de l'utilisateur.");
}

$updateSuccess = '';
$updateError = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        $updateError = $lang_data['csrf_invalid'] ?? "Erreur de sécurité : jeton CSRF invalide.";
    } else {
        if (isset($_POST['update_profile'])) {
            $username = trim($_POST['username'] ?? '');
            $email = trim($_POST['email'] ?? '');
            if (empty($username) || empty($email)) {
                $updateError = $lang_data['profile_update_required'] ?? "Le nom d'utilisateur et l'email sont requis.";
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $updateError = $lang_data['profile_invalid_email'] ?? "Format d'email invalide.";
            } else {
                try {
                    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM Users WHERE (username = :username OR email = :email) AND uuid != :uuid");
                    $stmtCheck->execute([
                        'username' => $username,
                        'email' => $email,
                        'uuid' => $_SESSION['user_uuid']
                    ]);
                    $count = $stmtCheck->fetchColumn();
                    if ($count > 0) {
                        $updateError = $lang_data['profile_duplicate'] ?? "Le nom d'utilisateur ou l'email est déjà utilisé par un autre compte.";
                    } else {
                        $stmtUpdate = $pdo->prepare("UPDATE Users SET username = :username, email = :email WHERE uuid = :uuid");
                        $stmtUpdate->execute([
                            'username' => $username,
                            'email' => $email,
                            'uuid' => $_SESSION['user_uuid']
                        ]);
                        $updateSuccess = $lang_data['profile_update_success'] ?? "Profil mis à jour avec succès.";
                        // Rafraîchir les données utilisateur
                        $stmt = $pdo->prepare("SELECT * FROM Users WHERE uuid = :uuid");
                        $stmt->execute(['uuid' => $_SESSION['user_uuid']]);
                        $user = $stmt->fetch(PDO::FETCH_ASSOC);
                    }
                } catch (PDOException $e) {
                    error_log("Erreur DB (profile.php - Mise à jour profil): " . $e->getMessage());
                    $updateError = $lang_data['profile_update_error_db'] ?? "Erreur lors de la mise à jour du profil.";
                }
            }
        }

        if (isset($_POST['change_password'])) {
            $currentPassword = $_POST['current_password'] ?? '';
            $newPassword = $_POST['new_password'] ?? '';
            $confirmPassword = $_POST['confirm_password'] ?? '';
            if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
                $updateError = $lang_data['password_change_required'] ?? "Tous les champs de mot de passe sont requis.";
            } elseif ($newPassword !== $confirmPassword) {
                $updateError = $lang_data['password_mismatch'] ?? "Les nouveaux mots de passe ne correspondent pas.";
            } else {
                if (!password_verify($currentPassword, $user['password_hash'])) {
                    $updateError = $lang_data['incorrect_current_password'] ?? "Le mot de passe actuel est incorrect.";
                } else {
                    $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
                    try {
                        $stmtUpdate = $pdo->prepare("UPDATE Users SET password_hash = :password_hash WHERE uuid = :uuid");
                        $stmtUpdate->execute([
                            'password_hash' => $hashedPassword,
                            'uuid' => $_SESSION['user_uuid']
                        ]);
                        $updateSuccess = $lang_data['password_change_success'] ?? "Mot de passe changé avec succès.";
                    } catch (PDOException $e) {
                        error_log("Erreur DB (profile.php - Changement mot de passe): " . $e->getMessage());
                        $updateError = $lang_data['password_change_error_db'] ?? "Erreur lors du changement de mot de passe.";
                    }
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['profile_page_title'] ?? 'Mon Profil') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Inclusion de SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        .btn-margin {
            margin-right: 10px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body class="list-container">

<div class="container mt-5">
    <h1 class="mb-4"><?= htmlspecialchars($lang_data['profile_heading'] ?? 'Mon Profil') ?></h1>

    <?php if (!empty($updateSuccess)): ?>
        <div class="alert alert-success">
            <?= htmlspecialchars($updateSuccess) ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($updateError)): ?>
        <div class="alert alert-danger">
            <?= htmlspecialchars($updateError) ?>
        </div>
    <?php endif; ?>

    <!-- Section de mise à jour des informations du profil -->
    <div class="card mb-4">
        <div class="card-header">
            <?= htmlspecialchars($lang_data['profile_info_heading'] ?? 'Informations du Profil') ?>
        </div>
        <div class="card-body">
            <!-- Ajout de l'id "updateProfileForm" et du champ caché pour update_profile -->
            <form method="POST" action="profile.php" id="updateProfileForm">
                <input type="hidden" name="update_profile" value="true">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                <div class="form-group">
                    <label for="username"><?= htmlspecialchars($lang_data['profile_name_label'] ?? 'Nom') ?></label>
                    <input type="text" class="form-control" id="username" name="username" value="<?= htmlspecialchars($user['username'] ?? '') ?>" required>
                </div>
                <div class="form-group">
                    <label for="email"><?= htmlspecialchars($lang_data['profile_email_label'] ?? 'Email') ?></label>
                    <input type="email" class="form-control" id="email" name="email" value="<?= htmlspecialchars($user['email'] ?? '') ?>" required>
                </div>
                <button type="submit" class="btn btn-primary">
                    <?= htmlspecialchars($lang_data['profile_update_button'] ?? 'Mettre à jour') ?>
                </button>
            </form>
        </div>
    </div>

    <!-- Section pour changer le mot de passe -->
    <div class="card mb-4">
        <div class="card-header">
            <?= htmlspecialchars($lang_data['password_change_heading'] ?? 'Changer le Mot de Passe') ?>
        </div>
        <div class="card-body">
            <!-- Ajout de l'id "changePasswordForm" et du champ caché pour change_password -->
            <form method="POST" action="profile.php" id="changePasswordForm">
                <input type="hidden" name="change_password" value="true">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                <div class="form-group">
                    <label for="current_password"><?= htmlspecialchars($lang_data['current_password_label'] ?? 'Mot de Passe Actuel') ?></label>
                    <input type="password" class="form-control" id="current_password" name="current_password" required>
                </div>
                <div class="form-group">
                    <label for="new_password"><?= htmlspecialchars($lang_data['new_password_label'] ?? 'Nouveau Mot de Passe') ?></label>
                    <input type="password" class="form-control" id="new_password" name="new_password" required>
                </div>
                <div class="form-group">
                    <label for="confirm_password"><?= htmlspecialchars($lang_data['confirm_password_label'] ?? 'Confirmer le Nouveau Mot de Passe') ?></label>
                    <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
                </div>
                <button type="submit" class="btn btn-warning">
                    <?= htmlspecialchars($lang_data['change_password_button'] ?? 'Changer le Mot de Passe') ?>
                </button>
            </form>
        </div>
    </div>

    <!-- Section de gestion de l'abonnement -->
    <div class="card mb-4">
        <div class="card-header">
            <?= htmlspecialchars($lang_data['subscription_management_heading'] ?? "Gestion de l'Abonnement") ?>
        </div>
        <div class="card-body">
            <p>
                <?= htmlspecialchars($lang_data['current_subscription_status'] ?? 'Statut de votre abonnement') ?> : 
                <strong><?= htmlspecialchars(ucfirst($user['subscription_status'] ?? 'Aucun')) ?></strong>
            </p>
            <?php if (strtolower($user['subscription_status']) === 'active'): ?>
                <!-- Formulaire pour annuler l'abonnement -->
                <form action="manageSubscription.php" method="POST" class="d-inline-block">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                    <input type="hidden" name="action" value="cancel">
                    <button type="submit" class="btn btn-danger btn-margin subscription-btn" data-confirm-message="<?= htmlspecialchars($lang_data['cancel_subscription_confirm'] ?? "Êtes-vous sûr de vouloir annuler votre abonnement ?") ?>">
                        <?= htmlspecialchars($lang_data['cancel_subscription_button'] ?? "Annuler l'abonnement") ?>
                    </button>
                </form>
                <!-- Formulaire pour suspendre l'abonnement -->
                <form action="manageSubscription.php" method="POST" class="d-inline-block">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                    <input type="hidden" name="action" value="suspend">
                    <button type="submit" class="btn btn-warning btn-margin subscription-btn" data-confirm-message="<?= htmlspecialchars($lang_data['suspend_subscription_confirm'] ?? "Êtes-vous sûr de vouloir mettre votre abonnement en pause ?") ?>">
                        <?= htmlspecialchars($lang_data['suspend_subscription_button'] ?? 'Mettre en pause') ?>
                    </button>
                </form>
            <?php elseif (strtolower($user['subscription_status']) === 'suspended'): ?>
                <!-- Formulaire pour reprendre l'abonnement -->
                <form action="manageSubscription.php" method="POST" class="d-inline-block">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                    <input type="hidden" name="action" value="activate">
                    <button type="submit" class="btn btn-success btn-margin subscription-btn" data-confirm-message="<?= htmlspecialchars($lang_data['activate_subscription_confirm'] ?? "Êtes-vous sûr de vouloir reprendre votre abonnement ?") ?>">
                        <?= htmlspecialchars($lang_data['activate_subscription_button'] ?? "Reprendre l'abonnement") ?>
                    </button>
                </form>
            <?php elseif (strtolower($user['subscription_status']) === 'cancelled'): ?>
                <form action="payment.php" method="GET" class="d-inline-block">
                    <button type="submit" class="btn btn-primary btn-margin">
                        <?= htmlspecialchars($lang_data['resubscribe_subscription_button'] ?? 'Souscrire à nouveau') ?>
                    </button>
                </form>
            <?php else: ?>
                <form action="payment.php" method="GET" class="d-inline-block">
                    <button type="submit" class="btn btn-primary btn-margin">
                        <?= htmlspecialchars($lang_data['subscribe_button'] ?? 'Souscrire') ?>
                    </button>
                </form>
            <?php endif; ?>
        </div>
    </div>

    <!-- Bouton Retour -->
    <div class="text-center mt-4">
        <a href="dashboard.php" class="btn btn-primary">
            <i class="bi bi-arrow-left-circle me-2"></i>
            <?= htmlspecialchars($lang_data['back_to_dashboard'] ?? 'Back to dashboard') ?>
        </a>
    </div>
</div>

<!-- Inclusion de Bootstrap JS et dépendances -->
<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>

<!-- Script de confirmation via SweetAlert2 -->
<script>
// Définir les textes de confirmation traduisibles pour chaque section
const updateProfileTexts = {
    title: "<?= addslashes($lang_data['update_profile_confirm_title'] ?? 'Confirmer la mise à jour') ?>",
    text: "<?= addslashes($lang_data['update_profile_confirm_text'] ?? 'Êtes-vous sûr de vouloir modifier votre nom et votre email ?') ?>",
    confirm: "<?= addslashes($lang_data['update_profile_confirm_confirm'] ?? 'Oui, mettre à jour') ?>",
    cancel: "<?= addslashes($lang_data['update_profile_confirm_cancel'] ?? 'Annuler') ?>"
};

const changePasswordTexts = {
    title: "<?= addslashes($lang_data['change_password_confirm_title'] ?? 'Confirmer le changement de mot de passe') ?>",
    text: "<?= addslashes($lang_data['change_password_confirm_text'] ?? 'Êtes-vous sûr de vouloir changer votre mot de passe ?') ?>",
    confirm: "<?= addslashes($lang_data['change_password_confirm_confirm'] ?? 'Oui, changer') ?>",
    cancel: "<?= addslashes($lang_data['change_password_confirm_cancel'] ?? 'Annuler') ?>"
};

const subscriptionConfirmTexts = {
    title: "<?= addslashes($lang_data['subscription_confirm_title'] ?? "Confirmer l'action") ?>",
    confirm: "<?= addslashes($lang_data['subscription_confirm_confirm'] ?? 'Oui, confirmer') ?>",
    cancel: "<?= addslashes($lang_data['subscription_confirm_cancel'] ?? 'Annuler') ?>"
};

document.addEventListener("DOMContentLoaded", function () {
    // Confirmation pour la mise à jour du profil
    const updateProfileForm = document.getElementById("updateProfileForm");
    if (updateProfileForm) {
        updateProfileForm.addEventListener("submit", function (e) {
            e.preventDefault();
            Swal.fire({
                title: updateProfileTexts.title,
                text: updateProfileTexts.text,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: updateProfileTexts.confirm,
                cancelButtonText: updateProfileTexts.cancel
            }).then((result) => {
                if (result.isConfirmed) {
                    updateProfileForm.submit();
                }
            });
        });
    }

    // Confirmation pour le changement de mot de passe
    const changePasswordForm = document.getElementById("changePasswordForm");
    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", function (e) {
            e.preventDefault();
            Swal.fire({
                title: changePasswordTexts.title,
                text: changePasswordTexts.text,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: changePasswordTexts.confirm,
                cancelButtonText: changePasswordTexts.cancel
            }).then((result) => {
                if (result.isConfirmed) {
                    changePasswordForm.submit();
                }
            });
        });
    }

    // Confirmation pour la gestion de l'abonnement (boutons)
    document.querySelectorAll('.subscription-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const message = btn.getAttribute('data-confirm-message');
            Swal.fire({
                title: subscriptionConfirmTexts.title,
                text: message,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: subscriptionConfirmTexts.confirm,
                cancelButtonText: subscriptionConfirmTexts.cancel
            }).then((result) => {
                if (result.isConfirmed) {
                    btn.closest('form').submit();
                }
            });
        });
    });
});
</script>

</body>
</html>
<?php include 'includes/footer.php'; ?>