<?php
/* * *******************************************************************************
 * The content of this file is subject to the ITS4YouInstaller license.
 * ("License"); You may not use this file except in compliance with the License
 * The Initial Developer of the Original Code is IT-Solutions4You s.r.o.
 * Portions created by IT-Solutions4You s.r.o. are Copyright(C) IT-Solutions4You s.r.o.
 * All Rights Reserved.
 * ****************************************************************************** */

vimport('~~/vtlib/Vtiger/Package.php');
vimport('~/libraries/PHPMarkdown/Michelf/Markdown.inc.php');

class Settings_ITS4YouInstaller_Extension_Model extends Settings_ExtensionStore_Extension_Model
{
    /**
     * @var array
     */
    protected $hideIfInstalled = array(
        'ITS4YouDeliveryNotes' => 'ITS4YouWarehouses',
    );

    /**
     * @var bool
     */
    private static $EXTENSION_MANAGER_URL = false;
    /**
     * @var
     */
    public $fileName;
    /**
     * @var string|null
     */
    protected $EXTENSIONSTORE_LOOKUP_URL = null;
    /**
     * @var string|null
     */
    protected $siteURL = null;
    /**
     * @var array
     */
    protected $licenses = array();
    /**
     * @var
     */
    protected $extensionModelsList;
    /**
     * @var array
     */
    protected $licenseInfo = array();
    /**
     * @var
     */
    protected $licenseAction;
    /**
     * @var
     */
    protected $description;
    protected $extensionsConnector;
    protected $extensionsProfile;
    /**
     * @var string
     */
    private $encodeFile = 'getLicensePermissions';
    /**
     * @var bool
     */
    private $activatedLicenses = false;

    /**
     * Settings_ITS4YouInstaller_Extension_Model constructor.
     * @throws Exception
     */
    public function __construct()
    {
        parent::__construct();

        global $site_URL;

        $this->EXTENSIONSTORE_LOOKUP_URL = 'https://www.its4you.sk/en/api';
        $this->siteURL = $site_URL;

        if (empty($site_URL)) {
            throw new Exception('Invalid configuration.');
        }
    }

    /**
     * @throws Exception
     */
	public function updateExtensionsAlerts()
	{
		$day = date('d');

		if ($day === $this->getSessionData('extensions_alerts')) {
			return;
		}

		$this->setSessionData('extensions_alerts', $day);
		$moduleName = 'Settings:ITS4YouInstaller';
		$LoadedList = $this->getListings();
		/** @var Settings_ITS4YouInstaller_Module_Model $moduleModel */
		$moduleModel = Settings_Vtiger_Module_Model::getInstance($moduleName);
		$url = $moduleModel->getDefaultUrl();
		$duplicateModules = [];

		foreach ($LoadedList as $extId => $loadModel) {
			if ('Extension' === $loadModel->get('type') && $loadModel->isUpgradable() && $loadModel->isAlreadyExists()) {
				$extensionsName = $loadModel->getName();

				if ($loadModel->isVisible() && !in_array($extensionsName, $duplicateModules)) {
					$message = vtranslate('LBL_UPDATE_EXTENSION', $moduleName) . ' ' . vtranslate($extensionsName, $extensionsName);
					$moduleModel->addAlert($extId, $message, 'update', $url);
				}

				$duplicateModules[] = $extensionsName;
			}
		}
	}

	/**
     * @param null $id
     * @param string $type
     * @return array|mixed|string
     * @throws Exception
     */
    public function getListings($id = null, $type = 'Extension')
    {
        $extensionModels = array();
        $listings = $this->getApiListings($id, $type);

        if ($listings['success']) {
            foreach ($listings['response'] as $listing) {
                $extensionModels[$listing['id']] = $this->getInstanceFromArray($listing);
            }
        }

        return $extensionModels;
    }

    /**
     * @param null|int $id
     * @param string $type
     * @return array
     */
    public function getApiListings($id = null, $type = 'Extension')
    {
        $sessionName = $this->getSessionName('getApiListings' . $id . $type);
        $apiListings = $this->getSessionData($sessionName);

        if (!$apiListings) {
            if ($this->getExtensionsLookUpUrl()) {
                $connector = $this->getConnector();

                if ($this->checkRegistration()) {
                    $apiListings = $connector->getCustomerListings($id, $type);
                } else {
                    $apiListings = $connector->getListings($id, $type);
                }

                if ($apiListings['success']) {
                    $apiListings['response'] = is_array($apiListings['response']) ? $apiListings['response'] : array($apiListings['response']);
                } else {
                    $apiListings['message'] = $apiListings['error'];
                }

                $this->setSessionData($sessionName, $apiListings);
            }
        }

        return $apiListings;
    }

    /**
     * @param string $value
     * @return string
     */
    public function getSessionName($value)
    {
        return md5($value . date('ymd'));
    }

    /**
     * @param string $name
     * @return false|mixed
     */
    public function getSessionData($name)
    {
        if (isset($_SESSION['ITS4YouExtension'][$name]) && !empty($_SESSION['ITS4YouExtension'][$name])) {
            return $this->decodeString($_SESSION['ITS4YouExtension'][$name]);
        }

        return false;
    }

    /**
     * @param $string
     * @param int $key
     * @return mixed|string
     */
    public function decodeString($string, $key = 123)
    {
        $result = '';
        $key = (int)$key;
        $string = rawurldecode($string);
        $string = base64_decode($string);
        $string = base64_decode($string);

        for ($i = 0, $k = strlen($string); $i < $k; $i++) {
            $char = substr($string, $i, 1);
            $keychar = substr($key, ($i % strlen($key)) - 1, 1);
            $char = chr(ord($char) - ord($keychar));
            $result .= $char;
        }

        $result = unserialize($result);

        return $result;
    }

    /**
     * @return string|null
     */
    public function getExtensionsLookUpUrl()
    {
        return $this->EXTENSIONSTORE_LOOKUP_URL;
    }

    /**
     * @return Settings_ITS4YouInstaller_ExtnStore_Connector
     */
    public function getConnector()
    {
        if (!$this->extensionsConnector) {
            $extensionLookUpUrl = $this->getExtensionsLookUpUrl();

            if ($extensionLookUpUrl) {
                $this->extensionsConnector = Settings_ITS4YouInstaller_ExtnStore_Connector::getInstance($extensionLookUpUrl);
            }
        }

        return $this->extensionsConnector;
    }

    /**
     * @return bool
     */
    public function checkRegistration()
    {
        $tableName = $this->getExtensionTable();
        $db = PearDatabase::getInstance();
        $result = $db->pquery('SELECT 1 FROM ' . $tableName, array());
        if ($db->num_rows($result)) {
            return true;
        }
        return false;
    }

    /**
     * @return bool|type
     */
    public function getExtensionTable()
    {
        return $this->getConnector()->getExtensionTable();
    }

    /**
     * @param $listing
     * @return |Settings_ITS4YouInstaller_Extension_Model
     * @throws Exception
     */
    public function getInstanceFromArray($listing)
    {
        $extensionModel = new self();

        foreach ($listing as $key => $value) {
            switch ($key) {
                case 'name' :
                    $key = 'label';
                    break;
                case 'identifier':
                    $key = 'name';
                    break;
                case 'version' :
                    $key = 'pkgVersion';
                    break;
                case 'minrange':
                    $key = 'vtigerVersion';
                    break;
                case 'maxrange':
                    $key = 'vtigerMaxVersion';
                    break;
                case 'CustomerId':
                    $key = 'publisher';
                    break;
                case 'price':
                    $value = $value ? $value : 'Free';
                    break;
                case 'approvedon':
                    $key = 'pubDate';
                    break;
                case 'ListingFileId':
                    if ($value) {
                        $key = 'downloadURL';
                        $value = $this->getExtensionsLookUpUrl() . '/customer/listingfiles/i19/?id=' . $value . '&vtiger_version=' . Vtiger_Version::current();
                    }
                    break;
                case 'thumbnail':
                    if ($value) {
                        $key = 'thumbnailURL';
                        $value = str_replace('api', "_listingimages/$value", $this->getExtensionsLookUpUrl());
                    }
                    break;
                case 'banner' :
                    if ($value) {
                        $key = 'bannerURL';
                        $value = str_replace('api', "_listingimages/$value", $this->getExtensionsLookUpUrl());
                    }
                    break;
                case 'description':
                    if ($value) {
                        $markDownInstance = new Michelf\Markdown();
                        $value = $markDownInstance->transform($value);
                    }
            }

            $extensionModel->set($key, $value);
        }

        $label = $extensionModel->get('label');
        if (!$label) {
            $extensionModel->set('label', $extensionModel->getName());
        }

        $moduleModel = self::getModuleFromExtnName($extensionModel->getName());
        if ($moduleModel && $moduleModel->get('extnType') == 'language') {
            $trial = $extensionModel->get('trial');
            $moduleModel->set('trial', $trial);
        }
        $extensionModel->set('moduleModel', $moduleModel);
        return $extensionModel;
    }

    /**
     * @return |Value
     */
    public function getName()
    {
        return (string)$this->get('name');
    }

    /**
     * @param $extnName
     * @return bool|Vtiger_Module|Vtiger_Module_Model
     * @throws Exception
     */
    public static function getModuleFromExtnName($extnName)
    {
        $moduleModel = Vtiger_Module_Model::getInstance($extnName);
        if ($moduleModel) {
            $moduleModel->set('extnType', 'module');
        }
        if (!$moduleModel) {
            if (self::getLanguageInstance($extnName)) {
                $moduleModel = new Vtiger_Module_Model();
                $moduleModel->set('name', $extnName);
                $moduleModel->set('isentitytype', false);
                $moduleModel->set('extnType', 'language');
            }
        }
        return $moduleModel;
    }

    /**
     * @param $lang
     * @return bool|Settings_ExtensionStore_Extension_Model|Settings_ITS4YouInstaller_Extension_Model
     * @throws Exception
     */
    public static function getLanguageInstance($lang)
    {
        $sql = 'SELECT id,name,prefix FROM vtiger_language WHERE name = ?';
        $db = PearDatabase::getInstance();
        $result = $db->pquery($sql, array($lang));

        if ($db->num_rows($result) > 0) {
            $instance = new self();
            $row = $db->query_result_rowdata($result, 0);
            $instance->setData($row);
            return $instance;
        } else {
            return false;
        }
    }

    /**
     * @param string $name
     * @param mixed $data
     */
    public function setSessionData($name, $data)
    {
        $_SESSION['ITS4YouExtension'][$name] = $this->encodeString($data);
    }

    /**
     * @param $string
     * @param int $key
     * @return string
     */
    public function encodeString($string, $key = 123)
    {
        $result = '';
        $key = (int)$key;
        $string = serialize($string);

        for ($i = 0, $k = strlen($string); $i < $k; $i++) {
            $char = substr($string, $i, 1);
            $keychar = substr($key, ($i % strlen($key)) - 1, 1);
            $char = chr(ord($char) + ord($keychar));
            $result .= $char;
        }

        $result = base64_encode($result);
        $result = base64_encode($result);
        $result = rawurlencode($result);

        return $result;
    }

    /**
     * @return Settings_ExtensionStore_Extension_Model|Settings_ITS4YouInstaller_Extension_Model
     * @throws Exception
     */
    public static function getInstance()
    {
        return new self();
    }

    /**
     * @return bool|string|null
     */
    public function getExtensionsManagerUrl()
    {
        return self::$EXTENSION_MANAGER_URL ? self::$EXTENSION_MANAGER_URL : $this->EXTENSIONSTORE_LOOKUP_URL;
    }

    /**
     * @return |Value
     */
    public function getId()
    {
        return (int)$this->get('id');
    }

    /**
     * @return mixed
     */
    public function getDescription()
    {
        return $this->description;
    }

    public function getMoreInfo() {
        return decode_html($this->get('more_info'));
    }

    /**
     * @return bool
     */
    public function installTrackDetails()
    {
        return true;
    }

    /**
     * @return bool|Vtiger_Package
     */
    public function getPackage()
    {
        $packageModel = new Vtiger_Package();
        $moduleName = $packageModel->getModuleNameFromZip(self::getUploadDirectory() . '/' . $this->getFileName());

        if ($moduleName) {
            return $packageModel;
        }

        return false;
    }

    /**
     * @return string
     */
    public function getPackageType()
    {
        $package = $this->getPackage();

        return $package ? $package->type() : '';
    }

    /**
     * @return string
     */
    public function getPackageVersion()
    {
        $package = $this->getPackage();

        return $package ? $package->getVersion() : '';
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isPackageUpgradable()
    {
        return $this->getVersion() != $this->getPackageVersion();
    }

    /**
     * @return Vtiger_Language|Vtiger_Package
     */
    public function getPackageInstance()
    {
        if (strtolower($this->getPackageType()) === 'language') {
            $package = new Vtiger_Language();
        } else {
            $package = new Vtiger_Package();
        }

        return $package;
    }

    /**
     * @param object $moduleInstance
     * @param string $moduleFile
     */
    public function update($moduleInstance, $moduleFile)
    {
        $module = $this->getName();

        try {
            $this->getPackageInstance()->update($moduleInstance, $moduleFile);
            $message = "Update module $module ... DONE";
        } catch (Exception $e) {
            $message = "Update module $module - " . $e->getMessage() . "] ... ERROR";
        }

        Vtiger_Utils::Log($message, true);
    }

    /**
     * @param string $moduleFile
     * @param bool $overwrite
     */
    public function import($moduleFile, $overwrite)
    {
        $module = $this->getName();

        try {
            $this->getPackageInstance()->import($moduleFile, $overwrite);
            $message = "Import module $module ... DONE";
        } catch (Exception $e) {
            $message = "Import module $module - " . $e->getMessage() . "] ... ERROR";
        }

        Vtiger_Utils::Log($message, true);
    }

    /**
     * @param bool $isChild
     * @return string
     */
    public static function getUploadDirectory($isChild = false)
    {
        $uploadDir = 'test/vtlib';
        if ($isChild) {
            $uploadDir = '../' . $uploadDir;
        }
        return $uploadDir;
    }

    /**
     * @return mixed
     */
    public function getFileName()
    {
        return $this->fileName;
    }

    /**
     * @return string
     */
    public function getModuleFile()
    {
        return Settings_ExtensionStore_Extension_Model::getUploadDirectory() . '/' . $this->getFileName();
    }

    public function deleteModuleFile()
    {
        unlink($this->getModuleFile());
    }

    /**
     * @param $fileName
     * @return self
     */
    public function setFileName($fileName)
    {
        $this->fileName = $fileName;

        return $this;
    }

    /**
     * @throws Exception
     */
    public static function getInstanceFromId($extensionId)
    {
        /** @var Settings_ITS4YouInstaller_Extension_Model $extension */
        $extension = self::getInstance()->getExtensionFromListing($extensionId);
        $extension->retrievePackage();

        return $extension;
    }

    public function getUploadFile()
    {
        return self::getUploadDirectory() . '/' . $this->getFileName();
    }

    public function getUploadFileName()
    {
        return 'usermodule_' . $this->getId() . '_' . time() . '.zip';
    }

    /**
     * @return array
     * @throws Exception
     */
    public function retrievePackage()
    {
        $uploadDir = self::getUploadDirectory();
        $extensionId = $this->getId();
        $uploadFile = $this->getUploadFileName();

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir);
        }

        checkFileAccess($uploadDir);

        $this->setFileName($uploadFile);

        return $this->download($extensionId, false, $this->getUploadFile());
    }

    /**
     * @param $extensionId
     * @return $this|
     */
    public function setId($extensionId)
    {
        $this->set('id', $extensionId);

        return $this;
    }

    /**
     * @param int $extensionId
     * @param bool $trial
     * @param string $targetFileName
     * @return array|bool
     * @throws Exception
     */
    public function download($extensionId, $trial, $targetFileName)
    {
        $downloadURL = $this->getExtensionFromListing($extensionId)->getDownloadUrl();

        if ($trial) {
            $downloadURL = $downloadURL . '&mode=Trial';
        }

        if ($downloadURL) {
            $response = $this->getConnector()->download($downloadURL);

            if ($response['success']) {
                file_put_contents($targetFileName, $response['response']);

                return array('success' => true);
            } else {
                return array('success' => false, 'message' => $response['error']);
            }
        }

        return false;
    }

    /**
     * @param $extensionId
     * @return array
     * @throws Exception
     */
    public function getExtensionListings($extensionId)
    {
        $extensionModelsList = array();
        $listings = $this->getConnector()->getListings($extensionId);

        if ($listings['success']) {
            $listing = $listings['response'];
            $extensionModelsList[(string)$listing['id']] = $this->getInstanceFromArray($listing);
        } else {
            return array('success' => false, 'message' => $listings['error']);
        }

        return $extensionModelsList;
    }

    /**
     * @throws Exception
     */
    public function getDownloadUrl()
    {
        return (string)$this->get('downloadURL') . '&type=' . $this->getYear();
    }

    /**
     * @return string
     * @throws Exception
     */
    public function getYear()
    {
        if ($this->isFree()) {
            $year = date('Y');
        } else {
            $years = [];
            $licenseList = Settings_ITS4YouInstaller_License_Model::getCachedList();

            foreach ($licenseList as $license) {
                if ($license->isModuleReady($this->getName())) {
                    array_push($years, $license->getYear());
                }
            }

            $year = max($years);
        }

        return dechex($year);
    }

    /**
     * @return bool
     */
    public function isFree()
    {
        return ('Free' === $this->get('price') || 0 === (int)$this->get('price'));
    }

    /**
     * @param string $type
     * @param $function
     * @param $field
     * @return array|bool
     */
    public function getMaxCreatedOn($type = 'Extension', $function = null, $field = null)
    {
        return $this->getConnector()->getMaxCreatedOn($type, $function, $field);
    }

    /**
     * @param $licenseKey
     * @return mixed|string
     */
    public function getLicenseData($licenseKey)
    {
        $sessionName = $this->getSessionName('getLicenseData' . $licenseKey);
        $licenseInfo = $this->getSessionData($sessionName);

        if (!$licenseInfo) {
            $licenseInfo = false;
            $licenses = (array)$this->getLicenses('', $licenseKey);

            foreach ($licenses as $license_data) {
                if (isset($license_data['licence']) && $license_data['licence'] == $licenseKey) {
                    if (!$licenseInfo) {
                        $licenseInfo = $license_data;
                    }

                    if (isset($license_data['cf_identifier'], $license_data['related_service'])) {
                        $relatedServiceId = (int)$license_data['related_service'];
                        $relatedServiceModule = (string)$license_data['cf_identifier'];

                        $licenseInfo['allowed_modules'][$relatedServiceId] = $relatedServiceModule;

                        if('yes' === $license_data['package_included']) {
                            $licenseInfo['package_modules'][$relatedServiceId] = $relatedServiceModule;
                        }
                    }
                }
            }

            $this->setSessionData($sessionName, $licenseInfo);
        }

        return $licenseInfo;
    }

    /**
     * @param string $serviceId
     * @param string $license
     * @return array|string
     * @throws Exception
     */
    public function getLicenses($serviceId = '', $license = '')
    {
        $licensesList = array();
        $extensionLookUpUrl = $this->getExtensionsLookUpUrl();

        if ($extensionLookUpUrl && $this->checkRegistration()) {
            $profile = $this->getProfile();

            if (!empty($profile)) {
                $params = array(
                    'c' => $profile,
                    's' => $this->encodeString(vglobal('site_URL'), (int)$profile['account']),
                    'r' => $serviceId,
                    'l' => $license,
                    'a' => $this->getLicenseAction(),
                );

                $listings = $this->getConnector()->getLicenses($params);

                if (is_array($listings) && $listings['response']['success'] && !empty($listings['response']['message'])) {
                    $licensesList = $listings['response']['message'];
                } else {
                    $licensesList = 'LICENSE_ERROR_1';
                }
            }
        }

        return $licensesList;
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getProfile()
    {
        if (!empty($this->extensionsProfile)) {
            return $this->extensionsProfile;
        }

        $profileData = Settings_ITS4YouInstaller_License_Model::getProfile();

        if (!empty($profileData)) {
            $this->extensionsProfile = [
                'email' => $profileData['username'],
                'password' => $profileData['password'],
                'id' => $profileData['userid'],
                'account' => $profileData['userid'],
                'account_type' => 'Prospect',
                'message' => 'Successfully logged in',
            ];
        } else {
            $this->extensionsProfile = $this->getConnector()->getProfile();
        }

        return $this->extensionsProfile;
    }

    public function getAccountType()
    {
        return $this->getProfile()['account_type'];
    }

    public function isAllowedBuyLicense()
    {
        return !in_array($this->getAccountType(), ['Partner', 'Reseller']);
    }

    /**
     * @return string
     */
    public function getLicenseAction()
    {
        return empty($this->licenseAction) ? 'activate' : $this->licenseAction;
    }

    /**
     * @param $action
     */
    public function setLicenseAction($action)
    {
        $this->licenseAction = $action;
    }

    /**
     * @param $trialId
     * @return bool
     */
    public function getTrial($trialId)
    {
        $result = false;

        if (is_numeric($trialId)) {
            $extensionLookUpUrl = $this->getExtensionsLookUpUrl();

            if ($extensionLookUpUrl && $this->checkRegistration()) {
                $profile = $this->getProfile();

                if (!empty($profile)) {
                    $params = array(
                        'c' => $profile,
                        's' => $this->encodeString(vglobal('site_URL'), $profile['account']),
                        'm' => $trialId,
                    );

                    $result = $this->getConnector()->getTrial($params);
                }
            }
        }

        return $result;
    }

    /**
     * @param null $searchTerm
     * @param null $searchType
     * @return |array
     */
    public function findListings($searchTerm = null, $searchType = null)
    {
        $extensionModelsList = array();
        $listings = $this->getConnector()->findListings($searchTerm, $searchType);

        if ($listings['success']) {
            $listings = $listings['response'];
            if (!is_array($listings)) {
                $listings = array($listings);
            }
            foreach ($listings as $listing) {
                $extensionModelsList[(string)$listing['id']] = $this->getInstanceFromArray($listing);
            }
        } else {
            return array('success' => false, 'message' => $listings['error']);
        }

        return $extensionModelsList;
    }

    /**
     * @return bool|type
     */
    public function getSessionIdentifier()
    {
        return $this->getConnector()->getSessionIdentifier();
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function passwordStatus()
    {
        if ($this->getPassword()) {
            return true;
        }

        return false;
    }

    /**
     * @throws Exception
     */
    public function getPassword()
    {
        $tableName = $this->getExtensionTable();
        $db = PearDatabase::getInstance();
        $result = $db->pquery('SELECT password FROM ' . $tableName, array());

        return $db->query_result($result, 0, 'password');
    }

    /**
     * @return bool|mixed|string|string[]|null
     * @throws Exception
     */
    public function getRegisteredUser()
    {
        $tableName = $this->getExtensionTable();
        $db = PearDatabase::getInstance();
        $result = $db->pquery('SELECT username, password FROM ' . $tableName, array());
        $userName = $db->query_result($result, 0, 'username');

        if ($userName == 'accesskey') {
            $userName = $db->query_result($result, 0, 'password');
        }

        if (strlen($userName)) {
            return $userName;
        }

        return false;
    }

    /**
     * @param $options
     * @return array
     */
    public function signup($options)
    {
        return $this->getConnector()->signUp($options['emailAddress'], $options['password'], $options['confirmPassword'], $options['firstName'], $options['lastName'], $options['companyName']);
    }

    /**
     * @param Vtiger_Request $request
     */
    public function logoutITS4YouInstaller(Vtiger_Request $request)
    {
        $adb = PearDatabase::getInstance();
        $adb->pquery('DELETE FROM its4you_installer_user', array());
    }

    public function logout()
    {
        $adb = PearDatabase::getInstance();
        $adb->query('DELETE FROM its4you_installer_user');
        $adb->query('DELETE FROM its4you_installer_license');

        $this->clearCache();
    }

    /**
     * @param $options
     * @return array
     */
    public function login($options)
    {
        $this->clearCache();
        $this->logout();

        return $this->getConnector()->login($options['emailAddress'], $options['password']);
    }

    /**
     *
     */
    public function clearCache()
    {
        (new Settings_ITS4YouInstaller_License_Model())->clearCache();
    }

    /**
     * @param $customerId
     * @return array|bool
     */
    public function getCustomerDetails($customerId)
    {
        return $this->getConnector()->getCustomerDetails($customerId);
    }

    /**
     * @param $extensionId
     * @param $extensionName
     * @return string
     */
    public function getLocationUrl($extensionId, $extensionName)
    {
        global $current_user;

        if (is_admin($current_user)) {
            return 'index.php?module=ITS4YouInstaller&parent=Settings&view=ExtensionStore&mode=detail&extensionId=' . $extensionId . '&extensionName=' . $extensionName;
        } else {
            return 'http://www.its4you.sk/en/api/app/listings?id=' . $extensionId;
        }
    }

    /**
     * @param $moduleName
     * @param $licenseKey
     * @return array
     */
    public function loadLicenseDate($moduleName, $licenseKey)
    {
        $LicenseData = array();
        $extensionLookUpUrl = $this->getExtensionsLookUpUrl();

        if ($extensionLookUpUrl) {
            $registrationStatus = $this->checkRegistration();

            if ($registrationStatus) {
                $listings = $this->getConnector()->getCustomerLicenseData($moduleName, $licenseKey);

                if ($listings['success']) {
                    $LicenseData = $listings['response'];
                    if (!is_array($listings)) {
                        $LicenseData = array($listings);
                    }

                } else {
                    $LicenseData = array('success' => false, 'message' => $listings['error']);
                }
            }
        }
        return $LicenseData;
    }

    /**
     * @return array|bool
     * @throws Exception
     */
    public function getActiveLicenses()
    {
        if (empty($this->activatedLicenses)) {
            $this->activatedLicenses = Settings_ITS4YouInstaller_License_Model::getCachedList();
        }

        return $this->activatedLicenses;
    }

    /**
     * @return bool|Value
     * @throws Exception
     */
    public function isAvailable()
    {
        if (!$this->has('license_activated')) {
            $available = false;

            if ($this->isFree()) {
                if ($this->hasLicensePermission()) {
                    $available = false;
                } else {
                    $available = true;
                }
            } elseif (1 === (int)$this->get('available') && $this->isActive()) {
                $available = $this->hasLicensePermission();
            }

            $this->set('license_activated', $available);
        }

        return $this->get('license_activated');
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isVisible()
    {
        $module = $this->getName();

        if (isset($this->hideIfInstalled[$module]) && vtlib_isModuleActive($this->hideIfInstalled[$module])) {
            return false;
        }

        return !$this->isSubLicense() && $this->isAvailable() && $this->isVtigerCompatible();
    }

    /**
     * @throws Exception
     */
    public function isPackageIncludedModule()
    {
        $licenses = Settings_ITS4YouInstaller_License_Model::getCachedList();
        $moduleName = $this->getName();

        foreach ($licenses as $license) {
            if ($license->isPackageModule($moduleName)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @throws Exception
     */
    public function getUpdateTimeRaw()
    {
        $moduleName = $this->getName();
        $adb = PearDatabase::getInstance();
        $result = $adb->pquery('SELECT update_datetime FROM its4you_installer_version WHERE extension=?', [$moduleName]);

        return $adb->query_result($result, 0, 'update_datetime');
    }

    /**
     * @throws Exception
     */
    public function getUpdateTime()
    {
        $dateTime = $this->getUpdateTimeRaw();

        return $dateTime ? Vtiger_Util_Helper::formatDateIntoStrings($dateTime) : '';
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isInstallAvailable()
    {
        $available = $this->isAvailable();

        if (!$available && $this->isSubLicense()) {
            $available = true;
        }

        return $available;
    }

    /**
     * @return bool
     */
    public function isSubLicense()
    {
        return $this->get('sub_license') === '1';
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function hasLicensePermission()
    {
        $module = $this->get('name');
        $type = 'Extension';

        return (Settings_ITS4YouInstaller_License_Model::permission($module, $type)['success'] === date($type . '11'));
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isActive()
    {
        return in_array($this->get('id'), $this->getServiceIds());
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getServiceIds()
    {
        $sessionName = $this->getSessionName('getServiceIds');
        $serviceIds = $this->getSessionData($sessionName);

        if (!$serviceIds) {
            $licenseModels = Settings_ITS4YouInstaller_License_Model::getCachedList();
            $serviceIds = array();

            foreach ($licenseModels as $licenseModel) {
                if ($licenseModel && (!$licenseModel->isExpired() || $licenseModel->isFull())) {
                    array_push($serviceIds, $licenseModel->get('serviceid'));

                    $serviceIds = array_merge($serviceIds, array_keys((array)$licenseModel->get('allowed_modules')));
                }
            }

            $this->setSessionData($sessionName, $serviceIds);
        }

        return (array)$serviceIds;
    }

    /**
     * @return bool
     */
    public function isAvailablePackage()
    {
        return !empty($this->get('pkgVersion'));
    }

    /**
     * @param $module
     * @param $license
     * @return bool
     */
    public function isLicenseActive($module, $license)
    {
        return (strtotime($this->getLicenseInfo($module, $license)['due_date']) > strtotime(date('Y-m-d')));
    }

    /**
     * @param $module
     * @param $license
     * @return bool
     */
    public function getLicenseInfo($module, $license)
    {

        if (isset($this->licenseInfo[$license][$module]) && !empty($this->licenseInfo[$license][$module])) {
            return $this->licenseInfo[$license][$module];
        }

        $registrationStatus = $this->checkRegistration();

        if ($registrationStatus) {
            $result = $this->getConnector()->getCustomerLicenseData($module, $license);
            $licenseData = isset($result['response']['license']) ? $result['response']['license'] : false;

            if ($licenseData && !empty($licenseData)) {
                $this->licenseInfo[$license][$module] = $licenseData;

                return $licenseData;
            }
        }

        return false;
    }

    /**
     * @return |bool
     */
    public function isVtigerCompatible()
    {
        vimport('~~/vtlib/Vtiger/Version.php');
        $vtigerVersion = $this->get('vtigerVersion');
        $vtigerMaxVersion = $this->get('vtigerMaxVersion');

        return (Vtiger_Version::check($vtigerVersion, '>=') && $vtigerMaxVersion && Vtiger_Version::check($vtigerMaxVersion, '<=')) || Vtiger_Version::check($vtigerVersion, '=');
    }

    /**
     * @return |bool
     * @throws Exception
     */
    public function isAlreadyExists()
    {

        return ($this->getModule() || self::getLanguageInstance($this->getName())) ? true : false;
    }

    /**
     * @return bool|Value|Vtiger_Module|Vtiger_Module_Model
     */
    public function getModule()
    {
        $moduleModel = $this->get('moduleModel');

        if (!is_object($moduleModel)) {
            $moduleName = $this->getName();
            $moduleModel = Vtiger_Module_Model::getInstance($moduleName);

            $this->set('moduleModel', $moduleModel);
        }

        return $moduleModel;
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isTrialReady()
    {

        return $this->isRegisteredUser() && !in_array($this->get('id'), $this->getServiceIds());
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isExtensionTrialReady()
    {
        return $this->isRegisteredUser() && in_array($this->getName(), ['ITS4YouMobileApp', 'ITS4YouGoogleCalendarSync']);
    }

    public function isRegisteredUser()
    {

        $profile = Settings_ITS4YouInstaller_License_Model::getProfile();

        return isset($profile['userid'], $profile['username'], $profile['password']) && $profile['username'] !== 'accesskey';
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isUpgradable()
    {
        return ($this->getVersion() != $this->get('pkgVersion'));
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isUpgradableLanguage()
    {
        return ($this->isUpgradable() && 7.3 <= (float)Vtiger_Version::current());
    }

    /**
     * @return string
     * @throws Exception
     */
    public function getVersion()
    {
        $moduleName = $this->getName();
        $class = $moduleName . '_Version_Helper';

        if (class_exists($class)) {
            return (new $class())->getVersion();
        }

        if (vtlib_isModuleActive($moduleName)) {
            $moduleModel = $this->getModule();

            if ($moduleModel) {
                return $moduleModel->get('version');
            }
        }

        if ('LanguagePack' === $this->get('type')) {
            return $this->getVersionModel()->get('version');
        }

        return '';
    }

    /**
     * @return string
     */
    public function isFilesReady()
    {

        if (!$this->isLicenseReady()) {
            return 'notLicenseReady';
        }

        if (!$this->isUninstallReady()) {
            return 'notUninstallReady';
        }

        return '';
    }

    /**
     * @return bool
     */
    public function isLicenseReady()
    {
        return ($this->get('price') === 'Free' || class_exists('Settings_' . $this->getName() . '_License_View'));
    }

    /**
     * @return bool
     */
    public function isUninstallReady()
    {
        return class_exists('Settings_' . $this->getName() . '_Uninstall_Action');
    }

    /**
     * @return bool
     */
    public function isMultiPackage()
    {
        return !empty($this->get('relations'));
    }

    /**
     * @var array
     */
    protected $multiPackages = array();

    /**
     * @throws Exception
     */
    public function retrieveMultiPackages()
    {
        $this->setMultiPackage($this);

        if(!empty($this->get('relations'))) {
            foreach ((array)$this->get('relations') as $relation) {
                $extension = $this->getExtensionFromListing($relation);

                if (!$extension->isEmpty('pkgVersion')) {
                    $this->setMultiPackage($extension);
                }
            }
        }
    }

    /**
     * @param object $value
     */
    public function setMultiPackage($value)
    {
        array_push($this->multiPackages, $value);
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getMultiPackages()
    {
        if (empty($this->multiPackages)) {
            $this->retrieveMultiPackages();
        }

        return $this->multiPackages;
    }

    /**
     * @return bool
     * @throws Exception
     */
    public function isUpgradableMulti()
    {
        $packages = $this->getMultiPackages();

        if(!empty($packages)) {
            foreach ((array)$packages as $package) {
                if ($package->isUpgradable() && !$package->isEmpty('pkgVersion')) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return string|null
     */
    public function getUpdateMessage()
    {
        $module = $this->getModule();

        if($module) {
            $className = 'Settings_ITS4YouInstaller_UpdateMessage_Model';
            $moduleName = $module->getName();

            if (method_exists($module, 'getUpdateMessage')) {
                return $module->getUpdateMessage();
            }

            if(method_exists($className, $moduleName)) {
                return $className::$moduleName();
            }
        }

        return null;
    }

    /**
     * @param int $serviceId
     * @return object
     * @throws Exception
     */
    public function getExtensionFromListing($serviceId)
    {
        return $this->getListings()[$serviceId];
    }

    /**
     * @param string $action
     * @return array|bool
     * @throws Exception
     */
    public function validateExtension($action = 'Install')
    {
        $extensionName = $this->getName();

        if ($this->isInstallAvailable()) {
            $file = $this->retrievePackage();

            if ($file['success']) {
                $package = $this->getPackage();

                if ($package) {
                    $importedModuleName = $package->getModuleName();
                    $isLanguagePackage = $package->isLanguageType();

                    if ($action === 'Upgrade') {
                        $targetModuleName = $this->getName();

                        if ($isLanguagePackage && (trim($package->xpath_value('prefix')) !== $targetModuleName)) {
                            $error = 'LBL_INVALID_UPGRADE_LANGUAGE';
                        }
                        if (!$isLanguagePackage) {
                            if ($importedModuleName !== $targetModuleName) {
                                $error = 'LBL_INVALID_UPGRADE_EXTENSION';
                            }

                            if (!$this->isPackageUpgradable()) {
                                $error = 'LBL_LATEST_VERSION_VERSION_INSTALLED';
                            }
                        }
                    }
                } else {
                    $error = 'LBL_INVALID_PACKAGE';
                }
            } else {
                $error = 'LBL_INVALID_FILE';
            }
        } else {
            $error = 'LBL_EXTENSION_NOT_AVAILABLE';
        }

        if (isset($error) && !empty($error)) {
            return vtranslate($extensionName, $extensionName) . ': ' . vtranslate($error, 'Settings:ITS4YouInstaller');
        }

        return false;
    }

    /**
     * @return Settings_ITS4YouInstaller_Version_Model
     * @throws Exception
     */
    public function getVersionModel()
    {
        return Settings_ITS4YouInstaller_Version_Model::getInstance($this->getName());
    }

    /**
     * @throws Exception
     */
    public function saveVersion()
    {
        $version = $this->getVersionModel();
        $version->set('version', $this->get('pkgVersion'));
        $version->save();
    }

    /**
     * @param array $values
     */
    public static function sortExtensionsByKey($values, $key)
    {
        $extensions = array();

        foreach ($values as $extensionId => $extensionModel) {
            $extensions[$extensionId] = $extensionModel->get($key);
        }

        asort($extensions);

        foreach ($extensions as $extensionId => $price) {
            $extensions[$extensionId] = $values[$extensionId];
        }

        return $extensions;
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getListingsGroupBy($key)
    {
        $list = array();

        foreach ($this->getListings() as $extensionId => $extensionModel) {
            if (is_object($extensionModel) && is_numeric($extensionId)) {
                $list[$extensionModel->get($key)][$extensionId] = $extensionModel;
            }
        }

        return $list;
    }

    /**
     * @throws Exception
     */
    public function getChangeLog()
    {
        if ($this->getExtensionsLookUpUrl()) {
            $connector = $this->getConnector();
            $data = array(
                'moduleName' => $this->getName(),
                'currentVersion' => $this->getVersion(),
                'updateVersion' => $this->getPackageVersion(),
                'url' => $this->getExtensionsLookUpUrl()
            );

            return Zend_Json::decode($connector->getChangeLog($data));
        }

        return false;
    }

    /**
     * @throws Exception
     */
    public function isAuth()
    {
        return $this->checkRegistration() && $this->passwordStatus();
    }

    /**
     * @return string
     */
    public function getExtensionLabel()
    {
        return str_replace(array('ITS', '4You'), '', $this->get('name'));
    }

    /**
     * @return array
     * @throws Exception
     */
    public function getHostingInfo()
    {
        $sessionName = $this->getSessionName('getHostingInfo');
        $hostingInfo = $this->getSessionData($sessionName);

        if (!empty($hostingInfo)) {
            return $hostingInfo;
        }

        $licenseName = $this->getHostingLicense();

        if (empty($licenseName)) {
            return [];
        }

        $hostingInfo = $this->getConnector()->getHostingInfo([
            'c' => $this->getProfile(),
            'ln' => $licenseName,
            'su' => vglobal('site_URL'),
            'iv' => ITS4YouInstaller_Version_Helper::$version,
        ]);
        $this->setSessionData($sessionName, $hostingInfo);

        return $hostingInfo;
    }

    public function getHostingLicense()
    {
        /** @var Settings_ITS4YouInstaller_License_Model $license */
        $licenses = Settings_ITS4YouInstaller_License_Model::getCachedList();
        $licenseName = '';

        foreach ($licenses as $license) {
            if ($license->isHostingLicense()) {
                $licenseName = $license->getName();
                break;
            }
        }

        return $licenseName;
    }

    public function getHostingModel()
    {
        $data = $this->getHostingInfo();

        return Settings_ITS4YouInstaller_Hosting_Model::getInstanceFromArray($data);
    }

	public function installExtension()
	{
		$moduleFileName = $this->getModuleFile();

		if ($this->isAlreadyExists()) {
			if (!$this->isUpgradable()) {
				$this->logMessage('LBL_ALREADY_UPGRADED');
			} else {
				$this->logMessage('LBL_UPDATE');

				$this->update($this->getModule(), $moduleFileName);
			}
		} else {
			$this->logMessage('LBL_INSTALL');

			$this->import($moduleFileName, false);
		}

		$this->saveVersion();
		$this->deleteModuleFile();
	}

	public function logMessage($value)
	{
		echo '<p>' . vtranslate($value, 'Settings:ITS4YouInstaller') . '</p>';
	}
}

