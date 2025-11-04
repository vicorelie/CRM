<?php
// createSubscription.php
session_start();

require 'config.php';       // Fichier contenant la connexion PDO ($pdo)
require 'paypalConfig.php'; // Fichier de configuration PayPal

// --- (Optionnel) Activez l'affichage des erreurs en debug (désactivez-les en prod) ---
// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);

/**
 * Fonction helper pour obtenir le token PayPal.
 *
 * @return string
 * @throws Exception
 */
function getPaypalAccessToken() {
    // Si un token est déjà stocké et n'est pas expiré, on le réutilise
    if (isset($_SESSION['paypal_access_token'], $_SESSION['paypal_token_expiry']) &&
        time() < $_SESSION['paypal_token_expiry']
    ) {
        return $_SESSION['paypal_access_token'];
    }

    // Appel OAuth PayPal
    $ch = curl_init(PAYPAL_API_URL . '/v1/oauth2/token');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Accept-Language: en_US',
        'Content-Type: application/x-www-form-urlencoded',
    ]);
    // Authentification Basic
    curl_setopt($ch, CURLOPT_USERPWD, PAYPAL_CLIENT_ID . ":" . PAYPAL_CLIENT_SECRET);
    // Paramètres du POST (form-data)
    curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        curl_close($ch);
        throw new Exception("Erreur cURL lors de l'obtention du token PayPal: " . $error_msg);
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("Erreur lors de l'obtention du token PayPal: HTTP " . $httpCode);
    }

    $result = json_decode($response, true);
    if (empty($result['access_token'])) {
        throw new Exception("Le token PayPal est introuvable dans la réponse.");
    }

    // Stocker le token et sa date d'expiration dans la session
    $_SESSION['paypal_access_token'] = $result['access_token'];
    $_SESSION['paypal_token_expiry'] = time() + $result['expires_in'] - 60; // Un peu avant l'expiration

    return $result['access_token'];
}

/**
 * Fonction pour envoyer une requête à l’API PayPal.
 *
 * @param string     $endpoint     L'URL complète de l'endpoint.
 * @param string     $accessToken  Le token d'accès PayPal.
 * @param string     $method       Méthode HTTP (POST, GET, PATCH, etc.)
 * @param array|null $payload      Les données à envoyer (JSON), si nécessaire.
 *
 * @return array [ 'code' => (int), 'response' => (mixed) ]
 * @throws Exception
 */
function paypalApiRequest($endpoint, $accessToken, $method = 'POST', $payload = null) {
    $ch = curl_init($endpoint);

    $headers = [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json',
        'Accept: application/json'
    ];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    switch (strtoupper($method)) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if (!empty($payload)) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            }
            break;
        case 'PATCH':
        case 'PUT':
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            if (!empty($payload)) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            }
            break;
        case 'GET':
            // GET par défaut, pas de modification nécessaire
            break;
        default:
            throw new Exception("Méthode HTTP non supportée : $method");
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

// --- Vérifications préliminaires ---

// Vérifier que l'utilisateur est connecté
if (!isset($_SESSION['user_uuid'])) {
    header('Location: login.php');
    exit();
}

// Vérifier la requête et le token CSRF
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: payment.php?error=invalid_request_method');
    exit();
}
if (!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    header('Location: payment.php?error=invalid_csrf');
    exit();
}

// Vérifier le type d'abonnement
$subscriptionType = $_POST['subscription_type'] ?? '';
$validTypes       = ['monthly', 'annual'];
if (!in_array($subscriptionType, $validTypes, true)) {
    header('Location: payment.php?error=invalid_subscription_type');
    exit();
}

// Sélectionner le PLAN_ID
$planId = ($subscriptionType === 'monthly') ? PAYPAL_PLAN_ID_MONTHLY : PAYPAL_PLAN_ID_ANNUAL;

// --- Créer la souscription PayPal ---

// 1. Obtenir un token d'accès
try {
    $accessToken = getPaypalAccessToken();
} catch (Exception $e) {
    error_log("Erreur PayPal (createSubscription.php -> getPaypalAccessToken): " . $e->getMessage());
    header('Location: payment.php?error=paypal_token_failed&details=' . urlencode($e->getMessage()));
    exit();
}

// 2. Préparer les données de souscription
$subscriptionData = [
    "plan_id" => $planId,
    "application_context" => [
        "brand_name"  => PAYPAL_BRAND_NAME,
        "locale"      => PAYPAL_LOCALE,
        "user_action" => "SUBSCRIBE_NOW",
        "return_url"  => PAYPAL_RETURN_URL,
        "cancel_url"  => PAYPAL_CANCEL_URL
    ]
];

// 3. Appeler l'endpoint PayPal pour créer la souscription
try {
    $response = paypalApiRequest(
        PAYPAL_API_URL . '/v1/billing/subscriptions',
        $accessToken,
        'POST',
        $subscriptionData
    );
} catch (Exception $e) {
    error_log("Erreur API PayPal (createSubscription.php -> paypalApiRequest): " . $e->getMessage());
    header('Location: payment.php?error=subscription_creation_failed&details=' . urlencode($e->getMessage()));
    exit();
}

$createSub = $response['response'];
$httpCode  = $response['code'];

// Vérifier le code de réponse
if ($httpCode !== 201 || empty($createSub['links'])) {
    error_log("Erreur lors de la création de l'abonnement: HTTP $httpCode, Réponse: " . json_encode($createSub));
    header('Location: payment.php?error=subscription_creation_failed');
    exit();
}

// 4. Récupérer le lien "approve" dans la réponse PayPal
$approvalUrl = '';
foreach ($createSub['links'] as $link) {
    if (!empty($link['rel']) && $link['rel'] === 'approve') {
        $approvalUrl = $link['href'];
        break;
    }
}

// Si le lien d'approbation n'existe pas, renvoyer une erreur
if (empty($approvalUrl)) {
    header('Location: payment.php?error=approval_link_not_found');
    exit();
}

// (Optionnel) Enregistrer l'ID de la souscription en base avant la redirection
try {
    $stmt = $pdo->prepare("
        UPDATE Users
        SET subscription_id = :subid,
            subscription_status = 'pending'
        WHERE uuid = :uuid
    ");
    $stmt->execute([
        'subid' => $createSub['id'],
        'uuid'  => $_SESSION['user_uuid']
    ]);
} catch (PDOException $e) {
    error_log("Erreur DB (createSubscription.php - update subscription): " . $e->getMessage());
    // Vous pouvez continuer ou rediriger selon votre logique
}

// 5. Rediriger l'utilisateur vers PayPal pour qu'il approuve la souscription
header('Location: ' . $approvalUrl);
exit();
