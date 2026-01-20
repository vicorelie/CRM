<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

require_once 'include/Webservices/VtigerCRMActorMeta.php';
require_once "include/Webservices/VtigerActorOperation.php";
require_once "include/Webservices/LineItem/VtigerInventoryOperation.php";
require_once("include/events/include.inc");
require_once 'modules/com_vtiger_workflow/VTEntityCache.inc';
require_once 'data/CRMEntity.php';
require_once 'include/events/SqlResultIterator.inc';
require_once 'include/Webservices/LineItem/VtigerLineItemMeta.php';
require_once 'include/Webservices/Retrieve.php';
require_once 'include/Webservices/Update.php';
require_once 'include/Webservices/Utils.php';
require_once 'include/utils/InventoryUtils.php';

class ITS4YouProcessFlow_Display_Model extends Vtiger_Base_Model
{
    public function __construct()
    {
        $this->db = PearDatabase::getInstance();
    }

    public static function getInstance($moduleName, $viewId = '0', $New_Fields)
    {
        $db = PearDatabase::getInstance();
        $currentUser = vglobal('current_user');

        $modelClassName = Vtiger_Loader::getComponentClassName('Model', 'ListView', $moduleName);
        $instance = new $modelClassName();
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $queryGenerator = new QueryGenerator($moduleModel->get('name'), $currentUser);
        $customView = new CustomView();
        if (!empty($viewId) && $viewId != "0") {
            $queryGenerator->initForCustomViewById($viewId);
            $viewId = $customView->getViewId($moduleName);
        } else {
            $viewId = $customView->getViewId($moduleName);
            if (!empty($viewId) && $viewId != 0) {
                $queryGenerator->initForDefaultCustomView();
            } else {
                $entityInstance = CRMEntity::getInstance($moduleName);
                $listFields = $entityInstance->list_fields_name;
                $listFields[] = 'id';
                $queryGenerator->setFields($listFields);
            }
        }
        $controller = new ListViewController($db, $currentUser, $queryGenerator);

        if (count($New_Fields) > 0) {
            $Fields = $queryGenerator->getFields();

            foreach ($New_Fields AS $add_fieldname) {
                if (!in_array($add_fieldname, $Fields)) {
                    $Fields[] = $add_fieldname;
                }
            }
            $queryGenerator->setFields($Fields);
        }
        return $instance->set('module', $moduleModel)->set('query_generator', $queryGenerator)->set('listview_controller', $controller);
    }

    public function clearDebugText()
    {
        $this->debuq_text = array();
    }

    public function setDebugText($text)
    {
        $this->debuq_text[] = $text;
    }

    public function getDebugText()
    {
        return implode(" || ", $this->debuq_text);
    }

    public function CheckDisplayConditions($CompareData, $entityData, $formodule, $entityCache = false)
    {

        $v = true;

        if ($CompareData["conditions"] != "") {
            $Conditions = decode_html($CompareData["conditions"]);
            $ControlConditions = Zend_Json::decode($Conditions);

            $displayed = $CompareData["displayed"];
            if ($displayed == "1") {
                $v = false;
            }
            if (count($ControlConditions) > 0) {

                if (!$this->evaluate($Conditions, $entityData, $entityData->getId())) {
                    if ($displayed == "1") {
                        $v = true;
                    } else {
                        $v = false;
                    }
                }
            }
        }
        return $v;
    }

    /**
     * @param $condition
     * @param $entityData
     * @param $id
     * @return bool|mixed
     * @throws Exception
     */
    public function evaluate($condition, $entityData, $id)
    {
        $adb = PearDatabase::getInstance();
        $current_user = Users_Record_Model::getCurrentUserModel();
        $expr = Zend_Json::decode($condition);
        $finalResult = true;

        if (is_array($expr)) {
            $data = $entityData->getData();
            $groupResults = array();
            $expressionResults = array();
            $i = 0;

            foreach ($expr as $cond) {
                $conditionGroup = $cond['groupid'];
                if (empty($conditionGroup)) {
                    $conditionGroup = 0;
                }
                preg_match('/(\w+) : \((\w+)\) (\w+)/', $cond['fieldname'], $matches);
                if (count($matches) == 0) {
                    $expressionResults[$conditionGroup][$i]['result'] = $this->checkCondition($entityData, $cond);
                } else {
                    list($full, $referenceField, $referenceModule, $fieldname) = $matches;
                    $referenceFieldId = $data[$referenceField];

                    if (in_array($entityData->getModuleName(), getInventoryModules())) {
                        if (in_array($referenceModule, array('Products', 'Services'))) {
                            $referenceFieldId = array();
                            foreach ($data['LineItems'] as $key => $value) {
                                $referenceFieldId[] = $value[$referenceField];
                            }
                        }
                    }
                    if (!empty($referenceFieldId)) {
                        if (is_array($referenceFieldId)) {
                            $checkResult = false;
                            foreach ($referenceFieldId as $key => $value) {
                                $entity = VTEntityData::fromEntityId($adb, $data[$referenceField]);

                                if ($entity->getModuleName() == $referenceModule) {
                                    $cond['fieldname'] = $fieldname;
                                    $returnValue = $this->checkCondition($entity, $cond, $entityData);
                                    if ($returnValue) {
                                        $checkResult = $returnValue;
                                    }
                                }
                            }
                            $expressionResults[$conditionGroup][$i]['result'] = $checkResult;
                        } else {
                            $entity = VTEntityData::fromEntityId($adb, $data[$referenceField]);

                            if ($entity->getModuleName() == $referenceModule) {
                                $cond['fieldname'] = $fieldname;
                                $expressionResults[$conditionGroup][$i]['result'] = $this->checkCondition($entity, $cond, $entityData);
                            } else {
                                $expressionResults[$conditionGroup][$i]['result'] = false;
                            }
                        }
                    } elseif ($referenceFieldId == '' && $cond['operation'] == 'is empty') {
                        $expressionResults[$conditionGroup][$i]['result'] = true;
                    } else {
                        $expressionResults[$conditionGroup][$i]['result'] = false;
                    }
                }
                $expressionResults[$conditionGroup][$i + 1]['logicaloperator'] = (!empty($cond['joincondition'])) ? $cond['joincondition'] : 'and';
                $groupResults[$conditionGroup]['logicaloperator'] = (!empty($cond['groupjoin'])) ? $cond['groupjoin'] : 'and';
                $i++;
            }

            foreach ($expressionResults as $groupId => $groupExprResultSet) {
                $groupResult = true;
                foreach ($groupExprResultSet as $exprResult) {
                    $result = $exprResult['result'];
                    $logicalOperator = $exprResult['logicaloperator'];
                    if (isset($result)) { // Condition to skip last condition
                        if (!empty($logicalOperator)) {
                            switch ($logicalOperator) {
                                case 'and' :
                                    $groupResult = ($groupResult && $result);
                                    break;
                                case 'or' :
                                    $groupResult = ($groupResult || $result);
                                    break;
                            }
                        } else { // Case for the first condition
                            $groupResult = $result;
                        }
                    }
                }
                $groupResults[$groupId]['result'] = $groupResult;
            }
            foreach ($groupResults as $groupId => $groupResult) {
                $result = $groupResult['result'];
                $logicalOperator = $groupResult['logicaloperator'];
                if (isset($result)) { // Condition to skip last condition
                    if (!empty($logicalOperator)) {
                        switch ($logicalOperator) {
                            case 'and' :
                                $finalResult = ($finalResult && $result);
                                break;
                            case 'or' :
                                $finalResult = ($finalResult || $result);
                                break;
                        }
                    } else { // Case for the first condition
                        $finalResult = $result;
                    }
                }
            }
        }
        return $finalResult;
    }

    /**
     * @param string $fieldName
     * @return bool
     */
    public function isLoggedUserField($fieldName)
    {
        return false !== stripos($fieldName, 'its4you_logged_u');
    }

    /**
     * @param string $fieldName
     * @return bool
     */
    public function isAssignedUserField($fieldName)
    {
        return false !== stripos($fieldName, 'its4you_assigned_u');
    }

    /**
     * @param string $fieldName
     * @param null|Users_Record_Model $user
     * @return string
     */
    public function getUserFieldValue($fieldName, $user = null)
    {
        if (!$user) {
            $user = Users_Record_Model::getCurrentUserModel();
        }

        list($parentField, $userField) = explode(':', $fieldName);

        if ('is_admin' === $userField) {
            return in_array($user->get($userField), ['On', 'on', 1, '1']) ? '1' : '0';
        }

        return decode_html(strip_tags($user->getDisplayValue($userField)));
    }

    /**
     * @throws AppException
     * @throws Exception
     */
    public function checkCondition($entityData, $cond, $referredEntityData = null)
    {
        $data = $entityData->getData();
        $fieldValue = $rawFieldValue = '';
        $condition = $cond['operation'];

        if (empty($condition)) {
            return false;
        }

        if ($this->isAssignedUserField($cond['fieldname'])) {
            if (!empty($data['assigned_user_id'])) {
                $userRecord = Users_Record_Model::getInstanceById($data['assigned_user_id'], 'Users');
                $fieldValue = $this->getUserFieldValue($cond['fieldname'], $userRecord);
            }
        } elseif ($this->isLoggedUserField($cond['fieldname'])) {
            $fieldValue = $this->getUserFieldValue($cond['fieldname']);
        } elseif (in_array($cond['fieldname'], ['date_start', 'due_date'])) {
            $fieldName = $cond['fieldname'];
            $dateTimePair = array('date_start' => 'time_start', 'due_date' => 'time_end');

            if (array_key_exists($dateTimePair[$fieldName], $data)) {
                $fieldValue = $data[$fieldName] . " " . $data[$dateTimePair[$fieldName]];
            } else {
                $fieldValue = $data[$fieldName];
            }

            $rawFieldValue = $fieldValue;
        } else {
            $fieldValue = $data[$cond['fieldname']];
        }

        $value = trim(html_entity_decode($cond['value']));
        $expressionType = $cond['valuetype'];

        if ('fieldname' === $expressionType) {
            if ($referredEntityData != null) {
                $referredData = $referredEntityData->getData();
            } else {
                $referredData = $data;
            }

            $value = $referredData[$value];
        } elseif ('expression' === $expressionType) {
            require_once 'modules/com_vtiger_workflow/expression_engine/include.inc';

            try {
                $parser = new VTExpressionParser(new VTExpressionSpaceFilter(new VTExpressionTokenizer($value)));
                $expression = $parser->expression();
                $exprEvaluater = new VTFieldExpressionEvaluater($expression);

                if ($referredEntityData != null) {
                    $value = $exprEvaluater->evaluate($referredEntityData);
                } else {
                    $value = $exprEvaluater->evaluate($entityData);
                }
            } catch (Exception $e) {
                throw new AppException($e);
            }
        }

        global $current_user;

        $entityModuleName = $entityData->getModuleName();

        if ('Activity' === $entityModuleName) {
            $entityModuleName = 'Calendar';
        }

        $handler = vtws_getModuleHandlerFromName($entityModuleName, $current_user);
        $moduleFields = $handler->getMeta()->getModuleFields();
        $fieldInstance = $moduleFields[$cond['fieldname']];
        $fieldDataType = $fieldInstance ? $fieldInstance->getFieldDataType() : '';

        if ('datetime' === $fieldDataType) {
            //Convert the DB Date Time Format to User Date Time Format
            $rawFieldValue = $fieldValue;
            $date = new DateTimeField($fieldValue);
            $fieldValue = $date->getDisplayDateTimeValue();
            $valueArray = explode(' ', $value);

            if (count($valueArray) == 1) {
                $fieldValueArray = explode(' ', $fieldValue);
                $fieldValue = getValidDBInsertDateValue($fieldValueArray[0]);
            }
        }
        //strtotime condition is added for days before, days after where we give integer values, so strtotime will return 0 for such cases.
        if ('date' === $fieldDataType && 'between' !== $condition && strtotime($value)) {
            //Convert User Date Format filter value to DB date format
            $value = getValidDBInsertDateValue($value);
        }

        if ('time' === $fieldDataType) {
            if ($value) {
                $value = $value . ':00';    // time fields will not have seconds appended to it, so we are adding
            }
        }

        if (in_array($fieldDataType, ['owner', 'ownergroup'])) {
            if ($condition == 'is' || $condition == 'is not') {
                //To avoid again checking whether it is user or not
                $idList = array();
                $idList[] = vtws_getWebserviceEntityId('Users', $value);
                $idList[] = vtws_getWebserviceEntityId('Groups', $value);
                $value = $idList;
                $condition = ($condition == 'is') ? 'contains' : 'does not contain';

                if(is_numeric($fieldValue)) {
                    $fieldValue = vtws_getWebserviceEntityId('Users', $fieldValue);
                }
            }
        }

        if ($fieldInstance && 'folderid' === $fieldInstance->getFieldName()) {
            $value = vtws_getWebserviceEntityId('DocumentFolders', $value);
        }

        if (is_numeric($fieldValue) && is_numeric($value)) {
            $fieldValue = round($fieldValue, 8);
            $value = round($value, 8);
        }

        switch ($condition) {
            case 'equal to':
                return $fieldValue == $value;
            case 'less than':
                return $fieldValue < $value;
            case 'greater than':
                return $fieldValue > $value;
            case 'does not equal':
                return $fieldValue != $value;
            case 'less than or equal to':
                return $fieldValue <= $value;
            case 'greater than or equal to':
                return $fieldValue >= $value;
            case 'is':
                if (preg_match('/([^:]+):boolean$/', $value, $match)) {
                    $value = $match[1];

                    if ($value == 'true') {
                        return in_array($fieldValue, ['on', 1, '1']);
                    } else {
                        return in_array($fieldValue, ['off', 0, '0', '']);
                    }
                } else {
                    if ('datetime' === $fieldDataType) {
                        $value = getValidDBInsertDateValue($value);
                    }

                    if ('boolean' === $fieldDataType && '' === $fieldValue) {
                        $fieldValue = '0';
                    }

                    return $fieldValue == $value;
                }
            case 'is not':
                if (preg_match('/([^:]+):boolean$/', $value, $match)) {
                    $value = $match[1];

                    if ('true' == $value) {
                        return in_array($fieldValue, ['off', 0, '0', '']);
                    } else {
                        return in_array($fieldValue, ['on', 1, '1']);
                    }
                } else {
                    if ('datetime' === $fieldDataType) {
                        $value = getValidDBInsertDateValue($value);
                    }

                    return $fieldValue != $value;
                }
            case 'contains':
                if ('multipicklist' === $fieldDataType) {
                    if (empty($fieldValue) && empty($value)) {
                        return true;
                    } else {
                        if (!empty($fieldValue)) {
                            $fieldValue = explode(' |##| ', $fieldValue);

                            if (is_array($fieldValue)) {
                                $conditionMatched = false;
                                $valueExplodedArr = explode(',', $value);

                                foreach ($fieldValue as $arrayValue) {
                                    foreach ($valueExplodedArr as $val) {
                                        if (strpos($arrayValue, $val) !== false) {
                                            $conditionMatched = true;
                                            break;
                                        }
                                    }

                                    if ($conditionMatched) {
                                        break;
                                    }
                                }

                                return $conditionMatched;
                            }
                        }
                    }
                    return false;
                }

                if (is_array($value)) {
                    return in_array($fieldValue, $value);
                }

                if (empty($fieldValue) && empty($value)) {
                    return true;
                }

                return strpos(strval($fieldValue), strval($value)) !== false;
            case 'does not contain':
                if ('multipicklist' === $fieldDataType) {
                    if (empty($fieldValue) && empty($value)) {
                        return false;
                    } elseif (!empty($fieldValue)) {
                        $fieldValue = explode(' |##| ', $fieldValue);

                        if (is_array($fieldValue)) {
                            $conditionMatched = true;
                            $valueExplodedArr = explode(',', $value);

                            foreach ($fieldValue as $arrayValue) {
                                foreach ($valueExplodedArr as $val) {
                                    if (strpos($arrayValue, $val) !== false) {
                                        $conditionMatched = false;
                                        break;
                                    }
                                }

                                if (!$conditionMatched) {
                                    break;
                                }
                            }

                            return $conditionMatched;
                        }
                    }

                    return true;
                }

                if (empty($value)) {
                    unset($value);
                }

                if (is_array($value)) {
                    return !in_array($fieldValue, $value);
                }

                return false === strpos($fieldValue, $value);
            case 'starts with':
                return $this->startsWith($fieldValue, $value);
            case 'ends with':
                return $this->endsWith($fieldValue, $value);
            case 'matches':
                return preg_match($value, $fieldValue);

            case 'is empty':
                return empty($fieldValue);
            case 'is not empty':
                return !empty($fieldValue);
            case 'before':
                return !empty($fieldValue) && $fieldValue < getValidDBInsertDateValue($value);
            case 'after':
                return !empty($fieldValue) && $fieldValue > getValidDBInsertDateValue($value);
            case 'between':
                if (empty($fieldValue)) {
                    return false;
                }

                $values = explode(',', $value);
                $values = array_map('getValidDBInsertDateValue', $values);

                if ($fieldValue > $values[0] && $fieldValue < $values[1]) {
                    return true;
                }
                return false;
            case 'is today':
                $today = date('Y-m-d');

                if ($cond['fieldname'] == 'birthday') {
                    $fieldValue = date('m-d', strtotime($fieldValue));
                    $today = date('m-d');
                } else {
                    $fieldValue = date('Y-m-d', strtotime($fieldValue));
                }

                return $fieldValue == $today;
            case 'less than days ago':
                if (empty($fieldValue) || empty($value)) {
                    return false;
                }

                $today = date('Y-m-d');
                $olderDate = date('Y-m-d', strtotime('-' . $value . ' days'));

                return $olderDate <= $fieldValue && $fieldValue <= $today;
            case 'more than days ago':
                return !empty($fieldValue) && !empty($value) && $fieldValue <= date('Y-m-d', strtotime('-' . $value . ' days'));
            case 'in less than':
                if (empty($fieldValue) || empty($value)) {
                    return false;
                }

                $today = date('Y-m-d');
                $futureDate = date('Y-m-d', strtotime('+' . $value . ' days'));

                return $today <= $fieldValue && $fieldValue <= $futureDate;
            case 'in more than':
                return !empty($fieldValue) && !empty($value) && $fieldValue >= date('Y-m-d', strtotime('+' . $value . ' days'));
            case 'days ago':
                if (empty($fieldValue) || empty($value)) {
                    return false;
                }

                $olderDate = date('Y-m-d', strtotime('-' . $value . ' days'));
                $fieldValue = date('Y-m-d', strtotime($fieldValue));

                return $fieldValue == $olderDate;
            case 'days later':
                if (empty($fieldValue) || empty($value)) {
                    return false;
                }

                $futureDate = date('Y-m-d', strtotime('+' . $value . ' days'));
                $fieldValue = date('Y-m-d', strtotime($fieldValue));

                return $fieldValue == $futureDate;
            case 'less than hours before':
                if (empty($rawFieldValue) || empty($value)) {
                    return false;
                }

                $currentTime = date('Y-m-d H:i:s');
                $olderDateTime = date('Y-m-d H:i:s', strtotime('-' . $value . ' hours'));

                return $olderDateTime <= $rawFieldValue && $rawFieldValue <= $currentTime;
            case 'less than hours later':
                if (empty($fieldValue) || empty($value)) {
                    return false;
                }

                $currentTime = date('Y-m-d H:i:s');
                $futureDateTime = date('Y-m-d H:i:s', strtotime('+' . $value . ' hours'));

                return $currentTime <= $rawFieldValue && $rawFieldValue <= $futureDateTime;
            case 'more than hours before':
                return !empty($rawFieldValue) && !empty($value) && $rawFieldValue <= date('Y-m-d H:i:s', strtotime('-' . $value . ' hours'));
            case 'more than hours later':
                return !empty($rawFieldValue) && !empty($value) && $rawFieldValue >= date('Y-m-d H:i:s', strtotime('+' . $value . ' hours'));
            case 'is tomorrow' :
                $tomorrow = date('Y-m-d', strtotime('+1 days'));
                $fieldValue = date('Y-m-d', strtotime($fieldValue));

                return $fieldValue == $tomorrow;
            case 'is yesterday' :
                $yesterday = date('Y-m-d', strtotime('-1 days'));
                $fieldValue = date('Y-m-d', strtotime($fieldValue));

                return $fieldValue == $yesterday;
            case 'less than days later' :
                if (empty($fieldValue) || empty($value)) {
                    return false;
                }

                $currentDate = date('Y-m-d');
                $futureDate = date('Y-m-d', strtotime('+' . $value . ' days'));

                return $currentDate <= $fieldValue && $fieldValue <= $futureDate;
            case 'more than days later' :
                return !empty($fieldValue) && !empty($value) && $fieldValue >= date('Y-m-d', strtotime('+' . $value . ' days'));
            case 'is field':
                if ('date' === $fieldDataType) {
                    return strtotime($fieldValue) == strtotime($data[$value]);
                }

                return $fieldValue == $data[$value];
            case 'is not field':
                if ('date' === $fieldDataType) {
                    return strtotime($fieldValue) != strtotime($data[$value]);
                }

                return $fieldValue != $data[$value];
            case 'is less then field':
                if ('date' === $fieldDataType) {
                    return strtotime($fieldValue) < strtotime($data[$value]);
                }

                return $fieldValue < $data[$value];
            case 'is more than field':
                if ('date' === $fieldDataType) {
                    return strtotime($fieldValue) > strtotime($data[$value]);
                }

                return $fieldValue > $data[$value];
            default:
                //Unexpected condition
                throw new Exception('Found an unexpected condition: ' . $condition);
        }
    }

    public function startsWith($str, $subStr)
    {
        $sl = strlen($str);
        $ssl = strlen($subStr);
        if ($sl >= $ssl) {
            return substr_compare($str, $subStr, 0, $ssl) == 0;
        } else {
            return false;
        }
    }

    public function endsWith($str, $subStr)
    {
        $sl = strlen($str);
        $ssl = strlen($subStr);
        if ($sl >= $ssl) {
            return substr_compare($str, $subStr, $sl - $ssl, $ssl) == 0;
        } else {
            return false;
        }
    }

    public function transformConditionsToFilter($conditions)
    {
        $wfCondition = array();

        if (!empty($conditions)) {
            foreach ($conditions as $index => $condition) {
                $columns = $condition['columns'];
                if ($index == '1' && empty($columns)) {
                    $wfCondition[] = array(
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

                        list($columntable, $columnname, $fieldname, $label, $columntype) = explode(":", $column['columnname']);

                        if ($columntype == "D" && $column['valuetype'] == "rawtext" && in_array($column['comparator'], $this->ConvertDate)) {

                            if ($column['comparator'] == "between") {
                                $values = explode(',', $column['value']);
                                $column['value'] = array_map('getValidDBInsertDateValue', $values);
                            } else {
                                $column['value'] = getValidDBInsertDateValue($column['value']);
                            }
                        }

                        $wfCondition[] = array(
                            'fieldname' => $fieldname,
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
        return $wfCondition;
    }

    public function getConditionsForDetail($displayed, $conditions, $moduleName)
    {

        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $conditions = decode_html($conditions);
        $wfCond = json_decode($conditions, true);

        $conditionList = array();

        if (is_array($wfCond)) {
            for ($k = 0; $k < (count($wfCond)); ++$k) {
                $fieldName = $wfCond[$k]['fieldname'];
                preg_match('/\((\w+) : \(([_\w]+)\) (\w+)\)/', $fieldName, $matches);

                if (count($matches) == 0) {
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
                $value = $wfCond[$k]['value'];
                $operation = $wfCond[$k]['operation'];
                if ($wfCond[$k]['groupjoin'] == 'and') {
                    $conditionGroup = 'All';
                } else {
                    $conditionGroup = 'Any';
                }
                if ($value == 'true:boolean' || ($fieldModel && $fieldModel->getFieldDataType() == 'boolean' && $value == '1')) {
                    $value = 'LBL_ENABLED';
                }
                if ($value == 'false:boolean' || ($fieldModel && $fieldModel->getFieldDataType() == 'boolean' && $value == '0')) {
                    $value = 'LBL_DISABLED';
                }
                if ($fieldLabel == '_VT_add_comment') {
                    $fieldLabel = 'Comment';
                }
                $conditionList[$conditionGroup][] = $fieldLabel . ' ' . vtranslate($operation, $moduleName) . ' ' . vtranslate($value, $moduleName);
            }

            $conditionList['displayed'] = $displayed;
        }

        return $conditionList;
    }

    public function transformToAdvancedFilterCondition($conditions)
    {

        if (!empty($conditions)) {
            $conditions = decode_html($conditions);
            $is_old_contition_format = $this->isOldContitionFormat($conditions);

            if (!$is_old_contition_format) {
                $conditions = Zend_Json::decode($conditions);

                $transformedConditions = array();

                foreach ($conditions as $index => $info) {
                    $columnName = $info['fieldname'];
                    $value = $info['value'];
                    // To convert date value from yyyy-mm-dd format to user format
                    $valueArray = explode(',', $value);
                    $isDateValue = false;
                    for ($i = 0; $i < count($valueArray); $i++) {
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
        }
        $transformedConditions[1] = array('columns' => $firstGroup);
        $transformedConditions[2] = array('columns' => $secondGroup);
        return $transformedConditions;
    }

    /**
     * @param $condition
     * @return bool
     */
    public function isOldContitionFormat($condition)
    {
        if (strpos($condition, '"1":{"columns":') !== false || strpos($condition, '"0":{"columns":') !== false) {
            return true;
        } else {
            return false;
        }
    }
}
