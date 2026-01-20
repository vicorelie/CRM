<?php
/**
 * Handler pour ouvrir le popup d'inventaire
 */

class Potentials_InventoryHandler_Handler {

    public function openInventory($request) {
        $recordId = $request->get('record');

        if (empty($recordId)) {
            throw new Exception('Record ID is required');
        }

        // Récupérer les données de l'affaire
        require_once 'include/database/PearDatabase.php';
        global $adb;

        $query = "SELECT
                    vtiger_potential.potentialname,
                    vtiger_potential.cf_volume_inventaire,
                    vtiger_potential.cf_cartons_estimes,
                    vtiger_potential.cf_inventaire_json
                  FROM vtiger_potential
                  INNER JOIN vtiger_crmentity ON vtiger_crmentity.crmid = vtiger_potential.potentialid
                  WHERE vtiger_potential.potentialid = ? AND vtiger_crmentity.deleted = 0";

        $result = $adb->pquery($query, array($recordId));

        if ($adb->num_rows($result) > 0) {
            $row = $adb->fetchByAssoc($result);

            $potentialName = $row['potentialname'];
            $savedVolume = $row['cf_volume_inventaire'] ?? 0;
            $savedBoxes = $row['cf_cartons_estimes'] ?? 0;
            $savedInventory = $row['cf_inventaire_json'] ?? '{}';

        } else {
            throw new Exception('Record not found');
        }

        // Charger le template
        $viewer = new Vtiger_Viewer();
        $viewer->assign('RECORD_ID', $recordId);
        $viewer->assign('RECORD_LABEL', $potentialName);
        $viewer->assign('SAVED_VOLUME', $savedVolume);
        $viewer->assign('SAVED_BOXES', $savedBoxes);
        $viewer->assign('SAVED_INVENTORY', $savedInventory);

        $viewer->view('InventoryView.tpl', 'Potentials');
    }
}
?>
