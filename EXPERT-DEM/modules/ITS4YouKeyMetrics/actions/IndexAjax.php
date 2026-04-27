<?php

/*+********************************************************************************
 * The content of this file is subject to the ITS4YouKeyMetrics license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class ITS4YouKeyMetrics_IndexAjax_Action extends Vtiger_Action_Controller
{

    public function __construct()
    {
        parent::__construct();
        $this->exposeMethod('addWidget');
        $this->exposeMethod('getKeyMetricReportColumns');
        $this->exposeMethod('deleteKeyMetricRecord');
        $this->exposeMethod('saveKeyMetricsOrder');
    }

    public function checkPermission(Vtiger_Request $request)
    {
    }

    public function preProcess(Vtiger_Request $request)
    {
        return true;
    }

    public function postProcess(Vtiger_Request $request)
    {
        return true;
    }

    public function process(Vtiger_Request $request)
    {

        $mode = $request->getMode();
        if (!empty($mode)) {
            $this->invokeExposedMethod($mode, $request);
        }
    }

    public function addWidget()
    {
        $success = false;

        global $adb;
        global $current_user;

        $request = new Vtiger_Request($_REQUEST, $_REQUEST);

        $record = $request->get("record");

        if ($record != "") {
            $reportModel = ITS4YouKeyMetrics_Record_Model::getCleanInstance($record);
            $createResult = $reportModel->checkDashboardWidget();
        }

        if ($createResult == "Created") {
            $result = array("success" => false, "message" => vtranslate("LBL_ADD_WIDGET_SUCCESS", "ITS4YouKeyMetrics"));
        } elseif ($createResult == "Exist") {
            $result = array("success" => false, "message" => vtranslate("LBL_ADD_WIDGET_ERROR_EXIST", "ITS4YouKeyMetrics"));
        } else {
            $result = array("success" => false, "message" => vtranslate("LBL_ADD_WIDGET_ERROR", "ITS4YouKeyMetrics"));
        }

        $response = new Vtiger_Response();
        try {
            $response->setResult($result);
        } catch (Exception $e) {
            $response->setError($e->getCode(), $e->getMessage());
        }
        $response->emit();

    }

    // ITS4YOU-CR SlOl 15. 1. 2016 14:25:09 key metrics 
    public function getKeyMetricReportColumns(Vtiger_Request $request)
    {

        $layout = Vtiger_Viewer::getDefaultLayoutName();
        $moduleName = $request->getModule();

        $col_options = "";
        $error = 0;
        $record = $request->get("reportid");
        if ($record != "") {
            $type_checkout = explode("_", $record);
            if (count($type_checkout) > 1) {
                $type_name = $type_checkout[0];
                switch ($type_name) {
                    case "cv":
                        $col_options = "<option value='COUNT' $selected >" . vtranslate("LBL_COUNT", $moduleName) . " " . vtranslate("LBL_OF", $moduleName) . " " . vtranslate("LBL_RECORDS", $moduleName) . "</option>";
                        break;
                }
            } else {
                $col_options = vtranslate("empty");
//                $col_options = ITS4YouKeyMetrics_Record_Model::getKeyMetricsColumnOptions($record);
            }

            if ('v7' === $layout) {
                if ($col_options != 1) {
                    $result = ["success" => true, "data" => $col_options];
                } else {
                    $result = ["success" => false, "message" => vtranslate("LBL_PERM_DENIED", "ITS4YouReports")];
                }
                $response = new Vtiger_Response();
                try {
                    $response->setResult($result);
                } catch (Exception $e) {
                    $response->setError($e->getCode(), $e->getMessage());
                }
                $response->emit();
            } else {
                if ($col_options != 1) {
                    echo "success<#@#>" . $col_options;
                } else {
                    echo "error<#@#>" . vtranslate("LBL_PERM_DENIED", "ITS4YouReports");
                }
            }
        }

    }

    public function deleteKeyMetricRecord(Vtiger_Request $request)
    {
        $error = 0;
        $id = $request->get("id");
        if ($id != "") {
            $adb = PearDatabase::getInstance();
            $row = $adb->fetchByAssoc($adb->pquery("SELECT reportid FROM its4you_keymetrics4you_rows WHERE id=?", array($id)), 0);
            $record = $row["reportid"];
            if ($record != "") {
                $reportModel = ITS4YouKeyMetrics_Record_Model::getInstanceById($record);
                if (isset($reportModel) && !empty($reportModel)) {
                    $adb->pquery("UPDATE its4you_keymetrics4you_rows SET deleted=? WHERE id=?", array(1, $id));
                } else {
                    $error = 1;
                }
            }
        } else {
            $error = 1;
        }

        if ($error != 1) {
            $result = array("success" => true, "message" => vtranslate("LBL_KeyMetricsRow_DELETED", "ITS4YouKeyMetrics"));
        } else {
            $result = array("success" => false, "message" => vtranslate("LBL_PERM_DENIED", "ITS4YouKeyMetrics"));
        }

        $response = new Vtiger_Response();
        try {
            $response->setResult($result);
        } catch (Exception $e) {
            $response->setError($e->getCode(), $e->getMessage());
        }
        $response->emit();
    }

    public function saveKeyMetricsOrder(Vtiger_Request $request)
    {
        $done = 0;
        $picklistValues = $request->get('picklistValues');
        if (!empty($picklistValues)) {
            $adb = PearDatabase::getInstance();
            foreach ($picklistValues as $keyMetricsRowId => $keyMetricsRowSequence) {
                $adb->pquery("UPDATE its4you_keymetrics4you_rows SET sequence=? WHERE id=?", array($keyMetricsRowSequence, $keyMetricsRowId));
            }
            $done = 1;
        }

        if ($done == 1) {
            $result = array("success" => true, "message" => vtranslate("LBL_KeyMetricsRow_SeqDone", "ITS4YouKeyMetrics"));
        } else {
            $result = array("success" => false, "message" => vtranslate("LBL_PERM_DENIED", "ITS4YouKeyMetrics"));
        }

        $response = new Vtiger_Response();
        try {
            $response->setResult($result);
        } catch (Exception $e) {
            $response->setError($e->getCode(), $e->getMessage());
        }
        $response->emit();
    }
    // ITS4YOU-END 15. 1. 2016 14:25:03

}
