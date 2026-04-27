<?php
/**
 * Configuration Stripe pour CNK-DEM
 *
 * Les clés sensibles sont lues depuis le fichier .env
 * Ne JAMAIS commiter de clés API dans ce fichier
 */

// Load .env file
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!getenv($key)) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

return [
    // ==================== MODE ====================
    // 'test' pour les tests, 'live' pour la production
    'mode' => getenv('STRIPE_MODE') ?: 'test',

    // ==================== CLÉS API ====================
    'api_keys' => [
        'test' => [
            'secret_key' => getenv('STRIPE_TEST_SECRET_KEY') ?: '',
            'publishable_key' => getenv('STRIPE_TEST_PUBLISHABLE_KEY') ?: '',
        ],
        'live' => [
            'secret_key' => getenv('STRIPE_LIVE_SECRET_KEY') ?: '',
            'publishable_key' => getenv('STRIPE_LIVE_PUBLISHABLE_KEY') ?: '',
        ],
    ],

    // ==================== WEBHOOK ====================
    'webhook' => [
        'url' => 'https://crm.expertdem.com/stripe/webhook_standalone.php',
        'secret' => (getenv('STRIPE_MODE') === 'live')
            ? (getenv('STRIPE_LIVE_WEBHOOK_SECRET') ?: '')
            : (getenv('STRIPE_TEST_WEBHOOK_SECRET') ?: ''),
        'events' => [
            'checkout.session.completed',
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
        ],
    ],

    // ==================== CHAMPS VTIGER ====================
    'vtiger_fields' => [
        'quotes' => [
            'lien_acompte' => 'cf_1079',
            'lien_solde' => 'cf_1081',
            'statut_acompte' => 'cf_1083',
            'statut_solde' => 'cf_1085',
            'total_acompte' => 'cf_1055',
            'total_solde' => 'cf_1057',
        ],
    ],

    // ==================== OPTIONS PAIEMENT ====================
    'payment_options' => [
        'currency' => 'eur',
        'allow_promotion_codes' => false,
        'billing_address_collection' => 'required',
        'shipping_address_collection' => [
            'allowed_countries' => ['FR'],
        ],
        'after_completion_redirect' => 'https://crm.expertdem.com/index.php?module=Quotes&view=Detail&record={RECORD_ID}',
    ],

    // ==================== LOGS ====================
    'logging' => [
        'enabled' => true,
        'file' => __DIR__ . '/logs/stripe.log',
        'level' => 'debug', // debug, info, error
    ],

    // ==================== EMAILS ====================
    'emails' => [
        'send_payment_confirmation' => true,
        'admin_email' => 'contact@expertdem.com',
        'from_email' => 'contact@expertdem.com',
    ],
];
