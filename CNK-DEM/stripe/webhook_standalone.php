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

// Ne traiter le webhook que si ce n'est pas un test
if (!defined('STRIPE_WEBHOOK_TEST_MODE')) {
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

    if (!$quoteId) {
        logStripe("ERREUR: Quote ID manquant", 'error');
        return;
    }

    logStripe("Quote ID: $quoteId, Payment Type: $paymentType");

    // Verifier si c'est un paiement multiple (dans vtiger_stripe_payments)
    $paymentLinkId = $session->payment_link ?? null;
    if ($paymentLinkId) {
        $updated = updateMultiplePaymentStatus($quoteId, $paymentLinkId, $session);
        if ($updated) {
            logStripe("Paiement multiple mis a jour avec succes");
            return;
        }
    }

    // Sinon, utiliser l'ancien systeme (Acompte/Solde)
    if (!$paymentType) {
        logStripe("ERREUR: Payment type manquant pour ancien systeme", 'error');
        return;
    }

    // Mettre a jour le statut (ancien systeme)
    updatePaymentStatus($quoteId, $paymentType, 'Paye', $config);

    // Creer une note
    createPaymentNote($quoteId, $paymentType, 'Paye', $session);

    // Recalculer les statuts de paiement et reste à payer
    recalculatePaymentStatus($quoteId);
}

/**
 * Mettre a jour le statut d'un paiement multiple
 */
function updateMultiplePaymentStatus($quoteId, $paymentLinkId, $session) {
    logStripe("updateMultiplePaymentStatus: quoteId=$quoteId, paymentLinkId=$paymentLinkId");

    try {
        $pdo = getDbConnection();

        // Chercher le paiement par stripe_payment_link_id ou par le lien contenant l'ID
        $sql = "SELECT id, amount, description FROM vtiger_stripe_payments
                WHERE quote_id = ? AND (stripe_payment_link_id = ? OR stripe_link LIKE ?)
                AND status = 'pending'
                LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$quoteId, $paymentLinkId, '%' . $paymentLinkId . '%']);
        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$payment) {
            logStripe("Paiement non trouve dans vtiger_stripe_payments, essai ancien systeme");
            return false;
        }

        // Mettre a jour le statut
        $sql = "UPDATE vtiger_stripe_payments
                SET status = 'paid', paid_date = NOW()
                WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$payment['id']]);

        logStripe("Paiement #{$payment['id']} marque comme paye (montant: {$payment['amount']} EUR)");

        // Générer une facture pour ce paiement
        $invoiceId = generateInvoiceForPayment($quoteId, $payment['id'], $payment['amount'], $payment['description']);
        if ($invoiceId) {
            logStripe("Facture #{$invoiceId} générée avec succès pour le paiement #{$payment['id']}");

            // Générer et envoyer le PDF de la facture au client
            $pdfSent = generateAndSendInvoicePDF($invoiceId, $quoteId);
            if ($pdfSent) {
                logStripe("PDF de la facture #{$invoiceId} généré et envoyé au client");
            }
        }

        // Ajouter une note dans le champ commentaire stripe
        $amount = $payment['amount'];
        $description = $payment['description'] ?: 'Paiement';

        $newComment = "[" . date('Y-m-d H:i:s') . "] Paiement recu via Stripe\n";
        $newComment .= "Description: $description\n";
        $newComment .= "Montant: $amount EUR - Statut: Paye\n";
        $newComment .= "Session ID: " . $session->id . "\n";
        if ($invoiceId) {
            $newComment .= "Facture generee: #$invoiceId\n";
        }

        $stmt = $pdo->prepare("SELECT cf_1087 FROM vtiger_quotescf WHERE quoteid = ?");
        $stmt->execute([$quoteId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $currentContent = $result['cf_1087'] ?? '';

        $updatedContent = $newComment;
        if (!empty($currentContent)) {
            $updatedContent .= "\n---\n\n" . $currentContent;
        }

        $stmt = $pdo->prepare("UPDATE vtiger_quotescf SET cf_1087 = ? WHERE quoteid = ?");
        $stmt->execute([$updatedContent, $quoteId]);

        logStripe("Commentaire Stripe mis a jour");

        // Recalculer les statuts de paiement et reste à payer
        recalculatePaymentStatus($quoteId);

        return true;

    } catch (Exception $e) {
        logStripe("ERREUR updateMultiplePaymentStatus: " . $e->getMessage(), 'error');
        return false;
    }
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
 * Recalculer le reste à payer et les statuts de paiement
 */
function recalculatePaymentStatus($quoteId) {
    logStripe("recalculatePaymentStatus: quoteId=$quoteId");

    try {
        $pdo = getDbConnection();

        // Récupérer les montants du devis
        $stmt = $pdo->prepare("SELECT cf_1055 as acompte_ttc, cf_1057 as solde_ttc FROM vtiger_quotescf WHERE quoteid = ?");
        $stmt->execute([$quoteId]);
        $quote = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$quote) {
            logStripe("ERREUR: Devis non trouvé", 'error');
            return;
        }

        $acompteTTC = floatval($quote['acompte_ttc']);
        $soldeTTC = floatval($quote['solde_ttc']);
        $grandTotal = $acompteTTC + $soldeTTC;

        // Calculer le montant total payé
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total_paid FROM vtiger_stripe_payments WHERE quote_id = ? AND status = 'paid'");
        $stmt->execute([$quoteId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $totalPaid = floatval($result['total_paid']);

        // Calculer le reste à payer
        $resteAPayer = $grandTotal - $totalPaid;
        if ($resteAPayer < 0) $resteAPayer = 0;

        // Déterminer les statuts de paiement
        $statutAcompte = '';
        $statutSolde = '';

        if ($totalPaid > 0) {
            if ($totalPaid < $acompteTTC) {
                // Payé partiellement l'acompte
                $statutAcompte = 'Partiel';
                $statutSolde = '';
            } elseif ($totalPaid >= $acompteTTC && $totalPaid < $grandTotal) {
                // Acompte payé, solde partiel ou non commencé
                $statutAcompte = 'Payé';
                if ($totalPaid > $acompteTTC) {
                    $statutSolde = 'Partiel';
                }
            } elseif ($totalPaid >= $grandTotal) {
                // Tout est payé
                $statutAcompte = 'Payé';
                $statutSolde = 'Payé';
            }
        }

        // Mettre à jour les champs
        $stmt = $pdo->prepare("UPDATE vtiger_quotescf SET cf_1275 = ?, cf_1083 = ?, cf_1085 = ? WHERE quoteid = ?");
        $stmt->execute([$resteAPayer, $statutAcompte, $statutSolde, $quoteId]);

        logStripe("Statuts mis à jour - Reste: $resteAPayer EUR, Acompte: $statutAcompte, Solde: $statutSolde");

    } catch (Exception $e) {
        logStripe("ERREUR recalculatePaymentStatus: " . $e->getMessage(), 'error');
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

/**
 * Copier les produits d'un devis vers une facture
 */
function copyProductsFromQuoteToInvoice($quoteId, $invoiceId, $pdo) {
    logStripe("copyProductsFromQuoteToInvoice: quoteId=$quoteId, invoiceId=$invoiceId");

    try {
        // Récupérer les produits du devis
        $stmt = $pdo->prepare("
            SELECT productid, quantity, listprice, comment as description,
                   discount_amount, discount_percent, tax1 as tax
            FROM vtiger_inventoryproductrel
            WHERE id = ?
            ORDER BY sequence_no
        ");
        $stmt->execute([$quoteId]);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($products)) {
            logStripe("Aucun produit trouvé dans le devis");
            return;
        }

        // Insérer les produits dans la facture
        $sequence = 1;
        foreach ($products as $product) {
            $stmt = $pdo->prepare("
                INSERT INTO vtiger_inventoryproductrel
                (id, productid, sequence_no, quantity, listprice, comment,
                 discount_amount, discount_percent, tax1, incrementondel)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ");
            $stmt->execute([
                $invoiceId,
                $product['productid'],
                $sequence,
                $product['quantity'],
                $product['listprice'],
                $product['description'],
                $product['discount_amount'],
                $product['discount_percent'],
                $product['tax']
            ]);
            $sequence++;
        }

        logStripe(count($products) . " produit(s) copié(s) vers la facture");

    } catch (Exception $e) {
        logStripe("ERREUR copyProductsFromQuoteToInvoice: " . $e->getMessage(), 'error');
    }
}

/**
 * Générer une facture pour un paiement
 */
function generateInvoiceForPayment($quoteId, $paymentId, $amount, $description) {
    logStripe("generateInvoiceForPayment: quoteId=$quoteId, paymentId=$paymentId, amount=$amount");

    try {
        $pdo = getDbConnection();
        logStripe("Connexion base de données OK");

        // Récupérer les données du devis et l'affaire liée avec TOUS les champs custom
        $stmt = $pdo->prepare("
            SELECT q.quoteid, q.quote_no, q.subject, q.contactid, q.accountid,
                   q.total, q.subtotal, q.discount_amount, q.carrier,
                   q.currency_id, q.potentialid,
                   ce.smownerid as assigned_user_id,
                   qcf.cf_1055 as acompte_ttc, qcf.cf_1057 as solde_ttc,
                   qcf.cf_1125 as type_forfait, qcf.cf_1127 as tarif_forfait,
                   qcf.cf_1129 as supplement_forfait, qcf.cf_1137 as total_forfait,
                   qcf.cf_1139 as montant_assurance, qcf.cf_1143 as tarif_assurance,
                   qcf.cf_1269 as type_demenagement
            FROM vtiger_quotes q
            LEFT JOIN vtiger_crmentity ce ON ce.crmid = q.quoteid
            LEFT JOIN vtiger_quotescf qcf ON q.quoteid = qcf.quoteid
            WHERE q.quoteid = ?
        ");
        $stmt->execute([$quoteId]);
        $quote = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$quote) {
            logStripe("ERREUR: Devis non trouvé", 'error');
            return false;
        }

        // Récupérer l'utilisateur assigné
        $userId = $quote['assigned_user_id'];

        logStripe("Création de la facture via SQL pour l'utilisateur $userId");

        // Générer un nouveau numéro de facture en utilisant le système Vtiger natif
        $numStmt = $pdo->prepare("SELECT prefix, cur_id FROM vtiger_modentity_num WHERE semodule = 'Invoice' AND active = 1");
        $numStmt->execute();
        $numRow = $numStmt->fetch(PDO::FETCH_ASSOC);

        if ($numRow) {
            $prefix = $numRow['prefix'];
            $curId = intval($numRow['cur_id']);
            $newId = $curId + 1;
            $invoiceNo = $prefix . $newId;

            // Mettre à jour le compteur
            $updateNumStmt = $pdo->prepare("UPDATE vtiger_modentity_num SET cur_id = ? WHERE semodule = 'Invoice' AND active = 1");
            $updateNumStmt->execute([$newId]);
        } else {
            // Fallback si pas de configuration trouvée
            $invoiceNoResult = $pdo->query("SELECT MAX(invoiceid) as max_id FROM vtiger_invoice");
            $maxNo = $invoiceNoResult->fetch(PDO::FETCH_ASSOC)['max_id'] ?: 0;
            $invoiceNo = 'FACTURE' . ($maxNo + 1);
        }

        logStripe("Numéro de facture généré: $invoiceNo");

        // Obtenir le prochain ID disponible de façon sécurisée avec verrouillage
        // Utiliser une transaction pour éviter les conflits d'ID
        $pdo->beginTransaction();
        try {
            // Verrouiller la table pendant la lecture pour éviter les conflits
            $stmt = $pdo->query("SELECT MAX(crmid) as max_id FROM vtiger_crmentity FOR UPDATE");
            $maxId = $stmt->fetch(PDO::FETCH_ASSOC)['max_id'] ?: 0;
            $invoiceId = $maxId + 1;

            logStripe("Prochain ID disponible (avec lock): $invoiceId");

            // Créer l'entrée dans crmentity
            $now = date('Y-m-d H:i:s');
            $stmt = $pdo->prepare("
                INSERT INTO vtiger_crmentity (crmid, smcreatorid, smownerid, modifiedby, setype, description,
                                              createdtime, modifiedtime, viewedtime, status, version, presence, deleted, label)
                VALUES (?, ?, ?, ?, 'Invoice', ?, ?, ?, NULL, NULL, 0, 1, 0, ?)
            ");
            $invoiceDescription = "Facture générée automatiquement pour: $description\nMontant payé: $amount EUR\nLiée au devis: {$quote['quote_no']}";
            $invoiceLabel = $quote['subject'] . ' - ' . $description;
            $stmt->execute([$invoiceId, $userId, $userId, $userId, $invoiceDescription, $now, $now, $invoiceLabel]);

            logStripe("CRM Entity créée: ID=$invoiceId");

            // Calculer les montants pour la facture
            $acompteTTC = floatval($quote['acompte_ttc'] ?? 0);
            $soldeTTC = floatval($quote['solde_ttc'] ?? 0);
            $montantTotalDevis = $acompteTTC + $soldeTTC;

            // Si le montant total devis est 0, utiliser le total standard du devis
            if ($montantTotalDevis == 0) {
                $montantTotalDevis = floatval($quote['total'] ?? 0);
            }

            // Récupérer le total déjà payé pour ce devis
            // NOTE: Le paiement actuel est DÉJÀ marqué comme 'paid' avant l'appel de cette fonction,
            // donc il est DÉJÀ inclus dans cette somme. Pas besoin d'ajouter $amount une deuxième fois.
            $totalReceivedStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) as total_paid FROM vtiger_stripe_payments WHERE quote_id = ? AND status = 'paid'");
            $totalReceivedStmt->execute([$quoteId]);
            $totalReceived = floatval($totalReceivedStmt->fetch(PDO::FETCH_ASSOC)['total_paid']);

            // Calculer le reste à payer
            $balance = $montantTotalDevis - $totalReceived;
            if ($balance < 0) $balance = 0;

            // Statut de la facture selon le montant payé
            $invoiceStatus = 'Created';
            if ($totalReceived >= $montantTotalDevis) {
                $invoiceStatus = 'Paid'; // Entièrement payé
            } elseif ($totalReceived > 0) {
                $invoiceStatus = 'Approved'; // Partiellement payé
            }

            logStripe("Montants calculés - Devis: $montantTotalDevis EUR, Reçu: $totalReceived EUR, Reste: $balance EUR, Statut: $invoiceStatus");

            // Créer l'entrée dans vtiger_invoice avec toutes les données
            $invoiceDate = date('Y-m-d');
            $dueDate = date('Y-m-d', strtotime('+30 days'));

            $stmt = $pdo->prepare("
                INSERT INTO vtiger_invoice (
                    invoiceid, invoice_no, subject, salesorderid, contactid, invoicedate, duedate,
                    purchaseorder, customerno, exciseduty, invoicestatus, accountid,
                    subtotal, total, discount_amount, adjustment, received, balance, potential_id, quote_id
                ) VALUES (?, ?, ?, NULL, ?, ?, ?, '', '', 0, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $invoiceId,
                $invoiceNo,
                $invoiceLabel,
                $quote['contactid'],
                $invoiceDate,
                $dueDate,
                $invoiceStatus, // Statut calculé
                $quote['accountid'] ?: NULL,
                $montantTotalDevis, // subtotal = montant total du devis
                $montantTotalDevis, // total = montant total du devis
                $totalReceived, // received = montant total reçu
                $balance, // balance = reste à payer
                $quote['potentialid'] ?: NULL, // potential_id
                $quoteId // quote_id - Lien vers le devis
            ]);

            logStripe("Invoice principale créée avec tous les montants");

            // Créer l'entrée dans vtiger_invoicecf et copier les champs custom du devis
            $typePayment = !empty($description) ? 'Autre' : 'Paiement';

            $stmt = $pdo->prepare("
                INSERT INTO vtiger_invoicecf
                (invoiceid, cf_1277, cf_1279, cf_1281, cf_1283, cf_1285, cf_1287,
                 cf_1289, cf_1291, cf_1293, cf_1295, cf_1297, cf_1301, cf_1304, cf_1305)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $invoiceId,
                // Bloc FORFAIT
                $quote['type_forfait'] ?? '',          // cf_1277: Type de forfait
                $quote['tarif_forfait'] ?? 0,          // cf_1279: Tarif forfait
                $quote['supplement_forfait'] ?? 0,     // cf_1281: Supplément forfait
                $quote['total_forfait'] ?? 0,          // cf_1283: Total forfait
                // Bloc ASSURANCE
                $quote['montant_assurance'] ?? 0,      // cf_1285: Montant assurance
                $quote['tarif_assurance'] ?? 0,        // cf_1287: Tarif assurance
                // Bloc PAIEMENT
                $acompteTTC,                           // cf_1289: Total Acompte TTC
                $soldeTTC,                             // cf_1291: Total Solde TTC
                $balance,                              // cf_1293: Reste à payer
                $amount,                               // cf_1295: Montant de ce paiement
                $typePayment,                          // cf_1297: Type de paiement
                $montantTotalDevis,                    // cf_1301: Montant total devis TTC
                $quote['quote_no'] ?? '',              // cf_1304: Numéro du devis
                $quote['type_demenagement'] ?? ''      // cf_1305: Type de déménagement
            ]);

            logStripe("✓ Champs custom copiés: Forfait, Assurance, et Paiement");

            // Copier l'adresse de facturation du devis vers la facture
            $billAdsStmt = $pdo->prepare("
                SELECT bill_street, bill_city, bill_state, bill_code, bill_country, bill_pobox
                FROM vtiger_quotesbillads WHERE quotebilladdressid = ?
            ");
            $billAdsStmt->execute([$quoteId]);
            $billAds = $billAdsStmt->fetch(PDO::FETCH_ASSOC);

            if ($billAds) {
                $stmt = $pdo->prepare("
                    INSERT INTO vtiger_invoicebillads (invoicebilladdressid, bill_street, bill_city, bill_state, bill_code, bill_country, bill_pobox)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $invoiceId,
                    $billAds['bill_street'] ?? '',
                    $billAds['bill_city'] ?? '',
                    $billAds['bill_state'] ?? '',
                    $billAds['bill_code'] ?? '',
                    $billAds['bill_country'] ?? '',
                    $billAds['bill_pobox'] ?? ''
                ]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO vtiger_invoicebillads (invoicebilladdressid) VALUES (?)");
                $stmt->execute([$invoiceId]);
            }

            // Copier l'adresse de livraison du devis vers la facture
            $shipAdsStmt = $pdo->prepare("
                SELECT ship_street, ship_city, ship_state, ship_code, ship_country, ship_pobox
                FROM vtiger_quotesshipads WHERE quoteshipaddressid = ?
            ");
            $shipAdsStmt->execute([$quoteId]);
            $shipAds = $shipAdsStmt->fetch(PDO::FETCH_ASSOC);

            if ($shipAds) {
                $stmt = $pdo->prepare("
                    INSERT INTO vtiger_invoiceshipads (invoiceshipaddressid, ship_street, ship_city, ship_state, ship_code, ship_country, ship_pobox)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $invoiceId,
                    $shipAds['ship_street'] ?? '',
                    $shipAds['ship_city'] ?? '',
                    $shipAds['ship_state'] ?? '',
                    $shipAds['ship_code'] ?? '',
                    $shipAds['ship_country'] ?? '',
                    $shipAds['ship_pobox'] ?? ''
                ]);
            } else {
                $stmt = $pdo->prepare("INSERT INTO vtiger_invoiceshipads (invoiceshipaddressid) VALUES (?)");
                $stmt->execute([$invoiceId]);
            }

            logStripe("✓ Adresses de facturation et livraison copiées");
            logStripe("Facture créée avec succès: ID=$invoiceId, No=$invoiceNo");

            // Créer une relation entre la facture et le devis
            $stmt = $pdo->prepare("
                INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule)
                VALUES (?, 'Invoice', ?, 'Quotes')
            ");
            $stmt->execute([$invoiceId, $quoteId]);

            // Créer une relation entre la facture et l'affaire (Potential)
            if (!empty($quote['potentialid'])) {
                $stmt = $pdo->prepare("
                    INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule)
                    VALUES (?, 'Potentials', ?, 'Invoice')
                ");
                $stmt->execute([$quote['potentialid'], $invoiceId]);
                logStripe("Facture #{$invoiceId} liée à l'affaire #{$quote['potentialid']}");
            }

            // Copier les produits du devis vers la facture
            copyProductsFromQuoteToInvoice($quoteId, $invoiceId, $pdo);

            // Enregistrer l'ID de la facture dans le paiement
            $stmt = $pdo->prepare("UPDATE vtiger_stripe_payments SET invoice_id = ? WHERE id = ?");
            $stmt->execute([$invoiceId, $paymentId]);

            logStripe("Facture #{$invoiceId} liée au paiement #{$paymentId}");

            // METTRE À JOUR LE DEVIS: Reste à payer et statuts
            // Calculer le nouveau reste à payer
            $resteAPayer = $montantTotalDevis - $totalReceived;
            if ($resteAPayer < 0) $resteAPayer = 0;

            // Déterminer les statuts de paiement
            $statutAcompte = '';
            $statutSolde = '';

            if ($totalReceived > 0) {
                if ($totalReceived < $acompteTTC) {
                    // Payé partiellement l'acompte
                    $statutAcompte = 'Partiel';
                    $statutSolde = '';
                } elseif ($totalReceived >= $acompteTTC && $totalReceived < $montantTotalDevis) {
                    // Acompte payé, solde partiel ou non commencé
                    $statutAcompte = 'Payé';
                    if ($totalReceived > $acompteTTC) {
                        $statutSolde = 'Partiel';
                    }
                } elseif ($totalReceived >= $montantTotalDevis) {
                    // Tout est payé
                    $statutAcompte = 'Payé';
                    $statutSolde = 'Payé';
                }
            }

            // Mettre à jour le devis
            $stmt = $pdo->prepare("
                UPDATE vtiger_quotescf
                SET cf_1275 = ?, cf_1083 = ?, cf_1085 = ?
                WHERE quoteid = ?
            ");
            $stmt->execute([$resteAPayer, $statutAcompte, $statutSolde, $quoteId]);

            logStripe("✓ Devis mis à jour - Reste à payer: {$resteAPayer} EUR, Acompte: {$statutAcompte}, Solde: {$statutSolde}");

        // Valider la transaction (commit du lock sur vtiger_crmentity)
        $pdo->commit();
        logStripe("Transaction validée pour la facture #{$invoiceId}");

        return $invoiceId;

        } catch (Exception $innerEx) {
            // Rollback de la transaction en cas d'erreur
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
                logStripe("Transaction annulée suite à une erreur: " . $innerEx->getMessage(), 'error');
            }
            throw $innerEx; // Relancer l'exception pour le catch externe
        }

    } catch (Exception $e) {
        logStripe("ERREUR generateInvoiceForPayment: " . $e->getMessage(), 'error');
        logStripe("Stack trace: " . $e->getTraceAsString(), 'error');
        return false;
    }
}

/**
 * Générer le PDF de la facture et l'envoyer par email
 */
function generateAndSendInvoicePDF($invoiceId, $quoteId) {
    logStripe("generateAndSendInvoicePDF: invoiceId=$invoiceId, quoteId=$quoteId");

    try {
        $pdo = getDbConnection();

        // Récupérer les données de la facture et du contact
        $stmt = $pdo->prepare("
            SELECT i.invoice_no, i.subject,
                   c.firstname, c.lastname, c.email as contact_email,
                   u.first_name as user_firstname, u.last_name as user_lastname,
                   u.email1 as user_email
            FROM vtiger_invoice i
            LEFT JOIN vtiger_crmentity ce ON ce.crmid = i.invoiceid
            LEFT JOIN vtiger_contactdetails c ON c.contactid = i.contactid
            LEFT JOIN vtiger_users u ON u.id = ce.smownerid
            WHERE i.invoiceid = ?
        ");
        $stmt->execute([$invoiceId]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$invoice || !$invoice['contact_email']) {
            logStripe("Email du contact non trouvé pour la facture #$invoiceId", 'warning');
            return false;
        }

        $contactEmail = $invoice['contact_email'];
        $invoiceNo = $invoice['invoice_no'];
        $contactName = trim($invoice['firstname'] . ' ' . $invoice['lastname']);
        $userEmail = $invoice['user_email'];
        $userName = trim($invoice['user_firstname'] . ' ' . $invoice['user_lastname']);

        logStripe("Génération PDF pour facture $invoiceNo - envoi à $contactEmail");

        // Vérifier si PDFMaker est installé
        $pdfMakerPath = dirname(__DIR__) . '/modules/PDFMaker/PDFMaker.php';
        if (!file_exists($pdfMakerPath)) {
            logStripe("PDFMaker non installé, envoi notification sans PDF", 'warning');
            return sendInvoiceNotificationEmail($invoice, $contactEmail, $userName, $userEmail);
        }

        // Charger PDFMaker
        require_once($pdfMakerPath);
        require_once(dirname(__DIR__) . '/modules/PDFMaker/models/PDFMaker.php');

        // Trouver le template pour les factures
        $stmt = $pdo->prepare("
            SELECT templateid, filename
            FROM vtiger_pdfmaker
            WHERE module = 'Invoice' AND is_active = 1
            ORDER BY templateid DESC
            LIMIT 1
        ");
        $stmt->execute();
        $template = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$template) {
            logStripe("Aucun template PDF trouvé pour les factures", 'warning');
            return sendInvoiceNotificationEmail($invoice, $contactEmail, $userName, $userEmail);
        }

        $templateId = $template['templateid'];
        logStripe("Utilisation du template PDF #$templateId");

        // Générer le PDF
        $pdfMaker = new PDFMaker_PDFMaker_Model();
        $pdfContent = $pdfMaker->GeneratePDF('Invoice', $invoiceId, $templateId, 'S'); // S = retourner le contenu

        if (!$pdfContent) {
            logStripe("Erreur lors de la génération du PDF", 'error');
            return sendInvoiceNotificationEmail($invoice, $contactEmail, $userName, $userEmail);
        }

        // Sauvegarder le PDF temporairement
        $pdfFilename = "Facture_{$invoiceNo}.pdf";
        $tmpPath = sys_get_temp_dir() . '/' . $pdfFilename;
        file_put_contents($tmpPath, $pdfContent);

        logStripe("PDF généré avec succès: $tmpPath");

        // Envoyer l'email avec le PDF en pièce jointe
        $emailSent = sendInvoicePDFEmail($invoice, $contactEmail, $userName, $userEmail, $tmpPath, $pdfFilename);

        // Supprimer le fichier temporaire
        if (file_exists($tmpPath)) {
            unlink($tmpPath);
        }

        return $emailSent;

    } catch (Exception $e) {
        logStripe("ERREUR generateAndSendInvoicePDF: " . $e->getMessage(), 'error');
        return false;
    }
}

/**
 * Envoyer l'email avec le PDF de la facture en pièce jointe
 */
function sendInvoicePDFEmail($invoice, $toEmail, $fromName, $fromEmail, $pdfPath, $pdfFilename) {
    logStripe("sendInvoicePDFEmail: to=$toEmail, pdf=$pdfFilename");

    try {
        require_once(dirname(__DIR__) . '/libraries/PHPMailer/PHPMailer.php');
        require_once(dirname(__DIR__) . '/libraries/PHPMailer/SMTP.php');
        require_once(dirname(__DIR__) . '/libraries/PHPMailer/Exception.php');

        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $pdo = getDbConnection();

        // Configuration SMTP
        $result = $pdo->query("SELECT * FROM vtiger_systems WHERE server_type = 'email' LIMIT 1");
        $smtpConfig = $result->fetch(PDO::FETCH_ASSOC);

        if ($smtpConfig) {
            $mail->isSMTP();

            $server = $smtpConfig['server'];
            $serverinfo = explode("://", $server);
            if (count($serverinfo) > 1) {
                $smtpsecure = $serverinfo[0];
                $server = $serverinfo[1];
                if ($smtpsecure == 'tls') {
                    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                } elseif ($smtpsecure == 'ssl') {
                    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
                }
            }

            $mail->Host = $server;
            $mail->Port = !empty($smtpConfig['server_port']) ? $smtpConfig['server_port'] : 587;
            $mail->Username = $smtpConfig['server_username'];

            // Déchiffrer le mot de passe
            require_once(dirname(__DIR__) . '/includes/runtime/Functions.php');
            $password = Vtiger_Functions::fromProtectedText($smtpConfig['server_password']);
            $mail->Password = $password;

            if (!empty($smtpConfig['server_username'])) {
                $mail->SMTPAuth = true;
            }
        }

        // Configuration email
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->setFrom($fromEmail, $fromName);
        $mail->addAddress($toEmail);
        $mail->addReplyTo($fromEmail, $fromName);

        // Ajouter le PDF en pièce jointe
        if (file_exists($pdfPath)) {
            $mail->addAttachment($pdfPath, $pdfFilename);
        }

        // Sujet et corps de l'email
        $contactName = trim($invoice['firstname'] . ' ' . $invoice['lastname']);
        $invoiceNo = $invoice['invoice_no'];
        $subject = $invoice['subject'];

        $mail->Subject = "Votre facture $invoiceNo - Paiement confirmé";
        $mail->isHTML(true);

        $mail->Body = generateInvoiceEmailHTML($contactName, $invoiceNo, $subject, $fromName);
        $mail->AltBody = "Bonjour $contactName,\n\nVotre paiement a été confirmé.\n\nVeuillez trouver ci-joint votre facture $invoiceNo.\n\nCordialement,\n$fromName";

        // Envoyer
        $mailStatus = $mail->send();

        if ($mailStatus) {
            logStripe("Email avec PDF envoyé à $toEmail");
            return true;
        } else {
            logStripe("Erreur envoi email: " . $mail->ErrorInfo, 'error');
            return false;
        }

    } catch (Exception $e) {
        logStripe("ERREUR sendInvoicePDFEmail: " . $e->getMessage(), 'error');
        return false;
    }
}

/**
 * Envoyer un email de notification sans PDF (fallback)
 */
function sendInvoiceNotificationEmail($invoice, $toEmail, $fromName, $fromEmail) {
    logStripe("sendInvoiceNotificationEmail: envoi notification sans PDF à $toEmail");

    try {
        require_once(dirname(__DIR__) . '/libraries/PHPMailer/PHPMailer.php');
        require_once(dirname(__DIR__) . '/libraries/PHPMailer/SMTP.php');
        require_once(dirname(__DIR__) . '/libraries/PHPMailer/Exception.php');

        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $pdo = getDbConnection();

        // Configuration SMTP
        $result = $pdo->query("SELECT * FROM vtiger_systems WHERE server_type = 'email' LIMIT 1");
        $smtpConfig = $result->fetch(PDO::FETCH_ASSOC);

        if ($smtpConfig) {
            $mail->isSMTP();
            $server = $smtpConfig['server'];
            $serverinfo = explode("://", $server);
            if (count($serverinfo) > 1) {
                $smtpsecure = $serverinfo[0];
                $server = $serverinfo[1];
                if ($smtpsecure == 'tls') {
                    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                } elseif ($smtpsecure == 'ssl') {
                    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
                }
            }

            $mail->Host = $server;
            $mail->Port = !empty($smtpConfig['server_port']) ? $smtpConfig['server_port'] : 587;
            $mail->Username = $smtpConfig['server_username'];

            require_once(dirname(__DIR__) . '/includes/runtime/Functions.php');
            $password = Vtiger_Functions::fromProtectedText($smtpConfig['server_password']);
            $mail->Password = $password;

            if (!empty($smtpConfig['server_username'])) {
                $mail->SMTPAuth = true;
            }
        }

        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->setFrom($fromEmail, $fromName);
        $mail->addAddress($toEmail);

        $contactName = trim($invoice['firstname'] . ' ' . $invoice['lastname']);
        $invoiceNo = $invoice['invoice_no'];
        $subject = $invoice['subject'];

        $mail->Subject = "Confirmation de paiement - Facture $invoiceNo";
        $mail->isHTML(true);
        $mail->Body = generateInvoiceEmailHTML($contactName, $invoiceNo, $subject, $fromName);
        $mail->AltBody = "Bonjour $contactName,\n\nVotre paiement a été confirmé pour la facture $invoiceNo.\n\nCordialement,\n$fromName";

        $mailStatus = $mail->send();
        if ($mailStatus) {
            logStripe("Email de notification envoyé à $toEmail");
            return true;
        }

        return false;

    } catch (Exception $e) {
        logStripe("ERREUR sendInvoiceNotificationEmail: " . $e->getMessage(), 'error');
        return false;
    }
}

/**
 * Générer le HTML de l'email de facture
 */
function generateInvoiceEmailHTML($contactName, $invoiceNo, $subject, $fromName) {
    $html = '<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #07295b 0%, #0a3d7a 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Paiement confirmé</h1>
                        </td>
                    </tr>

                    <!-- Contenu -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Bonjour <strong>' . htmlspecialchars($contactName) . '</strong>,
                            </p>

                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
                                Nous vous confirmons la bonne réception de votre paiement.
                            </p>

                            <table role="presentation" style="width: 100%; background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 10px 0; color: #666; font-size: 13px;">FACTURE</p>
                                        <p style="margin: 0; color: #07295b; font-size: 20px; font-weight: bold;">' . htmlspecialchars($invoiceNo) . '</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 15px;">
                                        <p style="margin: 0; color: #333; font-size: 14px;">' . htmlspecialchars($subject) . '</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
                                Vous trouverez votre facture en pièce jointe de cet email.
                            </p>

                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                                Pour toute question, n\'hésitez pas à nous contacter.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0; color: #666; font-size: 13px;">
                                Cordialement,<br>
                                <strong>' . htmlspecialchars($fromName) . '</strong>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>';

    return $html;
}
