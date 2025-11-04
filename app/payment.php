<?php
// payment.php
session_start();

// Générer le token CSRF si nécessaire
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

require 'config.php';         // Contient la connexion à la BDD (ex. $pdo)
require 'paypalConfig.php';   // Contient la config PayPal (client ID, URL, etc.)

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Inclure le header qui charge le fichier de langue
include 'includes/header.php';

// Vérifier si l'utilisateur est déjà abonné
$stmt = $pdo->prepare("SELECT subscription_status FROM Users WHERE uuid = :uuid LIMIT 1");
$stmt->execute(['uuid' => $_SESSION['user_uuid']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Si abonnement actif, on redirige vers la page d'accueil (ou autre)
if ($user && strtolower($user['subscription_status']) === 'active') {
    header('Location: index.php');
    exit();
}

?>
<!DOCTYPE html>

<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($lang_data['subscription_management_heading'] ?? 'Subscription Management') ?></title>
</head>
<body class="list-container">
    <div class="container mt-5">
        <h1 class="mb-4 text-center">
            <?= htmlspecialchars($lang_data['subscription_management_heading'] ?? 'Subscription Management') ?>
        </h1>
        <p class="mb-4 text-center">
            <?= htmlspecialchars($lang_data['choose_best_plan'] ?? 'Find the perfect plan for your needs.') ?>
        </p>

        <?php if (isset($_GET['success']) && $_GET['success'] === 'subscribe'): ?>
            <div class="alert alert-success text-center">
                <?= htmlspecialchars($lang_data['subscribe_success'] ?? 'You have successfully subscribed!') ?>
            </div>
        <?php endif; ?>

        <?php if (isset($_GET['error'])): ?>
            <div class="alert alert-danger text-center">
                <?= htmlspecialchars($lang_data['paypal_api_error'] ?? 'There was an error with PayPal.') ?>
                <!-- 
                    Vous pouvez afficher plus de détails si vous le souhaitez, par ex.:
                    echo 'Détails: ' . htmlspecialchars($_GET['details'] ?? '');
                 -->
            </div>
        <?php endif; ?>

        <div class="pricing-cards">
            <!-- Monthly Plan -->
            <div class="pricing-card">
                <h2 class="pricing-header">
                    <?= htmlspecialchars($lang_data['monthly_subscription_title'] ?? 'Monthly Plan') ?>
                </h2>
                <p class="pricing-price">
                    <?= htmlspecialchars($lang_data['monthly_subscription_price'] ?? '25 ₪') ?>
                </p>
                <span class="pricing-period">
                    <?= htmlspecialchars($lang_data['per_month'] ?? '/ month') ?>
                </span>
                <p class="pricing-description">
                    <?= htmlspecialchars($lang_data['monthly_subscription_description'] ?? 'Billed monthly, cancel anytime.') ?>
                </p>
                <ul class="features-list">
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['generation_resume_detailled'] ?? 'Feature 1') ?></li>
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['generation_qcm'] ?? 'Feature 2') ?></li>
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['qcm_history'] ?? 'Feature 3') ?></li>
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['personalization'] ?? 'Feature 4') ?></li>
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['statistics_graphs'] ?? 'Feature 5') ?></li>
                </ul>
                <form action="createSubscription.php" method="POST">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                    <input type="hidden" name="subscription_type" value="monthly">
                    <button type="submit" class="btn-subscribe btn-primary">
                        <?= htmlspecialchars($lang_data['subscribe_button'] ?? 'Subscribe Now') ?>
                    </button>
                </form>
            </div>

            <!-- Annual Plan -->
            <div class="pricing-card">
                <h2 class="pricing-header">
                    <?= htmlspecialchars($lang_data['annual_subscription_title'] ?? 'Annual Plan') ?>
                </h2>
                <p class="pricing-price">
                    <?= htmlspecialchars($lang_data['annual_subscription_price'] ?? '300 ₪') ?>
                </p>
                <span class="pricing-period">
                    <?= htmlspecialchars($lang_data['per_year'] ?? 'x 12 month') ?>
                </span>
                <p class="pricing-description">
                    <?= htmlspecialchars($lang_data['annual_subscription_description'] ?? 'Pay once, save more.') ?>
                </p>
                <ul class="features-list">
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['generation_resume_detailled'] ?? 'Feature 1') ?></li>
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['generation_qcm'] ?? 'Feature 2') ?></li>
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['qcm_history'] ?? 'Feature 3') ?></li>
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['personalization'] ?? 'Feature 4') ?></li>
                    <li><i class="fas fa-check fa-check-icon"></i> <?= htmlspecialchars($lang_data['statistics_graphs'] ?? 'Feature 5') ?></li>
                </ul>
                <form action="createSubscription.php" method="POST">
                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
                    <input type="hidden" name="subscription_type" value="annual">
                    <button type="submit" class="btn-subscribe btn-outline-primary">
                        <?= htmlspecialchars($lang_data['subscribe_button'] ?? 'Subscribe Now') ?>
                    </button>
                </form>
            </div>
        </div>
    </div>
</body>
</html>

<!-- Inclure le footer -->
<?php include 'includes/footer.php'; ?>
