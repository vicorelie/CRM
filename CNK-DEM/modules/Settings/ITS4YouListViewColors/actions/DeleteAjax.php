<?php
/* * *******************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouListViewColors_DeleteAjax_Action extends Settings_Vtiger_Index_Action
{

    public function process(Vtiger_Request $request)
    {
        $qualifiedModule = $request->getModule(false);
        $recordId = $request->get('record');


        $recordModel = Settings_ITS4YouListViewColors_Record_Model::getInstance($recordId);
        $recordModel->delete();

        $ITS4YouListViewColorsourceModuleModel = Settings_ITS4YouListViewColors_Module_Model::getInstance();
        $listViewUrl = $ITS4YouListViewColorsourceModuleModel->getListViewUrl();

        $response = new Vtiger_Response();
        $response->setResult($listViewUrl);
        $response->emit();
    }

    public function validateRequest(Vtiger_Request $request)
    {
        $request->validateWriteAccess();
    }
}
