<?php
/**
 * Handler VTiger : génère automatiquement le lien inventaire client
 * lors de la création ou duplication d'une affaire (Potentials)
 */
class PotentialsInventoryLinkHandler extends VTEventHandler {

    function handleEvent($eventName, $entityData) {
        if ($entityData->getModuleName() !== 'Potentials') {
            return;
        }

        // Uniquement sur la création (include duplicate)
        if (empty($entityData->is_new)) {
            return;
        }

        $potentialId = intval($entityData->getId());
        if ($potentialId <= 0) {
            return;
        }

        global $site_URL;

        $db = PearDatabase::getInstance();

        // Générer un nouveau token
        $token = bin2hex(random_bytes(32));
        $db->pquery(
            "INSERT INTO vtiger_client_inventory_tokens (token, potential_id, created_at, expires_at) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))",
            [$token, $potentialId]
        );

        $baseUrl = rtrim($site_URL, '/');
        $url = $baseUrl . '/client-inventory.php?token=' . $token;

        // Sauvegarder dans le champ cf_1401 (Lien inventaire)
        $db->pquery(
            "UPDATE vtiger_potentialscf SET cf_1401 = ? WHERE potentialid = ?",
            [$url, $potentialId]
        );
    }
}
