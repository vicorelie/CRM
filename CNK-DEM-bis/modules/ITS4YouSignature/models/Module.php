<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_Module_Model extends Vtiger_Module_Model
{
    public static $mobileIcon = 'file-document-edit';
    /**
     * @var array
     */
    public $licensePermissions = [];
    /**
     * @var string
     */
    protected $folderName = 'ITS4YouSignature';

    public static function getAcceptSignatures($record)
    {
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $recordModel = Vtiger_Record_Model::getInstanceById($record);
        $signatureModel = Vtiger_Module_Model::getInstance('ITS4YouSignature');
        $signatures = [];

        if ($recordModel) {
            /** @var Vtiger_Relation_Model $relationModel */
            $relationModel = Vtiger_Relation_Model::getInstance($recordModel->getModule(), $signatureModel);
            $query = $relationModel->getQuery($recordModel);
            $adb = PearDatabase::getInstance();
            $result = $adb->pquery($query);

            while ($row = $adb->fetchByAssoc($result)) {
                $signatureId = $row['crmid'];
                /** @var ITS4YouSignature_Record_Model $signatureRecord */
                $signatureRecord = Vtiger_Record_Model::getInstanceById($signatureId);

                if (class_exists('ITS4YouSignature_AcceptSignaturesRule_Helper')) {
                    if ($signatureRecord && 'Waiting for acceptance' === $signatureRecord->get('signature_status') && ITS4YouSignature_AcceptSignaturesRule_Helper::isPermitted($signatureRecord->getId())) {
                        $signatures[$signatureId] = $signatureRecord;
                    }
                } elseif ($signatureRecord && 'Waiting for acceptance' === $signatureRecord->get('signature_status') && (int)$currentUser->getId() === $signatureRecord->getAcceptanceUserId()) {
                    $signatures[$signatureId] = $signatureRecord;
                }
            }
        }

        return $signatures;
    }

    /**
     * @param int $record
     * @return array
     */
    public function getContactsFromAccount($record)
    {
        if (!vtlib_isModuleActive('Contacts')) {
            return [];
        }

        $accountRecordModel = Vtiger_Record_Model::getInstanceById($record, 'Accounts');
        $contactModel = Vtiger_Module_Model::getInstance('Contacts');
        $contacts = [];

        if ($accountRecordModel) {
            $relationModel = Vtiger_Relation_Model::getInstance($accountRecordModel->getModule(), $contactModel);
            $query = $relationModel->getQuery($accountRecordModel);
            $adb = PearDatabase::getInstance();
            $result = $adb->pquery($query);

            while ($row = $adb->fetchByAssoc($result)) {
                $contactId = $row['crmid'];
                $contactRecord = Vtiger_Record_Model::getInstanceById($contactId, 'Contacts');

                if ($contactRecord) {
                    $contacts[$contactId] = $contactRecord;
                }
            }
        }

        return $contacts;
    }

    /**
     * @return array
     */
    public function getDatabaseTables()
    {
        return [
            'its4you_signature',
            'its4you_signaturecf',
            'its4you_signature_settings',
        ];
    }

    /**
     * @return bool|Documents_Folder_Model
     * @throws Exception
     */
    public function getDocumentFolder()
    {
        $folderName = $this->getFolderName();
        $folder = ITS4YouSignature_Folder_Model::getInstanceByName($folderName);

        if (!$folder) {
            $folder = Documents_Folder_Model::getInstance();
            $folder->set('foldername', $folderName);
            $folder->set('mode', '');
            $folder->set('description', 'Signature folder');
            $folder->save();
        }

        return $folder;
    }

    /**
     * @param Vtiger_Record_Model $record
     */
    public static function getEmailFromRecord($record)
    {
        $emailFields = $record->getModule()->getFieldsByType(['email']);

        foreach ($emailFields as $emailFieldName => $emailField) {
            $email = $record->get($emailFieldName);

            if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $email;
            }
        }

        return '';
    }

    public function getFolderName()
    {
        global $signature_folder;

        if (!empty($signature_folder)) {
            $this->folderName = $signature_folder;
        }

        return $this->folderName;
    }

    /**
     * @return array
     */
    public function getLanguages()
    {
        if (!isset($_SESSION['template_languages']) || empty($_SESSION['template_languages'])) {
            $languages = [];
            $adb = PearDatabase::getInstance();
            $result = $adb->pquery('SELECT label, prefix FROM vtiger_language WHERE active = ?', ['1']);

            while ($row = $adb->fetchByAssoc($result)) {
                $languages[$row['prefix']] = $row['label'];
            }

            $_SESSION['template_languages'] = $languages;
        }

        return $_SESSION['template_languages'];
    }

    /**
     * @param string $type
     * @return bool|mixed
     */
    public function getLicensePermissions($type = 'List')
    {
        if (empty($this->name)) {
            $this->name = explode('_', get_class($this))[0];
        }
        $installer = 'ITS4YouInstaller';
        $licenseMode = 'Settings_ITS4YouInstaller_License_Model';

        if (vtlib_isModuleActive($installer)) {
            if (class_exists($licenseMode)) {
                $permission = new $licenseMode();
                $result = $permission->permission($this->name, $type);

                $this->licensePermissions['info'] = $result['errors'];
                $this->licensePermissions['version_type'] = $result['type'];

                return $result['success'];
            } else {
                $this->licensePermissions['errors'] = 'LBL_INSTALLER_UPDATE';
            }
        } else {
            $this->licensePermissions['errors'] = 'LBL_INSTALLER_NOT_ACTIVE';
        }

        return false;
    }

    public function getPicklistFields()
    {
        return [
            'signature_status',
            'signature_mode',
        ];
    }

    public static function getReferenceAccountRecord($record, $module)
    {
        if ('Accounts' === $module) {
            return $record;
        }

        $recordModel = Vtiger_Record_Model::getInstanceById($record, $module);

        if ($recordModel) {
            $fields = $recordModel->getModule()->getFieldsByType('reference');
            /** @var Vtiger_Field_Model $field */

            foreach ($fields as $field) {
                $recordId = $recordModel->get($field->getName());

                if (in_array('Accounts', $field->getReferenceList()) && 'Accounts' === getSalesEntityType($recordId)) {
                    return intval($recordId);
                }
            }
        }

        return false;
    }

    /**
     * @param $record
     * @param $module
     * @return int|false
     */
    public static function getReferenceContactRecord($record, $module)
    {
        if ('Contacts' === $module) {
            return $record;
        }

        $recordModel = Vtiger_Record_Model::getInstanceById($record, $module);

        if ($recordModel) {
            $fields = $recordModel->getModule()->getFieldsByType('reference');
            /** @var Vtiger_Field_Model $field */

            foreach ($fields as $field) {
                $recordId = $recordModel->get($field->getName());

                if (in_array('Contacts', $field->getReferenceList()) && 'Contacts' === getSalesEntityType($recordId)) {
                    return intval($recordId);
                }
            }
        }

        return false;
    }

    public function getSettingLinks()
    {
        $currentUserModel = Users_Record_Model::getCurrentUserModel();
        $moduleName = $this->getName();
        $settingsLinks = parent::getSettingLinks();

        if ($currentUserModel->isAdminUser()) {
            $settingsLinks[] = [
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => 'LBL_INTEGRATION',
                'linkurl' => 'index.php?parent=Settings&module=' . $moduleName . '&view=List',
            ];
            $settingsLinks[] = [
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => 'LBL_MODULE_REQUIREMENTS',
                'linkurl' => 'index.php?module=ITS4YouInstaller&parent=Settings&view=Requirements&mode=Module&sourceModule=ITS4YouSignature',
            ];
            $settingsLinks[] = [
                "linktype" => "LISTVIEWSETTING",
                "linklabel" => "LBL_LICENSE",
                "linkurl" => 'index.php?module=ITS4YouInstaller&view=License&parent=Settings&sourceModule=ITS4YouSignature',

            ];
            $settingsLinks[] = [
                "linktype" => "LISTVIEWSETTING",
                "linklabel" => "LBL_UPGRADE",
                "linkurl" => "index.php?module=ModuleManager&parent=Settings&view=ModuleImport&mode=importUserModuleStep1",
            ];
            $settingsLinks[] = [
                "linktype" => "LISTVIEWSETTING",
                "linklabel" => "LBL_UNINSTALL",
                "linkurl" => 'index.php?module=ITS4YouInstaller&view=Uninstall&parent=Settings&sourceModule=ITS4YouSignature',
            ];
        }

        return $settingsLinks;
    }

    /**
     * @return string
     */
    public static function getSiteUrl()
    {
        $site_URL = vglobal('site_URL');
        $site_URL .= ('/' !== substr($site_URL, -1)) ? '/' : '';

        return $site_URL;
    }

    /**
     * @param string $module
     * @param bool|int $record
     * @return array
     * @throws Exception
     */
    public function getTemplates($module, $record = false)
    {
        /** @var $pdfMakerModel PDFMaker_Module_Model */
        $pdfMakerModel = Vtiger_Module_Model::getInstance('PDFMaker');
        $signTemplates = [];

        if ($pdfMakerModel) {
            $templates = $pdfMakerModel->GetAvailableTemplates($module, false, $record);

            foreach ($templates as $templateId => $templateData) {
                $template = PDFMaker_Record_Model::getInstanceById($templateId);

                if (1 === (int)$template->get('is_signature')) {
                    $signTemplates[$templateId] = $template;
                }
            }
        }

        return $signTemplates;
    }

    public static function hasAcceptSignatures($record, $module)
    {
        return !empty(self::getAcceptSignatures($record));
    }

    public static function hasReferenceAccountRecord($record, $module)
    {
        return !empty(ITS4YouSignature_Module_Model::getReferenceAccountRecord($record, $module));
    }

    public static function hasReferenceContactRecord($record, $module)
    {
        return !empty(ITS4YouSignature_Module_Model::getReferenceContactRecord($record, $module));
    }

    /**
     * @param string $moduleName
     * @throws Exception
     */
    public function updateLinks($moduleName)
    {
        /** @var $focus ITS4YouSignature */
        $focus = CRMEntity::getInstance($this->getName());
        $focus->updateSignatureLink($moduleName, !empty($this->getTemplates($moduleName)));
    }
}