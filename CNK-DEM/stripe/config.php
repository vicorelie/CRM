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
            'secret_key' => 'sk_test_51SglQ9Dl2HMKNpLg4d75DN6H1lToHEHDvLNTPKTJuVSP0AjG9n5Se4mKqFMMvqIuH4Sr479J8pkzZd37lB4xM9XQ00biXwBYKe',
            'publishable_key' => 'pk_test_51SglQ9Dl2HMKNpLgI4MXgBBfpKHgOAx9gus4Xu8aYLH3tcH1zNLKqiDsQyGHLqtpmBUcSmS0TyoEtGDxOHkRRSL800MiXVkLu8',
        ],
        'live' => [
            'secret_key' => 'sk_live_VOTRE_CLE_SECRETE_PROD',
            'publishable_key' => 'pk_live_VOTRE_CLE_PUBLIQUE_PROD',
        ],
    ],

    // ==================== WEBHOOK ====================
    'webhook' => [
        'url' => 'https://crm.cnkdem.com/stripe/webhook_standalone.php',
        'secret' => 'whsec_XFlNKD8Tcm7MGt4aFDy0nrsGdeH2JdXz',
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
