<?php

/*+********************************************************************************
 * The content of this file is subject to the Key Metrics 4 You license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 ********************************************************************************/

class ITS4YouKeyMetrics
{
    public $moduleName = 'ITS4YouKeyMetrics';
    public $parentName = 'Tools';

    /**
     * Invoked when special actions are performed on the module.
     * @param String Module name
     * @param String Event Type
     */
    public function vtlib_handler($moduleName, $eventType)
    {
        switch ($eventType) {
            case 'module.enabled':
            case 'module.postupdate':
            case 'module.postinstall':
                $this->addCustomLinks();
                break;
            case 'module.disabled':
            case 'module.preuninstall':
            case 'module.preupdate':
                $this->deleteCustomLinks();
                break;
        }
    }

    public function addCustomLinks()
    {
        Settings_MenuEditor_Module_Model::addModuleToApp($this->moduleName, $this->parentName);
    }

    public function deleteCustomLinks()
    {
    }

    public function getNonAdminAccessControlQuery($module, $user, $scope = '')
    {
        return '';
    }
}
