<?php
/* * *******************************************************************************
 * The content of this file is subject to the ListView Colors 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

/*
 * Workflow Record Model Class
 */

class Settings_ITS4YouListViewColors_Record_Model extends Settings_Vtiger_Record_Model
{

    public function getId()
    {
        return $this->get('lvcid');
    }

    public function getName()
    {
        return $this->get('name');
    }

    public function get($key)
    {
        return parent::get($key);
    }

    public function getDetailViewUrl()
    {
        return 'index.php?module=ITS4YouListViewColors&parent=Settings&view=Detail&record=' . $this->getId();
    }

    public function getEditViewUrl()
    {
        return 'index.php?module=ITS4YouListViewColors&parent=Settings&view=Edit&record=' . $this->getId();
    }

    public function getTasksListUrl()
    {
        return 'index.php?module=ITS4YouListViewColors&parent=Settings&view=TasksList&record=' . $this->getId();
    }

    public function getAddTaskUrl()
    {
        return 'index.php?module=ITS4YouListViewColors&parent=Settings&view=EditTask&for_workflow=' . $this->getId();
    }

    public function save()
    {
        $adb = PearDatabase::getInstance();

        $name = $this->get('name');
        $color = $this->get('color');
        $coloring_type = $this->get('coloring_type');
        $record_status = $this->get('record_status');
        $field_name = $this->get('field_name');
        $description = $this->get('description');
        $record_colors = json_encode($this->get('record_colors'));
        $lvcId = $this->getId();

        if (empty($lvcId)) {
            $lvcId = $adb->getUniqueID('its4you_lvc');
            $params = array($lvcId, $name, $description, $color, $coloring_type, $field_name, $record_status, $record_colors);
            $sql = 'INSERT INTO its4you_lvc (lvcid,name,description,color,coloring_type, field_name, record_status, record_colors) VALUES (' . generateQuestionMarks($params) . ')';
        } else {
            $sql = 'UPDATE its4you_lvc SET name=?, description=?, color=?, coloring_type=?, field_name=?, record_status=?, record_colors=? WHERE lvcid=?';
            $params = array($name, $description, $color, $coloring_type, $field_name, $record_status, $record_colors, $lvcId);
        }

        $adb->pquery($sql, $params);
        $this->set('lvcid', $lvcId);

        $parentId = $this->get('parentid');

        if ('' != $parentId) {
            $parentModule = $this->get('parentmodule');
            $ifType = $this->get('parenttype');

            if (empty($parentId) && !empty($parentModule)) {
                $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getDefaultInstance($parentModule);
            } else {
                $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($parentId);
            }

            $recordModel->addRelatedAction($this->getProcessFlowData($ifType));
        }
    }

    public function delete()
    {
        $adb = PearDatabase::getInstance();
        $lvcId = $this->getId();
        $adb->pquery('UPDATE its4you_lvc SET deleted = ? WHERE lvcid=?', array('1', $lvcId));
        $adb->pquery('UPDATE its4you_processflowrel SET deleted = ? WHERE parent_module = ? AND parent_id = ?', array('1', 'ITS4YouListViewColors', $lvcId));
    }

    /**
     * Function to get the list view actions for the record
     * @return <Array> - Associate array of Vtiger_Link_Model instances
     */
    public function getRecordLinks()
    {

        $links = array();

        $recordLinks = array(
            array(
                'linktype' => 'LISTVIEWRECORD',
                'linklabel' => 'LBL_EDIT_RECORD',
                'linkurl' => $this->getEditViewUrl(),
                'linkicon' => 'icon-pencil'
            ),
            array(
                'linktype' => 'LISTVIEWRECORD',
                'linklabel' => 'LBL_DELETE_RECORD',
                'linkurl' => 'javascript:Vtiger_List_Js.deleteRecord(' . $this->getId() . ');',
                'linkicon' => 'icon-trash'
            )
        );
        foreach ($recordLinks as $recordLink) {
            $links[] = Vtiger_Link_Model::getInstanceFromValues($recordLink);
        }

        return $links;
    }

    /**
     * @throws Exception
     */
    public static function getInstance($id = 0)
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT * FROM its4you_lvc WHERE lvcid=?', array($id));
        $data = $adb->raw_query_result_rowdata($result, 0);

        return self::getInstanceFromData($data);
    }

    public static function getCleanInstance()
    {

        return self::getInstanceFromData(array());
    }

    public static function getInstanceFromData($data)
    {
        $recordModel = new self();

        foreach (ITS4YouListViewColors_Record_Model::COLUMNS as $column) {
            $recordModel->set($column, $data[$column]);
        }

        return $recordModel;
    }

    public function getProcessFlowData($iftype = '')
    {

        $id = $this->getId();
        $module = "ITS4YouListViewColors";

        return array("id" => $id, "module" => $module, "action" => "SetColor", "iftype" => $iftype);
    }

    public function isSelectedField($field)
    {
        return $this->getFieldName($field) == $this->get('field_name');
    }

    /**
     * @param Vtiger_Field_Model $field
     * @return string
     */
    public function getFieldName($field)
    {
        return $field->getModuleName() . '::' . $field->getName();
    }

    /**
     * @throws Exception
     */
    public function getFieldLabel()
    {
        list($moduleName, $fieldName) = explode('::', $this->get('field_name'));

        if(!empty($moduleName) && !empty($fieldName)) {
            $module = Vtiger_Module_Model::getInstance($moduleName);
            $field = Vtiger_Field_Model::getInstance($fieldName, $module);
            $moduleLabel = vtranslate($moduleName, $moduleName);

            return $field ? '('. $moduleLabel . ') ' . vtranslate($field->get('label'), $moduleName) : '';
        }

        return '';
    }

    public function getRecordColors($name = false)
    {
        $colors = (array)json_decode(htmlspecialchars_decode($this->get('record_colors')));

        if ($name) {
            return $colors[$name];
        }

        return $colors;
    }

    public function getMode()
    {
        return !$this->isEmpty('record_status') ? 'Record' : 'List';
    }
}
