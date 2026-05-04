<?php
/**
 * API liste des Affaires validées (vue VTiger "Affaire validé" - cvid=72)
 * Filtre: vtiger_potentialscf.cf_1164 = 1 (case "Validation" cochée)
 *
 * URL:    https://crm.cnkdem.com/api_list_affaires_validees.php
 * Méthode: GET
 * Auth:    Header X-API-Key  ou  ?api_key=...
 *
 * Paramètres optionnels:
 *   - limit          : 1..500 (défaut 100)
 *   - offset         : pagination (défaut 0)
 *   - date_from      : YYYY-MM-DD - filtre sur cf_1356 (date de validation)
 *   - date_to        : YYYY-MM-DD
 *   - assigned_user  : username (ex: admin)
 *
 * Exemple:
 *   curl "https://crm.cnkdem.com/api_list_affaires_validees.php?limit=50" \
 *        -H "X-API-Key: VOTRE_CLE"
 */

define('API_KEY', '5b7371c8da6d17e52e3f92994da8553dd9c8006927eb725f296c930483724c4f');
define('DB_HOST', 'localhost');
define('DB_USER', 'cnk_dem_user');
define('DB_PASS', 'cedcff26783d08a13a92997c415db618');
define('DB_NAME', 'cnk_dem');
define('API_LOG_FILE', __DIR__ . '/logs/api_affaires.log');
define('MAX_LIMIT', 500);
define('DEFAULT_LIMIT', 100);

function apiLog($message, $data = null) {
    $logDir = dirname(API_LOG_FILE);
    if (!is_dir($logDir)) @mkdir($logDir, 0755, true);
    $entry = '[' . date('Y-m-d H:i:s') . '] [' . ($_SERVER['REMOTE_ADDR'] ?? 'CLI') . "] $message";
    if ($data !== null) $entry .= ' | ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    @file_put_contents(API_LOG_FILE, $entry . PHP_EOL, FILE_APPEND);
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use GET.']);
    exit;
}

$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? '';
if ($apiKey !== API_KEY) {
    apiLog('AUTH_FAIL');
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Invalid API key']);
    exit;
}

$limit  = max(1, min(MAX_LIMIT, (int)($_GET['limit']  ?? DEFAULT_LIMIT)));
$offset = max(0, (int)($_GET['offset'] ?? 0));
$dateFrom = $_GET['date_from'] ?? '';
$dateTo   = $_GET['date_to']   ?? '';
$assignedUser = $_GET['assigned_user'] ?? '';

$mysqli = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($mysqli->connect_errno) {
    apiLog('DB_ERROR', ['errno' => $mysqli->connect_errno, 'error' => $mysqli->connect_error]);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}
$mysqli->set_charset('utf8mb4');

$where  = ["e.deleted = 0", "pcf.cf_1164 = 1"];
$types  = '';
$params = [];

if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
    $where[] = 'pcf.cf_1356 >= ?';
    $types  .= 's';
    $params[] = $dateFrom;
}
if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
    $where[] = 'pcf.cf_1356 <= ?';
    $types  .= 's';
    $params[] = $dateTo;
}
if (!empty($assignedUser)) {
    $where[] = 'u.user_name = ?';
    $types  .= 's';
    $params[] = $assignedUser;
}

$whereSql = implode(' AND ', $where);

$bindParams = function($stmt, $types, $params) {
    if (empty($types)) return;
    $refs = [];
    $refs[] = $types;
    foreach ($params as $k => $v) $refs[] = &$params[$k];
    call_user_func_array([$stmt, 'bind_param'], $refs);
};

try {
    // Total count
    $countSql = "SELECT COUNT(*) AS c
                 FROM vtiger_potential p
                 INNER JOIN vtiger_crmentity e ON e.crmid = p.potentialid
                 INNER JOIN vtiger_potentialscf pcf ON pcf.potentialid = p.potentialid
                 LEFT JOIN vtiger_users u ON u.id = e.smownerid
                 WHERE $whereSql";
    $stmt = $mysqli->prepare($countSql);
    if (!empty($types)) $bindParams($stmt, $types, $params);
    $stmt->execute();
    $total = (int)$stmt->get_result()->fetch_assoc()['c'];
    $stmt->close();

    // Data
    $sql = "SELECT
                p.potentialid, p.potential_no, p.potentialname, p.amount,
                p.sales_stage, p.closingdate, p.related_to, p.contact_id,
                pcf.cf_1164 AS validation,
                pcf.cf_1356 AS date_validation,
                pcf.cf_1043 AS date_demenagement_chargement,
                pcf.cf_1049 AS date_demenagement_livraison,
                pcf.cf_1045 AS periode_debut,
                pcf.cf_1047 AS periode_fin,
                pcf.cf_939  AS volume_inventaire,
                pcf.cf_1259 AS volume_final,
                pcf.cf_961  AS distance,
                pcf.cf_955  AS adresse_chargement,
                pcf.cf_933  AS ville_chargement,
                pcf.cf_935  AS cp_chargement,
                pcf.cf_957  AS adresse_livraison,
                pcf.cf_949  AS ville_livraison,
                pcf.cf_951  AS cp_livraison,
                pcf.cf_1091 AS stationnement_chargement,
                pcf.cf_1089 AS stationnement_livraison,
                pcf.cf_1397 AS statut_demande_stationnement,
                pcf.cf_1123 AS mail_affaire,
                e.smownerid, e.createdtime, e.modifiedtime,
                u.user_name AS assigned_user_name,
                CONCAT_WS(' ', u.first_name, u.last_name) AS assigned_user_fullname,
                c.firstname AS contact_firstname,
                c.lastname  AS contact_lastname,
                c.email      AS contact_email,
                c.phone      AS contact_phone,
                c.mobile     AS contact_mobile,
                caddr.mailingstreet  AS contact_address,
                caddr.mailingcity    AS contact_city,
                caddr.mailingzip     AS contact_zip,
                caddr.mailingcountry AS contact_country,
                csub.leadsource      AS contact_leadsource,
                a.accountname AS account_name
            FROM vtiger_potential p
            INNER JOIN vtiger_crmentity e ON e.crmid = p.potentialid
            INNER JOIN vtiger_potentialscf pcf ON pcf.potentialid = p.potentialid
            LEFT JOIN vtiger_users u ON u.id = e.smownerid
            LEFT JOIN vtiger_contactdetails c ON c.contactid = p.contact_id
            LEFT JOIN vtiger_contactaddress caddr ON caddr.contactaddressid = c.contactid
            LEFT JOIN vtiger_contactsubdetails csub ON csub.contactsubscriptionid = c.contactid
            LEFT JOIN vtiger_crmentity ce_c ON ce_c.crmid = c.contactid AND ce_c.deleted = 0
            LEFT JOIN vtiger_account a ON a.accountid = p.related_to
            WHERE $whereSql
            ORDER BY pcf.cf_1356 DESC, e.modifiedtime DESC
            LIMIT $limit OFFSET $offset";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) throw new Exception('Prepare failed: ' . $mysqli->error);
    if (!empty($types)) $bindParams($stmt, $types, $params);
    $stmt->execute();
    $res = $stmt->get_result();

    $data = [];
    while ($row = $res->fetch_assoc()) {
        $contactName = trim(($row['contact_firstname'] ?? '') . ' ' . ($row['contact_lastname'] ?? ''));
        $data[] = [
            'id'              => (int)$row['potentialid'],
            'potential_no'    => $row['potential_no'],
            'potentialname'   => $row['potentialname'],
            'amount'          => $row['amount'],
            'sales_stage'     => $row['sales_stage'],
            'date_validation' => $row['date_validation'],
            'closingdate'     => $row['closingdate'],
            'createdtime'     => $row['createdtime'],
            'modifiedtime'    => $row['modifiedtime'],
            'assigned_user'   => [
                'id'       => $row['smownerid'] ? (int)$row['smownerid'] : null,
                'username' => $row['assigned_user_name'],
                'fullname' => trim($row['assigned_user_fullname'] ?? ''),
            ],
            'contact' => [
                'id'         => $row['contact_id'] ? (int)$row['contact_id'] : null,
                'firstname'  => $row['contact_firstname'],
                'lastname'   => $row['contact_lastname'],
                'fullname'   => $contactName !== '' ? $contactName : ($row['account_name'] ?? null),
                'email'      => $row['contact_email'],
                'phone'      => $row['contact_phone'],
                'mobile'     => $row['contact_mobile'],
                'address'    => $row['contact_address'],
                'city'       => $row['contact_city'],
                'zip'        => $row['contact_zip'],
                'country'    => $row['contact_country'],
                'leadsource' => $row['contact_leadsource'],
            ],
            'demenagement' => [
                'date_chargement'   => $row['date_demenagement_chargement'],
                'date_livraison'    => $row['date_demenagement_livraison'],
                'periode_debut'     => $row['periode_debut'],
                'periode_fin'       => $row['periode_fin'],
                'volume_inventaire' => $row['volume_inventaire'],
                'volume_final'      => $row['volume_final'],
                'distance'          => $row['distance'],
            ],
            'chargement' => [
                'adresse' => $row['adresse_chargement'],
                'ville'   => $row['ville_chargement'],
                'cp'      => $row['cp_chargement'],
            ],
            'livraison' => [
                'adresse' => $row['adresse_livraison'],
                'ville'   => $row['ville_livraison'],
                'cp'      => $row['cp_livraison'],
            ],
            'stationnement' => [
                'chargement' => $row['stationnement_chargement'],
                'livraison'  => $row['stationnement_livraison'],
                'statut'     => $row['statut_demande_stationnement'],
            ],
            'mail_affaire' => $row['mail_affaire'],
        ];
    }
    $stmt->close();
    $mysqli->close();

    apiLog('LIST_OK', ['count' => count($data), 'total' => $total, 'limit' => $limit, 'offset' => $offset]);

    echo json_encode([
        'success' => true,
        'count'   => count($data),
        'total'   => $total,
        'limit'   => $limit,
        'offset'  => $offset,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    apiLog('ERROR', ['message' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur: ' . $e->getMessage()]);
}
