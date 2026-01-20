<?php
/**
 * Twilio Click-to-Call - Raccrocher un appel
 * ARIDEM CRM
 */

header('Content-Type: application/json');

// Configuration base de données
$dbHost = 'localhost';
$dbName = 'aridem_bis';
$dbUser = 'aridem_bis_user';
$dbPass = '3b07eba23d0e68c98c9beb2ff6fe2d03';

// Récupérer le Call SID
$callSid = isset($_GET['call_sid']) ? $_GET['call_sid'] : '';

if (empty($callSid)) {
    echo json_encode(['success' => false, 'error' => 'Call SID manquant']);
    exit;
}

$debug = [];
$debug['call_sid'] = $callSid;

try {
    // Connexion à la base de données
    $mysqli = new mysqli($dbHost, $dbUser, $dbPass, $dbName);

    if ($mysqli->connect_error) {
        throw new Exception('Erreur de connexion à la base de données');
    }

    // Récupérer la configuration Twilio
    $result = $mysqli->query("SELECT * FROM vtiger_twilio_clicktocall LIMIT 1");

    if (!$result || $result->num_rows === 0) {
        throw new Exception('Configuration Twilio non trouvée');
    }

    $config = $result->fetch_assoc();
    $accountSID = $config['account_sid'];
    // Décrypter le auth_token (simple car on a utilisé $ve$z8_)
    $authToken = str_replace('$ve$z8_', '', $config['auth_token']);

    $debug['account_sid'] = $accountSID;

    // URL de l'API Twilio pour terminer l'appel
    $url = "https://api.twilio.com/2010-04-01/Accounts/{$accountSID}/Calls/{$callSid}.json";
    $debug['url'] = $url;

    // Initialiser cURL
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, "{$accountSID}:{$authToken}");
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['Status' => 'completed']));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $debug['http_code'] = $httpCode;
    $debug['curl_error'] = $curlError;
    $debug['raw_response'] = substr($response, 0, 500); // Limiter pour éviter trop de données

    if ($httpCode === 200 || $httpCode === 204) {
        echo json_encode([
            'success' => true,
            'message' => 'Appel terminé',
            'call_sid' => $callSid,
            'debug' => $debug
        ]);
    } else {
        $errorData = json_decode($response, true);
        $debug['error_data'] = $errorData;
        throw new Exception($errorData['message'] ?? 'HTTP ' . $httpCode . ' - Erreur lors de la terminaison');
    }

    $mysqli->close();

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => $debug
    ]);
}
?>
