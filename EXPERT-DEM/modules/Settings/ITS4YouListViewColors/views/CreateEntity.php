<?php
/* * *******************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouListViewColors_CreateEntity_View extends Settings_Vtiger_Index_View
{

    public function process(Vtiger_Request $request)
    {
        $viewer = $this->getViewer($request);
        $moduleName = $request->getModule();
        $qualifiedModuleName = $request->getModule(false);

        $recordModel = Settings_ITS4YouListViewColors_Record_Model::getCleanInstance();
        $recordStructureInstance = Settings_ITS4YouListViewColors_RecordStructure_Model::getInstanceForWorkFlowModule($recordModel,
            Settings_ITS4YouListViewColors_RecordStructure_Model::RECORD_STRUCTURE_MODE_EDITTASK);

        $viewer->assign('RECORD_STRUCTURE_MODEL', $recordStructureInstance);
        $viewer->assign('RECORD_STRUCTURE', $recordStructureInstance->getStructure());

        $workflowModuleModel = $recordModel->getModule();

        $viewer->assign('WORKFLOW_MODEL', $recordModel);
        $viewer->assign('MODULE_MODEL', $workflowModuleModel);
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModuleName);
        $viewer->view('CreateEntity.tpl', $qualifiedModuleName);
    }
}