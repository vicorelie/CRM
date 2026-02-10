<?php

/**
 * Action pour récupérer l'email du contact lié à une affaire
 */
class Potentials_GetContactEmail_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $moduleName = $request->getModule();
        $recordId = $request->get('record');

        if (!Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId)) {
            throw new AppException(vtranslate('LBL_PERMISSION_DENIED', $moduleName));
        }
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $recordId = $request->get('record');

            if (empty($recordId)) {
                throw new Exception('ID d\'affaire manquant');
            }

            // Récupérer l'affaire
            $potentialModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');

            // Récupérer le contact lié
            $contactId = $potentialModel->get('contact_id');

            if (empty($contactId)) {
                $response->setResult([
                    'success' => false,
                    'error' => 'Aucun contact lié à cette affaire'
                ]);
                $response->emit();
                return;
            }

            // Récupérer l'email du contact
            $contactModel = Vtiger_Record_Model::getInstanceById($contactId, 'Contacts');
            $email = $contactModel->get('email');

            $response->setResult([
                'success' => true,
                'email' => $email,
                'contact_id' => $contactId
            ]);

        } catch (Exception $e) {
            $response->setResult([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }

        $response->emit();
    }
}
