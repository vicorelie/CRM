<?php

/*+********************************************************************************
 * The content of this file is subject to the ITS4YouKeyMetrics license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class ITS4YouKeyMetrics_EditKeyMetrics_View extends Vtiger_IndexAjax_View
{

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

        $viewer = $this->getViewer($request);
        $moduleName = $request->getModule();
        $KeyMetricsId = $request->get('id');

        if ($KeyMetricsId) {
            $KeyMetricsModel = ITS4YouKeyMetrics_KeyMetrics_Model::getInstanceById($KeyMetricsId);
        } else {
            $KeyMetricsModel = ITS4YouKeyMetrics_KeyMetrics_Model::getInstance();
        }

        $viewer->assign('METRICS_MODEL', $KeyMetricsModel);
        $viewer->assign('MODULE', $moduleName);
        $viewer->view('EditKeyMetrics.tpl', $moduleName);
    }
}