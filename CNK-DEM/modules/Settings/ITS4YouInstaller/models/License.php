<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouInstaller license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

class Settings_ITS4YouInstaller_License_Model extends Vtiger_Base_Model
{

    /**
     * @var
     */
    protected $license;
    protected $parentLicenseProcess = false;
    /**
     * @var string
     */
    private $encodeFile = 'getLicensePermissions';

    /**
     * @param $module
     * @param string $type
     * @return array
     * @throws Exception
     */

    public static function permission($module, $type = 'List')
    {

        return (new self())->getPermission($module, $type);
    }

    /**
     * @param $module
     * @param string $type
     * @return array
     * @throws Exception
     */
    protected function getPermission($module, $type = 'List')
    {
	    $license_key = '';
        $license_type = 'Deactivated';
        $hash = $access = false;
        $sessionName = md5('Permission' . $module . $type) . date('ymd');
        $errors = $_SESSION['ITS4YouErrors'][$module];

        if (isset($_SESSION['ITS4YouLicense'][$sessionName])) {
            $access = $_SESSION['ITS4YouLicense'][$sessionName];
        } else {
            $list = self::getCachedList();

            if (!empty($list)) {
                /** @var Settings_ITS4YouInstaller_License_Model $license */
                foreach ($list as $license_key => $license) {
                    $access = false;

                    if ($license->isModuleReady($module)) {
                        if (!$license->validatePackageUrl()) {
                            $errors[2] = 'LBL_LICENSE_NOT_ACTIVE_FOR_THIS_SITE';
                        } elseif (!$license->isExpired()) {
                            unset($errors[3]);
                            $access = '2';
                        } elseif ((int)$license->get('subscription') == 1) {
                            $access = ($type == 'List' || $type == 'Detail') ? '2' : false;
                            $errors[3] = 'LBL_LICENSE_EXPIRED_SUBSCRIPTION';
                        } elseif ((int)$license->get('demo_free') == 1) {
                            $errors[3] = 'LBL_LICENSE_EXPIRED_TRIAL';
                        } else {
                            $errors[3] = 'LBL_LICENSE_RENEW_RECOMMENDED';
                            $access = '2';
                        }

                        if('2' === $access && $license->isLicensePerUser() && !$license->isUserAvailable($module)) {
                            $errors[3] = 'LBL_LICENSE_USED_BY_OTHER_USERS';
                            $access = false;
                        }

                        if ('2' === $access) {
	                        $_SESSION['ITS4YouLicenseKey'][$sessionName] = $license_key;
                            $_SESSION['ITS4YouVersion'][$sessionName] = $license->getType();
                            break;
                        }
                    }
                }

                if (!$access) {
                    $errors[6] = 'LBL_NO_ACTIVE_LICENSE_FOR_MODULE';
                }

            } else {
                $errors[1] = 'LBL_NO_ACTIVE_LICENSES';
            }
        }

        $_SESSION['ITS4YouLicense'][$sessionName] = $access;

        if ('2' === $access) {
            $strLen = strlen($type) + 2;
            $hash = date($type . $strLen);
	        $license_type = $_SESSION['ITS4YouVersion'][$sessionName];
	        $license_key = $_SESSION['ITS4YouLicenseKey'][$sessionName];
        } else {
            $errors[1] = 'LBL_LICENSE_INACTIVE';
        }

        $_SESSION['ITS4YouErrors'][$module] = $errors;

        return array(
            'success' => $hash,
            'errors' => $errors,
            'type' => $license_type,
	        'key' => $license_key,
        );
    }

    /**
     * @return array
     * @throws Exception
     */
    public static function getCachedList()
    {
        $extension = self::getExtensionModel();
        $sessionName = $extension->getSessionName('getCachedList');
        $list = $extension->getSessionData($sessionName);

        if (!$list) {
            $list = self::getList();

            $extension->setSessionData($sessionName, $list);
        }

        return (array)$list;
    }

    /**
     * @return Settings_ITS4YouInstaller_Extension_Model
     * @throws Exception
     */
    protected static function getExtensionModel()
    {
        $moduleModel = new Settings_ITS4YouInstaller_Module_Model();

        return $moduleModel->getExtension();
    }

    /**
     * @return array
     * @throws Exception
     */
    public static function getList()
    {
        $list = array();
        $adb = PearDatabase::getInstance();
        $query = $adb->query('SELECT license FROM ' . self::getTable());

        while ($row = $adb->fetchByAssoc($query)) {
            $license = Settings_ITS4YouInstaller_License_Model::getInstance($row['license']);

            if (is_object($license)) {
                $list[$license->license] = $license;
            }
        }

        return $list;
    }

    /**
     * @return string
     */
    protected static function getTable()
    {
        return 'its4you_installer_license';
    }

    /**
     * @param $license
     * @return bool|Settings_ITS4YouInstaller_License_Model
     * @throws Exception
     */
    public static function getInstance($license)
    {
        $self = new self();
        $self->license = $license;
        $self->setData($self->getLicenseData());

        if ($self->control()) {
            return $self;
        }

        return false;
    }

    /**
     * @return bool
     * @throws Exception
     */
    protected function getLicenseData()
    {
        $adb = PearDatabase::getInstance();
        $extensionModel = self::getExtensionModel();
        $profile = self::getProfile();

        if (isset($profile['userid']) && is_numeric($profile['userid'])) {
            try {
                $result = $adb->pquery($this->getSelectSql(), array($this->license));
                $data = $adb->query_result($result, 0, 'license_data');
                $license = $extensionModel->decodeString($data, (int)$profile['userid']);

            } catch (Exception $e) {
                $license = false;
            }

            if (is_object($license)) {
                return $license->getData();
            }
        }

        return false;
    }

    /**
     * @return array|bool|mixed
     * @throws Exception
     */
    public static function getProfile()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT * FROM its4you_installer_user');
        $row = $adb->query_result_rowdata($result);

        return !empty($row) ? $row : false;
    }

    /**
     * @return string
     */
    protected function getSelectSql()
    {
        return 'SELECT * FROM ' . self::getTable() . ' WHERE license = ?';
    }

    /**
     * @return array
     * @throws Exception
     */
    public function update()
    {
        return $this->setLicenseData(false);
    }

    /**
     * @return bool
     */
    public function isUpdated()
    {
        return ((int)$this->get('last_update') == (int)date('ymd'));
    }

    /**
     * @param bool $activate
     * @return array
     * @throws Exception
     */
    protected function setLicenseData($activate = true)
    {
        $license = $this->license;
        $result = ['success' => false, 'message' => 'LBL_SET_LICENSE_ERROR'];

        if (!empty($license)) {
            $extensionModel = self::getExtensionModel();
            $profile = self::getProfile();
            $userId = (int)$profile['userid'];

            if ($activate) {
                $extensionModel->setLicenseAction('activate');
            }

            $license_data = $extensionModel->getLicenseData($license);

            if (!isset($license_data['licence']) && empty($license_data['licence'])) {
                if ($this->isFull()) {
                    $license_data = $this->getLicenseData();
                    $result['message'] = 'LBL_FULL_LICENSE_NOT_UPDATED';
                }
            }

            $this->setData($license_data);
            $this->set('last_update', date('ymd'));
            $dataEncode = null;

            if (isset($userId) && is_numeric($userId)) {
                if (!is_array($license_data)) {
                    $result['message'] = 'LBL_INVALID_LICENSE_DATA';
                } elseif ($this->hasParentLicense() && !$this->parentLicenseProcess) {
                    $result['message'] = 'LBL_SUB_LICENSE_ACTIVATE_ERROR';
                } elseif ($license_data['licence'] == $license && $this->control()) {
                    $dataEncode = $extensionModel->encodeString($this, $userId);
                    $result['success'] = true;
                    $result['message'] = 'LBL_ACTIVATE_MESSAGE';

                    $this->addLicense($license, $dataEncode);
                } elseif (isset($license_data['error'])) {
                    $result['message'] = $license_data['error'];
                } else {
                    $result['message'] = 'LBL_INVALID_LICENSE_DATA';
                }
            } else {
                $result['message'] = 'LBL_USER_NOT_LOGGED_IN';
            }

            $this->clearCache();
        }

        return $result;
    }

    public function isPackageModule($module)
    {
        return in_array($module, (array)$this->get('package_modules')) && in_array($module, (array)$this->get('allowed_modules'));
    }

    /**
     * @return bool
     */
    public function isFull()
    {

        return !$this->isTrial() && !$this->isSubscription();
    }

    public function isTrial()
    {
        return !$this->isEmpty('demo_free') && $this->get('demo_free') == '1';
    }

    public function isSubscription()
    {
        return !$this->isEmpty('subscription') && $this->get('subscription') == '1';
    }

    /**
     * @return bool
     */
    public function control()
    {
        $license_data = $this->getData();
        $required = array('licenceid', 'licence', 'purchase_date', 'activate_date', 'due_date', 'service_usageunit', 'last_update');

        foreach ($required as $value) {
            if (!isset($license_data[$value]) || empty($license_data[$value])) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param $license
     * @param $data
     */
    protected function addLicense($license, $data)
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT license FROM ' . self::getTable() . ' WHERE license LIKE ?', [$license]);

        if ($adb->getRowCount($result)) {
            $adb->pquery('UPDATE ' . self::getTable() . ' SET license_data = ? WHERE license LIKE ?', [$data, $license]);
        } else {
            $adb->pquery('INSERT INTO ' . self::getTable() . ' (license, license_data) VALUES (?,?)', [$license, $data]);
        }
    }

    /**
     *
     */
    public function clearCache()
    {
        unset($_SESSION['ITS4YouLicense']);
        unset($_SESSION['ITS4YouErrors']);
        unset($_SESSION['ITS4YouVersion']);
        unset($_SESSION['ITS4YouExtension']);
    }

    /**
     * @throws Exception
     */
    public static function updateLicensesAlerts()
    {
        $licenses = self::getList();
        $qualifiedModule = 'Settings:ITS4YouInstaller';
        $moduleModel = Settings_Vtiger_Module_Model::getInstance($qualifiedModule);

        if (!empty($licenses)) {
            foreach ($licenses as $licenseKey => $license) {
                if ($license->isRenewReady()) {
                    $message = substr($licenseKey, 0, 5) . '... ';

                    if ($license->isExpired()) {
                        $message .= vtranslate('LBL_LICENSE_EXPIRED', $qualifiedModule);
                        $type = 'warning';

                    } else {
                        require_once 'modules/Vtiger/helpers/Util.php';

                        $message .= vtranslate('LBL_LICENSE_EXPIRE_IN', $qualifiedModule) . ' ' . (string)self::formatDateDiffInStrings($license->get('due_date'));
                        $type = 'notice';
                    }

                    $moduleModel->addAlert($license->get('licenceid'), $message, $type, $moduleModel->getDefaultUrl());
                }
            }
        }
    }

    public static function formatDateDiffInStrings($dateTime)
    {
        $seconds = time() - strtotime($dateTime);
        $prefix = '';
        $suffix = '';

        if ($seconds == 0) {
            return vtranslate('LBL_JUSTNOW');
        } elseif ($seconds > 0) {
            $suffix = ' ' . vtranslate('LBL_AGO');
        } else {
            if ($seconds < 0) {
                $prefix = vtranslate('LBL_DUE') . ' ';
                $seconds = -($seconds);
            }
        }

        $minutes = floor($seconds / 60);
        $hours = floor($minutes / 60);
        $days = floor($hours / 24);
        $months = floor($days / 30);
        $years = floor($months / 12);

        if ($seconds < 60) {
            $date = self::pluralize($seconds, "LBL_SECOND");
        } elseif ($minutes < 60) {
            $date = self::pluralize($minutes, "LBL_MINUTE");
        } elseif ($hours < 24) {
            $date = self::pluralize($hours, "LBL_HOUR");
        } elseif ($days < 30) {
            $date = self::pluralize($days, "LBL_DAY");
        } elseif ($months < 12) {
            $date = self::pluralize($months, "LBL_MONTH");
        } else {
            $years = ($years == 0) ? 1 : $years;
            $date = self::pluralize($years, "LBL_YEAR");
        }

        return (string)$prefix . $date . $suffix;
    }

    public static function pluralize($count, $text)
    {
        return $count . " " . (($count == 1) ? vtranslate($text) : vtranslate($text . 'S'));
    }

    /**
     * @param $license
     * @return Settings_ITS4YouInstaller_License_Model
     */
    public static function getCleanInstance($license)
    {
        $self = new self();
        $self->license = $license;

        return $self;
    }

    /**
     * @return array
     */
    public static function getEmptyLicenses()
    {
        $adb = PearDatabase::getInstance();
        $sql = 'SELECT license FROM ' . self::getTable() . ' WHERE license_data IS NULL';
        $result = $adb->pquery($sql, []);
        $licenses = [];

        while ($row = $adb->fetchByAssoc($result)) {
            array_push($licenses, $row['license']);
        }

        return $licenses;
    }

    public static function deleteEmptyLicenses()
    {
        $adb = PearDatabase::getInstance();
        $sql = 'DELETE FROM ' . self::getTable() . ' WHERE license_data IS NULL';
        $adb->pquery($sql);
    }

    /**
     * @return array
     * @throws Exception
     */
    public function activate()
    {
        return $this->setLicenseData(true);
    }

    /**
     * @throws Exception
     */
    public function activateParents()
    {
        if ($this->isEmpty('parent_licenses')) {
            return;
        }

        foreach ($this->get('parent_licenses') as $parentLicense) {
            $licenseModel = self::getInstance((string)$parentLicense);

            if (!$licenseModel) {
                $licenseModel = self::getCleanInstance((string)$parentLicense);
            }

            if ($licenseModel) {
                $licenseModel->setParentLicenseProcess(true);
                $licenseModel->activate();
            }
        }
    }

    public function getParentClass()
    {
        return 'parent' . $this->get('parentlicenseid');
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function deactivate()
    {
        return $this->clearLicenseData();
    }

    /**
     * @throws Exception
     */
    public function deactivateParents()
    {
        if ($this->isEmpty('parent_licenses')) {
            return;
        }

        $this->setParentLicenseProcess(true);

        foreach ($this->get('parent_licenses') as $parentLicense) {
            $licenseModel = self::getInstance((string)$parentLicense);

            if ($licenseModel) {
                $licenseModel->setParentLicenseProcess(true);
                $licenseModel->deactivate();
            }
        }
    }

    /**
     * @return bool
     * @throws Exception
     */
    protected function clearLicenseData()
    {
        $license = $this->license;

        if (!empty($license)) {
            $profile = self::getProfile();

            if (!empty($profile)) {
                $extensionModel = self::getExtensionModel();
                $extensionModel->setLicenseAction('deactivate');
                $extensionModel->getLicenseData($license);

                $this->deleteLicense();
                $this->clearCache();

                return true;
            }
        }

        return false;
    }

    /**
     * @return mixed
     */
    protected function deleteLicense()
    {
        $adb = PearDatabase::getInstance();

        return $adb->pquery('DELETE FROM ' . self::getTable() . ' WHERE license = ?', array($this->license));
    }

    /**
     * @return string
     */
    public function getYear()
    {
        return date('Y', strtotime($this->get('due_date')));
    }

    /**
     * @return bool
     */
    public function isRenewReady()
    {
        return ($this->isExpired() || strtotime('-30 days', strtotime($this->get('due_date'))) <= time());
    }

    /**
     * @return bool
     */
    public function isExpired()
    {
        return (strtotime($this->get('due_date')) <= time());
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function validatePackageUrl()
    {
        $extensionModel = self::getExtensionModel();
        $profile = self::getProfile();
        $url = $this->getRawUrl(vglobal('site_URL'));
        $packageUrl = $this->getRawUrl($extensionModel->decodeString($this->get('package_url'), $profile['userid']));
        $packageUrl2 = $this->getRawUrl($extensionModel->decodeString($this->get('package_url2'), $profile['userid']));

        return $url === $packageUrl || $url === $packageUrl2;
    }

    /**
     * @param string $url
     * @return string
     */
    public function getRawUrl($url)
    {
        $url = str_replace(['https', 'http'], ['', ''], $url);

        return trim($url, ': /');
    }

    /**
     * @param string $module
     * @return bool
     */
    public function isModuleReady($module = '')
    {
        return (!empty($module) && in_array($module, (array)$this->get('allowed_modules')));
    }

    /**
     * @param $tabId
     * @return bool
     */
    public function isModuleIdReady($tabId)
    {

        return isset($this->get('allowed_modules')[$tabId]);
    }

    /**
     * @return bool|int
     */
    public function isCronActive()
    {
        $cron = Vtiger_Cron::getInstance('ITS4YouInstaller');

        if (is_object($cron) && $cron->getFrequency() < 900000) {
            return $cron->getStatus();
        }

        return false;
    }

    /**
     * @return string
     */
    public function getRenewUrl()
    {
        return 'https://it-solutions4you.com/renew-license?source=installer&renewlicense=' . $this->getConvertCode();
    }

    public function getConvertUrl()
    {
        return 'https://it-solutions4you.com/convert-trial-license/?source=installer&convertlicense=' . $this->getConvertCode();
    }

    public function getRandomWord()
    {
        $pieces = [];
        $length = rand(6, 12);
        $keyspace = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $max = mb_strlen($keyspace, '8bit') - 1;

        for ($i = 0; $i < $length; ++$i) {
            $pieces[] = $keyspace[rand(0, $max)];
        }

        return implode('', $pieces);
    }

    public function getName()
    {
        return $this->get('licence');
    }

    public function getId()
    {
        return $this->get('licenceid');
    }

    public function getConvertCode()
    {
        $key = '1248250';
        $licenseCode = '50x' . $this->get('licenceid');
        $licenseName = $this->get('licence');
        $packageName = $this->get('servicename');
        $string = $this->getRandomWord() . ':' . $licenseName . ':' . $packageName . ':' . $licenseCode;
        $result = '';

        for ($i = 0, $k = strlen($string); $i < $k; $i++) {
            $char = substr($string, $i, 1);
            $keyChar = substr($key, ($i % strlen($key)) - 1, 1);
            $char = chr(ord($char) + ord($keyChar));
            $result .= $char;
        }

        return rawurlencode(base64_encode($result));
    }

    /**
     * @return string
     */
    public function getExpireString()
    {

        return ($this->has('due_date') && !$this->isEmpty('due_date') && strtotime($this->get('due_date'))) ? ', ' . (string)self::formatDateDiffInStrings($this->get('due_date')) : '';
    }

    public function getType()
    {
        return $this->get('install_type');
    }

    /**
     * @return bool
     */
    public function isHostingLicense()
    {
        return 1 === (int)$this->get('hosting_licence');
    }

    /**
     * @return bool
     * @throws Exception
     */
    public static function hasHostingLicense()
    {
        $licenses = self::getCachedList();

        if (!empty($licenses)) {
            foreach ($licenses as $license) {
                if ($license->isHostingLicense()) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param int $count
     * @param string $type
     * @return array|null
     * @throws Exception
     */
    public function updateUsedCount($count, $type = 'replace')
    {
        $result = false;
        $extensionModel = Settings_ITS4YouInstaller_Extension_Model::getInstance();
        $extensionLookUpUrl = $extensionModel->getExtensionsLookUpUrl();
        $types = [
            'replace' => 'replace',
            'add' => 'increase',
            'delete' => 'decrease',
        ];

        if ($extensionLookUpUrl && $extensionModel->checkRegistration()) {
            $profile = $extensionModel->getProfile();

            if (!empty($profile)) {
                $params = array(
                    'license_id' => $this->get('licenceid'),
                    'used_count' => $count,
                    'used_count_type' => $types[$type],
                    'url' => $extensionModel->getExtensionsLookUpUrl()
                );

                $result = $extensionModel->getConnector()->updateUsedCount($params);
            }
        }

        return $result;
    }

    /**
     * @param int $userId
     * @param string $moduleName
     * @return void
     * @throws Exception
     */
    public function saveLicenseUser($userId, $moduleName)
    {
        $adb = PearDatabase::getInstance();
        $numResult = $adb->pquery('SELECT id FROM its4you_installer_license_user WHERE user_id=? AND module=?', [$userId, $moduleName]);
        $params = [$this->getName(), $userId, $moduleName];
        $sql = null;

        if ($adb->num_rows($numResult)) {
            $sql = 'UPDATE its4you_installer_license_user SET license=? WHERE user_id=? AND module=? ';
        } elseif ($this->getOrderedCount() > $this->getUsersCount()) {
            $sql = 'INSERT INTO its4you_installer_license_user (license, user_id, module) VALUES (?,?,?)';
        }

        if (!empty($sql)) {
            $adb->pquery($sql, $params);
            $this->calculateUsedCount();
            $this->clearCache();
        }
    }

    /**
     * @param int $userId
     * @param string $moduleName
     * @return void
     * @throws Exception
     */
    public function deleteLicenseUser($userId, $moduleName)
    {
        $adb = PearDatabase::getInstance();
        $adb->pquery('DELETE FROM its4you_installer_license_user WHERE user_id=? AND module=?', [$userId, $moduleName]);

        $this->calculateUsedCount();
        $this->clearCache();
    }

    /**
     * @return void
     * @throws Exception
     */
    public function calculateUsedCount()
    {
        $this->updateUsedCount($this->getUsersCount());
    }

    /**
     * @return int
     */
    public function getUsersCount()
    {
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT id FROM its4you_installer_license_user WHERE license=?', [$this->getName()]);

        return (int)$adb->num_rows($result);
    }

    public function getUsageUnit()
    {
        return $this->get('service_usageunit');
    }

    /**
     * @return bool
     */
    public function isLicensePerUser()
    {
        return 'License per User' === $this->getUsageUnit();
    }

    /**
     * @param string $module
     * @return bool
     */
    public function isUserAvailable($module)
    {
        $currentUser = Users_Record_Model::getCurrentUserModel();
        $adb = PearDatabase::getInstance();
        $result1 = $adb->pquery('SELECT id FROM its4you_installer_license_user WHERE license=? AND module=?', [$this->getName(), $module]);
        $result2 = $adb->pquery('SELECT id FROM its4you_installer_license_user WHERE license=? AND module=? AND user_id=?', [$this->getName(), $module, $currentUser->getId()]);

        if ($this->getOrderedCount() > $adb->num_rows($result1) || $adb->num_rows($result2)) {
            return true;
        }

        return false;
    }

    /**
     * @return int
     */
    public function getOrderedCount()
    {
        return (int)$this->get('ordered_count');
    }

    public function hasParentLicense()
    {
        return !$this->isEmpty('parentlicenseid');
    }

    public function setParentLicenseProcess($value)
    {
        $this->parentLicenseProcess = $value;
    }
}