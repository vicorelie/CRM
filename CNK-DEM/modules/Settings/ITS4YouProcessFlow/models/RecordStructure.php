<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

class Settings_ITS4YouProcessFlow_RecordStructure_Model extends Vtiger_RecordStructure_Model
{

    const RECORD_STRUCTURE_MODE_DEFAULT = '';
    const RECORD_STRUCTURE_MODE_FILTER = 'Filter';
    const RECORD_STRUCTURE_MODE_EDITTASK = 'EditTask';

    public static function getInstanceForWorkFlowModule($workFlowModel, $mode)
    {
        $className = Vtiger_Loader::getComponentClassName('Model', $mode . 'RecordStructure', 'Settings:ITS4YouProcessFlow');
        $instance = new $className();
        $instance->setWorkFlowModel($workFlowModel);
        $instance->setModule($workFlowModel->getModule());
        return $instance;
    }

    public function setWorkFlowModel($workFlowModel)
    {
        $this->workFlowModel = $workFlowModel;
    }

    /**
     * Function returns all the email fields for the workflow record structure
     * @return type
     */
    public function getAllEmailFields()
    {
        return $this->getFieldsByType('email');
    }

    /**
     * Function returns fields based on type
     * @return type
     */
    public function getFieldsByType($fieldTypes)
    {
        $fieldTypesArray = array();
        if (gettype($fieldTypes) == 'string') {
            array_push($fieldTypesArray, $fieldTypes);
        } else {
            $fieldTypesArray = $fieldTypes;
        }
        $structure = $this->getStructure();
        $fieldsBasedOnType = array();
        if (!empty($structure)) {
            foreach ($structure as $block => $fields) {
                foreach ($fields as $metaKey => $field) {
                    $type = $field->getFieldDataType();
                    if (in_array($type, $fieldTypesArray)) {
                        $fieldsBasedOnType[$metaKey] = $field;
                    }
                }
            }
        }
        return $fieldsBasedOnType;
    }

    /**
     * Function to get the values in stuctured format
     * @return <array> - values in structure array('block'=>array(fieldinfo));
     */
    public function getStructure()
    {
        if (!empty($this->structuredValues)) {
            return $this->structuredValues;
        }

        $values = array();

        $this->assignModuleFields($values);
        $this->assignReferenceFields($values);
        $this->structuredValues = $values;

        return $values;
    }

    /**
     * @param array $values
     */
    public function assignReferenceFields(&$values)
    {
        /**
         * @var Vtiger_Module_Model $baseModuleModel
         */
        $baseModuleModel = $this->getModule();
        $recordModel = $this->getWorkFlowModel();
        $recordId = $recordModel->getId();
        $fields = $baseModuleModel->getFieldsByType(array('reference', 'owner', 'multireference'));

        foreach ($fields as $parentFieldName => $field) {
            $type = $field->getFieldDataType();
            $referenceModules = $field->getReferenceList();

            if ('owner' === $type) {
                $referenceModules = array('Users');
            }

            foreach ($referenceModules as $refModule) {
                $moduleModel = Vtiger_Module_Model::getInstance($refModule);
                $blockModelList = $moduleModel->getBlocks();

                unset($blockModelList['LBL_ITEM_DETAILS']);

                foreach ($blockModelList as $blockLabel => $blockModel) {
                    $fieldModelList = $blockModel->getFields();

                    if (!empty ($fieldModelList)) {
                        foreach ($fieldModelList as $fieldName => $fieldModel) {
                            if ($fieldModel->isViewable()) {
                                if (6 == intval($fieldModel->getDisplayType())) {
                                    continue;
                                }

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
                                    $fieldInfo['workflow_columnname'] = $name;
                                    $fieldModel->setFieldInfo($fieldInfo);
                                }

                                $fieldModel->set('workflow_fieldEditable', $fieldModel->isEditable());

                                if (!$field->isEditable() || 'owner' === $type) {
                                    $fieldModel->set('workflow_fieldEditable', false);
                                }

                                $values[$field->get('label')][$name] = clone $fieldModel;
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
        /** @var Vtiger_Module_Model $moduleModel */
        $blockModelList = $moduleModel->getBlocks();

        unset($blockModelList['LBL_ITEM_DETAILS']);

        foreach ($blockModelList as $blockLabel => $blockModel) {
            $fieldModelList = $blockModel->getFields();

            if (!empty ($fieldModelList)) {
                foreach ($fieldModelList as $fieldName => $fieldModel) {
                    if ($fieldModel->isViewable()) {
                        if (in_array($fieldModel->getDisplayType(), [6, 3]) && in_array($moduleModel->getName(), array('Calendar', 'Events')) && 'modifiedby' !== $fieldName) {
                            continue;
                        }

                        if (!empty($recordId)) {
                            $fieldValueType = $recordModel->getFieldFilterValueType($fieldName);
                            $fieldInfo = $fieldModel->getFieldInfo();
                            $fieldInfo['workflow_valuetype'] = $fieldValueType;
                            $fieldInfo['workflow_columnname'] = $fieldName;
                            $fieldModel->setFieldInfo($fieldInfo);
                        }

                        $fieldModel->set('workflow_columnname', $fieldName)->set('workflow_columnlabel', vtranslate($fieldModel->get('label'), $moduleModel->getName()));
                        $fieldModel->set('workflow_sourcemodule_field', true);
                        $fieldModel->set('workflow_fieldEditable', $fieldModel->isEditable());
                        $values[$blockLabel][$fieldName] = clone $fieldModel;
                    }
                }
            }
        }
    }

    /**
     * @param $values
     */
    public function assignUserFields(&$values)
    {
        $qualifiedModule = 'Settings:ITS4YouProcessFlow';
        $userInfoLabel = vtranslate('LBL_USER_INFO', $qualifiedModule);
        $loggedUserInfoLabel = vtranslate('LBL_LOGGED_USER_INFO', $qualifiedModule);
        $userModuleModel = Vtiger_Module_Model::getInstance('Users');
        $userFieldNames = ['department', 'its4you_partneradmin', 'roleid', 'is_admin'];

        foreach ($userFieldNames as $field) {
            $fieldModel = Vtiger_Field_Model::getInstance($field, $userModuleModel);

            if ($fieldModel) {
                $fieldModel1 = clone $fieldModel;
                $fieldModel1->set('table', 'pf.its4you_assigned_u');
                $fieldModel1->set('workflow_columnname', 'its4you_assigned_u:' . $field);
                $values[$userInfoLabel]['its4you_assigned_u_' . $field] = $fieldModel1;

                $fieldModel2 = clone $fieldModel;
                $fieldModel2->set('table', 'pf.its4you_logged_u');
                $fieldModel2->set('workflow_columnname', 'its4you_logged_u:' . $field);
                $values[$loggedUserInfoLabel]['its4you_logged_u_' . $field] = $fieldModel2;
            }
        }
    }

    public function getWorkFlowModel()
    {
        return $this->workFlowModel;
    }

    /**
     * Function returns all the date time fields for the workflow record structure
     * @return type
     */
    public function getAllDateTimeFields()
    {
        $fieldTypes = array('date', 'datetime');
        return $this->getFieldsByType($fieldTypes);
    }

    public function getNameFields()
    {
        $moduleModel = $this->getModule();
        $nameFieldsList[$moduleModel->getName()] = $moduleModel->getNameFields();

        $fields = $moduleModel->getFieldsByType(array('reference', 'owner', 'multireference'));
        foreach ($fields as $parentFieldName => $field) {
            $type = $field->getFieldDataType();
            $referenceModules = $field->getReferenceList();
            if ($type == 'owner') {
                $referenceModules = array('Users');
            }
            foreach ($referenceModules as $refModule) {
                $moduleModel = Vtiger_Module_Model::getInstance($refModule);
                $nameFieldsList[$refModule] = $moduleModel->getNameFields();
            }
        }

        $nameFields = array();
        $recordStructure = $this->getStructure();
        foreach ($nameFieldsList as $moduleName => $fieldNamesList) {
            foreach ($fieldNamesList as $fieldName) {
                foreach ($recordStructure as $block => $fields) {
                    foreach ($fields as $metaKey => $field) {
                        if ($fieldName === $field->get('name')) {
                            $nameFields[$metaKey] = $field;
                        }
                    }
                }
            }
        }
        return $nameFields;
    }
}