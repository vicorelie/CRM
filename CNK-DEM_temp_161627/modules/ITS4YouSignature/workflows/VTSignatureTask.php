<?php

/* +**********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 * ********************************************************************************** */

require_once 'modules/com_vtiger_workflow/VTEntityCache.inc';
require_once 'modules/com_vtiger_workflow/VTWorkflowUtils.php';
require_once 'modules/com_vtiger_workflow/VTSimpleTemplate.inc';
require_once 'modules/PDFMaker/PDFMaker.php';
require_once 'modules/PDFMaker/resources/mpdf/mpdf.php';

class VTSignatureTask extends VTTask
{
    const SOURCE_MODULE_FIELD = 'source_module_field';
    const MODULE_NAME = 'ITS4YouSignature';
    public $sourceModule;
    public $executeImmediately = true;
    public $title;
    public $email_subject;
    public $email_message;
    public $template;
    public $template_language;
    public $signatureSettings;
    public $contact_relation;
    public $contact_field;
    public $email_template;
    /**
     * @var ITS4YouSignature_Module_Model
     */
    public $signatureModel;
    /**
     * @var Vtiger_Module_Model
     */
    public $sourceModel;
    public $sourceRecord;
    /**
     * @var VTWorkflowEntity
     */
    public $entityData;
    public $sourceId;
    public $recipientId;
    public $recipientModule;
    public $recipientRecord;
    public $recipientEmail;
    /**
     * @var ITS4YouSignature_Record_Model
     */
    public $signatureRecord;
    public $signatureId;
    public $signatureModule = 'ITS4YouSignature';
    /**
     * @var string
     */
    public $email_body;

    public function getFieldNames()
    {
        return [
            'title',
            'template',
            'template_language',
            'contact_relation',
            'contact_field',
            'email_template',
        ];
    }

    public function getRecipientModules()
    {
        return [
            'Accounts',
            'Contacts',
        ];
    }

    /**
     * @param int $record
     * @return false|Vtiger_Record_Model
     */
    public function getRecordModel($record)
    {
        if (!empty($record) && isRecordExists($record)) {
            return Vtiger_Record_Model::getInstanceById($record);
        }

        return false;
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getRecipientRelations()
    {
        $sourceModel = $this->getSourceModel();
        $fields = $sourceModel->getFieldsByType('reference');
        $values = [];

        if (in_array($sourceModel->getName(), $this->getRecipientModules())) {
            $values[self::SOURCE_MODULE_FIELD] = vtranslate('LBL_SOURCE_MODULE', self::MODULE_NAME);
        }

        /** @var Vtiger_Field_Model $field */
        foreach ($fields as $field) {
            if (!empty(array_intersect($this->getRecipientModules(), $field->getReferenceList()))) {
                $values[$field->get('name')] = vtranslate($field->get('label'), $field->getModuleName());
            }
        }

        return $values;
    }

    /**
     * @return Vtiger_Module_Model
     */
    public function getSourceModel()
    {
        if (!$this->sourceModel) {
            $this->retrieveSourceModel();
        }

        return $this->sourceModel;
    }

    public function retrieveSourceModel()
    {
        $this->sourceModel = Vtiger_Module_Model::getInstance($this->getSourceModule());
    }

    public function getSourceModule()
    {
        return $this->sourceModule;
    }

    public function setSourceModule($value)
    {
        $this->sourceModule = $value;
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getRecipientFields()
    {
        $values = [];
        $recipientModules = $this->getRecipientModules();

        foreach ($recipientModules as $recipientModule) {
            $moduleModel = Vtiger_Module_Model::getInstance($recipientModule);
            $fieldModels = $moduleModel->getFieldsByType('email');

            /** @var Vtiger_Field_Model $field */
            foreach ($fieldModels as $fieldModel) {
                $values[$fieldModel->get('name')] = sprintf(
                    '%s: %s',
                    vtranslate($recipientModule, $recipientModule),
                    vtranslate($fieldModel->get('label'), $recipientModule)
                );
            }
        }

        return $values;
    }

    /**
     * @param string|int $value
     * @return int
     */
    public function getRecordFromRelation($value)
    {
        if (is_numeric($value)) {
            return intval($value);
        }

        return intval(explode('x', $value)[1]);
    }

    /**
     * @throws Exception
     */
    public function getTemplates($selectedModule)
    {
        $signatureModel = $this->getSignatureModel();
        $templates = $signatureModel->getTemplates($selectedModule);
        $values = [];

        foreach ($templates as $templateId => $templateModel) {
            $values[$templateId] = $templateModel->getName();
        }

        return $values;
    }

    public function getSignatureModel()
    {
        if (!$this->signatureModel) {
            $this->retrieveSignatureModel();
        }

        return $this->signatureModel;
    }

    public function retrieveSignatureModel()
    {
        $this->signatureModel = Vtiger_Module_Model::getInstance(self::MODULE_NAME);
    }

    public function getSettingsValue($name)
    {
        $value = $this->$name;

        if (empty($value)) {
            return $this->getSettings()->get($name);
        }

        return $value;
    }

    public function getSettings()
    {
        if (!$this->signatureSettings) {
            $this->retrieveSettings();
        }

        return $this->signatureSettings;
    }

    public function retrieveSettings()
    {
        $this->signatureSettings = Settings_ITS4YouSignature_Record_Model::getInstance();
    }

    public function getLanguages()
    {
        $languages = [];
        $adb = PearDatabase::getInstance();
        $result = $adb->query('SELECT label, prefix FROM vtiger_language WHERE active=1');

        while ($row = $adb->fetchByAssoc($result)) {
            $languages[$row['prefix']] = $row['label'];
        }

        return $languages;
    }

    /**
     * @param VTWorkflowEntity $entityData
     * @return string
     * @throws Exception
     */
    public function doTask($entityData)
    {
        /** Required include before PDFMaker on multiple simple_html_dom*/
        include_once 'modules/Emails/models/Mailer.php';

        $this->entityData = $entityData;
        $this->retrieveSourceRecord();
        $this->retrieveRecipientRecord();

        if (empty($this->recipientRecord) || !in_array($this->recipientModule, $this->getRecipientModules())) {
            return 'Invalid recipient module or missing record';
        }

        if (empty($this->recipientEmail) || !filter_var($this->recipientEmail, FILTER_VALIDATE_EMAIL)) {
            return 'Invalid email format';
        }

        $this->retrieveEmailMessage();
        $this->retrieveEmailMaker();
        $this->retrieveSignatureRecord();

        if (empty($this->signatureId)) {
            return 'Signature not created';
        }

        if (!$this->saveRelations()) {
            return 'Relation not saved';
        }

        if (!$this->saveTemplate()) {
            return 'Template not saved';
        }

        if (!$this->sendEmail()) {
            return 'Email not sent';
        }

        if (!$this->saveSentOn()) {
            return 'Status and Sent On not updated';
        }

        return 'Success';
    }

    public function retrieveSourceRecord()
    {
        $this->sourceModule = $this->entityData->getModuleName();
        $this->sourceId = $this->getSourceFromRelation();
        $this->sourceRecord = Vtiger_Record_Model::getInstanceById($this->sourceId, $this->sourceModule);
    }

    public function getSourceFromRelation()
    {
        list($sourceModuleId, $sourceRecordId) = explode('x', $this->entityData->getId());

        return $sourceRecordId;
    }

    public function retrieveRecipientRecord()
    {
        $this->recipientId = $this->isSourceRecipient() ? $this->sourceId : $this->sourceRecord->get($this->getContactRelation());

        if (!empty($this->recipientId)) {
            $this->recipientModule = getSalesEntityType($this->recipientId);
        }

        if (!empty($this->recipientModule)) {
            $this->recipientRecord = Vtiger_Record_Model::getInstanceById($this->recipientId, $this->recipientModule);
            $this->recipientEmail = $this->recipientRecord->get($this->contact_field);
        }
    }

    public function isSourceRecipient()
    {
        return self::SOURCE_MODULE_FIELD === $this->getContactRelation();
    }

    public function getContactRelation()
    {
        return $this->contact_relation;
    }

    public function retrieveEmailMessage()
    {
        $this->email_message = $this->getSettingsValue('email_message');
    }

    public function retrieveSignatureRecord()
    {
        /** @var ITS4YouSignature_Record_Model $recordModel */
        $recordModel = ITS4YouSignature_Record_Model::getCleanInstance($this->signatureModule);
        $recordModel->set('assigned_user_id', $this->getAssignedUserId());
        $recordModel->set('signature_name', $this->email_subject);
        $recordModel->set('signature_status', 'Created');
        $recordModel->save();

        $this->signatureRecord = $recordModel;
        $this->signatureId = $recordModel->getId();
    }

    public function getAssignedUserId()
    {
        return (int)$this->sourceRecord->get('assigned_user_id');
    }

    public function saveRelations()
    {
        $this->signatureRecord->setRelation($this->recipientId, $this->recipientModule);

        return true;
    }

    public function saveTemplate()
    {
        $this->signatureRecord->set('templateId', $this->template);
        $this->signatureRecord->set('templateLanguage', $this->template_language);
        $this->signatureRecord->set('sourceRecord', $this->sourceId);
        $this->signatureRecord->set('sourceModule', $this->sourceModule);

        return $this->signatureRecord->saveTemplate();
    }

    /**
     * @throws Exception
     */
    public function sendEmail()
    {
        if (!empty($this->email_body)) {
            $this->signatureRecord->set('emailBody', $this->email_body);
        }

        $this->signatureRecord->set('emailSubject', $this->email_subject);
        $this->signatureRecord->set('recipientId', $this->recipientId);
        $this->signatureRecord->set('recipientEmail', $this->recipientEmail);
        $this->signatureRecord->set('emailMessage', $this->email_message);

        return $this->signatureRecord->sendSignEmail();
    }

    /**
     * @throws Exception
     */
    public function getEmailSubject()
    {
        return $this->sourceRecord->getName();
    }

    public function saveSentOn()
    {
        $this->signatureRecord->saveSentOn();

        return true;
    }

    /**
     * @return string
     * @throws Exception
     */
    public function getSourceRecordNumber()
    {
        return $this->sourceRecord->get($this->signatureRecord->getNumberField($this->sourceModule));
    }

    /**
     * @throws Exception
     */
    public function retrieveEmailMaker()
    {
        $this->email_subject = $this->getEmailSubject();

        if (vtlib_isModuleActive('EMAILMaker') && !empty($this->email_template)) {
            $contentModel = EMAILMaker_EMAILContent_Model::getInstanceById($this->email_template, $this->template_language, $this->sourceModule, $this->sourceId);
            $contentModel->getContent();

            $emailBody = $contentModel->getBody();
            $emailSubject = $contentModel->getSubject();

            if (!empty($emailBody)) {
                $this->email_body = $emailBody;
            }

            if (!empty($emailSubject)) {
                $this->email_subject = $emailSubject;
            }
        }
    }

    /**
     * @param string $selectedModule
     * @return array
     */
    public function getEmailTemplates($selectedModule)
    {
        $templates = [
            '' => vtranslate('LBL_DEFAULT_TEMPLATE', self::MODULE_NAME),
        ];

        if (!vtlib_isModuleActive('EMAILMaker')) {
            return $templates;
        }

        $request = new Vtiger_Request([], []);
        $EMAILMaker = new EMAILMaker_EMAILMaker_Model();
        $templatesData = $EMAILMaker->GetListviewData('templateid', 'asc', $selectedModule, false, $request);

        foreach ($templatesData as $data) {
            $templates[$data['templateid']] = $data['name'];
        }

        return $templates;
    }
}