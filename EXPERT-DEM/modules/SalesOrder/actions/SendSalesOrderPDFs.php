<?php
/*+***********************************************************************************
 * Action pour générer des PDFs et les envoyer par email pour les Bons de Commande
 * Utilisé par l'onglet ODM de la vue unifiée
 *************************************************************************************/

class SalesOrder_SendSalesOrderPDFs_Action extends Vtiger_Action_Controller {

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
        $logFile = dirname(__FILE__) . '/../../../logs/salesorder_pdf_debug.log';
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $message . "\n", FILE_APPEND);
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $this->log("=== Début SendSalesOrderPDFs ===");

            $recordId = $request->get('record');
            $templateIds = $request->get('templates');
            $toEmail = $request->get('email');

            $this->log("Record: $recordId, Email: $toEmail, Templates: " . json_encode($templateIds));

            if (empty($recordId)) {
                throw new Exception('ID de bon de commande manquant');
            }

            if (empty($templateIds) || !is_array($templateIds)) {
                throw new Exception('Aucun template PDF sélectionné');
            }

            if (empty($toEmail)) {
                throw new Exception('Adresse email manquante');
            }

            if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Adresse email invalide');
            }

            $moduleName = 'SalesOrder';
            $language = Vtiger_Language_Handler::getLanguage();
            $db = PearDatabase::getInstance();

            // Get SalesOrder info
            $soModel = Vtiger_Record_Model::getInstanceById($recordId, $moduleName);
            $soNo = $soModel->get('salesorder_no');
            $subject = $soModel->get('subject');

            // Get contact info
            $contactId = $soModel->get('contact_id');
            $contactFirstName = '';
            $contactLastName = '';
            $contactName = '';
            if (!empty($contactId)) {
                try {
                    $contactModel = Vtiger_Record_Model::getInstanceById($contactId, 'Contacts');
                    $contactFirstName = $contactModel->get('firstname');
                    $contactLastName = $contactModel->get('lastname');
                    $contactName = $contactFirstName . ' ' . $contactLastName;
                } catch (Exception $e) {
                    // Ignore
                }
            }

            // Get potential (affaire) info
            $potentialId = $soModel->get('potential_id');
            $departAddress = '';
            $departCity = '';
            $departPostal = '';
            $arriveAddress = '';
            $arriveCity = '';
            $arrivePostal = '';
            $dateSouhaitee = '';

            if (!empty($potentialId)) {
                try {
                    $potentialModel = Vtiger_Record_Model::getInstanceById($potentialId, 'Potentials');
                    $departAddress = $potentialModel->get('cf_955');
                    $departCity = $potentialModel->get('cf_933');
                    $departPostal = $potentialModel->get('cf_935');
                    $arriveAddress = $potentialModel->get('cf_957');
                    $arriveCity = $potentialModel->get('cf_949');
                    $arrivePostal = $potentialModel->get('cf_951');
                    $dateSouhaitee = $potentialModel->get('cf_1043');
                } catch (Exception $e) {
                    $this->log("Erreur récupération Potential: " . $e->getMessage());
                }
            }

            // Get current user info
            $currentUser = Users_Record_Model::getCurrentUserModel();
            $userFirstName = $currentUser->get('first_name');
            $userLastName = $currentUser->get('last_name');
            $userEmail = $currentUser->get('email1');
            $userPhone = $currentUser->get('phone_mobile');
            $userRole = $currentUser->get('roleid');

            // Get role name
            $roleResult = $db->pquery("SELECT rolename FROM vtiger_role WHERE roleid = ?", array($userRole));
            $userRoleName = ($db->num_rows($roleResult) > 0) ? $db->query_result($roleResult, 0, 'rolename') : 'Conseiller';

            // Company info
            $companyLogo = '<img src="https://crm.cnkdem.com/test/logo/vtiger-crm-logo.png" alt="CNK DEM" style="max-height:40px;">';
            $companyWebsite = 'www.cnkdem.com';

            $this->log("BDC: $soNo - $subject, Contact: $contactName");

            // Generate PDFs
            $attachments = [];
            $PDFMaker = new PDFMaker_PDFMaker_Model();

            // Create storage directory
            $storagePath = 'storage/PDFMaker/' . $currentUser->id;
            if (!is_dir('storage/PDFMaker/')) {
                @mkdir('storage/PDFMaker/', 0755, true);
            }
            if (!is_dir($storagePath)) {
                @mkdir($storagePath, 0755, true);
            }

            // Get template names
            $templateNames = [];

            foreach ($templateIds as $templateId) {
                $templateId = intval($templateId);
                $this->log("Traitement template ID: $templateId");

                // Get template name
                $templateResult = $db->pquery(
                    "SELECT filename FROM vtiger_pdfmaker WHERE templateid = ? AND deleted = 0",
                    array($templateId)
                );

                if ($db->num_rows($templateResult) == 0) {
                    $this->log("Template $templateId non trouvé, ignoré");
                    continue;
                }

                $templateName = $db->query_result($templateResult, 0, 'filename');
                $templateNames[] = $templateName;
                $this->log("Template: $templateName");

                // Generate PDF
                $mpdf = null;
                $records = array($recordId);
                $templates = array($templateId);

                try {
                    $name = $PDFMaker->GetPreparedMPDF($mpdf, $records, $templates, $moduleName, $language);
                    $name = $PDFMaker->generate_cool_uri($name);
                    $this->log("PDF name: $name");
                } catch (Exception $pdfEx) {
                    $this->log("ERREUR génération PDF: " . $pdfEx->getMessage());
                    throw $pdfEx;
                }

                $safeTemplateName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $templateName);
                if (empty($name)) {
                    $name = $soNo;
                }
                $name = $name . '_' . $safeTemplateName;

                $fileName = $name . '.pdf';
                $filePath = $storagePath . '/' . $fileName;

                $mpdf->Output($filePath, 'F');
                $this->log("PDF sauvegardé: $filePath (taille: " . filesize($filePath) . ")");

                $attachments[] = array(
                    'path' => $filePath,
                    'name' => $fileName,
                    'size' => filesize($filePath)
                );
            }

            if (empty($attachments)) {
                throw new Exception('Aucun PDF généré');
            }

            $this->log("Total PDFs générés: " . count($attachments));

            // Send email with PHPMailer
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);

            try {
                // SMTP configuration
                $result = $db->pquery("SELECT * FROM vtiger_systems WHERE server_type = ?", array('email'));

                if ($db->num_rows($result) > 0) {
                    $row = $db->fetch_array($result);

                    $mail->isSMTP();
                    $mail->SMTPDebug = 0;

                    $mail->SMTPOptions = array(
                        'ssl' => array(
                            'verify_peer' => false,
                            'verify_peer_name' => false,
                            'allow_self_signed' => true
                        )
                    );

                    $server = $row['server'];
                    $portFromServer = null;

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

                    if (strpos($server, ':') !== false) {
                        list($server, $portFromServer) = explode(':', $server);
                    }

                    $mail->Host = $server;
                    $mail->Port = !empty($row['server_port']) ? $row['server_port'] : (!empty($portFromServer) ? $portFromServer : 587);

                    if (strpos($server, 'gmail.com') !== false && $mail->Port == 587) {
                        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                    }

                    $mail->Username = $row['server_username'];
                    $password = Vtiger_Functions::fromProtectedText($row['server_password']);
                    $mail->Password = $password;

                    $smtp_auth = $row['smtp_auth'];
                    if ($smtp_auth == "1" || $smtp_auth == "true" || !empty($row['server_username'])) {
                        $mail->SMTPAuth = true;
                    }

                    $fromEmail = $row['from_email_field'];
                } else {
                    throw new Exception('Configuration email non trouvée');
                }

                $mail->CharSet = 'UTF-8';
                $mail->Encoding = 'base64';

                $fromName = 'CNK DEM';
                $mail->setFrom($fromEmail, $fromName);

                $recipientName = !empty($contactName) ? $contactName : $toEmail;
                $mail->addAddress($toEmail, $recipientName);

                // Email subject
                $emailSubject = "Bon de Commande $soNo - $subject";
                $mail->Subject = $emailSubject;

                // Format date
                $dateSouhaiteeFormatted = !empty($dateSouhaitee) ? date('d/m/Y', strtotime($dateSouhaitee)) : 'À définir';

                // Email body
                $emailBody = '<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <title>Votre bon de commande</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:Arial, Helvetica, sans-serif; color:#1f2933;">
<table cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6fb; padding:20px 0;" width="100%">
    <tbody>
        <tr>
            <td align="center">
            <table cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 8px 18px rgba(15,23,42,0.08);" width="100%">
                <tbody>
                    <tr>
                        <td align="center" style="background:#1F314D; padding:24px 20px;">
                        <div style="margin-bottom:12px; background:#ffffff; padding:10px 18px; border-radius:10px; display:inline-block;">' . $companyLogo . '</div>
                        <div style="margin-bottom:6px;"><span style="display:inline-block; padding:4px 12px; font-size:11px; letter-spacing:1px; text-transform:uppercase; border-radius:999px; background:rgba(255,255,255,0.12); color:#d1e3ff;">Bon de Commande</span></div>
                        <h1 style="margin:8px 0 0 0; font-size:21px; line-height:1.4; color:#ffffff; font-weight:600;">Confirmation de votre commande</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 28px 10px 28px;">
                        <p style="margin:0 0 12px; font-size:14px; line-height:1.6;">Bonjour ' . htmlspecialchars($contactLastName) . ' ' . htmlspecialchars($contactFirstName) . ',</p>
                        <p style="margin:0 0 12px; font-size:14px; line-height:1.6;">Veuillez trouver ci-joint votre <strong>Bon de Commande N° ' . htmlspecialchars($soNo) . '</strong> relatif à votre déménagement.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:6px 28px 14px 28px;">
                        <table cellpadding="0" cellspacing="0" role="presentation" style="background:#e8f5e9; border-radius:10px;" width="100%">
                            <tbody>
                                <tr>
                                    <td style="padding:10px 14px;">
                                    <p style="margin:0; font-size:12px; line-height:1.6; color:#2e7d32;"><strong>Ce document confirme votre commande.</strong> Conservez-le précieusement pour vos références.</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:10px 28px 4px 28px;">
                        <h3 style="margin:4px 0 8px 0; font-size:16px; color:#1F314D;">Récapitulatif</h3>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 28px 18px 28px;">
                        <table cellpadding="0" cellspacing="0" role="presentation" style="border-radius:12px; border:1px solid #e5e7eb; background:#f9fafb;" width="100%">
                            <tbody>
                                <tr>
                                    <td style="padding:14px 16px; font-size:13px; line-height:1.7; border-left:4px solid #1F314D;">
                                    <p style="margin:0 0 8px 0;"><strong>Adresse de départ :</strong><br />
                                    ' . htmlspecialchars($departAddress) . ', ' . htmlspecialchars($departPostal) . ', ' . htmlspecialchars($departCity) . '</p>
                                    <p style="margin:10px 0 8px 0;"><strong>Adresse d\'arrivée :</strong><br />
                                    ' . htmlspecialchars($arriveAddress) . ', ' . htmlspecialchars($arrivePostal) . ', ' . htmlspecialchars($arriveCity) . '</p>
                                    <p style="margin:10px 0 0 0;"><strong>Date prévue :</strong><br />
                                    ' . $dateSouhaiteeFormatted . '</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px 28px; border-top:1px solid #e5e7eb; background:#ffffff;">
                        <table cellpadding="0" cellspacing="0" role="presentation" style="border-radius:14px; border:1px solid #e5e7eb; overflow:hidden;" width="100%">
                            <tbody>
                                <tr>
                                    <td style="background:#1F314D; padding:14px 18px;">
                                    <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                        <tbody>
                                            <tr>
                                                <td align="left"><span style="font-size:13px; letter-spacing:1px; text-transform:uppercase; color:#dbe7ff;">Votre interlocuteur</span>
                                                <h3 style="margin:6px 0 0; font-size:17px; color:#ffffff;">' . htmlspecialchars($userFirstName) . ' ' . htmlspecialchars($userLastName) . '</h3>
                                                <p style="margin:2px 0 0; color:#d1e3ff; font-size:12px;">' . htmlspecialchars($userRoleName) . '</p>
                                                </td>
                                                <td align="right">
                                                <div style="background:#ffffff; padding:10px 16px; border-radius:10px; display:inline-block;">' . $companyLogo . '</div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 18px; background:#f9fafb;">
                                    <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
                                        <tbody>
                                            <tr>
                                                <td style="font-size:13px; color:#111827;"><strong style="color:#1F314D;">Téléphone :</strong><br />
                                                <a href="tel:' . htmlspecialchars($userPhone) . '" style="color:#111827; text-decoration:none;">' . htmlspecialchars($userPhone) . '</a></td>
                                                <td style="font-size:13px; color:#111827;"><strong style="color:#1F314D;">Email :</strong><br />
                                                <a href="mailto:' . htmlspecialchars($userEmail) . '" style="color:#111827; text-decoration:none;">' . htmlspecialchars($userEmail) . '</a></td>
                                                <td style="font-size:13px; color:#111827;"><strong style="color:#1F314D;">Site web :</strong><br />
                                                <a href="https://' . $companyWebsite . '" style="color:#111827; text-decoration:none;">' . $companyWebsite . '</a></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p style="margin:10px 0 0; font-size:11px; color:#6b7280;">Nous restons disponibles pour toute question.</p>
                        </td>
                    </tr>
                </tbody>
            </table>
            </td>
        </tr>
    </tbody>
</table>
</body>
</html>';

                $mail->isHTML(true);
                $mail->Body = $emailBody;
                $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $emailBody));

                // Add PDF attachments
                foreach ($attachments as $attachment) {
                    $this->log("Ajout pièce jointe: " . $attachment['name']);
                    $mail->addAttachment($attachment['path'], $attachment['name']);
                }

                // Send email
                $this->log("Envoi de l'email...");
                $sent = $mail->send();
                $this->log("Résultat send(): " . ($sent ? 'true' : 'false'));

                // Clean up temporary files
                foreach ($attachments as $attachment) {
                    if (file_exists($attachment['path'])) {
                        unlink($attachment['path']);
                    }
                }

                $this->log("Email envoyé avec SUCCÈS à $toEmail");

                // Log success
                $this->logEmailSent($recordId, $toEmail, $templateIds);

                $response->setResult(array(
                    'success' => true,
                    'message' => 'Email envoyé avec succès à ' . $toEmail,
                    'templates_sent' => count($templateIds)
                ));

            } catch (PHPMailer\PHPMailer\Exception $e) {
                $this->log("ERREUR PHPMailer: " . $e->getMessage());

                // Clean up temp files on error
                foreach ($attachments as $attachment) {
                    if (file_exists($attachment['path'])) {
                        @unlink($attachment['path']);
                    }
                }

                throw new Exception('Erreur envoi email: ' . $mail->ErrorInfo);
            }

        } catch (Exception $e) {
            $this->log("EXCEPTION: " . $e->getMessage());
            $response->setResult(array(
                'success' => false,
                'error' => $e->getMessage()
            ));
        }

        $response->emit();
    }

    private function logEmailSent($soId, $email, $templateIds) {
        $currentUser = Users_Record_Model::getCurrentUserModel();

        try {
            $logFile = 'logs/salesorder_pdf_emails.log';
            $logEntry = date('Y-m-d H:i:s') . " | SalesOrder: $soId | Email: $email | Templates: " . implode(',', $templateIds) . " | User: " . $currentUser->id . "\n";
            file_put_contents($logFile, $logEntry, FILE_APPEND);
        } catch (Exception $e) {
            // Ignore logging errors
        }
    }
}
?>
