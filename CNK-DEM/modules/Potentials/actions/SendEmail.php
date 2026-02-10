<?php

/**
 * Action pour envoyer un email avec templates EMAILMaker et PDFs PDFMaker
 */
class Potentials_SendEmail_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $moduleName = $request->getModule();
        $recordId = $request->get('record');

        if (!empty($recordId)) {
            if (!Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId)) {
                throw new AppException(vtranslate('LBL_PERMISSION_DENIED', $moduleName));
            }
        }
    }

    private function log($message) {
        $logFile = dirname(__FILE__) . '/../../../logs/potential_email_debug.log';
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $message . "\n", FILE_APPEND);
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $this->log("=== Début SendEmail ===");

            $recordId = $request->get('record');
            $toEmail = $request->get('email');
            $ccEmail = $request->get('cc');
            $emailTemplateId = $request->get('email_template');
            $pdfTemplateIds = $request->get('pdf_templates');
            $quoteId = $request->get('quote_id');

            $this->log("Record: $recordId, Email: $toEmail, CC: $ccEmail, EmailTemplate: $emailTemplateId, PDFs: " . json_encode($pdfTemplateIds) . ", QuoteId: $quoteId");

            // Déterminer le module et record cible
            $targetModule = 'Potentials';
            $targetRecordId = $recordId;
            if (!empty($quoteId)) {
                $targetModule = 'Quotes';
                $targetRecordId = $quoteId;
                $this->log("Mode Devis: module=$targetModule, targetRecord=$targetRecordId");
            }

            if (empty($recordId)) {
                throw new Exception('ID d\'affaire manquant');
            }
            if (empty($toEmail)) {
                throw new Exception('Adresse email manquante');
            }
            if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Adresse email invalide');
            }
            if (empty($emailTemplateId)) {
                throw new Exception('Template email manquant');
            }

            // Langue courante
            $language = Vtiger_Language_Handler::getLanguage();

            // Récupérer le contact lié à l'affaire
            $potentialModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');
            $contactId = $potentialModel->get('contact_id');
            $this->log("Contact ID lié: $contactId");

            // 1. Générer le contenu email avec EMAILMaker
            $this->log("Génération du contenu email avec EMAILMaker template $emailTemplateId");

            $recipientId = !empty($contactId) ? $contactId : '';
            $recipientModule = !empty($contactId) ? 'Contacts' : '';

            $emailContentModel = EMAILMaker_EMAILContent_Model::getInstanceById(
                $emailTemplateId,
                $language,
                $targetModule,
                $targetRecordId,
                $recipientId,
                $recipientModule
            );
            $emailContentModel->getContent(true, true, true);

            $subject = $emailContentModel->getSubject();
            $body = $emailContentModel->getBody();

            $this->log("Subject: $subject");
            $this->log("Body length: " . strlen($body));
            // Debug: premiers 500 chars du body pour vérifier la substitution
            $this->log("Body preview: " . substr(strip_tags($body), 0, 500));

            if (empty($subject)) {
                $subject = 'Information concernant votre dossier';
            }

            // 2. Générer les PDFs avec PDFMaker
            $pdfAttachments = [];
            if (!empty($pdfTemplateIds) && is_array($pdfTemplateIds)) {
                $this->log("Génération de " . count($pdfTemplateIds) . " PDFs");

                foreach ($pdfTemplateIds as $pdfTemplateId) {
                    try {
                        $pdfPath = $this->generatePDFFile($pdfTemplateId, $targetRecordId, $language, $targetModule);
                        if ($pdfPath && file_exists($pdfPath)) {
                            // Récupérer le nom du template pour le fichier
                            $db = PearDatabase::getInstance();
                            $res = $db->pquery("SELECT filename FROM vtiger_pdfmaker WHERE templateid = ?", [$pdfTemplateId]);
                            $pdfName = ($db->num_rows($res) > 0) ? $db->query_result($res, 0, 'filename') : 'document';
                            $pdfAttachments[] = [
                                'path' => $pdfPath,
                                'name' => $pdfName . '.pdf'
                            ];
                            $this->log("PDF généré: $pdfPath");
                        }
                    } catch (Exception $e) {
                        $this->log("Erreur PDF $pdfTemplateId: " . $e->getMessage());
                    }
                }
            }

            // 3. Envoyer l'email via PHPMailer directement (comme VTiger natif)
            $this->log("Envoi email à $toEmail");
            require_once 'modules/Emails/mail.php';

            $mail = new PHPMailer\PHPMailer\PHPMailer();
            $mail->IsHTML(true);
            $mail->IsSMTP();
            $mail->CharSet = 'UTF-8';

            // Configurer le serveur SMTP
            setMailServerProperties($mail);

            if (empty($mail->Host)) {
                throw new Exception('Serveur email sortant non configuré dans VTiger');
            }

            // Récupérer l'email expéditeur depuis la config
            $db = PearDatabase::getInstance();
            $sysResult = $db->pquery("SELECT from_email_field FROM vtiger_systems WHERE server_type = ?", ['email']);
            $fromEmail = '';
            if ($db->num_rows($sysResult) > 0) {
                $fromEmail = $db->query_result($sysResult, 0, 'from_email_field');
            }
            if (empty($fromEmail)) {
                $currentUser = Users_Record_Model::getCurrentUserModel();
                $fromEmail = $currentUser->get('email1');
            }
            $currentUser = Users_Record_Model::getCurrentUserModel();
            $fromName = $currentUser->get('userlabel') ?: $currentUser->get('first_name') . ' ' . $currentUser->get('last_name');

            $mail->From = $fromEmail;
            $mail->FromName = $fromName;
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->AddAddress($toEmail);

            // Ajouter les adresses CC
            $ccAddresses = [];
            if (!empty($ccEmail)) {
                $ccParts = array_map('trim', explode(',', $ccEmail));
                foreach ($ccParts as $cc) {
                    if (filter_var($cc, FILTER_VALIDATE_EMAIL)) {
                        $mail->AddCC($cc);
                        $ccAddresses[] = $cc;
                        $this->log("CC ajouté: $cc");
                    }
                }
            }

            $this->log("From: $fromEmail ($fromName), Host: " . $mail->Host);

            // Ajouter les pièces jointes PDF
            foreach ($pdfAttachments as $attachment) {
                if (file_exists($attachment['path'])) {
                    $mail->AddAttachment($attachment['path'], $attachment['name']);
                    $this->log("Pièce jointe ajoutée: " . $attachment['name']);
                }
            }

            // Ajouter les documents attachés au template EMAILMaker
            $documentIds = $emailContentModel->getAttachments();
            if (!empty($documentIds)) {
                foreach ($documentIds as $documentId) {
                    try {
                        $documentModel = Vtiger_Record_Model::getInstanceById($documentId, 'Documents');
                        $fileDetails = $documentModel->getFileDetails();
                        if (!empty($fileDetails) && !empty($fileDetails['path']) && !empty($fileDetails['name'])) {
                            $filePath = $fileDetails['path'] . $fileDetails['attachmentsid'] . '_' . $fileDetails['name'];
                            if (file_exists($filePath)) {
                                $mail->AddAttachment($filePath, $fileDetails['name']);
                                $this->log("Document EMAILMaker joint: " . $fileDetails['name']);
                            }
                        }
                    } catch (Exception $e) {
                        $this->log("Erreur document $documentId: " . $e->getMessage());
                    }
                }
            }

            $this->log("Envoi SMTP en cours...");
            $mailResult = MailSend($mail);

            if ($mailResult != 1) {
                throw new Exception('Erreur envoi email: ' . $mailResult);
            }
            $this->log("MailSend OK");

            // Enregistrer l'email dans l'historique VTiger
            $ccString = !empty($ccAddresses) ? implode(',', $ccAddresses) : '';
            $this->saveEmailToHistory($recordId, $toEmail, $ccString, $subject, $body, $emailTemplateId, !empty($pdfTemplateIds));
            $this->log("Email enregistré dans l'historique");

            // Nettoyer les fichiers temporaires PDF
            foreach ($pdfAttachments as $attachment) {
                if (file_exists($attachment['path'])) {
                    @unlink($attachment['path']);
                }
            }

            $this->log("=== Email envoyé avec succès ===");

            $response->setResult([
                'success' => true,
                'message' => 'Email envoyé avec succès'
            ]);

        } catch (Exception $e) {
            $this->log("ERREUR: " . $e->getMessage());
            $response->setResult([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }

        $response->emit();
    }

    /**
     * Générer un fichier PDF avec PDFMaker
     */
    private function generatePDFFile($templateId, $recordId, $language, $moduleName = 'Potentials') {
        require_once 'modules/PDFMaker/models/PDFMaker.php';
        require_once 'modules/PDFMaker/resources/pdfjs.php';

        $pdfMakerModel = new PDFMaker_PDFMaker_Model();

        $mpdf = '';
        $name = $pdfMakerModel->GetPreparedMPDF(
            $mpdf,
            [$recordId],
            [$templateId],
            $moduleName,
            $language,
            [],
            false
        );

        if (!is_object($mpdf)) {
            throw new Exception("Erreur lors de la génération du PDF (template $templateId)");
        }

        // Sauvegarder dans un fichier temporaire
        $tempDir = sys_get_temp_dir();
        $pdfPath = $tempDir . '/potential_pdf_' . $recordId . '_' . $templateId . '_' . time() . '.pdf';
        $mpdf->Output($pdfPath, 'F');

        return $pdfPath;
    }

    /**
     * Enregistrer l'email envoyé dans l'historique VTiger
     */
    private function saveEmailToHistory($potentialId, $toEmail, $ccEmail, $subject, $body, $templateId, $hasAttachments) {
        try {
            $db = PearDatabase::getInstance();
            $currentUser = Users_Record_Model::getCurrentUserModel();
            $userId = $currentUser->getId();

            // Créer un enregistrement dans vtiger_crmentity (type ITS4YouEmails)
            $crmId = $db->getUniqueID('vtiger_crmentity');
            $this->log("saveEmailToHistory: crmId=$crmId, userId=$userId");

            $sql = "INSERT INTO vtiger_crmentity (crmid, smcreatorid, smownerid, modifiedby, setype, description, createdtime, modifiedtime, presence, deleted)
                    VALUES (?, ?, ?, ?, 'ITS4YouEmails', ?, NOW(), NOW(), 1, 0)";
            $result1 = $db->pquery($sql, [
                $crmId,
                $userId,
                $userId,
                $userId,
                strip_tags(substr($body, 0, 500))
            ]);
            $this->log("INSERT vtiger_crmentity result: " . ($result1 ? 'OK' : 'FAILED'));

            // Récupérer le contact_id lié à l'affaire
            $contactId = 0;
            $potResult = $db->pquery("SELECT contact_id FROM vtiger_potential WHERE potentialid = ?", [$potentialId]);
            if ($db->num_rows($potResult) > 0) {
                $contactId = intval($db->query_result($potResult, 0, 'contact_id'));
            }

            // Récupérer l'email expéditeur
            $fromEmail = $currentUser->get('email1') ?: 'noreply@cnkdem.com';

            // Insérer dans its4you_emails (table lue par l'historique)
            $toEmailJson = json_encode([$toEmail]);
            $this->log("INSERT its4you_emails: crmId=$crmId, from=$fromEmail, to=$toEmailJson, related_to=$potentialId, contact_id=$contactId");

            $sql = "INSERT INTO its4you_emails (its4you_emails_id, from_email, to_email, cc_email, bcc_email, subject, body, email_flag, related_to, contact_id, user_id, email_template_ids, emails_module)
                    VALUES (?, ?, ?, ?, '', ?, ?, 'SENT', ?, ?, ?, ?, 'Potentials')";
            $result2 = $db->pquery($sql, [
                $crmId,
                $fromEmail,
                $toEmailJson,
                $ccEmail ?: '',
                $subject,
                $body,
                $potentialId,
                $contactId ?: 0,
                $userId,
                $templateId
            ]);
            $this->log("INSERT its4you_emails result: " . ($result2 ? 'OK' : 'FAILED'));

            // Vérification: confirmer que le record existe
            $checkResult = $db->pquery("SELECT its4you_emails_id FROM its4you_emails WHERE its4you_emails_id = ?", [$crmId]);
            $this->log("Verification its4you_emails: " . $db->num_rows($checkResult) . " rows found for ID $crmId");

            $this->log("Email enregistré: ID=$crmId");

        } catch (Exception $e) {
            $this->log("Erreur lors de l'enregistrement de l'email: " . $e->getMessage());
        }
    }
}
