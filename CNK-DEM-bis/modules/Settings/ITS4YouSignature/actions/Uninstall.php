<?php
/* * *******************************************************************************
* The content of this file is subject to the ITS4YouSignature license.
* ("License"); You may not use this file except in compliance with the License
* The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
* Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
* All Rights Reserved.
* ****************************************************************************** */

class Settings_ITS4YouSignature_Uninstall_Action extends Settings_Vtiger_Basic_Action
{

    /**
     * @param Vtiger_Request $request
     */
    public function process(Vtiger_Request $request)
    {

        $Vtiger_Utils_Log = true;
        include_once('vtlib/Vtiger/Module.php');
        $adb = PearDatabase::getInstance();
        $moduleName = $request->getModule();
        $moduleModel = Vtiger_Module_Model::getInstance($moduleName);
        $result = array('success' => false);

        if ($moduleModel) {
            $moduleModel->delete();
            $adb->pquery('DELETE FROM vtiger_crmentity WHERE setype=?', array($moduleName));

            if(method_exists($moduleModel, 'getDatabaseTables')) {
                foreach($moduleModel->getDatabaseTables() as $table) {
                    $adb->pquery('DROP TABLE IF EXISTS '.$table);
                }
            }

            $folders = [
                'modules/' . $moduleName,
                'modules/Settings/' . $moduleName,
                'layouts/vlayout/modules/' . $moduleName,
                'layouts/vlayout/modules/Settings/' . $moduleName,
                'layouts/v7/modules/' . $moduleName,
                'layouts/v7/modules/Settings/' . $moduleName,
            ];

            foreach ($folders as $folder) {
                @shell_exec('rm -r ' . $folder);

                if(is_dir($folder)) {
                    $this->deleteFiles($folder);
                }
            }

            $dirs = array_diff(scandir('languages/'), array('..', '.'));

            foreach ($dirs as $dir) {
                if (is_dir('languages/' . $dir)) {
                    $languages = [
                        'languages/' . $dir . '/' . $moduleName . '.php',
                        'languages/' . $dir . '/Settings/' . $moduleName . '.php',
                    ];

                    foreach ($languages as $language) {
                        @shell_exec('rm -f ' . $language);

                        if(is_file($language)) {
                            unlink($language);
                        }
                    }
                }
            }

            $result = array('success' => true);
        }

        ob_clean();
        $response = new Vtiger_Response();
        $response->setResult($result);
        $response->emit();
    }

    /**
     * @param string $dir
     * @return bool
     */
    public function deleteFiles($dir) {
        $files = array_diff(scandir($dir), array('.','..'));

        foreach ($files as $file) {
            (is_dir("$dir/$file")) ? $this->deleteFiles("$dir/$file") : unlink("$dir/$file");
        }

        return rmdir($dir);
    }
}
