<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is: vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

class Potentials_ListView_Model extends Vtiger_ListView_Model {

	/**
	 * Function to get the list of Mass actions for the module
	 * @param <Array> $linkParams
	 * @return <Array> - Associative array of Link type to List of  Vtiger_Link_Model instances for Mass Actions
	 */
	public function getListViewMassActions($linkParams) {
		$massActionLinks = parent::getListViewMassActions($linkParams);

		$currentUserModel = Users_Privileges_Model::getCurrentUserPrivilegesModel();
		$emailModuleModel = Vtiger_Module_Model::getInstance('Emails');

		if($currentUserModel->hasModulePermission($emailModuleModel->getId())) {
			$massActionLink = array(
				'linktype' => 'LISTVIEWMASSACTION',
				'linklabel' => 'LBL_SEND_EMAIL',
				'linkurl' => 'javascript:Vtiger_List_Js.triggerSendEmail("index.php?module='.$this->getModule()->getName().'&view=MassActionAjax&mode=showComposeEmailForm&step=step1","Emails");',
				'linkicon' => ''
			);
			$massActionLinks['LISTVIEWMASSACTION'][] = Vtiger_Link_Model::getInstanceFromValues($massActionLink);
		}

		return $massActionLinks;
	}

	/**
	 * Override getQuery to strip spaces when searching on cf_981 (Mobile)
	 * so that "0612345678" matches "06 12 34 56 78" in the database.
	 */
	/**
	 * Override getQuery to strip spaces when searching on cf_981 (Mobile)
	 * so that "0612345678" matches "06 12 34 56 78" in the database.
	 */
	function getQuery() {
		// Strip spaces from the search value if searching on cf_981
		if ($this->get('search_key') === 'cf_981') {
			$searchValue = str_replace(' ', '', $this->get('search_value') ?? '');
			$this->set('search_value', $searchValue);
		}
		$query = parent::getQuery();
		// Replace: vtiger_potentialscf.cf_981 LIKE '%xxx%'
		// With:    REPLACE(vtiger_potentialscf.cf_981, ' ', '') LIKE '%xxx%'
		$query = preg_replace(
			'/\bvtiger_potentialscf\.cf_981\s+LIKE\s+/i',
			"REPLACE(vtiger_potentialscf.cf_981, ' ', '') LIKE ",
			$query
		);

		// CNK-DEM: Rôle H5 (Chargé de clientèle) → exclure les dossiers assignés à Team Selling (groupid=2)
		$currentUser = Users_Record_Model::getCurrentUserModel();
		$roleId = $currentUser->getRole();
		if ($roleId === 'H5') {
			$query .= ' AND vtiger_crmentity.smownerid != 2';
		}

		return $query;
	}
}
?>
