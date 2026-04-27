<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_FilterRecordStructure_Model extends Settings_ITS4YouProcessFlow_RecordStructure_Model
{

    /**
     * Function to get the values in stuctured format
     * @return <array> - values in structure array('block'=>array(fieldinfo));
     */
    public function getStructure()
    {
        if (!empty($this->structuredValues)) {
            return $this->structuredValues;
        }

        /** @var Vtiger_Module_Model $moduleModel */
        $moduleModel = $this->getModule();
        $this->assignModuleFields($values);
        $this->assignReferenceFields($values);

        if ($moduleModel->isCommentEnabled()) {
            $this->assignCommentFields($values);
        }

        $this->assignUserFields($values);
        $this->structuredValues = $values;

        return $values;
    }

    /**
     * @param array $values
     */
    public function assignCommentFields(&$values)
    {
        /** @var Vtiger_Module_Model $moduleModel */
        $moduleModel = $this->getModule();
        $commentFieldModel = Settings_ITS4YouProcessFlow_Field_Model::getCommentFieldForFilterConditions($moduleModel);
        $commentFieldModelsList = array(
            $commentFieldModel->getName() => $commentFieldModel
        );

        $labelName = sprintf('%s %s',
            vtranslate($moduleModel->getSingularLabelKey(), $moduleModel->getName()),
            vtranslate('LBL_COMMENTS', $moduleModel->getName())
        );

        foreach ($commentFieldModelsList as $commentFieldName => $commentFieldModel) {
            $commentFieldModel
                ->set('workflow_columnname', $commentFieldName)
                ->set('workflow_columnlabel', vtranslate($commentFieldModel->get('label'), $moduleModel->getName()))
                ->set('workflow_sourcemodule_field', true);

            $values[$labelName][$commentFieldName] = $commentFieldModel;
        }
    }

    /**
     * @param array $values
     */
    public function assignReferenceFields(&$values)
    {
        /** @var Vtiger_Module_Model $baseModuleModel */
        $baseModuleModel = $this->getModule();
        $recordModel = $this->getWorkFlowModel();
        $recordId = $recordModel->getId();
        $fields = $baseModuleModel->getFieldsByType(array('reference', 'multireference'));

        foreach ($fields as $parentFieldName => $field) {
            $referenceModules = $field->getReferenceList();

            foreach ($referenceModules as $refModule) {
                if ('Users' === $refModule) {
                    continue;
                }

                $moduleModel = Vtiger_Module_Model::getInstance($refModule);
                $blockModelList = $moduleModel->getBlocks();

                foreach ($blockModelList as $blockLabel => $blockModel) {
                    $fieldModelList = $blockModel->getFields();

                    if (!empty ($fieldModelList)) {
                        if (ITS4YouProcessFlow_Utils_Helper::count($referenceModules) > 1) {
                            $newBlockLabel = sprintf('%s (%s) - %s',
                                vtranslate($field->get('label'), $baseModuleModel->getName()),
                                vtranslate($refModule, $refModule),
                                vtranslate($blockLabel, $refModule)
                            );
                        } else {
                            $newBlockLabel = sprintf('%s - %s',
                                vtranslate($field->get('label'), $baseModuleModel->getName()),
                                vtranslate($blockLabel, $refModule)
                            );
                        }

                        foreach ($fieldModelList as $fieldName => $fieldModel) {
                            if ($fieldModel->isViewableInFilterView()) {
                                $name = sprintf('(%s : (%s) %s)',
                                    $parentFieldName,
                                    $refModule,
                                    $fieldName
                                );
                                $label = sprintf('%s : (%s) %s',
                                    vtranslate($field->get('label'), $baseModuleModel->getName()),
                                    vtranslate($refModule, $refModule),
                                    vtranslate($fieldModel->get('label'), $refModule)
                                );
                                $fieldModel->set('workflow_columnname', $name)->set('workflow_columnlabel', $label);

                                if (!empty($recordId)) {
                                    $fieldValueType = $recordModel->getFieldFilterValueType($name);
                                    $fieldInfo = $fieldModel->getFieldInfo();
                                    $fieldInfo['workflow_valuetype'] = $fieldValueType;
                                    $fieldModel->setFieldInfo($fieldInfo);
                                }

                                $newFieldModel = clone $fieldModel;
                                $label = sprintf('%s - %s',
                                    vtranslate($field->get('label'), $baseModuleModel->getName()),
                                    vtranslate($fieldModel->get('label'), $refModule)
                                );
                                $newFieldModel->set('label', $label);
                                $values[$newBlockLabel][$name] = $newFieldModel;
                            }
                        }
                    }
                }


            }
        }
    }

    /**
     * @param $values
     */
    public function assignModuleFields(&$values)
    {
        $recordModel = $this->getWorkFlowModel();
        $recordId = $recordModel->getId();
        $values = array();
        $moduleModel = $this->getModule();
        $moduleName = $moduleModel->getName();
        $blockModelList = $moduleModel->getBlocks();

        foreach ($blockModelList as $blockLabel => $blockModel) {
            $fieldModelList = $blockModel->getFields();

            if (!empty ($fieldModelList)) {
                $values[$blockLabel] = array();

                foreach ($fieldModelList as $fieldName => $fieldModel) {
                    if ($fieldModel->isViewableInFilterView()) {
                        if (in_array($moduleName, array('Calendar', 'Events')) && 3 === intval($fieldModel->getDisplayType())) {
                            continue;
                        }

                        if (!empty($recordId)) {
                            $fieldValueType = $recordModel->getFieldFilterValueType($fieldName);
                            $fieldInfo = $fieldModel->getFieldInfo();
                            $fieldInfo['workflow_valuetype'] = $fieldValueType;
                            $fieldModel->setFieldInfo($fieldInfo);
                        }

                        $fieldModel->set('workflow_columnname', $fieldName)->set('workflow_columnlabel', vtranslate($fieldModel->get('label'), $moduleName));
                        $fieldModel->set('workflow_sourcemodule_field', true);

                        $values[$blockLabel][$fieldName] = clone $fieldModel;
                    }
                }
            }
        }
    }
}