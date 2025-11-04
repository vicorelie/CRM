<?php
// paypalCancel.php
session_start();

require 'config.php';
require 'paypalConfig.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Inclure le header (qui inclut également le fichier de langue, par exemple fr.php)
include 'includes/header.php';

// Définir quelques variables traduites
$title = $lang_data['paypal_cancel_title'] ?? 'Abonnement Annulé';
$message = $lang_data['paypal_cancel_message'] ?? "Vous avez annulé le paiement PayPal.";
$redirectUrl = 'payment.php';
$redirectDelay = 5; // secondes

// La phrase de redirection utilise sprintf pour insérer le nombre de secondes
$redirectMessage = sprintf(
    $lang_data['redirect_in_seconds'] ?? 'Vous serez redirigé dans %s secondes.',
    $redirectDelay
);
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($lang) ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($title) ?></title>
    <meta http-equiv="refresh" content="<?= $redirectDelay ?>;url=<?= htmlspecialchars($redirectUrl) ?>">
</head>
<body>
    <div class="container mt-5">
        <div class="alert alert-warning text-center">
            <h2><?= htmlspecialchars($title) ?></h2>
            <p><?= htmlspecialchars($message) ?></p>
            <p><?= htmlspecialchars($redirectMessage) ?></p>
            <a href="<?= htmlspecialchars($redirectUrl) ?>" class="btn btn-primary">
                <?= htmlspecialchars($lang_data['back_button'] ?? 'Revenir') ?>
            </a>
        </div>
    </div>

    <!-- Inclusion de Bootstrap JS et dépendances -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
</body>
</html>
<?php include 'includes/footer.php'; ?>
