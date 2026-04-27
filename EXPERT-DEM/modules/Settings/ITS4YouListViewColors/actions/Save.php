<?php
/* * *******************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouListViewColors_Save_Action extends Settings_Vtiger_Basic_Action
{

    /**
     * @throws Exception
     */
    public function process(Vtiger_Request $request)
    {

        $recordId = $request->get('record');

        if ($recordId) {
            $recordModel = Settings_ITS4YouListViewColors_Record_Model::getInstance($recordId);
        } else {
            $recordModel = Settings_ITS4YouListViewColors_Record_Model::getCleanInstance();
        }

        foreach (ITS4YouListViewColors_Record_Model::REQUEST_COLUMNS as $column => $requestColumn) {
            $recordModel->set($column, $request->get($requestColumn));
        }

        $recordModel->save();

        $returnPage = $request->get('returnpage', null);
        $returnSourceModule = $request->get('returnsourcemodule', null);
        $returnSearchValue = $request->get('returnsearch_value', null);

        if ($request->has('parentid') && !$request->isEmpty('parentid')) {
            $redirectUrl = 'index.php?module=ITS4YouProcessFlow&parent=Settings&view=Detail&record=' . $request->get('parentid');
        } elseif ($request->has('parentmodule') && !$request->isEmpty('parentmodule')) {
            $redirectUrl = 'index.php?module=ITS4YouProcessFlow&parent=Settings&view=Detail&sourceModule=' . $request->get('parentmodule');
        } else {
            $redirectUrl = $recordModel->getDetailViewUrl() . "&sourceModule=$returnSourceModule&page=$returnPage&search_value=$returnSearchValue";
        }

        header('Location: ' . $redirectUrl);
    }

    /**
     * @throws Exception
     */
    public function validateRequest(Vtiger_Request $request)
    {
        $request->validateWriteAccess();
    }
}