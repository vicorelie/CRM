<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_Edit_View extends Settings_Vtiger_Index_View
{

    public function preProcess(Vtiger_Request $request, $display = true)
    {
        parent::preProcess($request, false);
        $viewer = $this->getViewer($request);

        $recordId = $request->get('record');
        $viewer->assign('RECORDID', $recordId);
        if ($recordId) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($recordId);
            $viewer->assign('RECORD_MODEL', $recordModel);
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
            'modules.Settings.Vtiger.resources.Edit',
            "modules.Settings.$moduleName.resources.Edit",
            "modules.Settings.$moduleName.resources.AdvanceFilter",
            '~libraries/jquery/ckeditor/ckeditor.js',
            'modules.Vtiger.resources.CkEditor',
            '~/libraries/jquery/bootstrapswitch/js/bootstrap-switch.min.js',
            '~libraries/jquery/jquery.datepick.package-4.1.0/jquery.datepick.js',
        );

        return array_merge($headerScriptInstances, $this->checkAndConvertJsScripts($jsFileNames));
    }

    public function getHeaderCss(Vtiger_Request $request)
    {
        $headerCssInstances = parent::getHeaderCss($request);
        $moduleName = $request->getModule();
        $cssFileNames = array(
            '~libraries/jquery/jquery.datepick.package-4.1.0/jquery.datepick.css',
            '~/libraries/jquery/bootstrapswitch/css/bootstrap3/bootstrap-switch.min.css',
        );

        return array_merge($this->checkAndConvertCssStyles($cssFileNames), $headerCssInstances);
    }

    public function process(Vtiger_Request $request)
    {
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $viewer = $this->getViewer($request);
        $moduleName = $request->getModule();
        $qualifiedModuleName = $request->getModule(false);
        $allModules = Settings_ITS4YouProcessFlow_Module_Model::getSupportedModules();

        $recordId = $request->get('record');
        $parentId = '';

        if ($recordId) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($recordId);
            $recordModule = $recordModel->getModule();
            $viewer->assign('RECORDID', $recordId);
            $viewer->assign('MODULE_MODEL', $recordModule);
            $viewer->assign('SELECTED_MODULE', $recordModule->getName());
            $viewer->assign('MODE', 'edit');
        } else {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getCleanInstance($moduleName);
            $selectedModule = $request->get('source_module');

            if (!empty($selectedModule)) {
                $viewer->assign('SELECTED_MODULE', $selectedModule);
            } else {
                foreach ($allModules as $moduleModel) {
                    $viewer->assign('SELECTED_MODULE', $moduleModel->getName());
                    break;
                }
            }

            if ($request->has('parentId') && !$request->isEmpty('parentId')) {
                $parentId = $request->get('parentId');

                $parentRecordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($parentId);
                $parentRecordModule = $parentRecordModel->getModule();
                $viewer->assign('MODULE_MODEL', $parentRecordModule);
                $viewer->assign('SELECTED_MODULE', $parentRecordModule->getName());

            }

            if ($request->has('parenttype') && !$request->isEmpty('parenttype')) {
                $viewer->assign('PARENT_TYPE', $request->get('parenttype'));
            }
        }

        $viewer->assign('PARENT_ID', $parentId);
        $viewer->assign('RECORD_MODEL', $recordModel);
        $viewer->assign('ALL_MODULES', $allModules);
        $viewer->assign('MODULE', $moduleName);
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModuleName);
        $viewer->assign('CURRENT_USER', $currentUser);
        $viewer->assign('ACTIVE_ADMIN', Users::getActiveAdminUser());
        $viewer->assign('RETURN_SOURCE_MODULE', $request->get('returnsourceModule'));
        $viewer->assign('RETURN_PAGE', $request->get('returnpage'));
        $viewer->assign('RETURN_SEARCH_VALUE', $request->get('returnsearch_value'));

        $viewer->view('EditView.tpl', $qualifiedModuleName);
    }
}