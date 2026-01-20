<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

require_once 'modules/Webforms/model/WebformsModel.php';
require_once 'include/Webservices/DescribeObject.php';

class ITS4YouProcessFlow
{
    /**
     * [module, type, label, url, icon, sequence, handlerInfo]
     * @return array
     */
    public $registerCustomLinks = array(
        ['ITS4YouProcessFlow', 'HEADERSCRIPT', 'ITS4YouProcessFlowActionsJS', 'layouts/v7/modules/ITS4YouProcessFlow/resources/processflow_actions.js']
    );

    protected static $moduleDescribeCache = array();
    // Cache to speed up describe information store
    public $LBL_MODULE_NAME = 'Process Flow';

    public function __construct()
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
    public function vtlib_handler($moduleName, $eventType)
    {
        switch ($eventType) {
            case 'module.postinstall':
            case 'module.enabled':
            case 'module.postupdate':
                $this->addCustomLinks();
                break;
            case 'module.disabled':
            case 'module.preuninstall':
            case 'module.preupdate':
                $this->deleteCustomLinks();
                break;
        }
    }

    public function addCustomLinks() {
        $this->updateCustomLinks();
        $this->updateSettings();
        $this->updateTables();
        $this->updateFields();
    }

    public function updateFields()
    {
        $this->db->pquery('UPDATE its4you_processflowrel SET method_name=? WHERE method_name IS NULL OR method_name LIKE ?', ['getProcessFlowActionData', '']);
    }

    public function updateTables()
    {
        $fields = [
            'method_name' => "ALTER TABLE its4you_processflowrel ADD method_name VARCHAR(200) NULL DEFAULT 'getProcessFlowActionData'",
        ];

        foreach ($fields as $field => $sql) {
            preg_match('/ALTER\ TABLE\ ([a-z0-9\_]+)\ ADD/', $sql, $matches);

            if ($matches[1] && !columnExists($field, $matches[1])) {
                $this->db->pquery($sql);
            }
        }
    }

    public function deleteCustomLinks() {
        $this->updateCustomLinks(false);
        $this->db->pquery('DELETE FROM vtiger_settings_field WHERE name=?', array($this->LBL_MODULE_NAME));
    }

    /**
     * @param bool $register
     */
    public function updateCustomLinks($register = true)
    {
        foreach ($this->registerCustomLinks as $customLink) {
            $module = Vtiger_Module::getInstance($customLink[0]);
            $type = $customLink[1];
            $label = $customLink[2];

            if($module) {
                $module->deleteLink($type, $label);

                if($register) {
                    $module->addLink($type, $label, $customLink[3], $customLink[4], $customLink[5], $customLink[6]);
                }
            }
        }
    }

    public function updateSettings()
    {
        $image = '';
        $description = '';
        $linkto = 'index.php?module=ITS4YouProcessFlow&parent=Settings&view=List';
        $result2 = $this->db->pquery('SELECT 1 FROM vtiger_settings_field WHERE name=?', array($this->LBL_MODULE_NAME));

        if (!$this->db->num_rows($result2)) {

            $fieldid = $this->db->getUniqueID('vtiger_settings_field');
            $blockid = getSettingsBlockId('LBL_OTHER_SETTINGS');
            $seq_res = $this->db->pquery("SELECT max(sequence) AS max_seq FROM vtiger_settings_field WHERE blockid = ?", array($blockid));
            if ($this->db->num_rows($seq_res) > 0) {
                $cur_seq = $this->db->query_result($seq_res, 0, 'max_seq');
                if ($cur_seq != null) {
                    $seq = $cur_seq + 1;
                }
            }

            $this->db->pquery('INSERT INTO vtiger_settings_field(fieldid, blockid, name, iconpath, description, linkto, sequence) VALUES (?,?,?,?,?,?,?)', array($fieldid, $blockid, $this->LBL_MODULE_NAME, $image, $description, $linkto, $seq));
        }
    }

    public function retrieve_entity_info()
    {
    }
}
