<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_EditAjax_View extends Settings_ITS4YouProcessFlow_Edit_View
{
    public function __construct()
    {
        parent::__construct();
        $this->exposeMethod('getProcessFlowConditions');
    }

    public function preProcess(Vtiger_Request $request, $display = true)
    {
        return true;
    }

    public function postProcess(Vtiger_Request $request, $display = true)
    {
        return true;
    }

    /**
     * @throws Exception
     */
    public function process(Vtiger_Request $request)
    {
        $mode = $request->get('mode');

        if (!empty($mode)) {
            $this->invokeExposedMethod($mode, $request);
        }
    }

    public function getProcessFlowConditions(Vtiger_Request $request)
    {
        $viewer = $this->getViewer($request);
        $moduleName = $request->getModule();
        $qualifiedModuleName = $request->getModule(false);
        $recordId = $request->get('record');
        $userModel = Users_Record_Model::getCurrentUserModel();

        if ($recordId) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($recordId);
            $selectedModule = $recordModel->getModule();
            $selectedModuleName = $selectedModule->getName();
        } else {
            $selectedModuleName = $request->get('module_name');
            $selectedModule = Vtiger_Module_Model::getInstance($selectedModuleName);
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getCleanInstance($selectedModuleName);
        }

        $recordStructureInstance = Settings_ITS4YouProcessFlow_RecordStructure_Model::getInstanceForWorkFlowModule($recordModel, Settings_ITS4YouProcessFlow_RecordStructure_Model::RECORD_STRUCTURE_MODE_FILTER);
        $recordStructure = $recordStructureInstance->getStructure();

        $viewer->assign('RECORD_STRUCTURE_MODEL', $recordStructureInstance);
        $viewer->assign('RECORD_STRUCTURE', $recordStructure);
        $viewer->assign('RECORD_MODEL', $recordModel);
        $viewer->assign('MODULE_MODEL', $selectedModule);
        $viewer->assign('SELECTED_MODULE_NAME', $selectedModuleName);
        $viewer->assign('DATE_FILTERS', $recordModel->getDateFilters());
        $viewer->assign('ADVANCED_FILTER_OPTIONS', Settings_ITS4YouProcessFlow_Field_Model::getAdvancedFilterOptions());
        $viewer->assign('ADVANCED_FILTER_OPTIONS_BY_TYPE', Settings_ITS4YouProcessFlow_Field_Model::getAdvancedFilterOpsByFieldType());
        $viewer->assign('COLUMNNAME_API', 'getWorkFlowFilterColumnName');
        $viewer->assign('FIELD_EXPRESSIONS', Settings_ITS4YouProcessFlow_Module_Model::getExpressions());
        $viewer->assign('META_VARIABLES', Settings_ITS4YouProcessFlow_Module_Model::getMetaVariables());
        $viewer->assign('RECORD', $recordId);
        $viewer->assign('ADVANCE_CRITERIA', $recordModel->transformToAdvancedFilterCondition());
        $viewer->assign('MODULE', $moduleName);
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModuleName);
        $viewer->assign('DATE_FORMAT', $userModel->get('date_format'));

        $viewer->view('ProcessFlowConditions.tpl', $qualifiedModuleName);
    }
}
