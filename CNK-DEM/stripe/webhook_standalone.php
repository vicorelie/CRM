<?php
/**
 * Webhook Stripe - Version autonome (sans dependances VTiger)
 *
 * URL: https://crm.cnkdem.com/stripe/webhook_standalone.php
 */

// Log immediat pour debug
file_put_contents('/tmp/stripe_webhook_debug.log', date('Y-m-d H:i:s') . " - Webhook appele\n", FILE_APPEND);

// Charger la config Stripe
$stripeConfig = require(__DIR__ . '/config.php');

// Charger le SDK Stripe
require_once(dirname(__DIR__) . '/libraries/stripe/init.php');

// Initialiser Stripe
$mode = $stripeConfig['mode'];
$apiKey = $stripeConfig['api_keys'][$mode]['secret_key'];
\Stripe\Stripe::setApiKey($apiKey);

// Logger un message
function logStripe($message, $level = 'info') {
    global $stripeConfig;
    if (!$stripeConfig['logging']['enabled']) return;

    $logFile = $stripeConfig['logging']['file'];
    $logDir = dirname($logFile);

    if (!file_exists($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] [$level] $message\n", FILE_APPEND);
}

// Connexion MySQL directe
function getDbConnection() {
    // Charger la config VTiger pour les credentials DB
    global $dbconfig;

    if (!isset($dbconfig)) {
        chdir(dirname(__DIR__));
        require_once('config.inc.php');
    }

    try {
        // Support pour socket Unix ou host TCP
        $dsn = "mysql:dbname={$dbconfig['db_name']};charset=utf8mb4";
        if (isset($dbconfig['db_server']) && $dbconfig['db_server']) {
            $dsn = "mysql:host={$dbconfig['db_server']};dbname={$dbconfig['db_name']};charset=utf8mb4";
        }

        $pdo = new PDO(
            $dsn,
            $dbconfig['db_username'],
            $dbconfig['db_password'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        return $pdo;
    } catch (PDOException $e) {
        logStripe("ERREUR DB: " . $e->getMessage(), 'error');
        throw $e;
    }
}

// Recuperer le payload
$payload = @file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

logStripe("=== Nouveau webhook recu ===");
logStripe("Signature: " . substr($sig_header, 0, 20) . "...");

try {
    // Verifier la signature
    $webhookSecret = $stripeConfig['webhook']['secret'];
    $event = \Stripe\Webhook::constructEvent($payload, $sig_header, $webhookSecret);

    logStripe("Event type: " . $event->type);

    // Traiter l'evenement
    switch ($event->type) {
        case 'checkout.session.completed':
            logStripe("Traitement checkout.session.completed");
            handleCheckoutSessionCompleted($event->data->object, $stripeConfig);
            break;

        case 'payment_intent.succeeded':
            logStripe("Traitement payment_intent.succeeded");
            logStripe("Montant: " . ($event->data->object->amount / 100) . " EUR");
            break;

        case 'payment_intent.payment_failed':
            logStripe("Traitement payment_intent.payment_failed", 'error');
            break;

        default:
            logStripe("Type d'evenement non gere: " . $event->type);
    }

    http_response_code(200);
    echo json_encode(['status' => 'success']);

} catch (\Stripe\Exception\SignatureVerificationException $e) {
    logStripe("ERREUR: Signature invalide - " . $e->getMessage(), 'error');
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature']);
    exit();

} catch (Exception $e) {
    logStripe("ERREUR: " . $e->getMessage(), 'error');
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
    exit();
}

/**
 * Gerer la session de paiement terminee
 */
function handleCheckoutSessionCompleted($session, $config) {
    logStripe("Checkout session: " . $session->id);

    $metadata = $session->metadata;
    logStripe("Metadata: " . json_encode($metadata));

    $quoteId = $metadata->quote_id ?? null;
    $paymentType = $metadata->payment_type ?? null;

    if (!$quoteId || !$paymentType) {
        logStripe("ERREUR: Metadonnees manquantes", 'error');
        return;
    }

    logStripe("Quote ID: $quoteId, Payment Type: $paymentType");

    // Mettre a jour le statut
    updatePaymentStatus($quoteId, $paymentType, 'Paye', $config);

    // Creer une note
    createPaymentNote($quoteId, $paymentType, 'Paye', $session);
}

/**
 * Mettre a jour le statut de paiement
 */
function updatePaymentStatus($quoteId, $paymentType, $status, $config) {
    logStripe("updatePaymentStatus: quoteId=$quoteId, type=$paymentType, status=$status");

    $fields = $config['vtiger_fields']['quotes'];

    if ($paymentType === 'Acompte') {
        $statusField = $fields['statut_acompte'];
    } elseif ($paymentType === 'Solde') {
        $statusField = $fields['statut_solde'];
    } else {
        logStripe("ERREUR: Type inconnu: $paymentType", 'error');
        return;
    }

    logStripe("Champ a mettre a jour: $statusField");

    try {
        $pdo = getDbConnection();

        $sql = "UPDATE vtiger_quotescf SET $statusField = ? WHERE quoteid = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$status, $quoteId]);

        logStripe("Statut mis a jour avec succes (lignes affectees: " . $stmt->rowCount() . ")");

    } catch (Exception $e) {
        logStripe("ERREUR update: " . $e->getMessage(), 'error');
    }
}

/**
 * Creer une note de paiement dans le champ Commentaire stripe
 */
function createPaymentNote($quoteId, $paymentType, $status, $session) {
    logStripe("createPaymentNote: quoteId=$quoteId, type=$paymentType");

    try {
        $pdo = getDbConnection();

        $amount = ($session->amount_total / 100);
        $currency = strtoupper($session->currency);

        // Creer le nouveau commentaire
        $newComment = "[" . date('Y-m-d H:i:s') . "] Paiement $paymentType recu via Stripe\n";
        $newComment .= "Montant: $amount $currency - Statut: $status\n";
        $newComment .= "Session ID: " . $session->id . "\n";

        // Recuperer le contenu actuel du champ
        $stmt = $pdo->prepare("SELECT cf_1087 FROM vtiger_quotescf WHERE quoteid = ?");
        $stmt->execute([$quoteId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $currentContent = $result['cf_1087'] ?? '';

        // Ajouter le nouveau commentaire au debut
        $updatedContent = $newComment;
        if (!empty($currentContent)) {
            $updatedContent .= "\n---\n\n" . $currentContent;
        }

        // Mettre a jour le champ
        $stmt = $pdo->prepare("UPDATE vtiger_quotescf SET cf_1087 = ? WHERE quoteid = ?");
        $stmt->execute([$updatedContent, $quoteId]);

        logStripe("Commentaire Stripe mis a jour avec succes (lignes affectees: " . $stmt->rowCount() . ")");

    } catch (Exception $e) {
        logStripe("ERREUR commentaire: " . $e->getMessage(), 'error');
    }
}
