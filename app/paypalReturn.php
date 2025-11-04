<?php
// paypalReturn.php
session_start();
require 'config.php';
require 'paypalConfig.php';

// Inclure le fichier de langue au besoin, par exemple :
include 'includes/header.php'; // <-- Doit définir $lang_data selon la langue choisie en session

/**
 * Fonction helper pour les requêtes API PayPal
 *
 * @param string      $endpoint URL de l'API PayPal
 * @param string      $method   Méthode HTTP (GET, POST, PATCH, DELETE)
 * @param array|null  $payload  Données à envoyer en JSON
 * @param string|null $accessToken Token d'accès PayPal (optionnel)
 *
 * @return array      Résultat de la requête avec code HTTP et réponse décodée
 * @throws Exception  En cas d'erreur lors de la requête
 */
function paypalApiRequest($endpoint, $method = 'GET', $payload = null, $accessToken = null) {
    $ch = curl_init($endpoint);
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
    ];

    if ($accessToken) {
        $headers[] = 'Authorization: Bearer ' . $accessToken;
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    switch (strtoupper($method)) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($payload) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            }
            break;
        case 'PATCH':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
            if ($payload) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            }
            break;
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
            break;
        case 'GET':
            // Par défaut, cURL fait un GET
            break;
        default:
            throw new Exception("Méthode HTTP non supportée.");
    }

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        curl_close($ch);
        throw new Exception("Erreur cURL: " . $error_msg);
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code'     => $httpCode,
        'response' => json_decode($response, true)
    ];
}

/**
 * Fonction pour obtenir un access token PayPal
 *
 * @return string Token d'accès PayPal
 * @throws Exception En cas d'erreur lors de l'obtention du token
 */
function getPaypalAccessToken() {
    // Vérifier si un token valide est déjà stocké dans la session
    if (
        isset($_SESSION['paypal_access_token'], $_SESSION['paypal_token_expiry']) &&
        time() < $_SESSION['paypal_token_expiry']
    ) {
        return $_SESSION['paypal_access_token'];
    }

    // Obtenir un nouveau token
    $ch = curl_init(PAYPAL_API_URL . '/v1/oauth2/token');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Accept-Language: en_US',
    ]);
    curl_setopt($ch, CURLOPT_USERPWD, PAYPAL_CLIENT_ID . ":" . PAYPAL_CLIENT_SECRET);
    curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        curl_close($ch);
        throw new Exception("Erreur cURL lors de l'obtention du token: " . $error_msg);
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("Erreur lors de l'obtention du token PayPal: HTTP $httpCode");
    }

    $result = json_decode($response, true);
    if (empty($result['access_token'])) {
        throw new Exception("Token PayPal non trouvé dans la réponse.");
    }

    // Stocker le token dans la session avec une durée de validité
    $_SESSION['paypal_access_token'] = $result['access_token'];
    $_SESSION['paypal_token_expiry'] = time() + $result['expires_in'] - 60; // Un peu avant expiration

    return $result['access_token'];
}

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Récupérer l'ID de l'abonnement dans l'URL
$subscriptionId = $_GET['subscription_id'] ?? null;
if (!$subscriptionId) {
    die($lang_data['paypal_return_no_subscription_id'] ?? "Erreur : Aucun ID d'abonnement fourni.");
}

// Vérifier que l'abonnement appartient à l'utilisateur
try {
    $stmt = $pdo->prepare("SELECT * FROM Users WHERE uuid = :uuid AND subscription_id = :sub_id");
    $stmt->execute([
        'uuid' => $_SESSION['user_uuid'],
        'sub_id' => $subscriptionId
    ]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        die($lang_data['paypal_return_invalid_sub_for_user'] ?? "Erreur : Abonnement non valide pour cet utilisateur.");
    }
} catch (PDOException $e) {
    error_log("Erreur DB (paypalReturn.php - Vérification abonnement): " . $e->getMessage());
    die($lang_data['paypal_return_db_error'] ?? "Erreur lors de la vérification de l'abonnement.");
}

// Obtenir un token d'accès PayPal
try {
    $accessToken = getPaypalAccessToken();
} catch (Exception $e) {
    die($lang_data['paypal_return_token_error'] ?? "Erreur : impossible d'obtenir un token PayPal");
}

// Vérifier l'état de l'abonnement
try {
    $response = paypalApiRequest(
        PAYPAL_API_URL . "/v1/billing/subscriptions/$subscriptionId",
        'GET',
        null,
        $accessToken
    );
} catch (Exception $e) {
    die(($lang_data['paypal_return_retrieval_error'] ?? "Erreur lors de la récupération de l'abonnement : ") .
        htmlspecialchars($e->getMessage()));
}

$subscription = $response['response'] ?? null;

if (isset($subscription['status']) && $subscription['status'] === 'ACTIVE') {
    // Mettre à jour l'état dans la base de données
    try {
        $stmt = $pdo->prepare("
            UPDATE Users
            SET subscription_status = 'active', subscription_id = :sub_id
            WHERE uuid = :uuid
        ");
        $stmt->execute([
            'sub_id' => $subscriptionId,
            'uuid'   => $_SESSION['user_uuid'],
        ]);
    } catch (PDOException $e) {
        error_log("Erreur DB (paypalReturn.php - Mise à jour abonnement): " . $e->getMessage());
        die($lang_data['paypal_return_update_db_error'] ?? "Erreur lors de la mise à jour de l'abonnement.");
    }

    // Afficher une page de confirmation pendant 5 secondes et rediriger vers le dashboard
    $secondsBeforeRedirect = 5; // Personnalisable
    $dashboardUrl          = 'https://wanatest.com/app/dashboard.php';

    // Préparation du message avec sprintf pour insérer le nombre de secondes
    $redirectMessage = sprintf(
        $lang_data['paypal_return_redirect_message'] ?? "Vous serez redirigé dans %s secondes.",
        $secondsBeforeRedirect
    );
    ?>
    <!DOCTYPE html>
    <html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'fr') ?>">
    <head>
        <meta charset="UTF-8" />
        <title><?= htmlspecialchars($lang_data['paypal_return_page_title'] ?? 'Confirmation de paiement') ?></title>
        <!-- Redirection automatique après X secondes -->
        <meta http-equiv="refresh" content="<?= $secondsBeforeRedirect ?>;url=<?= htmlspecialchars($dashboardUrl) ?>" />
        <!-- Optionnel : liens CSS -->
        <link rel="stylesheet" href="path/to/bootstrap.css">
    </head>
    <body class="list-container">
        <div class="container mt-5">
            <div class="alert alert-success text-center">
                <h2><?= htmlspecialchars($lang_data['paypal_return_payment_confirmed_title'] ?? 'Paiement confirmé !') ?></h2>
                <p>
                    <?= htmlspecialchars($lang_data['paypal_return_payment_confirmed_text'] ?? 'Merci pour votre abonnement.') ?>
                    <br>
                    <?= htmlspecialchars($redirectMessage) ?>
                </p>
                <p>
                    <?= htmlspecialchars($lang_data['paypal_return_redirect_alternative'] ?? "Si vous n'êtes pas redirigé, ") ?>
                    <a href="<?= htmlspecialchars($dashboardUrl) ?>">
                        <?= htmlspecialchars($lang_data['paypal_return_click_here'] ?? 'cliquez ici') ?>
                    </a>
                </p>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit();
} else {
    die($lang_data['paypal_return_not_active'] ?? "Erreur : L'abonnement n'est pas actif.");
}
