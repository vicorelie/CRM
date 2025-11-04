<?php
// register.php

session_start();

require 'config.php';
require_once 'vendor/autoload.php';

use Ramsey\Uuid\Uuid;
use Brevo\Client\Configuration;
use Brevo\Client\Api\ContactsApi;
use Brevo\Client\Model\CreateContact;

// Définir la langue par défaut si elle n'est pas définie
if (!isset($_SESSION['lang'])) {
    $_SESSION['lang'] = 'he'; // Par exemple, hébreu par défaut
}

// Permettre le changement de langue via le paramètre GET
if (isset($_GET['lang']) && in_array($_GET['lang'], ['fr', 'en', 'he', 'ar', 'ru'])) {
    $_SESSION['lang'] = $_GET['lang'];
    $queryParams = $_GET;
    unset($queryParams['lang']);
    $redirectUrl = strtok($_SERVER['REQUEST_URI'], '?');
    if (!empty($queryParams)) {
        $redirectUrl .= '?' . http_build_query($queryParams);
    }
    header("Location: $redirectUrl");
    exit();
}

// Charger le fichier de langue
$lang       = $_SESSION['lang'];
$lang_file  = __DIR__ . "/lang/{$lang}.php";
if (file_exists($lang_file)) {
    include $lang_file;
} else {
    die("Fichier de langue introuvable : $lang_file");
}

// Initialiser les variables pour les messages d'erreur et de succès
$errors  = [];
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Récupérer et nettoyer les données du formulaire
    $username         = trim($_POST['username'] ?? '');
    $email            = trim($_POST['email'] ?? '');
    $password         = trim($_POST['password'] ?? '');
    $confirm_password = trim($_POST['confirm_password'] ?? '');

    // Validation des champs
    if (empty($username)) {
        $errors[] = $lang_data['register_username_required'] ?? "Le nom d'utilisateur est requis.";
    }
    if (empty($email)) {
        $errors[] = $lang_data['register_email_required'] ?? "L'email est requis.";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = $lang_data['register_email_invalid'] ?? "L'email n'est pas valide.";
    }
    if (empty($password)) {
        $errors[] = $lang_data['register_password_required'] ?? "Le mot de passe est requis.";
    } elseif (strlen($password) < 6) {
        $errors[] = $lang_data['register_password_length'] ?? "Le mot de passe doit comporter au moins 6 caractères.";
    }
    if ($password !== $confirm_password) {
        $errors[] = $lang_data['register_password_mismatch'] ?? "Les mots de passe ne correspondent pas.";
    }

    // Vérifier unicité username & email
    if (empty($errors)) {
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM Users WHERE username = :username");
            $stmt->execute(['username' => $username]);
            if ($stmt->fetchColumn() > 0) {
                $errors[] = $lang_data['register_username_taken'] ?? "Le nom d'utilisateur est déjà pris.";
            }
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM Users WHERE email = :email");
            $stmt->execute(['email' => $email]);
            if ($stmt->fetchColumn() > 0) {
                $errors[] = $lang_data['register_email_taken'] ?? "L'email est déjà enregistré.";
            }
        } catch (PDOException $e) {
            $errors[] = sprintf(
                $lang_data['register_error_checking'] ?? "Erreur lors de la vérification des informations : %s",
                $e->getMessage()
            );
        }
    }

    // Si aucune erreur, procéder à l'inscription
    if (empty($errors)) {
        try {
            // Générer un UUID
            $uuid = Uuid::uuid4()->toString();

            // Hash du mot de passe
            $passwordHash = password_hash($password, PASSWORD_BCRYPT);

            // >>> AJOUTER ICI :
            $trialEnd = (new DateTime('now', new DateTimeZone('UTC')))
                        ->modify('+3 days')
                        ->format('Y-m-d H:i:s');

            // Insertion en base (remplace l’INSERT existant)
            $stmt = $pdo->prepare(
                'INSERT INTO Users
                    (uuid, username, email, password_hash,
                    monthly_limit, created_at,
                    trial_end, subscription_status)
                VALUES
                    (:uuid, :username, :email, :password_hash,
                    :monthly_limit, NOW(),
                    :trial_end, "trial")'
            );
            $stmt->execute([
                'uuid'          => $uuid,
                'username'      => $username,
                'email'         => $email,
                'password_hash' => $passwordHash,
                'monthly_limit' => 0.00,
                'trial_end'     => $trialEnd
            ]);


            // Configuration de l’API
            $configBrevo = Configuration::getDefaultConfiguration()
                            ->setApiKey('api-key', BREVO_API_KEY);
            $apiInstance = new ContactsApi(new \GuzzleHttp\Client(), $configBrevo);

            // Création du contact
            $createContact = new CreateContact([
                'email'         => $email,
                'listIds'       => [BREVO_LIST_ID],
                'attributes'    => ['FIRSTNAME' => $username],
                'updateEnabled' => true,
            ]);

            try {
                $apiInstance->createContact($createContact);
            } catch (\Exception $e) {
                error_log('Brevo API error: ' . $e->getMessage());
            }


            // Connexion et redirection
            $_SESSION['user_uuid'] = $uuid;
            header('Location: dashboard.php');
            exit();
        } catch (PDOException $e) {
            $errors[] = sprintf(
                $lang_data['register_error_signup'] ?? "Erreur lors de l'inscription : %s",
                $e->getMessage()
            );
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['register_page_title'] ?? "Inscription") ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    <div class="register-container custom-container">
        <!-- Sélecteur de langue -->
        <div class="dropdown language-selector">
            <button class="btn dropdown-toggle" type="button" id="dropdownLang" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="assets/img/flags/<?= htmlspecialchars($_SESSION['lang']) ?>.png" class="flag-icon" alt="">
            </button>
            <ul class="dropdown-menu" aria-labelledby="dropdownLang">
                <?php foreach (['fr','en','he','ar','ru'] as $code): ?>
                    <li>
                        <a class="dropdown-item" href="?lang=<?= $code ?>">
                            <img src="assets/img/flags/<?= $code ?>.png" class="flag-icon" alt=""> <?= strtoupper($code) ?>
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
        <h2><?= htmlspecialchars($lang_data['register_heading'] ?? "Inscription") ?></h2>

        <!-- Notice essai gratuit -->
        <p class="trial-notice alert alert-success fw-bold text-center mb-3">
            <?= htmlspecialchars($lang_data['register_trial_notice']
                ?? "Accès complet gratuit pendant 3&nbsp;jours – aucune carte bancaire requise") ?>
        </p>

        <!-- Erreurs éventuelles -->
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
        <form method="POST" action="register.php">
            <div class="mb-3">
                <label for="username" class="form-label">
                    <?= htmlspecialchars($lang_data['register_username_label'] ?? "Nom d'utilisateur") ?>
                </label>
                <input type="text" class="form-control" id="username" name="username"
                       value="<?= htmlspecialchars($_POST['username'] ?? '') ?>" required>
            </div>

            <div class="mb-3">
                <label for="email" class="form-label">
                    <?= htmlspecialchars($lang_data['register_email_label'] ?? "Email") ?>
                </label>
                <input type="email" class="form-control" id="email" name="email"
                       value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
            </div>

            <div class="mb-3">
                <label for="password" class="form-label">
                    <?= htmlspecialchars($lang_data['register_password_label'] ?? "Mot de passe") ?>
                </label>
                <input type="password" class="form-control" id="password" name="password" required>
            </div>

            <div class="mb-3">
                <label for="confirm_password" class="form-label">
                    <?= htmlspecialchars($lang_data['register_confirm_password_label'] ?? "Confirmer le mot de passe") ?>
                </label>
                <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
            </div>

            <button type="submit" class="btn btn-primary w-100">
                <?= htmlspecialchars($lang_data['register_button'] ?? "S'inscrire") ?>
            </button>

            <div class="mt-4 text-center">
                <p>
                    <?= htmlspecialchars($lang_data['login_yes_account'] ?? "Vous êtes déjà inscrit ?") ?>
                    <a href="login.php" class="btn-link">
                        <?= htmlspecialchars($lang_data['login_button'] ?? "Se connecter") ?>
                    </a>
                </p>
            </div>
        </form>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
