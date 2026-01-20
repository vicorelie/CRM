<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouProcessFlow_showFieldsRecordStructure_Model extends Vtiger_RecordStructure_Model
{

    public $showFields = array();
    public $showManFields = array();
    public $hideManFields = array();
    public $skipFieldDataType = array("image");

    /**
     * Function to get the values in stuctured format
     * @return <array> - values in structure array('block'=>array(fieldinfo));
     */

    public function setFields($showFields, $showManFields, $hideManFields)
    {

        $this->showFields = $showFields;
        $this->showManFields = $showManFields;
        $this->hideManFields = $hideManFields;
    }

    public function getStructure($moduleModel)
    {
        if (!empty($this->structuredValues)) {
            return $this->structuredValues;
        }

        $values = array();

        $blockModelList = $moduleModel->getBlocks();
        foreach ($blockModelList as $blockLabel => $blockModel) {

            $fieldModelList = $this->getShowFields($blockModel);
            foreach ($fieldModelList as $fieldName => $fieldModel) {
                $values[$blockLabel][$fieldName] = $fieldModel;
            }
        }
        $this->structuredValues = $values;
        return $values;
    }

    public function getShowFields($blockModel)
    {
        $fieldList = $blockModel->getFields();
        $quickCreateFieldList = array();
        foreach ($fieldList as $fieldName => $fieldModel) {

            $field_data_type = $fieldModel->getFieldDataType();
            if (in_array($fieldName, $this->showFields) && !in_array($field_data_type, $this->skipFieldDataType)) {
                $showFieldList[$fieldName] = $fieldModel;
            }
        }
        return $showFieldList;
    }
}