<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouSignature license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouSignature_Folder_Model extends Documents_Folder_Model
{

    /**
     * @param $value
     * @return bool|Documents_Folder_Model
     * @throws Exception
     */
    public static function getInstanceByName($value)
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT folderid FROM vtiger_attachmentsfolder WHERE foldername = ?', [$value]);
        $folderId = $adb->query_result($result, 0, 'folderid');

        if ($folderId && is_numeric($folderId)) {
            return parent::getInstanceById($folderId);
        }

        return false;
    }
}