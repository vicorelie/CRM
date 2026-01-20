<?php
/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */

class Settings_ITS4YouSignature_Save_Action extends Settings_Vtiger_Index_Action {

    /**
     * @param Vtiger_Request $request
     */
    public function process(Vtiger_Request $request) {
        $moduleName = $request->getModule();
        $qualifiedModuleName = $request->getModule(false);
        $recordModel = Settings_Vtiger_Record_Model::getInstance($qualifiedModuleName);

        if($recordModel) {
            foreach ($recordModel->getFieldNames() as $fieldName) {
                $recordModel->set($fieldName, $request->get($fieldName));
            }

            $recordModel->save();
        }

        header("Location: index.php?module=ITS4YouSignature&view=List&app=TOOLS&parent=Settings");
    }

    /**
     * @param Vtiger_Request $request
     * @throws Exception
     */
    public function validateRequest(Vtiger_Request $request) {
        $request->validateWriteAccess();
    }
}