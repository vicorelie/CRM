<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSMTP license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSMTP_Save_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request)
    {
        $recordModel = ITS4YouSMTP_Record_Model::getInstanceByRequest($request);
        $currentUser = Users_Record_Model::getCurrentUserModel();

        if (!$currentUser->isAdminUser() && $recordModel->isCompanyAdmin()) {
            if ($request->isEmpty('company_id') && $request->isEmpty('user_id')) {
                throw new AppException(vtranslate('LBL_REQUIRED_COMPANY_OR_USER', $request->getModule()));
            }
        }

        if (method_exists('Vtiger_Action_Controller', 'checkPermission')) {
            return parent::checkPermission($request);
        }

        return true;
    }

    /**
     * @throws Exception
     */
    public function process(Vtiger_Request $request)
    {
        $recordId = $request->get('record');

        $recordModel = ITS4YouSMTP_Record_Model::getInstanceByRequest($request);
        $recordModel->set('id', $recordId);
        $recordModel->retrieveDataFromRequest($request);
        $recordModel->retrieveMessage();
        $recordModel->save();

        header('location:' . $recordModel->getDetailViewUrl());
    }
}