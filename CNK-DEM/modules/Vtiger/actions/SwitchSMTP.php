<?php
/*+***********************************************************************************
 * Switch entre les profils SMTP (Brevo / Gmail)
 *************************************************************************************/

class Vtiger_SwitchSMTP_Action extends Vtiger_Action_Controller {

	public function checkPermission(Vtiger_Request $request) {
		return true;
	}

	public function process(Vtiger_Request $request) {
		$profileName = $request->get('profile');
		$db = PearDatabase::getInstance();

		if (empty($profileName)) {
			$response = new Vtiger_Response();
			$response->setError('Profile name required');
			$response->emit();
			return;
		}

		// Récupérer le profil demandé
		$result = $db->pquery("SELECT * FROM vtiger_smtp_profiles WHERE profile_name = ?", [$profileName]);
		if ($db->num_rows($result) == 0) {
			$response = new Vtiger_Response();
			$response->setError('Profile not found: ' . $profileName);
			$response->emit();
			return;
		}

		$profile = $db->fetchByAssoc($result);

		// Désactiver tous les profils
		$db->pquery("UPDATE vtiger_smtp_profiles SET is_active = 0", []);

		// Activer le profil sélectionné
		$db->pquery("UPDATE vtiger_smtp_profiles SET is_active = 1 WHERE profile_name = ?", [$profileName]);

		// Mettre à jour vtiger_systems avec les valeurs du profil
		$db->pquery("UPDATE vtiger_systems SET
			server = ?,
			server_port = ?,
			server_username = ?,
			server_password = ?,
			smtp_auth = ?,
			smtp_auth_type = ?,
			from_email_field = ?
			WHERE id = 1 AND server_type = 'email'", [
			$profile['server'],
			$profile['server_port'],
			$profile['server_username'],
			$profile['server_password'],
			$profile['smtp_auth'],
			$profile['smtp_auth_type'],
			$profile['from_email']
		]);

		$response = new Vtiger_Response();
		$response->setResult([
			'success' => true,
			'message' => 'SMTP switched to ' . $profileName,
			'profile' => $profileName
		]);
		$response->emit();
	}
}
