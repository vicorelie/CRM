<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

require_once 'modules/com_vtiger_workflow/include.inc';
require_once 'modules/com_vtiger_workflow/expression_engine/VTExpressionsManager.inc';

class Settings_ITS4YouProcessFlow_Module_Model extends Settings_Vtiger_Module_Model
{

    static public $metaVariables = array(
        'Current Date' => '(general : (__VtigerMeta__) date) ($_DATE_FORMAT_)',
        'Current Time' => '(general : (__VtigerMeta__) time)',
        'System Timezone' => '(general : (__VtigerMeta__) dbtimezone)',
        'User Timezone' => '(general : (__VtigerMeta__) usertimezone)',
        'CRM Detail View URL' => '(general : (__VtigerMeta__) crmdetailviewurl)',
        'Portal Detail View URL' => '(general : (__VtigerMeta__) portaldetailviewurl)',
        'Site Url' => '(general : (__VtigerMeta__) siteurl)',
        'Portal Url' => '(general : (__VtigerMeta__) portalurl)',
        'Record Id' => '(general : (__VtigerMeta__) recordId)',
        'LBL_HELPDESK_SUPPORT_NAME' => '(general : (__VtigerMeta__) supportName)',
        'LBL_HELPDESK_SUPPORT_EMAILID' => '(general : (__VtigerMeta__) supportEmailid)',
    );
    static public $triggerTypes = array(
        1 => 'ON_FIRST_SAVE',
        2 => 'ONCE',
        3 => 'ON_EVERY_SAVE',
        4 => 'ON_MODIFY',
        // Reserving 5 & 6 for ON_DELETE and ON_SCHEDULED types.
        6 => 'ON_SCHEDULE'
    );
//	var $listFields = array('summary' => 'Summary', 'module_name' => 'Module', 'execution_condition' => 'Execution Condition');
    public $baseTable = 'its4you_processflow';
    public $baseIndex = 'pfid';
    public $listFields = array('module_name' => 'Module', 'pfname' => 'Name', 'description' => 'Description', 'conditions' => 'Conditions');
    public $name = 'ITS4YouProcessFlow';

    public static function getInstance()
    {
        return new self();
    }

    public static function getDefaultUrl()
    {
        return "index.php?module=ITS4YouProcessFlow&parent=Settings&view=List";
    }

    public static function getCreateViewUrl()
    {
        return "javascript:Settings_ITS4YouProcessFlow_List_Js.triggerCreate('index.php?module=ITS4YouProcessFlow&parent=Settings&view=Edit')";
    }

    public static function getCreateRecordUrl()
    {
        return 'index.php?module=ITS4YouProcessFlow&parent=Settings&view=Edit';
    }

    public static function getRelatedActionStatusChangeUrl($PFData)
    {
        return 'index.php?module=ITS4YouProcessFlow&parent=Settings&action=RelationAjax&mode=statusChange&pf_record=' . $PFData["pfid"] . '&action_record=' . $PFData["id"];
    }

    public static function getRelatedActionDeleteUrl($PFData)
    {
        return 'index.php?module=ITS4YouProcessFlow&parent=Settings&action=RelationAjax&mode=deleteRelation&pf_record=' . $PFData["pfid"] . '&action_record=' . $PFData["id"];
    }

    /**
     * @param array $PFData
     * @return string
     */
    public static function getRelatedActionEditUrl($PFData)
    {
        return 'index.php?module=' . $PFData['parent_module'] . '&parent=Settings&view=Edit&record=' . $PFData['parent_id'];
    }

    public static function getSupportedModules()
    {
        $moduleModels = Vtiger_Module_Model::getAll(array(0, 2));
        $supportedModuleModels = array();
        foreach ($moduleModels as $tabId => $moduleModel) {
            if ($moduleModel->isWorkflowSupported() && $moduleModel->getName() != 'Webmails') {
                $supportedModuleModels[$tabId] = $moduleModel;
            }
        }
        return $supportedModuleModels;
    }

    public static function getTriggerTypes()
    {
        return self::$triggerTypes;
    }

    public static function getExpressions()
    {
        $db = PearDatabase::getInstance();

        $mem = new VTExpressionsManager($db);
        return $mem->expressionFunctions();
    }

    public static function getMetaVariables()
    {
        return self::$metaVariables;
    }

    /**
     * Function to get the count of active workflows
     * @return <Integer> count of active workflows
     */
    public static function getActiveProcessFlowCount($moduleCount = false)
    {
        $db = PearDatabase::getInstance();

        $query = 'SELECT count(*) AS count, vtiger_tab.tabid FROM its4you_processflow 
				  INNER JOIN vtiger_tab ON vtiger_tab.name = its4you_processflow.module_name 
				  AND vtiger_tab.presence IN (0,2) WHERE its4you_processflow.deleted = ? AND (parent_id = ? OR parent_id IS NULL) ';

        if ($moduleCount) {
            $query .= ' GROUP BY its4you_processflow.module_name';
        }

        $result = $db->pquery($query, array(0, 0));
        $count = 0;
        $wfModulesCount = array();
        $noOfRows = $db->num_rows($result);
        for ($i = 0; $i < $noOfRows; ++$i) {
            $row = $db->query_result_rowdata($result, $i);
            $count = $count + $row['count'];
            $wfModulesCount[$row['tabid']] = $row['count'];
        }

        if ($moduleCount) {
            $wfModulesCount['All'] = $count;
            return $wfModulesCount;
        } else {
            return $count;
        }

    }

    public static function getActionsLinks(Vtiger_Request $request, $recordModel)
    {
        $links = array();

        $moduleModels = Vtiger_Module_Model::getAll(array(0, 2));

        foreach ($moduleModels as $tabId => $moduleModel) {

            $class_name = $moduleModel->getName() . "_Module_Model";

            if (method_exists($class_name, 'getProcessFlowActions')) {
                $recordLinks = $moduleModel->getProcessFlowActions($request, $recordModel);
                foreach ($recordLinks as $recordLink) {
                    $links[] = Vtiger_Link_Model::getInstanceFromValues($recordLink);
                }
            }
        }
        return $links;
    }

    public function getListFields()
    {
        if (!$this->listFieldModels) {
            $fields = $this->listFields;
            $fieldObjects = array();
            foreach ($fields as $fieldName => $fieldLabel) {
                if ($fieldName == 'module_name') {
                    $fieldObjects[$fieldName] = new Vtiger_Base_Model(array('name' => $fieldName, 'label' => $fieldLabel, 'sort' => false));
                } else {
                    $fieldObjects[$fieldName] = new Vtiger_Base_Model(array('name' => $fieldName, 'label' => $fieldLabel));
                }
            }
            $this->listFieldModels = $fieldObjects;
        }
        return $this->listFieldModels;
    }

    public function getFields()
    {
        return array();
    }

    public function getModuleBasicLinks()
    {
        return array();
    }

    /**
     * Function to get Settings links
     * @return <Array>
     */
    public function getSettingLinks()
    {

        $settingsLinks = array();
        $currentUserModel = Users_Record_Model::getCurrentUserModel();
        if ($currentUserModel->isAdminUser()) {

            $settingsLinks[] = array(
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => vtranslate('LBL_UPGRADE', 'Settings:ITS4YouProcessFlow'),
                'linkurl' => 'javascript:window.location="index.php?module=ModuleManager&parent=Settings&view=ModuleImport&mode=importUserModuleStep1"',
                'linkicon' => ''
            );

            $settingsLinks[] = array(
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => vtranslate('LBL_UNINSTALL', 'Settings:ITS4YouProcessFlow'),
                'linkurl' => 'javascript:window.location="index.php?module=ITS4YouProcessFlow&view=Uninstall&parent=Settings"',
                'linkicon' => ''
            );
        }
        return $settingsLinks;
    }

    public function getSiteRoad(Vtiger_Request $request)
    {
        $new = false;
        $siteRoad = "<a href=\"" . $this->getListViewUrl() . "\">";
        $siteRoad .= vtranslate($this->getName(), $this->getName());
        $siteRoad .= "</a>";

        $recordId = $request->get('record');
        if (empty($recordId)) {
            if ($request->has('parentId') && !$request->isEmpty('parentId')) {
                $recordId = $request->get('parentId');
            }
            $new = true;
        }

        if ($recordId) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($recordId);
        } elseif ($request->has('sourceModule') && !$request->isEmpty('sourceModule')) {
            $sourceModule = $request->get('sourceModule');
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getDefaultInstance($sourceModule);
        }

        if ($recordModel) {
            $siteRoad .= $recordModel->getSiteRoad(false);
        }

        if ($new) {
            $siteRoad .= "&nbsp;</span><span class=\"fa fa-angle-right pull-left current-filter-name filter-name\" aria-hidden=\"true\"></span>";
            $siteRoad .= "<span class=\"current-filter-name filter-name pull-left\">&nbsp;";
            $siteRoad .= vtranslate('LBL_ADDING_NEW', $this->getName());
        }

        return $siteRoad;
    }

    public function getListViewUrl()
    {
        return "index.php?module=ITS4YouProcessFlow&parent=Settings&view=List";
    }

}
