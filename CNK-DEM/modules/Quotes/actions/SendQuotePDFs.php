<?php
/*+***********************************************************************************
 * Action pour générer des PDFs et les envoyer par email
 * Utilisé par quote_popup.php après création/mise à jour d'un devis
 *************************************************************************************/

// Log immédiat au chargement du fichier
$earlyLogFile = dirname(__FILE__) . '/../../../logs/quote_pdf_debug.log';
file_put_contents($earlyLogFile, date('Y-m-d H:i:s') . " - [EARLY] Fichier SendQuotePDFs.php chargé\n", FILE_APPEND);

class Quotes_SendQuotePDFs_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        // Log dans checkPermission
        $logFile = dirname(__FILE__) . '/../../../logs/quote_pdf_debug.log';
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - [CHECK] checkPermission() appelée\n", FILE_APPEND);

        $moduleName = $request->getModule();
        $recordId = $request->get('record');

        file_put_contents($logFile, date('Y-m-d H:i:s') . " - [CHECK] Module: $moduleName, Record: $recordId\n", FILE_APPEND);

        try {
            if (!empty($recordId)) {
                if (!Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId)) {
                    file_put_contents($logFile, date('Y-m-d H:i:s') . " - [CHECK] Permission refusée\n", FILE_APPEND);
                    throw new AppException(vtranslate('LBL_PERMISSION_DENIED', $moduleName));
                }
            }
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - [CHECK] Permission accordée\n", FILE_APPEND);
        } catch (Exception $e) {
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - [CHECK] EXCEPTION: " . $e->getMessage() . "\n", FILE_APPEND);
            throw $e;
        }
        // Ne retourne rien - c'est le pattern VTiger standard
    }

    private function log($message) {
        $logFile = dirname(__FILE__) . '/../../../logs/quote_pdf_debug.log';
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - " . $message . "\n", FILE_APPEND);
    }

    public function process(Vtiger_Request $request) {
        // Log ultra-early pour debug
        $logFile = dirname(__FILE__) . '/../../../logs/quote_pdf_debug.log';
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - [PROCESS] Début process()\n", FILE_APPEND);

        $response = new Vtiger_Response();

        try {
            $this->log("=== Début SendQuotePDFs ===");

            $recordId = $request->get('record');
            $templateIds = $request->get('templates'); // Array of template IDs
            $toEmail = $request->get('email');

            $this->log("Record: $recordId, Email: $toEmail, Templates: " . json_encode($templateIds));

            if (empty($recordId)) {
                throw new Exception('ID de devis manquant');
            }

            if (empty($templateIds) || !is_array($templateIds)) {
                $this->log("Templates reçus (raw): " . print_r($_POST, true));
                throw new Exception('Aucun template PDF sélectionné (reçu: ' . gettype($templateIds) . ')');
            }

            if (empty($toEmail)) {
                throw new Exception('Adresse email manquante');
            }

            // Validate email
            if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('Adresse email invalide');
            }

            $moduleName = 'Quotes';
            $language = Vtiger_Language_Handler::getLanguage();

            // Get quote info
            $quoteModel = Vtiger_Record_Model::getInstanceById($recordId, $moduleName);
            $quoteNo = $quoteModel->get('quote_no');
            $subject = $quoteModel->get('subject');
            $totalAfterDiscount = $quoteModel->get('hdnGrandTotal');
            $validityDate = $quoteModel->get('cf_1005'); // Date validité

            // Get contact info
            $contactId = $quoteModel->get('contact_id');
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
            $potentialId = $quoteModel->get('potential_id');
            $departAddress = '';
            $departCity = '';
            $departPostal = '';
            $arriveAddress = '';
            $arriveCity = '';
            $arrivePostal = '';
            $dateSouhaitee = '';
            $volume = '';

            if (!empty($potentialId)) {
                try {
                    $potentialModel = Vtiger_Record_Model::getInstanceById($potentialId, 'Potentials');
                    $departAddress = $potentialModel->get('cf_955');  // Adresse départ
                    $departCity = $potentialModel->get('cf_933');     // Ville départ
                    $departPostal = $potentialModel->get('cf_935');   // CP départ
                    $arriveAddress = $potentialModel->get('cf_957');  // Adresse arrivée
                    $arriveCity = $potentialModel->get('cf_949');     // Ville arrivée
                    $arrivePostal = $potentialModel->get('cf_951');   // CP arrivée
                    $dateSouhaitee = $potentialModel->get('cf_1043'); // Date souhaitée
                    $volume = $potentialModel->get('cf_939');         // Volume
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

            // Initialiser la connexion DB
            $db = PearDatabase::getInstance();

            // Récupérer le nom du rôle
            $roleResult = $db->pquery("SELECT rolename FROM vtiger_role WHERE roleid = ?", array($userRole));
            $userRoleName = ($db->num_rows($roleResult) > 0) ? $db->query_result($roleResult, 0, 'rolename') : 'Conseiller';

            // Company info - Logo accessible via URL
            $companyLogo = '<img src="https://crm.cnkdem.com/test/logo/vtiger-crm-logo.png" alt="CNK DEM" style="max-height:40px;">';
            $companyWebsite = 'www.cnkdem.com';

            $this->log("Devis: $quoteNo - $subject, Contact: $contactName, Potential: $potentialId");

            // Generate PDFs
            $attachments = [];
            $PDFMaker = new PDFMaker_PDFMaker_Model();
            $currentUser = Users_Record_Model::getCurrentUserModel();

            $this->log("User ID: " . $currentUser->id);

            // Create storage directory if not exists
            $storagePath = 'storage/PDFMaker/' . $currentUser->id;
            if (!is_dir('storage/PDFMaker/')) {
                @mkdir('storage/PDFMaker/', 0755, true);
            }
            if (!is_dir($storagePath)) {
                @mkdir($storagePath, 0755, true);
            }

            $this->log("Storage path: $storagePath");

            // Get template names for email body
            $templateNames = [];
            $db = PearDatabase::getInstance();

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
                    continue; // Skip if template not found
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

                // Ajouter le nom du template pour éviter les doublons
                $safeTemplateName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $templateName);
                if (empty($name)) {
                    $name = $quoteNo;
                }
                $name = $name . '_' . $safeTemplateName;

                $fileName = $name . '.pdf';
                $filePath = $storagePath . '/' . $fileName;

                // Output PDF to file
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

            // Send email with attachments - Utilisation directe de PHPMailer (comme Stripe)
            $this->log("Initialisation PHPMailer directement...");

            // Créer une instance PHPMailer directement (comme dans ManageStripePayments)
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);

            try {
                // Configuration SMTP depuis VTiger
                $this->log("Récupération config SMTP...");
                $result = $db->pquery("SELECT * FROM vtiger_systems WHERE server_type = ?", array('email'));

                if ($db->num_rows($result) > 0) {
                    $row = $db->fetch_array($result);
                    $this->log("Config SMTP trouvée: " . $row['server']);

                    $mail->isSMTP();
                    $mail->SMTPDebug = 0; // 0 = off, 2 = verbose debug

                    // Options SSL pour éviter les erreurs de certificat
                    $mail->SMTPOptions = array(
                        'ssl' => array(
                            'verify_peer' => false,
                            'verify_peer_name' => false,
                            'allow_self_signed' => true
                        )
                    );

                    // Le serveur peut être au format "tls://smtp.example.com" ou "smtp.gmail.com:587"
                    $server = $row['server'];
                    $portFromServer = null;

                    // Gérer le format tls:// ou ssl://
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

                    // Gérer le format smtp.gmail.com:587
                    if (strpos($server, ':') !== false) {
                        list($server, $portFromServer) = explode(':', $server);
                    }

                    $mail->Host = $server;
                    $mail->Port = !empty($row['server_port']) ? $row['server_port'] : (!empty($portFromServer) ? $portFromServer : 587);

                    // Gmail utilise STARTTLS sur port 587
                    if (strpos($server, 'gmail.com') !== false && $mail->Port == 587) {
                        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                    }

                    $mail->Username = $row['server_username'];

                    // IMPORTANT: Le mot de passe est chiffré dans VTiger
                    $password = Vtiger_Functions::fromProtectedText($row['server_password']);
                    $mail->Password = $password;

                    // Authentification SMTP
                    $smtp_auth = $row['smtp_auth'];
                    if ($smtp_auth == "1" || $smtp_auth == "true" || !empty($row['server_username'])) {
                        $mail->SMTPAuth = true;
                    }

                    $fromEmail = $row['from_email_field'];
                    $this->log("SMTP Host: $server, Port: " . $mail->Port . ", From: $fromEmail");
                } else {
                    $this->log("ERREUR: Pas de configuration email trouvée!");
                    throw new Exception('Configuration email non trouvée');
                }

                // Encodage UTF-8
                $mail->CharSet = 'UTF-8';
                $mail->Encoding = 'base64';

                // Expéditeur
                $fromName = 'CNK DEM';
                $mail->setFrom($fromEmail, $fromName);
                $this->log("Expéditeur: $fromEmail ($fromName)");

                // Destinataire
                $recipientName = !empty($contactName) ? $contactName : $toEmail;
                $mail->addAddress($toEmail, $recipientName);
                $this->log("Destinataire: $toEmail ($recipientName)");

            // Build email subject
            $emailSubject = "Devis $quoteNo - $subject";
            $mail->Subject = $emailSubject;
            $this->log("Sujet email: $emailSubject");

            // Format total avec devise
            $totalFormatted = number_format($totalAfterDiscount, 2, ',', ' ') . ' €';

            // Format date validité
            $validityFormatted = !empty($validityDate) ? date('d/m/Y', strtotime($validityDate)) : 'Non spécifiée';

            // Format date souhaitée
            $dateSouhaiteeFormatted = !empty($dateSouhaitee) ? date('d/m/Y', strtotime($dateSouhaitee)) : 'À définir';

            // Build email body - Nouveau template professionnel
            $emailBody = '<!DOCTYPE html>
<html data-kantu="1" lang="fr">
<head>
    <meta charset="UTF-8" />
    <title>Votre devis de déménagement</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:Arial, Helvetica, sans-serif; color:#1f2933;">
<table cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f6fb; padding:20px 0;" width="100%">
    <tbody>
        <tr>
            <td align="center">
            <table cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 8px 18px rgba(15,23,42,0.08);" width="100%">
                <tbody><!-- HEADER -->
                    <tr>
                        <td align="center" style="background:#1F314D; padding:24px 20px;">
                        <div style="margin-bottom:12px; background:#ffffff; padding:10px 18px; border-radius:10px; display:inline-block;">' . $companyLogo . '</div>

                        <div style="margin-bottom:6px;"><span style="display:inline-block; padding:4px 12px; font-size:11px; letter-spacing:1px; text-transform:uppercase; border-radius:999px; background:rgba(255,255,255,0.12); color:#d1e3ff;">Votre devis de déménagement</span></div>

                        <h1 style="margin:8px 0 0 0; font-size:21px; line-height:1.4; color:#ffffff; font-weight:600;">Nous prenons soin de votre projet</h1>
                        </td>
                    </tr>
                    <!-- INTRO -->
                    <tr>
                        <td style="padding:24px 28px 10px 28px;">
                        <p style="margin:0 0 12px; font-size:14px; line-height:1.6;">Bonjour ' . htmlspecialchars($contactLastName) . ' ' . htmlspecialchars($contactFirstName) . ',</p>

                        <p style="margin:0 0 12px; font-size:14px; line-height:1.6;">Merci pour votre confiance et votre demande concernant votre projet de déménagement.</p>

                        <p style="margin:0; font-size:14px; line-height:1.6;">Vous trouverez ci-joint votre devis <strong>N° ' . htmlspecialchars($quoteNo) . '</strong>, établi sur la base des informations que vous nous avez transmises.</p>
                        </td>
                    </tr>
                    <!-- INFO BOX -->
                    <tr>
                        <td style="padding:6px 28px 14px 28px;">
                        <table cellpadding="0" cellspacing="0" role="presentation" style="background:#eaf0ff; border-radius:10px;" width="100%">
                            <tbody>
                                <tr>
                                    <td style="padding:10px 14px;">
                                    <p style="margin:0; font-size:12px; line-height:1.6; color:#1F314D;">Ce devis résume les éléments principaux de votre déménagement. Notre équipe est là pour vous accompagner avant, pendant et après le jour J.</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        </td>
                    </tr>
                    <!-- RÉCAP -->
                    <tr>
                        <td style="padding:10px 28px 4px 28px;"><span style="display:inline-block; padding:3px 10px; font-size:11px; border-radius:999px; background:#eaf0ff; color:#1F314D; margin-bottom:4px;">Récapitulatif</span>
                        <h3 style="margin:4px 0 8px 0; font-size:16px; color:#1F314D;">Récapitulatif de votre projet</h3>
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

                                    <p style="margin:10px 0 8px 0;"><strong>Date souhaitée :</strong><br />
                                    ' . $dateSouhaiteeFormatted . '</p>

                                    <p style="margin:10px 0 0 0;"><strong>Volume estimé :</strong><br />
                                    ' . htmlspecialchars($volume) . ' m³</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        </td>
                    </tr>
                    <!-- MONTANT -->
                    <tr>
                        <td style="padding:0 28px 6px 28px;">
                        <h3 style="margin:0 0 8px 0; font-size:16px; color:#1F314D;">Montant de votre devis</h3>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 28px 18px 28px;">
                        <table cellpadding="0" cellspacing="0" role="presentation" style="border-radius:10px; background:#fff4f2; border:1px solid #ffcfc7;" width="100%">
                            <tbody>
                                <tr>
                                    <td style="padding:16px;">
                                    <p style="margin:0 0 6px 0; font-size:14px;"><strong>Total TTC :</strong> <span style="font-size:18px; font-weight:bold; color:#BD3733;">' . $totalFormatted . '</span></p>

                                    <p style="margin:8px 0 0; font-size:13px;">Ce tarif inclut notamment :</p>

                                    <ul style="margin:6px 0 0 18px; font-size:13px;">
                                        <li>Protection et manutention</li>
                                        <li>Transport sécurisé</li>
                                        <li>Main d\'œuvre</li>
                                        <li>Assurance standard</li>
                                    </ul>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        </td>
                    </tr>
                    <!-- VALIDITÉ -->
                    <tr>
                        <td style="padding:0 28px 14px 28px;">
                        <h3 style="margin:0 0 8px 0; font-size:16px; color:#1F314D;">Validité du devis</h3>

                        <p style="margin:0; font-size:13px; line-height:1.6;">Ce devis est valable jusqu\'au <strong>' . $validityFormatted . '</strong>.</p>
                        </td>
                    </tr>
                    <!-- QUESTIONS -->
                    <tr>
                        <td style="padding:0 28px 14px 28px;">
                        <h3 style="margin:0 0 8px 0; font-size:16px; color:#1F314D;">Questions ou ajustements</h3>

                        <p style="font-size:13px; line-height:1.6; margin:0;">Nous restons disponibles pour toute modification ou question concernant votre devis ou l\'organisation de votre déménagement.</p>
                        </td>
                    </tr>
                    <!-- CONFIRMATION -->
                    <tr>
                        <td style="padding:0 28px 18px 28px;">
                        <h3 style="margin:0 0 10px 0; font-size:16px; color:#1F314D;">Comment confirmer ?</h3>

                        <p style="font-size:13px; line-height:1.6; margin:0 0 8px 0;">Pour valider ce devis, il vous suffit de nous répondre en indiquant :</p>

                        <p style="font-size:13px; font-style:italic; background:#f9fafb; border-radius:8px; padding:10px; border:1px dashed #e5e7eb; margin:0 0 10px 0;">« J\'accepte le devis N° ' . htmlspecialchars($quoteNo) . ' »</p>
                        </td>
                    </tr>
                    <!-- SIGNATURE MODERNE -->
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

                        <p style="margin:10px 0 0; font-size:11px; color:#6b7280;">Nous restons disponibles pour toute question ou précision supplémentaire.</p>
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

            $this->log("Préparation email à: $toEmail, sujet: $emailSubject");

            // Add PDF attachments
            foreach ($attachments as $attachment) {
                $this->log("Ajout pièce jointe: " . $attachment['name'] . " (" . $attachment['size'] . " bytes)");
                $mail->addAttachment($attachment['path'], $attachment['name']);
            }

            // Envoyer l'email
            $this->log("Envoi de l'email...");
            $sent = $mail->send();
            $this->log("Résultat send(): " . ($sent ? 'true' : 'false'));

            // Clean up temporary files
            foreach ($attachments as $attachment) {
                if (file_exists($attachment['path'])) {
                    unlink($attachment['path']);
                    $this->log("Fichier temp supprimé: " . $attachment['path']);
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
                $this->log("ErrorInfo: " . $mail->ErrorInfo);

                // Nettoyer les fichiers temporaires même en cas d'erreur
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

    /**
     * Log email sent for tracking
     */
    private function logEmailSent($quoteId, $email, $templateIds) {
        $db = PearDatabase::getInstance();
        $currentUser = Users_Record_Model::getCurrentUserModel();

        // Create a note to track the email
        try {
            $comment = "Email envoyé à $email avec " . count($templateIds) . " document(s) PDF";

            // Add to modtracker or comments if available
            // For now, just log to file
            $logFile = 'logs/quote_pdf_emails.log';
            $logEntry = date('Y-m-d H:i:s') . " | Quote: $quoteId | Email: $email | Templates: " . implode(',', $templateIds) . " | User: " . $currentUser->id . "\n";
            file_put_contents($logFile, $logEntry, FILE_APPEND);
        } catch (Exception $e) {
            // Ignore logging errors
        }
    }
}
?>
