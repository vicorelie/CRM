<?php
// forgotPassword.php

// Affichage des erreurs (à activer en développement pour diagnostiquer d'éventuels problèmes)
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start(); // S'assurer que la session est démarrée si ce n'est pas déjà fait
require 'config.php';

// Définir la langue par défaut si elle n'est pas définie
if (!isset($_SESSION['lang'])) {
    $_SESSION['lang'] = 'he'; // Langue par défaut (ex.: hébreu)
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

// ---------------------------------------------------------------------
// Inclure PHPMailer (si vous utilisez Composer, vendor/autoload.php suffit)
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendPasswordResetEmail($userEmail, $resetToken, $lang_data) {
    $mail = new PHPMailer(true);

    try {
        // Utilisation de la fonction mail() du serveur
        $mail->isMail();

        // Important pour l'encodage des caractères
        $mail->CharSet  = 'UTF-8'; 
        $mail->Encoding = 'base64';

        // Expéditeur et destinataire
        $mail->setFrom('contact@wanatest.com', 'Wanatest');
        $mail->addAddress($userEmail);

        // Sujet, corps HTML et version texte (AltBody) récupérés du fichier de langue
        $mail->isHTML(true);
        $mail->Subject = $lang_data['forgot_password_email_subject'];

        // Lien pour la réinitialisation
        $resetLink = 'https://wanatest.com/forgotPasswordReset.php?token=' . $resetToken;

        // Corps HTML
        $mail->Body = sprintf($lang_data['forgot_password_email_body_html'], $resetLink);

        // Corps texte brut
        $mail->AltBody = sprintf($lang_data['forgot_password_email_body_text'], $resetLink);

        // Envoi de l'email
        $mail->send();
        return true;
    } catch (Exception $e) {
        // Utilisation d'une clé de traduction pour l'erreur d'envoi
        echo sprintf($lang_data['forgot_password_email_send_error'], $mail->ErrorInfo);
        return false;
    }
}

// Initialiser les variables pour les messages d'erreur et de succès
$errors = [];
$success = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');

    if (empty($email)) {
        $errors[] = $lang_data['forgot_password_email_required'] ?? "L'email est requis.";
    } else {
        try {
            // Vérifier si l'email existe dans la base de données
            $stmt = $pdo->prepare("SELECT uuid, email FROM Users WHERE email = :email LIMIT 1");
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                // Générer un token de réinitialisation unique
                $resetToken = bin2hex(random_bytes(16));

                // Définir la date d'expiration du token (par exemple, 1 heure)
                $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

                // Stocker le token et son expiration dans la base de données
                $stmt = $pdo->prepare("
                    UPDATE Users
                    SET reset_token = :reset_token, reset_token_expiry = :expiry
                    WHERE uuid = :uuid
                ");
                $stmt->execute([
                    'reset_token' => $resetToken,
                    'expiry'      => $expiry,
                    'uuid'        => $user['uuid']
                ]);

                // Appeler la fonction pour envoyer l'email
                if (sendPasswordResetEmail($email, $resetToken, $lang_data)) {
                    $success = $lang_data['forgot_password_success'] ?? "Un email a été envoyé pour réinitialiser votre mot de passe.";
                } else {
                    $errors[] = $lang_data['forgot_password_email_send_error_generic'] ?? "Erreur lors de l'envoi de l'email.";
                }
            } else {
                $errors[] = $lang_data['forgot_password_no_account'] ?? "Aucun compte trouvé avec cet email.";
            }
        } catch (PDOException $e) {
            $errors[] = sprintf(
                $lang_data['forgot_password_request_error'] ?? "Erreur lors de la demande de réinitialisation : %s",
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
    <title><?= htmlspecialchars($lang_data['forgot_password_page_title']) ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Liens CSS Bootstrap et style personnalisé -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<div class="auth-page-container">
    <div class="login-container custom-container">
        <!-- Menu de sélection de langue -->
        <div class="dropdown language-selector">
            <button class="btn dropdown-toggle" type="button" id="dropdownLang" data-bs-toggle="dropdown" aria-expanded="false">
                <img src="assets/img/flags/<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>.png" 
                     alt="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>" 
                     class="flag-icon">
            </button>
            <ul class="dropdown-menu" aria-labelledby="dropdownLang">
                <?php foreach (['fr', 'en', 'he', 'ar', 'ru'] as $code): ?>
                    <li>
                        <a class="dropdown-item" href="?lang=<?= htmlspecialchars($code) ?>">
                            <img src="assets/img/flags/<?= htmlspecialchars($code) ?>.png" 
                                 alt="<?= htmlspecialchars($code) ?>" 
                                 class="flag-icon">
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
        <h2><?= htmlspecialchars($lang_data['forgot_password_heading']) ?></h2>

        <!-- Messages d'erreur ou de succès -->
        <?php if (!empty($errors)): ?>
            <div class="alert alert-danger">
                <ul class="mb-0">
                    <?php foreach ($errors as $error): ?>
                        <li><?= htmlspecialchars($error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>
        <?php if ($success): ?>
            <div class="alert alert-success">
                <?= htmlspecialchars($success) ?>
            </div>
        <?php endif; ?>

        <!-- Formulaire de réinitialisation -->
        <form method="POST" action="forgotPassword.php">
            <div class="mb-3">
                <label for="email" class="form-label"><?= htmlspecialchars($lang_data['forgot_password_email_label']) ?></label>
                <input type="email" class="form-control" id="email" name="email" required>
            </div>

            <button type="submit" class="btn btn-primary w-100"><?= htmlspecialchars($lang_data['forgot_password_button']) ?></button>
        </form>

        <div class="mt-4">
            <p><?= htmlspecialchars($lang_data['forgot_password_back_to_login']) ?> 
               <a href="login.php" class="btn-link"><?= htmlspecialchars($lang_data['login_button']) ?></a>
            </p>
        </div>
    </div>
</div>

<!-- Liens JavaScript Bootstrap -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
