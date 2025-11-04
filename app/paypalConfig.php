<?php
// paypalConfig.php

require 'vendor/autoload.php'; // Assurez-vous que Composer a généré ce fichier

use Dotenv\Dotenv;

// Charger les variables d'environnement depuis le fichier .env
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Empêcher l'accès direct au fichier
if (basename(__FILE__) == basename($_SERVER['PHP_SELF'])) {
    http_response_code(403);
    exit('Accès interdit.');
}

// Identifiants de votre application PayPal (REST API)
define('PAYPAL_CLIENT_ID', $_ENV['PAYPAL_CLIENT_ID'] ?? '');
define('PAYPAL_CLIENT_SECRET', $_ENV['PAYPAL_CLIENT_SECRET'] ?? '');

// Mode : 'sandbox' ou 'live'
define('PAYPAL_MODE', $_ENV['PAYPAL_MODE'] ?? 'live'); // Changez en 'live' en production

// URL de base de l'API PayPal (sandbox vs live)
if (PAYPAL_MODE === 'sandbox') {
    define('PAYPAL_API_URL', 'https://api-m.sandbox.paypal.com');
} else {
    define('PAYPAL_API_URL', 'https://api-m.paypal.com');
}

// URL de retour après abonnement (quand PayPal renvoie l'utilisateur)
define('PAYPAL_RETURN_URL', 'https://wanatest.com/app/paypalReturn.php');

// URL d'annulation
define('PAYPAL_CANCEL_URL', 'https://wanatest.com/app/paypalCancel.php');

// URL du webhook (pour notifications de paiement)
define('PAYPAL_WEBHOOK_URL', 'https://wanatest.com/app/paypalWebhook.php');

// ID des plans PayPal (à créer dans PayPal et à insérer ici)
define('PAYPAL_PLAN_ID_MONTHLY', 'P-0YB63113TG9164313M6AR23I'); // Remplacez par votre PLAN_ID mensuel P-13J69014CV996281BM6BK4EQ
define('PAYPAL_PLAN_ID_ANNUAL', 'P-44832832EB091042GM6B54LI');  // Remplacez par votre PLAN_ID annuel P-13J69014CV996281BM6BK4EQ

// Paramètres optionnels pour votre intégration
// Nom de votre marque ou entreprise qui sera affiché dans PayPal
define('PAYPAL_BRAND_NAME', 'WANATEST');

// Langue par défaut de l'interface PayPal pour vos utilisateurs
define('PAYPAL_LOCALE', 'he-IL');
// define('PAYPAL_LOCALE', 'fr-FR');

// ID du webhook PayPal (à définir dans vos variables d'environnement)
define('PAYPAL_WEBHOOK_ID', $_ENV['PAYPAL_WEBHOOK_ID'] ?? '');
if (empty(PAYPAL_WEBHOOK_ID)) {
    die('Erreur de configuration PayPal : Webhook ID manquant.');
}

// Vérification des configurations nécessaires
if (empty(PAYPAL_CLIENT_ID) || empty(PAYPAL_CLIENT_SECRET)) {
    die('Erreur de configuration PayPal : Identifiants manquants.');
}

?>
