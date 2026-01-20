<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_Save_Action extends Settings_Vtiger_Basic_Action
{

    public function process(Vtiger_Request $request)
    {

        $pfname = $request->get('pfname');

        $recordId = $request->get('record');
        $summary = $request->get('summary');
        $moduleName = $request->get('module_name');
        $conditions = $request->get('conditions');
        $executionCondition = $request->get('execution_condition');
        $parentId = $request->get('parent_id');

        if ($recordId) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($recordId);
        } else {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getCleanInstance($moduleName);

            if ($request->has('parenttype') && !$request->isEmpty('parenttype')) {
                $recordModel->set('if_type', $request->get('parenttype'));
            }
        }

        require_once 'modules/com_vtiger_workflow/expression_engine/include.inc';

        if (!empty($conditions) && is_array($conditions)) {
            foreach ($conditions as $info) {
                if (!empty($info['columns']) && is_array($info['columns'])) {
                    foreach ($info['columns'] as $conditionRow) {
                        if ($conditionRow['valuetype'] == 'expression') {
                            try {
                                $parser = new VTExpressionParser(new VTExpressionSpaceFilter(new VTExpressionTokenizer($conditionRow['value'])));
                                $expression = $parser->expression();
                            } catch (Exception $e) {
                                return;
                            }
                        }
                    }
                }
            }
        }

        $recordModel->set('name', $pfname);
        $recordModel->set('summary', $summary);
        $recordModel->set('module_name', $moduleName);
        $recordModel->set('conditions', $conditions);
        $recordModel->set('execution_condition', $executionCondition);
        $recordModel->set('status', 1);
        $recordModel->set('parent_id', $parentId);

        $recordModel->transformAdvanceFilterToPFFilter();
        $recordModel->save();

        $returnPage = $request->get("returnpage", null);
        $returnSourceModule = $request->get("returnsourcemodule", null);
        $returnSearchValue = $request->get("returnsearch_value", null);
        $redirectUrl = $recordModel->getDetailViewUrl() . "&sourceModule=$returnSourceModule&page=$returnPage&search_value=$returnSearchValue";

        header("Location: " . $redirectUrl);
    }

    public function validateRequest(Vtiger_Request $request)
    {
        $request->validateWriteAccess();
    }
}