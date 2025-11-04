<?php
// paypalWebhook.php

require 'config.php';       // Connexion à la base de données (PDO : $pdo)
require 'paypalConfig.php'; // Fichier contenant vos constantes PayPal

/**
 * Obtient un access token PayPal pour la validation du Webhook.
 * Cet appel doit être fait en Basic Auth + form-data (grant_type=client_credentials).
 *
 * @return string
 * @throws Exception
 */
function getPaypalAccessTokenForWebhookValidation() {
    $ch = curl_init(PAYPAL_API_URL . '/v1/oauth2/token');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Accept-Language: en_US',
        'Content-Type: application/x-www-form-urlencoded',
    ]);
    // Authentification Basic
    curl_setopt($ch, CURLOPT_USERPWD, PAYPAL_CLIENT_ID . ":" . PAYPAL_CLIENT_SECRET);
    curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception("Erreur cURL lors de l'obtention du token: " . $err);
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("Impossible d'obtenir un token PayPal (HTTP $httpCode).");
    }

    $data = json_decode($response, true);
    if (empty($data['access_token'])) {
        throw new Exception("Access token introuvable dans la réponse PayPal.");
    }

    return $data['access_token'];
}

/**
 * Effectue une requête à l’API PayPal (pour la validation du webhook, etc.).
 *
 * @param string      $endpoint
 * @param string      $method
 * @param array|null  $payload
 * @param string|null $accessToken
 *
 * @return array { 'code' => int, 'response' => mixed }
 * @throws Exception
 */
function paypalApiRequest($endpoint, $method = 'GET', $payload = null, $accessToken = null) {
    $ch = curl_init($endpoint);
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];

    if ($accessToken) {
        $headers[] = 'Authorization: Bearer ' . $accessToken;
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    switch (strtoupper($method)) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($payload !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            }
            break;
        case 'PATCH':
        case 'PUT':
        case 'DELETE':
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            if ($payload !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            }
            break;
        case 'GET':
            // GET par défaut
            break;
        default:
            throw new Exception("Méthode HTTP non supportée : $method");
    }

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception("Erreur cURL: " . $err);
    }

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code'     => $httpCode,
        'response' => json_decode($response, true)
    ];
}

// --- Lecture du corps de la notification PayPal ---
$body = file_get_contents('php://input');
$data = json_decode($body, true);

// Journaliser l’arrivée du webhook
file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Received webhook: " . $body . PHP_EOL, FILE_APPEND);

// Vérifier que la notification contient au moins 'event_type' et 'resource'
if (empty($data['event_type']) || empty($data['resource'])) {
    file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Invalid webhook data.\n", FILE_APPEND);
    http_response_code(400);
    exit('Invalid webhook data');
}

$eventType = $data['event_type'];
$resource  = $data['resource'];

// Récupérer les en-têtes (pour la signature)
$headers = getallheaders();
file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Webhook headers: " . json_encode($headers) . PHP_EOL, FILE_APPEND);

// Préparer la validation de la signature
$validationPayload = [
    'auth_algo'         => $headers['PAYPAL-AUTH-ALGO']         ?? '',
    'cert_url'          => $headers['PAYPAL-CERT-URL']          ?? '',
    'transmission_id'   => $headers['PAYPAL-TRANSMISSION-ID']   ?? '',
    'transmission_sig'  => $headers['PAYPAL-TRANSMISSION-SIG']  ?? '',
    'transmission_time' => $headers['PAYPAL-TRANSMISSION-TIME'] ?? '',
    'webhook_id'        => PAYPAL_WEBHOOK_ID, // L'ID exact de votre webhook configuré sur PayPal
    'webhook_event'     => $data
];

// Obtenir un token PayPal pour valider la signature
try {
    $accessToken = getPaypalAccessTokenForWebhookValidation();
} catch (Exception $e) {
    file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Token error: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
    http_response_code(400);
    exit('Webhook token error');
}

// Valider la signature auprès de PayPal
try {
    $validationResponse = paypalApiRequest(
        PAYPAL_API_URL . '/v1/notifications/verify-webhook-signature',
        'POST',
        $validationPayload,
        $accessToken
    );
} catch (Exception $e) {
    file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Validation call failed: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
    http_response_code(400);
    exit('Webhook validation call failed');
}

// Vérifier la réponse de validation
if ($validationResponse['code'] !== 200 ||
    (empty($validationResponse['response']['verification_status']) ||
     $validationResponse['response']['verification_status'] !== 'SUCCESS')
) {
    file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Webhook signature invalid.\n", FILE_APPEND);
    http_response_code(400);
    exit('Webhook signature validation failed');
}

// Signature validée
file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Webhook signature validated.\n", FILE_APPEND);

// --- Traitement des événements de souscription ---

// Récupérer l'ID de la souscription (d'habitude dans $resource['id'])
$subscriptionId = $resource['id'] ?? null;

try {
    switch ($eventType) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
            // Souscription activée
            if ($subscriptionId) {
                $stmt = $pdo->prepare("
                    UPDATE Users
                    SET subscription_status = 'active'
                    WHERE subscription_id = :subscription_id
                ");
                $stmt->execute(['subscription_id' => $subscriptionId]);
                file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Subscription $subscriptionId activated.\n", FILE_APPEND);
            }
            break;

        case 'BILLING.SUBSCRIPTION.SUSPENDED':
            // Souscription suspendue
            if ($subscriptionId) {
                $stmt = $pdo->prepare("
                    UPDATE Users
                    SET subscription_status = 'suspended'
                    WHERE subscription_id = :subscription_id
                ");
                $stmt->execute(['subscription_id' => $subscriptionId]);
                file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Subscription $subscriptionId suspended.\n", FILE_APPEND);
            }
            break;

        case 'BILLING.SUBSCRIPTION.CANCELLED':
            // Souscription annulée
            if ($subscriptionId) {
                $stmt = $pdo->prepare("
                    UPDATE Users
                    SET subscription_status = 'cancelled'
                    WHERE subscription_id = :subscription_id
                ");
                $stmt->execute(['subscription_id' => $subscriptionId]);
                file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Subscription $subscriptionId cancelled.\n", FILE_APPEND);
            }
            break;

        // Vous pouvez gérer d’autres éventuels événements, ex. CREATED, RE-ACTIVATED, EXPIRED, etc.
        default:
            file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Event type $eventType ignored.\n", FILE_APPEND);
            break;
    }

    // Répondre à PayPal pour confirmer la réception
    file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - Webhook processed successfully.\n", FILE_APPEND);
    http_response_code(200);
    echo "OK";
    exit();
} catch (PDOException $e) {
    // Journaliser l'erreur de base de données
    error_log("Erreur DB (paypalWebhook.php): " . $e->getMessage());
    file_put_contents('webhook.log', date('Y-m-d H:i:s') . " - DB error: " . $e->getMessage() . PHP_EOL, FILE_APPEND);
    http_response_code(500);
    exit('Internal Server Error');
}
