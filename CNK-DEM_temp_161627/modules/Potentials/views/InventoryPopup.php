<?php
/**
 * Vue pour afficher le popup d'inventaire
 */

class Potentials_InventoryPopup_View extends Vtiger_Index_View {

    public function process(Vtiger_Request $request) {
        $recordId = $request->get('record');

        if (empty($recordId)) {
            throw new Exception('Record ID is required');
        }

        // Récupérer les données de l'affaire
        $recordModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');

        $potentialName = $recordModel->get('potentialname');
        $savedVolume = $recordModel->get('cf_volume_inventaire') ?? 0;
        $savedBoxes = $recordModel->get('cf_cartons_estimes') ?? 0;
        $savedInventory = $recordModel->get('cf_inventaire_json') ?? '{}';

        // Charger le template
        $viewer = $this->getViewer($request);
        $viewer->assign('RECORD_ID', $recordId);
        $viewer->assign('RECORD_LABEL', $potentialName);
        $viewer->assign('SAVED_VOLUME', $savedVolume);
        $viewer->assign('SAVED_BOXES', $savedBoxes);
        $viewer->assign('SAVED_INVENTORY', $savedInventory);

        $viewer->view('InventoryView.tpl', 'Potentials');
    }
}
?>
