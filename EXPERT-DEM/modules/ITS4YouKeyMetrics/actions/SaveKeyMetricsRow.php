<?php

/*+********************************************************************************
 * The content of this file is subject to the ITS4YouKeyMetrics license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class ITS4YouKeyMetrics_SaveKeyMetricsRow_Action extends Vtiger_Action_Controller
{

    public function checkPermission(Vtiger_Request $request)
    {
    }

    public function process(Vtiger_Request $request)
    {

        $adb = PearDatabase::getInstance();
        $layout = Vtiger_Viewer::getDefaultLayoutName();

        $moduleName = $request->getModule();
        $requestAll = $request->getAll();

        $mode = $requestAll['mode'];

        $record = $requestAll["id"];
        $km_id = $requestAll["km_id"];
        $label = $requestAll["label"];
        $reportid = $requestAll["reportname"];
        $column_str = $requestAll["column_str"];

        if ('delete' === $mode) {
            $adb->pquery('DELETE FROM its4you_keymetrics4you_rows WHERE id=?', $record);
            $resultMsg = 'LBL_DELETED';
        } else {
            $metrics_type = "report";
            $type_checkout = explode("_", $reportid);
            if (count($type_checkout) > 1) {
                $type_name = $type_checkout[0];
                switch ($type_name) {
                    case "cv":
                        $metrics_type = "customview";
                        $reportid = $type_checkout[1];
                        break;
                }
            }

            if ($record != "") {
                $params = array($km_id, $label, $reportid, $metrics_type, $column_str, $record);
                $adb->pquery("UPDATE its4you_keymetrics4you_rows SET km_id=?, label=?, reportid=?, metrics_type=?, column_str=? WHERE id=?", $params);
            } else {
                $row = $adb->fetchByAssoc($adb->pquery("SELECT max(sequence) as sequence FROM its4you_keymetrics4you_rows WHERE km_id=?", array($km_id)), 0);
                $sequence = $row["sequence"] + 1;
                $currentUser = Users_Record_Model::getCurrentUserModel();
                $params = array($km_id, $currentUser->id, $label, $reportid, $metrics_type, $column_str, $sequence);
                $adb->pquery("INSERT INTO its4you_keymetrics4you_rows (km_id, smcreatorid, label, reportid, metrics_type, column_str, sequence) VALUES(?, ?, ?, ?, ?, ?, ?)", $params);
            }
            $resultMsg = 'LBL_SAVED_SUCCESSFULLY';
        }
        if ('v7' === $layout) {
            $result = array("success" => true, "message" => vtranslate($resultMsg, $moduleName));
            $response = new Vtiger_Response();
            try {
                $response->setResult($result);
            } catch (Exception $e) {
                $response->setError($e->getCode(), $e->getMessage());
            }
            $response->emit();
        } else {
            header("location: index.php?module=ITS4YouKeyMetrics&view=KeyMetricsRows&id=$km_id");
        }
    }
}
