<?php
/* * *******************************************************************************
 * The content of this file is subject to the Process Flow 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouProcessFlow_ListView_Model extends Settings_Vtiger_ListView_Model
{

    /**
     * Function to get the list view entries
     * @param Vtiger_Paging_Model $pagingModel
     * @return <Array> - Associative array of record id mapped to Vtiger_Record_Model instance.
     */
    public function getListViewEntries($pagingModel)
    {
        $listview_max_textlength = vglobal('listview_max_textlength');
        $db = PearDatabase::getInstance();

        $module = $this->getModule();
        $moduleName = $module->getName();
        $parentModuleName = $module->getParentName();
        $qualifiedModuleName = $moduleName;
        if (!empty($parentModuleName)) {
            $qualifiedModuleName = $parentModuleName . ':' . $qualifiedModuleName;
        }
        $recordModelClass = Vtiger_Loader::getComponentClassName('Model', 'Record', $qualifiedModuleName);
        $search_value = $this->get('search_value');

        $listFields = $module->listFields;
        $listQuery = "SELECT ";
        foreach ($listFields as $fieldName => $fieldLabel) {
            $listQuery .= "$fieldName, ";
        }

        $listQuery .= "status, ";

        $listQuery .= $module->baseIndex . " FROM " . $module->baseTable .
            ' INNER JOIN vtiger_tab ON vtiger_tab.name=' . $module->baseTable . '.module_name';

        $sourceModule = $this->get('sourceModule');

        $listQuery .= ' WHERE ' . $module->baseTable . '.deleted=? AND vtiger_tab.presence IN (0,2) AND (' . $module->baseTable . '.parent_id IS NULL OR ' . $module->baseTable . '.parent_id = ?) ';
        $params = array('0', '');

        if (!empty($sourceModule)) {
            $listQuery .= 'AND module_name = ?';
            $params[] = $sourceModule;
        }

        if (!empty($search_value)) {
            $listQuery .= ' AND dfname like "%' . $search_value . '%"';
        }

        $startIndex = $pagingModel->getStartIndex();
        $pageLimit = $pagingModel->getPageLimit();

        $orderBy = $this->getForSql('orderby');
        if (!empty($orderBy) && $orderBy === 'smownerid') {
            $fieldModel = Vtiger_Field_Model::getInstance('assigned_user_id', $moduleModel);
            if ($fieldModel->getFieldDataType() == 'owner') {
                $orderBy = 'COALESCE(CONCAT(vtiger_users.first_name,vtiger_users.last_name),vtiger_groups.groupname)';
            }
        }
        if (!empty($orderBy)) {
            $listQuery .= ' ORDER BY ' . $orderBy . ' ' . $this->getForSql('sortorder');
        }
        $nextListQuery = $listQuery . ' LIMIT ' . ($startIndex + $pageLimit) . ',1';
        $listQuery .= " LIMIT $startIndex," . ($pageLimit + 1);

        $listResult = $db->pquery($listQuery, $params);
        $noOfRecords = $db->num_rows($listResult);

        $listViewRecordModels = array();
        for ($i = 0; $i < $noOfRecords; ++$i) {
            $row = $db->query_result_rowdata($listResult, $i);
            $record = new $recordModelClass();
            $module_name = $row['module_name'];
            $row['raw_module_name'] = $module_name;

            //To handle translation of calendar to To Do
            if ($module_name == 'Calendar') {
                $module_name = vtranslate('LBL_TASK', $module_name);
            } else {
                $module_name = vtranslate($module_name, $module_name);
            }

            $row['module_name'] = $module_name;
            if (mb_strlen(decode_html($row['summary']), 'UTF-8') > $listview_max_textlength) {
                $row['summary'] = mb_substr(decode_html($row['summary']), 0, $listview_max_textlength, 'UTF-8') . "...";
            }

            $conditions = decode_html($row['conditions']);
            $row['conditions'] = json_decode($conditions, true);
            $record->setData($row);
            $listViewRecordModels[$record->getId()] = $record;
        }
        $pagingModel->calculatePageRange($listViewRecordModels);

        if ($db->num_rows($listResult) > $pageLimit) {
            array_pop($listViewRecordModels);
            $pagingModel->set('nextPageExists', true);
        } else {
            $pagingModel->set('nextPageExists', false);
        }

        $nextPageResult = $db->pquery($nextListQuery, $params);
        $nextPageNumRows = $db->num_rows($nextPageResult);
        if ($nextPageNumRows <= 0) {
            $pagingModel->set('nextPageExists', false);
        }
        return $listViewRecordModels;
    }

    /*	 * *
     * Function which will get the list view count
     * @return - number of records
     */

    public function getListViewCount()
    {
        $db = PearDatabase::getInstance();

        $module = $this->getModule();
        $listQuery = 'SELECT count(*) AS count FROM ' . $module->baseTable . ' 
						INNER JOIN vtiger_tab ON vtiger_tab.name = ' . $module->baseTable . '.module_name
						AND vtiger_tab.presence IN (0,2) AND ' . $module->baseTable . '.deleted= ? ';

        $sourceModule = $this->get('sourceModule');
        if ($sourceModule) {
            $listQuery .= " WHERE module_name = '$sourceModule'";
        }
        $search_value = $this->get('search_value');
        if (!empty($search_value)) {
            $listQuery .= ' AND dfname like "%' . $search_value . '%"';
        }

        $listResult = $db->pquery($listQuery, array(0));
        return $db->query_result($listResult, 0, 'count');
    }

    /**
     * Function to get the list of listview links for the module
     * @param array $linkParams
     * @return array - Associate array of Link Type to List of Vtiger_Link_Model instances
     */

    public function getListViewLinks($linkParams = array())
    {
        $links = parent::getListViewLinks($linkParams);

        $moduleModel = Settings_Vtiger_Module_Model::getInstance("Settings:ITS4YouProcessFlow");
        $moduleSettingLinks = $moduleModel->getSettingLinks();
        foreach ($moduleSettingLinks as $settingsLink) {
            $links['LISTVIEWSETTING'][] = Vtiger_Link_Model::getInstanceFromValues($settingsLink);
        }
        return $links;
    }
}