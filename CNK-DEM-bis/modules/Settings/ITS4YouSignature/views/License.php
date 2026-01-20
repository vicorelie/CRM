<?php
/* ********************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class Settings_ITS4YouSignature_License_View extends Settings_Vtiger_Index_View
{
    /**
     * @param Vtiger_Request $request
     * @param bool $display
     */
    public function preProcess(Vtiger_Request $request, $display = true)
    {
        parent::preProcess($request, false);
        $moduleName = $request->getModule();
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $settingLinks = array();

        foreach ($moduleModel->getSettingLinks() as $settingsLink) {
            $settingLinks['LISTVIEWSETTING'][] = Vtiger_Link_Model::getInstanceFromValues($settingsLink);
        }

        $viewer = $this->getViewer($request);
        $viewer->assign('LISTVIEW_LINKS', $settingLinks);

        if($display) {
            $this->preProcessDisplay($request);
        }
    }

    public function process(Vtiger_Request $request)
    {
        $this->initializeContents($request);
    }

    public function initializeContents(Vtiger_Request $request)
    {
        $request->set('parent', 'Settings');

        $moduleName = $request->getModule();
        $qualifiedModule = $request->getModule(false);
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $permission = $moduleModel->getLicensePermissions('Edit');
        $reportData = $moduleModel->licensePermissions;

        $installer = 'ITS4YouInstaller';
        $installerModel = Vtiger_Module_Model::getInstance($installer);

        $viewer = $this->getViewer($request);
        $viewer->assign('MODULE', $moduleName);
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModule);
        $viewer->assign("URL", vglobal("site_URL"));
        $viewer->assign("DEFAULT_VIEW_URL", $moduleModel->getDefaultUrl());
        $viewer->assign('IS_ALLOWED', $permission);
        $viewer->assign('MODULE_MODEL', $moduleModel);


        if (isset($reportData['errors'])) {
            $viewer->assign("ERRORS", $reportData['errors']);
        }

        if (isset($reportData['info'])) {
            $viewer->assign("INFO", $reportData['info']);
        }

        if ($installerModel && $installerModel->isActive()) {
            $viewer->assign('IS_INSTALLER_ACTIVE', $installerModel->isActive());
            $viewer->assign('INSTALLER_MODEL', $installerModel);
        }

        $viewer->view('License.tpl', $qualifiedModule);
    }

    public function getHeaderScripts(Vtiger_Request $request)
    {
        $headerScriptInstances = parent::getHeaderScripts($request);
        $moduleName = $request->getModule();

        $jsFileNames = array(
            "modules.Settings.$moduleName.resources.License",
        );

        $jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
        $headerScriptInstances = array_merge($headerScriptInstances, $jsScriptInstances);
        return $headerScriptInstances;
    }
}