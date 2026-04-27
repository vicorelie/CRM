<?php
/* * *******************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouListViewColors_EditAjax_View extends Settings_ITS4YouListViewColors_Edit_View
{

    public function preProcess(Vtiger_Request $request)
    {
        return true;
    }

    public function postProcess(Vtiger_Request $request)
    {
        return true;
    }

    function __construct()
    {
        parent::__construct();
        $this->exposeMethod('getProcessFlowConditions');
    }

    public function process(Vtiger_Request $request)
    {
        $mode = $request->get('mode');
        if (!empty($mode)) {
            $this->invokeExposedMethod($mode, $request);
            return;
        }
    }

    function getProcessFlowConditions(Vtiger_Request $request)
    {
        $viewer = $this->getViewer($request);
        $moduleName = $request->getModule();
        $qualifiedModuleName = $request->getModule(false);

        $recordId = $request->get('record');

        if ($recordId) {
            $recordModel = Settings_ITS4YouListViewColors_Record_Model::getInstance($recordId);
            $selectedModule = $recordModel->getModule();
            $selectedModuleName = $selectedModule->getName();
        } else {
            $selectedModuleName = $request->get('module_name');
            $selectedModule = Vtiger_Module_Model::getInstance($selectedModuleName);
            $recordModel = Settings_ITS4YouListViewColors_Record_Model::getCleanInstance($selectedModuleName);
        }

        //Added to support advance filters
        $recordStructureInstance = Settings_ITS4YouListViewColors_RecordStructure_Model::getInstanceForWorkFlowModule($recordModel, Settings_ITS4YouListViewColors_RecordStructure_Model::RECORD_STRUCTURE_MODE_FILTER);

        $viewer->assign('RECORD_STRUCTURE_MODEL', $recordStructureInstance);
        $recordStructure = $recordStructureInstance->getStructure();
        if (in_array($selectedModuleName, getInventoryModules())) {
            $itemsBlock = "LBL_ITEM_DETAILS";
            unset($recordStructure[$itemsBlock]);
        }
        $viewer->assign('RECORD_STRUCTURE', $recordStructure);

        $viewer->assign('RECORD_MODEL', $recordModel);

        $viewer->assign('MODULE_MODEL', $selectedModule);
        $viewer->assign('SELECTED_MODULE_NAME', $selectedModuleName);

        $dateFilters = Vtiger_Field_Model::getDateFilterTypes();
        foreach ($dateFilters as $comparatorKey => $comparatorInfo) {
            $comparatorInfo['startdate'] = DateTimeField::convertToUserFormat($comparatorInfo['startdate']);
            $comparatorInfo['enddate'] = DateTimeField::convertToUserFormat($comparatorInfo['enddate']);
            $comparatorInfo['label'] = vtranslate($comparatorInfo['label'], $qualifiedModuleName);
            $dateFilters[$comparatorKey] = $comparatorInfo;
        }
        $viewer->assign('DATE_FILTERS', $dateFilters);
        $viewer->assign('ADVANCED_FILTER_OPTIONS', Settings_ITS4YouListViewColors_Field_Model::getAdvancedFilterOptions());
        $viewer->assign('ADVANCED_FILTER_OPTIONS_BY_TYPE', Settings_ITS4YouListViewColors_Field_Model::getAdvancedFilterOpsByFieldType());
        $viewer->assign('COLUMNNAME_API', 'getWorkFlowFilterColumnName');

        $viewer->assign('FIELD_EXPRESSIONS', Settings_ITS4YouListViewColors_Module_Model::getExpressions());
        $viewer->assign('META_VARIABLES', Settings_ITS4YouListViewColors_Module_Model::getMetaVariables());
        $viewer->assign('ADVANCE_CRITERIA', "");
        $viewer->assign('RECORD', $recordId);

        $viewer->assign('ADVANCE_CRITERIA', $recordModel->transformToAdvancedFilterCondition());
        $viewer->assign('MODULE', $moduleName);
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModuleName);

        $userModel = Users_Record_Model::getCurrentUserModel();

        $viewer->assign('DATE_FORMAT', $userModel->get('date_format'));

        //$moduleModel = $recordModel->getModule();
        //$viewer->assign('TASK_TYPES', Settings_ITS4YouListViewColors_TaskType_Model::getAllForModule($moduleModel));
        //$viewer->assign('TASK_LIST', $recordModel->getTasks());
        $viewer->view('ProcessFlowConditions.tpl', $qualifiedModuleName);
    }

}
