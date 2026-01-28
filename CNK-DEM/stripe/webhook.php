<?php

/**
 * Webhook Stripe pour recevoir les notifications de paiement
 *
 * Ce fichier doit être accessible publiquement à l'URL:
 * https://crm.cnkdem.com/stripe/webhook.php
 *
 * Configurez cette URL dans votre tableau de bord Stripe:
 * https://dashboard.stripe.com/webhooks
 */

// Charger uniquement les dépendances nécessaires
chdir(dirname(__DIR__));

// Charger la config VTiger pour la base de données
require_once('config.inc.php');

// Charger la classe de base de données
require_once('include/database/PearDatabase.php');

// Charger le helper Stripe
require_once(__DIR__ . '/StripeHelper.php');

// Récupérer le payload du webhook
$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

// Log dans fichier temporaire pour déboguer
file_put_contents('/tmp/stripe_webhook_debug.log', date('Y-m-d H:i:s') . " - Webhook reçu\n", FILE_APPEND);

try {
    // Charger le helper Stripe
    StripeHelper::log("=== Nouveau webhook reçu ===");
    StripeHelper::log("Signature header: " . substr($sig_header, 0, 20) . "...");

    // Initialiser Stripe
    StripeHelper::init();

    // Récupérer le secret du webhook depuis la config
    $webhookSecret = StripeHelper::getConfig('webhook.secret');

    // Vérifier la signature du webhook
    $event = \Stripe\Webhook::constructEvent(
        $payload,
        $sig_header,
        $webhookSecret
    );

    StripeHelper::log("Event type: " . $event->type);

    // Traiter l'événement
    StripeHelper::log("Traitement de l'événement: " . $event->type);

    switch ($event->type) {
        case 'checkout.session.completed':
            StripeHelper::log("Appel de handleCheckoutSessionCompleted");
            handleCheckoutSessionCompleted($event->data->object);
            StripeHelper::log("handleCheckoutSessionCompleted terminé");
            break;

        case 'payment_intent.succeeded':
            StripeHelper::log("Appel de handlePaymentIntentSucceeded");
            handlePaymentIntentSucceeded($event->data->object);
            StripeHelper::log("handlePaymentIntentSucceeded terminé");
            break;

        case 'payment_intent.payment_failed':
            StripeHelper::log("Appel de handlePaymentIntentFailed");
            handlePaymentIntentFailed($event->data->object);
            StripeHelper::log("handlePaymentIntentFailed terminé");
            break;

        default:
            StripeHelper::log("Type d'événement non géré: " . $event->type);
    }

    // Répondre à Stripe
    http_response_code(200);
    echo json_encode(['status' => 'success']);

} catch (\Stripe\Exception\SignatureVerificationException $e) {
    StripeHelper::log("ERREUR: Signature invalide - " . $e->getMessage(), 'error');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature']);
    exit();

} catch (Exception $e) {
    StripeHelper::log("ERREUR: " . $e->getMessage(), 'error');
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit();
}

/**
 * Gérer la fin d'une session de paiement
 */
function handleCheckoutSessionCompleted($session) {
    StripeHelper::log("Checkout session completed: " . $session->id);

    // Récupérer les métadonnées
    $metadata = $session->metadata;

    // Log détaillé de toutes les métadonnées pour debug
    StripeHelper::log("Session metadata (raw): " . json_encode($metadata));

    $quoteId = $metadata->quote_id ?? null;
    $paymentType = $metadata->payment_type ?? null;

    if (!$quoteId || !$paymentType) {
        StripeHelper::log("ERREUR: Métadonnées manquantes - quote_id: " . var_export($quoteId, true) . ", payment_type: " . var_export($paymentType, true), 'error');
        return;
    }

    StripeHelper::log("Quote ID: $quoteId, Payment Type: $paymentType");

    // Mettre à jour le statut du paiement dans VTiger
    StripeHelper::log("Appel de updatePaymentStatus($quoteId, $paymentType, 'Payé')");
    StripeHelper::updatePaymentStatus($quoteId, $paymentType, 'Payé');
    StripeHelper::log("updatePaymentStatus terminé");

    // Créer une note de paiement
    StripeHelper::log("Appel de createPaymentNote($quoteId, $paymentType, 'Payé')");
    StripeHelper::createPaymentNote($quoteId, $paymentType, 'Payé', $session);
    StripeHelper::log("createPaymentNote terminé");

    // Créer automatiquement une facture
    StripeHelper::log("Appel de createInvoiceFromQuote($quoteId, $paymentType)");
    $invoiceId = StripeHelper::createInvoiceFromQuote($quoteId, $paymentType, $session);
    if ($invoiceId) {
        StripeHelper::log("✓ Facture créée automatiquement (ID: $invoiceId)");
    } else {
        StripeHelper::log("⚠ Échec de la création automatique de la facture", 'warning');
    }
}

/**
 * Gérer un paiement réussi
 */
function handlePaymentIntentSucceeded($paymentIntent) {
    StripeHelper::log("Payment intent succeeded: " . $paymentIntent->id);
    StripeHelper::log("Montant: " . ($paymentIntent->amount / 100) . " EUR");
}

/**
 * Gérer un paiement échoué
 */
function handlePaymentIntentFailed($paymentIntent) {
    StripeHelper::log("Payment intent failed: " . $paymentIntent->id, 'error');

    // TODO: Récupérer quote_id depuis les métadonnées et mettre à jour le statut en "Échoué"
    // Note: payment_intent n'a pas directement les métadonnées du payment link
    // Il faudrait récupérer la session associée pour avoir le quote_id
}
