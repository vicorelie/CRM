<?php

/* +********************************************************************************
 * The content of this file is subject to the ITS4YouKeyMetrics license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouKeyMetrics_KeyMetrics_Model extends Vtiger_Base_Model
{

    /**
     * Function returns the instance of Folder model
     * @param FolderId
     * @return <Reports_Folder_Model>
     */
    public static function getInstanceById($id)
    {
        $keyMetricsModel = Vtiger_Cache::get('reportsKeyMetrics', $id);
        if (!$keyMetricsModel) {
            $db = PearDatabase::getInstance();
            $keyMetricsModel = ITS4YouKeyMetrics_KeyMetrics_Model::getInstance();

            $result = $db->pquery("SELECT * FROM  its4you_keymetrics4you WHERE id = ?", array($id));

            if ($db->num_rows($result) > 0) {
                $values = $db->query_result_rowdata($result, 0);
                $keyMetricsModel->setData($values);
            }
            Vtiger_Cache::set('reportsKeyMetrics', $id, $keyMetricsModel);
        }
        return $keyMetricsModel;
    }

    /**
     * Function returns the instance of Folder model
     * @return <Reports_Folder_Model>
     */
    public static function getInstance()
    {
        return new self();
    }

    /**
     * Function to set the if for the folder
     * @param <Number>
     */
    public function setId($value)
    {
        $this->set('id', $value);
    }

    /**
     * Function saves the folder
     */
    public function save()
    {
        $db = PearDatabase::getInstance();

        $id = $this->getId();
        $request = new Vtiger_Request($_REQUEST, $_REQUEST);
        $description = $request->get('description');

        // add home page widget
        $tabid = getTabid("Home");
        $type = 'DASHBOARDWIDGET';
        $label = $this->getName();

        $dashboardurl = 'index.php?module=ITS4YouKeyMetrics&view=ShowKeyMetrics&name=GetKeyMetrics&record=';
        if (!empty($id)) {
            $dashboardurl .= $id;
            $db->pquery('UPDATE  its4you_keymetrics4you SET name = ?, description = ? WHERE id = ?', array($label, $description, $id));

            $checkres = $db->pquery('SELECT linkid FROM vtiger_links WHERE tabid=? AND linktype=? AND linkurl=?',
                array($tabid, $type, $dashboardurl));
            if ($db->num_rows($checkres)) {
                $linkid = $db->query_result($checkres, 0, 'linkid');
                $db->pquery('UPDATE vtiger_links SET linklabel=? WHERE linkid=?', array($label, $linkid));
            }
        } else {
            $result = $db->pquery('SELECT MAX(id) AS id FROM  its4you_keymetrics4you', array());
            $id = (int)($db->query_result($result, 0, 'id')) + 1;
            $currentUser = Users_Record_Model::getCurrentUserModel();
            $db->pquery('INSERT INTO  its4you_keymetrics4you(id, smcreatorid, name, description) VALUES(?, ?, ?, ?)', array($id, $currentUser->id, $this->getName(), $description));
            $this->set('id', $id);
            $dashboardurl .= $id;

            require_once('vtlib/Vtiger/Module.php');
            $link_module = Vtiger_Module::getInstance('Home');
            $link_module->addLink($type, $label, $dashboardurl);
        }
    }

    /**
     * Function to get the id of the folder
     * @return Value
     */
    public function getId()
    {
        return $this->get('id');
    }

    /**
     * Function to get the name of the folder
     * @return Value
     */
    public function getName()
    {
        return $this->get('name');
    }

    /**
     * Function deletes the folder
     */
    public function delete()
    {
        $db = PearDatabase::getInstance();
        $db->pquery('DELETE FROM its4you_keymetrics4you WHERE id = ?', array($this->getId()));
        $db->pquery('DELETE FROM its4you_keymetrics4you_rows WHERE km_id = ?', array($this->getId()));

        if ($this->getId()) {
            $dashboardurl = '%module=ITS4YouKeyMetrics&view=ShowKeyMetrics&name=GetKeyMetrics&record=' . $this->getId() . '%';
            $tmpQry = ' FROM vtiger_links WHERE linkurl LIKE ?';
            $db->pquery('DELETE FROM vtiger_module_dashboard_widgets WHERE linkid IN (SELECT linkid ' . $tmpQry . ') ', array($dashboardurl));
            $db->pquery('DELETE ' . $tmpQry, array($dashboardurl));
        }
    }

    /**
     * Function returns Report Models for the folder
     * @param <Vtiger_Paging_Model> $pagingModel
     * @return <Reports_Record_Model>
     */
    public function getReports($pagingModel, $search_params = array())
    {

        $paramsList = array(
            'startIndex' => $pagingModel->getStartIndex(),
            'pageLimit' => $pagingModel->getPageLimit(),
            'orderBy' => $this->get('orderby'),
            'sortBy' => $this->get('sortby')
        );

        //$reportClassInstance = Vtiger_Module_Model::getClassInstance('ITS4YouKeyMetrics');

        $fldrId = $this->getId();

        if ($fldrId == 'All') {
            $fldrId = false;
            $paramsList = array(
                'startIndex' => $pagingModel->getStartIndex(),
                'pageLimit' => $pagingModel->getPageLimit(),
                'orderBy' => $this->get('orderby'),
                'sortBy' => $this->get('sortby')
            );
        }

        //$reportsList = $reportClassInstance->sgetRptsforFldr($fldrId, $paramsList);
        $reportsList = ITS4YouKeyMetrics::sgetRptsforFldr($fldrId, $paramsList, $search_params);

        /*
          if(!$fldrId){
          foreach ($reportsList as $reportId => $reports) {
          $reportsCount += count($reports);
          }
          }else{
          $reportsCount = count($reportsList);
          }
         */

        $reportModuleModel = Vtiger_Module_Model::getInstance('ITS4YouKeyMetrics');

        if ($fldrId == false) {
            return $this->getAllReportModels($reportsList, $reportModuleModel);
        } else {
            $reportModels = array();
            for ($i = 0; $i < count($reportsList); $i++) {
                $reportModel = new ITS4YouKeyMetrics_Record_Model();

                $reportModel->setData($reportsList[$i])->setModuleFromInstance($reportModuleModel);
                $reportModels[] = $reportModel;
                unset($reportModel);
            }
            return $reportModels;
        }
    }

    /**
     * Function to get all Report Record Models
     * @param <Array> $allReportsList
     * @param <Vtiger_Module_Model> - Reports Module Model
     * @return <Array> Reports Record Models
     */
    public function getAllReportModels($allReportsList, $reportModuleModel)
    {
        $allReportModels = array();
        $folders = self::getAll();

        foreach ($allReportsList as $key => $reportsList) {
            for ($i = 0; $i < count($reportsList); $i++) {
                $reportModel = new ITS4YouKeyMetrics_Record_Model();
                $reportModel->setData($reportsList[$i])->setModuleFromInstance($reportModuleModel);
                //$reportModel->set('foldername', $folders[$key]->getName());
                $allReportModels[] = $reportModel;
                unset($reportModel);
            }
        }

        return $allReportModels;
    }

    /**
     * Function returns the instance of Folder model
     * @return <Reports_Folder_Model>
     */
    public static function getAll()
    {
        $db = PearDatabase::getInstance();
        $folders = Vtiger_Cache::get('reports', 'KeyMetrics');
        if (!$folders) {
            $folders = array();
            $result = $db->pquery("SELECT * FROM  its4you_keymetrics4you WHERE deleted=? ORDER BY foldername ASC", array(0));
            $noOfFolders = $db->num_rows($result);
            if ($noOfFolders > 0) {
                for ($i = 0; $i < $noOfFolders; $i++) {
                    $folderModel = ITS4YouKeyMetrics_Folder_Model::getInstance();
                    $values = $db->query_result_rowdata($result, $i);
                    $folders[$values['folderid']] = $folderModel->setData($values);
                    Vtiger_Cache::set('reportsKeyMetrics', $values['folderid'], $folderModel);
                }
            }
            Vtiger_Cache::set('reports', 'KeyMetrics', $folders);
        }
        return $folders;
    }

    /**
     * Function returns duplicate record status of the module
     * @return true if duplicate records exists else false
     */
    public function checkDuplicate()
    {
        $db = PearDatabase::getInstance();

        $query = 'SELECT 1 FROM  its4you_keymetrics4you WHERE name = ? AND deleted=0';
        $params = array($this->getName());

        $id = $this->getId();
        if ($id) {
            $query .= ' AND id != ?';
            array_push($params, $id);
        }

        $result = $db->pquery($query, $params);

        if ($db->num_rows($result) > 0) {
            return true;
        }
        return false;
    }

    /**
     * Function returns whether reports are exist or not in this folder
     * @return true if exists else false
     */
    public function hasReports()
    {
        $db = PearDatabase::getInstance();

        $result = $db->pquery('SELECT 1 FROM its4you_reports4you WHERE folderid = ?', array($this->getId()));

        if ($db->num_rows($result) > 0) {
            return true;
        }
        return false;
    }

    /**
     * Function to get info array while saving a folder
     * @return Array  info array
     */
    public function getInfoArray()
    {
        return array(
            'folderId' => $this->getId(),
            'folderName' => $this->getName(),
            'editURL' => $this->getEditUrl(),
            'deleteURL' => $this->getDeleteUrl(),
            'isEditable' => $this->isEditable(),
            'isDeletable' => $this->isDeletable()
        );
    }

    /**
     * Function to get the url for edit folder from list view of the module
     * @return <string> - url
     */
    public function getEditUrl()
    {
        return 'index.php?module=Reports&view=EditFolder&folderid=' . $this->getId();
    }

    /**
     * Function to get the url for delete folder from list view of the module
     * @return <string> - url
     */
    public function getDeleteUrl()
    {
        return 'index.php?module=Reports&action=Folder&mode=delete&folderid=' . $this->getId();
    }

    /**
     * Function to check whether folder is editable or not
     * @return <bool>
     */
    public function isEditable()
    {
        if ($this->isDefault()) {
            return false;
        }

        return true;
    }

    /**
     * Function returns whether folder is Default or not
     * @return true if it is read only else false
     */
    public function isDefault()
    {
        if ($this->get('state') == 'SAVED') {
            return true;
        }
        return false;
    }

    /**
     * Function to get check whether folder is deletable or not
     * @return <bool>
     */
    public function isDeletable()
    {
        if ($this->isDefault()) {
            return false;
        }
        return true;
    }

    /**
     * Function to calculate number of reports in this folder
     * @return <Integer>
     */
    public function getReportsCount()
    {
        $db = PearDatabase::getInstance();
        $params = array();

        $sql = "SELECT count(*) AS count FROM its4you_reports4you
                    INNER JOIN its4you_reports4you_settings ON  its4you_reports4you_settings.reportid = its4you_reports4you.reports4youid
                    INNER JOIN its4you_reports4you_folder ON  its4you_reports4you_folder.folderid = its4you_reports4you.folderid
                     WHERE its4you_reports4you.deleted=0";
        $fldrId = $this->getId();
        if ($fldrId == 'All') {
            $fldrId = false;
        }

        // If information is required only for specific report folder?
        if ($fldrId !== false) {
            $sql .= " AND its4you_reports4you_folder.folderid=?";
            array_push($params, $fldrId);
        }
        $currentUserModel = Users_Privileges_Model::getCurrentUserPrivilegesModel();
        if (!$currentUserModel->isAdminUser()) {
            $currentUserId = $currentUserModel->getId();

            $groupId = implode(',', $currentUserModel->get('groups'));
            if ($groupId) {
                $groupQuery = "( shareid IN ($groupId) AND setype = 'groups') OR ";
            }

            $sql .= " AND (its4you_reports4you.reports4youid IN (SELECT reports4youid from its4you_reports4you_sharing WHERE $groupQuery (shareid = ? AND setype = 'users'))
						OR its4you_reports4you_settings.sharingtype = 'Public'
						OR its4you_reports4you_settings.owner = ?
						OR its4you_reports4you_settings.owner IN (SELECT vtiger_user2role.userid FROM vtiger_user2role
													INNER JOIN vtiger_users ON vtiger_users.id = vtiger_user2role.userid
													INNER JOIN vtiger_role ON vtiger_role.roleid = vtiger_user2role.roleid
													WHERE vtiger_role.parentrole LIKE ?))";

            $parentRoleSeq = $currentUserModel->get('parent_role_seq') . '::%';
            array_push($params, $currentUserId, $currentUserId, $parentRoleSeq);
        }
        $result = $db->pquery($sql, $params);
        return $db->query_result($result, 0, 'count');
    }

    /**
     * Function which provides the records for the current view
     * @param <Boolean> $skipRecords - List of the RecordIds to be skipped
     * @return <Array> List of RecordsIds
     */
    public function getRecordIds($skipRecords = false, $module)
    {
        $db = PearDatabase::getInstance();
        $baseTableName = "vtiger_report";
        $baseTableId = "reportid";
        $folderId = $this->getId();
        $listQuery = $this->getListViewQuery($folderId);

        if ($skipRecords && !empty($skipRecords) && is_array($skipRecords) && count($skipRecords) > 0) {
            $listQuery .= ' AND ' . $baseTableName . '.' . $baseTableId . ' NOT IN (' . implode(',', $skipRecords) . ')';
        }
        $result = $db->query($listQuery);
        $noOfRecords = $db->num_rows($result);
        $recordIds = array();
        for ($i = 0; $i < $noOfRecords; ++$i) {
            $recordIds[] = $db->query_result($result, $i, $baseTableId);
        }
        return $recordIds;
    }

    // ITS4YOU-CR SlOl 18. 1. 2016 10:51:05
    public static function getKeyMetricsRowsSql()
    {
        $kmSql = "SELECT  its4you_keymetrics4you_rows.* 
            FROM  its4you_keymetrics4you_rows 
            INNER JOIN  its4you_keymetrics4you ON  its4you_keymetrics4you_rows.km_id =  its4you_keymetrics4you.id AND  its4you_keymetrics4you.deleted = 0 
            
            WHERE  its4you_keymetrics4you_rows.deleted = 0 AND  its4you_keymetrics4you_rows.km_id = ? ORDER BY  its4you_keymetrics4you_rows.sequence ASC ";
        return $kmSql;
    }

    // ITS4YOU-END

    public function getKeyMetricsColumnOptions($record)
    {
        $request = new Vtiger_Request($_REQUEST, $_REQUEST);

        $currentModuleName = "ITS4YouKeyMetrics";
        $return = 1;
        $col_options = $column_str_val = "";
        if ($record != "") {

            if ($request->get("view") == "EditKeyMetricsRow" && $request->has("id") && !$request->isEmpty("id")) {
                $adb = PearDatabase::getInstance();
                $editResult = $adb->pquery("SELECT metrics_type, column_str FROM its4you_keymetrics4you_rows WHERE id=?", array($request->get("id")));
                if ($adb->num_rows($editResult) > 0) {
                    $row = $adb->fetchByAssoc($editResult, 0);
                    $column_str_val = $row["column_str"];
                    $metrics_type = $row["metrics_type"];
                }
            }

            if ($metrics_type == "customview") {
                $col_options .= "<optgroup label='" . vtranslate("LBL_COUNT", $currentModuleName) . "'>";
                $col_options .= "<option value='COUNT' selected='selected' >" . vtranslate("LBL_COUNT", $currentModuleName) . " " . vtranslate("LBL_OF", $currentModuleName) . " " . vtranslate("LBL_RECORDS", $currentModuleName) . "</option>";
                $col_options .= "</optgroup>";
                $return = $col_options;
            } else {

            }
        }
        return $return;
    }

}
