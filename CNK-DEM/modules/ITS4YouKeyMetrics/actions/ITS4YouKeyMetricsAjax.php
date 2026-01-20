<?php

/*+********************************************************************************
 * The content of this file is subject to the Key Metrics 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class ITS4YouKeyMetrics_ITS4YouKeyMetricsAjax_Action extends Vtiger_Mass_Action
{

    public function __construct()
    {
        parent::__construct();
        $this->exposeMethod('restoreRecords');
        $this->exposeMethod('emptyITS4YouKeyMetrics');
        $this->exposeMethod('deleteRecords');
    }

    public function checkPermission(Vtiger_Request $request)
    {
        if ($request->get('mode') == 'emptyITS4YouKeyMetrics') {
            //we dont check for permissions since recylebin axis will be there for all users with their views only
            return true;
        }
        $targetModuleName = $request->get('sourceModule', $request->get('module'));
        $moduleModel = Vtiger_Module_Model::getInstance($targetModuleName);

        $currentUserPriviligesModel = Users_Privileges_Model::getCurrentUserPrivilegesModel();
        if (!$currentUserPriviligesModel->hasModuleActionPermission($moduleModel->getId(), 'Delete')) {
            throw new AppException(getTranslatedString('LBL_PERMISSION_DENIED'));
        }
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
        $mode = $request->get('mode');

        if (!empty($mode)) {
            $this->invokeExposedMethod($mode, $request);
            return;
        }
    }

    /**
     * Function to restore the deleted records.
     * @param Vtiger_Request $request
     */
    public function restoreRecords(Vtiger_Request $request)
    {
        $sourceModule = $request->get('sourceModule');
        $recordIds = $this->getRecordsListFromRequest($request);
        $ITS4YouKeyMetricsModule = new ITS4YouKeyMetrics_Module_Model();

        $response = new Vtiger_Response();
        if ($recordIds) {
            $ITS4YouKeyMetricsModule->restore($sourceModule, $recordIds);
            $response->setResult(array(true));
        }

        $response->emit();

    }

    /**
     * Function to delete the records permanently in vitger CRM database
     */
    public function emptyITS4YouKeyMetrics(Vtiger_Request $request)
    {
        $ITS4YouKeyMetricsModule = new ITS4YouKeyMetrics_Module_Model();

        $status = $ITS4YouKeyMetricsModule->emptyITS4YouKeyMetrics();

        if ($status) {
            $response = new Vtiger_Response();
            $response->setResult(array($status));
            $response->emit();
        }
    }

    /**
     * Function to deleted the records permanently in CRM
     * @param type $reocrdIds
     */
    public function deleteRecords(Vtiger_Request $request)
    {
        $recordIds = $this->getRecordsListFromRequest($request);
        $ITS4YouKeyMetricsModule = new ITS4YouKeyMetrics_Module_Model();

        $response = new Vtiger_Response();
        if ($recordIds) {
            $ITS4YouKeyMetricsModule->deleteRecords($recordIds);
            $response->setResult(array(true));
            $response->emit();
        }
    }

}
