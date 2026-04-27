<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_RelationAjax_Action extends Settings_Vtiger_Index_Action
{
    public function __construct()
    {
        parent::__construct();
        $this->exposeMethod('addRelation');
        $this->exposeMethod('deleteRelation');
        $this->exposeMethod('statusChange');
    }

    public function checkPermission(Vtiger_Request $request)
    {
    }

    public function preProcess(Vtiger_Request $request, $display = true)
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

    public function addRelation($request)
    {

        $sourceRecordId = $request->get('src_record');
        $relatedRecordIdList = $request->get('related_record_list');

        if (empty($sourceRecordId)) {
            $sourceModuleName = $request->get('src_module');
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getDefaultInstance($sourceModuleName);
        } else {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($sourceRecordId);
        }

        foreach ($relatedRecordIdList AS $relatedRecordData) {
            $recordModel->addRelatedAction($relatedRecordData);
        }

        $response = new Vtiger_Response();
        $response->setResult(true);
        $response->emit();
    }

    public function deleteRelation($request)
    {

        $PFId = $request->get('pf_record');
        $ActionId = $request->get('action_record');

        $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($PFId);
        $recordModel->deleteRelatedAction($ActionId);

        $response = new Vtiger_Response();
        $response->setResult(true);
        $response->emit();
    }

    public function statusChange($request)
    {

        $PFId = $request->get('pf_record');
        $ActionId = $request->get('action_record');
        $status = $request->get('status');

        $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($PFId);
        $recordModel->changeRelatedActionStatus($ActionId, $status);

        $response = new Vtiger_Response();
        $response->setResult(true);
        $response->emit();
    }

    public function validateRequest(Vtiger_Request $request)
    {
        $request->validateWriteAccess();
    }

}
