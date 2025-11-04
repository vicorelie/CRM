<?php
// manageSubscription.php
session_start();

require 'config.php';
require 'paypalConfig.php';

/**
 * Fonction helper pour les requêtes API PayPal
 *
 * @param string $endpoint URL de l'API PayPal
 * @param string $method Méthode HTTP (GET, POST, PATCH, DELETE)
 * @param array|null $payload Données à envoyer en JSON
 * @param string $accessToken Token d'accès PayPal
 * @return array Résultat de la requête avec code HTTP et réponse décodée
 * @throws Exception En cas d'erreur lors de la requête
 */
function paypalApiRequest($endpoint, $method = 'POST', $payload = null, $accessToken) {
    $ch = curl_init($endpoint);
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $accessToken,
    ];

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
            // Par défaut, cURL effectue un GET
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

    return ['code' => $httpCode, 'response' => json_decode($response, true)];
}

/**
 * Fonction pour obtenir un access token PayPal
 *
 * @return string Token d'accès PayPal
 * @throws Exception En cas d'erreur lors de l'obtention du token
 */
function getPaypalAccessToken() {
    if (isset($_SESSION['paypal_access_token']) && isset($_SESSION['paypal_token_expiry']) && time() < $_SESSION['paypal_token_expiry']) {
        return $_SESSION['paypal_access_token'];
    }

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
    if (!isset($result['access_token'])) {
        throw new Exception("Token PayPal non trouvé dans la réponse.");
    }

    $_SESSION['paypal_access_token'] = $result['access_token'];
    $_SESSION['paypal_token_expiry'] = time() + $result['expires_in'] - 60;

    return $result['access_token'];
}

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Récupérer l'action et valider
$validActions = ['cancel', 'suspend', 'activate'];
$action = $_POST['action'] ?? '';

if (!in_array($action, $validActions, true)) {
    header('Location: profile.php?error=UnknownAction');
    exit();
}

// Récupérer les détails de l'utilisateur
try {
    $stmtUser = $pdo->prepare("SELECT subscription_id, subscription_status FROM Users WHERE uuid = :uuid");
    $stmtUser->execute(['uuid' => $_SESSION['user_uuid']]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log("Erreur DB (manageSubscription.php - Récupérer utilisateur): " . $e->getMessage());
    header('Location: profile.php?error=DBError');
    exit();
}

if (!$user || empty($user['subscription_id'])) {
    header('Location: profile.php?error=NoSubscription');
    exit();
}

$subscriptionId = $user['subscription_id'];

try {
    $accessToken = getPaypalAccessToken();
} catch (Exception $e) {
    error_log("Erreur PayPal (manageSubscription.php - getAccessToken): " . $e->getMessage());
    header('Location: profile.php?error=paypal_token');
    exit();
}

// (Optionnel) Vérifier l'état actuel de l'abonnement depuis PayPal pour l'action 'suspend'
if ($action === 'suspend') {
    $detailsEndpoint = PAYPAL_API_URL . "/v1/billing/subscriptions/{$subscriptionId}";
    try {
        $detailsResponse = paypalApiRequest($detailsEndpoint, 'GET', null, $accessToken);
    } catch (Exception $e) {
        error_log("Erreur API PayPal (GET subscription details): " . $e->getMessage());
        header('Location: profile.php?error=paypal_api_details');
        exit();
    }
    $currentStatus = strtoupper($detailsResponse['response']['status'] ?? '');
    if ($currentStatus !== 'ACTIVE') {
        // L'action de suspension n'est possible que si l'abonnement est actif
        header('Location: profile.php?error=invalid_state_for_suspend');
        exit();
    }
}

// Construire l'endpoint et le payload selon l'action
switch ($action) {
    case 'cancel':
        $endpoint = PAYPAL_API_URL . "/v1/billing/subscriptions/{$subscriptionId}/cancel";
        $payload = ["reason" => "User requested subscription cancellation."];
        $newStatus = 'cancelled';
        break;

    case 'suspend':
        $endpoint = PAYPAL_API_URL . "/v1/billing/subscriptions/{$subscriptionId}/suspend";
        $payload = ["reason" => "User requested subscription suspension."];
        $newStatus = 'suspended';
        break;

    case 'activate':
        $endpoint = PAYPAL_API_URL . "/v1/billing/subscriptions/{$subscriptionId}/activate";
        $payload = ["reason" => "User requested subscription reactivation."];
        $newStatus = 'active';
        break;

    default:
        header('Location: profile.php?error=UnknownAction');
        exit();
}

// Appeler l'API PayPal
try {
    $response = paypalApiRequest($endpoint, 'POST', $payload, $accessToken);
} catch (Exception $e) {
    error_log("Erreur API PayPal (manageSubscription.php - API call): " . $e->getMessage());
    header("Location: profile.php?error=paypal_api_call&details=" . urlencode($e->getMessage()));
    exit();
}

// Vérifier la réponse PayPal
if ($response['code'] === 204) { // Succès (204 No Content)
    try {
        $stmtUpdate = $pdo->prepare("UPDATE Users SET subscription_status = :newStatus WHERE uuid = :uuid");
        $stmtUpdate->execute([
            'newStatus' => $newStatus,
            'uuid'      => $_SESSION['user_uuid'],
        ]);

        header("Location: profile.php?success=$action");
        exit();
    } catch (PDOException $e) {
        error_log("Erreur DB (manageSubscription.php - Update): " . $e->getMessage());
        header("Location: profile.php?error=DBUpdate&details=" . urlencode($e->getMessage()));
        exit();
    }
} else {
    $paypalError = $response['response'];
    $errorMessage = $paypalError['message'] ?? 'Unknown error';
    header("Location: profile.php?error=paypal_api&details=" . urlencode($errorMessage));
    exit();
}
?>
