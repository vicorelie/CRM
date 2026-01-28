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

            // Ajouter l'email pré-rempli à l'URL si disponible
            $url = $paymentLink->url;
            if (!empty($quoteData['email'])) {
                $url .= '?prefilled_email=' . urlencode($quoteData['email']);
            }

            self::log("Lien de paiement créé : {$url} pour devis #{$quoteId} ({$type})");

            return $url;

        } catch (\Stripe\Exception\ApiErrorException $e) {
            self::log("ERREUR Stripe: " . $e->getMessage(), 'error');
            throw new Exception('Erreur Stripe: ' . $e->getMessage());
        }
    }

    /**
     * Créer un lien de paiement Stripe et retourner l'URL et l'ID
     *
     * @param float $montant Montant en euros
     * @param string $description Description du paiement
     * @param array $quoteData Données du devis
     * @param int $quoteId ID du devis
     * @return array ['url' => string, 'id' => string]
     */
    public static function createPaymentLinkWithDetails($montant, $description, $quoteData, $quoteId) {
        self::init();

        try {
            // Créer un produit Stripe
            $product = \Stripe\Product::create([
                'name' => $description . ' - Devis ' . ($quoteData['quote_no'] ?? $quoteId),
                'description' => $quoteData['subject'] ?? $description,
                'metadata' => [
                    'quote_id' => $quoteId,
                    'quote_no' => $quoteData['quote_no'] ?? '',
                    'payment_type' => 'custom',
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
                    'quote_no' => $quoteData['quote_no'] ?? '',
                    'payment_type' => 'custom',
                    'description' => $description,
                    'customer_name' => ($quoteData['firstname'] ?? '') . ' ' . ($quoteData['lastname'] ?? ''),
                    'customer_email' => $quoteData['email'] ?? '',
                ],
            ]);

            // Ajouter l'email pré-rempli à l'URL si disponible
            $url = $paymentLink->url;
            if (!empty($quoteData['email'])) {
                $url .= '?prefilled_email=' . urlencode($quoteData['email']);
            }

            self::log("Lien de paiement créé : {$url} (ID: {$paymentLink->id}) pour devis #{$quoteId}");

            return [
                'url' => $url,
                'id' => $paymentLink->id
            ];

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
     * Créer une facture VTiger à partir d'un devis
     *
     * @param int $quoteId ID du devis
     * @param string $paymentType Type de paiement (Acompte, Solde, ou Total)
     * @param array $session Session Stripe contenant les détails du paiement
     * @return int|null ID de la facture créée ou null en cas d'erreur
     */
    public static function createInvoiceFromQuote($quoteId, $paymentType, $session = null) {
        try {
            $db = PearDatabase::getInstance();

            self::log("Début de création de facture pour le devis #$quoteId");

            // 1. Récupérer les données du devis
            $quoteQuery = "SELECT q.*, qcf.*, org.accountid, org.accountname, pot.potentialid
                          FROM vtiger_quotes q
                          LEFT JOIN vtiger_quotescf qcf ON q.quoteid = qcf.quoteid
                          LEFT JOIN vtiger_crmentity ce ON q.quoteid = ce.crmid
                          LEFT JOIN vtiger_account org ON q.accountid = org.accountid
                          LEFT JOIN vtiger_potential pot ON q.potentialid = pot.potentialid
                          WHERE q.quoteid = ? AND ce.deleted = 0";

            $quoteResult = $db->pquery($quoteQuery, array($quoteId));

            if ($db->num_rows($quoteResult) === 0) {
                self::log("ERREUR: Devis #$quoteId introuvable", 'error');
                return null;
            }

            $quoteData = $db->fetch_array($quoteResult);
            self::log("Devis trouvé: " . $quoteData['subject']);

            // 2. Note: On permet plusieurs factures par devis (paiements partiels)
            // Pas de vérification d'existence - chaque paiement crée sa propre facture

            // 3. Créer un nouvel ID UNIQUE pour la facture (dans toute la base de données)
            $invoiceId = $db->getUniqueID('vtiger_crmentity');
            self::log("Nouvel ID de facture: $invoiceId");

            // 4. Générer un numéro de facture unique
            $invoiceNo = self::generateInvoiceNumber($db);
            self::log("Numéro de facture généré: $invoiceNo");

            // 5. Calculer les montants
            // Montant de ce paiement Stripe
            $montantPayment = 0;
            if ($session) {
                $montantPayment = ($session->amount_total / 100);
            } else {
                $montantPayment = floatval($quoteData['total'] ?? 0);
            }

            // Montant total du devis (Acompte + Solde)
            $totalAcompteTTC = floatval($quoteData['cf_1055'] ?? 0);
            $totalSoldeTTC = floatval($quoteData['cf_1057'] ?? 0);
            $montantTotalDevis = $totalAcompteTTC + $totalSoldeTTC;

            // Si le montant total devis est 0, utiliser le total standard du devis
            if ($montantTotalDevis == 0) {
                $montantTotalDevis = floatval($quoteData['total'] ?? 0);
            }

            self::log("Montant paiement: $montantPayment EUR, Total devis: $montantTotalDevis EUR");

            // 6. Créer l'entrée dans crmentity
            $createdTime = date('Y-m-d H:i:s');
            $queryCrm = "INSERT INTO vtiger_crmentity
                        (crmid, smcreatorid, smownerid, modifiedby, setype, description,
                         createdtime, modifiedtime, presence, deleted, label)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)";

            $description = "Facture créée automatiquement suite au paiement Stripe ($paymentType)";

            $db->pquery($queryCrm, array(
                $invoiceId,
                1, // smcreatorid (admin)
                1, // smownerid (admin)
                1, // modifiedby
                'Invoice',
                $description,
                $createdTime,
                $createdTime,
                $quoteData['subject'] // label
            ));

            self::log("Entrée crmentity créée pour la facture #$invoiceId");

            // 7. Créer l'entrée principale dans vtiger_invoice
            // Récupérer le total déjà payé pour ce devis (avant ce paiement)
            $paidBeforeQuery = "SELECT COALESCE(SUM(amount), 0) as total_paid_before
                               FROM vtiger_stripe_payments
                               WHERE quote_id = ? AND status = 'paid'";
            $paidBeforeResult = $db->pquery($paidBeforeQuery, array($quoteId));
            $totalPaidBefore = floatval($db->query_result($paidBeforeResult, 0, 'total_paid_before'));

            // Montant total reçu après ce paiement
            $totalReceived = $totalPaidBefore + $montantPayment;

            // Statut de la facture selon le montant payé
            $invoiceStatus = 'Created'; // Par défaut
            if ($totalReceived >= $montantTotalDevis) {
                $invoiceStatus = 'Paid'; // Entièrement payé
            } elseif ($totalReceived > 0) {
                $invoiceStatus = 'Approved'; // Partiellement payé
            }

            self::log("Montant déjà reçu: $totalPaidBefore EUR, Après ce paiement: $totalReceived EUR, Statut: $invoiceStatus");

            $queryInvoice = "INSERT INTO vtiger_invoice
                            (invoiceid, subject, salesorderid, customerno, contactid,
                             invoicedate, duedate, purchaseorder, subtotal, taxtype,
                             discount_percent, discount_amount, s_h_amount, adjustmenttype,
                             adjustment, total, invoicestatus, accountid, quote_id, currency_id,
                             received, balance, potential_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $invoiceDate = date('Y-m-d');
            $dueDate = date('Y-m-d', strtotime('+30 days')); // Échéance à 30 jours

            // Calculer le solde restant
            $balance = $montantTotalDevis - $totalReceived;
            if ($balance < 0) $balance = 0;

            $db->pquery($queryInvoice, array(
                $invoiceId,
                $quoteData['subject'],
                0, // salesorderid (pas de commande)
                '', // customerno
                $quoteData['contactid'] ?? 0,
                $invoiceDate,
                $dueDate,
                '', // purchaseorder
                $quoteData['subtotal'] ?? $montantTotalDevis,
                $quoteData['taxtype'] ?? 'group',
                $quoteData['discount_percent'] ?? 0,
                $quoteData['discount_amount'] ?? 0,
                $quoteData['s_h_amount'] ?? 0,
                $quoteData['adjustmenttype'] ?? 'zero',
                $quoteData['adjustment'] ?? 0,
                $montantTotalDevis, // total = montant total du devis
                $invoiceStatus,
                $quoteData['accountid'] ?? 0,
                $quoteId, // Lien vers le devis
                $quoteData['currency_id'] ?? 1,
                $totalReceived, // received = montant total reçu
                $balance, // balance = reste à payer
                $quoteData['potentialid'] ?? null // potential_id
            ));

            self::log("Entrée vtiger_invoice créée");

            // 8. Créer l'entrée dans vtiger_invoicecf et copier les champs custom du devis

            // Calculer le reste à payer après ce paiement
            $resteAPayer = $balance; // Déjà calculé plus haut

            // Déterminer le type de paiement si non spécifié
            $typePayment = $paymentType;
            if ($typePayment === 'custom' && $session && isset($session->metadata->description)) {
                $typePayment = 'Autre';
            }

            // Récupérer l'ID de la session Stripe
            $stripeSessionId = $session ? $session->id : '';

            self::log("Montant total devis: $montantTotalDevis EUR, Montant reçu: $totalReceived EUR, Reste: $resteAPayer EUR");

            $queryInvoiceCf = "INSERT INTO vtiger_invoicecf
                              (invoiceid, cf_1277, cf_1279, cf_1281, cf_1283, cf_1285, cf_1287,
                               cf_1289, cf_1291, cf_1293, cf_1295, cf_1297, cf_1299, cf_1301, cf_1305)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            $db->pquery($queryInvoiceCf, array(
                $invoiceId,
                // Bloc FORFAIT
                $quoteData['cf_1125'] ?? '',        // cf_1277: Type de forfait
                $quoteData['cf_1127'] ?? 0,         // cf_1279: Tarif forfait
                $quoteData['cf_1129'] ?? 0,         // cf_1281: Supplément forfait
                $quoteData['cf_1137'] ?? 0,         // cf_1283: Total forfait
                // Bloc ASSURANCE
                $quoteData['cf_1139'] ?? 0,         // cf_1285: Montant assurance
                $quoteData['cf_1143'] ?? 0,         // cf_1287: Tarif assurance
                // Bloc PAIEMENT
                $totalAcompteTTC,                   // cf_1289: Total Acompte TTC
                $totalSoldeTTC,                     // cf_1291: Total Solde TTC
                $resteAPayer,                       // cf_1293: Reste à payer
                $montantPayment,                    // cf_1295: Montant de ce paiement
                $typePayment,                       // cf_1297: Type de paiement
                $stripeSessionId,                   // cf_1299: ID transaction Stripe
                $montantTotalDevis,                 // cf_1301: Montant total devis TTC
                $quoteData['cf_1269'] ?? ''         // cf_1305: Type de déménagement
            ));

            self::log("✓ Champs custom copiés: Forfait, Assurance, et Paiement");

            // 9. Créer la relation entre la facture et l'affaire (Potential)
            if (!empty($quoteData['potentialid'])) {
                $relQuery = "INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule)
                            VALUES (?, 'Potentials', ?, 'Invoice')";
                $db->pquery($relQuery, array($quoteData['potentialid'], $invoiceId));
                self::log("✓ Facture liée à l'affaire #" . $quoteData['potentialid']);
            }

            // 10. Copier les lignes de produits du devis vers la facture
            self::copyQuoteProductsToInvoice($quoteId, $invoiceId);

            // 11. Créer une note pour indiquer que la facture a été créée automatiquement
            $noteContent = "Facture #$invoiceNo créée automatiquement suite au paiement Stripe\n\n";
            $noteContent .= "Type de paiement: $typePayment\n";
            $noteContent .= "Montant de ce paiement: " . number_format($montantPayment, 2, ',', ' ') . " EUR\n";
            $noteContent .= "Montant total devis: " . number_format($montantTotalDevis, 2, ',', ' ') . " EUR\n";
            $noteContent .= "Total reçu: " . number_format($totalReceived, 2, ',', ' ') . " EUR\n";
            $noteContent .= "Reste à payer: " . number_format($resteAPayer, 2, ',', ' ') . " EUR\n";
            $noteContent .= "Date: " . date('d/m/Y H:i:s') . "\n";
            if ($session) {
                $noteContent .= "Session Stripe: " . $session->id . "\n";
            }

            self::createNoteForRecord($invoiceId, $noteContent);

            self::log("✓ Facture #$invoiceNo créée avec succès (ID: $invoiceId)");

            return $invoiceId;

        } catch (Exception $e) {
            self::log("ERREUR lors de la création de la facture: " . $e->getMessage(), 'error');
            self::log("Stack trace: " . $e->getTraceAsString(), 'error');
            return null;
        }
    }

    /**
     * Générer un numéro de facture unique
     */
    private static function generateInvoiceNumber($db) {
        // Récupérer le dernier numéro de facture
        $query = "SELECT invoice_no FROM vtiger_invoice ORDER BY invoiceid DESC LIMIT 1";
        $result = $db->pquery($query, array());

        if ($db->num_rows($result) > 0) {
            $lastInvoiceNo = $db->query_result($result, 0, 'invoice_no');
            // Extraire le numéro et l'incrémenter
            if (preg_match('/(\d+)$/', $lastInvoiceNo, $matches)) {
                $number = intval($matches[1]) + 1;
                return 'INV' . str_pad($number, 6, '0', STR_PAD_LEFT);
            }
        }

        // Si pas de facture existante, commencer à 1
        return 'INV000001';
    }

    /**
     * Copier les produits du devis vers la facture
     */
    private static function copyQuoteProductsToInvoice($quoteId, $invoiceId) {
        try {
            $db = PearDatabase::getInstance();

            // Récupérer les produits du devis
            $query = "SELECT * FROM vtiger_inventoryproductrel WHERE id = ? AND module = 'Quotes'";
            $result = $db->pquery($query, array($quoteId));

            $rowCount = $db->num_rows($result);
            self::log("Copie de $rowCount lignes de produits du devis vers la facture");

            for ($i = 0; $i < $rowCount; $i++) {
                $row = $db->fetch_array($result);

                // Insérer dans la facture
                $insertQuery = "INSERT INTO vtiger_inventoryproductrel
                               (id, productid, sequence_no, quantity, listprice, discount_percent,
                                discount_amount, comment, description, incrementondel, lineitem_id,
                                tax1, tax2, tax3, module)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Invoice')";

                $db->pquery($insertQuery, array(
                    $invoiceId,
                    $row['productid'],
                    $row['sequence_no'],
                    $row['quantity'],
                    $row['listprice'],
                    $row['discount_percent'],
                    $row['discount_amount'],
                    $row['comment'],
                    $row['description'],
                    $row['incrementondel'],
                    $db->getUniqueID('vtiger_inventoryproductrel'),
                    $row['tax1'] ?? 0,
                    $row['tax2'] ?? 0,
                    $row['tax3'] ?? 0
                ));
            }

            self::log("✓ Produits copiés avec succès");

        } catch (Exception $e) {
            self::log("ERREUR lors de la copie des produits: " . $e->getMessage(), 'error');
        }
    }

    /**
     * Créer une note pour un enregistrement
     */
    private static function createNoteForRecord($recordId, $noteContent) {
        try {
            $db = PearDatabase::getInstance();

            $modcommentsId = $db->getUniqueID('vtiger_modcomments');

            $queryComment = "INSERT INTO vtiger_modcomments
                            (modcommentsid, commentcontent, related_to, creator)
                            VALUES (?, ?, ?, ?)";

            $db->pquery($queryComment, array(
                $modcommentsId,
                $noteContent,
                $recordId,
                1
            ));

            $queryCrm = "INSERT INTO vtiger_crmentity
                        (crmid, smcreatorid, smownerid, modifiedby, setype, description,
                         createdtime, modifiedtime, presence, deleted)
                        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 1, 0)";

            $db->pquery($queryCrm, array(
                $modcommentsId,
                1,
                1,
                1,
                'ModComments',
                $noteContent
            ));

            self::log("Note créée pour l'enregistrement #$recordId");

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
