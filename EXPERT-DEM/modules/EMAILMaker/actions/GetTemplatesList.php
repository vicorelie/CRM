<?php

/**
 * Action pour récupérer la liste des templates EMAILMaker
 */
class EMAILMaker_GetTemplatesList_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        // Vérifier que l'utilisateur peut accéder au module source
        $sourceModule = $request->get('source_module');
        if (!empty($sourceModule)) {
            // Si un module source est spécifié, vérifier les permissions sur ce module
            if (!Users_Privileges_Model::isPermitted($sourceModule, 'DetailView')) {
                throw new AppException(vtranslate('LBL_PERMISSION_DENIED', $sourceModule));
            }
        } else {
            // Sinon, vérifier l'accès à EMAILMaker
            if (!Users_Privileges_Model::isPermitted('EMAILMaker', 'DetailView')) {
                throw new AppException(vtranslate('LBL_PERMISSION_DENIED', 'EMAILMaker'));
            }
        }
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $sourceModule = $request->get('source_module');
            $db = PearDatabase::getInstance();

            // Récupérer les templates EMAILMaker actifs pour le module source
            $query = "SELECT templateid, templatename
                      FROM vtiger_emakertemplates
                      WHERE deleted = 0
                      AND is_theme = 0";

            $params = [];

            // Filtrer par module si spécifié
            if (!empty($sourceModule)) {
                // Pour Potentials, inclure aussi les templates de Quotes (devis liés)
                if ($sourceModule == 'Potentials') {
                    $query .= " AND (module = ? OR module = 'Quotes')";
                    $params[] = $sourceModule;
                } else {
                    $query .= " AND module = ?";
                    $params[] = $sourceModule;
                }
            }

            $query .= " ORDER BY templatename ASC";

            $result = $db->pquery($query, $params);
            $templates = [];

            while ($row = $db->fetchByAssoc($result)) {
                $templates[$row['templateid']] = $row['templatename'];
            }

            $response->setResult([
                'success' => true,
                'templates' => $templates
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
