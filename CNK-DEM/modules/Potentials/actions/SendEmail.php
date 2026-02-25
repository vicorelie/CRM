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
            $docAttachmentIds = $request->get('doc_attachments');
            $quoteId = $request->get('quote_id');
            $salesOrderId = $request->get('salesorder_id');
            $customSubject = $request->getRaw('custom_subject');
            $customBody = $request->getRaw('custom_body');

            $this->log("Record: $recordId, Email: $toEmail, CC: $ccEmail, EmailTemplate: $emailTemplateId, PDFs: " . json_encode($pdfTemplateIds) . ", Docs: " . json_encode($docAttachmentIds) . ", QuoteId: $quoteId, SOId: $salesOrderId");

            // Déterminer le module et record cible
            $targetModule = 'Potentials';
            $targetRecordId = $recordId;
            if (!empty($salesOrderId)) {
                $targetModule = 'SalesOrder';
                $targetRecordId = $salesOrderId;
                $this->log("Mode BDC: module=$targetModule, targetRecord=$targetRecordId");
            } elseif (!empty($quoteId)) {
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

            // Vérifier si l'email est bloqué (hard/soft bounce, invalid, complaint, unsubscribed)
            global $adb;
            $bounceCheck = $adb->pquery(
                "SELECT event_type FROM vtiger_email_events WHERE to_email = ? AND event_type IN ('hard_bounce', 'soft_bounce', 'blocked', 'invalid_email', 'complaint', 'unsubscribed') LIMIT 1",
                [$toEmail]
            );
            $bounceRow = $adb->fetch_array($bounceCheck);
            if ($bounceRow) {
                $reasonMap = [
                    'hard_bounce'   => 'hard bounce',
                    'soft_bounce'   => 'soft bounce',
                    'blocked'       => 'adresse bloquée par Brevo',
                    'invalid_email' => 'adresse email invalide',
                    'complaint'     => 'signalement spam',
                    'unsubscribed'  => 'désabonnement',
                ];
                $reason = $reasonMap[$bounceRow['event_type']] ?? $bounceRow['event_type'];
                throw new Exception("L'envoi vers $toEmail a été annulé : $reason.");
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

            // Utiliser le contenu personnalisé si l'utilisateur a modifié l'aperçu
            if (!empty($customSubject)) {
                $subject = $customSubject;
                $this->log("Subject personnalisé utilisé");
            }
            if (!empty($customBody)) {
                $body = $customBody;
                $this->log("Body personnalisé utilisé");
            }

            $this->log("Subject: $subject");
            $this->log("Body length: " . strlen($body));

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

            // Forcer le port et TLS si non défini
            if (empty($mail->Port) || $mail->Port == 25) {
                $mail->Port = 587;
                $mail->SMTPSecure = 'tls';
            }

            // Forcer LOGIN auth (CRAM-MD5 échoue avec Brevo)
            $mail->AuthType = 'LOGIN';

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
            $mail->From = $fromEmail;
            $mail->FromName = 'CNK DEM';
            $mail->AddReplyTo($fromEmail, 'CNK DEM'); // Permet aux clients de répondre
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

            // Ajouter les fichiers uploadés par l'utilisateur
            $uploadedFilePaths = [];
            if (!empty($_FILES['file_attachments']['name'])) {
                $fileCount = count($_FILES['file_attachments']['name']);
                $this->log("Fichiers uploadés: $fileCount");
                for ($i = 0; $i < $fileCount; $i++) {
                    if ($_FILES['file_attachments']['error'][$i] === UPLOAD_ERR_OK) {
                        $tmpPath = $_FILES['file_attachments']['tmp_name'][$i];
                        $fileName = basename($_FILES['file_attachments']['name'][$i]);
                        $mail->AddAttachment($tmpPath, $fileName);
                        $uploadedFilePaths[] = $tmpPath;
                        $this->log("Fichier joint: $fileName");
                    }
                }
            }

            // Ajouter les Documents VTiger sélectionnés par l'utilisateur
            if (!empty($docAttachmentIds) && is_array($docAttachmentIds)) {
                $this->log("Documents sélectionnés: " . count($docAttachmentIds));
                $rootDir = vglobal('root_directory') ?: dirname(__FILE__) . '/../../../';
                foreach ($docAttachmentIds as $docId) {
                    try {
                        $documentModel = Vtiger_Record_Model::getInstanceById($docId, 'Documents');
                        $fileDetails = $documentModel->getFileDetails();
                        if (!empty($fileDetails) && !empty($fileDetails['path'])) {
                            $storedName = !empty($fileDetails['storedname']) ? $fileDetails['storedname'] : $fileDetails['name'];
                            $filePath = $rootDir . $fileDetails['path'] . $fileDetails['attachmentsid'] . '_' . $storedName;
                            $displayName = $fileDetails['name'];
                            $this->log("Document path: $filePath");
                            if (file_exists($filePath)) {
                                $mail->AddAttachment($filePath, $displayName);
                                $this->log("Document VTiger joint: $displayName");
                            } else {
                                $this->log("Fichier introuvable: $filePath");
                            }
                        }
                    } catch (Exception $e) {
                        $this->log("Erreur document $docId: " . $e->getMessage());
                    }
                }
            }

            // Ajouter les documents attachés au template EMAILMaker
            $documentIds = $emailContentModel->getAttachments();
            if (!empty($documentIds)) {
                if (!isset($rootDir)) {
                    $rootDir = vglobal('root_directory') ?: dirname(__FILE__) . '/../../../';
                }
                foreach ($documentIds as $documentId) {
                    try {
                        $documentModel = Vtiger_Record_Model::getInstanceById($documentId, 'Documents');
                        $fileDetails = $documentModel->getFileDetails();
                        if (!empty($fileDetails) && !empty($fileDetails['path'])) {
                            $storedName = !empty($fileDetails['storedname']) ? $fileDetails['storedname'] : $fileDetails['name'];
                            $filePath = $rootDir . $fileDetails['path'] . $fileDetails['attachmentsid'] . '_' . $storedName;
                            $displayName = $fileDetails['name'];
                            if (file_exists($filePath)) {
                                $mail->AddAttachment($filePath, $displayName);
                                $this->log("Document EMAILMaker joint: $displayName");
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
            $messageId = $mail->getLastMessageID();
            $this->log("MailSend OK, Message-ID: $messageId");

            // Collecter les noms de toutes les pièces jointes pour l'historique
            $attachmentNames = [];
            foreach ($pdfAttachments as $att) {
                $attachmentNames[] = ['name' => $att['name'], 'type' => 'pdf'];
            }
            if (!empty($docAttachmentIds) && is_array($docAttachmentIds)) {
                foreach ($docAttachmentIds as $docId) {
                    try {
                        $docModel = Vtiger_Record_Model::getInstanceById($docId, 'Documents');
                        $attachmentNames[] = ['name' => $docModel->get('notes_title') ?: $docModel->get('filename'), 'type' => 'document', 'id' => $docId];
                    } catch (Exception $e) {}
                }
            }
            if (!empty($_FILES['file_attachments']['name'])) {
                for ($fi = 0; $fi < count($_FILES['file_attachments']['name']); $fi++) {
                    if ($_FILES['file_attachments']['error'][$fi] === UPLOAD_ERR_OK) {
                        $attachmentNames[] = ['name' => basename($_FILES['file_attachments']['name'][$fi]), 'type' => 'upload'];
                    }
                }
            }

            // Enregistrer l'email dans l'historique VTiger
            $ccString = !empty($ccAddresses) ? implode(',', $ccAddresses) : '';
            $this->saveEmailToHistory($recordId, $toEmail, $ccString, $subject, $body, $emailTemplateId, $attachmentNames, $messageId);
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
    private function saveEmailToHistory($potentialId, $toEmail, $ccEmail, $subject, $body, $templateId, $attachments = [], $messageId = '') {
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

            $attachmentJson = !empty($attachments) ? json_encode($attachments) : '';

            $sql = "INSERT INTO its4you_emails (its4you_emails_id, from_email, to_email, cc_email, bcc_email, subject, body, email_flag, related_to, contact_id, user_id, email_template_ids, attachment_ids, emails_module)
                    VALUES (?, ?, ?, ?, '', ?, ?, 'SENT', ?, ?, ?, ?, ?, 'Potentials')";
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
                $templateId,
                $attachmentJson
            ]);
            $this->log("INSERT its4you_emails result: " . ($result2 ? 'OK' : 'FAILED'));

            // Stocker le Message-ID pour le suivi Brevo
            if (!empty($messageId)) {
                $db->pquery("UPDATE its4you_emails SET message_id = ? WHERE its4you_emails_id = ?", [$messageId, $crmId]);
                $this->log("Message-ID stored: $messageId for email $crmId");
            }

            // Vérification: confirmer que le record existe
            $checkResult = $db->pquery("SELECT its4you_emails_id FROM its4you_emails WHERE its4you_emails_id = ?", [$crmId]);
            $this->log("Verification its4you_emails: " . $db->num_rows($checkResult) . " rows found for ID $crmId");

            $this->log("Email enregistré: ID=$crmId");

        } catch (Exception $e) {
            $this->log("Erreur lors de l'enregistrement de l'email: " . $e->getMessage());
        }
    }
}
