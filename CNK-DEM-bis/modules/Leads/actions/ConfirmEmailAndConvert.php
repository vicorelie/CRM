<?php

vimport('~~/include/Webservices/ConvertLead.php');

/**
 * Action pour confirmer l'email d'un prospect et le convertir automatiquement en Contact et Affaire
 */
class Leads_ConfirmEmailAndConvert_Action extends Vtiger_Action_Controller {

	public function checkPermission(Vtiger_Request $request) {
		$moduleName = $request->getModule();
		$recordId = $request->get('record');

		if (!Users_Privileges_Model::isPermitted($moduleName, 'EditView', $recordId)) {
			throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
		}
	}

	public function process(Vtiger_Request $request) {
		$recordId = $request->get('record');
		$emailConfirmation = trim($request->get('email'));

		$response = new Vtiger_Response();

		try {
			error_log('ConfirmEmailAndConvert: Début du processus pour record ' . $recordId);

			// Récupérer le prospect
			$leadModel = Vtiger_Record_Model::getInstanceById($recordId, 'Leads');
			$emailPrincipal = strtolower(trim($leadModel->get('email')));
			$emailConfirmationLower = strtolower($emailConfirmation);

			error_log('ConfirmEmailAndConvert: Email principal = ' . $emailPrincipal . ', Email confirmation = ' . $emailConfirmationLower);

			// Vérifier que l'email correspond
			if ($emailConfirmationLower !== $emailPrincipal) {
				error_log('ConfirmEmailAndConvert: Emails ne correspondent pas');
				$response->setError('L\'email de confirmation ne correspond pas');
				$response->emit();
				return;
			}

			// Mettre à jour le champ de confirmation d'email
			$leadModel->set('cf_985', $emailConfirmation);
			$leadModel->set('mode', 'edit');
			$leadModel->save();

			error_log('ConfirmEmailAndConvert: Email confirmé et sauvegardé');

			// Préparer les données pour la conversion via webservice
			$currentUser = Users_Record_Model::getCurrentUserModel();
			$assignedUserId = $leadModel->get('assigned_user_id');
			$firstname = $leadModel->get('firstname');
			$lastname = $leadModel->get('lastname');
			$fullName = trim($firstname . ' ' . $lastname);

			error_log('ConfirmEmailAndConvert: Préparation de la conversion pour ' . $fullName);

			$entityValues = array();
			$entityValues['assignedTo'] = vtws_getWebserviceEntityId(vtws_getOwnerType($assignedUserId), $assignedUserId);
			$entityValues['leadId'] = vtws_getWebserviceEntityId('Leads', $recordId);
			$entityValues['transferRelatedRecordsTo'] = 'Contacts';

			// Créer le Contact
			$entityValues['entities']['Contacts']['create'] = true;
			$entityValues['entities']['Contacts']['name'] = 'Contacts';
			$entityValues['entities']['Contacts']['source'] = 'CRM';
			$entityValues['entities']['Contacts']['firstname'] = $firstname;
			$entityValues['entities']['Contacts']['lastname'] = $lastname;
			$entityValues['entities']['Contacts']['email'] = $emailPrincipal;
			$entityValues['entities']['Contacts']['mobile'] = $leadModel->get('mobile');
			$entityValues['entities']['Contacts']['mailingstreet'] = $leadModel->get('lane');
			$entityValues['entities']['Contacts']['mailingcity'] = $leadModel->get('city');
			$entityValues['entities']['Contacts']['mailingstate'] = $leadModel->get('state');
			$entityValues['entities']['Contacts']['mailingzip'] = $leadModel->get('code');
			$entityValues['entities']['Contacts']['mailingcountry'] = $leadModel->get('country');
			$entityValues['entities']['Contacts']['description'] = $leadModel->get('description');

			// Créer l'Affaire (Potential)
			$entityValues['entities']['Potentials']['create'] = true;
			$entityValues['entities']['Potentials']['name'] = 'Potentials';
			$entityValues['entities']['Potentials']['source'] = 'CRM';
			$entityValues['entities']['Potentials']['potentialname'] = $fullName;
			$entityValues['entities']['Potentials']['cf_981'] = $leadModel->get('mobile');
			$entityValues['entities']['Potentials']['leadsource'] = $leadModel->get('leadsource');
			$entityValues['entities']['Potentials']['description'] = $leadModel->get('description');
			// Copier les adresses
			$entityValues['entities']['Potentials']['cf_931'] = $leadModel->get('state');
			$entityValues['entities']['Potentials']['cf_933'] = $leadModel->get('city');
			$entityValues['entities']['Potentials']['cf_935'] = $leadModel->get('code');
			$entityValues['entities']['Potentials']['cf_955'] = $leadModel->get('lane');
			$entityValues['entities']['Potentials']['cf_947'] = $leadModel->get('cf_977');
			$entityValues['entities']['Potentials']['cf_949'] = $leadModel->get('cf_973');
			$entityValues['entities']['Potentials']['cf_951'] = $leadModel->get('cf_979');
			$entityValues['entities']['Potentials']['cf_957'] = $leadModel->get('cf_975');

			error_log('ConfirmEmailAndConvert: Appel à vtws_convertlead');

			// Convertir via webservice
			$result = vtws_convertlead($entityValues, $currentUser);

			error_log('ConfirmEmailAndConvert: Conversion réussie - ' . print_r($result, true));

			// Extraire les IDs
			$contactId = null;
			$potentialId = null;

			if (!empty($result['Contacts'])) {
				$contactIdComponents = vtws_getIdComponents($result['Contacts']);
				$contactId = $contactIdComponents[1];
			}

			if (!empty($result['Potentials'])) {
				$potentialIdComponents = vtws_getIdComponents($result['Potentials']);
				$potentialId = $potentialIdComponents[1];
			}

			error_log('ConfirmEmailAndConvert: Contact ID = ' . $contactId . ', Potential ID = ' . $potentialId);

			$response->setResult(array(
				'success' => true,
				'message' => 'Email confirmé et prospect converti avec succès',
				'contactId' => $contactId,
				'potentialId' => $potentialId,
			));

		} catch (Exception $e) {
			error_log('ConfirmEmailAndConvert Error: ' . $e->getMessage());
			error_log('ConfirmEmailAndConvert Stack: ' . $e->getTraceAsString());
			$response->setError('Erreur lors de la conversion: ' . $e->getMessage());
		}

		$response->emit();
	}
}
