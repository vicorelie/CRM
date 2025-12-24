<?php

/**
 * Classe helper pour toutes les opérations Stripe
 */
class StripeHelper {

    private static $config;
    private static $initialized = false;

    /**
     * Initialiser Stripe
     */
    public static function init() {
        if (self::$initialized) {
            return;
        }

        // Charger la configuration
        self::$config = require(__DIR__ . '/config.php');

        // Charger le SDK Stripe
        require_once(__DIR__ . '/../libraries/stripe/init.php');

        // Configurer Stripe avec la clé API
        $mode = self::$config['mode'];
        $apiKey = self::$config['api_keys'][$mode]['secret_key'];
        \Stripe\Stripe::setApiKey($apiKey);

        self::$initialized = true;
    }

    /**
     * Créer un lien de paiement Stripe
     *
     * @param float $montant Montant en euros
     * @param string $type Type de paiement (Acompte ou Solde)
     * @param array $quoteData Données du devis
     * @param int $quoteId ID du devis
     * @return string URL du lien de paiement
     */
    public static function createPaymentLink($montant, $type, $quoteData, $quoteId) {
        self::init();

        try {
            // Créer un produit Stripe
            $product = \Stripe\Product::create([
                'name' => $type . ' - Devis ' . $quoteData['quote_no'],
                'description' => $quoteData['subject'],
                'metadata' => [
                    'quote_id' => $quoteId,
                    'quote_no' => $quoteData['quote_no'],
                    'payment_type' => $type,
                ],
            ]);

            // Créer un prix (montant en centimes)
            $price = \Stripe\Price::create([
                'product' => $product->id,
                'unit_amount' => intval($montant * 100),
                'currency' => self::$config['payment_options']['currency'],
            ]);

            // Créer le lien de paiement
            $paymentLink = \Stripe\PaymentLink::create([
                'line_items' => [
                    [
                        'price' => $price->id,
                        'quantity' => 1,
                    ],
                ],
                'after_completion' => [
                    'type' => 'hosted_confirmation',
                    'hosted_confirmation' => [
                        'custom_message' => 'Merci pour votre paiement ! Votre devis a été mis à jour dans notre système.',
                    ],
                ],
                'metadata' => [
                    'quote_id' => $quoteId,
                    'quote_no' => $quoteData['quote_no'],
                    'payment_type' => $type,
                    'customer_name' => ($quoteData['firstname'] ?? '') . ' ' . ($quoteData['lastname'] ?? ''),
                    'customer_email' => $quoteData['email'] ?? '',
                ],
            ]);

            self::log("Lien de paiement créé : {$paymentLink->url} pour devis #{$quoteId} ({$type})");

            return $paymentLink->url;

        } catch (\Stripe\Exception\ApiErrorException $e) {
            self::log("ERREUR Stripe: " . $e->getMessage(), 'error');
            throw new Exception('Erreur Stripe: ' . $e->getMessage());
        }
    }

    /**
     * Mettre à jour un champ du devis
     */
    public static function updateQuoteField($quoteId, $fieldName, $value) {
        $db = PearDatabase::getInstance();

        if (strpos($fieldName, 'cf_') === 0) {
            $table = 'vtiger_quotescf';
            $query = "UPDATE $table SET $fieldName = ? WHERE quoteid = ?";
        } else {
            $table = 'vtiger_quotes';
            $query = "UPDATE $table SET $fieldName = ? WHERE quoteid = ?";
        }

        $db->pquery($query, array($value, $quoteId));
        self::log("Champ mis à jour : Quote #{$quoteId}, Champ: {$fieldName}, Valeur: {$value}");
    }

    /**
     * Mettre à jour le statut de paiement
     */
    public static function updatePaymentStatus($quoteId, $paymentType, $status) {
        self::log("updatePaymentStatus appelé avec: quoteId=$quoteId, paymentType=$paymentType, status=$status");

        if (!self::$config) {
            self::$config = require(__DIR__ . '/config.php');
        }

        $fields = self::$config['vtiger_fields']['quotes'];

        if ($paymentType === 'Acompte') {
            $statusField = $fields['statut_acompte'];
        } elseif ($paymentType === 'Solde') {
            $statusField = $fields['statut_solde'];
        } else {
            self::log("ERREUR: Type de paiement inconnu: $paymentType", 'error');
            throw new Exception("Type de paiement inconnu: $paymentType");
        }

        self::log("Mise à jour du champ $statusField pour le devis #$quoteId");
        self::updateQuoteField($quoteId, $statusField, $status);
        self::log("Statut de paiement mis à jour avec succès");
    }

    /**
     * Créer une note de paiement dans VTiger
     */
    public static function createPaymentNote($quoteId, $paymentType, $status, $session) {
        try {
            $db = PearDatabase::getInstance();

            $amount = ($session->amount_total / 100);
            $currency = strtoupper($session->currency);

            $noteContent = "Paiement $paymentType reçu via Stripe\n\n";
            $noteContent .= "Montant: $amount $currency\n";
            $noteContent .= "Statut: $status\n";
            $noteContent .= "Session ID: " . $session->id . "\n";
            $noteContent .= "Date: " . date('Y-m-d H:i:s') . "\n";

            // Créer un modcomment
            $modcommentsId = $db->getUniqueID('vtiger_modcomments');

            $queryComment = "INSERT INTO vtiger_modcomments
                            (modcommentsid, commentcontent, related_to, creator)
                            VALUES (?, ?, ?, ?)";

            $db->pquery($queryComment, array(
                $modcommentsId,
                $noteContent,
                $quoteId,
                1
            ));

            // Créer l'entrée dans crmentity
            $queryCrm = "INSERT INTO vtiger_crmentity
                        (crmid, smcreatorid, smownerid, modifiedby, setype, description, createdtime, modifiedtime, presence, deleted)
                        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 1, 0)";

            $db->pquery($queryCrm, array(
                $modcommentsId,
                1,
                1,
                1,
                'ModComments',
                $noteContent
            ));

            self::log("Note créée : ModComments ID $modcommentsId pour devis #$quoteId");

        } catch (Exception $e) {
            self::log("ERREUR lors de la création de la note: " . $e->getMessage(), 'error');
        }
    }

    /**
     * Logger un message
     */
    public static function log($message, $level = 'info') {
        if (!self::$config) {
            self::$config = require(__DIR__ . '/config.php');
        }

        if (!self::$config['logging']['enabled']) {
            return;
        }

        $logFile = self::$config['logging']['file'];
        $logDir = dirname($logFile);

        if (!file_exists($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $timestamp = date('Y-m-d H:i:s');
        $formattedMessage = "[$timestamp] [$level] $message\n";

        file_put_contents($logFile, $formattedMessage, FILE_APPEND);
    }

    /**
     * Récupérer la configuration
     */
    public static function getConfig($key = null) {
        if (!self::$config) {
            self::$config = require(__DIR__ . '/config.php');
        }

        if ($key === null) {
            return self::$config;
        }

        // Support pour dot notation (ex: 'vtiger_fields.quotes.lien_acompte')
        $keys = explode('.', $key);
        $value = self::$config;

        foreach ($keys as $k) {
            if (!isset($value[$k])) {
                return null;
            }
            $value = $value[$k];
        }

        return $value;
    }
}
