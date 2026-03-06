<?php
/**
 * Génère un token d'accès pour la page inventaire client publique
 */
class Potentials_GenerateInventoryToken_Action extends Vtiger_BasicAjax_Action {

    public function process(Vtiger_Request $request) {
        global $site_URL;
        $response = new Vtiger_Response();

        try {
            $potentialId = intval($request->get('record'));
            if ($potentialId <= 0) {
                throw new Exception('ID affaire invalide');
            }

            $db = PearDatabase::getInstance();

            // Vérifier que l'affaire existe
            $check = $db->pquery(
                "SELECT crmid FROM vtiger_crmentity WHERE crmid = ? AND setype = 'Potentials' AND deleted = 0",
                [$potentialId]
            );
            if ($db->num_rows($check) === 0) {
                throw new Exception('Affaire introuvable');
            }

            // Chercher un token existant non expiré pour cette affaire
            $existing = $db->pquery(
                "SELECT token FROM vtiger_client_inventory_tokens WHERE potential_id = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
                [$potentialId]
            );

            if ($db->num_rows($existing) > 0) {
                $token = $db->query_result($existing, 0, 'token');
            } else {
                // Générer un nouveau token
                $token = bin2hex(random_bytes(32));
                $db->pquery(
                    "INSERT INTO vtiger_client_inventory_tokens (token, potential_id, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))",
                    [$token, $potentialId]
                );
            }

            $baseUrl = rtrim($site_URL, '/');
            $url = $baseUrl . '/client-inventory.php?token=' . $token;

            // Mettre à jour cf_1401 (Lien inventaire)
            $db->pquery(
                "UPDATE vtiger_potentialscf SET cf_1401 = ? WHERE potentialid = ?",
                [$url, $potentialId]
            );

            $response->setResult([
                'success' => true,
                'url' => $url,
                'token' => $token,
            ]);

        } catch (Exception $e) {
            $response->setResult([
                'success' => false,
                'message' => $e->getMessage(),
            ]);
        }

        $response->emit();
    }
}
