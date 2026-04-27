<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouGoogleCalendarSync license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class ITS4YouProcessFlow_Module_Model extends Vtiger_Module_Model
{
    public static $mobileIcon = 'flow-branch';

    public function getSettingLinks()
    {
        $settingsLinks = array();

        $currentUserModel = Users_Record_Model::getCurrentUserModel();
        if ($currentUserModel->isAdminUser()) {
            $settingsLinks[] = array(
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => 'LBL_INTEGRATION',
                'linkurl' => $this->getDefaultUrl(),
            );

            $settingsLinks[] = array(
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => 'LBL_MODULE_REQUIREMENTS',
                'linkurl' => 'index.php?module=ITS4YouInstaller&parent=Settings&view=Requirements&mode=Module&sourceModule=ITS4YouProcessFlow',
            );

            $settingsLinks[] = array(
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => 'LBL_MODULE_REQUIREMENTS',
                'linkurl' => 'index.php?module=ITS4YouInstaller&view=License&parent=Settings&sourceModule=ITS4YouProcessFlow',
            );

            $settingsLinks[] = array(
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => 'LBL_UPGRADE',
                'linkurl' => 'index.php?module=ModuleManager&parent=Settings&view=ModuleImport&mode=importUserModuleStep1',
            );

            $settingsLinks[] = array(
                'linktype' => 'LISTVIEWSETTING',
                'linklabel' => 'LBL_UNINSTALL',
                'linkurl' => 'index.php?module=ITS4YouInstaller&view=Uninstall&parent=Settings&sourceModule=ITS4YouProcessFlow',
            );
        }
        return $settingsLinks;
    }

    public function getDefaultUrl()
    {
        return (string)parent::getDefaultUrl() . '&parent=Settings';
    }

    /**
     * @return array
     */
    public function getDatabaseTables()
    {
        return [
            'its4you_processflow',
            'its4you_processflowrel',
            'its4you_processflowrel_seq',
            'its4you_processflow_seq',
        ];
    }

    public function getPicklistFields()
    {
        return [];
    }
}