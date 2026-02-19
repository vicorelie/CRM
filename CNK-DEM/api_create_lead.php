<?php
/**
 * API pour créer des leads depuis une source externe (prestataire de leads)
 * URL: https://crm.cnkdem.com/api_create_lead.php
 *
 * Exemple basique:
 * curl -X POST "https://crm.cnkdem.com/api_create_lead.php" \
 *   -H "X-API-Key: VOTRE_CLE_API" \
 *   -H "Content-Type: application/json" \
 *   -d '{"lastname":"Dupont","firstname":"Jean","email":"jean@test.com","phone":"0612345678"}'
 *
 * Exemple complet (déménagement):
 * curl -X POST "https://crm.cnkdem.com/api_create_lead.php" \
 *   -H "X-API-Key: VOTRE_CLE_API" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "lastname": "Dupont",
 *     "firstname": "Jean",
 *     "email": "jean@test.com",
 *     "phone": "0612345678",
 *     "mobile": "0712345678",
 *     "company": "Entreprise SARL",
 *     "address": "123 Rue de Départ",
 *     "city": "Paris",
 *     "postalcode": "75001",
 *     "adresse_arrivee": "456 Rue d Arrivée",
 *     "ville_arrivee": "Lyon",
 *     "cp_arrivee": "69001",
 *     "departement_arrivee": "69",
 *     "date_demenagement": "2026-03-15",
 *     "description": "Déménagement appartement 3 pièces"
 *   }'
 *
 * Champs supportés:
 * ----------------
 * CONTACT:
 *   - lastname / nom (requis)
 *   - firstname / prenom
 *   - email / mail
 *   - phone / telephone / tel
 *   - mobile / portable
 *   - company / societe / entreprise
 *   - designation / fonction
 *
 * ADRESSE DEPART (champs standard):
 *   - address / adresse / lane
 *   - city / ville
 *   - postalcode / code_postal / cp / code
 *   - country / pays (défaut: France)
 *
 * ADRESSE ARRIVEE (champs personnalisés):
 *   - adresse_arrivee / adresse_livraison
 *   - ville_arrivee
 *   - cp_arrivee / code_postal_arrivee
 *   - departement_arrivee / dept_arrivee
 *
 * DEMENAGEMENT:
 *   - date_demenagement / date_souhaitee (format: YYYY-MM-DD)
 *   - date_rappel (format: YYYY-MM-DD)
 *   - heure_rappel (format: HH:MM)
 *
 * AUTRES:
 *   - description / commentaire / message
 *   - leadsource / source (défaut: API External)
 *   - leadstatus / statut (défaut: New)
 *   - assigned_user / utilisateur (défaut: admin)
 *
 * Réponse succès (201):
 *   {"success":true,"message":"Lead créé avec succès","lead_id":"12x123","lead_no":"LEA123"}
 *
 * Réponse erreur (400/401/500):
 *   {"success":false,"error":"Message d'erreur"}
 */

// Configuration
define('API_KEY', '5b7371c8da6d17e52e3f92994da8553dd9c8006927eb725f296c930483724c4f');
define('DEFAULT_ASSIGNED_USER', 'admin'); // Utilisateur assigné par défaut
define('DEFAULT_LEAD_SOURCE', 'API External'); // Source par défaut
define('API_LOG_FILE', __DIR__ . '/logs/api_leads.log');

// Fonction de logging
function apiLog($message, $data = null) {
    $logDir = dirname(API_LOG_FILE);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'CLI';
    $logEntry = "[$timestamp] [$ip] $message";
    if ($data !== null) {
        $logEntry .= " | " . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    @file_put_contents(API_LOG_FILE, $logEntry . PHP_EOL, FILE_APPEND);
}

// Log la requête entrante
$rawInput = file_get_contents('php://input');
apiLog("REQUEST", [
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'unknown',
    'raw_input' => $rawInput,
    'POST' => $_POST,
    'GET' => $_GET
]);

// Headers CORS et JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier la méthode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

// Vérifier la clé API
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? '';
if ($apiKey !== API_KEY) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid API key']);
    exit;
}

// Récupérer les données (JSON ou form-data)
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
        exit;
    }
} else {
    $input = $_POST;
}

// Validation des champs requis
if (empty($input['lastname']) && empty($input['nom'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Le champ lastname (nom) est requis']);
    exit;
}

// Mapping des champs (supporte plusieurs formats)
$phoneValue = $input['phone'] ?? $input['telephone'] ?? $input['tel'] ?? '';
$mobileValue = $input['mobile'] ?? $input['portable'] ?? '';

// Si mobile n'est pas fourni mais phone l'est, copier phone dans mobile
if (empty($mobileValue) && !empty($phoneValue)) {
    $mobileValue = $phoneValue;
}

$leadData = [
    'lastname'    => $input['lastname'] ?? $input['nom'] ?? '',
    'firstname'   => $input['firstname'] ?? $input['prenom'] ?? '',
    'email'       => $input['email'] ?? $input['mail'] ?? '',
    'phone'       => $phoneValue,
    'mobile'      => $mobileValue,
    'company'     => $input['company'] ?? $input['societe'] ?? $input['entreprise'] ?? '',
    'designation' => $input['designation'] ?? $input['fonction'] ?? '',
    'lane'        => $input['address'] ?? $input['adresse'] ?? $input['adresse_depart'] ?? $input['lane'] ?? '',
    'city'        => $input['city'] ?? $input['ville'] ?? $input['ville_depart'] ?? '',
    'code'        => $input['postalcode'] ?? $input['code_postal'] ?? $input['cp'] ?? $input['cp_depart'] ?? $input['code'] ?? '',
    'country'     => $input['country'] ?? $input['pays'] ?? 'France',
    'description' => $input['description'] ?? $input['commentaire'] ?? $input['message'] ?? '',
    'leadsource'  => $input['leadsource'] ?? $input['source'] ?? DEFAULT_LEAD_SOURCE,
    'leadstatus'  => $input['leadstatus'] ?? $input['statut'] ?? 'New',
    // Champs personnalisés CNK-DEM (déménagement)
    // Note: Les champs standard (lane, city, code) sont utilisés pour l'adresse de DEPART
    // Les champs cf_xxx sont pour l'adresse d'ARRIVEE
    'cf_975'      => $input['adresse_arrivee'] ?? $input['adresse_livraison'] ?? '',  // Adresse arrivée
    'cf_973'      => $input['ville_arrivee'] ?? '',                                    // Ville arrivée
    'cf_979'      => $input['cp_arrivee'] ?? $input['code_postal_arrivee'] ?? '',     // Code postal arrivé
    'cf_977'      => $input['departement_arrivee'] ?? $input['dept_arrivee'] ?? '',   // Département arrivé
    'cf_1192'     => substr($input['date_demenagement'] ?? $input['date_souhaitee'] ?? '', 0, 10),   // Date de déménagement (extrait YYYY-MM-DD depuis ISO 8601)
    'cf_1147'     => $input['date_rappel'] ?? '',                                      // Date de rappel
    'cf_1149'     => $input['heure_rappel'] ?? '',                                     // Heure de rappel
    'cf_1307'     => $input['volume'] ?? '',                                           // Volume (m³)
];

// Nettoyer les valeurs vides
$leadData = array_filter($leadData, function($v) { return $v !== '' && $v !== null; });

// Log les données mappées (debug)
apiLog("MAPPED_DATA", [
    'phone' => $leadData['phone'] ?? 'empty',
    'mobile' => $leadData['mobile'] ?? 'empty',
    'email' => $leadData['email'] ?? 'empty',
    'lastname' => $leadData['lastname'] ?? 'empty'
]);

// Charger VTiger (même séquence que webservice.php)
chdir(__DIR__);

// 1. Config
require_once 'config.php';
if (file_exists('config_override.php')) {
    include_once 'config_override.php';
}

// 2. Composer autoload
require_once 'vendor/autoload.php';

// 3. VTiger core modules
include_once 'include/Webservices/Relation.php';
include_once 'vtlib/Vtiger/Module.php';
include_once 'includes/main/WebUI.php';

// 4. Utils et Database
require_once 'include/utils/utils.php';
require_once 'include/database/PearDatabase.php';
require_once 'modules/Leads/Leads.php';

global $adb, $current_user;

// Initialiser la base de données
$adb = PearDatabase::getInstance();

// Récupérer l'utilisateur pour l'assignation
$assignedUser = DEFAULT_ASSIGNED_USER;
if (!empty($input['assigned_user']) || !empty($input['utilisateur'])) {
    $assignedUser = $input['assigned_user'] ?? $input['utilisateur'];
}

// Trouver l'ID de l'utilisateur
$userResult = $adb->pquery("SELECT id FROM vtiger_users WHERE user_name = ? AND status = 'Active'", [$assignedUser]);
if ($adb->num_rows($userResult) > 0) {
    $userId = $adb->query_result($userResult, 0, 'id');
} else {
    // Fallback sur admin (id=1)
    $userId = 1;
}

// Charger l'utilisateur courant pour VTiger
require_once 'modules/Users/Users.php';
$current_user = new Users();
$current_user->retrieveCurrentUserInfoFromFile($userId);

try {
    // Créer le lead via VTiger
    $lead = new Leads();

    // Assigner les valeurs
    $lead->column_fields['lastname'] = $leadData['lastname'] ?? 'Inconnu';
    $lead->column_fields['firstname'] = $leadData['firstname'] ?? '';
    $lead->column_fields['email'] = $leadData['email'] ?? '';
    $lead->column_fields['phone'] = $leadData['phone'] ?? '';
    $lead->column_fields['mobile'] = $leadData['mobile'] ?? '';
    $lead->column_fields['company'] = $leadData['company'] ?? '';
    $lead->column_fields['designation'] = $leadData['designation'] ?? '';
    $lead->column_fields['lane'] = $leadData['lane'] ?? '';
    $lead->column_fields['city'] = $leadData['city'] ?? '';
    $lead->column_fields['code'] = $leadData['code'] ?? '';
    $lead->column_fields['country'] = $leadData['country'] ?? 'France';
    $lead->column_fields['description'] = $leadData['description'] ?? '';
    $lead->column_fields['leadsource'] = $leadData['leadsource'] ?? DEFAULT_LEAD_SOURCE;
    $lead->column_fields['leadstatus'] = $leadData['leadstatus'] ?? 'New';
    $lead->column_fields['assigned_user_id'] = $userId;

    // Champs personnalisés déménagement (adresse arrivée)
    if (!empty($leadData['cf_975'])) $lead->column_fields['cf_975'] = $leadData['cf_975'];  // Adresse arrivée
    if (!empty($leadData['cf_973'])) $lead->column_fields['cf_973'] = $leadData['cf_973'];  // Ville arrivée
    if (!empty($leadData['cf_979'])) $lead->column_fields['cf_979'] = $leadData['cf_979'];  // CP arrivée
    if (!empty($leadData['cf_977'])) $lead->column_fields['cf_977'] = $leadData['cf_977'];  // Département arrivée
    if (!empty($leadData['cf_1192'])) $lead->column_fields['cf_1192'] = $leadData['cf_1192']; // Date déménagement
    if (!empty($leadData['cf_1147'])) $lead->column_fields['cf_1147'] = $leadData['cf_1147']; // Date rappel
    if (!empty($leadData['cf_1149'])) $lead->column_fields['cf_1149'] = $leadData['cf_1149']; // Heure rappel
    if (!empty($leadData['cf_1307'])) $lead->column_fields['cf_1307'] = $leadData['cf_1307']; // Volume

    // Sauvegarder
    $lead->save('Leads');

    $leadId = $lead->id;

    if ($leadId) {
        // Log the creation
        apiLog("SUCCESS", [
            'lead_id' => $leadId,
            'lead_no' => $lead->column_fields['lead_no'] ?? null,
            'name' => ($leadData['firstname'] ?? '') . ' ' . ($leadData['lastname'] ?? '')
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Lead créé avec succès',
            'lead_id' => $leadId,
            'lead_no' => $lead->column_fields['lead_no'] ?? null
        ]);
    } else {
        throw new Exception('Échec de la création du lead');
    }

} catch (Exception $e) {
    apiLog("ERROR", ['message' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erreur lors de la création du lead: ' . $e->getMessage()
    ]);
}
