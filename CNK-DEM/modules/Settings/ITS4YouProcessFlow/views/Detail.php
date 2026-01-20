<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_Detail_View extends Settings_Vtiger_Index_View
{

    public function preProcess(Vtiger_Request $request, $display = true)
    {
        parent::preProcess($request, false);
        $viewer = $this->getViewer($request);

        $recordId = $request->get('record');
        $viewer->assign('RECORDID', $recordId);
        if ($recordId) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($recordId);
            $viewer->assign('WORKFLOW_MODEL', $recordModel);
        }
        $viewer->assign('RECORD_MODE', $request->getMode());
        $viewer->assign('SITEROAD', $this->getSiteRoad($request));

        if ($display) {
            $this->preProcessDisplay($request);
        }
    }

    private function getSiteRoad(Vtiger_Request $request)
    {
        $qualifiedModuleName = $request->getModule(false);

        $moduleModel = Settings_Vtiger_Module_Model::getInstance($qualifiedModuleName);
        return $moduleModel->getSiteRoad($request);
    }

    public function getHeaderScripts(Vtiger_Request $request)
    {
        $headerScriptInstances = parent::getHeaderScripts($request);
        $moduleName = $request->getModule();

        $jsFileNames = array(
            'modules.Vtiger.resources.Detail',
            'modules.Settings.Vtiger.resources.Detail',
            "modules.Settings.$moduleName.resources.Detail",
            'modules.Vtiger.resources.RelatedList',
            '~libraries/jquery/ckeditor/ckeditor.js',
            "modules.Vtiger.resources.CkEditor",
            '~/libraries/jquery/bootstrapswitch/js/bootstrap-switch.min.js',
            '~libraries/jquery/jquery.datepick.package-4.1.0/jquery.datepick.js',
        );

        $jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
        $headerScriptInstances = array_merge($headerScriptInstances, $jsScriptInstances);
        return $headerScriptInstances;
    }

    public function getHeaderCss(Vtiger_Request $request)
    {
        $headerCssInstances = parent::getHeaderCss($request);
        $moduleName = $request->getModule();
        $cssFileNames = array(
            '~libraries/jquery/jquery.datepick.package-4.1.0/jquery.datepick.css',
            '~/libraries/jquery/bootstrapswitch/css/bootstrap3/bootstrap-switch.min.css',
        );
        $cssInstances = $this->checkAndConvertCssStyles($cssFileNames);
        $headerCssInstances = array_merge($cssInstances, $headerCssInstances);
        return $headerCssInstances;
    }

    public function process(Vtiger_Request $request)
    {
        $adb = PearDatabase::getInstance();

        $currentUser = Users_Record_Model::getCurrentUserModel();
        $viewer = $this->getViewer($request);
        $moduleName = $request->getModule();
        $qualifiedModuleName = $request->getModule(false);
        //$allModules = Settings_ITS4YouProcessFlow_Module_Model::getSupportedModules();

        $recordId = $request->get('record');
        if ($recordId) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($recordId);

            $viewer->assign('MODE', 'edit');
        } elseif ($request->has('sourceModule') && !$request->isEmpty('sourceModule')) {
            $sourceModule = $request->get('sourceModule');
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getDefaultInstance($sourceModule);
            $recordId = $recordModel->getId();
        }

        $recordModuleModel = $recordModel->getModule();
        $selected_module_name = $recordModuleModel->getName();
        $viewer->assign('RECORDID', $recordId);
        $viewer->assign('MODULE_MODEL', $recordModuleModel);
        $viewer->assign('SELECTED_MODULE', $selected_module_name);
        $viewer->assign('ACTIONS_LIST', $recordModel->getActionsRecords());


        $viewer->assign('RECORD_MODEL', $recordModel);
        $viewer->assign('ACTION_LINKS', Settings_ITS4YouProcessFlow_Module_Model::getActionsLinks($request, $recordModel));

        $viewer->assign('MODULE', $moduleName);
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModuleName);
        $viewer->assign('CURRENT_USER', $currentUser);
        $admin = Users::getActiveAdminUser();
        $viewer->assign('ACTIVE_ADMIN', $admin);
        $viewer->assign('RETURN_SOURCE_MODULE', $request->get("returnsourceModule"));
        $viewer->assign('RETURN_PAGE', $request->get("returnpage"));
        $viewer->assign('RETURN_SEARCH_VALUE', $request->get("returnsearch_value"));

        $listViewModel = Settings_Vtiger_ListView_Model::getInstance($qualifiedModuleName);
        $listViewHeaders = $listViewModel->getListViewHeaders();

        $listQuery = $listViewModel->getBasicListQuery();

        $listQuery .= " WHERE deleted = ? AND module_name = ? AND ";

        if ($recordId == "0") {
            $listQuery .= "(parent_id = ? OR parent_id IS NULL)";
        } else {
            $listQuery .= "parent_id = ?";
        }

        $listResult = $adb->pquery($listQuery, array(0, $selected_module_name, $recordId));
        $noOfRecords = $adb->num_rows($listResult);

        $listViewRecordModels = array();
        for ($i = 0; $i < $noOfRecords; ++$i) {
            $data = $adb->raw_query_result_rowdata($listResult, $i);
            $record = Settings_ITS4YouProcessFlow_Record_Model::getInstanceFromData($data);
            if ($record) {
                $listViewRecordModels[($record->get('if_type') == 0 ? "yes" : "no")][$record->getId()] = $record;
            }
        }

        $viewer->assign('LISTVIEW_HEADERS', $listViewHeaders);
        $viewer->assign('LISTVIEW_ENTRIES', $listViewRecordModels);

        $viewer->assign('LIST_TYPES', array("yes", "no"));
        $viewer->assign('SELECTED_ACTION_TAB', "yesActionTab");
        $viewer->assign('SELECTED_PF_TAB', "yesPFTab");
        $viewer->view('DetailView.tpl', $qualifiedModuleName);
    }

}