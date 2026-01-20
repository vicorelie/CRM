<?php

/**
 * Action pour gérer les paiements Stripe multiples
 */
class Quotes_ManageStripePayments_Action extends Vtiger_BasicAjax_Action {

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $mode = $request->get('mode');
            $quoteId = $request->get('record');

            if (empty($quoteId)) {
                throw new Exception('ID du devis manquant');
            }

            switch ($mode) {
                case 'getPaymentInfo':
                    $result = $this->getPaymentInfo($quoteId);
                    break;

                case 'createPaymentLink':
                    $amount = $request->get('amount');
                    $description = $request->get('description');
                    $result = $this->createPaymentLink($quoteId, $amount, $description);
                    break;

                case 'generateInvoice':
                    $amount = $request->get('amount');
                    $description = $request->get('description');
                    $result = $this->generateInvoice($quoteId, $amount, $description);
                    break;

                default:
                    throw new Exception('Mode inconnu: ' . $mode);
            }

            $response->setResult($result);

        } catch (Exception $e) {
            error_log('[STRIPE] ERREUR ManageStripePayments: ' . $e->getMessage());
            $response->setResult(array(
                'success' => false,
                'message' => 'Erreur: ' . $e->getMessage()
            ));
        }

        $response->emit();
    }

    /**
     * Récupérer les informations de paiement du devis
     */
    private function getPaymentInfo($quoteId) {
        $db = PearDatabase::getInstance();

        // Récupérer les montants du devis
        $query = "SELECT
                    qcf.cf_1055 as total_acompte,
                    qcf.cf_1057 as total_solde
                  FROM vtiger_quotes q
                  LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
                  WHERE q.quoteid = ?";

        $result = $db->pquery($query, array($quoteId));

        if ($db->num_rows($result) == 0) {
            throw new Exception('Devis non trouvé');
        }

        $quoteData = $db->fetch_array($result);
        $totalAcompte = floatval($quoteData['total_acompte']);
        $totalSolde = floatval($quoteData['total_solde']);
        $totalGeneral = $totalAcompte + $totalSolde;

        // Récupérer tous les paiements effectués/en attente
        $paymentsQuery = "SELECT
                            id,
                            payment_type,
                            amount,
                            description,
                            stripe_link,
                            status,
                            invoice_id,
                            created_date,
                            paid_date
                          FROM vtiger_stripe_payments
                          WHERE quote_id = ?
                          ORDER BY created_date DESC";

        $paymentsResult = $db->pquery($paymentsQuery, array($quoteId));
        $payments = array();
        $totalPaid = 0;
        $totalPending = 0;

        while ($payment = $db->fetch_array($paymentsResult)) {
            $payments[] = array(
                'id' => $payment['id'],
                'type' => $payment['payment_type'],
                'amount' => floatval($payment['amount']),
                'description' => $payment['description'],
                'link' => $payment['stripe_link'],
                'status' => $payment['status'],
                'invoice_id' => $payment['invoice_id'],
                'created_date' => $payment['created_date'],
                'paid_date' => $payment['paid_date']
            );

            if ($payment['status'] === 'paid') {
                $totalPaid += floatval($payment['amount']);
            } elseif ($payment['status'] === 'pending') {
                $totalPending += floatval($payment['amount']);
            }
        }

        $remaining = $totalGeneral - $totalPaid;

        return array(
            'success' => true,
            'data' => array(
                'total_acompte' => $totalAcompte,
                'total_solde' => $totalSolde,
                'total_general' => $totalGeneral,
                'total_paid' => $totalPaid,
                'total_pending' => $totalPending,
                'remaining' => $remaining,
                'payments' => $payments
            )
        );
    }

    /**
     * Créer un nouveau lien de paiement Stripe
     */
    private function createPaymentLink($quoteId, $amount, $description) {
        $amount = floatval($amount);

        if ($amount <= 0) {
            throw new Exception('Le montant doit être supérieur à 0');
        }

        // Charger le helper Stripe
        require_once(__DIR__ . '/../../../stripe/StripeHelper.php');

        // Récupérer les données du devis pour le client
        $db = PearDatabase::getInstance();
        $query = "SELECT
                    q.quote_no,
                    q.subject,
                    c.firstname,
                    c.lastname,
                    c.email
                  FROM vtiger_quotes q
                  LEFT JOIN vtiger_contactdetails c ON c.contactid = q.contactid
                  WHERE q.quoteid = ?";

        $result = $db->pquery($query, array($quoteId));
        $quoteData = $db->fetch_array($result);

        // Créer le lien de paiement
        $paymentLink = StripeHelper::createPaymentLink(
            $amount,
            $description ?: 'Paiement',
            $quoteData,
            $quoteId
        );

        // Enregistrer le paiement dans la base
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $userId = $currentUser->getId();

        $insertQuery = "INSERT INTO vtiger_stripe_payments
                        (quote_id, payment_type, amount, description, stripe_link, status, created_date, created_by)
                        VALUES (?, 'custom', ?, ?, ?, 'pending', NOW(), ?)";

        $db->pquery($insertQuery, array($quoteId, $amount, $description, $paymentLink, $userId));
        $paymentId = $db->getLastInsertID();

        StripeHelper::log("Nouveau lien de paiement créé pour devis #$quoteId - Montant: $amount EUR - ID: $paymentId");

        return array(
            'success' => true,
            'message' => 'Lien de paiement créé avec succès',
            'payment_id' => $paymentId,
            'link' => $paymentLink
        );
    }

    /**
     * Générer une facture pour un paiement
     */
    private function generateInvoice($quoteId, $amount, $description) {
        $amount = floatval($amount);

        if ($amount <= 0) {
            throw new Exception('Le montant doit être supérieur à 0');
        }

        // TODO: Implémenter la génération de facture
        // Pour l'instant, retourner un message

        return array(
            'success' => true,
            'message' => 'Génération de facture à implémenter',
            'invoice_id' => null
        );
    }
}
