<?php
// login.php

require 'config.php';

// Définir la langue par défaut si elle n'est pas définie
if (!isset($_SESSION['lang'])) {
    $_SESSION['lang'] = 'he'; // Langue par défaut (ici, hébreu)
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

// Initialiser les variables pour les messages d'erreur
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username_or_email = trim($_POST['username_or_email'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($username_or_email)) {
        $errors[] = $lang_data['login_username_or_email_required'] ?? "Le nom d'utilisateur ou l'email est requis.";
    }

    if (empty($password)) {
        $errors[] = $lang_data['login_password_required'] ?? "Le mot de passe est requis.";
    }

    if (empty($errors)) {
        try {
            $stmt = $pdo->prepare("
                SELECT uuid, username, email, password_hash 
                FROM Users 
                WHERE username = :identifier OR email = :identifier
                LIMIT 1
            ");
            $stmt->execute(['identifier' => $username_or_email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password_hash'])) {
                $_SESSION['user_uuid'] = $user['uuid'];
                header('Location: dashboard.php');
                exit();
            } else {
                $errors[] = $lang_data['login_incorrect_credentials'] ?? "Identifiants incorrects.";
            }
        } catch (PDOException $e) {
            $errors[] = sprintf(
                $lang_data['login_error_connection'] ?? "Erreur lors de la connexion : %s",
                $e->getMessage()
            );
        }
    }
}
?>

<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['login_page_title'] ?? 'Connexion') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Liens CSS Bootstrap et style personnalisé -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
        <!-- Google Tag Manager -->
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-KPFSC7JR');</script>
        <!-- End Google Tag Manager -->
</head>
<body>
        <!-- Google Tag Manager (noscript) -->
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KPFSC7JR"
        height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
        <!-- End Google Tag Manager (noscript) -->
<div class="auth-page-container">
    <div class="login-container custom-container">
        <!-- Menu de sélection de langue -->
        <div class="dropdown language-selector">
            <button class="btn dropdown-toggle" type="button" id="dropdownLang" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="assets/img/flags/<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>.png" alt="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>" class="flag-icon">
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
        <h2><?= htmlspecialchars($lang_data['login_heading'] ?? 'Connexion') ?></h2>

        <!-- Messages d'erreur -->
        <?php if (!empty($errors)): ?>
            <div class="alert alert-danger">
                <ul class="mb-0">
                    <?php foreach ($errors as $error): ?>
                        <li><?= htmlspecialchars($error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <!-- Formulaire -->
        <form method="POST" action="login.php">
            <div class="mb-3">
                <label for="username_or_email" class="form-label"><?= htmlspecialchars($lang_data['login_username_or_email_label'] ?? "Nom d'utilisateur ou email") ?></label>
                <input type="text" class="form-control" id="username_or_email" name="username_or_email" value="<?= htmlspecialchars($_POST['username_or_email'] ?? '') ?>" required>
            </div>

            <div class="mb-3">
                <label for="password" class="form-label"><?= htmlspecialchars($lang_data['login_password_label'] ?? "Mot de passe") ?></label>
                <input type="password" class="form-control" id="password" name="password" required>
            </div>

            <button type="submit" class="btn btn-primary w-100"><?= htmlspecialchars($lang_data['login_button'] ?? "Se connecter") ?></button>
            <a href="forgotPassword.php" class="btn btn-link mt-3"><?= htmlspecialchars($lang_data['login_forgot_password'] ?? "Mot de passe oublié ?") ?></a>
        </form>

        <!-- Lien d'inscription -->
        <div class="mt-4">
            <p><?= htmlspecialchars($lang_data['login_no_account'] ?? "Vous n'avez pas de compte ?") ?> <a href="register.php" class="btn-link"><?= htmlspecialchars($lang_data['register_button'] ?? "S'inscrire") ?></a></p>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
