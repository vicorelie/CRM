<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_CreateEntity_View extends Settings_Vtiger_Index_View
{

    public function process(Vtiger_Request $request)
    {
        $viewer = $this->getViewer($request);
        $moduleName = $request->getModule();
        $qualifiedModuleName = $request->getModule(false);

        $workflowId = $request->get('for_workflow');
        if ($workflowId) {
            $workflowModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($workflowId);
            $selectedModule = $workflowModel->getModule();
            $selectedModuleName = $selectedModule->getName();
        } else {
            $selectedModuleName = $request->get('module_name');
            $selectedModule = Vtiger_Module_Model::getInstance($selectedModuleName);
            $workflowModel = Settings_ITS4YouProcessFlow_Record_Model::getCleanInstance($selectedModuleName);
        }

        $taskType = 'VTCreateEntityTask';
        $taskModel = Settings_ITS4YouProcessFlow_TaskRecord_Model::getCleanInstance($workflowModel, $taskType);

        $taskTypeModel = $taskModel->getTaskType();
        $viewer->assign('TASK_TYPE_MODEL', $taskTypeModel);

        $viewer->assign('TASK_TEMPLATE_PATH', $taskTypeModel->getTemplatePath());
        $recordStructureInstance = Settings_ITS4YouProcessFlow_RecordStructure_Model::getInstanceForWorkFlowModule($workflowModel,
            Settings_ITS4YouProcessFlow_RecordStructure_Model::RECORD_STRUCTURE_MODE_EDITTASK);
        $recordStructureInstance->setTaskRecordModel($taskModel);

        $viewer->assign('RECORD_STRUCTURE_MODEL', $recordStructureInstance);
        $viewer->assign('RECORD_STRUCTURE', $recordStructureInstance->getStructure());

        $relatedModule = $request->get('relatedModule');
        $relatedModuleModel = Vtiger_Module_Model::getInstance($relatedModule);

        $workflowModuleModel = $workflowModel->getModule();

        $viewer->assign('WORKFLOW_MODEL', $workflowModel);
        $viewer->assign('REFERENCE_FIELD_NAME', $workflowModel->getReferenceFieldName($relatedModule));
        $viewer->assign('RELATED_MODULE_MODEL', $relatedModuleModel);
        $viewer->assign('FIELD_EXPRESSIONS', Settings_ITS4YouProcessFlow_Module_Model::getExpressions());
        $viewer->assign('MODULE_MODEL', $workflowModuleModel);
        $viewer->assign('SOURCE_MODULE', $workflowModuleModel->getName());
        $viewer->assign('RELATED_MODULE_MODEL_NAME', '');
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModuleName);
        $viewer->view('CreateEntity.tpl', $qualifiedModuleName);
    }
}