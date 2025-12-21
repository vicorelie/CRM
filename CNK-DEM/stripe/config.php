<?php
/**
 * Configuration Stripe pour CNK-DEM
 *
 * Ce fichier contient TOUTES les configurations Stripe
 */

return [
    // ==================== MODE ====================
    // 'test' pour les tests, 'live' pour la production
    'mode' => 'test',

    // ==================== CLÉS API ====================
    'api_keys' => [
        'test' => [
            'secret_key' => 'sk_test_51SgYFzAj79AKQGHVeADffhoKoANzwLy1OCWMF1Tv89NyTUfY5X0r71mySEiEQoxCmccj2TLnSUMnlGkXseokR7w200MvMMkzAc',
            'publishable_key' => 'pk_test_51SgYFzAj79AKQGHV9XLSrOSQt62jRggZmASC3Jw9sIUNanzcEQY6X3u8eMwDh317oho8DOXHTXSNnuieDeD4A3gG00iH8c8XF1',
        ],
        'live' => [
            'secret_key' => 'sk_live_VOTRE_CLE_SECRETE_PROD',
            'publishable_key' => 'pk_live_VOTRE_CLE_PUBLIQUE_PROD',
        ],
    ],

    // ==================== WEBHOOK ====================
    'webhook' => [
        'url' => 'https://crm.cnkdem.com/stripe/webhook.php',
        'secret' => 'whsec_uM9PGTDavQfdB2qQ4xED0MzYo49Mn7NJ',
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
        'after_completion_redirect' => 'https://crm.cnkdem.com/index.php?module=Quotes&view=Detail&record={RECORD_ID}',
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
        'admin_email' => 'contact@cnk-dem.com',
        'from_email' => 'contact@cnk-dem.com',
    ],
];
