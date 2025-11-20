<?php
/*+***********************************************************************************
 * The contents of this file are subject to the vtiger CRM Public License Version 1.0
 * ("License"); You may not use this file except in compliance with the License
 * The Original Code is: vtiger CRM Open Source
 * The Initial Developer of the Original Code is vtiger.
 * Portions created by vtiger are Copyright (C) vtiger.
 * All Rights Reserved.
 *************************************************************************************/

class Potentials_GetTrajetData_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $moduleName = $request->getModule();
        $recordId = $request->get('record');

        if (!Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId)) {
            throw new AppException('LBL_PERMISSION_DENIED');
        }
    }

    public function process(Vtiger_Request $request) {
        $recordId = $request->get('record');
        $recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');

        $response = array('success' => false);

        try {
            // Récupérer les champs d'adresse personnalisés (noms corrects)
            $adresseDepart = $recordModel->get('cf_adresse_origine');
            $villeDepart = $recordModel->get('cf_ville_origine');
            $cpDepart = $recordModel->get('cf_code_postal_origine');

            $adresseArrivee = $recordModel->get('cf_adresse_destination');
            $villeArrivee = $recordModel->get('cf_ville_destination');
            $cpArrivee = $recordModel->get('cf_code_postal_destination');

            // Construire les adresses complètes
            $departComplet = trim($adresseDepart . ' ' . $cpDepart . ' ' . $villeDepart);
            $arriveeComplet = trim($adresseArrivee . ' ' . $cpArrivee . ' ' . $villeArrivee);

            // Si les champs personnalisés n'existent pas, essayer de récupérer l'adresse du compte lié
            if (empty($departComplet) || empty($arriveeComplet)) {
                $accountId = $recordModel->get('related_to');

                if (!empty($accountId)) {
                    $accountModel = Vtiger_Record_Model::getInstanceById($accountId, 'Accounts');

                    if (empty($departComplet)) {
                        $mailingStreet = $accountModel->get('mailingstreet');
                        $mailingCity = $accountModel->get('mailingcity');
                        $mailingZip = $accountModel->get('mailingzip');
                        $departComplet = trim($mailingStreet . ' ' . $mailingZip . ' ' . $mailingCity);
                    }

                    if (empty($arriveeComplet)) {
                        $shippingStreet = $accountModel->get('otherstreet');
                        $shippingCity = $accountModel->get('othercity');
                        $shippingZip = $accountModel->get('otherzip');
                        $arriveeComplet = trim($shippingStreet . ' ' . $shippingZip . ' ' . $shippingCity);
                    }
                }
            }

            if (!empty($departComplet) && !empty($arriveeComplet)) {
                $response['success'] = true;
                $response['adresse_depart'] = $departComplet;
                $response['adresse_arrivee'] = $arriveeComplet;
            } else {
                $response['error'] = 'Adresses de départ ou d\'arrivée manquantes';
            }

        } catch (Exception $e) {
            $response['error'] = $e->getMessage();
        }

        $responseObj = new Vtiger_Response();
        $responseObj->setResult($response);
        $responseObj->emit();
    }
}
?>
