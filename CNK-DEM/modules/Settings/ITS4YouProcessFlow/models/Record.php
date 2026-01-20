<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

require_once 'modules/com_vtiger_workflow/include.inc';
require_once 'modules/com_vtiger_workflow/expression_engine/VTExpressionsManager.inc';

class Settings_ITS4YouProcessFlow_Record_Model extends Settings_Vtiger_Record_Model
{

    public $skip_add_actions = false;

    public static function getCleanInstance($moduleName)
    {

        return self::getInstanceFromData(array("status" => "1", "module_name" => $moduleName, "if_type" => "0"));
    }

    public static function getInstanceFromData($Data)
    {
        $recordModel = new self();

        $Columns = array("pfid", "pfname", "description", "module_name", "conditions", "status", "parent_id", "if_type");

        foreach ($Columns AS $column) {
            $value = ($Data[$column] != "" ? $Data[$column] : "");

            if ($column == "pfname") {
                $column = "name";
            } elseif ($column == "conditions" && $value != "") {
                $value = Zend_Json::decode($value);
            }

            $recordModel->set($column, $value);
        }

        $recordModel->setModule($recordModel->get('module_name'));
        return $recordModel;
    }

    public function setModule($moduleName)
    {
        $this->module = Vtiger_Module_Model::getInstance($moduleName);
        return $this;
    }

    /**
     * function to delete the update workflow related to a field
     * @param type $moduleName
     * @param type $fieldName
     */
    public static function deleteUpadateFieldWorkflow($moduleName, $fieldName)
    {
        $ids = Settings_ITS4YouProcessFlow_Record_Model::getUpdateFieldTaskIdsForModule($moduleName, $fieldName);
        if ($ids) {
            foreach ($ids as $id) {
                $taskModel = Settings_ITS4YouProcessFlow_TaskRecord_Model::getInstance($id);
                $taskTypeModel = $taskModel->getTaskType();
                if ($taskTypeModel->get('tasktypename') == 'VTUpdateFieldsTask') {
                    $taskObject = $taskModel->getTaskObject();
                    $fieldMapping = Zend_Json::decode($taskObject->field_value_mapping);
                    foreach ($fieldMapping as $key => $field) {
                        if ($field['fieldname'] == $fieldName || strpos($field['value'], $fieldName) !== false) {
                            unset($fieldMapping[$key]);
                        }
                    }
                    $taskObject->field_value_mapping = Zend_Json::encode($fieldMapping);
                    $taskModel->setTaskObject($taskObject);
                    $taskModel->save();
                }
            }
        }
    }

    /**
     * Function to get the update field task ids from modulename and fieldname
     * @param type $moduleName
     * @param type $fieldName
     * @return $ids
     */
    public static function getUpdateFieldTaskIdsForModule($moduleName, $fieldName)
    {
        $ids = array();
        $db = PearDatabase::getInstance();
        $sql = 'SELECT * FROM com_vtiger_workflows
				INNER JOIN com_vtiger_workflowtasks ON com_vtiger_workflows.workflow_id = com_vtiger_workflowtasks.workflow_id
				WHERE module_name = ?
				AND task LIKE ? 
				AND task LIKE ? ';
        $result = $db->pquery($sql, array($moduleName, '%VTUpdateFieldsTask%', "%" . $fieldName . "%"));
        $count = $db->num_rows($result);
        if ($count > 0) {
            for ($i = 0; $i < $count; $i++) {
                $ids[] = $db->query_result($result, $i, 'task_id');
            }
            return $ids;
        }
        return false;
    }

    public static function updateProcessFlowStatus($record, $status)
    {
        $db = PearDatabase::getInstance();
        $sql = 'UPDATE its4you_processflow SET status = ? WHERE pfid = ?';
        $db->pquery($sql, array($status, $record));
    }

    public function setEntityData($entityData)
    {
        return $this->set('entity_data', $entityData);
    }

    public function setRequestData(Vtiger_Request $request)
    {
        return $this->set('request_data', $request);
    }

    public function getDeleteUrl()
    {
        return 'index.php?module=ITS4YouProcessFlow&parent=Settings&action=DeleteAjax&record=' . $this->getId();
    }

    public function getId()
    {
        return $this->get('pfid');
    }

    public function get($key)
    {
        return parent::get($key);
    }

    public function getWorkflowObject()
    {
        return $this->workflow_object;
    }

    public function save()
    {
        $adb = PearDatabase::getInstance();

        $name = $this->get('name');
        $description = $this->get('summary');
        $conditions = Zend_Json::encode($this->get('conditions'));
        $moduleName = $this->get('module_name');
        $status = $this->get('status');
        $parentId = $this->get('parent_id');
        if ($parentId == "") {
            $parentId = "0";
        }

        $if_type = $this->get('if_type');

        $pfId = $this->getId();

        if (empty($pfId)) {
            $pfId = $adb->getUniqueID("its4you_processflow");

            $adb->pquery("insert into its4you_processflow (pfid,pfname,description,module_name,conditions,status,parent_id,if_type) values (?,?,?,?,?,?,?,?)",
                array($pfId, $name, $description, $moduleName, $conditions, $status, $parentId, $if_type));

        } else {
            $adb->pquery("update its4you_processflow set pfname = ?, description = ?, module_name = ?, conditions = ?, status =? where pfid=?",
                array($name, $description, $moduleName, $conditions, $status, $pfId));
        }

        $this->set('pfid', $pfId);
    }

    public function delete()
    {
        $pfId = $this->getId();
        $adb = PearDatabase::getInstance();
        $adb->pquery("update its4you_processflow set deleted =? where pfid=?", array("1", $pfId));
    }

    /**
     * Functions returns the Custom Entity Methods that are supported for a module
     * @return <Array>
     */
    public function getEntityMethods()
    {
        $db = PearDatabase::getInstance();
        $emm = new VTEntityMethodManager($db);
        $methodNames = $emm->methodsForModule($this->get('module_name'));
        return $methodNames;
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

    public function getEditViewUrl()
    {
        return 'index.php?module=ITS4YouProcessFlow&parent=Settings&view=Edit&record=' . $this->getId();
    }

    /**
     * Functions transforms workflow filter to advanced filter
     * @return <Array>
     */
    public function transformToAdvancedFilterCondition()
    {
        $conditions = $this->get('conditions');
        $transformedConditions = array();

        if (!empty($conditions)) {
            foreach ($conditions as $index => $info) {
                $columnName = $info['fieldname'];
                $value = $info['value'];
                // To convert date value from yyyy-mm-dd format to user format
                $valueArray = explode(',', $value);
                $isDateValue = false;
                for ($i = 0; $i < ITS4YouProcessFlow_Utils_Helper::count($valueArray); $i++) {
                    if (Vtiger_Functions::isDateValue($valueArray[$i])) {
                        $isDateValue = true;
                        $valueArray[$i] = DateTimeField::convertToUserFormat($valueArray[$i]);
                    }
                }
                if ($isDateValue) {
                    $value = implode(',', $valueArray);
                }
                // End
                if ($columnName == 'filelocationtype') {
                    $value = ($value == 'I') ? vtranslate('LBL_INTERNAL', 'Documents') : vtranslate('LBL_EXTERNAL', 'Documents');
                } elseif ($columnName == 'folderid') {
                    $folderInstance = Documents_Folder_Model::getInstanceById($value);
                    $value = $folderInstance->getName();
                }
                if (!($info['groupid'])) {
                    $firstGroup[] = array(
                        'columnname' => $columnName,
                        'comparator' => $info['operation'],
                        'value' => $value,
                        'column_condition' => $info['joincondition'],
                        'valuetype' => $info['valuetype'],
                        'groupid' => $info['groupid']
                    );
                } else {
                    $secondGroup[] = array(
                        'columnname' => $columnName,
                        'comparator' => $info['operation'],
                        'value' => $value,
                        'column_condition' => $info['joincondition'],
                        'valuetype' => $info['valuetype'],
                        'groupid' => $info['groupid']
                    );
                }
            }
        }
        $transformedConditions[1] = array('columns' => $firstGroup);
        $transformedConditions[2] = array('columns' => $secondGroup);
        return $transformedConditions;
    }

    /**
     * Function returns valuetype of the field filter
     * @return <String>
     */
    public function getFieldFilterValueType($fieldname)
    {
        $conditions = $this->get('conditions');
        if (!empty($conditions) && is_array($conditions)) {
            foreach ($conditions as $filter) {
                if ($fieldname == $filter['fieldname']) {
                    return $filter['valuetype'];
                }
            }
        }
        return false;
    }

    /**
     * Function transforms Advance filter to workflow conditions
     */
    public function transformAdvanceFilterToPFFilter()
    {
        $conditions = $this->get('conditions');
        $pfCondition = array();

        if (!empty($conditions)) {
            foreach ($conditions as $index => $condition) {
                $columns = $condition['columns'];
                if ($index == '1' && empty($columns)) {
                    $pfCondition[] = array(
                        'fieldname' => '',
                        'operation' => '',
                        'value' => '',
                        'valuetype' => '',
                        'joincondition' => '',
                        'groupid' => '0'
                    );
                }
                if (!empty($columns) && is_array($columns)) {
                    foreach ($columns as $column) {
                        $pfCondition[] = array(
                            'fieldname' => $column['columnname'],
                            'operation' => $column['comparator'],
                            'value' => $column['value'],
                            'valuetype' => $column['valuetype'],
                            'joincondition' => $column['column_condition'],
                            'groupjoin' => $condition['condition'],
                            'groupid' => $column['groupid']
                        );
                    }
                }
            }
        }
        $this->set('conditions', $pfCondition);
    }

    /**
     * Function returns all the related modules for workflows create entity task
     * @return <JSON>
     */
    public function getDependentModules()
    {
        $modulesList = Settings_LayoutEditor_Module_Model::getEntityModulesList();
        $primaryModule = $this->getModule();

        if ($primaryModule->isCommentEnabled()) {
            $modulesList['ModComments'] = 'ModComments';
        }
        $createModuleModels = array();
        // List of modules which will not be supported by 'Create Entity' workflow task
        $filterModules = array('Invoice', 'Quotes', 'SalesOrder', 'PurchaseOrder', 'Emails', 'Calendar', 'Events');

        foreach ($modulesList as $moduleName => $translatedModuleName) {
            $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
            if (in_array($moduleName, $filterModules)) {
                continue;
            }
            $createModuleModels[$moduleName] = $moduleModel;
        }
        return $createModuleModels;
    }

    public function getModule()
    {
        return $this->module;
    }

    /**
     * Function to get reference field name
     * @param <String> $relatedModule
     * @return <String> fieldname
     */
    public function getReferenceFieldName($relatedModule)
    {
        if ($relatedModule) {
            $db = PearDatabase::getInstance();

            $relatedModuleModel = Vtiger_Module_Model::getInstance($relatedModule);
            if ($relatedModuleModel) {
                $referenceFieldsList = $relatedModuleModel->getFieldsByType('reference');

                foreach ($referenceFieldsList as $fieldName => $fieldModel) {
                    if (in_array($this->getModule()->getName(), $fieldModel->getReferenceList())) {
                        return $fieldName;
                    }
                }
            }
        }
        return false;
    }

    public function getConditonDisplayValue()
    {

        $pfCondition = $this->get('conditions');
        $moduleName = $this->get('module_name');
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $conditionList = array();
        if (is_array($pfCondition)) {
            for ($k = 0; $k < (ITS4YouProcessFlow_Utils_Helper::count($pfCondition)); ++$k) {
                $fieldName = $pfCondition[$k]['fieldname'];
                preg_match('/\((\w+) : \(([_\w]+)\) (\w+)\)/', $fieldName, $matches);

                if (ITS4YouProcessFlow_Utils_Helper::count($matches) == 0) {
                    $fieldModel = Vtiger_Field_Model::getInstance($fieldName, $moduleModel);
                    if ($fieldModel) {
                        $fieldLabel = vtranslate($fieldModel->get('label'), $moduleName);
                    } else {
                        $fieldLabel = $fieldName;
                    }
                } else {
                    list($full, $referenceField, $referenceModule, $fieldName) = $matches;
                    $referenceModuleModel = Vtiger_Module_Model::getInstance($referenceModule);
                    $fieldModel = Vtiger_Field_Model::getInstance($fieldName, $referenceModuleModel);
                    $referenceFieldModel = Vtiger_Field_Model::getInstance($referenceField, $moduleModel);
                    if ($fieldModel) {
                        $translatedReferenceModule = vtranslate($referenceModule, $referenceModule);
                        $referenceFieldLabel = vtranslate($referenceFieldModel->get('label'), $moduleName);
                        $fieldLabel = vtranslate($fieldModel->get('label'), $referenceModule);
                        $fieldLabel = "(" . $translatedReferenceModule . ") " . $referenceFieldLabel . " - " . $fieldLabel;
                    } else {
                        $fieldLabel = $fieldName;
                    }
                }
                $value = $pfCondition[$k]['value'];
                $operation = $pfCondition[$k]['operation'];
                if ($pfCondition[$k]['groupjoin'] == 'and') {
                    $conditionGroup = 'All';
                } else {
                    $conditionGroup = 'Any';
                }

                $fieldDataType = '';
                if ($fieldModel) {
                    $fieldDataType = $fieldModel->getFieldDataType();
                }
                if ($value == 'true:boolean' || ($fieldModel && $fieldDataType == 'boolean' && $value == '1')) {
                    $value = 'LBL_ENABLED';
                }
                if ($value == 'false:boolean' || ($fieldModel && $fieldDataType == 'boolean' && $value == '0')) {
                    $value = 'LBL_DISABLED';
                }
                if ($fieldModel && (($fieldModel->column === 'smownerid') || (($fieldModel->column === 'smgroupid')))) {
                    if (vtws_getOwnerType($value) == 'Users') {
                        $value = getUserFullName($value);
                    } else {
                        $groupNameList = getGroupName($value);
                        $value = $groupNameList[0];
                    }
                }
                if ($value) {
                    if ($fieldModel && in_array('Currency', $fieldModel->getReferenceList())) {
                        $currencyNamewithSymbol = getCurrencyName($value);
                        $currencyName = explode(':', $currencyNamewithSymbol);
                        $value = $currencyName[0];
                    }
                    if ($fieldModel && (in_array($fieldDataType, array('picklist', 'multipicklist')))) {
                        $picklistValues = explode(',', $value);
                        if (ITS4YouProcessFlow_Utils_Helper::count($picklistValues) > 1) {
                            $translatedValues = array();
                            foreach ($picklistValues as $selectedValue) {
                                array_push($translatedValues, vtranslate($selectedValue, $moduleName));
                            }
                            $value = implode(',', $translatedValues);
                        } else {
                            $value = vtranslate($value, $moduleName);
                        }
                    }
                }
                if ($fieldLabel == '_VT_add_comment') {
                    $fieldLabel = 'Comment';
                }
                $conditionList[$conditionGroup][] = $fieldLabel . ' ' . vtranslate($operation, $moduleName) . ' ' . vtranslate($value, $moduleName);
            }
        }

        return $conditionList;
    }

    public function getActionsDisplayValue()
    {
        return array();
    }

    public function addRelatedAction($RelationData)
    {

        $adb = PearDatabase::getInstance();
        $pfid = $this->getId();

        $parent_id = $RelationData["id"];
        $parent_module = $RelationData["module"];

        $if_type = '0';
        if (isset($RelationData["iftype"])) {
            $if_type = $RelationData["iftype"];
        }


        $info = Zend_Json::encode($RelationData);

        $relId = $adb->getUniqueID("its4you_processflowrel");

        $parentModule = Vtiger_Module_Model::getInstance($parent_module);
        $modelClassName = Vtiger_Loader::getComponentClassName('Model', 'Record', $parent_module);
        $recordModel = new $modelClassName();

        if (method_exists($recordModel, "getProcessFlowRelationData")) {
            $recordModel->set('id', $parent_id)->setModuleFromInstance($parentModule);
            $RelationData = $recordModel->getProcessFlowRelationData($RelationData);
        }

        $source_module_name = $this->get('module_name');

        $for_list = $for_detail = $for_edit = "0";
        if (isset($RelationData["for_list"])) {
            $for_list = $RelationData["for_list"];
        }
        if (isset($RelationData["for_detail"])) {
            $for_detail = $RelationData["for_detail"];
        }
        if (isset($RelationData["for_edit"])) {
            $for_edit = $RelationData["for_edit"];
        }

        $methodName = isset($RelationData['method_name']) ? $RelationData['method_name'] : 'getProcessFlowActionData';

        $adb->pquery("insert into its4you_processflowrel (id, pfid,	parent_id, parent_module, info,	status, for_list, for_detail, for_edit, source_module, if_type, method_name) values (?,?,?,?,?,?,?,?,?,?,?,?)", array($relId, $pfid, $parent_id, $parent_module, $info, "0", $for_list, $for_detail, $for_edit, $source_module_name, $if_type, $methodName));

    }

    /**
     * @param $ITS4YouProcessFlowProcessRecordModel
     * @param $ITS4YouProcessFlowIndexAjaxActionModel
     * @param string $if_type
     * @param bool $DisplayConditionsPermissions
     * @return false
     * @throws AppException
     */
    public function getExecuteActionsRecords(&$ITS4YouProcessFlowProcessRecordModel, &$ITS4YouProcessFlowIndexAjaxActionModel, $if_type = "yes", $DisplayConditionsPermissions = true)
    {

        $for_view = $ITS4YouProcessFlowIndexAjaxActionModel->for_view;
        $for_module = $ITS4YouProcessFlowIndexAjaxActionModel->for_module;

        if ((($DisplayConditionsPermissions && $if_type == "yes") || (!$DisplayConditionsPermissions && $if_type == "no")) && !$this->skip_add_actions) {
            $add_action = true;
        } else {
            $add_action = false;

            if (!$ITS4YouProcessFlowIndexAjaxActionModel->get_info) {
                return false;
            }
        }

        $requestData = $this->getRequestData();
        $DefaultRows = array();
        $Rows = $this->getQueryResultRows("execute", $for_view, $if_type);

        if ($requestData->has('debug') && !$requestData->isEmpty('debug')) {
            echo "getExecuteActionsRecords <br>";
        }

        if (empty($this->getId())) {
            $allModuleModules = Vtiger_Module_Model::getAll(array(0), Settings_Profiles_Module_Model::getNonVisibleModulesList());
            if (ITS4YouProcessFlow_Utils_Helper::count($allModuleModules) > 0) {
                foreach ($allModuleModules as $tabId => $moduleModel) {
                    if ($moduleModel->isActive()) {
                        $DefaultRows[] = array("parent_module" => $moduleModel->getName(), "method_name" => 'getDefaultProcessFlowActionData', 'parent_id' => '0', 'info' => '');
                    }
                }

                if (ITS4YouProcessFlow_Utils_Helper::count($DefaultRows) > 0) {
                    $Rows = array_merge($DefaultRows, $Rows);
                }
            }
        }

        if ($requestData->has('debug') && !$requestData->isEmpty('debug')) {
            var_dump($Rows);
        }


        if (ITS4YouProcessFlow_Utils_Helper::count($Rows) > 0) {
            foreach ($Rows AS $row) {

                $parentModuleName = $row["parent_module"];
                if (vtlib_isModuleActive($parentModuleName)) {
                    $parentModule = Vtiger_Module_Model::getInstance($parentModuleName);
                    $entityData = $this->getEntityData();

                    try {
                        $modelClassName = Vtiger_Loader::getComponentClassName('Model', 'Record', $parentModuleName);
                        if (method_exists($modelClassName, $row['method_name'])) {
                            $recordModel = new $modelClassName();
                            $recordModel->set('id', $row["parent_id"])->set('for_view', $for_view)->set('for_module', $for_module)->set('entity_data', $entityData)->set('request_data', $requestData)->setModuleFromInstance($parentModule);

                            $row["info"] = Zend_Json::decode(decode_html($row['info']));

                            if ($add_action) {
                                $recordModel->{$row['method_name']}($ITS4YouProcessFlowProcessRecordModel, $row, $for_view);
                            }

                            $ITS4YouProcessFlowIndexAjaxActionModel->setInfoAction($this->getId(), $if_type, $recordModel->getProcessFlowRowData());
                        }
                    } catch (Exception $e) {
                        //throw new AppException($e);
                    }
                }
            }
        }
    }

    public function getRequestData()
    {
        return $this->get('request_data');
    }

    public function getQueryResultRows($mode = "detail", $type = "", $if_type = "")
    {
        $Rows = array();
        $adb = PearDatabase::getInstance();
        $pfid = $this->getId();

        $query = 'SELECT its4you_processflowrel.* FROM its4you_processflowrel WHERE deleted = ? AND pfid = ? ';
        $attr = array('0', $pfid);
        if ($mode == "execute") {
            $query .= ' AND status = ? ';
            $attr[] = '0';
        }
        if ($type != "") {
            if (in_array(strtolower($type), array("list", "detail", "edit"))) {
                //$query .= ' AND for_'.strtolower($type).' = ? ';
                //$attr[] = '1';
            }
        }

        if (!empty($if_type)) {
            $query .= ' AND if_type = ? ';
            $attr[] = ($if_type == "no" ? "1" : "0");
        }

        if (empty($pfid)) {
            $query .= ' AND source_module = ? ';
            $attr[] = $this->get('module_name');
        }

        $result = $adb->pquery($query, $attr);
        while ($row = $adb->fetchByAssoc($result)) {
            $Rows[] = $row;
        }
        return $Rows;
    }

    public function getEntityData()
    {
        return $this->get('entity_data');
    }

    public function getActionsRecords($mode = "detail", $type = "")
    {

        $Rows = $this->getQueryResultRows("detail", $type);

        foreach ($Rows AS $row) {

            $rowId = $row["id"];
            $parentId = $row["parent_id"];
            $if_type = ($row["if_type"] == 0 ? "yes" : "no");

            $parentModuleName = $row["parent_module"];
            if (vtlib_isModuleActive($parentModuleName)) {
                $parentModule = Vtiger_Module_Model::getInstance($parentModuleName);
                $entityData = $this->getEntityData();

                $requestData = $this->getRequestData();

                $modelClassName = Vtiger_Loader::getComponentClassName('Model', 'Record', $parentModuleName);
                $recordModel = new $modelClassName();
                $recordModel->set('id', $parentId)->set('entity_data', $entityData)->set('request_data', $requestData)->setModuleFromInstance($parentModule);

                $row["info"] = Zend_Json::decode(decode_html($row['info']));

                if (method_exists($recordModel, "isDeleted")) {
                    if ($recordModel->isDeleted(0) == "1") {
                        continue;
                    }
                }

                if (method_exists($recordModel, "getProcessFlowRowData")) {
                    $Action_Data = $recordModel->getProcessFlowRowData($row, $type);
                } else {
                    $recordName = getEntityName($parentModuleName, $parentId);
                    $recordType = vtranslate($parentModule->getName(), $parentModuleName);

                    $Action_Data = $row;
                    $Action_Data["name"] = $recordName[$parentId];
                    $Action_Data["type"] = $recordType;

                    if ($type != "execute") {
                        $Action_Data["statuschange_link"] = Settings_ITS4YouProcessFlow_Module_Model::getRelatedActionStatusChangeUrl($row);
                        $Action_Data["delete_link"] = Settings_ITS4YouProcessFlow_Module_Model::getRelatedActionDeleteUrl($row);
                        $Action_Data['edit_link'] = Settings_ITS4YouProcessFlow_Module_Model::getRelatedActionEditUrl($row);
                    }
                }
                $Actions[$if_type][$rowId] = $Action_Data;
            }
        }

        return $Actions;
    }

    public function changeRelatedActionStatus($action_id, $status)
    {
        $adb = PearDatabase::getInstance();
        $pfid = $this->getId();

        $query = 'UPDATE its4you_processflowrel SET status = ? WHERE id = ? AND pfid = ? ';
        $adb->pquery($query, array(($status == "true" ? 0 : 1), $action_id, $pfid));
    }

    public function deleteRelatedAction($action_id)
    {
        $adb = PearDatabase::getInstance();
        $pfid = $this->getId();

        $query = 'UPDATE its4you_processflowrel SET deleted = ? WHERE id = ? AND pfid = ? ';
        $adb->pquery($query, array('1', $action_id, $pfid));
    }

    public function getCreateParentRecordUrl($recordModel)
    {
        $createUrl = $recordModel->getCreateRecordUrl();
        $createUrl .= "&parent=Settings";
        $createUrl .= "&parentid=" . $this->getId();
        $createUrl .= "&parentmodule=" . $this->get('module_name');

        return $createUrl;
    }

    public function getSiteRoad($link = true)
    {
        $id = $this->getId();

        $parent_id = $this->get('parent_id');
        $siteRoad = "";
        $sourceModule = $this->get('module_name');

        if (!empty($parent_id)) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($parent_id);
        } else {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getDefaultInstance($sourceModule);
        }

        if (!empty($id)) {
            $siteRoad = $recordModel->getSiteRoad();
        }

        $record_name = $this->getName();

        $siteRoad .= "&nbsp;</span>";
        $siteRoad .= "<span class=\"fa fa-angle-right pull-left current-filter-name filter-name\" aria-hidden=\"true\"></span>";
        $siteRoad .= "<span class=\"current-filter-name filter-name pull-left\" title=\"" . $record_name . "\">&nbsp;";

        if ($link) {
            $record_link = $this->getDetailViewUrl();
            $record_name = "<a href='" . $record_link . "' >" . $record_name . "</a>";
        }

        $siteRoad .= $record_name;

        return $siteRoad;
    }

    public static function getInstance($id = 0)
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery("select *  from its4you_processflow where pfid=?", array($id));
        $data = $adb->raw_query_result_rowdata($result, 0);

        return self::getInstanceFromData($data);
    }

    public static function getDefaultInstance($moduleName)
    {

        return self::getInstanceFromData(array("pfid" => "0", "status" => "0", "module_name" => $moduleName));
    }

    public function getName()
    {

        if (empty($this->getId())) {
            return vtranslate($this->get('module_name'), $this->get('module_name'));
        } else {
            return $this->get('name');
        }
    }

    public function getDetailViewUrl()
    {

        $url = 'index.php?module=ITS4YouProcessFlow&parent=Settings&view=Detail';

        if (empty($this->getId())) {
            $url .= '&sourceModule=' . $this->get('module_name');
        } else {
            $url .= '&record=' . $this->getId();
        }

        return $url;
    }

    public function skipAddActions()
    {
        $this->skip_add_actions = true;
    }

    protected function setWorkflowObject($wf)
    {
        $this->workflow_object = $wf;
        return $this;
    }

    /**
     * @return array
     */
    public function getDateFilters()
    {
        $qualifiedModule = 'Settings:ITS4YouProcessFlow';
        $dateFilters = Vtiger_Field_Model::getDateFilterTypes();

        foreach ($dateFilters as $comparatorKey => $comparatorInfo) {
            $comparatorInfo['startdate'] = DateTimeField::convertToUserFormat($comparatorInfo['startdate']);
            $comparatorInfo['enddate'] = DateTimeField::convertToUserFormat($comparatorInfo['enddate']);
            $comparatorInfo['label'] = vtranslate($comparatorInfo['label'], $qualifiedModule);
            $dateFilters[$comparatorKey] = $comparatorInfo;
        }

        return $dateFilters;
    }
}
