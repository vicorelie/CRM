<?php
/*+**********************************************************************************
 * Download a PDF attachment stored in vtiger_email_pdf_attachments
 ************************************************************************************/

class Potentials_GetEmailAttachment_Action extends Vtiger_Action_Controller {

    public function checkPermission(Vtiger_Request $request) {
        $moduleName = $request->getModule();
        $recordId   = $request->get('record');

        $recordPermission = Users_Privileges_Model::isPermitted($moduleName, 'DetailView', $recordId);
        if (!$recordPermission) {
            throw new AppException(vtranslate('LBL_PERMISSION_DENIED'));
        }
        return true;
    }

    public function process(Vtiger_Request $request) {
        $attachId = intval($request->get('attach_id'));
        $recordId = intval($request->get('record'));

        if (!$attachId || !$recordId) {
            http_response_code(400);
            exit('Invalid parameters');
        }

        $db = PearDatabase::getInstance();

        // Vérifier que la pièce jointe appartient bien à un email lié à cette affaire
        $sql = "SELECT a.filename, a.filepath
                FROM vtiger_email_pdf_attachments a
                INNER JOIN its4you_emails e ON e.its4you_emails_id = a.email_id
                WHERE a.id = ? AND (e.related_to = ? OR e.contact_id IN (
                    SELECT contact_id FROM vtiger_potential WHERE potentialid = ?
                ))";
        $result = $db->pquery($sql, [$attachId, $recordId, $recordId]);

        if ($db->num_rows($result) === 0) {
            http_response_code(403);
            exit('Attachment not found or access denied');
        }

        $row      = $db->fetch_array($result);
        $filename = $row['filename'];
        $filepath = $row['filepath'];

        if (!file_exists($filepath)) {
            http_response_code(404);
            exit('File no longer available (expired)');
        }

        $filesize = filesize($filepath);
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . addslashes($filename) . '"');
        header('Content-Length: ' . $filesize);
        header('Cache-Control: private');
        readfile($filepath);
        exit;
    }
}
