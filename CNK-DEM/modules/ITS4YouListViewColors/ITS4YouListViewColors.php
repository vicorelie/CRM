<?php
/* * *******************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

require_once 'modules/Webforms/model/WebformsModel.php';
require_once 'include/Webservices/DescribeObject.php';

class ITS4YouListViewColors
{
    public $LBL_MODULE_NAME = 'ListView Colors 4 You';
    public $moduleInstance;
    public $moduleName = 'ITS4YouListViewColors';
    public $db;
    public $log;
    protected static $moduleDescribeCache = array();

    function __construct()
    {
        global $log, $currentModule;

        $this->db = PearDatabase::getInstance();
        $this->log = $log;
    }

    /**
     * Invoked when special actions are performed on the module.
     * @param String Module name
     * @param String Event Type
     */
    function vtlib_handler($moduleName, $eventType)
    {
        $this->moduleInstance = Vtiger_Module::getInstance($this->moduleName);

        switch ($eventType) {
            case 'module.postupdate':
            case 'module.enabled':
            case 'module.postinstall':
                $this->addCustomLinks();
                break;
            case 'module.preupdate':
            case 'module.disabled':
                $this->deleteCustomLinks();
                break;
            case 'module.preuninstall':
                $this->deleteCustomLinks();
                $this->deleteProcessFlowRelations();
                break;
        }
    }

    public function deleteProcessFlowRelations()
    {
        $this->db->pquery(
            'DELETE FROM its4you_processflowrel WHERE parent_module=?',
            array($this->moduleName)
        );
    }

    public function addCustomLinks()
    {
        $this->updateSettings();
        $this->updateCustomLinks();
        $this->updateTables();
    }

    public function updateTables()
    {
        $fields = [
            'field_name' => 'ALTER TABLE its4you_lvc ADD field_name VARCHAR(200) NULL',
            'record_status' => 'ALTER TABLE its4you_lvc ADD record_status VARCHAR(1) NULL',
            'record_colors' => 'ALTER TABLE its4you_lvc ADD record_colors VARCHAR(200) NULL',
        ];

        foreach ($fields as $field => $sql) {
            preg_match('/ALTER\ TABLE\ ([a-z0-9\_]+)\ ADD/', $sql, $matches);

            if ($matches[1] && !columnExists($field, $matches[1])) {
                $this->db->pquery($sql);
            }
        }
    }

    public $registerCustomLinks = array(
        ['ITS4YouListViewColors', 'HEADERSCRIPT', 'ITS4YouListViewColorsPFActionsJS', 'layouts/$LAYOUT$/modules/ITS4YouListViewColors/resources/PFActions.js'],
    );

    /**
     * @param bool $register
     */
    public function updateCustomLinks($register = true)
    {
        foreach ($this->registerCustomLinks as $customLink) {
            $module = Vtiger_Module::getInstance($customLink[0]);
            $type = $customLink[1];
            $label = $customLink[2];
            $url = str_replace('$LAYOUT$', Vtiger_Viewer::getDefaultLayoutName(), $customLink[3]);

            if ($module) {
                $module->deleteLink($type, $label);

                if ($register) {
                    $module->addLink($type, $label, $url, $customLink[4], $customLink[5], $customLink[6]);
                }
            }
        }
    }

    public function updateSettings($register = true)
    {
        $image = '';
        $description = '';
        $linkTo = 'index.php?module=ITS4YouListViewColors&parent=Settings&view=List';
        $result2 = $this->db->pquery('SELECT 1 FROM vtiger_settings_field WHERE name=?', array($this->LBL_MODULE_NAME));
        $active = $register ? 0 : 1;

        if (!$this->db->num_rows($result2)) {
            $fieldId = $this->db->getUniqueID('vtiger_settings_field');
            $blockId = getSettingsBlockId('LBL_OTHER_SETTINGS');
            $seq_res = $this->db->pquery('SELECT max(sequence) AS max_seq FROM vtiger_settings_field WHERE blockid = ?', array($blockId));

            if ($this->db->num_rows($seq_res) > 0) {
                $cur_seq = $this->db->query_result($seq_res, 0, 'max_seq');

                if ($cur_seq != null) {
                    $seq = $cur_seq + 1;
                }
            }

            $this->db->pquery(
                'INSERT INTO vtiger_settings_field (fieldid,blockid,name,iconpath,description,linkto,sequence) VALUES (?,?,?,?,?,?,?)',
                array($fieldId, $blockId, $this->LBL_MODULE_NAME, $image, $description, $linkTo, $seq)
            );
        }

        $this->db->pquery('UPDATE vtiger_settings_field SET active=? WHERE name=?', array($active, $this->LBL_MODULE_NAME));
    }

    public function deleteCustomLinks()
    {
        $this->updateSettings(false);
        $this->updateCustomLinks(false);
    }
}
