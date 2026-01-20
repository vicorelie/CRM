<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is:  vtiger CRM Open Source
 * All Rights Reserved.
 *************************************************************************************/

class Potentials_GenerateQuoteAjax_View extends Vtiger_IndexAjax_View {

	public function requiresPermission(Vtiger_Request $request) {
		$permissions = parent::requiresPermission($request);

		// Check permission to view Potential detail
		$permissions[] = array(
			'module_parameter' => 'module',
			'action' => 'DetailView',
			'record_parameter' => 'record'
		);

		// Check permission to create Quotes
		$request->set('custom_module', 'Quotes');
		$permissions[] = array(
			'module_parameter' => 'custom_module',
			'action' => 'CreateView'
		);

		return $permissions;
	}

	public function process(Vtiger_Request $request) {
		$viewer = $this->getViewer($request);
		$potentialId = $request->get('record');
		$moduleName = $request->getModule();

		if (!$potentialId) {
			echo json_encode(array('success' => false, 'error' => 'Potential ID is required'));
			return;
		}

		// Load Potential record
		$potentialModel = Vtiger_Record_Model::getInstanceById($potentialId, 'Potentials');

		// Get related Account and Contact
		$accountId = $potentialModel->get('related_to');
		$contactId = $potentialModel->get('contact_id');
		$potentialName = $potentialModel->get('potentialname');

		// Get Account name
		$accountName = '';
		if ($accountId) {
			try {
				$accountModel = Vtiger_Record_Model::getInstanceById($accountId);
				$accountName = $accountModel->get('accountname');
			} catch (Exception $e) {
				// Account not found or error
				$accountName = '';
			}
		}

		// Get Contact name
		$contactName = '';
		if ($contactId) {
			try {
				$contactModel = Vtiger_Record_Model::getInstanceById($contactId, 'Contacts');
				$contactName = $contactModel->getDisplayName();
			} catch (Exception $e) {
				// Contact not found or error
				$contactName = '';
			}
		}

		// Calculate validity date (today + 7 days)
		$validityDate = date('Y-m-d', strtotime('+7 days'));

		// Get current user
		$currentUserModel = Users_Record_Model::getCurrentUserModel();

		// Assign variables to template
		$viewer->assign('POTENTIAL_ID', $potentialId);
		$viewer->assign('POTENTIAL_NAME', $potentialName);
		$viewer->assign('ACCOUNT_ID', $accountId);
		$viewer->assign('ACCOUNT_NAME', $accountName);
		$viewer->assign('CONTACT_ID', $contactId);
		$viewer->assign('CONTACT_NAME', $contactName);
		$viewer->assign('VALIDITY_DATE', $validityDate);
		$viewer->assign('MODULE', $moduleName);
		$viewer->assign('USER_MODEL', $currentUserModel);

		// Render template
		echo $viewer->view('GenerateQuoteModal.tpl', $moduleName, true);
	}
}
