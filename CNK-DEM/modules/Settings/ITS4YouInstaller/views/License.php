<?php
/*******************************************************************************
 * The content of this file is subject to the ITS4YouInstaller license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ***************************************************************************** */ 

class Settings_ITS4YouInstaller_License_View extends Settings_Vtiger_Index_View
{
    /**
     * @param Vtiger_Request $request
     * @return string
     */
    public function getModuleName(Vtiger_Request $request) {
        if('ITS4YouInstaller' !== $request->getModule()) {
            $request->set('sourceModule', $request->getModule());
        }

        if($request->isEmpty('sourceModule')) {
            throw new AppException(vtranslate('LBL_SELECT_SOURCE_MODULE', 'ITS4YouInstaller'));
        }

        return (string)$request->get('sourceModule');
    }

    public function preProcess(Vtiger_Request $request, $display = true)
    {
        parent::preProcess($request, false);

        $moduleName = $this->getModuleName($request);
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $settingLinks = array();

        foreach ($moduleModel->getSettingLinks() as $settingsLink) {
            $settingsLink['linklabel'] = sprintf(vtranslate($settingsLink['linklabel'], $moduleName), vtranslate($moduleName, $moduleName));
            $settingLinks['LISTVIEWSETTING'][] = Vtiger_Link_Model::getInstanceFromValues($settingsLink);
        }

        $viewer = $this->getViewer($request);
        $viewer->assign('LISTVIEW_LINKS', $settingLinks);

        if (6 !== (int)Vtiger_Version::current() && $display) {
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

        $moduleName = $this->getModuleName($request);
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);

        if(method_exists($moduleModel, 'getLicensePermissions')) {
            $permission = $moduleModel->getLicensePermissions('Edit');
            $reportData = $moduleModel->licensePermissions;
        } else {
            $permission = true;
        }

        $installer = 'ITS4YouInstaller';
        $installerModel = Vtiger_Module_Model::getInstance($installer);

        $viewer = $this->getViewer($request);
        $viewer->assign('MODULE', $moduleName);
        $viewer->assign('QUALIFIED_MODULE', $moduleName);
        $viewer->assign('URL', vglobal('site_URL'));
        $viewer->assign('DEFAULT_VIEW_URL', $moduleModel->getDefaultUrl());
        $viewer->assign('IS_ALLOWED', $permission);
        $viewer->assign('MODULE_MODEL', $moduleModel);

        $versionClass = $moduleName . '_Version_Helper';
        $version = class_exists($versionClass) ? $versionClass::$version : 0;

        $viewer->assign('VERSION', $version);

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

        $viewer->view('License.tpl', 'Settings:ITS4YouInstaller');
    }

    public function getHeaderScripts(Vtiger_Request $request)
    {
        $headerScriptInstances = parent::getHeaderScripts($request);
        $moduleName = $request->getModule();

        unset($headerScriptInstances['modules.Vtiger.resources.Edit']);
        unset($headerScriptInstances["modules.Settings.Vtiger.resources.Edit"]);
        unset($headerScriptInstances['modules.Inventory.resources.Edit']);
        unset($headerScriptInstances["modules.$moduleName.resources.Edit"]);
        unset($headerScriptInstances["modules.Settings.$moduleName.resources.Edit"]);

        $jsFileNames = array(
            "modules.Settings.$moduleName.resources.License",
        );

        return array_merge($headerScriptInstances, $this->checkAndConvertJsScripts($jsFileNames));
    }

    /**
     * @param Vtiger_Request $request
     * @return array
     */
    public function getHeaderCss(Vtiger_Request $request)
    {
        $headerCssInstances = parent::getHeaderCss($request);
        $layout = Vtiger_Viewer::getDefaultLayoutName();
        $cssFileNames = array(
            '~/layouts/'.$layout.'/skins/marketing/style.css',
        );

        return array_merge($headerCssInstances, $this->checkAndConvertCssStyles($cssFileNames));
    }
} 