<?php
/**
 * Script de test pour la création de facture
 */

// Mode test - ne pas traiter les webhooks
define('STRIPE_WEBHOOK_TEST_MODE', true);

// Charger le webhook
require_once('webhook_standalone.php');

echo "=== Test de création de facture ===" . PHP_EOL . PHP_EOL;

// Paramètres de test - utiliser un vrai paiement existant
$testQuoteId = 877;
$testPaymentId = 14;
$testAmount = 300.00;
$testDescription = "Test facture automatique";

echo "Quote ID: $testQuoteId" . PHP_EOL;
echo "Payment ID: $testPaymentId" . PHP_EOL;
echo "Montant: $testAmount EUR" . PHP_EOL;
echo "Description: $testDescription" . PHP_EOL;
echo PHP_EOL;

echo "Tentative de création de la facture..." . PHP_EOL;

try {
    $invoiceId = generateInvoiceForPayment($testQuoteId, $testPaymentId, $testAmount, $testDescription);

    if ($invoiceId) {
        echo "✓ Facture créée avec succès!" . PHP_EOL;
        echo "  Invoice ID: $invoiceId" . PHP_EOL;

        // Vérifier que la facture existe
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("SELECT invoice_no, subject, total, received, balance FROM vtiger_invoice WHERE invoiceid = ?");
        $stmt->execute([$invoiceId]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($invoice) {
            echo "  Numéro: {$invoice['invoice_no']}" . PHP_EOL;
            echo "  Sujet: {$invoice['subject']}" . PHP_EOL;
            echo "  Total: {$invoice['total']} EUR" . PHP_EOL;
            echo "  Reçu: {$invoice['received']} EUR" . PHP_EOL;
            echo "  Balance: {$invoice['balance']} EUR" . PHP_EOL;
        }

        // Vérifier les relations
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM vtiger_crmentityrel WHERE crmid = ?");
        $stmt->execute([$invoiceId]);
        $relCount = $stmt->fetchColumn();
        echo "  Relations: $relCount" . PHP_EOL;

        echo PHP_EOL . "✓ Test réussi!" . PHP_EOL;
    } else {
        echo "✗ Échec de la création de la facture" . PHP_EOL;
        echo "Vérifiez les logs dans /var/www/CNK-DEM/stripe/logs/stripe.log" . PHP_EOL;
    }
} catch (Exception $e) {
    echo "✗ ERREUR: " . $e->getMessage() . PHP_EOL;
    echo "Stack trace:" . PHP_EOL;
    echo $e->getTraceAsString() . PHP_EOL;
}
