<?php
/**
 * Lecture publique (utilisateurs authentifiés) des dates bloquées.
 * Utilisé par les datepickers (Devis, ODM) pour griser les jours indisponibles.
 */

class Vtiger_GetBlockedDates_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        return true; // tout utilisateur authentifié
    }

    public function process(Vtiger_Request $request) {
        $db = PearDatabase::getInstance();
        $response = new Vtiger_Response();

        $result = $db->pquery(
            "SELECT blocked_date, comment FROM cnk_blocked_dates ORDER BY blocked_date ASC",
            []
        );
        $dates = [];
        while ($row = $db->fetchByAssoc($result)) {
            $dates[] = [
                'date'    => $row['blocked_date'],
                'comment' => html_entity_decode($row['comment'] ?? '', ENT_QUOTES, 'UTF-8'),
            ];
        }
        $response->setResult(['success' => true, 'data' => $dates]);
        $response->emit();
    }
}
