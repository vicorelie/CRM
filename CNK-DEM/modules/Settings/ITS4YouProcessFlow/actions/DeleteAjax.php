<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_DeleteAjax_Action extends Settings_Vtiger_Index_Action
{

    public function process(Vtiger_Request $request)
    {
        $qualifiedModule = $request->getModule(false);
        $recordId = $request->get('record');

        $response = new Vtiger_Response();
        $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($recordId);
        $recordModel->delete();
        $response->setResult(array('success' => 'ok'));
        $response->emit();
    }

    public function validateRequest(Vtiger_Request $request)
    {
        $request->validateWriteAccess();
    }
}
