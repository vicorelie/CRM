<?php

/* +********************************************************************************
 * The content of this file is subject to the ITS4YouKeyMetrics license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouKeyMetrics_Record_Model extends Vtiger_Record_Model
{

    /**
     * Static Function to get the instance of the Vtiger Record Model given the recordid and the module name
     * @param <Number> $recordId
     * @param <String> $moduleName
     * @return Vtiger_Record_Model or Module Specific Record Model instance
     */
    public static function getInstanceById($recordId, $module = null)
    {
        $moduleName = "ITS4YouKeyMetrics";
        $focus = CRMEntity::getInstance($moduleName);
        $focus->id = $recordId;
        $modelClassName = Vtiger_Loader::getComponentClassName('Model', 'Record', $moduleName);
        $instance = new $modelClassName();
        return $instance->setData($focus->column_fields)->set('id', $recordId)->setModuleFromInstance($module)->setEntity($focus);
    }

    public static function getKeyMetricsColumnOptions($record)
    {
        $request = new Vtiger_Request($_REQUEST, $_REQUEST);

        $currentModuleName = "ITS4YouKeyMetrics";
        $return = 1;
        $col_options = $column_str_val = "";
        if ($record != "") {

            if ($request->get("view") == "EditKeyMetricsRow" && $request->has("id") && !$request->isEmpty("id")) {
                $adb = PearDatabase::getInstance();
                $editResult = $adb->pquery("SELECT metrics_type, column_str FROM its4you_keymetrics4you_rows WHERE id=?", array($request->get("id")));
                if ($adb->num_rows($editResult) > 0) {
                    $row = $adb->fetchByAssoc($editResult, 0);
                    $column_str_val = $row["column_str"];
                    $metrics_type = $row["metrics_type"];
                }
            }

            if ($metrics_type == "customview") {
                $col_options .= "<optgroup label='" . vtranslate("LBL_COUNT", $currentModuleName) . "'>";
                $col_options .= "<option value='COUNT' selected='selected' >" . vtranslate("LBL_COUNT", $currentModuleName) . " " . vtranslate("LBL_OF", $currentModuleName) . " " . vtranslate("LBL_RECORDS", $currentModuleName) . "</option>";
                $col_options .= "</optgroup>";
                $return = $col_options;
            } else {

            }
        }
        return $return;
    }

    /**
     * Function to check if homepage widget exist
     * @return true/false
     */
    public function checkDashboardWidget($mode = "create")
    {
        global $current_user;
        global $adb;
        $request = new Vtiger_Request($_REQUEST, $_REQUEST);

        $return = "Exist";

        $widgetUrl = $this->getDashboardWidgetUrl();

        $homeTabId = getTabid("Home");
        $sql = "SELECT linkid FROM vtiger_links WHERE tabid = ? AND linktype =? AND linkurl LIKE ? AND linklabel=?";
        $linkidResult = $adb->pquery($sql, array($homeTabId, 'DASHBOARDWIDGET', $widgetUrl . $request->get('name')));

        $linkidNumrows = $adb->num_rows($linkidResult);
        if ($linkidNumrows > 0) {
            $row = $adb->fetchByAssoc($linkidResult);
            $linkid = $row['linkid'];
        } else {
            require_once('vtlib/Vtiger/Module.php');
            $link_module = Vtiger_Module::getInstance('Home');
            $link_module->addLink('DASHBOARDWIDGET', 'WIDGETLABEL', $widgetUrl);
        }

        $sql = "SELECT linkid FROM vtiger_module_dashboard_widgets WHERE userid = ? and linkid = ?";
        $result = $adb->pquery($sql, array($current_user->id, $linkid));

        $numrows = $adb->num_rows($result);
        if ($numrows < 1) {
            if ($mode != "check") {
                $this->addDashboardWidget($linkid);
            }
            $return = "Created";
        }
        return $return;
    }

    /**
     * Function to get the dashboard widget url
     * @return <String>
     */
    public function getDashboardWidgetUrl()
    {
        return 'index.php?module=ITS4YouKeyMetrics&view=ShowWidget&name=GetReports&record=' . $this->getId();
    }

    /**
     * Function to get the id of the Report
     * @return <Number> - Report Id
     */
    public function getId()
    {
        $request = new Vtiger_Request($_REQUEST, $_REQUEST);
        $record = $request->get("record");
        $this->setId($record);

        return $record;
    }

    /**
     * Function to set the id of the Report
     * @param <type> $value - id value
     * @return <Object> - current instance
     */
    public function setId($value)
    {
        if (isset($this->report->record)) {
            $this->report->record = $value;
        }
        $this->set('reportid', $value);
        return true;
        // return $this->set('reportid', $value);
    }

    /**
     * Function to ADD homepage widget
     * @return true/false
     */
    public function addDashboardWidget($linkid)
    {
        global $current_user;
        global $adb;

        $widgetPosition = '{"row":"1","col":"1"}';

        $params = array($linkid, $current_user->id);

        $sql = "INSERT INTO vtiger_module_dashboard_widgets (linkid,userid,position) VALUES (?,?,'$widgetPosition')";
        $return = $adb->pquery($sql, $params);

        return $return;
    }

}
