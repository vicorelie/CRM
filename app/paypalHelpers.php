<?php
// paypalHelpers.php

require_once 'paypalConfig.php';

/**
 * Effectue une requête API vers PayPal.
 *
 * @param string      $endpoint    L'URL de l'API.
 * @param string      $method      La méthode HTTP (GET, POST, PATCH, DELETE).
 * @param mixed       $payload     Les données à envoyer (tableau ou chaîne selon $isForm).
 * @param string|null $accessToken Le token d'accès, si nécessaire.
 * @param bool        $isForm      Définit si le payload doit être envoyé en x-www-form-urlencoded.
 *
 * @return array Tableau associatif contenant le code HTTP et la réponse décodée.
 *
 * @throws Exception En cas d'erreur cURL ou de méthode HTTP non supportée.
 */
function paypalApiRequest($endpoint, $method = 'GET', $payload = null, $accessToken = null, $isForm = false) {
    $ch = curl_init($endpoint);
    $headers = [
        'Accept: application/json',
    ];

    // Définir le type de contenu selon le format attendu
    if ($isForm) {
        $headers[] = 'Content-Type: application/x-www-form-urlencoded';
    } else {
        $headers[] = 'Content-Type: application/json';
    }

    if ($accessToken) {
        $headers[] = 'Authorization: Bearer ' . $accessToken;
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    switch (strtoupper($method)) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($payload) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $isForm ? $payload : json_encode($payload));
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
            // GET par défaut, aucune configuration supplémentaire
            break;
        default:
            throw new Exception("Méthode HTTP non supportée: $method");
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
 * Récupère le token d'accès PayPal.
 *
 * Le token est mis en cache dans la session jusqu'à son expiration.
 *
 * @return string Le token d'accès.
 *
 * @throws Exception En cas d'erreur lors de l'obtention du token.
 */
function getPaypalAccessToken() {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    if (isset($_SESSION['paypal_access_token']) && isset($_SESSION['paypal_token_expiry']) && time() < $_SESSION['paypal_token_expiry']) {
        return $_SESSION['paypal_access_token'];
    }

    $ch = curl_init(PAYPAL_API_URL . '/v1/oauth2/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, PAYPAL_CLIENT_ID . ":" . PAYPAL_CLIENT_SECRET);
    curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Accept-Language: en_US',
        'Content-Type: application/x-www-form-urlencoded'
    ]);

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
    $_SESSION['paypal_token_expiry'] = time() + $result['expires_in'] - 60; // Un peu avant expiration

    return $result['access_token'];
}
