<?php
/* ********************************************************************************
 * The content of this file is subject to the EMAIL Maker license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

require_once('modules/com_vtiger_workflow/VTTaskManager.inc');
require_once('modules/com_vtiger_workflow/VTEntityCache.inc');
require_once('modules/com_vtiger_workflow/VTWorkflowUtils.php');
require_once('modules/com_vtiger_workflow/VTEmailRecipientsTemplate.inc');
require_once('modules/Emails/mail.php');
require_once('modules/EMAILMaker/EMAILMaker.php');
require_once('modules/Emails/models/Mailer.php');

class VTEMAILMakerMailTask extends VTTask
{
    public $executeImmediately = false;
    public $template;
    public $template_language;
    public $contents;
    public $recepient;
    public $emailcc;
    public $emailbcc;
    public $template_field;
    public $parent;
    public $cache;
    public $signature;
    public $smtp;
    public $pdf_template_merge;
    public $pdf_template_language;
    public $pdf_template;
    public $check_optout;


    public function getFieldNames()
    {
        return array('recepient', 'emailcc', 'emailbcc', 'template', 'template_language', 'template_field', 'replyTo', 'signature', 'smtp', 'executeImmediately', 'pdf_template', 'pdf_template_language','pdf_template_merge', 'check_optout');
    }

	/**
	 * @param string $value
	 * @return array
	 */
	public function getIdComponents($value)
	{
		return explode('x', $value);
	}

	public function getUserId($entity, $content)
	{
		$userId = $this->getIdComponents($entity->get('assigned_user_id'))[1];

		if ($this->executeImmediately) {
			$userId = (int)$content['luserid'];
		}

		if (empty($userId)) {
			$current_user = Users_Record_Model::getCurrentUserModel();
			$userId = (int)$current_user->id;
		}

		return $userId;
	}

	/**
     * @param VTWorkflowEntity $entity
     * @return void
     * @throws Exception
     */
    public function doTask($entity)
    {
        $this->contents = null;
        $current_user = Users_Record_Model::getCurrentUserModel();
        $sendingId = ITS4YouEmails_Utils_Helper::getSendingId();

        $util = new VTWorkflowUtils();
        $util->adminUser();
        $entity->getModuleName();

        $taskContents = Zend_Json::decode($this->getContents($entity));
		$from_name = $taskContents['fromName'];
        $cc_string = trim($taskContents['ccEmail'], ',');
        $bcc_string = trim($taskContents['bccEmail'], ',');
        $load_subject = $taskContents['subject'];
        $load_body = $taskContents['body'];
        $to_emails = $taskContents['toEmails'];
        $attachments = $taskContents['attachments'];
        $logged_user_id = $taskContents['luserid'];
        $modified_by_user_id = $taskContents['muserid'];
        $replyTo = $taskContents['replyTo'];
        $signature = $taskContents['signature'];
        $emailTemplateData = [
            'luserid' => $logged_user_id,
            'muserid' => $modified_by_user_id,
        ];

        $entityId = $this->getIdComponents($entity->getId())[1];
	    $moduleName = 'ITS4YouEmails';
        $userId = $this->getUserId($entity, $taskContents);

        foreach ($to_emails as $email_data) {
            $to_email = $email_data['email'];
            $recipientModule = $email_data['module'];
            $recipientId = $this->getIdComponents($email_data['id'])[1];

            if (!empty($to_email)) {
                $subject = strip_tags(decode_html($load_subject));
                $body = decode_html($load_body);

                if ($signature && class_exists('ITS4YouEmails_Record_Model')) {
                    $body .= ITS4YouEmails_Record_Model::getSignature($userId);
                }

                if (empty($body) && empty($subject)) {
                    continue;
                }

                /** @var ITS4YouEmails_Record_Model $emailRecord */
                $emailRecord = ITS4YouEmails_Record_Model::getCleanInstance($moduleName);
                $emailRecord->set('sending_id', $sendingId);
	            $emailRecord->set('workflow_id', $this->workflowId);
				$emailRecord->set('source', 'WF');
                $emailRecord->set('assigned_user_id', $userId);
                $emailRecord->set('subject', $subject);
                $emailRecord->set('body', $body);
                $emailRecord->set('email_flag', 'SAVED');
                $emailRecord->set('related_to', $entityId);
                $emailRecord->set('email_template_ids', $this->template);
                $emailRecord->set('email_template_language', $this->template_language);
                $emailRecord->set('smtp', $this->getSMTPId($entity));
                $emailRecord->set('reply_email', $replyTo);
                $emailRecord->set('reply_email_ids', 'email|' . $replyTo . '|');
                $emailRecord->set('to_email', $to_email);
                $emailRecord->set('to_email_ids', implode('|', [$recipientId, $to_email, $recipientModule]));

                if(!empty($cc_string)) {
                    $ccEmails = array_filter(explode(',', $cc_string));

                    $emailRecord->set('cc_email', implode(',', $ccEmails));
                    $emailRecord->set('cc_email_ids', implode(',', $this->getAddressIds($ccEmails)));
                }

                if(!empty($bcc_string)) {
                    $bccEmails = array_filter(explode(',', $bcc_string));

                    $emailRecord->set('bcc_email', implode(',', $bccEmails));
                    $emailRecord->set('bcc_email_ids', implode(',', $this->getAddressIds($bccEmails)));
                }

                $this->retrievePDFTemplate($emailRecord);

                $emailRecord->save();
                $emailRecord->savePDF();

                if (EMAILMaker_Utils_Helper::count($attachments) > 0) {
                    foreach ($attachments as $attachment_id) {
                        $emailRecord->saveDocumentRelation($attachment_id);
                    }
                }

                /** @var ITS4YouEmails_Record_Model $emailRecord */
                $emailRecord = ITS4YouEmails_Record_Model::getInstanceById($emailRecord->getId(), $moduleName);
                $emailRecord->set('email_template_data', $emailTemplateData);
                $emailRecord->send();
            }
        }

        $util->revertUser();
    }

    public function retrievePDFTemplate($emailRecord) {
        $pdfTemplates = $this->getPDFTemplate();

        if (EMAILMaker_Module_Model::isPDFMakerInstalled() && !empty($pdfTemplates)) {
            $emailRecord->set('pdf_template_ids', $pdfTemplates);
            $emailRecord->set('pdf_template_language', $this->getPDFTemplateLanguage());
            $emailRecord->set('is_merge_templates', $this->getPDFTemplateMerge());
        } else {
            $emailRecord->set('pdf_template_ids', '');
            $emailRecord->set('pdf_template_language', '');
            $emailRecord->set('is_merge_templates', '');
        }
    }

    public function getPDFTemplateMerge()
    {
        return 'Yes' === $this->pdf_template_merge ? 1 : 0;
    }

    public function getPDFTemplateLanguage()
    {
        return $this->pdf_template_language;
    }

    public function getPDFTemplate()
    {
        $templateIds = !empty($this->pdf_template) && is_array($this->pdf_template) ? $this->pdf_template : [];
        $templateIds = array_filter($templateIds);

        if (empty($templateIds) || !class_exists('PDFMaker_PDFMaker_Model')) {
            return '';
        }

        $PDFMaker = new PDFMaker_PDFMaker_Model();

        foreach ($templateIds as $templateId) {
            if ($PDFMaker->isTemplateDeleted($templateId)) {
                return '';
            }
        }

        return implode(';', $templateIds);
    }

    public function getPDFTemplates($selected_module)
    {
        if ('Events' === $selected_module) {
            $selected_module = 'Calendar';
        }

        $PDFMaker = new PDFMaker_PDFMaker_Model();
        $templates = $PDFMaker->GetAvailableTemplates($selected_module);
        $defaultTemplate = array();
        $fieldValue = array();

        if ($PDFMaker->CheckPermissions('DETAIL')) {
            foreach ($templates as $templateid => $valArr) {
                if (!$PDFMaker->isTemplateDeleted($templateid)) {
                    if (in_array($valArr['is_default'], ['1', '3'])) {
                        $defaultTemplate[$templateid] = $valArr['templatename'];
                    } else {
                        $fieldValue[$templateid] = $valArr['templatename'];
                    }
                }
            }

            if (PDFMaker_Utils_Helper::count($defaultTemplate) > 0) {
                $fieldValue = $defaultTemplate + $fieldValue;
            }
        }

        return $fieldValue;
    }


    public function getAddressIds($values)
    {
        $ids = [];

        foreach ($values as $value) {
            $ids[] = 'email|' . $value . '|';
        }

        return $ids;
    }

    /**
     * @throws WebServiceException
     */
    public function getContents($entity, $entityCache = false)
    {

        if (!$this->contents) {
            global $adb;
            $taskContents = array();
            $entityId = $entity->getId();
            $utils = new VTWorkflowUtils();
            $adminUser = $utils->adminUser();

            if (!$entityCache) {
                $entityCache = new VTEntityCache($adminUser);
            }

            $replyToEmail = null;

            if (!empty($this->replyTo)) {
                $et = new VTEmailRecipientsTemplate($this->replyTo);
                $replyToEmailDetails = $et->render($entityCache, $entityId);
                $replyToEmailDetails = trim($replyToEmailDetails, ',');

                if (filter_var($replyToEmailDetails, FILTER_VALIDATE_EMAIL)) {
                    $replyToEmail = $replyToEmailDetails;
                }
            }

            $taskContents['replyTo'] = $replyToEmail;

            if ($entity->getModuleName() === 'Events') {
                $contactId = $entity->get('contact_id');
                if ($contactId) {
                    $contactIds = '';
                    list($wsId, $recordId) = explode('x', $entityId);
                    $webserviceObject = VtigerWebserviceObject::fromName($adb, 'Contacts');

                    $result = $adb->pquery('SELECT contactid FROM vtiger_cntactivityrel WHERE activityid = ?', array($recordId));
                    $numOfRows = $adb->num_rows($result);
                    for ($i = 0; $i < $numOfRows; $i++) {
                        $contactIds .= vtws_getId($webserviceObject->getEntityId(), $adb->query_result($result, $i, 'contactid')) . ',';
                    }
                }
                $entity->set('contact_id', trim($contactIds, ','));
                $entityCache->cache[$entityId] = $entity;
            }

            $toEmails = $this->getRecipientEmails($entityCache, $entityId, $this->recepient);

            $toEmail = (new VTSimpleTemplate($this->recepient))->render($entityCache, $entityId);
            $toEmail = $this->retrieveSpecialOptions($entity, $toEmail);

            $ccEmail = (new VTSimpleTemplate($this->emailcc))->render($entityCache, $entityId);
            $ccEmail = $this->retrieveSpecialOptions($entity, $ccEmail);

            $bccEmail = (new VTSimpleTemplate($this->emailbcc))->render($entityCache, $entityId);
            $bccEmail = $this->retrieveSpecialOptions($entity, $bccEmail);

            if (strlen(trim($toEmail, " \t\n,")) == 0 && strlen(trim($ccEmail, " \t\n,")) == 0 && strlen(trim($bccEmail, " \t\n,")) == 0) {
                $utils->revertUser();
                return false;
            }
            $taskContents['toEmail'] = $toEmail;
            $taskContents['toEmails'] = $toEmails;
            $taskContents['ccEmail'] = $ccEmail;
            $taskContents['bccEmail'] = $bccEmail;

            global $email_maker_dynamic_template_wf;
            if ($email_maker_dynamic_template_wf === true) {
                if (isset($this->template_field) && !empty($this->template_field)) {
                    $value = $entity->data[$this->template_field];
                    $resultEmailMaker = $adb->pquery('SELECT * FROM vtiger_emakertemplates WHERE templatename = ? AND deleted = 0 ', array($value));
                    $resultTemplateId = $adb->query_result($resultEmailMaker, 0, 'templateid');
                    $this->template = $resultTemplateId;
                }
            }

            $templateId = $this->template;
            $language = $this->template_language;

            list($entityModuleId, $entityRecordId) = $this->getIdComponents($entityId);

            $EMAILContentModel = EMAILMaker_EMAILContent_Model::getInstanceById($templateId, $language, getSalesEntityType($entityRecordId), $entityRecordId);
            $EMAILContentModel->getContent(false);

            $emailTemplateBody = $EMAILContentModel->getBody();

            if (vtlib_isModuleActive('ITS4YouStyles')) {
                $stylesModel = new ITS4YouStyles_Module_Model();
                $emailTemplateBody = $stylesModel->addStyles($emailTemplateBody, $templateId, "EMAILMaker");
            }

            $taskContents['subject'] = $EMAILContentModel->getSubject();
            $taskContents['body'] = $emailTemplateBody;
            $taskContents['attachments'] = $EMAILContentModel->getAttachments();
            $taskContents['language'] = $language;
            $taskContents['luserid'] = isset($_SESSION['authenticated_user_id']) ? $_SESSION['authenticated_user_id'] : '';

            $modifiedById = $entity->get('modifiedby');
            list ($modifiedByTabId, $modifiedByUserId) = explode('x', $modifiedById);
            $taskContents['muserid'] = $modifiedByUserId;

            $taskContents['signature'] = $this->signature;

            $this->contents = $taskContents;
            $utils->revertUser();
        }
        if (is_array($this->contents)) {
            $this->contents = Zend_Json::encode($this->contents);
        }
        return $this->contents;
    }

    public function getRecipientEmails($entityCache, $entityId, $to_emails)
    {
        $this->cache = $entityCache;
        $this->parent = $this->cache->forId($entityId);

        $recipients = array();
        $emails = explode(',', $to_emails);

        foreach ($emails as $email) {
            if (!empty($email)) {
                $recipientsData = $this->parseEmail($email, $entityCache, $entityId);

                if ($recipientsData) {
                    $recipients = array_merge($recipientsData, $recipients);
                }
            }
        }

        return $recipients;
    }

    private function parseEmail($to_email, $entityCache, $entityId)
    {
        preg_match('/\((\w+) : \(([_\w]+)\) (\w+)\)/', $to_email, $matches);

        if (count($matches) == 0) {
            $to_email_module = "";
            $to_email_id = "";
            $data = $this->parent->getData();

            if (substr($to_email, 0, 1) == '$') {

                $filename = substr($to_email, 1);

                if (isset($data[$filename])) {

                    if ($this->useValue($data, $filename)) {
                        $to_email_id = $this->parent->getId();
                        $to_email_module = $this->parent->getModuleName();
                        $to_email = $data[$filename];
                    }
                } elseif ('$parent_role_emails' === $to_email) {
                    list($userModuleId, $userRecordId) = explode('x', $data['assigned_user_id']);

                    return $this->getParentEmails($userRecordId);
                } else {
                    $et = new VTSimpleTemplate($to_email);

                    if (method_exists($et, 'renderArray')) {
                        return $et->renderArray($entityCache, $entityId);
                    } else {
                        $to_email = $et->render($entityCache, $entityId);
                    }
                }
            }

            return array(array("id" => $to_email_id, "module" => $to_email_module, "email" => $to_email));
        } else {
            list($full, $referenceField, $referenceModule, $fieldname) = $matches;

            $referenceId = $this->parent->get($referenceField);
            if ($referenceId == null) {
                return false;
            } else {
                if ($referenceField === 'contact_id') {
                    $referenceIdsList = explode(',', $referenceId);
                    $parts = array();
                    foreach ($referenceIdsList as $referenceId) {
                        $entity = $this->cache->forId($referenceId);
                        $to_email_module = $entity->getModuleName();
                        $data = $entity->getData();
                        if ($this->useValue($data, $fieldname)) {

                            $parts[] = array("id" => $referenceId, "module" => $to_email_module, "email" => $data[$fieldname]);
                        }
                    }
                    return $parts;
                }

                $entity = $this->cache->forId($referenceId);
                if ($referenceModule === "Users" && $entity->getModuleName() == "Groups") {
                    list($groupEntityId, $groupId) = $this->getIdComponents($referenceId);

                    require_once('include/utils/GetGroupUsers.php');
                    $ggu = new GetGroupUsers();
                    $ggu->getAllUsersInGroup($groupId);

                    $users = $ggu->group_users;
                    $parts = array();
                    foreach ($users as $userId) {
                        $refId = vtws_getWebserviceEntityId("Users", $userId);
                        $entity = $this->cache->forId($refId);
                        $data = $entity->getData();
                        if ($this->useValue($data, $fieldname)) {
                            $parts[] = array("id" => $userId, "module" => "Users", "email" => $data[$fieldname]);
                        }
                    }
                    return $parts;

                } elseif ($entity->getModuleName() === $referenceModule) {
                    $data = $entity->getData();

                    if ($this->useValue($data, $fieldname)) {
                        return array(array("id" => $referenceId, "module" => $referenceModule, "email" => $data[$fieldname]));
                    } else {
                        return false;
                    }
                }
            }
        }
        return false;
    }

    protected function useValue($data, $fieldname)
    {
        if ($this->check_optout === 'Yes') {
            return empty($data['emailoptout']);
        }

        return !empty($data[$fieldname]);
    }

    public function getTemplates($selected_module)
    {
        if('Events' === $selected_module) {
            $selected_module = 'Calendar';
        }

        $orderby = "templateid";
        $dir = "asc";
        $c = "<div class='row-fluid'>";

        $EMAILMaker = new EMAILMaker_EMAILMaker_Model();

        $request = new Vtiger_Request($_REQUEST, $_REQUEST);
        $templates_data = $EMAILMaker->GetListviewData($orderby, $dir, $selected_module, false, $request);

        foreach ($templates_data as $tdata) {

            $templateid = $tdata["templateid"];

            if (!empty($tdata["category"]) || isset($fieldvalue[$templateid])) {

                $fieldvalue[$tdata["category"]][$templateid] = $tdata["name"];
            } else {
                $fieldvalue[$templateid] = $tdata["name"];
            }
        }

        return $fieldvalue;
    }

    public function getLanguages()
    {
        global $current_language;
        $langvalue = array();
        $currlang = array();

        $adb = PearDatabase::getInstance();
        $temp_res = $adb->pquery("SELECT label, prefix FROM vtiger_language WHERE active = ?", array('1'));

        while ($temp_row = $adb->fetchByAssoc($temp_res)) {
            $template_languages[$temp_row["prefix"]] = $temp_row["label"];

            if ($temp_row["prefix"] == $current_language) {
                $currlang[$temp_row["prefix"]] = $temp_row["label"];
            } else {
                $langvalue[$temp_row["prefix"]] = $temp_row["label"];
            }
        }
        $langvalue = (array)$currlang + (array)$langvalue;

        return $langvalue;
    }

    public function getModuleFields($sourceModule)
    {
        global $email_maker_dynamic_template_wf;

        if ($email_maker_dynamic_template_wf !== true) {
            $return = false;
        } else {
            require_once 'vtlib/Vtiger/Field.php';
            $moduleModel = Vtiger_Module_Model::getInstance($sourceModule);
            $fields = Vtiger_Field::getAllForModule($moduleModel);
            $fieldsArray = array();

            foreach ($fields as $field) {
                if ($field->displaytype == 1) {
                    $name = $field->name;
                    $label = $field->label;
                    $fieldsArray[$name] = $label;
                }
            }

            $return = $fieldsArray;
        }

        return $return;
    }

    public function getSMTPServers()
    {
        $records = array();

        if (vtlib_isModuleActive('ITS4YouSMTP')) {
            /** @var ITS4YouSMTP_Module_Model $moduleModel */
            $moduleModel = Vtiger_Module_Model::getInstance('ITS4YouSMTP');
            $records = $moduleModel->getRecords();
        }

        return $records;
    }

    public function getSpecialOptions()
    {
        return [
            ',$parent_role_emails' => vtranslate('Parent Role Emails', 'EMAILMaker'),
        ];
    }

    public function retrieveSpecialOptions($entity, $emails)
    {
        if (strpos($emails, 'parent_role_emails')) {
            list($moduleId, $userId) = explode('x', $entity->get('assigned_user_id'));

            $parentEmails = $this->getParentEmails($userId);
            $parentEmailsAddresses = [];

            foreach ($parentEmails as $parentEmail) {
                $parentEmailsAddresses[] = $parentEmail['email'];
            }

            $emails = str_replace('$parent_role_emails', implode(',', $parentEmailsAddresses), $emails);
        }

        return $emails;
    }

    public $userEmails = [];

    public function getParentEmails($userId)
    {
        if (!empty($this->userEmails[$userId])) {
            return $this->userEmails[$userId];
        }

        $userRecordModel = Users_Record_Model::getInstanceById($userId, 'Users');
        $roleId = $userRecordModel->get('roleid');
        $parentRoles = getParentRole($roleId);
        $parentRoleId = $parentRoles[max(array_keys($parentRoles))];
        $parentRoleUsers = getRoleUsers($parentRoleId);
        $this->userEmails[$userId] = [];

        foreach ($parentRoleUsers as $parentRoleUserId => $parentRoleUserName) {
            $this->userEmails[$userId][] = [
                'id' => $parentRoleUserId,
                'module' => 'Users',
                'email' => getUserEmail($parentRoleUserId),
            ];
        }

        return $this->userEmails[$userId];
    }

	/**
	 * @param object $entity
	 * @return null|int
	 * @throws Exception
	 */
	public function getSMTPId($entity)
	{
		if (is_numeric($this->smtp)) {
			return $this->smtp;
		}

		if ($this->smtp !== 'assigned_user_smtp' || !getTabid('ITS4YouSMTP') || !vtlib_isModuleActive('ITS4YouSMTP')) {
			return null;
		}

		$userId= $this->getIdComponents($entity->get('assigned_user_id'))[1];
		$record = ITS4YouSMTP_Record_Model::getInstanceByUserId($userId);

		return $record ? (int)$record->getId() : null;
	}
}