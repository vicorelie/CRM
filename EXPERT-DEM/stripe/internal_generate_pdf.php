<?php
/**
 * Endpoint interne pour générer un PDF de facture via PDFMaker
 * Appelé par webhook_standalone.php via curl localhost
 * Protégé par un token interne
 */

// Sécurité : vérifier le token
$token = $_GET['token'] ?? '';
if ($token !== '39d6a5edf5b755ed6ea788adea91183c') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$invoiceId = intval($_GET['invoice_id'] ?? 0);
$templateId = intval($_GET['template_id'] ?? 55);

if (!$invoiceId || !$templateId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing invoice_id or template_id']);
    exit;
}

// Charger VTiger comme index.php
chdir(dirname(__DIR__));

include_once 'config.php';
if (file_exists('config_override.php')) {
    include_once 'config_override.php';
}
require_once 'vendor/autoload.php';
include_once 'include/Webservices/Relation.php';
include_once 'vtlib/Vtiger/Module.php';
include_once 'includes/main/WebUI.php';
require_once 'include/utils/utils.php';
require_once 'include/database/PearDatabase.php';

// Initialiser l'utilisateur admin (id=1) pour PDFMaker
global $current_user, $adb;
$adb = PearDatabase::getInstance();
require_once 'modules/Users/Users.php';
$current_user = new Users();
$current_user->retrieveCurrentUserInfoFromFile(1);

// Charger PDFMaker
require_once 'modules/PDFMaker/models/checkGenerate.php';

try {
    // Créer une fausse requête VTiger pour PDFMaker
    $requestData = [
        'module' => 'PDFMaker',
        'action' => 'IndexAjax',
        'mode' => 'getPreviewContent',
        'source_module' => 'Invoice',
        'record' => $invoiceId,
        'pdftemplateid' => $templateId,
        'generate_type' => 'inline',
    ];

    $request = new Vtiger_Request($requestData, $requestData);

    // Générer le PDF
    $generatePDF = PDFMaker_checkGenerate_Model::getInstance();
    $generatePDF->set('source_module', 'Invoice');
    $generatePDF->set('generate_type', 'inline');
    $generatePDF->setAvailablePassword(false);

    // Capturer la sortie PDF
    ob_start();
    $generatePDF->generate($request);
    $pdfContent = ob_get_clean();

    if (!empty($pdfContent) && strpos($pdfContent, '%PDF') !== false) {
        header('Content-Type: application/pdf');
        header('Content-Length: ' . strlen($pdfContent));
        echo $pdfContent;
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'PDF generation failed', 'size' => strlen($pdfContent)]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
