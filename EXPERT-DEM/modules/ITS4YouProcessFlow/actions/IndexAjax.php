<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouProcessFlow_IndexAjax_Action extends Vtiger_Action_Controller
{

    public $Att_Folders = array();
    public $PF_Result = array();
    public $Request_Data = false;

    /** @var bool|ITS4YouProcessFlow_ProcessRecord_Model */
    public $ITS4YouProcessFlowProcessRecordModel = false;
    public $for_module = false;
    public $for_view = false;
    public $get_info = false;
    public $Info = array();
    public $skipAddActions = array();

    public function __construct()
    {
        parent::__construct();

        $this->exposeMethod('getPFListActions');
        $this->exposeMethod('controlFields');
    }

    public function validateRequest(Vtiger_Request $request)
    {
        return true;
    }

    public function checkPermission(Vtiger_Request $request)
    {
        return true;
    }

    public function preProcess(Vtiger_Request $request)
    {
        return true;
    }

    public function postProcess(Vtiger_Request $request)
    {
        return true;
    }

    public function process(Vtiger_Request $request)
    {

        $mode = $request->get('mode');
        if (!empty($mode)) {
            $this->invokeExposedMethod($mode, $request);
            return;
        }

        $type = $request->get('type');
    }

    /**
     * @param Vtiger_Request $request
     * @throws AppException
     */
    public function controlFields(Vtiger_Request $request)
    {
        $this->setRequestData($request);
        $this->for_module = $request->get("for_module");
        $this->for_view = $request->get("for_view");
        $EntryId = $request->get("record");
        $entityData = $this->getEntityData();
        $postData = $request->get('postData');

        foreach ($postData as $name => $value) {
            $entityData->set($name, $value);
        }

        $this->getControlActions($entityData);

        if ($this->ITS4YouProcessFlowProcessRecordModel) {
            $EntryData[$EntryId] = $this->ITS4YouProcessFlowProcessRecordModel->getAllActions();
        }

        $result = array("success" => true, "entries" => $EntryData, "count" => "1");

        if ($request->has('debug') && !$request->isEmpty('debug')) {
            echo "<pre>";
            print_r($result);
            echo "</pre>";
        }

        if (!$this->get_info) {
            $response = new Vtiger_Response();
            $response->setResult($result);
            $response->emit();
        }
    }

    private function getEntityData()
    {
        $request = $this->getRequestData();
        $adb = PearDatabase::getInstance();

        if ($request->has('record') && !$request->isEmpty('record')) {
            $recordId = $request->get("record");
            $entityData = VTEntityData::fromEntityId($adb, $recordId, $this->for_module);
        } else {
            $entityData = $this->getNewEntityData();
        }
        return $entityData;
    }

    public function getRequestData()
    {
        return $this->Request_Data;
    }

    public function setRequestData(Vtiger_Request $request)
    {
        $this->Request_Data = $request;
    }

    private function getNewEntityData()
    {
        $obj = new VTEntityData();
        $obj->entityId = '';
        $obj->moduleName = $this->for_module;

        require_once('data/CRMEntity.php');
        $focus = CRMEntity::getInstance($this->for_module);
        //$obj->isNew = false;
        $obj->focus = $focus;

        $moduleModel = Vtiger_Module_Model::getInstance($this->for_module);
        $fieldInstances = Vtiger_Field_Model::getAllForModule($moduleModel);
        foreach ($fieldInstances as $blockInstance) {
            foreach ($blockInstance as $fieldInstance) {
                $fieldName = $fieldInstance->getName();
                $defaultValue = $fieldInstance->getDefaultFieldValue();
                if ($defaultValue) {

                    if ($fieldInstance->get('uitype') == 56) {
                        if ($defaultValue === 'on') {
                            $defaultValue = 1;
                        } else {
                            $defaultValue = 0;
                        }
                    }

                    $obj->set($fieldName, decode_html($defaultValue));
                }

            }
        }


        return $obj;
    }

    /**
     * @throws AppException
     */
    public function getControlActions($entityData, $if_type = "yes", $DisplayConditionsPermissions = true, $parent = false)
    {
        if (!$this->ITS4YouProcessFlowProcessRecordModel) {
            $this->ITS4YouProcessFlowProcessRecordModel = ITS4YouProcessFlow_ProcessRecord_Model::getInstance();
        }

        if ((($DisplayConditionsPermissions && $if_type == "yes") || (!$DisplayConditionsPermissions && $if_type == "no")) && !$this->skipAddActions[$parent]) {
            $add_action = true;
        } else {
            $add_action = false;

            if (!$this->get_info) {
                return false;
            }
        }

        $request = $this->getRequestData();

        if ($request->has('debug') && !$request->isEmpty('debug')) {
            echo 'getControlActions';
        }

        if (!$parent) {
            $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getDefaultInstance($this->for_module);
            $recordModel->setEntityData($entityData);
            $recordModel->setRequestData($request);
            $this->setInfo(0, "id", 0);
            $this->setInfo(0, "add_action", "yes");
            $this->setInfo(0, "conditions_result", "1");
            $recordModel->getExecuteActionsRecords($this->ITS4YouProcessFlowProcessRecordModel, $this);
        }

        $rowData = $this->getProcessFlowsForModule($parent, false, $if_type);

        if ($rowData) {
            $runTypes = array('yes', 'no');

            foreach ($rowData as $CompareData) {
                $pfid = $CompareData['pfid'];
                $this->ITS4YouProcessFlowProcessRecordModel->set("actual_pfid", $pfid);
                $this->ITS4YouProcessFlowProcessRecordModel->set("parent_pfid", $parent);
                $ITS4YouProcessFlow_Display_Model = new ITS4YouProcessFlow_Display_Model();

                if (!isset($CompareData["displayed"])) {
                    $CompareData["displayed"] = "0";
                }

                try {
                    if ($request->has('debug') && !$request->isEmpty('debug')) {
                        echo '<br>Display Conditions Permissions ' . $pfid . ' ';
                    }

                    $DisplayConditionsPermissions = $ITS4YouProcessFlow_Display_Model->CheckDisplayConditions($CompareData, $entityData, $this->for_module);

                    if ($CompareData['actions_count'] > 0 || $this->get_info) {
                        $recordModel = Settings_ITS4YouProcessFlow_Record_Model::getInstance($pfid);
                        $recordModel->setEntityData($entityData);
                        $recordModel->setRequestData($request);
                        $this->setInfoNextPF($pfid, $if_type, $parent);
                        $this->setInfo($pfid, "id", $pfid);
                        $this->setInfo($pfid, "name", $recordModel->getName());
                        $this->setInfo($pfid, "add_action", ($add_action ? "yes" : "no"));
                        $this->setInfo($pfid, "description", $recordModel->get('description'));
                        $this->setInfo($pfid, "conditions", $recordModel->getConditonDisplayValue());
                        $this->setInfo($pfid, "conditions_result", $DisplayConditionsPermissions);
                        $this->setInfo($pfid, "actions_count", $CompareData['actions_count']);

                        if (!$add_action) {
                            $this->skipAddActions[$pfid] = true;
                            $recordModel->skipAddActions(true);
                        }

                        if ($CompareData['actions_count'] > 0) {
                            foreach ($runTypes as $runType) {
                                $recordModel->getExecuteActionsRecords($this->ITS4YouProcessFlowProcessRecordModel, $this, $runType, $DisplayConditionsPermissions);
                            }
                        }
                    }

                    foreach ($runTypes as $runType) {
                        $this->getControlActions($entityData, $runType, $DisplayConditionsPermissions, $pfid);
                    }
                } catch (Exception $e) {
                    throw new AppException($e);
                }
            }
        }

        if ($this->ITS4YouProcessFlowProcessRecordModel && !$parent) {
            $this->ITS4YouProcessFlowProcessRecordModel->saveActions();
        }

    }

    public function getProcessFlowsForModule($parent = false, $loadAll = false, $ifType = '')
    {
        if (!$parent && !$loadAll) {
            $parentId = 'default';
        }

        if (!$parent && $loadAll) {
            $parentId = 'all';
        } elseif (!$parent) {
            $parentId = '0';
        } else {
            $parentId = $parent;
        }

        $ifTypeVal = '' == $ifType ? 'all' : $ifType;

        if (!isset($this->PF_Result[$parentId][$ifTypeVal])) {
            $adb = PearDatabase::getInstance();
            $modules = [$this->for_module];

            if ('Calendar' === $this->for_module) {
                $modules[] = 'Events';
            }

            $infoSql = 'SELECT its4you_processflow.* FROM its4you_processflow WHERE its4you_processflow.module_name IN (' . generateQuestionMarks($modules) . ') AND its4you_processflow.status = ?  AND its4you_processflow.deleted = ?';
            $infoParams = array($modules, '1', '0');

            if ($parent) {
                $infoSql .= ' AND its4you_processflow.parent_id = ?';
                $infoParams[] = $parent;
            } elseif (!$loadAll) {
                $infoSql .= ' AND (its4you_processflow.parent_id = 0 OR its4you_processflow.parent_id IS NULL)';
            }

            if (!empty($ifType)) {
                $infoSql .= ' AND its4you_processflow.if_type = ?';
                $infoParams[] = 'no' == $ifType ? '1' : '0';
            }

            $infoSql .= ' ORDER BY its4you_processflow.seq';
            $infoResult = $adb->pquery($infoSql, $infoParams);
            $rowData = false;

            if ($adb->num_rows($infoResult)) {
                $rowData = [];

                while ($row = $adb->fetchByAssoc($infoResult)) {
                    $relationResult = $adb->pquery(
                        'SELECT * FROM its4you_processflowrel  WHERE  its4you_processflowrel.pfid = ? AND its4you_processflowrel.deleted = ? AND its4you_processflowrel.status = ?',
                        array($row['pfid'], '0', '0')
                    );
                    $row['actions_count'] = $adb->num_rows($relationResult);
                    $rowData[] = $row;
                }
            }

            $this->PF_Result[$parentId][$ifTypeVal] = $rowData;
        }

        return $this->PF_Result[$parentId][$ifTypeVal];
    }

    public function setInfoNextPF($id, $type, $source_id)
    {

        $this->Info[$source_id]["next_pf"][$type][] = $id;
    }

    public function getPFListActions(Vtiger_Request $request)
    {
        $result = array('success' => false);
        $this->setRequestData($request);

        $this->for_module = $request->get('for_module');
        $this->for_view = $request->get('for_view');

        if ($request->has('info') && !$request->isEmpty('info')) {
            $this->get_info = true;
        }

        if ($request->has('debug') && !$request->isEmpty('debug')) {
            $adb = PearDatabase::getInstance();
            $adb->setDebug(true);

            error_reporting(63);
            ini_set("display_errors", 1);
        }

        if ($request->has('relatedModule') && !$request->isEmpty('relatedModule')) {

            $this->for_module = $request->get('relatedModule');

            if (substr($this->for_view, 0, 7) == 'related') {
                $this->for_view = substr($this->for_view, 7);
            } elseif ($this->for_view == "Detail") {
                $this->for_view = "List";
            }
        }

        if ($this->isProcessFlowsForModule()) {
            if ($this->for_view == "List") {
                if ($request->has('relatedModule') && !$request->isEmpty('relatedModule')) {
                    $result = $this->getPFListActionsForRelatedListView();
                } else {
                    $result = $this->getPFListActionsForListView();
                }
            } else {
                $result = $this->getPFActionsForView();
            }

        }

        if ($request->has('debug') && !$request->isEmpty('debug')) {
            echo "<pre>";
            print_r($result);
            echo "</pre>";
        }

        if ($this->get_info) {
            echo "<pre>";
            print_r($this->Info);
            echo "</pre>";
            exit;
        }


        $response = new Vtiger_Response();
        $response->setResult($result);
        $response->emit();
    }

    private function isProcessFlowsForModule()
    {

        $module = Vtiger_Module_Model::getInstance($this->for_module);
        if ($module && $module->isEntityModule()) {
            return true;
        }
        return false;
    }

    public function getPFListActionsForRelatedListView()
    {

        $request = $this->getRequestData();
        $adb = PearDatabase::getInstance();

        $EntryData = array();

        $for_module = $request->get('for_module');
        $this->for_module = $request->get('relatedModule');
        $parentId = $request->get('record');
        $label = $request->get('tab_label');

        $relatedModuleModel = Vtiger_Module_Model::getInstance($this->for_module);
        $moduleFields = $relatedModuleModel->getFields();

        $searchParams = $request->get('search_params');

        if (empty($searchParams)) {
            $searchParams = array();
        }

        $whereCondition = array();

        foreach ($searchParams as $fieldListGroup) {
            foreach ($fieldListGroup as $fieldSearchInfo) {
                $fieldModel = $moduleFields[$fieldSearchInfo[0]];

                if ($fieldModel) {
                    $tableName = $fieldModel->get('table');
                    $column = $fieldModel->get('column');
                    $whereCondition[$fieldSearchInfo[0]] = array($tableName . '.' . $column, $fieldSearchInfo[1], $fieldSearchInfo[2], $fieldSearchInfo[3]);

                    $fieldSearchInfoTemp = array();
                    $fieldSearchInfoTemp['searchValue'] = $fieldSearchInfo[2];
                    $fieldSearchInfoTemp['fieldName'] = $fieldName = $fieldSearchInfo[0];
                    $fieldSearchInfoTemp['comparator'] = $fieldSearchInfo[1];
                    $searchParams[$fieldName] = $fieldSearchInfoTemp;
                }
            }
        }

        $requestedPage = $request->get('page');
        if (empty($requestedPage)) {
            $requestedPage = 1;
        }

        $pagingModel = new Vtiger_Paging_Model();
        $pagingModel->set('page', $requestedPage);

        $parentRecordModel = Vtiger_Record_Model::getInstanceById($parentId, $for_module);
        $relationListView = Vtiger_RelationListView_Model::getInstance($parentRecordModel, $this->for_module, $label);

        if (!empty($whereCondition)) {
            $relationListView->set('whereCondition', $whereCondition);
        }
        $orderBy = $request->get('orderby');
        $sortOrder = $request->get('sortorder');

        if (!empty($orderBy)) {
            $relationListView->set('orderby', $orderBy);
            $relationListView->set('sortorder', $sortOrder);
        }
        $relationListView->tab_label = $request->get('tab_label');
        $listViewEntries = $relationListView->getEntries($pagingModel);


        $listViewCount = $pagingModel->get('_relatedlistcount');
        if (!$listViewCount) {
            $listViewCount = count($listViewEntries);
        }

        if ($listViewCount > 0) {
            foreach ($listViewEntries AS $listViewEntry) {
                $EntryId = $listViewEntry->getId();

                $entityData = VTEntityData::fromEntityId($adb, $EntryId, $this->for_module);
                $this->getControlActions($entityData);
                if ($this->ITS4YouProcessFlowProcessRecordModel) {
                    $EntryData[$EntryId] = $this->ITS4YouProcessFlowProcessRecordModel->getAllActions();
                }
                $this->ITS4YouProcessFlowProcessRecordModel = false;
            }
        }

        return array("success" => true, "entries" => $EntryData, "count" => $listViewCount);
    }

    public function getPFListActionsForListView()
    {
        $EntryData = array();

        $adb = PearDatabase::getInstance();

        $request = $this->getRequestData();
        //= $request->getModule();
        $cvId = $request->get('viewname');
        $pageNumber = $request->get('page');
        $orderBy = $request->get('orderby');
        $sortOrder = $request->get('sortorder');
        $searchKey = $request->get('search_key');
        $searchValue = $request->get('search_value');
        $operator = $request->get('operator');
        $searchParams = $request->get('search_params');
        $tagParams = $request->get('tag_params');
        $starFilterMode = $request->get('starFilterMode');
        $listHeaders = $request->get('list_headers', array());
        $tag = $request->get('tag');
        $requestViewName = $request->get('viewname');
        $tagSessionKey = $this->for_module . '_TAG';

        if (!empty($requestViewName) && empty($tag)) {
            unset($_SESSION[$tagSessionKey]);
        }

        if (empty($tag)) {
            $tagSessionVal = Vtiger_ListView_Model::getSortParamsSession($tagSessionKey);
            if (!empty($tagSessionVal)) {
                $tag = $tagSessionVal;
            }
        } else {
            Vtiger_ListView_Model::setSortParamsSession($tagSessionKey, $tag);
        }

        $listViewSessionKey = $this->for_module . '_' . $cvId;
        if (!empty($tag)) {
            $listViewSessionKey .= '_' . $tag;
        }

        if (empty($cvId)) {
            $customView = new CustomView();
            $cvId = $customView->getViewId($this->for_module);
        }

        $orderParams = Vtiger_ListView_Model::getSortParamsSession($listViewSessionKey);
        if (empty($listHeaders)) {
            $listHeaders = $orderParams['list_headers'];
        }

        if (!empty($tag) && empty($tagParams)) {
            $tagParams = $orderParams['tag_params'];
        }

        if (empty($orderBy) && empty($searchValue) && empty($pageNumber)) {
            if ($orderParams) {
                $pageNumber = $orderParams['page'];
                $orderBy = $orderParams['orderby'];
                $sortOrder = $orderParams['sortorder'];
                $searchKey = $orderParams['search_key'];
                $searchValue = $orderParams['search_value'];
                $operator = $orderParams['operator'];
                if (empty($searchParams)) {
                    $searchParams = $orderParams['search_params'];
                }

                if (empty($starFilterMode)) {
                    $starFilterMode = $orderParams['star_filter_mode'];
                }
            }
        } else {
            if ($request->get('nolistcache') != 1) {
                $params = array(
                    'page' => $pageNumber,
                    'orderby' => $orderBy,
                    'sortorder' => $sortOrder,
                    'search_key' => $searchKey,
                    'search_value' => $searchValue,
                    'operator' => $operator,
                    'tag_params' => $tagParams,
                    'star_filter_mode' => $starFilterMode,
                    'search_params' => $searchParams
                );

                if (!empty($listHeaders)) {
                    $params['list_headers'] = $listHeaders;
                }
                Vtiger_ListView_Model::setSortParamsSession($listViewSessionKey, $params);
            }
        }

        if (empty ($pageNumber)) {
            $pageNumber = '1';
        }

        $listViewModel = Vtiger_ListView_Model::getInstance($this->for_module, $cvId, $listHeaders);
        $currentUser = Users_Record_Model::getCurrentUserModel();

        $pagingModel = new Vtiger_Paging_Model();
        $pagingModel->set('page', $pageNumber);
        $pagingModel->set('viewid', $request->get('viewname'));

        if (!empty($orderBy)) {
            $listViewModel->set('orderby', $orderBy);
            $listViewModel->set('sortorder', $sortOrder);
        }

        if (!empty($operator)) {
            $listViewModel->set('operator', $operator);
        }
        if (!empty($searchKey) && !empty($searchValue)) {
            $listViewModel->set('search_key', $searchKey);
            $listViewModel->set('search_value', $searchValue);
        }

        if (empty($searchParams)) {
            $searchParams = array();
        }
        if (count($searchParams) == 2 && empty($searchParams[1])) {
            unset($searchParams[1]);
        }

        if (empty($tagParams)) {
            $tagParams = array();
        }

        $searchAndTagParams = array_merge($searchParams, $tagParams);

        $transformedSearchParams = Vtiger_Util_Helper::transferListSearchParamsToFilterCondition($searchAndTagParams, $listViewModel->getModule());
        $listViewModel->set('search_params', $transformedSearchParams);

        //To make smarty to get the details easily accesible
        foreach ($searchParams as $fieldListGroup) {
            foreach ($fieldListGroup as $fieldSearchInfo) {
                $fieldSearchInfo['searchValue'] = $fieldSearchInfo[2];
                $fieldSearchInfo['fieldName'] = $fieldName = $fieldSearchInfo[0];
                $fieldSearchInfo['comparator'] = $fieldSearchInfo[1];
                $searchParams[$fieldName] = $fieldSearchInfo;
            }
        }

        foreach ($tagParams as $fieldListGroup) {
            foreach ($fieldListGroup as $fieldSearchInfo) {
                $fieldSearchInfo['searchValue'] = $fieldSearchInfo[2];
                $fieldSearchInfo['fieldName'] = $fieldName = $fieldSearchInfo[0];
                $fieldSearchInfo['comparator'] = $fieldSearchInfo[1];
                $tagParams[$fieldName] = $fieldSearchInfo;
            }
        }

        $listViewEntries = $listViewModel->getListViewEntries($pagingModel);
        $noOfEntries = $pagingModel->get('_listcount');

        if (!$noOfEntries) {
            $noOfEntries = count($listViewEntries);
        }


        $listViewCount = $listViewModel->getListViewCount();

        foreach ($listViewEntries AS $listViewEntry) {
            $EntryId = $listViewEntry->getId();


            require_once 'include/events/VTEntityData.inc';
            $entityData = VTEntityData::fromEntityId($adb, $EntryId, $this->for_module);
            $this->getControlActions($entityData);


            if ($this->ITS4YouProcessFlowProcessRecordModel) {
                $EntryData[$EntryId] = $this->ITS4YouProcessFlowProcessRecordModel->getAllActions();
            }
            $this->ITS4YouProcessFlowProcessRecordModel = false;
        }

        return array("success" => true, "entries" => $EntryData, "count" => $listViewCount);
    }

    public function getPFActionsForView()
    {

        $EntryData = array();
        $request = $this->getRequestData();

        if ($request->has('record') && !$request->isEmpty('record')) {
            $recordId = $request->get("record");
        } else {
            $recordId = "0";
        }

        $entityData = $this->getEntityData();

        $this->getControlActions($entityData);

        if ($this->ITS4YouProcessFlowProcessRecordModel) {
            $EntryData[$recordId] = $this->ITS4YouProcessFlowProcessRecordModel->getAllActions();
        }

        $Fields = $this->getControlFields();

        return array("success" => true, "entries" => $EntryData, "count" => "1", "fields" => $Fields, "numfields" => count($Fields));
    }

    public function getControlFields()
    {
        $fields = array();
        $rowData = $this->getProcessFlowsForModule(false, true);

        if ($rowData) {
            foreach ($rowData AS $row0) {

                $Conditions = Zend_Json::decode(decode_html($row0['conditions']));

                if (count($Conditions) > 0) {
                    foreach ($Conditions AS $condition) {
                        $fieldName = $condition['fieldname'];

                        if (!in_array($fieldName, $fields)) {
                            $fields[] = $fieldName;
                        }
                    }
                }
            }
        }

        return $fields;
    }

    public function getReferenceFieldName($fieldName)
    {
        preg_match('/[a-zA-Z_]+/', $fieldName, $matches);

        if (!isset($matches[0])) {
            return null;
        }

        return $matches[0];
    }

    public function setInfoAction($id, $type, $val)
    {

        $this->Info[$id]["Actions"][$type][] = $val;
    }

    public function setInfoMode($mode = true)
    {

        $this->get_info = $mode;
    }

    public function getInfo()
    {

        return $this->Info;
    }

    public function setInfo($id, $type, $val)
    {

        $this->Info[$id][$type] = $val;
    }

}
