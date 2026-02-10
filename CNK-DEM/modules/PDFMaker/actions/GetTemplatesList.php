<?php

/**
 * Action pour récupérer la liste des templates PDFMaker
 */
class PDFMaker_GetTemplatesList_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        // Vérifier que l'utilisateur peut accéder au module source
        $sourceModule = $request->get('source_module');
        if (!empty($sourceModule)) {
            // Si un module source est spécifié, vérifier les permissions sur ce module
            if (!Users_Privileges_Model::isPermitted($sourceModule, 'DetailView')) {
                throw new AppException(vtranslate('LBL_PERMISSION_DENIED', $sourceModule));
            }
        } else {
            // Sinon, vérifier l'accès à PDFMaker
            if (!Users_Privileges_Model::isPermitted('PDFMaker', 'DetailView')) {
                throw new AppException(vtranslate('LBL_PERMISSION_DENIED', 'PDFMaker'));
            }
        }
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $sourceModule = $request->get('source_module');
            $db = PearDatabase::getInstance();

            // Récupérer les templates PDFMaker pour Potentials
            $query = "SELECT templateid, filename
                      FROM vtiger_pdfmaker
                      WHERE deleted = 0
                      AND module = ?
                      ORDER BY filename ASC";

            $result = $db->pquery($query, [$sourceModule]);
            $templates = [];

            while ($row = $db->fetchByAssoc($result)) {
                $templates[$row['templateid']] = $row['filename'];
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
