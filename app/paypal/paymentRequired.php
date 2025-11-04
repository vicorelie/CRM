<?php
// paymentRequired.php

session_start();
require 'config.php';

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Récupérer le statut de l'abonnement
$stmt = $pdo->prepare("SELECT subscription_status FROM Users WHERE uuid = :uuid LIMIT 1");
$stmt->execute(['uuid' => $_SESSION['user_uuid']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

$subscriptionStatus = $user['subscription_status'] ?? 'inactive';

if ($subscriptionStatus === 'active') {
    // L'utilisateur a un abonnement actif, rediriger vers l'accueil
    header('Location: index.php');
    exit();
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Abonnement Requis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">

</head>
<body>
<?php include 'includes/header.php'; ?>

<div class="container mt-5">
    <div class="alert alert-warning">
        <h4 class="alert-heading">Abonnement Requis</h4>
        <p>Pour accéder à cette fonctionnalité, vous devez avoir un abonnement actif.</p>
        <hr>
        <a href="createSubscription.php" class="btn btn-primary">Souscrire à un Abonnement</a>
    </div>
</div>

<!-- Bootstrap JS (optionnel) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

</body>
</html>
