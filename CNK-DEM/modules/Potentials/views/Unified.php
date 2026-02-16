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

		$currentUser = Users_Record_Model::getCurrentUserModel();
		$isAdmin = ($currentUser->get('is_admin') === 'on');

		$viewer = $this->getViewer($request);
		$viewer->assign('RECORD', $recordModel);
		$viewer->assign('RECORD_ID', $recordId);
		$viewer->assign('MODULE_NAME', $moduleName);
		$viewer->assign('ACTIVE_TAB', $request->get('tab', 'details'));
		$viewer->assign('IS_ADMIN', $isAdmin);
		$viewer->assign('CONTACT_NAME', $contactName);
		$viewer->assign('CONTACT_PHONE', $contactPhone);
		$viewer->assign('CONTACT_EMAIL', $contactEmail);

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
