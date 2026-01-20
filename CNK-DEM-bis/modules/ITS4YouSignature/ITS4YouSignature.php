<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature extends CRMEntity
{
    public $column_fields;
    public $log;
    public $db;
    public $moduleName = 'ITS4YouSignature';
    public $moduleLabel = 'Signature';
    public $table_name = 'its4you_signature';
    public $table_index = 'signatureid';
    public $entity_table = 'vtiger_crmentity';
    public $parentName = 'Tools';

    /**
     * @var array
     */
    public $customFieldTable = array(
        'its4you_signaturecf',
        'signatureid',
    );

    /**
     * @var array
     */
    public $tab_name = array(
        'vtiger_crmentity',
        'its4you_signature',
        'its4you_signaturecf',
    );

    /**
     * @var array
     */
    public $tab_name_index = array(
        'vtiger_crmentity' => 'crmid',
        'its4you_signature' => 'signatureid',
        'its4you_signaturecf' => 'signatureid',
    );

    /**
     * @var array
     * [Module, RelatedModule, RelatedLabel, RelatedActions, RelatedFunction]
     */
    public $registerRelatedLists = array(
        ['ITS4YouSignature', 'Documents', 'Documents', 'ADD,SELECT', 'get_attachments'],
        ['ITS4YouSignature', 'Contacts', 'Contacts', ''],
        ['ITS4YouSignature', 'Accounts', 'Accounts', ''],
        ['ITS4YouSignature', 'ITS4YouEmails', 'ITS4YouEmails', 'SELECT', 'get_related_list'],
        ['Contacts', 'ITS4YouSignature', 'Signed Signature', 'SELECT'],
        ['Accounts', 'ITS4YouSignature', 'Signed Signature', 'SELECT'],
        ['ITS4YouSignature', 'Emails', 'Emails', 'ADD', 'get_emails'],
    );

    /**
     * @var array
     */
    public $detailViewLinks = [
        [
            'type' => 'DETAILVIEW',
            'label' => 'Send to Signature',
            'url' => 'javascript:ITS4YouSignature_HS.sendToSignature("$RECORD$","$MODULE$")',
        ],
        [
            'type' => 'DETAILVIEW',
            'label' => 'Sign Document',
            'url' => 'javascript:ITS4YouSignature_HS.signDocument("$RECORD$","$MODULE$")',
            'handler' => array(
                'path' => 'modules/ITS4YouSignature/ITS4YouSignature.php',
                'class' => 'ITS4YouSignature',
                'method' => 'hasContactRecord',
            ),
        ],
        [
            'type' => 'DETAILVIEW',
            'label' => 'Accept Signature',
            'url' => 'javascript:ITS4YouSignature_HS.acceptSignature("$RECORD$","$MODULE$")',
            'handler' => array(
                'path' => 'modules/ITS4YouSignature/ITS4YouSignature.php',
                'class' => 'ITS4YouSignature',
                'method' => 'hasAcceptRecord',
            ),
        ],
    ];

    /**
     * @var array
     */
    public $list_fields = array(
        'Signature Name' => array('its4you_signature' => 'signature_name'),
        'Status' => array('its4you_signature' => 'signature_status'),
        'Sent On' => array('its4you_signature' => 'senton'),
        'Assigned To' => array('crmentity' => 'smownerid'),
        'Description' => array('crmentity' => 'description'),
    );

    /**
     * @var array
     */
    public $list_fields_name = array(
        'Signature Name' => 'signature_name',
        'Status' => 'signature_status',
        'Sent On' => 'senton',
        'Assigned To' => 'assigned_user_id',
        'Description' => 'description',
    );

    public $entity_modules = array();
    public $related_tables = [];

    public function __construct()
    {
        global $log;
        $this->column_fields = getColumnFields(get_class($this));
        $this->db = PearDatabase::getInstance();
        $this->log = $log;
    }

    /**
     * @param string $module
     */
    public function save_module($module)
    {
    }

    /**
     * @param string $moduleName
     * @param string $eventType
     * @throws Exception
     */
    public function vtlib_handler($moduleName, $eventType)
    {
        require_once 'include/utils/utils.php';
        require_once 'vtlib/Vtiger/Module.php';
        include_once 'modules/ModComments/ModComments.php';
        include_once 'modules/ModTracker/ModTracker.php';

        $this->retrieveEntityModules();
        $this->retrieveRelatedList();

        switch ($eventType) {
            case 'module.postinstall':
            case 'module.enabled':
            case 'module.postupdate':
                $this->updateWorkflow();
                $this->addCustomLinks();
                break;
            case 'module.preuninstall':
                $this->updateWorkflow(false);
            case 'module.disabled':
            case 'module.preupdate':
                $this->deleteCustomLinks();
                break;
        }
    }

    public function retrieveEntityModules()
    {
        if ($this->entity_modules) {
            return $this->entity_modules;
        }

        $this->entity_modules = Vtiger_Module_Model::getEntityModules();
        $removeModules = [
            'Calendar',
            'Events',
            'ServiceContracts',
            'PBXManager',
            'SMSNotifier',
            'ModComments',
            'ITS4YouImport',
            'ITS4YouItemsBundle',
            'ITS4YouNewsletter',
            'ITS4YouQuickReminder',
            'ITS4YouSignature',
            'ITS4YouStyles',
            'ITS4YouTest',
        ];

        foreach ($this->entity_modules as $entityKey => $entityModule) {
            if (in_array($entityModule->getName(), $removeModules)) {
                unset($this->entity_modules[$entityKey]);
            }
        }
    }

    public function retrieveRelatedList()
    {
        $this->retrieveEntityModules();

        foreach ($this->entity_modules as $module) {
            $this->registerRelatedLists[] = array(
                $module->getName(),
                $this->moduleName,
                $this->moduleName,
                '',
                'get_dependents_list',
            );
        }
    }

    public function updateNumbering()
    {
        $this->setModuleSeqNumber('configure', $this->moduleName, 'SIGN', '0001');
        $this->updateMissingSeqNumber($this->moduleName);
    }

    /**
     * @throws Exception
     */
    public function addCustomLinks()
    {
        $this->updateNumbering();
        $this->updateFile();
        $this->updateTables();
        $this->updateFields();
        $this->updateRelatedList();
        $this->updateCustomLinks();
        $this->updateSettingsLink();
        $this->updateSettings();
        $this->updateFiles('jquery');

        Settings_MenuEditor_Module_Model::addModuleToApp($this->moduleName, $this->parentName);

        ModComments::addWidgetTo([$this->moduleName]);
        ModTracker::enableTrackingForModule(getTabid($this->moduleName));
    }

    public function updateSettings()
    {
        $settingsRecord = Settings_ITS4YouSignature_Record_Model::getInstance();
        $settingsRecord->save();
    }

    public function updateTables()
    {
        $fields = [
            'signature_date' => 'ALTER TABLE its4you_signature ADD signature_date VARCHAR(100) DEFAULT NULL',
            'template_body' => 'ALTER TABLE its4you_signature ADD template_body LONGTEXT DEFAULT NULL',
            'signature_mode' => 'ALTER TABLE its4you_signature ADD signature_mode VARCHAR(100) DEFAULT NULL',
            'accept_email_subject' => 'ALTER TABLE its4you_signature_settings ADD accept_email_subject VARCHAR(200) DEFAULT NULL',
            'accept_email_message' => 'ALTER TABLE its4you_signature_settings ADD accept_email_message TEXT DEFAULT NULL',
        ];

        foreach ($fields as $field => $sql) {
            preg_match('/ALTER\ TABLE\ ([a-z0-9\_]+)\ ADD/', $sql, $matches);

            if (!empty($matches[1]) && !columnExists($field, $matches[1])) {
                $this->db->pquery($sql);
            }
        }

        $this->db->query('ALTER TABLE its4you_signature MODIFY template_body LONGTEXT');
        $this->db->query('ALTER TABLE its4you_signature MODIFY signature_date DATE');
        $this->db->query('ALTER TABLE its4you_signature MODIFY senton DATE');
    }

    public function updateFields()
    {
        $this->db->pquery('DELETE FROM vtiger_field WHERE tablename=? AND fieldname=?',
            array('its4you_signature', 'status')
        );
        $this->db->pquery('UPDATE vtiger_field SET displaytype=? WHERE tablename=? AND fieldname IN(?,?,?,?)',
            array(1, 'its4you_signature', 'signature_date', 'signature_status', 'senton', 'source_record')
        );
        $this->db->pquery('UPDATE vtiger_field SET uitype=? WHERE tablename=? AND fieldname IN(?,?)',
            array(5, 'its4you_signature', 'signature_date', 'senton')
        );

        $module = Vtiger_Module_Model::getInstance($this->moduleName);
        $statusField = Vtiger_Field_Model::getInstance('signature_status', $module);
        $oldValues = array_values(Vtiger_Util_Helper::getPickListValues('signature_status'));
        $newValues = array(
            'Created',
            'Waiting for Others',
            'Waiting for confirmation',
            'Waiting for acceptance',
            'Signed',
        );

        if ($statusField && $oldValues !== $newValues) {
            $this->db->query('TRUNCATE vtiger_signature_status');
            $statusField->setPicklistValues($newValues);
        }

        $sourceField = Vtiger_Field_Model::getInstance('source_record', $module);

        if ($sourceField) {
            $sourceField->set('uitype', 10);
            $sourceField->save();
            $this->db->pquery('DELETE FROM vtiger_fieldmodulerel WHERE fieldid=? AND module=?',
                array($sourceField->getId(), $this->moduleName)
            );

            foreach ($this->entity_modules as $entityModule) {
                $sourceField->setRelatedModules(array($entityModule->getName()));
            }
        }
    }

    /**
     * [module, type, label, url, icon, sequence, handlerInfo]
     * @return array
     */
    public $registerCustomLinks = array(
        ['ITS4YouSignature', 'HEADERSCRIPT', 'ITS4YouSignature_HS', 'layouts/$LAYOUT$/modules/ITS4YouSignature/resources/ITS4YouSignature_HS.js']
    );

    /**
     * @param bool $register
     */
    public function updateCustomLinks($register = true)
    {
        foreach ($this->registerCustomLinks as $customLink) {
            [$moduleName, $type, $label, $url] = $customLink;
            $module = Vtiger_Module::getInstance($moduleName);
            $url = str_replace('$LAYOUT$', Vtiger_Viewer::getDefaultLayoutName(), $url);

            if ($module) {
                $module->deleteLink($type, $label);

                if ($register) {
                    $module->addLink($type, $label, $url, $customLink[4], $customLink[5], $customLink[6]);
                }
            }
        }
    }

    /**
     * @param string $module
     */
    public function updateSignatureLink($module, $register = true)
    {
        global $ITS4YouSignature_ButtonsType;

        $buttonsType = (array)$ITS4YouSignature_ButtonsType;
        $linkModule = Vtiger_Module::getInstance($module);

        if ($linkModule) {
            foreach ($this->detailViewLinks as $link) {
                $type = !empty($buttonsType[$link['label']]) ? $buttonsType[$link['label']] : $link['type'];

                $linkModule->deleteLink($link['type'], $link['label']);
                $linkModule->deleteLink('DETAILVIEWBASIC', $link['label']);

                if ($register) {
                    $linkModule->addLink($type, $link['label'], $link['url'], '', '', $link['handler']);
                }
            }
        }
    }

    public function updateFile()
    {
        $file = 'modules/'.$this->moduleName.'/resources/'.$this->moduleName.'.php';
        $newFile = $this->moduleName.'.php';

        if (!copy($file, $newFile)) {
            $this->log->debug('You should copy '.$this->moduleName.'.php to root');
        }
    }

    /**
     * @throws Exception
     */
    public function deleteCustomLinks()
    {
        $this->updateRelatedList(false);
        $this->updateCustomLinks(false);
        $this->updateSettingsLink(false);

        ModComments::removeWidgetFrom([$this->moduleName]);
        ModTracker::disableTrackingForModule(getTabid($this->moduleName));
    }

    /**
     * @param int $id
     * @param int $cur_tab_id
     * @param int $rel_tab_id
     * @param bool|string $actions
     * @return array|null
     */
    public function get_emails($id, $cur_tab_id, $rel_tab_id, $actions = false)
    {
        global $log, $singlepane_view, $currentModule, $current_user;
        $log->debug("Entering get_emails(" . $id . ") method ...");
        $this_module = $currentModule;
        $related_module = vtlib_getModuleNameById($rel_tab_id);
        require_once("modules/$related_module/$related_module.php");
        $other = new $related_module();
        vtlib_setup_modulevars($related_module, $other);

        if ($singlepane_view == 'true') {
            $returnset = '&return_module=' . $this_module . '&return_action=DetailView&return_id=' . $id;
        } else {
            $returnset = '&return_module=' . $this_module . '&return_action=CallRelatedList&return_id=' . $id;
        }

        $button = '<input type="hidden" name="email_directing_module"><input type="hidden" name="record">';
        $query = 'SELECT vtiger_activity.activityid, 
            vtiger_activity.subject, 
            vtiger_activity.activitytype, 
            vtiger_crmentity.modifiedtime,
            vtiger_crmentity.crmid,
            vtiger_crmentity.smownerid, 
            vtiger_activity.date_start,
            vtiger_activity.time_start, 
            vtiger_seactivityrel.crmid as parent_id,
            CONCAT(vtiger_users.first_name," ",vtiger_users.last_name) as user_name 
        FROM vtiger_activity, 
             vtiger_seactivityrel, 
             vtiger_users, 
             vtiger_crmentity
        LEFT JOIN vtiger_groups on vtiger_groups.groupid=vtiger_crmentity.smownerid 
        LEFT JOIN vtiger_email_track on vtiger_email_track.mailid=vtiger_crmentity.crmid 
        WHERE vtiger_seactivityrel.activityid = vtiger_activity.activityid AND 
              vtiger_users.id=vtiger_crmentity.smownerid AND 
              vtiger_crmentity.crmid = vtiger_activity.activityid AND
              vtiger_activity.activitytype="Emails" AND 
              vtiger_crmentity.deleted = 0 AND 
              vtiger_seactivityrel.activityid IN (SELECT relcrmid FROM vtiger_crmentityrel WHERE crmid="%s" AND module="%s" AND relmodule="Emails" )';
        $query = sprintf($query, $id, $this_module);
        $return_value = GetRelatedList($this_module, $related_module, $other, $query, $button, $returnset);

        if ($return_value == null) {
            $return_value = array();
        }

        $return_value['CUSTOM_BUTTON'] = $button;
        $log->debug("Exiting get_emails method ...");

        return $return_value;
    }

    /**
     * @throws Exception
     */
    public function updateSettingsLink($register = true)
    {
        $description = 'Create new modules...';
        $linkTo = 'index.php?module=' . $this->moduleName . '&parent=Settings&view=List';
        $this->db->pquery('DELETE FROM vtiger_settings_field WHERE name=?', [$this->moduleLabel]);

        if ($register) {
            $fieldId = $this->db->getUniqueID('vtiger_settings_field');
            $blockId = getSettingsBlockId('LBL_OTHER_SETTINGS');
            $seqRes = $this->db->pquery('SELECT max(sequence) AS max_seq FROM vtiger_settings_field WHERE blockid = ?', [$blockId]);
            $seq = intval($this->db->query_result($seqRes, 0, 'max_seq') + 1);
            $this->db->pquery('INSERT INTO vtiger_settings_field(fieldid, blockid, name, iconpath, description, linkto, sequence) VALUES (?,?,?,?,?,?,?)', [$fieldId, $blockId, $this->moduleLabel, '', $description, $linkTo, $seq]);
        }
    }

    /**
     * @param bool $register
     */
    public function updateRelatedList($register = true)
    {
        foreach ($this->registerRelatedLists as $relatedList) {
            $module = Vtiger_Module::getInstance($relatedList[0]);
            $relatedModule = Vtiger_Module::getInstance($relatedList[1]);

            if ($module && $relatedModule) {
                $relatedLabel = isset($relatedList[2]) ? $relatedList[2] : $relatedModule->name;
                $relatedActions = isset($relatedList[3]) ? $relatedList[3] : '';
                $relatedFunction = isset($relatedList[4]) ? $relatedList[4] : 'get_related_list';
                $field = isset($relatedList[5]) ? Vtiger_Field_Model::getInstance($relatedList[5], $relatedModule) : '';
                $fieldId = $field ? $field->getId() : '';

                $module->unsetRelatedList($relatedModule, $relatedLabel);
                $module->unsetRelatedList($relatedModule, $relatedLabel, $relatedFunction);

                if ($register) {
                    $module->setRelatedList($relatedModule, $relatedLabel, $relatedActions, $relatedFunction, $fieldId);
                }
            }
        }
    }

    /**
     * @param Vtiger_LinkData $linkData
     * @return bool
     */
    public static function hasContactRecord($linkData)
    {
        $moduleName = $linkData->getModule();
        $recordId = $linkData->getInputParameter('record');

        return ITS4YouSignature_Module_Model::hasReferenceContactRecord($recordId, $moduleName) || ITS4YouSignature_Module_Model::hasReferenceAccountRecord($recordId, $moduleName);
    }

    public static function hasAcceptRecord($linkData)
    {
        $moduleName = $linkData->getModule();
        $recordId = $linkData->getInputParameter('record');

        return ITS4YouSignature_Module_Model::hasAcceptSignatures($recordId, $moduleName);
    }

    /**
     * @param bool $register
     */
    public function updateWorkflow($register = true)
    {
        vimport('~~modules/com_vtiger_workflow/include.inc');
        vimport('~~modules/com_vtiger_workflow/tasks/VTEntityMethodTask.inc');
        vimport('~~modules/com_vtiger_workflow/VTEntityMethodManager.inc');
        vimport('~~modules/com_vtiger_workflow/VTTaskManager.inc');

        $name = 'VTSignatureTask';
        $label = 'Send to Signature';
        $taskType = array(
            'name' => $name,
            'label' => $label,
            'classname' => $name,
            'classpath' => '',
            'templatepath' => '',
            'modules' => [
                'include' => [],
                'exclude' => []
            ],
            'sourcemodule' => 'ITS4YouSignature'
        );
        $files = array(
            'modules/ITS4YouSignature/workflows/%s.inc' => 'modules/com_vtiger_workflow/tasks/%s.inc',
            'layouts/v7/modules/ITS4YouSignature/workflows/%s.tpl' => 'layouts/v7/modules/Settings/Workflows/Tasks/%s.tpl',
        );

        foreach ($files as $fromFile => $toFile) {
            $fromFile = sprintf($fromFile, $name);
            $toFile = sprintf($toFile, $name);

            if (empty($taskType['classpath'])) {
                $taskType['classpath'] = $toFile;
            } elseif (empty($taskType['templatepath'])) {
                $taskType['templatepath'] = $toFile;
            }

            $copied = copy($fromFile, $toFile);
        }

        $this->db->pquery('DELETE FROM com_vtiger_workflow_tasktypes WHERE tasktypename=?',
            array($name)
        );

        if ($copied && $register) {
            VTTaskType::registerTaskType($taskType);
        }
    }

    /**
     * @return array
     */
    public function getRequirementValidations()
    {
        return [
            [
                'type' => 'workflow',
                'label' => vtranslate('LBL_WORKFLOWS', $this->moduleName),
                'function' => 'getRequirementWorkflows',
            ],
            [
                'type' => 'modules',
                'label' => vtranslate('LBL_WORKFLOWS', $this->moduleName),
                'function' => 'getRequirementModules',
            ],
        ];
    }

    /**
     * @param string $name
     * @return array
     */
    public function getRequirementHeaders($name)
    {
        switch ($name) {
            case 'workflow':
                return [
                    vtranslate('LBL_NAME', $this->moduleName) => 'name',
                    vtranslate('LBL_FILE', $this->moduleName) => 'file',
                ];
            case 'modules':
                return [
                    vtranslate('LBL_NAME', $this->moduleName) => 'name',
                ];
        }

        return [];
    }

    public function getRequirementModules()
    {
        $info = array();
        $modules = array(
            'Documents',
            'Contacts',
            'Accounts',
            'PDFMaker',
        );

        foreach ($modules as $value) {
            $validate = vtlib_isModuleActive($value);
            $data = array(
                'name' => $value,
                'validate' => $validate,
                'validate_message' => $validate ? vtranslate('LBL_ACTIVE_MODULE', $this->moduleName) : vtranslate('LBL_INACTIVE_MODULE', $this->moduleName),
            );

            $info[] = $data;
        }

        return $info;
    }

    /**
     * @return array
     */
    public function getRequirementWorkflows()
    {
        $info = array();
        $files = array(
            'modules/com_vtiger_workflow/tasks/VTSignatureTask.inc',
            'layouts/v7/modules/Settings/Workflows/Tasks/VTSignatureTask.tpl',
        );

        foreach ($files as $value) {
            $validate = file_exists($value);
            $data = array(
                'name' => 'VTSignatureTask',
                'file' => $value,
                'validate' => file_exists($value),
                'validate_message' => $validate ? '' : vtranslate('LBL_MISSING_WORKFLOW_FILE', $this->moduleName),
            );

            $info[] = $data;
        }

        return $info;
    }



    /**
     * @param $fileName
     */
    public function updateFiles($fileName)
    {
        $srcZip = 'https://www.its4you.sk/en/images/extensions/' . $this->moduleName . '/src/' . $fileName . '.zip';
        $trgZip = 'modules/ITS4YouLibrary/' . $fileName . '.zip';

        mkdir(getcwd() . '/modules/ITS4YouLibrary');

        if (copy($srcZip, $trgZip)) {
            if (is_file($trgZip)) {
                require_once('vtlib/thirdparty/dUnzip2.inc.php');

                $unzip = new dUnzip2($trgZip);
                $unzip->unzipAll(getcwd() . '/modules/ITS4YouLibrary/');
                $unzip->close();

                unlink($trgZip);
            }
        }
    }
}