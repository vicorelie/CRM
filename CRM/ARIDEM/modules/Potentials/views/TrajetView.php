<?php
/*+***********************************************************************************
 * Vue pour afficher Google Street View et l'itinéraire
 *************************************************************************************/

class Potentials_TrajetView_View extends Vtiger_Index_View {

    // Désactiver le header et footer Vtiger
    protected function preProcess(Vtiger_Request $request, $display = true) {
        // Ne rien faire pour éviter le chargement du layout Vtiger
    }

    protected function postProcess(Vtiger_Request $request) {
        // Ne rien faire pour éviter le chargement du layout Vtiger
    }

    public function process(Vtiger_Request $request) {
        $recordId = $request->get('record');

        if (empty($recordId)) {
            throw new Exception('Record ID is required');
        }

        // Récupérer les données de l'affaire
        $recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');

        $potentialName = $recordModel->get('potentialname');

        // Adresses
        $adresseOrigine = $recordModel->get('cf_adresse_origine');
        $villeOrigine = $recordModel->get('cf_ville_origine');
        $cpOrigine = $recordModel->get('cf_code_postal_origine');

        $adresseDestination = $recordModel->get('cf_adresse_destination');
        $villeDestination = $recordModel->get('cf_ville_destination');
        $cpDestination = $recordModel->get('cf_code_postal_destination');

        // Construire les adresses complètes
        $adresseCompletOrigine = trim($adresseOrigine . ' ' . $cpOrigine . ' ' . $villeOrigine);
        $adresseCompletDestination = trim($adresseDestination . ' ' . $cpDestination . ' ' . $villeDestination);

        // Distance
        $distance = $recordModel->get('cf_distance_km');

        // Charger le template
        $viewer = $this->getViewer($request);
        $viewer->assign('RECORD_ID', $recordId);
        $viewer->assign('RECORD_LABEL', $potentialName);
        $viewer->assign('ADRESSE_ORIGINE', $adresseCompletOrigine);
        $viewer->assign('ADRESSE_DESTINATION', $adresseCompletDestination);
        $viewer->assign('DISTANCE_KM', $distance);

        $viewer->view('TrajetView.tpl', 'Potentials');
    }
}
?>
