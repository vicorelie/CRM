<?php
/*+***********************************************************************************
 * Récupère le profil SMTP actif
 *************************************************************************************/

class Vtiger_GetActiveSMTP_Action extends Vtiger_Action_Controller {

	public function checkPermission(Vtiger_Request $request) {
		return true;
	}

	public function process(Vtiger_Request $request) {
		$db = PearDatabase::getInstance();

		$result = $db->pquery("SELECT profile_name FROM vtiger_smtp_profiles WHERE is_active = 1 LIMIT 1", []);

		$profile = 'Brevo'; // Default
		if ($db->num_rows($result) > 0) {
			$profile = $db->query_result($result, 0, 'profile_name');
		}

		$response = new Vtiger_Response();
		$response->setResult([
			'success' => true,
			'profile' => $profile
		]);
		$response->emit();
	}
}
