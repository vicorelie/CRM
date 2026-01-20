<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_Emails_Model extends Emails_Record_Model
{

    public $embedImages = array();

    /**
     * @param string $moduleName
     * @return self
     */
    public static function getCleanInstance($moduleName)
    {
        $focus = CRMEntity::getInstance($moduleName);
        $instance = new self();

        return $instance->setData($focus->column_fields)->setModule($moduleName)->setEntity($focus);
    }

    /**
     * @throws Exception
     */
    public function send($addToQueue = false)
    {
        $currentUserModel = Users_Record_Model::getCurrentUserModel();

        $mailer = Emails_Mailer_Model::getInstance();
        $mailer->IsHTML(true);

        $fromEmail = $this->getFromEmailAddress();
        $replyTo = $this->getReplyToEmail();
        $userName = $currentUserModel->getName();

        // To eliminate the empty value of an array
        $toEmailInfo = array_filter((array)$this->get('toemailinfo'));
        $emailsInfo = array();

        foreach ($toEmailInfo as $id => $emails) {
            foreach ($emails as $key => $value) {
                array_push($emailsInfo, $value);
            }
        }

        $toEmailInfo = array_map('unserialize',
            array_unique(array_map('serialize', array_map('array_unique', $toEmailInfo)))
        );
        $toFieldData = array_diff(explode(',', $this->get('saved_toid')), $emailsInfo);
        $i = 1;

        foreach ($toFieldData as $value) {
            $toEmailInfo['to' . $i++] = array($value);
        }

        // Merge Users module merge tags based on current user.
        $mergedDescription = getMergedDescription($this->get('description'), $currentUserModel->getId(), 'Users');
        $mergedSubject = getMergedDescription($this->get('subject'), $currentUserModel->getId(), 'Users');
        $selectedIds = array();

        // push all emails to one single array
        foreach ($toEmailInfo as $selectedId => $selectedEmails) {

            // Pushing all ids to one single array
            if ($selectedId) {
                array_push($selectedIds, $selectedId);
            }

            // If selected emails is not an array, then make it as array
            if (!is_array($selectedEmails)) {
                $selectedEmails = array($selectedEmails);
            }

            // For selectedEmails check and push to emails array
            foreach ($selectedEmails as $selectedEmail) {
                $emails = array();

                if (trim($selectedEmail)) {
                    array_push($emails, $selectedEmail);
                }
            }
        }

        $inReplyToMessageId = '';
        $generatedMessageId = '';
        $mailer->reinitialize();
        $mailer->ConfigSenderInfo($fromEmail, $userName, $replyTo);
        $old_mod_strings = vglobal('mod_strings');
        $description = $this->get('description');
        $subject = $this->get('subject');
        $parentModule = $this->getEntityType($id);

        if ($parentModule) {
            $currentLanguage = Vtiger_Language_Handler::getLanguage();
            $moduleLanguageStrings = Vtiger_Language_Handler::getModuleStringsFromFile($currentLanguage, $parentModule);
            vglobal('mod_strings', $moduleLanguageStrings['languageStrings']);
            $mergedDescriptionWithHyperLinkConversion = $this->replaceBrowserMergeTagWithValue($mergedDescription, $parentModule, $id);

            if ('Users' !== $parentModule) {
                //Retrieve MessageID from Mailroom table only if module is not users
                $inReplyToMessageId = $mailer->retrieveMessageIdFromMailroom($id);
                $generatedMessageId = $mailer->generateMessageID();
                //If there is no reference id exist in crm.
                //Generate messageId for sending email and attach to mailer header
                if (empty($inReplyToMessageId)) {
                    $inReplyToMessageId = $generatedMessageId;
                }
                // Apply merge for non-Users module merge tags.
                $description = getMergedDescription($mergedDescriptionWithHyperLinkConversion, $id, $parentModule);
                $subject = getMergedDescription($mergedSubject, $id, $parentModule);
            } else {
                // Re-merge the description for user tags based on actual user.
                $description = getMergedDescription($mergedDescriptionWithHyperLinkConversion, $id, 'Users');
                $subject = getMergedDescription($mergedSubject, $id, 'Users');
                vglobal('mod_strings', $old_mod_strings);
            }
        }

        //If variable is not empty then add custom header
        if (!empty($inReplyToMessageId)) {
            $mailer->AddCustomHeader('In-Reply-To', $inReplyToMessageId);
        }

        if (!empty($generatedMessageId)) {
            $mailer->MessageID = $generatedMessageId;
        }

        // Adding all recipients in mail
        foreach ($emails as $email) {
            $mailer->AddAddress($email);
        }

        $mailer->Body = $description;
        $mailer->Body = $this->convertLogoToEmbed($mailer);
        $mailer->Body = $this->convertImagesToEmbed($mailer);

        if ($parentModule) {
            $mailer->Body = $this->convertUrlsToTrackUrls($mailer->Body, $id);
            $mailer->Body .= $this->getTrackImageDetails($id, $this->isEmailTrackEnabled());
        }

        $mailer->Body .= $this->getUserSignature($mailer);
        $mailer->Subject = decode_html(strip_tags($subject));
        $mailer->AltBody = $this->getPlainBody($description, $id);
        $this->addAttachments($mailer);

        $ccs = array_filter(explode(',', $this->get('ccmail')));
        $bccs = array_filter(explode(',', $this->get('bccmail')));

        if (!empty($ccs)) {
            foreach ($ccs as $cc) {
                $mailer->AddCC($cc);
            }
        }

        if (!empty($bccs)) {
            foreach ($bccs as $bcc) {
                $mailer->AddBCC($bcc);
            }
        }

        //To convert image url to valid
        $mailer->Body = $mailer->makeImageURLValid($mailer->Body);

        if ($addToQueue) {
            $status = $mailer->Send(false, $this->get('parent_id'));
        } else {
            $status = $mailer->Send(true);
        }

        if (!$status) {
            $status = $mailer->getError();

            if ($status) {
                $this->updateEmailFlag();
            }
        } else {
            //If mail sending is success store message Id for given crmId
            if ($generatedMessageId && $id) {
                $mailer->updateMessageIdByCrmId($generatedMessageId, $id);
            }

            $this->appendMessageToMailbox($mailer);
        }

        return $status;
    }

    public function convertLogoToEmbed($mailer)
    {
        $body = $mailer->Body;

        if (strpos($body, '$logo$')) {
            $body = str_replace('$logo$', "<img src='cid:companyLogo' />", $body);

            $companyDetails = Vtiger_CompanyDetails_Model::getInstanceById();
            $companyLogoDetails = $companyDetails->getLogo();
            //While sending email template and which has '$logo$' then it should replace with company logo
            $mailer->AddEmbeddedImage($companyLogoDetails->get('imagepath'), 'companyLogo', 'attachment', 'base64',
                'image/jpg');
        }

        return $body;
    }

    /**
     * @param Emails_Mailer_Model $mailer
     * @return string
     */
    public function convertImagesToEmbed($mailer)
    {
        $body = $mailer->Body;
        $re = '/<img.*?src="(.*?)"[^\>]+>/';
        preg_match_all($re, $body, $matches, PREG_SET_ORDER, 0);
        $num = count($this->embedImages);

        foreach ($matches as $match) {
            list($image, $url) = $match;

            $num++;
            $replaceUrl = $url;
            $cid = 'image' . $num;
            $siteUrl = vglobal('site_URL');
            $embedUrl = trim(str_replace($siteUrl, '', $replaceUrl), '/');

            if($mailer->addEmbeddedImage($embedUrl, $cid, basename($embedUrl))) {
                $body = str_replace($image, $this->replaceImageSrc($image, $url, 'cid:' . $cid), $body);
            }
        }

        return $body;
    }

    public function replaceImageSrc($content, $fromUrl, $toUrl)
    {
        return str_replace(
            array(
                'src="' . $fromUrl . '"',
                "src='" . $fromUrl . "'",
            ),
            array(
                'src="' . $toUrl . '"',
                'src="' . $toUrl . '"'
            ),
            $content
        );
    }

    public function getUserSignature($mailer)
    {
        if ('Yes' === (string)$this->get('signature')) {
            $currentUserModel = Users_Record_Model::getCurrentUserModel();
            $mailer->Signature = $currentUserModel->get('signature');

            if (!empty($mailer->Signature)) {
                return '<br><br>' . decode_html($mailer->Signature);
            }
        }

        return '';
    }

    public function getPlainBody($description, $id)
    {
        $currentUserModel = Users_Record_Model::getCurrentUserModel();

        $plainBody = decode_emptyspace_html($description);
        $plainBody = preg_replace(array("/<p>/i", "/<br>/i", "/<br \/>/i"), array("\n", "\n", "\n"), $plainBody);
        $plainBody .= "\n\n" . $currentUserModel->get('signature');
        $plainBody = decode_html($plainBody);
        $plainBody = utf8_encode($plainBody);
        $plainBody = preg_replace('/(?:<style((?:.*?\r?\n?)*)\/style>)+/', '', $plainBody);
        $plainBody = strip_tags($plainBody);
        $plainBody = Emails_Mailer_Model::convertToAscii($plainBody);

        return $this->convertUrlsToTrackUrls($plainBody, $id, 'plain');
    }

    /**
     * @throws Exception
     * @var Emails_Mailer_Model $mailer
     */
    public function addAttachments($mailer)
    {
        $attachments = $this->getAttachmentDetails();

        if (is_array($attachments)) {
            foreach ($attachments as $attachment) {
                $fileNameWithPath = vglobal('root_directory') . $attachment['filenamewithpath'];

                if (is_file($fileNameWithPath)) {
                    $mailer->AddAttachment($fileNameWithPath, $attachment['attachment']);
                }
            }
        }
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getAttachmentDetails()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT vtiger_attachments.* 
                        FROM vtiger_attachments, vtiger_seattachmentsrel, vtiger_senotesrel
						WHERE vtiger_senotesrel.notesid = vtiger_seattachmentsrel.crmid 
						  AND vtiger_attachments.attachmentsid = vtiger_seattachmentsrel.attachmentsid 
						  AND vtiger_senotesrel.crmid = ?',
            array($this->get('signature_id'))
        );
        $attachmentsList = array();
        $num = 0;

        while ($row = $adb->fetchByAssoc($result)) {
            if (empty($row['storedname'])) {
                $row['storedname'] = $row['name'];
            }

            $file = $row['path'] . $row['attachmentsid'] . '_' . $row['storedname'];
            $attachmentsList[$num] = [
                'fileid' => $row['attachmentsid'],
                'attachment' => decode_html($row['name']),
                'storedname' => $row['storedname'],
                'path' => $row['path'],
                'file' => $file,
                'size' => filesize($file),
                'type' => $row['type'],
                'cid' => $row['cid'],
                'filenamewithpath' => $file,
            ];
            $num++;
        }

        return $attachmentsList;
    }

    public function appendMessageToMailbox($mailer)
    {
        $mailString = $mailer->getMailString();
        $mailBoxModel = MailManager_Mailbox_Model::activeInstance();
        $folderName = $mailBoxModel->folder();
        if (!empty($folderName) && !empty($mailString)) {
            $connector = MailManager_Connector_Connector::connectorWithModel($mailBoxModel, '');
            $message = str_replace("\n", "\r\n", $mailString);

            if (function_exists('mb_convert_encoding')) {
                $folderName = mb_convert_encoding($folderName, "UTF7-IMAP", "UTF-8");
            }

            imap_append($connector->mBox, $connector->mBoxUrl . $folderName, $message, "\\Seen");
        }
    }

    public function setEmbedImage($cid, $path, $name)
    {
        $this->embedImages[$cid] = array(
            'cid' => $cid,
            'path' => $this->clearImageUrl($path),
            'name' => $name,
        );
    }

    public function clearImageUrl($path)
    {
        global $site_URL;

        return trim(str_replace(trim($site_URL, '/'), '', $path), '/');
    }

    public function getEmbedImages()
    {
        return $this->embedImages;
    }
}