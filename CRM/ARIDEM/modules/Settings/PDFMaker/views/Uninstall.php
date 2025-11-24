<?php
/*******************************************************************************
 * The content of this file is subject to the PDFMaker license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ***************************************************************************** */

class Settings_PDFMaker_Uninstall_View extends Settings_Vtiger_Index_View
{

    /**
     * @param Vtiger_Request $request
     * @param bool $display
     */
    public function preProcess(Vtiger_Request $request, $display = true)
    {
        $moduleName = $request->getModule();
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $settingLinks = array();

        foreach ($moduleModel->getSettingLinks() as $settingsLink) {
            $settingsLink['linklabel'] = sprintf(vtranslate($settingsLink['linklabel'], $moduleName), vtranslate($moduleName, $moduleName));
            $settingLinks['LISTVIEWSETTING'][] = Vtiger_Link_Model::getInstanceFromValues($settingsLink);
        }

        $viewer = $this->getViewer($request);
        $viewer->assign('LISTVIEW_LINKS', $settingLinks);

        parent::preProcess($request, false);

        if (6 !== (int)Vtiger_Version::current()) {
            if ($display) {
                $this->preProcessDisplay($request);
            }
        }
    }

    public function process(Vtiger_Request $request)
    {
        $moduleName = $request->getModule();
        $qualifiedModule = $request->getModule(false);

        $viewer = $this->getViewer($request);
        $viewer->assign('MODULE', $moduleName);
        $viewer->assign('QUALIFIED_MODULE', $qualifiedModule);
        $viewer->view('Uninstall.tpl', $qualifiedModule);
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
            'modules.Settings.' . $moduleName . '.resources.Uninstall',
        );
        $jsScriptInstances = $this->checkAndConvertJsScripts($jsFileNames);
        $headerScriptInstances = array_merge($headerScriptInstances, $jsScriptInstances);
        unset($headerScriptInstances['modules.' . $moduleName . '.resources.Edit']);

        return $headerScriptInstances;
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
        $cssInstances = $this->checkAndConvertCssStyles($cssFileNames);
        $headerCssInstances = array_merge($headerCssInstances, $cssInstances);
        return $headerCssInstances;
    }
}