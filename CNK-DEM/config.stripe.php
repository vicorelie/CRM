<?php
/**
 * ⚠️ FICHIER OBSOLÈTE - NE PLUS UTILISER ⚠️
 *
 * Ce fichier est conservé pour compatibilité mais n'est plus utilisé.
 *
 * Utilisez maintenant : /var/www/CNK-DEM/stripe/config.php
 *
 * Documentation : /var/www/CNK-DEM/stripe/STRUCTURE.md
 */

/**
 * Configuration Stripe pour CNK-DEM
 *
 * IMPORTANT: Remplacez les clés ci-dessous par vos clés Stripe
 * - Pour les tests: utilisez les clés commençant par "sk_test_" et "pk_test_"
 * - Pour la production: utilisez les clés commençant par "sk_live_" et "pk_live_"
 */

return [
    // Mode: 'test' ou 'live'
    'mode' => 'test',

    // Clés API Stripe TEST
    'test' => [
        'secret_key' => 'sk_test_VOTRE_CLE_SECRETE_ICI',  // À remplacer
        'publishable_key' => 'pk_test_VOTRE_CLE_PUBLIQUE_ICI',  // À remplacer
    ],

    // Clés API Stripe LIVE (production)
    'live' => [
        'secret_key' => 'sk_live_VOTRE_CLE_SECRETE_ICI',  // À remplacer plus tard
        'publishable_key' => 'pk_live_VOTRE_CLE_PUBLIQUE_ICI',  // À remplacer plus tard
    ],

    // URL de webhook (à configurer dans Stripe)
    'webhook_url' => 'https://crm-cnk.webama.fr/stripe_webhook.php',

    // Secret du webhook Stripe (généré par Stripe)
    'webhook_secret' => 'whsec_VOTRE_SECRET_WEBHOOK_ICI',  // À remplacer

    // Champs custom VTiger pour les Devis
    'quote_fields' => [
        'lien_acompte' => 'cf_1079',
        'lien_solde' => 'cf_1081',
        'statut_acompte' => 'cf_1083',
        'statut_solde' => 'cf_1085',
        'total_acompte' => 'cf_1055',
        'total_solde' => 'cf_1057',
    ],

    // Options des liens de paiement
    'payment_link_options' => [
        'allow_promotion_codes' => false,
        'billing_address_collection' => 'required',
        'shipping_address_collection' => [
            'allowed_countries' => ['FR'],
        ],
    ],
];
