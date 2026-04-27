<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouProcessFlow_showFieldsAjax_View extends Vtiger_IndexAjax_View
{

    public function process(Vtiger_Request $request)
    {

        $moduleName = $request->getModule();

        $showFields = $request->get('show_fields');
        $showManFields = $request->get('showmanfields');
        $hideManFields = $request->get('hidemanfields');

        $forModuleName = $request->get("its4you_for_module");
        $recordModel = Vtiger_Record_Model::getCleanInstance($forModuleName);
        $moduleModel = $recordModel->getModule();

        $fieldList = $moduleModel->getFields();
        $requestFieldList = array_intersect_key($request->getAll(), $fieldList);

        foreach ($requestFieldList as $fieldName => $fieldValue) {
            $fieldModel = $fieldList[$fieldName];
            if ($fieldModel->isEditable()) {
                $recordModel->set($fieldName, $fieldModel->getDBInsertValue($fieldValue));
            }
        }

        $recordStructureInstance = new ITS4YouProcessFlow_showFieldsRecordStructure_Model();
        $recordStructureInstance->setFields($showFields, $showManFields, $hideManFields);
        $RecordStructure = $recordStructureInstance->getStructure($moduleModel);

        if (count($RecordStructure) > 0) {
            $picklistDependencyDatasource = Vtiger_DependencyPicklist::getPicklistDependencyDatasource($forModuleName);

            $viewer = $this->getViewer($request);
            $viewer->assign('PICKIST_DEPENDENCY_DATASOURCE', Zend_Json::encode($picklistDependencyDatasource));
            $viewer->assign('CURRENTDATE', date('Y-n-j'));
            $viewer->assign('MODULE', $forModuleName);
            $viewer->assign('SOURCE_MODULE', $moduleName);
            $viewer->assign('SINGLE_MODULE', 'SINGLE_' . $forModuleName);
            $viewer->assign('MODULE_MODEL', $moduleModel);
            $viewer->assign('RECORD_STRUCTURE_MODEL', $recordStructureInstance);
            $viewer->assign('RECORD_STRUCTURE', $RecordStructure);
            $viewer->assign('USER_MODEL', Users_Record_Model::getCurrentUserModel());

            $viewer->assign('SCRIPTS', $this->getHeaderScripts($request));

            $viewer->assign('MAX_UPLOAD_LIMIT_MB', Vtiger_Util_Helper::getMaxUploadSize());
            $viewer->assign('MAX_UPLOAD_LIMIT', vglobal('upload_maxsize'));
            echo $viewer->view('QuickEditable.tpl', $moduleName, true);
        }
    }

    public function getHeaderScripts(Vtiger_Request $request)
    {

        $moduleName = $request->getModule();

        $jsFileNames = array();

        $jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
        return $jsScriptInstances;
    }
}