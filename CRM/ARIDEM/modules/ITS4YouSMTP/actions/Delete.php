<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSMTP license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSMTP_Delete_Action extends Vtiger_Action_Controller
{
    /**
     * @throws AppException
     * @throws Exception
     */
    public function checkPermission(Vtiger_Request $request)
    {
        if($request->isEmpty('record')) {
            throw new AppException(vtranslate('LBL_MISSING_RECORD_PARAMETER'));
        }

        $currentUser = Users_Record_Model::getCurrentUserModel();
        $recordModel = ITS4YouSMTP_Record_Model::getInstanceByRequest($request);

        if(!$currentUser->isAdminUser() && (int)$recordModel->get('user_id') !== (int)$currentUser->getId()) {
            throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
        }
    }

    /**
     * @throws Exception
     */
    public function process(Vtiger_Request $request)
    {
        $recordModel = ITS4YouSMTP_Record_Model::getInstanceByRequest($request);
        $recordModel->delete();

        header('location:' . $recordModel->getModule()->getDefaultUrl());
    }
}