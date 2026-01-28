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

                case 'getContactEmail':
                    $result = $this->getContactEmail($quoteId);
                    break;

                case 'sendPaymentEmail':
                    $emailTo = $request->get('email_to');
                    $emailSubject = $request->get('email_subject');
                    $emailBody = $request->get('email_body');
                    $isHtml = $request->get('is_html') == 1;
                    $result = $this->sendPaymentEmail($quoteId, $emailTo, $emailSubject, $emailBody, $isHtml);
                    break;

                case 'deletePayment':
                    $paymentId = $request->get('payment_id');
                    $result = $this->deletePayment($paymentId, $quoteId);
                    break;

                case 'addManualPayment':
                    $amount = $request->get('amount');
                    $description = $request->get('description');
                    $paymentMethod = $request->get('payment_method');
                    $markAsPaid = $request->get('mark_as_paid') == '1';
                    $result = $this->addManualPayment($quoteId, $amount, $description, $paymentMethod, $markAsPaid);
                    break;

                case 'updatePaymentStatus':
                    $paymentId = $request->get('payment_id');
                    $newStatus = $request->get('new_status');
                    $result = $this->updatePaymentStatus($paymentId, $quoteId, $newStatus);
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

        // Récupérer les montants du devis et l'email du contact
        $query = "SELECT
                    qcf.cf_1055 as total_acompte,
                    qcf.cf_1057 as total_solde,
                    c.email as contact_email
                  FROM vtiger_quotes q
                  LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
                  LEFT JOIN vtiger_contactdetails c ON c.contactid = q.contactid
                  WHERE q.quoteid = ?";

        $result = $db->pquery($query, array($quoteId));

        if ($db->num_rows($result) == 0) {
            throw new Exception('Devis non trouvé');
        }

        $quoteData = $db->fetch_array($result);
        $totalAcompte = floatval($quoteData['total_acompte']);
        $totalSolde = floatval($quoteData['total_solde']);
        $totalGeneral = $totalAcompte + $totalSolde;
        $contactEmail = $quoteData['contact_email'] ?: '';

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
                'payments' => $payments,
                'contact_email' => $contactEmail
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

        // Créer le lien de paiement avec les détails (URL + ID)
        $linkDetails = StripeHelper::createPaymentLinkWithDetails(
            $amount,
            $description ?: 'Paiement',
            $quoteData,
            $quoteId
        );

        $paymentLinkUrl = $linkDetails['url'];
        $paymentLinkId = $linkDetails['id'];

        // Enregistrer le paiement dans la base avec l'ID Stripe
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $userId = $currentUser->getId();

        $insertQuery = "INSERT INTO vtiger_stripe_payments
                        (quote_id, payment_type, amount, description, stripe_link, stripe_payment_link_id, status, created_date, created_by)
                        VALUES (?, 'custom', ?, ?, ?, ?, 'pending', NOW(), ?)";

        $db->pquery($insertQuery, array($quoteId, $amount, $description, $paymentLinkUrl, $paymentLinkId, $userId));
        $paymentId = $db->getLastInsertID();

        StripeHelper::log("Nouveau lien de paiement créé pour devis #$quoteId - Montant: $amount EUR - ID DB: $paymentId - Stripe ID: $paymentLinkId");

        return array(
            'success' => true,
            'message' => 'Lien de paiement créé avec succès',
            'payment_id' => $paymentId,
            'link' => $paymentLinkUrl
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

    /**
     * Récupérer l'email du contact lié au devis et toutes les infos nécessaires
     */
    private function getContactEmail($quoteId) {
        $db = PearDatabase::getInstance();

        // Récupérer les infos du devis et du contact
        $query = "SELECT
                    q.quote_no,
                    q.subject,
                    qcf.cf_1055 as acompte_ttc,
                    qcf.cf_1057 as solde_ttc,
                    qcf.cf_1079 as lien_acompte,
                    qcf.cf_1081 as lien_solde,
                    c.firstname as contact_firstname,
                    c.lastname as contact_lastname,
                    c.email as contact_email
                  FROM vtiger_quotes q
                  LEFT JOIN vtiger_quotescf qcf ON qcf.quoteid = q.quoteid
                  LEFT JOIN vtiger_contactdetails c ON c.contactid = q.contactid
                  WHERE q.quoteid = ?";

        $result = $db->pquery($query, array($quoteId));

        if ($db->num_rows($result) == 0) {
            throw new Exception('Devis non trouvé');
        }

        $row = $db->fetch_array($result);

        // Récupérer les infos de l'utilisateur courant
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $userFirstName = $currentUser->get('first_name');
        $userLastName = $currentUser->get('last_name');
        $userEmail = $currentUser->get('email1');
        $userPhone = $currentUser->get('phone_mobile') ?: $currentUser->get('phone_work');
        $userRole = $currentUser->get('roleid');

        // Récupérer le nom du rôle
        $roleResult = $db->pquery("SELECT rolename FROM vtiger_role WHERE roleid = ?", array($userRole));
        $roleName = '';
        if ($db->num_rows($roleResult) > 0) {
            $roleName = $db->query_result($roleResult, 0, 'rolename');
        }

        // Récupérer les infos de l'entreprise
        $companyResult = $db->pquery("SELECT * FROM vtiger_organizationdetails LIMIT 1", array());
        $companyName = '';
        $companyLogo = '';
        $companyWebsite = '';
        if ($db->num_rows($companyResult) > 0) {
            $companyName = $db->query_result($companyResult, 0, 'organizationname');
            $companyLogo = $db->query_result($companyResult, 0, 'logoname');
            $companyWebsite = $db->query_result($companyResult, 0, 'website');
        }

        return array(
            'success' => true,
            'email' => $row['contact_email'] ?: '',
            'contact_firstname' => $row['contact_firstname'] ?: '',
            'contact_lastname' => $row['contact_lastname'] ?: '',
            'name' => trim(($row['contact_firstname'] ?: '') . ' ' . ($row['contact_lastname'] ?: '')),
            'quote_no' => $row['quote_no'] ?: '',
            'acompte_ttc' => floatval($row['acompte_ttc']),
            'solde_ttc' => floatval($row['solde_ttc']),
            'lien_acompte' => $row['lien_acompte'] ?: '',
            'lien_solde' => $row['lien_solde'] ?: '',
            'user_firstname' => $userFirstName,
            'user_lastname' => $userLastName,
            'user_email' => $userEmail,
            'user_phone' => $userPhone,
            'user_role' => $roleName,
            'company_name' => $companyName,
            'company_logo' => $companyLogo ? 'test/logo/' . $companyLogo : '',
            'company_website' => $companyWebsite
        );
    }

    /**
     * Envoyer un email avec le lien de paiement
     * Utilise PHPMailer directement avec encodage UTF-8 correct
     */
    private function sendPaymentEmail($quoteId, $emailTo, $emailSubject, $emailBody, $isHtml = false) {
        if (empty($emailTo)) {
            throw new Exception('Adresse email manquante');
        }

        if (!filter_var($emailTo, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Adresse email invalide');
        }

        $currentUser = Users_Record_Model::getCurrentUserModel();

        // Récupérer les informations de configuration email
        $fromEmail = $currentUser->get('email1');
        $fromName = $currentUser->get('first_name') . ' ' . $currentUser->get('last_name');

        if (empty($fromEmail)) {
            // Utiliser l'email par défaut du système
            global $HELPDESK_SUPPORT_EMAIL_ID, $HELPDESK_SUPPORT_NAME;
            $fromEmail = $HELPDESK_SUPPORT_EMAIL_ID;
            $fromName = $HELPDESK_SUPPORT_NAME;
        }

        // Créer une instance PHPMailer directement
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $db = PearDatabase::getInstance();

        try {
            // Configuration SMTP depuis VTiger
            $result = $db->pquery("SELECT * FROM vtiger_systems WHERE server_type = ?", array('email'));
            if ($db->num_rows($result) > 0) {
                $row = $db->fetch_array($result);

                $mail->isSMTP();

                // Le serveur peut être au format "tls://smtp.example.com"
                $server = $row['server'];
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
                $mail->Port = !empty($row['server_port']) ? $row['server_port'] : 587;
                $mail->Username = $row['server_username'];

                // IMPORTANT: Le mot de passe est chiffré dans VTiger
                $password = Vtiger_Functions::fromProtectedText($row['server_password']);
                $mail->Password = $password;

                // Authentification SMTP
                $smtp_auth = $row['smtp_auth'];
                if ($smtp_auth == "1" || $smtp_auth == "true" || !empty($row['server_username'])) {
                    $mail->SMTPAuth = true;
                }
            }

            // IMPORTANT: Encodage UTF-8
            $mail->CharSet = 'UTF-8';
            $mail->Encoding = 'base64';

            // Expéditeur et destinataire
            $mail->setFrom($fromEmail, $fromName);
            $mail->addAddress($emailTo);
            $mail->addReplyTo($fromEmail, $fromName);

            // Sujet
            $mail->Subject = $emailSubject;

            // Corps de l'email
            if ($isHtml) {
                $mail->isHTML(true);
                $mail->Body = $emailBody;
                // Version texte brut
                $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $emailBody));
            } else {
                $mail->isHTML(true);
                $mail->Body = nl2br(htmlspecialchars($emailBody, ENT_QUOTES, 'UTF-8'));
                $mail->AltBody = $emailBody;
            }

            // Envoyer
            $mailStatus = $mail->send();

        } catch (Exception $e) {
            error_log('[STRIPE EMAIL] Erreur PHPMailer: ' . $e->getMessage());
            throw new Exception('Erreur envoi email: ' . $mail->ErrorInfo);
        }

        if ($mailStatus) {
            // Logger l'envoi dans les commentaires du devis
            $logEntry = "[" . date('Y-m-d H:i:s') . "] Email envoye\n";
            $logEntry .= "A: $emailTo\n";
            $logEntry .= "Sujet: $emailSubject\n";
            $logEntry .= "Par: $fromName\n";

            // Récupérer le contenu actuel du champ commentaire stripe
            $stmt = $db->pquery("SELECT cf_1087 FROM vtiger_quotescf WHERE quoteid = ?", array($quoteId));
            $currentContent = '';
            if ($db->num_rows($stmt) > 0) {
                $currentContent = $db->query_result($stmt, 0, 'cf_1087');
            }

            $updatedContent = $logEntry;
            if (!empty($currentContent)) {
                $updatedContent .= "\n---\n\n" . $currentContent;
            }

            $db->pquery("UPDATE vtiger_quotescf SET cf_1087 = ? WHERE quoteid = ?", array($updatedContent, $quoteId));

            return array(
                'success' => true,
                'message' => 'Email envoye avec succes'
            );
        } else {
            throw new Exception('Echec de l\'envoi de l\'email');
        }
    }

    /**
     * Supprimer un paiement Stripe
     */
    private function deletePayment($paymentId, $quoteId) {
        if (empty($paymentId)) {
            throw new Exception('ID du paiement manquant');
        }

        $db = PearDatabase::getInstance();

        // Vérifier que le paiement existe et appartient bien au devis (sécurité)
        $checkQuery = "SELECT id, quote_id, amount, description, status
                       FROM vtiger_stripe_payments
                       WHERE id = ? AND quote_id = ?";

        $result = $db->pquery($checkQuery, array($paymentId, $quoteId));

        if ($db->num_rows($result) == 0) {
            throw new Exception('Paiement non trouvé ou non autorisé');
        }

        $payment = $db->fetch_array($result);

        // Vérifier le statut - on ne peut pas supprimer un paiement déjà payé
        if ($payment['status'] === 'paid') {
            throw new Exception('Impossible de supprimer un paiement déjà effectué');
        }

        // Supprimer le paiement
        $deleteQuery = "DELETE FROM vtiger_stripe_payments WHERE id = ?";
        $db->pquery($deleteQuery, array($paymentId));

        // Charger le helper Stripe pour le logging
        require_once(__DIR__ . '/../../../stripe/StripeHelper.php');

        StripeHelper::log("Paiement supprimé - ID: $paymentId - Devis: $quoteId - Montant: {$payment['amount']} EUR - Description: {$payment['description']}");

        return array(
            'success' => true,
            'message' => 'Paiement supprimé avec succès'
        );
    }

    /**
     * Ajouter un paiement manuel (virement, espèces, chèque)
     */
    private function addManualPayment($quoteId, $amount, $description, $paymentMethod, $markAsPaid = false) {
        $amount = floatval($amount);

        if ($amount <= 0) {
            throw new Exception('Le montant doit être supérieur à 0');
        }

        $validMethods = array('virement', 'especes', 'cheque', 'autre');
        if (!in_array($paymentMethod, $validMethods)) {
            throw new Exception('Méthode de paiement invalide');
        }

        $db = PearDatabase::getInstance();
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $userId = $currentUser->getId();

        // Définir le statut et la date de paiement
        $status = $markAsPaid ? 'paid' : 'pending';
        $paidDate = $markAsPaid ? date('Y-m-d H:i:s') : null;

        // Insérer le paiement manuel
        $insertQuery = "INSERT INTO vtiger_stripe_payments
                        (quote_id, payment_type, amount, description, stripe_link, status, created_date, paid_date, created_by)
                        VALUES (?, ?, ?, ?, NULL, ?, NOW(), ?, ?)";

        $db->pquery($insertQuery, array($quoteId, $paymentMethod, $amount, $description, $status, $paidDate, $userId));
        $paymentId = $db->getLastInsertID();

        // Si marqué comme payé, générer la facture et mettre à jour le devis
        if ($markAsPaid) {
            $invoiceId = $this->generateInvoiceForPayment($quoteId, $paymentId, $amount, $description, $paymentMethod);
            $this->updateQuoteAfterPayment($quoteId);
        }

        // Charger le helper Stripe pour le logging
        require_once(__DIR__ . '/../../../stripe/StripeHelper.php');

        $methodLabels = array(
            'virement' => 'Virement bancaire',
            'especes' => 'Espèces',
            'cheque' => 'Chèque',
            'autre' => 'Autre'
        );

        StripeHelper::log("Paiement manuel ajouté - ID: $paymentId - Devis: $quoteId - Méthode: {$methodLabels[$paymentMethod]} - Montant: $amount EUR - Statut: $status");

        return array(
            'success' => true,
            'message' => 'Paiement manuel ajouté avec succès',
            'payment_id' => $paymentId
        );
    }

    /**
     * Mettre à jour le statut d'un paiement
     */
    private function updatePaymentStatus($paymentId, $quoteId, $newStatus) {
        if (empty($paymentId)) {
            throw new Exception('ID du paiement manquant');
        }

        $validStatuses = array('pending', 'paid', 'failed', 'cancelled');
        if (!in_array($newStatus, $validStatuses)) {
            throw new Exception('Statut invalide');
        }

        $db = PearDatabase::getInstance();

        // Vérifier que le paiement existe et appartient bien au devis
        $checkQuery = "SELECT id, quote_id, amount, status, payment_type
                       FROM vtiger_stripe_payments
                       WHERE id = ? AND quote_id = ?";

        $result = $db->pquery($checkQuery, array($paymentId, $quoteId));

        if ($db->num_rows($result) == 0) {
            throw new Exception('Paiement non trouvé ou non autorisé');
        }

        $payment = $db->fetch_array($result);
        $oldStatus = $payment['status'];

        // Mettre à jour le statut
        $paidDate = ($newStatus === 'paid') ? date('Y-m-d H:i:s') : null;

        $updateQuery = "UPDATE vtiger_stripe_payments SET status = ?, paid_date = ? WHERE id = ?";
        $db->pquery($updateQuery, array($newStatus, $paidDate, $paymentId));

        // Si passage à "paid" et pas encore de facture, en générer une
        if ($newStatus === 'paid' && $oldStatus !== 'paid') {
            // Vérifier si une facture existe déjà pour ce paiement
            $checkInvoice = $db->pquery("SELECT invoice_id FROM vtiger_stripe_payments WHERE id = ?", array($paymentId));
            $existingInvoice = $db->query_result($checkInvoice, 0, 'invoice_id');

            if (empty($existingInvoice)) {
                $amount = floatval($payment['amount']);
                $description = $db->query_result($db->pquery("SELECT description FROM vtiger_stripe_payments WHERE id = ?", array($paymentId)), 0, 'description');
                $paymentType = $payment['payment_type'];

                $this->generateInvoiceForPayment($quoteId, $paymentId, $amount, $description, $paymentType);
            }
        }

        // Mettre à jour le devis
        $this->updateQuoteAfterPayment($quoteId);

        // Charger le helper Stripe pour le logging
        require_once(__DIR__ . '/../../../stripe/StripeHelper.php');

        StripeHelper::log("Statut paiement modifié - ID: $paymentId - Devis: $quoteId - Ancien: $oldStatus - Nouveau: $newStatus");

        return array(
            'success' => true,
            'message' => 'Statut mis à jour avec succès'
        );
    }

    /**
     * Mettre à jour le devis après un paiement
     */
    private function updateQuoteAfterPayment($quoteId) {
        $db = PearDatabase::getInstance();

        // Récupérer les montants du devis
        $quoteQuery = "SELECT qcf.cf_1055 as total_acompte, qcf.cf_1057 as total_solde
                       FROM vtiger_quotescf qcf
                       WHERE qcf.quoteid = ?";
        $quoteResult = $db->pquery($quoteQuery, array($quoteId));

        if ($db->num_rows($quoteResult) == 0) {
            return;
        }

        $quoteData = $db->fetch_array($quoteResult);
        $totalAcompte = floatval($quoteData['total_acompte']);
        $totalSolde = floatval($quoteData['total_solde']);
        $totalGeneral = $totalAcompte + $totalSolde;

        // Calculer le total payé
        $paidQuery = "SELECT COALESCE(SUM(amount), 0) as total_paid
                      FROM vtiger_stripe_payments
                      WHERE quote_id = ? AND status = 'paid'";
        $paidResult = $db->pquery($paidQuery, array($quoteId));
        $totalPaid = floatval($db->query_result($paidResult, 0, 'total_paid'));

        // Calculer le reste à payer
        $resteAPayer = $totalGeneral - $totalPaid;
        if ($resteAPayer < 0) $resteAPayer = 0;

        // Déterminer les statuts
        $statutAcompte = '';
        $statutSolde = '';

        if ($totalPaid > 0) {
            if ($totalPaid < $totalAcompte) {
                $statutAcompte = 'Partiel';
                $statutSolde = '';
            } elseif ($totalPaid >= $totalAcompte && $totalPaid < $totalGeneral) {
                $statutAcompte = 'Payé';
                if ($totalPaid > $totalAcompte) {
                    $statutSolde = 'Partiel';
                }
            } elseif ($totalPaid >= $totalGeneral) {
                $statutAcompte = 'Payé';
                $statutSolde = 'Payé';
            }
        }

        // Mettre à jour le devis
        $updateQuery = "UPDATE vtiger_quotescf
                        SET cf_1275 = ?, cf_1083 = ?, cf_1085 = ?
                        WHERE quoteid = ?";
        $db->pquery($updateQuery, array($resteAPayer, $statutAcompte, $statutSolde, $quoteId));
    }

    /**
     * Générer une facture pour un paiement manuel
     */
    private function generateInvoiceForPayment($quoteId, $paymentId, $amount, $description, $paymentMethod) {
        $db = PearDatabase::getInstance();
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $userId = $currentUser->getId();

        require_once(__DIR__ . '/../../../stripe/StripeHelper.php');
        StripeHelper::log("generateInvoiceForPayment (manuel): quoteId=$quoteId, paymentId=$paymentId, amount=$amount, method=$paymentMethod");

        try {
            // Récupérer les données du devis
            $quoteQuery = "SELECT q.quoteid, q.quote_no, q.subject, q.contactid, q.accountid,
                           q.total, q.subtotal, q.discount_amount, q.currency_id, q.potentialid,
                           ce.smownerid as assigned_user_id,
                           qcf.cf_1055 as acompte_ttc, qcf.cf_1057 as solde_ttc,
                           qcf.cf_1125 as type_forfait, qcf.cf_1127 as tarif_forfait,
                           qcf.cf_1129 as supplement_forfait, qcf.cf_1137 as total_forfait,
                           qcf.cf_1139 as montant_assurance, qcf.cf_1143 as tarif_assurance,
                           qcf.cf_1269 as type_demenagement
                    FROM vtiger_quotes q
                    LEFT JOIN vtiger_crmentity ce ON ce.crmid = q.quoteid
                    LEFT JOIN vtiger_quotescf qcf ON q.quoteid = qcf.quoteid
                    WHERE q.quoteid = ?";
            $quoteResult = $db->pquery($quoteQuery, array($quoteId));

            if ($db->num_rows($quoteResult) == 0) {
                StripeHelper::log("ERREUR: Devis non trouvé", 'error');
                return false;
            }

            $quote = $db->fetch_array($quoteResult);
            $assignedUserId = $quote['assigned_user_id'] ?: $userId;

            // Générer un nouveau numéro de facture en utilisant le système Vtiger natif
            $numResult = $db->pquery(
                "SELECT prefix, cur_id FROM vtiger_modentity_num WHERE semodule = 'Invoice' AND active = 1",
                array()
            );

            if ($db->num_rows($numResult) > 0) {
                $prefix = $db->query_result($numResult, 0, 'prefix');
                $curId = intval($db->query_result($numResult, 0, 'cur_id'));
                $newId = $curId + 1;
                $invoiceNo = $prefix . $newId;

                // Mettre à jour le compteur
                $db->pquery(
                    "UPDATE vtiger_modentity_num SET cur_id = ? WHERE semodule = 'Invoice' AND active = 1",
                    array($newId)
                );
            } else {
                // Fallback si pas de configuration trouvée
                $maxNoResult = $db->pquery("SELECT MAX(invoiceid) as max_id FROM vtiger_invoice", array());
                $maxNo = $db->query_result($maxNoResult, 0, 'max_id') ?: 0;
                $invoiceNo = 'FACTURE' . ($maxNo + 1);
            }

            // Obtenir le prochain ID disponible via la séquence (évite les conflits)
            $seqResult = $db->pquery("SELECT MAX(id) as current_id FROM vtiger_crmentity_seq", array());
            $currentSeq = intval($db->query_result($seqResult, 0, 'current_id')) ?: 0;

            // Vérifier aussi le max réel dans crmentity au cas où
            $maxIdResult = $db->pquery("SELECT MAX(crmid) as max_id FROM vtiger_crmentity", array());
            $maxCrmId = intval($db->query_result($maxIdResult, 0, 'max_id')) ?: 0;

            // Prendre le plus grand des deux + 1
            $invoiceId = max($currentSeq, $maxCrmId) + 1;

            // Mettre à jour la séquence pour éviter les conflits futurs
            $db->pquery("INSERT INTO vtiger_crmentity_seq (id) VALUES (?)", array($invoiceId));

            StripeHelper::log("Création facture: ID=$invoiceId, No=$invoiceNo");

            // Calculer les montants
            $acompteTTC = floatval($quote['acompte_ttc'] ?? 0);
            $soldeTTC = floatval($quote['solde_ttc'] ?? 0);
            $montantTotalDevis = $acompteTTC + $soldeTTC;

            if ($montantTotalDevis == 0) {
                $montantTotalDevis = floatval($quote['total'] ?? 0);
            }

            // Récupérer le total payé
            $paidResult = $db->pquery("SELECT COALESCE(SUM(amount), 0) as total_paid FROM vtiger_stripe_payments WHERE quote_id = ? AND status = 'paid'", array($quoteId));
            $totalReceived = floatval($db->query_result($paidResult, 0, 'total_paid'));

            $balance = $montantTotalDevis - $totalReceived;
            if ($balance < 0) $balance = 0;

            // Déterminer le statut
            $invoiceStatus = 'Created';
            if ($totalReceived >= $montantTotalDevis) {
                $invoiceStatus = 'Paid';
            } elseif ($totalReceived > 0) {
                $invoiceStatus = 'Approved';
            }

            // Créer l'entrée dans vtiger_crmentity
            $now = date('Y-m-d H:i:s');
            $methodLabels = array('virement' => 'Virement', 'especes' => 'Espèces', 'cheque' => 'Chèque', 'autre' => 'Autre', 'custom' => 'Stripe');
            $methodLabel = $methodLabels[$paymentMethod] ?? $paymentMethod;

            $invoiceDescription = "Facture générée pour paiement {$methodLabel}\nMontant: $amount EUR\nDevis: {$quote['quote_no']}";
            $invoiceLabel = $quote['subject'] . ' - ' . ($description ?: $methodLabel);

            $db->pquery(
                "INSERT INTO vtiger_crmentity (crmid, smcreatorid, smownerid, modifiedby, setype, description, createdtime, modifiedtime, presence, deleted, label)
                 VALUES (?, ?, ?, ?, 'Invoice', ?, ?, ?, 1, 0, ?)",
                array($invoiceId, $assignedUserId, $assignedUserId, $assignedUserId, $invoiceDescription, $now, $now, $invoiceLabel)
            );

            // Créer l'entrée dans vtiger_invoice
            $invoiceDate = date('Y-m-d');
            $dueDate = date('Y-m-d', strtotime('+30 days'));

            $db->pquery(
                "INSERT INTO vtiger_invoice (invoiceid, invoice_no, subject, contactid, invoicedate, duedate,
                 invoicestatus, accountid, subtotal, total, received, balance, potential_id, quote_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                array(
                    $invoiceId, $invoiceNo, $invoiceLabel, $quote['contactid'],
                    $invoiceDate, $dueDate, $invoiceStatus, $quote['accountid'] ?: NULL,
                    $montantTotalDevis, $montantTotalDevis, $totalReceived, $balance,
                    $quote['potentialid'] ?: NULL, $quoteId
                )
            );

            // Créer l'entrée dans vtiger_invoicecf avec les champs custom
            $db->pquery(
                "INSERT INTO vtiger_invoicecf (invoiceid, cf_1277, cf_1279, cf_1281, cf_1283, cf_1285, cf_1287,
                 cf_1289, cf_1291, cf_1293, cf_1295, cf_1297, cf_1301, cf_1304, cf_1305)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                array(
                    $invoiceId,
                    $quote['type_forfait'] ?? '',
                    $quote['tarif_forfait'] ?? 0,
                    $quote['supplement_forfait'] ?? 0,
                    $quote['total_forfait'] ?? 0,
                    $quote['montant_assurance'] ?? 0,
                    $quote['tarif_assurance'] ?? 0,
                    $acompteTTC,
                    $soldeTTC,
                    $balance,
                    $amount,
                    $methodLabel,
                    $montantTotalDevis,
                    $quote['quote_no'] ?? '',
                    $quote['type_demenagement'] ?? ''
                )
            );

            // Copier l'adresse de facturation du devis vers la facture
            $billAdsResult = $db->pquery(
                "SELECT bill_street, bill_city, bill_state, bill_code, bill_country, bill_pobox
                 FROM vtiger_quotesbillads WHERE quotebilladdressid = ?",
                array($quoteId)
            );

            if ($db->num_rows($billAdsResult) > 0) {
                $billAds = $db->fetch_array($billAdsResult);
                $db->pquery(
                    "INSERT INTO vtiger_invoicebillads (invoicebilladdressid, bill_street, bill_city, bill_state, bill_code, bill_country, bill_pobox)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                    array(
                        $invoiceId,
                        $billAds['bill_street'] ?? '',
                        $billAds['bill_city'] ?? '',
                        $billAds['bill_state'] ?? '',
                        $billAds['bill_code'] ?? '',
                        $billAds['bill_country'] ?? '',
                        $billAds['bill_pobox'] ?? ''
                    )
                );
            } else {
                $db->pquery("INSERT INTO vtiger_invoicebillads (invoicebilladdressid) VALUES (?)", array($invoiceId));
            }

            // Copier l'adresse de livraison du devis vers la facture
            $shipAdsResult = $db->pquery(
                "SELECT ship_street, ship_city, ship_state, ship_code, ship_country, ship_pobox
                 FROM vtiger_quotesshipads WHERE quoteshipaddressid = ?",
                array($quoteId)
            );

            if ($db->num_rows($shipAdsResult) > 0) {
                $shipAds = $db->fetch_array($shipAdsResult);
                $db->pquery(
                    "INSERT INTO vtiger_invoiceshipads (invoiceshipaddressid, ship_street, ship_city, ship_state, ship_code, ship_country, ship_pobox)
                     VALUES (?, ?, ?, ?, ?, ?, ?)",
                    array(
                        $invoiceId,
                        $shipAds['ship_street'] ?? '',
                        $shipAds['ship_city'] ?? '',
                        $shipAds['ship_state'] ?? '',
                        $shipAds['ship_code'] ?? '',
                        $shipAds['ship_country'] ?? '',
                        $shipAds['ship_pobox'] ?? ''
                    )
                );
            } else {
                $db->pquery("INSERT INTO vtiger_invoiceshipads (invoiceshipaddressid) VALUES (?)", array($invoiceId));
            }

            // Créer la relation avec le devis
            $db->pquery("INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule) VALUES (?, 'Invoice', ?, 'Quotes')", array($invoiceId, $quoteId));

            // Créer la relation avec l'affaire si elle existe
            if (!empty($quote['potentialid'])) {
                $db->pquery("INSERT INTO vtiger_crmentityrel (crmid, module, relcrmid, relmodule) VALUES (?, 'Potentials', ?, 'Invoice')", array($quote['potentialid'], $invoiceId));
            }

            // Copier les produits du devis vers la facture
            $this->copyProductsFromQuoteToInvoice($quoteId, $invoiceId);

            // Enregistrer l'ID de la facture dans le paiement
            $db->pquery("UPDATE vtiger_stripe_payments SET invoice_id = ? WHERE id = ?", array($invoiceId, $paymentId));

            StripeHelper::log("✓ Facture créée avec succès: ID=$invoiceId, No=$invoiceNo");

            return $invoiceId;

        } catch (Exception $e) {
            StripeHelper::log("ERREUR generateInvoiceForPayment: " . $e->getMessage(), 'error');
            return false;
        }
    }

    /**
     * Copier les produits du devis vers la facture
     */
    private function copyProductsFromQuoteToInvoice($quoteId, $invoiceId) {
        $db = PearDatabase::getInstance();

        try {
            // Récupérer les produits du devis
            $productsResult = $db->pquery(
                "SELECT productid, sequence_no, quantity, listprice, comment, discount_amount, discount_percent, tax1
                 FROM vtiger_inventoryproductrel
                 WHERE id = ?
                 ORDER BY sequence_no",
                array($quoteId)
            );

            if ($db->num_rows($productsResult) == 0) {
                return;
            }

            $sequence = 1;
            while ($product = $db->fetch_array($productsResult)) {
                $db->pquery(
                    "INSERT INTO vtiger_inventoryproductrel (id, productid, sequence_no, quantity, listprice, comment, discount_amount, discount_percent, tax1, incrementondel)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                    array(
                        $invoiceId,
                        $product['productid'],
                        $sequence,
                        $product['quantity'],
                        $product['listprice'],
                        $product['comment'],
                        $product['discount_amount'],
                        $product['discount_percent'],
                        $product['tax1']
                    )
                );
                $sequence++;
            }

            require_once(__DIR__ . '/../../../stripe/StripeHelper.php');
            StripeHelper::log("Produits copiés du devis vers la facture: " . ($sequence - 1) . " ligne(s)");

        } catch (Exception $e) {
            require_once(__DIR__ . '/../../../stripe/StripeHelper.php');
            StripeHelper::log("ERREUR copyProductsFromQuoteToInvoice: " . $e->getMessage(), 'error');
        }
    }
}
