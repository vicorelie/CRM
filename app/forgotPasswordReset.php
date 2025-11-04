<?php
// forgotPasswordReset.php

// Affichage des erreurs (à activer en développement pour diagnostiquer d'éventuels problèmes)
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start(); // S'assurer que la session est démarrée
require 'config.php'; // Inclure la configuration pour la base de données

// Définir la langue par défaut si elle n'est pas définie
if (!isset($_SESSION['lang'])) {
    $_SESSION['lang'] = 'he'; // Langue par défaut, par exemple
}

// Permettre le changement de langue via le paramètre GET
if (isset($_GET['lang']) && in_array($_GET['lang'], ['fr', 'en', 'he', 'ar', 'ru'])) {
    $_SESSION['lang'] = $_GET['lang'];

    // Inclure les paramètres actuels dans la redirection pour préserver l'URL
    $queryParams = $_GET;
    unset($queryParams['lang']); // Supprimer l'ancien paramètre de langue
    $redirectUrl = strtok($_SERVER['REQUEST_URI'], '?');
    if (!empty($queryParams)) {
        $redirectUrl .= '?' . http_build_query($queryParams);
    }

    header("Location: $redirectUrl");
    exit();
}

// Charger le fichier de langue
$lang = $_SESSION['lang'];
$lang_file = __DIR__ . "/lang/{$lang}.php";
if (file_exists($lang_file)) {
    include $lang_file;
} else {
    die("Fichier de langue introuvable : $lang_file");
}

// Vérifier si le token est présent dans l'URL
if (!isset($_GET['token'])) {
    die($lang_data['forgot_password_reset_error_no_token'] ?? "Aucun token de réinitialisation trouvé.");
}

$resetToken = $_GET['token'];

// Vérifier si le token est valide et s'il n'a pas expiré
$stmt = $pdo->prepare("SELECT uuid, reset_token, reset_token_expiry 
                       FROM Users 
                       WHERE reset_token = :reset_token 
                       LIMIT 1");
$stmt->execute(['reset_token' => $resetToken]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    die($lang_data['forgot_password_reset_error_invalid_token'] ?? "Token invalide ou expiré.");
}

// Vérifier si le token a expiré
if (strtotime($user['reset_token_expiry']) < time()) {
    die($lang_data['forgot_password_reset_error_token_expired'] ?? "Le token a expiré.");
}

// Initialiser la variable d'erreur (le cas échéant)
$error = "";

// Traitement de la réinitialisation du mot de passe
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $newPassword = trim($_POST['new_password'] ?? '');
    $confirmPassword = trim($_POST['confirm_password'] ?? '');

    if (empty($newPassword) || empty($confirmPassword)) {
        $error = $lang_data['forgot_password_reset_error_required'] ?? "Les champs de mot de passe sont requis.";
    } elseif ($newPassword !== $confirmPassword) {
        $error = $lang_data['forgot_password_reset_error_mismatch'] ?? "Les mots de passe ne correspondent pas.";
    } else {
        // Hacher le mot de passe
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

        // Mettre à jour le mot de passe dans la base de données et supprimer le token
        $stmt = $pdo->prepare("
            UPDATE Users
            SET password_hash = :password_hash, reset_token = NULL, reset_token_expiry = NULL
            WHERE uuid = :uuid
        ");
        $stmt->execute([
            'password_hash' => $hashedPassword,
            'uuid'          => $user['uuid']
        ]);

        // Rediriger vers la page de connexion après réinitialisation réussie
        header("Location: login.php?password_reset=" . urlencode($lang_data['forgot_password_reset_success'] ?? "Votre mot de passe a été réinitialisé avec succès."));
        exit();
    }
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['forgot_password_reset_page_title']) ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Liens CSS Bootstrap et style personnalisé -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<div class="auth-page-container">
    <div class="login-container custom-container">
        <!-- Sélecteur de langue -->
        <div class="dropdown language-selector">
            <button class="btn dropdown-toggle" type="button" id="dropdownLang" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="assets/img/flags/<?= htmlspecialchars($_SESSION['lang']) ?>.png" 
                     alt="<?= htmlspecialchars($_SESSION['lang']) ?>" 
                     class="flag-icon">
            </button>
            <ul class="dropdown-menu" aria-labelledby="dropdownLang">
                <?php foreach (['fr', 'en', 'he', 'ar', 'ru'] as $code): ?>
                    <li>
                        <a class="dropdown-item" href="?lang=<?= htmlspecialchars($code) ?>">
                            <img src="assets/img/flags/<?= htmlspecialchars($code) ?>.png" alt="<?= htmlspecialchars($code) ?>" class="flag-icon">
                            <?= strtoupper($code) ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>

        <!-- Logo -->
        <div class="logo-container">
            <img src="assets/img/logo.png" alt="Logo" class="logo">
        </div>

        <!-- Titre -->
        <h2><?= htmlspecialchars($lang_data['forgot_password_reset_heading']) ?></h2>

        <!-- Message d'erreur si nécessaire -->
        <?php if (!empty($error)): ?>
            <div class="alert alert-danger">
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <!-- Formulaire de réinitialisation du mot de passe -->
        <form method="POST" action="forgotPasswordReset.php?token=<?= htmlspecialchars($resetToken) ?>">
            <div class="mb-3">
                <label for="new_password" class="form-label"><?= htmlspecialchars($lang_data['forgot_password_new_password_label']) ?></label>
                <input type="password" class="form-control" id="new_password" name="new_password" required>
            </div>
            <div class="mb-3">
                <label for="confirm_password" class="form-label"><?= htmlspecialchars($lang_data['forgot_password_confirm_password_label']) ?></label>
                <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
            </div>

            <button type="submit" class="btn btn-primary w-100">
                <?= htmlspecialchars($lang_data['forgot_password_reset_button']) ?>
            </button>
        </form>
    </div>
</div>

<!-- Liens JS Bootstrap -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
