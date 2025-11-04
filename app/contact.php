<?php
// contact.php

session_start(); // Démarrer la session
require 'config.php'; // Inclure le fichier de configuration de la base de données

// Le header gère la langue et la redirection si nécessaire
include 'includes/header.php';

require_once 'vendor/autoload.php';

// Vérifier si l'utilisateur est connecté (ou toute autre condition)
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Récupérer les informations de l'utilisateur connecté depuis la table Users
try {
    // Exemple avec PDO. Assurez-vous que $pdo est défini dans config.php.
    $query = "SELECT uuid, username, email, subscription_id, subscription_status FROM Users WHERE uuid = :uuid";
    $stmt = $pdo->prepare($query);
    $stmt->execute(['uuid' => $_SESSION['user_uuid']]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$userData) {
        // Si l'utilisateur n'est pas trouvé, vous pouvez rediriger ou afficher une erreur
        die("Utilisateur non trouvé.");
    }
} catch (PDOException $e) {
    die("Erreur de base de données : " . $e->getMessage());
}

// Pré-remplir les champs du formulaire avec les données de l'utilisateur
// On vérifie s'ils ne sont pas déjà définis (par exemple en cas d'erreur de validation)
if (!isset($nom)) {
    $nom = $userData['username'];
}
if (!isset($email)) {
    $email = $userData['email'];
}

// Traitement du formulaire lorsque celui-ci est soumis
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Récupération et assainissement des données du formulaire
    // Même si Nom et Email sont pré-remplis, l'utilisateur peut les modifier
    $nom     = trim($_POST['nom']);
    $email   = trim($_POST['email']);
    $sujet   = trim($_POST['sujet']);
    $message = trim($_POST['message']);

    // Initialisation d'un tableau pour stocker les éventuelles erreurs
    $errors = [];

    // Validation des champs avec les messages traduits
    if (empty($nom)) {
        $errors[] = $lang_data['please_enter_your_name'];
    }
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = $lang_data['please_enter_valid_email'];
    }
    if (empty($sujet)) {
        $errors[] = $lang_data['please_enter_subject'];
    }
    if (empty($message)) {
        $errors[] = $lang_data['please_enter_message'];
    }

    // Si aucune erreur, procéder à l'envoi de l'email
    if (empty($errors)) {
        // Construction du corps de l'email incluant les informations de l'utilisateur
        $emailBody = "Message de contact:\n\n";
        $emailBody .= "Nom: $nom\n";
        $emailBody .= "Email: $email\n";
        $emailBody .= "Sujet: $sujet\n\n";
        $emailBody .= "Message:\n$message\n\n";
        $emailBody .= "--------------------------------------------------\n";
        $emailBody .= "Informations utilisateur (non visibles par l'expéditeur):\n";
        $emailBody .= "UUID: " . $userData['uuid'] . "\n";
        $emailBody .= "Username: " . $userData['username'] . "\n";
        $emailBody .= "Email: " . $userData['email'] . "\n";
        $emailBody .= "Subscription ID: " . $userData['subscription_id'] . "\n";
        $emailBody .= "Subscription Status: " . $userData['subscription_status'] . "\n";
        $emailBody .= "--------------------------------------------------\n";

        // Configuration de l'email
        $to           = "contact@wanatest.com"; // Adresse de destination
        $emailSubject = "Nouveau message de contact : $sujet";
        $headers      = "From: $email\r\n" .
                        "Reply-To: $email\r\n" .
                        "Content-Type: text/plain; charset=UTF-8\r\n";

        // Envoi de l'email
        if (mail($to, $emailSubject, $emailBody, $headers)) {
            $success = $lang_data['success_message'];
            // Réinitialisation des variables si nécessaire
            // Ici, on ne réinitialise pas Nom et Email pour conserver les infos pré-remplies
            $sujet = $message = "";
        } else {
            $errors[] = $lang_data['error_sending_message'];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?= $lang ?>">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['contact_us']) ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Inclusion conditionnelle de Bootstrap (RTL ou LTR) gérée dans le header -->
</head>
<body class="bg-light">
    <div class="container mt-5">
        <h1 class="text-center mb-4"><?= htmlspecialchars($lang_data['contact_us']) ?></h1>
        <div class="row justify-content-center">
            <div class="col-md-8">
                <?php if (!empty($errors)) : ?>
                    <div class="alert alert-danger">
                        <ul class="mb-0">
                            <?php foreach ($errors as $error) : ?>
                                <li><?= htmlspecialchars($error) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>

                <?php if (isset($success)) : ?>
                    <div class="alert alert-success">
                        <?= htmlspecialchars($success) ?>
                    </div>
                <?php endif; ?>

                <div class="card">
                    <div class="card-body">
                        <form action="contact.php" method="post">
                            <div class="mb-3">
                                <label for="nom" class="form-label"><?= htmlspecialchars($lang_data['name']) ?> :</label>
                                <input type="text" id="nom" name="nom" class="form-control" value="<?= htmlspecialchars($nom) ?>">
                            </div>
                            <div class="mb-3">
                                <label for="email" class="form-label"><?= htmlspecialchars($lang_data['email']) ?> :</label>
                                <input type="email" id="email" name="email" class="form-control" value="<?= htmlspecialchars($email) ?>">
                            </div>
                            <div class="mb-3">
                                <label for="sujet" class="form-label"><?= htmlspecialchars($lang_data['subject']) ?> :</label>
                                <input type="text" id="sujet" name="sujet" class="form-control" value="<?= isset($sujet) ? htmlspecialchars($sujet) : '' ?>">
                            </div>
                            <div class="mb-3">
                                <label for="message" class="form-label"><?= htmlspecialchars($lang_data['message']) ?> :</label>
                                <textarea id="message" name="message" rows="5" class="form-control"><?= isset($message) ? htmlspecialchars($message) : '' ?></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary"><?= htmlspecialchars($lang_data['send']) ?></button>
                        </form>
                    </div>
                </div>
            <!-- Bouton Retour -->
            <div class="text-center mt-4">
                <a href="dashboard.php" class="btn btn-primary">
                    <i class="bi bi-arrow-left-circle me-2"></i>
                    <?= $lang_data['back_to_dashboard'] ?? 'Back to dashboard' ?>
                </a>
            </div>
            </div>
        </div>
    </div>

</body>
</html>
<?php
// Inclure le footer
include 'includes/footer.php';
?>
