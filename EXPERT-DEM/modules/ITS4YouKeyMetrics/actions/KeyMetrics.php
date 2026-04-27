<?php

/*+********************************************************************************
 * The content of this file is subject to the ITS4YouKeyMetrics license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class ITS4YouKeyMetrics_KeyMetrics_Action extends Vtiger_Action_Controller
{

    public function __construct()
    {
        parent::__construct();
        $this->exposeMethod('addwidget');
        $this->exposeMethod('addkeymetricsrow');
    }

    public static function getKeyMetricsCustomViewResult($cv_id = "")
    {
        $adb = PearDatabase::getInstance();
        $params = array('All');
        $cv_sql = "";

        $cv_sql = " vtiger_customview.cvid=? ";
        $params[] = $cv_id;
        $cvResult = $adb->pquery("SELECT vtiger_customview.*, vtiger_users.first_name,vtiger_users.last_name 
                                    FROM vtiger_customview 
                                    INNER JOIN vtiger_tab ON vtiger_tab.name = vtiger_customview.entitytype 
                                    LEFT join vtiger_users ON vtiger_customview.userid = vtiger_users.id 
                                    WHERE viewname != ? AND ($cv_sql)", $params);
        return $cvResult;
    }

    public function checkPermission(Vtiger_Request $request)
    {
        /*
        $moduleName = $request->getModule();
        $moduleModel = ITS4YouKeyMetrics_Module_Model::getInstance($moduleName);

        $currentUserPriviligesModel = Users_Privileges_Model::getCurrentUserPrivilegesModel();
        if(!$currentUserPriviligesModel->hasModulePermission($moduleModel->getId())) {
            throw new AppException('LBL_PERMISSION_DENIED');
        }
        */
    }

    public function process(Vtiger_Request $request)
    {
        $mode = $request->get('mode');
        if (!empty($mode)) {
            $this->invokeExposedMethod($mode, $request);
            return;
        }
    }

    /**
     * Function that saves/updates the KeyMetrics
     * @param Vtiger_Request $request
     */
    public function addwidget(Vtiger_Request $request)
    {
        $moduleName = $request->getModule();
        $KeyMetricsModel = ITS4YouKeyMetrics_KeyMetrics_Model::getInstance();
        $KeyMetricsId = $request->get('id');

        if (!empty($KeyMetricsId)) {
            $KeyMetricsModel->set('id', $KeyMetricsId);
        }

        $KeyMetricsModel->set('name', $request->get('name'));

        if ($KeyMetricsModel->checkDuplicate()) {
            throw new AppException(vtranslate('LBL_DUPLICATES_WIDGET_EXIST', $moduleName));
        }

        $KeyMetricsModel->save();
        $result = array('success' => true, 'message' => vtranslate('LBL_KeyMetrics_SAVED', $moduleName), 'info' => $KeyMetricsModel->getInfoArray());

        $response = new Vtiger_Response();
        $response->setResult($result);
        $response->emit();
    }

    public function validateRequest(Vtiger_Request $request)
    {
        $request->validateWriteAccess();
    }

    public function addkeymetricsrow(Vtiger_Request $request)
    {
        $moduleName = $request->getModule();

        $km_id = $request->get('km_id');
        $id = $request->get('id');
        $reportid = $request->get('reportid');

        // $updatemode ~ create / edit
        $updatemode = $request->get('updatemode');

        $label = $request->get("label");
        $calculation_type = $request->get("calculation_type");
        $column_str = $request->get("column_str");

        if ($updatemode != "" && $id != "") {
            // id - autointeger - key metric row id
            // km_id - key metric key
            // label - key metric row label
            // reportid - id of report
            // calculation_type - report column calculation type
            // column_str - report column
            // sequence - set max sequence
            // deleted - default value is 0
            $info = vtranslate("LBL_ADD_KEYMETRICSROW_SUCCESS", $moduleName);
        } else {
            $info = vtranslate("LBL_ADD_KEYMETRICSROW_ERROR", $moduleName);
        }
        $result = array('success' => true, 'message' => vtranslate('LBL_KeyMetricsRow_SAVED', $moduleName), 'info' => $info);

        $response = new Vtiger_Response();
        $response->setResult($result);
        $response->emit();
    }

}