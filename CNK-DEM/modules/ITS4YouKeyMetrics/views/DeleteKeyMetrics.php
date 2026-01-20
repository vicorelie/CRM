<?php

/*+********************************************************************************
 * The content of this file is subject to the Key Metrics 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class ITS4YouKeyMetrics_DeleteKeyMetrics_View extends Vtiger_IndexAjax_View
{

    public function checkPermission(Vtiger_Request $request)
    {
    }

    public function process(Vtiger_Request $request)
    {
        $moduleName = $request->getModule();
        $KeyMetricsId = $request->get('id');
        if ($KeyMetricsId != "") {
            $KeyMetricsModel = ITS4YouKeyMetrics_KeyMetrics_Model::getInstanceById($KeyMetricsId);

            $KeyMetricsModel->delete();

            $result = array('success' => true, 'message' => vtranslate('LBL_KeyMetrics_DELETED', $moduleName), 'info' => array());
            $response = new Vtiger_Response();
            $response->setResult($result);
            $response->emit();
        }
    }
}