<?php
/*+**********************************************************************************
 * UnifiedView - Main unified tabbed view for Potentials
 ************************************************************************************/

class Potentials_Unified_View extends Vtiger_Index_View {

	function __construct() {
		parent::__construct();
	}

	function checkPermission(Vtiger_Request $request) {
		$moduleName = $request->getModule();
		$recordId = $request->get('record');

		$recordPermission = Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId);
		if(!$recordPermission) {
			throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
		}
		return true;
	}

	function preProcess(Vtiger_Request $request, $display = true) {
		parent::preProcess($request, $display);
	}

	function process(Vtiger_Request $request) {
		$recordId = $request->get('record');
		$moduleName = $request->getModule();

		$recordModel = Vtiger_Record_Model::getInstanceById($recordId, $moduleName);

		// Get contact information
		$contactId = $recordModel->get('contact_id');
		$contactName = '';
		$contactPhone = '';
		$contactEmail = '';

		if (!empty($contactId)) {
			$contactModel = Vtiger_Record_Model::getInstanceById($contactId, 'Contacts');
			if ($contactModel) {
				$firstname = $contactModel->get('firstname') ?: '';
				$lastname = $contactModel->get('lastname') ?: '';
				$contactName = trim($firstname . ' ' . $lastname);
				$contactPhone = $contactModel->get('mobile') ?: $contactModel->get('phone') ?: '';
				$contactEmail = $contactModel->get('email') ?: '';
			}
		}

		// Fallback to potential fields if no contact
		if (empty($contactName)) {
			$contactName = $recordModel->get('potentialname');
		}
		if (empty($contactPhone)) {
			$contactPhone = $recordModel->get('cf_981'); // Phone field in Potentials
		}

		// Check for duplicate contacts (same email or mobile in the whole CRM)
		$duplicateContacts = [];
		if (!empty($contactId)) {
			$mobile = $contactModel ? ($contactModel->get('mobile') ?: '') : '';
			$conditions = [];
			$params = [$contactId];
			if (!empty($contactEmail)) {
				$conditions[] = 'cd.email = ?';
				$params[] = $contactEmail;
			}
			if (!empty($mobile)) {
				$conditions[] = 'cd.mobile = ?';
				$params[] = $mobile;
			}
			if (!empty($conditions)) {
				$db = PearDatabase::getInstance();
				$sql = 'SELECT cd.contactid, cd.firstname, cd.lastname, cd.email, cd.mobile
						FROM vtiger_contactdetails cd
						INNER JOIN vtiger_crmentity ce ON ce.crmid = cd.contactid AND ce.deleted = 0
						WHERE cd.contactid != ? AND (' . implode(' OR ', $conditions) . ')
						LIMIT 5';
				$result = $db->pquery($sql, $params);
				while ($row = $db->fetch_array($result)) {
					$duplicateContacts[] = $row;
				}
			}
		}

		$currentUser = Users_Record_Model::getCurrentUserModel();
		$isAdmin = ($currentUser->get('is_admin') === 'on');
		$userRole = $currentUser->get('roleid');
		if (empty($userRole)) {
			$userRole = fetchUserRole($currentUser->getId());
		}
		$canSeeOdmFacture = ($isAdmin || $userRole === 'H6');

		$viewer = $this->getViewer($request);
		$viewer->assign('RECORD', $recordModel);
		$viewer->assign('RECORD_ID', $recordId);
		$viewer->assign('MODULE_NAME', $moduleName);
		$viewer->assign('ACTIVE_TAB', $request->get('tab', 'details'));
		$viewer->assign('IS_ADMIN', $canSeeOdmFacture);
		$viewer->assign('CONTACT_NAME', $contactName);
		$viewer->assign('CONTACT_PHONE', $contactPhone);
		$viewer->assign('CONTACT_EMAIL', $contactEmail);
		$viewer->assign('DUPLICATE_CONTACTS', $duplicateContacts);

		// Metrics data for global bar
		$viewer->assign('METRIC_DISTANCE', $recordModel->get('cf_961') ?: '');
		$viewer->assign('METRIC_VOL_INVENTAIRE', $recordModel->get('cf_939') ?: '');
		$viewer->assign('METRIC_VOL_FINAL', $recordModel->get('cf_1259') ?: '');
		$viewer->assign('METRIC_DATE_CHARGEMENT', $recordModel->get('cf_1043') ?: '');
		$viewer->assign('METRIC_DATE_LIVRAISON', $recordModel->get('cf_1049') ?: '');
		$viewer->assign('METRIC_PERIODE_DEBUT', $recordModel->get('cf_1045') ?: '');
		$viewer->assign('METRIC_PERIODE_FIN', $recordModel->get('cf_1047') ?: '');

		$viewer->view('UnifiedTabbedView.tpl', $moduleName);
	}

	/**
	 * Function to get the list of Script models to be included
	 */
	function getHeaderScripts(Vtiger_Request $request) {
		$headerScripts = parent::getHeaderScripts($request);
		return $headerScripts;
	}
}
