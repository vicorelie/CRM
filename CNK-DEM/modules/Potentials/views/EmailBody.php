<?php
/*+**********************************************************************************
 * Serve raw email body HTML for iframe rendering
 * Uses minimal VTiger bootstrap to avoid framework redirects
 ************************************************************************************/

// Minimal bootstrap - just database access and session
chdir(dirname(__FILE__) . '/../../..');
require_once 'config.inc.php';
require_once 'include/database/PearDatabase.php';

// VTiger uses 'SessionID' as session name (HTTP_Session library)
session_name('SessionID');
session_start();
if (empty($_SESSION['authenticated_user_id'])) {
    echo '<html><body><p style="text-align:center;padding:40px;color:#999;">Session expirée</p></body></html>';
    exit;
}

$emailId = isset($_GET['email_id']) ? intval($_GET['email_id']) : 0;

if (empty($emailId)) {
    echo '<html><body><p style="text-align:center;padding:40px;color:#999;">ID email manquant</p></body></html>';
    exit;
}

$adb = PearDatabase::getInstance();

$sql = "SELECT e.body
        FROM its4you_emails e
        INNER JOIN vtiger_crmentity ce ON ce.crmid = e.its4you_emails_id
        WHERE e.its4you_emails_id = ? AND ce.deleted = 0";
$result = $adb->pquery($sql, [$emailId]);

if ($adb->num_rows($result) > 0) {
    $body = $adb->query_result($result, 0, 'body');
    // If body is HTML-entity encoded (starts with &lt;), decode it
    if (strpos(trim($body), '&lt;') === 0) {
        $body = html_entity_decode($body, ENT_QUOTES, 'UTF-8');
    }
    header('Content-Type: text/html; charset=UTF-8');
    echo $body;
} else {
    echo '<html><body><p style="text-align:center;padding:40px;color:#999;">Email introuvable</p></body></html>';
}
