<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_SaveAjax_Action extends Settings_Vtiger_IndexAjax_View
{

    public function process(Vtiger_Request $request)
    {
        $record = $request->get('record');
        $status = $request->get('status');

        if ($record) {
            if ($status == 'off') {
                $status = 0;
            } else {
                if ($status == 'on') {
                    $status = 1;
                }
            }

            Settings_ITS4YouProcessFlow_Record_Model::updateProcessFlowStatus($record, $status);
        }

        $response = new Vtiger_Response();
        $response->setResult(array('success'));
        $response->emit();
    }

    public function validateRequest(Vtiger_Request $request)
    {
        $request->validateWriteAccess();
    }

}
