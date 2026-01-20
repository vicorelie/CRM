<?php
/* ******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ***************************************************************************** */

class ITS4YouSignature_List_View extends Vtiger_List_View
{

    /**
     * @var bool
     */
    protected $isInstalled = false;

    public function __construct()
    {
        parent::__construct();

        $class = explode('_', get_class($this));
        $this->isInstalled = (Vtiger_Module_Model::getInstance($class[0])->getLicensePermissions($class[1]) === date('List6'));
    }

    /**
     * @param Vtiger_Request $request
     * @throws AppException
     */
    public function checkPermission(Vtiger_Request $request)
    {
        parent::checkPermission($request);

        if(!(vtlib_isModuleActive('PDFMaker') && class_exists('PDFMaker_PDFContent_Model') && method_exists('PDFMaker_PDFContent_Model', 'replaceSignature'))) {
            throw new AppException(vtranslate('LBL_INSTALL_UPDATE_PDFMAKER', $request->getModule()));
        }
    }

    /**
     * @param Vtiger_Request $request
     * @param bool $display
     */
    public function preProcess(Vtiger_Request $request, $display = true)
    {
        vtws_addDefaultModuleTypeEntity($request->getModule());

        parent::preProcess($request, $display);
    }

    /**
     * @param Vtiger_Request $request
     */
    public function process(Vtiger_Request $request)
    {
        if (!$this->isInstalled) {
            (new Settings_ITS4YouInstaller_License_View())->initializeContents($request);
        } else {
            parent::process($request);
        }
    }

    /**
     * @param Vtiger_Request $request
     * @return string
     */
    public function preProcessTplName(Vtiger_Request $request)
    {
        if (!$this->isInstalled) {
            $template = 'IndexViewPreProcess.tpl';
        } else {
            $template = parent::preProcessTplName($request);
        }

        return $template;
    }
} 