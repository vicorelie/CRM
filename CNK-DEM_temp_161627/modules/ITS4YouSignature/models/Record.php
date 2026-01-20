<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_Record_Model extends Vtiger_Record_Model
{
    const HTML_VARIABLE = 'ITS4YouSignatureHTML';
    const IMAGE_VARIABLE = 'ITS4YouSignatureImage';
    const CONFIRM_VARIABLE = 'ITS4YouSignatureConfirm';
    const LABEL_VARIABLE = '$PDF_SIGNATURE$';
    /**
     * @var string
     */
    public $emailTemplate = 'templates/DefaultSign.tpl';
    protected $settings;

    /**
     * @throws Exception
     */
    public function assignCopyToSignPerson()
    {
        $emails = [];
        $emails[] = $this->getEmailFromEmails();

        if (vtlib_isModuleActive('Contacts')) {
            $emails[] = $this->getEmailFromContacts();
        }

        if (vtlib_isModuleActive('Accounts')) {
            $emails[] = $this->getEmailFromAccounts();
        }

        $emails = array_filter($emails);

        $this->set('cc_email', !empty($emails) ? implode(',', $emails) : '');
    }

    public function assignPreContent(&$request)
    {
        if (!$this->isEmpty('template_body')) {
            $templateId = (int)$this->get('template');
            $language = $this->get('language');

            $sourceModule = $this->get('source_module');
            $sourceRecord = $this->get('source_record');

            $focus = CRMEntity::getInstance($sourceModule);
            $focus->retrieve_entity_info($sourceRecord, $sourceModule);

            $PDFContent = PDFMaker_PDFContent_Model::getInstance($templateId, $sourceModule, $focus, $language);
            $PDFContent->setBody(decode_html($this->get('template_body')));
            $PDFContent->replaceSignature();

            $content = $PDFContent->getContent();

            $request['header' . $templateId] = $content['header'];
            $request['body' . $templateId] = $content['body'];
            $request['footer' . $templateId] = $content['footer'];
            $request['mode'] = 'edit';
        }
    }

    /**
     * @param Vtiger_Request $request
     * @return int
     */
    public function createDocument(Vtiger_Request $request)
    {
        $moduleName = 'Documents';
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $recordModel = Vtiger_Record_Model::getCleanInstance($moduleName);
        $recordModel->set('filename', 'Signature.pdf');
        $recordModel->set('filetype', 'application/pdf');
        $recordModel->set('fileversion', 'I');
        $recordModel->set('filestatus', 'on');
        $recordModel->set('parentid', $request->get('parentid'));

        foreach ($moduleModel->getFields() as $fieldName => $fieldModel) {
            if ($request->has($fieldName)) {
                $fieldValue = $request->get($fieldName, null);
            } else {
                $fieldValue = $fieldModel->getDefaultFieldValue();
            }

            $fieldDataType = $fieldModel->getFieldDataType();

            if ('time' === $fieldDataType) {
                $fieldValue = Vtiger_Time_UIType::getTimeValueWithSeconds($fieldValue);
            }
            if (!empty($fieldValue)) {
                if (!is_array($fieldValue)) {
                    $fieldValue = trim($fieldValue);
                }

                $recordModel->set($fieldName, $fieldValue);
            }
        }

        $recordModel->save();

        return intval($recordModel->getId());
    }

    /**
     * @return object
     * @throws Exception
     */
    public function createNotesRelations($documentId, $sourceRecord, $contactId)
    {
        $moduleName = 'Documents';
        $focus = CRMEntity::getInstance($moduleName);
        $focus->retrieve_entity_info($documentId, $moduleName);
        $focus->id = $documentId;
        $focus->parentid = $sourceRecord;
        $focus->insertintonotesrel($sourceRecord, $documentId);

        if ($contactId) {
            $focus->insertintonotesrel($contactId, $documentId);
        }

        return $focus;
    }

    public function deleteDocuments()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery($this->getDocumentsQuery(), [$this->getId()]);

        while ($row = $adb->fetchByAssoc($result)) {
            $document = Vtiger_Record_Model::getInstanceById($row['record'], 'Documents');

            if ($document) {
                $document->delete();
            }
        }
    }

    /**
     * @throws AppException
     */
    public function deleteSignatures()
    {
        $signatures = PDFMaker_Signatures_Model::getInstanceBySign($this->getId());

        if ($signatures->isImageExists()) {
            $signatures->delete();
        }
    }

    /**
     * @return int
     * @throws AppException
     * @throws Exception
     */
    public function generatePDF()
    {
        $this->validateFields(['language', 'source_module', 'source_record', 'template']);

        if (!class_exists('mPDF')) {
            require_once 'modules/PDFMaker/resources/mpdf/mpdf.php';
        }

        $PDFMaker = new PDFMaker_PDFMaker_Model();
        $language = $this->isEmpty('language') ? Vtiger_Language_Handler::getLanguage() : $this->get('language');
        $sourceModule = $this->get('source_module');
        $sourceRecord = intval($this->get('source_record'));
        $template_ids = intval($this->get('template'));
        $contactId = intval($this->get('recipientId'));
        $forView = 'Detail';
        /** @var $moduleModel ITS4YouSignature_Module_Model */
        $moduleModel = $this->getModule();
        $oldRequest = $_REQUEST;
        $_REQUEST = [
            'module' => 'PDFMaker',
            'action' => 'SaveIntoDocuments',
            'pmodule' => $sourceModule,
            'pid' => $sourceRecord,
            'record' => $sourceRecord,
            'forview' => $forView,
            'language' => $language,
            'template_ids' => $template_ids,
            'assigned_user_id' => $this->get('assigned_user_id'),
            'filelocationtype' => 'I',
            'folderid' => $moduleModel->getDocumentFolder()->getId(),
            'notes_title' => 'Signature',
            'parentid' => $sourceRecord,
        ];
        $this->retrieveDefaultSign();
        $this->retrieveConfirmSign();
        $this->assignPreContent($_REQUEST);
        $request = new Vtiger_Request($_REQUEST, $_REQUEST);
        $documentId = $this->createDocument($request);
        $focus = $this->createNotesRelations($documentId, $sourceRecord, $contactId);
        $PDFMaker->createPDFAndSaveFile($request, $template_ids, $focus, [$sourceRecord], '', $sourceModule, $language);
        $this->setRelation($documentId, 'Documents');
        $this->setRelationForModule($sourceRecord, $sourceModule, $documentId, 'Documents');
        $this->updateNotesTitle($documentId);

        $_REQUEST = $oldRequest;

        return $documentId;
    }

    public function getAcceptLink()
    {
        return $this->getSignatureUrl() . '&v=' . md5($this->getAcceptanceUser()->getId());
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getAttachments()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery($this->getDocumentsQuery(), [$this->getId()]);
        $attachments = [];

        while ($row = $adb->fetchByAssoc($result)) {
            $document = Vtiger_Record_Model::getInstanceById($row['record'], 'Documents');

            if ($document) {
                $documentDetails = $document->getFileDetails();

                if (empty($documentDetails['storedname'])) {
                    $documentDetails['storedname'] = $documentDetails['name'];
                }

                $file = $documentDetails['path'] . $documentDetails['attachmentsid'] . '_' . $documentDetails['storedname'];

                $attachments[] = [
                    'fileid' => $documentDetails['attachmentsid'],
                    'attachment' => decode_html($documentDetails['name']),
                    'path' => $documentDetails['path'],
                    'file' => $file,
                    'size' => filesize($file),
                    'type' => $documentDetails['type'],
                    'cid' => $documentDetails['cid'],
                ];
            }
        }

        return $attachments;
    }

    public function getCompanyImage()
    {
        global $site_URL;

        $company = Vtiger_CompanyDetails_Model::getInstanceById();
        $logo = $company->getLogo();

        return rtrim($site_URL, '/') . '/' . ltrim($logo->get('imagepath'), '/');
    }

    /**
     * @return string
     */
    public function getCurrentUserDate()
    {
        return (new DateTimeField(Vtiger_Functions::currentUserDisplayDateNew()))->getDBInsertDateValue();
    }

    public function getDocumentsQuery()
    {
        return 'SELECT vtiger_notes.notesid AS record, vtiger_crmentity.setype AS module FROM vtiger_notes
				INNER JOIN vtiger_senotesrel ON vtiger_senotesrel.notesid= vtiger_notes.notesid
				LEFT JOIN vtiger_notescf ON vtiger_notescf.notesid= vtiger_notes.notesid
				INNER JOIN vtiger_crmentity ON vtiger_crmentity.crmid= vtiger_notes.notesid AND vtiger_crmentity.deleted=0
				INNER JOIN vtiger_crmentity AS crm2 ON crm2.crmid=vtiger_senotesrel.crmid
				LEFT JOIN vtiger_groups ON vtiger_groups.groupid = vtiger_crmentity.smownerid
				LEFT JOIN vtiger_seattachmentsrel ON vtiger_seattachmentsrel.crmid =vtiger_notes.notesid
				LEFT JOIN vtiger_attachments ON vtiger_seattachmentsrel.attachmentsid = vtiger_attachments.attachmentsid
				LEFT JOIN vtiger_users ON vtiger_crmentity.smownerid= vtiger_users.id
				WHERE crm2.crmid=?';
    }

    /**
     * @return string
     */
    public function getEmailBodyContent()
    {
        $content = $this->get('emailBody');

        foreach ($this->getEmailMessageVariables() as $key => $value) {
            $content = str_replace('$' . $key . '$', $value, $content);
        }

        return (string)$content;
    }

    public function getEmailFromAccounts()
    {
        $recordModel = $this->getRelatedAccount();

        if (!empty($recordModel)) {
            return ITS4YouSignature_Module_Model::getEmailFromRecord($recordModel);
        }

        return '';
    }

    /**
     * @throws Exception
     */
    public function getEmailFromContacts()
    {
        $recordModel = $this->getRelatedContact();

        if (!empty($recordModel)) {
            return ITS4YouSignature_Module_Model::getEmailFromRecord($recordModel);
        }

        return '';
    }

    /**
     * @return string
     * @throws Exception
     */
    public function getEmailFromEmails()
    {
        $adb = PearDatabase::getInstance();
        $sql = $this->getRelationQuery('Emails');
        $result = $adb->query($sql);
        $recordId = $adb->query_result($result, 0, 'crmid');

        if (!empty($recordId)) {
            $recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'Emails');

            if ($recordModel && 'ACCEPT' !== $recordModel->get('email_flag')) {
                $emails = htmlspecialchars_decode($recordModel->get('saved_toid'));

                return trim($emails, '"[]');
            }
        }

        $adb = PearDatabase::getInstance();
        $sql = $this->getRelationQuery('ITS4YouEmails');
        $result = $adb->query($sql);
        $recordId = $adb->query_result($result, 0, 'crmid');

        if (!empty($recordId)) {
            $recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'ITS4YouEmails');

            if ($recordModel && -1 === stripos($recordModel->get('description'), 'FLAG:ACCEPT')) {
                return $recordModel->get('to_email');
            }
        }

        return '';
    }

    /**
     * @return string
     * @throws Exception
     */
    public function getEmailMessage()
    {
        return !$this->isEmpty('emailBody') ? $this->getEmailBodyContent() : $this->getEmailTemplateContent();
    }

    /**
     * @return array
     */
    public function getEmailMessageVariables()
    {
        return [
            'SIGNATURE_TITLE' => $this->get('emailSubject'),
            'SIGNATURE_MESSAGE' => $this->get('emailMessage'),
            'SIGNATURE_URL' => $this->getSignatureUrl(),
            'ACCEPT_URL' => $this->getAcceptLink(),
        ];
    }

    /**
     * @return string
     */
    public function getEmailTemplate()
    {
        $templates = [
            'templates/DefaultSign.tpl' => 'templates/Sign.tpl',
            'templates/DefaultSigned.tpl' => 'templates/Signed.tpl',
            'templates/DefaultAccept.tpl' => 'templates/Accept.tpl',
        ];
        $url = 'layouts/' . Vtiger_Viewer::getDefaultLayoutName() . '/modules/' . (string)$this->getModuleName() . '/' . $templates[$this->emailTemplate];

        if (isset($templates[$this->emailTemplate]) && is_file($url)) {
            $this->emailTemplate = $templates[$this->emailTemplate];
        }

        return $this->emailTemplate;
    }

    /**
     * @return string
     * @throws Exception
     */
    public function getEmailTemplateContent()
    {
        $viewer = new Vtiger_Viewer();
        $viewer->assign('MODULE', $this->getModuleName());
        $viewer->assign('RECORD_MODEL', $this);
        $viewer->assign('RECIPIENT_RECORD', $this->getRelatedRecord());
        $viewer->assign('COMPANY', Vtiger_CompanyDetails_Model::getInstanceById());
        $viewer->assign('COMPANY_LOGO', $this->getCompanyImage());
        $viewer->assign('CURRENT_USER_MODEL', Users_Record_Model::getCurrentUserModel());
        $viewer->assign('ACCEPT_USER_MODEL', $this->getAcceptanceUser());
        $viewer->assign('ASSIGNED_USER_MODEL', $this->getUser());

        foreach ($this->getEmailMessageVariables() as $key => $value) {
            $viewer->assign($key, $value);
        }

        return (string)$viewer->view($this->getEmailTemplate(), $this->getModuleName(), true);
    }

    /**
     * @param Vtiger_Request $request
     * @return ITS4YouSignature_Record_Model
     */
    public static function getInstanceFromRequest(Vtiger_Request $request)
    {
        $currentUser = Users_Record_Model::getCurrentUserModel();

        /** @var $record ITS4YouSignature_Record_Model */
        $record = self::getCleanInstance('ITS4YouSignature');
        $record->set('signature_name', $request->get('emailSubject'));
        $record->set('signature_status', 'Created');
        $record->set('assigned_user_id', $currentUser->getId());
        $record->save();

        return $record;
    }

    /**
     * @throws Exception
     */
    public function getNumberField($module)
    {
        $tabId = getTabid($module);
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT fieldname FROM vtiger_field WHERE tabid = ? AND uitype = ?', [$tabId, 4]);

        return $adb->query_result($result, 0, 'fieldname');
    }

    /**
     * @return string
     */
    public function getPDFPreviewURL()
    {
        return $this->getSignatureUrl() . '&mode=showPreviewPDF';
    }

    public function getRelatedAccount()
    {
        $recordId = $this->getRelatedAccountId();

        if (!empty($recordId)) {
            return Vtiger_Record_Model::getInstanceById($recordId, 'Accounts');
        }

        return false;
    }

    public function getRelatedAccountId()
    {
        $adb = PearDatabase::getInstance();
        $sql = $this->getRelationQuery('Accounts');
        $result = $adb->query($sql);

        return $adb->query_result($result, 0, 'crmid');
    }

    /**
     * @return false|Vtiger_Record_Model
     * @throws Exception
     */
    public function getRelatedContact()
    {
        $recordId = $this->getRelatedContactId();

        if (!empty($recordId)) {
            return Vtiger_Record_Model::getInstanceById($recordId, 'Contacts');
        }

        return false;
    }

    /**
     * @throws Exception
     */
    public function getRelatedContactId()
    {
        $adb = PearDatabase::getInstance();
        $sql = $this->getRelationQuery('Contacts');
        $result = $adb->query($sql);

        return $adb->query_result($result, 0, 'crmid');
    }

    /**
     * @throws Exception
     */
    public function getRelatedId()
    {
        $accountId = null;
        $contactId = null;

        if (vtlib_isModuleActive('Accounts')) {
            $accountId = $this->getRelatedAccountId();
        }

        if (vtlib_isModuleActive('Contacts')) {
            $contactId = $this->getRelatedContactId();
        }

        return !empty($contactId) ? $contactId : $accountId;
    }

    /**
     * @throws Exception
     */
    public function getRelatedContactName()
    {
        $contact = $this->getRelatedContact();

        return $contact ? $contact->getName() : '';
    }

    /**
     * @throws Exception
     */
    public function getRelatedName()
    {
        $name = '';

        if (vtlib_isModuleActive('Contacts')) {
            $contact = $this->getRelatedContact();

            if ($contact) {
                $name .= $contact->getName();
            }
        }

        if (vtlib_isModuleActive('Accounts')) {
            $account = $this->getRelatedAccount();

            if ($account) {
                $name .= $account->getName();
            }
        }

        if (empty($name)) {
            $name .= $this->getEmailFromEmails();
        }

        return $name;
    }

    public function getRelatedRecord()
    {
        $record = false;

        if (vtlib_isModuleActive('Contacts')) {
            $record = $this->getRelatedContact();
        }

        if (!$record && vtlib_isModuleActive('Accounts')) {
            $record = $this->getRelatedAccount();
        }

        return $record;
    }

	/**
	 * @throws AppException
	 */
	public function getRelationQuery($relatedModule, $parentModule = 'ITS4YouSignature')
	{
		vglobal('currentModule', $parentModule);

		$parentModuleModel = Vtiger_Module_Model::getInstance($parentModule);
		$relatedModuleModel = Vtiger_Module_Model::getInstance($relatedModule);
		$relatedList = Vtiger_Relation_Model::getInstance($parentModuleModel, $relatedModuleModel);

		return $relatedList->getQuery($this);
	}

	/**
     * @return Settings_Vtiger_Module_Model
     */
    public function getSettings()
    {
        if (!$this->settings) {
            $this->settings = Settings_Vtiger_Record_Model::getInstance('Settings:ITS4YouSignature');
        }

        return $this->settings;
    }

    /**
     * @return string
     */
    public function getSignatureUrl()
    {
        $site_URL = ITS4YouSignature_Module_Model::getSiteUrl();

        return $site_URL . 'ITS4YouSignature.php?u=' . md5($site_URL) . '&s=' . base64_encode($this->getId());
    }

    /**
     * @return string
     */
    public function getSignedMessage()
    {
        return (string)$this->getSettings()->get('signed_email_message');
    }

    /**
     * @return string
     */
    public function getSignMessage()
    {
        return (string)$this->get('emailMessage');
    }

    /**
     * @return string
     */
    public function getSignSubject()
    {
        return vtranslate($this->getSettings()->get('email_subject'), 'ITS4YouSignature') . ' - ' . $this->get('signature_name');
    }

    /**
     * @return string
     */
    public function getSignedSubject()
    {
        return vtranslate($this->getSettings()->get('signed_email_subject'), 'ITS4YouSignature') . ' - ' . $this->get('signature_name');
    }

    /**
     * @return string
     */
    public function getAcceptSubject()
    {
        return vtranslate($this->getSettings()->get('accept_email_subject'), 'ITS4YouSignature') . ' - ' . $this->get('signature_name');
    }

    /**
     * @return string
     */
    public function getAcceptMessage()
    {
        return vtranslate($this->getSettings()->get('accept_email_message'), 'ITS4YouSignature') . ' - ' . $this->get('signature_name');
    }

    /**
     * @return false|Vtiger_Record_Model
     */
    public function getSourceRecord()
    {
        if ($this->isEmpty('source_record') || !isRecordExists(intval($this->get('source_record')))) {
            return false;
        }

        return Vtiger_Record_Model::getInstanceById($this->get('source_record'));
    }

    /**
     * @return string
     */
    public function getSourceRecordName()
    {
        $sourceRecord = $this->getSourceRecord();

        return $sourceRecord ? $sourceRecord->getName() : '';
    }

    /**
     * @return string
     */
    public function getStatus()
    {
        return (string)$this->get('signature_status');
    }

    /**
     * @return Vtiger_Record_Model
     */
    public function getUser()
    {
        return Users_Record_Model::getInstanceById($this->get('assigned_user_id'), 'Users');
    }

    public function isAcceptanceUser(Vtiger_Request $request)
    {
        $validate = $request->get('v');

        if (class_exists('ITS4YouSignature_AcceptSignaturesRule_Helper')) {
            if (ITS4YouSignature_AcceptSignaturesRule_Helper::isPermitted($this->getId(), $this->getAcceptanceUser()->getId())) {
                return true;
            }
        }

        return $validate === md5($this->getAcceptanceUser()->getId());
    }

    /**
     * @return bool
     */
    public function isCompleted()
    {
        return in_array($this->getStatus(), ['Completed', 'Signed', 'Signed and Confirmed']);
    }

    /**
     * @return bool
     */
    public function isSigned()
    {
        return 'Signed' === $this->getStatus();
    }

    public function isTypeAcceptance()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT body FROM vtiger_pdfmaker WHERE templateid=?', [(int)$this->get('template')]);
        $body = $adb->query_result($result, 0, 'body');

        $result2 = $adb->pquery('SELECT template_body FROM its4you_signature WHERE signatureid=?', [(int)$this->getId()]);
        $body2 = $adb->query_result($result2, 0, 'template_body');

        return false !== stripos($body, 'PDF_SIGNATURE_ACCEPT_') || false !== stripos($body2, 'PDF_SIGNATURE_ACCEPT_');
    }

    public function isWaitingForAcceptance()
    {
        return 'Waiting for acceptance' === $this->getStatus();
    }

    public function isWaitingForConfirmation()
    {
        return 'Waiting for confirmation' === $this->getStatus();
    }

    public function retrieveConfirmSign()
    {
        vglobal(self::CONFIRM_VARIABLE, 1);
    }

    public function retrieveDefaultSign()
    {
        $signatureModel = PDFMaker_Signatures_Model::getInstanceBySign($this->getId());

        if ($signatureModel->isImageExists()) {
            vglobal('ITS4YouSignatureImage', $signatureModel->getImage());
        }
    }

    public function saveSentOn()
    {
        $this->set('mode', 'edit');
        $this->set('signature_status', 'Waiting for Others');
        $this->set('senton', $this->getCurrentUserDate());
        $this->save();
    }

    public function saveSignatureDate()
    {
        $this->set('mode', 'edit');
        $this->set('signature_status', 'Waiting for confirmation');
        $this->set('signature_date', $this->getCurrentUserDate());
        $this->save();
    }

    public function saveSignatureImage($image)
    {
        $signatures = PDFMaker_Signatures_Model::getInstanceBySign($this->getId());
        $signatures->saveString($image);
        $signatures->set('type', 'default');
        $signatures->set('signature_id', $this->getId());
        $signatures->set('name', $this->getName());
        $signatures->save();
    }

    /**
     * @return bool
     */
    public function saveTemplate()
    {
        $this->updateValues([
            'template' => $this->get('templateId'),
            'template_body' => $this->get('templateBody'),
            'language' => $this->get('templateLanguage'),
            'source_record' => $this->get('sourceRecord'),
            'source_module' => $this->get('sourceModule'),
            'signature_mode' => $this->get('signatureMode'),
        ]);

        return true;
    }

    public function getTemplateId()
    {
        return (int)$this->get('template');
    }

    public function getAcceptanceUserId()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT signature_accept_user FROM vtiger_pdfmaker_settings WHERE templateid=?', [$this->getTemplateId()]);
        $userId = (int)$adb->query_result($result, 0, 'signature_accept_user');

        return !empty($userId) ? $userId : (int)$this->get('assigned_user_id');
    }

    public function getAcceptanceUser()
    {
        $userId = $this->getAcceptanceUserId();

        if (!empty($userId)) {
            return Users_Record_Model::getInstanceById($userId, 'Users');
        }

        return $this->getUser();
    }

    public function sendAcceptEmail()
    {
        $user = $this->getAcceptanceUser();

        if ($user) {
            $this->set('recipientId', $user->getId());
            $this->set('recipientEmail', $user->get('email1'));
            $this->set('emailSubject', $this->getAcceptSubject());
            $this->set('emailMessage', $this->getAcceptMessage());
            $this->set('emailFlag', 'ACCEPT');
            $this->setEmailTemplate('templates/DefaultAccept.tpl');

            return $this->sendEmail();
        }

        return false;
    }

    public function sendSignEmail()
    {
        $this->set('recipientId', (int)$this->get('recipientId'));
        $this->set('recipientEmail', $this->get('recipientEmail'));
        $this->set('emailSubject', $this->getSignSubject());
        $this->set('emailMessage', $this->getSignMessage());
        $this->setEmailTemplate('templates/DefaultSign.tpl');

        return $this->sendEmail();
    }

    /**
     * @return mixed
     * @throws Exception
     */
    public function sendEmail()
    {
        include_once 'libraries/ToAscii/ToAscii.php';

        $recipientId = (int)$this->get('recipientId');
        $recipientModule = getSalesEntityType($recipientId);
        $recipientEmail = $this->get('recipientEmail');

        /** @var ITS4YouEmails_Record_Model $email */
        $email = Vtiger_Record_Model::getCleanInstance('ITS4YouEmails');
        $email->set('subject', $this->get('emailSubject'));
        $email->set('body', $this->getEmailMessage());
        $email->set('to_email', $recipientEmail);
        $email->set('to_email_ids', implode('|', [$recipientId, $recipientEmail, $recipientModule]));
        $email->set('related_to', $this->getRelatedId());
        $email->set('email_flag', 'SENT');
        $email->set('description', 'FLAG:' . $this->get('emailFlag'));
        $email->set('assigned_user_id', $this->get('assigned_user_id'));

        if (!$this->isEmpty('cc_email')) {
            $email->set('cc_email', $this->get('cc_email'));
        }

        $email->save();

        foreach ($this->getDocumentIds() as $documentId) {
            $email->saveDocumentRelation($documentId);
        }

        $email = Vtiger_Record_Model::getInstanceById($email->getId(), 'ITS4YouEmails');
        $email->send();

        $this->setRelation($email->getId(), $email->getModuleName());

        return true;
    }

    public function getDocumentIds()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery(
            'SELECT vtiger_senotesrel.notesid 
            FROM vtiger_attachments, vtiger_seattachmentsrel, vtiger_senotesrel
            WHERE vtiger_senotesrel.notesid = vtiger_seattachmentsrel.crmid 
            AND vtiger_attachments.attachmentsid = vtiger_seattachmentsrel.attachmentsid AND vtiger_senotesrel.crmid = ?',
            [$this->getId()]
        );
        $ids = array();

        while ($row = $adb->fetchByAssoc($result)) {
            if (empty($row['notesid'])) {
                continue;
            }

            $ids[] = $row['notesid'];
        }

        return $ids;
    }

    /**
     * @throws Exception
     */
    public function sendSignedEmail()
    {
        $user = $this->getUser();

        if ($user) {
            $this->set('recipientId', $user->getId());
            $this->set('recipientEmail', $user->get('email1'));
            $this->set('emailSubject', $this->getSignedSubject());
            $this->set('emailMessage', $this->getSignedMessage());
            $this->setEmailTemplate('templates/DefaultSigned.tpl');
            $this->assignCopyToSignPerson();

            return $this->sendEmail();
        }

        return false;
    }

    /**
     * @param string $value
     */
    public function setEmailTemplate($value)
    {
        $this->emailTemplate = $value;
    }

    /**
     * @param $id
     * @param $module
     */
    public function setRelation($id, $module)
    {
        $sourceModuleModel = $this->getModule();
        $relatedModuleModel = Vtiger_Module_Model::getInstance($module);

        if ($relatedModuleModel) {
            $relationModel = Vtiger_Relation_Model::getInstance($sourceModuleModel, $relatedModuleModel);

            if ($relationModel) {
                $relationModel->addRelation($this->getId(), $id);
            }
        }
    }

    public function setRelationForModule($sourceId, $sourceModule, $relatedId, $relatedModule)
    {
        if (empty($sourceId) || empty($sourceModule)) {
            return;
        }

        $sourceModuleModel = Vtiger_Module_Model::getInstance($sourceModule);
        $relatedModuleModel = Vtiger_Module_Model::getInstance($relatedModule);

        if ($relatedModuleModel) {
            $relationModel = Vtiger_Relation_Model::getInstance($sourceModuleModel, $relatedModuleModel);

            if ($relationModel) {
                $relationModel->addRelation($sourceId, $relatedId);
            }
        }
    }

    /**
     * @param string $value
     */
    public function setStatus($value)
    {
        $this->set('mode', 'edit');
        $this->set('signature_status', $value);
        $this->save();
    }

    /**
     * @param int $record
     */
    public function updateNotesTitle($record)
    {
        $record = Vtiger_Record_Model::getInstanceById($record, 'Documents');
        $record->set('mode', 'edit');
        $record->set('notes_title', substr($record->get('filename'), 0, -4) . ' - signed');
        $record->save();
    }

    /**
     * @param array $values
     */
    public function updateValues($values)
    {
        $adb = PearDatabase::getInstance();

        foreach ($values as $key => $value) {
            $sql = sprintf('UPDATE its4you_signature SET %s = ? WHERE signatureid = ?', $key);
            $adb->pquery($sql, [$value, $this->getId()]);
        }
    }

    /**
     * @param $fields
     * @throws AppException
     */
    public function validateFields($fields)
    {
        foreach ($fields as $field) {
            if ($this->isEmpty($field)) {
                throw new AppException(vtranslate('LBL_REQUIRED_FIELD', $this->getModuleName()) . $field);
            }
        }
    }
}
