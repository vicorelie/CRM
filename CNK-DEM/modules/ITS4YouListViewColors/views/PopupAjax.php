<?php
/* * *******************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouListViewColors_PopupAjax_View extends ITS4YouListViewColors_Popup_View
{

    function __construct()
    {
        parent::__construct();
        $this->exposeMethod('getListViewCount');
        $this->exposeMethod('getRecordsCount');
        $this->exposeMethod('getPageCount');
    }

    function preProcess(Vtiger_Request $request)
    {
        return true;
    }

    function postProcess(Vtiger_Request $request)
    {
        return true;
    }

    function process(Vtiger_Request $request)
    {
        $mode = $request->get('mode');
        if (!empty($mode)) {
            $this->invokeExposedMethod($mode, $request);
            return;
        }
        $viewer = $this->getViewer($request);
        $moduleName = $request->getModule();

        $this->initializeListViewContents($request, $viewer);

        echo $viewer->view('PopupContents.tpl', $moduleName, true);
    }

}