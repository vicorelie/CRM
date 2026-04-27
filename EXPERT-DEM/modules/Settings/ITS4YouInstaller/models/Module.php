<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouInstaller license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouInstaller_Module_Model extends Settings_Vtiger_Module_Model
{

    /**
     * @var string
     */
    public $name = 'ITS4YouInstaller';
    /**
     * @var string
     */
    private $encodeFile = 'getLicensePermissions';
    /**
     * @var bool
     */
    private $extensionModel = false;

    /**
     * @param string $moduleName
     * @return Settings_ITS4YouInstaller_Module_Model|Settings_Vtiger_Module_Model
     */
    public static function getInstance($moduleName = 'ITS4YouInstaller')
    {
        $moduleModel = parent::getInstance($moduleName);
        $objectProperties = get_object_vars($moduleModel);

        $instance = new self();
        foreach ($objectProperties as $properName => $propertyValue) {
            $instance->$properName = $propertyValue;
        }
        return $instance;
    }

    /**
     * @return string
     */
    public function getDefaultUrl()
    {
        return 'index.php?module=' . $this->getName() . '&parent=Settings&view=' . $this->getDefaultViewName();
    }

    /**
     * @return string
     */
    public function getDefaultViewName()
    {
        return 'Extensions';
    }

    /**
     * @return array
     */
    public function getITS4YouInstalledModules()
    {
        $ITS4YouModules = array();
        $ModulesList = Vtiger_Module_Model::getAll();

        $its4YouModules = array("Cashflow4You", "PDFMaker", "EMAILMaker");

        foreach ($ModulesList as $lModuleModel) {
            $lModuleName = $lModuleModel->getName();

            if (in_array($lModuleName, $its4YouModules) || substr($lModuleName, 0, 7) == "ITS4You") {
                if (vtlib_isModuleActive($lModuleName)) {
                    $ITS4YouModules[] = $lModuleModel;
                }
            }
        }

        return $ITS4YouModules;
    }

    /**
     * @param $module
     * @param $license
     * @return bool
     * @throws Exception
     */
    public function isLicenseActive($module, $license)
    {

        return $this->getExtension()->isLicenseActive($module, $license);
    }

    /**
     * @return Settings_ITS4YouInstaller_Extension_Model
     * @throws Exception
     */
    public function getExtension()
    {
        if (!$this->extensionModel) {
            $this->extensionModel = Settings_ITS4YouInstaller_Extension_Model::getInstance();
        }

        return $this->extensionModel;
    }

    /**
     * @param $alertId
     * @param $message
     * @param string $type
     * @param string $link
     * @return mixed
     */
    public function addAlert($alertId, $message, $type = 'info', $link = '')
    {
        $adb = PearDatabase::getInstance();

        if (!empty($alertId)) {
            $result = $adb->pquery('SELECT * FROM its4you_installer_alert WHERE alert=?', array($alertId));

            if ((int)$adb->num_rows($result) == 0) {
                $adb->pquery('INSERT INTO its4you_installer_alert (alert, message, alert_type, createdtime, status, link) VALUES (?,?,?,NOW(),?,?)', array($alertId, $message, $type, 0, $link));
            } else {
                $adb->pquery('UPDATE its4you_installer_alert SET message=?, alert_type=?, createdtime=NOW(), status=?, link=? WHERE alert=?', array($message, $type, 0, $link, $alertId));
            }
        }

        return $alertId;
    }

    /**
     * @return array
     */
    public function getAlerts()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT * FROM its4you_installer_alert ORDER BY status ASC, createdtime DESC LIMIT 10');
        $rows = array();

        while ($row = $adb->fetchByAssoc($result)) {
            $alertData = $row;

            $icon = 'info-circle';

            if (isset($alertData['alert_type'])) {
                if ($alertData['alert_type'] == 'update') {
                    $icon = 'refresh';
                } elseif ($alertData['alert_type'] == 'warning') {
                    $icon = 'warning';
                } elseif ($alertData['alert_type'] == 'question') {
                    $icon = 'question';
                } elseif ($alertData['alert_type'] == 'notice') {
                    $icon = 'bell';
                }
            }

            $alertData['icon'] = $icon;
            $rows[$row['alert']] = $alertData;
        }

        return $rows;
    }

    /**
     * @param $alertId
     * @return bool
     */
    public function updateAlert($alertId)
    {
        $adb = PearDatabase::getInstance();
        $adb->pquery('UPDATE its4you_installer_alert SET status=? WHERE alert=?', array(1, $alertId));

        return true;
    }

    /**
     * @param $alertId
     * @return bool
     */
    public function deleteAlert($alertId)
    {
        $adb = PearDatabase::getInstance();
        $adb->pquery('DELETE FROM its4you_installer_alert WHERE alert=?', array($alertId));

        return true;
    }

    /**
     * @return bool
     */
    public static function clearAlerts()
    {
        PearDatabase::getInstance()->query('DELETE FROM its4you_installer_alert');

        return true;
    }
}
