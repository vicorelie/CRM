<?php

/*+********************************************************************************
 * The content of this file is subject to the Key Metrics 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class ITS4YouKeyMetrics_CVRecord_Helper extends CustomView_Record_Model
{

    public static $cvIdsToView = array();

    public static function setCustomViewRecordsToView($newVar = '')
    {
        $cvResult = ITS4YouKeyMetrics_CVRecord_Helper::getAllByGroup();
        if (!empty($cvResult)) {
            foreach ($cvResult as $cvType => $cvData) {
                foreach ($cvData as $cvRecord) {
                    self::$cvIdsToView[] = $cvRecord->get('cvid');
                }
            }
        }
    }

    /**
     * Function to get all the custom views, of a given module if specified, grouped by their status
     * @param <String> $moduleName
     * @return <Array> - Associative array of Status label to an array of Vtiger_CustomView_Record models
     */
    public static function getAllByGroup($moduleName = '', $listMode = true)
    {
        $customViews = self::getAll($moduleName);
        $groupedCustomViews = array();
        $groupedCustomViews['Mine'] = array();
        $groupedCustomViews['Shared'] = array();
        foreach ($customViews as $index => $customView) {
            if ($customView->isMine() && ($customView->get('viewname') != 'All' || !$listMode)) {
                $groupedCustomViews['Mine'][] = $customView;
            } elseif ($customView->isPublic()) {
                $groupedCustomViews['Public'][] = $customView;
                $groupedCustomViews['Shared'][] = $customView;
            } elseif ($customView->isPending()) {
                $groupedCustomViews['Pending'][] = $customView;
                $groupedCustomViews['Shared'][] = $customView;
            } else {
                $groupedCustomViews['Others'][] = $customView;
                $groupedCustomViews['Shared'][] = $customView;
            }
        }
        if (empty($groupedCustomViews['Shared'])) {
            unset($groupedCustomViews['Shared']);
        }
        return $groupedCustomViews;
    }

    /**
     * Function to get all the accessible Custom Views, for a given module if specified
     * @param <String> $moduleName
     * @return <Array> - Array of Vtiger_CustomView_Record models
     */
    public static function getAll($moduleName = '')
    {
        $db = PearDatabase::getInstance();
        $userPrivilegeModel = Users_Privileges_Model::getCurrentUserPrivilegesModel();
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $fixed = false;

        $sql = 'SELECT * FROM vtiger_customview';
        $params = array();

        if (!empty($moduleName)) {
            $sql .= ' WHERE entitytype=?';
            $params[] = $moduleName;
        }
        if (!$userPrivilegeModel->isAdminUser()) {
            $userGroups = new GetUserGroups();
            $userGroups->getAllUserGroups($currentUser->getId());
            $groups = $userGroups->user_groups;
            $userRole = fetchUserRole($currentUser->getId());
            $parentRoles = getParentRole($userRole);
            $parentRolelist = array();
            foreach ($parentRoles as $par_rol_id) {
                array_push($parentRolelist, $par_rol_id);
            }
            array_push($parentRolelist, $userRole);

            $userParentRoleSeq = $userPrivilegeModel->get('parent_role_seq');
            if (!$moduleName && !$fixed) {
                $sql .= ' WHERE';
                $fixed = true;
            } else {
                $sql .= ' AND';
            }
            $sql .= " ( vtiger_customview.userid = ? OR vtiger_customview.status = 0 OR vtiger_customview.status = 3 
							OR vtiger_customview.userid IN (
								SELECT vtiger_user2role.userid FROM vtiger_user2role
									INNER JOIN vtiger_users ON vtiger_users.id = vtiger_user2role.userid
									INNER JOIN vtiger_role ON vtiger_role.roleid = vtiger_user2role.roleid
								WHERE vtiger_role.parentrole LIKE '" . $userParentRoleSeq . "::%') 
							OR vtiger_customview.cvid IN (SELECT vtiger_cv2users.cvid FROM vtiger_cv2users WHERE vtiger_cv2users.userid=?)";
            $params[] = $currentUser->getId();
            $params[] = $currentUser->getId();
            if (!empty($groups)) {
                $sql .= " OR vtiger_customview.cvid IN (SELECT vtiger_cv2group.cvid FROM vtiger_cv2group WHERE vtiger_cv2group.groupid IN (" . generateQuestionMarks($groups) . "))";
                $params = array_merge($params, $groups);
            }

            $sql .= " OR vtiger_customview.cvid IN (SELECT vtiger_cv2role.cvid FROM vtiger_cv2role WHERE vtiger_cv2role.roleid =?)";
            $params[] = $userRole;
            if (!empty($parentRolelist)) {
                $sql .= " OR vtiger_customview.cvid IN (SELECT vtiger_cv2rs.cvid FROM vtiger_cv2rs WHERE vtiger_cv2rs.rsid IN (" . generateQuestionMarks($parentRolelist) . "))";
                $params = array_merge($params, $parentRolelist);
            }

            $sql .= ")";
        }

        $result = $db->pquery($sql, $params);
        $noOfCVs = $db->num_rows($result);
        $customViews = array();
        for ($i = 0; $i < $noOfCVs; ++$i) {
            $row = $db->query_result_rowdata($result, $i);
            $customView = new self();
            $customViews[] = $customView->setData($row)->setModule($row['entitytype']);
        }
        return $customViews;
    }

}