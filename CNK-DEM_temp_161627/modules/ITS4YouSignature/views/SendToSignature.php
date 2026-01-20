<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_SendToSignature_View extends Vtiger_Index_View
{
    public function checkPermission(Vtiger_Request $request)
    {
        if (!class_exists('PDFMaker_Signatures_Model')) {
            throw new AppException(vtranslate('LBL_UPDATE_PDF_MAKER', 'ITS4YouSignature'));
        }

        return parent::checkPermission($request);
    }

    /**
     * @param Vtiger_Request $request
     * @throws AppException
     */
    public function process(Vtiger_Request $request)
    {
        $viewer = $this->getViewer($request);
        $qualifiedModule = $request->getModule(false);
        $module = $request->getModule();
        $mode = $request->getMode();
        $sourceRecord = $request->get('sourceRecord');
        $sourceModule = $request->get('sourceModule');

        $viewer->assign('MODULE', $module);
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModule);
        $viewer->assign('SOURCE_MODULE', $sourceModule);
        $viewer->assign('SOURCE_RECORD', $sourceRecord);
        $viewer->assign('SOURCE_RECORD_MODEL', Vtiger_Record_Model::getInstanceById($sourceRecord, $sourceModule));
        $viewer->assign('SETTINGS_RECORD_MODEL', Settings_Vtiger_Record_Model::getInstance('Settings:ITS4YouSignature'));
        $viewer->assign('HEADER_TITLE', vtranslate('LBL_SEND_TO_SIGNATURE', $module));
        $viewer->assign('PREV_MODE', $request->get('currentMode'));
        $viewer->assign('CURRENT_MODE', $mode);

        if ($mode && method_exists($this, $mode)) {
            $viewer->assign('MODE_TEMPLATE', $mode . '.tpl');
            $this->$mode($request, $viewer);
        } else {
            throw new AppException('Undefined or Unsupported mode');
        }

        $viewer->assign('REQUEST', $request);
        $viewer->view('SendToSignature.tpl', $qualifiedModule);
    }

    public function EditPDF(Vtiger_Request $request, Vtiger_Viewer $viewer)
    {
        $sourceRecord = $request->get('sourceRecord');
        $sourceModule = $request->get('sourceModule');
        $templateId = $request->get('templateId');
        $templateLanguage = $request->get('templateLanguage');

        $focus = CRMEntity::getInstance($sourceModule);
        $focus->retrieve_entity_info($sourceRecord, $sourceModule);

        vglobal(ITS4YouSignature_Record_Model::HTML_VARIABLE, ITS4YouSignature_Record_Model::LABEL_VARIABLE);
        vglobal(ITS4YouSignature_Record_Model::CONFIRM_VARIABLE, 3);

        $PDFContent = PDFMaker_PDFContent_Model::getInstance($templateId, $sourceModule, $focus, $templateLanguage);
        $content = $PDFContent->getContent();

        $viewer->assign('TEMPLATE_BODY', $content['body']);

        $hasAccountRecord = ITS4YouSignature_Module_Model::hasReferenceAccountRecord($sourceRecord, $sourceModule);
        $hasContactRecord = ITS4YouSignature_Module_Model::hasReferenceContactRecord($sourceRecord, $sourceModule);
        $isRequiredSelectRecipient = $hasAccountRecord && $hasContactRecord;

        $viewer->assign('IS_REQUIRED_SELECT_RECIPIENT', $isRequiredSelectRecipient);
    }

    /**
     * @param Vtiger_Request $request
     * @param Vtiger_Viewer $viewer
     */
    public function SelectRecipient(Vtiger_Request $request, Vtiger_Viewer $viewer)
    {
        $sourceModule = $request->get('sourceModule');
        $sourceRecord = $request->get('sourceRecord');
        $sourceModel = Vtiger_Module_Model::getInstance($sourceModule);
        $sourceRecordModel = Vtiger_Record_Model::getInstanceById($sourceRecord);
        /** @var ITS4YouSignature_Module_Model $signatureModel */
        $signatureModel = Vtiger_Module_Model::getInstance('ITS4YouSignature');

        if ($sourceModel && $sourceRecordModel) {
            $contactGroups = [];
            $referenceFields = $sourceModel->getFieldsByType(['reference']);

            if ('Contacts' === $sourceModule) {
                $contactGroups[vtranslate($sourceModule, $sourceModule)][$sourceRecord] = $sourceRecordModel;
            }

            if ('Accounts' === $sourceModule) {
                $contactGroups[vtranslate($sourceModule, $sourceModule)][$sourceRecord] = $sourceRecordModel;
                $contacts = $signatureModel->getContactsFromAccount($sourceRecord);

                if (!empty($contacts)) {
                    $contactGroups[vtranslate($sourceModule, $sourceModule)] = $contacts;
                }
            }

            foreach ($referenceFields as $referenceFieldName => $referenceField) {
                $referenceModules = $referenceField->getReferenceList();
                $fieldLabel = vtranslate($referenceField->get('label'), $sourceModule);

                if (in_array('Contacts', $referenceModules)) {
                    $contactId = (int)$sourceRecordModel->get($referenceFieldName);

                    if ($contactId) {
                        $contactRecord = Vtiger_Record_Model::getInstanceById($contactId, 'Contacts');

                        if ($contactRecord) {
                            $contactGroups[$fieldLabel][$contactId] = $contactRecord;
                        }
                    }
                }

                if (in_array('Accounts', $referenceModules)) {
                    $accountId = (int)$sourceRecordModel->get($referenceFieldName);

                    if ($accountId) {
                        $contacts = $signatureModel->getContactsFromAccount($accountId);
                        $contactGroups[$fieldLabel][$accountId] = Vtiger_Record_Model::getInstanceById($accountId, 'Accounts');

                        if (!empty($contacts)) {
                            $contactGroups[$fieldLabel . ' - ' . vtranslate('Contacts', 'Contacts')] = $contacts;
                        }
                    }
                }
            }

            if (!empty($contactGroups)) {
                $contactEmails = [];
                /** @var  Vtiger_Record_Model $contactRecordModel */

                foreach ($contactGroups as $contacts) {
                    foreach ($contacts as $contactId => $contactRecordModel) {
                        foreach ($contactRecordModel->getModule()->getFieldsByType(['email']) as $emailFieldName => $emailField) {
                            $email = (string)$contactRecordModel->get($emailFieldName);

                            if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                                $contactEmails[$contactId][$email] = vtranslate($emailField->get('label'), 'Contacts') . ' - ' . $email;
                            }
                        }
                    }
                }

                $viewer->assign('CONTACT_EMAILS', json_encode($contactEmails));
                $viewer->assign('CONTACT_GROUPS', $contactGroups);
            }
        }
    }

    public function SignSelectRecipient(Vtiger_Request $request, Vtiger_Viewer $viewer) {

    }

    public function AcceptRecords(Vtiger_Request $request, Vtiger_Viewer $viewer)
    {
        $sourceModule = $request->get('sourceRecord');

        $viewer->assign('ACCEPT_RECORDS', ITS4YouSignature_Module_Model::getAcceptSignatures($sourceModule));
        $viewer->assign('HEADER_TITLE', vtranslate('LBL_SIGNATURES_FOR_ACCEPTANCE', $request->getModule()));
    }

    /**
     * @param Vtiger_Request $request
     * @param Vtiger_Viewer $viewer
     * @throws Exception
     */
    public function SelectPDF(Vtiger_Request $request, Vtiger_Viewer $viewer)
    {
        /**
         * @var $moduleModel ITS4YouSignature_Module_Model
         */
        $moduleModel = Vtiger_Module_Model::getInstance($request->getModule());
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $templates = $moduleModel->getTemplates($request->get('sourceModule'), $request->get('sourceRecord'));

        $viewer->assign('LANGUAGES', $moduleModel->getLanguages());
        $viewer->assign('SELECTED_LANGUAGE', $currentUser->get('language'));
        $viewer->assign('TEMPLATES', $templates);
        $viewer->assign('DISABLE_EXPORT_EDIT', $templates ? reset($templates)->get('disable_export_edit') : false);
    }

    /**
     * @param Vtiger_Request $request
     * @param Vtiger_Viewer $viewer
     */
    public function selectEmail(Vtiger_Request $request, Vtiger_Viewer $viewer)
    {
        if ((int)$request->get('recipientId')) {
            $contactRecord = Vtiger_Record_Model::getInstanceById($request->get('recipientId'));

            if ($contactRecord && $request->isEmpty('recipientName')) {
                $request->set('recipientName', $contactRecord->getName());
            }
        }
    }

    /**
     * @param Vtiger_Request $request
     * @param Vtiger_Viewer $viewer
     */
    public function PreviewPDF(Vtiger_Request $request, Vtiger_Viewer $viewer)
    {
        $previewUrl = 'index.php?module=PDFMaker&action=IndexAjax&mode=getPreviewContent&forview=Detail' .
            '&source_module=' . $request->get('sourceModule') .
            '&record=' . $request->get('sourceRecord') .
            '&pdftemplateid=' . $request->get('templateId') .
            '&language=' . $request->get('templateLanguage');

        $viewer->assign('PREVIEW_URL', $previewUrl);
    }

    /**
     * @throws Exception
     */
    public function SignSelectPDF(Vtiger_Request $request, Vtiger_Viewer $viewer)
    {
        /**
         * @var $moduleModel ITS4YouSignature_Module_Model
         */
        $moduleModel = Vtiger_Module_Model::getInstance($request->getModule());
        $currentUser = Users_Record_Model::getCurrentUserModel();

        $sourceModule = $request->get('sourceModule');
        $sourceRecord = $request->get('sourceRecord');
        $sourceRecordModel = Vtiger_Record_Model::getInstanceById($sourceRecord);
        $hasAccountRecord = ITS4YouSignature_Module_Model::hasReferenceAccountRecord($sourceRecord, $sourceModule);
        $hasContactRecord = ITS4YouSignature_Module_Model::hasReferenceContactRecord($sourceRecord, $sourceModule);
        $isRequiredSelectRecipient = $hasAccountRecord && $hasContactRecord;

        if (!$isRequiredSelectRecipient) {
            $request->set('recipientModule', $hasAccountRecord ? 'Accounts' : 'Contacts');
        }

        $request->set('recipientId', $moduleModel::getReferenceContactRecord($sourceRecord, $sourceModule));
        $request->set('emailSubject', $sourceRecordModel->getName());

        $viewer->assign('MODE', $request->getMode());
        $viewer->assign('LANGUAGES', $moduleModel->getLanguages());
        $viewer->assign('SELECTED_LANGUAGE', $currentUser->get('language'));
        $viewer->assign('TEMPLATES', $moduleModel->getTemplates($sourceModule, $sourceRecord));
        $viewer->assign('HEADER_TITLE', vtranslate('LBL_SIGN_DOCUMENT', $request->getModule()));
        $viewer->assign('IS_REQUIRED_SELECT_RECIPIENT', $isRequiredSelectRecipient);
    }
}