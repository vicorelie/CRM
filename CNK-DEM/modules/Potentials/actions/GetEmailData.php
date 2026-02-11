<?php

/**
 * Action pour récupérer toutes les données nécessaires pour l'envoi d'email
 * (contact email, templates EMAILMaker, templates PDFMaker)
 */
class Potentials_GetEmailData_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $currentUser = Users_Record_Model::getCurrentUserModel();
        if (!$currentUser || !$currentUser->getId()) {
            throw new AppException('Permission denied');
        }
    }

    public function process(Vtiger_Request $request) {
        $response = new Vtiger_Response();

        try {
            $recordId = $request->get('record');
            $quoteId = $request->get('quote_id');
            $db = PearDatabase::getInstance();
            $result = [];

            // 1. Récupérer l'email du contact lié
            $contactEmail = '';
            $contactId = '';
            if (!empty($recordId)) {
                $potentialModel = Vtiger_Record_Model::getInstanceById($recordId, 'Potentials');
                $contactIdValue = $potentialModel->get('contact_id');
                if (!empty($contactIdValue)) {
                    $contactModel = Vtiger_Record_Model::getInstanceById($contactIdValue, 'Contacts');
                    $contactEmail = $contactModel->get('email');
                    $contactId = $contactIdValue;
                }
            }
            $result['contact_email'] = $contactEmail;
            $result['contact_id'] = $contactId;

            // Déterminer le module cible selon qu'un devis est sélectionné ou non
            $targetModule = !empty($quoteId) ? 'Quotes' : 'Potentials';
            $result['target_module'] = $targetModule;

            // 2. Récupérer les templates EMAILMaker filtrés par module cible
            $emailTemplates = [];
            $query1 = "SELECT templateid, templatename FROM vtiger_emakertemplates WHERE deleted = 0 AND is_theme = 0 AND (module = ? OR module = '' OR module IS NULL) ORDER BY templatename ASC";
            $res1 = $db->pquery($query1, [$targetModule]);
            if ($res1) {
                $numRows1 = $db->num_rows($res1);
                for ($i = 0; $i < $numRows1; $i++) {
                    $row = $db->query_result_rowdata($res1, $i);
                    $emailTemplates[] = [
                        'id' => $row['templateid'],
                        'name' => $row['templatename']
                    ];
                }
            }
            $result['email_templates'] = $emailTemplates;

            // 3. Récupérer les templates PDFMaker filtrés par module cible
            $pdfTemplates = [];
            $query2 = "SELECT templateid, filename FROM vtiger_pdfmaker WHERE deleted = 0 AND module = ? ORDER BY filename ASC";
            $res2 = $db->pquery($query2, [$targetModule]);
            if ($res2) {
                $numRows2 = $db->num_rows($res2);
                for ($i = 0; $i < $numRows2; $i++) {
                    $row = $db->query_result_rowdata($res2, $i);
                    $pdfTemplates[] = [
                        'id' => $row['templateid'],
                        'name' => $row['filename']
                    ];
                }
            }
            $result['pdf_templates'] = $pdfTemplates;

            // 4. Récupérer les Documents liés à l'affaire
            $documents = [];
            $docIds = [];
            if (!empty($recordId)) {
                $query3 = "SELECT n.notesid, n.title, n.filename, n.filesize, n.filetype
                           FROM vtiger_notes n
                           INNER JOIN vtiger_crmentity ce ON ce.crmid = n.notesid AND ce.deleted = 0
                           INNER JOIN vtiger_senotesrel rel ON rel.notesid = n.notesid
                           WHERE rel.crmid = ? AND n.filename IS NOT NULL AND n.filename != ''
                           ORDER BY n.title ASC";
                $res3 = $db->pquery($query3, [$recordId]);
                if ($res3) {
                    for ($i = 0; $i < $db->num_rows($res3); $i++) {
                        $row = $db->query_result_rowdata($res3, $i);
                        $documents[] = [
                            'id' => $row['notesid'],
                            'title' => $row['title'],
                            'filename' => $row['filename'],
                            'filesize' => intval($row['filesize']),
                            'filetype' => $row['filetype']
                        ];
                        $docIds[] = $row['notesid'];
                    }
                }
            }

            // 5. Toujours inclure "INVENTAIRE CNK TRANSPORT" même s'il n'est pas lié à l'affaire
            $query4 = "SELECT n.notesid, n.title, n.filename, n.filesize, n.filetype
                       FROM vtiger_notes n
                       INNER JOIN vtiger_crmentity ce ON ce.crmid = n.notesid AND ce.deleted = 0
                       WHERE n.title LIKE '%INVENTAIRE CNK TRANSPORT%' AND n.filename IS NOT NULL AND n.filename != ''
                       ORDER BY n.title ASC";
            $res4 = $db->pquery($query4, []);
            if ($res4) {
                for ($i = 0; $i < $db->num_rows($res4); $i++) {
                    $row = $db->query_result_rowdata($res4, $i);
                    if (!in_array($row['notesid'], $docIds)) {
                        $documents[] = [
                            'id' => $row['notesid'],
                            'title' => $row['title'],
                            'filename' => $row['filename'],
                            'filesize' => intval($row['filesize']),
                            'filetype' => $row['filetype']
                        ];
                    }
                }
            }

            $result['documents'] = $documents;

            $result['success'] = true;
            $response->setResult($result);

        } catch (Exception $e) {
            $response->setResult([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }

        $response->emit();
    }
}
